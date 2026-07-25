/**
 * Browser Sentry + Rollbar for the marketing site.
 * Client DSNs / post_client_item tokens are public by design; override via PUBLIC_*.
 */
import * as Sentry from "@sentry/browser";
import Rollbar from "rollbar";

const DEFAULT_SENTRY_DSN =
  "https://9ad77ac1928f32aad465cb85d745262a@o4511437520044032.ingest.us.sentry.io/4511556274749440"; // pragma: allowlist secret
const DEFAULT_ROLLBAR_TOKEN = "e3d741247d8743909a9b2d0a361e0b02"; // pragma: allowlist secret

const sentryDsn =
  (import.meta.env.PUBLIC_SENTRY_DSN as string | undefined)?.trim() ||
  DEFAULT_SENTRY_DSN;
const rollbarToken =
  (import.meta.env.PUBLIC_ROLLBAR_ACCESS_TOKEN as string | undefined)?.trim() ||
  DEFAULT_ROLLBAR_TOKEN;

const environment = import.meta.env.PROD ? "production" : "development";

if (typeof window !== "undefined" && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    enableLogs: true,
    tracesSampleRate: 0.1,
  });
}

if (typeof window !== "undefined" && rollbarToken) {
  new Rollbar({
    accessToken: rollbarToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
    environment,
  });
}
