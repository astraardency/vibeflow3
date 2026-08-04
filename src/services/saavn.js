import { ENV } from '../config/env';
import { CACHE_TTLS, DEFAULT_IMAGES } from '../config/constants';
import { findBestMatch } from '../utils/musicMatchingUtils';

const API_ENDPOINTS = ENV.SAAVN_ENDPOINTS.filter(Boolean);

const songCache = new Map();
const searchCache = new Map();

/**
 * Makes a fetch request with retry logic and endpoint fallback
 */
const fetchWithRetry = async (path, maxRetries = 1) => {
  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const promises = API_ENDPOINTS.map(base => {
        return new Promise(async (resolve, reject) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(`${base}${path}`, { signal: controller.signal });
            clearTimeout(timeout);
            if (response.ok) {
              const data = await response.json();
              const isValid = data && (Array.isArray(data) || data.data !== undefined || data.results !== undefined || data.songs !== undefined || data.success === true);
              if (isValid && data.success !== false) {
                resolve(data);
              } else {
                reject(new Error('Invalid data'));
              }
            } else {
              reject(new Error(`HTTP Error ${response.status}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      return await Promise.any(promises);
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }
  return null;
};

/**
 * Decodes HTML entities from text strings
 */
const decodeHTMLEntities = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') text = String(text);
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return doc.documentElement.textContent || text;
  } catch (e) {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&apos;/g, "'");
  }
};

/**
 * Searches for Tamil songs from the music library
 * @param {string} query - The search term
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} List of formatted songs
 */
export const searchSongs = async (query, limit = 40) => {
  const cacheKey = `search_v2_${query}_${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) {
        searchCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) { console.warn('Storage quota exceeded', e); }

  try {
    // Dual API Fetch to get missing songs
    const primaryApi = ENV.SAAVN_ENDPOINTS[1] || 'https://saavn.dev/api';
    const secondaryApi = ENV.SAAVN_ENDPOINTS[2] || 'https://jiosaavn-api-v3.vercel.app/api';
    const path = `/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;

    const [primaryRes, secondaryRes] = await Promise.allSettled([
      fetch(`${primaryApi}${path}`).then(res => res.ok ? res.json() : null),
      fetch(`${secondaryApi}${path}`).then(res => res.ok ? res.json() : null)
    ]);

    let combinedRaw = [];
    if (primaryRes.status === 'fulfilled' && primaryRes.value) {
      const data = primaryRes.value;
      const raw = data?.data?.results || data?.results || (Array.isArray(data?.data) ? data.data : []);
      combinedRaw = [...combinedRaw, ...raw];
    }
    if (secondaryRes.status === 'fulfilled' && secondaryRes.value) {
      const data = secondaryRes.value;
      const raw = data?.data?.results || data?.results || (Array.isArray(data?.data) ? data.data : []);
      combinedRaw = [...combinedRaw, ...raw];
    }

    if (combinedRaw.length > 0) {
      let songs = combinedRaw.map(formatSongData).filter(s => s && s.audioUrl);

      // De-duplicate by title + artist
      const unique = [];
      const seen = new Set();
      for (const song of songs) {
        const key = `${(song.title || '').toLowerCase()}-${(song.artist || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(song);
        }
      }
      songs = unique;

      const targetLangs = ['english', 'korean', 'japanese'];
      songs.sort((a, b) => {
        const aLang = a.language?.toLowerCase() || '';
        const bLang = b.language?.toLowerCase() || '';
        const aPrio = targetLangs.includes(aLang) ? 1 : 0;
        const bPrio = targetLangs.includes(bLang) ? 1 : 0;
        return bPrio - aPrio;
      });

      searchCache.set(cacheKey, songs);
      setTimeout(() => searchCache.delete(cacheKey), CACHE_TTLS.SEARCH);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: songs,
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('Storage quota exceeded', e); }

      return songs;
    }
    return [];
  } catch (error) {
    console.error('Error searching songs:', error);
    return [];
  }
};

/**
 * Searches for Artists from JioSaavn
 * @param {string} query - The search term
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} List of formatted artists
 */
export const searchArtists = async (query, limit = 5) => {
  const cacheKey = `search_artist_v2_${query}_${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTLS.ARTIST) {
        searchCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) { console.warn('Storage quota exceeded', e); }

  try {
    const data = await fetchWithRetry(`/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`);

    if (data && data.data && data.data.results) {
      const artists = data.data.results.map(artist => {
        let imgUrl = DEFAULT_IMAGES.ARTIST;
        if (artist.image && Array.isArray(artist.image) && artist.image.length > 0) {
          imgUrl = artist.image[artist.image.length - 1].url || artist.image[artist.image.length - 1].link || imgUrl;
        } else if (typeof artist.image === 'string') {
          imgUrl = artist.image;
        }
        return {
          id: artist.id,
          name: decodeHTMLEntities(artist.name || artist.title || 'Unknown Artist'),
          img: imgUrl,
        };
      });

      searchCache.set(cacheKey, artists);
      setTimeout(() => searchCache.delete(cacheKey), CACHE_TTLS.SEARCH);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: artists,
          timestamp: Date.now()
        }));
      } catch (e) { console.warn('Storage quota exceeded', e); }

      return artists;
    }
    return [];
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
};

/**
 * Gets the best matching playable stream for a local song object
 * @param {Object} song - The local song object
 * @returns {Promise<Object|null>} The best matching saavn song
 */
export const getPlayableStreamForSong = async (song) => {
  if (!song) return null;
  const cleanTitle = (song.title || '').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim();
  const primaryArtist = (song.artist || '').split(',')[0].trim();
  const movie = song.movie || song.album || '';
  const queryStr = song.query || `${cleanTitle} ${movie} ${primaryArtist}`.trim();
  const queryCacheKey = `query_to_id_${queryStr.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // 1. Resolve Saavn ID (check song itself, then localStorage)
  let saavnId = (song.id && typeof song.id === 'string' && song.id.length > 5 && !song.id.includes('dummy') && !song.id.startsWith('song_')) ? song.id : null;

  if (!saavnId && queryStr) {
    try {
      saavnId = localStorage.getItem(queryCacheKey);
    } catch (e) { console.warn('Storage quota exceeded', e); }
  }

  // 2. If we have Saavn ID, check details cache (in-memory or sessionStorage)
  if (saavnId) {
    const cacheKey = `song_${saavnId}`;
    let cachedSong = null;

    if (songCache.has(cacheKey)) {
      cachedSong = songCache.get(cacheKey);
    } else {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTLS.SONG_DETAILS) { // 25 mins validity
            cachedSong = parsed.data;
            songCache.set(cacheKey, cachedSong);
          }
        }
      } catch (e) { console.warn('Storage quota exceeded', e); }
    }

    if (cachedSong && cachedSong.audioUrl) {
      return cachedSong;
    }

    // Direct detail fetch (cache miss but ID is known)
    const directMatch = await getSongDetails(saavnId);
    if (directMatch && directMatch.audioUrl) {
      songCache.set(cacheKey, directMatch);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: directMatch,
          timestamp: Date.now()
        }));
        // Store static ID mapping permanently
        if (queryStr) {
          localStorage.setItem(queryCacheKey, saavnId);
        }
      } catch (e) { console.warn('Storage quota exceeded', e); }
      return directMatch;
    }
  }

  let results = await searchSongs(queryStr, 20);
  let playableResult = (results && results.length > 0) ? findBestMatch(results, cleanTitle, primaryArtist, movie, song) : null;

  // Fallback: search with only the clean title
  if (!playableResult && cleanTitle) {
    const fallbackResults = await searchSongs(cleanTitle, 20);
    if (fallbackResults && fallbackResults.length > 0) {
      playableResult = findBestMatch(fallbackResults, cleanTitle, primaryArtist, movie, song);
    }
  }

  // Save resolved mappings
  if (playableResult && playableResult.id) {
    const cacheKey = `song_${playableResult.id}`;
    songCache.set(cacheKey, playableResult);

    try {
      // 1. Cache details in sessionStorage (25 min TTL)
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: playableResult,
        timestamp: Date.now()
      }));

      // 2. Cache query-to-ID mapping permanently in localStorage
      if (queryStr) {
        localStorage.setItem(queryCacheKey, playableResult.id);
      }
    } catch (e) { console.warn('Storage quota exceeded', e); }
  }

  return playableResult;
};

