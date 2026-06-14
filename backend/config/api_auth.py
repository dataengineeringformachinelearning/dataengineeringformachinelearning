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
