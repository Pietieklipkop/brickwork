# Brickwork — Critical Component Specifications

**Role:** Senior Product Designer  
**Scope:** Core Mobile-First Touch Components  
**Target:** Svelte 5 + Tailwind CSS v4 + DaisyUI  
**Date:** 16 September 2026  

---

## 1. Component 1: `PrimaryActionButton` ("Save Expense" & Shutter Trigger)

The primary action component anchors critical user commitments (capturing a slip, confirming pre-save reviews, saving targets).

```text
┌────────────────────────────────────────────────────────┐
│  [📷 Save Expense]                                     │
└────────────────────────────────────────────────────────┘
```

### 1.1 Visual Anatomy
- **Height**: Fixed `48px` (`--space-2xl`) fulfilling the WCAG touch target boundary.
- **Padding**: Horizontal `24px` (`--space-lg`), Vertical `12px` (`--space-sm`).
- **Border**: `1px solid transparent` (reserves border pixel to prevent focus shift).
- **Border Radius**: `8px` (`rounded-lg`).
- **Shadow**: `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` (`shadow-sm`).
- **Icon Placement**:
  - Leading Icon: `20 × 20px`, `8px` right margin (`--space-xs`) from label.
  - Trailing Icon: `20 × 20px`, `8px` left margin from label.
  - Spinner (Loading): Replaces leading icon; maintains identical button width.
- **Typography**: `--font-button` (`0.9375rem` / `15px`, Weight `600`, Letter spacing `+0.01em`).

### 1.2 Interactive States

| State | Light Mode | Dark Mode | Behavior / Feedback |
|:---|:---|:---|:---|
| **Default** | Bg `#2563EB`, Text `#FFFFFF`, Border `transparent` | Bg `#3B82F6`, Text `#0F172A`, Border `transparent` | Rest state with subtle shadow |
| **Hover** | Bg `#1D4ED8`, Text `#FFFFFF`, Shadow `shadow-md` | Bg `#60A5FA`, Text `#0F172A`, Shadow `shadow-md` | Pointer device proximity |
| **Focus** | Outline `2px solid #2563EB`, Offset `2px` | Outline `2px solid #60A5FA`, Offset `2px` | Keyboard / accessibility focus |
| **Active** | Bg `#1E40AF`, Scale `0.98` | Bg `#2563EB`, Scale `0.98` | Tactile spring press feedback |
| **Disabled**| Bg `#E2E8F0`, Text `#94A3B8`, Cursor `not-allowed` | Bg `#1E293B`, Text `#475569`, Cursor `not-allowed` | Form invalid or submit in progress |
| **Error** | Bg `#DC2626`, Text `#FFFFFF` | Bg `#EF4444`, Text `#FFFFFF` | Submission failed / retry state |

### 1.3 Responsive Behavior
- **Mobile (< 640px)**: Full width (`w-full`) anchored at the bottom of bottom sheets and review dialogs.
- **Desktop (≥ 640px)**: Auto width (`w-auto`), min-width `140px`, right-aligned inside modal footers.

---

## 2. Component 2: `CurrencyInputField` (Financial Amount Input)

The financial input field designed for rapid ZAR amount entry and AI extraction verification.

```text
┌────────────────────────────────────────────────────────┐
│  Total Amount (ZAR)                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  R   452.80                                 (×)  │  │
│  └──────────────────────────────────────────────────┘  │
│  Extracted from receipt with 98% confidence            │
└────────────────────────────────────────────────────────┘
```

### 2.1 Visual Anatomy
- **Height**: `52px` to provide generous mobile tap accuracy.
- **Padding**: Left `44px` (reserving room for prefix), Right `40px` (for clear button), Top/Bottom `14px`.
- **Border**: `1.5px solid` `--color-border-subtle` (`#E2E8F0` light / `#25334D` dark).
- **Border Radius**: `8px` (`rounded-lg`).
- **Currency Affix (`R`)**:
  - Position: Left `14px`, vertically centered.
  - Typography: `1.125rem` (18px), Weight `700`, Color: `--color-text-secondary`.
- **Clear Button (`×`)**:
  - Position: Right `12px`, circular hit target `24 × 24px`.
- **Input Spec**: `type="text"`, `inputmode="decimal"`, `pattern="[0-9]*[.,]?[0-9]*"`, `autocomplete="off"`.
- **Typography**: `--font-mono`, `1.25rem` (20px), Weight `700`, Tabular numbers (`tnum`).

### 2.2 Interactive States

