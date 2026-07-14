import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Your Firebase configuration
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

const checkPlaylists = async () => {
  try {
    console.log("Fetching playlists from Firestore...\n");
    const snap = await getDocs(collection(db, 'playlists'));
    
    if (snap.empty) {
      console.log("No playlists found in Firestore.");
      process.exit(0);
    }

    console.log(`Found ${snap.docs.length} playlists:\n`);
    
    snap.docs.forEach((doc, index) => {
      const data = doc.data();
      const songsCount = data.songs ? data.songs.length : 0;
      console.log(`${index + 1}. [ID: ${doc.id}]`);
      console.log(`   Name:    ${data.name || data.title || 'Untitled'}`);
      console.log(`   Creator: ${data.creator || 'Unknown'}`);
      console.log(`   UID:     ${data.uid || 'N/A'}`);
      console.log(`   Songs:   ${songsCount}`);
      console.log(`   Created: ${data.createdAt ? new Date(data.createdAt).toLocaleString() : 'N/A'}`);
      console.log("-".repeat(40));
    });

    process.exit(0);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    process.exit(1);
  }
};

checkPlaylists();
