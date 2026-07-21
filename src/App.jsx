import {
  Play, Pause, SkipForward, SkipBack, ArrowLeft, Heart,
  Search, Plus, Download, Radio, Headphones,
  Sparkles, Check, ChevronDown, ListMusic, X,
  Home, PlusSquare, BarChart2, Sun, Moon, Maximize2, Minimize2, Monitor,
  ChevronLeft, MoreVertical, MoreHorizontal, Volume1, Volume2, ChevronsLeft, ChevronsRight,
  Shuffle, Repeat, SlidersHorizontal, Lock, Equal, Cast, Share2
} from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc, setDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from './services/firebase'
import Header from './components/Header'
import HeroCard from './components/HeroCard'

import SuggestedSongsList from './components/SuggestedSongsList'
const MagicShuffle = lazy(() => import('./components/MagicShuffle'))
import BottomNav from './components/BottomNav'
import { searchSongs, searchPlaylists, getPlaylistDetails, getPlayableStreamForSong, getSongDetails } from './services/saavn'
import { MediaSession } from '@jofr/capacitor-media-session';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { saveSongBlob, deleteSongBlob } from './services/idb';
const AccountSettings = lazy(() => import('./components/AccountSettings'))
const DeviceConnectModal = lazy(() => import('./components/DeviceConnectModal'))
const EqModal = lazy(() => import('./features/EqModal'))
const PlaylistModals = lazy(() => import('./features/PlaylistModals'))
const DesktopPlayer = lazy(() => import('./features/DesktopPlayer'))
const NowPlayingSheet = lazy(() => import('./features/NowPlayingSheet'))
const MiniPlayer = lazy(() => import('./features/MiniPlayer'))
const DesktopBottomPlayerBar = lazy(() => import('./features/DesktopBottomPlayerBar'))
const HomeView = lazy(() => import('./features/HomeView'))
const ArtistDetailView = lazy(() => import('./features/ArtistDetailView'))
const PlaylistDetailView = lazy(() => import('./features/PlaylistDetailView'))
const SaavnPlaylistView = lazy(() => import('./features/SaavnPlaylistView'))
const SearchView = lazy(() => import('./features/SearchView'))
const LikedSongsView = lazy(() => import('./features/LikedSongsView'))
const CustomPlaylistDetailView = lazy(() => import('./features/CustomPlaylistDetailView'))
const LibraryView = lazy(() => import('./features/LibraryView'))
const VibeStatsView = lazy(() => import('./features/VibeStatsView'))
import { useDeviceConnect } from './contexts/DeviceConnectContext'
import { useAuth } from './contexts/AuthContext'
import { usePlayer } from './contexts/PlayerContext'
import { useLiveConnect } from './contexts/LiveConnectContext'
import { useAppContext } from './contexts/AppContext'

import { usePlaylists } from './contexts/PlaylistContext';
import AsyncArtistImage from './components/AsyncArtistImage';

const DownloadContainer = lazy(() => import('./components/DownloadContainer'))
import './App.css'

