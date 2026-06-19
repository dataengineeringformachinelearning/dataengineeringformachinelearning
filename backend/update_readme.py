import re

with open("README.md") as f:
  content = f.read()

# Replace chapter numbers from 20 up
content = re.sub(r"## Chapter 24:", "## Chapter 25:", content)
content = re.sub(r"## Chapter 23:", "## Chapter 24:", content)
content = re.sub(r"## Chapter 22:", "## Chapter 23:", content)
content = re.sub(r"## Chapter 21:", "## Chapter 22:", content)
content = re.sub(r"## Chapter 20:", "## Chapter 21:", content)

new_chapter = """## Chapter 20: Network Traffic Enrichment and Cybersecurity Telemetry

In the modern threat landscape, simply logging raw IP addresses and standard HTTP metadata is insufficient for building a robust, cyber-aware platform. We must actively transform these opaque identifiers into actionable intelligence. To achieve this, we engineered a dedicated telemetry enrichment layer that intercepts all general traffic (Endpoints) and processes it through a series of specialized open-source tools before it reaches our database.

First, we utilize the `user-agents` Python library to dissect incoming User-Agent strings, accurately classifying the `device_type` (Mobile, Desktop, Tablet, Bot), `os_name`, and `browser_name`. Crucially, this allows us to reliably filter automated bot and crawler traffic out of our core SLA metrics, ensuring our latency distributions represent true human experiences.

Simultaneously, we leverage `ipwhois` and the `ipwho.is` API to perform deep reconnaissance on incoming IP addresses. This yields precise geographic `location` (City, Country), enabling us to correlate traffic spikes with regional events. More importantly, we extract the Autonomous System Number (`asn`) and Internet Service Provider (`isp`). This topological data is a game-changer for cybersecurity: it empowers our threat models to immediately distinguish between benign residential ISPs and data center ASNs (like AWS or DigitalOcean) which are frequently the source of volumetric attacks, scrapers, and malicious botnets.

By structurally integrating this rich metadata directly into our core `Endpoints` model, we unlock advanced anomaly detection capabilities. When combined with our Threat Intelligence feeds, this enriched context allows the platform to preemptively identify and rate-limit suspicious behavioral patterns long before they escalate into critical security incidents.

---

"""

content = content.replace(
  "## Chapter 21: Team Workflows and Vulnerability Management",
  new_chapter + "## Chapter 21: Team Workflows and Vulnerability Management",
)

with open("README.md", "w") as f:
  f.write(content)
