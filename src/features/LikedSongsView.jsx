import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function LikedSongsView({
  setIsLikedSongsOpen,
  likedSongs,
  getLikedSongsList,
  shuffleQueue,
  currentTrack,
  playSong,
  triggerToast,
  getSongImage,
  isPlaying,
  toggleLike
}) {
  return (
    <div className="playlist-container">
      <div className="playlist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setIsLikedSongsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={22} />
        </button>
        <h3 className="playlist-header-title" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>Liked Songs</h3>
        <div style={{ width: '40px' }}></div> {/* Spacer to center title */}
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

      <div className="playlist-tracklist-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 15px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
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
              onClick={() => playSong(song, idx, getLikedSongsList(), { triggerToast })}
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
                  toggleLike(song.title, e)
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
