import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { site } from "./src/config/site";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Fills the %SITE_*% placeholders in index.html from src/config/site.ts.
const siteHtmlPlugin = (): Plugin => ({
  name: "site-config-html",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html
        .replace(/%SITE_TITLE%/g, escapeHtml(site.seo.title))
        .replace(/%SITE_DESCRIPTION%/g, escapeHtml(site.seo.description))
        .replace(/%SITE_AUTHOR%/g, escapeHtml(site.seo.author))
        .replace(/%SITE_FAVICON%/g, escapeHtml(site.seo.favicon)),
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Subfolder-safe build:
  //   VITE_BASE_PATH=/shop/ npm run build
  // Must start and end with "/". Defaults to "/" (domain root).
  const rawBase = process.env.VITE_BASE_PATH ?? "/";
  const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  return {
    base,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [siteHtmlPlugin(), react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
