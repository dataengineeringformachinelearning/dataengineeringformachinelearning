import uuid

from ninja import Router, Schema
from ninja.errors import HttpError

router = Router()


class SuccessSchema(Schema):
  status: str
  user: str | None = None
  user_id: int | None = None
  role: str | None = None


@router.get("/register", response=SuccessSchema, auth=None)
def api_register_health(request):
  """Health probe for monitors; user registration is handled client-side via Firebase."""
  return {"status": "ok", "user": None, "user_id": None, "role": None}


@router.get("/user", response=SuccessSchema)
def api_user(request):
  if request.user.is_authenticated:
    role = "Viewer"
    if hasattr(request.user, "profile"):
      role = request.user.profile.role
    return {
      "status": "success",
      "user": request.user.first_name or request.user.username,
      "user_id": request.user.id,
      "role": role,
    }
  raise HttpError(401, "Not authenticated")


class DeleteAccountOut(Schema):
  status: str
  job_id: str | None = None
  completed: bool = False


@router.delete("/delete-account", response=DeleteAccountOut)
def api_delete_account(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  from account.lifecycle import request_account_deletion
  from monitor.models import UserLifecycleJob

  firebase_uid = None
  if hasattr(request, "firebase_token") and request.firebase_token:
    firebase_uid = request.firebase_token.get("uid")

  job = request_account_deletion(request.user, firebase_uid=firebase_uid)
  completed = job.state == UserLifecycleJob.State.COMPLETED
  return {
    "status": "success" if completed else "accepted",
    "job_id": str(job.id),
    "completed": completed,
  }


import secrets

from monitor.models import APIKey


class APIKeyGenerateOut(Schema):
  status: str
  name: str
  key: str
  prefix: str


class APIKeyGenerateIn(Schema):
  name: str = "Integration Key"


@router.post("/api-keys/generate", response=APIKeyGenerateOut, summary="Generate API Key")
def generate_api_key(request, payload: APIKeyGenerateIn):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  raw_key = secrets.token_urlsafe(32)
  prefix = raw_key[:8]

  api_key = APIKey(user=request.user, name=payload.name, prefix=prefix)
  api_key.set_key(raw_key)
  api_key.save()

  return {"status": "success", "name": api_key.name, "key": raw_key, "prefix": api_key.prefix}


class APIKeyOut(Schema):
  id: str
  name: str
  prefix: str
  created_at: str


@router.get("/api-keys", response=list[APIKeyOut], summary="List API Keys")
def list_api_keys(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  keys = APIKey.objects.filter(user=request.user, is_active=True).order_by("-created_at")
  return [
    {
      "id": str(key.id),
      "name": key.name,
      "prefix": key.prefix,
      "created_at": key.created_at.isoformat(),
    }
    for key in keys
  ]


@router.delete("/api-keys/{key_id}", response=SuccessSchema, summary="Revoke API Key")
def delete_api_key(request, key_id: str):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  import uuid

  try:
    key_uuid = uuid.UUID(key_id)
    api_key = APIKey.objects.get(id=key_uuid, user=request.user, is_active=True)
    api_key.is_active = False
    api_key.save()
    return {"status": "success"}
  except (ValueError, APIKey.DoesNotExist) as e:
    raise HttpError(404, "API Key not found") from e


class HandoffGenerateOut(Schema):
  status: str
  token: str


@router.post(
  "/handoff/generate", response=HandoffGenerateOut, summary="Generate cross-domain handoff token"
)
def generate_handoff_token(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")

  from utils.rate_limit import redis_client

  if not redis_client:
    raise HttpError(500, "Redis unavailable")

  token = str(uuid.uuid4())
  # Store the user ID in redis for 60 seconds
  redis_client.setex(f"handoff:{token}", 60, request.user.id)

  return {"status": "success", "token": token}


class HandoffVerifyIn(Schema):
  token: str


@router.post(
  "/handoff/verify", response=SuccessSchema, auth=None, summary="Verify cross-domain handoff token"
)
def verify_handoff_token(request, payload: HandoffVerifyIn):
  from utils.rate_limit import redis_client

  if not redis_client:
    raise HttpError(500, "Redis unavailable")

  user_id = redis_client.get(f"handoff:{payload.token}")
  if not user_id:
    raise HttpError(401, "Invalid or expired token")

  # Token valid, delete it so it's one-time use
  redis_client.delete(f"handoff:{payload.token}")

  from django.contrib.auth import get_user_model

  User = get_user_model()
  try:
    user = User.objects.get(id=int(user_id))
    role = "Viewer"
    if hasattr(user, "profile"):
      role = user.profile.role
    return {
      "status": "success",
      "user": user.first_name or user.username,
      "user_id": user.id,
      "role": role,
    }
  except User.DoesNotExist:
    raise HttpError(404, "User not found") from None
