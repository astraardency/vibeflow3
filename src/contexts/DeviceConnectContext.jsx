import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Capacitor } from '@capacitor/core';
import { generateSecureToken } from '../utils/cryptoUtils';

const DeviceConnectContext = createContext();

export const useDeviceConnect = () => useContext(DeviceConnectContext);

export const DeviceConnectProvider = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [deviceId] = useState(() => {
    let id = localStorage.getItem('device_id');
    if (!id) { id = generateSecureToken(16); localStorage.setItem('device_id', id); }
    return id;
  });

  const [deviceName] = useState(() => {
    const isMobile = Capacitor.isNativePlatform();
    let defaultName = 'Web Player';
    
    if (isMobile) {
      defaultName = 'Mobile App';
    } else if (window.navigator && window.navigator.userAgent) {
      const ua = window.navigator.userAgent;
      let browser = 'Web Player';
      if (ua.includes('Edg/')) browser = 'Edge';
      else if (ua.includes('Chrome/')) browser = 'Chrome';
      else if (ua.includes('Firefox/')) browser = 'Firefox';
      else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
      
      let os = '';
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS')) os = 'Mac';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      
      if (os && browser !== 'Web Player') {
        defaultName = `${browser} on ${os}`;
      } else if (os) {
        defaultName = `${os} Device`;
      }
    }
    
    return localStorage.getItem('device_name') || defaultName;
  });

  const [availableDevices, setAvailableDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  
  // Remote playback state
  const [remotePlaybackState, setRemotePlaybackState] = useState({
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    queue: [],
    queueIndex: -1
  });
  
  const [incomingCommand, setIncomingCommand] = useState(null);

  // 1. Heartbeat to keep device online
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const deviceRef = doc(db, `account_devices/${uid}/devices/${deviceId}`);

    const heartbeat = () => {
      const isTVMode = window.location.search.includes('mode=tv') || localStorage.getItem('tv_mode') === 'true';
      setDoc(deviceRef, {
        deviceName,
        deviceType: isTVMode ? 'tv' : (Capacitor.isNativePlatform() ? 'mobile' : 'web'),
        lastActive: Date.now()
      }, { merge: true }).catch(console.error);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 10000); // 10s heartbeat
    
    // Clean up inactive devices
    const cleanup = async () => {
      try {
        const devicesSnap = await getDocs(collection(db, `account_devices/${uid}/devices`));
        const now = Date.now();
        devicesSnap.forEach(d => {
          const data = d.data();
          if (now - data.lastActive > 30000) { // 30s timeout
            deleteDoc(d.ref).catch(console.error);
          }
        });
      } catch (e) { console.error(e); }
    };
    cleanup();
    const cleanupInterval = setInterval(cleanup, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
      // Remove device on unmount/close
      deleteDoc(deviceRef).catch(() => {});
    };
  }, [currentUser, deviceId, deviceName]);

  // 2. Listen for available devices
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(collection(db, `account_devices/${currentUser.uid}/devices`), (snap) => {
      const devices = [];
      const now = Date.now();
      snap.forEach(doc => {
        const data = doc.data();
        if (now - data.lastActive <= 30000) {
          devices.push({ id: doc.id, ...data });
        }
      });
      setAvailableDevices(devices);
    }, (error) => {
      console.warn("DeviceConnect devices listener error:", error);
    });
    return () => unsub();
  }, [currentUser]);

  // 3. Listen for global playback state and commands
  useEffect(() => {
    if (!currentUser) return;
    const stateRef = doc(db, 'account_devices', currentUser.uid);
    const unsub = onSnapshot(stateRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeDeviceId) setActiveDeviceId(data.activeDeviceId);
        
        setRemotePlaybackState({
          isPlaying: data.isPlaying || false,
          currentTrack: data.currentTrack || null,
          currentTime: data.currentTime || 0,
          queue: data.queue || [],
          queueIndex: data.queueIndex ?? -1
        });

        // If a command was issued and we are the active device
        if (data.command && data.activeDeviceId === deviceId) {
          // Prevent processing the same command twice
          if (data.command.timestamp && data.command.timestamp > (window._lastProcessedCommandTime || 0)) {
            window._lastProcessedCommandTime = data.command.timestamp;
            setIncomingCommand(data.command);
          }
        }
      } else {
        // Init if missing
        setDoc(stateRef, { activeDeviceId: deviceId, isPlaying: false }, { merge: true }).catch(console.error);
        setActiveDeviceId(deviceId);
      }
    }, (error) => {
      console.warn("DeviceConnect state listener error:", error);
    });
    return () => unsub();
  }, [currentUser, deviceId]);

  // 4. Send commands from remote
  const sendCommand = async (action, payload = null) => {
    if (!currentUser) return;
    const stateRef = doc(db, 'account_devices', currentUser.uid);
    await updateDoc(stateRef, {
      command: {
        action,
        payload,
        timestamp: Date.now()
      }
    }).catch(console.error);
  };

  // 5. Broadcast our own state if we are the active player
  const broadcastState = useCallback(async (isPlaying, currentTrack, currentTime) => {
    if (!currentUser || activeDeviceId !== deviceId) return;
    const stateRef = doc(db, 'account_devices', currentUser.uid);
    await setDoc(stateRef, {
      isPlaying,
      currentTrack,
      currentTime,
      updatedAt: Date.now()
    }, { merge: true }).catch(console.error);
  }, [currentUser, activeDeviceId, deviceId]);

  const syncQueue = useCallback(async (queue, queueIndex) => {
    if (!currentUser || activeDeviceId !== deviceId) return;
    const stateRef = doc(db, 'account_devices', currentUser.uid);
    const safeQueue = (queue || []).map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      img: s.img,
      duration: s.duration || 0,
      audioUrl: s.audioUrl || ''
    })).slice(0, 50);
    await updateDoc(stateRef, { queue: safeQueue, queueIndex }).catch(console.error);
  }, [currentUser, activeDeviceId, deviceId]);

  const connectDevice = async (targetDeviceId) => {
    if (!currentUser) return;
    const stateRef = doc(db, 'account_devices', currentUser.uid);
    await setDoc(stateRef, { activeDeviceId: targetDeviceId }, { merge: true });
    
    await updateDoc(stateRef, {
      command: {
        action: 'transfer_playback',
        payload: {
          track: remotePlaybackState.currentTrack,
          time: remotePlaybackState.currentTime,
          wasPlaying: remotePlaybackState.isPlaying
        },
        timestamp: Date.now()
      }
    }).catch(console.error);
  };

  const isActiveDeviceOnline = availableDevices.some(d => d.id === activeDeviceId);
  const isLocalDeviceActive = !currentUser || activeDeviceId === null || activeDeviceId === deviceId || !isActiveDeviceOnline;

  const value = {
    deviceId,
    deviceName,
    availableDevices,
    activeDeviceId,
    isLocalDeviceActive,
    isDeviceModalOpen, setIsDeviceModalOpen,
    connectDevice,
    transferPlayback: connectDevice, // keep alias for safety
    remotePlaybackState,
    incomingCommand, setIncomingCommand,
    sendCommand,
    broadcastState,
    syncQueue
  };

  return (
    <DeviceConnectContext.Provider value={value}>
      {children}
    </DeviceConnectContext.Provider>
  );
};
