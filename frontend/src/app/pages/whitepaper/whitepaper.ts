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
          'Our current integration within the Data Engineering for Machine Learning Platform (DEML Platform) with third-party analytics platforms (Google Analytics / GA4 and Microsoft Clarity) serves as a critical telemetry ingestion phase. By retrieving visitor logs, geolocation distributions, and request patterns, we feed our deep learning pipeline to detect anomalies and forecast threat risks 90 days into the future. Looking forward, this third-party ingestion model serves as a precursor to an embedded first-party client script and dynamic widget that tenants can load directly on their sites, providing zero-dependency telemetry streaming.',
        ],
      },
      {
        title: '6. Next-Generation SIEM/SOAR Digest',
        paragraphs: [
          'Modern cybersecurity trends demonstrate that AI, empowered by Machine Learning and Generative AI, has evolved into a powerful agentic paradigm for threat analysis. Because we can only plan for what we know or what history provides precedent for, we face a distinct challenge: if past data dictates future risk, we must engineer an entirely new way forward.',
          'To address this, we outline an agentic digest pipeline designed to aggregate, summarize, and publish security intelligence periodically. Just as the future will require multiple specialized AI agents, it will also demand domain-specific digests. These pipelines ingest massive streams of threat analysis and distill them into actionable, real-time security digests and executive briefings.',
          'Framed conceptually as a book and built with the collaborative power of Gemini and Grok, this open-source framework is designed to test this theory. The ultimate goal is to build upon this foundation over time, eventually engineering an open-source engine for next-generation SIEM/SOAR (Security Information and Event Management / Security Orchestration, Automation, and Response) digests.',
        ],
      },
      {
        title: '7. Data Tenancy, Retention, and Lifecycle Policy',
        paragraphs: [
          "Observability systems must ensure strict isolation. The DEML Platform enforces absolute multi-tenancy boundaries at the database level and ensures all data is private-by-default. Direct cross-tenant fallbacks (such as global threat reports) are strictly eliminated; instead, threat models and predictions are trained exclusively on the target user's telemetry. If a tenant does not yet have enough collected telemetry, the model is trained on-demand using safe, zero-threat baselines instead of shared data.",
          'To protect sensitive credentials (such as Google Analytics 4 tokens and Microsoft Clarity API keys) from unauthorized exposure, the platform utilizes transparent application-level AES-256 Fernet encryption at-rest. Furthermore, public access to status page details, services, incidents, and telemetry graphs is strictly restricted. Unless the status page owner explicitly approves by publishing the page, the system blocks all public traffic, preventing the exposure of private endpoints or telemetry.',
          'Additionally, the platform implements a strict 90-day retention and lifecycle policy. All telemetry data, log entries, incident histories, and historical ML reports are purged from the database exactly 90 days after their creation date. The ML training worker automatically triggers full model retraining and telemetry cleanup upon application deployment and runs continuously every hour.',
          'Furthermore, our engineering roadmap includes integrations with monetization systems like Stripe. This will enable paid tiers where models and forecasts are refreshed at a high-frequency interval (every 15 minutes), while standard tiers continue on the baseline hourly retraining schedule.',
        ],
      },
      {
        title: '8. Conclusion',
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
