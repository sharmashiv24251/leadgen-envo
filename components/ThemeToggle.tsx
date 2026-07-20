"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import Tooltip from "@/components/Tooltip";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

const KNOB_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
const KNOB_LINEAR = { type: "tween", duration: 0.15, ease: "easeOut" } as const;

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  if (theme === null) return null;

  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <Tooltip label={isDark ? "Switch to day mode" : "Switch to night mode"}>
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
        aria-pressed={isDark}
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors active:scale-[0.97] ${
          isDark ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <motion.span
          className="relative inline-flex h-3 w-3 items-center justify-center rounded-full bg-surface"
          animate={{ x: isDark ? 14 : 2 }}
          transition={reduceMotion ? KNOB_LINEAR : KNOB_SPRING}
        >
          {isDark ? (
            <MoonIcon className="h-2 w-2 text-ink-muted" />
          ) : (
            <SunIcon className="h-2 w-2 text-pending" />
          )}
        </motion.span>
      </button>
    </Tooltip>
  );
}
