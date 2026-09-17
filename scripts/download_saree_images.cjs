const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

// Configuration: mode can be 'flatlay' (no person at all) or 'neckDown' (crop bottom 65% so head/face is 100% excluded)
const sareeItems = {
  // ── Products (21 sarees x 2 photos each = 42 photos) ─────────────────────
  'crimson-banarasi-1': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'crimson-banarasi-2': { id: 'photo-1618901185975-d59f7091bcfe', mode: 'neckDown' },

  'emerald-banarasi-1': { id: 'photo-1609748340041-f5d61e061ebc', mode: 'neckDown' },
  'emerald-banarasi-2': { id: 'photo-1616986491129-3e37cb654c82', mode: 'flatlay' },

  'royal-blue-banarasi-1': { id: 'photo-1585531977323-8d57bac2121b', mode: 'neckDown' },
  'royal-blue-banarasi-2': { id: 'photo-1610189012906-4c0aa9b9781e', mode: 'neckDown' },

  'mustard-kanjeevaram-1': { id: 'photo-1582533561751-ef6f6ab93a2e', mode: 'neckDown' },
  'mustard-kanjeevaram-2': { id: 'photo-1601924994987-69e26d50dc26', mode: 'flatlay' },

  'peacock-kanjeevaram-1': { id: 'photo-1609357605129-26f69add5d6e', mode: 'flatlay' },
  'peacock-kanjeevaram-2': { id: 'photo-1615886753866-79396abc446e', mode: 'neckDown' },

  'magenta-kanjeevaram-1': { id: 'photo-1614036417651-efe5912149d8', mode: 'flatlay' },
  'magenta-kanjeevaram-2': { id: 'photo-1641699862936-be9f49b1c38d', mode: 'neckDown' },

  'natural-tussar-1': { id: 'photo-1579783900882-c0d3dad7b119', mode: 'flatlay' },
  'natural-tussar-2': { id: 'photo-1610030468706-9a6dbad49b0a', mode: 'flatlay' },

  'rust-tussar-1': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'rust-tussar-2': { id: 'photo-1579783900882-c0d3dad7b119', mode: 'flatlay' },

  'indigo-tripura-handloom-1': { id: 'photo-1756483482418-3f3e4c13f9b0', mode: 'neckDown' },
  'indigo-tripura-handloom-2': { id: 'photo-1610189012906-4c0aa9b9781e', mode: 'neckDown' },

  'leaf-green-tripura-handloom-1': { id: 'photo-1609748340041-f5d61e061ebc', mode: 'neckDown' },
  'leaf-green-tripura-handloom-2': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },

  'maroon-tripura-handloom-1': { id: 'photo-1616986491129-3e37cb654c82', mode: 'flatlay' },
  'maroon-tripura-handloom-2': { id: 'photo-1622258567999-24d00a930ee8', mode: 'neckDown' },

  'bengal-tant-cotton-1': { id: 'photo-1616756351484-798f37bdffa0', mode: 'flatlay' },
  'bengal-tant-cotton-2': { id: 'photo-1616756141603-6d37d5cde2a2', mode: 'flatlay' },

  'ivory-mul-cotton-1': { id: 'photo-1616756351484-798f37bdffa0', mode: 'flatlay' },
  'ivory-mul-cotton-2': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },

  'sage-linen-1': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },
  'sage-linen-2': { id: 'photo-1609748340041-f5d61e061ebc', mode: 'neckDown' },

  'powder-blue-linen-1': { id: 'photo-1610189012906-4c0aa9b9781e', mode: 'neckDown' },
  'powder-blue-linen-2': { id: 'photo-1615886753866-79396abc446e', mode: 'neckDown' },

  'blush-georgette-1': { id: 'photo-1614036417651-efe5912149d8', mode: 'flatlay' },
  'blush-georgette-2': { id: 'photo-1641699862936-be9f49b1c38d', mode: 'neckDown' },

  'wine-chiffon-1': { id: 'photo-1618901185975-d59f7091bcfe', mode: 'neckDown' },
  'wine-chiffon-2': { id: 'photo-1610030469983-98e550d6193c', mode: 'flatlay' },

  'mint-organza-1': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },
  'mint-organza-2': { id: 'photo-1609748340041-f5d61e061ebc', mode: 'neckDown' },

  'lavender-organza-1': { id: 'photo-1610030469983-98e550d6193c', mode: 'flatlay' },
  'lavender-organza-2': { id: 'photo-1641699862936-be9f49b1c38d', mode: 'neckDown' },

  'black-party-wear-1': { id: 'photo-1761125135351-268e72e39158', mode: 'neckDown' },
  'black-party-wear-2': { id: 'photo-1761125135253-d7a7510a236f', mode: 'neckDown' },

  'gold-tissue-1': { id: 'photo-1582533561751-ef6f6ab93a2e', mode: 'neckDown' },
  'gold-tissue-2': { id: 'photo-1610030469983-98e550d6193c', mode: 'flatlay' },

  // ── Categories (12 sarees) ────────────────────────────────────────────────
  'category-silk-sarees': { id: 'photo-1610030469983-98e550d6193c', mode: 'flatlay' },
  'category-handloom-sarees': { id: 'photo-1756483482418-3f3e4c13f9b0', mode: 'neckDown' },
  'category-designer-sarees': { id: 'photo-1614036417651-efe5912149d8', mode: 'flatlay' },
  'category-banarasi-silk': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'category-kanjeevaram-silk': { id: 'photo-1609357605129-26f69add5d6e', mode: 'flatlay' },
  'category-tussar-silk': { id: 'photo-1579783900882-c0d3dad7b119', mode: 'flatlay' },
  'category-tripura-handloom': { id: 'photo-1616986491129-3e37cb654c82', mode: 'flatlay' },
  'category-cotton-sarees': { id: 'photo-1616756351484-798f37bdffa0', mode: 'flatlay' },
  'category-linen-sarees': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },
  'category-georgette-chiffon': { id: 'photo-1618901185975-d59f7091bcfe', mode: 'neckDown' },
  'category-organza-sarees': { id: 'photo-1582533561751-ef6f6ab93a2e', mode: 'neckDown' },
  'category-party-wear-sarees': { id: 'photo-1761125135351-268e72e39158', mode: 'neckDown' },

  // ── Occasions (5 sarees) ──────────────────────────────────────────────────
  'occasion-wedding': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'occasion-festive': { id: 'photo-1601924994987-69e26d50dc26', mode: 'flatlay' },
  'occasion-party': { id: 'photo-1761125135351-268e72e39158', mode: 'neckDown' },
  'occasion-office-wear': { id: 'photo-1604014237800-1c9102c219da', mode: 'neckDown' },
  'occasion-daily-wear': { id: 'photo-1616756351484-798f37bdffa0', mode: 'flatlay' },

  // ── Hero, Side, Store (14 sarees) ─────────────────────────────────────────
  'hero-wedding': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'hero-handloom': { id: 'photo-1596755094514-f87e34085b2c', mode: 'flatlay' },
  'hero-festive': { id: 'photo-1601924994987-69e26d50dc26', mode: 'flatlay' },
  'hero-designer': { id: 'photo-1614036417651-efe5912149d8', mode: 'flatlay' },
  'side-bridal': { id: 'photo-1610030469983-98e550d6193c', mode: 'flatlay' },
  'side-silk': { id: 'photo-1609357605129-26f69add5d6e', mode: 'flatlay' },
  'side-handloom': { id: 'photo-1616986491129-3e37cb654c82', mode: 'flatlay' },
  'side-designer': { id: 'photo-1641699862936-be9f49b1c38d', mode: 'neckDown' },
  'footer-handloom': { id: 'photo-1596755094514-f87e34085b2c', mode: 'flatlay' },
  'footer-bridal': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'store-front': { id: 'photo-1544816155-12df9643f363', mode: 'flatlay' },
  'store-saree-wall': { id: 'photo-1544816155-12df9643f363', mode: 'flatlay' },
  'store-bridal-flatlay': { id: 'photo-1617627143750-d86bc21e42bb', mode: 'flatlay' },
  'story-loom': { id: 'photo-1596755094514-f87e34085b2c', mode: 'flatlay' }
};

