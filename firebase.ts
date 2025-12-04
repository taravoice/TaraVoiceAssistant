import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Helper to safely access env variables without crashing
const getEnv = (key: string) => {
  try {
    // @ts-ignore - Supress TS error if import.meta.env is missing in specific envs
    return import.meta.env?.[key];
  } catch (e) {
    return undefined;
  }
};

const apiKey = getEnv('VITE_FIREBASE_API_KEY');
const bucket = getEnv('VITE_FIREBASE_STORAGE_BUCKET');

let storage: FirebaseStorage | null = null;

console.log("--- FIREBASE INIT START ---");
if (apiKey && bucket) {
  console.log(`Attempting to connect to bucket: ${bucket}`);
  
  const firebaseConfig = {
    apiKey: apiKey,
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: bucket,
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
  };

  try {
    // Prevent double initialization in strict mode or hot reloads
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    storage = getStorage(app);
    console.log("✅ FIREBASE STORAGE INITIALIZED SUCCESSFULLY");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
  }
} else {
  console.warn("⚠️ Firebase keys missing. Check Vercel Environment Variables.");
  console.log("API Key present:", !!apiKey);
  console.log("Bucket present:", !!bucket);
}

export { storage };
