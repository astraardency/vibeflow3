const API_KEY = 'AIzaSyB2lsWLuUNoW-w-WkG9laT0lsmRBbtT63M';
const query = 'Alan Walker';
fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&q=${query}&type=video&key=${API_KEY}`)
  .then(res => res.json())
  .then(console.log);
