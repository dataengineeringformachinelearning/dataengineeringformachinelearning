---
title: "The first release train: content, prediction, and security controls"
summary: The v0 release series connected the public content system, threat prediction, subscriptions, compliance reporting, encryption, and performance work.
publishedAt: 2026-06-13
note: Platform Note 001
categories:
  - Product
  - Machine Learning
  - Security
featured: false
draft: false
---

## A platform instead of a prototype

The first tagged release train moved DEML from a collection of experiments into a connected product. The marketing and documentation surfaces gained managed content, the application gained an initial threat-prediction model, and the operational backend acquired the security and reporting paths needed to support real accounts.

## Release highlights

- **Content operations:** Sanity-backed publishing created a clean path for announcements and educational material without coupling editorial work to the Django control plane.
- **Predictive intelligence:** the first threat predictor established the model lifecycle that later expanded into SLA and temporal forecasting.
- **Customer lifecycle:** newsletter and subscription flows connected public interest to an owned account model.
- **Security reporting:** compliance, STIX-oriented threat exchange, and reporting features made security findings portable.
- **Telemetry protection:** end-to-end encryption and data safeguards hardened the collection path.
- **Performance:** the v0.5 line concentrated on making the joined experience faster and more reliable.

## Operator notes

This release train also introduced the habit of naming milestones rather than treating every commit as a release. Blue Notes continue that practice: a note groups related product outcomes while the repository remains the detailed engineering record.
