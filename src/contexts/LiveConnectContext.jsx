import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { usePlayer } from './PlayerContext';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { generateSecureCode } from '../utils/cryptoUtils';

const NativeAudio = registerPlugin('NativeAudio');

const LiveConnectContext = createContext();

export const useLiveConnect = () => useContext(LiveConnectContext);

export const LiveConnectProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { currentTrack, isPlaying, currentTime, playSong, audioRef, setIsPlaying } = usePlayer();

  const [isLiveConnectOpen, setIsLiveConnectOpen] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState(() => localStorage.getItem('live_session_id') || null);
  const [liveSessionRole, setLiveSessionRole] = useState(() => localStorage.getItem('live_session_role') || null);
  const [liveSessionCode, setLiveSessionCode] = useState(() => localStorage.getItem('live_session_code') || null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveGuestCount, setLiveGuestCount] = useState(0);

  const liveConnectRef = useRef(null);
  const isBroadcastingRef = useRef(false);

  const generateLiveCode = () => {
    return generateSecureCode(6);
  };

  const startLiveSession = async (triggerToast) => {
    const code = generateLiveCode();
    const sessionId = `live_${Date.now()}_${code}`;
    const username = localStorage.getItem('username') || 'Host';
    try {
      await setDoc(doc(db, 'live_sessions', sessionId), {
        code,
        host: username,
        hostId: currentUser?.uid || 'anonymous',
        createdAt: Date.now(),
        currentTrack: currentTrack || null,
        isPlaying,
        currentTime,
        guestCount: 0,
        active: true
      });
      localStorage.setItem('live_session_id', sessionId);
      localStorage.setItem('live_session_role', 'host');
      localStorage.setItem('live_session_code', code);
      setLiveSessionId(sessionId);
      setLiveSessionRole('host');
      setLiveSessionCode(code);
      setIsLiveConnected(true);
      subscribeToLiveSession(sessionId, 'host');
      if (triggerToast) triggerToast(`Live session started! Code: ${code}`);
    } catch (e) {
      console.error('Live Connect start error:', e);
      if (triggerToast) triggerToast('Failed to start Live Connect.');
    }
  };

  const joinLiveSession = async (code, triggerToast) => {
    const cleanCode = (code || joinCodeInput).toUpperCase().trim();
    if (!cleanCode || cleanCode.length < 4) { if (triggerToast) triggerToast('Enter a valid 6-digit code.'); return; }
    try {
      const q = query(collection(db, 'live_sessions'), where('code', '==', cleanCode), where('active', '==', true));
      const snap = await getDocs(q);
      if (snap.empty) { if (triggerToast) triggerToast('Session not found. Check the code.'); return; }
      
      const sessionDoc = snap.docs[0];
      const sessionId = sessionDoc.id;
      const data = sessionDoc.data();

      await updateDoc(doc(db, 'live_sessions', sessionId), { guestCount: (data.guestCount || 0) + 1 });

      localStorage.setItem('live_session_id', sessionId);
      localStorage.setItem('live_session_role', 'guest');
      localStorage.setItem('live_session_code', cleanCode);
      setLiveSessionId(sessionId);
      setLiveSessionRole('guest');
      setLiveSessionCode(cleanCode);
      setIsLiveConnected(true);
      setJoinCodeInput('');
      subscribeToLiveSession(sessionId, 'guest');
      if (triggerToast) triggerToast(`Joined ${data.host || 'host'}'s session!`);
    } catch (e) {
      console.error('Live Connect join error:', e);
      if (triggerToast) triggerToast('Failed to join session.');
    }
  };

  const currentStateRef = useRef({ currentTrack, isPlaying, currentTime });
  useEffect(() => {
    currentStateRef.current = { currentTrack, isPlaying, currentTime };
  }, [currentTrack, isPlaying, currentTime]);

  const subscribeToLiveSession = (sessionId, role) => {
    if (liveConnectRef.current) liveConnectRef.current();
    const unsub = onSnapshot(doc(db, 'live_sessions', sessionId), (snap) => {
      if (!snap.exists()) { disconnectLiveSession(); return; }
      const data = snap.data();
      if (!data.active) { disconnectLiveSession(); return; }
      
      setLiveGuestCount(data.guestCount || 0);
      
      if (role === 'guest' && !isBroadcastingRef.current) {
        const { currentTrack: localTrack, isPlaying: localIsPlaying, currentTime: localTime } = currentStateRef.current;
        
        if (data.currentTrack && data.currentTrack.id !== localTrack?.id) {
          playSong(data.currentTrack);
        }
        if (typeof data.currentTime === 'number' && Math.abs(localTime - data.currentTime) > 3) {
          if (Capacitor.isNativePlatform()) {
            NativeAudio.seek({ time: data.currentTime }).catch(() => {});
          } else if (audioRef.current) {
            audioRef.current.currentTime = data.currentTime;
          }
        }
        if (data.isPlaying !== localIsPlaying) {
          if (data.isPlaying) {
            if (Capacitor.isNativePlatform()) { NativeAudio.resume(); } else { audioRef.current?.play?.().catch(() => { }); }
            setIsPlaying(true);
          } else {
            if (Capacitor.isNativePlatform()) { NativeAudio.pause(); } else { audioRef.current?.pause?.(); }
            setIsPlaying(false);
          }
        }
      }
    });
    liveConnectRef.current = unsub;
  };

  const lastSyncTime = useRef(0);
  const lastSyncTrack = useRef(null);
  const lastSyncState = useRef(null);

  useEffect(() => {
    if (liveSessionRole !== 'host' || !isLiveConnected) return;
    
    const isTrackChanged = currentTrack?.id !== lastSyncTrack.current?.id;
    const isStateChanged = isPlaying !== lastSyncState.current;
    const isTimeDrift = Math.abs(currentTime - lastSyncTime.current) > 10;
    
    if (isTrackChanged || isStateChanged || isTimeDrift) {
      lastSyncTrack.current = currentTrack;
      lastSyncState.current = isPlaying;
      lastSyncTime.current = currentTime;
      
      const sync = async () => {
        isBroadcastingRef.current = true;
        try {
          await updateDoc(doc(db, 'live_sessions', liveSessionId), {
            currentTrack: currentTrack || null,
            isPlaying,
            currentTime,
            updatedAt: Date.now()
          });
        } catch (e) { console.error('Broadcast error:', e); }
        setTimeout(() => { isBroadcastingRef.current = false; }, 500);
      };
      sync();
    }
  }, [currentTime, currentTrack, isPlaying, liveSessionRole, isLiveConnected, liveSessionId]);

  const disconnectLiveSession = async (triggerToast) => {
    if (liveConnectRef.current) { liveConnectRef.current(); liveConnectRef.current = null; }
    try {
      if (liveSessionId) {
        if (liveSessionRole === 'host') {
          await updateDoc(doc(db, 'live_sessions', liveSessionId), { active: false });
        } else {
          const snap = await getDoc(doc(db, 'live_sessions', liveSessionId));
          if (snap.exists()) {
            await updateDoc(doc(db, 'live_sessions', liveSessionId), { guestCount: Math.max(0, (snap.data().guestCount || 1) - 1) });
          }
        }
      }
    } catch (e) { console.error('Disconnect error:', e); }
    
    localStorage.removeItem('live_session_id');
    localStorage.removeItem('live_session_role');
    localStorage.removeItem('live_session_code');
    setLiveSessionId(null);
    setLiveSessionRole(null);
    setLiveSessionCode(null);
    setIsLiveConnected(false);
    setLiveGuestCount(0);
    if (triggerToast) triggerToast('Disconnected from Live Connect.');
  };

  useEffect(() => {
    if (liveSessionId && liveSessionRole) {
      subscribeToLiveSession(liveSessionId, liveSessionRole);
      setIsLiveConnected(true);
    }
    return () => { if (liveConnectRef.current) liveConnectRef.current(); };
  }, []);

  const value = {
    isLiveConnectOpen, setIsLiveConnectOpen,
    liveSessionId, liveSessionRole, liveSessionCode,
    joinCodeInput, setJoinCodeInput,
    isLiveConnected, liveGuestCount,
    startLiveSession, joinLiveSession, disconnectLiveSession
  };

  return (
    <LiveConnectContext.Provider value={value}>
      {children}
    </LiveConnectContext.Provider>
  );
};
