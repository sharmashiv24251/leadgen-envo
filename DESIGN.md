# Design

## Theme

Dark mode only — no light theme, no toggle. Background is near-black, never pure black (`#0a0a0a` range) so panels and borders can read against it.

## Color

OKLCH-based, restrained: grayscale everything, one accent used only for meaningful state.

| Token | Value (approx) | Use |
|---|---|---|
| `--bg` | `oklch(0.14 0 0)` (~#0a0a0a) | App background, with a very subtle radial vignette (slightly lighter center) — no gradient banding, no color tint |
| `--surface` | `oklch(0.18 0 0)` | Panel/card fill, top bar fill |
| `--surface-raised` | `oklch(0.21 0 0)` | Hover/selected row fill |
| `--border` | `oklch(1 0 0 / 10%)` | Default 1px hairline borders |
| `--border-strong` | `oklch(1 0 0 / 20%)` | Focus/selected borders |
| `--ink` | `oklch(0.96 0 0)` | Primary text |
| `--ink-muted` | `oklch(0.72 0 0)` | Secondary text (titles, metadata, muted metrics) |
| `--ink-faint` | `oklch(0.52 0 0)` | Tertiary text (least-meaningful stat: open rate) |
| `--accent` | `oklch(0.75 0.19 149)` (signal green) | Live status, healthy metrics, verified tags, active/selected state, primary buttons |
| `--accent-dim` | `oklch(0.75 0.19 149 / 12%)` | Accent background tints (selected row, success chip fill) |

Signal green chosen over amber: green reads as "live / healthy / go" without an implied warning connotation, and pairs cleanly with a single reserved neutral-amber for "pending" states (`DRAFTED` chip) so accent stays unambiguous.

No gradients except the background vignette. No drop shadows — depth comes from border + fill contrast only.

## Typography

- **Chrome / metadata / stats**: JetBrains Mono (via `next/font/google`), used for the top-bar wordmark, nav, labels, timestamps, stat numbers, status pills, chips.
- **Content**: Inter (via `next/font/google`), used for email subject lines, email body copy, prospect names, research-brief bullet text — anything a human reads as prose.
- Stat numbers: large, monospace, tabular-nums, tight tracking.
- Labels: small, monospace, uppercase, letter-spacing ~0.08em, muted color.

## Shape & Elevation

- Border radius: 2–4px everywhere (sharp, not rounded).
- Borders: 1px solid `--border` as the only structural device — no shadows.
- Selected/active state: `--border-strong` + `--accent-dim` fill, or a 2px accent left-edge indicator on list rows (not a decorative stripe — it's the literal selection indicator, functionally load-bearing).

## Layout

- Persistent top bar (fixed height, `--surface` fill, bottom hairline border) on every route: terminal-prompt wordmark (green dot + `thehrcompany` + blinking `_` cursor) left, live HH:MM:SS clock + `● LIVE` / `SYSTEM ACTIVE` pill right.
- Dashboard (`/`): stat grid (`auto-fit, minmax(200px, 1fr)`) → recent-activity list → CTA link. Centered max-width content column.
- Emails (`/emails`): fixed-height three-zone layout below top bar — 320px independently-scrollable sidebar, remaining width independently-scrollable detail panel (contact strip, then 40/60 research-brief / email split). No outer page scroll.

## Motion

- Blinking cursor: simple opacity step blink, ~1s, `steps()` timing for a terminal feel (not eased).
- Live clock: ticks every second, no animation on the digits themselves beyond the value change.
- Reduced motion: cursor and any pulse become static (opacity fixed, no blink); clock still updates its value (that's data, not decoration).

## Components

- **Stat panel**: 1px border, `--surface` fill, monospace uppercase label + large monospace value; accent color applied to the value only when it represents a healthy/positive read.
- **Status pill**: pill-shaped chip, dot + label, monospace, small.
- **Prospect row**: name (Inter, medium) + title/company (Inter, muted, smaller) + drafted date + subject preview + status chip; selected state = accent-dim fill + accent left-edge indicator.
- **Status chip**: `DRAFTED` (neutral/amber-gray), `SENT` (accent green) — color + text label together, never color alone.
- **Research brief bullet**: small marker/icon + bold-ish lead-in + supporting text, visually weighted equal to or heavier than a plain list item.
- **Primary button** (`SEND VIA GMAIL`): accent-filled, sharp corners, monospace label.
