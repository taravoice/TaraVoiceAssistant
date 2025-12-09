
// Use namespace imports to resolve named export missing member resolution issues in standard modular firebase
import * as firebaseApp from 'firebase/app';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import * as firebaseAuth from 'firebase/auth';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env[key]) return import.meta.env[key];
  } catch (e) {}
  return undefined;
};

const apiKey = getEnv('VITE_FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY');
let bucket = getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET');

// CLEANER: Robust bucket syntax cleaning
if (bucket) {
  bucket = bucket.replace(/^gs:\/\//, '').replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
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
    // Initialize application using singleton check from the app namespace
    const app = firebaseApp.getApps().length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
    storage = getStorage(app);
    auth = firebaseAuth.getAuth(app);
    console.log("🔥 Firebase: Connected to Bucket:", bucket);
  } catch (err) {
    console.error("🔥 Firebase: Initialization failed.", err);
  }
}

export const ensureAuth = async () => {
  if (auth && !auth.currentUser) {
    try {
      // Use modular signInAnonymously from the auth namespace
      await firebaseAuth.signInAnonymously(auth);
    } catch (e) {
      console.error("🔥 Firebase: Anonymous Auth Blocked.", e);
      throw e;
    }
  }
};

export { storage, auth };
