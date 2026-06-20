# Data and Enrichment Architecture

This document outlines our strategy for collecting, aggregating, and enriching network traffic and telemetry data to provide a comprehensive view of system performance, cybersecurity risks, and user behavior.

## 1. Data Collection Strategy

The application acts as a central hub for collecting telemetry across multiple fronts:

- **General Endpoints Traffic:** Captures raw requests, latency, HTTP status codes, and IP addresses of clients interacting with monitored systems.
- **Threat Intelligence:** Identifies malicious IPs, abuse scores, and suspicious payloads by leveraging external signals or internal heuristic detections.
- **User Interactions & Consents:** Records UI interactions (widget clicks) and explicit privacy choices (Analytical/Marketing cookie consents).
- **Incident & Status Telemetry:** Logs downtime, service degraded states, and system incidents.

## 2. Traffic Enrichments

To build a cyber-aware understanding of our traffic, raw data points (such as IP address and User-Agent strings) are piped through an enrichment layer.

### 2.1 Geographic Origins (GeoIP)

- **Source:** External IP-to-Geo API (`https://ipwho.is/`) / Local DB.
- **Fields Extracted:** `location` (City, Country), `asn`, `isp`.
- **Purpose:** Identifies regions with unusual spikes in traffic, maps where threats originate, and allows geographic bounding of SLA commitments.

### 2.2 Network Topology (ASN & ISP)

- **Source:** `ipwhois` (RDAP lookups).
- **Fields Extracted:** `asn` (Autonomous System Number), `isp` (Internet Service Provider or Org name).
- **Purpose:** Crucial for cybersecurity. Helps differentiate between residential ISPs (normal users) and Data Center ASNs (e.g., AWS, DigitalOcean), which are common sources of botnets, scrapers, and volumetric attacks.

### 2.3 User-Agent Parsing

- **Source:** `user-agents` Python library.
- **Fields Extracted:** `device_type` (Mobile, Desktop, Tablet, Bot), `os_name`, `browser_name`, `is_bot`.
- **Purpose:** Allows us to aggregate performance metrics by device class (e.g., identifying if latency is worse on mobile) and cleanly separate human traffic from automated bot/crawler traffic.

### 2.4 Vulnerability Scanner & Asset Inventory

- **Source:** Internal `scanner` microservice (`osv-scanner` & `cpe-guesser`).
- **Fields Extracted:** `cve_id`, `cvss_score`, `remediation`, `cpe_2_3`.
- **Purpose:** Normalizes infrastructure signatures and application lockfiles into known Common Platform Enumerations (CPEs) to automatically cross-reference with localized CVE databases. Enriches our telemetry to proactively map known software vulnerabilities to specific tenants and infrastructure components.

## 3. Cybersecurity & Risk Context

By joining the enriched general traffic with the Threat Intelligence models, we unlock several advanced analytical capabilities:

- **Anomaly Detection:** Sudden influxes of traffic from a single ASN or country that do not align with regular user behavior can trigger preemptive rate-limiting or alerts.
- **Threat Correlation:** If an IP is flagged in `ThreatIntelligence`, we can immediately trace its historical `Endpoints` activity to assess what services were probed before the attack.
- **Bot Mitigation:** Enriched `is_bot` flags combined with Data Center ASN detection provide a high-confidence signal to filter out non-human traffic from our core SLA and latency calculations.

## 4. Data Privacy & Compliance

Because we are processing potentially identifiable information (IP addresses, precise locations), we strictly adhere to the following principles:

- **Consent Gateways:** Enriched analytical tracking relies on the `CookieConsent` model. If a user rejects analytical cookies, their data is aggregated anonymously.
- **Data Minimization:** Once an IP is enriched to an ASN/Geo and its session concludes, we strive to drop the raw IP from long-term aggregate storage (using the `AggregatedAnalytics` roll-up buckets) to prevent unauthorized PII accumulation.
- **Security by Design:** All third-party integrations (Google Analytics, Microsoft Clarity) are opt-in and handled via secure encrypted credential storage in `AnalyticsIntegration`.
