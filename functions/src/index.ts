import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

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
export const ingestEvent = onCall(
  {
    region: "us-east4",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    logger.warn("ingestEvent called after Redpanda cutover", {
      uid: request.auth.uid,
    });

    throw new HttpsError(
      "failed-precondition",
      "DEML local event ingest is retired. Send sealed telemetry through the DEML Django API to FORJD.",
    );
  },
);
