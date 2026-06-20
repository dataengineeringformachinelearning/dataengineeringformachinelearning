import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { Title, Meta } from '@angular/platform-browser';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-whitepaper',
  standalone: true,
  imports: [],
  templateUrl: './whitepaper.html',
  styleUrl: './whitepaper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whitepaper implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle(
      'Whitepaper: Scalable Telemetry & Deep Learning Predictions - Web Application',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Read our whitepaper detailing the architecture of real-time telemetry pipelines and deep learning SLA/TA predictions.',
    });
  }

  downloadPDF() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 20;
    const marginY = 20;
    const gutter = 10;
    const colWidth = (pageWidth - marginX * 2 - gutter) / 2;

    // Abstract indent
    const abstractMargin = 30;
    const abstractWidth = pageWidth - abstractMargin * 2;

    const primaryColor: [number, number, number] = [0, 0, 0];
    const textColor: [number, number, number] = [20, 20, 20];

    let y = marginY;
    let col = 0; // 0 for left, 1 for right

    const checkSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - marginY) {
        if (col === 0) {
          col = 1;
          // Offset below top margin for subsequent pages or column 2
          y = marginY + 5;
        } else {
          doc.addPage();
          col = 0;
          y = marginY + 5;
        }
      }
    };

    // Document Header (Title)
    doc.setFont('Times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const title = 'Scalable Telemetry, Predictive SLAs, & Automated Threat Mitigation';
    const titleLines = doc.splitTextToSize(title, abstractWidth);
    titleLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 7;
    });

    y += 2;
    doc.setFontSize(11);
    doc.setFont('Times', 'normal');
    doc.text('Joe Alongi', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('ORCID: https://orcid.org/0009-0007-2401-2603', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    y += 8;

    // Abstract
    doc.setFontSize(9);
    doc.setFont('Times', 'bold');
    doc.text('Abstract', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('Times', 'italic');
    const abstractText =
      'Architecting the Web Application Platform (DEML Platform): A comprehensive guide to high-throughput event pipelines, ML-forecasted service levels, automated STIX 2.1 threat sharing, and integrated vulnerability management.';
    const abstractLines = doc.splitTextToSize(abstractText, abstractWidth);
    abstractLines.forEach((line: string) => {
      doc.text(line, abstractMargin, y);
      y += 4.5;
    });
    y += 8;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;

    // Start columns
    col = 0;

    // Synced Sections
    const sections = [
      {
        title: '1. Introduction',
        paragraphs: [
          'Modern Software-as-a-Service (SaaS) applications demand continuous reliability. Traditionally, status dashboards and SLA tracking have been reactive—updating only after an incident is resolved. This paper details the architecture of the Data Engineering for Machine Learning Platform (DEML Platform): a next-generation observability pipeline that ingests real-time telemetry at scale and uses Machine Learning to forecast service level agreement compliance and threat anomalies 30 days into the future.',
        ],
      },
      {
        title: '2. High-Throughput Ingestion Architecture',
        paragraphs: [
          'To decouple telemetry parsing from main application databases, the platform implements an asynchronous broker-based pipeline. User-facing client events and microservice health pings are ingested via non-blocking API endpoints and immediately dispatched to a Redpanda message broker.',
          'By utilizing Redpanda (a lightweight, C++ based Kafka-compatible broker), the system achieves sub-millisecond dispatch latencies and avoids JVM resource overhead.',
          'Additionally, to standardize distributed tracing and metrics, the platform integrates an OpenTelemetry (OTel) Collector. The collector receives native OTLP telemetry from the application services and infrastructure, exporting it directly to ClickHouse—a lightning-fast columnar database optimized for OLAP workloads. This separation enables scaled observability and efficient distributed tracing without burdening the primary PostgreSQL transactional database.',
        ],
      },
      {
        title: '3. Asynchronous Batch Processing with Polars',
        paragraphs: [
          'Processing streaming events row-by-row introduces significant database write amplification. Our telemetry worker aggregates incoming events from Redpanda and processes them in micro-batches using Polars, an extremely fast multi-threaded DataFrame library written in Rust.',
          'By batching calculations, historical uptime graphs (30-day intervals) are computed and cumulative SLA and threat records are updated efficiently, reducing disk I/O by over 80%.',
        ],
      },
      {
        title: '4. ML-Powered 30-Day SLA Forecasts',
        paragraphs: [
          'To transition from reactive monitoring to proactive SLA planning, the architecture introduces a predictive neural network built in PyTorch. The network consumes sequence features derived from recent response-time variances, historical error rates, and peak usage patterns to forecast future SLA breaches.',
          'These predictions are loaded into the status pages to give operators early warnings of degradation, allowing teams to intervene before outages affect end-users.',
        ],
      },
      {
        title: '5. ML-Powered Threat Detection & Telemetry Ingestion',
        paragraphs: [
          "Our integration within the Web Application Platform (DEML Platform) with third-party analytics platforms (Google Analytics / GA4, Microsoft Clarity, and Cloudflare Web Analytics) serves as a critical telemetry ingestion phase. By retrieving rich visitor logs, geolocation distributions, token metrics, and request patterns from these platforms, a custom PyTorch neural network model (ThreatModel) is trained to detect anomalies and forecast threat risks 30 days into the future. Looking forward, this third-party ingestion model serves as a precursor to an embedded first-party solution. The embedded status widget securely streams real-time, zero-dependency telemetry (visitor logs, anomalies) directly from the tenant's site into the ingestion pipeline.",
        ],
      },
      {
        title: '6. Next-Generation SIEM/SOAR Digest',
        paragraphs: [
          'Modern cybersecurity trends demonstrate that AI, empowered by Machine Learning and Generative AI, has evolved into a powerful agentic paradigm for threat analysis. Because planning can only encompass known quantities or historical precedents, there exists a distinct challenge: if past data dictates future risk, an entirely new paradigm must be engineered.',
          "Drawing architectural inspiration from established industry intelligence platforms such as IBM X-Force, Google Cloud Mandiant, and GreyNoise, as well as advanced analytical frameworks like the NSA's Ghidra, the DEML Platform was designed to push the boundaries of automated intelligence. To address this, the platform integrates a next-generation threat intelligence sharing pipeline that automatically serializes PyTorch neural network anomaly predictions into standard STIX 2.1 JSON payloads. These payloads define structural indicator, observed-data, and identity objects to map out threat signatures.",
          'Using TAXII 2.1 and REST protocols, these indicators are routed natively to federal databases like CISA AIS (Automated Indicator Sharing) and industry hubs like MS-ISAC or IT-ISAC. To protect public feeds from pollution, a sandbox mode safely runs simulated transmissions locally unless live credentials are provided.',
          'Furthermore, to support SOC 2 Type II and CMMC 2.0 (Level 2) Readiness and compliance audits, the platform implements an end-to-end security architecture. This includes real-time E2E encryption telemetry (TLS 1.3 in-transit, and GCP KMS-backed envelope encryption at-rest with 30-day rotation), immutable audit logging streamed directly to centralized Google Cloud Logging buckets for SIEM ingestion, granular Role-Based Access Control (RBAC) supporting Viewer, Operator, and Security Admin configurations, hardened Google distroless container images executing under least-privilege non-root policies, strict Content-Security-Policy (CSP) and HSTS security headers, and continuous vulnerability guarding via Semgrep, Renovate, Trivy, Gitleaks, and detect-secrets.',
        ],
      },
      {
        title: '7. Data Tenancy, Retention, and Lifecycle Policy',
        paragraphs: [
          "Observability systems must ensure strict isolation. The DEML Platform enforces absolute multi-tenancy boundaries at the database level and ensures all data is private-by-default. Direct cross-tenant fallbacks are strictly eliminated; instead, threat models and predictions are trained exclusively on the target user's telemetry. If a tenant does not yet have enough collected telemetry, the model is trained on-demand using safe, zero-threat baselines instead of shared data.",
          'To protect sensitive credentials from unauthorized exposure, the platform utilizes transparent application-level AES-256 Fernet encryption at-rest. Furthermore, public access to status page details, services, incidents, and telemetry graphs is strictly restricted. Unless the status page owner explicitly approves by publishing the page, the system blocks all public traffic, preventing the exposure of private endpoints or telemetry.',
          'Additionally, the platform implements a strict 30-day retention and lifecycle policy. All telemetry data, log entries, incident histories, and historical ML reports are purged from the database exactly 30 days after their creation date. The ML training worker automatically triggers full model retraining and telemetry cleanup upon application deployment and runs continuously every hour.',
          'Furthermore, the engineering roadmap includes integrations with monetization systems like Stripe. This will enable paid tiers where models and forecasts are refreshed at a high-frequency interval (every 15 minutes), while standard tiers continue on the baseline hourly retraining schedule.',
        ],
      },
      {
        title: '8. Team Workflows and Vulnerability Management',
        paragraphs: [
          'To facilitate collaborative security workflows and structured issue tracking, the platform implements a self-contained, integrated vulnerability tracking and management component. This component features an interactive Kanban board layout to prioritize, assign, and track remediation efforts natively, allowing security teams to update vulnerability states based on customized impact and likelihood metrics.',
          'Furthermore, strict compliance is enforced by integrating automated accessibility scanners directly into local Git hooks, ensuring no inaccessible templates are staged or committed. To maintain high visual quality, a custom skeleton loader was implemented for smooth page-loading transitions, and the user interface aligns with a premium, high-contrast Scandinavian Ocean Deep Metallic-inspired design system.',
        ],
      },
      {
        title: '9. Conclusion',
        paragraphs: [
          'By combining asynchronous broker patterns, ultra-fast DataFrame engines, and predictive deep learning models, the platform establishes a robust data engineering framework that elevates the reliability of machine learning infrastructure.',
        ],
      },
      {
        title: '10. References',
        paragraphs: [
          '[1] Redpanda Data, Inc. (2026). Redpanda.',
          '[2] Apache Software Foundation. (2026). Apache Kafka.',
          '[3] Polars. (2026). Polars: Fast multi-threaded DataFrame library.',
          '[4] Paszke, A., et al. (2019). PyTorch.',
          '[5] Pedregosa, F., et al. (2011). Scikit-learn.',
          '[6] OpenTelemetry Authors. (2026). OpenTelemetry.',
          '[7] ClickHouse, Inc. (2026). ClickHouse.',
          '[8] OASIS Cyber Threat Intelligence (CTI) TC. (2021). STIX 2.1 and TAXII 2.1.',
          '[9] IBM Security. (2026). IBM X-Force Threat Intelligence.',
          '[10] Google Cloud. (2026). Mandiant Threat Intelligence.',
          '[11] GreyNoise Intelligence. (2026). GreyNoise: Internet Background Noise.',
          '[12] National Security Agency (NSA). (2026). Ghidra Software Reverse Engineering Framework.',
        ],
      },
      {
        title: '11. License',
        paragraphs: [
          'This work is licensed under a Creative Commons Attribution 4.0 International License (CC BY 4.0). For more information, visit https://creativecommons.org/licenses/by/4.0/.',
        ],
      },
    ];

    sections.forEach(sec => {
      // Title
      checkSpace(12);
      doc.setFont('Times', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

      let currentX = marginX + col * (colWidth + gutter);

      const titleLines = doc.splitTextToSize(sec.title, colWidth);
      titleLines.forEach((line: string) => {
        checkSpace(6);
        currentX = marginX + col * (colWidth + gutter);
        doc.text(line, currentX, y);
        y += 5;
      });
      y += 2;

      // Paragraphs
      doc.setFont('Times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      sec.paragraphs.forEach(p => {
        const pLines = doc.splitTextToSize(p, colWidth);
        pLines.forEach((line: string) => {
          checkSpace(5);
          currentX = marginX + col * (colWidth + gutter);
          doc.text(line, currentX, y);
          y += 4.5;
        });
        y += 2; // space between paragraphs
      });
      y += 4; // space between sections
    });

    doc.save(
      'Scalable_Telemetry_Predictive_SLAs_and_Automated_Threat_Mitigation_-_Whitepaper_-_Joe_Alongi.pdf',
    );
  }
}
