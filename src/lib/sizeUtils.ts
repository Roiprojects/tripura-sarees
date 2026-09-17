// Shared normalization + sorting for size labels across the entire site.
// Handles: Newborn, N-N Months, N-N Years, numeric, letter (XS-6XL), Free/One Size.

export const normalizeSize = (raw: string): string => {
  if (!raw) return "";
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-") // fancy dashes → -
    .replace(/\s*(to|\/)\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-");
};

const LETTER_ORDER: Record<string, number> = {
  xxs: 0, xs: 1, s: 2, m: 3, l: 4, xl: 5, xxl: 6,
  "2xl": 6, "3xl": 7, "4xl": 8, "5xl": 9, "6xl": 10,
};

/** Returns a comparable numeric rank; smaller = smaller size. */
export const sizeRank = (raw: string): number => {
  const s = normalizeSize(raw);
  if (!s) return 9999;

  // Premature — smaller than newborn
  if (/^(preme|premature|pre-?term|preemie)$/.test(s)) return -10;

  // Newborn
  if (/^(nb|newborn|new born)$/.test(s)) return 0;

  // Months: "0-3 months", "0-3m", "3-6mo", "12m"
  const monthMatch = s.match(/^(\d+)(?:-(\d+))?\s*(?:m|mo|month|months)\b/);
  if (monthMatch) {
    const lo = parseInt(monthMatch[1], 10);
    return 100 + lo; // 100..199
  }

  // Years: "2-3 years", "2y", "8-9y"
  const yearMatch = s.match(/^(\d+)(?:-(\d+))?\s*(?:y|yr|yrs|year|years)\b/);
  if (yearMatch) {
    const lo = parseInt(yearMatch[1], 10);
    return 200 + lo; // 200..299
  }

  // All-zero preemie/newborn scale sizes: "0000" < "000" < "00" < "0"
  // (more leading zeros = smaller baby) — ranked just above newborn, below
  // the hyphenated infant-range bucket below.
  if (/^0+$/.test(s)) {
    return 10 + (4 - s.length) * 10; // "0000"=10, "000"=20, "00"=30, "0"=40
  }

  // Bare numeric infant sizes (e.g. "1-2", "2-3", "10", "12")
  // used for pre-1-year infant scales — these are smaller than Y/M sizes, so they
  // rank ahead of months/years, between newborn (0) and months (100..199).
  const bareNumMatch = s.match(/^(\d+)(?:-(\d+))?$/);
  if (bareNumMatch) {
    const lo = parseInt(bareNumMatch[1], 10);
    return 50 + lo; // 50..~150
  }

  // Numeric garment-size codes with a parenthetical age hint, e.g.
  // "14(6-12m)" or "10(0-3)m" — the leading code number is already
  // monotonic with age, so rank directly off it, just above the
  // hyphenated infant-range bucket.
  const codeMatch = s.match(/^(\d+)\(/);
  if (codeMatch) {
    return 62 + parseInt(codeMatch[1], 10);
  }

  // Letter sizes
  if (s in LETTER_ORDER) return 500 + LETTER_ORDER[s];
  // Numeric-prefix XL variants normalized above; also handle without hyphen
  const nxl = s.match(/^(\d+)xl$/);
  if (nxl) return 500 + 5 + parseInt(nxl[1], 10);

  // Free / One size
  if (/^(free size|onesize|one size|free)$/.test(s)) return 700;

  // Fallback: try leading number
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  return 800 + (isFinite(num) ? num : 0);
};

export const sortSizes = <T extends string>(arr: T[]): T[] =>
  [...arr].sort((a, b) => sizeRank(a) - sizeRank(b));

export const sizesEqual = (a: string, b: string) =>
  normalizeSize(a) === normalizeSize(b);
