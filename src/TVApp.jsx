import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePlayer } from './contexts/PlayerContext';
import { usePlaylists } from './contexts/PlaylistContext';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { Home, Search, Library, User, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { generateSecureToken } from './utils/cryptoUtils';
import { searchSongs, searchArtists, searchPlaylists } from './services/saavn';
import './TVApp.css';

export default function TVApp() {
  useSpatialNavigation();
  const { currentUser, isUserDataLoaded, likedSongs, listeningActivity = [], playsCount } = useAuth() || {};
  const { 
    currentTrack, isPlaying, togglePlay, playNextSong, playPreviousSong, 
    currentTime, duration, playSong, activePlaybackQueue, prefetchSong
  } = usePlayer() || {};
  const { playlists = [] } = usePlaylists() || {};
  
  const [activeTab, setActiveTab] = useState('home'); // home, search, library, account, player
  const [tvSessionId, setTvSessionId] = useState('');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // TV QR Login Effect
  useEffect(() => {
    if (!currentUser && activeTab === 'account' && !tvSessionId) {
      setTvSessionId(generateSecureToken(20));
    }
  }, [currentUser, activeTab, tvSessionId]);

  useEffect(() => {
    if (tvSessionId && !currentUser && activeTab === 'account') {
      const unsubscribe = onSnapshot(doc(db, "tv_logins", tvSessionId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.uid) {
            localStorage.setItem('tv_uid', data.uid);
            localStorage.setItem('username', data.username || '');
            localStorage.setItem('email', data.email || '');
            deleteDoc(docSnap.ref).catch(console.error);
            window.location.reload();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [tvSessionId, currentUser, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('tv_uid');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    window.location.reload();
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    
    setIsSearching(true);
    try {
      const [songs, artists, pl] = await Promise.all([
        searchSongs(query, 8),
        searchArtists(query, 5),
        searchPlaylists(query, 5)
      ]);
      setSearchResults({ songs, artists, playlists: pl });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  // Format time for player
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderTopNav = () => (
    <div className="tv-top-nav">
      {/* Left: Now Playing Widget */}
      {currentTrack ? (
        <div 
          className="tv-nav-now-playing tv-focusable" 
          tabIndex="0"
          onClick={() => setActiveTab('player')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('player')}
        >
          <img src={currentTrack.img || currentTrack.image || '/assets/default_song.png'} alt="Now Playing" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{currentTrack.title}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--tv-text-secondary)' }}>Now Playing</span>
          </div>
          <Play size={16} fill="white" />
        </div>
      ) : <div style={{ width: 150 }}></div> /* Placeholder to keep tabs centered */}

      {/* Center: Main Tabs */}
      <div className="tv-nav-tabs">
        <div 
          className={`tv-nav-tab tv-focusable ${activeTab === 'home' ? 'active' : ''}`}
          tabIndex="0"
          onClick={() => setActiveTab('home')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('home')}
        >
          <Home size={24} /> Home
        </div>
        <div 
          className={`tv-nav-tab tv-focusable ${activeTab === 'search' ? 'active' : ''}`}
          tabIndex="0"
          onClick={() => setActiveTab('search')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('search')}
        >
          <Search size={24} /> Search
        </div>
        <div 
          className={`tv-nav-tab tv-focusable ${activeTab === 'library' ? 'active' : ''}`}
          tabIndex="0"
          onClick={() => setActiveTab('library')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('library')}
        >
          <Library size={24} /> Your Library
        </div>
      </div>

      {/* Right: User Profile */}
      <div 
        className="tv-nav-user tv-focusable" 
        tabIndex="0"
        onClick={() => setActiveTab('account')}
        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('account')}
      >
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--tv-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
          {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
        </div>
        <span style={{ fontWeight: 'bold' }}>
          Welcome {currentUser ? (currentUser.displayName?.split(' ')[0] || 'User') : 'Guest'}
        </span>
      </div>
    </div>
  );

  const renderHome = () => {
    const heroPlaylist = playlists[0];
    const madeForYou = playlists.slice(0, 8);
    const recent = listeningActivity.slice(0, 8);
    
    // Fallback if playlists aren't loaded yet
    const bgImage = heroPlaylist?.img || heroPlaylist?.image || '';

    return (
      <>
        {bgImage && (
          <div className="tv-hero-background" style={{ backgroundImage: `url(${bgImage})` }} />
        )}
        <div className="tv-main-content">
          {heroPlaylist && (
            <div className="tv-hero-section">
              <div className="tv-hero-info">
                <h1>{heroPlaylist.name}</h1>
                <p>Playlist • {heroPlaylist.songs?.length || 0} songs</p>
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="tv-row-container">
              <div className="tv-row-title">Recently Played</div>
              <div className="tv-quick-picks-grid">
                {recent.slice(0, 8).map((song, idx) => (
                  <div 
                    key={idx} 
                    className="tv-horizontal-card tv-focusable"
                    tabIndex="0"
                    onClick={() => playSong(song, idx, recent)}
                    onKeyDown={(e) => e.key === 'Enter' && playSong(song, idx, recent)}
                  >
                    <img src={song.img || song.image || '/assets/default_song.png'} alt={song.title} />
                    <div className="tv-horizontal-card-info">
                      <h3>{song.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tv-row-container">
            <div className="tv-row-title">Made for you</div>
            <div className="tv-row-scroll">
              {madeForYou.map((pl, idx) => (
                <div 
                  key={idx} 
                  className="tv-card tv-focusable" 
                  tabIndex="0"
                  onClick={() => playSong(pl.songs?.[0], 0, pl.songs || [])}
                  onKeyDown={(e) => e.key === 'Enter' && playSong(pl.songs?.[0], 0, pl.songs || [])}
                >
                  <img src={pl.img || pl.image || '/assets/default_playlist.png'} alt={pl.name} />
                  <h3>{pl.name}</h3>
                  <p>Playlist</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderSearch = () => {
    return (
      <div className="tv-main-content">
        <div className="tv-search-container">
          <div className="tv-search-bar tv-focusable" tabIndex="0">
            <Search />
            <input 
              type="text" 
              placeholder="What do you want to listen to?" 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()} // Let user type without triggering spatial nav
            />
          </div>
        </div>

        {isSearching && <h2 style={{ textAlign: 'center', marginTop: '50px' }}>Searching...</h2>}

        {searchResults && !isSearching && (
          <>
            {searchResults.songs?.length > 0 && (
              <div className="tv-row-container">
                <div className="tv-row-title">Top Songs</div>
                <div className="tv-quick-picks-grid">
                  {searchResults.songs.map((song, idx) => (
                    <div 
                      key={idx} 
                      className="tv-horizontal-card tv-focusable"
                      tabIndex="0"
                      onClick={() => playSong(song, idx, searchResults.songs)}
                      onKeyDown={(e) => e.key === 'Enter' && playSong(song, idx, searchResults.songs)}
                    >
                      <img src={song.img || song.image || '/assets/default_song.png'} alt={song.title} />
                      <div className="tv-horizontal-card-info">
                        <h3>{song.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.artists?.length > 0 && (
              <div className="tv-row-container">
                <div className="tv-row-title">Artists</div>
                <div className="tv-row-scroll">
                  {searchResults.artists.map((artist, idx) => (
                    <div 
                      key={idx} 
                      className="tv-circular-card tv-focusable"
                      tabIndex="0"
                    >
                      <img src={artist.image || '/assets/default_artist.png'} alt={artist.name} />
                      <h3>{artist.name}</h3>
                      <p>Artist</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.playlists?.length > 0 && (
              <div className="tv-row-container">
                <div className="tv-row-title">Playlists</div>
                <div className="tv-row-scroll">
                  {searchResults.playlists.map((pl, idx) => (
                    <div 
                      key={idx} 
                      className="tv-card tv-focusable" 
                      tabIndex="0"
                    >
                      <img src={pl.image || '/assets/default_playlist.png'} alt={pl.name} />
                      <h3>{pl.name}</h3>
                      <p>Playlist</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderAccount = () => {
    if (currentUser) {
      return (
        <div className="tv-main-content">
          <h2 style={{ fontSize: '3rem', marginBottom: '10px' }}>Your Account</h2>
          <p style={{ color: 'var(--tv-text-secondary)', fontSize: '1.3rem', marginBottom: '30px' }}>Manage your TV session profile</p>
          
          <div className="tv-glass-panel" style={{ maxWidth: '600px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '30px' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--tv-accent), #e07a30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 'bold', color: 'white'
              }}>
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '2rem', margin: 0 }}>{currentUser.displayName || 'Vibeflow User'}</h3>
                <p style={{ color: 'var(--tv-text-secondary)', margin: '5px 0 0 0', fontSize: '1.1rem' }}>{currentUser.email || 'No email'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--tv-accent)' }}>{likedSongs?.length || 0}</span>
                <span style={{ fontSize: '1rem', color: 'var(--tv-text-secondary)' }}>Liked Songs</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--tv-accent)' }}>{playsCount || 0}</span>
                <span style={{ fontSize: '1rem', color: 'var(--tv-text-secondary)' }}>Total Plays</span>
              </div>
            </div>

            <button 
              className="tv-focusable tv-logout-btn" 
              tabIndex="0"
              onClick={handleLogout}
              onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
              style={{
                width: '100%', padding: '18px', background: '#ff3b30', color: 'white',
                border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.2rem',
                cursor: 'pointer', transition: 'var(--tv-transition-snappy)'
              }}
            >
              Log Out
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="tv-main-content" style={{ justifyContent: 'center' }}>
        <div className="tv-login-container" style={{ display: 'flex', gap: '60px', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ 
            background: 'white', padding: '20px', borderRadius: '24px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=vibeflow-auth-tv-login:${tvSessionId || 'loading'}`} 
              alt="Login QR Code" width="250" height="250" style={{ borderRadius: '12px' }}
            />
          </div>
          <div className="tv-glass-panel" style={{ flex: 1, padding: '50px' }}>
            <h2 style={{ fontSize: '3.5rem', marginBottom: '20px', fontWeight: '800' }}>Link Your Account</h2>
            <p style={{ color: 'var(--tv-text-secondary)', fontSize: '1.4rem', marginBottom: '40px', lineHeight: '1.6' }}>
              Scan this QR code with the Vibeflow app on your mobile device to log in instantly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {[
                { num: '1', text: 'Open Vibeflow app on your phone' },
                { num: '2', text: 'Go to Settings > Devices' },
                { num: '3', text: 'Tap "Open Camera & Scan" and point at the QR code' }
              ].map(step => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '50%', background: 'var(--tv-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '1.3rem', color: 'white',
                    boxShadow: '0 5px 15px var(--tv-accent-glow)'
                  }}>
                    {step.num}
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayer = () => {
    if (!currentTrack) return null;
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="tv-player-view">
        <button 
           className="tv-focusable" 
           tabIndex="0" 
           style={{ position: 'absolute', top: 40, left: 40, background: 'transparent', border: '2px solid transparent', color: '#fff', borderRadius: '50%', padding: '10px' }}
           onClick={() => setActiveTab('home')}
           onKeyDown={(e) => e.key === 'Enter' && setActiveTab('home')}
        >
          <Home />
        </button>
        <img src={currentTrack.img || currentTrack.image || '/assets/default_song.png'} alt="Cover" className="tv-player-art" />
        <div className="tv-player-info">
          <h2>{currentTrack.title}</h2>
          <p>{currentTrack.artist || currentTrack.subtitle}</p>
        </div>
        
        <div className="tv-player-progress-container">
          <span className="tv-player-time">{formatTime(currentTime)}</span>
          <div className="tv-player-bar-bg">
            <div className="tv-player-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <span className="tv-player-time">{formatTime(duration)}</span>
        </div>

        <div className="tv-player-controls">
          <button className="tv-control-btn tv-focusable" tabIndex="0"><Shuffle /></button>
          <button className="tv-control-btn tv-focusable" tabIndex="0" onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()}><SkipBack /></button>
          <button className="tv-control-btn play-pause tv-focusable" tabIndex="0" onClick={() => togglePlay()} onKeyDown={(e) => e.key === 'Enter' && togglePlay()}>
            {isPlaying ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" />}
          </button>
          <button className="tv-control-btn tv-focusable" tabIndex="0" onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()}><SkipForward /></button>
          <button className="tv-control-btn tv-focusable" tabIndex="0"><Repeat /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="tv-app-container">
      {activeTab !== 'player' && renderTopNav()}
      {activeTab === 'home' && renderHome()}
      {activeTab === 'search' && renderSearch()}
      {activeTab === 'library' && <div className="tv-main-content"><h2>Library - Coming Soon</h2></div>}
      {activeTab === 'account' && renderAccount()}
      {activeTab === 'player' && renderPlayer()}
    </div>
  );
}
