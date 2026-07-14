import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDfzOwFTDT2JELQwKZ-FqLZTUYipU06Zck",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vibeflow-f5cfc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vibeflow-f5cfc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vibeflow-f5cfc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "211660575500",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:211660575500:web:d058abb8cd7bcc339e2f29",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3GC6FG65ZM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
auth.useDeviceLanguage();
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
