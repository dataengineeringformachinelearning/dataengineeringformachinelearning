import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-whitepaper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whitepaper.html',
  styleUrl: './whitepaper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whitepaper implements OnInit {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Whitepaper: Scalable Telemetry & SLA Predictions - Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content: 'Read our technical whitepaper detailing the architecture of real-time telemetry pipelines and ML-based SLA predictions.'
    });
  }

  downloadPDF() {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

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
        doc.text('Technical Whitepaper: Scalable Telemetry & ML-Predicted SLAs', margin, margin - 10);
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
    const titleLines = doc.splitTextToSize('Scalable Telemetry & ML-Predicted SLAs', contentWidth);
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
      'Architecting high-throughput event pipelines and predictive service level agreement models for modern SaaS platforms.',
      contentWidth
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
          'Modern Software-as-a-Service (SaaS) applications demand continuous reliability. Traditionally, status dashboards and SLA tracking have been reactive—updating only after an incident is resolved. This paper details the architecture of a next-generation observability pipeline that ingests real-time telemetry at scale and uses Machine Learning to forecast service level agreement compliance 90 days into the future.'
        ]
      },
      {
        title: '2. High-Throughput Ingestion Architecture',
        paragraphs: [
          'To decouple telemetry parsing from main application databases, we implement an asynchronous broker-based pipeline. User-facing client events and microservice health pings are ingested via non-blocking API endpoints and immediately dispatched to a Redpanda message broker.',
          'Pipeline flow: Client Telemetry -> Redpanda Topic -> Polars Batch Processor -> PostgreSQL',
          'By utilizing Redpanda (a lightweight, C++ based Kafka-compatible broker), we achieve sub-millisecond dispatch latencies and avoid JVM resource overhead.'
        ]
      },
      {
        title: '3. Asynchronous Batch Processing with Polars',
        paragraphs: [
          'Processing streaming events row-by-row introduces significant database write amplification. Our telemetry worker aggregates incoming events from Redpanda and processes them in micro-batches using Polars, an extremely fast multi-threaded DataFrame library written in Rust.',
          'By batching calculations, we compute historical uptime graphs (90-day intervals) and update cumulative SLA records efficiently, reducing disk I/O by over 80%.'
        ]
      },
      {
        title: '4. ML-Powered 90-Day SLA Forecasts',
        paragraphs: [
          'To transition from reactive monitoring to proactive SLA planning, we introduce a predictive neural network built in PyTorch. The network consumes sequence features derived from recent response-time variances, historical error rates, and peak usage patterns to forecast future SLA breaches.',
          'These predictions are loaded into the status pages to give operators early warnings of degradation, allowing teams to intervene before outages affect end-users.'
        ]
      },
      {
        title: '5. Next-Generation SIEM/SOAR Evolution',
        paragraphs: [
          'Modern cybersecurity trends demonstrate that AI, empowered by Machine Learning and Generative AI, has evolved into a powerful agentic paradigm for threat analysis. Because we can only plan for what we know or what history provides precedent for, we face a distinct challenge: if past data dictates future risk, we must engineer an entirely new way forward.',
          'To address this, we outline a data engineering software stack designed to process and forecast these phenomena. Just as the future will require multiple specialized AI agents, it will also demand domain-specific pipelines. These pipelines must ingest massive streams of threat analysis and distill them into actionable, real-time decisions.',
          'Framed conceptually as a book and built with the collaborative power of Gemini and Grok, this open-source framework is designed to test this theory. The ultimate goal is to build upon this foundation over time, eventually engineering an open-source engine for next-generation SIEM/SOAR (Security Information and Event Management / Security Orchestration, Automation, and Response) ecosystems.'
        ]
      },
      {
        title: '6. Conclusion',
        paragraphs: [
          'By combining asynchronous broker patterns, ultra-fast DataFrame engines, and predictive deep learning models, we establish a robust data engineering framework that elevates the reliability of machine learning infrastructure.'
        ]
      }
    ];

    sections.forEach((sec) => {
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

      sec.paragraphs.forEach((p) => {
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

