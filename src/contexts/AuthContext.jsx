import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
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
  const [dailyPlays, setDailyPlays] = useState(() => {
    try {
      const saved = localStorage.getItem('daily_plays');
      const parsed = saved ? JSON.parse(saved) : [0, 0, 0, 0, 0, 0, 0];
      return Array.isArray(parsed) ? parsed : [0, 0, 0, 0, 0, 0, 0];
    } catch (e) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
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
    dailyPlays: null,
    savedPlaylistIds: null
  });

  useEffect(() => {
    let unsubscribeUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      const tvUid = localStorage.getItem('tv_uid');
      const user = tvUid ? { uid: tvUid, isAnonymous: false, displayName: localStorage.getItem('username'), email: localStorage.getItem('email') } : authUser;
      setCurrentUser(user);
      if (user && !user.isAnonymous) {
        localStorage.setItem('isLoggedIn', 'true');

        const activeUid = user.uid;
        unsubscribeUserDoc = onSnapshot(doc(db, 'users', activeUid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            if (JSON.stringify(data.likedSongs) !== JSON.stringify(lastRemoteState.current.likedSongs)) {
              setLikedSongs(prev => {
                const remote = data.likedSongs || [];
                const merged = Array.from(new Set([...(prev || []), ...remote]));
                return merged;
              });
              lastRemoteState.current.likedSongs = data.likedSongs || [];
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
              const safeDarkMode = data.isDarkMode ?? false;
              setIsDarkMode(safeDarkMode);
              lastRemoteState.current.isDarkMode = safeDarkMode;
            }
            if (JSON.stringify(data.artistPlays) !== JSON.stringify(lastRemoteState.current.artistPlays)) {
              setArtistPlays(data.artistPlays || {});
              lastRemoteState.current.artistPlays = data.artistPlays;
            }
            if (JSON.stringify(data.dailyPlays) !== JSON.stringify(lastRemoteState.current.dailyPlays)) {
              setDailyPlays(data.dailyPlays || [0, 0, 0, 0, 0, 0, 0]);
              lastRemoteState.current.dailyPlays = data.dailyPlays;
            }
            if (JSON.stringify(data.savedPlaylistIds) !== JSON.stringify(lastRemoteState.current.savedPlaylistIds)) {
              let fetched = data.savedPlaylistIds;
              if (!fetched || fetched.length === 0) {
                const creatorName = user.displayName || (user.email ? user.email.split('@')[0] : null) || localStorage.getItem('username');
                if (creatorName) {
                  getDocs(collection(db, 'playlists')).then(snap => {
                    const owned = [];
                    snap.forEach(d => {
                      if (d.data().creator === creatorName) owned.push(d.id);
                    });
                    if (owned.length > 0) {
                      setSavedPlaylistIds(prev => Array.from(new Set([...prev, ...owned])));
                      lastRemoteState.current.savedPlaylistIds = owned;
                    } else {
                      lastRemoteState.current.savedPlaylistIds = [];
                    }
                  }).catch(e => console.error(e));
                } else {
                  lastRemoteState.current.savedPlaylistIds = [];
                }
              } else {
                setSavedPlaylistIds(prev => Array.from(new Set([...prev, ...fetched])));
                lastRemoteState.current.savedPlaylistIds = fetched;
              }
            }
          } else {
            // Document doesn't exist, create it. This handles mobile web redirect flows 
            // where AccountSettings unmounts before creating the document.
            import('firebase/firestore').then(({ setDoc }) => {
              setDoc(doc(db, 'users', activeUid), {
                id: activeUid,
                username: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
                email: user.email || '',
                preferences: { highQualityAudio: true, dataSaver: false, offlineMode: true },
                joinDate: new Date().toISOString()
              }).catch(err => console.error("Error creating user doc:", err));
            });
          }
          
          if (!isUserDataLoaded) {
            setIsUserDataLoaded(true);
          }
        }, (error) => {
          console.error("Error fetching user data in real-time:", error);
        });

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

  // Listen for playlist self-heal events from PlaylistContext
  useEffect(() => {
    const handlePlaylistIdsUpdated = (e) => {
      const newIds = e.detail;
      if (Array.isArray(newIds) && newIds.length > 0) {
        setSavedPlaylistIds(prev => Array.from(new Set([...prev, ...newIds])));
      }
    };
    window.addEventListener('playlistIdsUpdated', handlePlaylistIdsUpdated);
    return () => window.removeEventListener('playlistIdsUpdated', handlePlaylistIdsUpdated);
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
      if (JSON.stringify(dailyPlays) !== JSON.stringify(lastRemoteState.current.dailyPlays)) {
        changes.dailyPlays = dailyPlays;
        lastRemoteState.current.dailyPlays = dailyPlays;
        localStorage.setItem('daily_plays', JSON.stringify(dailyPlays));
      }
      if (JSON.stringify(savedPlaylistIds) !== JSON.stringify(lastRemoteState.current.savedPlaylistIds)) {
        changes.savedPlaylistIds = savedPlaylistIds;
        lastRemoteState.current.savedPlaylistIds = savedPlaylistIds;
        localStorage.setItem('savedPlaylistIds', JSON.stringify(savedPlaylistIds));
      }

      if (Object.keys(changes).length > 0) {
        // Filter out any undefined values to prevent Firebase invalid-argument errors
        const safeChanges = {};
        Object.keys(changes).forEach(key => {
          if (changes[key] !== undefined) {
            safeChanges[key] = JSON.parse(JSON.stringify(changes[key]));
          }
        });

        if (Object.keys(safeChanges).length > 0) {
          updateDoc(doc(db, 'users', activeUid), safeChanges).catch(err => console.error("Error syncing data:", err));
        }
      }
    }
  }, [likedSongs, listeningActivity, playsCount, isDarkMode, artistPlays, dailyPlays, savedPlaylistIds, currentUser, isUserDataLoaded]);

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
    if (!songTitle) return;
    const currentLikes = Array.isArray(likedSongs) ? likedSongs : [];
    if (currentLikes.includes(songTitle)) {
      setLikedSongs(currentLikes.filter(title => title !== songTitle));
      if (triggerToast) triggerToast('Removed from Liked Songs');
    } else {
      setLikedSongs([...currentLikes, songTitle]);
      if (triggerToast) triggerToast('Added to Liked Songs');
    }
  };

  const value = {
    currentUser,
    isUserDataLoaded,
    userData,
    likedSongs,
    listeningActivity,
    setListeningActivity,
    playsCount,
    setPlaysCount,
    artistPlays,
    setArtistPlays,
    dailyPlays,
    setDailyPlays,
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
