const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIdx = trimmed.indexOf('=');
    if (equalIdx === -1) return;
    const key = trimmed.slice(0, equalIdx).trim();
    let val = trimmed.slice(equalIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

const versionFilePath = path.join(__dirname, '..', 'version.txt');
const localVersionFilePath = path.join(__dirname, 'version.txt');
const appVersion = fs.existsSync(versionFilePath)
  ? fs.readFileSync(versionFilePath, 'utf8').trim()
  : fs.existsSync(localVersionFilePath)
    ? fs.readFileSync(localVersionFilePath, 'utf8').trim()
    : '0.0.0-dev';

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');

const environmentsDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(environmentsDir)) {
  fs.mkdirSync(environmentsDir, { recursive: true });
}

// Read process.env variables matching logical grouping order
const apiKey = process.env.FIREBASE_API_KEY ?? 'PLACEHOLDER_API_KEY';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demldotcom';
const appId = process.env.FIREBASE_APP_ID ?? '1:870072971206:web:5231fde2822d750abfccc7';
const authDomain = process.env.FIREBASE_AUTH_DOMAIN ?? 'demldotcom.firebaseapp.com';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? 'demldotcom.firebasestorage.app';
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID ?? '870072971206';
const sanityProjectId = process.env.SANITY_PROJECT_ID ?? 'hj5wtuct';
const sanityDataset = process.env.SANITY_DATASET ?? 'production';

// URL resolution prefers build-time env (BACKEND_URL, MARKETING_URL from Railway etc).
// If not provided (empty), falls back to runtime hostname logic for common deploys (localhost, Railway patterns).
// This avoids broken API calls when build env not set.
const buildBackendUrl = process.env.BACKEND_URL ?? '';
const buildMarketingUrl = process.env.MARKETING_URL ?? '';

const getBackendUrlCode = `
const getBackendUrl = () => {
  if (typeof window === 'undefined') {
    const globalProcess = (globalThis as any).process;
    if (typeof globalProcess !== 'undefined' && globalProcess.env && globalProcess.env['BACKEND_URL']) {
      return globalProcess.env['BACKEND_URL'];
    }
    return '${buildBackendUrl || 'https://backend.deml.app'}';
  }
  const host = window.location.hostname;
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:8000';
  }
  if (host.includes('up.railway.app')) {
    if (host.includes('-frontend')) {
      return \`https://\${host.replace('-frontend', '-backend')}\`;
    }
    if (host.includes('frontend-')) {
      return \`https://\${host.replace('frontend-', 'backend-')}\`;
    }
    return \`https://backend-\${host}\`;
  }
  if (host === 'deml.app' || host.endsWith('.deml.app')) {
    return 'https://backend.deml.app';
  }
  return 'https://backend.deml.app';
};
`;

const getMarketingUrlCode = `
const getMarketingUrl = () => {
  if (typeof window === 'undefined') {
    const globalProcess = (globalThis as any).process;
    if (typeof globalProcess !== 'undefined' && globalProcess.env && globalProcess.env['MARKETING_URL']) {
      return globalProcess.env['MARKETING_URL'];
    }
    return '${buildMarketingUrl || 'https://dataengineeringformachinelearning.com'}';
  }
  const host = window.location.hostname;
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:4321';
  }
  return '${buildMarketingUrl || 'https://dataengineeringformachinelearning.com'}';
};
`;

const envConfigFileProd = `
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

${getBackendUrlCode}
${getMarketingUrlCode}

export const environment = {
  production: true,
  version: '${appVersion}',
  backendUrl: getBackendUrl(),
  marketingUrl: getMarketingUrl(),
  firebase: getFirebaseConfig(),
  sanity: {
    projectId: '${sanityProjectId}',
    dataset: '${sanityDataset}'
  }
};
`;

const envConfigFileDev = `
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

${getBackendUrlCode}
${getMarketingUrlCode}

export const environment = {
  production: false,
  version: '${appVersion}',
  backendUrl: getBackendUrl(),
  marketingUrl: getMarketingUrl(),
  firebase: getFirebaseConfig(),
  sanity: {
    projectId: '${sanityProjectId}',
    dataset: '${sanityDataset}'
  }
};
`;

const targetPathDev = path.join(__dirname, 'src', 'environments', 'environment.development.ts');

fs.writeFileSync(targetPath, envConfigFileProd, 'utf8');
console.log(`Angular environment.ts dynamically generated at ${targetPath}`);

fs.writeFileSync(targetPathDev, envConfigFileDev, 'utf8');
console.log(`Angular environment.development.ts dynamically generated at ${targetPathDev}`);

// Ensure src/assets/firebase-config.js placeholder exists to prevent 404 errors
const firebaseConfigPath = path.join(__dirname, 'src', 'assets', 'firebase-config.js');
if (!fs.existsSync(firebaseConfigPath)) {
  fs.writeFileSync(
    firebaseConfigPath,
    '// Local Firebase configuration override placeholder\n',
    'utf8',
  );
  console.log(`Placeholder firebase-config.js created at ${firebaseConfigPath}`);
}