/**
 * Gets direct details of a song by ID
 * @param {string} id - The song ID
 * @returns {Promise<Object|null>} Formatted song object
 */
export const getSongDetails = async (id) => {
  const cacheKey = `song_${id}`;
  if (songCache.has(cacheKey)) {
    return songCache.get(cacheKey);
  }

  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTLS.SONG_DETAILS) { // 25 mins validity
        songCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) { console.warn('Storage quota exceeded', e); }

  try {
    const data = await fetchWithRetry(`/songs/${id}`);

    const rawSong = data?.data?.[0] || (Array.isArray(data?.data) ? data.data[0] : data?.data) || data?.results?.[0];

    if (rawSong) {
      const result = formatSongData(rawSong);
      if (result && result.audioUrl) {
        songCache.set(cacheKey, result);
        // Expire cache after 30 minutes in-memory
        setTimeout(() => songCache.delete(cacheKey), 30 * 60 * 1000);

        // Cache in sessionStorage (25 mins TTL)
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            timestamp: Date.now()
          }));
        } catch (e) { console.warn('Storage quota exceeded', e); }
      }
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error fetching song details:', error);
    return null;
  }
};

/**
 * Helper to normalize song data across different API responses
 */
const formatSongData = (song) => {
  if (!song) return null;
  let imgUrl = DEFAULT_IMAGES.PLACEHOLDER;
  if (song.image && Array.isArray(song.image) && song.image.length > 0) {
    const isStringArray = typeof song.image[0] === 'string';
    if (isStringArray) {
      imgUrl = song.image[song.image.length - 1];
    } else {
      const lastImg = song.image[song.image.length - 1];
      imgUrl = lastImg?.url || lastImg?.link || imgUrl;
    }
  } else if (typeof song.image === 'string') {
    imgUrl = song.image;
  }
  if (!imgUrl || imgUrl.includes('default_') || imgUrl.includes('placeholder')) {
    imgUrl = DEFAULT_IMAGES.PLACEHOLDER;
  }

  // Extract best quality download URL (prefer 320kbps, fall back to 160kbps, then others)
  let rawUrlData = song.downloadUrl || song.download_url || song.media_url || song.url || song.media_preview_url || song.stream_url;
  let audioUrl = '';

  if (rawUrlData) {
    if (Array.isArray(rawUrlData) && rawUrlData.length > 0) {
      const isStringArray = typeof rawUrlData[0] === 'string';
      if (isStringArray) {
        audioUrl = rawUrlData[rawUrlData.length - 1];
      } else {
        const best = rawUrlData.find(d => d?.quality === '320kbps')
          || rawUrlData.find(d => d?.quality === '160kbps')
          || rawUrlData.find(d => d?.quality === '96kbps')
          || rawUrlData.find(d => d?.quality === '48kbps')
          || rawUrlData[rawUrlData.length - 1];
        audioUrl = best ? (best.url || best.link || '') : '';
      }
    } else if (typeof rawUrlData === 'string') {
      audioUrl = rawUrlData;
    }
  }

  if (audioUrl && audioUrl.startsWith('http://')) {
    audioUrl = audioUrl.replace('http://', 'https://');
  }

  // Extract artists
  let artistName = 'Unknown Artist';
  if (song.artists && song.artists.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
    artistName = song.artists.primary.map(a => typeof a === 'string' ? decodeHTMLEntities(a) : decodeHTMLEntities(a?.name || a || '')).filter(Boolean).join(', ');
  } else if (song.primaryArtists) {
    if (typeof song.primaryArtists === 'string') {
      artistName = decodeHTMLEntities(song.primaryArtists);
    } else if (Array.isArray(song.primaryArtists)) {
      artistName = song.primaryArtists.map(a => typeof a === 'string' ? decodeHTMLEntities(a) : decodeHTMLEntities(a?.name || a || '')).filter(Boolean).join(', ');
    } else if (typeof song.primaryArtists === 'object') {
      artistName = decodeHTMLEntities(song.primaryArtists.name || song.primaryArtists.title || '');
    }
  }
  if (!artistName) {
    artistName = 'Unknown Artist';
  }

  return {
    id: song.id,
    title: decodeHTMLEntities(song.name || song.title || 'Untitled').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim(),
    artist: artistName,
    img: imgUrl,
    audioUrl: audioUrl,
    duration: song.duration ? parseInt(song.duration) : 0,
    album: decodeHTMLEntities(song.album?.name || song.album || ''),
    language: (song.language || '').toLowerCase(),
    fetchedAt: Date.now()
  };
};

