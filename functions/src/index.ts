import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { config as functionsConfig } from "firebase-functions";
import { logger } from "firebase-functions";
import { Kafka } from "kafkajs";

import {
  generateIdempotencyKey,
  validateIdempotencyKey,
} from "./event_contract";
import { encryptKafkaValue } from "./internode_encryption";

admin.initializeApp();

const fcfg = functionsConfig();

// Initialize Kafka/Redpanda client
// For fastest Event Projections (no polling):
//   - Point Firebase Functions at the PUBLIC SASL-authenticated Redpanda listener
//     exposed through a TLS-capable TCP endpoint.
//   - Production requires TLS and SASL; plaintext public Kafka is rejected.
// See infrastructure/queue/Dockerfile + entrypoint.sh and backend/.env.example.
const configuredKafkaBrokers = process.env.REDPANDA_BROKERS;
const kafkaBrokers = configuredKafkaBrokers || "localhost:19092";
const directKafkaEnabled = Boolean(configuredKafkaBrokers);
const isCloudRuntime = Boolean(
  process.env.K_SERVICE || process.env.GCLOUD_PROJECT,
);
const useSsl =
  process.env.REDPANDA_SSL === "true" ||
  (fcfg.redpanda && fcfg.redpanda.ssl === "true");
if (isCloudRuntime && directKafkaEnabled && !useSsl) {
  throw new Error("Production Redpanda transport requires REDPANDA_SSL=true");
}
const kafkaConfig: any = {
  clientId: "deml-gateway-function",
  brokers: [kafkaBrokers],
};
if (useSsl) {
  const encodedCa = process.env.REDPANDA_SSL_CA_B64;
  kafkaConfig.ssl = {
    rejectUnauthorized: true,
    ...(encodedCa
      ? { ca: [Buffer.from(encodedCa, "base64").toString("utf8")] }
      : {}),
  };
}
// SASL is independent of TLS: SASL_PLAINTEXT (no SSL) and SASL_SSL are both valid.
// Apply SASL whenever credentials are present so authenticated publish works with or
// without TLS. (Previously SASL was only set inside the ssl block, so a plaintext SASL
// connection silently sent no credentials.)
const saslUser =
  process.env.REDPANDA_SASL_USERNAME ||
  (fcfg.redpanda && fcfg.redpanda.sasl_username);
const saslPass =
  process.env.REDPANDA_SASL_PASSWORD ||
  (fcfg.redpanda && fcfg.redpanda.sasl_password);
if (isCloudRuntime && directKafkaEnabled && (!saslUser || !saslPass)) {
  throw new Error("Production Redpanda transport requires SASL credentials");
}
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
    const rawIdempotencyKey =
      (data &&
        (data.idempotency_key ||
          (data.payload && data.payload.idempotency_key))) ||
      null;
    let providedIdemp: string | null;
    try {
      providedIdemp = validateIdempotencyKey(rawIdempotencyKey);
    } catch (error) {
      throw new HttpsError(
        "invalid-argument",
        error instanceof Error ? error.message : "Invalid idempotency_key",
      );
    }
    const idempotencyKey =
      providedIdemp ||
      generateIdempotencyKey(uid, timestamp, eventPayload.action || "unknown");
    const rawMessage = Buffer.from(
      JSON.stringify({
        uid,
        timestamp,
        idempotency_key: idempotencyKey,
        version: "1.0", // Event schema version for governance
        payload: eventPayload,
      }),
      "utf8",
    );

    try {
      // 3. Push directly to Redpanda (primary fast path when using public SASL endpoint).
      // This gives near real-time consumption by telemetry_worker with no polling delay.
      if (!directKafkaEnabled) {
        throw new Error("Direct Redpanda publishing is not configured");
      }
      const p = await getProducer();
      await p.send({
        topic: "frontend-events",
        messages: [
          {
            key: String(uid),
            value: encryptKafkaValue(rawMessage, "frontend-events"),
          },
        ],
      });

      return {
        status: "accepted",
        message: "Event successfully queued to Redpanda.",
      };
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
  },
);
