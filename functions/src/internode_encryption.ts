import { createCipheriv, randomBytes, randomUUID } from "crypto";

const ENVELOPE_TYPE = "deml-internode+jwe";
const ENVELOPE_VERSION = 1;
const ALGORITHM = "dir";
const CONTENT_ENCRYPTION = "A256GCM";
const IDENTIFIER = /^[A-Za-z0-9._:/-]{1,128}$/;

type Mode = "disabled" | "optional" | "required";

interface Keyring {
  mode: Mode;
  activeKid: string | null;
  keys: Map<string, Buffer>;
  sender: string;
}

interface EncryptionOptions {
  issuedAt?: number;
  messageId?: string;
  nonce?: Buffer;
  keyring?: Keyring;
}

const validateIdentifier = (name: string, value: string): string => {
  if (!IDENTIFIER.test(value)) {
    throw new Error(
      `${name} contains invalid characters or has an invalid length`,
    );
  }
  return value;
};

const decodeBase64Url = (value: string): Buffer =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");

const encodeBase64Url = (value: Buffer): string =>
  value
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const loadKeyring = (): Keyring => {
  const production = Boolean(
    process.env.K_SERVICE || process.env.GCLOUD_PROJECT,
  );
  const rawMode = (
    process.env.DEML_INTERNODE_ENCRYPTION ||
    (production ? "required" : "disabled")
  ).toLowerCase();
  if (!["disabled", "optional", "required"].includes(rawMode)) {
    throw new Error(
      "DEML_INTERNODE_ENCRYPTION must be disabled, optional, or required",
    );
  }
  const mode = rawMode as Mode;
  const sender = validateIdentifier(
    "DEML_NODE_ID",
    process.env.DEML_NODE_ID || process.env.K_SERVICE || "deml-functions-local",
  );
  const activeKid = process.env.DEML_INTERNODE_ACTIVE_KID || null;
  const parsed: unknown = JSON.parse(process.env.DEML_INTERNODE_KEYS || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("DEML_INTERNODE_KEYS must be a JSON object");
  }
  const keys = new Map<string, Buffer>();
  for (const [kid, encoded] of Object.entries(
    parsed as Record<string, unknown>,
  )) {
    validateIdentifier("internode kid", kid);
    if (typeof encoded !== "string") {
      throw new Error("internode key values must be strings");
    }
    const key = decodeBase64Url(encoded);
    if (key.length !== 32) {
      throw new Error(`internode key ${kid} must decode to 32 bytes`);
    }
    keys.set(kid, key);
  }
  if (activeKid && !keys.has(activeKid)) {
    throw new Error(
      "DEML_INTERNODE_ACTIVE_KID is not present in DEML_INTERNODE_KEYS",
    );
  }
  if (mode === "required" && (!activeKid || !keys.has(activeKid))) {
    throw new Error(
      "required internode encryption needs an active 32-byte key",
    );
  }
  return { mode, activeKid, keys, sender };
};

const authenticatedData = (
  kid: string,
  context: string,
  sender: string,
  issuedAt: number,
  messageId: string,
): Buffer =>
  Buffer.from(
    [
      ENVELOPE_TYPE,
      String(ENVELOPE_VERSION),
      kid,
      ALGORITHM,
      CONTENT_ENCRYPTION,
      context,
      sender,
      String(issuedAt),
      messageId,
    ].join("\n"),
    "utf8",
  );

export const encryptBytes = (
  plaintext: Buffer,
  context: string,
  options: EncryptionOptions = {},
): Buffer => {
  const keyring = options.keyring || loadKeyring();
  if (keyring.mode === "disabled") return plaintext;
  if (!keyring.activeKid) {
    if (keyring.mode === "optional") return plaintext;
    throw new Error("internode encryption has no active key");
  }
  const validatedContext = validateIdentifier("internode context", context);
  const issuedAt = options.issuedAt ?? Math.floor(Date.now() / 1000);
  const messageId = options.messageId || randomUUID();
  const nonce = options.nonce || randomBytes(12);
  if (nonce.length !== 12)
    throw new Error("internode AES-GCM nonce must be 12 bytes");
  const key = keyring.keys.get(keyring.activeKid);
  if (!key) throw new Error("internode encryption active key is unavailable");
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(
    authenticatedData(
      keyring.activeKid,
      validatedContext,
      keyring.sender,
      issuedAt,
      messageId,
    ),
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return Buffer.from(
    JSON.stringify({
      typ: ENVELOPE_TYPE,
      v: ENVELOPE_VERSION,
      kid: keyring.activeKid,
      alg: ALGORITHM,
      enc: CONTENT_ENCRYPTION,
      ctx: validatedContext,
      sender: keyring.sender,
      iat: issuedAt,
      jti: messageId,
      nonce: encodeBase64Url(nonce),
      ciphertext: encodeBase64Url(ciphertext),
    }),
    "utf8",
  );
};

export const encryptKafkaValue = (value: Buffer, topic: string): Buffer =>
  encryptBytes(value, `kafka:${topic}`);
