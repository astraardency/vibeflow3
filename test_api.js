const fs = require('fs');
const path1 = 'C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\c231fff2-10d8-4ef1-b27f-974e8c20cea3\\.system_generated\\steps\\199\\content.md';
const path2 = 'C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\c231fff2-10d8-4ef1-b27f-974e8c20cea3\\.system_generated\\steps\\202\\content.md';

function parse(p) {
  const c = fs.readFileSync(p, 'utf8');
  const j = c.split('\n').slice(6).join('\n').replace(/```json|```/g, '');
  return JSON.parse(j);
}

const d1 = parse(path1);
const d2 = parse(path2);
console.log(d1.data.songs.length, d2.data.songs.length);
console.log(d1.data.songs[0].id, d2.data.songs[0].id);
