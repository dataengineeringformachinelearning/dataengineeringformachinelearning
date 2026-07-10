const assert = require("node:assert/strict");
const test = require("node:test");

const {
  generateIdempotencyKey,
  validateIdempotencyKey,
} = require("../lib/event_contract.js");

test("accepts bounded path-safe idempotency keys", () => {
  assert.equal(
    validateIdempotencyKey("verify-1234567890abcdef"),
    "verify-1234567890abcdef",
  );
  assert.equal(validateIdempotencyKey(undefined), null);
});

test("generates fixed-width keys without exposing the uid", () => {
  const key = generateIdempotencyKey(
    "sensitive-firebase-uid",
    "2026-07-09T12:00:00.000Z",
    "get_stats",
  );
  assert.equal(key.length, 64);
  assert.equal(key.includes("sensitive-firebase-uid"), false);
  assert.equal(validateIdempotencyKey(key), key);
});

test("rejects malformed idempotency keys", () => {
  assert.throws(() => validateIdempotencyKey("short"), /16-128/);
  assert.throws(
    () => validateIdempotencyKey("verify/1234567890abcdef"),
    /unsupported characters/,
  );
  assert.throws(() => validateIdempotencyKey(123), /must be a string/);
});
