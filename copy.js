const fs = require('fs');
try {
  const data = fs.readFileSync('c:/Users/prath/OneDrive/Desktop/tamil.txt', 'utf8');
  fs.writeFileSync('e:/web/src/data/songs.json', data);
  console.log('Success!');
} catch (err) {
  console.error(err);
}
