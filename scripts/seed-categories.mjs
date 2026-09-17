// One-off data-population script: creates the category tree the storefront
// code already expects (StorePage.tsx STORES config, Collection.tsx chain
// matching, InfantsPage.tsx token matching) and assigns every existing
// active product to the right category. Safe to re-run — categories are
// upserted by slug and product assignment is idempotent.
//
// Usage: node scripts/seed-categories.mjs
// Requires .env with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, and
// an admin Supabase Auth account (email/password below) whose user_roles
// row has role = 'admin' so RLS allows writes.

import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split("\n").filter(Boolean).map((line) => {
    const [k, ...rest] = line.split("=");
    return [k.trim(), rest.join("=").trim().replace(/^"|"$/g, "")];
  }),
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
// Admin credentials come from the environment (or .env): SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || env.SEED_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running this script.");
  process.exit(1);
}

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Login failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

function makeClient(accessToken) {
  const baseHeaders = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  return {
    async select(table, query) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: baseHeaders });
      if (!res.ok) throw new Error(`SELECT ${table} failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
    async insert(table, rows) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { ...baseHeaders, Prefer: "return=representation" },
        body: JSON.stringify(rows),
      });
      if (!res.ok) throw new Error(`INSERT ${table} failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
    async update(table, match, patch) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
        method: "PATCH",
        headers: { ...baseHeaders, Prefer: "return=representation" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`UPDATE ${table} failed: ${res.status} ${await res.text()}`);
      return res.json();
    },
  };
}

// ─── Category tree ──────────────────────────────────────────────────────
// slug is the stable key the storefront code looks up by (STORES rootSlug /
// occasionRules, Collection.tsx chain matching). name is the human label
// (Collection.tsx also falls back to matching on slugify(name)).
const TREE = [
  {
    slug: "boys-root", name: "Boys", gender: "boys", children: [
      {
        slug: "boys-ethnic", name: "Ethnic Wear", gender: "boys", children: [
          { slug: "boys-ethnic-kurta-set", name: "Kurta Set" },
          { slug: "boys-ethnic-indowestern", name: "IndoWestern" },
        ],
      },
      {
        slug: "boys-party", name: "Party Wear", gender: "boys", children: [
          { slug: "boys-party-suits", name: "Suits" },
          { slug: "boys-party-waistcoat-sets", name: "Waist Coat Sets" },
        ],
      },
      { slug: "boys-casual", name: "Casual Wear", gender: "boys" },
    ],
  },
  {
    slug: "girls-root", name: "Girls", gender: "girls", children: [
      { slug: "girls-ethnic", name: "Ethnic Wear", gender: "girls" },
      { slug: "girls-party", name: "Party Wear", gender: "girls" },
      { slug: "girls-casual", name: "Casual Wear", gender: "girls" },
      { slug: "girls-frocks", name: "Frocks", gender: "girls" },
    ],
  },
  {
    slug: "infants", name: "Infants", gender: "infants", children: [
      { slug: "infants-casual-wear", name: "Casual Wear", gender: "infants" },
      { slug: "infants-ethnic-wear", name: "Ethnic Wear", gender: "infants" },
      { slug: "infants-gift-sets", name: "Gift Sets", gender: "infants" },
      { slug: "infants-new-born-essentials", name: "New Born Essentials", gender: "infants" },
      { slug: "infants-party-wear", name: "Party Wear", gender: "infants" },
    ],
  },
];

// ─── Product → category slug, matched by product name ──────────────────
const PRODUCT_CATEGORY = {
  "Royal Sherwani Set": "boys-ethnic",
  "Festive Kurta Pajama": "boys-ethnic-kurta-set",
  "Nehru Jacket Set": "boys-ethnic-indowestern",
  "Stepout Denim Jacket": "boys-casual",
  "Cargo Joggers Set": "boys-casual",
  "Casual Tee & Shorts": "boys-casual",
  "Bear Hug Sweater": "boys-casual",
  "Boys Birthday Tuxedo": "boys-party-suits",
  "Boys Party Blazer Set": "boys-party-waistcoat-sets",
  "Diwali Festive Kurta": "boys-ethnic-kurta-set",

  "Birthday Party Frock": "girls-frocks",
  "Summer Sundress": "girls-casual",
  "Birthday Rainbow Frock": "girls-frocks",
  "Floral Skirt Set": "girls-casual",
  "Pink Embroidered Lehenga": "girls-ethnic",
  "Red Wedding Lehenga": "girls-ethnic",
  "Toddler Magenta Ghagra": "girls-ethnic",
  "Pink Anarkali Suit": "girls-ethnic",
  "Sky Salwar Kameez": "girls-ethnic",
  "Girls Party Gown": "girls-party",

  "Newborn Knit Romper": "infants-new-born-essentials",
  "Infant Party Romper": "infants-party-wear",
  "Yellow Baby Kurta Set": "infants-ethnic-wear",
  "Baby Dhoti Kurta": "infants-ethnic-wear",
  "Infant Festive Anarkali": "infants-ethnic-wear",
  "Mint Cotton Onesie": "infants-casual-wear",
  "Infant Birthday Tutu": "infants-party-wear",
};

// Cross-listing demo: give one boys + one girls ethnic product an
// infant-eligible size so they surface under Infants → Ethnic Wear too
// (InfantsPage.tsx matches on gender=boys/girls + an infant-range size).
const INFANT_SIZE_ADDITIONS = {
  "Royal Sherwani Set": "1-2",
  "Pink Embroidered Lehenga": "16",
};

async function upsertCategory(client, node, parentId) {
  const existing = await client.select("categories", `slug=eq.${encodeURIComponent(node.slug)}&select=id,slug`);
  let id;
  if (existing.length) {
    id = existing[0].id;
    console.log(`  = ${node.slug} (existing)`);
  } else {
    const [row] = await client.insert("categories", [{
      name: node.name,
      slug: node.slug,
      parent_id: parentId,
      gender: node.gender ?? null,
    }]);
    id = row.id;
    console.log(`  + ${node.slug} (created)`);
  }
  for (const child of node.children ?? []) {
    await upsertCategory(client, child, id);
  }
  return id;
}

async function main() {
  console.log("Logging in as admin...");
  const token = await login();
  const client = makeClient(token);

  console.log("\nCreating category tree...");
  for (const root of TREE) {
    await upsertCategory(client, root, null);
  }

  console.log("\nAssigning products to categories...");
  const allCats = await client.select("categories", "select=id,slug");
  const catBySlug = new Map(allCats.map((c) => [c.slug, c.id]));

  const products = await client.select("products", "select=id,name,sizes&status=eq.active");
  const productByName = new Map(products.map((p) => [p.name, p]));

  for (const [name, slug] of Object.entries(PRODUCT_CATEGORY)) {
    const product = productByName.get(name);
    const catId = catBySlug.get(slug);
    if (!product) { console.log(`  ! product not found: ${name}`); continue; }
    if (!catId) { console.log(`  ! category not found: ${slug}`); continue; }
    await client.update("products", `id=eq.${product.id}`, { category_id: catId });
    console.log(`  ${name} -> ${slug}`);
  }

  console.log("\nAdding infant cross-listing sizes...");
  for (const [name, size] of Object.entries(INFANT_SIZE_ADDITIONS)) {
    const product = productByName.get(name);
    if (!product) { console.log(`  ! product not found: ${name}`); continue; }
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    if (sizes.includes(size)) { console.log(`  = ${name} already has size ${size}`); continue; }
    await client.update("products", `id=eq.${product.id}`, { sizes: [...sizes, size] });
    console.log(`  ${name} + size ${size}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
