import React, { useState } from 'react';
import './AllSongsList.css';
import { Play, Pause, Heart } from 'lucide-react';

const AllSongsList = ({ songs = [], onSongPlay, currentTrack, isPlaying, likedSongs = [], onLikeToggle }) => {
  const [visibleCount, setVisibleCount] = useState(25);

  const loadMore = (e) => {
    e.stopPropagation();
    setVisibleCount(prev => prev + 25);
  };

  // Fallback image helper
  const getSongImage = (song) => {
    if (song.img && !song.img.startsWith('images/')) {
      return song.img;
    }
    return `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop`;
  };

  return (
    <div className="all-songs-container">
      <h3 className="section-title">All Songs ({songs.length})</h3>
      <div className="all-songs-list">
        {songs.slice(0, visibleCount).map((song, idx) => {
          const isActive = currentTrack?.title === song.title;
          const isLiked = likedSongs.includes(song.title);
          
          return (
            <div 
              key={song.id || idx} 
              className={`song-row-item ${isActive ? 'active-row' : ''}`}
              onClick={() => onSongPlay(song)}
            >
              <img 
                src={getSongImage(song)} 
                alt={song.title} 
                className="song-row-img" 
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                }}
              />
              <div className="song-row-details">
                <div className="song-row-title">{song.title}</div>
                <div className="song-row-artist">{song.artist || song.singer || 'Unknown Artist'}</div>
              </div>
              <div className="song-row-actions">
                <button 
                  className={`song-row-btn ${isLiked ? 'liked' : ''}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onLikeToggle(song.title);
                  }}
                >
                  <Heart size={16} fill={isLiked ? "var(--card-orange)" : "none"} />
                </button>
                <div className="song-row-btn">
                  {isActive && isPlaying ? (
                    <Pause size={16} fill="currentColor" stroke="none" />
                  ) : (
                    <Play size={16} fill="currentColor" stroke="none" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount < songs.length && (
        <button className="load-more-btn" onClick={loadMore}>
          Load More Songs
        </button>
      )}
    </div>
  );
};

export default AllSongsList;
