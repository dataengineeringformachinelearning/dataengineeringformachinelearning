"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = exports.validateIdempotencyKey = void 0;
const node_crypto_1 = require("node:crypto");
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const IDEMPOTENCY_KEY_MIN_LENGTH = 16;
const IDEMPOTENCY_KEY_MAX_LENGTH = 128;
/**
 * Validate caller-provided idempotency keys before they reach Redpanda or
 * Firestore. Bounded, path-safe keys prevent oversized projection documents
 * and make the worker's deduplication contract deterministic.
 */
const validateIdempotencyKey = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value !== "string") {
        throw new Error("idempotency_key must be a string");
    }
    if (value.length < IDEMPOTENCY_KEY_MIN_LENGTH ||
        value.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
        const lengthRange = `${IDEMPOTENCY_KEY_MIN_LENGTH}-${IDEMPOTENCY_KEY_MAX_LENGTH}`;
        throw new Error(`idempotency_key must be ${lengthRange} characters`);
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
        throw new Error("idempotency_key contains unsupported characters");
    }
    return value;
};
exports.validateIdempotencyKey = validateIdempotencyKey;
/** Generate a fixed-width key without exposing Firebase UIDs in projection IDs. */
const generateIdempotencyKey = (uid, timestamp, action) => (0, node_crypto_1.createHash)("sha256").update(`${uid}:${timestamp}:${action}`).digest("hex");
exports.generateIdempotencyKey = generateIdempotencyKey;
//# sourceMappingURL=event_contract.js.map