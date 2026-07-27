const https = require('https');

const endpoints = [
  'https://saavn.dev/api',
  'https://jiosaavn-api-privatecvc2.vercel.app/api',
  'https://saavn.me/api',
  'https://saavn.sumit.co/api',
  'https://saavn-api-beta.vercel.app/api',
  'https://jiosaavn-api-v3.vercel.app/api',
  'https://jiosaavn-api-red.vercel.app/api'
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(`${url}/search/songs?query=Ennamo+Yeadho`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const hasResults = (json?.data?.results?.length > 0) || (json?.results?.length > 0);
          console.log(`[${res.statusCode}] ${url} -> ${hasResults ? 'SUCCESS (' + (json?.data?.results?.length || json?.results?.length) + ' results)' : 'FAILED / EMPTY'}`);
          resolve(hasResults);
        } catch (e) {
          console.log(`[${res.statusCode}] ${url} -> Invalid JSON response: ${data.slice(0, 100)}`);
          resolve(false);
        }
      });
    });
    req.on('error', (err) => {
      console.log(`[ERR] ${url} -> ${err.message}`);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      console.log(`[TIMEOUT] ${url}`);
      resolve(false);
    });
  });
}

async function run() {
  console.log("Checking JioSaavn API endpoints...");
  for (const ep of endpoints) {
    await checkUrl(ep);
  }
}

run();
