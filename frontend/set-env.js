const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const isTestEnv = process.env.DEML_ENV === 'test';

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const envConfig = fs.readFileSync(filePath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIdx = trimmed.indexOf('=');
    if (equalIdx === -1) return;
    const key = trimmed.slice(0, equalIdx).trim();
    let val = trimmed.slice(equalIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
  return true;
};

const envCandidates = isTestEnv
  ? [path.join(ROOT, '.env.test'), path.join(ROOT, '.env')]
  : [path.join(ROOT, '.env')];

const loadedEnv = envCandidates.find((candidate) => loadEnvFile(candidate));
if (!loadedEnv) {
  const hint = isTestEnv
    ? 'Ensure frontend/.env.test exists or copy frontend/.env.example to frontend/.env.'
    : 'Copy frontend/.env.example to frontend/.env and set all required values.';
  throw new Error(`Missing frontend environment file. ${hint}`);
}

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^placeholder/i,
  /^change-?me/i,
  /^replace-?me/i,
  /^xxx+$/i,
];

const requireEnv = (name) => {
  const raw = process.env[name];
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in ${path.basename(loadedEnv)} (see frontend/.env.example).`,
    );
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error(
      `Env var ${name} still uses a placeholder value ("${value}"). Set a real value in ${path.basename(loadedEnv)}.`,
    );
  }
  return value;
};

const optionalEnv = (name) => {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
};

const versionFilePath = path.join(ROOT, '..', 'version.txt');
const localVersionFilePath = path.join(ROOT, 'version.txt');
const appVersion = fs.existsSync(versionFilePath)
  ? fs.readFileSync(versionFilePath, 'utf8').trim()
  : fs.existsSync(localVersionFilePath)
    ? fs.readFileSync(localVersionFilePath, 'utf8').trim()
    : '0.0.0-dev';

const targetPath = path.join(ROOT, 'src', 'environments', 'environment.ts');
const targetPathDev = path.join(ROOT, 'src', 'environments', 'environment.development.ts');
const environmentsDir = path.join(ROOT, 'src', 'environments');

if (!fs.existsSync(environmentsDir)) {
  fs.mkdirSync(environmentsDir, { recursive: true });
}

const apiKey = requireEnv('FIREBASE_API_KEY');
const projectId = requireEnv('FIREBASE_PROJECT_ID');
const appId = requireEnv('FIREBASE_APP_ID');
const authDomain = requireEnv('FIREBASE_AUTH_DOMAIN');
const storageBucket = requireEnv('FIREBASE_STORAGE_BUCKET');
const messagingSenderId = requireEnv('FIREBASE_MESSAGING_SENDER_ID');
const sanityProjectId = requireEnv('SANITY_PROJECT_ID');
const sanityDataset = requireEnv('SANITY_DATASET');
const sentryDsn = optionalEnv('SENTRY_DSN');

const buildBackendUrl = requireEnv('BACKEND_URL');
const buildMarketingUrl = requireEnv('MARKETING_URL');
const buildFrontendUrl = requireEnv('FRONTEND_URL');

const urlGuard = `
const requireConfiguredUrl = (name: string, value: string): string => {
  if (!value) {
    throw new Error(
      \`\${name} is not configured. Re-run node set-env.js after setting frontend/.env.\`,
    );
  }
  return value;
};
`;

const getBackendUrlCode = `
const BACKEND_URL = '${buildBackendUrl}';
const getBackendUrl = () => requireConfiguredUrl('BACKEND_URL', BACKEND_URL);
`;

const getFrontendUrlCode = `
const FRONTEND_URL = '${buildFrontendUrl}';
const getFrontendUrl = () => requireConfiguredUrl('FRONTEND_URL', FRONTEND_URL);
`;

const getMarketingUrlCode = `
const MARKETING_URL = '${buildMarketingUrl}';
const getMarketingUrl = () => requireConfiguredUrl('MARKETING_URL', MARKETING_URL);
`;

const buildEnvFile = (production) => `
const getFirebaseConfig = () => {
  const defaultFirebase = {
    apiKey: '${apiKey}',
    authDomain: '${authDomain}',
    projectId: '${projectId}',
    storageBucket: '${storageBucket}',
    messagingSenderId: '${messagingSenderId}',
    appId: '${appId}'
  };

  if (typeof window !== 'undefined' && (window as any).FIREBASE_CONFIG) {
    return {
      ...defaultFirebase,
      ...(window as any).FIREBASE_CONFIG
    };
  }
  return defaultFirebase;
};

${urlGuard}
${getBackendUrlCode}
${getFrontendUrlCode}
${getMarketingUrlCode}

export const environment = {
  production: ${production},
  version: '${appVersion}',
  backendUrl: getBackendUrl(),
  frontendUrl: getFrontendUrl(),
  marketingUrl: getMarketingUrl(),
  firebase: getFirebaseConfig(),
  sanity: {
    projectId: '${sanityProjectId}',
    dataset: '${sanityDataset}'
  },
  sentryDsn: '${sentryDsn}'
};
`;

fs.writeFileSync(targetPath, buildEnvFile(true), 'utf8');
console.log(`Angular environment.ts generated from ${path.basename(loadedEnv)}`);

fs.writeFileSync(targetPathDev, buildEnvFile(false), 'utf8');
console.log(`Angular environment.development.ts generated from ${path.basename(loadedEnv)}`);

const firebaseConfigPath = path.join(ROOT, 'src', 'assets', 'firebase-config.js');
fs.writeFileSync(
  firebaseConfigPath,
  `window.FIREBASE_CONFIG = {
  apiKey: '${apiKey}',
  authDomain: '${authDomain}',
  projectId: '${projectId}',
  storageBucket: '${storageBucket}',
  messagingSenderId: '${messagingSenderId}',
  appId: '${appId}'
};
`,
  'utf8',
);
console.log(`firebase-config.js generated at ${firebaseConfigPath}`);
