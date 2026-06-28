import pytest
from django.contrib.auth import get_user_model
from django.core import signing

from monitor.services.oauth_state import sign_oauth_user_id, unsign_oauth_state

User = get_user_model()


@pytest.mark.django_db
def test_oauth_state_roundtrip() -> None:
  user = User.objects.create_user(username="oauth_user", password="pass")
  token = sign_oauth_user_id(user.id)
  assert unsign_oauth_state(token) == user.id


@pytest.mark.django_db
def test_oauth_state_rejects_tampered_token() -> None:
  user = User.objects.create_user(username="oauth_user2", password="pass")
  token = sign_oauth_user_id(user.id)
  with pytest.raises(signing.BadSignature):
    unsign_oauth_state(token + "tampered")


@pytest.mark.django_db
def test_oauth_state_rejects_expired_token() -> None:
  user = User.objects.create_user(username="oauth_user3", password="pass")
  token = signing.dumps({"uid": user.id}, salt="deml.google-oauth")
  with pytest.raises(signing.SignatureExpired):
    signing.loads(token, salt="deml.google-oauth", max_age=-1)
