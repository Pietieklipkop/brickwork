# Brickwork — UI/UX Specification & Screen Workflows

**Version:** 0.1 (Draft)  
**Date:** 16 September 2026  
**Author:** Stefan van Dyk  
**Status:** DRAFT  

---

## 1. Design Principles & Mobile-First Layout

Brickwork is designed primarily for real-time receipt capture at the till point. The interface prioritizes:
1. **Frictionless Capture**: Zero extra taps to snap a receipt; the camera is one tap away from anywhere in the app.
2. **Thumb-Zone Ergonomics**: Essential controls (shutter button, bottom navigation, save confirmation) are anchored within bottom reach.
3. **Glanceable Tax & Budget Compliance**: Immediate color-coded progress bars show category capacity so users instantly know which card to swipe.
4. **ZAR Formatting**: All amounts clearly formatted in South African Rand (`R 1,250.00`).

---

## 2. Design System & Theming (Tailwind CSS + DaisyUI)

- **Palette**:
  - `Base`: Neutral dark slate (`#0F172A` / `#1E293B`) or crisp light slate (`#F8FAFC` / `#FFFFFF`)
  - `Primary`: Indigo / Deep Blue (`#4F46E5`)
  - `Accent`: Warm Amber (`#F59E0B`)
- **Category Progress Indicators**:
  - **Safe (<80% of budget)**: `badge-success` / Emerald (`#10B981`)
  - **Warning (80% – 99% of budget)**: `badge-warning` / Amber (`#F59E0B`)
  - **Over Budget (≥100% of budget)**: `badge-error` / Rose Crimson (`#EF4444`)
- **Typography**: Inter / system UI font stack with high legibility for receipt numbers.

---

## 3. Navigation Architecture

Fixed Bottom App Bar with persistent tabs:
```text
┌────────────────────────────────────────────────────────┐
│  [🏠 Home]    [🧾 History]    ( 📷 )    [🏢 Entities]  [⚙️ Settings] │
└────────────────────────────────────────────────────────┘
```
- **Center Action Button (📷)**: Elevated, high-contrast action button that triggers the camera capture workflow immediately.

---

## 4. Screen-by-Screen Specifications

### 4.1 Dashboard (`/`)

```text
┌──────────────────────────────────────────────┐
│ [ Brickwork ]              [🏢 Acme Ltd ▼]  │
│ Cycle: 15 Sep - 14 Oct 2026                 │
├──────────────────────────────────────────────┤
│ 📊 Month-to-Date Spend                       │
│    R 14,250.00 / R 22,000.00 (65%)           │
│    [████████████████░░░░░░░░]                │
│    Remaining: R 7,750.00                     │
├──────────────────────────────────────────────┤
│ Categories                                   │
│  • Groceries & Supplies                      │
│    R 4,800.00 / R 5,000.00 (96%) [Amber]     │
│    [███████████████████████░]                │
│  • Fuel & Travel                             │
│    R 2,100.00 / R 4,000.00 (52%) [Green]     │
│    [█████████████░░░░░░░░░░░]                │
│  • Client Entertainment                      │
│    R 3,200.00 / R 3,000.00 (106%) [Red]      │
│    [████████████████████████] OVER R 200     │
├──────────────────────────────────────────────┤
│ 📈 3-Month Spend Trend                       │
│    [Mini Bar / Sparkline Chart]              │
├──────────────────────────────────────────────┤
│ 🕒 Recent Transactions                       │
│  • Pick n Pay Hyper      R 452.80   14 Sep   │
│  • Shell Ultra City      R 950.00   12 Sep   │
│  • Builders Warehouse  R 1,820.00   10 Sep   │
└──────────────────────────────────────────────┘
```

- **Company Switcher**: Prominent top dropdown allowing instant switching between Personal and any registered company.
- **Cycle Indicator**: Explains the exact date window being aggregated according to user's `month_start_day`.
- **Category Progress Bars**: Tap any category to jump into a filtered history list for that category.

---

### 4.2 Camera Capture & Pre-Save Review (`/capture`)

#### Step 1: Live Viewfinder
- Fullscreen camera stream via HTML5 `MediaDevices`.
- Alignment frame guide for till slip positioning.
- Shutter button with audio/haptic click feedback.
- Alternative file picker button ("Choose from gallery / files").

#### Step 2: AI Processing State (<2.0s)
- Translucent backdrop showing captured still.
- Pulse loader: *"Extracting vendor, amount and category via Cloudflare AI..."*

