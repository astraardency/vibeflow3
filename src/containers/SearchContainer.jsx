import React, { useState } from 'react';
import { Search, ArrowLeft, Play, Pause, Check } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { usePlaylists } from '../contexts/PlaylistContext';
import { searchSongs, getPlaylistDetails } from '../services/saavn';
import { getSongImage } from '../utils/playerUtils';

const SearchContainer = () => {
  const { triggerToast } = useAppContext();
  const { playlists, setPlaylists } = usePlaylists();
  const { currentTrack, isPlaying, playSong, setIsShuffleMode } = usePlayer();
  const { savedPlaylistIds, setSavedPlaylistIds } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPlaylistsResults, setSearchPlaylistsResults] = useState([]);
  
  const [selectedSaavnPlaylist, setSelectedSaavnPlaylist] = useState(null);
  const [isLoadingSaavnPlaylist, setIsLoadingSaavnPlaylist] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    const songs = await searchSongs(searchQuery, 100)

    const matchedPlaylists = playlists.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.hidden
    );

    const communityPlaylists = [...matchedPlaylists].map(p => ({
      ...p,
      title: p.name,
      songCount: p.songs?.length || 0
    }))

    const uniqueCommunityPlaylists = Array.from(new Map(communityPlaylists.map(item => [item.title, item])).values());

    setSearchResults(songs)
    setSearchPlaylistsResults(uniqueCommunityPlaylists)
    setIsSearching(false)
  }

  const handlePlaylistCardClick = async (playlistId) => {
    let communityPlaylist = playlists.find(p => p.id === playlistId);

    if (!communityPlaylist) {
      const staleRef = searchPlaylistsResults.find(p => p.id === playlistId);
      if (staleRef) {
        communityPlaylist = playlists.find(p => p.name === staleRef.title);
      }
    }

    if (communityPlaylist) {
      setSelectedSaavnPlaylist({
        id: communityPlaylist.id,
        title: communityPlaylist.name,
        img: communityPlaylist.img,
        description: `Created by ${communityPlaylist.creator}`,
        songs: communityPlaylist.songs || [],
        isCommunity: true,
        isHidden: communityPlaylist.hidden
      });
      return;
    }

    setIsLoadingSaavnPlaylist(true)
    try {
      const details = await getPlaylistDetails(playlistId)
      if (details) {
        setSelectedSaavnPlaylist(details)
      } else {
        triggerToast('Failed to load playlist details.')
      }
    } catch (error) {
      console.error(error)
      triggerToast('Error loading playlist details.')
    } finally {
      setIsLoadingSaavnPlaylist(false)
    }
  }

  const shuffleQueue = (queue) => {
    if (!queue || queue.length === 0) return
    const shuffled = [...queue]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setIsShuffleMode(true);
    playSong(shuffled[0], 0, shuffled)
    triggerToast('Shuffling tracks!')
  }

  if (selectedSaavnPlaylist) {
    return (
      <div className="playlist-container">
        <div className="playlist-header">
          <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setSelectedSaavnPlaylist(null)}>
            <ArrowLeft size={22} />
          </button>
          <h3 className="playlist-header-title">Playlist</h3>
        </div>

        <div className="playlist-banner" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end', padding: '20px 0', margin: '20px 0' }}>
          {selectedSaavnPlaylist.img && (
            <img
              src={selectedSaavnPlaylist.img}
              alt={selectedSaavnPlaylist.title}
              style={{ width: '180px', height: '180px', objectFit: 'cover', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
            />
          )}
          <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
            <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
              {selectedSaavnPlaylist.isCommunity ? 'COMMUNITY MIX' : 'SAAVN MIX'}
            </span>
            <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedSaavnPlaylist.title}</h2>
            <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{selectedSaavnPlaylist.description || `Created by ${selectedSaavnPlaylist.creator || 'Vibeflow Official'}`}</p>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {(() => {
                const isAlreadyAdded = playlists.some(p => p.name === selectedSaavnPlaylist.title && savedPlaylistIds.includes(p.id));
                return (
                  <button
                    onClick={() => {
                      if (isAlreadyAdded) {
                        triggerToast('Already in your playlists!');
                        return;
                      }

                      let existingPl = playlists.find(p => p.name === selectedSaavnPlaylist.title);
                      let targetId;

                      if (!existingPl) {
                        const newPl = {
                          id: selectedSaavnPlaylist.id || Date.now().toString(),
                          name: selectedSaavnPlaylist.title,
                          img: selectedSaavnPlaylist.img,
                          songs: selectedSaavnPlaylist.songs,
                          creator: selectedSaavnPlaylist.creator || localStorage.getItem('username') || 'Anonymous',
                          createdAt: Date.now()
                        };
                        targetId = newPl.id;
                        const updatedPlaylists = [...playlists, newPl];
                        setPlaylists(updatedPlaylists);
                        localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
                      } else {
                        targetId = existingPl.id;
                      }

                      const newSaved = [...new Set([...savedPlaylistIds, targetId])];
                      setSavedPlaylistIds(newSaved);
                      localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));

                      triggerToast(`Added "${selectedSaavnPlaylist.title}" to your playlists!`);
                    }}
                    className="focusable"
                    tabIndex={0}
                    style={{
                      background: isAlreadyAdded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                      border: isAlreadyAdded ? '1px solid rgba(255,255,255,0.3)' : '1px solid white',
                      color: isAlreadyAdded ? 'var(--text-secondary)' : 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: isAlreadyAdded ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isAlreadyAdded ? <><Check size={14} color="var(--text-secondary)" /> Added</> : "+ Add to Playlists"}
                  </button>
                );
              })()}
              
              {selectedSaavnPlaylist.songs.length > 0 && (
                <button
                  onClick={() => shuffleQueue(selectedSaavnPlaylist.songs)}
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
              )}
            </div>
          </div>
        </div>

        <div className="playlist-tracklist-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px', padding: '10px 15px' }}>
          <span># TITLE & ARTIST</span>
          <span>ALBUM</span>
        </div>

        <div className="playlist-songs-list hide-scrollbar">
          {selectedSaavnPlaylist.songs.length === 0 ? (
            <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No songs available in this playlist.
            </div>
          ) : (
            selectedSaavnPlaylist.songs.map((song, idx) => {
              const isActive = currentTrack?.id === song.id;
              return (
                <div
                  key={song.id || idx}
                  className={`playlist-song-item focusable ${isActive ? 'active-track' : ''}`}
                  tabIndex={0}
                  onClick={() => playSong(song, idx, selectedSaavnPlaylist.songs)}
                >
                  <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
                    <img
                      src={getSongImage(song)}
                      alt={song.title}
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                    />
                    {isActive && isPlaying && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                        <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                      </div>
                    )}
                  </div>
                  <div className="playlist-song-info">
                    <div className="playlist-song-title">{song.title}</div>
                    <div className="playlist-song-artist">{song.artist}</div>
                  </div>
                  <div className="playlist-song-album">{song.album || 'Single'}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

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
            <div className="search-default-view">
              <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                Community Playlists
              </h3>
              <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px', scrollBehavior: 'smooth' }}>
                {playlists.filter(p => !p.hidden).map((playlist) => (
                  <div
                    key={playlist.id}
                    className="search-playlist-card focusable"
                    tabIndex={0}
                    onClick={() => handlePlaylistCardClick(playlist.id)}
                    style={{ flex: '0 0 130px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                      <img
                        src={playlist.img || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'}
                        alt={playlist.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'; }}
                      />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
                      {playlist.name}
                    </div>
                  </div>
                ))}
              </div>
              <div className="search-placeholder-center" style={{ marginTop: '40px' }}>
                <div className="search-big-icon-circle">
                  <Search size={64} strokeWidth={1} color="#a0a0a0" />
                </div>
                <p className="search-placeholder-text">Search for songs or playlists</p>
              </div>
            </div>
          ) : (
            <>
              {/* Playlists Search Results Section */}
              {searchPlaylistsResults.length > 0 && (
                <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                  <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                    Playlists
                  </h3>
                  <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px', scrollBehavior: 'smooth' }}>
                    {searchPlaylistsResults.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="search-playlist-card focusable"
                        tabIndex={0}
                        onClick={() => handlePlaylistCardClick(playlist.id)}
                        style={{ flex: '0 0 130px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                          <img
                            src={playlist.img}
                            alt={playlist.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'; }}
                          />
                          <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', color: 'white', fontWeight: '750', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                              {playlist.songCount} songs
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 2px' }}>
                          {playlist.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Derived Artists Section */}
              {(() => {
                const uniqueArtists = Array.from(new Set(searchResults.map(s => s.artist?.split(',')[0].trim()).filter(Boolean))).slice(0, 6);
                if (uniqueArtists.length > 0 && searchQuery.trim() !== '') {
                  return (
                    <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                      <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>Artists</h3>
                      <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {uniqueArtists.map((artistName, idx) => {
                          const artistSong = searchResults.find(s => s.artist?.includes(artistName));
                          return (
                            <div key={idx} onClick={() => { setSearchQuery(artistName); handleSearch({ preventDefault: () => {} }); }} className="search-playlist-card focusable" style={{ flex: '0 0 100px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                              <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--card-border, #333)' }}>
                                <img src={artistSong?.img} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>Movies & Albums</h3>
                      <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {uniqueAlbums.map((albumName, idx) => {
                          const albumSong = searchResults.find(s => s.album === albumName);
                          return (
                            <div key={idx} onClick={() => { setSearchQuery(albumName); handleSearch({ preventDefault: () => {} }); }} className="search-playlist-card focusable" style={{ flex: '0 0 130px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                                <img src={albumSong?.img} alt={albumName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                {searchQuery.trim() === '' ? 'Trending Tamil Songs' : 'Songs'}
              </h3>
              {searchResults.map((song, index) => (
                <div
                  key={song.id || index}
                  className={`search-result-item focusable ${currentTrack?.id === song.id ? 'active-track' : ''}`}
                  tabIndex={0}
                  onClick={() => playSong(song, index, searchResults)}
                >
                  <img src={song.img} alt={song.title} className="search-result-img" />
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
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchContainer;