| State | Light Mode | Dark Mode | Visual Indicator |
|:---|:---|:---|:---|
| **Default** | Bg `#FFFFFF`, Text `#0F172A`, Border `#E2E8F0` | Bg `#161F30`, Text `#F8FAFC`, Border `#25334D` | Subtle interior shadow |
| **Hover** | Border `#CBD5E1` | Border `#334155` | Border contrast increases |
| **Focus** | Border `#2563EB`, Ring `0 0 0 3px rgba(37,99,235,0.15)` | Border `#3B82F6`, Ring `0 0 0 3px rgba(59,130,246,0.25)`| Glow ring; native cursor |
| **Active** | Same as Focus | Same as Focus | Instant numeric keypad |
| **Disabled**| Bg `#F1F5F9`, Text `#94A3B8`, Border `#E2E8F0` | Bg `#0F172A`, Text `#475569`, Border `#1E293B` | Non-editable state |
| **Error** | Border `#DC2626`, Ring `0 0 0 3px rgba(220,38,38,0.15)` | Border `#EF4444`, Ring `0 0 0 3px rgba(239,68,68,0.25)` | Red helper text: "Enter valid amount" |

### 2.3 Responsive Behavior
- **Mobile (< 640px)**: `w-full`. Font remains `1.25rem` (20px) to strictly prevent Android/iOS mobile browser auto-zooming.
- **Desktop (≥ 640px)**: Integrates into multi-column forms (`col-span-1` in 2-column grid).

---

## 3. Component 3: `CategoryBudgetCard` (Dashboard Data Card)

The core data visualization card displaying category spend against monthly targets with three-tier status encoding.

```text
┌────────────────────────────────────────────────────────┐
│  Groceries & Supplies                     [ 92% Amber ]│
│                                                        │
│  R 4,800.00                   / R 5,000.00             │
│  [████████████████████████████░░░]                     │
│                                                        │
│  Remaining: R 200.00                            ( → )  │
└────────────────────────────────────────────────────────┘
```

### 3.1 Visual Anatomy
- **Container**:
  - Padding: `16px` (`--space-md`) on all four sides.
  - Border: `1px solid` `--color-border-subtle` (`#E2E8F0` light / `#25334D` dark).
  - Border Radius: `12px` (`rounded-xl`).
  - Shadow: `0 1px 3px 0 rgba(0,0,0,0.08)` (`shadow-sm`).
  - Background: `--color-bg-surface` (`#FFFFFF` light / `#161F30` dark).
- **Internal Elements**:
  - **Header Row**: Category Name (`--font-h3`, weight `600`) + Status Pill Badge (`--font-caption`, weight `600`, radius `9999px`).
  - **Metrics Row**: Spend Amount (`--font-mono`, `1.25rem`, weight `700`) + Target Label (`text-sm`, Slate-500).
  - **Progress Bar Track**: Height `8px`, rounded `9999px`, background `#E2E8F0` (light) / `#1E293B` (dark).
  - **Progress Bar Fill**: Rounded `9999px`, width `clamp(0%, (spend/target)*100%, 100%)`.
  - **Footer Row**: Remaining amount text (`text-xs`, weight `500`) + Chevron-right icon (`16 × 16px`).

### 3.2 Interactive & Dynamic Status States

#### Interaction States
| State | Light Mode | Dark Mode | Behavior |
|:---|:---|:---|:---|
| **Default** | Bg `#FFFFFF`, Border `#E2E8F0` | Bg `#161F30`, Border `#25334D` | Clean card elevation |
| **Hover** | Border `#CBD5E1`, Shadow `shadow-md` | Border `#334155`, Shadow `shadow-md` | Elevation lift on pointer devices |
| **Focus** | Outline `2px solid #2563EB`, Offset `2px` | Outline `2px solid #3B82F6`, Offset `2px` | Full card keyboard navigation |
| **Active** | Scale `0.99`, Bg `#F8FAFC` | Scale `0.99`, Bg `#131B2A` | Tactile tap card depression |
| **Disabled**| Opacity `0.5`, Pointer-events `none` | Opacity `0.5`, Pointer-events `none` | Archived / zero-target state |

#### Dynamic Budget Threshold States
- **Safe State (<80% spend)**:
  - Fill: `--color-success` (`#059669` light / `#10B981` dark)
  - Badge: Emerald background with text `Safe (65%)`
  - Subtext: `Remaining: R 1,750.00`
- **Warning State (80%–99% spend)**:
  - Fill: `--color-warning` (`#D97706` light / `#F59E0B` dark)
  - Badge: Amber background with text `Warning (92%)`
  - Subtext: `Remaining: R 200.00`
- **Over-Budget State (≥100% spend)**:
  - Fill: `--color-error` (`#DC2626` light / `#EF4444` dark)
  - Badge: Red background with text `Over Budget`
  - Border: Highlighted with `#FCA5A5` (light) / `#7F1D1D` (dark)
  - Subtext: `Exceeded by R 250.00`

### 3.3 Responsive Behavior
- **Mobile (< 640px)**: Single column stack (`grid grid-cols-1 gap-3`). Full card tap triggers category transaction drill-down.
- **Tablet (640px – 1024px)**: 2-column grid (`grid grid-cols-2 gap-4`).
- **Desktop (≥ 1024px)**: 3-column grid (`grid grid-cols-3 gap-5`).
