import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from unittest.mock import patch

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username="authuser",
        password="secretpassword",
        email="auth@example.com"
    )

@pytest.mark.django_db
def test_register_user(client):
    payload = {
        "username": "newuser",
        "password": "newpassword123",
        "email": "new@example.com"
    }
    response = client.post(
        "/api/v1/auth/register",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["user"] == "newuser"
    assert User.objects.filter(username="newuser").exists()

@pytest.mark.django_db
def test_register_duplicate_username(client, test_user):
    payload = {
        "username": "authuser",
        "password": "anotherpassword",
        "email": "another@example.com"
    }
    response = client.post(
        "/api/v1/auth/register",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 400

@pytest.mark.django_db
def test_login_success(client, test_user):
    payload = {
        "username": "authuser",
        "password": "secretpassword"
    }
    response = client.post(
        "/api/v1/auth/login",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@pytest.mark.django_db
def test_login_invalid_credentials(client, test_user):
    payload = {
        "username": "authuser",
        "password": "wrongpassword"
    }
    response = client.post(
        "/api/v1/auth/login",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 401

@pytest.mark.django_db
def test_get_current_user_authenticated(client, test_user):
    client.login(username="authuser", password="secretpassword")
    response = client.get("/api/v1/auth/user")
    assert response.status_code == 200
    assert response.json()["user"] == "authuser"

@pytest.mark.django_db
def test_get_current_user_unauthenticated(client):
    response = client.get("/api/v1/auth/user")
    assert response.status_code == 401

@pytest.mark.django_db
def test_logout(client, test_user):
    client.login(username="authuser", password="secretpassword")
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify we are no longer authenticated
    response_user = client.get("/api/v1/auth/user")
    assert response_user.status_code == 401

@pytest.mark.django_db
@patch("config.api_auth.send_resend_email")
def test_forgot_password(mock_send_email, client, test_user):
    payload = {"email": "auth@example.com"}
    response = client.post(
        "/api/v1/auth/forgot-password",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    mock_send_email.assert_called_once()
    
    # Check that reset link contains correct token and user ID
    args, kwargs = mock_send_email.call_args
    assert "reset_uid=" in args[2]
    assert "reset_token=" in args[2]

@pytest.mark.django_db
def test_reset_password_success(client, test_user):
    uid = urlsafe_base64_encode(force_bytes(test_user.pk))
    token = default_token_generator.make_token(test_user)
    
    payload = {
        "uid": uid,
        "token": token,
        "new_password": "brandnewpassword999"
    }
    
    response = client.post(
        "/api/v1/auth/reset-password",
        data=payload,
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Try logging in with the new password
    login_payload = {
        "username": "authuser",
        "password": "brandnewpassword999"
    }
    login_response = client.post(
        "/api/v1/auth/login",
        data=login_payload,
        content_type="application/json"
    )
    assert login_response.status_code == 200
