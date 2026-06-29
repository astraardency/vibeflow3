const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconPath = path.join(__dirname, 'public', 'icon.png');
const assetsDir = path.join(__dirname, 'assets');
const destIconPath = path.join(assetsDir, 'icon.png');

console.log('Setting up assets folder...');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Copy icon to assets directory where @capacitor/assets expects it
fs.copyFileSync(iconPath, destIconPath);

try {
  console.log('Installing @capacitor/assets...');
  execSync('npm install -D @capacitor/assets', { stdio: 'inherit' });

  console.log('Generating Android icons with a dark background (#1e1e1e)...');
  execSync('npx @capacitor/assets generate --iconBackgroundColor "#1e1e1e" --android', { stdio: 'inherit' });

  console.log('\nSuccess! Dark background applied to Android icons. Please rebuild your app:');
  console.log('npx cap run android');
} catch (error) {
  console.error('Failed to generate icons:', error.message);
}
