import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  
  // User Data States
  const [likedSongs, setLikedSongs] = useState([]);
  const [listeningActivity, setListeningActivity] = useState(() => {
    try {
      const saved = localStorage.getItem('listening_activity')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  });
  const [playsCount, setPlaysCount] = useState(() => {
    try {
      const saved = localStorage.getItem('plays_count')
      return saved ? parseInt(saved, 10) || 0 : 0
    } catch { return 0 }
  });
  const [artistPlays, setArtistPlays] = useState(() => {
    try {
      const saved = localStorage.getItem('artist_plays')
      const parsed = saved ? JSON.parse(saved) : {}
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
    } catch { return {} }
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  });

  const [savedPlaylistIds, setSavedPlaylistIds] = useState(() => {
    try {
      const saved = localStorage.getItem('savedPlaylistIds')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  });

  const lastRemoteState = useRef({
    likedSongs: null,
    listeningActivity: null,
    playsCount: null,
    isDarkMode: null,
    artistPlays: null,
    savedPlaylistIds: null
  });

  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        localStorage.setItem('isLoggedIn', 'true');

        const activeUid = user.uid;
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', activeUid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (JSON.stringify(data.likedSongs) !== JSON.stringify(lastRemoteState.current.likedSongs)) {
              setLikedSongs(data.likedSongs || []);
              lastRemoteState.current.likedSongs = data.likedSongs;
            }
            if (JSON.stringify(data.listeningActivity) !== JSON.stringify(lastRemoteState.current.listeningActivity)) {
              setListeningActivity(data.listeningActivity || []);
              lastRemoteState.current.listeningActivity = data.listeningActivity;
            }
            if (data.playsCount !== lastRemoteState.current.playsCount) {
              setPlaysCount(data.playsCount || 0);
              lastRemoteState.current.playsCount = data.playsCount;
            }
            if (data.isDarkMode !== lastRemoteState.current.isDarkMode) {
              setIsDarkMode(data.isDarkMode);
              lastRemoteState.current.isDarkMode = data.isDarkMode;
            }
            if (JSON.stringify(data.artistPlays) !== JSON.stringify(lastRemoteState.current.artistPlays)) {
              setArtistPlays(data.artistPlays || {});
              lastRemoteState.current.artistPlays = data.artistPlays;
            }
            if (JSON.stringify(data.savedPlaylistIds) !== JSON.stringify(lastRemoteState.current.savedPlaylistIds)) {
              setSavedPlaylistIds(data.savedPlaylistIds || []);
              lastRemoteState.current.savedPlaylistIds = data.savedPlaylistIds;
            }
          }
        }, (error) => {
          console.error("Error fetching user data in real-time:", error);
        });

        setIsUserDataLoaded(true);
      } else {
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        setIsUserDataLoaded(false);
        localStorage.setItem('isLoggedIn', 'false');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  // Sync user data back to Firestore when it changes locally
  useEffect(() => {
    const activeUid = currentUser ? currentUser.uid : null;
    if (activeUid && isUserDataLoaded) {
      const changes = {};
      if (JSON.stringify(likedSongs) !== JSON.stringify(lastRemoteState.current.likedSongs)) {
        changes.likedSongs = likedSongs;
        lastRemoteState.current.likedSongs = likedSongs;
      }
      if (JSON.stringify(listeningActivity) !== JSON.stringify(lastRemoteState.current.listeningActivity)) {
        changes.listeningActivity = listeningActivity;
        lastRemoteState.current.listeningActivity = listeningActivity;
      }
      if (playsCount !== lastRemoteState.current.playsCount) {
        changes.playsCount = playsCount;
        lastRemoteState.current.playsCount = playsCount;
      }
      if (isDarkMode !== lastRemoteState.current.isDarkMode) {
        changes.isDarkMode = isDarkMode;
        lastRemoteState.current.isDarkMode = isDarkMode;
      }
      if (JSON.stringify(artistPlays) !== JSON.stringify(lastRemoteState.current.artistPlays)) {
        changes.artistPlays = artistPlays;
        lastRemoteState.current.artistPlays = artistPlays;
      }
      if (JSON.stringify(savedPlaylistIds) !== JSON.stringify(lastRemoteState.current.savedPlaylistIds)) {
        changes.savedPlaylistIds = savedPlaylistIds;
        lastRemoteState.current.savedPlaylistIds = savedPlaylistIds;
        localStorage.setItem('savedPlaylistIds', JSON.stringify(savedPlaylistIds));
      }

      if (Object.keys(changes).length > 0) {
        updateDoc(doc(db, 'users', activeUid), changes).catch(err => console.error("Error syncing data:", err));
      }
    }
  }, [likedSongs, listeningActivity, playsCount, isDarkMode, artistPlays, savedPlaylistIds, currentUser, isUserDataLoaded]);

  // Sync theme variables
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--bg-color', '#121215');
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--card-bg', '#1d1d23');
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--panel-bg', '#16161a');
      root.style.setProperty('--input-bg', '#222228');
      root.style.setProperty('--input-border', '#2a2a32');
      root.style.setProperty('--hover-bg', 'rgba(255, 255, 255, 0.06)');
      root.style.setProperty('--bar-bg', '#2d2d35');
      root.style.setProperty('--artist-sheet-bg', '#16161a');
      root.style.setProperty('--player-bar-bg', 'rgba(22, 22, 26, 0.85)');
      localStorage.setItem('theme', 'dark');
    } else {
      root.style.setProperty('--bg-color', '#f7f7f9');
      root.style.setProperty('--text-color', '#121212');
      root.style.setProperty('--text-secondary', '#6b6b6b');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--border-color', '#eef0f3');
      root.style.setProperty('--panel-bg', '#ffffff');
      root.style.setProperty('--input-bg', '#ffffff');
      root.style.setProperty('--input-border', '#e5e5e7');
      root.style.setProperty('--hover-bg', '#f4f5f7');
      root.style.setProperty('--bar-bg', '#e5e5e7');
      root.style.setProperty('--artist-sheet-bg', '#ffffff');
      root.style.setProperty('--player-bar-bg', 'rgba(255, 255, 255, 0.85)');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleLike = (songTitle, e, triggerToast) => {
    if (e) e.stopPropagation();
    if (likedSongs.includes(songTitle)) {
      setLikedSongs(likedSongs.filter(title => title !== songTitle));
      if (triggerToast) triggerToast('Removed from Liked Songs');
    } else {
      setLikedSongs([...likedSongs, songTitle]);
      if (triggerToast) triggerToast('Added to Liked Songs');
    }
  };

  const value = {
    currentUser,
    isUserDataLoaded,
    likedSongs,
    listeningActivity,
    setListeningActivity,
    playsCount,
    setPlaysCount,
    artistPlays,
    setArtistPlays,
    isDarkMode,
    setIsDarkMode,
    savedPlaylistIds,
    setSavedPlaylistIds,
    toggleLike
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
