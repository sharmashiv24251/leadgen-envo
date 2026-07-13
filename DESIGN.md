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

- Persistent **left sidebar** (`lg:` and up only; hidden on mobile), `--surface`
  fill: brand name + a green "System active" pulse at top, then real app
  navigation (Command Center, Outreach Feed) below — solid blue pill for the
  active item.
- **Header bar** to the right of the sidebar (not full browser width): a small
  breadcrumb (`Brand / Section`) on the left, live clock + sign-out on the
  right. Repeats on every route; gives the app a sense of place the way a
  native app's title bar / breadcrumb does.
- Dashboard (`/`): stat grid (`auto-fit, minmax(200px, 1fr)`) → recent-activity
  list → CTA link. Runs edge-to-edge in the content pane (no centered
  max-width column — that read as a marketing webpage, not app chrome).
- Emails (`/emails`): fixed-height three-zone layout below the header — inset,
  rounded prospect rows in an independently-scrollable sidebar, remaining width
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
  dividers); selected state = solid `bg-accent` fill with white text at
  descending opacity for hierarchy (name full white, subtext ~75%, subject
  ~60%).
- **Research brief bullet**: numbered marker in an accent-tinted pill circle +
  supporting text, weighted equal to or heavier than a plain list item.
- **Primary button**: pill-shaped, solid `--accent` (blue) fill, white text —
  reserved for the one true primary action per screen (Run outreach, Save,
  Send Now).
- **Secondary button**: pill-shaped, `--surface-raised` fill, `--border`
  outline, muted text — matches the neutral gray capsule buttons macOS itself
  uses for non-primary actions (Cancel, Edit, Sign out).
