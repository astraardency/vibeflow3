const fs = require('fs');
const path = require('path');

const jsxContent = `import React, { useState, useEffect } from 'react';
import { Mail, User, Lock, ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import './AccountSettings.css';

const AccountSettings = ({ onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isLoginMode, setIsLoginMode] = useState(false);
  
  // Form States
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isCapacitor = Capacitor.isNativePlatform();

  // Settings Views
  const [currentView, setCurrentView] = useState('main'); // 'main', 'privacy', 'data_saving', 'media_quality', 'about'

  // Settings States
  const [followersFollowing, setFollowersFollowing] = useState(() => localStorage.getItem('pref_followers') !== 'false');
  const [playlistsVisible, setPlaylistsVisible] = useState(() => localStorage.getItem('pref_playlists_vis') !== 'false');
  
  const [dataSaverMode, setDataSaverMode] = useState(() => localStorage.getItem('pref_data_saver') || 'automatic'); // 'always_on', 'automatic', 'always_off'
  const [downloadsCellular, setDownloadsCellular] = useState(() => localStorage.getItem('pref_down_cellular') === 'true');
  const [audioOnlyDownloads, setAudioOnlyDownloads] = useState(() => localStorage.getItem('pref_audio_down') === 'true');
  const [audioOnlyStreaming, setAudioOnlyStreaming] = useState(() => localStorage.getItem('pref_audio_stream') === 'true');
  
  const [cellularStreamingQuality, setCellularStreamingQuality] = useState(() => localStorage.getItem('pref_cell_qual') || 'Automatic');
  const [autoAdjust, setAutoAdjust] = useState(() => localStorage.getItem('pref_auto_adj') !== 'false');
  const [audioDownloadQuality, setAudioDownloadQuality] = useState(() => localStorage.getItem('pref_down_qual') || 'Normal');
  const [wiFiStreamingQuality, setWiFiStreamingQuality] = useState(() => localStorage.getItem('pref_wifi_qual') || 'Automatic');

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('pref_followers', followersFollowing);
    localStorage.setItem('pref_playlists_vis', playlistsVisible);
    localStorage.setItem('pref_data_saver', dataSaverMode);
    localStorage.setItem('pref_down_cellular', downloadsCellular);
    localStorage.setItem('pref_audio_down', audioOnlyDownloads);
    localStorage.setItem('pref_audio_stream', audioOnlyStreaming);
    localStorage.setItem('pref_cell_qual', cellularStreamingQuality);
    localStorage.setItem('pref_auto_adj', autoAdjust);
    localStorage.setItem('pref_down_qual', audioDownloadQuality);
    localStorage.setItem('pref_wifi_qual', wiFiStreamingQuality);
  }, [followersFollowing, playlistsVisible, dataSaverMode, downloadsCellular, audioOnlyDownloads, audioOnlyStreaming, cellularStreamingQuality, autoAdjust, audioDownloadQuality, wiFiStreamingQuality]);

  const handleClearCache = () => {
    alert('Free up space by clearing your data. Cache cleared!');
  };

  const handleRemoveDownloads = () => {
    localStorage.removeItem('downloadedSongs');
    alert('Remove all the Spotify content you\\'ve downloaded. Downloads removed!');
  };

  const handleUpdateDownloads = () => {
    alert('Updating your existing downloads to the selected audio quality...');
  };

  const handleActivateJam = () => {
    alert('Activating Jam access with Bluetooth...');
  };

  useEffect(() => {
    if (isCapacitor) {
      GoogleAuth.initialize({
        clientId: '211660575500-b42uipe7fbma6fgtasitb7pqvl115s0q.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setUsername(user.displayName || user.email.split('@')[0]);
        setEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, [isCapacitor]);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
  }, [isLoggedIn, username, email]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        if (email.trim() && password.trim()) {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          setIsLoggedIn(true);
          setUsername(userCredential.user.displayName || email.split('@')[0]);
        }
      } else {
        if (username.trim() && email.trim() && password.trim() && password === confirmPassword) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCredential.user, { displayName: username });
          
          await setDoc(doc(db, "users", userCredential.user.uid), {
            id: userCredential.user.uid,
            username: username,
            email: email,
            preferences: {
              highQualityAudio: true,
              dataSaver: false,
              offlineMode: true
            },
            joinDate: new Date().toISOString()
          });

          setIsLoggedIn(true);
        } else if (password !== confirmPassword) {
          setAuthError("Passwords don't match!");
        }
      }
    } catch (error) {
      console.error("Auth Error:", error);
      let message = error.message;
      if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already registered.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setIsLoginMode(false);
      setCurrentView('main');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAuthError('');
  };

  const handleGoogleAuth = async () => {
    try {
      if (isCapacitor) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;
        
        await setDoc(doc(db, "users", user.uid), {
            id: user.uid,
            username: user.displayName || user.email.split('@')[0],
            email: user.email,
            preferences: {
              highQualityAudio: true,
              dataSaver: false,
              offlineMode: true
            },
            joinDate: new Date().toISOString()
        }, { merge: true });

        setIsLoggedIn(true);
        setUsername(user.displayName || user.email.split('@')[0]);
        setEmail(user.email);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        await setDoc(doc(db, "users", user.uid), {
            id: user.uid,
            username: user.displayName || user.email.split('@')[0],
            email: user.email,
            preferences: {
              highQualityAudio: true,
              dataSaver: false,
              offlineMode: true
            },
            joinDate: new Date().toISOString()
        }, { merge: true });

        setIsLoggedIn(true);
        setUsername(user.displayName || user.email.split('@')[0]);
        setEmail(user.email);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert(\`Failed to sign in with Google: \${error.message || "Please try again."}\`);
    }
  };

  const renderAuthView = () => (
    <div className="auth-content" style={{ padding: '40px 32px' }}>
      <div className="auth-header">
        <h2 className="auth-title">
          Sign in to Vibeflow TV
        </h2>
        <p className="auth-subtitle">
          Use your mobile app to scan the QR code and log in
        </p>
      </div>
      
      <div className="auth-qr-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '30px 0' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <img src={\`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=vibeflow-auth-tv-login\`} alt="Login QR Code" width="200" height="200" />
        </div>
        <p style={{ fontSize: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          1. Open the Vibeflow mobile app<br />
          2. Go to Settings &gt; Devices<br />
          3. Scan the QR code
        </p>
      </div>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <div className="auth-social-buttons" style={{ display: 'flex', justifyContent: 'center' }}>
        <button 
          className="social-btn google-btn focusable" 
          title="Google" 
          onClick={handleGoogleAuth} 
          type="button"
          tabIndex="0"
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleGoogleAuth()}
          style={{ width: '100%', maxWidth: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '12px' }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Sign in with Google</span>
        </button>
      </div>
    </div>
  );

  const ListItem = ({ icon, title, subtitle, onClick }) => (
    <div className="settings-list-item focusable" role="button" tabIndex="0" onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
      {icon && <div className="settings-item-icon">{icon}</div>}
      <div className="settings-item-text">
        <span className="settings-item-title">{title}</span>
        {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
      </div>
      <ChevronRight size={20} className="settings-item-arrow" />
    </div>
  );

  const ToggleItem = ({ title, subtitle, checked, onChange, customSliderClass }) => (
    <div className="settings-toggle-item focusable" role="button" tabIndex="0" onClick={() => onChange({ target: { checked: !checked } })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange({ target: { checked: !checked } }); } }}>
      <div className="settings-item-text">
        <span className="settings-item-title">{title}</span>
        {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
      </div>
      <label className="toggle-switch" style={{ pointerEvents: 'none' }}>
        <input type="checkbox" checked={checked} readOnly tabIndex="-1" />
        <span className={\`toggle-slider \${customSliderClass || ''}\`}></span>
      </label>
    </div>
  );

  const RadioItem = ({ title, subtitle, selected, onClick }) => (
    <div className="settings-radio-item focusable" role="button" tabIndex="0" onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
      <div className="settings-item-text">
        <span className="settings-item-title">{title}</span>
        {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
      </div>
      <div className={\`custom-radio \${selected ? 'selected' : ''}\`}>
        <div className="radio-inner"></div>
      </div>
    </div>
  );

  const renderMainView = () => (
    <div className="settings-scroll-view">
      <ListItem icon={<User size={24} />} title="Account" subtitle={\`\${username} • Close account\`} onClick={() => {}} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>d</div>} title="Content and display" subtitle="Canvas • Languages for music" onClick={() => {}} />
      <ListItem icon={<Lock size={24} />} title="Privacy and social" subtitle="Private session • Public playlists" onClick={() => setCurrentView('privacy')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔊</div>} title="Playback" subtitle="Gapless playback • Autoplay" onClick={() => {}} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>} title="Notifications" subtitle="Push • Email" onClick={() => {}} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📱</div>} title="Apps and devices" subtitle="Google Maps • Spotify Connect control" onClick={() => {}} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↓</div>} title="Data-saving and offline" subtitle="Data Saver mode • Downloads over cellular" onClick={() => setCurrentView('data_saving')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📶</div>} title="Media quality" subtitle="Wi-Fi streaming quality • Audio download quality" onClick={() => setCurrentView('media_quality')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📺</div>} title="Advertisements" subtitle="Tailored ads" onClick={() => {}} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>ℹ️</div>} title="About and support" subtitle="Version • Privacy Policy" onClick={() => setCurrentView('about')} />
      
      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <button className="settings-logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );

  const renderDataSavingView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title">Data Saver mode</h3>
      <p className="sub-section-desc">Choose if you'd like to optimise your data usage. "On" lowers streaming quality and disables other features that use a lot of data, like video previews.</p>
      
      <div className="radio-group">
        <RadioItem title="Always on" selected={dataSaverMode === 'always_on'} onClick={() => setDataSaverMode('always_on')} />
        <RadioItem title="Automatic" subtitle="Adjusts based on Android's Data Saver setting." selected={dataSaverMode === 'automatic'} onClick={() => setDataSaverMode('automatic')} />
        <RadioItem title="Always off" selected={dataSaverMode === 'always_off'} onClick={() => setDataSaverMode('always_off')} />
      </div>

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">Downloads and streaming</h3>
      <ToggleItem 
        title="Downloads over cellular" 
        subtitle="Downloads start or continue when you're not connected to Wi-Fi." 
        checked={downloadsCellular} 
        onChange={(e) => setDownloadsCellular(e.target.checked)} 
        customSliderClass="grey-slider"
      />
      <ToggleItem 
        title="Audio-only downloads for video podcasts" 
        subtitle="Only the audio will save when you download video podcast." 
        checked={audioOnlyDownloads} 
        onChange={(e) => setAudioOnlyDownloads(e.target.checked)} 
        customSliderClass="grey-slider"
      />
      <ToggleItem 
        title="Audio-only streaming for video podcasts" 
        subtitle="Video podcasts play as audio-only when you're not connected to Wi-Fi." 
        checked={audioOnlyStreaming} 
        onChange={(e) => setAudioOnlyStreaming(e.target.checked)} 
        customSliderClass="grey-slider"
      />
      <div className="info-text">
        <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
        Video is never streamed when the Spotify app is running in the background.
      </div>

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">Storage</h3>


      <div className="settings-action-item">
        <div className="action-item-text">
          <span className="action-title">Remove all downloads</span>
          <span className="action-subtitle">Remove all the Spotify content you've downloaded to free up space.</span>
        </div>
        <button className="action-btn" onClick={handleRemoveDownloads}>Remove</button>
      </div>

      <div className="settings-action-item">
        <div className="action-item-text">
          <span className="action-title">Clear cache</span>
          <span className="action-subtitle">Free up space by clearing your data. (Your downloads won't be removed.)</span>
        </div>
        <button className="action-btn" onClick={handleClearCache}>Clear</button>
      </div>
    </div>
  );

  const renderPrivacyView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Playlist privacy</h3>
      <p className="sub-section-desc">Change who can see your playlists. Private playlists are only visible to you and people you invite, while everyone can view public playlists.</p>
      
      <div className="settings-divider"></div>

      <h3 className="sub-section-title">Profile visibility</h3>
      <ToggleItem 
        title="Followers and following" 
        subtitle="On your profile, people can see who's following you and who you're following." 
        checked={followersFollowing} 
        onChange={(e) => setFollowersFollowing(e.target.checked)} 
      />
      <ToggleItem 
        title="Playlists" 
        subtitle="People can see the playlists you've added to your profile." 
        checked={playlistsVisible} 
        onChange={(e) => setPlaylistsVisible(e.target.checked)} 
      />
      <div className="settings-toggle-item">
        <div className="settings-item-text">
          <span className="settings-item-title">Blocked users</span>
          <span className="settings-item-subtitle">Manage who you've blocked from viewing your profile.</span>
        </div>
      </div>

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">Social features</h3>
      <div className="settings-action-item">
        <div className="action-item-text">
          <span className="action-title">Jam access with Bluetooth</span>
          <span className="action-subtitle">Use Bluetooth to connect to nearby devices and listen along with others.</span>
        </div>
        <button className="action-btn" onClick={handleActivateJam}>Activate</button>
      </div>
      
      <p className="info-text" style={{ marginTop: '30px', textDecoration: 'underline' }}>View more options on the Account Privacy page on the web</p>
    </div>
  );

  const renderMediaQualityView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Lossless</span>
        <span style={{ color: '#1ed760', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1ed760', display: 'inline-block' }}></div>
          Premium
        </span>
      </div>

      <h3 className="sub-section-title">Audio streaming quality</h3>
      <div className="info-text" style={{ marginBottom: '16px' }}>
        <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
        Quality changes on next track (unless a downloaded or higher-quality cached track is available).
      </div>

      <h4 className="sub-section-subtitle">Wi-Fi streaming quality</h4>
      <p className="sub-section-desc">Choose the quality of your audio streaming when you're connected to the internet.</p>
      
      <div className="radio-group" style={{ marginBottom: '24px' }}>
        <RadioItem title="Automatic" selected={wiFiStreamingQuality === 'Automatic'} onClick={() => setWiFiStreamingQuality('Automatic')} />
        <RadioItem title="Low" selected={wiFiStreamingQuality === 'Low'} onClick={() => setWiFiStreamingQuality('Low')} />
        <RadioItem title="Normal" selected={wiFiStreamingQuality === 'Normal'} onClick={() => setWiFiStreamingQuality('Normal')} />
        <RadioItem title="High" selected={wiFiStreamingQuality === 'High'} onClick={() => setWiFiStreamingQuality('High')} />
        <RadioItem title="Very high" selected={wiFiStreamingQuality === 'Very high'} onClick={() => setWiFiStreamingQuality('Very high')} />
      </div>

      <h4 className="sub-section-subtitle">Cellular streaming quality</h4>
      <p className="sub-section-desc">Choose the quality of your audio streaming when you're using mobile data.</p>
      
      <div className="radio-group" style={{ marginBottom: '24px' }}>
        <RadioItem title="Automatic" selected={cellularStreamingQuality === 'Automatic'} onClick={() => setCellularStreamingQuality('Automatic')} />
        <RadioItem title="Low" selected={cellularStreamingQuality === 'Low'} onClick={() => setCellularStreamingQuality('Low')} />
        <RadioItem title="Normal" selected={cellularStreamingQuality === 'Normal'} onClick={() => setCellularStreamingQuality('Normal')} />
        <RadioItem title="High" selected={cellularStreamingQuality === 'High'} onClick={() => setCellularStreamingQuality('High')} />
        <RadioItem title="Very high" selected={cellularStreamingQuality === 'Very high'} onClick={() => setCellularStreamingQuality('Very high')} />
      </div>

      <ToggleItem 
        title="Auto-adjust" 
        subtitle="Your Wi-Fi and cellular streaming quality adjust based on your network bandwidth." 
        checked={autoAdjust} 
        onChange={(e) => setAutoAdjust(e.target.checked)} 
      />

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">Download quality</h3>
      <div className="info-text" style={{ marginBottom: '16px' }}>
        <HelpCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
        Higher-quality downloads take up more space.
      </div>

      <h4 className="sub-section-subtitle">Audio download quality</h4>
      <p className="sub-section-desc">Choose the quality of all your audio downloads.</p>
      
      <div className="radio-group" style={{ marginBottom: '24px' }}>
        <RadioItem title="Automatic" selected={audioDownloadQuality === 'Automatic'} onClick={() => setAudioDownloadQuality('Automatic')} />
        <RadioItem title="Low" selected={audioDownloadQuality === 'Low'} onClick={() => setAudioDownloadQuality('Low')} />
        <RadioItem title="Normal" selected={audioDownloadQuality === 'Normal'} onClick={() => setAudioDownloadQuality('Normal')} />
        <RadioItem title="High" selected={audioDownloadQuality === 'High'} onClick={() => setAudioDownloadQuality('High')} />
        <RadioItem title="Very high" selected={audioDownloadQuality === 'Very high'} onClick={() => setAudioDownloadQuality('Very high')} />
      </div>

      <div className="settings-action-item">
        <div className="action-item-text">
          <span className="action-title" style={{ color: 'var(--text-secondary)' }}>Update existing downloads</span>
          <span className="action-subtitle">Update your existing downloads to the audio quality you've selected.</span>
        </div>
        <button className="action-btn" style={{ opacity: 0.5 }} onClick={handleUpdateDownloads}>Download</button>
      </div>
    </div>
  );

  const renderAboutView = () => (
    <div className="settings-scroll-view">
      <div className="settings-simple-item">
        <span>Version</span>
        <span className="simple-item-value">9.1.56.574</span>
      </div>
      <div className="settings-simple-item">
        <span>Player Release</span>
        <span className="simple-item-value">2</span>
      </div>
      
      <div className="settings-divider" style={{ margin: '8px 0' }}></div>
      
      <div className="settings-link-item">
        <span>Privacy Policy</span>
        <ExternalLink size={18} color="var(--text-secondary)" />
      </div>
      <div className="settings-link-item">
        <span>Third-party licences</span>
      </div>
      <div className="settings-link-item">
        <span>Terms of Use</span>
        <ExternalLink size={18} color="var(--text-secondary)" />
      </div>
      <div className="settings-link-item">
        <span>Platform Rules</span>
        <ExternalLink size={18} color="var(--text-secondary)" />
      </div>
      <div className="settings-link-item">
        <span>Support</span>
        <ExternalLink size={18} color="var(--text-secondary)" />
      </div>
    </div>
  );

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'data_saving': return 'Data-saving and offline';
      case 'privacy': return 'Privacy and social';
      case 'media_quality': return 'Media quality';
      case 'about': return 'About and support';
      default: return 'Settings';
    }
  };

  const handleBack = () => {
    if (currentView === 'main') {
      onClose();
    } else {
      setCurrentView('main');
    }
  };

  return (
    <div className="account-overlay" role="dialog" aria-modal="true">
      <div className="account-container modern-auth-container mobile-settings">
        <div className="mobile-header">
          <button className="mobile-icon-btn" onClick={handleBack} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>
          <h2 className="mobile-header-title">{getHeaderTitle()}</h2>
          {isLoggedIn && currentView === 'main' ? (
            <button className="mobile-icon-btn">
              <Search size={24} />
            </button>
          ) : (
            <div style={{ width: 24, height: 24, margin: 12 }}></div>
          )}
        </div>

        {!isLoggedIn ? renderAuthView() : (
          <>
            {currentView === 'main' && renderMainView()}
            {currentView === 'data_saving' && renderDataSavingView()}
            {currentView === 'privacy' && renderPrivacyView()}
            {currentView === 'media_quality' && renderMediaQualityView()}
            {currentView === 'about' && renderAboutView()}
          </>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
`;

fs.writeFileSync(path.join('e:\\\\web\\\\src\\\\components', 'AccountSettings.jsx'), jsxContent);
console.log('Done writing AccountSettings.jsx');
