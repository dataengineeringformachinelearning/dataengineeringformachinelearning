from ninja import Router, Schema
from ninja.errors import HttpError

router = Router()


class SuccessSchema(Schema):
  status: str
  user: str | None = None
  user_id: int | None = None
  role: str | None = None


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


@router.delete("/delete-account", response=SuccessSchema)
def api_delete_account(request):
  if not request.user.is_authenticated:
    raise HttpError(401, "Not authenticated")
  user = request.user
  user.delete()
  return {"status": "success"}


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
