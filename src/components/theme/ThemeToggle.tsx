"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "@/components/ui/Segmented";
import { useTheme, type ThemePreference } from "./ThemeProvider";

/** System, light or dark. The choice is remembered on this device. */
export function ThemeToggle({ className = "", iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const { preference, setPreference } = useTheme();
  // Icon-only keeps the names for screen readers but fits a narrow sidebar.
  const text = (label: string) => (iconOnly ? <span className="sr-only">{label}</span> : label);
  return (
    <Segmented<ThemePreference>
      label="Appearance"
      value={preference}
      onChange={setPreference}
      className={className}
      options={[
        { value: "system", label: text("Auto"), icon: <Monitor className="size-4" aria-hidden /> },
        { value: "light", label: text("Light"), icon: <Sun className="size-4" aria-hidden /> },
        { value: "dark", label: text("Dark"), icon: <Moon className="size-4" aria-hidden /> },
      ]}
    />
  );
}

/** A single round button that flips between light and dark, for tight spaces. */
export function ThemeQuickToggle() {
  const { resolved, setPreference } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={() => setPreference(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken active:scale-95"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
