terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# KMS KeyRing
resource "google_kms_key_ring" "keyring" {
  name     = var.kms_key_ring_name
  location = var.kms_location
}

# KMS Cryptographic Key for Envelope Encryption (Rotation every 90 days)
resource "google_kms_crypto_key" "crypto_key" {
  name            = var.kms_key_name
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s" # 90 days in seconds

  lifecycle {
    prevent_destroy = true
  }
}

# Tamper-Proof Centralized Immutable Logging Bucket
resource "google_storage_bucket" "logging_bucket" {
  #checkov:skip=CKV_GCP_62:This is the destination audit logging bucket, self-logging causes infinite loop.
  name                        = "${var.project_id}-immutable-audit-logs"
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  public_access_prevention = "enforced"

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.crypto_key.id
  }

  retention_policy {
    is_locked        = true
    retention_period = 2592000 # 30 days retention policy in seconds
  }
}

# IAM Service Account for the Application
resource "google_service_account" "app_sa" {
  account_id   = "telemetry-app-sa"
  display_name = "Telemetry Application Service Account"
}

# Grant Service Account KMS CryptoKey Encrypter/Decrypter permissions
resource "google_kms_crypto_key_iam_member" "kms_iam" {
  crypto_key_id = google_kms_crypto_key.crypto_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.app_sa.email}"
}

# Grant Service Account permission to write logs to GCP Cloud Logging
resource "google_project_iam_member" "logging_iam" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}
