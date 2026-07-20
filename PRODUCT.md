# Product

## Register

product

## Users

Non-technical founders and decision-makers being pitched on a cold-outreach automation product, viewing this on a live sales call (screen-shared or in-person). They are not developers and will judge the product's credibility largely by how the demo *looks and feels* in the moment — not by reading documentation. The primary "user" during the sales call is the salesperson driving the demo; the primary "audience" is the founder watching.

## Product Purpose

A "command center" demo for a cold-outreach automation product, built for a specific client engagement ("thehrcompany"). It exists to make an outreach pipeline feel real, active, and impressive within minutes of opening the link: live-feeling metrics, a credible activity feed, and a per-prospect research + drafted-email view that proves genuine research and personalization happened. Success = the founder leaves the call believing this system is already running and worth paying for.

## Brand Personality

Native macOS app, not a webpage — calm, precise, quietly powerful. Three words:
**precise, alive, native.** The app borrows macOS's own chrome language
(persistent sidebar, breadcrumb header, systemBlue selection, pill buttons,
sentence-case labels, soft shadows) so it reads as installed software the
founder could imagine running every day, not a demo dressed up to look techy.

## Anti-references

- Generic SaaS-cream dashboard templates and hero-metric-with-gradient clichés — the product's own day-mode palette is deliberately colorful/pastel (see DESIGN.md), but that's a considered, branded color system, not the templated cream-and-gradient look this bullet rejects.
- Centered, marketing-page-style content columns inside app views — a real desktop app runs its panels edge-to-edge, it doesn't pad content like a landing page.
- Cluttered/dated enterprise CRM density (Salesforce/HubSpot-era table walls with no whitespace).
- The old terminal/monospace-chrome identity this product used to have — retired in favor of the native-macOS direction above; don't reintroduce uppercase-tracked mono labels or a single-accent-does-everything color system.

## Design Principles

- **Structure reads as an app, not a page.** Persistent left sidebar + breadcrumb header + edge-to-edge content panes are what make this feel like installed software rather than a website. Never collapse back to a single scrolling page with a top bar.
- **Blue selects, green means good news — never the same color.** `--accent` (systemBlue) marks anything interactive: primary buttons, links, selected rows/nav, focus. `--success` (green) is reserved for genuine positive signal: live/active status, verified data, a reply came in, a healthy metric. Conflating them would make the "evidence" colors read as decoration instead of fact.
- **Legibility and whitespace beat density.** This is watched on a call, not used daily at a desk. Prioritize a confident, breathable read over cramming in more detail.
- **Numbers are evidence, not decoration.** Every stat looks specific and real (non-round), because round numbers read as fake in a live sales context.
- **The research brief is the credibility payload.** The "why this angle" panel is what proves real personalization happened — give it real visual weight, never let it read as an afterthought next to the email.

## Accessibility & Inclusion

- Standard WCAG AA contrast targets in both day and night themes (body text ≥4.5:1, large/label text ≥3:1), including every pastel chip's fill/text pairing, not just the neutral background/ink combinations.
- Respect `prefers-reduced-motion` for the live clock tick and any status-pill pulse — provide a static/non-animated fallback.
- No functionality gated behind hover-only or color-only signals (status chips pair color with text/label, not color alone).
