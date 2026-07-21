import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PlaylistDetailView({
  setIsMelophileOpen,
  shuffleQueue,
  currentTrack,
  playSong,
  prefetchSong,
  getSongImage,
  isPlaying,
  triggerToast
}) {
  const songs = (window.defaultSongs || []).slice(0, 50);

  return (
    <div className="playlist-container">
      <div className="playlist-header">
        <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setIsMelophileOpen(false)}>
          <ArrowLeft size={22} />
        </button>
        <h3 className="playlist-header-title">Hello Melophile</h3>
      </div>

      <div className="playlist-banner">
        <div className="playlist-banner-overlay"></div>
        <div className="playlist-banner-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', position: 'relative', zIndex: 1 }}>
          <div>
            <span className="playlist-badge">PLAYLIST MIX</span>
            <h2 className="playlist-banner-title">Melophile's Vibe</h2>
            <p className="playlist-banner-desc">Curated Tamil melodies and popular hits to explore.</p>
          </div>
          <button
            onClick={() => shuffleQueue(songs)}
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
        </div>
      </div>

      <div className="playlist-tracklist-header">
        <span># TITLE & ARTIST</span>
        <span>ALBUM</span>
      </div>

      <div className="playlist-songs-list hide-scrollbar">
        {songs.map((song, idx) => (
          <div
            key={song.id || idx}
            className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
            tabIndex={0}
            onClick={() => playSong(song, idx, songs, { triggerToast })}
            onMouseEnter={() => prefetchSong(song)}
            onFocus={() => prefetchSong(song)}
          >
            <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
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
            <div className="playlist-song-info">
              <div className="playlist-song-title">{song.title}</div>
              <div className="playlist-song-artist">{song.artist}</div>
            </div>
            <div className="playlist-song-album">{song.movie || 'Single'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
