from ninja import Router, Schema
from ninja.errors import HttpError
from typing import Optional

router = Router()

class SuccessSchema(Schema):
    status: str
    user: Optional[str] = None
    user_id: Optional[int] = None

@router.get("/user", response=SuccessSchema)
def api_user(request):
    if request.user.is_authenticated:
        return {"status": "success", "user": request.user.first_name or request.user.username, "user_id": request.user.id}
    raise HttpError(401, "Not authenticated")

@router.delete("/delete-account", response=SuccessSchema)
def api_delete_account(request):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    user = request.user
    user.delete()
    return {"status": "success"}




