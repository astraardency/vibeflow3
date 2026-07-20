import {
  Play, Pause, SkipForward, SkipBack, ArrowLeft, Heart,
  Search, Plus, Download, Radio, Headphones,
  Sparkles, Check, ChevronDown, ListMusic, X,
  Home, PlusSquare, BarChart2, Sun, Moon, Maximize2, Minimize2, Monitor,
  ChevronLeft, MoreVertical, MoreHorizontal, Volume1, Volume2, ChevronsLeft, ChevronsRight,
  Shuffle, Repeat, SlidersHorizontal, Lock, Equal, Cast, Share2
} from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './services/firebase'
import Header from './components/Header'
import HeroCard from './components/HeroCard'

import SuggestedSongsList from './components/SuggestedSongsList'
import MagicShuffle from './components/MagicShuffle'
import BottomNav from './components/BottomNav'
import { searchSongs, searchPlaylists, getPlaylistDetails, getPlayableStreamForSong, getSongDetails } from './services/saavn'
import { MediaSession } from '@jofr/capacitor-media-session';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { saveSongBlob, deleteSongBlob } from './services/idb';
import AccountSettings from './components/AccountSettings'
import DeviceConnectModal from './components/DeviceConnectModal'
import { useDeviceConnect } from './contexts/DeviceConnectContext'
import { useAuth } from './contexts/AuthContext'
import { usePlayer } from './contexts/PlayerContext'
import { useLiveConnect } from './contexts/LiveConnectContext'
import { useAppContext } from './contexts/AppContext'

import { usePlaylists } from './contexts/PlaylistContext';
import AsyncArtistImage from './components/AsyncArtistImage';

import DownloadContainer from './components/DownloadContainer'
import './App.css'

const WidgetPlugin = registerPlugin('WidgetPlugin');
const NativeAudio = registerPlugin('NativeAudio');

// Safe cross-device sync: adds a playlist ID to user doc without overwriting other saved IDs
const arrayUnionUpdateUserDoc = (uid, playlistId) => {
  if (!uid || !playlistId) return;
  updateDoc(doc(db, 'users', uid), { savedPlaylistIds: arrayUnion(playlistId) })
    .catch(e => console.warn('Could not sync savedPlaylistIds to user doc:', e));
};