/**
 * Searches for playlists from JioSaavn
 * @param {string} query - The search query
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} List of formatted playlist objects
 */
export const searchPlaylists = async (query, limit = 20) => {
  try {
    const data = await fetchWithRetry(`/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}`);

    if (data && data.data && data.data.results) {
      return data.data.results.map(playlist => {
        let imgUrl = DEFAULT_IMAGES.PLACEHOLDER;
        if (playlist.image && Array.isArray(playlist.image) && playlist.image.length > 0) {
          imgUrl = playlist.image[playlist.image.length - 1].url || playlist.image[playlist.image.length - 1].link || imgUrl;
        } else if (typeof playlist.image === 'string') {
          imgUrl = playlist.image;
        }
        return {
          id: playlist.id,
          title: decodeHTMLEntities(playlist.name || playlist.title || 'Untitled Playlist'),
          img: imgUrl,
          songCount: playlist.songCount || playlist.shares || '0',
          description: decodeHTMLEntities(playlist.description || ''),
          url: playlist.url || playlist.perma_url || ''
        };
      });
    }
    return [];
  } catch (error) {
    console.error('Error searching playlists:', error);
    return [];
  }
};

/**
 * Gets details of a playlist including songs by ID
 * @param {string} id - The playlist ID
 * @returns {Promise<Object|null>} Formatted playlist details with songs
 */
