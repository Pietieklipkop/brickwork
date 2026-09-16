# Brickwork — Design System Principles & Guidelines

**Role:** Principal UX/UI Designer  
**Scope:** Brickwork Mobile-First PWA  
**Compliance Target:** WCAG 2.1 AA Standard  
**Date:** 16 September 2026  

---

## 1. Core Design Pillars

### I. Point-of-Purchase Velocity
*Capture must occur within seconds in high-pressure, one-handed environments like retail checkouts or fuel forecourts.* Every micro-interaction is engineered to eliminate friction, ensuring snapping a slip and verifying AI extraction feels faster than folding paper into a wallet.

### II. Unambiguous Glanceability
*A user must ascertain active company entity boundaries and remaining category capacity in under three seconds.* High-contrast typography, tabular monetary figures, and distinct threshold badges give users immediate decision confidence before they swipe a payment card.

### III. Respectful Control & Forgiveness
*AI assists the capture process, but the human user retains absolute ownership over their financial ledger.* The pre-save review flow treats AI predictions as non-destructive suggestions, providing generous tap targets and effortless inline corrections before anything commits to disk.

---

## 2. Accessibility Commitment Statement (WCAG 2.1 AA)

> **Brickwork is committed to delivering an inclusive, barrier-free financial management tool accessible to all users, conforming strictly to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.**
>
> We guarantee:
> - **Contrast & Glanceability**: A minimum contrast ratio of `4.5:1` for standard text and `3:0:1` for graphical indicators (progress bars, status gauges, and input borders), specifically optimized for outdoor and harsh retail lighting.
> - **Non-Color Reliance**: Spend status (Safe, Warning, Over Budget) is never communicated by color alone; it is always paired with explicit text badges, icons, or numerical capacity labels.
> - **Touch Ergonomics**: All interactive elements (shutter buttons, dropdowns, category chips, bottom navigation) satisfy or exceed the `48 × 48 CSS px` touch target standard with adequate spacing to eliminate mis-taps.
> - **Semantic Structure & Screen Readers**: Native form controls, ARIA live regions for AI extraction status updates, and semantic landmarks ensure full assistive technology operability across Android Chrome and mobile web runtimes.

---

## 3. Visual Hierarchy Guidelines

These design pillars directly dictate our spatial, typography, and color hierarchy:

### 3.1 Thumb-Zone Motor Priority (Action Hierarchy)
- **Primary Actions (Lower 35% of Screen)**: The shutter button, bottom navigation, and primary "Save Expense" CTAs are anchored strictly within the natural thumb sweep to enable true one-handed operation.
- **Secondary Modifiers (Middle 40%)**: Pre-save editable inputs, category selection chips, and payment account selectors live in scrollable bottom sheets that emerge upward into the thumb zone.
- **Passive Context (Top 25%)**: Read-only historical data, spend trend graphs, and navigation breadcrumbs occupy the upper screen region where eyes rest but fingers rarely need to reach.

### 3.2 Context-First Framing (Spatial Hierarchy)
- **Entity Anchor**: The active entity (e.g., *Acme (Pty) Ltd* vs. *Personal Profile*) is persistently anchored at the top-right header with distinct visual badge styling, preventing cross-entity misallocations before an expense is ever captured.
- **Cycle Bounding**: Category progress bars explicitly display the active cycle date range (e.g., `15 Sep – 14 Oct`) alongside remaining budget figures to eliminate ambiguity over when targets reset.

### 3.3 Three-Tier Typographic Scale (Information Density)
1. **Tier 1 — Monetary Figures (`text-2xl` to `text-3xl`, Tabular Bold)**:
   Total spend, remaining capacity, and receipt totals are the dominant visual elements on any screen, formatted consistently with South African Rand notation (`R 1,250.00`).
2. **Tier 2 — Structural Labels (`text-sm` to `text-base`, Semi-Bold)**:
   Category titles, vendor names, and company entities provide structured scanning anchors.
3. **Tier 3 — Audit & Meta Details (`text-xs`, Regular, Slate-400)**:
   Payment account labels, timestamps, and cycle subtexts provide secondary confirmation without cluttering glanceable metrics.

### 3.4 Multi-Sensory Status Encoding (Visual Hierarchy)
- **Progress Bars**:
  - `Safe (<80%)`: Emerald fill (`#10B981`) + percentage label + remaining balance.
  - `Warning (80–99%)`: Amber fill (`#F59E0B`) + warning icon + remaining balance.
  - `Over Budget (≥100%)`: Crimson fill (`#EF4444`) + alert icon + explicit overage amount (`OVER R 250.00`).
- This multi-layered encoding guarantees rapid recognition even when viewed through screen glare or by users with red-green color vision deficiency (protanopia/deuteranopia).
