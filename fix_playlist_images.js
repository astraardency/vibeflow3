import fs from 'fs';

const BASE_URL = 'https://saavn.sumit.co/api';

const playlistsPath = 'src/data/playlists.js';

// Decodes HTML entities from text strings
const decodeHTMLEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'");
};

const searchSongs = async (query, limit = 10) => {
  try {
    const response = await fetch(`${BASE_URL}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
    const data = await response.json();
    
    if (data.success && data.data && data.data.results) {
      return data.data.results.map(formatSongData);
    }
    return [];
  } catch (error) {
    console.error('Error searching songs:', error.message);
    return [];
  }
};

const formatSongData = (song) => {
  let imgUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
  if (song.image && Array.isArray(song.image) && song.image.length > 0) {
    imgUrl = song.image[song.image.length - 1].url || song.image[song.image.length - 1].link || imgUrl;
  } else if (typeof song.image === 'string') {
    imgUrl = song.image;
  }

  let audioUrl = '';
  if (song.downloadUrl && Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
    const safeStream = song.downloadUrl.find(d => d.quality === '160kbps') 
                    || song.downloadUrl.find(d => d.quality === '96kbps')
                    || song.downloadUrl.find(d => d.quality === '48kbps')
                    || song.downloadUrl.find(d => d.quality !== '320kbps')
                    || song.downloadUrl[song.downloadUrl.length - 1];
    audioUrl = safeStream.url || safeStream.link || '';
  }

  let artistName = 'Unknown Artist';
  if (song.artists && song.artists.primary && Array.isArray(song.artists.primary) && song.artists.primary.length > 0) {
    artistName = song.artists.primary.map(a => decodeHTMLEntities(a.name)).join(', ');
  } else if (song.primaryArtists) {
    artistName = typeof song.primaryArtists === 'string' ? decodeHTMLEntities(song.primaryArtists) : song.primaryArtists.map(a => decodeHTMLEntities(a.name)).join(', ');
  }

  return {
    id: song.id,
    title: decodeHTMLEntities(song.name || song.title || 'Untitled'),
    artist: artistName,
    img: imgUrl,
    audioUrl: audioUrl,
    album: decodeHTMLEntities(song.album?.name || song.album || ''),
    language: (song.language || '').toLowerCase()
  };
};

const getPlayableStreamForSong = async (song) => {
  const cleanTitle = (song.title || '').replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim();
  const primaryArtist = (song.artist || '').split(',')[0].trim();
  const movie = song.movie || song.album || '';
  
  const queryStr = `${cleanTitle} ${movie} ${primaryArtist}`.trim();
  
  const findBestMatch = (searchResultList) => {
    let match = null;

    const isInvalidTrack = (r) => {
      const rTitle = (r.title || '').toLowerCase();
      const rAlbum = (r.album || '').toLowerCase();
      return rTitle.includes('lofi') || rTitle.includes('lo-fi') || rTitle.includes('remix') || rTitle.includes('cover') || rTitle.includes('karaoke') || rTitle.includes('instrumental') || rTitle.includes('bgm') || rTitle.includes('mashup');
    };

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

    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl || isInvalidTrack(r)) return false;
        return (r.title || '').toLowerCase() === cleanTitle.toLowerCase();
      });
    }

    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl || isInvalidTrack(r)) return false;
        return (r.title || '').toLowerCase().includes(cleanTitle.toLowerCase()) || cleanTitle.toLowerCase().includes((r.title || '').toLowerCase());
      });
    }

    if (!match) {
      match = searchResultList.find(r => {
        if (!r.audioUrl || isInvalidTrack(r)) return false;
        const rTitle = (r.title || '').toLowerCase();
        const rArtist = (r.artist || '').toLowerCase();
        const artistMatches = primaryArtist.toLowerCase() && rArtist.includes(primaryArtist.toLowerCase());
        const titleWords = cleanTitle.toLowerCase().split(' ').filter(w => w.length > 2);
        const titleFuzzyMatch = titleWords.length > 0 ? titleWords.some(w => rTitle.includes(w)) : true;
        return artistMatches && titleFuzzyMatch;
      });
    }

    if (!match && searchResultList.length > 0) {
      match = searchResultList[0];
    }
    
    return match;
  };

  let results = await searchSongs(queryStr, 10);
  let playableResult = (results && results.length > 0) ? findBestMatch(results) : null;
  
  if (!playableResult && cleanTitle) {
    const fallbackResults = await searchSongs(cleanTitle, 10);
    if (fallbackResults && fallbackResults.length > 0) {
      playableResult = findBestMatch(fallbackResults);
    }
  }
  
  return playableResult;
};

async function run() {
  console.log('Reading playlists.js...');
  let content = fs.readFileSync(playlistsPath, 'utf8');
  
  let jsonString = content.replace('export const defaultPlaylists = ', '').trim();
  if (jsonString.endsWith(';')) {
    jsonString = jsonString.slice(0, -1);
  }

  let playlists;
  try {
    playlists = JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse playlists:', e.message);
    return;
  }

  console.log(`Parsed ${playlists.length} playlists. Fetching correct images and audio urls from Saavn...`);
  
  let updatedCount = 0;
  for (const playlist of playlists) {
    if (!playlist.songs) continue;
    
    console.log(`Processing playlist: ${playlist.name}`);
    for (let i = 0; i < playlist.songs.length; i++) {
      const song = playlist.songs[i];
      if (!song.img || song.img.includes('image_url_') || song.img === '' || song.audioUrl === '' || song.audioUrl.includes('audio_url_')) {
        console.log(`  Fetching metadata for: ${song.title}`);
        const saavnData = await getPlayableStreamForSong(song);
        if (saavnData) {
          if (saavnData.img) song.img = saavnData.img;
          if (saavnData.audioUrl) song.audioUrl = saavnData.audioUrl;
          updatedCount++;
          console.log(`    -> Success: Found image & audio URL.`);
        } else {
          console.log(`    -> Failed to find match on Saavn.`);
        }
        
        // Wait a bit to not get rate limited
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} songs. Writing back to playlists.js...`);
    const newContent = `export const defaultPlaylists = ${JSON.stringify(playlists, null, 2)};\n`;
    fs.writeFileSync(playlistsPath, newContent, 'utf8');
    console.log('Successfully updated playlists.js!');
  } else {
    console.log('No songs needed updating or failed to fetch metadata.');
  }
}

run();
