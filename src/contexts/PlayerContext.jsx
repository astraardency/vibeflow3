import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getPlayableStreamForSong } from '../services/saavn';
import { useDeviceConnect } from './DeviceConnectContext';
import { getSongBlob } from '../services/idb';

const NativeAudio = registerPlugin('NativeAudio');

const defaultSongs = [];

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('lastPlayedTrack');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [prefetchingNext, setPrefetchingNext] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem('lastTrackIndex');
    return saved !== null ? parseInt(saved, 10) : -1;
  });
  const [activePlaybackQueue, setActivePlaybackQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('lastPlaybackQueue');
      const parsed = saved ? JSON.parse(saved) : defaultSongs;
      return Array.isArray(parsed) ? parsed : defaultSongs;
    } catch { return defaultSongs; }
  });

  const [downloadedSongs, setDownloadedSongs] = useState(() => {
    try {
      const saved = localStorage.getItem('downloadedSongs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const audioRef = useRef(null);
  
  const { 
    isLocalDeviceActive, sendCommand, incomingCommand, broadcastState, remotePlaybackState, syncQueue 
  } = useDeviceConnect();

  const queueRef = useRef(defaultSongs);
  useEffect(() => { queueRef.current = activePlaybackQueue; }, [activePlaybackQueue]);

  const playNextRef = useRef(null);
  const playPrevRef = useRef(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const listeners = [
      NativeAudio.addListener('onStateChanged', (data) => {
        setIsPlaying(data.state === 'playing');
        if (data.duration) setDuration(data.duration);
      }),
      NativeAudio.addListener('onProgress', (data) => {
        setCurrentTime(data.time);
      }),
      NativeAudio.addListener('onTrackChanged', (data) => {
        const queue = queueRef.current;
        if (queue && queue[data.index]) {
          setCurrentTrackIndex(data.index);
          setCurrentTrack(queue[data.index]);
          setCurrentTime(0);
        }
      }),
      NativeAudio.addListener('onNext', () => {
        if (playNextRef.current) playNextRef.current();
      }),
      NativeAudio.addListener('onPrev', () => {
        if (playPrevRef.current) playPrevRef.current();
      })
    ];

    return () => {
      listeners.forEach(l => l.then(sub => sub.remove()));
    };
  }, []);

  // Process incoming remote commands
  useEffect(() => {
    if (isLocalDeviceActive && incomingCommand) {
      const { action, payload } = incomingCommand;
      switch (action) {
        case 'PLAY': 
          if (!isPlaying) togglePlay(true);
          break;
        case 'PAUSE':
          if (isPlaying) togglePlay(false);
          break;
        case 'NEXT':
          playNextSong();
          break;
        case 'PREV':
          playPreviousSong();
          break;
        case 'PLAY_SONG':
          playSong(payload.song, payload.index, payload.queueToUse);
          break;
      }
    }
  }, [incomingCommand, isLocalDeviceActive]);

  // Throttle refs for broadcast
  const lastBroadcastRef = useRef(0);
  const lastBroadcastStateRef = useRef({ isPlaying: null, currentTrack: null });

  // Broadcast state to other devices
  useEffect(() => {
    if (!isLocalDeviceActive) return;

    const now = Date.now();
    const trackChanged = currentTrack !== lastBroadcastStateRef.current.currentTrack;
    const playStateChanged = isPlaying !== lastBroadcastStateRef.current.isPlaying;
    
    // Broadcast if state changed or every 10 seconds for sync
    if (trackChanged || playStateChanged || (now - lastBroadcastRef.current > 10000)) {
      broadcastState(isPlaying, currentTrack, currentTime);
      lastBroadcastRef.current = now;
      lastBroadcastStateRef.current = { isPlaying, currentTrack };
    }
  }, [isPlaying, currentTrack, currentTime, isLocalDeviceActive]);

  // Sync queue to Firebase when local device changes it
  useEffect(() => {
    if (isLocalDeviceActive && syncQueue) {
      syncQueue(activePlaybackQueue, currentTrackIndex);
    }
  }, [activePlaybackQueue, currentTrackIndex, isLocalDeviceActive, syncQueue]);

  // Sync remote state to local state when acting as remote
  useEffect(() => {
    if (!isLocalDeviceActive) {
      setCurrentTime(remotePlaybackState.currentTime || 0);
      if (remotePlaybackState.currentTrack?.duration) {
        setDuration(parseInt(remotePlaybackState.currentTrack.duration, 10) || 0);
      }
      if (remotePlaybackState.queue && remotePlaybackState.queue.length > 0) {
        setActivePlaybackQueue(remotePlaybackState.queue);
        setCurrentTrackIndex(remotePlaybackState.queueIndex ?? -1);
      }
    }
  }, [isLocalDeviceActive, remotePlaybackState.currentTime, remotePlaybackState.currentTrack, remotePlaybackState.queue, remotePlaybackState.queueIndex]);

  // Take over playback when we become the active device
  const wasLocalDeviceActiveRef = useRef(isLocalDeviceActive);
  useEffect(() => {
    if (isLocalDeviceActive && !wasLocalDeviceActiveRef.current) {
      // We just became active! Load the remote state by calling playSong.
      if (remotePlaybackState.currentTrack) {
        playSong(
          remotePlaybackState.currentTrack, 
          -1, 
          null, 
          { skipBroadcast: true }, 
          remotePlaybackState.currentTime
        ).then(() => {
          if (!remotePlaybackState.isPlaying) {
             togglePlay(false); // Pause if it was paused on the remote
          }
        });
      }
    }
    
    if (!isLocalDeviceActive && wasLocalDeviceActiveRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
    
    wasLocalDeviceActiveRef.current = isLocalDeviceActive;
  }, [isLocalDeviceActive, remotePlaybackState]);

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('lastPlayedTrack', JSON.stringify(currentTrack));
      localStorage.setItem('lastTrackIndex', currentTrackIndex.toString());
    }
  }, [currentTrack, currentTrackIndex]);

  useEffect(() => {
    if (activePlaybackQueue && activePlaybackQueue.length > 0) {
      localStorage.setItem('lastPlaybackQueue', JSON.stringify(activePlaybackQueue));
    }
  }, [activePlaybackQueue]);

  const togglePlay = (forcePlay) => {
    if (!currentTrack) {
      if (activePlaybackQueue && activePlaybackQueue.length > 0) {
        playSong(activePlaybackQueue[0], 0);
      } else if (window.defaultSongs && window.defaultSongs.length > 0) {
        playSong(window.defaultSongs[0], 0);
      }
      return;
    }

    const isForcePlayBool = typeof forcePlay === 'boolean';
    if (!isLocalDeviceActive) {
      const stateToSet = isForcePlayBool ? forcePlay : !remotePlaybackState.isPlaying;
      sendCommand(stateToSet ? 'PLAY' : 'PAUSE');
      return;
    }
    
    if (currentTrack) {
      const shouldPlay = isForcePlayBool ? forcePlay : !isPlaying;
      if (!shouldPlay) {
        if (Capacitor.isNativePlatform()) {
          NativeAudio.pause();
        } else if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      } else {
        if (Capacitor.isNativePlatform()) {
          NativeAudio.resume();
        } else if (audioRef.current) {
          audioRef.current.play().catch(e => console.error("Play failed", e));
        }
        setIsPlaying(true);
      }
    }
  };

  const playSong = async (song, index = -1, queueToUse = null, callbacks = {}, startTime = null) => {
    if (!song) return;
    if (!isLocalDeviceActive) {
      const safeQueue = queueToUse ? queueToUse.filter(Boolean).map(s => ({
        id: s.id, title: s.title, artist: s.artist, img: s.img, duration: s.duration, audioUrl: s.audioUrl || ''
      })).slice(0, 50) : null;
      sendCommand('PLAY_SONG', { song, index, queueToUse: safeQueue });
      if (callbacks.triggerToast) {
        callbacks.triggerToast(`Playing "${song.title || song.name}" on Remote Device`);
      }
      return;
    }
    try {
      setIsLoadingSong(true);
      if (!callbacks.skipBroadcast) setIsPlaying(false);
      if (callbacks.triggerToast) callbacks.triggerToast(`Loading "${song.title || song.name}"...`);

      // Synchronous unlock for web autoplay
      if (!Capacitor.isNativePlatform() && audioRef.current) {
        if (!audioRef.current.src || audioRef.current.src === window.location.href) {
          audioRef.current.src = 'data:audio/mp3;base64,//OwgAAAAAAAAAAAAAAAAAAAAA'; 
        }
        const p = audioRef.current.play();
        if (p !== undefined) p.catch(() => {});
      }

      let list = queueToUse || activePlaybackQueue;
      let targetIndex = index;
      if (targetIndex === -1) {
        targetIndex = list.findIndex(s => s.id === song.id || s.title?.toLowerCase() === song.title?.toLowerCase());
      }
      
      if (targetIndex === -1) {
        targetIndex = 0;
        list = [song, ...list];
        setActivePlaybackQueue(list);
      } else if (queueToUse) {
        setActivePlaybackQueue(queueToUse);
      }

      setCurrentTrackIndex(targetIndex);

      let trackToPlay = { ...song };
      const downloadedVersion = downloadedSongs.find(s => s.id === trackToPlay.id || s.title === trackToPlay.title);

      if (downloadedVersion && downloadedVersion.nativeUrl && Capacitor.isNativePlatform()) {
        trackToPlay.audioUrl = Capacitor.convertFileSrc(downloadedVersion.nativeUrl);
      } else if (downloadedVersion && downloadedVersion.nativeUrl && downloadedVersion.nativeUrl.startsWith('idb://')) {
        const idbKey = downloadedVersion.nativeUrl.replace('idb://', '');
        try {
          const blob = await getSongBlob(idbKey);
          if (blob) {
            trackToPlay.audioUrl = URL.createObjectURL(blob);
          } else {
            throw new Error("Blob not found in IDB");
          }
        } catch(e) {
          console.warn("Could not load offline blob, falling back to network", e);
          trackToPlay.audioUrl = ''; // Force network fetch
        }
      }

      if (!trackToPlay.audioUrl || trackToPlay.audioUrl.includes('audio_url_') || trackToPlay.audioUrl.includes('placeholder_url') || (trackToPlay.audioUrl.includes('saavncdn.com') && (!song.fetchedAt || Date.now() - song.fetchedAt > 12 * 60 * 60 * 1000))) {
        let playableResult = await getPlayableStreamForSong(song);
        if (playableResult) {
          trackToPlay = {
            ...trackToPlay,
            audioUrl: playableResult.audioUrl,
            duration: playableResult.duration || trackToPlay.duration,
            img: playableResult.img || trackToPlay.img
          };
          setActivePlaybackQueue(prev => {
            const newQueue = [...prev];
            if (newQueue[targetIndex]) newQueue[targetIndex] = trackToPlay;
            return newQueue;
          });
        } else {
          if (callbacks.triggerToast) callbacks.triggerToast('Could not find a playable stream.');
          setIsLoadingSong(false);
          setTimeout(() => playNextSong(), 1500);
          return;
        }
      }

      setCurrentTrack(trackToPlay);
      if (trackToPlay.duration) setDuration(parseInt(trackToPlay.duration, 10) || 0);

      // We should ideally call context-provided callbacks to track plays, but we'll leave that to consumers for now
      if (callbacks.onPlayStart) callbacks.onPlayStart(trackToPlay);

      if (Capacitor.isNativePlatform()) {
        await NativeAudio.play({
          url: trackToPlay.audioUrl,
          title: trackToPlay.title || 'Vibeflow',
          artist: trackToPlay.artist || 'Playing Music',
          coverUrl: trackToPlay.img || ''
        });
        NativeAudio.updateQueue({
          queue: list.filter(Boolean).map(t => ({
             id: t.id, title: t.title, artist: t.artist, img: t.img, audioUrl: t.audioUrl || ''
          })),
          index: targetIndex
        }).catch(e => console.log('Native queue error', e));
        if (startTime !== null) NativeAudio.seek({ time: startTime });
        setIsPlaying(true);
        setIsLoadingSong(false);
      } else {
        if (audioRef.current) {
          audioRef.current.src = trackToPlay.audioUrl;
          audioRef.current.load();
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (startTime !== null) {
                audioRef.current.currentTime = startTime;
              }
              setIsPlaying(true);
              setIsLoadingSong(false);
            }).catch(error => {
              if (error.name !== 'AbortError') setIsLoadingSong(false);
            });
          } else {
            setIsLoadingSong(false);
          }
        } else {
          setIsLoadingSong(false);
        }
      }
    } catch (e) {
      console.error(e);
      setIsLoadingSong(false);
    }
  };

  useEffect(() => {
    playNextRef.current = playNextSong;
    playPrevRef.current = playPreviousSong;
  });

  const playNextSong = () => {
    if (!isLocalDeviceActive) {
      sendCommand('NEXT');
      return;
    }
    if (activePlaybackQueue.length > 0) {
      let nextIndex;
      if (isShuffleMode) {
        nextIndex = Math.floor(Math.random() * activePlaybackQueue.length);
      } else {
        nextIndex = currentTrackIndex + 1 >= activePlaybackQueue.length ? 0 : currentTrackIndex + 1;
      }
      playSong(activePlaybackQueue[nextIndex], nextIndex);
    }
  };

  const playPreviousSong = () => {
    if (!isLocalDeviceActive) {
      sendCommand('PREV');
      return;
    }
    if (activePlaybackQueue.length > 0) {
      if (currentTime > 3) {
        if (audioRef.current) audioRef.current.currentTime = 0;
        setCurrentTime(0);
        return;
      }
      const prevIndex = currentTrackIndex - 1 < 0 ? activePlaybackQueue.length - 1 : currentTrackIndex - 1;
      playSong(activePlaybackQueue[prevIndex], prevIndex);
    }
  };

  const toggleShuffle = () => setIsShuffleMode(!isShuffleMode);

  // Keep track of already preloaded URLs in this session to prevent duplicate browser preloads
  const preloadedUrls = useRef(new Set());

  const preloadAudioFile = useCallback((url) => {
    if (!url || preloadedUrls.current.has(url) || url.startsWith('file://') || url.startsWith('blob:')) return;
    try {
      preloadedUrls.current.add(url);
      const audio = new Audio();
      audio.src = url;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.load();
    } catch (err) {
      console.warn("Audio preloading failed:", err);
    }
  }, []);

  const prefetchSong = useCallback(async (song) => {
    if (!song) return;
    try {
      if (!song.audioUrl || song.audioUrl.includes('audio_url_') || song.audioUrl.includes('placeholder_url')) {
        const playableResult = await getPlayableStreamForSong(song);
        if (playableResult && playableResult.audioUrl) {
          preloadAudioFile(playableResult.audioUrl);
        }
      } else {
        preloadAudioFile(song.audioUrl);
      }
    } catch (e) {
      console.warn("Failed to prefetch song:", e);
    }
  }, [preloadAudioFile]);

  // Preload next 4 upcoming songs in the queue to speed up loading
  useEffect(() => {
    let isCancelled = false;
    let timeoutId = null;

    if (activePlaybackQueue && activePlaybackQueue.length > 0 && currentTrackIndex !== -1 && isLocalDeviceActive) {
      const preloadNextSongs = async () => {
        const songsToPreload = [];
        // Determine the next 4 songs to preload
        for (let i = 1; i <= 4; i++) {
          const nextIndex = currentTrackIndex + i;
          if (nextIndex < activePlaybackQueue.length) {
            songsToPreload.push(activePlaybackQueue[nextIndex]);
          } else {
            // Wrap around to the start of the queue
            songsToPreload.push(activePlaybackQueue[nextIndex % activePlaybackQueue.length]);
          }
        }
        
        // Fetch them sequentially to avoid blocking the network
        for (const song of songsToPreload) {
           if (isCancelled) break;
           if (song) {
             await prefetchSong(song);
           }
        }
      };
      
      // Delay prefetching to ensure the current song loads first without network starvation
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          preloadNextSongs();
        }
      }, 5000);
    }

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentTrackIndex, activePlaybackQueue, isLocalDeviceActive, prefetchSong]);

  const value = {
    audioRef,
    currentTrack: isLocalDeviceActive ? currentTrack : remotePlaybackState.currentTrack, 
    setCurrentTrack,
    isPlaying: isLocalDeviceActive ? isPlaying : remotePlaybackState.isPlaying, 
    setIsPlaying,
    isLoadingSong,
    currentTime: currentTime,
    setCurrentTime,
    duration, setDuration,
    isShuffleMode, toggleShuffle,
    currentTrackIndex, setCurrentTrackIndex,
    activePlaybackQueue, setActivePlaybackQueue,
    downloadedSongs, setDownloadedSongs,
    playSong,
    playNextSong,
    playPreviousSong,
    togglePlay,
    prefetchSong,
    preloadAudioFile
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
