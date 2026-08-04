/**
 * Utility functions for matching local songs with remote search results.
 */

export const isInvalidTrack = (r) => {
  const rTitle = (r.title || '').toLowerCase();
  const rAlbum = (r.album || '').toLowerCase();
  const isNonOriginal = rTitle.includes('lofi') || rTitle.includes('lo-fi') || rTitle.includes('remix') || rTitle.includes('cover') || rTitle.includes('karaoke') || rTitle.includes('instrumental') || rTitle.includes('bgm') || rTitle.includes('mashup') || rAlbum.includes('shivaratri') || rAlbum.includes('devotional') || rAlbum.includes('bhakti');
  return isNonOriginal;
};

export const findBestMatch = (searchResultList, cleanTitle, primaryArtist, movie, song) => {
  let match = null;

  const isFromLocalPlaylist = song.id && typeof song.id === 'string' && song.id.startsWith('song_');

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

  // Sixth pass: artist + fuzzy title (The original code had "Fourth pass" again, let's call it Sixth pass)
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

  // Seventh pass: partial title match (The original code had "Fifth pass" again, let's call it Seventh pass)
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
