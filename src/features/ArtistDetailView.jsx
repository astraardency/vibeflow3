import React from 'react';
import { ArrowLeft, Search, Heart } from 'lucide-react';

export default function ArtistDetailView({
  selectedArtist,
  setSelectedArtist,
  setActiveTab,
  artistSongs,
  shuffleQueue,
  isLoadingArtistSongs,
  artistSongsParentRef,
  artistSongsVirtualizer,
  currentTrack,
  playSong,
  prefetchSong,
  isPlaying,
  getSongImage,
  toggleLike,
  likedSongs,
  formatTime
}) {
  return (
    <div className="artist-detail-view">
      <div className="artist-detail-banner" style={{ backgroundImage: `url(${selectedArtist.img})` }}>
        <div className="artist-banner-overlay"></div>
        <button className="artist-back-btn focusable" tabIndex={0} onClick={() => setSelectedArtist(null)}>
          <ArrowLeft size={22} color="white" />
        </button>
        <button className="artist-search-btn focusable" tabIndex={0} onClick={() => setActiveTab('search')}>
          <Search size={22} color="white" />
        </button>
        <h1 className="artist-banner-name">{selectedArtist.name}</h1>
      </div>

      <div className="artist-songs-sheet">
        <div className="drag-handle-bar"></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 className="artist-sheet-title" style={{ margin: 0 }}>Songs</h3>
            {artistSongs.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{artistSongs.length} tracks</span>
            )}
          </div>
          {artistSongs.length > 0 && (
            <button
              onClick={() => shuffleQueue(artistSongs)}
              className="focusable"
              tabIndex={0}
              style={{
                background: 'linear-gradient(135deg, var(--card-orange) 0%, #ff6b9d 100%)',
                border: 'none',
                color: 'white',
                padding: '9px 18px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(245, 149, 74, 0.4)',
                letterSpacing: '0.3px'
              }}
            >
              ▶ Shuffle Play
            </button>
          )}
        </div>

        <div 
          className="artist-songs-list hide-scrollbar" 
          ref={artistSongsParentRef}
          style={{ overflowY: 'auto', position: 'relative', height: '100%' }}
        >
          {isLoadingArtistSongs ? (
            <div className="artist-loading-state">
              <div className="artist-loading-bars">
                <span></span><span></span><span></span><span></span><span></span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '12px' }}>Loading songs...</p>
            </div>
          ) : artistSongs.length === 0 ? (
            <div className="artist-loading-state">
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No songs found for this artist.</p>
            </div>
          ) : (
            <div style={{ height: `${artistSongsVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
              {artistSongsVirtualizer.getVirtualItems().map((virtualItem) => {
                const index = virtualItem.index;
                const song = artistSongs[index];
                const isActive = currentTrack?.title === song.title;
                return (
                  <div
                    key={song.id || index}
                    className={`artist-song-row focusable ${isActive ? 'active-row' : ''}`}
                    tabIndex={0}
                    onClick={() => playSong(song, index, artistSongs)}
                    onKeyDown={(e) => e.key === 'Enter' && playSong(song, index, artistSongs)}
                    onMouseEnter={() => prefetchSong(song)}
                    onFocus={() => prefetchSong(song)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <div className="row-index">
                      {isActive && isPlaying ? (
                        <div className="row-playing-bars">
                          <span></span><span></span><span></span>
                        </div>
                      ) : (
                        <span className="row-index-num">{index + 1}</span>
                      )}
                    </div>
                    <img
                      src={song.img || getSongImage(song)}
                      alt={song.title}
                      className="row-song-img"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                      }}
                    />
                    <div className="row-song-details">
                      <div className="row-song-title" style={{ color: isActive ? 'var(--card-orange)' : 'var(--text-color)' }}>{song.title}</div>
                      <div className="row-song-artist">{song.artist || selectedArtist.name}</div>
                    </div>
                    <button className="row-like-btn focusable" tabIndex={0} onClick={(e) => toggleLike(song.title, e)}>
                      <Heart
                        size={16}
                        fill={likedSongs.includes(song.title) ? "#f3b1b1" : "none"}
                        stroke={likedSongs.includes(song.title) ? "#f3b1b1" : "#b0b0b0"}
                      />
                    </button>
                    <span className="row-duration">{song.duration ? formatTime(song.duration) : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
