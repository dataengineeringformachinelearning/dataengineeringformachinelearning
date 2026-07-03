from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from monitor.models import MonitoredService, StatusPage, UserLifecycleJob, ValidatedSite

from account.lifecycle import (
  ensure_user_from_firebase,
  ensure_validated_site_for_url,
  execute_deletion_job,
  process_pending_lifecycle_jobs,
  reconcile_all_accounts,
  request_account_deletion,
)

User = get_user_model()


@pytest.mark.django_db
def test_ensure_user_from_firebase_provisions_profile() -> None:
  token = {
    "uid": "firebase-uid-1",
    "email": "owner@example.com",
    "name": "Owner",
    "firebase": {"identities": {"email": ["owner@example.com"]}},
  }
  user, profile, created = ensure_user_from_firebase(token)
  assert created is True
  assert user.username == "firebase-uid-1"
  assert user.email == "owner@example.com"
  assert profile.role == "Operator"
  assert profile.account_id is not None
  assert profile.linked_emails == ["owner@example.com"]


@pytest.mark.django_db
def test_ensure_validated_site_for_url() -> None:
  user = User.objects.create_user(username="uid-2", email="a@example.com")
  site = ensure_validated_site_for_url(user, "https://joealongi.dev/status")
  assert site is not None
  assert site.domain == "joealongi.dev"
  assert ValidatedSite.objects.filter(user=user, domain="joealongi.dev").exists()


@pytest.mark.django_db
def test_add_service_backfills_validated_site_via_lifecycle_helper() -> None:
  user = User.objects.create_user(username="uid-3", email="b@example.com")
  page = StatusPage.objects.create(user=user, title="Site", slug="mysite")
  MonitoredService.objects.create(status_page=page, name="App", url="https://app.example.com")
  ensure_validated_site_for_url(user, "https://app.example.com")
  assert ValidatedSite.objects.filter(user=user, domain="app.example.com").exists()


@pytest.mark.django_db
@patch("account.lifecycle.delete_firebase_user")
@patch("account.lifecycle.cancel_stripe_for_profile")
def test_request_account_deletion_removes_user(
  _mock_stripe: Any,
  _mock_firebase: Any,
) -> None:
  user = User.objects.create_user(username="uid-del", email="del@example.com")
  from monitor.models import UserProfile

  UserProfile.objects.create(user=user)

  job = request_account_deletion(user, firebase_uid="uid-del")
  assert job.state == UserLifecycleJob.State.COMPLETED
  assert not User.objects.filter(username="uid-del").exists()
  assert UserLifecycleJob.objects.filter(id=job.id, state=UserLifecycleJob.State.COMPLETED).exists()


@pytest.mark.django_db
@patch("account.lifecycle.cancel_stripe_for_profile", side_effect=RuntimeError("stripe down"))
@patch("account.lifecycle.delete_firebase_user")
def test_failed_deletion_retried_by_worker(_mock_fb: Any, _mock_stripe: Any) -> None:
  user = User.objects.create_user(username="uid-retry", email="retry@example.com")
  from monitor.models import UserProfile

  UserProfile.objects.create(user=user)
  job = UserLifecycleJob.objects.create(
    user=user,
    account_id=UserProfile.objects.get(user=user).account_id,
    firebase_uid="uid-retry",
    user_email=user.email,
    job_type=UserLifecycleJob.JobType.DELETION,
    state=UserLifecycleJob.State.PENDING,
  )

  assert execute_deletion_job(job) is True
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.COMPLETED
  assert "stripe_cancel" in job.steps_completed
  assert not User.objects.filter(username="uid-retry").exists()


@pytest.mark.django_db
@patch("django.core.management.call_command")
def test_reconcile_all_accounts_runs_subscription_sync(mock_cmd: Any) -> None:
  stats = reconcile_all_accounts()
  assert "stripe_synced" in stats
  mock_cmd.assert_called_once_with("sync_subscriptions")


@pytest.mark.django_db
def test_process_pending_lifecycle_jobs() -> None:
  user = User.objects.create_user(username="uid-queue", email="queue@example.com")
  from monitor.models import UserProfile

  profile = UserProfile.objects.create(user=user)
  job = UserLifecycleJob.objects.create(
    user=user,
    account_id=profile.account_id,
    firebase_uid="uid-queue",
    user_email=user.email,
    job_type=UserLifecycleJob.JobType.DELETION,
    state=UserLifecycleJob.State.PENDING,
    steps_completed=["stripe_cancel", "revoke_api_keys", "firebase_delete"],
  )
  with (
    patch("account.lifecycle.delete_firebase_user"),
    patch("account.lifecycle.cancel_stripe_for_profile"),
  ):
    processed = process_pending_lifecycle_jobs()
  assert processed == 1
  job.refresh_from_db()
  assert job.state == UserLifecycleJob.State.COMPLETED
