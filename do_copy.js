import fs from 'fs';
const sourcePath = 'C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\e1364959-a0c8-4584-a7cf-ca61f6518a62\\media__1781769772630.png';
const publicDest = 'e:\\web\\public\\logo.png';
const iconDest = 'e:\\web\\assets\\icon.png';
const splashDest = 'e:\\web\\assets\\splash.png';
const assetsDir = 'e:\\web\\assets';

try {
  fs.copyFileSync(sourcePath, publicDest);
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
  fs.copyFileSync(sourcePath, iconDest);
  fs.copyFileSync(sourcePath, splashDest);
  console.log('Copied successfully!');
} catch(e) {
  console.error(e);
}
