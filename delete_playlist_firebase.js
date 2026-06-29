import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

const deleteAllPlaylists = async () => {
  try {
    console.log("Fetching all playlists from Firestore...");
    const snap = await getDocs(collection(db, 'playlists'));
    
    if (snap.empty) {
      console.log("⚠️ No playlists found in Firestore. Database is already empty.");
      process.exit(0);
    }

    console.log(`Found ${snap.docs.length} playlists. Deleting them now...`);
    
    let deletedCount = 0;
    for (const d of snap.docs) {
      const playlistData = d.data();
      await deleteDoc(doc(db, 'playlists', d.id));
      console.log(`✅ Deleted: "${playlistData.name || playlistData.title || d.id}"`);
      deletedCount++;
    }

    console.log(`🎉 Successfully deleted all ${deletedCount} playlists!`);
    process.exit(0);
  } catch (e) {
    console.error("Error deleting playlists:", e);
    process.exit(1);
  }
};

deleteAllPlaylists();
