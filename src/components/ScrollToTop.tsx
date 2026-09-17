import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Disable the browser's native scroll restoration so we can manage it ourselves
// per history entry. This lets the Back button return to the exact scroll
// position (Flipkart/Amazon style) instead of resetting to the top.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const STORAGE_KEY = "th_scroll_positions_v1";
const PRODUCT_RETURN_KEY = "th_product_return_memory_v1";

type PositionMap = Record<string, number>;

type ProductReturnMemory = {
  sourceRoute: string;
  productId: string;
  sectionId: string;
  sectionTitle: string;
  sectionDomId: string;
  productIndex: number;
  linkIndex: number;
  scrollY: number;
  sectionViewportTop: number;
  productViewportTop: number;
  scrollerScrollLeft: number | null;
  savedAt: number;
};

const readMap = (): PositionMap => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeMap = (map: PositionMap) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
};

const savePosition = (key: string) => {
  if (!key) return;
  const map = readMap();
  map[key] = window.scrollY;
  writeMap(map);
};

const currentRoute = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const productIdFromHref = (href: string) => {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const match = url.pathname.match(/^\/product\/([^/?#]+)\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const getProductLinks = (scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .filter((a) => productIdFromHref(a.href));

const closestSection = (el: Element) =>
  el.closest<HTMLElement>("[data-section-id]") ??
  el.closest<HTMLElement>("section[id]") ??
  el.closest<HTMLElement>("section") ??
  el.closest<HTMLElement>("main") ??
  document.body;

const sectionIdFor = (section: HTMLElement) =>
  section.dataset.sectionId || section.id || section.getAttribute("aria-label") || "page";

const sectionTitleFor = (section: HTMLElement) =>
  section.dataset.sectionTitle ||
  section.getAttribute("aria-label") ||
  section.querySelector("h1, h2, h3")?.textContent?.trim() ||
  sectionIdFor(section);

const findHorizontalScroller = (el: HTMLElement, stopAt?: HTMLElement | null) => {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const canScroll = node.scrollWidth > node.clientWidth + 4 && /(auto|scroll)/.test(style.overflowX);
    if (canScroll) return node;
    if (stopAt && node === stopAt) break;
    node = node.parentElement;
  }
  return null;
};

const saveProductReturnMemory = (anchor: HTMLAnchorElement, target: Element) => {
  const productId = productIdFromHref(anchor.href);
  if (!productId) return;

  const section = closestSection(anchor);
  const sectionProductLinks = getProductLinks(section);
  const uniqueProductIds: string[] = [];
  sectionProductLinks.forEach((link) => {
    const id = productIdFromHref(link.href);
    if (id && !uniqueProductIds.includes(id)) uniqueProductIds.push(id);
  });
  const productIndex = Math.max(0, uniqueProductIds.indexOf(productId));
  const linkIndex = Math.max(0, sectionProductLinks.indexOf(anchor));
  const rect = (target.closest("a[href]") ?? anchor).getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  const scroller = findHorizontalScroller(anchor, section);

  const memory: ProductReturnMemory = {
    sourceRoute: currentRoute(),
    productId,
    sectionId: sectionIdFor(section),
    sectionTitle: sectionTitleFor(section),
    sectionDomId: section.id || "",
    productIndex,
    linkIndex,
    scrollY: window.scrollY,
    sectionViewportTop: sectionRect.top,
    productViewportTop: rect.top,
    scrollerScrollLeft: scroller ? scroller.scrollLeft : null,
    savedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(PRODUCT_RETURN_KEY, JSON.stringify(memory));
  } catch {
    /* ignore quota errors */
  }
};

const readProductReturnMemory = (): ProductReturnMemory | null => {
  try {
    const raw = sessionStorage.getItem(PRODUCT_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductReturnMemory;
    if (!parsed.productId || !parsed.sourceRoute) return null;
    // Keep the memory fresh for the current shopping session only.
    if (Date.now() - parsed.savedAt > 1000 * 60 * 30) return null;
    return parsed;
  } catch {
    return null;
  }
};

const findSavedSection = (sectionId: string) => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-id], section[id], main"));
  return sections.find((el) =>
    el.dataset.sectionId === sectionId ||
    el.id === sectionId ||
    el.id === `home-section-${sectionId}`
  ) ?? null;
};

const findSavedProductLink = (memory: ProductReturnMemory) => {
  const section = findSavedSection(memory.sectionId);
  const sectionLinks = section ? getProductLinks(section) : [];
  const exactLink = sectionLinks[memory.linkIndex];
  if (exactLink && productIdFromHref(exactLink.href) === memory.productId) return exactLink;

  // Never fall back to the whole document. The same product can appear in
  // several homepage sections; global lookup is what sent Back to Shop by
  // Category instead of the exact clicked section.
  const matches = sectionLinks.filter((link) => productIdFromHref(link.href) === memory.productId);
  if (matches.length > 0) return matches[Math.min(memory.productIndex, matches.length - 1)] ?? matches[0];
  return null;
};

const highlightProduct = (el: HTMLElement) => {
  if (!document.getElementById("th-smart-back-style")) {
    const style = document.createElement("style");
    style.id = "th-smart-back-style";
    style.textContent = `
      .th-smart-back-highlight {
        outline: 3px solid hsl(var(--primary));
        outline-offset: 5px;
        border-radius: 1rem;
        transition: outline-color 200ms ease, box-shadow 200ms ease;
        box-shadow: 0 0 0 7px hsl(var(--primary) / 0.14);
      }
    `;
    document.head.appendChild(style);
  }
  document.querySelectorAll(".th-smart-back-highlight").forEach((node) => {
    node.classList.remove("th-smart-back-highlight");
  });
  el.classList.add("th-smart-back-highlight");
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  try { el.focus({ preventScroll: true }); } catch { /* ignore */ }
  window.setTimeout(() => el.classList.remove("th-smart-back-highlight"), 2200);
};

const restoreSavedProduct = (memory: ProductReturnMemory) => {
  const section = findSavedSection(memory.sectionId);
  if (section) {
    const sectionTarget = Number.isFinite(memory.sectionViewportTop)
      ? Math.max(0, window.scrollY + section.getBoundingClientRect().top - memory.sectionViewportTop)
      : Math.max(0, section.getBoundingClientRect().top + window.scrollY - 16);
    window.scrollTo({ top: sectionTarget, left: 0, behavior: "auto" });
  }

  const link = findSavedProductLink(memory);
  if (!link) return false;

  const scroller = findHorizontalScroller(link, closestSection(link));
  if (scroller && typeof memory.scrollerScrollLeft === "number") {
    scroller.scrollLeft = memory.scrollerScrollLeft;
  }

  const hasUsableProductTop = memory.productViewportTop >= 0 && memory.productViewportTop <= window.innerHeight;
  const nextTop = hasUsableProductTop
    ? Math.max(0, window.scrollY + link.getBoundingClientRect().top - memory.productViewportTop)
    : memory.scrollY;
  window.scrollTo({ top: Number.isFinite(nextTop) ? nextTop : memory.scrollY, left: 0, behavior: "auto" });
  highlightProduct(link);
  return true;
};

export const ScrollToTop = () => {
  const { pathname, search, hash, key } = useLocation();
  const navType = useNavigationType(); // "POP" | "PUSH" | "REPLACE"
  const route = `${pathname}${search}${hash}`;
  const lastKeyRef = useRef<string>(key);
  const lastRouteRef = useRef<string>(route);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      if (!target || target.closest("button, [role='button'], input, select, textarea")) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !productIdFromHref(anchor.href)) return;
      saveProductReturnMemory(anchor, target);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Persist scroll position for the entry we're leaving so a future Back
  // navigation can restore it.
  useEffect(() => {
    const handler = () => savePosition(lastKeyRef.current);
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  useLayoutEffect(() => {
    // Save the position of the entry we are leaving before switching keys.
    if (lastKeyRef.current && lastKeyRef.current !== key) {
      savePosition(lastKeyRef.current);
    }

    // On a hard refresh / first mount, always start at the top instead of
    // restoring a stale scroll position (which lands the user on the footer).
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      lastKeyRef.current = key;
      lastRouteRef.current = route;
      return;
    }


    if (navType === "POP") {
      // Back / forward — restore exact scroll position for this history entry.
      const map = readMap();
      const memory = readProductReturnMemory();
      const previousRoute = lastRouteRef.current;
      const isHomeRoute = pathname === "/" && !search && !hash;
      const isTopOnBackRoute = isHomeRoute || pathname === "/account" || pathname.startsWith("/account/");
      const previousProductId = productIdFromHref(previousRoute);
      // Back to Home / Account must always land at the top — never a
      // restored bottom position that would land the user on the footer.
      const shouldRestoreProduct =
        !isTopOnBackRoute &&
        memory?.sourceRoute === route &&
        previousProductId === memory.productId;
      const target = shouldRestoreProduct ? memory.scrollY : isTopOnBackRoute ? 0 : (map[key] ?? 0);
      // Wait for the new route to render and retry only until the saved
      // product is found. Continuing to force scroll after that makes the
      // homepage feel frozen/buffering when the customer taps Back.
      const timers: number[] = [];
      let cancelled = false;
      let restored = false;
      const clearTimers = () => {
        timers.splice(0).forEach((timer) => window.clearTimeout(timer));
      };
      const restore = () => {
        if (cancelled || restored) return;
        const restoredProduct = shouldRestoreProduct && memory ? restoreSavedProduct(memory) : false;
        if (restoredProduct) {
          restored = true;
          clearTimers();
          return;
        }

        window.scrollTo({ top: target, left: 0, behavior: "auto" });
        if (!shouldRestoreProduct) restored = true;
      };
      requestAnimationFrame(restore);
      [40, 120, 240, 420, 700, 1100, 1600, 2300].forEach((ms) => {
        timers.push(window.setTimeout(restore, ms));
      });
      lastKeyRef.current = key;
      lastRouteRef.current = route;
      return () => {
        cancelled = true;
        clearTimers();
      };
    } else {
      // New navigation (PUSH/REPLACE) — start at the top.
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    lastKeyRef.current = key;
    lastRouteRef.current = route;
  }, [pathname, search, hash, route, key, navType]);

  return null;
};
