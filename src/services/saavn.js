// Primary and fallback API endpoints
const API_ENDPOINTS = [
  'http://localhost:5000/api',
  'https://saavn.sumit.co/api',
];

// Session-level cache to avoid duplicate API calls during same session
const songCache = new Map();
const searchCache = new Map();

/**
 * Makes a fetch request with retry logic and endpoint fallback
 */
const fetchWithRetry = async (path, maxRetries = 1) => {
  for (let endpointIdx = 0; endpointIdx < API_ENDPOINTS.length; endpointIdx++) {
    const base = API_ENDPOINTS[endpointIdx];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`${base}${path}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          if (data && data.success !== false) return data;
        }
      } catch (err) {
        if (attempt === maxRetries && endpointIdx === API_ENDPOINTS.length - 1) throw err;
        // Exponential backoff: 200ms, 400ms
        await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
      }
    }
  }
  return null;
};

/**
 * Decodes HTML entities from text strings
 */
const decodeHTMLEntities = (text) => {
  if (!text) return '';
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
  const cacheKey = `search_${query}_${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  // Check sessionStorage for search query caching
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 15 * 60 * 1000) { // 15 mins cache
        searchCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) {}

  try {
    const data = await fetchWithRetry(`/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);

    if (data && data.data && data.data.results) {
      let songs = data.data.results.map(formatSongData);
      // Filter out non-Tamil songs
      songs = songs.filter(song => {
        const lang = song.language || '';
        return lang === 'tamil' || lang === 'unknown' || lang === '';
      });
      // Cache in-memory
      searchCache.set(cacheKey, songs);
      setTimeout(() => searchCache.delete(cacheKey), 5 * 60 * 1000);
      
      // Cache in sessionStorage
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: songs,
          timestamp: Date.now()
        }));
      } catch (e) {}

      return songs;
    }
    return [];
  } catch (error) {
    console.error('Error searching songs:', error);
    return [];
  }
};

/**
 * Gets the best matching playable stream for a local song object
 * @param {Object} song - The local song object
 * @returns {Promise<Object|null>} The best matching saavn song
 */
export const getPlayableStreamForSong = async (song) => {
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
    } catch (e) {}
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
          if (Date.now() - parsed.timestamp < 25 * 60 * 1000) { // 25 mins validity
            cachedSong = parsed.data;
            songCache.set(cacheKey, cachedSong);
          }
        }
      } catch (e) {}
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
      } catch (e) {}
      return directMatch;
    }
  }

  // 3. Complete Cache Miss - Do search and match logic
  const findBestMatch = (searchResultList) => {
    let match = null;

    const isFromLocalPlaylist = song.id && song.id.startsWith('song_');

    // Helper to check invalid tracks
    const isInvalidTrack = (r) => {
      const rTitle = (r.title || '').toLowerCase();
      const rAlbum = (r.album || '').toLowerCase();
      const isWrongLanguage = isFromLocalPlaylist && r.language && r.language !== 'tamil' && r.language !== 'unknown';
      const isNonOriginal = rTitle.includes('lofi') || rTitle.includes('lo-fi') || rTitle.includes('remix') || rTitle.includes('cover') || rTitle.includes('karaoke') || rTitle.includes('instrumental') || rTitle.includes('bgm') || rTitle.includes('mashup') || rAlbum.includes('shivaratri') || rAlbum.includes('devotional') || rAlbum.includes('bhakti');
      return isWrongLanguage || isNonOriginal;
    };

    // First pass: match both album/movie AND exact title AND artist
    match = searchResultList.find(r => {
      if (!r.audioUrl) return false;
      if (isInvalidTrack(r)) return false;
      const rTitle = (r.title || '').toLowerCase();
      const rAlbum = (r.album || '').toLowerCase();
      const rArtist = (r.artist || '').toLowerCase();
      const songTitleLower = cleanTitle.toLowerCase();
      const movieLower = movie.toLowerCase();
      const songArtistLower = primaryArtist.toLowerCase();

      const albumMatches = movieLower && (rAlbum.includes(movieLower) || movieLower.includes(rAlbum));
      const titleMatches = rTitle === songTitleLower || rTitle.includes(songTitleLower) || songTitleLower.includes(rTitle);
      const artistMatches = !songArtistLower || rArtist.includes(songArtistLower) || songArtistLower.includes(rArtist);
      return albumMatches && titleMatches && artistMatches;
    });

    // Second pass: match both album/movie AND exact title (relaxing artist)
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        if (isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const rAlbum = (r.album || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        const movieLower = movie.toLowerCase();
        
        const albumMatches = movieLower && (rAlbum.includes(movieLower) || movieLower.includes(rAlbum));
        const titleMatches = rTitle === songTitleLower || rTitle.includes(songTitleLower) || songTitleLower.includes(rTitle);
        return albumMatches && titleMatches;
      });
    }

    // Third pass: exact title match AND artist match
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        if (isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const rArtist = (r.artist || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        const songArtistLower = primaryArtist.toLowerCase();
        
        const artistMatches = !songArtistLower || rArtist.includes(songArtistLower) || songArtistLower.includes(rArtist);
        return rTitle === songTitleLower && artistMatches;
      });
    }

    // Fourth pass: title includes AND artist match
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        if (isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const rArtist = (r.artist || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        const songArtistLower = primaryArtist.toLowerCase();
        
        const artistMatches = !songArtistLower || rArtist.includes(songArtistLower) || songArtistLower.includes(rArtist);
        return (rTitle.includes(songTitleLower) || songTitleLower.includes(rTitle)) && artistMatches;
      });
    }

    // Fifth pass: exact title match only
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        if (isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        return rTitle === songTitleLower;
      });
    }

    // Fourth pass: artist + fuzzy title
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        if (isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const rArtist = (r.artist || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        const songArtistLower = primaryArtist.toLowerCase();

        const artistMatches = songArtistLower && rArtist.includes(songArtistLower);
        const titleWords = songTitleLower.split(' ').filter(w => w.length > 2);
        const titleFuzzyMatch = titleWords.length > 0 ? titleWords.some(w => rTitle.includes(w)) : true;
        return artistMatches && titleFuzzyMatch;
      });
    }

    // Fifth pass: partial title match
    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl) return false;
        const rTitle = (r.title || '').toLowerCase();
        const songTitleLower = cleanTitle.toLowerCase();
        const titleWords = songTitleLower.split(' ').filter(w => w.length > 2);
        return titleWords.some(w => rTitle.includes(w));
      });
    }
    return match;
  };

  let results = await searchSongs(queryStr, 20);
  let playableResult = (results && results.length > 0) ? findBestMatch(results) : null;

  // Fallback: search with only the clean title
  if (!playableResult && cleanTitle) {
    const fallbackResults = await searchSongs(cleanTitle, 20);
    if (fallbackResults && fallbackResults.length > 0) {
      playableResult = findBestMatch(fallbackResults);
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
    } catch (e) {}
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
      if (Date.now() - parsed.timestamp < 25 * 60 * 1000) { // 25 mins validity
        songCache.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (e) {}

  try {
    const data = await fetchWithRetry(`/songs/${id}`);

    if (data && data.data && data.data[0]) {
      const result = formatSongData(data.data[0]);
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
        } catch (e) {}
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
  let imgUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
  if (song.image && Array.isArray(song.image) && song.image.length > 0) {
    imgUrl = song.image[song.image.length - 1].url || song.image[song.image.length - 1].link || imgUrl;
  } else if (typeof song.image === 'string') {
    imgUrl = song.image;
  }
  if (!imgUrl || imgUrl.includes('default_') || imgUrl.includes('placeholder')) {
    imgUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
  }

  // Extract best quality download URL (prefer 320kbps, fall back to 160kbps, then others)
  let audioUrl = '';
  if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
    const best = song.downloadUrl.find(d => d.quality === '320kbps')
               || song.downloadUrl.find(d => d.quality === '160kbps')
               || song.downloadUrl.find(d => d.quality === '96kbps')
               || song.downloadUrl.find(d => d.quality === '48kbps')
               || song.downloadUrl[song.downloadUrl.length - 1];

    audioUrl = best ? (best.url || best.link || '') : '';
  }

  // Extract artists
  let artistName = 'Unknown Artist';
  if (song.artists && song.artists.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
    artistName = song.artists.primary.map(a => decodeHTMLEntities(a.name)).join(', ');
  } else if (song.primaryArtists) {
    artistName = typeof song.primaryArtists === 'string' ? decodeHTMLEntities(song.primaryArtists) : song.primaryArtists.map(a => decodeHTMLEntities(a.name)).join(', ');
  }

  return {
    id: song.id,
    title: decodeHTMLEntities(song.name || song.title || 'Untitled').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim(),
    artist: artistName,
    img: imgUrl,
    audioUrl: audioUrl,
    duration: song.duration ? parseInt(song.duration) : 0,
    album: decodeHTMLEntities(song.album?.name || song.album || ''),
    language: (song.language || '').toLowerCase()
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
        let imgUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
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
          description: decodeHTMLEntities(playlist.description || '')
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
export const getPlaylistDetails = async (id) => {
  try {
    const data = await fetchWithRetry(`/playlists?id=${id}`);

    if (data && data.data) {
      const playlist = data.data;
      let imgUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
      if (playlist.image && Array.isArray(playlist.image) && playlist.image.length > 0) {
        imgUrl = playlist.image[playlist.image.length - 1].url || playlist.image[playlist.image.length - 1].link || imgUrl;
      } else if (typeof playlist.image === 'string') {
        imgUrl = playlist.image;
      }
      let songs = playlist.songs ? playlist.songs.map(formatSongData) : [];
      // Filter out non-Tamil songs from playlists
      songs = songs.filter(song => {
        const lang = song.language || '';
        return lang === 'tamil' || lang === 'unknown' || lang === '';
      });

      return {
        id: playlist.id,
        title: decodeHTMLEntities(playlist.name || playlist.title || 'Untitled Playlist'),
        img: imgUrl,
        description: decodeHTMLEntities(playlist.description || ''),
        songs: songs
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching playlist details:', error);
    return null;
  }
};
