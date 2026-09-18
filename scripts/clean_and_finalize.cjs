const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const sharp = require('sharp');

const productDir = path.join(__dirname, '..', 'public', 'products', 'sarees');

function dl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function getPinterestWebSocket() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(body);
          const pinTab = tabs.find(t => t.url.includes('pinterest.com') && t.type === 'page');
          if (!pinTab) return reject(new Error('No Pinterest tab found!'));
          resolve(pinTab.webSocketDebuggerUrl);
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function cropBottom(filePath, percentToTrim = 0.09) {
  const buf = fs.readFileSync(filePath);
  const meta = await sharp(buf).metadata();
  const trimHeight = Math.round(meta.height * percentToTrim);
  const newHeight = meta.height - trimHeight;
  const outBuf = await sharp(buf)
    .extract({ left: 0, top: 0, width: meta.width, height: newHeight })
    .resize(800, 1000, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(filePath, outBuf);
}

async function main() {
  console.log('1. Cropping bottom text watermark from emerald-banarasi-1.jpg...');
  await cropBottom(path.join(productDir, 'emerald-banarasi-1.jpg'), 0.10);

  console.log('2. Cropping bottom text watermark from mustard-kanjeevaram-1.jpg...');
  await cropBottom(path.join(productDir, 'mustard-kanjeevaram-1.jpg'), 0.11);

  const wsUrl = await getPinterestWebSocket();
  const ws = new WebSocket(wsUrl);

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

  await new Promise(r => ws.on('open', r));
  console.log('Connected to Pinterest!');

  // Search 1: Maroon checks flatlay
  console.log('Searching for maroon checks flatlay...');
  await send('Page.navigate', { url: 'https://in.pinterest.com/search/pins/?q=' + encodeURIComponent('maroon cotton saree gold checks flatlay') });
  await new Promise(r => setTimeout(r, 4500));
  let res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return Array.from(document.querySelectorAll('img'))
          .map(img => img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'))
          .filter(src => src.includes('pinimg.com') && !src.includes('user_avatar') && !src.includes('/60x60/'));
      })()
    `,
    returnByValue: true
  });
  let urls = res.result.value || [];
  if (urls.length > 0) {
    const buf = await dl(urls[0]);
    await sharp(buf)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 88 })
      .toFile(path.join(productDir, 'maroon-tripura-handloom-1.jpg'));
    console.log('✓ Updated maroon-tripura-handloom-1.jpg');
  }

  // Search 2: Powder blue linen flatlay
  console.log('Searching for powder blue linen flatlay...');
  await send('Page.navigate', { url: 'https://in.pinterest.com/search/pins/?q=' + encodeURIComponent('powder blue linen saree flatlay') });
  await new Promise(r => setTimeout(r, 4500));
  res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return Array.from(document.querySelectorAll('img'))
          .map(img => img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'))
          .filter(src => src.includes('pinimg.com') && !src.includes('user_avatar') && !src.includes('/60x60/'));
      })()
    `,
    returnByValue: true
  });
  urls = res.result.value || [];
  if (urls.length > 0) {
    const buf = await dl(urls[0]);
    await sharp(buf)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 88 })
      .toFile(path.join(productDir, 'powder-blue-linen-1.jpg'));
    console.log('✓ Updated powder-blue-linen-1.jpg');
  }

  // Search 3: Wine floral chiffon flatlay
  console.log('Searching for wine floral chiffon flatlay...');
  await send('Page.navigate', { url: 'https://in.pinterest.com/search/pins/?q=' + encodeURIComponent('wine red floral print chiffon saree flatlay') });
  await new Promise(r => setTimeout(r, 4500));
  res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        return Array.from(document.querySelectorAll('img'))
          .map(img => img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'))
          .filter(src => src.includes('pinimg.com') && !src.includes('user_avatar') && !src.includes('/60x60/'));
      })()
    `,
    returnByValue: true
  });
  urls = res.result.value || [];
  if (urls.length > 0) {
    const buf = await dl(urls[0]);
    await sharp(buf)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 88 })
      .toFile(path.join(productDir, 'wine-chiffon-1.jpg'));
    console.log('✓ Updated wine-chiffon-1.jpg');
  }

  ws.close();
  console.log('Final cleanups completed!');
}

main().catch(console.error);
