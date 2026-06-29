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

// Helper to capitalize tag names
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper to chunk arrays
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createTagPlaylists() {
  try {
    console.log("Reading songs data...");
    const data1 = fs.readFileSync("c:/Users/prath/Downloads/galex_10000_songs.json", "utf8");
    const data2 = fs.readFileSync("c:/Users/prath/Downloads/galex_90s_10000_songs.json", "utf8");

    const rawSongs1 = JSON.parse(data1);
    const rawSongs2 = JSON.parse(data2);

    console.log(`Loaded ${rawSongs1.length} songs from first file and ${rawSongs2.length} from second file.`);

    // Deduplicate songs by ID
    const songMap = new Map();
    [...rawSongs1, ...rawSongs2].forEach(song => {
      songMap.set(song.id, song);
    });
    const uniqueSongs = Array.from(songMap.values());
    console.log(`Total unique songs: ${uniqueSongs.length}`);

    // Group songs by tags
    const tagsMap = new Map();
    for (const song of uniqueSongs) {
      if (!song.tags || !Array.isArray(song.tags)) continue;

      const formattedSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        img: song.img
      };

      for (const tag of song.tags) {
        if (!tagsMap.has(tag)) {
          tagsMap.set(tag, []);
        }
        tagsMap.get(tag).push(formattedSong);
      }
    }

    console.log(`Found ${tagsMap.size} unique tags.`);

    // Set maximum songs per playlist to avoid Firestore 1MB limits
    const MAX_SONGS_PER_PLAYLIST = 500;

    // Build the list of playlist objects to upload
    const playlistsToUpload = [];

    for (const [tag, tagSongs] of tagsMap.entries()) {
      // Only create playlists for tags with a decent number of songs to avoid clutter (e.g., at least 5 songs)
      if (tagSongs.length < 5) continue;

      const chunks = chunkArray(tagSongs, MAX_SONGS_PER_PLAYLIST);

      chunks.forEach((chunk, index) => {
        let name = `${capitalize(tag)} Hits`;
        if (chunks.length > 1) {
          name = `${capitalize(tag)} Hits Vol. ${index + 1}`;
        }

        playlistsToUpload.push({
          name: name,
          creator: "Vibeflow Official",
          img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop", // Using a default music image
          createdAt: Date.now(),
          tag: tag, // keep metadata
          songs: chunk
        });
      });
    }

    console.log(`Prepared ${playlistsToUpload.length} playlists for upload.`);

    // Upload sequentially to not hit rate limits or overwhelm memory
    console.log("Uploading playlists to Firestore...");
    let count = 0;
    for (const playlist of playlistsToUpload) {
      await addDoc(collection(db, "playlists"), playlist);
      count++;
      console.log(`Uploaded (${count}/${playlistsToUpload.length}): ${playlist.name} with ${playlist.songs.length} songs.`);
      // Sleep slightly between uploads
      await sleep(100);
    }

    console.log("Successfully generated and uploaded all tag playlists!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tag playlists:", error);
    process.exit(1);
  }
}

createTagPlaylists();