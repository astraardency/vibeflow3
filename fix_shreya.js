const fs = require('fs');

try {
  let content = fs.readFileSync('create_custom_playlists.js', 'utf8');
  const startIndex = content.indexOf('name: "Shreya Ghoshal Hits"');
  if (startIndex === -1) {
    console.error("Could not find Shreya Ghoshal Hits playlist.");
    process.exit(1);
  }
  
  const endIndex = content.indexOf('name: "Mano Hits"');
  let shreyaSection = content.substring(startIndex, endIndex);

  // regex to find title and artist and add query if it doesn't exist
  shreyaSection = shreyaSection.replace(/"title": "(.*?)",\s*"artist": "(.*?)",/g, (match, title, artist) => {
    return `"title": "${title}",\n        "artist": "${artist}",\n        "query": "${title} ${artist.split(',')[0]} Shreya Ghoshal",`;
  });

  content = content.substring(0, startIndex) + shreyaSection + content.substring(endIndex);
  fs.writeFileSync('create_custom_playlists.js', content);
  console.log('Successfully updated Shreya Ghoshal Hits with query strings in create_custom_playlists.js!');
  console.log('Now you can run: node create_custom_playlists.js');
} catch (e) {
  console.error("Error modifying file:", e);
}