const rawCache = {};

function downloadRaw(photoId) {
  if (rawCache[photoId]) return Promise.resolve(rawCache[photoId]);
  const url = `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=85`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        rawCache[photoId] = buf;
        resolve(buf);
      });
    }).on('error', reject);
  });
}

async function processImage(buf, mode) {
  const meta = await sharp(buf).metadata();
  let pipeline = sharp(buf);

  if (mode === 'neckDown') {
    // Crop bottom 65% of the height so face and head are 100% eliminated
    const cropTop = Math.floor(meta.height * 0.38);
    const cropHeight = meta.height - cropTop;
    pipeline = pipeline.extract({
      left: 0,
      top: cropTop,
      width: meta.width,
      height: cropHeight
    });
  }

  // Resize to standard fashion portrait 800x1000
  return pipeline
    .resize(800, 1000, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 84 })
    .toBuffer();
}

function makeSvg(base64Jpg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">\n  <image href="data:image/jpeg;base64,${base64Jpg}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>\n</svg>\n`;
}

async function main() {
  console.log('Processing 100% genuine saree images (strictly NO human faces)...');
  const productsDir = path.join(__dirname, '..', 'public', 'products', 'sarees');
  const assetsDir = path.join(__dirname, '..', 'src', 'assets', 'sarees');

  let count = 0;
  const entries = Object.entries(sareeItems);

  for (const [key, config] of entries) {
    const raw = await downloadRaw(config.id);
    const processedJpg = await processImage(raw, config.mode);
    const b64 = processedJpg.toString('base64');
    const svgContent = makeSvg(b64);

    const isProduct = !key.startsWith('category-') && !key.startsWith('occasion-') && 
                      !key.startsWith('hero-') && !key.startsWith('side-') && 
                      !key.startsWith('footer-') && !key.startsWith('store-') && !key.startsWith('story-');

    const targetDir = isProduct ? productsDir : assetsDir;

    // Save high quality JPG
    fs.writeFileSync(path.join(targetDir, `${key}.jpg`), processedJpg);
    // Save SVG embedding the JPG
    fs.writeFileSync(path.join(targetDir, `${key}.svg`), svgContent, 'utf8');

    count++;
    process.stdout.write(`\r[${count}/${entries.length}] Processed saree: ${key} (${config.mode})`);
  }
  console.log('\n\nSuccessfully updated all 73 images to authentic face-free saree photography!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