function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 2500)

    // Detect if device is a mobile phone/tablet to disable green focus outlines
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = isTouchDevice || Capacitor.isNativePlatform();
    if (isMobile) {
      document.body.classList.add('mobile-app');
    }

    return () => clearTimeout(timer)
  }, [])

  // Dynamic async loading of heavy data files
  useEffect(() => {
    const loadData = async () => {
      try {
        window.defaultSongsRaw = [];
        window.defaultSongs = [];
        window.defaultPlaylists = [];

        setActivePlaybackQueue(prev => {
          if (prev.length === 0) return [];
          return prev;
        });

      } catch (err) {
        console.error("Error loading static data dynamically:", err);
      }
    };

    loadData();
  }, []);



  // Global States
  const { activeDeviceId, isLocalDeviceActive, isDeviceModalOpen, setIsDeviceModalOpen, remotePlaybackState, sendCommand, incomingCommand, setIncomingCommand, broadcastState } = useDeviceConnect();
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [activeTab, setActiveTab] = useState('home')

  // Auth & Sync States
  const {
    currentUser,
    isUserDataLoaded,
    userData,
    likedSongs,
    listeningActivity,
    setListeningActivity,
    playsCount,
    setPlaysCount,
    artistPlays,
    setArtistPlays,
    dailyPlays,
    setDailyPlays,
    isDarkMode,
    setIsDarkMode,
    savedPlaylistIds,
    setSavedPlaylistIds,
    toggleLike
  } = useAuth();

  // Live Connect States
  const {
    isLiveConnectOpen, setIsLiveConnectOpen,
    liveSessionId, liveSessionRole, liveSessionCode,
    joinCodeInput, setJoinCodeInput,
    isLiveConnected, liveGuestCount,
    startLiveSession, joinLiveSession, disconnectLiveSession
  } = useLiveConnect();

  // Player States
  const {
    audioRef,
    currentTrack, setCurrentTrack,
    isPlaying, setIsPlaying,
    isLoadingSong,
    currentTime, setCurrentTime,
    duration, setDuration,
    isShuffleMode, toggleShuffle,
    currentTrackIndex, setCurrentTrackIndex,
    activePlaybackQueue, setActivePlaybackQueue,
    downloadedSongs, setDownloadedSongs,
    playSong, playNextSong, playPreviousSong, togglePlay,
    prefetchSong, preloadAudioFile
  } = usePlayer();

  const [prefetchingNext, setPrefetchingNext] = useState(false)
  const [isDesktopFullscreenOpen, setIsDesktopFullscreenOpen] = useState(false)
  const [isEarPodsActive, setIsEarPodsActive] = useState(false)

  const hasAttemptedAutoResume = useRef(false);
  useEffect(() => {
    if (!hasAttemptedAutoResume.current && currentTrack) {
      hasAttemptedAutoResume.current = true;
      let retries = 0;
      const checkAudio = setInterval(() => {
        if (Capacitor.isNativePlatform() || (audioRef && audioRef.current)) {
          clearInterval(checkAudio);
          playSong(currentTrack).catch(e => console.log('Auto-play blocked', e));
        } else {
          retries++;
          if (retries >= 10) {
            clearInterval(checkAudio);
            console.warn('Auto-resume timed out: audio component never became ready.');
          }
        }
      }, 500);
      return () => clearInterval(checkAudio);
    }
  }, [currentTrack, audioRef, playSong]);

  // Error Boundary State
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const errorHandler = (e) => {
      const msg = e.message || e.reason?.message || JSON.stringify(e) || '';
      if (typeof msg === 'string' && (msg.toLowerCase().includes('missing or insufficient permissions') || msg.toLowerCase().includes('quota exceeded') || msg.toLowerCase().includes('failed to fetch'))) {
        console.warn('Ignored non-fatal error:', msg);
        return;
      }
      setHasError(true)
      setErrorMessage(msg)
    }
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', errorHandler)
    return () => {
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', errorHandler)
    }
  }, [])

  // Redesign States
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [isMelophileOpen, setIsMelophileOpen] = useState(false)
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false)
  const [isNowPlayingClosing, setIsNowPlayingClosing] = useState(false)
  const [showUpNext, setShowUpNext] = useState(false)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [isFloatingPlayer, setIsFloatingPlayer] = useState(false)
  const [floatingPos, setFloatingPos] = useState({ x: 20, y: 150 })
  const [preventClick, setPreventClick] = useState(false)
  const longPressTimerRef = useRef(null)
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0 })

  useEffect(() => {
    const handleGlobalTouchMove = (e) => {
      if (!dragRef.current.isDragging) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      setFloatingPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy
      });
    };
    const handleGlobalTouchEnd = () => {
      dragRef.current.isDragging = false;
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalTouchEnd);
    window.addEventListener('mousemove', handleGlobalTouchMove);
    window.addEventListener('mouseup', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('mousemove', handleGlobalTouchMove);
      window.removeEventListener('mouseup', handleGlobalTouchEnd);
    };
  }, []);

  const handleMiniPlayerTouchStart = (e) => {
    setPreventClick(false)
    const touch = e.touches ? e.touches[0] : e;
    const clientX = touch.clientX || touch.screenX || 0;
    const clientY = touch.clientY || touch.screenY || 0;

    longPressTimerRef.current = setTimeout(() => {
      setIsFloatingPlayer(true)
      setPreventClick(true)

      const newX = clientX - 30;
      const newY = clientY - 30;
      setFloatingPos({ x: newX, y: newY })

      dragRef.current = {
        isDragging: true,
        startX: clientX,
        startY: clientY,
        initialX: newX,
        initialY: newY
      };
    }, 400)
  }
  const handleMiniPlayerTouchEnd = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }
  const handleMiniPlayerTouchMove = (e) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }

  const handleFloatingTouchStart = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    dragRef.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: floatingPos.x,
      initialY: floatingPos.y
    };
  }

  const handleFloatingTouchMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - dragRef.current.startX;
    const dy = touch.clientY - dragRef.current.startY;
    setFloatingPos({ x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy });
  }

  const handleFloatingTouchEnd = () => {
    setTimeout(() => { dragRef.current.isDragging = false; }, 50);
  }
  const [showAllComposers, setShowAllComposers] = useState(false);
  // artistPlays and listeningActivity are synced via AuthContext

  const lastCountedTrackIdRef = useRef(null);

  // Track plays when a new song starts
  useEffect(() => {
    if (currentTrack && isPlaying && isLocalDeviceActive) {
      const trackIdentifier = currentTrack.id || currentTrack.title;
      if (lastCountedTrackIdRef.current !== trackIdentifier) {
        lastCountedTrackIdRef.current = trackIdentifier;

        setPlaysCount(prev => {
          const newCount = prev + 1;
          localStorage.setItem('plays_count', newCount.toString());
          return newCount;
        });

        setDailyPlays(prev => {
          const newDaily = [...prev];
          const dayIdx = (new Date().getDay() + 6) % 7; // Monday=0, Sunday=6
          newDaily[dayIdx] = (newDaily[dayIdx] || 0) + 1;
          return newDaily;
        });

        setArtistPlays(prev => {
          const newCounts = { ...prev };
          if (currentTrack.artist) {
            const artists = currentTrack.artist.split(',').map(a => a.trim());
            artists.forEach(a => {
              newCounts[a] = (newCounts[a] || 0) + 1;
            });
          }
          localStorage.setItem('artist_plays', JSON.stringify(newCounts));
          return newCounts;
        });

        setListeningActivity(prev => {
          const filtered = prev.filter(s => s.title !== currentTrack.title);
          const updated = [currentTrack, ...filtered].slice(0, 15);
          localStorage.setItem('listening_activity', JSON.stringify(updated));
          return updated;
        });

        if (currentUser && !currentUser.isAnonymous) {
          try {
            addDoc(collection(db, 'listening_history'), {
              userId: currentUser.uid,
              username: currentUser.displayName || currentUser.email || 'Unknown',
              songId: currentTrack.id || '',
              songTitle: currentTrack.title || '',
              artist: currentTrack.artist || '',
              timestamp: new Date().toISOString()
            }).catch(e => console.warn('Could not save to listening_history:', e));
          } catch (e) {
            console.error("Error saving listening history:", e);
          }
        }
      }
    }
  }, [currentTrack, isPlaying, isLocalDeviceActive, currentUser]);

  // Diagnostic utility for the user to cross check broken songs
  useEffect(() => {
    window.crossCheckSongs = async () => {
      console.log("%c[Diagnostics] Starting cross-check of all songs...", "color: #1ed760; font-weight: bold; font-size: 14px;");
      const allPlaylists = [
        ...(window.defaultPlaylists || [])
      ];

      let brokenSongs = [];
      let totalChecked = 0;

      for (const pl of allPlaylists) {
        if (!pl.songs) continue;
        console.log(`Checking playlist: ${pl.name} (${pl.songs.length} songs)`);
        for (const song of pl.songs) {
          totalChecked++;
          try {
            // Check if already fetched/cached locally
            if (song.audioUrl && song.audioUrl.includes('saavncdn')) continue;

            const result = await getPlayableStreamForSong(song);
            if (!result || !result.audioUrl) {
              console.warn(`❌ Not found: "${song.title}" - ${song.artist}`);
              brokenSongs.push({ playlist: pl.name, title: song.title, artist: song.artist });
            }
          } catch (err) {
            console.error(`Error checking "${song.title}":`, err);
          }
          // Small delay to prevent API rate limiting
          await new Promise(r => setTimeout(r, 200));
        }
      }

      console.log("%c[Diagnostics] Cross-check complete!", "color: #1ed760; font-weight: bold; font-size: 14px;");
      console.log(`Total Checked: ${totalChecked}`);
      console.log(`Broken Songs: ${brokenSongs.length}`);
      if (brokenSongs.length > 0) {
        console.table(brokenSongs);
      } else {
        console.log("All songs found successfully! 🎉");
      }
    };
    return () => {
      delete window.crossCheckSongs;
    };
  }, []);

  const [artistSongs, setArtistSongs] = useState([])
  const [isLoadingArtistSongs, setIsLoadingArtistSongs] = useState(false)

  // Playlist States
  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem('playlists')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  })

  // Fetch playlists from Firestore and merge with local storage
  useEffect(() => {
    let unsubscribeSnapshot = null;
    let unsubscribeUserDoc = null;

    const setupSnapshot = () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      unsubscribeSnapshot = onSnapshot(collection(db, 'playlists'), (snapshot) => {
        const playlistsData = snapshot.docs.map(doc => {
          const data = doc.data();
          if (data.songs && Array.isArray(data.songs)) {
            data.songs = data.songs
              .filter(song => {
                const lang = (song.language || '').toLowerCase();
                const genre = (song.genre || '').toLowerCase();
                const isDevotional = genre.includes('devotional') || genre.includes('spiritual') || genre.includes('bhakti');
                return (lang === 'tamil' || lang === 'unknown' || lang === '') && !isDevotional;
              })
              .map(song => ({
                ...song,
                title: (song.title || '').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim()
              }));
          }
          return {
            id: doc.id,
            ...data
          };
        })
        setPlaylists(prevPlaylists => {
          const remoteIds = new Set(playlistsData.map(p => p.id));
          const localOnly = prevPlaylists.filter(p => !remoteIds.has(p.id));
          const merged = [...playlistsData, ...localOnly];
          localStorage.setItem('playlists', JSON.stringify(merged));
          return merged;
        })
      }, (error) => {
        console.error("Error fetching playlists: ", error)
      })
    };

    setupSnapshot();

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    }
  }, [])

  useEffect(() => {
    if (currentUser && !currentUser.isAnonymous) {
      setIsAccountSettingsOpen(false);
    } else if (!currentUser) {
      setIsAccountSettingsOpen(true);
    }
  }, [currentUser]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('')
  const [playlistSearchResults, setPlaylistSearchResults] = useState([])
  const [isSearchingPlaylistSongs, setIsSearchingPlaylistSongs] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistImg, setNewPlaylistImg] = useState('')
  const [newPlaylistLink, setNewPlaylistLink] = useState('')
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [showEditCoverModal, setShowEditCoverModal] = useState(false)
  const [editCoverImg, setEditCoverImg] = useState('')
  const { isAccountSettingsOpen, setIsAccountSettingsOpen } = useAppContext()



  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setIsDownloadOpen(true);
      // triggerToast('You are offline. Showing downloaded songs.');
    };
    const handleOnline = () => {
      setIsOffline(false);
      // triggerToast('You are back online!');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Check initial state on mount
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);



  const [isDownloadOpen, setIsDownloadOpen] = useState(!navigator.onLine)

  const [isLikedSongsOpen, setIsLikedSongsOpen] = useState(false)

  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchPlaylistsResults, setSearchPlaylistsResults] = useState([])
  const [selectedSaavnPlaylist, setSelectedSaavnPlaylist] = useState(null)
  const [isLoadingSaavnPlaylist, setIsLoadingSaavnPlaylist] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Persist Audio State
  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('lastPlayedTrack', JSON.stringify(currentTrack));
      localStorage.setItem('lastTrackIndex', currentTrackIndex.toString());
    }
  }, [currentTrack, currentTrackIndex]);

  useEffect(() => {
    if (activePlaybackQueue && activePlaybackQueue.length > 0) {
      try {
        // Limit to 50 songs and strip large audio URL fields to stay well under
        // the 5 MB localStorage quota. Audio URLs are re-fetched at play time.
        const queueToSave = activePlaybackQueue.slice(0, 50).map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          img: t.img,
          duration: t.duration,
          language: t.language,
          genre: t.genre,
          // keep audioUrl only if it looks like a real local/downloaded file
          audioUrl: t.audioUrl && (t.audioUrl.startsWith('file://') || t.audioUrl.startsWith('blob:'))
            ? t.audioUrl
            : undefined,
        }));
        localStorage.setItem('lastPlaybackQueue', JSON.stringify(queueToSave));
      } catch (e) {
        // QuotaExceededError — storage is full; silently skip persisting the queue
        console.warn('Could not persist playback queue to localStorage:', e.message);
      }
    }
  }, [activePlaybackQueue]);

  // Init Widget State & MediaSession
  useEffect(() => {
    if (currentTrack && Capacitor.isNativePlatform()) {
      try {
        WidgetPlugin.updateWidget({
          title: currentTrack.title || 'Vibeflow',
          artist: currentTrack.artist || 'Ready to play',
          isPlaying: false,
          imageUrl: getSongImage(currentTrack) || ''
        });
      } catch (e) { console.log('Widget init update error', e); }

      try {
        MediaSession.setMetadata({
          title: currentTrack.title || 'Vibeflow',
          artist: currentTrack.artist || 'Unknown',
          album: 'Vibeflow',
          artwork: [{ src: getSongImage(currentTrack) || '' }]
        });
      } catch (e) { console.log('MediaSession error', e); }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      MediaSession.setActionHandler({ action: 'play' }, () => callbacksRef.current?.togglePlay?.(true));
      MediaSession.setActionHandler({ action: 'pause' }, () => callbacksRef.current?.togglePlay?.(false));
      MediaSession.setActionHandler({ action: 'previoustrack' }, () => callbacksRef.current?.playPreviousSong?.());
      MediaSession.setActionHandler({ action: 'nexttrack' }, () => callbacksRef.current?.playNextSong?.());
    }
  }, []);

  // Offline detection
  useEffect(() => {
    const handleOffline = () => {
      setIsDownloadOpen(true);
      triggerToast('You are offline. Showing downloaded songs.');
    };

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);



  // Always-current ref for currentTrack — prevents stale closures in async callbacks
  const currentTrackRef = useRef(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Equalizer States
  const [showEqModal, setShowEqModal] = useState(false)
  const [eqGains, setEqGains] = useState([0, 0, 0, 0, 0])
  const eqFrequencies = [60, 230, 910, 3600, 14000]
  const eqBandsRef = useRef([])

  // Web Audio API refs for processing
  const audioCtxRef = useRef(null)
  const gainNodeRef = useRef(null)
  const sourceNodeRef = useRef(null)
  const analyserNodeRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [visualizerData, setVisualizerData] = useState(new Uint8Array(16))

  const initAudioProcessing = () => {
    if (!audioCtxRef.current && audioRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaElementSource(audioRef.current);
        const gainNode = ctx.createGain();

        // Create EQ Bands
        let prevNode = source;
        const eqBands = eqFrequencies.map((freq, i) => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = eqGains[i];
          prevNode.connect(filter);
          prevNode = filter;
          return filter;
        });

        eqBandsRef.current = eqBands;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // 32 bins
        analyserNodeRef.current = analyser;

        prevNode.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);

        sourceNodeRef.current = source;
        gainNodeRef.current = gainNode;

        const slider = document.getElementById('np-vol-slider');
        if (slider) {
          gainNode.gain.value = parseFloat(slider.value);
        }
      } catch (err) {
        console.error("AudioContext setup failed:", err);
      }
    } else if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const handleEqChange = (index, value) => {
    const newGains = [...eqGains];
    newGains[index] = value;
    setEqGains(newGains);
    if (eqBandsRef.current[index]) {
      eqBandsRef.current[index].gain.value = value;
    }
  };

  // Visualizer Render Loop
  useEffect(() => {
    const renderLoop = () => {
      if (analyserNodeRef.current && isPlaying) {
        const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
        analyserNodeRef.current.getByteFrequencyData(dataArray);

        const bars = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
          bars[i] = dataArray[i * 2] || 0;
        }
        setVisualizerData(bars);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    if (isPlaying) {
      renderLoop();
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // PiP Window
  const [pipWindow, setPipWindow] = useState(null)

  const callbacksRef = useRef({});
  useEffect(() => {
    callbacksRef.current = {
      playNextSong, playPreviousSong, togglePlay, onAudioEnded: undefined, prefetchNextTrack: undefined, onTrackChanged: (data) => {
        const { index } = data;
        if (activePlaybackQueue && activePlaybackQueue[index]) {
          setCurrentTrack(activePlaybackQueue[index]);
          setCurrentTrackIndex(index);
        }
      }
    };
  }, [playNextSong, playPreviousSong, togglePlay, activePlaybackQueue, setCurrentTrack, setCurrentTrackIndex]);



  const triggerToast = (message) => {
    setToastMessage(message)
    setShowToast(true)
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);

    if (!isLocalDeviceActive) {
      sendCommand('volume', { volume: val });
    } else if (audioRef.current) {
      audioRef.current.volume = Math.min(val, 1);
    }

    // Sync all volume sliders
    const sliders = document.querySelectorAll('input[type="range"].np-volume-slider, input[type="range"].fullscreen-volume-slider');
    sliders.forEach(slider => {
      if (slider !== e.target) {
        slider.value = val;
      }
    });


  };

  // Handle Toast timeout
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  // Sync theme variables
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--bg-color', '#000000'); // Premium OLED Black
      root.style.setProperty('--text-color', '#ffffff');
      root.style.setProperty('--text-secondary', '#a1a1aa'); // Zinc 400
      root.style.setProperty('--card-bg', 'rgba(24, 24, 27, 0.6)'); // Translucent dark
      root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--panel-bg', 'rgba(9, 9, 11, 0.8)');
      root.style.setProperty('--input-bg', 'rgba(255, 255, 255, 0.05)');
      root.style.setProperty('--input-border', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--hover-bg', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--bar-bg', 'rgba(0, 0, 0, 0.7)');
      root.style.setProperty('--artist-sheet-bg', '#000000');
      root.style.setProperty('--player-bar-bg', 'rgba(0, 0, 0, 0.85)');
      root.style.setProperty('--card-orange', '#ff5c39'); // Vibrant premium orange/red
      localStorage.setItem('theme', 'dark');
    } else {
      root.style.setProperty('--bg-color', '#bab9b9'); // Dull gray
      root.style.setProperty('--text-color', '#1a1a1c');
      root.style.setProperty('--text-secondary', '#5e5e65');
      root.style.setProperty('--card-bg', 'rgba(230, 230, 230, 0.6)'); // Translucent gray
      root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.08)');
      root.style.setProperty('--panel-bg', 'rgba(210, 210, 210, 0.9)');
      root.style.setProperty('--input-bg', 'rgba(0, 0, 0, 0.04)');
      root.style.setProperty('--input-border', 'rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--hover-bg', 'rgba(0, 0, 0, 0.06)');
      root.style.setProperty('--bar-bg', 'rgba(183, 183, 188, 0.8)');
      root.style.setProperty('--artist-sheet-bg', '#dedede');
      root.style.setProperty('--player-bar-bg', 'rgba(200, 200, 200, 0.85)');
      root.style.setProperty('--card-orange', '#f55c27'); // Slightly darker for light mode
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Escape key to exit fullscreen player
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDesktopFullscreenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update browser tab title and favicon to currently playing song
  useEffect(() => {
    setPrefetchingNext(false);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    if (currentTrack) {
      const play = isPlaying ? '▶ ' : '⏸ ';
      document.title = `${play}${currentTrack.title} • ${currentTrack.artist}`;
      link.href = currentTrack.img || '/vite.svg';
    } else {
      document.title = 'Melophile';
      link.href = '/vite.svg';
    }

    // MediaSession API for OS-level background playback controls
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Unknown Album',
        artwork: [
          { src: currentTrack.img || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.img || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.img || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', sizes: '256x256', type: 'image/jpeg' }
        ]
      });
    }
  }, [currentTrack, isPlaying]);

  // Bind MediaSession action handlers when play methods are ready
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', playPreviousSong);
      navigator.mediaSession.setActionHandler('nexttrack', playNextSong);
      navigator.mediaSession.setActionHandler('stop', () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      });

      // Seek handlers for better lock screen widget integration
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - skipTime, 0);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + skipTime, audioRef.current.duration);
        }
      });
    }
  }, [currentTrack, activePlaybackQueue, currentTrackIndex]);

  // Preload the next track's audio URL to ensure gapless playback and background continuous play
  useEffect(() => {
    if (activePlaybackQueue.length === 0 || currentTrackIndex === -1) return;

    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= activePlaybackQueue.length) {
      nextIndex = 0; // loop back
    }

    const nextSong = activePlaybackQueue[nextIndex];
    if (nextSong) {
      if (!nextSong.audioUrl || nextSong.audioUrl.includes('audio_url_') || nextSong.audioUrl.includes('placeholder_url')) {
        const fetchNext = async () => {
          try {
            const playableResult = await getPlayableStreamForSong(nextSong);
            if (playableResult && playableResult.audioUrl) {
              setActivePlaybackQueue(prev => {
                const newQueue = [...prev];
                // only update if it hasn't been updated already
                if (!newQueue[nextIndex].audioUrl || newQueue[nextIndex].audioUrl.includes('audio_url_')) {
                  const isDummy = !newQueue[nextIndex].img ||
                    newQueue[nextIndex].img.includes('image_url_') ||
                    newQueue[nextIndex].img.includes('placeholder_url') ||
                    newQueue[nextIndex].img.includes('image_4566c3') ||
                    newQueue[nextIndex].img.startsWith('image_') ||
                    newQueue[nextIndex].img.startsWith('images/');

                  const finalImg = isDummy ? playableResult.img : newQueue[nextIndex].img;
                  newQueue[nextIndex] = {
                    ...newQueue[nextIndex],
                    audioUrl: playableResult.audioUrl,
                    duration: playableResult.duration || newQueue[nextIndex].duration,
                    img: finalImg || newQueue[nextIndex].img
                  };
                }
                return newQueue;
              });
              // Preload the resolved audio file
              preloadAudioFile(playableResult.audioUrl);
            }
          } catch (e) {
            console.error("Failed to preload next track", e);
          }
        };
        fetchNext();
      } else {
        // If next song already has a resolved audioUrl, preload it
        preloadAudioFile(nextSong.audioUrl);
      }
    }

    // Also preload the song after that (currentTrackIndex + 2) if it is already resolved
    let nextIndex2 = currentTrackIndex + 2;
    if (nextIndex2 >= activePlaybackQueue.length) {
      nextIndex2 = nextIndex2 % activePlaybackQueue.length;
    }
    const nextSong2 = activePlaybackQueue[nextIndex2];
    if (nextSong2 && nextSong2.audioUrl && !nextSong2.audioUrl.includes('audio_url_') && !nextSong2.audioUrl.includes('placeholder_url')) {
      preloadAudioFile(nextSong2.audioUrl);
    }
  }, [currentTrackIndex, activePlaybackQueue, preloadAudioFile]);

  // Reset sub-views when tab changes
  useEffect(() => {
    setIsMelophileOpen(false)
    setSelectedArtist(null)
    setSelectedPlaylist(null)
    setIsLikedSongsOpen(false)
    setPlaylistSearchQuery('')
    setPlaylistSearchResults([])
    setSelectedSaavnPlaylist(null)
  }, [activeTab])

  // Real-time debounced search
  useEffect(() => {
    if (activeTab !== 'search') return;

    const delayDebounceFn = setTimeout(() => {
      if (!searchQuery.trim()) {
        const loadTrending = async () => {
          setIsSearching(true)

          const localMatches = (window.defaultSongsRaw || []).slice(0, 40);
          setSearchResults(localMatches);

          const mappedPlaylists = playlists.filter(p => !p.hidden).map(p => ({
            ...p,
            title: p.name,
            songCount: p.songs?.length || 0,
            isCommunity: true
          }));
          const uniquePlaylists = Array.from(new Map(mappedPlaylists.map(item => [item.title, item])).values());

          setSearchPlaylistsResults([...uniquePlaylists]);

          const songs = await searchSongs('latest Tamil songs', 100)
          setSearchResults(songs)
          setIsSearching(false)
        }
        loadTrending()
      } else {
        const performSearch = async () => {
          setIsSearching(true)

          // Instant Local Search
          const lowerQuery = searchQuery.toLowerCase();
          const localMatches = (window.defaultSongsRaw || []).filter(song =>
            song.title?.toLowerCase().includes(lowerQuery) ||
            song.artist?.toLowerCase().includes(lowerQuery) ||
            song.album?.toLowerCase().includes(lowerQuery)
          ).slice(0, 40);

          setSearchResults(localMatches);

          // Always show community playlists, optionally bringing matched ones to the front
          const matchedPlaylists = playlists.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const unmatchedPlaylists = playlists.filter(p =>
            !p.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.hidden
          );

          const communityPlaylists = [...matchedPlaylists, ...unmatchedPlaylists].map(p => ({
            ...p,
            title: p.name,
            songCount: p.songs?.length || 0,
            isCommunity: true
          }))

          const uniqueCommunityPlaylists = Array.from(new Map(communityPlaylists.map(item => [item.title, item])).values());

          setSearchPlaylistsResults([...uniqueCommunityPlaylists])

          // Network Search
          const songs = await searchSongs(searchQuery, 100)

          setSearchResults(prev => {
            const merged = [...prev];
            const existingIds = new Set(merged.map(m => m.id));
            songs.forEach(s => {
              if (!existingIds.has(s.id)) {
                merged.push(s);
              }
            });
            return merged;
          });
          setIsSearching(false)
        }
        performSearch()
      }
    }, 200) // 200ms debounce

    return () => clearTimeout(delayDebounceFn)
  }, [activeTab, searchQuery, playlists])

  // Load artist songs from JioSaavn when selected
  useEffect(() => {
    if (selectedArtist) {
      const fetchArtistSongs = async () => {
        setIsLoadingArtistSongs(true)
        let query = `${selectedArtist.name} Tamil songs`
        let limit = 40
        const name = selectedArtist.name.toLowerCase()

        if (name.includes('anirudh')) {
          query = 'Anirudh Ravichander Tamil'
          limit = 160
        } else if (name.includes('rahman')) {
          query = 'A.R. Rahman Tamil'
          limit = 1000
        } else if (name.includes('harris')) {
          query = 'Harris Jayaraj Tamil'
          limit = 550
        } else if (name.includes('yuvan')) {
          query = 'Yuvan Shankar Raja Tamil'
          limit = 550
        } else if (name.includes('ilaiyaraaja') || name.includes('ilayaraja')) {
          query = 'Ilaiyaraaja Tamil'
          limit = 950
        } else if (name.includes('deva')) {
          query = 'Deva Tamil hits'
          limit = 500
        } else if (name.includes('dhina')) {
          query = 'Dhina composer Tamil'
          limit = 100
        } else if (name.includes('vidyasagar')) {
          query = 'Vidyasagar Tamil'
          limit = 300
        } else if (name.includes('imman')) {
          query = 'D. Imman Tamil'
          limit = 300
        } else if (name.includes('prakash')) {
          query = 'G.V. Prakash Kumar Tamil'
          limit = 550
        } else if (name.includes('hiphop') || name.includes('tamizha')) {
          query = 'Hiphop Tamizha Tamil'
          limit = 200
        } else if (name.includes('santhosh') || name.includes('narayanan')) {
          query = 'Santhosh Narayanan Tamil'
          limit = 300
        } else if (name.includes('srikanth')) {
          query = 'Srikanth Deva Tamil'
          limit = 100
        }

        const results = await searchSongs(query, limit)

        let filteredResults = [];
        const seenTitles = new Set();

        // For Deva, JioSaavn might return the singers as the primary artists.
        // So we won't strictly filter out if 'deva' isn't in the artist list,
        // because the 'Deva Tamil hits' query mostly returns his songs.
        const isDeva = name.includes('deva');

        results.forEach(song => {
          const titleLower = song.title.toLowerCase();

          // We removed the strict 'deva' artist check here because it blocked legitimate Deva songs.

          const albumLower = (song.album || '').toLowerCase();
          const isNonOriginal =
            titleLower.includes('lofi') ||
            titleLower.includes('lo-fi') ||
            titleLower.includes('remix') ||
            titleLower.includes('cover') ||
            titleLower.includes('karaoke') ||
            titleLower.includes('instrumental') ||
            titleLower.includes('snippet') ||
            titleLower.includes('teaser') ||
            titleLower.includes('promo') ||
            titleLower.includes('tribute') ||
            titleLower.includes('unplugged') ||
            titleLower.includes('acoustic') ||
            titleLower.includes('reprise') ||
            titleLower.includes('mashup') ||
            titleLower.includes('dj') ||
            titleLower.includes('mix') ||
            titleLower.includes('version') ||
            titleLower.includes('ringtone') ||
            titleLower.includes('bgm') ||
            albumLower.includes('shivaratri') ||
            albumLower.includes('devotional') ||
            albumLower.includes('bhakti');

          if (!isNonOriginal) {
            const normalizedTitle = titleLower.replace(/\s*\(from\s+[^)]+\)/g, '').trim();
            if (!seenTitles.has(normalizedTitle)) {
              seenTitles.add(normalizedTitle);
              filteredResults.push(song);
            }
          }
        });

        // If Deva filter removed everything, fall back without artist filter
        if (isDeva && filteredResults.length === 0) {
          results.forEach(song => {
            const titleLower = song.title.toLowerCase();
            const isNonOriginal =
              titleLower.includes('lofi') || titleLower.includes('lo-fi') ||
              titleLower.includes('remix') || titleLower.includes('cover') ||
              titleLower.includes('karaoke') || titleLower.includes('bgm');
            if (!isNonOriginal) {
              const normalizedTitle = titleLower.replace(/\s*\(from\s+[^)]+\)/g, '').trim();
              if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                filteredResults.push(song);
              }
            }
          });
        }

        setArtistSongs(filteredResults)
        setIsLoadingArtistSongs(false)
      }
      fetchArtistSongs()
    } else {
      setArtistSongs([])
    }
  }, [selectedArtist])



  // Toggle offline download
  const toggleDownload = async (song, e) => {
    if (e) e.stopPropagation();
    if (!song) return;

    const exists = downloadedSongs.find(s => s.id === song.id || s.title === song.title);

    if (exists) {
      if (exists.localPath && Capacitor.isNativePlatform()) {
        try {
          await Filesystem.deleteFile({
            path: exists.localPath,
            directory: Directory.Data
          });
        } catch (err) {
          console.error("Error deleting downloaded file", err);
        }
      } else if (!Capacitor.isNativePlatform() && exists.nativeUrl && exists.nativeUrl.startsWith('idb://')) {
        const idbKey = exists.nativeUrl.replace('idb://', '');
        try {
          await deleteSongBlob(idbKey);
        } catch (e) {
          console.error("Error deleting IDB blob", e);
        }
      }
      setDownloadedSongs(prev => {
        const newDownloads = prev.filter(s => s.id !== song.id && s.title !== song.title);
        localStorage.setItem('downloadedSongs', JSON.stringify(newDownloads));
        return newDownloads;
      });
      triggerToast('Removed from downloads');
    } else {
      triggerToast('Starting download...');
      try {
        let streamUrl = song.audioUrl;
        if (!streamUrl || streamUrl.includes('audio_url_') || streamUrl.includes('placeholder_url')) {
          const playableResult = await getPlayableStreamForSong(song);
          streamUrl = playableResult?.audioUrl;
        }
        if (!streamUrl) throw new Error("No stream URL");

        const fileName = `vibeflow_${song.id || Date.now()}.mp3`;
        let fileUri = '';

        if (Capacitor.isNativePlatform()) {
          // Native file download bypassing JS fetch memory limits
          const result = await Filesystem.downloadFile({
            url: streamUrl,
            path: fileName,
            directory: Directory.Data,
            recursive: true
          });
          // Capacitor Filesystem returns path/uri
          fileUri = result.path || result.uri || '';

          setDownloadedSongs(prev => {
            const newSong = { ...song, localPath: fileName, nativeUrl: fileUri, audioUrl: fileUri || streamUrl };
            const newDownloads = [...prev, newSong];
            localStorage.setItem('downloadedSongs', JSON.stringify(newDownloads));
            return newDownloads;
          });
          triggerToast('Downloaded offline!');
        } else {
          // Web platform download implementation
          const response = await fetch(streamUrl);
          if (!response.ok) throw new Error("Network error fetching audio");
          const blob = await response.blob();

          // Trigger actual browser download
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);

          // Save for offline playback in web app
          const idbKey = song.id || fileName;
          try {
            await saveSongBlob(idbKey, blob);
            fileUri = `idb://${idbKey}`;
          } catch (e) {
            console.error("IDB save failed", e);
          }

          setDownloadedSongs(prev => {
            const newSong = { ...song, localPath: fileName, nativeUrl: fileUri, audioUrl: fileUri || streamUrl };
            const newDownloads = [...prev, newSong];
            localStorage.setItem('downloadedSongs', JSON.stringify(newDownloads));
            return newDownloads;
          });
          triggerToast('Downloaded offline!');
        }
      } catch (err) {
        console.error("Download failed:", err);
        triggerToast("Download failed. Try again.");
      }
    }
  };

  const handleShare = (song, e) => {
    if (e) e.stopPropagation();
    if (!song) return;
    const title = `Listen to ${song.title} by ${song.artist}`;
    const text = `I'm listening to ${song.title} by ${song.artist} on Vibeflow! 🎧🔥`;
    const url = window.location.origin;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(err => console.log('Error sharing:', err));
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      triggerToast('Link copied to clipboard!');
    }
  };



  /*
  // Play a song
  const playSong = async (song, index = -1, queueToUse = null) => {
    try {
      setIsLoadingSong(true)
      setIsPlaying(false)
      triggerToast(`Loading "${song.title || song.name}"...`)

      if (queueToUse) {
        setActivePlaybackQueue(queueToUse)
      }

      const list = queueToUse || activePlaybackQueue
      let targetIndex = index;
      if (targetIndex === -1) {
        targetIndex = list.findIndex(s => s.id === song.id || s.title?.toLowerCase() === song.title?.toLowerCase());
      }
      setCurrentTrackIndex(targetIndex);

      let trackToPlay = { ...song }

      const downloadedVersion = downloadedSongs.find(s => s.id === trackToPlay.id || s.title === trackToPlay.title);

      if (downloadedVersion && downloadedVersion.nativeUrl && Capacitor.isNativePlatform()) {
        // Play local file
        trackToPlay.audioUrl = Capacitor.convertFileSrc(downloadedVersion.nativeUrl);
      } else if (!song.audioUrl || song.audioUrl.includes('audio_url_') || song.audioUrl.includes('placeholder_url')) {
        let playableResult = await getPlayableStreamForSong(song);

        if (playableResult) {
          // DO NOT overwrite the track; just pull the audio URL and duration!
          // Also pull the real image if the current one is a dummy!
          let finalImg = trackToPlay.img;
          const isDummy = !finalImg ||
            finalImg.includes('image_url_') ||
            finalImg.includes('placeholder_url') ||
            finalImg.includes('image_4566c3') ||
            finalImg.startsWith('image_') ||
            finalImg.startsWith('images/');
          if (isDummy) {
            finalImg = playableResult.img;
          }

          trackToPlay = {
            ...trackToPlay,
            audioUrl: playableResult.audioUrl,
            duration: playableResult.duration || trackToPlay.duration,
            img: finalImg || trackToPlay.img
          }

          // Update the queue so the fetched URL is saved
          setActivePlaybackQueue(prev => {
            const newQueue = [...prev];
            if (newQueue[targetIndex]) {
              newQueue[targetIndex] = trackToPlay;
            }
            return newQueue;
          });

        } else {
          triggerToast('Could not find a playable stream for this song.')
          setIsLoadingSong(false)
          setTimeout(() => playNextSong(), 1500)
          return;
        }
      }

      setCurrentTrack(trackToPlay)
      if (trackToPlay.duration) {
        setDuration(parseInt(trackToPlay.duration, 10) || 0)
      }

      // Update audio source and play
      // If a remote device is active, just send the command — do NOT count local stats
      if (!isLocalDeviceActive) {
        sendCommand('transfer_playback', { track: trackToPlay, time: 0 });
        setIsPlaying(true);
        setIsLoadingSong(false);
        return;
      }

      // Only increment stats when this device is actually playing locally
      setPlaysCount(prev => prev + 1)
      setDailyPlays(prev => {
        const newDaily = [...prev];
        const dayIdx = (new Date().getDay() + 6) % 7;
        newDaily[dayIdx] = (newDaily[dayIdx] || 0) + 1;
        return newDaily;
      })
      setArtistPlays(prev => {
        const newCounts = { ...prev };
        if (trackToPlay.artist) {
          const artists = trackToPlay.artist.split(',').map(a => a.trim());
          artists.forEach(a => {
            newCounts[a] = (newCounts[a] || 0) + 1;
          });
        }
        return newCounts;
      });
      setListeningActivity(prev => {
        const filtered = prev.filter(s => s.title !== trackToPlay.title)
        const updated = [trackToPlay, ...filtered].slice(0, 15)
        localStorage.setItem('listening_activity', JSON.stringify(updated))
        return updated
      })

      if (Capacitor.isNativePlatform()) {
        NativeAudio.play({
          url: trackToPlay.audioUrl,
          title: trackToPlay.title,
          artist: trackToPlay.artist,
          coverUrl: trackToPlay.img
        });
        NativeAudio.updateQueue({
          queue: (queueToUse || activePlaybackQueue).map(t => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            img: t.img && !t.img.startsWith('images/') ? t.img : `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop`,
            audioUrl: t.audioUrl || ''
          })),
          index: targetIndex
        }).catch(e => console.log('Native update queue error', e));
        setIsPlaying(true);
        setIsLoadingSong(false);
      } else {
        if (audioRef.current) {
          audioRef.current.src = trackToPlay.audioUrl
          audioRef.current.load()

          const playPromise = audioRef.current.play()
          if (playPromise !== undefined) {
            playPromise.then(() => {
              setIsPlaying(true)
              setIsLoadingSong(false)
            }).catch(error => {
              console.log("Playback error", error)
              if (error.name !== 'AbortError') {
                setIsLoadingSong(false)
              }
            })
          } else {
            setIsLoadingSong(false)
          }
        } else {
          setIsLoadingSong(false)
        }
      }
    } catch (e) {
      console.error(e)
      triggerToast('Error streaming song.')
      setIsLoadingSong(false)
    }
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (!currentTrack) {
      playSong((window.defaultSongs || [])[0])
      return
    }

    if (!isLocalDeviceActive) {
      sendCommand(remotePlaybackState?.isPlaying ? 'pause' : 'play');
      return;
    }

    if (Capacitor.isNativePlatform()) {
      if (isPlaying) {
        NativeAudio.pause();
      } else {
        NativeAudio.play({
          url: currentTrack.audioUrl,
          title: currentTrack.title,
          artist: currentTrack.artist,
          coverUrl: currentTrack.img
        });
      }
      // State is updated via broadcast listener
    } else {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error(err))
      }
    }
  }
  */

  const connectBluetooth = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });
      triggerToast(`Connected to ${device.name || 'Bluetooth Device'}`);
      setIsEarPodsActive(true);
    } catch (error) {
      console.error(error);
      triggerToast('Bluetooth connection failed or cancelled');
      setIsEarPodsActive(false);
    }
  };

  const closeNowPlaying = () => {
    setIsNowPlayingClosing(true);
    setTimeout(() => {
      setIsNowPlayingOpen(false);
      setIsNowPlayingClosing(false);
      setShowUpNext(false);
    }, 400); // Wait for CSS slide-down animation
  }

  // Audio event listeners
  const getNextSongIndex = (list, currentIndex) => {
    let nextIndex = currentIndex + 1;
    if (nextIndex >= list.length || nextIndex === -1) {
      nextIndex = 0; // loop back
    }
    return nextIndex;
  };

  const prefetchNextTrack = async () => {
    const list = getCurrentTracklist();
    if (!list || list.length === 0) return;
    const currentIndex = currentTrackIndex !== -1 ? currentTrackIndex : 0;
    const nextIndex = getNextSongIndex(list, currentIndex);
    const nextSong = list[nextIndex];

    if (nextSong && (!nextSong.audioUrl || nextSong.audioUrl.includes('audio_url_') || nextSong.audioUrl.includes('placeholder_url'))) {
      const playableResult = await getPlayableStreamForSong(nextSong);
      if (playableResult) {
        const updatedQueue = [...list];
        const isDummy = !nextSong.img ||
          nextSong.img.includes('image_url_') ||
          nextSong.img.includes('placeholder_url') ||
          nextSong.img.includes('image_4566c3') ||
          nextSong.img.startsWith('image_') ||
          nextSong.img.startsWith('images/');
        const finalImg = isDummy ? playableResult.img : nextSong.img;
        updatedQueue[nextIndex] = {
          ...nextSong,
          audioUrl: playableResult.audioUrl,
          duration: playableResult.duration || nextSong.duration,
          img: finalImg || nextSong.img
        };
        setActivePlaybackQueue(updatedQueue);
      }
    }
  }
  const onTimeUpdate = () => {
    if (audioRef.current) {
      if (!isDraggingSlider) {
        setCurrentTime(audioRef.current.currentTime);
      }
      const dur = audioRef.current.duration;
      if (dur > 0) {
        const remaining = dur - audioRef.current.currentTime;
        if (remaining < 15 && remaining > 0 && !prefetchingNext) {
          setPrefetchingNext(true);
          prefetchNextTrack().finally(() => setPrefetchingNext(false));
        }
      }
    }
  }

  const onAudioError = async (e) => {
    console.error("Audio playback error:", e.target.error);
    // Use ref to always read the latest currentTrack, not the stale closure value
    const track = currentTrackRef.current;
    if (!track) return;

    // If the stream is a JioSaavn URL and failed to load (e.g. 403 Expired), try refreshing it!
    if (track.audioUrl && track.audioUrl.includes('saavncdn.com') && !track._isRefreshed) {
      triggerToast("Refreshing expired stream...");
      // Fetch fresh details using ID (or search if ID is dummy)
      let playableResult;
      if (track.id && typeof track.id === 'string' && track.id.length > 5) {
        playableResult = await getSongDetails(track.id);
      } else {
        playableResult = await getPlayableStreamForSong(track);
      }

      if (playableResult && playableResult.audioUrl) {
        const updatedTrack = { ...track, audioUrl: playableResult.audioUrl, _isRefreshed: true };
        setCurrentTrack(updatedTrack);
        currentTrackRef.current = updatedTrack; // keep ref in sync immediately

        // update queue
        setActivePlaybackQueue(prev => prev.map(t => (t.id === updatedTrack.id || t.title === updatedTrack.title) ? updatedTrack : t));

        // try playing again
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = updatedTrack.audioUrl;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
          }
        }, 500);
        return;
      }
    }

    triggerToast("Failed to play stream. Skipping to next...");
    setIsPlaying(false);
    setTimeout(() => playNextSong(), 1500);
  }


  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      updateMediaSessionPosition();
    }
  }

  const onAudioEnded = () => {
    setIsPlaying(false)
    playNextSong()
  }

  // Playlist Action Handlers
  const handleCreatePlaylist = async (e) => {
    e.preventDefault()

    const link = newPlaylistLink.trim();
    let finalName = newPlaylistName.trim();
    let finalImg = newPlaylistImg.trim();
    let finalSongs = [];

    if (!finalName && !link) {
      triggerToast('Please enter a playlist name or paste a link.');
      return;
    }

    setIsCreatingPlaylist(true);

    try {
      if (link) {
        if (link.includes('spotify.com')) {
          // Spotify oEmbed
          try {
            const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.title) finalName = finalName || data.title;
              if (data.thumbnail_url) finalImg = finalImg || data.thumbnail_url;

              if (data.title) {
                const saavnMatches = await searchPlaylists(data.title, 1);
                if (saavnMatches && saavnMatches.length > 0) {
                  const plDetails = await getPlaylistDetails(saavnMatches[0].id);
                  if (plDetails && plDetails.songs) {
                    finalSongs = plDetails.songs;
                  }
                }
              }
            }
          } catch (err) {
            console.error('Spotify import error:', err);
          }
        } else if (link.includes('jiosaavn.com')) {
          try {
            // extract the slug and token
            const urlObj = new URL(link);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            const token = pathSegments[pathSegments.length - 1];
            const nameSlug = pathSegments[pathSegments.length - 2];
            if (nameSlug) {
              const queryName = nameSlug.replace(/-/g, ' ');
              const saavnMatches = await searchPlaylists(queryName, 20);
              if (saavnMatches && saavnMatches.length > 0) {
                // Try to find the exact match by token, otherwise fallback to first match
                const exactMatch = saavnMatches.find(p => p.url && p.url.toLowerCase().includes(token.toLowerCase())) || saavnMatches[0];
                const plDetails = await getPlaylistDetails(exactMatch.id);
                if (plDetails) {
                  finalName = finalName || plDetails.title;
                  finalImg = finalImg || plDetails.img;
                  if (plDetails.songs) finalSongs = plDetails.songs;
                }
              }
            }
          } catch (err) {
            console.error('Saavn import error:', err);
          }
        }
      }

      if (!finalName) finalName = 'Untitled Playlist';

      const creator = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : null) || localStorage.getItem('username') || 'Anonymous'

      const docRef = doc(collection(db, 'playlists'))
      const newId = docRef.id

      const newPl = {
        id: newId,
        name: finalName,
        img: finalImg || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        songs: finalSongs,
        creator: creator,
        uid: currentUser?.uid || localStorage.getItem('tv_uid') || null,
        createdAt: Date.now()
      }

      // Update local state immediately
      const updatedPlaylists = [...playlists, newPl]
      setPlaylists(updatedPlaylists)
      localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))

      const newSaved = [...(savedPlaylistIds || []), newId];
      setSavedPlaylistIds(newSaved);
      localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));

      setNewPlaylistName('')
      setNewPlaylistImg('')
      setNewPlaylistLink('')
      setShowCreateModal(false)
      triggerToast(`Created playlist "${newPl.name}"${finalSongs.length ? ` with ${finalSongs.length} songs` : ''}!`)
      setSelectedPlaylist(newPl)
      setActiveTab('create')

      // Try to sync with Firebase
      await setDoc(docRef, newPl)
    } catch (error) {
      console.error('Error creating playlist:', error)
      triggerToast('Error creating playlist.');
    } finally {
      setIsCreatingPlaylist(false);
    }
  }

  const handleSaveCoverImage = async () => {
    if (!editCoverImg) return;
    if (editCoverImg.length > 2000) {
      triggerToast("Image URL is too long!");
      return;
    }
    const updatedPlaylist = { ...selectedPlaylist, img: editCoverImg };
    setSelectedPlaylist(updatedPlaylist);
    const updatedPlaylists = playlists.map(p => p.id === selectedPlaylist.id ? updatedPlaylist : p);
    setPlaylists(updatedPlaylists);
    try { localStorage.setItem('playlists', JSON.stringify(updatedPlaylists)); } catch (e) { console.warn('Failed to save to localStorage:', e); }
    setDoc(doc(db, 'playlists', selectedPlaylist.id), { img: editCoverImg }, { merge: true }).catch(e => console.warn('Sync failed:', e));
    setShowEditCoverModal(false);
    triggerToast("Cover updated!");
  };

  const handleDeletePlaylist = async (id, e) => {
    if (e) e.stopPropagation()

    // Update local state immediately
    const updatedPlaylists = playlists.filter(p => p.id !== id)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))

    const updatedSaved = (savedPlaylistIds || []).filter(pid => pid !== id);
    setSavedPlaylistIds(updatedSaved);
    localStorage.setItem('savedPlaylistIds', JSON.stringify(updatedSaved));

    if (selectedPlaylist && selectedPlaylist.id === id) {
      setSelectedPlaylist(null)
    }
    triggerToast('Playlist deleted.')

    try {
      // Try to sync with Firebase
      await deleteDoc(doc(db, 'playlists', id))
    } catch (error) {
      console.error("Error deleting playlist from cloud: ", error)
    }
  }

  const addSongToPlaylist = async (playlistId, song) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return

    if ((playlist.songs || []).some(s => s.id === song.id || s.title === song.title)) {
      triggerToast('Song already in playlist!')
      return
    }

    // Block devotional/spiritual songs from playlists
    const genre = (song.genre || '').toLowerCase();
    const isDevotional = genre.includes('devotional') || genre.includes('spiritual') || genre.includes('bhakti');
    if (isDevotional) {
      triggerToast('Devotional songs are not allowed in playlists.')
      return
    }

    const updatedSongs = [...(playlist.songs || []), song]
    const updatedPlaylist = { ...playlist, songs: updatedSongs }

    // Update local state immediately
    const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    triggerToast(`Added "${song.title}" to ${playlist.name}!`)

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updatedPlaylist)
    }

    try {
      // Try to sync with Firebase
      await updateDoc(doc(db, 'playlists', playlistId), { songs: updatedSongs })
    } catch (error) {
      console.error("Error updating playlist in cloud: ", error)
    }
  }

  const removeSongFromPlaylist = async (playlistId, songId) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return

    const updatedSongs = (playlist.songs || []).filter(s => s.id !== songId)
    const updatedPlaylist = { ...playlist, songs: updatedSongs }

    // Update local state immediately
    const updatedPlaylists = playlists.map(p => p.id === playlistId ? updatedPlaylist : p)
    setPlaylists(updatedPlaylists)
    localStorage.setItem('playlists', JSON.stringify(updatedPlaylists))
    triggerToast('Song removed from playlist.')

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updatedPlaylist)
    }

    try {
      // Try to sync with Firebase
      await updateDoc(doc(db, 'playlists', playlistId), { songs: updatedSongs })
    } catch (error) {
      console.error("Error removing song from cloud: ", error)
    }
  }

  const playlistSearchCounter = useRef(0);

  const handlePlaylistSearch = async (e, query = playlistSearchQuery) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!query.trim()) {
      setPlaylistSearchResults([])
      return
    }
    setIsSearchingPlaylistSongs(true)
    playlistSearchCounter.current += 1;
    const currentSearchId = playlistSearchCounter.current;

    const results = await searchSongs(query)

    if (playlistSearchCounter.current === currentSearchId) {
      setPlaylistSearchResults(results)
      setIsSearchingPlaylistSongs(false)
    }
  }

  // Search action
  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    const songs = await searchSongs(searchQuery, 100)

    // Only show matched playlists when searching
    const matchedPlaylists = playlists.filter(p =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !p.hidden
    );

    const communityPlaylists = [...matchedPlaylists].map(p => ({
      ...p,
      title: p.name,
      songCount: p.songs?.length || 0
    }))

    setSearchResults(songs)
    setSearchPlaylistsResults(communityPlaylists)
    setIsSearching(false)
  }

  // Load JioSaavn playlist details or Community Playlist
  const handlePlaylistCardClick = async (playlistId) => {
    // Check if it's a community playlist first
    let communityPlaylist = playlists.find(p => p.id === playlistId);

    // Fallback if ID is stale (e.g. background Firebase sync replaced playlist)
    if (!communityPlaylist) {
      const staleRef = searchPlaylistsResults.find(p => p.id === playlistId);
      if (staleRef) {
        communityPlaylist = playlists.find(p => p.name === staleRef.title);
      }
    }

    if (communityPlaylist) {
      setSelectedSaavnPlaylist({
        id: communityPlaylist.id,
        title: communityPlaylist.name,
        img: communityPlaylist.img,
        description: `Created by ${communityPlaylist.creator}`,
        songs: communityPlaylist.songs || [],
        isCommunity: true,
        isHidden: communityPlaylist.hidden
      });
      return;
    }

    setIsLoadingSaavnPlaylist(true)
    try {
      const details = await getPlaylistDetails(playlistId)
      if (details) {
        setSelectedSaavnPlaylist(details)
      } else {
        triggerToast('Failed to load playlist details.')
      }
    } catch (error) {
      console.error(error)
      triggerToast('Error loading playlist details.')
    } finally {
      setIsLoadingSaavnPlaylist(false)
    }
  }

  // Format progress slider value
  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Format negative/remaining time
  const formatTimeRemaining = (time, duration) => {
    if (isNaN(time) || isNaN(duration)) return '-0:00';
    const remaining = duration - time;
    const mins = Math.floor(remaining / 60)
    const secs = Math.floor(remaining % 60)
    return `-${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Virtual timer for remote control mode so the progress bar moves
  // Since we don't broadcast continuous time updates over Firebase (to save quota),
  // we just simulate the timer ticking forward locally when acting as a remote.
  useEffect(() => {
    let timer = null;
    if (!isLocalDeviceActive && isPlaying && !isDraggingSlider) {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration && duration > 0) return prev;
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    }
  }, [isLocalDeviceActive, isPlaying, isDraggingSlider, duration]);

  // Handle progress slider change
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
  }

  const handleProgressChangeComplete = (e) => {
    const newTime = parseFloat(e.target.value)
    setIsDraggingSlider(false)

    // If a remote device is active, send a seek command to that device instead
    if (!isLocalDeviceActive) {
      sendCommand('seek', { time: newTime });
      setCurrentTime(newTime);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      NativeAudio.seek({ time: newTime });
      setCurrentTime(newTime);
      updateMediaSessionPosition(newTime);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
        updateMediaSessionPosition(newTime);
      }
    }
  }

  // Queue and Navigation Helpers
  const getCurrentTracklist = () => {
    return activePlaybackQueue
  }

  const getUpcomingSongs = () => {
    if (!currentTrack || currentTrackIndex === -1) return []
    const currentList = getCurrentTracklist()
    if (!currentList || currentList.length <= 1) return []

    const upcoming = []
    const total = currentList.length
    const count = Math.min(20, total - 1)
    for (let i = 1; i <= count; i++) {
      const nextIndex = (currentTrackIndex + i) % total; // wrap around playlist
      upcoming.push({ song: currentList[nextIndex], queueIndex: nextIndex })
    }
    return upcoming
  }




  const toggleShuffleMode = () => {
    if (!currentTrack) return;
    toggleShuffle();
    triggerToast(!isShuffleMode ? 'Shuffle ON' : 'Shuffle OFF');
  }

  const shuffleQueue = (queue) => {
    if (!queue || queue.length === 0) return
    const shuffled = [...queue]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    if (!isShuffleMode) toggleShuffle();
    playSong(shuffled[0], 0, shuffled)
    triggerToast('Shuffling tracks!')
  }

  // Mini Player Widget implementation
  const toggleMiniPlayer = async () => {
    if (!('documentPictureInPicture' in window)) {
      triggerToast('Widget is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (pipWindow) {
      pipWindow.close();
      return;
    }

    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 340,
        height: 220,
      });

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWin.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pipWin.document.head.appendChild(link);
        }
      });

      pipWin.addEventListener('pagehide', () => {
        setPipWindow(null);
      });

      setPipWindow(pipWin);
    } catch (e) {
      console.error(e);
      triggerToast('Failed to open Widget');
    }
  };

  const getLikedSongsList = () => {
    const list = []
    const seen = new Set()

      ; (window.defaultSongs || []).forEach(song => {
        if (likedSongs.includes(song.title) && !seen.has(song.title)) {
          seen.add(song.title)
          list.push(song)
        }
      })

    listeningActivity.forEach(song => {
      if (likedSongs.includes(song.title) && !seen.has(song.title)) {
        seen.add(song.title)
        list.push(song)
      }
    })

    return list
  }

  // Filter songs for the selected artist
  const getArtistSongs = () => {
    if (!selectedArtist) return []
    return (window.defaultSongs || []).filter(song =>
      song.artist?.toLowerCase().includes(selectedArtist.name.toLowerCase())
    )
  }

  // Get suggested songs combined with listening activity
  const getSuggestedSongs = () => {
    if (listeningActivity.length === 0) {
      return (window.defaultSongs || []).slice(0, 15);
    }
    const combined = [...listeningActivity];
    ; (window.defaultSongs || []).forEach(song => {
      if (!combined.some(s => s.title === song.title) && combined.length < 15) {
        combined.push(song);
      }
    });
    return combined;
  };

  // Fallback image helper
  const getSongImage = (song) => {
    if (song.img && !song.img.startsWith('images/')) {
      return song.img;
    }
    return `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop`;
  };

  const updateMediaSessionPosition = (time) => {
    // Only update position on Web
    if (!('mediaSession' in navigator) || Capacitor.isNativePlatform()) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: audioRef.current?.duration || 0,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: time || audioRef.current?.currentTime || 0
      });
    } catch (e) { console.log(e); }
  }

  // Refs for media session handlers to avoid stale closures
  const mediaHandlersRef = useRef({ togglePlay, playNextSong, playPreviousSong, setIsPlaying, setCurrentTime, updateMediaSessionPosition });
  useEffect(() => {
    mediaHandlersRef.current = { togglePlay, playNextSong, playPreviousSong, setIsPlaying, setCurrentTime, updateMediaSessionPosition };
  });

  // Media Session for Mobile Notification Bar Design
  useEffect(() => {
    if (currentTrack) {
      const getHighResImage = (url) => {
        if (!url) return 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=512&auto=format&fit=crop';
        // Enforce high quality artwork for the notification
        if (url.includes('150x150')) return url.replace('150x150', '500x500');
        if (url.includes('50x50')) return url.replace('50x50', '500x500');
        return url;
      };

      const artworkUrl = getHighResImage(currentTrack.img || getSongImage(currentTrack));

      const metadata = {
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || currentTrack.movie || 'Vibeflow',
        artwork: [
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ]
      };

      // Native App Media Session is handled entirely by AudioForegroundService and NativeAudioPlugin
      // on Android. We do NOT use the @jofr/capacitor-media-session plugin on Android because
      // it conflicts with our foreground service and crashes the app when offline!
      if (!Capacitor.isNativePlatform() && 'mediaSession' in navigator) {
        // Web Browser Media Session
        navigator.mediaSession.metadata = new MediaMetadata(metadata);
        try {
          navigator.mediaSession.setActionHandler('play', () => mediaHandlersRef.current.togglePlay());
          navigator.mediaSession.setActionHandler('pause', () => mediaHandlersRef.current.togglePlay());
          navigator.mediaSession.setActionHandler('previoustrack', () => mediaHandlersRef.current.playPreviousSong());
          navigator.mediaSession.setActionHandler('nexttrack', () => mediaHandlersRef.current.playNextSong());
          navigator.mediaSession.setActionHandler('stop', () => {
            if (audioRef.current) {
              audioRef.current.pause();
            }
            mediaHandlersRef.current.setIsPlaying(false);
          });
        } catch (e) { console.error('Media session error:', e); }
      }
    }
  }, [currentTrack]);



  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        WidgetPlugin.updateWidget({
          title: currentTrack?.title || 'Vibeflow',
          artist: currentTrack?.artist || 'Ready to play',
          isPlaying: isPlaying,
          imageUrl: currentTrack ? getSongImage(currentTrack) : ''
        });
      } catch (e) { console.log('Widget update error', e); }
    } else if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (typeof updateMediaSessionPosition === 'function') updateMediaSessionPosition();
    }
  }, [isPlaying, currentTrack]);

  // Listen to Widget Plugin Actions
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = WidgetPlugin.addListener('widgetAction', (info) => {
      if (!mediaHandlersRef.current) return;
      if (info.action === 'togglePlay') {
        mediaHandlersRef.current.togglePlay();
      } else if (info.action === 'nextTrack') {
        mediaHandlersRef.current.playNextSong();
      } else if (info.action === 'prevTrack') {
        mediaHandlersRef.current.playPreviousSong();
      }
    });

    return () => {
      listener.then(l => l.remove()).catch(e => { console.error('Widget listener remove error:', e); });
    };
  }, []);

  // Remote / TV D-pad navigation handler with 2D spatial focus
  useEffect(() => {
    const handleKey = (e) => {
      // Find the active container for focusables to trap focus in modals
      const overlays = document.querySelectorAll('.account-overlay, .modal-overlay, .now-playing-fullscreen, .desktop-fullscreen-player, .download-overlay');
      const container = overlays.length > 0 ? overlays[overlays.length - 1] : document;

      const focusables = Array.from(container.querySelectorAll('.focusable, [tabindex="0"], button:not(:disabled), input, a[href], [role="button"]'));
      const active = document.activeElement;

      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) return;

      // Do not intercept keys if an input is focused, to allow typing and on-screen keyboard navigation
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (active && active !== document.body) {
          active.click();
          e.preventDefault();
        }
        return;
      }

      // Spatial navigation: find nearest focusable element in the pressed direction
      const activeRect = active?.getBoundingClientRect?.();
      if (!activeRect || active === document.body || !container.contains(active)) {
        // Nothing focused or focus is outside the modal — focus first visible focusable element
        const firstVisible = focusables.find(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.top >= 0 && r.top <= window.innerHeight;
        });
        if (firstVisible) firstVisible.focus();
        else focusables[0]?.focus();
        e.preventDefault();
        return;
      }

      const activeCenterX = activeRect.left + activeRect.width / 2;
      const activeCenterY = activeRect.top + activeRect.height / 2;

      let bestCandidate = null;
      let bestScore = Infinity;

      focusables.forEach(el => {
        if (el === active) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // invisible

        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;
        const dx = elCenterX - activeCenterX;
        const dy = elCenterY - activeCenterY;

        let inDirection = false;
        let primary = 0;
        let secondary = 0;

        // Use a small threshold to avoid rounding errors
        if (e.key === 'ArrowDown') { inDirection = dy > 5; primary = dy; secondary = Math.abs(dx); }
        if (e.key === 'ArrowUp') { inDirection = dy < -5; primary = -dy; secondary = Math.abs(dx); }
        if (e.key === 'ArrowRight') { inDirection = dx > 5; primary = dx; secondary = Math.abs(dy); }
        if (e.key === 'ArrowLeft') { inDirection = dx < -5; primary = -dx; secondary = Math.abs(dy); }

        if (!inDirection) return;

        // Score: primary distance + heavy penalty for lateral offset
        const score = primary + secondary * 5;
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = el;
        }
      });

      if (bestCandidate) {
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '20px', color: 'red', background: 'white', minHeight: '100vh' }}>
        <h2>App Crashed (Runtime Error)</h2>
        <pre>{errorMessage}</pre>
      </div>
    );
  }

  if (showSplash) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <img
          src="/icon.png"
          alt="Vibeflow Logo"
          style={{ width: '80%', maxWidth: '350px', height: 'auto', objectFit: 'contain', animation: 'pulse 2s infinite', filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))' }}
        />
        <div style={{ marginTop: '20px', textAlign: 'center', animation: 'fadeIn 1s ease-in' }}>
          <h2 style={{ color: 'var(--text-color)', margin: '0 0 8px 0', fontSize: '28px', fontWeight: '800', letterSpacing: '1px' }}>Vibeflow</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' }}>Version 1.0.0</p>
        </div>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* HTML5 Audio Tag (used for both web and mobile) */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        onError={onAudioError}
        playsInline
        preload="auto"
      />

      {/* Global Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>

      {/* A. DESKTOP LEFT SIDEBAR (Desktop only) */}
      <div className="desktop-sidebar">
        <div className="desktop-logo-container">
          <img src="/icon.png" alt="Logo" className="logo-icon" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span className="desktop-logo-text"></span>
        </div>

        <div className="sidebar-menu">
          <button
            className="sidebar-menu-btn focusable"
            tabIndex={0}
            onClick={() => setActiveTab('home')}
          >
            <Home size={18} />
            <span>Home</span>
          </button>
          <button
            className="sidebar-menu-btn focusable"
            tabIndex={0}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} />
            <span>Search</span>
          </button>
          <button
            className="sidebar-menu-btn focusable"
            tabIndex={0}
            onClick={() => setActiveTab('create')}
          >
            <ListMusic size={18} />
            <span>Playlists</span>
          </button>
          <button
            className="sidebar-menu-btn focusable"
            tabIndex={0}
            onClick={() => setActiveTab('library')}
          >
            <BarChart2 size={18} />
            <span>Vibe Stats</span>
          </button>

          <button
            className="sidebar-menu-btn theme-toggle-menu-btn focusable"
            tabIndex={0}
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{ marginTop: 'auto' }}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>



      {/* B. MAIN SCROLL PANEL */}
      <div className="main-content-scroll hide-scrollbar">
        {/* Render Header on Home view */}
        {activeTab === 'home' && !selectedArtist && <Header
          onAction={triggerToast}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          openProfile={() => setIsAccountSettingsOpen(true)}
          openDownload={() => setIsDownloadOpen(true)}
        />}

        {/* 1. HOME TAB */}
        {activeTab === 'home' && (
          selectedArtist ? (
            /* Artist Detail Sheet View */
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
                          onMouseEnter={() => prefetchSong(song)}
                          onFocus={() => prefetchSong(song)}
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
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                            }}
                          />
                          <div className="row-song-details">
                            <div className="row-song-title" style={{ color: isActive ? 'var(--card-orange)' : 'var(--text-color)' }}>{song.title}</div>
                            <div className="row-song-artist">{song.artist || selectedArtist.name}</div>
                          </div>
                          <button className="row-like-btn focusable" tabIndex={0} onClick={(e) => toggleLike(song.title, e)}>
                            <Heart
                              size={16}
                              fill={likedSongs.includes(song.title) ? "#f3b1b1" : "none"}
                              stroke={likedSongs.includes(song.title) ? "#f3b1b1" : "#b0b0b0"}
                            />
                          </button>
                          <span className="row-duration">{song.duration ? formatTime(song.duration) : ''}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : isMelophileOpen ? (
            /* Playlist Detail View */
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
                    onClick={() => shuffleQueue((window.defaultSongs || []).slice(0, 50))}
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
                {(window.defaultSongs || []).slice(0, 50).map((song, idx) => (
                  <div
                    key={song.id || idx}
                    className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
                    tabIndex={0}
                    onClick={() => playSong(song, idx, (window.defaultSongs || []).slice(0, 50), { triggerToast })}
                    onMouseEnter={() => prefetchSong(song)}
                    onFocus={() => prefetchSong(song)}
                  >
                    <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
                      <img
                        src={getSongImage(song)}
                        alt={song.title}
                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                      />
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
          ) : (
            /* Standard home widgets */
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
                  <h3 className="section-title">
                    Latest Playlists
                  </h3>
                  <div className="carousel-scroll hide-scrollbar">
                    {(() => {
                      const recentlyPlayedPlaylists = [];
                      const seenPlaylistIds = new Set();

                      // Map listening activity songs back to their original playlists
                      listeningActivity.forEach(song => {
                        // Find the FIRST playlist that contains this song to avoid showing duplicates
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

                      // Get user's saved/custom playlists
                      const savedUserPlaylists = playlists
                        .filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id))
                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

                      // Combine them, putting custom playlists FIRST, then recently played
                      const combinedPlaylists = [...savedUserPlaylists, ...recentlyPlayedPlaylists];

                      // Remove any duplicates (if a saved playlist was also recently played)
                      const uniquePlaylists = [];
                      const finalSeenIds = new Set();
                      combinedPlaylists.forEach(p => {
                        const id = p.id || p.name;
                        if (!finalSeenIds.has(id)) {
                          uniquePlaylists.push(p);
                          finalSeenIds.add(id);
                        }
                      });

                      // Limit to 8 playlists
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
                              <div className="song-title">
                                {playlist.name}
                              </div>
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
                const _songs = window.defaultSongs || [];
                const randomSong = _songs[Math.floor(Math.random() * _songs.length)];
                if (randomSong) playSong(randomSong)
              }} />
            </>
          )
        )}

        {/* 2. SEARCH TAB */}
        {activeTab === 'search' && (
          selectedSaavnPlaylist ? (
            /* JioSaavn Playlist Detail View */
            <div className="playlist-container">
              <div className="playlist-header">
                <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setSelectedSaavnPlaylist(null)}>
                  <ArrowLeft size={22} />
                </button>
                <h3 className="playlist-header-title">Playlist</h3>
              </div>

              <div className="playlist-banner" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
                alignItems: 'flex-end',
                padding: '20px 0',
                margin: '20px 0',
              }}>
                {selectedSaavnPlaylist.img && (
                  <img
                    src={selectedSaavnPlaylist.img}
                    alt={selectedSaavnPlaylist.title}
                    style={{
                      width: '180px',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }}
                  />
                )}
                <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
                  <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>{selectedSaavnPlaylist.isCommunity ? 'COMMUNITY MIX' : 'SAAVN MIX'}</span>
                  <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedSaavnPlaylist.title}</h2>
                  <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{selectedSaavnPlaylist.description || `Created by ${selectedSaavnPlaylist.creator || 'Vibeflow Official'}`}</p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {(() => {
                      const isAlreadyAdded = playlists.some(p => p.name === selectedSaavnPlaylist.title && savedPlaylistIds.includes(p.id));
                      return (
                        <button
                          onClick={() => {
                            if (isAlreadyAdded) {
                              triggerToast('Already in your playlists!');
                              return;
                            }

                            let existingPl = playlists.find(p => p.name === selectedSaavnPlaylist.title);
                            let targetId;

                            if (!existingPl) {
                              const newPl = {
                                id: selectedSaavnPlaylist.id || Date.now().toString(),
                                name: selectedSaavnPlaylist.title,
                                img: selectedSaavnPlaylist.img,
                                songs: selectedSaavnPlaylist.songs,
                                creator: selectedSaavnPlaylist.creator || currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : null) || localStorage.getItem('username') || 'Anonymous',
                                uid: currentUser?.uid || localStorage.getItem('tv_uid') || null,
                                createdAt: Date.now()
                              };
                              targetId = newPl.id;
                              const updatedPlaylists = [...playlists, newPl];
                              setPlaylists(updatedPlaylists);
                              localStorage.setItem('playlists', JSON.stringify(updatedPlaylists));
                            } else {
                              targetId = existingPl.id;
                            }

                            const newSaved = [...new Set([...savedPlaylistIds, targetId])];
                            setSavedPlaylistIds(newSaved);
                            localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));

                            // Sync to Firestore user doc using arrayUnion — safe for cross-device sync
                            if (currentUser?.uid) {
                              arrayUnionUpdateUserDoc(currentUser.uid, targetId);
                            }

                            triggerToast(`Added "${selectedSaavnPlaylist.title}" to your playlists!`);
                          }}
                          className="focusable"
                          tabIndex={0}
                          style={{
                            background: isAlreadyAdded ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                            border: isAlreadyAdded ? '1px solid rgba(255,255,255,0.3)' : '1px solid white',
                            color: isAlreadyAdded ? 'var(--text-secondary)' : 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: isAlreadyAdded ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <Check size={14} color="var(--text-secondary)" /> Added
                            </>
                          ) : (
                            "+ Add to Playlists"
                          )}
                        </button>
                      );
                    })()}
                    {selectedSaavnPlaylist.songs.length > 0 && (
                      <button
                        onClick={() => shuffleQueue(selectedSaavnPlaylist.songs)}
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
                    )}
                  </div>
                </div>
              </div>

              <div className="playlist-tracklist-header" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px', padding: '10px 15px' }}>
                <span># TITLE & ARTIST</span>
                <span>ALBUM</span>
              </div>

              <div className="playlist-songs-list hide-scrollbar">
                {selectedSaavnPlaylist.songs.length === 0 ? (
                  <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    No songs available in this playlist.
                  </div>
                ) : (
                  selectedSaavnPlaylist.songs.map((song, idx) => {
                    const isActive = currentTrack?.id === song.id;
                    return (
                      <div
                        key={song.id || idx}
                        className={`playlist-song-item focusable ${isActive ? 'active-track' : ''}`}
                        tabIndex={0}
                        onClick={() => playSong(song, idx, selectedSaavnPlaylist.songs, { triggerToast })}

                      >
                        <div className="playlist-song-img-container" style={{ position: 'relative', marginRight: '15px' }}>
                          <img
                            src={getSongImage(song)}
                            alt={song.title}
                            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                          />
                          {isActive && isPlaying && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                              <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                            </div>
                          )}
                        </div>
                        <div className="playlist-song-info">
                          <div className="playlist-song-title">{song.title}</div>
                          <div className="playlist-song-artist">{song.artist}</div>
                        </div>
                        <div className="playlist-song-album">{song.album || 'Single'}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="search-screen">
              <div className="search-header-container">
                <h2 className="search-title">Search</h2>
              </div>
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                  <Search size={20} className="search-box-icon" />
                  <input
                    type="text"
                    placeholder="What do you want to listen to?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input-redesign focusable"
                    tabIndex={0}
                  />
                </div>
              </form>

              {isSearching && (
                <div className="loading-spinner">Searching library...</div>
              )}

              {isLoadingSaavnPlaylist && (
                <div className="loading-spinner">Loading playlist...</div>
              )}

              {!isSearching && !isLoadingSaavnPlaylist && (
                <div className="search-results-list hide-scrollbar">
                  {searchQuery.trim() === '' && searchResults.length === 0 ? (
                    <div className="search-placeholder-center">
                      <div className="search-big-icon-circle">
                        <Search size={64} strokeWidth={1} color="#a0a0a0" />
                      </div>
                      <p className="search-placeholder-text">Search for songs or playlists</p>
                    </div>
                  ) : (
                    <>
                      {/* Playlists Search Results Section */}
                      {searchPlaylistsResults.length > 0 && (
                        <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                          <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                            Playlists
                          </h3>
                          <div className="search-playlists-horizontal hide-scrollbar" style={{
                            display: 'flex',
                            gap: '16px',
                            overflowX: 'auto',
                            paddingBottom: '8px',
                            scrollBehavior: 'smooth'
                          }}>
                            {searchPlaylistsResults.map((playlist) => (
                              <div
                                key={playlist.id}
                                className="search-playlist-card focusable"
                                tabIndex={0}
                                onClick={() => handlePlaylistCardClick(playlist.id)}
                                style={{
                                  flex: '0 0 130px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ position: 'relative', width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                                  <img
                                    src={playlist.img}
                                    alt={playlist.title}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
                                    }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '0',
                                    right: '0',
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                                    padding: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{ fontSize: '9px', color: 'white', fontWeight: '750', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                                      {playlist.songCount} songs
                                    </span>
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: 'var(--text-color)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  padding: '0 2px'
                                }}>
                                  {playlist.title}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  padding: '0 2px'
                                }}>
                                  @{playlist.creator || 'Anonymous'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Derived Artists Section */}
                      {(() => {
                        const uniqueArtists = Array.from(new Set(searchResults.map(s => s.artist.split(',')[0].trim()).filter(Boolean))).slice(0, 6);
                        if (uniqueArtists.length > 0 && searchQuery.trim() !== '') {
                          return (
                            <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                              <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                                Artists
                              </h3>
                              <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                                {uniqueArtists.map((artistName, idx) => {
                                  const artistSong = searchResults.find(s => s.artist.includes(artistName));
                                  return (
                                    <div key={idx} onClick={() => setSearchQuery(artistName)} className="search-playlist-card focusable" style={{ flex: '0 0 100px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--card-border, #333)' }}>
                                        <img src={artistSong?.img} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-color)', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {artistName}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                        return null;
                      })()}

                      {/* Derived Movies Section */}
                      {(() => {
                        const uniqueAlbums = Array.from(new Set(searchResults.map(s => s.album).filter(Boolean))).slice(0, 6);
                        if (uniqueAlbums.length > 0 && searchQuery.trim() !== '') {
                          return (
                            <div className="search-playlists-section" style={{ marginBottom: '24px' }}>
                              <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                                Movies & Albums
                              </h3>
                              <div className="search-playlists-horizontal hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                                {uniqueAlbums.map((albumName, idx) => {
                                  const albumSong = searchResults.find(s => s.album === albumName);
                                  return (
                                    <div key={idx} onClick={() => setSearchQuery(albumName)} className="search-playlist-card focusable" style={{ flex: '0 0 130px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ width: '130px', height: '130px', borderRadius: '12px', overflow: 'hidden' }}>
                                        <img src={albumSong?.img} alt={albumName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      </div>
                                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {albumName}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }
                        return null;
                      })()}

                      {/* Songs Search Results Section */}
                      <h3 className="section-title" style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '18px', color: 'var(--text-color)' }}>
                        {searchQuery.trim() === '' ? 'Trending Tamil Songs' : 'Songs'}
                      </h3>
                      {searchResults.map((song, index) => (
                        <div
                          key={song.id || index}
                          className={`search-result-item focusable ${currentTrack?.id === song.id ? 'active-track' : ''}`}
                          tabIndex={0}
                          onClick={() => playSong(song, index, searchResults)}
                          onMouseEnter={() => prefetchSong(song)}
                          onFocus={() => prefetchSong(song)}
                        >
                          <img src={song.img} alt={song.title} className="search-result-img" />
                          <div className="search-result-info">
                            <div className="search-result-title">{song.title}</div>
                            <div className="search-result-artist">{song.artist}</div>
                          </div>
                          <div className="search-play-icon">
                            {currentTrack?.id === song.id && isPlaying ? (
                              <Pause size={18} fill="currentColor" />
                            ) : (
                              <Play size={18} fill="currentColor" />
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* 3. PLAYLISTS/CREATE TAB */}
        {activeTab === 'create' && (
          isLikedSongsOpen ? (
            /* Liked Songs Container View */
            <div className="playlist-container">
              <div className="playlist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => setIsLikedSongsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <ArrowLeft size={22} />
                </button>
                <h3 className="playlist-header-title" style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>Liked Songs</h3>
                <div style={{ width: '40px' }}></div> {/* Spacer to center title */}
              </div>

              <div className="playlist-banner" style={{ background: 'linear-gradient(135deg, #f7d2d2 0%, #ebb4b4 100%)', padding: '30px 20px', borderRadius: '16px', margin: '20px 0', position: 'relative', overflow: 'hidden' }}>
                <div className="playlist-banner-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)' }}></div>
                <div className="playlist-banner-content" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                  <div>
                    <span className="playlist-badge" style={{ background: 'rgba(255,255,255,0.3)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>COLLECTION</span>
                    <h2 className="playlist-banner-title" style={{ fontSize: '28px', color: 'white', margin: '10px 0 5px 0' }}>Your Favorites</h2>
                    <p className="playlist-banner-desc" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0 }}>{likedSongs.length} liked tracks</p>
                  </div>
                  {getLikedSongsList().length > 0 && (
                    <button
                      onClick={() => shuffleQueue(getLikedSongsList())}
                      className="focusable"
                      tabIndex={0}
                      style={{
                        background: 'white',
                        border: 'none',
                        color: '#ebb4b4',
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
                  )}
                </div>
              </div>

              <div className="playlist-tracklist-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 15px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
                <span>TITLE & ARTIST</span>
                <span>ACTION</span>
              </div>

              <div className="playlist-songs-list hide-scrollbar" style={{ overflowY: 'auto' }}>
                {getLikedSongsList().length === 0 ? (
                  <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    No liked songs yet. Like some tracks to see them here!
                  </div>
                ) : (
                  getLikedSongsList().map((song, idx) => (
                    <div
                      key={song.id || idx}
                      className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
                      tabIndex={0}
                      onClick={() => playSong(song, idx, getLikedSongsList(), { triggerToast })}

                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}
                    >
                      <div className="playlist-song-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="playlist-song-img-container" style={{ position: 'relative' }}>
                          <img
                            src={getSongImage(song)}
                            alt={song.title}
                            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                          />
                          {currentTrack?.title === song.title && isPlaying && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                              <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="playlist-song-title" style={{ fontWeight: '500', fontSize: '14px' }}>{song.title}</div>
                          <div className="playlist-song-artist" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{song.artist}</div>
                        </div>
                      </div>
                      <button
                        className="remove-song-btn focusable"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLike(song.title, e)
                        }}
                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '5px', fontSize: '12px' }}
                      >
                        Unlike
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : selectedPlaylist ? (
            /* Custom Playlist Detail View */
            (() => {
              const username = currentUser?.displayName || localStorage.getItem('username') || '';
              const email = currentUser?.email || localStorage.getItem('email') || '';
              const emailName = email ? email.split('@')[0] : '';
              const uid = currentUser?.uid || localStorage.getItem('tv_uid') || null;
              const isCreator =
                (uid && selectedPlaylist.uid === uid) ||
                (username && selectedPlaylist.creator === username) ||
                (emailName && selectedPlaylist.creator === emailName);
              const isHost = email === 'astraardency@gmail.com';

              return (
                <div className="playlist-container">
                  <div className="playlist-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <button className="playlist-back-btn focusable" tabIndex={0} onClick={() => {
                      setSelectedPlaylist(null)
                      setPlaylistSearchQuery('')
                      setPlaylistSearchResults([])
                    }} style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <ArrowLeft size={22} />
                    </button>
                    <h3 className="playlist-header-title" style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>{selectedPlaylist.name}</h3>
                    {(isCreator || isHost) && (
                      <button
                        className="playlist-delete-btn focusable"
                        tabIndex={0}
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                        style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                      >
                        Delete Playlist
                      </button>
                    )}
                  </div>

                  <div className="playlist-banner" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    alignItems: 'flex-end',
                    padding: '20px 0',
                    margin: '20px 0',
                  }}>
                    <div style={{ position: 'relative', cursor: isCreator ? 'pointer' : 'default' }} onClick={() => {
                      if (!isCreator) {
                        triggerToast('Only the playlist creator can change the cover.');
                        return;
                      }
                      setEditCoverImg(selectedPlaylist.img || '');
                      setShowEditCoverModal(true);
                    }}>
                      {selectedPlaylist.img ? (
                        <img
                          src={selectedPlaylist.img}
                          alt={selectedPlaylist.name}
                          style={{
                            width: '180px',
                            height: '180px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                          }}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'; }}
                        />
                      ) : (
                        <div style={{
                          width: '180px',
                          height: '180px',
                          background: 'linear-gradient(135deg, var(--card-orange), var(--neon-cyan))',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                        }}>
                          <ListMusic size={64} color="white" />
                        </div>
                      )}
                      {isCreator && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                        >
                          <span style={{ color: 'white', fontWeight: '600' }}>Change Cover</span>
                        </div>
                      )}
                    </div>

                    <div className="playlist-banner-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 200px' }}>
                      <span className="playlist-badge" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-secondary)' }}>COMMUNITY PLAYLIST</span>
                      <h2 className="playlist-banner-title" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 8px 0', lineHeight: '1.2' }}>{selectedPlaylist.name}</h2>
                      <p className="playlist-banner-desc" style={{ color: 'var(--text-secondary)', margin: '0 0 20px 0', fontSize: '14px' }}>{(selectedPlaylist.songs?.length || 0)} songs • Created by {selectedPlaylist.creator || 'Anonymous'}</p>

                      {(selectedPlaylist.songs?.length || 0) > 0 && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={() => shuffleQueue(selectedPlaylist.songs || [])}
                            className="focusable"
                            tabIndex={0}
                            style={{
                              background: 'var(--card-orange)',
                              border: 'none',
                              color: 'white',
                              padding: '10px 24px',
                              borderRadius: '24px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(245, 149, 74, 0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Play size={16} fill="white" />
                            Shuffle Play
                          </button>

                          {/* Add to Library button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const safeIds = savedPlaylistIds || [];
                              if (safeIds.includes(selectedPlaylist.id)) {
                                // Remove from library
                                const updatedSaved = safeIds.filter(pid => pid !== selectedPlaylist.id);
                                setSavedPlaylistIds(updatedSaved);
                                localStorage.setItem('savedPlaylistIds', JSON.stringify(updatedSaved));
                                triggerToast('Removed from your Library');
                              } else {
                                // Add to library
                                const newSaved = [...safeIds, selectedPlaylist.id];
                                setSavedPlaylistIds(newSaved);
                                localStorage.setItem('savedPlaylistIds', JSON.stringify(newSaved));
                                triggerToast('Added to your Library');
                              }
                            }}
                            className="focusable"
                            tabIndex={0}
                            style={{
                              background: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'rgba(255,255,255,0.1)' : 'var(--neon-cyan)',
                              border: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? '1px solid rgba(255,255,255,0.2)' : 'none',
                              color: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'var(--text-color)' : '#000',
                              padding: '10px 20px',
                              borderRadius: '24px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: (savedPlaylistIds || []).includes(selectedPlaylist.id) ? 'none' : '0 4px 14px rgba(0, 229, 204, 0.4)'
                            }}
                          >
                            {(savedPlaylistIds || []).includes(selectedPlaylist.id) ? (
                              <>
                                <Check size={16} color="var(--text-color)" />
                                Saved
                              </>
                            ) : (
                              <>
                                <Plus size={16} color="#000" />
                                Add to Library
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="playlist-tracklist-header" style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 15px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', marginBottom: '10px' }}>
                    <span>TITLE & ARTIST</span>
                    <span>ACTION</span>
                  </div>

                  <div className="playlist-songs-list hide-scrollbar" style={{ overflowY: 'auto' }}>
                    {(selectedPlaylist.songs?.length || 0) === 0 ? (
                      <div className="no-songs-placeholder" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        No songs in this playlist yet. Add songs below!
                      </div>
                    ) : (
                      (selectedPlaylist.songs || []).map((song, idx) => (
                        <div
                          key={song.id || idx}
                          className={`playlist-song-item focusable ${currentTrack?.title === song.title ? 'active-track' : ''}`}
                          tabIndex={0}
                          onClick={() => playSong(song, idx, (selectedPlaylist.songs || []), { triggerToast })}

                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' }}
                        >
                          <div className="playlist-song-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="playlist-song-img-container" style={{ position: 'relative' }}>
                              <img
                                src={getSongImage(song)}
                                alt={song.title}
                                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop'; }}
                              />
                              {currentTrack?.title === song.title && isPlaying && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                  <span style={{ color: 'white', fontSize: '12px' }}>▶</span>
                                </div>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="playlist-song-title">{song.title}</div>
                              <div className="playlist-song-artist">{song.artist}</div>
                            </div>
                          </div>
                          {isCreator && (
                            <button
                              className="remove-song-btn focusable"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                removeSongFromPlaylist(selectedPlaylist.id, song.id)
                              }}
                              style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '5px', fontSize: '12px' }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Songs Section */}
                  {isCreator && (
                    <div className="playlist-add-songs-section">
                      <h3 className="section-title">Add Songs</h3>
                      <form onSubmit={handlePlaylistSearch} className="search-form" style={{ marginBottom: '15px' }}>
                        <div className="search-input-wrapper">
                          <Search size={18} className="search-box-icon" />
                          <input
                            type="text"
                            placeholder="Search for songs to add..."
                            value={playlistSearchQuery}
                            onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                            onKeyUp={(e) => handlePlaylistSearch(e, e.target.value)}
                            className="search-input-redesign focusable"
                            tabIndex={0}
                          />
                        </div>
                      </form>

                      {isSearchingPlaylistSongs && (
                        <div className="loading-spinner" style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Searching library...</div>
                      )}

                      <div className="playlist-search-results hide-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {playlistSearchQuery.trim() === '' && !isSearchingPlaylistSongs && <div style={{ padding: '0 10px 10px 10px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Suggested Songs</div>}
                        {(playlistSearchQuery.trim() === '' ? getSuggestedSongs() : playlistSearchResults).map((song) => {
                          const isAdded = (selectedPlaylist.songs || []).some(s => s.id === song.id || s.title === song.title)
                          return (
                            <div key={song.id} className="search-result-item focusable" tabIndex={0} style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: '8px', marginBottom: '8px', background: 'var(--card-bg)' }}>
                              <img src={song.img} alt={song.title} className="search-result-img" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                              <div className="search-result-info" style={{ flex: 1, marginLeft: '10px', overflow: 'hidden' }}>
                                <div className="search-result-title" style={{ fontSize: '14px', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                                <div className="search-result-artist" style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                              </div>
                              <button
                                onClick={() => {
                                  if (!isAdded) {
                                    addSongToPlaylist(selectedPlaylist.id, song)
                                  }
                                }}
                                className="focusable"
                                tabIndex={0}
                                style={{
                                  background: isAdded ? 'transparent' : 'var(--card-orange)',
                                  border: isAdded ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                  color: isAdded ? 'var(--text-color)' : 'white',
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  cursor: isAdded ? 'default' : 'pointer',
                                  fontWeight: '500'
                                }}
                              >
                                {isAdded ? 'Added' : 'Add'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="playlists-screen">
              <div className="playlists-header-container">
                <div>
                  <h2 className="playlists-title">Your Library</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0', fontWeight: '500' }}>Tamil music collection</p>
                </div>
              </div>

              {/* Hero Create Button */}
              <button className="create-playlist-btn focusable" tabIndex={0} onClick={() => setShowCreateModal(true)}>
                <span>NEW PLAYLIST</span>
              </button>

              {/* Stats Row */}
              <div className="library-stats-row">
                <div className="library-stat-pill">
                  <span className="lib-stat-val">{playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length}</span>
                  <span className="lib-stat-label">Playlists</span>
                </div>
                <div className="library-stat-divider"></div>
                <div className="library-stat-pill">
                  <span className="lib-stat-val">{likedSongs.length}</span>
                  <span className="lib-stat-label">Liked</span>
                </div>
                <div className="library-stat-divider"></div>
                <div className="library-stat-pill">
                  <span className="lib-stat-val">{playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).reduce((acc, p) => acc + (p.songs?.length || 0), 0)}</span>
                  <span className="lib-stat-label">Saved Songs</span>
                </div>
              </div>

              <h3 className="collection-title">Your Collection</h3>

              <div className="collection-grid">
                {/* Liked Songs Card */}
                <div className="collection-card collection-card--liked focusable" tabIndex={0} onClick={() => setIsLikedSongsOpen(true)}>
                  <div className="collection-card-art liked-card-gradient">
                    <Heart size={32} fill="white" color="white" />
                    <div className="collection-card-art-shine"></div>
                  </div>
                  <div className="collection-card-info">
                    <div className="collection-card-title">Liked Songs</div>
                    <div className="collection-card-desc">{likedSongs.length} songs</div>
                  </div>
                </div>

                {playlists
                  .filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id))
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .map((playlist, pIdx) => {
                    const gradients = [
                      'linear-gradient(135deg, #f5954a 0%, #ff6b9d 100%)',
                      'linear-gradient(135deg, #00e5cc 0%, #007cf0 100%)',
                      'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                      'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                      'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                    ];
                    const grad = gradients[pIdx % gradients.length];
                    return (
                      <div key={playlist.id} className="collection-card focusable" tabIndex={0} onClick={() => setSelectedPlaylist(playlist)}>
                        <div className="collection-card-art" style={playlist.img ? { backgroundImage: `url("${playlist.img}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : { background: grad }}>
                          {!playlist.img && <ListMusic size={32} color="white" />}
                          <div className="collection-card-art-shine"></div>
                        </div>
                        <div className="collection-card-info">
                          <div className="collection-card-title">{playlist.name}</div>
                          <div className="collection-card-desc">{(playlist.songs?.length || 0)} songs • by @{playlist.creator || 'Anonymous'}</div>
                        </div>
                        {/* <button
                        className="collection-card-delete-btn focusable"
                        tabIndex={0}
                        onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                        title="Delete playlist"
                      >
                        ×
                      </button> */}
                      </div>
                    );
                  })}

                {playlists.filter(p => !p.hidden && (savedPlaylistIds || []).includes(p.id)).length === 0 && (
                  <div className="empty-playlists-msg">
                    <ListMusic size={28} color="var(--text-secondary)" />
                    <p>No playlists yet.<br />Tap "New Playlist" to start.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* 4. VIBE STATS TAB */}
        {activeTab === 'library' && (
          <div className="vibe-stats-screen">
            <div className="stats-header-container">
              <h2 className="stats-title">Vibe Stats</h2>
              <div className="stats-profile-avatar" onClick={() => setIsAccountSettingsOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: 'none', background: 'var(--card-bg)' }}>
                <img src={currentUser?.photoURL || '/icon.png'} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            <div className="stats-grid">
              <div className="stats-card">
                <Headphones size={22} className="stats-card-icon" />
                <div className="stats-card-label">Total Plays</div>
                <div className="stats-card-val">{playsCount} songs</div>
              </div>

              <div className="stats-card">
                <Sparkles size={22} className="stats-card-icon" />
                <div className="stats-card-label">Vibe Tier</div>
                <div className="stats-card-val">
                  {playsCount > 100 ? 'Melophile' : playsCount > 50 ? 'Enthusiast' : playsCount > 10 ? 'Explorer' : 'Starter'}
                </div>
              </div>
            </div>

            {(() => {
              const maxPlays = Math.max(...(dailyPlays || [0, 0, 0, 0, 0, 0, 0]));
              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              const peakDayIdx = (dailyPlays || []).indexOf(maxPlays);
              const peakDayStr = maxPlays > 0 ? days[peakDayIdx] : '';
              const todayIdx = (new Date().getDay() + 6) % 7;
              const isPeakToday = maxPlays > 0 && peakDayIdx === todayIdx;
              const peakText = playsCount === 0 ? "No tracks played yet" : (isPeakToday ? "Today is your peak day!" : `Your peak day is ${peakDayStr}`);

              return (
                <div className="peak-vibe-banner">
                  <span className="lightning-icon">⚡</span>
                  <div className="peak-vibe-text">
                    <span className="peak-vibe-label">PEAK VIBE DAY</span>
                    <span className="peak-vibe-val">{peakText}</span>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const getArtistImage = (name) => {
                const nameLower = name.toLowerCase();
                if (nameLower.includes('deva')) return 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg';
                if (nameLower.includes('anirudh')) return 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg';
                if (nameLower.includes('balasubra') || nameLower.includes('spb') || nameLower.includes('s.p.b')) return 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg';
                if (nameLower.includes('rahman')) return 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg';
                if (nameLower.includes('harris')) return 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg';
                if (nameLower.includes('yuvan')) return 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg';
                if (nameLower.includes('sai')) return 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg';
                if (nameLower.includes('mano')) return 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg';
                if (nameLower.includes('hariharan')) return 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg';
                if (nameLower.includes('g.v.prakash') || nameLower.includes('g. v. prakash') || nameLower.includes('g.v. prakash') || nameLower.includes('g v prakash')) return 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg';
                if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) return 'https://c.saavncdn.com/artists/Ilaiyaraaja_20230828071840_500x500.jpg';
                if (nameLower.includes('santhosh narayanan')) return 'https://c.saavncdn.com/artists/Santhosh_Narayanan_500x500.jpg';
                if (nameLower.includes('hiphop') || nameLower.includes('tamizha')) return 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg';
                return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop';
              };

              const COMPOSER_GROUPS = {
                'A.R. Rahman': ['a.r. rahman', 'ar rahman', 'a r rahman', 'rahman'],
                'Anirudh Ravichander': ['anirudh'],
                'Harris Jayaraj': ['harris'],
                'Yuvan Shankar Raja': ['yuvan'],
                'Ilaiyaraaja': ['ilaiyaraaja', 'ilayaraja'],
                'Deva': ['deva'],
                'Santhosh Narayanan': ['santhosh narayanan'],
                'G.V. Prakash': ['g.v. prakash', 'g v prakash', 'gv prakash'],
                'Hiphop Tamizha': ['hiphop tamizha', 'hiphop'],
                'Vidyasagar': ['vidyasagar'],
                'D. Imman': ['imman'],
                'Thaman S': ['thaman'],
                'Devi Sri Prasad': ['devi sri prasad', 'dsp'],
                'Karthik Raja': ['karthik raja'],
                'Bharadwaj': ['bharadwaj'],
                'Sirpy': ['sirpy'],
                'S.A. Rajkumar': ['s.a. rajkumar', 'sa rajkumar', 's a rajkumar'],
                'M.S. Viswanathan': ['m.s. viswanathan', 'msv'],
                'Sam C.S.': ['sam c.s.', 'sam cs'],
                'Ghibran': ['ghibran'],
                'Sean Roldan': ['sean roldan'],
                'Vishal Chandrashekhar': ['vishal chandrashekhar'],
                'Leon James': ['leon james'],
                'Vivek-Mervin': ['vivek-mervin'],
                'Justin Prabhakaran': ['justin prabhakaran'],
                'Jakes Bejoy': ['jakes bejoy'],
                'Gopi Sundar': ['gopi sundar'],
                'Radhan': ['radhan'],
                'Darbuka Siva': ['darbuka siva']
              };

              const groupedPlays = {};
              Object.entries(artistPlays || {}).forEach(([name, count]) => {
                if (!name || name.trim() === '' || name === 'undefined' || count <= 0) return;
                const lower = name.toLowerCase();
                for (const [canonical, aliases] of Object.entries(COMPOSER_GROUPS)) {
                  if (aliases.some(alias => lower.includes(alias))) {
                    groupedPlays[canonical] = (groupedPlays[canonical] || 0) + count;
                    break;
                  }
                }
              });

              const sortedArtists = Object.entries(groupedPlays).sort(([, a], [, b]) => b - a);
              const topArtist = sortedArtists.length > 0
                ? { name: sortedArtists[0][0], count: sortedArtists[0][1], img: getArtistImage(sortedArtists[0][0]) }
                : { name: 'Hiphop Tamizha', count: 0, img: getArtistImage('Hiphop Tamizha') };


              return (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ backgroundColor: 'var(--card-bg, white)', borderRadius: '24px', padding: '30px 20px', textAlign: 'center', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '20px' }}>#1 Top Artist</h3>

                    <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto', marginBottom: '16px' }}>
                      <div style={{ position: 'absolute', inset: '-4px', background: 'linear-gradient(45deg, #ff7b00, #ff0055)', borderRadius: '50%', filter: 'blur(8px)', opacity: 0.6 }}></div>
                      <AsyncArtistImage artistName={topArtist.name} fallbackImg={topArtist.img} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--card-bg, white)' }} alt={topArtist.name} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop'; }} />
                    </div>

                    <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-color, #000)', marginBottom: '12px' }}>{topArtist.name}</h2>

                    <div style={{ display: 'inline-block', backgroundColor: 'var(--hover-bg, #e5e5e5)', color: 'var(--text-color, #333)', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                      Played {topArtist.count} times
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '32px', padding: '0 20px' }}>
              <div style={{
                background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))' : 'var(--card-bg, #ffffff)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid var(--border-color, #eef0f3)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-color, #000)', margin: '0 0 4px 0' }}>Weekly Overview</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary, rgba(0,0,0,0.5))', marginBottom: '24px', fontWeight: '500' }}>
                  {(() => {
                    const playsArr = dailyPlays || [0, 0, 0, 0, 0, 0, 0];
                    const totalPlays = playsArr.reduce((a, b) => a + b, 0);
                    const activeDays = playsArr.filter(p => p > 0).length || 1;
                    return `Avg. ${Math.round(totalPlays / activeDays)} songs / day`;
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px' }}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                    const todayIdx = (new Date().getDay() + 6) % 7;
                    const isToday = idx === todayIdx;
                    const maxPlays = Math.max(...dailyPlays, 10);
                    let h = playsCount > 0 ? (dailyPlays[idx] / maxPlays) * 100 : 15;
                    if (playsCount > 0) h = Math.max(15, Math.min(100, h));
                    if (isToday && playsCount > 0) h = Math.max(h, 30);

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: '10px', height: '100px', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'var(--bar-bg, #e5e5e7)', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                          <div style={{
                            width: '100%',
                            height: `${h}%`,
                            background: isToday ? 'linear-gradient(to top, #ff7b00, #ff0055)' : (playsCount === 0 ? (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)') : 'linear-gradient(to top, #4facfe, #00f2fe)'),
                            borderRadius: '10px',
                            boxShadow: isToday ? '0 0 10px rgba(255, 0, 85, 0.5)' : 'none',
                            transition: 'height 0.5s ease-out'
                          }}></div>
                        </div>
                        <span style={{ marginTop: '12px', fontSize: '12px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--text-color, #000)' : 'var(--text-secondary, rgba(0,0,0,0.4))' }}>{day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ paddingBottom: '120px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--text-color, #000)', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Top Artists</h3>
                <span onClick={() => setShowAllComposers(!showAllComposers)} style={{ color: 'var(--text-secondary, rgba(0,0,0,0.5))', fontSize: '13px', cursor: 'pointer' }}>{showAllComposers ? 'View Less' : 'View All'}</span>
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', flexWrap: showAllComposers ? 'wrap' : 'nowrap', overflowX: showAllComposers ? 'hidden' : 'auto', padding: '0 20px', gap: '16px', scrollSnapType: showAllComposers ? 'none' : 'x mandatory' }}>
                {(() => {
                  const getArtistImage = (name) => {
                    const nameLower = name.toLowerCase();
                    if (nameLower.includes('deva')) return 'https://i.pinimg.com/736x/d2/03/29/d20329dcc8e63d29a2c8ada710037aaf.jpg';
                    if (nameLower.includes('anirudh')) return 'https://i.pinimg.com/736x/d1/fd/23/d1fd230fec559c5c09c7c08651a2843a.jpg';
                    if (nameLower.includes('balasubra') || nameLower.includes('spb') || nameLower.includes('s.p.b')) return 'https://i.pinimg.com/1200x/fa/1c/72/fa1c72be17b0b9d1d8028384f4d1f809.jpg';
                    if (nameLower.includes('rahman')) return 'https://i.pinimg.com/1200x/9b/60/5c/9b605c223bd8a8eb82faf95b92c0df43.jpg';
                    if (nameLower.includes('harris')) return 'https://i.pinimg.com/736x/e3/bf/48/e3bf485d75d83bdb46a9efeea3e3f8ef.jpg';
                    if (nameLower.includes('yuvan')) return 'https://i.pinimg.com/736x/3b/65/3e/3b653e7e03078eda8712b5923d831bbc.jpg';
                    if (nameLower.includes('sai')) return 'https://i.pinimg.com/736x/e8/d8/87/e8d88776ff92d9e8983d7dc642ba4084.jpg';
                    if (nameLower.includes('mano')) return 'https://i.pinimg.com/736x/46/2c/f3/462cf3c05551400733901d24799955a3.jpg';
                    if (nameLower.includes('hariharan')) return 'https://i.pinimg.com/736x/fb/ba/1c/fbba1c1859f29f4623f474409135ee22.jpg';
                    if (nameLower.includes('g.v.prakash') || nameLower.includes('g. v. prakash') || nameLower.includes('g.v. prakash') || nameLower.includes('g v prakash')) return 'https://i.pinimg.com/736x/fd/e1/59/fde1596a79567a7e9e67b098ad4b6537.jpg';
                    if (nameLower.includes('ilaiyaraaja') || nameLower.includes('ilayaraja')) return 'https://c.saavncdn.com/artists/Ilaiyaraaja_20230828071840_500x500.jpg';
                    if (nameLower.includes('santhosh narayanan')) return 'https://c.saavncdn.com/artists/Santhosh_Narayanan_500x500.jpg';
                    if (nameLower.includes('hiphop') || nameLower.includes('tamizha')) return 'https://i.pinimg.com/736x/10/51/d2/1051d2538a3355b6873fedc75e844bc8.jpg';
                    return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop';
                  };

                  const COMPOSER_GROUPS = {
                    'A.R. Rahman': ['a.r. rahman', 'ar rahman', 'a r rahman', 'rahman'],
                    'Anirudh Ravichander': ['anirudh'],
                    'Harris Jayaraj': ['harris'],
                    'Yuvan Shankar Raja': ['yuvan'],
                    'Ilaiyaraaja': ['ilaiyaraaja', 'ilayaraja'],
                    'Deva': ['deva'],
                    'Santhosh Narayanan': ['santhosh narayanan'],
                    'G.V. Prakash': ['g.v. prakash', 'g v prakash', 'gv prakash'],
                    'Hiphop Tamizha': ['hiphop tamizha', 'hiphop'],
                    'Vidyasagar': ['vidyasagar'],
                    'D. Imman': ['imman'],
                    'Thaman S': ['thaman'],
                    'Devi Sri Prasad': ['devi sri prasad', 'dsp'],
                    'Karthik Raja': ['karthik raja'],
                    'Bharadwaj': ['bharadwaj'],
                    'Sirpy': ['sirpy'],
                    'S.A. Rajkumar': ['s.a. rajkumar', 'sa rajkumar', 's a rajkumar'],
                    'M.S. Viswanathan': ['m.s. viswanathan', 'msv'],
                    'Sam C.S.': ['sam c.s.', 'sam cs'],
                    'Ghibran': ['ghibran'],
                    'Sean Roldan': ['sean roldan'],
                    'Vishal Chandrashekhar': ['vishal chandrashekhar'],
                    'Leon James': ['leon james'],
                    'Vivek-Mervin': ['vivek-mervin'],
                    'Justin Prabhakaran': ['justin prabhakaran'],
                    'Jakes Bejoy': ['jakes bejoy'],
                    'Gopi Sundar': ['gopi sundar'],
                    'Radhan': ['radhan'],
                    'Darbuka Siva': ['darbuka siva']
                  };

                  const groupedPlays = {};
                  Object.entries(artistPlays || {}).forEach(([name, count]) => {
                    if (!name || name.trim() === '' || name === 'undefined' || count <= 0) return;
                    const lower = name.toLowerCase();
                    for (const [canonical, aliases] of Object.entries(COMPOSER_GROUPS)) {
                      if (aliases.some(alias => lower.includes(alias))) {
                        groupedPlays[canonical] = (groupedPlays[canonical] || 0) + count;
                        break;
                      }
                    }
                  });

                  const sorted = Object.entries(groupedPlays)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, showAllComposers ? undefined : 5)
                    .map(([name, count]) => ({
                      name,
                      count,
                      img: getArtistImage(name)
                    }));

                  return sorted.map((comp, i) => (
                    <div key={i} style={{
                      flex: '0 0 150px',
                      height: '200px',
                      position: 'relative',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                      scrollSnapAlign: 'start',
                      cursor: 'pointer'
                    }}>
                      <AsyncArtistImage artistName={comp.name} fallbackImg={comp.img} alt={comp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)'
                      }}></div>
                      <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', lineHeight: '1.2', marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comp.name}</div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{comp.count} plays</div>
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '800',
                        padding: '6px 10px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        #{i + 1}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* C. DESKTOP RIGHT NOW PLAYING PANEL (Desktop only) */}
      <div className="desktop-right-panel">
        <h3 className="d-np-title">NOW PLAYING</h3>
        {currentTrack ? (
          <>
            <div className="d-np-disc-container">
              <div className="d-np-disc">
                <img
                  src={getSongImage(currentTrack)}
                  alt={currentTrack.title}
                  className={`d-np-cover-img`}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';
                  }}
                />
              </div>
            </div>
            <div className="d-np-info">
              <h4 className="d-np-song-title">{currentTrack.title}</h4>
              <p className="d-np-song-artist">{currentTrack.artist}</p>
            </div>

            <div className="d-np-queue-header">UP NEXT</div>
            <div className="d-np-queue-list hide-scrollbar">
              {getUpcomingSongs().map(({ song, queueIndex }, idx) => (
                <div key={song.id || idx} className="d-np-queue-item focusable" tabIndex={0} onClick={() => playSong(song, queueIndex, activePlaybackQueue)} onMouseEnter={() => prefetchSong(song)} onFocus={() => prefetchSong(song)}>
                  <img
                    src={getSongImage(song)}
                    alt={song.title}
                    className="d-np-queue-img"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
                    }}
                  />
                  <div className="d-np-queue-info">
                    <div className="d-np-queue-title">{song.title}</div>
                    <div className="d-np-queue-artist">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            No track playing. Select a song to start listening.
          </div>
        )}
      </div>

      {/* D. MOBILE SPECIFIC OVERLAYS */}
      {isNowPlayingOpen && currentTrack && (
        <div className={`now-playing-fullscreen ${isNowPlayingClosing ? 'player-slide-down' : 'player-slide-up'}`}>
          {/* Vibrant Background (Album Art Blurred and Darkened) */}
          <div
            className="np-bg-blur"
            style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}
          />
          <div className="np-bg-overlay-dark"></div>

          <div className="np-glass-card">
            {/* Top Bar inside Card for Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '10px' }}>
              <button
                className="focusable scale-on-click"
                tabIndex={0}
                onClick={closeNowPlaying}
                style={{ background: 'none', border: 'none', padding: '10px', marginLeft: '-15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronDown size={32} color="#ffffff" strokeWidth={2} />
              </button>
            </div>

            {/* Album Art Square */}
            <div className="np-album-art-container">
              <img
                src={getSongImage(currentTrack)}
                className="np-album-art-shadow"
                alt="shadow"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <img
                src={getSongImage(currentTrack)}
                alt={currentTrack.title}
                className="np-album-art-square"
                style={{ borderRadius: '16px' }}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
                }}
              />
            </div>

            {/* Track Info Row */}
            <div className="np-track-info-row">
              <div className="np-track-text">
                <br></br>
                <div className="np-track-title">{currentTrack.title}</div>
                <div className="np-track-artist">{currentTrack.artist}</div>
              </div>
              <button className="np-icon-btn focusable scale-on-click" tabIndex={0} onClick={() => setShowUpNext(!showUpNext)}>
                <MoreVertical size={24} color={showUpNext ? 'var(--primary-color)' : '#ffffff'} strokeWidth={1.5} />
              </button>
            </div>

            {/* Linear Progress Container */}
            <div className="np-progress-container">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onPointerDown={() => setIsDraggingSlider(true)}
                onPointerUp={handleProgressChangeComplete}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={handleProgressChangeComplete}
                onChange={handleProgressChange}
                className="np-linear-progress focusable"
                style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                tabIndex={0}
              />
              <div className="np-time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTimeRemaining(currentTime, duration)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="np-main-controls" style={{ width: '100%', justifyContent: 'space-between', gap: '0px', padding: '0 5px' }}>
              <button
                className={`np-control-arrow focusable scale-on-click ${likedSongs.includes(currentTrack.title) ? 'heartbeat' : ''}`}
                tabIndex={0}
                onClick={(e) => toggleLike(currentTrack.title, e)}
                style={{ padding: '8px' }}
              >
                <Heart size={26} fill={likedSongs.includes(currentTrack.title) ? "var(--primary-color)" : "transparent"} color={likedSongs.includes(currentTrack.title) ? "var(--primary-color)" : "#ffffff"} />
              </button>

              <button className="np-control-arrow focusable scale-on-click" tabIndex={0} onClick={playPreviousSong} style={{ padding: '8px' }}>
                <SkipBack size={36} color="#ffffff" strokeWidth={1.5} fill="#ffffff" />
              </button>

              <button className="np-play-pause-btn-outline focusable scale-on-click" tabIndex={0} onClick={togglePlay} style={{ padding: '8px' }}>
                {isPlaying ? <Pause size={56} color="#ffffff" strokeWidth={1.5} /> : <Play size={56} color="#ffffff" strokeWidth={1.5} />}
              </button>

              <button className="np-control-arrow focusable scale-on-click" tabIndex={0} onClick={playNextSong} style={{ padding: '8px' }}>
                <SkipForward size={36} color="#ffffff" strokeWidth={1.5} fill="#ffffff" />
              </button>

              <button
                className="np-control-arrow focusable scale-on-click"
                tabIndex={0}
                onClick={(e) => toggleDownload(currentTrack, e)}
                style={{ padding: '8px' }}
              >
                <Download size={26} color={downloadedSongs.find(s => s.id === currentTrack.id || s.title === currentTrack.title) ? "var(--card-orange)" : "#ffffff"} />
              </button>

            </div>

            {/* Connection Actions Row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
              <button
                className="np-icon-btn focusable scale-on-click"
                tabIndex={0}
                onClick={() => setIsLiveConnectOpen(true)}
                style={{
                  background: isLiveConnected ? 'var(--card-orange)' : 'rgba(255, 255, 255, 0.1)',
                  width: 'auto',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  display: 'flex',
                  gap: '8px',
                  color: '#ffffff'
                }}
              >
                <Radio size={18} />
                <span style={{ fontSize: '14px', fontWeight: '600' }}>Live Connect</span>
              </button>

              <button
                className="np-earpods-btn focusable scale-on-click"
                tabIndex={0}
                onClick={() => {
                  if (!isEarPodsActive) {
                    connectBluetooth();
                  } else {
                    setIsEarPodsActive(false);
                    triggerToast('Disconnected from EarPods');
                  }
                }}
                style={{
                  margin: '0', /* Override CSS margin */
                  color: isEarPodsActive ? '#000' : 'white',
                  background: isEarPodsActive ? 'white' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isEarPodsActive ? '0 0 15px rgba(255,255,255,0.5)' : 'none',
                  animation: isEarPodsActive ? 'none' : 'pulse-glow 3s infinite alternate'
                }}
              >
                <Headphones size={16} color={isEarPodsActive ? '#000' : 'white'} />
                {isEarPodsActive ? 'EarPods Connected' : 'EarPods'}
              </button>
            </div>

            {/* Volume Control */}
            <div className="np-volume-row" style={{ marginTop: '15px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px' }}>
              <button className="scale-on-click" onClick={() => {
                if (audioRef.current) audioRef.current.volume = 0;
                if (Capacitor.isNativePlatform() && NativeAudio && NativeAudio.setVolume) {
                  NativeAudio.setVolume({ volume: 0 });
                }
                const slider = document.getElementById('np-vol-slider');
                if (slider) slider.value = 0;
              }} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }}>
                <Volume1 size={20} color="var(--text-secondary)" />
              </button>
              <input
                id="np-vol-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                defaultValue="1"
                onChange={handleVolumeChange}
                className="np-volume-slider focusable"
                style={{ flex: 1, margin: '0 10px' }}
              />
              <button className="scale-on-click" onClick={() => {
                if (audioRef.current) audioRef.current.volume = 1;
                if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
                if (Capacitor.isNativePlatform() && NativeAudio && NativeAudio.setVolume) {
                  NativeAudio.setVolume({ volume: 1 });
                }
                const slider = document.getElementById('np-vol-slider');
                if (slider) slider.value = 1;
              }} style={{ background: 'none', border: 'none' }}>
                <Volume2 size={16} color="var(--text-secondary)" />
              </button>
              <button className="scale-on-click" onClick={() => setShowEqModal(true)} style={{ background: 'none', border: 'none', marginLeft: '4px' }}>
                <SlidersHorizontal size={20} color={showEqModal ? 'var(--card-orange)' : 'var(--text-secondary)'} />
              </button>
            </div>


            {/* Up Next Overlay inside Glass Card */}
            {showUpNext && (
              <div className="np-queue-overlay player-slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Up Next</h3>
                  <button onClick={() => setShowUpNext(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)' }}><X size={20} /></button>
                </div>
                {/* Show current track first, then upcoming */}
                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                  {/* Current track indicator */}
                  {currentTrack && (
                    <div style={{ padding: '6px 8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.5 }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>Now Playing</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={getSongImage(currentTrack)} alt="current" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--card-orange)' }} />
                        <div>
                          <div style={{ color: 'var(--card-orange)', fontSize: '13px', fontWeight: '700' }}>{currentTrack.title}</div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{currentTrack.artist}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Upcoming songs only */}
                  <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', padding: '0 8px', textTransform: 'uppercase' }}>Up Next</div>
                  {getUpcomingSongs().length === 0 ? (
                    <div style={{ padding: '20px 8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>No more songs in queue</div>
                  ) : (
                    getUpcomingSongs().map(({ song, queueIndex }, i) => (
                      <div key={song.id || i} className="d-np-queue-item focusable" tabIndex={0} onClick={() => { playSong(song, queueIndex, activePlaybackQueue); setShowUpNext(false); }} onMouseEnter={() => prefetchSong(song)} onFocus={() => prefetchSong(song)}>
                        <img src={getSongImage(song)} alt="thumb" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                        <div className="d-np-queue-text" style={{ flex: 1, marginLeft: '10px' }}>
                          <div className="d-np-queue-title" style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{song.title}</div>
                          <div className="d-np-queue-artist" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{song.artist}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* E. MOBILE FLOATING MINI PLAYER */}
      {currentTrack && !isNowPlayingOpen && (
        isFloatingPlayer ? (
          <div
            className={`floating-accessibility-player focusable`}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              transform: `translate3d(${floatingPos.x}px, ${floatingPos.y}px, 0)`,
              willChange: 'transform',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              cursor: 'grab',
              border: '2px solid rgba(255,255,255,0.8)'
            }}
            onTouchStart={handleFloatingTouchStart}
            onTouchMove={handleFloatingTouchMove}
            onTouchEnd={handleFloatingTouchEnd}
            onMouseDown={(e) => {
              dragRef.current = {
                isDragging: true,
                startX: e.clientX,
                startY: e.clientY,
                initialX: floatingPos.x,
                initialY: floatingPos.y
              };
              const handleMouseMove = (ev) => {
                const dx = ev.clientX - dragRef.current.startX;
                const dy = ev.clientY - dragRef.current.startY;
                setFloatingPos({ x: dragRef.current.initialX + dx, y: dragRef.current.initialY + dy });
              };
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                setTimeout(() => { dragRef.current.isDragging = false; }, 50);
              };
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            onClick={(e) => {
              if (dragRef.current.isDragging) return;
              e.stopPropagation();
              setIsNowPlayingOpen(true);
              setIsFloatingPlayer(false);
            }}
          >
            <img src={getSongImage(currentTrack)} alt="mini" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div
            className="mini-player focusable"
            tabIndex={0}
            onClick={(e) => {
              if (preventClick) {
                setPreventClick(false);
                return;
              }
              setIsNowPlayingOpen(true);
            }}
            onTouchStart={handleMiniPlayerTouchStart}
            onTouchEnd={handleMiniPlayerTouchEnd}
            onTouchMove={handleMiniPlayerTouchMove}
            onMouseDown={handleMiniPlayerTouchStart}
            onMouseUp={handleMiniPlayerTouchEnd}
            onMouseLeave={handleMiniPlayerTouchEnd}
            style={{ borderRadius: '16px', margin: '8px', bottom: '60px', width: 'calc(100% - 16px)' }}
          >
            {/* Glassy Background Effect */}
            <div className="mini-player-bg-blur" style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}></div>
            <div className="mini-player-overlay"></div>
            <div className="mini-player-progress-bar">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onPointerDown={() => setIsDraggingSlider(true)}
                onPointerUp={handleProgressChangeComplete}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={handleProgressChangeComplete}
                onChange={handleProgressChange}
                onClick={(e) => e.stopPropagation()}
                className="mini-player-slider focusable"
                style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                tabIndex={0}
              />
            </div>
            <div className="mini-player-body">
              <img
                src={getSongImage(currentTrack)}
                alt={currentTrack.title}
                className="mini-player-img"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
                }}
              />
              <div className="mini-player-info">
                <div className="mini-player-title">{currentTrack.title}</div>
                <div className="mini-player-artist">{currentTrack.artist}</div>
              </div>
              <div className="mini-player-controls" onClick={(e) => e.stopPropagation()}>
                <button className="player-control-btn focusable" tabIndex={0} onClick={() => setIsDeviceModalOpen(true)}>
                  <Cast size={20} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'currentColor'} />
                </button>
                <button className="player-control-btn focusable" tabIndex={0} onClick={togglePlay}>
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                </button>
                <button
                  className="player-control-btn focusable"
                  tabIndex={0}
                  onClick={playNextSong}
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* F. DESKTOP BOTTOM PLAYER BAR (Desktop only) */}
      {currentTrack && (
        <div className="desktop-player-bar">
          <div className="d-player-left">
            <img
              src={getSongImage(currentTrack)}
              alt={currentTrack.title}
              className="d-player-img"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
              }}
            />
            <div className="d-player-info">
              <div className="d-player-title">{currentTrack.title}</div>
              <div className="d-player-artist">{currentTrack.artist}</div>
            </div>
          </div>
          <div className="d-player-center">
            <div className="d-player-controls">
              <button className="d-player-icon-btn focusable" tabIndex={0} onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()}>
                <SkipBack size={18} />
              </button>
              <button
                className="focusable"
                tabIndex={0}
                style={{ backgroundColor: 'white', color: 'black', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                onClick={togglePlay}
                onKeyDown={(e) => e.key === 'Enter' && togglePlay()}
              >
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" style={{ marginLeft: '2px', marginTop: '1px' }} />}
              </button>
              <button className="d-player-icon-btn focusable" tabIndex={0} onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()}>
                <SkipForward size={18} />
              </button>
            </div>

            <div className="d-player-timeline">
              <span className="d-player-time">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onPointerDown={() => setIsDraggingSlider(true)}
                onPointerUp={handleProgressChangeComplete}
                onTouchStart={() => setIsDraggingSlider(true)}
                onTouchEnd={handleProgressChangeComplete}
                onChange={handleProgressChange}
                className="d-player-slider focusable"
                style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                tabIndex={0}
              />
              <span className="d-player-time">{formatTimeRemaining(currentTime, duration)}</span>
            </div>
          </div>

          <div className="d-player-right">
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={(e) => toggleLike(currentTrack.title, e)}>
              <Heart
                size={18}
                fill={likedSongs.includes(currentTrack.title) ? "#f3b1b1" : "none"}
                stroke={likedSongs.includes(currentTrack.title) ? "#f3b1b1" : "white"}
              />
            </button>
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={(e) => toggleDownload(currentTrack, e)}>
              <Download size={18} color={downloadedSongs.find(s => s.id === currentTrack.id || s.title === currentTrack.title) ? 'var(--card-orange)' : 'white'} />
            </button>
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsDeviceModalOpen(true)} title="Devices">
              <Cast size={18} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'inherit'} />
            </button>
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsLiveConnectOpen(true)} title="Live Connect" style={{ color: isLiveConnected ? 'var(--card-orange)' : 'inherit' }}>
              <Radio size={18} />
            </button>
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={toggleMiniPlayer} title="Widget">
              <Monitor size={18} />
            </button>
            <button className="d-player-icon-btn focusable" tabIndex={0} onClick={() => setIsDesktopFullscreenOpen(true)} title="Fullscreen">
              <Maximize2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Immersive Fullscreen Player */}
      {isDesktopFullscreenOpen && currentTrack && (
        <div className="desktop-fullscreen-player fadeIn">
          {/* Blurred Background */}
          <div
            className="fullscreen-bg-blur"
            style={{ backgroundImage: `url(${getSongImage(currentTrack)})` }}
          />
          <div className="fullscreen-overlay" />

          {/* Header */}
          <div className="fullscreen-header">
            <div className="fullscreen-logo">
              <img src="/icon.png" alt="Logo" className="logo-icon" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              {/* <span style={{ color: 'white' }}></span> */}
            </div>
            <button className="fullscreen-close-btn" onClick={() => setIsDesktopFullscreenOpen(false)} title="Close Fullscreen (Esc)">
              <Minimize2 size={24} />
            </button>
          </div>

          {/* Main Content Body */}
          <div className="fullscreen-body">
            {/* Left side: Album Art */}
            <div className="fullscreen-body-left">
              <div className="fullscreen-album-wrapper">
                <img
                  src={getSongImage(currentTrack)}
                  alt={currentTrack.title}
                  className="fullscreen-album-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop';
                  }}
                />
              </div>
            </div>

            {/* Right side: Controls & Queue */}
            <div className="fullscreen-body-right">
              <div className="fullscreen-glass-panel">
                <div className="fullscreen-track-details">
                  <h1 className="fullscreen-title">{currentTrack.title}</h1>
                  <p className="fullscreen-artist">{currentTrack.artist}</p>
                </div>

                {/* Timeline */}
                <div className="fullscreen-timeline-container">
                  <div className="fullscreen-time-labels">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTimeRemaining(currentTime, duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onPointerDown={() => setIsDraggingSlider(true)}
                    onPointerUp={handleProgressChangeComplete}
                    onTouchStart={() => setIsDraggingSlider(true)}
                    onTouchEnd={handleProgressChangeComplete}
                    onChange={handleProgressChange}
                    className="fullscreen-timeline-slider"
                    style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>

                {/* Playback Controls */}
                <div className="fullscreen-controls-container">
                  {/* Primary Controls */}
                  <div className="fullscreen-controls-primary">
                    <button className="fullscreen-icon-btn" onClick={toggleShuffleMode}>
                      <Sparkles size={24} fill={isShuffleMode ? "var(--card-orange)" : "none"} color={isShuffleMode ? "var(--card-orange)" : "white"} />
                    </button>

                    <button className="fullscreen-icon-btn focusable" tabIndex={0} onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()}>
                      <SkipBack size={28} />
                    </button>

                    <button className="fullscreen-play-btn focusable" tabIndex={0} onClick={togglePlay} onKeyDown={(e) => e.key === 'Enter' && togglePlay()}>
                      {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: '4px' }} />}
                    </button>

                    <button className="fullscreen-icon-btn focusable" tabIndex={0} onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()}>
                      <SkipForward size={28} />
                    </button>

                    <button className={`fullscreen-icon-btn ${likedSongs.includes(currentTrack.title) ? 'heartbeat' : ''}`} onClick={(e) => toggleLike(currentTrack.title, e)}>
                      <Heart
                        size={24}
                        fill={likedSongs.includes(currentTrack.title) ? "#f5954a" : "none"}
                        stroke={likedSongs.includes(currentTrack.title) ? "#f5954a" : "white"}
                      />
                    </button>
                  </div>

                  {/* Secondary Controls */}
                  <div className="fullscreen-controls-secondary">
                    <button className="fullscreen-icon-btn" onClick={() => setIsDeviceModalOpen(true)}>
                      <Cast size={20} color={activeDeviceId && !isLocalDeviceActive ? 'var(--card-orange, #f5954a)' : 'white'} />
                    </button>

                    <button className="fullscreen-icon-btn" onClick={() => setIsLiveConnectOpen(true)} title="Live Connect">
                      <Radio size={20} color={isLiveConnected ? 'var(--card-orange, #f5954a)' : 'white'} />
                    </button>

                    <button className="fullscreen-icon-btn" onClick={() => setShowEqModal(true)}>
                      <SlidersHorizontal size={20} color={showEqModal ? 'var(--card-orange)' : 'white'} />
                    </button>

                    <button className="fullscreen-icon-btn" onClick={(e) => handleShare(currentTrack, e)}>
                      <Share2 size={20} color="white" />
                    </button>
                  </div>
                </div>

                {/* Volume Row */}
                <div className="fullscreen-volume-row">
                  <Headphones size={18} style={{ opacity: 0.6 }} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    defaultValue="1"
                    onChange={handleVolumeChange}
                    className="fullscreen-volume-slider"
                    title="Volume"
                  />
                </div>

                {/* Up Next Section */}
                <div className="fullscreen-queue-section">
                  <div className="fullscreen-queue-header">UP NEXT</div>
                  <div className="fullscreen-queue-list hide-scrollbar">
                    {getUpcomingSongs().map(({ song, queueIndex }, idx) => (
                      <div key={song.id || idx} className="fullscreen-queue-item focusable" tabIndex={0} onClick={() => playSong(song, queueIndex, activePlaybackQueue)} onMouseEnter={() => prefetchSong(song)} onFocus={() => prefetchSong(song)}>
                        <img
                          src={getSongImage(song)}
                          alt={song.title}
                          className="fullscreen-queue-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=100&auto=format&fit=crop';
                          }}
                        />
                        <div className="fullscreen-queue-info">
                          <div className="fullscreen-queue-title">{song.title}</div>
                          <div className="fullscreen-queue-artist">{song.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Cover Modal */}
      {showEditCoverModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--panel-bg)', border: '1px solid var(--border-color)',
            padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>Change Cover</h2>
              <button className="focusable" tabIndex={0} onClick={() => setShowEditCoverModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <input
                type="text"
                placeholder="Paste new Image URL..."
                value={editCoverImg}
                onChange={(e) => setEditCoverImg(e.target.value)}
                style={{
                  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: '8px', padding: '12px', color: 'var(--text-color)', marginBottom: '20px',
                  outline: 'none', fontSize: '14px'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="focusable" tabIndex={0} onClick={() => setShowEditCoverModal(false)} style={{ padding: '12px 24px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button className="focusable" tabIndex={0} onClick={handleSaveCoverImage} style={{ padding: '12px 24px', borderRadius: '8px', background: 'var(--card-orange)', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Cover</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Playlist Modal/Dialog */}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ color: 'var(--text-color)', fontSize: '18px', fontWeight: '600', marginBottom: '16px', margin: 0 }}>Create New Playlist</h3>
            <form onSubmit={handleCreatePlaylist}>
              <div style={{ position: 'relative', margin: '16px 0 12px 0' }}>
                <input
                  type="text"
                  placeholder="Paste Spotify or JioSaavn Playlist Link"
                  value={newPlaylistLink}
                  onChange={(e) => setNewPlaylistLink(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--card-orange)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: 'var(--text-color)',
                    outline: 'none',
                    fontSize: '14px',
                    boxShadow: '0 0 10px rgba(230, 92, 0, 0.1)'
                  }}
                  autoFocus
                />
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-color)', margin: '8px 0', opacity: 0.6, fontSize: '12px', fontWeight: '500' }}>OR CREATE MANUALLY</div>
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-color)',
                  marginBottom: '12px',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <input
                type="text"
                placeholder="Playlist Image URL (optional)"
                value={newPlaylistImg}
                onChange={(e) => setNewPlaylistImg(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'var(--text-color)',
                  marginBottom: '20px',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingPlaylist}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: isCreatingPlaylist ? 'not-allowed' : 'pointer',
                    opacity: isCreatingPlaylist ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPlaylist}
                  style={{
                    background: 'var(--card-orange)',
                    border: 'none',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: isCreatingPlaylist ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isCreatingPlaylist ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isCreatingPlaylist ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Importing...
                    </>
                  ) : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Settings Container */}
      {isAccountSettingsOpen && <AccountSettings onClose={() => setIsAccountSettingsOpen(false)} />}

      {/* Download Settings Container */}
      {isDownloadOpen && <DownloadContainer onClose={() => setIsDownloadOpen(false)} downloadedSongs={downloadedSongs} playSong={playSong} />}

      {/* Live Connect Modal */}
      {isLiveConnectOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '450px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            color: 'var(--text-color)',
            animation: 'fadeIn 0.3s ease-out',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsLiveConnectOpen(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={24} />
            </button>
            <Radio size={48} style={{ color: 'var(--card-orange, #f5954a)', marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Live Connect</h2>

            {isLiveConnected ? (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
                  {liveSessionRole === 'host' ? 'You are hosting a live session.' : 'You are listening to a live session.'}
                </p>
                <div style={{
                  background: 'rgba(245, 149, 74, 0.1)',
                  border: '1px dashed var(--card-orange, #f5954a)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>SESSION CODE</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px', color: 'var(--card-orange, #f5954a)' }}>
                    {liveSessionCode}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px', color: 'var(--text-color)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1ed760', boxShadow: '0 0 10px #1ed760' }}></span>
                  <span style={{ fontWeight: '500' }}>{liveGuestCount} {liveGuestCount === 1 ? 'Listener' : 'Listeners'} Connected</span>
                </div>
                <button
                  onClick={() => disconnectLiveSession(triggerToast)}
                  style={{
                    background: '#ff4444',
                    border: 'none',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '24px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
                  }}
                >
                  {liveSessionRole === 'host' ? 'End Session' : 'Leave Session'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                  Listen to music together in real-time. Start a session to broadcast to others, or join a session using a code.
                </p>

                <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => startLiveSession(triggerToast)}
                    style={{
                      background: 'var(--card-orange, #f5954a)',
                      border: 'none',
                      color: 'white',
                      padding: '14px 24px',
                      borderRadius: '24px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      width: '100%',
                      boxShadow: '0 4px 12px rgba(245, 149, 74, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Plus size={20} />
                    Start Live Session
                  </button>
                </div>

                <div style={{ position: 'relative', margin: '24px 0' }}>
                  <hr style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none' }} />
                  <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--panel-bg)', padding: '0 12px', color: 'var(--text-secondary)', fontSize: '14px' }}>OR</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                    style={{
                      flex: 1,
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: 'var(--text-color)',
                      fontSize: '16px',
                      outline: 'none',
                      letterSpacing: '2px',
                      textTransform: 'uppercase'
                    }}
                  />
                  <button
                    onClick={() => joinLiveSession(null, triggerToast)}
                    disabled={joinCodeInput.length < 4}
                    style={{
                      background: joinCodeInput.length >= 4 ? 'white' : 'rgba(255,255,255,0.1)',
                      color: joinCodeInput.length >= 4 ? 'black' : 'rgba(255,255,255,0.3)',
                      border: 'none',
                      padding: '0 20px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      cursor: joinCodeInput.length >= 4 ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s'
                    }}
                  >
                    Join
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equalizer Modal */}
      {showEqModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            color: 'var(--text-color)',
            animation: 'fadeIn 0.3s ease-out',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowEqModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={24} />
            </button>
            <SlidersHorizontal size={48} style={{ color: 'var(--card-orange, #f5954a)', marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Equalizer</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>Fine-tune your audio frequencies.</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', height: '200px', marginBottom: '24px' }}>
              {eqFrequencies.map((freq, i) => (
                <div key={freq} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>+12</span>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.1"
                    value={eqGains[i]}
                    onChange={(e) => handleEqChange(i, parseFloat(e.target.value))}
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      appearance: 'slider-vertical',
                      width: '8px',
                      flex: 1,
                      accentColor: 'var(--card-orange)'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>-12</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '12px' }}>
                    {freq >= 1000 ? `${(freq / 1000).toFixed(1)}k` : freq}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const zeros = [0, 0, 0, 0, 0];
                setEqGains(zeros);
                zeros.forEach((v, i) => { if (eqBandsRef.current[i]) eqBandsRef.current[i].gain.value = v; });
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reset to Flat
            </button>
          </div>
        </div>
      )}

      <DeviceConnectModal />

      {/* Mini Player React Portal */}
      {pipWindow && createPortal(
        <div style={{
          background: 'var(--panel-bg, #1e1e1e)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <img
            src={currentTrack ? getSongImage(currentTrack) : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop'}
            alt={currentTrack?.title}
            style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover', marginBottom: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}
          />
          <div style={{ color: 'var(--text-color, #fff)', fontWeight: 'bold', textAlign: 'center', fontSize: '15px', marginBottom: '4px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.title || 'No Track Playing'}
          </div>
          <div style={{ color: 'var(--text-secondary, #aaa)', fontSize: '12px', marginBottom: '20px', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.artist || 'Unknown Artist'}
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button className="focusable" tabIndex={0} onClick={playPreviousSong} onKeyDown={(e) => e.key === 'Enter' && playPreviousSong()} style={{ background: 'none', border: 'none', color: 'var(--text-color, #fff)', cursor: 'pointer', display: 'flex' }}>
              <SkipBack size={22} />
            </button>
            <button className="focusable" tabIndex={0} onClick={togglePlay} onKeyDown={(e) => e.key === 'Enter' && togglePlay()} style={{ background: 'var(--card-orange, #f5954a)', border: 'none', color: 'white', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245, 149, 74, 0.4)' }}>
              {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" style={{ marginLeft: '4px' }} />}
            </button>
            <button className="focusable" tabIndex={0} onClick={playNextSong} onKeyDown={(e) => e.key === 'Enter' && playNextSong()} style={{ background: 'none', border: 'none', color: 'var(--text-color, #fff)', cursor: 'pointer', display: 'flex' }}>
              <SkipForward size={22} />
            </button>
          </div>
        </div>,
        pipWindow.document.body
      )}
    </div>
  )
}

export default App