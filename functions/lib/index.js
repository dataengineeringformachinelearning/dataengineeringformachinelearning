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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
admin.initializeApp();
/**
 * Legacy Firebase command gateway (retired).
 *
 * Sealed telemetry now flows Angular → Django BFF → FORJD with a tenant-bound
 * `fjsvc_` service token. Local Redpanda / Firestore inbox paths are removed.
 * Clients must use DEML's Django FORJD adapters (`/api/v1/forjd/*` and the
 * established BFF routes). This callable remains only so old clients get a
 * clear, fail-closed error instead of a silent Kafka publish.
 */
exports.ingestEvent = (0, https_1.onCall)(
  {
    region: "us-east4",
  },
  async (request) => {
    if (!request.auth) {
      throw new https_1.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }
    firebase_functions_1.logger.warn(
      "ingestEvent called after Redpanda cutover",
      {
        uid: request.auth.uid,
      },
    );
    throw new https_1.HttpsError(
      "failed-precondition",
      "DEML local event ingest is retired. Send sealed telemetry through the DEML Django API to FORJD.",
    );
  },
);
//# sourceMappingURL=index.js.map
