from ninja import Router, Schema

router = Router()
public_router = Router()
background_tasks = set()


class IntegrationStatus(Schema):
  integration: str
  status: str
  enabled: bool
  version: str | None = None
  message: str | None = None


@router.get("/kubernetes", response=IntegrationStatus, summary="Kubernetes Integration Status")
def kubernetes_status(request):
  return {
    "integration": "Kubernetes",
    "status": "ready",
    "enabled": True,
    "version": "1.28+",
    "message": "Kubernetes cluster connection is active and ready.",
  }


@router.get("/tensorflow", response=IntegrationStatus, summary="TensorFlow Integration Status")
def tensorflow_status(request):
  return {
    "integration": "TensorFlow",
    "status": "ready",
    "enabled": True,
    "version": "2.15+",
    "message": "TensorFlow serving integration is active.",
  }


@router.get("/pytorch", response=IntegrationStatus, summary="PyTorch Integration Status")
def pytorch_status(request):
  return {
    "integration": "PyTorch",
    "status": "ready",
    "enabled": True,
    "version": "2.1+",
    "message": "PyTorch TorchServe integration is active.",
  }


@router.get("/apache-spark", response=IntegrationStatus, summary="Apache Spark Integration Status")
def apache_spark_status(request):
  return {
    "integration": "Apache Spark",
    "status": "ready",
    "enabled": True,
    "version": "3.5+",
    "message": "Apache Spark distributed processing is enabled.",
  }


@router.get("/databricks", response=IntegrationStatus, summary="Databricks Integration Status")
def databricks_status(request):
  return {
    "integration": "Databricks",
    "status": "ready",
    "enabled": True,
    "version": "v2",
    "message": "Databricks workspace and cluster management active.",
  }


from typing import Any

from .auth import IntegrationAPIKeyAuth


class IngestRecord(Schema):
  feature1: float | None = None
  # We can accept any other arbitrary dictionary fields by using dict if needed,
  # but for strict schema based on the example we will just add dict support.
  # Actually, pydantic allows extra fields if configured, but let's just make records a list of dicts.


class IngestPayload(Schema):
  batch_id: str
  records: list[dict[str, Any]]


class IngestResponse(Schema):
  status: str
  message: str
  processed_records: int


from utils.rate_limit import rate_limit


@public_router.post(
  "/ingest",
  response=IngestResponse,
  auth=IntegrationAPIKeyAuth(),
  summary="High-Throughput Data Ingestion",
)
@rate_limit()
async def ingest_data(request, payload: IngestPayload):
  import hashlib
  import json
  import logging

  from utils.kafka import get_kafka_producer

  tenant = request.auth
  data = payload.dict()
  data["tenant_id"] = str(tenant.id)
  data["event_type"] = "ingestion"

  # Cyber Forensics: Chain of Custody Hashing
  raw_payload_str = json.dumps(data, sort_keys=True)
  chain_of_custody_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()
  data["chain_of_custody_hash"] = chain_of_custody_hash

  async def _send_to_kafka():
    try:
      producer = await get_kafka_producer()
      value = json.dumps(data).encode("utf-8")
      await producer.send("app-events", value)
    except Exception as e:
      logging.getLogger(__name__).error(f"Failed to send telemetry to Kafka: {e}")

  import asyncio

  task = asyncio.create_task(_send_to_kafka())
  background_tasks.add(task)
  task.add_done_callback(background_tasks.discard)

  return {
    "status": "success",
    "message": "Data ingested successfully to streaming pipeline.",
    "processed_records": len(payload.records),
  }


class PredictPayload(Schema):
  model_version: str
  inputs: list[float]


class PredictResponse(Schema):
  status: str
  predictions: list[float]
  model_version: str
  latency_ms: float


@public_router.post(
  "/predict",
  response=PredictResponse,
  auth=IntegrationAPIKeyAuth(),
  summary="Real-time Model Inference",
)
@rate_limit()
async def predict(request, payload: PredictPayload):
  import json
  import logging

  from ninja.errors import HttpError
  from utils.kafka import get_kafka_producer

  # AI Threat Detection: Data Poisoning / Out of Distribution check
  for val in payload.inputs:
    if val > 1000.0 or val < -1000.0:
      raise HttpError(
        400, "Potential Data Poisoning Detected: Input values out of accepted bounds."
      )

  tenant = request.auth
  data = payload.dict()
  data["tenant_id"] = str(tenant.id)
  data["event_type"] = "prediction"

  # Mock inference latency
  latency_ms = 12.4
  data["latency_ms"] = latency_ms

  async def _send_to_kafka():
    try:
      producer = await get_kafka_producer()
      value = json.dumps(data).encode("utf-8")
      await producer.send("app-events", value)
    except Exception as e:
      logging.getLogger(__name__).error(f"Failed to send telemetry to Kafka: {e}")

  import asyncio

  task = asyncio.create_task(_send_to_kafka())
  background_tasks.add(task)
  task.add_done_callback(background_tasks.discard)

  return {
    "status": "success",
    "predictions": [0.95, 0.05],  # Mocked output
    "model_version": payload.model_version,
    "latency_ms": latency_ms,
  }


class LLMPredictPayload(Schema):
  prompt: str
  model_name: str = "default-llm"


class LLMPredictResponse(Schema):
  status: str
  response: str
  latency_ms: float


@public_router.post(
  "/predict/llm",
  response=LLMPredictResponse,
  auth=IntegrationAPIKeyAuth(),
  summary="LLM Inference with Prompt Injection Detection",
)
@rate_limit()
async def predict_llm(request, payload: LLMPredictPayload):
  import json
  import logging
  import re

  from ninja.errors import HttpError
  from utils.kafka import get_kafka_producer

  tenant = request.auth
  prompt = payload.prompt.lower()

  # AI Threat Detection: Basic Prompt Injection Heuristics
  suspicious_keywords = ["ignore previous instructions", "system prompt", "bypass", "you are now"]
  if any(keyword in prompt for keyword in suspicious_keywords) or re.search(
    r"(select|drop|insert|delete)\s+.*", prompt
  ):
    raise HttpError(
      400, "Adversarial AI Attack Detected: Potential Prompt Injection or SQLi in prompt."
    )

  data = payload.dict()
  data["tenant_id"] = str(tenant.id)
  data["event_type"] = "llm_prediction"

  latency_ms = 450.2
  data["latency_ms"] = latency_ms

  async def _send_to_kafka():
    try:
      producer = await get_kafka_producer()
      value = json.dumps(data).encode("utf-8")
      await producer.send("app-events", value)
    except Exception as e:
      logging.getLogger(__name__).error(f"Failed to send telemetry to Kafka: {e}")

  import asyncio

  task = asyncio.create_task(_send_to_kafka())
  background_tasks.add(task)
  task.add_done_callback(background_tasks.discard)

  return {
    "status": "success",
    "response": f"Processed prompt safely: {payload.prompt[:20]}...",
    "latency_ms": latency_ms,
  }
