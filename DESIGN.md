# Design

## Theme

**Day mode (light) and night mode (dark), both real themes — not a dark app with
a token pass.** Day mode is the default for every new session; the choice is then
remembered per-browser (`localStorage`, not `prefers-color-scheme` — the audience
skews older and non-technical, and already runs their OS in light mode, so we
don't infer from the system, we just start light and let the toggle override it).

This is a deliberate pivot from the old "dark mode only" identity: the primary
audience is non-technical, older users who read a system by leaning on color —
"oh, this row's yellow, that one's green" — not by parsing a monochrome
dashboard. Day mode is therefore not a desaturated inverse of night mode; it's
the primary, colorful, pastel-leaning experience, and night mode is a genuine
second theme that carries the same colorful identity into a dark canvas rather
than reverting to the old flat neutral-gray dark theme.

Both themes keep everything else this doc already describes unchanged:
same macOS-native structure, same Inter type, same pill/rounded-2xl shapes,
same motion language, same component behavior. Only the color tokens swap.

- **Toggle**: a single global sun/moon pill switch, always in the header's
  right-hand cluster (brand + breadcrumb stay left; clock, theme toggle, then
  sign-out on the right — see Layout). It's the same switch component as the
  auto-send toggle (`motion/react` spring knob, `stiffness: 500, damping: 30`),
  so flipping day/night feels like the same native control language as every
  other toggle in the product, not a bolted-on settings switch.
- **Transition**: the toggle's own knob springs; the rest of the UI swaps
  `data-theme` on `<html>` instantly, no cross-fade wash over the whole page.
  A native app doesn't animate a theme change across every pixel — only the
  control you touched moves.
- Blue stays the one true interactive/selection accent in both themes
  (systemBlue-family) — it is the brand's color, not something the light
  theme's pastel palette is allowed to dilute or replace. Green stays a
  separate, narrower "this is evidence of health" signal in both themes, same
  rule as before: one color means "you selected/triggered this," the other
  means "this is good news." Amber/red and the six dedicated Funnel stage
  hues (below) are additive category signal — they never stand in for blue or
  green.

## Color

OKLCH-based, in both themes. Day mode is **Full palette** on the color-strategy
scale (several named hues, each with one job) rather than the old single-accent
Restrained system — chosen because the target user reads color categorically,
not tonally.

Every semantic color (`accent`/`success`/`pending`/`danger`) is two independently-
chosen tokens, not one color at two opacities:

- **`--x`** — a saturated, dark-enough-for-text shade. Used directly as icon/
  link/border color, AND as the chip label sitting on top of `--x-dim`.
- **`--x-dim`** — a fully **opaque** bright pastel, chosen on its own merits, not
  derived by lowering `--x`'s alpha. An early version of day mode built `-dim` as
  a 12–18% alpha wash of the dark `-x` color; it read as dishwater-beige/muddy-
  brown everywhere except pure white, and turned outright grayish wherever a chip
  sat on a colored backdrop (e.g. the DRAFTED tag on the selected feed row's solid
  blue fill). An alpha tint of a dark color is not a pastel — it's a dark color
  diluted. A real pastel is its own bright, independently-tuned color.

Both tokens in a pair are verified ≥4.5:1 against each other, and `--x` is
additionally verified ≥4.5:1 against `--surface` (since `--x` is also used as
plain link/icon text, not just chip text). Night mode reuses the identical hue
set at adjusted lightness/chroma so a returning user recognizes "the yellow
one" in the dark exactly as they did in daylight.

### Day mode (default)

| Token | Value (approx) | Use |
|---|---|---|
| `--bg` | `oklch(0.96 0.012 250)` | App background — soft blue-white, subtle radial vignette (lighter center), never stark/cream white |
| `--surface` | `oklch(0.995 0.004 250)` | Panel/card fill, sidebar fill, header fill |
| `--surface-raised` | `oklch(0.925 0.016 250)` | Hover/selected fill, secondary "capsule" buttons |
| `--border` | `oklch(0.35 0.02 255 / 10%)` | Default 1px hairline borders |
| `--border-strong` | `oklch(0.35 0.02 255 / 20%)` | Focus/selected borders |
| `--ink` | `oklch(0.26 0.02 258)` | Primary text — deep navy-black, not pure black |
| `--ink-muted` | `oklch(0.48 0.018 258)` | Secondary text (labels, metadata) |
| `--ink-faint` | `oklch(0.63 0.014 258)` | Tertiary text (timestamps, least-important stat) |
| `--accent` | `oklch(0.483 0.19 258)` (systemBlue) | Links, focus rings, small accent tints, chip text on `--accent-dim` |
| `--accent-strong` | `oklch(0.42 0.17 259)` | Solid buttons, selected nav/row — shared verbatim with night, since solid-fill contrast doesn't depend on page background |
| `--accent-dim` | `oklch(0.9 0.09 258)` | Opaque pastel sky-blue chip/badge fill |
| `--accent-ink` | `oklch(0.99 0 0)` (white) | Text/icon on `--accent-strong` fills only |
| `--success` / `-dim` | `oklch(0.473 0.14 152)` / `oklch(0.9 0.1 152)` | Forest-green text on opaque mint-pastel fill. "Good news" only |
| `--pending` / `-dim` | `oklch(0.482 0.16 85)` / `oklch(0.9 0.11 85)` | Warm brown text on opaque golden-pastel fill. DRAFTED status, "needs attention" |
| `--danger` / `-dim` | `oklch(0.485 0.19 20)` / `oklch(0.9 0.09 20)` | Crimson text on opaque blush-pastel fill. Errors, bounced status |
| `--stage-leads/intro/followup/meeting/contract/lost` | `oklch(0.83–0.85, 0.11–0.16, {290,210,80,258,160,15})` | Funnel Kanban card fills — day-only, see night's own darker set below |
| `--stage-ink` | `oklch(0.26 0.02 258)` | On-card text for the Funnel stage fills above (same value as `--ink` here, but a distinct token — see night's value) |
| `--stage-scrim` / `-border` / `-hover` | `oklch(1 0 0 / 45%)` / `oklch(0 0 0 / 12%)` / `oklch(1 0 0 / 65%)` | Frosted-white "glass tag" scrim for chips/buttons sitting on a stage card |
| `--shadow-panel` | soft double shadow, cool-tinted, low-opacity | Elevated surfaces (login card, tooltips) |
| `--shadow-panel-sm` | soft single shadow, cool-tinted, low-opacity | Standard cards/panels |

### Night mode

| Token | Value (approx) | Use |
|---|---|---|
| `--bg` | `oklch(0.16 0.014 258)` | App background — deep navy-black (not the old flat neutral gray), subtle vignette |
| `--surface` | `oklch(0.21 0.016 258)` | Panel/card fill, sidebar fill, header fill |
| `--surface-raised` | `oklch(0.27 0.02 258)` | Hover/selected fill, secondary "capsule" buttons |
| `--border` | `oklch(1 0 0 / 8%)` | Default 1px hairline borders |
| `--border-strong` | `oklch(1 0 0 / 15%)` | Focus/selected borders |
| `--ink` | `oklch(0.94 0.004 258)` | Primary text |
| `--ink-muted` | `oklch(0.68 0.012 258)` | Secondary text |
| `--ink-faint` | `oklch(0.5 0.012 258)` | Tertiary text |
| `--accent` | `oklch(0.62 0.19 258)` (systemBlue) | Links, focus rings, small accent tints, chip text on `--accent-dim` |
| `--accent-strong` | `oklch(0.42 0.17 259)` | Solid buttons, selected nav/row — identical value to day mode |
| `--accent-dim` | `oklch(0.62 0.19 258 / 16%)` | Translucent accent tint — night's dim tokens stay alpha-based (they only ever sit on `--surface`, so the muddying problem day mode hit doesn't apply) |
| `--accent-ink` | `oklch(0.98 0 0)` (white) | Text/icon on `--accent-strong` fills only |
| `--success` / `-dim` | `oklch(0.78 0.14 152)` / `oklch(0.78 0.14 152 / 12%)` | Same role as day mode |
| `--pending` / `-dim` | `oklch(0.8 0.11 80)` / `oklch(0.8 0.11 80 / 12%)` | Same role as day mode |
| `--danger` / `-dim` | `oklch(0.7 0.16 25)` / `oklch(0.7 0.16 25 / 12%)` | Same role as day mode |
| `--stage-leads/intro/followup/meeting/contract/lost` | `oklch(0.52–0.56, 0.086–0.19, {290,215,75,258,165,25})` | Funnel Kanban card fills — kept from the original single-theme palette; deep, low-chroma jewel tones read fine with white text on a dark canvas, unlike day's pastel-fill/dark-text pairing |
| `--stage-ink` | `oklch(0.98 0 0)` (white) | On-card text — deliberately not `--ink`; `--ink`'s night value is a body-text "off-white" that under-shoots 4.5:1 against several stage fills, a notch dimmer than the near-pure white these saturated fills actually need |
| `--stage-scrim` / `-border` / `-hover` | `oklch(0 0 0 / 20%)` / `oklch(1 0 0 / 20%)` / `oklch(0 0 0 / 35%)` | Translucent dark scrim for chips/buttons sitting on a stage card — the mirror of day's light-on-light treatment |
| `--shadow-panel` | soft double shadow | Elevated surfaces (login card, tooltips) |
| `--shadow-panel-sm` | soft single shadow | Standard cards/panels |

No gradients except the background vignette, in either theme. Both themes use
soft shadows for depth — corner radius + fill contrast + shadow together create
elevation, not borders alone.

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
  clock + day/night toggle + sign-out on the right. Persists on every route —
  the theme toggle is global, not a per-page setting.
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
  (DELIVERED/SENDING), `danger` (BOUNCED). Fill is always the opaque `-dim`
  pastel, label text is always the matching dark/saturated `-x` shade — the
  pastel-fill + confident-text-of-the-same-hue pairing is the chip identity,
  not a plain gray label on a colored background (see Color for why `-dim`
  has to be its own opaque color rather than an alpha tint of the text color).
- **Funnel stage card**: the Kanban card itself is a full solid-fill background,
  one dedicated `--stage-*` color per stage (deliberately separate from the
  four semantic tokens above — six stages need six distinguishable hues, not a
  reuse of success/pending/danger/accent). Day mode uses light pastel fills
  with dark `--stage-ink` text; night mode keeps deeper, low-chroma jewel-tone
  fills with white `--stage-ink` text — the two are tuned independently, not
  shared, because a fill dark enough to need white text in night mode would
  read as dirty/muddy in a light, pastel-leaning day mode, and vice versa. A
  chip/button sitting on top of the card (the stage label pill, the notes
  button) uses the `--stage-scrim` "glass tag" treatment instead of the normal
  chip tones, since it's sitting on a full-color fill, not `--surface`.
- **Day/night toggle**: pill-shaped switch, sun/moon icon crossfade inside the
  knob, identical spring physics to the auto-send toggle. Lives in the header,
  see Layout. Reduced motion: the knob still moves (it's a real state change,
  not decoration) but without overshoot — a linear/eased slide instead of the
  spring.
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
