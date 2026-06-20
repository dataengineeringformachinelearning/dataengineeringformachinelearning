import asyncio
import json
import logging
import os
import tempfile

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Vulnerability Scanner Service")
logger = logging.getLogger(__name__)

# If cpe-guesser is running as a separate container/service, we point to it here.
# For a fully unified scanner, we might call its internal API, but we'll assume it's available.
CPE_GUESSER_URL = os.getenv(
  "CPE_GUESSER_URL", "http://deml-cpe-guesser.railway.internal:1323/unique"
)


class AppDependencyPayload(BaseModel):
  tenant_id: str
  manifest_type: str  # e.g., 'requirements.txt', 'package-lock.json', 'uv.lock'
  manifest_content: str


class InfraPayload(BaseModel):
  tenant_id: str
  tech_name: str
  version: str


@app.post("/scan/application")
async def scan_application_dependencies(payload: AppDependencyPayload):
  """
  Takes lockfile content, writes it to a temporary file, and runs osv-scanner --offline against it.
  """
  # Create a temporary directory to host the lockfile safely
  with tempfile.TemporaryDirectory() as tmpdir:
    # Some lockfiles need specific names to be recognized (like requirements.txt)
    file_path = os.path.join(tmpdir, payload.manifest_type)
    with open(file_path, "w") as f:
      f.write(payload.manifest_content)

    # Execute osv-scanner offline
    # --json flag returns structured output
    # Assuming the offline database is mounted at /data/osv
    osv_db_path = os.getenv("OSV_DB_PATH", "/data/osv")

    cmd = [
      "osv-scanner",
      "--json",
      f"--local={osv_db_path}"
      if os.path.exists(osv_db_path)
      else "",  # Only use local if it exists, else it might auto-download or fail
      "--lockfile",
      file_path,
    ]

    # Clean up empty args
    cmd = [c for c in cmd if c]

    process = await asyncio.create_subprocess_exec(
      *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0 and process.returncode != 1:
      # osv-scanner returns 1 if vulnerabilities are found, 0 if clean, other codes are errors.
      logger.error(f"osv-scanner error: {stderr.decode()}")
      raise HTTPException(status_code=500, detail="Failed to run osv-scanner")

    try:
      output = json.loads(stdout.decode())
    except json.JSONDecodeError:
      # If nothing was found or output was empty
      return {"tenant_id": payload.tenant_id, "vulnerabilities": []}

    # Parse OSV JSON to a flat list for Polars
    vulns = []
    for result in output.get("results", []):
      for package in result.get("packages", []):
        purl = package.get("package", {}).get("purl", "")
        name = package.get("package", {}).get("name", "")
        version = package.get("package", {}).get("version", "")

        for vuln in package.get("vulnerabilities", []):
          cve_id = vuln.get("id")
          summary = vuln.get("summary", "")
          details = vuln.get("details", "")

          cvss_score = 0.0
          for sev in vuln.get("severity", []):
            if sev.get("type") == "CVSS_V3":
              # CVSS vector, parsing requires library, fallback to High/Critical based on OSV aliases
              pass

          # Remediation (Fixed versions)
          fixed_versions = []
          for affected in vuln.get("affected", []):
            for ranges in affected.get("ranges", []):
              for event in ranges.get("events", []):
                if "fixed" in event:
                  fixed_versions.append(event["fixed"])

          vulns.append(
            {
              "tenant_id": payload.tenant_id,
              "tech_name": name,
              "version": version,
              "purl": purl,
              "cve_id": cve_id,
              "description": summary or details,
              "cvss_score": cvss_score,
              "remediation": ", ".join(fixed_versions) if fixed_versions else "No fix available",
            }
          )

    return {"tenant_id": payload.tenant_id, "vulnerabilities": vulns}


@app.post("/scan/infrastructure")
async def scan_infrastructure(payload: InfraPayload):
  """
  Normalizes infrastructure string to CPE 2.3 using cpe-guesser,
  then queries the NVD REST API and OSV REST API for known vulnerabilities.
  """
  cpe_2_3 = None
  async with httpx.AsyncClient() as client:
    # 1. Get CPE 2.3 from cpe-guesser
    try:
      query = f"{payload.tech_name} {payload.version}".strip()
      response = await client.post(CPE_GUESSER_URL, json={"query": query})
      if response.status_code == 200:
        data = response.json()
        cpe_2_3 = data.get("cpe_2_3", None) if data else None
    except Exception as e:
      logger.error(f"Failed to reach CPE guesser: {e}")

    vulns = []

    # 2. Query NVD API with the CPE 2.3
    if cpe_2_3:
      try:
        nvd_url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cpeName={cpe_2_3}"
        nvd_resp = await client.get(nvd_url, timeout=10.0)
        if nvd_resp.status_code == 200:
          nvd_data = nvd_resp.json()
          for item in nvd_data.get("vulnerabilities", []):
            cve = item.get("cve", {})
            cve_id = cve.get("id")
            descriptions = cve.get("descriptions", [])
            desc = descriptions[0].get("value") if descriptions else ""

            metrics = cve.get("metrics", {})
            cvss_score = 0.0
            if "cvssMetricV31" in metrics:
              cvss_score = metrics["cvssMetricV31"][0].get("cvssData", {}).get("baseScore", 0.0)
            elif "cvssMetricV30" in metrics:
              cvss_score = metrics["cvssMetricV30"][0].get("cvssData", {}).get("baseScore", 0.0)
            elif "cvssMetricV2" in metrics:
              cvss_score = metrics["cvssMetricV2"][0].get("cvssData", {}).get("baseScore", 0.0)

            vulns.append(
              {
                "tenant_id": payload.tenant_id,
                "tech_name": payload.tech_name,
                "version": payload.version,
                "cpe_2_3": cpe_2_3,
                "cve_id": cve_id,
                "description": desc,
                "cvss_score": cvss_score,
                "remediation": "Check vendor advisories for patches",
                "purl": "",
              }
            )
      except Exception as e:
        logger.error(f"NVD API Error for {cpe_2_3}: {e}")

    # 3. Query OSV.dev API as an additional layer (Generic PURL fallback)
    # OSV excels at open source packages, so we try a generic purl.
    if payload.tech_name and payload.version:
      try:
        purl = f"pkg:generic/{payload.tech_name}@{payload.version}"
        osv_resp = await client.post(
          "https://api.osv.dev/v1/query", json={"package": {"purl": purl}}, timeout=10.0
        )
        if osv_resp.status_code == 200:
          osv_data = osv_resp.json()
          for vuln in osv_data.get("vulns", []):
            aliases = vuln.get("aliases", [])
            cve_id = next((a for a in aliases if a.startswith("CVE-")), vuln.get("id"))

            # Avoid duplicates if NVD already found it
            if any(v["cve_id"] == cve_id for v in vulns):
              continue

            vulns.append(
              {
                "tenant_id": payload.tenant_id,
                "tech_name": payload.tech_name,
                "version": payload.version,
                "cpe_2_3": cpe_2_3,
                "cve_id": cve_id,
                "description": vuln.get("summary", vuln.get("details", "")),
                "cvss_score": 0.0,  # OSV API doesn't always return CVSS natively in this endpoint
                "remediation": "Update package",
                "purl": purl,
              }
            )
      except Exception as e:
        logger.error(f"OSV API Error for {payload.tech_name}: {e}")

  # If no vulnerabilities are found, we still return the base info
  if not vulns:
    return {"tenant_id": payload.tenant_id, "vulnerabilities": [], "cpe_2_3": cpe_2_3}

  return {"tenant_id": payload.tenant_id, "vulnerabilities": vulns, "cpe_2_3": cpe_2_3}
