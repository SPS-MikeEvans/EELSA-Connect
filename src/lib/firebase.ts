import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: "excellentelsa-connect.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

// Initialize Firestore with settings to improve stability in some environments
// Wrapped in try/catch to handle Hot Module Reloading where Firestore might already be initialized
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true, 
  });
} catch (e) {
  db = getFirestore(app);
}

const storage = getStorage(app);
const functions = getFunctions(app, "us-central1"); // Explicitly setting region often helps avoid issues

// Use emulator if specifically configured or in a dev environment that implies it
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}

export { app, auth, db, storage, functions };
