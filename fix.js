const fs = require('fs');
const path = 'e:/web/create_custom_playlists.js';

let content = fs.readFileSync(path, 'utf8');

// Replace all dummy audioURLs and imgs with empty strings
content = content.replace(/"audioUrl":\s*"[^"]*"/g, '"audioUrl": ""');
content = content.replace(/"img":\s*"image_[^"]*\.png"/g, '"img": ""');
content = content.replace(/"img":\s*"placeholder_url\.jpg"/g, '"img": ""');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed create_custom_playlists.js');
