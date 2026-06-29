const fs = require('fs');

try {
  const content = fs.readFileSync('e:/web/src/data/songs.js', 'utf8');
  // Strip 'export default ' from the beginning
  const jsonStr = content.replace(/^export default\s+/, '');
  const songs = JSON.parse(jsonStr);
  
  const artists = {};
  songs.forEach(song => {
    if (song.artist) {
      artists[song.artist] = (artists[song.artist] || 0) + 1;
    }
  });
  
  console.log('Total songs:', songs.length);
  console.log('Unique artists count:', Object.keys(artists).length);
  console.log('Artists:', JSON.stringify(artists, null, 2));
} catch (err) {
  console.error(err);
}
