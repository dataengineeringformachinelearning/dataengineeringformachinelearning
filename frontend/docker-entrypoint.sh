#!/bin/sh

# Generate firebase-config.js from environment variables at runtime
cat <<EOF > /usr/share/nginx/html/assets/firebase-config.js
window.FIREBASE_CONFIG = {
  apiKey: "${FIREBASE_API_KEY:-PLACEHOLDER_API_KEY}",
  authDomain: "${FIREBASE_AUTH_DOMAIN:-demldotcom.firebaseapp.com}",
  projectId: "${FIREBASE_PROJECT_ID:-demldotcom}",
  storageBucket: "${FIREBASE_STORAGE_BUCKET:-demldotcom.firebasestorage.app}",
  messagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID:-870072971206}",
  appId: "${FIREBASE_APP_ID:-1:870072971206:web:5231fde2822d750abfccc7}"
};
EOF

# Execute the default CMD (Nginx)
exec "$@"
