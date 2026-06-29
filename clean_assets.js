const fs = require('fs');
const path = require('path');

const filesToDelete = [
  path.join(__dirname, 'public', 'mobile_app_mockup.png'),
  path.join(__dirname, 'public', 'desktop_app_mockup.png'),
];

filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted: ${file}`);
  }
});
