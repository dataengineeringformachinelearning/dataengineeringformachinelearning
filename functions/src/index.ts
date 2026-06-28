import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { Kafka } from "kafkajs";

admin.initializeApp();

// Initialize Kafka/Redpanda client
// For fastest Event Projections (no polling):
//   - Point Firebase Functions at the PUBLIC SASL-authenticated Redpanda listener
//     (e.g. your-public-host.railway.app:9093 + SASL SCRAM-SHA-256 + SSL).
//   - Internal services continue to use the private Railway DNS (no SASL).
// See infrastructure/queue/Dockerfile + entrypoint.sh and backend/.env.example.
const kafkaBrokers = process.env.REDPANDA_BROKERS || "localhost:19092";
const useSsl =
  process.env.REDPANDA_SSL === "true" || kafkaBrokers.includes("railway.app");
const kafkaConfig: any = {
  clientId: "deml-gateway-function",
  brokers: [kafkaBrokers],
};
if (useSsl) {
  kafkaConfig.ssl = true;
  // Add SASL if credentials provided via secrets/env
  const saslUser = process.env.REDPANDA_SASL_USERNAME;
  const saslPass = process.env.REDPANDA_SASL_PASSWORD;
  if (saslUser && saslPass) {
    kafkaConfig.sasl = {
      mechanism: "scram-sha-256",
      username: saslUser,
      password: saslPass,
    };
  }
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
export const ingestEvent = functions
  .region("us-east4")
  .https.onCall(async (data, context) => {
    // 1. Validate Authentication (Native to Firebase onCall functions)
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    const uid = context.auth.uid || data.uid || "anonymous";
    functions.logger.info("UID DEBUG:", { uid, type: typeof uid });
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
      functions.logger.error(
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
        functions.logger.error(
          "Failed to write fallback event to Firestore inbox:",
          fsError,
        );
        throw new functions.https.HttpsError(
          "internal",
          "Unable to process event at this time.",
        );
      }
    }
  });
