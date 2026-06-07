from ninja import Router, Schema
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.http import JsonResponse
from ninja.errors import HttpError

router = Router()

class LoginSchema(Schema):
    username: str
    password: str

from typing import Optional

class SuccessSchema(Schema):
    status: str
    user: Optional[str] = None
    user_id: Optional[int] = None

@router.post("/login", response=SuccessSchema)
def api_login(request, data: LoginSchema):
    user = authenticate(request, username=data.username, password=data.password)
    if user is not None:
        django_login(request, user)
        return {"status": "success", "user": user.username, "user_id": user.id}
    else:
        raise HttpError(401, "Invalid credentials")

@router.post("/logout", response=SuccessSchema)
def api_logout(request):
    django_logout(request)
    return {"status": "success"}

@router.get("/user", response=SuccessSchema)
def api_user(request):
    if request.user.is_authenticated:
        return {"status": "success", "user": request.user.username, "user_id": request.user.id}
    raise HttpError(401, "Not authenticated")
