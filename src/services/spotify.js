import ENV from '../config/env';

let cachedToken = null;
let tokenExpirationTime = null;

/**
 * Get Spotify Access Token using Client Credentials Flow.
 */
export const getSpotifyAccessToken = async () => {
  const clientId = ENV.SPOTIFY_API_KEY;
  const clientSecret = ENV.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("Spotify API keys are missing. Skipping Spotify integration.");
    return null;
  }

  // Check if token is still valid
  if (cachedToken && tokenExpirationTime && new Date().getTime() < tokenExpirationTime) {
    return cachedToken;
  }

  try {
    const authString = btoa(`${clientId}:${clientSecret}`);
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      })
    });

    if (!response.ok) {
      throw new Error(`Spotify Auth Error: ${response.status}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    
    // Store expiration time (usually 3600 seconds) - subtract 60s for safety margin
    tokenExpirationTime = new Date().getTime() + (data.expires_in - 60) * 1000;
    
    return cachedToken;
  } catch (error) {
    console.error("Error fetching Spotify token:", error);
    return null;
  }
};

/**
 * Search Spotify for tracks
 * @param {string} query 
 * @param {number} limit 
 */
export const searchSpotify = async (query, limit = 5) => {
  const token = await getSpotifyAccessToken();
  if (!token) return [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Spotify Search Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.tracks || !data.tracks.items) return [];

    // Map Spotify tracks to Vibeflow format
    return data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      img: track.album.images.length > 0 ? track.album.images[0].url : '',
      duration: Math.floor(track.duration_ms / 1000),
      // Use preview_url as audioUrl if available, otherwise mark as missing stream
      audioUrl: track.preview_url || '', 
      source: 'spotify'
    }));

  } catch (error) {
    console.error("Error searching Spotify:", error);
    return [];
  }
};
