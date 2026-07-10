import { createHash } from "node:crypto";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;

/**
 * Validate caller-provided idempotency keys before they reach Redpanda or
 * Firestore. Bounded, path-safe keys prevent oversized projection documents
 * and make the worker's deduplication contract deterministic.
 */
export const validateIdempotencyKey = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error("idempotency_key must be a string");
  }
  if (
    value.length < IDEMPOTENCY_KEY_MIN_LENGTH ||
    value.length > IDEMPOTENCY_KEY_MAX_LENGTH
  ) {
    const lengthRange = `${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH}`;
    throw new Error(`idempotency_key must be ${lengthRange} characters`);
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new Error("idempotency_key contains unsupported characters");
  }
  return value;
};

/** Generate a fixed-width key without exposing Firebase UIDs in projection IDs. */
export const generateIdempotencyKey = (
  uid: string,
  timestamp: string,
  action: string,
): string =>
  createHash("sha256").update(`${uid}:${timestamp}:${action}`).digest("hex");
