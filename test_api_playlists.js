const saavnApi = 'https://saavn.sumit.co/api';

async function test() {
  const link = 'https://www.jiosaavn.com/featured/hindi-hit-songs/w6W,vO7xQ8s_';
  let res = await fetch(`${saavnApi}/playlists?link=${encodeURIComponent(link)}`);
  let data = await res.json();
  console.log("By link:", data.success ? data.data.name : "failed");
  if(data.success) {
    console.log("Songs:", data.data.songs ? data.data.songs.length : 0);
  }

  res = await fetch(`${saavnApi}/search/playlists?query=hindi%20hit%20songs&limit=5`);
  data = await res.json();
  console.log("Search result keys:", data.success ? Object.keys(data.data.results[0]) : "failed");
  console.log("Search result url:", data.success ? data.data.results[0].url : "no");
}
test();
