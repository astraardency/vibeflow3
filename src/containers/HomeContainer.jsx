import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Heart, ListMusic } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { usePlaylists } from '../contexts/PlaylistContext';
import { getSongImage, formatTime } from '../utils/playerUtils';
import HeroCard from '../components/HeroCard';
import SuggestedSongsList from '../components/SuggestedSongsList';
import MagicShuffle from '../components/MagicShuffle';
import defaultSongsRaw from '../data/songs.js';

const defaultSongs = defaultSongsRaw.filter(song => song.language?.toLowerCase() === 'tamil');

const HomeContainer = ({ 
  selectedArtist, 
  setSelectedArtist, 
  isMelophileOpen, 
  setIsMelophileOpen, 
  artistSongs, 
  isLoadingArtistSongs 
}) => {
  const { setActiveTab, triggerToast } = useAppContext();
  const { likedSongs, toggleLike, listeningActivity, savedPlaylistIds } = useAuth();
  const { currentTrack, isPlaying, playSong, activePlaybackQueue, setIsShuffleMode, setActivePlaybackQueue, setCurrentTrackIndex } = usePlayer();
  const { playlists, setSelectedPlaylist } = usePlaylists();

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
  };

  const getSuggestedSongs = () => {
    if (listeningActivity.length === 0) {
      return defaultSongs.slice(0, 15);
    }
    const combined = [...listeningActivity];
    defaultSongs.forEach(song => {
      if (!combined.some(s => s.title === song.title) && combined.length < 15) {
        combined.push(song);
      }
    });
    return combined;
  };

  if (selectedArtist) {
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

          <div className="artist-songs-list hide-scrollbar">
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
              artistSongs.map((song, index) => {
                const isActive = currentTrack?.title === song.title;
                return (
                  <div
                    key={song.id || index}
                    className={`artist-song-row focusable ${isActive ? 'active-row' : ''}`}
                    tabIndex={0}
                    onClick={() => playSong(song, index, artistSongs)}
                    onKeyDown={(e) => e.key === 'Enter' && playSong(song, index, artistSongs)}
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
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                    />
                    <div className="row-song-details">
                      <div className="row-song-title" style={{ color: isActive ? 'var(--card-orange)' : 'var(--text-color)' }}>{song.title}</div>
                      <div className="row-song-artist">{song.artist || selectedArtist.name}</div>
                    </div>
                    <button className="row-like-btn focusable" tabIndex={0} onClick={(e) => toggleLike(song.title, e, triggerToast)}>
                      <Heart size={16} fill={likedSongs.includes(song.title) ? "#f3b1b1" : "none"} stroke={likedSongs.includes(song.title) ? "#f3b1b1" : "#b0b0b0"} />
                    </button>
                    <span className="row-duration">{song.duration ? formatTime(song.duration) : ''}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isMelophileOpen) {
    return (
      <div className="playlist-container">
        <div className="playlist-header">
          <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setIsMelophileOpen(false)}>
            <ArrowLeft size={22} />
          </button>
          <h3 className="playlist-header-title">Hello Melophile</h3>
        </div>

        <div className="playlist-banner">
          <div className="playlist-banner-overlay"></div>
          <div className="playlist-banner-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', position: 'relative', zIndex: 1 }}>
            <div>
              <span className="playlist-badge">PLAYLIST MIX</span>
              <h2 className="playlist-banner-title">Melophile's Vibe</h2>
              <p className="playlist-banner-desc">Curated Tamil melodies and popular hits to explore.</p>
            </div>
            <button
              onClick={() => shuffleQueue(defaultSongs.slice(0, 50))}
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
          </div>
        </div>

        <div className="playlist-tracklist-header">
          <span># TITLE & ARTIST</span>
          <span>ALBUM</span>
        </div>

        <div className="playlist-songs-list hide-scrollbar">
          {defaultSongs.slice(0, 50).map((song, idx) => (
            <div
              key={song.id || idx}
              className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
              tabIndex={0}
              onClick={() => playSong(song, idx, defaultSongs.slice(0, 50))}
              onKeyDown={(e) => e.key === 'Enter' && playSong(song, idx, defaultSongs.slice(0, 50))}
            >
              <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
                <img src={getSongImage(song)} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }} />
                {currentTrack?.title === song.title && isPlaying && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                    <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                  </div>
                )}
              </div>
              <div className="playlist-song-info">
                <div className="playlist-song-title">{song.title}</div>
                <div className="playlist-song-artist">{song.artist}</div>
              </div>
              <div className="playlist-song-album">{song.movie || 'Single'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <HeroCard />
      <SuggestedSongsList
        songs={getSuggestedSongs()}
        onSongPlay={playSong}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        hasActivity={listeningActivity.length > 0}
      />

      {(listeningActivity.length > 0 || playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length > 0) && (
        <div className="carousel-container" style={{ marginTop: '0' }}>
          <h3 className="section-title">Latest Playlists</h3>
          <div className="carousel-scroll hide-scrollbar">
            {(() => {
              const recentlyPlayedPlaylists = [];
              const seenPlaylistIds = new Set();

              listeningActivity.forEach(song => {
                const matchingPlaylist = playlists.find(playlist =>
                  !playlist.hidden &&
                  !seenPlaylistIds.has(playlist.id || playlist.name) &&
                  playlist.songs?.some(s => s.title === song.title)
                );

                if (matchingPlaylist) {
                  recentlyPlayedPlaylists.push(matchingPlaylist);
                  seenPlaylistIds.add(matchingPlaylist.id || matchingPlaylist.name);
                }
              });

              const savedUserPlaylists = playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).reverse();
              const combinedPlaylists = [...savedUserPlaylists, ...recentlyPlayedPlaylists];
              
              const uniquePlaylists = [];
              const finalSeenIds = new Set();
              combinedPlaylists.forEach(p => {
                const id = p.id || p.name;
                if (!finalSeenIds.has(id)) {
                  uniquePlaylists.push(p);
                  finalSeenIds.add(id);
                }
              });

              let playlistsToShow = uniquePlaylists.slice(0, 8);

              return playlistsToShow.map((playlist, idx) => {
                const gradients = [
                  'linear-gradient(135deg, #f5954a 0%, #ff6b9d 100%)',
                  'linear-gradient(135deg, #00e5cc 0%, #007cf0 100%)',
                  'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                  'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                  'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                ];
                const grad = gradients[idx % gradients.length];
                const playlistImg = playlist.img || playlist.songs?.[0]?.img;

                return (
                  <div
                    key={playlist.id || idx}
                    className="carousel-card song-card focusable"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlaylist(playlist);
                      setActiveTab('create');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedPlaylist(playlist);
                        setActiveTab('create');
                      }
                    }}
                    style={{ boxShadow: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative' }}>
                      {playlistImg ? (
                        <img src={playlistImg} alt={playlist.name} className="carousel-img" />
                      ) : (
                        <div className="carousel-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: grad }}>
                          <ListMusic size={48} color="white" />
                        </div>
                      )}
                    </div>
                    <div className="song-info">
                      <div className="song-title">{playlist.name}</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      <MagicShuffle onAction={(msg) => {
        triggerToast(msg)
        const randomSong = defaultSongs[Math.floor(Math.random() * defaultSongs.length)]
        playSong(randomSong)
      }} />
    </>
  );
};

export default HomeContainer;
