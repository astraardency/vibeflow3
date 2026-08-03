const YOUTUBE_API_URL = import.meta.env.VITE_YOUTUBE_API_URL || 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const PIPED_API_URL = 'https://pipedapi.kavin.rocks';

const ytCache = new Map();

/**
 * Makes a fetch request to the Official YouTube Data API
 */
const fetchYT = async (path, params = {}) => {
  try {
    const url = new URL(`${YOUTUBE_API_URL}${path}`);
    if (YOUTUBE_API_KEY) {
      url.searchParams.append('key', YOUTUBE_API_KEY);
    }
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString());
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`YouTube API Error: ${response.status}`);
  } catch (err) {
    console.error('YouTube API Fetch Error:', err);
    return null;
  }
};

/**
 * Extracts a playable audio stream from Piped API using the videoId
 */
const getAudioStreamFromPiped = async (videoId) => {
  try {
    const response = await fetch(`${PIPED_API_URL}/streams/${videoId}`);
    if (response.ok) {
      const data = await response.json();
      // Try to find the best m4a or webm audio stream
      if (data.audioStreams && data.audioStreams.length > 0) {
        // Sort by bitrate descending
        const streams = data.audioStreams.sort((a, b) => b.bitrate - a.bitrate);
        const bestStream = streams.find(s => s.mimeType.includes('m4a')) || streams[0];
        return bestStream.url;
      }
    }
  } catch (err) {
    console.error('Piped Stream Fetch Error:', err);
  }
  return '';
};

const formatYTSong = (item) => {
  if (!item) return null;
  
  const snippet = item.snippet || {};
  const id = item.id?.videoId || item.id || item.snippet?.resourceId?.videoId;
  
  return {
    id: `yt_${id}`,
    title: snippet.title ? decodeURIComponent(snippet.title).replace(/&quot;/g, '"').replace(/&#39;/g, "'") : 'Untitled',
    artist: snippet.channelTitle || 'YouTube',
    img: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
    audioUrl: '', // Will be fetched on demand
    duration: 0, 
    album: 'YouTube',
    language: 'unknown',
    source: 'youtube'
  };
};

export const searchSongs = async (query, limit = 20) => {
  if (!YOUTUBE_API_KEY) return [];
  const cacheKey = `yt_search_${query}_${limit}`;
  if (ytCache.has(cacheKey)) return ytCache.get(cacheKey);

  const data = await fetchYT('/search', { 
    q: query, 
    type: 'video', 
    videoCategoryId: '10', // Music category
    maxResults: limit,
    part: 'snippet'
  });
  
  if (data && Array.isArray(data.items)) {
    const songs = data.items.map(formatYTSong).filter(s => s && s.id);
    ytCache.set(cacheKey, songs);
    return songs;
  }
  return [];
};

export const searchArtists = async (query, limit = 5) => {
  if (!YOUTUBE_API_KEY) return [];
  const data = await fetchYT('/search', { 
    q: query, 
    type: 'channel', 
    maxResults: limit,
    part: 'snippet'
  });
  
  if (data && Array.isArray(data.items)) {
    return data.items.map(item => ({
      id: `yt_${item.id.channelId}`,
      name: item.snippet.title || 'Unknown Artist',
      img: item.snippet.thumbnails?.high?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop',
      source: 'youtube'
    }));
  }
  return [];
};

export const searchPlaylists = async (query, limit = 20) => {
  if (!YOUTUBE_API_KEY) return [];
  const data = await fetchYT('/search', { 
    q: query, 
    type: 'playlist', 
    maxResults: limit,
    part: 'snippet'
  });
  
  if (data && Array.isArray(data.items)) {
    return data.items.map(item => ({
      id: `yt_${item.id.playlistId}`,
      title: item.snippet.title || 'Untitled Playlist',
      img: item.snippet.thumbnails?.high?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
      songCount: 0,
      description: item.snippet.description || '',
      source: 'youtube'
    }));
  }
  return [];
};

export const getPlaylistDetails = async (id, limit = 50) => {
  if (!YOUTUBE_API_KEY) return null;
  const realId = id.replace('yt_', '');
  
  // First get playlist metadata
  const metaData = await fetchYT('/playlists', {
    id: realId,
    part: 'snippet'
  });
  
  if (!metaData || !metaData.items || metaData.items.length === 0) return null;
  const snippet = metaData.items[0].snippet;
  
  // Then get playlist items
  const itemsData = await fetchYT('/playlistItems', {
    playlistId: realId,
    part: 'snippet',
    maxResults: limit
  });
  
  return {
    id: `yt_${realId}`,
    title: snippet.title || 'Untitled Playlist',
    img: snippet.thumbnails?.high?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
    description: snippet.description || '',
    songs: itemsData && Array.isArray(itemsData.items) ? itemsData.items.map(formatYTSong).filter(Boolean) : [],
    source: 'youtube'
  };
};

export const getSongDetails = async (id) => {
  if (!YOUTUBE_API_KEY) return null;
  const cacheKey = `yt_song_${id}`;
  if (ytCache.has(cacheKey)) return ytCache.get(cacheKey);

  const realId = id.replace('yt_', '');
  const data = await fetchYT('/videos', { 
    id: realId,
    part: 'snippet,contentDetails'
  });
  
  if (data && data.items && data.items.length > 0) {
    const formatted = formatYTSong(data.items[0]);
    if (formatted) {
      ytCache.set(cacheKey, formatted);
      return formatted;
    }
  }
  return null;
};

export const getPlayableStreamForSong = async (song) => {
  if (!song) return null;
  
  let targetSong = song;
  
  // If we don't have a YouTube ID, search for one
  if (!song.id || !String(song.id).startsWith('yt_')) {
    const query = song.query || `${song.title} ${song.artist}`.trim();
    const results = await searchSongs(query, 3);
    if (results && results.length > 0) {
      targetSong = results[0];
    } else {
      return null;
    }
  }
  
  const realId = targetSong.id.replace('yt_', '');
  
  // Fetch stream URL dynamically
  const audioUrl = await getAudioStreamFromPiped(realId);
  
  return {
    ...targetSong,
    audioUrl
  };
};
