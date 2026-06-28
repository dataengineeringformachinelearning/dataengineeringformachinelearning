/**
 * Cross-site URLs — same env names as backend (Django) and frontend (Angular).
 * Legacy PUBLIC_* names are accepted during migration.
 * Missing values fail at build/runtime (no silent production defaults).
 */

type EnvRecord = Record<string, string | boolean | undefined>;

function requireSiteUrl(
  env: EnvRecord,
  key: string,
  legacyKeys: string[],
): string {
  const direct = env[key];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  for (const legacy of legacyKeys) {
    const val = env[legacy];
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  throw new Error(
    `Missing required ${key}. Set it in marketing/.env (see marketing/.env.example).`,
  );
}

export function siteEnv(env: EnvRecord = import.meta.env) {
  return {
    FRONTEND_URL: requireSiteUrl(env, "FRONTEND_URL", [
      "PUBLIC_MAIN_APP_URL",
      "PUBLIC_APP_URL",
    ]),
    BACKEND_URL: requireSiteUrl(env, "BACKEND_URL", ["PUBLIC_API_BASE"]),
    MARKETING_URL: requireSiteUrl(env, "MARKETING_URL", ["PUBLIC_MARKETING_URL"]),
  };
}
