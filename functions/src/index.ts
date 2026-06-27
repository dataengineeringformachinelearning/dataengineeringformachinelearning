import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Kafka } from "kafkajs";

admin.initializeApp();

// Initialize Kafka/Redpanda client
// In production (Firebase Functions), set REDPANDA_BROKERS env (or secret) to a reachable broker.
// Note: Railway internal DNS is NOT reachable from Cloud Functions; use a public endpoint or rely on Firestore fallback.
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
 * Generic event ingestion gateway.
 * Natively validates the Auth token and pushes the event to Redpanda.
 */
export const ingestEvent = functions.https.onCall(async (data, context) => {
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

  // 2. Prepare message for Redpanda
  const timestamp = new Date().toISOString();
  const idempotencyKey = `${uid}:${timestamp}:${eventPayload.action || "unknown"}`;
  const message = {
    key: String(uid), // Partition by user ID for ordered processing
    value: JSON.stringify({
      uid,
      timestamp,
      idempotency_key: idempotencyKey,
      version: "1.0", // Event schema version for governance
      payload: eventPayload,
    }),
  };

  try {
    // 3. Push to Redpanda Topic
    const p = await getProducer();
    await p.send({
      topic: "frontend-events",
      messages: [message],
    });

    // 4. Return immediately (HTTP 200 via onCall framework)
    // Note: Stats projection now handled exclusively by Django telemetry_worker for consistency.
    // The worker uses idempotency and outbox relay for reliability.
    return { status: "accepted", message: "Event successfully queued." };
  } catch (error) {
    functions.logger.error(
      "Error publishing event to Redpanda, falling back to Firestore:",
      error,
    );

    try {
      const db = getFirestore("deml");
      await db.collection("events").add({
        uid,
        timestamp: new Date().toISOString(),
        payload: eventPayload,
        type: "fallback",
      });

      // Projection for get_stats is now handled by the Django worker (idempotent, via outbox).
      // Events collection acts as audit/fallback log.
      return {
        status: "accepted",
        message: "Event accepted via Firestore fallback.",
      };
    } catch (fsError) {
      functions.logger.error(
        "Failed to write fallback event to Firestore:",
        fsError,
      );
      throw new functions.https.HttpsError(
        "internal",
        "Unable to process event at this time.",
      );
    }
  }
});
