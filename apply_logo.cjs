const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourcePath = 'C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\b541c6d8-bff7-4c33-ae1a-6045ec736d24\\vibeflow_logo_1781788689332.png';
const publicDest = 'e:\\web\\public\\logo.png';
const assetsDir = 'e:\\web\\assets';
const iconDest = 'e:\\web\\assets\\icon.png';
const splashDest = 'e:\\web\\assets\\splash.png';

try {
  console.log('Copying logo to public directory...');
  fs.copyFileSync(sourcePath, publicDest);
  // Also copy to public/icon.png
  fs.copyFileSync(sourcePath, 'e:\\web\\public\\icon.png');

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  console.log('Copying logo to assets directory for Capacitor...');
  fs.copyFileSync(sourcePath, iconDest);
  fs.copyFileSync(sourcePath, splashDest);

  console.log('Generating Android native assets (Icons & Splash Screens)...');
  execSync('npx @capacitor/assets generate --iconBackgroundColor "#1e1e1e" --splashBackgroundColor "#1e1e1e"', { stdio: 'inherit', cwd: 'e:\\web' });

  console.log('Successfully updated logo across the web and mobile apps!');
} catch (error) {
  console.error('An error occurred:', error);
}

