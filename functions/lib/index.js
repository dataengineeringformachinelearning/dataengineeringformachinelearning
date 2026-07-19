"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestEvent = void 0;
/**
 * Firebase callables for DEML user-plane helpers.
 *
 * Sealed telemetry and projections go through Django → FORJD
 * (`docs/FORJD_INTEGRATION.md`). Browser clients must not call FORJD directly.
 */
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
/**
 * Compatibility stub. Clients seal and POST via Django
 * `/api/v1/forjd/ingest` (or the native BFF adapters).
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
      "ingestEvent stub invoked; use Django sealed ingest",
      {
        uid: request.auth.uid,
      },
    );
    throw new https_1.HttpsError(
      "failed-precondition",
      "Use the DEML API sealed FORJD ingest path.",
    );
  },
);
//# sourceMappingURL=index.js.map
