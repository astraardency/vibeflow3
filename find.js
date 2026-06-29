const fs = require('fs');
const content = fs.readFileSync('E:/web/src/data/playlists.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('vibe stars') || line.toLowerCase().includes('hiphop tamizha') || line.toLowerCase().includes('hiphop') || line.toLowerCase().includes('hip hop')) {
    if (line.includes('name"')) console.log(`Line ${i + 1}: ${line.trim()}`);
    if (line.includes('name:')) console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});

let matches = content.match(/.{0,50}vibe stars.{0,50}/ig);
if (matches) console.log('Matches:', matches);

