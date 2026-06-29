import React from 'react';
import './Carousel.css';
import { Play, Pause } from 'lucide-react';

const SuggestedSongsList = ({ songs = [], onSongPlay, currentTrack, isPlaying, hasActivity }) => {
  // Fallback image if local path is broken
  const getSongImage = (song) => {
    if (song.img && !song.img.startsWith('images/')) {
      return song.img;
    }
    // Return a reliable music placeholder or artist-based search
    return `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop`;
  };

  return (
    <div className="carousel-container">
      <h3 className="section-title">
        {hasActivity ? "Based on Listening Activity" : "Suggested Songs"}
      </h3>
      <div className="carousel-scroll hide-scrollbar">
        {songs.map((song, idx) => {
          const isActive = currentTrack?.title === song.title;
          return (
            <div 
              key={song.id || idx} 
              className={`carousel-card song-card ${isActive ? 'active-suggested-card' : ''}`} 
              style={{ boxShadow: 'none', cursor: 'pointer' }} 
              onClick={() => onSongPlay(song, idx, songs)}
            >
              <div style={{ position: 'relative' }}>
                <img 
                  src={getSongImage(song)} 
                  alt={song.title} 
                  className="carousel-img" 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop';
                  }}
                />
                <div className="play-btn-overlay">
                  {isActive && isPlaying ? (
                    <Pause size={14} fill="white" stroke="none" />
                  ) : (
                    <Play size={14} fill="white" stroke="none" />
                  )}
                </div>
              </div>
              <div className="song-info">
                <div className="song-title" style={{ color: isActive ? 'var(--card-orange)' : 'inherit' }}>
                  {song.title}
                </div>
                <div className="song-artist">{song.artist || song.singer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedSongsList;
