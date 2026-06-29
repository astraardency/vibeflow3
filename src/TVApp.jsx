import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { usePlayer } from './contexts/PlayerContext';
import { usePlaylists } from './contexts/PlaylistContext';
import { useSpatialNavigation } from './hooks/useSpatialNavigation';
import { Home, Search, Library, User, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat } from 'lucide-react';
import './TVApp.css';

export default function TVApp() {
  useSpatialNavigation();
  const { currentUser, isUserDataLoaded, likedSongs, listeningActivity, playsCount } = useAuth();
  const { 
    currentTrack, isPlaying, togglePlay, playNextSong, playPreviousSong, 
    currentTime, duration, playSong, activePlaybackQueue
  } = usePlayer();
  const { playlists } = usePlaylists();
  
  const [activeTab, setActiveTab] = useState('home'); // home, search, library, account, player
  
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
      {activeTab === 'account' && <div className="tv-main-content"><h2>Account - Coming Soon</h2></div>}
      {activeTab === 'player' && renderPlayer()}
    </div>
  );
}
