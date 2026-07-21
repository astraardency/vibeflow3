import React from 'react';
import { Search, Play, Pause } from 'lucide-react';

export default function SearchView({
  handleSearch,
  searchQuery,
  setSearchQuery,
  isSearching,
  isLoadingSaavnPlaylist,
  searchResults,
  searchPlaylistsResults,
  handlePlaylistCardClick,
  searchResultsParentRef,
  searchResultsVirtualizer,
  currentTrack,
  playSong,
  prefetchSong,
  isPlaying
}) {
  return (
    <div className="search-screen">
      <div className="search-header-container">
        <h2 className="search-title">Search</h2>
      </div>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <Search size={20} className="search-box-icon" />
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-redesign focusable"
            tabIndex={0}
          />
        </div>
      </form>

      {isSearching && (
        <div className="loading-spinner">Searching library...</div>
      )}

      {isLoadingSaavnPlaylist && (
        <div className="loading-spinner">Loading playlist...</div>
      )}

      {!isSearching && !isLoadingSaavnPlaylist && (
        <div className="search-results-list hide-scrollbar">
          {searchQuery.trim() === '' && searchResults.length === 0 ? (
            <div className="search-placeholder-center">
              <div className="search-big-icon-circle">
                <Search size={64} strokeWidth={1} color="#a0a0a0" />
              </div>
              <p className="search-placeholder-text">Search for songs or playlists</p>
            </div>
          ) : (
            <>
              {/* Playlists Search Results Section */}
              {searchPlaylistsResults.length > 0 && (
                <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                  <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                    Playlists
                  </h3>
                  <div className="search-playlists-horizontal hide-scrollbar" style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollBehavior: 'smooth'
                  }}>
                    {searchPlaylistsResults.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="search-playlist-card focusable"
                        tabIndex={0}
                        onClick={() => handlePlaylistCardClick(playlist.id)}
                        style={{
                          flex: '0 0 130px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                          <img
                            src={playlist.img}
                            alt={playlist.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            padding: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontSize: '9px', color: 'white', fontWeight: '750', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                              {playlist.songCount} songs
                            </span>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-color)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '0 2px'
                        }}>
                          {playlist.title}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '500',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '0 2px'
                        }}>
                          @{playlist.creator || 'Anonymous'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Derived Artists Section */}
              {(() => {
                const uniqueArtists = Array.from(new Set(searchResults.map(s => s.artist.split(',')[0].trim()).filter(Boolean))).slice(0, 6);
                if (uniqueArtists.length > 0 && searchQuery.trim() !== '') {
                  return (
                    <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                      <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                        Artists
                      </h3>
                      <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {uniqueArtists.map((artistName, idx) => {
                          const artistSong = searchResults.find(s => s.artist.includes(artistName));
                          return (
                            <div key={idx} onClick={() => setSearchQuery(artistName)} className="search-playlist-card focusable" style={{ flex: '0 0 100px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                              <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--card-border, #333)' }}>
                                <img src={artistSong?.img} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-color)', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {artistName}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                return null;
              })()}

              {/* Derived Movies Section */}
              {(() => {
                const uniqueAlbums = Array.from(new Set(searchResults.map(s => s.album).filter(Boolean))).slice(0, 6);
                if (uniqueAlbums.length > 0 && searchQuery.trim() !== '') {
                  return (
                    <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                      <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                        Movies & Albums
                      </h3>
                      <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {uniqueAlbums.map((albumName, idx) => {
                          const albumSong = searchResults.find(s => s.album === albumName);
                          return (
                            <div key={idx} onClick={() => setSearchQuery(albumName)} className="search-playlist-card focusable" style={{ flex: '0 0 130px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                                <img src={albumSong?.img} alt={albumName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {albumName}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
                return null;
              })()}

              {/* Songs Search Results Section */}
              <div ref={searchResultsParentRef} style={{ overflowY: 'auto', position: 'relative', height: '100%', minHeight: '300px' }}>
                <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                  {searchQuery.trim() === '' ? 'Trending Tamil Songs' : 'Songs'}
                </h3>
                <div style={{ height: `${searchResultsVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {searchResultsVirtualizer.getVirtualItems().map((virtualItem) => {
                    const index = virtualItem.index;
                    const song = searchResults[index];
                    return (
                      <div
                        key={song.id || index}
                        className={`search-result-item focusable ${currentTrack?.id === song.id ? 'active-track' : ''}`}
                        tabIndex={0}
                        onClick={() => playSong(song, index, searchResults)}
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
                        <img src={song.img} alt={song.title} className="search-result-img" loading="lazy" />
                        <div className="search-result-info">
                          <div className="search-result-title">{song.title}</div>
                          <div className="search-result-artist">{song.artist}</div>
                        </div>
                        <div className="search-play-icon">
                          {currentTrack?.id === song.id && isPlaying ? (
                            <Pause size={18} fill="currentColor" />
                          ) : (
                            <Play size={18} fill="currentColor" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
