import React from 'react';
import { SkipBack, Play, Pause, SkipForward, Heart, Download, Cast, Radio, Monitor, Maximize2 } from 'lucide-react';

export default function DesktopBottomPlayerBar({
  currentTrack,
  getSongImage,
  playPreviousSong,
  togglePlay,
  isPlaying,
  playNextSong,
  formatTime,
  currentTime,
  duration,
  setIsDraggingSlider,
  handleProgressChangeComplete,
  handleProgressChange,
  formatTimeRemaining,
  toggleLike,
  likedSongs,
  toggleDownload,
  downloadedSongs,
  setIsDeviceModalOpen,
  activeDeviceId,
  isLocalDeviceActive,
  setIsLiveConnectOpen,
  isLiveConnected,
  toggleMiniPlayer,
  setIsDesktopFullscreenOpen
}) {
  if (!currentTrack) return null;

  return (
    <div className="desktop-player-bar">
      <div className="d-player-left">
        <img
          src={getSongImage(currentTrack)}
          alt={currentTrack.title}
          className="d-player-img"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
          }}
        />
        <div className="d-player-info">
          <div className="d-player-title">{currentTrack.title}</div>
          <div className="d-player-artist">{currentTrack.artist}</div>
        </div>
      </div>
      <div className="d-player-center">
        <div className="d-player-controls">
          <button className="d-player-icon-btn focusable" tabIndex={0} onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()}>
            <SkipBack size={18} />
          </button>
          <button
            className="focusable"
            tabIndex={0}
            style={{ backgroundColor: 'white', color: 'black', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            onClick={togglePlay}
            onKeyDown={(e) => e.key === 'Enter' && togglePlay()}
          >
            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" style={{ marginLeft: '2px', marginTop: '1px' }} />}
          </button>
          <button className="d-player-icon-btn focusable" tabIndex={0} onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()}>
            <SkipForward size={18} />
          </button>
        </div>

        <div className="d-player-timeline">
          <span className="d-player-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onPointerDown={() => setIsDraggingSlider(true)}
            onPointerUp={handleProgressChangeComplete}
            onTouchStart={() => setIsDraggingSlider(true)}
            onTouchEnd={handleProgressChangeComplete}
            onChange={handleProgressChange}
            className="d-player-slider focusable"
            style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            tabIndex={0}
          />
          <span className="d-player-time">{formatTimeRemaining(currentTime, duration)}</span>
        </div>
      </div>

      <div className="d-player-right">
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={(e) => toggleLike(currentTrack.title, e)}>
          <Heart
            size={18}
            fill={likedSongs.includes(currentTrack.title) ? "#f3b1b1" : "none"}
            stroke={likedSongs.includes(currentTrack.title) ? "#f3b1b1" : "white"}
          />
        </button>
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={(e) => toggleDownload(currentTrack, e)}>
          <Download size={18} color={downloadedSongs.find(s => s.id === currentTrack.id || s.title === currentTrack.title) ? 'var(--card-orange)' : 'white'} />
        </button>
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsDeviceModalOpen(true)} title="Devices">
          <Cast size={18} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'inherit'} />
        </button>
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsLiveConnectOpen(true)} title="Live Connect" style={{ color: isLiveConnected ? 'var(--card-orange)' : 'inherit' }}>
          <Radio size={18} />
        </button>
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={toggleMiniPlayer} title="Widget">
          <Monitor size={18} />
        </button>
        <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsDesktopFullscreenOpen(true)} title="Fullscreen">
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
