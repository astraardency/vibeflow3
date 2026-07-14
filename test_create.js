import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfzOwFTDT2JELQwKZ-FqLZTUYipU06Zck",
  authDomain: "vibeflow-f5cfc.firebaseapp.com",
  projectId: "vibeflow-f5cfc",
  storageBucket: "vibeflow-f5cfc.firebasestorage.app",
  messagingSenderId: "211660575500",
  appId: "1:211660575500:web:d058abb8cd7bcc339e2f29",
  measurementId: "G-3GC6FG65ZM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testCreate = async () => {
  try {
    const docRef = doc(collection(db, 'playlists'));
    console.log("Attempting to create playlist with ID:", docRef.id);
    await setDoc(docRef, { name: "Test Playlist", songs: [], creator: "Admin" });
    console.log("Successfully created playlist!");
    process.exit(0);
  } catch (e) {
    console.error("Error creating playlist:", e);
    process.exit(1);
  }
};

testCreate();
