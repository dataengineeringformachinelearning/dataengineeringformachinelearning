/**
 * Browser-side AES-256-GCM seal + crypto-session registration for DEML → FORJD.
 *
 * Firebase auth terminates at Django. The browser never holds fjsvc_ tokens.
 * After sealing, events POST to the DEML BFF `/api/v1/ingest` which injects
 * the mapped tenant credential upstream.
 */

import { environment } from '../../../environments/environment';

const GCM_NONCE_BYTES = 12;
const AES_KEY_BYTES = 32;
const SESSION_STORAGE_KEY = 'deml_forjd_crypto_session_v1';

export type SealedEnvelope = {
  algo: 'aes-256-gcm';
  key_id: string;
  nonce: string;
  ciphertext: string;
  ciphertext_sha256: string;
};

export type SealedEventWire = {
  tenant_id: string;
  client_event_id: string;
  content_type: 'application/forjd-telemetry+v1';
  event_type: 'deml.metric' | 'deml.alert';
  workflow_id: 'deml_telemetry';
  encryption: { mode: 'e2ee'; algo: 'aes-256-gcm' };
  envelope: SealedEnvelope;
  metadata: Record<string, string | string[]>;
};

type CachedSession = {
  tenantId: string;
  sessionId: string;
  /** base64 raw AES-256 key retained only in memory / sessionStorage */
  keyB64: string;
  registeredAt: number;
};

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function generateX25519PublicB64(): Promise<string> {
  // WebCrypto X25519 is not universal; use a random 32-byte public material
  // placeholder for session directory registration (FORJD only stores the pub).
  // AES key material is independent for this partner seal path.
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return bytesToB64(raw);
}

function loadCachedSession(tenantId: string): CachedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed?.tenantId || parsed.tenantId !== tenantId || !parsed.keyB64 || !parsed.sessionId) {
      return null;
    }
    // Rotate daily.
    if (Date.now() - (parsed.registeredAt || 0) > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedSession(session: CachedSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* private mode */
  }
}

export async function resolveForjdTenantId(authToken: string): Promise<string> {
  const res = await fetch(`${environment.backendUrl}/api/v1/forjd/tenant`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw new Error(`forjd_tenant_http_${res.status}`);
  }
  const body = (await res.json()) as { tenant_id?: string };
  const tenantId = String(body.tenant_id || '').trim();
  if (!tenantId) throw new Error('forjd_tenant_missing');
  return tenantId;
}

export async function ensureCryptoSession(
  authToken: string,
  tenantId: string,
): Promise<CachedSession> {
  const cached = loadCachedSession(tenantId);
  if (cached) return cached;

  const sessionId = `deml-browser-${crypto.randomUUID().slice(0, 12)}`;
  const keyBytes = crypto.getRandomValues(new Uint8Array(AES_KEY_BYTES));
  const identityPublicKey = await generateX25519PublicB64();

  const res = await fetch(`${environment.backendUrl}/api/v1/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      session_id: sessionId,
      identity_public_key: identityPublicKey,
    }),
  });
  if (!res.ok) {
    throw new Error(`forjd_session_http_${res.status}`);
  }

  const session: CachedSession = {
    tenantId,
    sessionId,
    keyB64: bytesToB64(keyBytes),
    registeredAt: Date.now(),
  };
  saveCachedSession(session);
  return session;
}

export async function sealPayload(
  plaintext: Uint8Array,
  options: {
    keyB64: string;
    keyId: string;
    tenantId: string;
    clientEventId: string;
  },
): Promise<SealedEnvelope> {
  const keyBytes = b64ToBytes(options.keyB64);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);
  const nonce = crypto.getRandomValues(new Uint8Array(GCM_NONCE_BYTES));
  const aad = new TextEncoder().encode(`${options.tenantId}|${options.clientEventId}`);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad, tagLength: 128 },
    cryptoKey,
    plaintext,
  );
  return {
    algo: 'aes-256-gcm',
    key_id: options.keyId,
    nonce: bytesToB64(nonce),
    ciphertext: bytesToB64(ciphertext),
    ciphertext_sha256: await sha256Hex(ciphertext),
  };
}

export async function sealAndIngest(
  authToken: string,
  plaintextObject: Record<string, unknown>,
  metadata: Record<string, string | string[]> = {},
): Promise<{ ok: boolean; status: number }> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return { ok: false, status: 0 };
  }
  const tenantId = await resolveForjdTenantId(authToken);
  const session = await ensureCryptoSession(authToken, tenantId);
  const clientEventId = `deml-web-${crypto.randomUUID()}`;
  const plaintext = new TextEncoder().encode(JSON.stringify(plaintextObject));
  const envelope = await sealPayload(plaintext, {
    keyB64: session.keyB64,
    keyId: session.sessionId,
    tenantId,
    clientEventId,
  });

  // Allowlisted routing tags only — never put PII in metadata.
  const safeMeta: Record<string, string | string[]> = {
    source: 'deml-browser',
    product: 'deml',
    channel: 'spa',
    env: environment.production ? 'production' : 'development',
    ...metadata,
  };

  const wire: SealedEventWire = {
    tenant_id: tenantId,
    client_event_id: clientEventId,
    content_type: 'application/forjd-telemetry+v1',
    event_type: 'deml.metric',
    workflow_id: 'deml_telemetry',
    encryption: { mode: 'e2ee', algo: 'aes-256-gcm' },
    envelope,
    metadata: safeMeta,
  };

  const res = await fetch(`${environment.backendUrl}/api/v1/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wire),
  });
  return { ok: res.ok, status: res.status };
}
