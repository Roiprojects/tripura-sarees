export const COLOR_HEX: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  ivory: "#FFFBEF",
  offwhite: "#F7F2E7",
  "off white": "#F7F2E7",
  grey: "#9ca3af",
  gray: "#9ca3af",
  silver: "#C0C0C0",
  red: "#B3202A",
  crimson: "#8E1B2C",
  maroon: "#7A1F2B",
  wine: "#5E1A33",
  rust: "#A8491F",
  orange: "#E07B22",
  gold: "#C9A227",
  mustard: "#D39B1E",
  yellow: "#E8C547",
  cream: "#FFF4E6",
  beige: "#D9C3A0",
  brown: "#7B4F2A",
  green: "#1F7A4D",
  emerald: "#0F5E4B",
  "bottle green": "#0B4A3B",
  mint: "#BFE3D2",
  sage: "#A7B89A",
  olive: "#7C8A3E",
  khaki: "#C3B091",
  teal: "#0E6E6A",
  peacock: "#0E6E6A",
  blue: "#1D3F8F",
  "royal blue": "#1D3F8F",
  navy: "#1E3A8A",
  indigo: "#233D7B",
  sky: "#7EC4FF",
  "powder blue": "#AFC6DE",
  pink: "#E9A0B4",
  blush: "#E9B4BF",
  rani: "#C2185B",
  magenta: "#A3195B",
  purple: "#5B2A86",
  lavender: "#C9B5DE",
  peach: "#F6C6A8",
  multi: "linear-gradient(45deg,#8E1B2C,#C9A227,#0F5E4B)",
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CSS_COLOR_FUNCTION = /^(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/i;
const CSS_COLOR_KEYWORD = /^[a-z]+$/i;

export const colorKey = (value: string) => value.trim().toLowerCase();

export const getColorCss = (nameOrValue?: string | null, exactHex?: string | null) => {
  const exact = exactHex?.trim();
  if (exact && (HEX_COLOR.test(exact) || CSS_COLOR_FUNCTION.test(exact) || exact.includes("gradient"))) {
    return exact;
  }

  const value = nameOrValue?.trim();
  if (!value) return "#d1d5db";

  if (HEX_COLOR.test(value) || CSS_COLOR_FUNCTION.test(value) || value.includes("gradient")) return value;
  return COLOR_HEX[colorKey(value)] ?? (CSS_COLOR_KEYWORD.test(value) ? value.toLowerCase() : "#d1d5db");
};