export const getPlaylistDetails = async (id, limit = 50) => {
  try {
    let page = 1;
    let allSongs = [];
    let playlistInfo = null;
    let keepFetching = true;

    while (keepFetching) {
      const data = await fetchWithRetry(`/playlists?id=${id}&limit=${limit}&page=${page}`);

      if (data && data.data) {
        if (!playlistInfo) playlistInfo = data.data;
        const currentSongs = data.data.songs || [];
        allSongs = [...allSongs, ...currentSongs];
        
        const songCount = data.data.songCount || 0;
        
        if (currentSongs.length === 0 || currentSongs.length < limit || page >= 200) {
          keepFetching = false;
        } else {
          page++;
        }
      } else {
        keepFetching = false;
      }
    }

    if (playlistInfo) {
      let imgUrl = DEFAULT_IMAGES.PLACEHOLDER;
      if (playlistInfo.image && Array.isArray(playlistInfo.image) && playlistInfo.image.length > 0) {
        imgUrl = playlistInfo.image[playlistInfo.image.length - 1].url || playlistInfo.image[playlistInfo.image.length - 1].link || imgUrl;
      } else if (typeof playlistInfo.image === 'string') {
        imgUrl = playlistInfo.image;
      }
      let songs = allSongs.map(formatSongData).filter(Boolean);

      return {
        id: playlistInfo.id,
        title: decodeHTMLEntities(playlistInfo.name || playlistInfo.title || 'Untitled Playlist'),
        img: imgUrl,
        description: decodeHTMLEntities(playlistInfo.description || ''),
        songs: songs
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    return null;
  }
};
