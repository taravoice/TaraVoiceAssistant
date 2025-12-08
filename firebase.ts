import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Universal environment variable getter
const getEnv = (key: string) => {
  // Check for Node.js (Serverless Function)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Check for Vite (Browser)
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
};

// Use VITE_ prefix variables, but fallback to non-prefixed if needed (common in backend envs)
const apiKey = getEnv('VITE_FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY');
let bucket = getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET');

// CLEANER: Remove gs:// or protocols
if (bucket) {
  bucket = bucket.replace(/^gs:\/\//, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

let storage: FirebaseStorage | null = null;
let auth: any = null;

if (apiKey && bucket) {
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: bucket,
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
  };

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("✅ FIREBASE INITIALIZED. Bucket:", bucket);
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
  }
}

// Helper to ensure we have permission to write (for API routes)
export const ensureAuth = async () => {
  if (auth && !auth.currentUser) {
    try {
      console.log("Attempting Anonymous Auth...");
      await signInAnonymously(auth);
      console.log("Auth Success");
    } catch (e) {
      console.error("Auth failed", e);
      throw e;
    }
  }
};

export { storage, auth };
