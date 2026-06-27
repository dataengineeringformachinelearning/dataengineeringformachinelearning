import re

with open("backend/monitor/models.py") as f:
  content = f.read()

# Very naive regex to add docstrings right after class definition if not exists.
models_to_docstrings = {
  "Tenant": '"""\n  Core boundary for isolation (CIA Triad: Confidentiality).\n  """',
  "Endpoints": '"""\n  Real-time telemetry and health logs (CIA Triad: Availability).\n  """',
  "ThreatIntelligence": '"""\n  Security monitoring signals (CIA Triad: Integrity & Confidentiality).\n  """',
  "DataEncryptionKey": '"""\n  Manages tenant-specific encryption keys for DEK/KEK architecture.\n  """',
  "AggregatedAnalytics": '"""\n  Rollups of telemetry for scalable dashboard reads.\n  """',
  "AuditLog": '"""\n  Immutable ledger of user actions (CIA Triad: Integrity).\n  """',
}

for model_name, docstring in models_to_docstrings.items():
  pattern = r"(class " + model_name + r"\(models\.Model\):)\n"
  replacement = r"\1\n  " + docstring + r"\n"
  content = re.sub(pattern, replacement, content)

with open("backend/monitor/models.py", "w") as f:
  f.write(content)
