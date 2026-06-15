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
      'Whitepaper: Scalable Telemetry & Deep Learning Predictions - Data Engineering for Machine Learning',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Read our technical whitepaper detailing the architecture of real-time telemetry pipelines and deep learning SLA/TA predictions.',
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
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Color Palette matching THEME.md
    const primaryColor = [45, 71, 57]; // #2d4739 (Deep Green)
    const textColor = [24, 40, 33]; // #182821 (Deep Forest Green / Dark Text)
    const grayColor = [85, 85, 85]; // Accent / Muted gray

    let y = margin;

    // Helper to check space and add page
    const checkSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        // Draw page border or header line on new pages
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, margin - 8, pageWidth - margin, margin - 8);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
        doc.text(
          'Technical Whitepaper: Extensible Deep Learning Telemetry Pipeline (SLA & TA)',
          margin,
          margin - 10,
        );
      }
    };

    // Document Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TECHNICAL WHITEPAPER', margin, y);
    y += 8;

    doc.setFontSize(22);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const titleLines = doc.splitTextToSize(
      'Scalable Telemetry & Deep Learning Pipeline (SLA/TA)',
      contentWidth,
    );
    titleLines.forEach((line: string) => {
      checkSpace(10);
      doc.text(line, margin, y);
      y += 10;
    });
    y += 2;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    const subtitleLines = doc.splitTextToSize(
      'Architecting an extensible deep learning pipeline for real-time telemetry, featuring active SLA and TA modules with support for future expansions.',
      contentWidth,
    );
    subtitleLines.forEach((line: string) => {
      checkSpace(6);
      doc.text(line, margin, y);
      y += 6;
    });
    y += 4;

    doc.setFontSize(9);
    doc.text('Published: June 2026   |   Author: Joe Alongi', margin, y);
    y += 6;

    // Header divider line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Sections configuration
    const sections = [
      {
        title: '1. Executive Summary',
        paragraphs: [
          'Modern Software-as-a-Service (SaaS) applications demand continuous reliability. Traditionally, status dashboards and SLA tracking have been reactive—updating only after an incident is resolved. This paper details the architecture of the Data Engineering for Machine Learning Platform (DEML Platform): a next-generation observability pipeline that ingests real-time telemetry at scale and orchestrates an extensible deep learning pipeline with two active prediction modules—Service Level Agreement (SLA) predictions and Threat Anomaly (TA) analytics—with support for future expansion.',
        ],
      },
      {
        title: '2. High-Throughput Ingestion Architecture',
        paragraphs: [
          'To decouple telemetry parsing from main application databases, we implement an asynchronous broker-based pipeline. User-facing client events and microservice health pings are ingested via non-blocking API endpoints and immediately dispatched to a Redpanda message broker.',
          'Pipeline flow: Client Telemetry -> Redpanda Topic -> Polars Batch Processor -> PostgreSQL',
          'By utilizing Redpanda (a lightweight, C++ based Kafka-compatible broker), we achieve sub-millisecond dispatch latencies and avoid JVM resource overhead.',
        ],
      },
      {
        title: '3. Asynchronous Batch Processing with Polars',
        paragraphs: [
          'Processing streaming events row-by-row introduces significant database write amplification. Our telemetry worker aggregates incoming events from Redpanda and processes them in micro-batches using Polars, an extremely fast multi-threaded DataFrame library written in Rust.',
          'By batching calculations, we compute historical uptime graphs (90-day intervals) and update cumulative SLA and threat records efficiently, reducing disk I/O by over 80%.',
        ],
      },
      {
        title: '4. Extensible Deep Learning Pipeline',
        paragraphs: [
          'To transition from reactive monitoring to proactive planning, we introduce a predictive deep learning pipeline built in PyTorch. The pipeline consumes sequence features derived from recent response-time variances, historical error rates, and peak usage patterns.',
          'Rather than isolated models, the architecture exposes an extensible registry allowing the system to run multiple prediction modules concurrently. Currently, the pipeline hosts two primary modules: SLA forecasting and TA (Threat Anomaly) forecasting, with hooks prepared for future specialized analytics modules.',
        ],
      },
      {
        title: '5. ML-Powered 90-Day Threat Detection & Telemetry Ingestion',
        paragraphs: [
          'Our integration within the Data Engineering for Machine Learning Platform (DEML Platform) with third-party analytics platforms (Google Analytics / GA4, Microsoft Clarity, and Cloudflare Web Analytics) serves as a critical telemetry ingestion phase. By retrieving visitor logs, geolocation distributions, token metrics, and request patterns, we feed our deep learning pipeline to detect anomalies and forecast threat risks 90 days into the future. Looking forward, this third-party ingestion model serves as a precursor to an embedded first-party client script and dynamic widget that tenants can load directly on their sites, providing zero-dependency telemetry streaming.',
        ],
      },
      {
        title: '6. Next-Generation SIEM/SOAR Digest & Automated Threat Sharing',
        paragraphs: [
          'Modern cybersecurity trends demonstrate that AI, empowered by Machine Learning and Generative AI, has evolved into a powerful agentic paradigm for threat analysis. Because we can only plan for what we know or what history provides precedent for, we face a distinct challenge: if past data dictates future risk, we must engineer an entirely new way forward.',
          'To address this, the DEML Platform integrates a next-generation threat intelligence sharing pipeline that automatically serializes PyTorch neural network anomaly predictions into standard STIX 2.1 JSON payloads. These payloads define structural indicator, observed-data, and identity objects to map out threat signatures.',
          'Using TAXII 2.1 and REST protocols, these indicators are routed natively to federal databases like CISA AIS (Automated Indicator Sharing) and industry hubs like MS-ISAC or IT-ISAC. To protect public feeds from pollution, a sandbox mode safely runs simulated transmissions locally unless live credentials are provided.',
          'Furthermore, to support SOC 2 Type II and CMMC 2.0 (Level 2) Readiness and compliance audits, the platform implements an end-to-end security architecture. This includes real-time E2E encryption telemetry (TLS 1.3 in-transit, and GCP KMS-backed envelope encryption at-rest with 90-day rotation), immutable audit logging streamed directly to centralized Google Cloud Logging buckets for SIEM ingestion, granular Role-Based Access Control (RBAC) supporting Viewer, Operator, and Security Admin configurations, hardened distroless Chainguard container images executing under least-privilege non-root policies (USER nginx), strict Content-Security-Policy (CSP) and HSTS security headers, and continuous vulnerability guarding via Semgrep (for continuous code and dependency scanning), Renovate (for automated dependency upgrades), local Socket.dev, Checkov, Trivy, Gitleaks, detect-secrets (with custom baseline filters), and Django Migration Linter checks.',
        ],
      },
      {
        title: '7. Data Tenancy, Retention, and Lifecycle Policy',
        paragraphs: [
          "Observability systems must ensure strict isolation. The DEML Platform enforces absolute multi-tenancy boundaries at the database level and ensures all data is private-by-default. Direct cross-tenant fallbacks (such as global threat reports) are strictly eliminated; instead, threat models and predictions are trained exclusively on the target user's telemetry. If a tenant does not yet have enough collected telemetry, the model is trained on-demand using safe, zero-threat baselines instead of shared data.",
          'To protect sensitive credentials (such as Google Analytics 4 tokens, Microsoft Clarity API keys, and Cloudflare tokens) from unauthorized exposure, the platform utilizes transparent application-level AES-256 Fernet encryption at-rest. Furthermore, public access to status page details, services, incidents, and telemetry graphs is strictly restricted. Unless the status page owner explicitly approves by publishing the page, the system blocks all public traffic, preventing the exposure of private endpoints or telemetry.',
          'Additionally, the platform implements a strict 90-day retention and lifecycle policy. All telemetry data, log entries, incident histories, and historical ML reports are purged from the database exactly 90 days after their creation date. The ML training worker automatically triggers full model retraining and telemetry cleanup upon application deployment and runs continuously every hour.',
          'Furthermore, our engineering roadmap includes integrations with monetization systems like Stripe. This will enable paid tiers where models and forecasts are refreshed at a high-frequency interval (every 15 minutes), while standard tiers continue on the baseline hourly retraining schedule.',
        ],
      },
      {
        title: '8. Team Workflows and Integrated Vulnerability Management',
        paragraphs: [
          'To facilitate collaborative security workflows and structured issue tracking, the platform implements a self-contained, integrated vulnerability tracking and management component. This component features an interactive Kanban board layout to prioritize, assign, and track remediation efforts natively, allowing security teams to update vulnerability states based on customized impact and likelihood metrics.',
          'Furthermore, we enforce strict compliance by integrating automated accessibility scanners (such as Axe-Core) directly into local Git hooks, ensuring no inaccessible templates are staged or committed. To maintain high visual quality, we implemented a custom skeleton loader for smooth page-loading transitions, and aligned the user interface with a premium, high-contrast Porsche Jet Green Metallic-inspired design system.',
        ],
      },
      {
        title: '9. Conclusion',
        paragraphs: [
          'By combining asynchronous broker patterns, ultra-fast DataFrame engines, and predictive deep learning models, we establish a robust data engineering framework that elevates the reliability of machine learning infrastructure.',
        ],
      },
    ];

    sections.forEach(sec => {
      // Print Section Title
      checkSpace(12);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(sec.title, margin, y);
      y += 8;

      // Print Paragraphs
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      sec.paragraphs.forEach(p => {
        const pLines = doc.splitTextToSize(p, contentWidth);
        pLines.forEach((line: string) => {
          checkSpace(6);
          doc.text(line, margin, y);
          y += 6;
        });
        y += 4; // space between paragraphs
      });
      y += 4; // space between sections
    });

    // Save the PDF document
    doc.save('Scalable_Telemetry_SLA_Predictions_Whitepaper.pdf');
  }
}
