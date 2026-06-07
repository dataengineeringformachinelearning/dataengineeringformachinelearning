const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.ts');

const apiKey = process.env.FIREBASE_API_KEY || 'PLACEHOLDER_API_KEY';
const authDomain = process.env.FIREBASE_AUTH_DOMAIN || 'demldotcom.firebaseapp.com';
const projectId = process.env.FIREBASE_PROJECT_ID || 'demldotcom';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'demldotcom.firebasestorage.app';
const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID || '870072971206';
const appId = process.env.FIREBASE_APP_ID || '1:870072971206:web:5231fde2822d750abfccc7';

const getBackendUrlCode = `const getBackendUrl = () => {
  if (typeof window === 'undefined') {
    if (typeof process !== 'undefined' && process.env && process.env['BACKEND_URL']) {
      return process.env['BACKEND_URL'];
    }
    return 'https://backend.dataengineeringformachinelearning.com';
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
  
  return \`https://backend.\${host}\`;
};`;

const envConfigFile = `${getBackendUrlCode}

export const environment = {
  production: true,
  backendUrl: getBackendUrl(),
  firebase: {
    apiKey: '${apiKey}',
    authDomain: '${authDomain}',
    projectId: '${projectId}',
    storageBucket: '${storageBucket}',
    messagingSenderId: '${messagingSenderId}',
    appId: '${appId}'
  }
};
`;

fs.writeFileSync(targetPath, envConfigFile, 'utf8');
console.log(`Angular environment.ts dynamically generated at ${targetPath}`);
