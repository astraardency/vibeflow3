import React from 'react';
import { Play, Pause, SkipForward, Cast } from 'lucide-react';

export default function MiniPlayer({
  currentTrack,
  isNowPlayingOpen,
  isFloatingPlayer,
  setIsFloatingPlayer,
  floatingPos,
  setFloatingPos,
  dragRef,
  setIsNowPlayingOpen,
  getSongImage,
  preventClick,
  setPreventClick,
  handleFloatingTouchStart,
  handleFloatingTouchMove,
  handleFloatingTouchEnd,
  handleMiniPlayerTouchStart,
  handleMiniPlayerTouchEnd,
  handleMiniPlayerTouchMove,
  duration,
  currentTime,
  setIsDraggingSlider,
  handleProgressChangeComplete,
  handleProgressChange,
  activeDeviceId,
  isLocalDeviceActive,
  setIsDeviceModalOpen,
  isPlaying,
  togglePlay,
  playNextSong
}) {
  if (!currentTrack || isNowPlayingOpen) return null;

  return (
    <>
      {isFloatingPlayer ? (
        <div
          className={`floating-accessibility-player focusable`}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate3d(${floatingPos.x}px, ${floatingPos.y}px, 0)`,
            willChange: 'transform',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: 'grab',
            border: '2px solid rgba(255,255,255,0.8)'
          }}
          onTouchStart={handleFloatingTouchStart}
          onTouchMove={handleFloatingTouchMove}
          onTouchEnd={handleFloatingTouchEnd}
          onMouseDown={(e) => {
            dragRef.current = {
              isDragging: true,
              startX: e.clientX,
              startY: e.clientY,
              initialX: floatingPos.x,
              initialY: floatingPos.y
            };
            const handleMouseMove = (ev) => {
              const dx = ev.clientX - dragRef.current.startX;
              const dy = ev.clientY - dragRef.current.startY;
              setFloatingPos({ x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy });
            };
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              setTimeout(() => { dragRef.current.isDragging = false; }, 50);
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          onClick={(e) => {
            if (dragRef.current.isDragging) return;
            e.stopPropagation();
            setIsNowPlayingOpen(true);
            setIsFloatingPlayer(false);
          }}
        >
          <img src={getSongImage(currentTrack)} alt="mini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div
          className="mini-player focusable"
          tabIndex={0}
          onClick={(e) => {
            if (preventClick) {
              setPreventClick(false);
              return;
            }
            setIsNowPlayingOpen(true);
          }}
          onTouchStart={handleMiniPlayerTouchStart}
          onTouchEnd={handleMiniPlayerTouchEnd}
          onTouchMove={handleMiniPlayerTouchMove}
          onMouseDown={handleMiniPlayerTouchStart}
          onMouseUp={handleMiniPlayerTouchEnd}
          onMouseLeave={handleMiniPlayerTouchEnd}
          style={{ borderRadius: '16px', margin: '8px', bottom: '60px', width: 'calc(100% - 16px)' }}
        >
          {/* Glassy Background Effect */}
          <div className="mini-player-bg-blur" style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}></div>
          <div className="mini-player-overlay"></div>
          <div className="mini-player-progress-bar">
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
              onClick={(e) => e.stopPropagation()}
              className="mini-player-slider focusable"
              style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              tabIndex={0}
            />
          </div>
          <div className="mini-player-body">
            <img
              src={getSongImage(currentTrack)}
              alt={currentTrack.title}
              className="mini-player-img"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
              }}
            />
            <div className="mini-player-info">
              <div className="mini-player-title">{currentTrack.title}</div>
              <div className="mini-player-artist">{currentTrack.artist}</div>
            </div>
            <div className="mini-player-controls" onClick={(e) => e.stopPropagation()}>
              <button className="player-control-btn focusable" tabIndex={0} onClick={() => setIsDeviceModalOpen(true)}>
                <Cast size={20} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'currentColor'} />
              </button>
              <button className="player-control-btn focusable" tabIndex={0} onClick={togglePlay}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button
                className="player-control-btn focusable"
                tabIndex={0}
                onClick={playNextSong}
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
