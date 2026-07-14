/**
 * Browser Sentry for the Viking-UI showcase (ui.dataengineeringformachinelearning.com).
 * Client DSNs are public by design; override with PUBLIC_SENTRY_DSN at build time.
 */
const DEFAULT_DSN =
  "https://42e8428e1e1c81646f16b6bcdbf7db1a@o4511437520044032.ingest.us.sentry.io/4511714252685312";

const dsn =
  (import.meta.env.PUBLIC_SENTRY_DSN as string | undefined)?.trim() ||
  DEFAULT_DSN;

const initializeMonitoring = async (): Promise<void> => {
  if (!dsn || typeof window === "undefined") {
    return;
  }

  try {
    const Sentry = await import("@sentry/browser");
    Sentry.init({
      dsn,
      environment: import.meta.env.PROD ? "production" : "development",
      // UI showcase only — keep noise low.
      tracesSampleRate: 0.05,
    });
  } catch (error: unknown) {
    console.error("Monitoring initialization failed:", error);
  }
};

void initializeMonitoring();
