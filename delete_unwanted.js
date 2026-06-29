const fs = require('fs');
const path = require('path');

const filesToDelete = [
  // Java Crash Logs
  'hs_err_pid13616.log', 'hs_err_pid15824.log', 'hs_err_pid19804.log', 'hs_err_pid23148.log', 'hs_err_pid24028.log', 'hs_err_pid24304.log', 'hs_err_pid25396.log',
  'replay_pid12360.log', 'replay_pid13352.log', 'replay_pid13616.log', 'replay_pid13788.log', 'replay_pid15824.log', 'replay_pid23116.log', 'replay_pid23148.log', 'replay_pid24304.log', 'replay_pid25396.log', 'replay_pid9796.log',

  // Utility and Test Scripts
  'test-auth.js', 'test-firebase.js', 'test-saavn.js', 'test_audio.js', 'test_deva.js', 'test_deva2.js', 'test_search.js', 'test_url.js',
  'add_playlist.js', 'append_playlist.js', 'apply_dark_bg.cjs', 'apply_logo.cjs', 'check_db.js', 'check_json.js', 'check_unsplash.js', 'clean_assets.js', 'clean_titles.js',
  'copy.js', 'copy_images.js', 'create_common_playlists.js', 'create_custom_playlists.js', 'cross_check_songs.js', 'do_copy.js', 'extract_artists.js', 'fetch_tv_logcat.cjs',
  'find.js', 'find_bad_songs.mjs', 'find_splits.js', 'fix.js', 'fix_playlist_images.js', 'fix_shreya.js', 'fix_tamil_urls.js', 'fix_urls.js', 'generate_users.cjs', 'get_sha1.js',
  'parse_songs.js', 'parse_songs.ps1', 'populate_urls.js', 'read_logcat.cjs', 'remove_deva.cjs', 'remove_deva.js', 'remove_mic.js', 'search_song.js', 'upload_galex_playlist.js', 'upload_tag_playlists.js', 'update_android_icon.cjs',

  // Unused React Components and Containers
  'src/components/AllSongsList.jsx', 'src/components/AllSongsList.css',
  'src/components/ArtistList.jsx', 'src/components/ArtistList.css',
  'src/components/GenresList.jsx',
  'src/components/MusicalGalaxy.jsx', 'src/components/MusicalGalaxy.css',
  'src/components/VibesList.jsx',
  'src/components/ProfileSettings.jsx', 'src/components/ProfileSettings.css',
  'src/containers/HomeContainer.jsx',
  'src/containers/LibraryContainer.jsx',
  'src/containers/LiveConnectContainer.jsx',
  'src/containers/SearchContainer.jsx',
  'src/components/create_settings.js',

  // Unused Assets and scripts in src
  'src/assets/react.svg',
  'src/assets/vite.svg',
  'src/assets/hero.png',
  'src/replace_player.cjs'
];

let deletedCount = 0;

filesToDelete.forEach(file => {
  const fullPath = path.join(__dirname, file);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Deleted: ${file}`);
      deletedCount++;
    } else {
      console.log(`⚠️ Not found (already deleted?): ${file}`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete ${file}:`, error.message);
  }
});

console.log(`\n🎉 Cleanup complete! Deleted ${deletedCount} files.`);
// Self-delete the script
fs.unlinkSync(__filename);
