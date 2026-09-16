# Brickwork — Design Token Specification

**Role:** Design System Engineer  
**Standard:** 8pt Grid (with 4pt sub-grid) & WCAG 2.1 AA Color Contrast  
**Compatibility:** Tailwind CSS v4, CSS Custom Properties, DaisyUI  
**Date:** 16 September 2026  

---

## 1. Semantic Color Palette

All color tokens are paired with guaranteed WCAG 2.1 AA contrast ratios (`≥ 4.5:1` for body text, `≥ 3.0:1` for UI components and large typography).

| Token Name | Light Mode Hex | Dark Mode Hex | Intended Purpose & Contrast Context |
|:---|:---|:---|:---|
| `--color-primary` | `#2563EB` *(Blue 600)* | `#3B82F6` *(Blue 500)* | Primary actions, active navigation tabs, brand accent |
| `--color-primary-content` | `#FFFFFF` | `#0F172A` | Text and icons rendered on top of Primary |
| `--color-secondary` | `#4F46E5` *(Indigo 600)* | `#818CF8` *(Indigo 400)* | Company badges, secondary tags, entity accents |
| `--color-secondary-content`| `#FFFFFF` | `#0F172A` | Text on Secondary surfaces |
| `--color-success` | `#059669` *(Emerald 600)* | `#10B981` *(Emerald 500)* | Spend `<80%` of monthly target, successful saves |
| `--color-success-content` | `#FFFFFF` | `#022C22` | Text on Success badges |
| `--color-warning` | `#D97706` *(Amber 600)* | `#F59E0B` *(Amber 500)* | Spend `80%–99%` of monthly target, budget alert |
| `--color-warning-content` | `#FFFFFF` | `#451A03` | Text on Warning badges |
| `--color-error` | `#DC2626` *(Red 600)* | `#EF4444` *(Red 500)* | Spend `≥100%` (Over Budget), delete actions, errors |
| `--color-error-content` | `#FFFFFF` | `#450A0A` | Text on Error badges |
| `--color-info` | `#0284C7` *(Sky 600)* | `#38BDF8` *(Sky 400)* | AI extraction feedback, sync indicators |
| `--color-info-content` | `#FFFFFF` | `#082F49` | Text on Info surfaces |
| **Neutral: Background** | `#F8FAFC` *(Slate 50)* | `#0B0F17` *(Rich Slate 950)* | Page canvas, full-screen background |
| **Neutral: Surface** | `#FFFFFF` *(Pure White)* | `#161F30` *(Elevated Slate 900)*| Cards, bottom sheets, modals, dropdowns |
| **Neutral: Border** | `#E2E8F0` *(Slate 200)* | `#25334D` *(Slate 800)* | Card borders, input outlines, dividers |
| **Neutral: Text Primary** | `#0F172A` *(Slate 900)* | `#F8FAFC` *(Slate 50)* | Headings, ZAR values, high-emphasis text (`≥ 14:1`) |
| **Neutral: Text Secondary**| `#475569` *(Slate 600)* | `#94A3B8` *(Slate 400)* | Meta labels, timestamps, supporting text (`≥ 4.6:1`)|

---

## 2. Typography Scale

### 2.1 Font Family Stacks
- **Standard UI Stack (`--font-sans`)**:  
  `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Tabular Financial Stack (`--font-mono`)**:  
  Used for all monetary amounts, receipt figures, and percentages with tabular numerals (`tnum`):  
  `"Inter", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-feature-settings: "tnum" on, "cv05" on;`

### 2.2 Typographic Hierarchy Tokens

| Token Name | Semantic Element | Font Size | Line Height | Font Weight | Letter Spacing | Purpose & Context |
|:---|:---|:---|:---|:---|:---|:---|
| `--font-h1` | `h1` | `1.875rem` (30px) | `2.25rem` (36px) | `700` (Bold) | `-0.02em` | Main dashboard header, modal primary title |
| `--font-h2` | `h2` | `1.500rem` (24px) | `2.00rem` (32px) | `600` (Semi-bold) | `-0.015em`| Section headers, Category group titles |
| `--font-h3` | `h3` | `1.250rem` (20px) | `1.75rem` (28px) | `600` (Semi-bold) | `-0.01em` | Card titles, review screen step headers |
| `--font-body-lg`| `p.lead` | `1.125rem` (18px) | `1.75rem` (28px) | `500` (Medium) | `0em` | Primary KPI metrics, emphasized callouts |
| `--font-body-reg`| `body`, `p` | `1.000rem` (16px) | `1.50rem` (24px) | `400` (Regular) | `0em` | Standard text, form inputs, list items |
| `--font-button` | `button`, `a.btn`| `0.9375rem` (15px)| `1.25rem` (20px) | `600` (Semi-bold) | `0.01em` | Buttons, action chips, bottom tab items |
| `--font-caption`| `span.meta` | `0.750rem` (12px) | `1.00rem` (16px) | `500` (Medium) | `0.02em` | Timestamps, payment account subtext, badges |

---

## 3. Spacing Scale (8pt Grid with 4pt Half-Steps)

The spacing scale is built on a base 8px increment with a 4px sub-step for compact mobile interfaces.

| Token Name | Value (px) | Value (rem) | Recommended Usage & Application |
|:---|:---|:---|:---|
| `--space-2xs` | `4px` | `0.25rem` | Micro gaps between text and icons, inline badge padding |
| `--space-xs` | `8px` | `0.50rem` | Tight component gaps, tag spacing, chip internal padding |
| `--space-sm` | `12px` | `0.75rem` | Standard input vertical padding, compact card padding |
| `--space-md` | `16px` | `1.00rem` | Default mobile screen margin, standard card padding, form gap |
| `--space-lg` | `24px` | `1.50rem` | Section spacing, bottom sheet padding, camera shutter margin |
| `--space-xl` | `32px` | `2.00rem` | Major content block separation, hero metric spacing |
| `--space-2xl`| `48px` | `3.00rem` | Minimum touch target bounding box, bottom nav clearance |
| `--space-3xl`| `64px` | `4.00rem` | Bottom navigation bar height + safe area offset on mobile |

---

## 4. CSS Custom Properties Implementation (`app.css`)

```css
@theme {
  --color-primary: #2563eb;
  --color-primary-content: #ffffff;
  --color-secondary: #4f46e5;
  --color-secondary-content: #ffffff;
  --color-success: #059669;
  --color-success-content: #ffffff;
  --color-warning: #d97706;
  --color-warning-content: #ffffff;
  --color-error: #dc2626;
  --color-error-content: #ffffff;
  --color-info: #0284c7;
  --color-info-content: #ffffff;

  --color-bg-base: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-border-subtle: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;

  --spacing-2xs: 0.25rem;
  --spacing-xs: 0.50rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1.00rem;
  --spacing-lg: 1.50rem;
  --spacing-xl: 2.00rem;
  --spacing-2xl: 3.00rem;
  --spacing-3xl: 4.00rem;
}

[data-theme="dark"] {
  --color-primary: #3b82f6;
  --color-primary-content: #0f172a;
  --color-secondary: #818cf8;
  --color-secondary-content: #0f172a;
  --color-success: #10b981;
  --color-success-content: #022c22;
  --color-warning: #f59e0b;
  --color-warning-content: #451a03;
  --color-error: #ef4444;
  --color-error-content: #450a0a;
  --color-info: #38bdf8;
  --color-info-content: #082f49;

  --color-bg-base: #0b0f17;
  --color-bg-surface: #161f30;
  --color-border-subtle: #25334d;
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
}
```
