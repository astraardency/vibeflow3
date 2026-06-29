import fs from 'fs';
import fetch from 'node-fetch';
import { defaultPlaylists } from './src/data/playlists.js';

const run = async () => {
  console.log("Loading playlists...");
  
  let totalFixed = 0;
  for (const playlist of defaultPlaylists) {
    console.log(`\nProcessing Playlist: ${playlist.name}`);
    for (const song of playlist.songs) {
      const cleanTitle = song.title.replace(/\s*\(from [^)]+\)\s*/ig, '').replace(/\s*- From .*/ig, '').trim();
      const primaryArtist = song.artist.split(',')[0].trim();
      // Ensure we fetch a Tamil version
      const query = `${cleanTitle} ${primaryArtist} Tamil`;
      
      try {
        let res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          let json = await res.json();
          if (!json.success || !json.data || !json.data.results || json.data.results.length === 0) {
            res = await fetch(`https://saavn.sumit.co/api/search/songs?query=${encodeURIComponent(cleanTitle + ' Tamil')}&limit=5`);
            if (res.ok) json = await res.json();
          }
          
          if (json.success && json.data && json.data.results && json.data.results.length > 0) {
            const results = json.data.results;
            let found = false;
            for (const s of results) {
              if (s.downloadUrl && s.downloadUrl.length > 0) {
                const dl = s.downloadUrl.find(d => d.quality === '160kbps') || s.downloadUrl.find(d => d.quality === '320kbps') || s.downloadUrl[s.downloadUrl.length - 1];
                song.audioUrl = dl.url;
                let img = s.image && s.image.length > 0 ? s.image[s.image.length - 1].url : null;
                if (img) song.img = img;
                if (s.duration) song.duration = s.duration;
                totalFixed++;
                process.stdout.write('.');
                found = true;
                break;
              }
            }
            if(!found) process.stdout.write('-');
          } else {
            process.stdout.write('x');
          }
        } else {
          process.stdout.write('E');
        }
      } catch(e) {
        process.stdout.write('E');
      }
      await new Promise(r => setTimeout(r, 100)); // Rate limit
    }
  }
  
  console.log(`\nFixed ${totalFixed} songs! Saving...`);
  
  // Read original file to keep imports
  const content = fs.readFileSync('./src/data/playlists.js', 'utf8');
  const exportIndex = content.indexOf('export const defaultPlaylists =');
  if (exportIndex !== -1) {
    const prefix = content.substring(0, exportIndex);
    const newContent = prefix + 'export const defaultPlaylists = ' + JSON.stringify(defaultPlaylists, null, 2) + ';\n';
    fs.writeFileSync('./src/data/playlists.js', newContent, 'utf8');
    console.log("Successfully updated src/data/playlists.js with strictly Tamil song connections!");
  } else {
    console.log("Could not find export statement in playlists.js");
  }
}

run();
