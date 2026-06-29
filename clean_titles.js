const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'create_custom_playlists.js');
let content = fs.readFileSync(filePath, 'utf8');

// Use a replacer function to find "title": "..." lines and clean the title inside
content = content.replace(/"title":\s*"([^"]+)"/g, (match, p1) => {
  // Strip " - From xxx" and "(From xxx)" from the title
  const cleanedTitle = p1.replace(/\s*\(from [^)]+\)\s*/ig, '')
                         .replace(/\s*- From .*/ig, '')
                         .trim();
  return `"title": "${cleanedTitle}"`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned all song titles in create_custom_playlists.js!');
