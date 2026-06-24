import pytest
from django.conf import settings


@pytest.fixture(autouse=True, scope="session")
def setup_test_db():
  settings.DATABASES = {
    "default": {
      "ENGINE": "django.db.backends.sqlite3",
      "NAME": ":memory:",
    }
  }


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
  pass
