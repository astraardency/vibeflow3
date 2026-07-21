import React from 'react';
import { ChevronDown, MoreVertical, Heart, SkipBack, Play, Pause, SkipForward, Download, Radio, Headphones, Volume1, Volume2, SlidersHorizontal, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

export default function NowPlayingSheet({
  isNowPlayingOpen,
  isNowPlayingClosing,
  currentTrack,
  getSongImage,
  closeNowPlaying,
  showUpNext,
  setShowUpNext,
  duration,
  currentTime,
  setIsDraggingSlider,
  handleProgressChangeComplete,
  handleProgressChange,
  formatTime,
  formatTimeRemaining,
  likedSongs,
  toggleLike,
  playPreviousSong,
  togglePlay,
  isPlaying,
  playNextSong,
  downloadedSongs,
  toggleDownload,
  isLiveConnected,
  setIsLiveConnectOpen,
  isEarPodsActive,
  setIsEarPodsActive,
  connectBluetooth,
  triggerToast,
  audioRef,
  gainNodeRef,
  handleVolumeChange,
  showEqModal,
  setShowEqModal,
  getUpcomingSongs,
  playSong,
  activePlaybackQueue,
  prefetchSong
}) {
  if (!isNowPlayingOpen || !currentTrack) return null;

  return (
    <div className={`now-playing-fullscreen ${isNowPlayingClosing ? 'player-slide-down' : 'player-slide-up'}`}>
      {/* Vibrant Background (Album Art Blurred and Darkened) */}
      <div
        className="np-bg-blur"
        style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}
      />
      <div className="np-bg-overlay-dark"></div>

      <div className="np-glass-card">
        {/* Top Bar inside Card for Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '10px' }}>
          <button
            className="focusable scale-on-click"
            tabIndex={0}
            onClick={closeNowPlaying}
            style={{ background: 'none', border: 'none', padding: '10px', marginLeft: '-15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronDown size={32} color="#ffffff" strokeWidth={2} />
          </button>
        </div>

        {/* Album Art Square */}
        <div className="np-album-art-container">
          <img
            src={getSongImage(currentTrack)}
            className="np-album-art-shadow"
            alt="shadow"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <img
            src={getSongImage(currentTrack)}
            alt={currentTrack.title}
            className="np-album-art-square"
            style={{ borderRadius: '16px' }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
            }}
          />
        </div>

        {/* Track Info Row */}
        <div className="np-track-info-row">
          <div className="np-track-text">
            <br></br>
            <div className="np-track-title">{currentTrack.title}</div>
            <div className="np-track-artist">{currentTrack.artist}</div>
          </div>
          <button className="np-icon-btn focusable scale-on-click" tabIndex={0} onClick={() => setShowUpNext(!showUpNext)}>
            <MoreVertical size={24} color={showUpNext ? 'var(--primary-color)' : '#ffffff'} strokeWidth={1.5} />
          </button>
        </div>

        {/* Linear Progress Container */}
        <div className="np-progress-container">
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
            className="np-linear-progress focusable"
            style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            tabIndex={0}
          />
          <div className="np-time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTimeRemaining(currentTime, duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="np-main-controls" style={{ width: '100%', justifyContent: 'space-between', gap: '0px', padding: '0 5px' }}>
          <button
            className={`np-control-arrow focusable scale-on-click ${likedSongs.includes(currentTrack.title) ? 'heartbeat' : ''}`}
            tabIndex={0}
            onClick={(e) => toggleLike(currentTrack.title, e)}
            style={{ padding: '8px' }}
          >
            <Heart size={26} fill={likedSongs.includes(currentTrack.title) ? "var(--primary-color)" : "transparent"} color={likedSongs.includes(currentTrack.title) ? "var(--primary-color)" : "#ffffff"} />
          </button>

          <button className="np-control-arrow focusable scale-on-click" tabIndex={0} onClick={playPreviousSong} style={{ padding: '8px' }}>
            <SkipBack size={36} color="#ffffff" strokeWidth={1.5} fill="#ffffff" />
          </button>

          <button className="np-play-pause-btn-outline focusable scale-on-click" tabIndex={0} onClick={togglePlay} style={{ padding: '8px' }}>
            {isPlaying ? <Pause size={56} color="#ffffff" strokeWidth={1.5} /> : <Play size={56} color="#ffffff" strokeWidth={1.5} />}
          </button>

          <button className="np-control-arrow focusable scale-on-click" tabIndex={0} onClick={playNextSong} style={{ padding: '8px' }}>
            <SkipForward size={36} color="#ffffff" strokeWidth={1.5} fill="#ffffff" />
          </button>

          <button
            className="np-control-arrow focusable scale-on-click"
            tabIndex={0}
            onClick={(e) => toggleDownload(currentTrack, e)}
            style={{ padding: '8px' }}
          >
            <Download size={26} color={downloadedSongs.find(s => s.id === currentTrack.id || s.title === currentTrack.title) ? "var(--card-orange)" : "#ffffff"} />
          </button>
        </div>

        {/* Connection Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
          <button
            className="np-icon-btn focusable scale-on-click"
            tabIndex={0}
            onClick={() => setIsLiveConnectOpen(true)}
            style={{
              background: isLiveConnected ? 'var(--card-orange)' : 'rgba(255, 255, 255, 0.1)',
              width: 'auto',
              padding: '8px 20px',
              borderRadius: '24px',
              display: 'flex',
              gap: '8px',
              color: '#ffffff'
            }}
          >
            <Radio size={18} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Live Connect</span>
          </button>

          <button
            className="np-earpods-btn focusable scale-on-click"
            tabIndex={0}
            onClick={() => {
              if (!isEarPodsActive) {
                connectBluetooth();
              } else {
                setIsEarPodsActive(false);
                triggerToast('Disconnected from EarPods');
              }
            }}
            style={{
              margin: '0',
              color: isEarPodsActive ? '#000' : 'white',
              background: isEarPodsActive ? 'white' : 'rgba(255, 255, 255, 0.1)',
              boxShadow: isEarPodsActive ? '0 0 15px rgba(255,255,255,0.5)' : 'none',
              animation: isEarPodsActive ? 'none' : 'pulse-glow 3s infinite alternate'
            }}
          >
            <Headphones size={16} color={isEarPodsActive ? '#000' : 'white'} />
            {isEarPodsActive ? 'EarPods Connected' : 'EarPods'}
          </button>
        </div>

        {/* Volume Control */}
        <div className="np-volume-row" style={{ marginTop: '15px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px' }}>
          <button className="scale-on-click" onClick={() => {
            if (audioRef.current) audioRef.current.volume = 0;
            if (Capacitor.isNativePlatform() && NativeAudio && NativeAudio.setVolume) {
              NativeAudio.setVolume({ volume: 0 });
            }
            const slider = document.getElementById('np-vol-slider');
            if (slider) slider.value = 0;
          }} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }}>
            <Volume1 size={20} color="var(--text-secondary)" />
          </button>
          <input
            id="np-vol-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            defaultValue="1"
            onChange={handleVolumeChange}
            className="np-volume-slider focusable"
            style={{ flex: 1, margin: '0 10px' }}
          />
          <button className="scale-on-click" onClick={() => {
            if (audioRef.current) audioRef.current.volume = 1;
            if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
            if (Capacitor.isNativePlatform() && NativeAudio && NativeAudio.setVolume) {
              NativeAudio.setVolume({ volume: 1 });
            }
            const slider = document.getElementById('np-vol-slider');
            if (slider) slider.value = 1;
          }} style={{ background: 'none', border: 'none' }}>
            <Volume2 size={16} color="var(--text-secondary)" />
          </button>
          <button className="scale-on-click" onClick={() => setShowEqModal(true)} style={{ background: 'none', border: 'none', marginLeft: '4px' }}>
            <SlidersHorizontal size={20} color={showEqModal ? 'var(--card-orange)' : 'var(--text-secondary)'} />
          </button>
        </div>

        {/* Up Next Overlay inside Glass Card */}
        {showUpNext && (
          <div className="np-queue-overlay player-slide-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Up Next</h3>
              <button onClick={() => setShowUpNext(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)' }}><X size={20} /></button>
            </div>
            {/* Show current track first, then upcoming */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              {/* Current track indicator */}
              {currentTrack && (
                <div style={{ padding: '6px 8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.5 }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Now Playing</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={getSongImage(currentTrack)} alt="current" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--card-orange)' }} />
                    <div>
                      <div style={{ color: 'var(--card-orange)', fontSize: '13px', fontWeight: '700' }}>{currentTrack.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{currentTrack.artist}</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Upcoming songs only */}
              <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', padding: '0 8px', textTransform: 'uppercase' }}>Up Next</div>
              {getUpcomingSongs().length === 0 ? (
                <div style={{ padding: '20px 8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>No more songs in queue</div>
              ) : (
                getUpcomingSongs().map(({ song, queueIndex }, i) => (
                  <div key={song.id || i} className="d-np-queue-item focusable" tabIndex={0} onClick={() => { playSong(song, queueIndex, activePlaybackQueue); setShowUpNext(false); }} onMouseEnter={() => prefetchSong(song)} onFocus={() => prefetchSong(song)}>
                    <img src={getSongImage(song)} alt="thumb" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    <div className="d-np-queue-text" style={{ flex: 1, marginLeft: '10px' }}>
                      <div className="d-np-queue-title" style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{song.title}</div>
                      <div className="d-np-queue-artist" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{song.artist}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
