# Brickwork — Quality Assurance & Test Plan

**Version:** 0.1 (Draft)  
**Date:** 16 September 2026  
**Author:** Stefan van Dyk  
**Status:** DRAFT  

---

## 1. Testing Strategy Overview

Quality assurance for Brickwork spans two automated tiers:
1. **Unit & Integration Tests (Vitest)**: Fast, deterministic tests verifying pure financial calculations, billing cycle date math (SAST), currency transformations, and schema validations.
2. **End-to-End Tests (Playwright)**: Full browser automation tests validating user flows, camera capture simulation, D1 mutations, R2 storage verification, and role-based access control.

---

## 2. Acceptance Criteria Traceability Matrix

| AC Ref | Feature | Acceptance Criteria | Test Type | Test Suite |
|:---|:---|:---|:---|:---|
| **AC-01** | Receipt Capture | Camera capture & AI extraction of vendor, amount, date & category | E2E / Integration | `receipt-capture.spec.ts` |
| **AC-02** | Pre-Save Review | Pre-save screen displays extracted fields; records persist ONLY after Save | E2E | `receipt-capture.spec.ts` |
| **AC-03** | Image Storage | Receipt image is stored in Cloudflare R2 and linked to expense record | E2E / Unit | `receipt-capture.spec.ts` |
| **AC-04** | Edit & Delete | Expense can be edited & deleted; deletion removes image from R2 | E2E | `expense-management.spec.ts` |
| **AC-05** | Company Management | Main Member can create, edit, and delete companies; Members restricted | E2E | `company-rbac.spec.ts` |
| **AC-06** | Category & Targets | Categories with monthly ZAR targets; reset on user-defined start day | Unit / E2E | `billing-cycle.test.ts`, `company.spec.ts` |
| **AC-07** | Dashboard | Displays MTD spend vs target with color-coded progress bars | E2E / Unit | `dashboard.spec.ts`, `progress.test.ts` |
| **AC-08** | Company Selector | Company switcher works; default company loads on login | E2E | `dashboard.spec.ts` |
| **AC-09** | Filters | Combinable filters: date range, vendor, category, company | E2E | `expense-filters.spec.ts` |
| **AC-10** | Authentication | Main Member self-registration, login, role enforcement | E2E | `auth.spec.ts` |
| **AC-11** | Password Reset | Reset link sent via Email Send; 1-hour expiration enforced | Unit / E2E | `auth-reset.spec.ts` |
| **AC-12** | Performance | Interactions and routes respond within 2 seconds | E2E Performance | `perf.spec.ts` |
| **AC-13** | PWA | Installable on Android Chrome; mobile viewport ergonomics | E2E / Audit | `pwa-audit.spec.ts` |
| **AC-14** | Edge Uptime | Cloudflare edge deployment verification | CI/CD Smoke | `deploy-smoke.spec.ts` |

---

## 3. Unit Test Specifications (Vitest)

### 3.1 Billing Cycle Calculations (`src/lib/utils/billing-cycle.test.ts`)
- `should compute correct cycle when start day is 1st of month`
- `should compute correct cycle when start day is mid-month (e.g. 15th)`
- `should handle leap years and February boundary when start day is 28th`
- `should handle year transition (December 15 to January 14)`
- `should strictly use SAST (UTC+2) regardless of local test runner timezone`

### 3.2 Currency & Amount Conversions (`src/lib/utils/currency.test.ts`)
- `should format integer cents into ZAR string: 45280 -> "R 452.80"`
- `should format integer thousands with commas: 1250000 -> "R 12,500.00"`
- `should parse user input string "R 452.80" or "452.80" into integer cents 45280`
- `should reject negative amounts or malformed strings`

### 3.3 Target Progress & Status Thresholds (`src/lib/utils/progress.test.ts`)
- `should assign SAFE status (green) when spend is 79% of target`
- `should assign WARNING status (amber) when spend is 80% to 99% of target`
- `should assign OVER_BUDGET status (red) when spend is >= 100% of target`
- `should handle 0 target edge-case gracefully`

---

## 4. End-to-End Test Specifications (Playwright)

### 4.1 Receipt Capture Flow (`tests/receipt-capture.spec.ts`)
1. **Mock Camera**: Provide simulated video stream with mock till slip fixture.
2. **Mock Workers AI**: Verify endpoint receives image, triggers AI worker, and surfaces `{ vendor_name, amount, transaction_date, suggested_category }`.
3. **Verify Pre-Save**: Check that no record exists in D1 prior to clicking "Save".
4. **Edit Extracted Field**: Modify vendor name to "Checkers Stellenbosch" and change amount.
5. **Commit**: Click "Save Expense" -> verify redirect to dashboard, verify expense in D1, verify object in mocked/test R2 bucket.

### 4.2 Expense Management & R2 Deletion (`tests/expense-management.spec.ts`)
1. Create an expense with an attached receipt.
2. Verify image loads via `/api/receipts/[id]` with `Cache-Control` header.
3. Click "Delete Expense" and confirm.
4. Verify record is deleted from D1.
5. Verify `/api/receipts/[id]` returns 404 and R2 object is removed.

### 4.3 Multi-Filter History View (`tests/expense-filters.spec.ts`)
1. Seed 10 transactions across 2 companies, 3 categories, and varying dates.
2. Filter by Company A: verify only Company A items show.
3. Add Category filter "Fuel": verify only Fuel items in Company A show.
4. Set custom date range: verify count updates accurately.
5. Click "Clear All": verify resets back to Current Month Cycle default.
