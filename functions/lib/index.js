"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestEvent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const kafkajs_1 = require("kafkajs");
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
const kafkaConfig = {
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
const kafka = new kafkajs_1.Kafka(kafkaConfig);
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
exports.ingestEvent = functions
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
      key: String(uid),
      value: JSON.stringify({
        uid,
        timestamp,
        idempotency_key: idempotencyKey,
        version: "1.0",
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
      // Primary fast path: direct to (public authenticated) Redpanda.
      return { status: "accepted", message: "Event successfully queued to Redpanda." };
    } catch (error) {
      functions.logger.error(
        "Direct publish to Redpanda failed, writing to Firestore inbox as resilient fallback:",
        error,
      );
      try {
        const db = (0, firestore_1.getFirestore)("deml");
        // Resilient fallback only. With correct public SASL Redpanda this is rarely used.
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
//# sourceMappingURL=index.js.map
