import os

# Files to process
files = ["AGENTS.md", "README.md", "WHITEPAPER.md", "BOOK.md", "docs/conops.md"]

for filename in files:
  if os.path.exists(filename):
    with open(filename) as f:
      content = f.read()

    # We need to replace specific contexts
    content = content.replace("Railway (14 services)", "Google Cloud Run (14 services)")
    content = content.replace("Railway dashboard", "GCP dashboard")
    content = content.replace("Railway metrics", "GCP metrics")
    content = content.replace("Railway public broker URLs", "Public broker URLs")
    content = content.replace("Railway internal broker", "internal broker")
    content = content.replace("Railway rolling deploy", "Cloud Run rolling deploy")
    content = content.replace("Railway compute", "Google Cloud compute")
    content = content.replace("Deploy on Railway", "Deploy on Google Cloud")
    content = content.replace(
      "https://railway.com/button.svg", "https://deploy.cloud.run/button.svg"
    )
    content = content.replace(
      "https://railway.com/deploy/deml?referralCode=BpTk0g&utm_medium=integration&utm_source=template&utm_campaign=generic",
      "#",
    )
    content = content.replace("Railway services", "Cloud Run services")
    content = content.replace("Railway service", "Cloud Run service")
    content = content.replace("Railway-internal", "internal")
    content = content.replace("Railway Pro", "Cloud Run")
    content = content.replace("Railway environment", "Google Cloud environment")
    content = content.replace("Railway webhook", "Cloud Build webhook")
    content = content.replace("Railway restore", "Cloud SQL restore")
    content = content.replace("Railway deployment", "Cloud Run deployment")
    content = content.replace("Railway deploy", "Cloud Run deploy")
    content = content.replace("Railway provides", "Google Cloud provides")
    content = content.replace("Railway hosts", "Google Cloud Run hosts")
    content = content.replace("Railway / Firebase", "Cloud Run / Firebase")
    content = content.replace("Railway", "Cloud Run")
    content = content.replace("railway.app", "cloud.google.com/run")
    content = content.replace("*.railway.internal", "*.internal")
    content = content.replace("deml-queue.railway.internal", "deml-queue.internal")

    with open(filename, "w") as f:
      f.write(content)
    print(f"Updated {filename}")
