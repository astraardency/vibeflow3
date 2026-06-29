const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'create_custom_playlists.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all dummy image URLs (e.g., "image_url_1.jpg", "image_4566c3.png") with empty strings
content = content.replace(/"img":\s*"image[^"]+"/g, '"img": ""');

// Replace all dummy audio URLs (e.g., "audio_url_1.mp3") with empty strings
content = content.replace(/"audioUrl":\s*"audio_url[^"]+"/g, '"audioUrl": ""');

// Also replace the placeholder ones if any exist
content = content.replace(/"img":\s*"placeholder_url[^"]+"/g, '"img": ""');
content = content.replace(/"audioUrl":\s*"placeholder_url[^"]+"/g, '"audioUrl": ""');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully cleaned all dummy audioUrl and img fields in create_custom_playlists.js!');
