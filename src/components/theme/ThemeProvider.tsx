"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
type Resolved = "light" | "dark";

const STORAGE_KEY = "chai-theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: Resolved;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The blocking script in the root layout has already set data-theme before first paint.
 * This provider keeps it in sync afterwards: it applies changes, remembers the choice,
 * and follows the operating system while the preference is "system".
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    } catch {
      // Storage can be blocked (private windows); the theme still works for this visit.
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: Resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    meta?.setAttribute("content", resolved === "dark" ? "#17110d" : "#fbf7f0");
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore: the preference just won't persist.
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/** Runs before first paint so there is no flash of the wrong theme. Kept as a string for the layout. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
