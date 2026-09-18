// Resolve any image src to a deployment-safe URL.
// - Strips invalid values (undefined/null/empty/localhost/blob/temp preview URLs)
// - Keeps absolute cloud/CDN https URLs intact
// - Resolves legacy "/src/assets/..." seeded DB paths through Vite's bundled assets
// - Prefixes root-relative /public assets with import.meta.env.BASE_URL so the
//   site works when hosted under a subfolder (e.g. example.com/shop/).

const assetMap = import.meta.glob("/src/assets/**/*.{webp,jpg,jpeg,png,svg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const assetJsonMap = import.meta.glob("/src/assets/**/*.asset.json", {
  eager: true,
}) as Record<string, any>;

const pointerUrl = (mod: any): string | undefined =>
  (mod?.default?.url ?? mod?.url) as string | undefined;

const pointerByPath = new Map<string, string>();
const pointerByBasename = new Map<string, string>();
for (const [key, mod] of Object.entries(assetJsonMap)) {
  const url = pointerUrl(mod);
  if (!url) continue;
  const original = key.replace(/\.asset\.json$/, "");
  pointerByPath.set(original, url);
  const base = original.split("/").pop();
  if (base) pointerByBasename.set(base, url);
}

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/") || "/";
const ASSET_ORIGIN =
  (import.meta.env.VITE_ASSET_ORIGIN as string | undefined)?.replace(/\/+$/, "") ||
  "";

export const PLACEHOLDER_IMAGE = `${BASE}placeholder.svg`;

export const assetUrl = (mod: any): string => {
  const url = (mod?.default?.url ?? mod?.url) as string | undefined;
  return resolveImage(url);
};

const INVALID_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i;

const isInvalid = (src?: string | null): src is undefined => {
  if (!src || typeof src !== "string") return true;
  const s = src.trim();
  if (!s || s === "null" || s === "undefined") return true;
  if (s.startsWith("blob:")) return true;
  if (INVALID_HOSTS.test(s)) return true;
  return false;
};

const withBase = (path: string) => {
  if (BASE === "/") return path;
  return BASE.replace(/\/$/, "") + path;
};

const localFromLovablePath = (pathname: string): string | undefined => {
  const base = pathname.split("/").pop();
  if (!base) return undefined;
  if (pointerByBasename.has(base)) return pointerByBasename.get(base);
  const hit = Object.keys(assetMap).find((k) => k.endsWith("/" + base));
  return hit ? assetMap[hit] : undefined;
};

const remoteAssetFromPath = (pathname: string, search = ""): string | undefined => {
  if (!ASSET_ORIGIN) return undefined;
  return `${ASSET_ORIGIN}${pathname}${search}`;
};

export const resolveImage = (src?: string | null): string => {
  if (isInvalid(src)) return PLACEHOLDER_IMAGE;
  const s = (src as string).trim();

  if (s.startsWith("/__l5e/")) {
    return localFromLovablePath(s) ?? remoteAssetFromPath(s) ?? PLACEHOLDER_IMAGE;
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      const url = new URL(s);
      if (url.pathname.startsWith("/__l5e/")) {
        return localFromLovablePath(url.pathname) ?? remoteAssetFromPath(url.pathname, url.search) ?? PLACEHOLDER_IMAGE;
      }
    } catch {
      return s;
    }
    return s;
  }
  if (s.startsWith("data:")) return s;

  if (s.startsWith("//")) return s;

  if (assetMap[s]) return assetMap[s];
  if (pointerByPath.has(s)) return pointerByPath.get(s)!;

  if (s.startsWith("/") && !s.startsWith("/src/")) {
    if (s.startsWith("/products/sarees/") && s.endsWith(".svg")) {
      const jpg = s.replace(/\.svg$/, ".jpg");
      return withBase(jpg);
    }
    if (BASE !== "/" && s.startsWith(BASE)) return s;
    return withBase(s);
  }

  const webp = s.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  if (assetMap[webp]) return assetMap[webp];
  if (pointerByPath.has(webp)) return pointerByPath.get(webp)!;

  const baseName = s.split("/").pop();
  const webpBase = baseName?.replace(/\.(jpg|jpeg|png)$/i, ".webp");
  if (baseName) {
    const found = Object.keys(assetMap).find((k) => k.endsWith("/" + baseName));
    if (found) return assetMap[found];
    if (pointerByBasename.has(baseName)) return pointerByBasename.get(baseName)!;
  }
  if (webpBase) {
    const found = Object.keys(assetMap).find((k) => k.endsWith("/" + webpBase));
    if (found) return assetMap[found];
    if (pointerByBasename.has(webpBase)) return pointerByBasename.get(webpBase)!;
  }

  return PLACEHOLDER_IMAGE;
};
