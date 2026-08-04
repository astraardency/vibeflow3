import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (import.meta.env.VITE_FIREBASE_API_KEY_ENC ? atob(import.meta.env.VITE_FIREBASE_API_KEY_ENC) : ''),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_ENC ? atob(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_ENC) : ''),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (import.meta.env.VITE_FIREBASE_PROJECT_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_PROJECT_ID_ENC) : ''),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_ENC ? atob(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_ENC) : ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_ENC) : ''),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (import.meta.env.VITE_FIREBASE_APP_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_APP_ID_ENC) : ''),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_ENC) : '')
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
  } else if (err.code === 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence");
  }
});

auth.useDeviceLanguage();
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