#### Step 3: Pre-Save Review Bottom Sheet
```text
┌──────────────────────────────────────────────┐
│  Review & Confirm Expense                    │
├──────────────────────────────────────────────┤
│  [ Receipt Thumbnail Preview ]  (Tap to zoom)│
│                                              │
│  Vendor Name*                                │
│  [ Checkers Hyper Stellenbosch             ] │
│                                              │
│  Total Amount (ZAR)*                         │
│  [ R 452.80                                ] │
│                                              │
│  Transaction Date*                           │
│  [ 2026-09-14                              ] │
│                                              │
│  Company Entity*                             │
│  [ Acme (Pty) Ltd                          ▼]│
│                                              │
│  Category (AI Suggested)*                    │
│  [ Groceries & Supplies                    ▼]│
│                                              │
│  Payment Account*                            │
│  [ FNB Business Cheque (Default)           ▼]│
│                                              │
│  (If Entity is Personal):                    │
│  [x] Reimbursable Expense                    │
│  Reimburse from Company:                     │
│  [ Apex Consulting (Pty) Ltd               ▼]│
│                                              │
│  [ ✅ Save Expense ]    [ ❌ Retake / Discard ]│
└──────────────────────────────────────────────┘
```
- Every field is editable before saving.
- Category defaults to the AI prediction but can be changed with one tap.
- Payment account automatically defaults to the selected company's default account.
- **Personal Reimbursable Toggle**: Only visible when active profile is Personal. Allows designating which business entity owes reimbursement for personal out-of-pocket expenses.
- Clicking **Save Expense** uploads image to Cloudflare R2 and commits the expense record to D1.

---

### 4.3 Expense History & Multi-Filter (`/expenses`)

- **Top Search**: Instant client-side search on vendor name.
- **Filter Bar**:
  - **Date Range**: Pill selector for `Current Cycle` (default) or `Custom Range` (from / to date pickers).
  - **Company**: Dropdown selector (All, Personal, Company A, Company B).
  - **Category**: Multi-select dropdown.
  - **Active Filter Counter**: Badge showing active filter count with quick "Reset".
- **Expense Card**:
  - Vendor name & transaction date.
  - Payment account name & Category badge.
  - **Reimbursable Badge**: If `is_reimbursable`, displays a prominent pill badge: `Reimbursable • [Company Name]` (with amber/emerald tint).
  - ZAR amount in bold.
  - Receipt thumbnail badge (tap to view full image in modal).
  - Quick action menu: Edit & Delete.

---

### 4.4 Entity & Category Management (`/manage`)

- **Main Member Authorization**: Only users with `role: 'main_member'` have access to create and modify companies.
- **Company List**:
  - Personal profile (pinned, cannot be deleted).
  - User's registered companies.
  - Button: `+ Add Company`.
- **Category Targets Configuration**:
  - List of categories under selected company.
  - Input field for monthly target in ZAR (`R`).
  - Target updates apply immediately to current cycle dashboards.
- **Payment Accounts**:
  - Manage accounts (e.g. "FNB Credit Card", "Nedbank Cheque", "Cash").
  - Radio button to designate company default.

---

### 4.5 User Settings & Company Collaboration (`/settings`)

- **User Profile**: Name, email, role badge (`Main Member`).
- **Month Cycle Start Day**: Numerical selector constrained between `1` and `28` (with preview explanation, e.g., *"Your month cycle runs from the 15th to the 14th of each month"*).
- **Default Company**: Dropdown to set which company loads automatically on login/dashboard.
- **Company Collaboration & Members**:
  - For company owners:
    - Add collaborator by email.
    - Permission toggle: *"Allow member to manage categories & spend targets"*.
    - Collaborator list displaying member name, email, permissions badge, and `Remove` action button.
  - For invited members:
    - Member list is view-only.
    - Category & spend target modification is restricted unless the owner enabled the category management permission toggle. If restricted, a clear banner indicates: *"View-only: Category management permission not granted by company owner."*
- **Password Reset**: Option to trigger a password reset email to registered address.
- **Sign Out**: Clears session cookie and redirects to `/auth/login`.

---

### 4.6 Authentication Flows (`/auth/*`)

- `/auth/register`: Public registration for Main Member (Name, Email, Password, Month Cycle Start Day). Auto-seeds personal company and defaults upon submission.
  - Form input placeholders must strictly use anonymized dummy data:
    - **Full Name**: `"John Doe"`
    - **Email address**: `"john.doe@example.com"`
    - **Password**: `"At least 8 characters"`
- `/auth/login`: Email & Password credentials.
  - **Email address**: `"name@company.co.za"`
  - **Password**: `"••••••••"`
- `/auth/forgot-password`: Email submission form triggering Cloudflare Email Send.
  - **Email address**: `"name@company.co.za"`
- `/auth/reset-password?token=...`: New password form validated against cryptographic token expiry.
