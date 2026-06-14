output "kms_key_id" {
  value       = google_kms_crypto_key.crypto_key.id
  description = "The fully qualified resource path of the KMS cryptographic key."
}

output "logging_bucket_name" {
  value       = google_storage_bucket.logging_bucket.name
  description = "The name of the immutable GCS logging bucket."
}

output "service_account_email" {
  value       = google_service_account.app_sa.email
  description = "The service account email used by the application."
}
