import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username="authuser",
        password="secretpassword",
        email="auth@example.com"
    )

@pytest.mark.django_db
def test_get_current_user_authenticated(client, test_user):
    client.force_login(test_user)
    response = client.get("/api/v1/auth/user")
    assert response.status_code == 200
    assert response.json()["user"] == "authuser"

@pytest.mark.django_db
def test_get_current_user_unauthenticated(client):
    response = client.get("/api/v1/auth/user")
    assert response.status_code == 401

@pytest.mark.django_db
def test_delete_account_authenticated(client, test_user):
    client.force_login(test_user)
    response = client.delete("/api/v1/auth/delete-account")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert not User.objects.filter(username="authuser").exists()

@pytest.mark.django_db
def test_delete_account_unauthenticated(client):
    response = client.delete("/api/v1/auth/delete-account")
    assert response.status_code == 401

