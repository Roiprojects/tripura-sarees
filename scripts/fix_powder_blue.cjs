const WebSocket = require('ws');
const sharp = require('sharp');
const https = require('https');
const fs = require('fs');

const ws = new WebSocket('ws://localhost:9222/devtools/page/981299E6774FA87BAFAF3CBE7DC2C770');

let msgId = 1;
function send(method, params = {}) {
  return new Promise(resolve => {
    const id = msgId++;
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function dl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

ws.on('open', async () => {
  await send('Page.navigate', { url: 'https://in.pinterest.com/search/pins/?q=' + encodeURIComponent('powder blue saree folded flatlay') });
  await new Promise(r => setTimeout(r, 4500));
  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return Array.from(document.querySelectorAll('img'))
          .map(img => ({ src: img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'), alt: img.alt || '' }))
          .filter(i => i.src.includes('pinimg.com') && !i.src.includes('user_avatar') && !i.src.includes('/60x60/'))
          .slice(0, 10);
      })()
    `,
    returnByValue: true
  });
  const pins = (res && res.result && res.result.value) || [];
  console.log('Pins found:', pins);
  ws.close();
});
