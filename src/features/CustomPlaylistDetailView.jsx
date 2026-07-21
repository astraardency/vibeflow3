import React from 'react';
import { ArrowLeft, Play, Check, Plus, ListMusic, Search } from 'lucide-react';

export default function CustomPlaylistDetailView({
  currentUser,
  selectedPlaylist,
  setSelectedPlaylist,
  setPlaylistSearchQuery,
  setPlaylistSearchResults,
  handleDeletePlaylist,
  setEditCoverImg,
  setShowEditCoverModal,
  shuffleQueue,
  savedPlaylistIds,
  setSavedPlaylistIds,
  triggerToast,
  currentTrack,
  playSong,
  getSongImage,
  isPlaying,
  removeSongFromPlaylist,
  handlePlaylistSearch,
  playlistSearchQuery,
  isSearchingPlaylistSongs,
  getSuggestedSongs,
  playlistSearchResults,
  addSongToPlaylist
}) {
  const username = currentUser?.displayName || localStorage.getItem('username') || '';
  const email = currentUser?.email || localStorage.getItem('email') || '';
  const emailName = email ? email.split('@')[0] : '';
  const uid = currentUser?.uid || localStorage.getItem('tv_uid') || null;
  const isCreator =
    (uid && selectedPlaylist.uid === uid) ||
    (username && selectedPlaylist.creator === username) ||
    (emailName && selectedPlaylist.creator === emailName);
  const isHost = email === 'astraardency@gmail.com';

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
        {(isCreator || isHost) && (
          <button
            className="playlist-delete-btn focusable"
            tabIndex={0}
            onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
          >
            Delete Playlist
          </button>
        )}
      </div>

      <div className="playlist-banner" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'flex-end',
        padding: '20px 0',
        margin: '20px 0',
      }}>
        <div style={{ position: 'relative', cursor: isCreator ? 'pointer' : 'default' }} onClick={() => {
          if (!isCreator) {
            triggerToast('Only the playlist creator can change the cover.');
            return;
          }
          setEditCoverImg(selectedPlaylist.img || '');
          setShowEditCoverModal(true);
        }}>
          {selectedPlaylist.img ? (
            <img
              src={selectedPlaylist.img}
              alt={selectedPlaylist.name}
              style={{
                width: '180px',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
              }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'; }}
            />
          ) : (
            <div style={{
              width: '180px',
              height: '180px',
              background: 'linear-gradient(135deg, var(--card-orange), var(--neon-cyan))',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}>
              <ListMusic size={64} color="white" />
            </div>
          )}
          {isCreator && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <span style={{ color: 'white', fontWeight: '600' }}>Change Cover</span>
            </div>
          )}
        </div>

        <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
          <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>COMMUNITY PLAYLIST</span>
          <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedPlaylist.name}</h2>
          <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{(selectedPlaylist.songs?.length || 0)} songs • Created by {selectedPlaylist.creator || 'Anonymous'}</p>

          {(selectedPlaylist.songs?.length || 0) > 0 && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => shuffleQueue(selectedPlaylist.songs || [])}
                className="focusable"
                tabIndex={0}
                style={{
                  background: 'var(--card-orange)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245, 149, 74, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Play size={16} fill="white" />
                Shuffle Play
              </button>

              {/* Add to Library button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const safeIds = savedPlaylistIds || [];
                  if (safeIds.includes(selectedPlaylist.id)) {
                    // Remove from library
                    const updatedSaved = safeIds.filter(pid => pid !== selectedPlaylist.id);
                    setSavedPlaylistIds(updatedSaved);
                    localStorage.setItem('savedPlaylistIds', JSON.stringify(updatedSaved));
                    triggerToast('Removed from your Library');
                  } else {
                    // Add to library
                    const newSaved = [...safeIds, selectedPlaylist.id];
                    setSavedPlaylistIds(newSaved);
                    localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));
                    triggerToast('Added to your Library');
                  }
                }}
                className="focusable"
                tabIndex={0}
                style={{
                  background: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'rgba(255,255,255,0.1)' : 'var(--neon-cyan)',
                  border: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? '1px solid rgba(255,255,255,0.2)' : 'none',
                  color: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'var(--text-color)' : '#000',
                  padding: '10px 20px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'none' : '0 4px 14px rgba(0, 229, 204, 0.4)'
                }}
              >
                {(savedPlaylistIds || []).includes(selectedPlaylist.id) ? (
                  <>
                    <Check size={16} color="var(--text-color)" />
                    Saved
                  </>
                ) : (
                  <>
                    <Plus size={16} color="#000" />
                    Add to Library
                  </>
                )}
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
        {(selectedPlaylist.songs?.length || 0) === 0 ? (
          <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
            No songs in this playlist yet. Add songs below!
          </div>
        ) : (
          (selectedPlaylist.songs || []).map((song, idx) => (
            <div
              key={song.id || idx}
              className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
              tabIndex={0}
              onClick={() => playSong(song, idx, (selectedPlaylist.songs || []), { triggerToast })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}
            >
              <div className="playlist-song-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="playlist-song-img-container" style={{ position: 'relative' }}>
                  <img
                    src={getSongImage(song)}
                    alt={song.title}
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                  />
                  {currentTrack?.title === song.title && isPlaying && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                      <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="playlist-song-title">{song.title}</div>
                  <div className="playlist-song-artist">{song.artist}</div>
                </div>
              </div>
              {isCreator && (
                <button
                  className="remove-song-btn focusable"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSongFromPlaylist(selectedPlaylist.id, song.id)
                  }}
                  style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '5px', fontSize: '12px' }}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Songs Section */}
      {isCreator && (
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

          {isSearchingPlaylistSongs && (
            <div className="loading-spinner" style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Searching library...</div>
          )}

          <div className="playlist-search-results hide-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {playlistSearchQuery.trim() === '' && !isSearchingPlaylistSongs && <div style={{ padding: '0 10px 10px 10px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Suggested Songs</div>}
            {(playlistSearchQuery.trim() === '' ? getSuggestedSongs() : playlistSearchResults).map((song) => {
              const isAdded = (selectedPlaylist.songs || []).some(s => s.id === song.id || s.title === song.title)
              return (
                <div key={song.id} className="search-result-item focusable" tabIndex={0} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', marginBottom: '8px', background: 'var(--card-bg)' }}>
                  <img src={song.img} alt={song.title} className="search-result-img" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} loading="lazy" />
                  <div className="search-result-info" style={{ flex: 1, marginLeft: '10px', overflow: 'hidden' }}>
                    <div className="search-result-title" style={{ fontSize: '14px', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                    <div className="search-result-artist" style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAdded) {
                        addSongToPlaylist(selectedPlaylist.id, song)
                      }
                    }}
                    className="focusable"
                    tabIndex={0}
                    style={{
                      background: isAdded ? 'transparent' : 'var(--card-orange)',
                      border: isAdded ? '1px solid rgba(0,0,0,0.1)' : 'none',
                      color: isAdded ? 'var(--text-color)' : 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      cursor: isAdded ? 'default' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
