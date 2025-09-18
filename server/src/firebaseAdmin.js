// server/src/firebaseAdmin.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Loads: server/firebase-service-account.json
const servicePath = path.join(__dirname, "../firebase-service-account.json");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(servicePath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
