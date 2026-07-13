"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ContextMenuItem = {
  label: string;
  onSelect: () => void;
};

type MenuState = { x: number; y: number; items: ContextMenuItem[] };

const ContextMenuCtx = createContext<(e: React.MouseEvent, items: ContextMenuItem[]) => void>(
  () => {}
);

/** Opt into a custom, native-styled right-click menu instead of the browser's own. */
export function useContextMenu() {
  return useContext(ContextMenuCtx);
}

export default function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    // Stop the nearest opted-in handler from being overridden by an ancestor's
    // (e.g. a copy badge inside a contact card that also has its own menu).
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  useEffect(() => {
    // Global fallback: even where nothing opts into a custom menu, the
    // browser's own Back/Forward/Reload/Inspect menu should never appear —
    // that's the single fastest way to break the "this is a real app" illusion.
    // Editable fields are exempt: the OS's own Cut/Copy/Paste menu on a text
    // input is correct native behavior, not a web tell — nothing to replace.
    function suppressDefault(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isEditable =
        target.closest("input, textarea, [contenteditable='true']") !== null;
      if (!isEditable) e.preventDefault();
    }
    document.addEventListener("contextmenu", suppressDefault);
    return () => document.removeEventListener("contextmenu", suppressDefault);
  }, []);

  useEffect(() => {
    // Best-effort only — browsers vary in whether JS can intercept this at
    // all, so it isn't guaranteed to suppress the native find bar everywhere.
    function interceptFind(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", interceptFind);
    return () => window.removeEventListener("keydown", interceptFind);
  }, []);

  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  return (
    <ContextMenuCtx.Provider value={show}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-context-menu min-w-[180px] rounded-lg border border-border bg-surface-raised p-1 text-sm text-ink shadow-[var(--shadow-panel)]"
          style={{
            left: Math.min(menu.x, window.innerWidth - 200),
            top: Math.min(menu.y, window.innerHeight - menu.items.length * 32 - 16),
            animation: "context-menu-in 120ms ease-out",
          }}
        >
          {menu.items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setMenu(null);
              }}
              className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-ink active:opacity-80"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </ContextMenuCtx.Provider>
  );
}
