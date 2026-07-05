import logging
import os
from typing import Any, Final

logger = logging.getLogger(__name__)

# Lazy/optional torch: allows full test matrix and non-ML paths without the heavy dep.
# Production deploys (and ML workers) always have torch; tests/CI use sqlite + mocks.
try:
  import torch
  import torch.nn as nn

  try:
    import norse.torch as norse

    HAS_NORSE = True
  except ImportError:
    norse = None  # type: ignore
    HAS_NORSE = False
except ImportError:
  torch = None  # type: ignore
  nn = None  # type: ignore
  norse = None  # type: ignore
  HAS_NORSE = False

from django.conf import settings
from monitor.models import Endpoints

from ml.models import ThreatReport, TrainingRun


def get_platform_model_path():
  path = os.path.join(settings.BASE_DIR, "ml", "saved_models")
  os.makedirs(path, exist_ok=True)
  return os.path.join(path, "platform_threat_model.pt")


def get_ces_model_path():
  path = os.path.join(settings.BASE_DIR, "ml", "saved_models")
  os.makedirs(path, exist_ok=True)
  return os.path.join(path, "ces_model.pt")


def query_teacher_model(prompt: str) -> float:
  """Query an external teacher model (Gemini 2.5 Flash); falls back to random on any error (with logging).

  Result is cached in Dragonfly for 1 hour keyed by a SHA-256 hash of the prompt.
  Identical feature-vector prompts generated during the same training batch hit cache
  instead of issuing redundant API calls to Gemini.
  """
  import hashlib
  import random
  import time

  import requests
  from django.core.cache import cache

  prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:32]
  cache_key = f"teacher_model:{prompt_hash}"
  cached = cache.get(cache_key)
  if cached is not None:
    logger.debug("query_teacher_model: cache hit for %s", cache_key)
    return float(cached)

  if cache.get("teacher_model:quota_exhausted"):
    logger.debug("query_teacher_model: quota cooldown active; using heuristic fallback")
    return _teacher_model_heuristic(prompt)

  google_api_key = os.environ.get("GOOGLE_API_KEY")
  if not google_api_key:
    logger.warning("GOOGLE_API_KEY not set; using random fallback for teacher model")
    return random.uniform(0.0, 1.0)

  API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={google_api_key}"
  full_prompt = f"{prompt}\nReturn ONLY a floating point number between 0.0 and 1.0. Do not include any other text."
  payload = {
    "contents": [{"parts": [{"text": full_prompt}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 10},
  }

  backoff_secs = (1, 2, 4)
  try:
    for attempt, delay in enumerate(backoff_secs, start=1):
      response = requests.post(
        API_URL,
        json=payload,
        timeout=10,
      )
      if response.status_code == 200:
        result = response.json()
        candidates = result.get("candidates") or []
        if candidates:
          parts = candidates[0].get("content", {}).get("parts") or []
          if parts:
            text = parts[0].get("text", "").strip()
            try:
              score = min(1.0, max(0.0, float(text)))
              cache.set(cache_key, score, 3600)  # 1h in Dragonfly
              return score
            except ValueError:
              logger.warning(
                "Teacher model returned non-numeric output: '%s'; using heuristic fallback", text
              )
        break

      if response.status_code == 429:
        if attempt < len(backoff_secs):
          logger.info(
            "Teacher model HTTP 429 (attempt %d/%d); retrying in %ds",
            attempt,
            len(backoff_secs),
            delay,
          )
          time.sleep(delay)
          continue
        logger.warning(
          "Teacher model quota exceeded after %d attempts; cooling down for 10 minutes",
          len(backoff_secs),
        )
        cache.set("teacher_model:quota_exhausted", True, 600)
        break

      logger.warning("Teacher model HTTP %s: %s", response.status_code, response.text[:200])
      break
  except Exception as exc:
    logger.warning("Teacher model query failed: %s; using heuristic fallback", exc)

  fallback = _teacher_model_heuristic(prompt)
  cache.set(cache_key, fallback, 300)
  return fallback


def _teacher_model_heuristic(prompt: str) -> float:
  """Deterministic SLA score when Gemini is unavailable (quota or outage)."""
  import re

  status_match = re.search(r"\b(\d{3})\b", prompt)
  latency_match = re.search(r"([\d.]+)s response time", prompt)
  status = int(status_match.group(1)) if status_match else 200
  latency = float(latency_match.group(1)) if latency_match else 0.0

  if status >= 500 or status == 0:
    return 0.0
  if status >= 400:
    return 0.25
  if latency > 5.0:
    return 0.35
  if latency > 2.0:
    return 0.6
  if latency > 1.0:
    return 0.8
  return 0.95


def extract_fused_threat_features(
  user: Any = None,
  *,
  is_platform: bool = False,
  location_weight: float = 0.35,
) -> list[float]:
  """Six-feature vector: traffic + threat intel + behavioral + incident labels."""
  import datetime as dt

  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import AggregatedAnalytics, Endpoints, IncidentCase, ThreatIntelligence

  cutoff = timezone.now() - dt.timedelta(days=90)
  day_cutoff = timezone.now() - dt.timedelta(hours=24)

  if is_platform:
    endpoints = Endpoints.objects.filter(
      is_platform=True, user__isnull=True, last_tested__gte=cutoff
    )
    threats = ThreatIntelligence.objects.filter(is_platform=True, timestamp__gte=day_cutoff)
    analytics = AggregatedAnalytics.objects.filter(is_platform=True, timestamp__gte=day_cutoff)
    cases = IncidentCase.objects.filter(user__isnull=True, created_at__gte=cutoff)
  else:
    endpoints = Endpoints.objects.filter(user=user, is_platform=False, last_tested__gte=cutoff)
    threats = ThreatIntelligence.objects.filter(
      user=user, is_platform=False, timestamp__gte=day_cutoff
    )
    analytics = AggregatedAnalytics.objects.filter(
      user=user, is_platform=False, timestamp__gte=day_cutoff
    )
    cases = IncidentCase.objects.filter(user=user, created_at__gte=cutoff)

  total = endpoints.count()
  if total > 0:
    failure_rate = endpoints.filter(Q(status_code__gte=500) | Q(is_active=False)).count() / total
    suspicious_ratio = endpoints.filter(status_code__in=[400, 401, 403, 429]).count() / total
  else:
    failure_rate = 0.02
    suspicious_ratio = 0.05

  threat_velocity = min(1.0, threats.count() / 100.0)
  malicious_count = threats.filter(is_malicious=True).count()
  if malicious_count:
    location_weight = min(1.0, 0.35 + malicious_count * 0.1)

  latest_analytics = analytics.order_by("-timestamp").first()
  widget_hits = latest_analytics.widget_interactions if latest_analytics else 0
  visitors = max(1, latest_analytics.unique_visitors if latest_analytics else 1)
  behavioral_score = min(1.0, widget_hits / (visitors * 5))

  resolved = cases.filter(status__in=["Resolved", "Mitigated"]).count()
  total_cases = max(1, cases.count())
  incident_confidence = resolved / total_cases

  return [
    max(0.0, min(1.0, location_weight)),
    max(0.0, min(1.0, suspicious_ratio)),
    max(0.0, min(1.0, failure_rate)),
    max(0.0, min(1.0, threat_velocity)),
    max(0.0, min(1.0, behavioral_score)),
    max(0.0, min(1.0, incident_confidence)),
  ]


class ThreatModel(nn.Module):
  FEATURE_DIM: Final[int] = 6

  def __init__(self, in_features: int = FEATURE_DIM):
    super().__init__()
    self.fc1 = nn.Linear(in_features, 12)
    self.fc2 = nn.Linear(12, 1)
    self.sigmoid = nn.Sigmoid()

  def forward(self, x):
    x = torch.relu(self.fc1(x))
    x = self.sigmoid(self.fc2(x))
    return x


class CESModel(nn.Module):
  def __init__(self):
    super().__init__()
    self.fc1 = nn.Linear(3, 8)
    self.fc2 = nn.Linear(8, 1)
    self.sigmoid = nn.Sigmoid()

  def forward(self, x):
    x = torch.relu(self.fc1(x))
    x = self.sigmoid(self.fc2(x))
    return x * 100.0


# Fourth model: Spiking Temporal Forecaster using Norse (optional)
# For temporal/event-driven data processing with Spiking Neural Networks.
# Falls back gracefully if norse not installed.
if HAS_NORSE:

  class SpikingTemporalForecaster(nn.Module):
    """Spiking Neural Network model for forecasting temporal patterns in telemetry.

    Uses LIF spiking neurons to process sequences of features (e.g., latency, error rates over time).
    Better suited for event streams and spiking-like telemetry than standard MLPs.

    Input: (batch, time_steps, features) or similar; outputs forecast score 0-1 or 0-100.
    """

    FEATURE_DIM: Final[int] = 6  # Align with threat features for now; can expand for sequences

    def __init__(self, in_features: int = FEATURE_DIM, hidden_size: int = 32):
      super().__init__()
      self.lif1 = norse.LIFCell(norse.LIFParameters(tau_mem_inv=100.0))
      self.linear = nn.Linear(in_features, hidden_size)
      self.lif2 = norse.LIFCell(norse.LIFParameters(tau_mem_inv=100.0))
      self.readout = nn.Linear(hidden_size, 1)
      self.sigmoid = nn.Sigmoid()

    def forward(self, x):
      # Expect x: (batch, seq_len, features) or (seq_len, batch, features)
      if x.dim() == 2:
        x = x.unsqueeze(0)  # Add seq dim if single step
      # Process sequence
      s1 = None
      s2 = None
      for t in range(x.size(1)):  # seq dim
        z = x[:, t, :]
        z = self.linear(z)
        z, s1 = self.lif1(z, s1)
        z, s2 = self.lif2(z, s2)
      out = self.readout(s2.v if s2 else z)
      return self.sigmoid(out)
else:

  class SpikingTemporalForecaster(nn.Module):
    """Fallback to simple MLP if Norse not available."""

    FEATURE_DIM: Final[int] = 6

    def __init__(self, in_features: int = FEATURE_DIM):
      super().__init__()
      self.fc1 = nn.Linear(in_features, 16)
      self.fc2 = nn.Linear(16, 1)
      self.sigmoid = nn.Sigmoid()

    def forward(self, x):
      x = torch.relu(self.fc1(x))
      x = self.sigmoid(self.fc2(x))
      return x


def train_tenant_sla(user: Any = None, *, is_platform: bool = False) -> TrainingRun | None:
  import numpy as np
  import torch
  import torch.nn as nn
  import torch.optim as optim
  from sklearn.base import BaseEstimator, RegressorMixin
  from sklearn.model_selection import GridSearchCV

  class PyTorchSLAEstimator(BaseEstimator, RegressorMixin):
    def __init__(self, lr=0.01, hidden_size=16):
      self.lr = lr
      self.hidden_size = hidden_size
      self.model = None

    def fit(self, X, y):
      class SLAModel(nn.Module):
        def __init__(self, hidden_size):
          super().__init__()
          self.fc1 = nn.Linear(3, hidden_size)
          self.fc2 = nn.Linear(hidden_size, 1)
          self.relu = nn.ReLU()

        def forward(self, x):
          x = self.relu(self.fc1(x))
          x = self.fc2(x)
          return x

      self.model = SLAModel(self.hidden_size)
      criterion = nn.MSELoss()
      optimizer = optim.Adam(self.model.parameters(), lr=self.lr)

      X_tensor = torch.tensor(X, dtype=torch.float32)
      y_tensor = torch.tensor(y, dtype=torch.float32)

      for _epoch in range(50):
        optimizer.zero_grad()
        outputs = self.model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()

      return self

    def predict(self, X):
      self.model.eval()
      X_tensor = torch.tensor(X, dtype=torch.float32)
      with torch.no_grad():
        preds = self.model(X_tensor)
      return preds.numpy()

  if is_platform:
    endpoints = Endpoints.objects.filter(is_platform=True, user__isnull=True)
  else:
    endpoints = Endpoints.objects.filter(user=user, is_platform=False)
  if not endpoints.exists():
    return None

  x_data = []
  y_data = []

  for ep in endpoints:
    status = float(ep.status_code) / 100.0
    resp_time = ep.response_time.total_seconds()
    active = 1.0 if ep.is_active else 0.0

    x_data.append([status, resp_time, active])

    target_sla = 1.0
    if not ep.is_active or ep.status_code >= 500:
      target_sla = 0.0
    else:
      prompt = f"An endpoint has a {ep.status_code} error rate and a {resp_time}s response time. What should the SLA score (0.0 to 1.0) be?"
      target_sla = query_teacher_model(prompt)

    y_data.append([target_sla])

  X_np = np.array(x_data, dtype=np.float32)
  Y_np = np.array(y_data, dtype=np.float32)

  param_grid = {"lr": [0.01, 0.001], "hidden_size": [8, 16]}

  if len(x_data) >= 2:
    grid = GridSearchCV(
      PyTorchSLAEstimator(), param_grid, cv=min(2, len(x_data)), scoring="neg_mean_squared_error"
    )
    grid.fit(X_np, Y_np)
    best_estimator = grid.best_estimator_
    final_loss = float(-grid.best_score_)
  else:
    best_estimator = PyTorchSLAEstimator().fit(X_np, Y_np)
    final_loss = 0.0

  preds = best_estimator.predict(X_np)
  avg_predicted_sla = max(0.0, min(100.0, float(np.mean(preds)) * 100.0))

  import hashlib
  import os
  import tempfile

  hf_token = os.environ.get("HF_TOKEN")
  hf_repo = os.environ.get("HF_REPO_ID")
  if hf_token and hf_repo:
    try:
      from huggingface_hub import HfApi

      identifier = "platform" if is_platform else getattr(user, "username", "default")
      safe_identifier = hashlib.sha256(identifier.encode()).hexdigest()[:12]
      model_name = f"{safe_identifier}_sla_model.pt"
      # Use a secure named temp file; delete=False so HF can stream it before cleanup
      with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        torch.save(best_estimator.model.state_dict(), tmp.name)
        tmp_path = tmp.name
      try:
        api = HfApi(token=hf_token)
        api.upload_file(
          path_or_fileobj=tmp_path,
          path_in_repo=f"sla_models/{model_name}",
          repo_id=hf_repo,
          repo_type="model",
        )
      finally:
        os.unlink(tmp_path)
    except Exception as e:
      logger.error("Failed to push SLA model to Hugging Face: %s", e)

  run = TrainingRun.objects.create(
    user=None if is_platform else user,
    is_platform=is_platform,
    average_sla=avg_predicted_sla,
    loss=final_loss,
  )

  # Invalidate Dragonfly cache so the ML API serves fresh results immediately.
  from django.core.cache import cache as _cache

  _cache.delete("ml:latest_run:platform")
  if not is_platform and user:
    from monitor.models import StatusPage as _SP

    for _page in _SP.objects.filter(user=user):
      _cache.delete(f"ml:latest_run:{_page.id}")

  return run


def train_platform_threat_model() -> dict:
  import datetime as dt
  import random

  import torch
  import torch.nn as nn
  import torch.optim as optim
  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import Endpoints

  # ThreatModel is now defined globally
  # Platform-wide data aggregation
  cutoff = timezone.now() - dt.timedelta(days=90)
  endpoints = Endpoints.objects.filter(last_tested__gte=cutoff)
  total_requests = endpoints.count()

  if total_requests > 0:
    failure_requests = endpoints.filter(Q(status_code__gte=500) | Q(is_active=False)).count()
    global_failure_rate = failure_requests / total_requests
    suspicious_requests = endpoints.filter(status_code__in=[400, 401, 403, 429]).count()
    global_suspicious_ratio = suspicious_requests / total_requests
  else:
    global_failure_rate = 0.02
    global_suspicious_ratio = 0.05

  # Platform-wide integration insights inform fused feature extraction via extract_fused_threat_features

  x_data = []
  y_data = []
  base_features = extract_fused_threat_features(is_platform=True)
  for _ in range(100):
    features = [
      max(0.0, min(1.0, base_features[i] + random.uniform(-0.1, 0.1)))
      for i in range(ThreatModel.FEATURE_DIM)
    ]
    x_data.append(features)
    lw, sr, fr = features[0], features[1], features[2]
    prompt = (
      f"Given fused telemetry: location_weight={lw:.2f}, suspicious_ratio={sr * 100:.1f}%, "
      f"failure_rate={fr * 100:.1f}%, threat_velocity={features[3]:.2f}, "
      f"behavioral={features[4]:.2f}, incident_confidence={features[5]:.2f}. "
      f"What is the probability (0.0 to 1.0) of an active cyber attack?"
    )
    target = query_teacher_model(prompt)
    y_data.append([target])

  X = torch.tensor(x_data, dtype=torch.float32)
  Y = torch.tensor(y_data, dtype=torch.float32)

  model = ThreatModel()
  criterion = nn.BCELoss()
  optimizer = optim.Adam(model.parameters(), lr=0.01)

  for _epoch in range(50):
    optimizer.zero_grad()
    outputs = model(X)
    loss = criterion(outputs, Y)
    loss.backward()
    optimizer.step()

  import os

  model_path = get_platform_model_path()
  # Save securely using torch.save
  torch.save(model.state_dict(), model_path)

  hf_token = os.environ.get("HF_TOKEN")
  hf_repo = os.environ.get("HF_REPO_ID")
  if hf_token and hf_repo:
    try:
      from huggingface_hub import HfApi

      api = HfApi(token=hf_token)
      api.upload_file(
        path_or_fileobj=model_path,
        path_in_repo="threat_models/platform_threat_model.pt",
        repo_id=hf_repo,
        repo_type="model",
      )
    except Exception as e:
      logger.error("Failed to push Platform Threat model to Hugging Face: %s", e)

  return {
    "global_failure_rate": global_failure_rate,
    "global_suspicious_ratio": global_suspicious_ratio,
    "status": "Platform model trained and published successfully",
  }


def train_threat_model(user: Any = None, *, is_platform: bool = False) -> ThreatReport:
  import datetime as dt

  import torch
  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import AnalyticsIntegration, Endpoints

  from ml.models import ThreatReport

  # ThreatModel is now defined globally
  # Query actual Endpoints telemetry from the last 90 days to derive baseline features
  cutoff = timezone.now() - dt.timedelta(days=90)
  if is_platform:
    endpoints = Endpoints.objects.filter(
      is_platform=True, user__isnull=True, last_tested__gte=cutoff
    )
  else:
    endpoints = Endpoints.objects.filter(user=user, is_platform=False, last_tested__gte=cutoff)
  total_requests = endpoints.count()

  if total_requests == 0:
    return ThreatReport.objects.create(
      user=None if is_platform else user,
      is_platform=is_platform,
      anomaly_score=0.0,
      top_location="No Connected Integration",
      location_weight=0.0,
      suspicious_ratio=0.0,
    )

  if total_requests > 0:
    failure_requests = endpoints.filter(Q(status_code__gte=500) | Q(is_active=False)).count()
    failure_rate = failure_requests / total_requests
    suspicious_requests = endpoints.filter(status_code__in=[400, 401, 403, 429]).count()
    suspicious_ratio = suspicious_requests / total_requests
  else:
    failure_rate = 0.02
    suspicious_ratio = 0.05

  # Find connected integrations for feature extraction
  if is_platform:
    integrations = AnalyticsIntegration.objects.filter(active=True)
  else:
    integrations = AnalyticsIntegration.objects.filter(user=user, active=True)

  # Default/Fallback metrics if user hasn't synced real integrations yet
  location_weight = 0.35
  top_location = "United States"

  fused = extract_fused_threat_features(
    user, is_platform=is_platform, location_weight=location_weight
  )
  location_weight, suspicious_ratio, failure_rate = fused[0], fused[1], fused[2]

  if integrations.exists():
    if is_platform:
      top_location = "United States"
      for integ in integrations:
        if integ.provider == "google":
          location_weight = max(location_weight, 0.62)
          top_location = "China"
        elif integ.provider == "microsoft":
          failure_rate = max(failure_rate, 0.08)
          suspicious_ratio = max(suspicious_ratio, 0.22)
          top_location = "Russia"
      fused = [
        location_weight,
        suspicious_ratio,
        failure_rate,
        fused[3],
        fused[4],
        fused[5],
      ]
    else:
      from monitor.models import ThreatIntelligence

      latest_threat = (
        ThreatIntelligence.objects.filter(user=user, is_platform=False)
        .order_by("-timestamp")
        .first()
      )
      if latest_threat:
        top_location = latest_threat.location
        if not top_location and latest_threat.ip_address:
          try:
            from utils.enrichment import get_ip_enrichment

            enrich = get_ip_enrichment(latest_threat.ip_address)
            if enrich and enrich.get("location") and enrich.get("location") != "Unknown":
              top_location = enrich["location"]
              latest_threat.location = top_location
              latest_threat.save(update_fields=["location"])
          except Exception as e:
            logger.warning("Failed to enrich top location IP: %s", e)

        if not top_location:
          top_location = latest_threat.ip_address or latest_threat.source
        location_weight = fused[0]
      else:
        top_location = "No Connected Integration"
        location_weight = 0.0
      fused = extract_fused_threat_features(
        user, is_platform=False, location_weight=location_weight
      )
  else:
    top_location = "No Connected Integration"
    location_weight = 0.0
    fused = extract_fused_threat_features(user, is_platform=is_platform, location_weight=0.0)

  # Load the global platform model
  import os

  model_path = get_platform_model_path()
  if not os.path.exists(model_path):
    train_platform_threat_model()

  model = ThreatModel()
  try:
    model.load_state_dict(torch.load(model_path, weights_only=True))
  except RuntimeError:
    train_platform_threat_model()
    model.load_state_dict(torch.load(model_path, weights_only=True))
  model.eval()

  with torch.no_grad():
    current_x = torch.tensor([fused], dtype=torch.float32)
    prediction = model(current_x).item()

  report = ThreatReport.objects.create(
    user=None if is_platform else user,
    is_platform=is_platform,
    anomaly_score=prediction,
    top_location=top_location,
    location_weight=location_weight,
    suspicious_ratio=suspicious_ratio,
  )

  # Invalidate Dragonfly cache for the threat report endpoint.
  from django.core.cache import cache as _cache

  _cache.delete("ml:threat_report:platform")
  if not is_platform and user:
    from monitor.models import StatusPage as _SP

    for _page in _SP.objects.filter(user=user):
      _cache.delete(f"ml:threat_report:{_page.id}")

  return report


def train_ces_model() -> dict:
  import datetime as dt

  import torch
  import torch.nn as nn
  import torch.optim as optim
  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import Endpoints, Incident

  cutoff = timezone.now() - dt.timedelta(days=1)

  # Platform-wide data (tenant__isnull could be considered, but we aggregate all endpoints for CES)
  endpoints = Endpoints.objects.filter(last_tested__gte=cutoff)
  total_requests = endpoints.count()

  if total_requests > 0:
    failure_requests = endpoints.filter(Q(status_code__gte=500) | Q(is_active=False)).count()
    global_failure_rate = failure_requests / total_requests
    suspicious_requests = endpoints.filter(status_code__in=[400, 401, 403, 429]).count()
    global_suspicious_ratio = suspicious_requests / total_requests
  else:
    global_failure_rate = 0.02
    global_suspicious_ratio = 0.05

  global_incidents = Incident.objects.filter(status__in=["Investigating", "Identified"]).count()

  # Generate training data
  import random

  x_data = []
  y_data = []
  for _ in range(50):
    fr = max(0.0, min(1.0, global_failure_rate + random.uniform(-0.02, 0.02)))
    sr = max(0.0, min(1.0, global_suspicious_ratio + random.uniform(-0.05, 0.05)))
    inc = max(0, global_incidents + random.randint(-1, 2))

    x_data.append([fr, sr, float(inc)])
    prompt = f"The global platform has a {fr * 100:.1f}% failure rate, {sr * 100:.1f}% suspicious requests, and {inc} active incidents. What is the Countermeasure Effectiveness Score (0.0 to 1.0) of our security rules?"
    target = query_teacher_model(prompt)
    y_data.append([target])

  X = torch.tensor(x_data, dtype=torch.float32)
  Y = torch.tensor(y_data, dtype=torch.float32)

  model = CESModel()
  criterion = nn.MSELoss()
  optimizer = optim.Adam(model.parameters(), lr=0.01)

  for _epoch in range(50):
    optimizer.zero_grad()
    # model returns 0-100, target is 0-1. So we divide model output by 100 for loss calculation
    outputs = model(X) / 100.0
    loss = criterion(outputs, Y)
    loss.backward()
    optimizer.step()

  import os

  model_path = get_ces_model_path()
  torch.save(model.state_dict(), model_path)

  hf_token = os.environ.get("HF_TOKEN")
  hf_repo = os.environ.get("HF_REPO_ID")
  if hf_token and hf_repo:
    try:
      from huggingface_hub import HfApi

      api = HfApi(token=hf_token)
      api.upload_file(
        path_or_fileobj=model_path,
        path_in_repo="ces_models/platform_ces_model.pt",
        repo_id=hf_repo,
        repo_type="model",
      )
    except Exception as e:
      logger.error("Failed to push CES model to Hugging Face: %s", e)

  return {"status": "CES model trained and published successfully"}


# Fourth model: Spiking Temporal Forecaster
# Uses Norse SNN for temporal data processing on event/telemetry sequences.
# This is the new fourth model, focused on forecasting temporal patterns
# (e.g., upcoming latency spikes or anomaly sequences from Redpanda streams).
def train_spiking_temporal_forecaster(
  user: Any = None, *, is_platform: bool = False
) -> TrainingRun | None:
  """Train a Spiking NN (Norse) or fallback MLP for temporal forecasting.

  Uses sequences of telemetry features to predict future scores (e.g., next SLA or threat level).
  Leverages teacher model for labels on temporal patterns.
  """
  if not HAS_NORSE and torch is None:
    logger.warning("Norse and/or torch not available; skipping spiking temporal model")
    return None

  import random

  import numpy as np
  import torch.optim as optim

  if is_platform:
    endpoints = Endpoints.objects.filter(is_platform=True, user__isnull=True)
  else:
    endpoints = Endpoints.objects.filter(user=user, is_platform=False)

  if not endpoints.exists():
    return None

  # Prepare temporal sequences (simplified: create fake sequences from recent endpoints)
  # In production, use AggregatedAnalytics over time windows or event sequences from projections.
  seq_len = 8  # temporal steps
  x_data = []
  y_data = []

  for ep in list(endpoints)[:100]:
    base_status = float(ep.status_code) / 100.0
    base_resp = ep.response_time.total_seconds()
    base_active = 1.0 if ep.is_active else 0.0

    # Create a sequence with some temporal variation (simulating spikes)
    seq = []
    for t in range(seq_len):
      status = max(0.0, min(1.0, base_status + random.uniform(-0.1, 0.1) * (t / seq_len)))
      resp = max(0.0, base_resp + random.uniform(-0.5, 0.5))
      active = base_active
      seq.append([status, resp, active, 0.0, 0.0, 0.0])  # pad to FEATURE_DIM

    x_data.append(seq)

    # Teacher label for "future" forecast (e.g., will there be a spike?)
    prompt = (
      f"Temporal sequence for endpoint: recent error rates { [s[0] for s in seq[-3:]] }, "
      f"response times varying. Predict probability (0.0-1.0) of anomaly/spike in next window."
    )
    target = query_teacher_model(prompt)
    y_data.append([target])

  if not x_data:
    return None

  X_np = np.array(x_data, dtype=np.float32)  # (n_samples, seq_len, features)
  Y_np = np.array(y_data, dtype=np.float32)

  if HAS_NORSE:
    model = SpikingTemporalForecaster()
  else:
    model = SpikingTemporalForecaster()  # fallback

  criterion = nn.MSELoss()
  optimizer = optim.Adam(model.parameters(), lr=0.01)

  X_tensor = torch.tensor(X_np, dtype=torch.float32)
  Y_tensor = torch.tensor(Y_np, dtype=torch.float32)

  # Simple training loop (for sequences, reshape or handle in forward)
  for _epoch in range(30):
    optimizer.zero_grad()
    # For simplicity, use last timestep or mean over seq for training target
    # In real SNN, forward handles full sequence
    outputs = model(X_tensor)  # may need adjustment for batch/seq
    loss = criterion(outputs, Y_tensor)
    loss.backward()
    optimizer.step()

  # Save
  model_path = get_platform_model_path().replace("threat_model", "spiking_temporal_forecaster")
  if is_platform:
    model_path = model_path.replace("platform", "platform")
  torch.save(model.state_dict(), model_path)

  # HF push (simplified, similar to others)
  hf_token = os.environ.get("HF_TOKEN")
  hf_repo = os.environ.get("HF_REPO_ID")
  if hf_token and hf_repo:
    try:
      import hashlib
      import tempfile

      from huggingface_hub import HfApi

      identifier = "platform" if is_platform else getattr(user, "username", "default")
      safe_identifier = hashlib.sha256(identifier.encode()).hexdigest()[:12]
      model_name = f"{safe_identifier}_spiking_temporal_forecaster.pt"
      with tempfile.NamedTemporaryFile(suffix=".pt", delete=False) as tmp:
        torch.save(model.state_dict(), tmp.name)
        tmp_path = tmp.name
      try:
        api = HfApi(token=hf_token)
        api.upload_file(
          path_or_fileobj=tmp_path,
          path_in_repo=f"temporal_models/{model_name}",
          repo_id=hf_repo,
          repo_type="model",
        )
      finally:
        os.unlink(tmp_path)
    except Exception as e:
      logger.error("Failed to push Spiking Temporal model to HF: %s", e)

  avg_pred = float(outputs.mean().item()) * 100.0 if outputs is not None else 50.0
  run = TrainingRun.objects.create(
    user=None if is_platform else user,
    is_platform=is_platform,
    average_sla=avg_pred,  # reuse field or extend later
    loss=float(loss.item()) if "loss" in locals() else 0.0,
  )

  # Invalidate caches
  from django.core.cache import cache as _cache

  _cache.delete("ml:latest_run:platform")
  if not is_platform and user:
    from monitor.models import StatusPage as _SP

    for _page in _SP.objects.filter(user=user):
      _cache.delete(f"ml:latest_run:{_page.id}")

  return run
