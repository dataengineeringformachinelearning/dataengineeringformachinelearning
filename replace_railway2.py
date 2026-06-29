import os

files = ["AGENTS.md", "README.md", "WHITEPAPER.md", "BOOK.md", "docs/conops.md"]

for filename in files:
  if os.path.exists(filename):
    with open(filename) as f:
      content = f.read()

    # We need to replace specific contexts
    content = content.replace("railway-deployment", "cloud-run-deployment")
    content = content.replace("Railway CLI", "gcloud CLI")
    content = content.replace("railway volume add", "gcloud compute disks create")
    content = content.replace(
      "railway tcp-proxy create", "gcloud compute target-tcp-proxies create"
    )
    content = content.replace("railway link", "gcloud config set project")
    content = content.replace("railway variables --service", "gcloud run services update")
    content = content.replace("railway variables", "gcloud run services update")
    content = content.replace("railway.json", "cloudbuild.yaml")
    content = content.replace(".railway.internal", ".internal")
    content = content.replace("Railway", "Cloud Run")
    content = content.replace("railway", "cloudrun")

    with open(filename, "w") as f:
      f.write(content)
    print(f"Updated {filename}")
