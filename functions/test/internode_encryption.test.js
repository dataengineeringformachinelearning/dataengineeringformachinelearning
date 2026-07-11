const assert = require("node:assert/strict");
const { test } = require("node:test");

const { encryptBytes } = require("../lib/internode_encryption.js");

test("internode encryption matches the Python and Rust compatibility vector", () => {
  const keyring = {
    mode: "required",
    activeKid: "test-2026-07",
    keys: new Map([["test-2026-07", Buffer.from([...Array(32).keys()])]]),
    sender: "test-node",
  };
  const encrypted = encryptBytes(
    Buffer.from('{"tenant":"00000000-0000-0000-0000-000000000001"}'),
    "kafka:app-events",
    {
      keyring,
      issuedAt: 1783728000,
      messageId: "12345678-1234-5678-1234-567812345678",
      nonce: Buffer.from([...Array(12).keys()]),
    },
  );
  const envelope = JSON.parse(encrypted.toString("utf8"));
  assert.equal(
    envelope.ciphertext,
    "PCCifquErG-ve7W7gdlIXbPmtxnAS29MFVfVtS1EMIIxIIPMn_" + // pragma: allowlist secret
      "EiqESUT924txkak-sNbr-oICt4Caj8XnDvij8", // pragma: allowlist secret
  );
});
