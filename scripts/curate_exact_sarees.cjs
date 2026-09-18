const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const sharp = require('sharp');

const SLOTS_TO_UPDATE = [
  {
    file: 'emerald-banarasi-1.jpg',
    query: 'emerald green banarasi silk saree kadwa jaal flatlay',
    type: 'flatlay'
  },
  {
    file: 'emerald-banarasi-2.jpg',
    query: 'dark emerald green banarasi brocade saree pallu',
    type: 'drape'
  },
  {
    file: 'mustard-kanjeevaram-1.jpg',
    query: 'mustard yellow kanjeevaram silk saree temple border flatlay',
    type: 'flatlay'
  },
  {
    file: 'peacock-kanjeevaram-1.jpg',
    query: 'peacock green silk saree contrast rani pink border flatlay',
    type: 'flatlay'
  },
  {
    file: 'peacock-kanjeevaram-2.jpg',
    query: 'peacock teal kanjeevaram saree contrast pink pallu',
    type: 'drape'
  },
  {
    file: 'indigo-tripura-handloom-1.jpg',
    query: 'off white cotton saree indigo border flatlay handloom',
    type: 'flatlay'
  },
  {
    file: 'leaf-green-tripura-handloom-1.jpg',
    query: 'leaf green handloom cotton saree flatlay aesthetic',
    type: 'flatlay'
  },
  {
    file: 'maroon-tripura-handloom-1.jpg',
    query: 'maroon cotton saree checks flatlay handloom',
    type: 'flatlay'
  },
  {
    file: 'maroon-tripura-handloom-2.jpg',
    query: 'maroon handloom saree with gold checks border',
    type: 'drape'
  },
  {
    file: 'sage-linen-1.jpg',
    query: 'sage green linen saree silver border flatlay aesthetic',
    type: 'flatlay'
  },
  {
    file: 'powder-blue-linen-1.jpg',
    query: 'powder blue pure linen saree flatlay aesthetic',
    type: 'flatlay'
  },
  {
    file: 'powder-blue-linen-2.jpg',
    query: 'powder blue linen saree with striped pallu drape',
    type: 'drape'
  },
  {
    file: 'wine-chiffon-1.jpg',
    query: 'wine chiffon floral print saree flatlay aesthetic',
    type: 'flatlay'
  },
  {
    file: 'wine-chiffon-2.jpg',
    query: 'deep wine burgundy floral chiffon saree drape',
    type: 'drape'
  }
];

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
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

async function processImage(buf, outPath, type) {
  const meta = await sharp(buf).metadata();
  let pipeline = sharp(buf);

  // If drape or tall portrait, crop top 36% to guarantee no human face
  if (type === 'drape' || (meta.height > meta.width * 1.15)) {
    const topOffset = Math.round(meta.height * 0.36);
    const newHeight = meta.height - topOffset;
    pipeline = pipeline.extract({
      left: 0,
      top: topOffset,
      width: meta.width,
      height: newHeight
    });
  }

  await pipeline
    .resize(800, 1000, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  const productDir = path.join(__dirname, '..', 'public', 'products', 'sarees');

  // First, apply the verified perfect Magenta Kanjeevaram images!
  console.log('--- Applying Magenta Kanjeevaram Silk Saree with Zari Checks ---');
  if (fs.existsSync(path.join(__dirname, 'cand_magenta_2.jpg'))) {
    const m1Buf = fs.readFileSync(path.join(__dirname, 'cand_magenta_2.jpg'));
    await sharp(m1Buf)
      .resize(800, 1000, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(path.join(productDir, 'magenta-kanjeevaram-1.jpg'));
    console.log('✓ Updated magenta-kanjeevaram-1.jpg (pure flatlay with zari checks & peacock motif)');
  }
  if (fs.existsSync(path.join(__dirname, 'test_magenta_cropped.jpg'))) {
    fs.copyFileSync(
      path.join(__dirname, 'test_magenta_cropped.jpg'),
      path.join(productDir, 'magenta-kanjeevaram-2.jpg')
    );
    console.log('✓ Updated magenta-kanjeevaram-2.jpg (neck-down draped zari checks & purple border)');
  }

  const wsUrl = await getPinterestWebSocket();
  console.log('Connecting to Pinterest at:', wsUrl);
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

  // Global set of all used URLs in this session
  const usedUrls = new Set([
    'https://i.pinimg.com/736x/eb/17/96/eb17965f9601ee20f24a8cc3ca98f7aa.jpg',
    'https://i.pinimg.com/736x/7e/b2/fb/7eb2fb77fa7fdec7c88bf35997123713.jpg'
  ]);

  for (let i = 0; i < SLOTS_TO_UPDATE.length; i++) {
    const item = SLOTS_TO_UPDATE[i];
    console.log(`\n[${i+1}/${SLOTS_TO_UPDATE.length}] Updating ${item.file}`);
    console.log(`Query: "${item.query}"`);

    await send('Page.navigate', { url: `https://in.pinterest.com/search/pins/?q=${encodeURIComponent(item.query)}` });
    await new Promise(r => setTimeout(r, 4500));

    let evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('img'))
            .map(img => ({
              src: img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'),
              alt: img.alt || '',
              w: img.naturalWidth,
              h: img.naturalHeight
            }))
            .filter(i => i.src.includes('pinimg.com') && i.w > 120);
        })()
      `,
      returnByValue: true
    });

    let pins = (evalRes && evalRes.result && evalRes.result.value) || [];
    console.log(`Found ${pins.length} pins with w > 120`);

    // Filter out already used URLs
    let candidate = pins.find(p => !usedUrls.has(p.src));

    if (!candidate) {
      console.log('Scrolling down for more pins...');
      await send('Runtime.evaluate', { expression: `window.scrollBy(0, 1500)` });
      await new Promise(r => setTimeout(r, 3000));
      evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            return Array.from(document.querySelectorAll('img'))
              .map(img => ({
                src: img.src.replace(/\\/\\d+x[^\\/]*\\//, '/736x/'),
                alt: img.alt || '',
                w: img.naturalWidth,
                h: img.naturalHeight
              }))
              .filter(i => i.src.includes('pinimg.com') && i.w > 120);
          })()
        `,
        returnByValue: true
      });
      pins = (evalRes && evalRes.result && evalRes.result.value) || [];
      candidate = pins.find(p => !usedUrls.has(p.src));
    }

    if (candidate) {
      usedUrls.add(candidate.src);
      console.log(`✓ Selected URL: ${candidate.src}`);
      console.log(`  Alt text: ${candidate.alt}`);
      const buf = await downloadBuffer(candidate.src);
      const outPath = path.join(productDir, item.file);
      await processImage(buf, outPath, item.type);
      console.log(`✓ Saved ${item.file}`);
    } else {
      console.error(`❌ No suitable unique pin found for ${item.file}`);
    }

    await new Promise(r => setTimeout(r, 1200));
  }

  console.log('\nAll targeted slots successfully updated!');
  ws.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
