import React, { useState } from 'react';
import { ArrowLeft, Search, Heart, ListMusic, Headphones, Sparkles, Play, Plus, Check, Share2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { usePlaylists } from '../contexts/PlaylistContext';
import { getSongImage } from '../utils/playerUtils';
import defaultSongsRaw from '../data/songs.js';
import { db } from '../services/firebase';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';

const defaultSongs = defaultSongsRaw.filter(song => song.language?.toLowerCase() === 'tamil');

const LibraryContainer = ({ isLikedSongsOpen, setIsLikedSongsOpen, setShowCreateModal }) => {
  const { activeTab, triggerToast, setIsAccountSettingsOpen } = useAppContext();
  const { currentUser, likedSongs, toggleLike, listeningActivity, playsCount, artistPlays, dailyPlays } = useAuth();
  const { currentTrack, isPlaying, playSong, setIsShuffleMode } = usePlayer();
  const { playlists, setPlaylists, selectedPlaylist, setSelectedPlaylist } = usePlaylists();

  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [playlistSearchResults, setPlaylistSearchResults] = useState([]);
  const [isSearchingPlaylistSongs, setIsSearchingPlaylistSongs] = useState(false);
  const [showAllComposers, setShowAllComposers] = useState(false);

  const { savedPlaylistIds, setSavedPlaylistIds } = useAuth();

  const handleShare = (type, data, e) => {
    if (e) e.stopPropagation();
    if (!data) return;
    const title = type === 'playlist' ? `Playlist: ${data.name}` : `Listen to ${data.title}`;
    const text = type === 'playlist' 
      ? `Check out this awesome playlist "${data.name}" on Vibeflow! 🎵` 
      : `I'm listening to ${data.title} by ${data.artist} on Vibeflow! 🎧🔥`;
    const url = window.location.origin;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      triggerToast('Link copied to clipboard!');
    }
  };

  const getLikedSongsList = () => {
    const list = []
    const seen = new Set()
    defaultSongs.forEach(song => {
      if (likedSongs.includes(song.title) && !seen.has(song.title)) {
        seen.add(song.title)
        list.push(song)
      }
    })
    listeningActivity.forEach(song => {
      if (likedSongs.includes(song.title) && !seen.has(song.title)) {
        seen.add(song.title)
        list.push(song)
      }
    })
    return list
  }

  const shuffleQueue = (queue) => {
    if (!queue || queue.length === 0) return
    const shuffled = [...queue]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setIsShuffleMode(true);
    playSong(shuffled[0], 0, shuffled)
    triggerToast('Shuffling tracks!')
  }

  const handleDeletePlaylist = async (id, e) => {
    if (e) e.stopPropagation()
    const updatedPlaylists = playlists.filter(p => p.id !== id)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))

    const updatedSaved = savedPlaylistIds.filter(pid => pid !== id);
    setSavedPlaylistIds(updatedSaved);
    localStorage.setItem('savedPlaylistIds', JSON.stringify(updatedSaved));

    if (selectedPlaylist && selectedPlaylist.id === id) {
      setSelectedPlaylist(null)
    }
    triggerToast('Playlist deleted.')

    try {
      await deleteDoc(doc(db, 'playlists', id))
    } catch (error) {
      console.error("Error deleting playlist from cloud: ", error)
    }
  }

  const removeSongFromPlaylist = async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return
    const updatedSongs = playlist.songs.filter(s => s.id !== songId)
    const updatedPlaylist = { ...playlist, songs: updatedSongs }
    const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    triggerToast('Song removed from playlist.')
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updatedPlaylist)
    }
    try {
      await updateDoc(doc(db, 'playlists', playlistId), { songs: updatedSongs })
    } catch (error) {}
  }

  const getSuggestedSongs = () => {
    if (listeningActivity.length === 0) return defaultSongs.slice(0, 15);
    const combined = [...listeningActivity];
    defaultSongs.forEach(song => {
      if (!combined.some(s => s.title === song.title) && combined.length < 15) combined.push(song);
    });
    return combined;
  };

  const handlePlaylistSearch = async (e, query = playlistSearchQuery) => {
    if (e) e.preventDefault()
    if (!query.trim()) {
      setPlaylistSearchResults([])
      return
    }
    setIsSearchingPlaylistSongs(true)
    const { searchSongs } = await import('../services/saavn');
    const results = await searchSongs(query)
    setPlaylistSearchResults(results)
    setIsSearchingPlaylistSongs(false)
  }

  const addSongToPlaylist = async (playlistId, song) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return
    if (playlist.songs.some(s => s.id === song.id || s.title === song.title)) {
      triggerToast('Song already in playlist!')
      return
    }
    const updatedSongs = [...playlist.songs, song]
    const updatedPlaylist = { ...playlist, songs: updatedSongs }
    const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    triggerToast(`Added "${song.title}" to ${playlist.name}!`)
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updatedPlaylist)
    }
    try {
      await updateDoc(doc(db, 'playlists', playlistId), { songs: updatedSongs })
    } catch (error) {}
  }

  if (activeTab === 'create') {
    if (isLikedSongsOpen) {
      return (
        <div className="playlist-container">
          <div className="playlist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setIsLikedSongsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={22} />
            </button>
            <h3 className="playlist-header-title" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>Liked Songs</h3>
            <div style={{ width: '40px' }}></div>
          </div>

          <div className="playlist-banner" style={{ background: 'linear-gradient(135deg, #f7d2d2 0%, #ebb4b4 100%)', padding: '30px 20px', borderRadius: '16px', margin: '20px 0', position: 'relative', overflow: 'hidden' }}>
            <div className="playlist-banner-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)' }}></div>
            <div className="playlist-banner-content" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
              <div>
                <span className="playlist-badge" style={{ background: 'rgba(255,255,255,0.3)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>COLLECTION</span>
                <h2 className="playlist-banner-title" style={{ fontSize: '28px', color: 'white', margin: '10px 0 5px 0' }}>Your Favorites</h2>
                <p className="playlist-banner-desc" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }}>{likedSongs.length} liked tracks</p>
              </div>
              {getLikedSongsList().length > 0 && (
                <button
                  onClick={() => shuffleQueue(getLikedSongsList())}
                  className="focusable"
                  tabIndex={0}
                  style={{
                    background: 'white',
                    border: 'none',
                    color: '#ebb4b4',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  Shuffle Play
                </button>
              )}
            </div>
          </div>

          <div className="playlist-tracklist-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 15px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid #eef0f3', marginBottom: '10px' }}>
            <span>TITLE & ARTIST</span>
            <span>ACTION</span>
          </div>

          <div className="playlist-songs-list hide-scrollbar" style={{ overflowY: 'auto' }}>
            {getLikedSongsList().length === 0 ? (
              <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No liked songs yet. Like some tracks to see them here!
              </div>
            ) : (
              getLikedSongsList().map((song, idx) => (
                <div
                  key={song.id || idx}
                  className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
                  tabIndex={0}
                  onClick={() => playSong(song, idx, getLikedSongsList())}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}
                >
                  <div className="playlist-song-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="playlist-song-img-container" style={{ position: 'relative' }}>
                      <img
                        src={getSongImage(song)}
                        alt={song.title}
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                      />
                      {currentTrack?.title === song.title && isPlaying && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                          <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="playlist-song-title" style={{ fontWeight: '500', fontSize: '14px' }}>{song.title}</div>
                      <div className="playlist-song-artist" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{song.artist}</div>
                    </div>
                  </div>
                  <button
                    className="remove-song-btn focusable"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(song.title, e, triggerToast)
                    }}
                    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '5px', fontSize: '12px' }}
                  >
                    Unlike
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }
    
    if (selectedPlaylist) {
      return (
        <div className="playlist-container">
          <div className="playlist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => {
              setSelectedPlaylist(null)
              setPlaylistSearchQuery('')
              setPlaylistSearchResults([])
            }} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={22} />
            </button>
            <h3 className="playlist-header-title" style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>{selectedPlaylist.name}</h3>
            <button
              className="playlist-delete-btn focusable"
              tabIndex={0}
              onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
              style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
            >
              Delete Playlist
            </button>
          </div>

          <div className="playlist-banner" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end', padding: '20px 0', margin: '20px 0' }}>
            <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} onClick={() => {
              try {
                const url = window.prompt("Enter new image URL for the playlist cover:");
                if (url) {
                  if (url.length > 2000) {
                    alert("Image URL is too long! Please use a standard web link.");
                    return;
                  }
                  const updatedPlaylist = { ...selectedPlaylist, img: url };
                  setSelectedPlaylist(updatedPlaylist);
                  const updatedPlaylists = playlists.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p);
                  setPlaylists(updatedPlaylists);
                  try { localStorage.setItem('playlists', JSON.stringify(updatedPlaylists)); } catch(e) {}
                  setDoc(doc(db, 'playlists', selectedPlaylist.id), { img: url }, { merge: true }).catch(e => console.warn('Sync failed:', e));
                }
              } catch(e) { console.error(e) }
            }}>
              {selectedPlaylist.img ? (
                <img src={selectedPlaylist.img} alt={selectedPlaylist.name} style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'; }} />
              ) : (
                <div style={{ width: '180px', height: '180px', background: 'linear-gradient(135deg, var(--card-orange), var(--neon-cyan))', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                  <ListMusic size={64} color="white" />
                </div>
              )}
              <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Change Cover
              </div>
            </div>

            <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
              <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>COMMUNITY PLAYLIST</span>
              <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedPlaylist.name}</h2>
              <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{selectedPlaylist.songs.length} songs • Created by {selectedPlaylist.creator || 'Anonymous'}</p>

              {selectedPlaylist.songs.length > 0 && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => shuffleQueue(selectedPlaylist.songs)}
                    className="focusable"
                    tabIndex={0}
                    style={{ background: 'var(--card-orange)', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Play size={16} fill="white" /> Shuffle Play
                  </button>
                  <button
                    onClick={(e) => handleShare('playlist', selectedPlaylist, e)}
                    className="focusable"
                    tabIndex={0}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Share2 size={16} /> Share
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="playlist-tracklist-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 15px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
            <span>TITLE & ARTIST</span>
            <span>ACTION</span>
          </div>

          <div className="playlist-songs-list hide-scrollbar" style={{ overflowY: 'auto' }}>
            {selectedPlaylist.songs.length === 0 ? (
              <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No songs in this playlist yet. Add songs below!
              </div>
            ) : (
              selectedPlaylist.songs.map((song, idx) => (
                <div
                  key={song.id || idx}
                  className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
                  tabIndex={0}
                  onClick={() => playSong(song, idx, selectedPlaylist.songs)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}
                >
                  <div className="playlist-song-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="playlist-song-img-container" style={{ position: 'relative' }}>
                      <img src={getSongImage(song)} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="playlist-song-title">{song.title}</div>
                      <div className="playlist-song-artist">{song.artist}</div>
                    </div>
                  </div>
                  <button className="remove-song-btn focusable" tabIndex={0} onClick={(e) => { e.stopPropagation(); removeSongFromPlaylist(selectedPlaylist.id, song.id); }} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '5px', fontSize: '12px' }}>Remove</button>
                </div>
              ))
            )}
          </div>

          <div className="playlist-add-songs-section">
            <h3 className="section-title">Add Songs</h3>
            <form onSubmit={handlePlaylistSearch} className="search-form" style={{ marginBottom: '15px' }}>
              <div className="search-input-wrapper">
                <Search size={18} className="search-box-icon" />
                <input
                  type="text"
                  placeholder="Search for songs to add..."
                  value={playlistSearchQuery}
                  onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                  onKeyUp={(e) => handlePlaylistSearch(e, e.target.value)}
                  className="search-input-redesign focusable"
                  tabIndex={0}
                />
              </div>
            </form>
            <div className="playlist-search-results hide-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {(playlistSearchQuery.trim() === '' ? getSuggestedSongs() : playlistSearchResults).map((song) => {
                const isAdded = selectedPlaylist.songs.some(s => s.id === song.id || s.title === song.title)
                return (
                  <div key={song.id} className="search-result-item focusable" tabIndex={0} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', marginBottom: '8px', background: 'var(--card-bg)' }}>
                    <img src={song.img} alt={song.title} className="search-result-img" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                    <div className="search-result-info" style={{ flex: 1, marginLeft: '10px', overflow: 'hidden' }}>
                      <div className="search-result-title" style={{ fontSize: '14px', color: 'var(--text-color)' }}>{song.title}</div>
                    </div>
                    <button onClick={() => { if (!isAdded) addSongToPlaylist(selectedPlaylist.id, song) }} style={{ background: isAdded ? 'transparent' : 'var(--card-orange)', color: isAdded ? 'var(--text-color)' : 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', border: 'none', cursor: isAdded ? 'default' : 'pointer' }}>
                      {isAdded ? 'Added' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="playlists-screen">
        <div className="playlists-header-container">
          <div>
            <h2 className="playlists-title">Your Library</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', fontWeight: '500' }}>Tamil music collection</p>
          </div>
        </div>

        <button className="create-playlist-btn focusable" tabIndex={0} onClick={() => setShowCreateModal(true)}>
          <span>NEW PLAYLIST</span>
        </button>

        <div className="library-stats-row">
          <div className="library-stat-pill">
            <span className="lib-stat-val">{playlists.filter(p => !p.hidden && savedPlaylistIds.includes(p.id)).length}</span>
            <span className="lib-stat-label">Playlists</span>
          </div>
          <div className="library-stat-divider"></div>
          <div className="library-stat-pill">
            <span className="lib-stat-val">{likedSongs.length}</span>
            <span className="lib-stat-label">Liked</span>
          </div>
          <div className="library-stat-divider"></div>
          <div className="library-stat-pill">
            <span className="lib-stat-val">{playlists.filter(p => !p.hidden && savedPlaylistIds.includes(p.id)).reduce((acc, p) => acc + (p.songs?.length || 0), 0)}</span>
            <span className="lib-stat-label">Saved Songs</span>
          </div>
        </div>

        <h3 className="collection-title">Your Collection</h3>
        <div className="collection-grid">
          <div className="collection-card collection-card--liked focusable" tabIndex={0} onClick={() => setIsLikedSongsOpen(true)}>
            <div className="collection-card-art liked-card-gradient">
              <Heart size={32} fill="white" color="white" />
              <div className="collection-card-art-shine"></div>
            </div>
            <div className="collection-card-info">
              <div className="collection-card-title">Liked Songs</div>
              <div className="collection-card-desc">{likedSongs.length} songs</div>
            </div>
          </div>

          {playlists.filter(p => !p.hidden && savedPlaylistIds.includes(p.id)).map((playlist, pIdx) => {
            const gradients = [
              'linear-gradient(135deg, #f5954a 0%, #ff6b9d 100%)',
              'linear-gradient(135deg, #00e5cc 0%, #007cf0 100%)',
              'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
            ];
            const grad = gradients[pIdx % gradients.length];
            return (
              <div key={playlist.id} className="collection-card focusable" tabIndex={0} onClick={() => setSelectedPlaylist(playlist)}>
                <div className="collection-card-art" style={{ background: playlist.img ? `url("${playlist.img}") center/cover no-repeat` : grad }}>
                  {!playlist.img && <ListMusic size={32} color="white" />}
                  <div className="collection-card-art-shine"></div>
                </div>
                <div className="collection-card-info">
                  <div className="collection-card-title">{playlist.name}</div>
                  <div className="collection-card-desc">{playlist.songs.length} songs</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (activeTab === 'library') {
    const sortedArtists = Object.entries(artistPlays)
      .filter(([k]) => k && k.trim() !== '' && k !== 'undefined')
      .sort(([, a], [, b]) => b - a);
    const getArtistImage = (name) => {
      const nameLower = name.toLowerCase();
      if (nameLower.includes('rahman')) return 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('anirudh')) return 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f924?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('yuvan')) return 'https://images.unsplash.com/photo-1516280440502-69da0ce5e913?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('harris')) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('deva')) return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('santhosh narayanan')) return 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f924?q=80&w=200&auto=format&fit=crop';
      if (nameLower.includes('hiphop') || nameLower.includes('tamizha')) return 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg';
      return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop';
    };

    const topArtist = sortedArtists.length > 0
      ? { name: sortedArtists[0][0], count: sortedArtists[0][1], img: getArtistImage(sortedArtists[0][0]) }
      : { name: 'Hiphop Tamizha', count: 5, img: getArtistImage('Hiphop Tamizha') };

    return (
      <div className="vibe-stats-screen">
        <div className="stats-header-container">
          <h2 className="stats-title">Vibe Stats</h2>
          <div className="stats-profile-avatar" onClick={() => setIsAccountSettingsOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', background: 'var(--card-bg)' }}>
            <img src={currentUser?.photoURL || '/icon.png'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stats-card">
            <Headphones size={22} className="stats-card-icon" />
            <div className="stats-card-label">Total Plays</div>
            <div className="stats-card-val">{playsCount} songs</div>
          </div>

          <div className="stats-card">
            <Sparkles size={22} className="stats-card-icon" />
            <div className="stats-card-label">Vibe Tier</div>
            <div className="stats-card-val">
              {playsCount > 100 ? 'Melophile' : playsCount > 50 ? 'Enthusiast' : playsCount > 10 ? 'Explorer' : 'Starter'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ backgroundColor: 'var(--card-bg, white)', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '20px' }}>#1 Top Artist</h3>
            <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto', marginBottom: '16px' }}>
              <div style={{ position: 'absolute', inset: '-4px', background: 'linear-gradient(45deg, #ff7b00, #ff0055)', borderRadius: '50%', filter: 'blur(8px)', opacity: 0.6 }}></div>
              <img src={topArtist.img} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--card-bg, white)' }} alt={topArtist.name} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '12px' }}>{topArtist.name}</h2>
            <div style={{ display: 'inline-block', backgroundColor: 'var(--hover-bg, #e5e5e5)', color: 'var(--text-color, #333)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
              Played {topArtist.count} times
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LibraryContainer;
