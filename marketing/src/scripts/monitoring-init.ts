/**
 * Browser Sentry for the marketing site.
 * Client DSN is public by design; override via PUBLIC_SENTRY_DSN.
 */
import * as Sentry from "@sentry/browser";

const DEFAULT_SENTRY_DSN =
  "https://9ad77ac1928f32aad465cb85d745262a@o4511437520044032.ingest.us.sentry.io/4511556274749440"; // pragma: allowlist secret

const sentryDsn =
  (import.meta.env.PUBLIC_SENTRY_DSN as string | undefined)?.trim() ||
  DEFAULT_SENTRY_DSN;

const environment = import.meta.env.PROD ? "production" : "development";

if (typeof window !== "undefined" && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
    enableLogs: true,
    tracesSampleRate: 0.05,
  });
}
