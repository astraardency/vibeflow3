import * as saavnApi from './saavn';

// We have shifted to a "Dual Saavn API" model inside saavn.js 
// to automatically merge missing songs from two different Saavn endpoints.

export const searchSongs = async (query, limit = 40) => {
  return await saavnApi.searchSongs(query, limit);
};

export const searchArtists = async (query, limit = 5) => {
  return await saavnApi.searchArtists(query, limit);
};

export const searchPlaylists = async (query, limit = 20) => {
  return await saavnApi.searchPlaylists(query, limit);
};

export const getPlaylistDetails = async (id, limit = 50) => {
  return await saavnApi.getPlaylistDetails(id, limit);
};

export const getSongDetails = async (id) => {
  return await saavnApi.getSongDetails(id);
};

export const getPlayableStreamForSong = async (song) => {
  return await saavnApi.getPlayableStreamForSong(song);
};
