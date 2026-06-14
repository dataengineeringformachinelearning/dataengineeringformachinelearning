variable "project_id" {
  type        = string
  description = "The Google Cloud Platform project ID."
  default     = "dataengineering-ml-prod"
}

variable "region" {
  type        = string
  description = "The GCP region to deploy resources in."
  default     = "us-central1"
}

variable "kms_location" {
  type        = string
  description = "The KMS keyring location (typically global or regional)."
  default     = "us-central1"
}

variable "kms_key_ring_name" {
  type        = string
  description = "Name of the KMS KeyRing."
  default     = "compliance-keyring"
}

variable "kms_key_name" {
  type        = string
  description = "Name of the KMS CryptoKey."
  default     = "database-kek"
}
