/**
 * Firebase callables for DEML user-plane helpers.
 *
 * Sealed telemetry and projections go through Django → FORJD
 * (`docs/FORJD_PLATFORM_HANDOFF.md`). The former Redpanda `ingestEvent`
 * gateway is retired and fails closed.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

/**
 * Retired Event Projections gateway. Clients must seal and POST via
 * Django `/api/v1/forjd/ingest` (or the native BFF adapters).
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

    logger.warn("ingestEvent called after Redpanda retirement", {
      uid: request.auth.uid,
    });
    throw new HttpsError(
      "failed-precondition",
      "Local event ingest is retired. Use the DEML API sealed FORJD ingest path.",
    );
  },
);
