const fs = require('fs');
let code = fs.readFileSync('e:/web/src/App.jsx', 'utf8');

const startToken = '{/* D. MOBILE SPECIFIC OVERLAYS */}';
const endToken = '{/* E. MOBILE FLOATING MINI PLAYER */}';

const startIndex = code.indexOf(startToken);
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{/* D. MOBILE SPECIFIC OVERLAYS */}
      {isNowPlayingOpen && currentTrack && (
        <div className={\`now-playing-fullscreen np-redesign-bg \${isNowPlayingClosing ? 'player-slide-down' : 'player-slide-up'}\`}>
          {/* Header */}
          <div className="np-redesign-header">
            <button className="np-redesign-close-btn scale-on-click focusable" tabIndex={0} onClick={closeNowPlaying}>
               <ChevronDown size={32} color="white" />
            </button>
            <div className="np-redesign-title-box">
              <div className="np-redesign-now-playing">Now Playing</div>
              <div className="np-redesign-playlist-name">{currentPlaylistName || "Tamil Songs 2000's to 2010"}</div>
            </div>
            <div style={{ width: 32 }}></div> {/* Spacer for centering */}
          </div>

          {/* Album Art */}
          <div className="np-redesign-art-container">
            <img 
              src={getSongImage(currentTrack)} 
              alt={currentTrack.title} 
              className="np-redesign-art" 
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
              }}
            />
          </div>

          {/* Track Info */}
          <div className="np-redesign-info-row">
            <div className="np-redesign-text">
              <div className="np-redesign-title">{currentTrack.title}</div>
              <div className="np-redesign-artist">{currentTrack.artist}</div>
            </div>
            <div className="np-redesign-actions">
              <button className="np-redesign-action-btn scale-on-click focusable" tabIndex={0} onClick={(e) => toggleDownload(currentTrack, e)}>
                <Download size={22} color={downloadedSongs.find(s => s.id === currentTrack.id || s.title === currentTrack.title) ? "var(--card-orange)" : "#000"} />
              </button>
              <button className="np-redesign-action-btn scale-on-click focusable" tabIndex={0} onClick={(e) => toggleLike(currentTrack.title, e)}>
                <Heart size={22} fill={likedSongs.includes(currentTrack.title) ? "#000" : "transparent"} color="#000" />
              </button>
            </div>
          </div>

          {/* Progress Container */}
          <div className="np-redesign-progress-container">
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
              className="np-redesign-slider focusable"
              style={{ '--progress': duration ? \`\${(currentTime / duration) * 100}%\` : '0%' }}
              tabIndex={0}
            />
            <div className="np-redesign-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 0)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="np-redesign-controls">
            <button className="np-redesign-circle-btn scale-on-click focusable" tabIndex={0} onClick={playPreviousSong}>
              <SkipBack size={24} color="white" fill="white" />
            </button>
            <button className="np-redesign-play-btn scale-on-click focusable" tabIndex={0} onClick={togglePlay}>
              {isPlaying ? <Pause size={36} color="#000" fill="#000" /> : <Play size={36} color="#000" fill="#000" />}
            </button>
            <button className="np-redesign-circle-btn scale-on-click focusable" tabIndex={0} onClick={playNextSong}>
              <SkipForward size={24} color="white" fill="white" />
            </button>
          </div>

          {/* Bottom Toolbar */}
          <div className="np-redesign-bottom-toolbar">
            <button className="np-redesign-toolbar-btn scale-on-click focusable" tabIndex={0} onClick={() => setShowUpNext(true)}>
              <ListMusic size={24} color="white" />
            </button>
            <button className="np-redesign-toolbar-btn scale-on-click focusable" tabIndex={0} onClick={() => triggerToast('Sleep timer not implemented')}>
              <Moon size={24} color="white" />
            </button>
            <button className="np-redesign-toolbar-btn scale-on-click focusable" tabIndex={0} onClick={() => triggerToast('Equalizer not implemented')}>
              <SlidersHorizontal size={24} color="white" />
            </button>
            <button className="np-redesign-toolbar-btn scale-on-click focusable" tabIndex={0} onClick={() => triggerToast('Shuffle toggled')}>
              <Shuffle size={24} color="white" />
            </button>
            <button className="np-redesign-toolbar-btn scale-on-click focusable" tabIndex={0} onClick={() => triggerToast('Repeat toggled')}>
              <Repeat size={24} color="white" />
            </button>
            <button className="np-redesign-toolbar-btn np-redesign-toolbar-btn-active scale-on-click focusable" tabIndex={0} onClick={() => triggerToast('More options')}>
              <MoreVertical size={24} color="#000" />
            </button>
          </div>

          {/* Up Next Overlay */}
          {showUpNext && (
            <div className="np-redesign-queue-overlay player-slide-up">
              {/* Queue Header Mini Player */}
              <div className="np-redesign-queue-mini">
                <img src={getSongImage(currentTrack)} alt="current" className="np-redesign-queue-mini-art" />
                <div className="np-redesign-queue-mini-info">
                  <div className="np-redesign-queue-mini-title">{currentTrack.title}</div>
                  <div className="np-redesign-queue-mini-artist">{currentTrack.artist}</div>
                </div>
                <div className="np-redesign-queue-mini-actions">
                  <button className="np-redesign-queue-icon-btn scale-on-click focusable" tabIndex={0} onClick={(e) => toggleLike(currentTrack.title, e)}>
                    <Heart size={24} fill={likedSongs.includes(currentTrack.title) ? "rgba(255,255,255,0.8)" : "transparent"} color="rgba(255,255,255,0.8)" />
                  </button>
                  <button className="np-redesign-queue-icon-btn scale-on-click focusable" tabIndex={0}><Lock size={24} color="rgba(255,255,255,0.8)" /></button>
                  <button className="np-redesign-queue-icon-btn scale-on-click focusable" tabIndex={0} onClick={() => setShowUpNext(false)}><MoreVertical size={24} color="rgba(255,255,255,0.8)" /></button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="np-redesign-queue-actions-row">
                <button className="np-redesign-queue-action-pill scale-on-click focusable" tabIndex={0}><Shuffle size={18} /> Shuffle</button>
                <button className="np-redesign-queue-action-pill scale-on-click focusable" tabIndex={0}><Repeat size={18} /> Repeat</button>
                <button className="np-redesign-queue-action-pill scale-on-click focusable" tabIndex={0}><Radio size={18} /> Radio</button>
              </div>

              {/* Continue Playing Header */}
              <div className="np-redesign-queue-section-header">
                <div>
                  <div className="np-redesign-queue-section-title">Continue Playing</div>
                  <div className="np-redesign-queue-section-subtitle">Next in Queue</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="np-redesign-queue-stats">{getUpcomingSongs().length + 1} songs</div>
                  <div className="np-redesign-queue-stats">
                    {formatTime(getUpcomingSongs().reduce((acc, curr) => acc + (parseInt(curr.duration) || 240), parseInt(currentTrack.duration) || 240))}
                  </div>
                </div>
              </div>

              {/* Queue List */}
              <div className="np-redesign-queue-list hide-scrollbar">
                {/* Current Song Highlighted */}
                {currentTrack && (
                  <div className="np-redesign-queue-item active">
                    <div className="np-redesign-queue-item-art-wrapper">
                      <img src={getSongImage(currentTrack)} alt="current" className="np-redesign-queue-item-art" />
                      <div className="np-redesign-queue-item-play-overlay"><Play size={16} fill="white" color="white" /></div>
                    </div>
                    <div className="np-redesign-queue-item-info">
                      <div className="np-redesign-queue-item-title">{currentTrack.title}</div>
                      <div className="np-redesign-queue-item-artist">{currentTrack.artist}</div>
                    </div>
                    <div className="np-redesign-queue-item-right">
                      <MoreVertical size={20} color="rgba(255,255,255,0.6)" />
                      <Equal size={20} color="rgba(255,255,255,0.6)" style={{marginLeft: '15px'}} />
                    </div>
                  </div>
                )}
                
                {/* Upcoming Songs */}
                {getUpcomingSongs().map((song, i) => {
                  const queueIndex = (currentTrackIndex + i + 1) % activePlaybackQueue.length;
                  return (
                    <div key={song.id || i} className="np-redesign-queue-item focusable" tabIndex={0} onClick={() => { playSong(song, queueIndex, activePlaybackQueue); setShowUpNext(false); }}>
                      <img src={getSongImage(song)} alt="thumb" className="np-redesign-queue-item-art" />
                      <div className="np-redesign-queue-item-info">
                        <div className="np-redesign-queue-item-title">{song.title}</div>
                        <div className="np-redesign-queue-item-artist">{song.artist}</div>
                      </div>
                      <div className="np-redesign-queue-item-right">
                        <MoreVertical size={20} color="rgba(255,255,255,0.6)" />
                        <Equal size={20} color="rgba(255,255,255,0.6)" style={{marginLeft: '15px'}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      `;
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('e:/web/src/App.jsx', code);
  console.log('Successfully replaced player markup');
} else {
  console.log('Failed to find tokens');
}
