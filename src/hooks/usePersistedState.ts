import { useEffect, useRef, useState } from "react";

/**
 * useState variant that persists to sessionStorage under `key`.
 * Restores the last value on mount so that navigating away (e.g. to a
 * product detail page) and back preserves the previous state — filters,
 * sort, pagination, etc.
 */
export function usePersistedState<T>(key: string, initial: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  const keyRef = useRef(key);
  // If the key changes (e.g. user navigated to a different store), reload
  // the value for the new key rather than continuing to write the old one.
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    try {
      const raw = sessionStorage.getItem(key);
      setState(raw != null ? (JSON.parse(raw) as T) : (typeof initial === "function" ? (initial as () => T)() : initial));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch { /* ignore quota */ }
  }, [key, state]);

  return [state, setState];
}

/** Clear every persisted filter entry for a given prefix (e.g. a page). */
export function clearPersistedByPrefix(prefix: string) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}
