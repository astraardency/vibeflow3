import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

// Safe cross-device sync: adds a playlist ID to user doc without overwriting other saved IDs
export const arrayUnionUpdateUserDoc = (uid, playlistId) => {
  if (!uid || !playlistId) return;
  updateDoc(doc(db, 'users', uid), { savedPlaylistIds: arrayUnion(playlistId) })
    .catch(e => console.warn('Could not sync savedPlaylistIds to user doc:', e));
};
