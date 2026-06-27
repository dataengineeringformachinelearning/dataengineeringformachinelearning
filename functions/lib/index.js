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
const kafkajs_1 = require("kafkajs");
admin.initializeApp();
// Initialize Kafka/Redpanda client
// In production, these should be securely stored in Firebase Secret Manager
const kafka = new kafkajs_1.Kafka({
  clientId: "deml-gateway-function",
  brokers: [process.env.REDPANDA_BROKERS || "localhost:19092"],
  // Add SASL/SSL config for Railway Redpanda deployment here:
  // ssl: true,
  // sasl: { mechanism: 'scram-sha-256', username: '...', password: '...' }
});
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
exports.ingestEvent = functions.https.onCall(async (data, context) => {
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
  const message = {
    key: String(uid),
    value: JSON.stringify({
      uid,
      timestamp: new Date().toISOString(),
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
    return { status: "accepted", message: "Event successfully queued." };
  } catch (error) {
    functions.logger.error("Error publishing event to Redpanda:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to process event at this time.",
    );
  }
});
//# sourceMappingURL=index.js.map
