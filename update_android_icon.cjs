const fs = require('fs');
const path = require('path');

const iconPath = path.join(__dirname, 'public', 'icon.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const mipmapDirs = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const targetFiles = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png'
];

if (!fs.existsSync(iconPath)) {
  console.error(`Could not find icon at ${iconPath}`);
  process.exit(1);
}

// Copy icon to all mipmap directories
mipmapDirs.forEach(dir => {
  const dirPath = path.join(resDir, dir);
  if (fs.existsSync(dirPath)) {
    targetFiles.forEach(file => {
      const targetPath = path.join(dirPath, file);
      fs.copyFileSync(iconPath, targetPath);
      console.log(`Updated ${dir}/${file}`);
    });
  }
});

// Remove adaptive XML files so Android falls back to the PNGs we just copied
const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
if (fs.existsSync(anydpiDir)) {
  ['ic_launcher.xml', 'ic_launcher_round.xml'].forEach(file => {
    const xmlPath = path.join(anydpiDir, file);
    if (fs.existsSync(xmlPath)) {
      fs.unlinkSync(xmlPath);
      console.log(`Removed ${file} from mipmap-anydpi-v26`);
    }
  });
}

console.log('\nAndroid icons updated successfully! Please re-run:');
console.log('npx cap run android');
