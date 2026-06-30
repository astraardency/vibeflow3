import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';

const PlaylistContext = createContext();

export const usePlaylists = () => useContext(PlaylistContext);

const filterAndCleanSongs = (songs) => {
  if (!songs || !Array.isArray(songs)) return [];
  return songs
    .filter(song => {
      const lang = (song.language || '').toLowerCase();
      const genre = (song.genre || '').toLowerCase();
      const isDevotional = genre.includes('devotional') || genre.includes('spiritual') || genre.includes('bhakti');
      return (lang === 'tamil' || lang === 'unknown' || lang === '') && !isDevotional;
    })
    .map(song => ({
      ...song,
      title: (song.title || '').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim()
    }));
};

// Helper: find which playlists belong to this user
const getOwnedIds = (playlistsData, uid, username, emailName) =>
  playlistsData
    .filter(p => {
      const isOwner =
        (uid && p.uid === uid) ||
        (username && p.creator === username) ||
        (emailName && p.creator === emailName);
      return isOwner && !p.hidden;
    })
    .map(p => p.id);

// Helper: push owned IDs using arrayUnion — NEVER overwrites saved-but-not-owned IDs
const syncOwnedPlaylistsToCloud = (uid, ownedIds) => {
  if (!uid || ownedIds.length === 0) return;
  // arrayUnion only ADDS new IDs — never removes existing saved-by-others IDs
  updateDoc(doc(db, 'users', uid), { savedPlaylistIds: arrayUnion(...ownedIds) })
    .catch(e => console.warn('Could not sync savedPlaylistIds to cloud:', e));
};

export const PlaylistProvider = ({ children }) => {
  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('playlists');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [playlistSearchResults, setPlaylistSearchResults] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImg, setNewPlaylistImg] = useState('');

  // Sync ALL playlists from Firestore + self-heal owned IDs
  useEffect(() => {
    const unsubscribeSnapshot = onSnapshot(collection(db, 'playlists'), (snapshot) => {
      const playlistsData = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        data.songs = filterAndCleanSongs(data.songs);
        return { id: docSnap.id, ...data };
      });

      setPlaylists(playlistsData);
      localStorage.setItem('playlists', JSON.stringify(playlistsData));

      // Self-heal: add owned playlists to savedPlaylistIds using arrayUnion (safe)
      const uid = auth.currentUser?.uid || localStorage.getItem('tv_uid') || null;
      const username = auth.currentUser?.displayName || localStorage.getItem('username') || '';
      const email = auth.currentUser?.email || localStorage.getItem('email') || '';
      const emailName = email ? email.split('@')[0] : '';

      if (!uid && !username) return;

      const ownedIds = getOwnedIds(playlistsData, uid, username, emailName);
      if (ownedIds.length === 0) return;

      // Only update localStorage with what we just discovered (don't erase existing)
      const existingRaw = localStorage.getItem('savedPlaylistIds');
      const existing = existingRaw ? (JSON.parse(existingRaw) || []) : [];
      const newlyFound = ownedIds.filter(id => !existing.includes(id));

      if (newlyFound.length > 0) {
        const merged = Array.from(new Set([...existing, ...newlyFound]));
        localStorage.setItem('savedPlaylistIds', JSON.stringify(merged));
        // Use arrayUnion so Firestore only adds — never wipes saved-but-not-owned IDs
        syncOwnedPlaylistsToCloud(uid, newlyFound);
        window.dispatchEvent(new CustomEvent('playlistIdsUpdated', { detail: merged }));
      }
    }, (error) => {
      console.error('Error fetching playlists: ', error);
    });

    return () => unsubscribeSnapshot();
  }, []);

  // Re-run self-heal after auth is restored (fixes race condition: playlists load before auth ready)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const stored = localStorage.getItem('playlists');
      if (!stored) return;
      let playlistsData;
      try { playlistsData = JSON.parse(stored); } catch { return; }
      if (!Array.isArray(playlistsData)) return;

      const uid = user.uid;
      const username = user.displayName || '';
      const email = user.email || '';
      const emailName = email ? email.split('@')[0] : '';

      const ownedIds = getOwnedIds(playlistsData, uid, username, emailName);
      if (ownedIds.length === 0) return;

      const existingRaw = localStorage.getItem('savedPlaylistIds');
      const existing = existingRaw ? (JSON.parse(existingRaw) || []) : [];
      const newlyFound = ownedIds.filter(id => !existing.includes(id));

      if (newlyFound.length > 0) {
        const merged = Array.from(new Set([...existing, ...newlyFound]));
        localStorage.setItem('savedPlaylistIds', JSON.stringify(merged));
        // arrayUnion: safe server-side merge — preserves saved-but-not-owned playlists
        syncOwnedPlaylistsToCloud(uid, newlyFound);
        window.dispatchEvent(new CustomEvent('playlistIdsUpdated', { detail: merged }));
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const value = {
    playlists, setPlaylists,
    selectedPlaylist, setSelectedPlaylist,
    playlistSearchQuery, setPlaylistSearchQuery,
    playlistSearchResults, setPlaylistSearchResults,
    showCreateModal, setShowCreateModal,
    newPlaylistName, setNewPlaylistName,
    newPlaylistImg, setNewPlaylistImg
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};
