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
        return {"status": "success", "user": request.user.first_name or request.user.username, "user_id": request.user.id}
    raise HttpError(401, "Not authenticated")

class RegisterSchema(Schema):
    username: str
    password: str
    email: Optional[str] = None

from django.contrib.auth.models import User

@router.post("/register", response=SuccessSchema)
def api_register(request, data: RegisterSchema):
    if User.objects.filter(username=data.username).exists():
        raise HttpError(400, "Username already exists")
    user = User.objects.create_user(
        username=data.username,
        password=data.password,
        email=data.email or ""
    )
    django_login(request, user)
    return {"status": "success", "user": user.username, "user_id": user.id}

class ForgotPasswordSchema(Schema):
    email: str

class ResetPasswordSchema(Schema):
    uid: str
    token: str
    new_password: str

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from config.email import send_resend_email

@router.post("/forgot-password", response=SuccessSchema)
def api_forgot_password(request, data: ForgotPasswordSchema):
    # Find user by email (allow multiple/first match, or unique)
    user = User.objects.filter(email=data.email).first()
    if not user:
        # Avoid user enumeration attacks: return success anyway
        return {"status": "success"}
    
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    
    reset_url = f"{settings.FRONTEND_URL}/?reset_uid={uid}&reset_token={token}"
    
    subject = "Password Reset Request - Data Engineering Platform"
    html_content = f"""
    <p>You requested a password reset for your account (username: <strong>{user.username}</strong>).</p>
    <p>Please click the link below to set a new password:</p>
    <p><a href="{reset_url}" style="padding: 10px 20px; background-color: #2d4739; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
    <p>If you didn't request this, you can ignore this email.</p>
    """
    send_resend_email(user.email, subject, html_content)
    return {"status": "success"}

@router.post("/reset-password", response=SuccessSchema)
def api_reset_password(request, data: ResetPasswordSchema):
    try:
        uid_decoded = force_str(urlsafe_base64_decode(data.uid))
        user = User.objects.get(pk=uid_decoded)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise HttpError(400, "Invalid reset credentials")
        
    if default_token_generator.check_token(user, data.token):
        user.set_password(data.new_password)
        user.save()
        return {"status": "success"}
    else:
        raise HttpError(400, "Invalid or expired token")

@router.delete("/delete-account", response=SuccessSchema)
def api_delete_account(request):
    if not request.user.is_authenticated:
        raise HttpError(401, "Not authenticated")
    user = request.user
    user.delete()
    return {"status": "success"}



