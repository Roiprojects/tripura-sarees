const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const sharp = require('sharp');

// 21 products with 2 views each
const PRODUCTS = [
  {
    key: 'crimson-banarasi',
    name: 'Crimson Banarasi Katan Silk Saree with Gold Zari Buta',
    query1: 'crimson red banarasi silk saree zari buta flatlay',
    query2: 'deep red banarasi katan silk saree pallu pleats'
  },
  {
    key: 'emerald-banarasi',
    name: 'Emerald Banarasi Silk Saree with Kadwa Jaal',
    query1: 'emerald green banarasi silk saree kadwa jaal flatlay',
    query2: 'dark green banarasi saree floral zari jaal weave'
  },
  {
    key: 'royal-blue-banarasi',
    name: 'Royal Blue Banarasi Tanchoi Silk Saree',
    query1: 'royal blue banarasi silk saree buti flatlay',
    query2: 'royal blue tanchoi silk saree zari border pallu'
  },
  {
    key: 'mustard-kanjeevaram',
    name: 'Mustard Kanjeevaram Silk Saree with Temple Border',
    query1: 'mustard yellow kanjeevaram silk saree temple border flatlay',
    query2: 'yellow kanjivaram silk saree maroon contrast border pallu'
  },
  {
    key: 'peacock-kanjeevaram',
    name: 'Peacock Green Kanjeevaram Silk Saree with Contrast Pallu',
    query1: 'peacock green kanjeevaram silk saree flatlay',
    query2: 'teal green kanjivaram silk saree rani pink contrast pallu'
  },
  {
    key: 'magenta-kanjeevaram',
    name: 'Magenta Kanjeevaram Silk Saree with Zari Checks',
    query1: 'magenta kanjeevaram silk saree zari checks flatlay',
    query2: 'rani pink kanjivaram saree gold checks kattam'
  },
  {
    key: 'natural-tussar',
    name: 'Natural Tussar Silk Saree with Lotus Pallu',
    query1: 'natural tussar silk saree beige lotus pallu flatlay',
    query2: 'raw tussar silk saree handwoven border'
  },
  {
    key: 'rust-tussar',
    name: 'Rust Tussar Silk Saree with Woven Butis',
    query1: 'rust orange tussar silk saree flatlay',
    query2: 'terracotta rust tussar silk saree zari border'
  },
  {
    key: 'indigo-tripura-handloom',
    name: 'Tripura Handloom Cotton Saree with Indigo Border',
    query1: 'off white cotton saree indigo blue border flatlay',
    query2: 'white handloom cotton saree blue striped border pallu'
  },
  {
    key: 'leaf-green-tripura-handloom',
    name: 'Tripura Handloom Saree in Leaf Green',
    query1: 'leaf green handloom cotton saree flatlay',
    query2: 'green handloom cotton saree woven border tassels'
  },
  {
    key: 'maroon-tripura-handloom',
    name: 'Tripura Handloom Cotton Saree in Maroon Checks',
    query1: 'maroon handloom cotton saree checks flatlay',
    query2: 'maroon cotton saree gold checks border'
  },
  {
    key: 'bengal-tant-cotton',
    name: 'Bengal Tant Cotton Saree with Red Paisley Border',
    query1: 'bengal tant cotton saree white red border flatlay',
    query2: 'lal paar tant cotton saree bengal handloom'
  },
  {
    key: 'ivory-mul-cotton',
    name: 'Ivory Mul Cotton Saree with Floral Print',
    query1: 'ivory mul cotton saree floral print flatlay',
    query2: 'white mulmul cotton saree pastel floral border'
  },
  {
    key: 'sage-linen',
    name: 'Sage Linen Saree with Silver Zari Border',
    query1: 'sage green linen saree silver zari border flatlay',
    query2: 'pista green pure linen saree silver border tassels'
  },
  {
    key: 'powder-blue-linen',
    name: 'Powder Blue Linen Saree with Striped Pallu',
    query1: 'powder blue linen saree flatlay aesthetic',
    query2: 'light blue pure linen saree striped pallu'
  },
  {
    key: 'blush-georgette',
    name: 'Blush Pink Georgette Saree with Sequin Border',
    query1: 'blush pink georgette saree sequin border flatlay',
    query2: 'baby pink pure georgette saree pearl sequin work'
  },
  {
    key: 'wine-chiffon',
    name: 'Wine Chiffon Saree with Floral Print',
    query1: 'wine burgundy chiffon saree floral print flatlay',
    query2: 'wine red pure chiffon printed saree drape'
  },
  {
    key: 'mint-organza',
    name: 'Mint Organza Saree with Embroidered Florals',
    query1: 'mint green organza saree floral embroidery flatlay',
    query2: 'pastel mint sheer organza saree scalloped border'
  },
  {
    key: 'lavender-organza',
    name: 'Lavender Organza Saree with Pearl Border',
    query1: 'lavender lilac organza saree pearl border flatlay',
    query2: 'light purple sheer organza saree butis'
  },
  {
    key: 'black-party-wear',
    name: 'Black Party Wear Saree with Gold Sequin Pallu',
    query1: 'black georgette saree gold sequin work flatlay',
    query2: 'black cocktail party wear saree shimmer sequin pallu'
  },
  {
    key: 'gold-tissue',
    name: 'Gold Tissue Saree with Maroon Border',
    query1: 'gold tissue silk saree maroon border flatlay',
    query2: 'champagne gold metallic tissue saree zari jaal'
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
          if (!pinTab) return reject(new Error('No Pinterest tab found in Chrome!'));
          resolve(pinTab.webSocketDebuggerUrl);
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function processImage(buf, outPath, isFlatlay = true) {
  const meta = await sharp(buf).metadata();
  let pipeline = sharp(buf);

  // If not a flatlay (or if vertical model shot), crop top 35% to remove any potential human face
  if (!isFlatlay && meta.height > meta.width * 1.2) {
    const topOffset = Math.round(meta.height * 0.35);
    const newHeight = meta.height - topOffset;
    pipeline = pipeline.extract({
      left: 0,
      top: topOffset,
      width: meta.width,
      height: newHeight
    });
  }

  await pipeline
    .resize(800, 1000, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  const wsUrl = await getPinterestWebSocket();
  console.log('Connecting to Pinterest via:', wsUrl);
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
  console.log('Connected!');

  // Track all used URLs globally to guarantee zero repetition
  const usedUrls = new Set();
  
  // Also collect existing used image hashes or URLs if any, but since we are replacing all 42 product images fresh:
  const productDir = path.join(__dirname, '..', 'public', 'products', 'sarees');
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  for (let i = 0; i < PRODUCTS.length; i++) {
    const prod = PRODUCTS[i];
    console.log(`\n========================================`);
    console.log(`[${i+1}/${PRODUCTS.length}] Searching for: ${prod.name}`);
    console.log(`========================================`);

    // Slot 1: Primary Flatlay
    const target1 = path.join(productDir, `${prod.key}-1.jpg`);
    console.log(`Slot 1 Query: "${prod.query1}"`);
    await send('Page.navigate', { url: `https://in.pinterest.com/search/pins/?q=${encodeURIComponent(prod.query1)}` });
    await new Promise(r => setTimeout(r, 4500));

    let evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src.includes('pinimg.com') && !src.includes('75x75') && !src.includes('user_avatar') && !src.includes('280x280_RS'))
            .map(src => src.replace(/\\/\\d+x\\//, '/736x/'));
        })()
      `,
      returnByValue: true
    });

    let candidates = (evalRes && evalRes.result && evalRes.result.value) || [];
    let chosenUrl1 = candidates.find(u => !usedUrls.has(u));

    if (!chosenUrl1) {
      console.log('Scrolling down for more pins...');
      await send('Runtime.evaluate', { expression: `window.scrollBy(0, 1200)` });
      await new Promise(r => setTimeout(r, 3000));
      evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            return Array.from(document.querySelectorAll('img'))
              .map(img => img.src)
              .filter(src => src.includes('pinimg.com') && !src.includes('75x75') && !src.includes('user_avatar') && !src.includes('280x280_RS'))
              .map(src => src.replace(/\\/\\d+x\\//, '/736x/'));
          })()
        `,
        returnByValue: true
      });
      candidates = (evalRes && evalRes.result && evalRes.result.value) || [];
      chosenUrl1 = candidates.find(u => !usedUrls.has(u));
    }

    if (chosenUrl1) {
      usedUrls.add(chosenUrl1);
      console.log(`✓ Chosen 1: ${chosenUrl1}`);
      const buf = await downloadBuffer(chosenUrl1);
      await processImage(buf, target1, true);
      console.log(`Saved ${target1}`);
    } else {
      console.error(`❌ Could not find unique image for ${prod.key}-1`);
    }

    // Slot 2: Detail / Drape / Pallu
    const target2 = path.join(productDir, `${prod.key}-2.jpg`);
    console.log(`Slot 2 Query: "${prod.query2}"`);
    await send('Page.navigate', { url: `https://in.pinterest.com/search/pins/?q=${encodeURIComponent(prod.query2)}` });
    await new Promise(r => setTimeout(r, 4500));

    evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src.includes('pinimg.com') && !src.includes('75x75') && !src.includes('user_avatar') && !src.includes('280x280_RS'))
            .map(src => src.replace(/\\/\\d+x\\//, '/736x/'));
        })()
      `,
      returnByValue: true
    });

    candidates = (evalRes && evalRes.result && evalRes.result.value) || [];
    let chosenUrl2 = candidates.find(u => !usedUrls.has(u));

    if (!chosenUrl2) {
      console.log('Scrolling down for more pins...');
      await send('Runtime.evaluate', { expression: `window.scrollBy(0, 1200)` });
      await new Promise(r => setTimeout(r, 3000));
      evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            return Array.from(document.querySelectorAll('img'))
              .map(img => img.src)
              .filter(src => src.includes('pinimg.com') && !src.includes('75x75') && !src.includes('user_avatar') && !src.includes('280x280_RS'))
              .map(src => src.replace(/\\/\\d+x\\//, '/736x/'));
          })()
        `,
        returnByValue: true
      });
      candidates = (evalRes && evalRes.result && evalRes.result.value) || [];
      chosenUrl2 = candidates.find(u => !usedUrls.has(u));
    }

    if (chosenUrl2) {
      usedUrls.add(chosenUrl2);
      console.log(`✓ Chosen 2: ${chosenUrl2}`);
      const buf = await downloadBuffer(chosenUrl2);
      // For slot 2, allow drape crop to remove faces
      await processImage(buf, target2, false);
      console.log(`Saved ${target2}`);
    } else {
      console.error(`❌ Could not find unique image for ${prod.key}-2`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n========================================');
  console.log(`FINISHED! Total unique images used: ${usedUrls.size} of 42 slots.`);
  console.log('========================================');
  
  // Save log of used URLs
  fs.writeFileSync(path.join(__dirname, 'pinterest_used_urls.json'), JSON.stringify(Array.from(usedUrls), null, 2));
  ws.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
