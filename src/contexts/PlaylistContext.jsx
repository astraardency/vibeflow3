import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const defaultPlaylists = [];

const PlaylistContext = createContext();

export const usePlaylists = () => useContext(PlaylistContext);

export const PlaylistProvider = ({ children }) => {
  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('playlists');
      const rawParsed = saved ? JSON.parse(saved) : [];
      // Guard: ensure parsed is always an array (JSON.parse("null") returns null)
      const parsed = Array.isArray(rawParsed) ? rawParsed : [];
      defaultPlaylists.forEach(dp => {
        const existing = parsed.find(p => p.id === dp.id);
        if (!existing) {
          parsed.push(dp);
        } else {
          existing.img = dp.img;
          existing.name = dp.name;
        }
      });
      parsed.forEach(pl => {
        if (pl.songs && Array.isArray(pl.songs)) {
          pl.songs = pl.songs
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
        }
      });
      return parsed;
    } catch (e) {
      return [...defaultPlaylists];
    }
  });

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [playlistSearchResults, setPlaylistSearchResults] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImg, setNewPlaylistImg] = useState('');

  useEffect(() => {
    const unsubscribeSnapshot = onSnapshot(collection(db, 'playlists'), (snapshot) => {
      const playlistsData = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.songs && Array.isArray(data.songs)) {
          data.songs = data.songs
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
        }
        return { id: doc.id, ...data };
      });

      setPlaylists(playlistsData);
      localStorage.setItem('playlists', JSON.stringify(playlistsData));
    }, (error) => {
      console.error("Error fetching playlists: ", error);
    });

    return () => unsubscribeSnapshot();
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
