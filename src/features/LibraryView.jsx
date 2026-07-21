import React from 'react';
import { Heart, ListMusic } from 'lucide-react';

export default function LibraryView({
  playlists,
  savedPlaylistIds,
  likedSongs,
  setShowCreateModal,
  setIsLikedSongsOpen,
  setSelectedPlaylist
}) {
  return (
    <div className="playlists-screen">
      <div className="playlists-header-container">
        <div>
          <h2 className="playlists-title">Your Library</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', fontWeight: '500' }}>Tamil music collection</p>
        </div>
      </div>

      {/* Hero Create Button */}
      <button className="create-playlist-btn focusable" tabIndex={0} onClick={() => setShowCreateModal(true)}>
        <span>NEW PLAYLIST</span>
      </button>

      {/* Stats Row */}
      <div className="library-stats-row">
        <div className="library-stat-pill">
          <span className="lib-stat-val">{playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length}</span>
          <span className="lib-stat-label">Playlists</span>
        </div>
        <div className="library-stat-divider"></div>
        <div className="library-stat-pill">
          <span className="lib-stat-val">{likedSongs.length}</span>
          <span className="lib-stat-label">Liked</span>
        </div>
        <div className="library-stat-divider"></div>
        <div className="library-stat-pill">
          <span className="lib-stat-val">{playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).reduce((acc, p) => acc + (p.songs?.length || 0), 0)}</span>
          <span className="lib-stat-label">Saved Songs</span>
        </div>
      </div>

      <h3 className="collection-title">Your Collection</h3>

      <div className="collection-grid">
        {/* Liked Songs Card */}
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

        {playlists
          .filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .map((playlist, pIdx) => {
            const gradients = [
              'linear-gradient(135deg, #f5954a 0%, #ff6b9d 100%)',
              'linear-gradient(135deg, #00e5cc 0%, #007cf0 100%)',
              'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
              'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
              'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
            ];
            const grad = gradients[pIdx % gradients.length];
            return (
              <div key={playlist.id} className="collection-card focusable" tabIndex={0} onClick={() => setSelectedPlaylist(playlist)}>
                <div className="collection-card-art" style={playlist.img ? { backgroundImage: `url("${playlist.img}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : { background: grad }}>
                  {!playlist.img && <ListMusic size={32} color="white" />}
                  <div className="collection-card-art-shine"></div>
                </div>
                <div className="collection-card-info">
                  <div className="collection-card-title">{playlist.name}</div>
                  <div className="collection-card-desc">{(playlist.songs?.length || 0)} songs • by @{playlist.creator || 'Anonymous'}</div>
                </div>
              </div>
            );
          })}

        {playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length === 0 && (
          <div className="empty-playlists-msg">
            <ListMusic size={28} color="var(--text-secondary)" />
            <p>No playlists yet.<br />Tap "New Playlist" to start.</p>
          </div>
        )}
      </div>
    </div>
  );
}
