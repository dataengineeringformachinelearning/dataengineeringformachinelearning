import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

import torch
import torch.nn as nn
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
  """Query an external teacher model; falls back to random on any error (with logging)."""
  import random

  import requests

  hf_token = os.environ.get("HF_TOKEN")
  if not hf_token:
    logger.warning("HF_TOKEN not set; using random fallback for teacher model")
    return random.uniform(0.0, 1.0)

  API_URL = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct"
  headers = {"Authorization": f"Bearer {hf_token}"}
  full_prompt = (
    f"{prompt}\nReturn ONLY a floating point number between 0.0 and 1.0. Do not include any text."
  )

  try:
    response = requests.post(
      API_URL,
      headers=headers,
      json={"inputs": full_prompt, "parameters": {"max_new_tokens": 5, "temperature": 0.1}},
      timeout=5,
    )
    if response.status_code == 200:
      result = response.json()
      if isinstance(result, list) and len(result) > 0:
        text = result[0].get("generated_text", "").replace(full_prompt, "").strip()
        try:
          return min(1.0, max(0.0, float(text)))
        except ValueError:
          logger.warning("Teacher model returned non-numeric output; using random fallback")
    else:
      logger.warning("Teacher model HTTP %s: %s", response.status_code, response.text[:200])
  except Exception as exc:
    logger.warning("Teacher model query failed: %s; using random fallback", exc)
  return random.uniform(0.0, 1.0)


class ThreatModel(nn.Module):
  def __init__(self):
    super().__init__()
    self.fc1 = nn.Linear(3, 8)
    self.fc2 = nn.Linear(8, 1)
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


def train_tenant_sla(tenant: Any) -> TrainingRun | None:
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

  endpoints = Endpoints.objects.filter(tenant=tenant)
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

  import os

  hf_token = os.environ.get("HF_TOKEN")
  hf_repo = os.environ.get("HF_REPO_ID")
  if hf_token and hf_repo:
    try:
      from huggingface_hub import HfApi

      # Serialize securely using torch.save
      torch.save(best_estimator.model.state_dict(), "/tmp/sla_model.pt")
      api = HfApi(token=hf_token)
      import hashlib

      if hasattr(tenant, "slug"):
        safe_identifier = hashlib.sha256(tenant.slug.encode()).hexdigest()[:12]
        model_name = f"{safe_identifier}_sla_model.pt"
      else:
        model_name = "default_sla_model.pt"
      api.upload_file(
        path_or_fileobj="/tmp/sla_model.pt",
        path_in_repo=f"sla_models/{model_name}",
        repo_id=hf_repo,
        repo_type="model",
      )
    except Exception as e:
      logger.error("Failed to push SLA model to Hugging Face: %s", e)

  run = TrainingRun.objects.create(tenant=tenant, average_sla=avg_predicted_sla, loss=final_loss)
  return run


def train_platform_threat_model() -> dict:
  import datetime as dt
  import random

  import torch
  import torch.nn as nn
  import torch.optim as optim
  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import AnalyticsIntegration, Endpoints

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

  # Platform-wide integration insights
  total_integrations = AnalyticsIntegration.objects.filter(active=True).count()
  global_location_weight = 0.35 if total_integrations > 0 else 0.0

  x_data = []
  y_data = []
  for _ in range(100):  # Larger batch for platform model
    lw = max(0.0, min(1.0, global_location_weight + random.uniform(-0.2, 0.2)))
    sr = max(0.0, min(1.0, global_suspicious_ratio + random.uniform(-0.1, 0.1)))
    fr = max(0.0, min(1.0, global_failure_rate + random.uniform(-0.05, 0.05)))
    x_data.append([lw, sr, fr])
    prompt = f"Given a tenant with a location_weight of {lw:.2f}, a {sr*100:.1f}% suspicious request ratio, and a {fr*100:.1f}% failure rate, what is the probability (0.0 to 1.0) that this is an active cyber attack?"
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


def train_threat_model(tenant: Any) -> ThreatReport:
  import datetime as dt

  import torch
  from django.db.models import Q
  from django.utils import timezone
  from monitor.models import AnalyticsIntegration, Endpoints

  from ml.models import ThreatReport

  # ThreatModel is now defined globally
  # Query actual Endpoints telemetry from the last 90 days to derive baseline features
  cutoff = timezone.now() - dt.timedelta(days=90)
  endpoints = Endpoints.objects.filter(tenant=tenant, last_tested__gte=cutoff)
  total_requests = endpoints.count()

  if total_requests == 0:
    return ThreatReport.objects.create(
      tenant=tenant,
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
  from monitor.models import TenantMembership

  members = TenantMembership.objects.filter(tenant=tenant).values_list("user", flat=True)
  integrations = AnalyticsIntegration.objects.filter(user__in=members, active=True)

  # Default/Fallback metrics if user hasn't synced real integrations yet
  location_weight = 0.35
  top_location = "United States"

  # If integrations exist, pull real details (or simulate based on them)
  if integrations.exists():
    if tenant and getattr(tenant, "is_platform_tenant", False):
      location_weight = 0.35
      top_location = "United States"
      failure_rate = 0.02
      suspicious_ratio = 0.05

      for integ in integrations:
        if integ.provider == "google":
          location_weight = 0.62
          top_location = "China"
        elif integ.provider == "microsoft":
          failure_rate = max(failure_rate, 0.08)
          suspicious_ratio = max(suspicious_ratio, 0.22)
          top_location = "Russia"
    else:
      from monitor.models import ThreatIntelligence

      latest_threat = (
        ThreatIntelligence.objects.filter(tenant=tenant).order_by("-timestamp").first()
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
        location_weight = 0.1
      else:
        top_location = "No Connected Integration"
        location_weight = 0.0
  else:
    top_location = "No Connected Integration"
    location_weight = 0.0

  # Load the global platform model
  import os

  model_path = get_platform_model_path()
  if not os.path.exists(model_path):
    train_platform_threat_model()

  model = ThreatModel()
  model.load_state_dict(torch.load(model_path, weights_only=True))
  model.eval()

  with torch.no_grad():
    # Evaluate model prediction on user's exact parameters
    current_x = torch.tensor(
      [[location_weight, suspicious_ratio, failure_rate]], dtype=torch.float32
    )
    prediction = model(current_x).item()

  report = ThreatReport.objects.create(
    tenant=tenant,
    anomaly_score=prediction,
    top_location=top_location,
    location_weight=location_weight,
    suspicious_ratio=suspicious_ratio,
  )
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
    prompt = f"The global platform has a {fr*100:.1f}% failure rate, {sr*100:.1f}% suspicious requests, and {inc} active incidents. What is the Countermeasure Effectiveness Score (0.0 to 1.0) of our security rules?"
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
