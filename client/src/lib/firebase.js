// client/src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Build config from Vite env (preferred for safety)
const cfgFromEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fallback to your pasted values ONLY if env vars are missing (handy in dev)
const fallbackCfg = {
  apiKey: "AIzaSyDqKk6Xljd-mF9IAFP_pg3NesThxwGUbN4",
  authDomain: "smartgoal-112e0.firebaseapp.com",
  projectId: "smartgoal-112e0",
  storageBucket: "smartgoal-112e0.firebasestorage.app",
  messagingSenderId: "1050093356264",
  appId: "1:1050093356264:web:ab5062d82a462e0f22355d"
};

const firebaseConfig = {
  ...fallbackCfg,
  ...Object.fromEntries(
    Object.entries(cfgFromEnv).filter(([, v]) => v) // use env values when provided
  ),
};

// Helpful diagnostics in dev
if (import.meta.env.DEV) {
  const missing = Object.entries(cfgFromEnv)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.warn("Firebase env vars missing (using fallback values):", missing);
  }
}

let app;
let auth;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase initializeApp failed:", e);
  // Avoid hard crash; the error will also show in console
}

export { app, auth };
