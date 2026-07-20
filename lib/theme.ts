export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

// Older, non-technical audience already runs their OS in light mode -- we don't infer
// from prefers-color-scheme, we just start light and let the toggle override it (see
// DESIGN.md Theme section).
const DEFAULT_THEME: Theme = "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "dark" ? "dark" : DEFAULT_THEME;
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

// Inlined into a beforeInteractive <Script> in app/layout.tsx so the correct theme is
// set on <html> before first paint -- runs before React hydrates, so it can't import
// this module directly, hence the literal string. Keep it in sync with the two
// functions above by hand; it's small and only touches localStorage + one attribute.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = window.localStorage.getItem("${STORAGE_KEY}");
    document.documentElement.setAttribute("data-theme", t === "dark" ? "dark" : "${DEFAULT_THEME}");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "${DEFAULT_THEME}");
  }
})();
`;
