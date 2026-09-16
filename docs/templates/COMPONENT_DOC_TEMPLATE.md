# [Component Name]

**Package / Module:** `src/lib/components/[path]`  
**Status:** `Draft` | `In Review` | `Stable` | `Deprecated`  
**Version:** `1.0.0`  
**Last Updated:** YYYY-MM-DD  
**Owner:** [Designer / Engineer Name]  

---

## 1. Description & Purpose

Provide a concise 2–3 sentence overview explaining what this component does, where it appears in the Brickwork user journey, and what problem it solves for the user.

> **Example:**  
> The `[Component Name]` allows users to [primary action] in high-pressure point-of-sale environments. It standardizes [interaction pattern] across mobile and desktop viewports, ensuring instant feedback and error recovery.

---

## 2. Visual Preview & Anatomy

```text
┌────────────────────────────────────────────────────────┐
│  [1] Leading Icon   [2] Label Text     [3] Trailing     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [4] Input Surface / Progress Track              │  │
│  └──────────────────────────────────────────────────┘  │
│  [5] Helper / Error Text                               │
└────────────────────────────────────────────────────────┘
```

### Component Parts
1. **[1] Leading Element**: (e.g., Currency symbol `R`, category badge icon, or status glyph).
2. **[2] Core Label**: (e.g., Category title or input prompt rendered in `--font-h3` / `--font-body-reg`).
3. **[3] Trailing Element**: (e.g., Clear button `×`, percentage badge, or disclosure chevron).
4. **[4] Interactive Canvas**: (e.g., Touch surface with border-radius `--radius-md` and elevation `--elevation-1`).
5. **[5] Meta / Status Region**: (e.g., Error feedback, remaining budget calculation, or timestamp).

---

## 3. Code Implementation & Props Specification (Svelte 5)

### TypeScript Props Interface
```typescript
/** Props for [ComponentName] */
export interface [ComponentName]Props {
  /** Primary label displayed to the user */
  label: string;
  /** Unique ID for accessibility pairing with label */
  id?: string;
  /** Current state or value */
  value?: string | number;
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Disabled state */
  disabled?: boolean;
  /** Optional loading state */
  loading?: boolean;
  /** Optional error message */
  errorMessage?: string;
  /** Optional click or change handler */
  onchange?: (value: any) => void;
}
```

### Svelte 5 Usage Example
```svelte
<script lang="ts">
  import [ComponentName] from '$lib/components/[ComponentName].svelte';

  let currentValue = $state('');
</script>

<[ComponentName]
  label="Monthly Budget"
  variant="primary"
  bind:value={currentValue}
  errorMessage=""
/>
```

---

## 4. Design Tokens Applied

| Token Category | Token Name | Token Value (Light / Dark) | Component Role |
|:---|:---|:---|:---|
| **Color** | `--color-primary` | `#2563EB` / `#3B82F6` | Active border, focus indicator |
| **Color** | `--color-bg-surface` | `#FFFFFF` / `#161F30` | Container background |
| **Color** | `--color-text-primary` | `#0F172A` / `#F8FAFC` | Primary text label |
| **Color** | `--color-border-subtle`| `#E2E8F0` / `#25334D` | Resting boundary border |
| **Typography** | `--font-body-reg` | `1.0rem (16px)` / `1.5rem LH` | Standard interactive input text |
| **Typography** | `--font-caption` | `0.75rem (12px)` / `1.0rem LH` | Helper text, error message |
| **Spacing** | `--space-sm` | `12px (0.75rem)` | Internal vertical padding |
| **Spacing** | `--space-md` | `16px (1.00rem)` | Internal horizontal padding |
| **Elevation** | `--elevation-1` | `0 1px 3px 0 rgba(15,23,42,0.08)` | Resting card depth |

---

## 5. Interactive States

| State | Light Mode Specs | Dark Mode Specs | Interaction Feedback |
|:---|:---|:---|:---|
| **Default (Rest)** | Bg: `--color-bg-surface`<br>Border: `--color-border-subtle`<br>Text: `--color-text-primary` | Bg: `--color-bg-surface`<br>Border: `--color-border-subtle`<br>Text: `--color-text-primary` | Baseline appearance on page render |
| **Hover** | Border: `Slate-300`<br>Shadow: `--elevation-2` | Border: `Slate-700`<br>Shadow: `--elevation-2-dark` | Pointer proximity on desktop devices |
| **Focus-Visible** | Outline: `2px solid --color-primary`<br>Offset: `2px` | Outline: `2px solid --color-primary`<br>Offset: `2px` | Keyboard tab or tap navigation focus |
| **Active (Pressed)**| Scale: `0.98`<br>Bg: `Slate-100` | Scale: `0.98`<br>Bg: `Slate-800` | Tactile spring down-press feedback |
| **Disabled** | Opacity: `0.5`<br>Cursor: `not-allowed`<br>Pointer-events: `none` | Opacity: `0.5`<br>Cursor: `not-allowed`<br>Pointer-events: `none` | Form condition unmet; non-clickable |
| **Error / Invalid** | Border: `--color-error`<br>Ring: `3px rgba(220,38,38,0.15)` | Border: `--color-error`<br>Ring: `3px rgba(239,68,68,0.25)` | Triggers inline error message below |

---

## 6. UX Guidelines (Do's & Don'ts)

| ✅ Do | ❌ Don't |
|:---|:---|
| **Do** anchor primary action buttons within the bottom 35% thumb zone for mobile screens. | **Don't** place critical submit or save buttons at the top of long scrolling forms. |
| **Do** always pair status colors (Red/Amber/Green) with visible text labels or icons. | **Don't** rely solely on color to communicate that a category is over budget. |
| **Do** display monetary figures in tabular format (`tnum`) with the currency prefix `R`. | **Don't** truncate monetary amounts with ellipsis (`R 1,2...`); wrap or scale text down. |
| **Do** provide immediate inline validation as soon as an invalid amount or character is typed. | **Don't** wait until the final server submission to notify the user of a missing field. |

---

## 7. Accessibility (A11y) & Assistive Technology

Conforms to **WCAG 2.1 Level AA** standards.

### 7.1 Touch Target & Viewport Ergonomics
- **Touch Target**: Must meet or exceed `48 × 48 CSS px` minimum hit area.
- **Font Scaling**: Base text is minimum `16px` (`1.0rem`) to avoid automated mobile browser zoom triggers.

### 7.2 Keyboard Navigation
- `Tab`: Navigates focus into the component.
- `Shift + Tab`: Navigates focus backward out of the component.
- `Space / Enter`: Activates the primary interactive trigger or confirms selection.
- `Escape`: Cancels or dismisses active flyouts, bottom sheets, or dropdowns.

### 7.3 ARIA & Screen Reader Spec
- `aria-label` or `aria-labelledby`: Must provide clear context (e.g. `aria-label="Monthly budget for Groceries"`).
- `aria-invalid="true"`: Dynamically applied when the component enters an error state.
- `aria-describedby`: References the ID of the helper/error text element.
- `aria-live="polite"`: Used for asynchronous updates (such as AI receipt extraction status).
