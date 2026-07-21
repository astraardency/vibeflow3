const fs = require('fs');
const filePath = 'App.jsx';
let code = fs.readFileSync(filePath, 'utf8');
code = code.replace(/\/\*[\s\S]*?\/\/ Play a song[\s\S]*?\*\//, '');
fs.writeFileSync(filePath, code);
console.log('Successfully removed commented playSong block');
