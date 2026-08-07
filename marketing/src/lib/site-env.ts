/**
 * Cross-site URLs — same env names as backend (Django) and frontend (Angular).
 * Legacy PUBLIC_* names are accepted during migration.
 */

type EnvRecord = Record<string, string | boolean | undefined>;

function pick(
  env: EnvRecord,
  key: string,
  legacyKeys: string[],
  fallback: string,
): string {
  const direct = env[key];
  if (typeof direct === "string" && direct) return direct;
  for (const legacy of legacyKeys) {
    const val = env[legacy];
    if (typeof val === "string" && val) return val;
  }
  return fallback;
}

export function siteEnv(env: EnvRecord = import.meta.env) {
  return {
    FRONTEND_URL: pick(
      env,
      "FRONTEND_URL",
      ["PUBLIC_MAIN_APP_URL", "PUBLIC_APP_URL"],
      "https://deml.app",
    ),
    BACKEND_URL: pick(
      env,
      "BACKEND_URL",
      ["PUBLIC_API_BASE"],
      "https://backend.deml.app",
    ),
    MARKETING_URL: pick(
      env,
      "MARKETING_URL",
      ["PUBLIC_MARKETING_URL"],
      "https://dataengineeringformachinelearning.com",
    ),
  };
}
