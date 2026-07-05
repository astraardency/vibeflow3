import { searchSongs, getPlayableStreamForSong } from './src/services/saavn.js';

const song = {
  id: "song_123",
  title: "Pookkal Pookkum",
  artist: "G.V. Prakash Kumar, Roopkumar Rathod",
  album: "",
  language: "tamil"
};

getPlayableStreamForSong(song).then(result => {
  console.log("Result:", result);
}).catch(err => {
  console.error("Error:", err);
});
