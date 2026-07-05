import React, { useState, useEffect } from 'react';
import { Mail, User, Lock, ArrowLeft, Search, ChevronRight, ExternalLink, HelpCircle, Monitor, Camera } from 'lucide-react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import './AccountSettings.css';

const AccountSettings = ({ onClose }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tvSessionId, setTvSessionId] = useState('');

  // Form States
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Robust native detection as state — re-evaluates after Capacitor bridge initializes
  const detectNative = () =>
    Capacitor.isNativePlatform()
    || window?.Capacitor?.isNative === true
    || (typeof window?.Capacitor?.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web');
  const [isCapacitor, setIsCapacitor] = useState(detectNative);
  // Re-check after mount so Capacitor bridge has time to initialize in release builds
  useEffect(() => { setIsCapacitor(detectNative()); }, []);
  // Detect mobile web (not native app) - popups are blocked on mobile browsers
  const isMobileWeb = !isCapacitor && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Settings Views
  const [currentView, setCurrentView] = useState('main'); // 'main', 'privacy', 'data_saving', 'media_quality', 'about', 'host_dashboard'
  const [hostPlaylists, setHostPlaylists] = useState([]);

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

  // TV QR Login Effect
  useEffect(() => {
    if (!isLoggedIn && !isCapacitor && !tvSessionId) {
      setTvSessionId(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    }
  }, [isLoggedIn, isCapacitor, tvSessionId]);

  useEffect(() => {
    if (tvSessionId && !isLoggedIn && !isCapacitor) {
      const unsubscribe = onSnapshot(doc(db, "tv_logins", tvSessionId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.uid) {
            localStorage.setItem('tv_uid', data.uid);
            localStorage.setItem('username', data.username || '');
            localStorage.setItem('email', data.email || '');
            setUsername(data.username || '');
            setEmail(data.email || '');
            setIsLoggedIn(true);
            deleteDoc(docSnap.ref).catch(console.error);
            window.location.reload();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [tvSessionId, isLoggedIn, isCapacitor]);

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
    alert("Remove all the Spotify content you've downloaded. Downloads removed!");
  };

  const handleUpdateDownloads = () => {
    alert('Updating your existing downloads to the selected audio quality...');
  };

  const handleActivateJam = () => {
    alert('Activating Jam access with Bluetooth...');
  };

  // Removed getRedirectResult useEffect because we now exclusively use signInWithPopup for web logins to prevent mobile browser redirect loops.

  useEffect(() => {
    if (isCapacitor) {
      GoogleAuth.initialize({
        clientId: '211660575500-b42uipe7fbma6fgtasitb7pqvl115s0q.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      const tvUid = localStorage.getItem('tv_uid');
      const user = tvUid ? { uid: tvUid, isAnonymous: false, displayName: localStorage.getItem('username'), email: localStorage.getItem('email') } : authUser;

      if (user && !user.isAnonymous) {
        setIsLoggedIn(true);
        setUsername(user.displayName || (user.email ? user.email.split('@')[0] : 'User'));
        setEmail(user.email || '');
      } else {
        // Anonymous user or no user
        setIsLoggedIn(false);
        setUsername('');
        setEmail('');
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
      localStorage.removeItem('tv_uid');
      localStorage.removeItem('listening_activity');
      localStorage.removeItem('plays_count');
      localStorage.removeItem('artist_plays');
      localStorage.removeItem('savedPlaylistIds');
      localStorage.removeItem('daily_plays');
      setIsLoggedIn(false);
      setUsername('');
      setEmail('');
      window.location.reload();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const startScan = async () => {
    try {
      // Request permissions
      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera === 'granted' || camera === 'limited') {
        setIsScanning(true);
        // Make background transparent for native camera view
        document.body.classList.add('scanner-active');

        // Start scanning
        const listener = await BarcodeScanner.addListener('barcodeScanned', async (result) => {
          if (result.barcode) {
            handleScanResult(result.barcode.displayValue);
          }
        });

        await BarcodeScanner.startScan();
      } else {
        alert("Camera permission is required to scan QR codes.");
      }
    } catch (error) {
      console.error("Scanner error:", error);
      alert("Failed to start scanner: " + error.message);
      stopScan();
    }
  };

  const stopScan = async () => {
    try {
      document.body.classList.remove('scanner-active');
      setIsScanning(false);
      await BarcodeScanner.removeAllListeners();
      await BarcodeScanner.stopScan();
    } catch (e) {
      console.error(e);
    }
  };

  const handleScanResult = async (value) => {
    stopScan();
    if (value && value.startsWith('vibeflow-auth-tv-login:')) {
      const sessionId = value.split(':')[1];
      if (isLoggedIn) {
        try {
          await setDoc(doc(db, "tv_logins", sessionId), {
            uid: auth.currentUser?.uid || localStorage.getItem('uid') || 'anonymous',
            email: email,
            username: username,
            timestamp: new Date().toISOString()
          });
          alert("Success! Your Vibeflow TV is now linked to your account.");
        } catch (e) {
          console.error(e);
          alert("Error linking TV: " + e.message);
        }
      } else {
        alert("Please log in on your phone first before scanning a TV code.");
      }
    } else if (value === 'vibeflow-auth-tv-login') {
      alert("Invalid or outdated TV code. Please refresh the TV app.");
    } else {
      alert(`Scanned code: ${value}`);
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
          preferences: { highQualityAudio: true, dataSaver: false, offlineMode: true },
          joinDate: new Date().toISOString()
        }, { merge: true });

        setIsLoggedIn(true);
        setUsername(user.displayName || user.email.split('@')[0]);
        setEmail(user.email);
      } else if (isMobileWeb) {
        // Mobile web: use redirect (popups are blocked or reload the tab on mobile browsers)
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Web: universally use popup to avoid mobile redirect loops
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
          preferences: { highQualityAudio: true, dataSaver: false, offlineMode: true },
          joinDate: new Date().toISOString()
        }, { merge: true });

        setIsLoggedIn(true);
        setUsername(user.displayName || user.email.split('@')[0]);
        setEmail(user.email);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert("Failed to sign in with Google: " + (error.message || "Please try again."));
    }
  };

  const renderAuthView = () => (
    <div className="auth-content modern-auth">
      {/* Decorative background elements */}
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
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleGoogleAuth()}
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
        <span className={"toggle-slider " + (customSliderClass || "")}></span>
      </label>
    </div>
  );

  const RadioItem = ({ title, subtitle, selected, onClick }) => (
    <div className="settings-radio-item focusable" role="button" tabIndex="0" onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}>
      <div className="settings-item-text">
        <span className="settings-item-title">{title}</span>
        {subtitle && <span className="settings-item-subtitle">{subtitle}</span>}
      </div>
      <div className={"custom-radio " + (selected ? 'selected' : '')}>
        <div className="radio-inner"></div>
      </div>
    </div>
  );

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

  const fetchHostPlaylists = async () => {
    try {
      const q = query(collection(db, 'playlists'));
      const snapshot = await getDocs(q);
      const pls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHostPlaylists(pls);
    } catch (e) {
      console.error(e);
      alert("Error fetching playlists");
    }
  };

  const handleHostDashboardLogin = () => {
    const pin = window.prompt("Enter Host PIN to access dashboard:");
    if (pin === "342832") {
      setCurrentView('host_dashboard');
      fetchHostPlaylists();
    } else if (pin !== null) {
      alert("Invalid PIN.");
    }
  };

  const handleAdminDeletePlaylist = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this playlist from the server?")) {
      try {
        await deleteDoc(doc(db, 'playlists', id));
        setHostPlaylists(hostPlaylists.filter(p => p.id !== id));
        alert("Playlist deleted.");
      } catch (e) {
        console.error(e);
        alert("Error deleting playlist.");
      }
    }
  };

  const renderHostDashboard = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0, color: 'var(--card-orange)' }}>Host Dashboard</h3>
      <p className="sub-section-desc">Manage user-created content across the entire platform.</p>

      <div className="settings-divider"></div>

      <h3 className="sub-section-title">All Playlists ({hostPlaylists.length})</h3>

      {hostPlaylists.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: 20 }}>No playlists found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {hostPlaylists.map(pl => (
            <div key={pl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--panel-bg)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-color)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: 4 }}>{pl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Created by {pl.creator || 'Anonymous'} • {pl.songs?.length || 0} songs</div>
              </div>
              <button
                onClick={() => handleAdminDeletePlaylist(pl.id)}
                style={{ background: '#ff3b30', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDevicesView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Link Vibeflow TV</h3>
      <p className="sub-section-desc">Scan the QR code shown on your Vibeflow TV app to instantly link your account.</p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '32px' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 24,
          background: 'linear-gradient(135deg, var(--card-orange, #f5954a), #e07a30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(245, 149, 74, 0.35)'
        }}>
          <Camera size={48} color="white" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 18 }}>Scan TV QR Code</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            On your TV, go to Account and a QR code will appear.<br />
            Tap below to scan it with your camera.
          </p>
        </div>
        <button
          onClick={startScan}
          style={{
            background: 'linear-gradient(135deg, var(--card-orange, #f5954a), #e07a30)',
            border: 'none', color: 'white', borderRadius: 16,
            padding: '16px 40px', fontSize: 16, fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245, 149, 74, 0.4)', width: '100%', maxWidth: 300
          }}
        >
          Open Camera & Scan
        </button>
      </div>

      <div className="settings-divider" style={{ margin: '32px 0 16px' }}></div>

      <h3 className="sub-section-title">How it works</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { num: '1', text: 'Open Vibeflow on your TV or browser' },
          { num: '2', text: 'Go to Account — a QR code will appear on screen' },
          { num: '3', text: 'Tap "Open Camera & Scan" above and point at the QR code' },
          { num: '4', text: 'Your TV is instantly linked to this account!' }
        ].map(step => (
          <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              minWidth: 28, height: 28, borderRadius: '50%',
              background: 'var(--card-orange, #f5954a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 'bold', color: 'white'
            }}>{step.num}</div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMainView = () => (
    <div className="settings-scroll-view">
      <ListItem icon={<User size={24} />} title="Account" subtitle={username + " • Close account"} onClick={() => alert(`Username: ${username}\nEmail: ${email}`)} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>d</div>} title="Content and display" subtitle="Canvas • Languages for music" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔊</div>} title="Playback" subtitle="Gapless playback • Autoplay" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>} title="Notifications" subtitle="Push • Email" onClick={() => { }} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📺</div>} title="Devices" subtitle={isCapacitor ? "Scan QR code to link Vibeflow TV" : "Bluetooth • Spotify Connect"} onClick={handleDevicesClick} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↓</div>} title="Data-saving and offline" subtitle="Data Saver mode • Downloads over cellular" onClick={() => setCurrentView('data_saving')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📶</div>} title="Media quality" subtitle="Wi-Fi streaming quality • Audio download quality" onClick={() => setCurrentView('media_quality')} />
      <ListItem icon={<div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>ℹ️</div>} title="About and support" subtitle="Version • Privacy Policy" onClick={() => setCurrentView('about')} />
      <ListItem icon={<Lock size={24} color="#ff3b30" />} title="Host Dashboard" subtitle="Manage users and playlists" onClick={handleHostDashboardLogin} />

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

  const renderPrivacyPolicyView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Privacy Policy</h3>
      <p className="sub-section-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last updated: June 2026</p>
      <div className="settings-divider"></div>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>At Vibeflow, we value your privacy. We do not collect or share your personal data with third parties without your explicit consent. Your listening history and saved playlists are stored securely.</p>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>We use minimal analytics to improve the app experience.</p>
    </div>
  );

  const renderTermsOfUseView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Terms of Use</h3>
      <p className="sub-section-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last updated: June 2026</p>
      <div className="settings-divider"></div>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>By using Vibeflow, you agree to our Terms of Use. Vibeflow is a music streaming application provided "as is" without warranties. You agree not to misuse the service or distribute copyrighted material without authorization.</p>
    </div>
  );

  const renderSupportFeedbackView = () => (
    <div className="settings-scroll-view sub-view-padding">
      <h3 className="sub-section-title" style={{ marginTop: 0 }}>Support & Feedback</h3>
      <p className="sub-section-desc">We'd love to hear from you!</p>
      <div className="settings-divider"></div>
      <p className="sub-section-desc" style={{ lineHeight: '1.6' }}>If you have any questions, encounter bugs, or want to suggest new features, please reach out to our support team.</p>
      <div className="settings-action-item" style={{ marginTop: '24px' }}>
        <div className="action-item-text">
          <span className="action-title">Email Support</span>
          <span className="action-subtitle">[EMAIL_ADDRESS]</span>
        </div>
        <button className="action-btn" onClick={() => window.location.href = 'mailto:astraardency@gmail.com'}>Email</button>
      </div>
    </div>
  );

  const renderAboutView = () => (
    <div className="settings-scroll-view">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '30px 0' }}>
        <img src="/logo.png" alt="Vibeflow Logo" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 16, objectFit: 'cover' }} />
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>Vibeflow</h2>
        <p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>The Ultimate Music Experience</p>
      </div>

      <div className="settings-simple-item">
        <span>Version</span>
        <span className="simple-item-value">1.0.0 (Build 1)</span>
      </div>
      <div className="settings-simple-item">
        <span>Creator</span>
        <span className="simple-item-value"><a href="https://astravibeflow.dpdns.org/">Vibeflow Official</a></span>
      </div>
      <div className="settings-simple-item">
        <span>Language</span>
        <span className="simple-item-value">Multi Languages</span>
      </div>
      <div className="settings-simple-item">
        <span>Platform</span>
        <span className="simple-item-value">Web, Android</span>
      </div>

      <div className="settings-divider" style={{ margin: '16px 0 8px 0' }}></div>

      <div className="settings-link-item" onClick={() => setCurrentView('privacy_policy')} style={{ cursor: 'pointer' }}>
        <span>Privacy Policy</span>
        <ChevronRight size={18} color="var(--text-secondary)" />
      </div>
      <div className="settings-link-item" onClick={() => setCurrentView('terms_of_use')} style={{ cursor: 'pointer' }}>
        <span>Terms of Use</span>
        <ChevronRight size={18} color="var(--text-secondary)" />
      </div>
      <div className="settings-link-item" onClick={() => setCurrentView('support_feedback')} style={{ cursor: 'pointer' }}>
        <span>Support & Feedback</span>
        <ChevronRight size={18} color="var(--text-secondary)" />
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-secondary)', fontSize: 12 }}>
        <p style={{ margin: '4px 0' }}>© 2026 Vibeflow Music. All rights reserved.</p>
        <p style={{ margin: '4px 0' }}>Made with ❤️ for Melophiles</p>
        <p style={{ margin: '4px 0' }}>My Own New Idea Can Act</p>
      </div>
    </div>
  );

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'data_saving': return 'Data-saving and offline';
      case 'privacy': return 'Privacy and social';
      case 'media_quality': return 'Media quality';
      case 'about': return 'About and support';
      case 'privacy_policy': return 'Privacy Policy';
      case 'terms_of_use': return 'Terms of Use';
      case 'support_feedback': return 'Support & Feedback';
      case 'devices': return 'Connect to TV';
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
        {isLoggedIn && (
          <div className="mobile-header">
            <button className="mobile-icon-btn" onClick={handleBack} aria-label="Go back">
              <ArrowLeft size={24} />
            </button>
            <h2 className="mobile-header-title">{getHeaderTitle()}</h2>
            {currentView === 'main' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isCapacitor && (
                  <button className="mobile-icon-btn" onClick={startScan}>
                    <Camera size={24} />
                  </button>
                )}
                <button className="mobile-icon-btn">
                  <Search size={24} />
                </button>
              </div>
            ) : (
              <div style={{ width: 48, height: 48 }}></div>
            )}
          </div>
        )}

        {!isLoggedIn ? renderAuthView() : (
          <>
            {currentView === 'main' && renderMainView()}
            {currentView === 'data_saving' && renderDataSavingView()}
            {currentView === 'privacy' && renderPrivacyView()}
            {currentView === 'media_quality' && renderMediaQualityView()}
            {currentView === 'host_dashboard' && renderHostDashboard()}
            {currentView === 'about' && renderAboutView()}
            {currentView === 'privacy_policy' && renderPrivacyPolicyView()}
            {currentView === 'terms_of_use' && renderTermsOfUseView()}
            {currentView === 'support_feedback' && renderSupportFeedbackView()}
            {currentView === 'devices' && renderDevicesView()}
          </>
        )}
      </div>

      {isScanning && (
        <div className="scanner-overlay">
          <div className="scanner-target-box"></div>
          <p className="scanner-instruction">Point your camera at a Vibeflow TV code</p>
          <button className="scanner-cancel-btn" onClick={stopScan}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
