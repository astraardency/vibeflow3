import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";

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

async function createPlaylist() {
  try {
    console.log("Reading songs data...");
    const data = fs.readFileSync("c:/Users/prath/Downloads/galex_10000_songs.json", "utf8");
    const rawSongs = JSON.parse(data);

    // Map to required structure
    const songs = rawSongs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      img: song.img
    }));

    const playlist = {
      name: "Galex 10000 Songs",
      creator: "Vibeflow Official",
      img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop",
      createdAt: Date.now(),
      songs: songs
    };

    console.log("Uploading playlist to Firestore...");
    await addDoc(collection(db, "playlists"), playlist);
    console.log("Successfully created playlist 'Galex 10000 Songs'!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating playlist:", error);
    process.exit(1);
  }
}

createPlaylist();
