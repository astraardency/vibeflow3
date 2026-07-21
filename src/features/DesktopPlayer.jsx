import React from 'react';
import { Minimize2, SkipBack, Play, Pause, SkipForward, Sparkles, Heart, Cast, Radio, SlidersHorizontal, Share2, Headphones } from 'lucide-react';

export default function DesktopPlayer({
  isDesktopFullscreenOpen,
  setIsDesktopFullscreenOpen,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  isShuffleMode,
  likedSongs,
  toggleLike,
  handleProgressChange,
  handleProgressChangeComplete,
  setIsDraggingSlider,
  toggleShuffleMode,
  playPreviousSong,
  togglePlay,
  playNextSong,
  setIsDeviceModalOpen,
  isLiveConnected,
  setIsLiveConnectOpen,
  showEqModal,
  setShowEqModal,
  handleShare,
  handleVolumeChange,
  getUpcomingSongs,
  playSong,
  activePlaybackQueue,
  prefetchSong,
  getSongImage,
  formatTime,
  formatTimeRemaining,
  activeDeviceId,
  isLocalDeviceActive
}) {
  if (!isDesktopFullscreenOpen || !currentTrack) return null;

  return (
    <div className="desktop-fullscreen-player fadeIn">
      {/* Blurred Background */}
      <div
        className="fullscreen-bg-blur"
        style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}
      />
      <div className="fullscreen-overlay" />

      {/* Header */}
      <div className="fullscreen-header">
        <div className="fullscreen-logo">
          <img src="/icon.png" alt="Logo" className="logo-icon" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
        </div>
        <button className="fullscreen-close-btn" onClick={() => setIsDesktopFullscreenOpen(false)} title="Close Fullscreen (Esc)">
          <Minimize2 size={24} />
        </button>
      </div>

      {/* Main Content Body */}
      <div className="fullscreen-body">
        {/* Left side: Album Art */}
        <div className="fullscreen-body-left">
          <div className="fullscreen-album-wrapper">
            <img
              src={getSongImage(currentTrack)}
              alt={currentTrack.title}
              className="fullscreen-album-img"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
              }}
            />
          </div>
        </div>

        {/* Right side: Controls & Queue */}
        <div className="fullscreen-body-right">
          <div className="fullscreen-glass-panel">
            <div className="fullscreen-track-details">
              <h1 className="fullscreen-title">{currentTrack.title}</h1>
              <p className="fullscreen-artist">{currentTrack.artist}</p>
            </div>

            {/* Timeline */}
            <div className="fullscreen-timeline-container">
              <div className="fullscreen-time-labels">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTimeRemaining(currentTime, duration)}</span>
              </div>
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
                className="fullscreen-timeline-slider"
                style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>

            {/* Playback Controls */}
            <div className="fullscreen-controls-container">
              {/* Primary Controls */}
              <div className="fullscreen-controls-primary">
                <button className="fullscreen-icon-btn" onClick={toggleShuffleMode}>
                  <Sparkles size={24} fill={isShuffleMode ? "var(--card-orange)" : "none"} color={isShuffleMode ? "var(--card-orange)" : "white"} />
                </button>

                <button className="fullscreen-icon-btn focusable" tabIndex={0} onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()}>
                  <SkipBack size={28} />
                </button>

                <button className="fullscreen-play-btn focusable" tabIndex={0} onClick={togglePlay} onKeyDown={(e) => e.key === 'Enter' && togglePlay()}>
                  {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: '4px' }} />}
                </button>

                <button className="fullscreen-icon-btn focusable" tabIndex={0} onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()}>
                  <SkipForward size={28} />
                </button>

                <button className={`fullscreen-icon-btn ${likedSongs.includes(currentTrack.title) ? 'heartbeat' : ''}`} onClick={(e) => toggleLike(currentTrack.title, e)}>
                  <Heart
                    size={24}
                    fill={likedSongs.includes(currentTrack.title) ? "#f5954a" : "none"}
                    stroke={likedSongs.includes(currentTrack.title) ? "#f5954a" : "white"}
                  />
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="fullscreen-controls-secondary">
                <button className="fullscreen-icon-btn" onClick={() => setIsDeviceModalOpen(true)}>
                  <Cast size={20} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'white'} />
                </button>

                <button className="fullscreen-icon-btn" onClick={() => setIsLiveConnectOpen(true)} title="Live Connect">
                  <Radio size={20} color={isLiveConnected ? 'var(--card-orange, #f5954a)' : 'white'} />
                </button>

                <button className="fullscreen-icon-btn" onClick={() => setShowEqModal(true)}>
                  <SlidersHorizontal size={20} color={showEqModal ? 'var(--card-orange)' : 'white'} />
                </button>

                <button className="fullscreen-icon-btn" onClick={(e) => handleShare(currentTrack, e)}>
                  <Share2 size={20} color="white" />
                </button>
              </div>
            </div>

            {/* Volume Row */}
            <div className="fullscreen-volume-row">
              <Headphones size={18} style={{ opacity: 0.6 }} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="1"
                onChange={handleVolumeChange}
                className="fullscreen-volume-slider"
                title="Volume"
              />
            </div>

            {/* Up Next Section */}
            <div className="fullscreen-queue-section">
              <div className="fullscreen-queue-header">UP NEXT</div>
              <div className="fullscreen-queue-list hide-scrollbar">
                {getUpcomingSongs().map(({ song, queueIndex }, idx) => (
                  <div key={song.id || idx} className="fullscreen-queue-item focusable" tabIndex={0} onClick={() => playSong(song, queueIndex, activePlaybackQueue)} onMouseEnter={() => prefetchSong(song)} onFocus={() => prefetchSong(song)}>
                    <img
                      src={getSongImage(song)}
                      alt={song.title}
                      className="fullscreen-queue-img"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
                      }}
                    />
                    <div className="fullscreen-queue-info">
                      <div className="fullscreen-queue-title">{song.title}</div>
                      <div className="fullscreen-queue-artist">{song.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
