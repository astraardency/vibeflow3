import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { arrayUnionUpdateUserDoc } from '../lib/firebaseUtils';

export default function SaavnPlaylistView({
  selectedSaavnPlaylist,
  setSelectedSaavnPlaylist,
  playlists,
  setPlaylists,
  savedPlaylistIds,
  setSavedPlaylistIds,
  triggerToast,
  currentUser,
  shuffleQueue,
  currentTrack,
  playSong,
  prefetchSong,
  getSongImage,
  isPlaying
}) {
  return (
    <div className="playlist-container">
      <div className="playlist-header">
        <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setSelectedSaavnPlaylist(null)}>
          <ArrowLeft size={22} />
        </button>
        <h3 className="playlist-header-title">Playlist</h3>
      </div>

      <div className="playlist-banner" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'flex-end',
        padding: '20px 0',
        margin: '20px 0',
      }}>
        {selectedSaavnPlaylist.img && (
          <img
            src={selectedSaavnPlaylist.img}
            alt={selectedSaavnPlaylist.title}
            style={{
              width: '180px',
              height: '180px',
              objectFit: 'cover',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
          />
        )}
        <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
          <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>{selectedSaavnPlaylist.isCommunity ? 'COMMUNITY MIX' : 'SAAVN MIX'}</span>
          <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedSaavnPlaylist.title}</h2>
          <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{selectedSaavnPlaylist.description || `Created by ${selectedSaavnPlaylist.creator || 'Vibeflow Official'}`}</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {(() => {
              const isAlreadyAdded = playlists.some(p => p.name === selectedSaavnPlaylist.title && savedPlaylistIds.includes(p.id));
              return (
                <button
                  onClick={() => {
                    if (isAlreadyAdded) {
                      triggerToast('Already in your playlists!');
                      return;
                    }

                    let existingPl = playlists.find(p => p.name === selectedSaavnPlaylist.title);
                    let targetId;

                    if (!existingPl) {
                      const newPl = {
                        id: selectedSaavnPlaylist.id || Date.now().toString(),
                        name: selectedSaavnPlaylist.title,
                        img: selectedSaavnPlaylist.img,
                        songs: selectedSaavnPlaylist.songs,
                        creator: selectedSaavnPlaylist.creator || currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : null) || localStorage.getItem('username') || 'Anonymous',
                        uid: currentUser?.uid || localStorage.getItem('tv_uid') || null,
                        createdAt: Date.now()
                      };
                      targetId = newPl.id;
                      const updatedPlaylists = [...playlists, newPl];
                      setPlaylists(updatedPlaylists);
                      localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
                    } else {
                      targetId = existingPl.id;
                    }

                    const newSaved = [...new Set([...savedPlaylistIds, targetId])];
                    setSavedPlaylistIds(newSaved);
                    localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));

                    // Sync to Firestore user doc using arrayUnion — safe for cross-device sync
                    if (currentUser?.uid) {
                      arrayUnionUpdateUserDoc(currentUser.uid, targetId);
                    }

                    triggerToast(`Added "${selectedSaavnPlaylist.title}" to your playlists!`);
                  }}
                  className="focusable"
                  tabIndex={0}
                  style={{
                    background: isAlreadyAdded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                    border: isAlreadyAdded ? '1px solid rgba(255,255,255,0.3)' : '1px solid white',
                    color: isAlreadyAdded ? 'var(--text-secondary)' : 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: isAlreadyAdded ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isAlreadyAdded ? (
                    <>
                      <Check size={14} color="var(--text-secondary)" /> Added
                    </>
                  ) : (
                    "+ Add to Playlists"
                  )}
                </button>
              );
            })()}
            {selectedSaavnPlaylist.songs.length > 0 && (
              <button
                onClick={() => shuffleQueue(selectedSaavnPlaylist.songs)}
                className="focusable"
                tabIndex={0}
                style={{
                  background: 'white',
                  border: 'none',
                  color: 'black',
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
      </div>

      <div className="playlist-tracklist-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px', padding: '10px 15px' }}>
        <span># TITLE & ARTIST</span>
        <span>ALBUM</span>
      </div>

      <div className="playlist-songs-list hide-scrollbar">
        {selectedSaavnPlaylist.songs.length === 0 ? (
          <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No songs available in this playlist.
          </div>
        ) : (
          selectedSaavnPlaylist.songs.map((song, idx) => {
            const isActive = currentTrack?.id === song.id;
            return (
              <div
                key={song.id || idx}
                className={`playlist-song-item focusable ${isActive ? 'active-track' : ''}`}
                tabIndex={0}
                onClick={() => playSong(song, idx, selectedSaavnPlaylist.songs, { triggerToast })}
              >
                <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
                  <img
                    src={getSongImage(song)}
                    alt={song.title}
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                  />
                  {isActive && isPlaying && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                    </div>
                  )}
                </div>
                <div className="playlist-song-info">
                  <div className="playlist-song-title">{song.title}</div>
                  <div className="playlist-song-artist">{song.artist}</div>
                </div>
                <div className="playlist-song-album">{song.album || 'Single'}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
