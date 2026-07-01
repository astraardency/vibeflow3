import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePlayer } from './contexts/PlayerContext';
import { usePlaylists } from './contexts/PlaylistContext';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { Home, Search, Library, User, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import './TVApp.css';

export default function TVApp() {
  useSpatialNavigation();
  const { currentUser, isUserDataLoaded, likedSongs, listeningActivity, playsCount } = useAuth();
  const { 
    currentTrack, isPlaying, togglePlay, playNextSong, playPreviousSong, 
    currentTime, duration, playSong, activePlaybackQueue, prefetchSong
  } = usePlayer();
  const { playlists } = usePlaylists();
  
  const [activeTab, setActiveTab] = useState('home'); // home, search, library, account, player
  const [tvSessionId, setTvSessionId] = useState('');

  // TV QR Login Effect
  useEffect(() => {
    if (!currentUser && activeTab === 'account' && !tvSessionId) {
      setTvSessionId(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
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

  const renderAccount = () => {
    if (currentUser) {
      return (
        <div className="tv-main-content">
          <h2 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Your Account</h2>
          <p style={{ color: '#b3b3b3', fontSize: '1.2rem', marginBottom: '30px' }}>Manage your TV session profile</p>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '16px', 
            padding: '40px', 
            maxWidth: '600px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '30px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--card-orange, #f5954a), #e07a30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{currentUser.displayName || 'Vibeflow User'}</h3>
                <p style={{ color: '#b3b3b3', margin: '5px 0 0 0' }}>{currentUser.email || 'No email'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', color: 'var(--card-orange, #f5954a)' }}>{likedSongs?.length || 0}</span>
                <span style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Liked Songs</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', color: 'var(--card-orange, #f5954a)' }}>{playsCount || 0}</span>
                <span style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Total Plays</span>
              </div>
            </div>

            <button 
              className="tv-focusable tv-logout-btn" 
              tabIndex="0"
              onClick={handleLogout}
              onKeyDown={(e) => e.key === 'Enter' && handleLogout()}
              style={{
                width: '100%',
                padding: '15px',
                background: '#ff3b30',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
        <div className="tv-login-container" style={{ display: 'flex', gap: '60px', alignItems: 'center', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '24px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=vibeflow-auth-tv-login:${tvSessionId || 'loading'}`} 
              alt="Login QR Code" 
              width="250" 
              height="250" 
              style={{ borderRadius: '12px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: '800' }}>Link Your Account</h2>
            <p style={{ color: '#b3b3b3', fontSize: '1.2rem', marginBottom: '30px', lineHeight: '1.6' }}>
              Scan this QR code with the Vibeflow app on your mobile device to log in instantly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { num: '1', text: 'Open Vibeflow app on your phone' },
                { num: '2', text: 'Go to Settings > Devices' },
                { num: '3', text: 'Tap "Open Camera & Scan" and point at the QR code' }
              ].map(step => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: 'var(--card-orange, #f5954a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: 'white'
                  }}>{step.num}</div>
                  <p style={{ margin: 0, fontSize: '1.1rem', color: '#e0e0e0' }}>{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  
  // Format time for player
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const renderSidebar = () => (
    <div className="tv-sidebar" tabIndex="-1">
      <div 
        className="tv-nav-item tv-focusable" 
        tabIndex="0" 
        onClick={() => setActiveTab('home')}
        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('home')}
      >
        <Home />
        <span>Home</span>
      </div>
      <div 
        className="tv-nav-item tv-focusable" 
        tabIndex="0" 
        onClick={() => setActiveTab('search')}
        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('search')}
      >
        <Search />
        <span>Search</span>
      </div>
      <div 
        className="tv-nav-item tv-focusable" 
        tabIndex="0" 
        onClick={() => setActiveTab('library')}
        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('library')}
      >
        <Library />
        <span>Your Library</span>
      </div>
      <div 
        className="tv-nav-item tv-focusable" 
        tabIndex="0" 
        onClick={() => setActiveTab('account')}
        onKeyDown={(e) => e.key === 'Enter' && setActiveTab('account')}
      >
        <User />
        <span>Account</span>
      </div>
      {currentTrack && (
        <div 
          className="tv-nav-item tv-focusable" 
          tabIndex="0" 
          onClick={() => setActiveTab('player')}
          onKeyDown={(e) => e.key === 'Enter' && setActiveTab('player')}
          style={{ marginTop: 'auto', marginBottom: '20px', color: '#1db954' }}
        >
          <Play />
          <span>Now Playing</span>
        </div>
      )}
    </div>
  );

  const renderHome = () => {
    // Generate some mock recommendations if user data isn't fully robust
    const heroPlaylist = playlists[0];
    const madeForYou = playlists.slice(0, 5);
    const recent = listeningActivity.slice(0, 5);

    return (
      <div className="tv-main-content">
        {heroPlaylist && (
          <div className="tv-hero-section">
            <img src={heroPlaylist.img || heroPlaylist.image || '/assets/default_playlist.png'} alt="Hero" className="tv-hero-art" />
            <div className="tv-hero-info">
              <h1>{heroPlaylist.name}</h1>
              <p>{heroPlaylist.songs?.length || 0} songs • Featured Playlist</p>
            </div>
            <button 
              className="tv-focusable" 
              tabIndex="0"
              style={{ marginLeft: '40px', padding: '15px 40px', background: '#fff', color: '#000', borderRadius: '30px', border: 'none', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}
              onClick={() => playSong(heroPlaylist.songs[0], 0, heroPlaylist.songs)}
              onKeyDown={(e) => e.key === 'Enter' && playSong(heroPlaylist.songs[0], 0, heroPlaylist.songs)}
              onFocus={() => prefetchSong(heroPlaylist.songs[0])}
            >
              Play
            </button>
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
                onClick={() => playSong(pl.songs[0], 0, pl.songs)}
                onKeyDown={(e) => e.key === 'Enter' && playSong(pl.songs[0], 0, pl.songs)}
                onFocus={() => prefetchSong(pl.songs[0])}
              >
                <img src={pl.img || pl.image || '/assets/default_playlist.png'} alt={pl.name} />
                <h3>{pl.name}</h3>
                <p>Playlist</p>
              </div>
            ))}
          </div>
        </div>

        <div className="tv-row-container">
          <div className="tv-row-title">Recently Played</div>
          <div className="tv-row-scroll">
            {recent.map((song, idx) => (
              <div 
                key={idx} 
                className="tv-card tv-focusable" 
                tabIndex="0"
                onClick={() => playSong(song, idx, recent)}
                onKeyDown={(e) => e.key === 'Enter' && playSong(song, idx, recent)}
                onFocus={() => prefetchSong(song)}
              >
                <img src={song.img || song.image || '/assets/default_song.png'} alt={song.title} />
                <h3>{song.title}</h3>
                <p>{song.artist || song.subtitle}</p>
              </div>
            ))}
            {recent.length === 0 && <p style={{ color: '#b3b3b3' }}>Start listening on any device to see history here.</p>}
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
      {activeTab !== 'player' && renderSidebar()}
      {activeTab === 'home' && renderHome()}
      {activeTab === 'search' && <div className="tv-main-content"><h2>Search - Coming Soon</h2></div>}
      {activeTab === 'library' && <div className="tv-main-content"><h2>Library - Coming Soon</h2></div>}
      {activeTab === 'account' && renderAccount()}
      {activeTab === 'player' && renderPlayer()}
    </div>
  );
}
