const https = require('https');

async function testStream() {
  const query = "Ennamo Yeadho";
  console.log("Searching for:", query);
  
  const endpoints = [
    'https://saavn.dev/api',
    'https://jiosaavn-api-v3.vercel.app/api',
    'https://jiosaavn-api-privatecvc2.vercel.app/api',
    'https://saavn.me/api',
  ];

  for (const ep of endpoints) {
    try {
      console.log("Requesting:", `${ep}/search/songs?query=${encodeURIComponent(query)}&limit=5`);
      const res = await new Promise((resolve, reject) => {
        const req = https.get(`${ep}/search/songs?query=${encodeURIComponent(query)}&limit=5`, { timeout: 4000 }, (r) => {
          let body = '';
          r.on('data', chunk => body += chunk);
          r.on('end', () => resolve({ status: r.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });

      console.log(`Endpoint ${ep} Status: ${res.status}`);
      if (res.status === 200) {
        const json = JSON.parse(res.body);
        const results = json?.data?.results || json?.results;
        console.log("Found results:", results?.length);
        if (results && results.length > 0) {
          const s = results[0];
          console.log("Song:", s.name || s.title);
          console.log("Download URLs:", s.downloadUrl);
        }
      }
    } catch (e) {
      console.log(`Endpoint ${ep} Error: ${e.message}`);
    }
  }
}

testStream();
