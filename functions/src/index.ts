import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { config as functionsConfig } from "firebase-functions";
import { logger } from "firebase-functions";
import { Kafka } from "kafkajs";

admin.initializeApp();

const fcfg = functionsConfig();

// Initialize Kafka/Redpanda client
// For fastest Event Projections (no polling):
//   - Point Firebase Functions at the PUBLIC SASL-authenticated Redpanda listener
//     exposed via a Railway TCP Proxy (e.g. REDPANDA_BROKERS=<proxy-host>:<proxy-port>,
//     REDPANDA_SASL_USERNAME/REDPANDA_SASL_PASSWORD). The Railway TCP Proxy forwards
//     raw TCP and does NOT terminate TLS, so leave REDPANDA_SSL unset (plain SASL).
//     Only set REDPANDA_SSL=true if TLS is terminated at the edge (e.g. Cloudflare Spectrum).
//   - Internal services continue to use the private Railway DNS (no SASL).
// See infrastructure/queue/Dockerfile + entrypoint.sh and backend/.env.example.
const kafkaBrokers = process.env.REDPANDA_BROKERS || "localhost:19092";
// TLS must be OPT-IN. The Redpanda broker's public listener serves SASL over plain
// TCP (e.g. behind a Railway TCP Proxy, which does not terminate TLS). Auto-forcing
// ssl:true for any non-local host made the TLS handshake fail against that plaintext
// listener, so every publish fell through to the Firestore fallback. Only enable TLS
// when REDPANDA_SSL=true (e.g. when an edge such as Cloudflare Spectrum terminates TLS).
const useSsl =
  process.env.REDPANDA_SSL === "true" ||
  (fcfg.redpanda && fcfg.redpanda.ssl === "true");
const kafkaConfig: any = {
  clientId: "deml-gateway-function",
  brokers: [kafkaBrokers],
};
if (useSsl) {
  kafkaConfig.ssl = true;
}
// SASL is independent of TLS: SASL_PLAINTEXT (no SSL) and SASL_SSL are both valid.
// Apply SASL whenever credentials are present so authenticated publish works with or
// without TLS. (Previously SASL was only set inside the ssl block, so a plaintext SASL
// connection silently sent no credentials.)
const saslUser = process.env.REDPANDA_SASL_USERNAME || (fcfg.redpanda && fcfg.redpanda.sasl_username);
const saslPass = process.env.REDPANDA_SASL_PASSWORD || (fcfg.redpanda && fcfg.redpanda.sasl_password);
if (saslUser && saslPass) {
  kafkaConfig.sasl = {
    mechanism: "scram-sha-256",
    username: saslUser,
    password: saslPass,
  };
}
const kafka = new Kafka(kafkaConfig);

const producer = kafka.producer();

/**
 * Ensures the producer is connected before sending a message.
 * Using a cold-start pattern.
 */
let isProducerConnected = false;
async function getProducer() {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
  }
  return producer;
}

/**
 * Generic event ingestion gateway (client commands).
 * Natively validates the Auth token and pushes the event to Redpanda
 * (public SASL-authenticated listener recommended for lowest latency).
 * Falls back to Firestore inbox only on publish failure.
 */
export const ingestEvent = onCall(
  {
    region: "us-east4",
    // Add more options here if needed in the future, e.g.:
    // memory: "256MiB",
    // timeoutSeconds: 60,
  },
  async (request) => {
    // 1. Validate Authentication (Native to Firebase onCall functions)
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    const uid = request.auth.uid;
    const data = request.data;
    logger.info("UID DEBUG:", { uid, type: typeof uid });
    const eventPayload = data;

    // 2. Prepare message for Redpanda. Prefer client-supplied idempotency_key for dedup/projection.
    const timestamp = new Date().toISOString();
    const providedIdemp = (data && (data.idempotency_key || (data.payload && data.payload.idempotency_key))) || null;
    const idempotencyKey = providedIdemp || `${uid}:${timestamp}:${eventPayload.action || "unknown"}`;
    const message = {
      key: String(uid), // Partition by user ID for ordered processing (stable per-tenant ordering)
      value: JSON.stringify({
        uid,
        timestamp,
        idempotency_key: idempotencyKey,
        version: "1.0", // Event schema version for governance
        payload: eventPayload,
      }),
    };

    try {
      // 3. Push directly to Redpanda (primary fast path when using public SASL endpoint).
      // This gives near real-time consumption by telemetry_worker with no polling delay.
      const p = await getProducer();
      await p.send({
        topic: "frontend-events",
        messages: [message],
      });

      return { status: "accepted", message: "Event successfully queued to Redpanda." };
    } catch (error) {
      logger.error(
        "Direct publish to Redpanda failed, writing to Firestore inbox as resilient fallback:",
        error,
      );

      try {
        const db = getFirestore("deml");
        // Resilient fallback only. The worker's poll_firestore_inbox task will project it.
        // With a correctly configured public SASL Redpanda endpoint this path is almost never taken.
        const inboxDoc = {
          uid,
          timestamp: new Date().toISOString(),
          idempotency_key: idempotencyKey,
          version: "1.0",
          payload: eventPayload,
          source: "firebase-fallback",
        };
        await db.collection("frontend_command_inbox").add(inboxDoc);

        return {
          status: "accepted",
          message: "Event accepted (queued via resilient fallback).",
        };
      } catch (fsError) {
        logger.error(
          "Failed to write fallback event to Firestore inbox:",
          fsError,
        );
        throw new HttpsError(
          "internal",
          "Unable to process event at this time.",
        );
      }
    }
  }
);
