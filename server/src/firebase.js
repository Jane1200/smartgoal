// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDqKk6Xljd-mF9IAFP_pg3NesThxwGUbN4",
  authDomain: "smartgoal-112e0.firebaseapp.com",
  projectId: "smartgoal-112e0",
  storageBucket: "smartgoal-112e0.firebasestorage.app",
  messagingSenderId: "1050093356264",
  appId: "1:1050093356264:web:ab5062d82a462e0f22355d",
  measurementId: "G-9CN58BFBNC"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // ← this is required

export default app;
