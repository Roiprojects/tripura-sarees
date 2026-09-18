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

async function main() {
  // 1. Crop mustard-kanjeevaram-1.jpg
  console.log('1. Cropping mustard-kanjeevaram-1.jpg bottom 7% more...');
  const mBuf = fs.readFileSync(path.join(productDir, 'mustard-kanjeevaram-1.jpg'));
  const mMeta = await sharp(mBuf).metadata();
  const trimH = Math.round(mMeta.height * 0.08);
  const mOut = await sharp(mBuf)
    .extract({ left: 0, top: 0, width: mMeta.width, height: mMeta.height - trimH })
    .resize(800, 1000, { fit: 'cover', position: 'top' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  fs.writeFileSync(path.join(productDir, 'mustard-kanjeevaram-1.jpg'), mOut);
  console.log('✓ mustard-kanjeevaram-1.jpg cleaned!');

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

  const searches = [
    {
      file: 'leaf-green-tripura-handloom-1.jpg',
      query: 'green cotton handloom saree folded flatlay',
      idx: 1
    },
    {
      file: 'powder-blue-linen-1.jpg',
      query: 'light blue linen saree flatlay aesthetic',
      idx: 1
    },
    {
      file: 'wine-chiffon-1.jpg',
      query: 'burgundy wine floral saree flatlay aesthetic',
      idx: 0
    }
  ];

  for (const s of searches) {
    console.log(`Searching for ${s.file} (${s.query})...`);
    await send('Page.navigate', { url: 'https://in.pinterest.com/search/pins/?q=' + encodeURIComponent(s.query) });
    await new Promise(r => setTimeout(r, 4500));

    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('img'))
            .map(img => ({
              src: img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'),
              alt: img.alt || '',
              w: img.naturalWidth
            }))
            .filter(i => i.src.includes('pinimg.com') && !i.src.includes('user_avatar') && !i.src.includes('/60x60/') && i.w > 120);
        })()
      `,
      returnByValue: true
    });

    const pins = (evalRes && evalRes.result && evalRes.result.value) || [];
    console.log(`Found ${pins.length} pins for ${s.file}`);
    const pick = pins[s.idx] || pins[0];
    if (pick) {
      console.log(`✓ Picked: ${pick.src}`);
      console.log(`  Alt: ${pick.alt}`);
      const buf = await dl(pick.src);
      await sharp(buf)
        .resize(800, 1000, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(path.join(productDir, s.file));
      console.log(`✓ Saved ${s.file}`);
    } else {
      console.error(`❌ No pin found for ${s.file}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  ws.close();
  console.log('All 4 final slots updated!');
}

main().catch(console.error);
