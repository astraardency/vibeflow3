import React, { useState, useEffect } from 'react';
import { Mail, User, Lock, ArrowLeft, Search, ChevronRight, ExternalLink, HelpCircle, Monitor, Camera } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './AccountSettings.css';

// Import sub-components
import { ListItem } from './settings/SettingsShared';
import { DataSaverSettings } from './settings/DataSaverSettings';
import { PrivacySettings } from './settings/PrivacySettings';
import { MediaQualitySettings } from './settings/MediaQualitySettings';
import { HostDashboard } from './settings/HostDashboard';
import { DevicesSettings } from './settings/DevicesSettings';

const AccountSettings = ({ onClose }) => {
  const {
    isLoggedIn, username, email, isLoading, authError,
    tvSessionId, isCapacitor, loginWithEmail, registerWithEmail,
    handleGoogleAuth, handleLogout
  } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Form States
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Settings Views
  const [currentView, setCurrentView] = useState('main'); // 'main', 'privacy', 'data_saving', 'media_quality', 'about', 'host_dashboard', 'devices'
  
  // Host Dashboard States
  const [hostPlaylists, setHostPlaylists] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [showHostLoginModal, setShowHostLoginModal] = useState(false);

  // Settings States
  const [followersFollowing, setFollowersFollowing] = useState(() => localStorage.getItem('pref_followers') !== 'false');
  const [playlistsVisible, setPlaylistsVisible] = useState(() => localStorage.getItem('pref_playlists_vis') !== 'false');

  const [dataSaverMode, setDataSaverMode] = useState(() => localStorage.getItem('pref_data_saver') || 'automatic');
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
    alert("Remove all the songs content you've downloaded. Downloads removed!");
  };

  const handleUpdateDownloads = () => {
    alert('Updating your existing downloads to the selected audio quality...');
  };

  const handleActivateJam = () => {
    alert('Activating Jam access with Bluetooth...');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (isLoginMode) {
      if (emailInput.trim() && passwordInput.trim()) {
        await loginWithEmail(emailInput, passwordInput);
      }
    } else {
      if (usernameInput.trim() && emailInput.trim() && passwordInput.trim() && passwordInput === confirmPassword) {
        await registerWithEmail(usernameInput, emailInput, passwordInput);
      } else if (passwordInput !== confirmPassword) {
        alert("Passwords don't match!");
      }
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setUsernameInput('');
    setEmailInput('');
    setPasswordInput('');
    setConfirmPassword('');
  };

  const handleDevicesClick = () => {
    if (isCapacitor) {
      setCurrentView('devices');
    } else {
      try {
        navigator.bluetooth?.requestDevice({ acceptAllDevices: true })
          .then(device => alert(`Selected device: ${device.name || 'Unknown Device'}`))
          .catch(err => { console.error(err); alert("Bluetooth connection cancelled or not supported."); });
      } catch (error) {
        console.error(error);
        alert("Bluetooth not supported on this device.");
      }
    }
  };

  const handleHostDashboardClick = () => {
    setShowHostLoginModal(true);
  };

  const renderAuthView = () => (
    <div className="auth-content modern-auth">
      <div className="auth-bg-blob blob-1"></div>
      <div className="auth-bg-blob blob-2"></div>
      <div className="auth-bg-overlay"></div>

      <div className="auth-inner-content">
        <div className="auth-header glass-panel">
          <div className="auth-logo-container">
            <img src="/logo.png" alt="Vibeflow Logo" className="auth-logo-img" />
          </div>
          <h2 className="auth-title gradient-text">
            {isCapacitor ? "Welcome to Vibeflow" : "Vibeflow TV"}
          </h2>
          <p className="auth-subtitle">
            {isCapacitor
              ? "Your ultimate music experience awaits."
              : "Use your mobile app to scan the QR code and log in"}
          </p>
        </div>

        {!isCapacitor && (
          <div className="auth-qr-container glass-panel">
            <div className="qr-code-wrapper">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=vibeflow-auth-tv-login:${tvSessionId || 'loading'}`} alt="Login QR Code" width="180" height="180" />
            </div>
            <div className="qr-instructions">
              <div className="qr-step"><span>1</span> Open Vibeflow mobile app</div>
              <div className="qr-step"><span>2</span> Go to Settings &gt; Devices</div>
              <div className="qr-step"><span>3</span> Scan the QR code above</div>
            </div>
            <div className="auth-divider"><span>or</span></div>
          </div>
        )}

        <div className="auth-actions glass-panel">
          <button
            className="premium-google-btn focusable"
            title="Continue with Google"
            onClick={handleGoogleAuth}
            type="button"
            tabIndex="0"
            disabled={isLoading}
            onKeyDown={(e) => !isLoading && (e.key === 'Enter' || e.key === ' ') && handleGoogleAuth()}
          >
            <div className="btn-glow"></div>
            <span className="btn-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z" />
              </svg>
            </span>
            <span className="btn-text">Continue with Google</span>
          </button>

          <p className="auth-terms">
            By continuing, you agree to our <span onClick={() => setCurrentView('terms_of_use')}>Terms of Service</span> and <span onClick={() => setCurrentView('privacy_policy')}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );

  const renderMainView = () => (
    <div className="settings-scroll-view">
      <ListItem icon={<User size={24} />} title="Account" subtitle={username + " • Close account"} onClick={() => alert(`Username: ${username}\nEmail: ${email}`)} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>d</div>} title="Content and display" subtitle="Canvas • Languages for music" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔊</div>} title="Playback" subtitle="Gapless playback • Autoplay" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>} title="Notifications" subtitle="Push • Email" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📺</div>} title="Devices" subtitle={isCapacitor ? "Scan QR code to link Vibeflow TV" : "Bluetooth • Vibeflow Connect"} onClick={handleDevicesClick} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↓</div>} title="Data-saving and offline" subtitle="Data Saver mode • Downloads over cellular" onClick={() => setCurrentView('data_saving')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📶</div>} title="Media quality" subtitle="Wi-Fi streaming quality • Audio download quality" onClick={() => setCurrentView('media_quality')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>ℹ️</div>} title="About and support" subtitle="Version • Privacy Policy" onClick={() => setCurrentView('about')} />
      <ListItem icon={<Lock size={24} color="#ff3b30" />} title="Host Dashboard" subtitle="Manage users and playlists" onClick={handleHostDashboardClick} />

      <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0' }}>
        <button className="settings-logout-btn" onClick={handleLogout}>Log out</button>
      </div>
    </div>
  );

  const renderPrivacyPolicyView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Privacy Policy</h3>
      <p className="sub-section-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last updated: June 2026</p>
      <div className="settings-divider"></div>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>At Vibeflow, we value your privacy. We do not collect or share your personal data with third parties without your explicit consent. Your listening history and saved playlists are stored securely.</p>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>We use minimal analytics to improve the app experience.</p>
    </div>
  );

  const renderTermsView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Terms of Service</h3>
      <p className="sub-section-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last updated: June 2026</p>
      <div className="settings-divider"></div>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>By using Vibeflow, you agree to follow our community guidelines. You may not use this service for illegal activities or copyright infringement.</p>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>We reserve the right to suspend accounts that violate these terms.</p>
    </div>
  );

  const renderAboutView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>About</h3>
      <div className="settings-action-item">
        <div className="action-item-text">
          <span className="action-title">Version</span>
          <span className="action-subtitle">8.9.74.568</span>
        </div>
      </div>
      <div className="settings-divider"></div>
      <div className="settings-action-item focusable" role="button" tabIndex="0" onClick={() => setCurrentView('terms_of_use')}>
        <div className="action-item-text">
          <span className="action-title">Terms of Service</span>
        </div>
      </div>
      <div className="settings-action-item focusable" role="button" tabIndex="0" onClick={() => setCurrentView('privacy_policy')}>
        <div className="action-item-text">
          <span className="action-title">Privacy Policy</span>
        </div>
      </div>
    </div>
  );


  const getHeaderTitle = () => {
    switch (currentView) {
      case 'data_saving': return 'Data-saving and offline';
      case 'privacy': return 'Playlist privacy';
      case 'media_quality': return 'Media quality';
      case 'about': return 'About';
      case 'terms_of_use': return 'Terms of Service';
      case 'privacy_policy': return 'Privacy Policy';
      case 'host_dashboard': return 'Host Dashboard';
      case 'devices': return 'Devices';
      default: return 'Settings';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="account-overlay focusable">
        <div className="modern-auth-container">
          <div className="mobile-header" style={{ position: 'absolute', top: 0, right: 0, background: 'transparent', zIndex: 100 }}>
            <button className="mobile-icon-btn" onClick={onClose} aria-label="Close auth" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {renderAuthView()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`account-overlay focusable ${isScanning ? 'scanning-active' : ''}`}>
      <div className="modern-auth-container">
        <div className="mobile-header">
          {currentView !== 'main' && (
            <button className="mobile-icon-btn" onClick={() => setCurrentView('main')} aria-label="Go back">
              <ArrowLeft size={24} />
            </button>
          )}
          <h2 className="mobile-header-title">{getHeaderTitle()}</h2>
          <button className="mobile-icon-btn" onClick={onClose} aria-label="Close settings">×</button>
        </div>

        <div className="settings-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentView === 'main' && renderMainView()}
          
          {currentView === 'data_saving' && (
            <DataSaverSettings
              dataSaverMode={dataSaverMode} setDataSaverMode={setDataSaverMode}
              downloadsCellular={downloadsCellular} setDownloadsCellular={setDownloadsCellular}
              audioOnlyDownloads={audioOnlyDownloads} setAudioOnlyDownloads={setAudioOnlyDownloads}
              audioOnlyStreaming={audioOnlyStreaming} setAudioOnlyStreaming={setAudioOnlyStreaming}
              handleRemoveDownloads={handleRemoveDownloads} handleClearCache={handleClearCache}
            />
          )}

          {currentView === 'privacy' && (
            <PrivacySettings
              followersFollowing={followersFollowing} setFollowersFollowing={setFollowersFollowing}
              playlistsVisible={playlistsVisible} setPlaylistsVisible={setPlaylistsVisible}
              handleActivateJam={handleActivateJam} setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'media_quality' && (
            <MediaQualitySettings
              wiFiStreamingQuality={wiFiStreamingQuality} setWiFiStreamingQuality={setWiFiStreamingQuality}
              cellularStreamingQuality={cellularStreamingQuality} setCellularStreamingQuality={setCellularStreamingQuality}
              autoAdjust={autoAdjust} setAutoAdjust={setAutoAdjust}
              audioDownloadQuality={audioDownloadQuality} setAudioDownloadQuality={setAudioDownloadQuality}
              handleUpdateDownloads={handleUpdateDownloads}
            />
          )}

          {currentView === 'about' && renderAboutView()}
          {currentView === 'terms_of_use' && renderTermsView()}
          {currentView === 'privacy_policy' && renderPrivacyPolicyView()}
          
          {currentView === 'devices' && (
            <DevicesSettings
              setIsScanning={setIsScanning}
              tvSessionId={tvSessionId}
              isLoggedIn={isLoggedIn}
              email={email}
              username={username}
            />
          )}

          {(currentView === 'host_dashboard' || showHostLoginModal) && (
            <HostDashboard
              hostPlaylists={hostPlaylists} setHostPlaylists={setHostPlaylists}
              isHost={isHost} setIsHost={setIsHost}
              showHostLoginModal={showHostLoginModal} setShowHostLoginModal={setShowHostLoginModal}
              setCurrentView={setCurrentView}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
