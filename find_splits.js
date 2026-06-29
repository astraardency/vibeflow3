const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf-8');
const lines = content.split('\n');
const results = lines.map((line, idx) => line.includes('split') ? `${idx + 1}: ${line}` : null).filter(Boolean);
fs.writeFileSync('splits.txt', results.join('\n'));
