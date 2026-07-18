# Generated manually — Postgres session registry (replaces deml-dragonfly).

from django.db import migrations, models


class Migration(migrations.Migration):
  dependencies = [
    ("monitor", "0056_forjd_shadow_receipt"),
  ]

  operations = [
    migrations.CreateModel(
      name="BrowserSession",
      fields=[
        ("session_id", models.CharField(max_length=128, primary_key=True, serialize=False)),
        ("firebase_uid", models.CharField(db_index=True, max_length=128)),
        ("user_id", models.PositiveIntegerField()),
        ("user_agent", models.CharField(blank=True, default="", max_length=512)),
        ("ip", models.CharField(blank=True, default="", max_length=64)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("last_seen", models.DateTimeField(auto_now=True)),
        ("expires_at", models.DateTimeField(db_index=True)),
      ],
      options={
        "db_table": "browser_sessions",
      },
    ),
    migrations.CreateModel(
      name="AuthHandoffToken",
      fields=[
        ("token_hash", models.CharField(max_length=64, primary_key=True, serialize=False)),
        ("user_id", models.PositiveIntegerField()),
        ("code_challenge", models.CharField(blank=True, default="", max_length=128)),
        ("client_name", models.CharField(blank=True, default="", max_length=64)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("expires_at", models.DateTimeField(db_index=True)),
        ("consumed_at", models.DateTimeField(blank=True, null=True)),
      ],
      options={
        "db_table": "auth_handoff_tokens",
      },
    ),
    migrations.AddIndex(
      model_name="browsersession",
      index=models.Index(fields=["firebase_uid", "-last_seen"], name="browser_ses_firebas_idx"),
    ),
  ]
