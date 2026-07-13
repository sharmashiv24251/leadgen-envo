# Design

## Theme

Dark mode only — no light theme, no toggle. Background is a dark neutral gray
(`oklch(0.18 0.004 260)`, ~#1c1c1e), never pure black — matched to macOS's own
dark-mode chrome so panels and surfaces read as native window/sidebar material
rather than a webpage on a black canvas.

## Color

OKLCH-based. Blue is the interactive/selection accent (systemBlue, matching macOS);
green is a separate, narrower "this is evidence of health" signal. They are
deliberately not the same color — one means "you selected/triggered this," the
other means "this is good news."

| Token | Value (approx) | Use |
|---|---|---|
| `--bg` | `oklch(0.18 0.004 260)` | App background, subtle radial vignette (lighter center), no color tint |
| `--surface` | `oklch(0.235 0.005 260)` | Panel/card fill, sidebar fill, header fill |
| `--surface-raised` | `oklch(0.29 0.006 260)` | Hover/selected fill, secondary "capsule" buttons |
| `--border` | `oklch(1 0 0 / 8%)` | Default 1px hairline borders |
| `--border-strong` | `oklch(1 0 0 / 15%)` | Focus/selected borders |
| `--ink` | `oklch(0.94 0 0)` | Primary text |
| `--ink-muted` | `oklch(0.68 0.004 260)` | Secondary text (labels, metadata) |
| `--ink-faint` | `oklch(0.5 0.004 260)` | Tertiary text (timestamps, least-important stat) |
| `--accent` | `oklch(0.62 0.19 258)` (systemBlue) | Primary buttons, links, focus rings, selected nav/row, toggle-on state |
| `--accent-dim` | `oklch(0.62 0.19 258 / 16%)` | Accent background tints (numbered markers, copy badges) |
| `--accent-ink` | `oklch(0.98 0 0)` (white) | Text/icon color on solid accent fills |
| `--success` | `oklch(0.78 0.14 152)` (signal green) | "Good news" only: live/system-active pulse, verified tags, RESPONDED status, reply-received panel, healthy KPI values |
| `--success-dim` | `oklch(0.78 0.14 152 / 12%)` | Success background tints |
| `--pending` | `oklch(0.8 0.11 80)` (amber) | DRAFTED status, "needs attention" states |
| `--pending-dim` | `oklch(0.8 0.11 80 / 12%)` | Pending background tints |
| `--danger` | `oklch(0.7 0.16 25)` (red) | Errors, bounced status |
| `--danger-dim` | `oklch(0.7 0.16 25 / 12%)` | Error background tints |
| `--shadow-panel` | soft double shadow | Elevated surfaces (login card, tooltips) |
| `--shadow-panel-sm` | soft single shadow | Standard cards/panels |

No gradients except the background vignette. Unlike the old terminal-chrome
system, this one *does* use soft shadows for depth (macOS itself does) — corner
radius + fill contrast + shadow together create elevation, not borders alone.

## Typography

- **Single family: Inter** (via `next/font/google`), used everywhere — chrome,
  labels, stats, and content alike. No monospace font anywhere in the product.
- Sentence case throughout. No uppercase-tracked labels, no letter-spacing tricks —
  that was the old terminal identity and has been fully retired.
- Numeric stats use `tabular-nums` for alignment, but are otherwise set in the
  same sans as everything else (weight/size carry emphasis, not a font swap).

## Shape & Elevation

- Border radius: `rounded-lg`/`rounded-xl` for inputs and small controls,
  `rounded-2xl` for cards/panels, fully pill-shaped (`rounded-full`) for every
  button, toggle, filter chip, and status chip.
- Depth: border + fill contrast **plus** a soft shadow (`--shadow-panel-sm` on
  standard cards, `--shadow-panel` on the most elevated surfaces like the login
  card and the selected sidebar nav item).
- Selected/active state: a **solid accent fill** (not a left-edge stripe) —
  selected sidebar nav item, selected prospect row, active status filter chip
  all use `bg-accent` + `text-accent-ink` (white), matching how macOS itself
  renders a selected list row or sidebar item.

## Layout

- **Header bar** spans the full window width, above everything else (matches
  how a real macOS app's toolbar sits above its sidebar, not beside it): brand
  name (links back to Command Center) + breadcrumb section on the left, live
  clock + sign-out on the right. Persists on every route.
- **Command Center (`/`) is a standalone intro screen** — no persistent
  sidebar here at all, full-width content: stat grid (`auto-fit,
  minmax(200px, 1fr)`) → recent-activity list → CTA link into the outreach
  feed. Runs edge-to-edge (no centered max-width column — that read as a
  marketing webpage, not app chrome).
- **The prospect list is the app's actual persistent shell**, scoped to
  `/emails*` routes — not a generic nav sidebar. Desktop always docks it
  beside the detail pane; mobile shows one pane at a time (list-only on the
  bare `/emails` route, detail-only on `/emails/[id]`, matching how a native
  mail client collapses on a small screen). Get back to Command Center via
  the brand name in the header, same as clicking a logo to go home.
- Emails detail view: fixed-height layout below the header — inset, rounded
  prospect rows in an independently-scrollable list, remaining width
  independently-scrollable detail panel (contact strip, then 40/60
  research-brief / email split). No outer page scroll.

## Motion

- Live clock: ticks every second, no animation on the digits beyond the value
  change.
- Pulse dots (system-active, run-in-progress): simple ping/opacity pulse.
- Reduced motion: pulses become static (opacity fixed, no ping); clock still
  updates its value (that's data, not decoration).

## Components

- **Stat panel**: rounded-2xl card, soft shadow, small colored squircle icon +
  sentence-case label, large semibold tabular-nums value. Icon/value color is
  `--success` only when the number is genuinely good news (leads found, reply
  rate); otherwise neutral ink.
- **Status pill / chip**: pill-shaped, color + text label together (never
  color alone) — `success` (RESPONDED/verified), `pending` (DRAFTED), `neutral`
  (DELIVERED/SENDING), `danger` (BOUNCED).
- **Prospect row**: name + title/company + subject preview + status chip,
  inset with rounded corners inside the list (not full-bleed with hairline
  dividers); selected state = solid `bg-accent-strong` fill with white text at
  descending opacity for hierarchy (name 100%, subtext 85%, subject 72% —
  tuned so every tier still clears WCAG AA 4.5:1 against the fill).
- **Research brief bullet**: numbered marker in an accent-tinted pill circle +
  supporting text, weighted equal to or heavier than a plain list item.
- **Primary button**: pill-shaped, solid `--accent-strong` fill, white text —
  reserved for the one true primary action per screen (Run outreach, Save,
  Send Now, Authenticate). Plain `--accent` is for links/focus rings/small
  accent tints only — it's not dark enough for white text at 4.5:1, which is
  why solid-fill buttons and the selected prospect row both use the `-strong`
  variant instead.
- **Secondary button**: pill-shaped, `--surface-raised` fill, `--border`
  outline, muted text — matches the neutral gray capsule buttons macOS itself
  uses for non-primary actions (Cancel, Edit, Sign out).

## Native App Feel

The product's core visual bet: it should be indistinguishable from a real
macOS app running full-screen in a browser with its chrome hidden — not "a
nice-looking webpage." That means removing every incidental signal that
reveals it's a browser tab, not just getting the colors/shapes right.

- **Cursor**: `a, button, [role="button"] { cursor: default }` globally.
  macOS never shows a hand/pointer cursor for its own controls — that's a web
  convention browsers apply to anchors by default. Buttons already default to
  an arrow in every engine; this only needed to correct links.
- **Text selection**: `body { user-select: none }` by default; `input`,
  `textarea`, `select` opt back into `user-select: text` globally, and
  specific real-content regions (prospect contact block, "Why this angle"
  bullets, email subject/body view mode, reply-received text) get an explicit
  `select-text` class. Chrome (nav, labels, list rows, buttons) stays
  non-selectable — a native app never lets you drag-select its own UI, only
  genuine content, the same way Mail.app's message list isn't selectable but
  its reading pane is.
- **`::selection`**: tied to `--accent-select` (a 32%-alpha accent tint), not
  each browser's own default selection blue.
- **Tooltips**: never the native `title=` attribute (triggers the browser/OS's
  own delayed system tooltip, styled nothing like the app). Always
  `components/Tooltip.tsx` — a small hover-triggered `--surface-raised` pill
  matching the rest of the chrome.
- **Right-click**: the browser's own context menu (Back/Forward/Reload/
  Inspect) is suppressed everywhere via `components/ContextMenu.tsx`'s global
  `contextmenu` listener — except inside editable fields (`input`, `textarea`,
  `[contenteditable]`), where the OS's native Cut/Copy/Paste menu is correct
  native behavior and is deliberately left alone. Specific content regions
  (copy badges, contact info, email subject/body, research bullets, replies)
  opt into a real custom menu via `useContextMenu()` instead of losing
  right-click entirely.
- **Press feedback**: every button and interactive row has an `active:`
  state (`scale-[0.97]`-ish, or `opacity` for plain text links) — native
  controls compress/darken instantly on mouse-down; `hover:` alone reads as
  "webpage with hover effects," not "app with buttons."
- **Spring motion**: the auto-send toggle's knob animates via `motion/react`
  spring physics (`stiffness: 500, damping: 30`), not a flat CSS `ease` —
  the small overshoot-then-settle is what makes a switch feel like a native
  control instead of a CSS transition.
- **Gesture/shortcut suppression**: `overscroll-behavior-x: none` on `body`
  stops Safari's two-finger swipe-back gesture (there's no horizontal
  navigation to lose); a best-effort `Cmd/Ctrl+F` intercept tries to stop the
  browser's native find bar, though this isn't reliable across every browser.
- **Deliberately left alone**: scrollbars (no custom CSS exists, so macOS's
  real native overlay scrollbar renders as-is) and trackpad rubber-band
  overscroll bounce (untouched, so it already behaves natively) — both were
  already correct and touching them would only risk making them worse.