const WidgetPlugin = registerPlugin('WidgetPlugin');
const NativeAudio = registerPlugin('NativeAudio');



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

  const artistSongsParentRef = useRef(null)
  const artistSongsVirtualizer = useVirtualizer({
    count: artistSongs.length,
    getScrollElement: () => artistSongsParentRef.current,
    estimateSize: () => 64, // Approximate row height in px
    overscan: 5
  })

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
  
  const searchResultsParentRef = useRef(null)
  const searchResultsVirtualizer = useVirtualizer({
    count: searchResults.length,
    getScrollElement: () => searchResultsParentRef.current,
    estimateSize: () => 64, // Approximate row height in px
    overscan: 5
  })
  
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

    const finalName = newPlaylistName.trim();
    const finalImg = newPlaylistImg.trim();

    if (!finalName) {
      triggerToast('Please enter a playlist name.');
      return;
    }

    setIsCreatingPlaylist(true);

    try {
      const creator = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : null) || localStorage.getItem('username') || 'Anonymous'

      const docRef = doc(collection(db, 'playlists'))
      const newId = docRef.id

      const newPl = {
        id: newId,
        name: finalName,
        img: finalImg || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
        songs: [],
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
      setShowCreateModal(false)
      triggerToast(`Created playlist "${newPl.name}"!`)
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

  // Hardware Back Button Handler for Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle = null;
    const registerListener = async () => {
      listenerHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        if (isNowPlayingOpen) {
          closeNowPlaying();
        } else if (isMelophileOpen) {
          setIsMelophileOpen(false);
        } else if (isDesktopFullscreenOpen) {
          setIsDesktopFullscreenOpen(false);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        } else if (showEditCoverModal) {
          setShowEditCoverModal(false);
        } else if (isAccountSettingsOpen) {
          setIsAccountSettingsOpen(false);
        } else if (isLiveConnectOpen) {
          setIsLiveConnectOpen(false);
        } else if (isDeviceModalOpen) {
          setIsDeviceModalOpen(false);
        } else if (isDownloadOpen) {
          setIsDownloadOpen(false);
        } else if (selectedSaavnPlaylist) {
          setSelectedSaavnPlaylist(null);
        } else if (selectedPlaylist) {
          setSelectedPlaylist(null);
        } else if (selectedArtist) {
          setSelectedArtist(null);
        } else if (activeTab !== 'home') {
          setActiveTab('home');
        } else {
          CapApp.minimizeApp();
        }
      });
    };

    registerListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [
    isNowPlayingOpen, isMelophileOpen, isDesktopFullscreenOpen,
    showCreateModal, showEditCoverModal, isAccountSettingsOpen,
    isLiveConnectOpen, isDeviceModalOpen, isDownloadOpen,
    selectedSaavnPlaylist, selectedPlaylist, selectedArtist, activeTab
  ]);

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
            <ArtistDetailView
              selectedArtist={selectedArtist}
              setSelectedArtist={setSelectedArtist}
              setActiveTab={setActiveTab}
              artistSongs={artistSongs}
              shuffleQueue={shuffleQueue}
              isLoadingArtistSongs={isLoadingArtistSongs}
              artistSongsParentRef={artistSongsParentRef}
              artistSongsVirtualizer={artistSongsVirtualizer}
              currentTrack={currentTrack}
              playSong={playSong}
              prefetchSong={prefetchSong}
              isPlaying={isPlaying}
              getSongImage={getSongImage}
              toggleLike={toggleLike}
              likedSongs={likedSongs}
              formatTime={formatTime}
            />
          ) : isMelophileOpen ? (
            <PlaylistDetailView
              setIsMelophileOpen={setIsMelophileOpen}
              shuffleQueue={shuffleQueue}
              currentTrack={currentTrack}
              playSong={playSong}
              prefetchSong={prefetchSong}
              getSongImage={getSongImage}
              isPlaying={isPlaying}
              triggerToast={triggerToast}
            />
          ) : (
            <HomeView
              listeningActivity={listeningActivity}
              playlists={playlists}
              savedPlaylistIds={savedPlaylistIds}
              setSelectedPlaylist={setSelectedPlaylist}
              setActiveTab={setActiveTab}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              getSuggestedSongs={getSuggestedSongs}
              playSong={playSong}
              triggerToast={triggerToast}
            />
          )
        )}

        {/* 2. SEARCH TAB */}
        {activeTab === 'search' && (
          selectedSaavnPlaylist ? (
            <SaavnPlaylistView
              selectedSaavnPlaylist={selectedSaavnPlaylist}
              setSelectedSaavnPlaylist={setSelectedSaavnPlaylist}
              playlists={playlists}
              setPlaylists={setPlaylists}
              savedPlaylistIds={savedPlaylistIds}
              setSavedPlaylistIds={setSavedPlaylistIds}
              triggerToast={triggerToast}
              currentUser={currentUser}
              shuffleQueue={shuffleQueue}
              currentTrack={currentTrack}
              playSong={playSong}
              prefetchSong={prefetchSong}
              getSongImage={getSongImage}
              isPlaying={isPlaying}
            />
          ) : (
            <SearchView
              handleSearch={handleSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              isLoadingSaavnPlaylist={isLoadingSaavnPlaylist}
              searchResults={searchResults}
              searchPlaylistsResults={searchPlaylistsResults}
              handlePlaylistCardClick={handlePlaylistCardClick}
              searchResultsParentRef={searchResultsParentRef}
              searchResultsVirtualizer={searchResultsVirtualizer}
              currentTrack={currentTrack}
              playSong={playSong}
              prefetchSong={prefetchSong}
              isPlaying={isPlaying}
            />
          )
        )}

        {/* 3. PLAYLISTS/CREATE TAB */}
        {activeTab === 'create' && (
          isLikedSongsOpen ? (
            <LikedSongsView
              setIsLikedSongsOpen={setIsLikedSongsOpen}
              likedSongs={likedSongs}
              getLikedSongsList={getLikedSongsList}
              shuffleQueue={shuffleQueue}
              currentTrack={currentTrack}
              playSong={playSong}
              triggerToast={triggerToast}
              getSongImage={getSongImage}
              isPlaying={isPlaying}
              toggleLike={toggleLike}
            />
          ) : selectedPlaylist ? (
            <CustomPlaylistDetailView
              currentUser={currentUser}
              selectedPlaylist={selectedPlaylist}
              setSelectedPlaylist={setSelectedPlaylist}
              setPlaylistSearchQuery={setPlaylistSearchQuery}
              setPlaylistSearchResults={setPlaylistSearchResults}
              handleDeletePlaylist={handleDeletePlaylist}
              setEditCoverImg={setEditCoverImg}
              setShowEditCoverModal={setShowEditCoverModal}
              shuffleQueue={shuffleQueue}
              savedPlaylistIds={savedPlaylistIds}
              setSavedPlaylistIds={setSavedPlaylistIds}
              triggerToast={triggerToast}
              currentTrack={currentTrack}
              playSong={playSong}
              getSongImage={getSongImage}
              isPlaying={isPlaying}
              removeSongFromPlaylist={removeSongFromPlaylist}
              handlePlaylistSearch={handlePlaylistSearch}
              playlistSearchQuery={playlistSearchQuery}
              isSearchingPlaylistSongs={isSearchingPlaylistSongs}
              getSuggestedSongs={getSuggestedSongs}
              playlistSearchResults={playlistSearchResults}
              addSongToPlaylist={addSongToPlaylist}
            />
          ) : (
            <LibraryView
              playlists={playlists}
              savedPlaylistIds={savedPlaylistIds}
              likedSongs={likedSongs}
              setShowCreateModal={setShowCreateModal}
              setIsLikedSongsOpen={setIsLikedSongsOpen}
              setSelectedPlaylist={setSelectedPlaylist}
            />
          )
        )}

        {/* 4. VIBE STATS TAB */}
        {activeTab === 'library' && (
          <VibeStatsView
            setIsAccountSettingsOpen={setIsAccountSettingsOpen}
            currentUser={currentUser}
            playsCount={playsCount}
            dailyPlays={dailyPlays}
            artistPlays={artistPlays}
            isDarkMode={isDarkMode}
            showAllComposers={showAllComposers}
            setShowAllComposers={setShowAllComposers}
          />
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

      {isNowPlayingOpen && currentTrack && (
        <NowPlayingSheet
          isNowPlayingOpen={isNowPlayingOpen}
          isNowPlayingClosing={isNowPlayingClosing}
          currentTrack={currentTrack}
          getSongImage={getSongImage}
          closeNowPlaying={closeNowPlaying}
          showUpNext={showUpNext}
          setShowUpNext={setShowUpNext}
          duration={duration}
          currentTime={currentTime}
          setIsDraggingSlider={setIsDraggingSlider}
          handleProgressChangeComplete={handleProgressChangeComplete}
          handleProgressChange={handleProgressChange}
          formatTime={formatTime}
          formatTimeRemaining={formatTimeRemaining}
          likedSongs={likedSongs}
          toggleLike={toggleLike}
          playPreviousSong={playPreviousSong}
          togglePlay={togglePlay}
          isPlaying={isPlaying}
          playNextSong={playNextSong}
          downloadedSongs={downloadedSongs}
          toggleDownload={toggleDownload}
          isLiveConnected={isLiveConnected}
          setIsLiveConnectOpen={setIsLiveConnectOpen}
          isEarPodsActive={isEarPodsActive}
          setIsEarPodsActive={setIsEarPodsActive}
          connectBluetooth={connectBluetooth}
          triggerToast={triggerToast}
          audioRef={audioRef}
          gainNodeRef={gainNodeRef}
          handleVolumeChange={handleVolumeChange}
          showEqModal={showEqModal}
          setShowEqModal={setShowEqModal}
          getUpcomingSongs={getUpcomingSongs}
          playSong={playSong}
          activePlaybackQueue={activePlaybackQueue}
          prefetchSong={prefetchSong}
        />
      )}

      {/* E. MOBILE FLOATING MINI PLAYER */}
      <MiniPlayer
        currentTrack={currentTrack}
        isNowPlayingOpen={isNowPlayingOpen}
        isFloatingPlayer={isFloatingPlayer}
        setIsFloatingPlayer={setIsFloatingPlayer}
        floatingPos={floatingPos}
        setFloatingPos={setFloatingPos}
        dragRef={dragRef}
        setIsNowPlayingOpen={setIsNowPlayingOpen}
        getSongImage={getSongImage}
        preventClick={preventClick}
        setPreventClick={setPreventClick}
        handleFloatingTouchStart={handleFloatingTouchStart}
        handleFloatingTouchMove={handleFloatingTouchMove}
        handleFloatingTouchEnd={handleFloatingTouchEnd}
        handleMiniPlayerTouchStart={handleMiniPlayerTouchStart}
        handleMiniPlayerTouchEnd={handleMiniPlayerTouchEnd}
        handleMiniPlayerTouchMove={handleMiniPlayerTouchMove}
        duration={duration}
        currentTime={currentTime}
        setIsDraggingSlider={setIsDraggingSlider}
        handleProgressChangeComplete={handleProgressChangeComplete}
        handleProgressChange={handleProgressChange}
        activeDeviceId={activeDeviceId}
        isLocalDeviceActive={isLocalDeviceActive}
        setIsDeviceModalOpen={setIsDeviceModalOpen}
        isPlaying={isPlaying}
        togglePlay={togglePlay}
        playNextSong={playNextSong}
      />

      {/* MOBILE BOTTOM NAVIGATION */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* F. DESKTOP BOTTOM PLAYER BAR (Desktop only) */}
      <DesktopBottomPlayerBar
        currentTrack={currentTrack}
        getSongImage={getSongImage}
        playPreviousSong={playPreviousSong}
        togglePlay={togglePlay}
        isPlaying={isPlaying}
        playNextSong={playNextSong}
        formatTime={formatTime}
        currentTime={currentTime}
        duration={duration}
        setIsDraggingSlider={setIsDraggingSlider}
        handleProgressChangeComplete={handleProgressChangeComplete}
        handleProgressChange={handleProgressChange}
        formatTimeRemaining={formatTimeRemaining}
        toggleLike={toggleLike}
        likedSongs={likedSongs}
        toggleDownload={toggleDownload}
        downloadedSongs={downloadedSongs}
        setIsDeviceModalOpen={setIsDeviceModalOpen}
        activeDeviceId={activeDeviceId}
        isLocalDeviceActive={isLocalDeviceActive}
        setIsLiveConnectOpen={setIsLiveConnectOpen}
        isLiveConnected={isLiveConnected}
        toggleMiniPlayer={toggleMiniPlayer}
        setIsDesktopFullscreenOpen={setIsDesktopFullscreenOpen}
      />

      {/* Desktop Immersive Fullscreen Player */}
      <DesktopPlayer
        isDesktopFullscreenOpen={isDesktopFullscreenOpen}
        setIsDesktopFullscreenOpen={setIsDesktopFullscreenOpen}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        isShuffleMode={isShuffleMode}
        likedSongs={likedSongs}
        toggleLike={toggleLike}
        handleProgressChange={handleProgressChange}
        handleProgressChangeComplete={handleProgressChangeComplete}
        setIsDraggingSlider={setIsDraggingSlider}
        toggleShuffleMode={toggleShuffleMode}
        playPreviousSong={playPreviousSong}
        togglePlay={togglePlay}
        playNextSong={playNextSong}
        setIsDeviceModalOpen={setIsDeviceModalOpen}
        isLiveConnected={isLiveConnected}
        setIsLiveConnectOpen={setIsLiveConnectOpen}
        showEqModal={showEqModal}
        setShowEqModal={setShowEqModal}
        handleShare={handleShare}
        handleVolumeChange={handleVolumeChange}
        getUpcomingSongs={getUpcomingSongs}
        playSong={playSong}
        activePlaybackQueue={activePlaybackQueue}
        prefetchSong={prefetchSong}
        getSongImage={getSongImage}
        formatTime={formatTime}
        formatTimeRemaining={formatTimeRemaining}
        activeDeviceId={activeDeviceId}
        isLocalDeviceActive={isLocalDeviceActive}
      />

      {/* Playlist Modals */}
      <PlaylistModals
        showEditCoverModal={showEditCoverModal}
        setShowEditCoverModal={setShowEditCoverModal}
        editCoverImg={editCoverImg}
        setEditCoverImg={setEditCoverImg}
        handleSaveCoverImage={handleSaveCoverImage}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        handleCreatePlaylist={handleCreatePlaylist}
        newPlaylistName={newPlaylistName}
        setNewPlaylistName={setNewPlaylistName}
        newPlaylistImg={newPlaylistImg}
        setNewPlaylistImg={setNewPlaylistImg}
        isCreatingPlaylist={isCreatingPlaylist}
      />

      {/* Account Settings Container */}
      <Suspense fallback={null}>
        {isAccountSettingsOpen && <AccountSettings onClose={() => setIsAccountSettingsOpen(false)} />}
      </Suspense>

      {/* Download Settings Container */}
      <Suspense fallback={null}>
        {isDownloadOpen && <DownloadContainer onClose={() => setIsDownloadOpen(false)} downloadedSongs={downloadedSongs} playSong={playSong} />}
      </Suspense>

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
      <EqModal
        showEqModal={showEqModal}
        setShowEqModal={setShowEqModal}
        eqFrequencies={eqFrequencies}
        eqGains={eqGains}
        handleEqChange={handleEqChange}
        setEqGains={setEqGains}
        eqBandsRef={eqBandsRef}
      />

      <Suspense fallback={null}>
        <DeviceConnectModal />
      </Suspense>

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