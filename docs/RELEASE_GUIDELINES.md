# Brickwork — Feature Release & DevOps Guidelines

**Document Status:** Approved & Active  
**Version:** 1.0.0  
**Effective Date:** 2026-09-17  
**Owner:** Senior DevOps Manager / Architecture Team  
**Governing Standard:** [AGENTS.md](../AGENTS.md) | [ENTERPRISE_SYSTEM_SPECIFICATION.md](./ENTERPRISE_SYSTEM_SPECIFICATION.md)

---

## 1. Executive Summary & Policy Overview

This document defines the mandatory engineering and DevOps policy for releasing new features, enhancements, and bug fixes to the **Brickwork** platform. It provides an auditable, repeatable, and low-risk deployment lifecycle spanning specification, branch isolation, automated quality gates, user deployment authorization, Cloudflare edge delivery, and manual upstream merge governance.

### Core Release Mandates

1. **Specification Before Code (Spec-First):** No feature or fix may be coded without first formalizing or updating specifications in the `docs/` directory and obtaining user alignment.
2. **Branch Isolation:** Direct development commits to the `main` branch are strictly prohibited for feature releases. All work must occur on a release-prefixed branch (e.g., `feat/v1.1-...`).
3. **Quality Gate Verification:** No branch may be deployed until all static analysis, type checks, unit tests, end-to-end tests, and build steps pass with 0 errors.
4. **Explicit User Deployment Request Gate:** The agent must **never** trigger a production deployment automatically. Deployment to Cloudflare occurs **only** after the user explicitly commands it.
5. **Feature Branch Push Before Deploy:** When deployment is requested, all changes must be committed with a conventional commit message and pushed to the remote GitHub feature branch before Cloudflare deployment.
6. **User Manual Merge Authority:** The user retains sole authority to merge the remote feature branch into `main` via GitHub. The agent must never force-push or merge into `main` during feature release cycles.
7. **Continuous Release Log Maintenance:** Every release (starting from initial Release v1.0) must be recorded in the [Release Log & Changelog](#6-release-log--changelog) in this document.

---

## 2. End-to-End Release Lifecycle

The release process follows seven sequential, interdependent phases:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          BRICKWORK FEATURE RELEASE PIPELINE                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [ Phase 1: Specification ] ───► Update relevant docs/ files; confirm user approval   │
│               │                                                                        │
│  [ Phase 2: Branch Creation ] ─► Create isolated git branch: feat/vX.Y-<name>          │
│               │                                                                        │
│  [ Phase 3: Development & ] ───► Code in Svelte 5 / Run quality gates:                 │
│         Quality Gates            pnpm check + pnpm test:unit + e2e + pnpm build        │
│               │                                                                        │
│  [ Phase 4: User Approval ] ───► Notify user work is complete; AWAIT DEPLOY REQUEST    │
│               │                                                                        │
│  [ Phase 5: Commit & Push ] ───► Conventional commit + git push origin <feature-branch>│
│               │                                                                        │
│  [ Phase 6: Edge Deploy ] ─────► npx wrangler deploy to Cloudflare Workers edge        │
│               │                                                                        │
│  [ Phase 7: Manual Merge ] ────► User reviews & manually merges branch into main on GH │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 1: Specification & Documentation First

When a new feature, improvement, or bug fix is requested:
1. **Analyze and Cross-Reference:** Compare the request against existing specifications in `docs/`:
   - [SPECIFICATION.md](./SPECIFICATION.md) (User stories, business logic, acceptance criteria)
   - [ARCHITECTURE.md](./ARCHITECTURE.md) (Edge bindings, runtime, infrastructure)
   - [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) (D1 schema, tables, indices, migrations)
   - [UI_UX_SPEC.md](./UI_UX_SPEC.md) (Screens, interactions, forms, bottom sheets)
   - [DESIGN_TOKENS.md](./DESIGN_TOKENS.md) (Colors, spacing, typography)
   - [COMPONENT_SPECS.md](./COMPONENT_SPECS.md) (Svelte component contracts)
   - [API_AND_WORKFLOWS.md](./API_AND_WORKFLOWS.md) (Server endpoints, actions, payloads)
   - [TEST_PLAN.md](./TEST_PLAN.md) (Unit and E2E coverage requirements)
2. **Draft Spec Updates:** Write or update the formal specification in the impacted document(s).
3. **Seek User Sign-Off:** If architectural or UI adjustments deviate from established patterns, outline the changes and request explicit user confirmation before touching code.

---

### Phase 2: Feature Branch Creation

Once specifications are confirmed:
1. Ensure the local workspace is based on latest `origin/main`:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create and check out a dedicated release feature branch following the naming convention:
   ```bash
   # For new features in Release v1.1
   git checkout -b feat/v1.1-<feature-slug>

   # For bug fixes in Release v1.1
   git checkout -b fix/v1.1-<issue-slug>
   ```

#### Branch Naming Standard

| Type | Pattern | Example |
| :--- | :--- | :--- |
| **Feature** | `feat/v<Major>.<Minor>-<kebab-case-description>` | `feat/v1.1-recurring-expenses` |
| **Bug Fix** | `fix/v<Major>.<Minor>-<kebab-case-description>` | `fix/v1.1-tax-rate-rounding` |
| **Refactor** | `refactor/v<Major>.<Minor>-<kebab-case-description>` | `refactor/v1.1-ocr-pipeline-stream` |
| **Documentation** | `docs/v<Major>.<Minor>-<kebab-case-description>` | `docs/v1.1-api-reference-update` |

---

### Phase 3: Development & Quality Gate Verification

During development, all changes must strictly adhere to the updated specifications and architectural non-negotiables (Svelte 5 Runes, Integer ZAR Cents, SAST timezone, private R2 assets).

Before signaling completion, the code must satisfy all 4 mandatory quality gates:

```bash
# 1. Static Type Checking & Svelte Verification
pnpm check

# 2. Financial Math & SAST Cycle Unit Testing
pnpm test:unit --run

# 3. Playwright End-to-End Test Suite (Headless)
npx playwright test

# 4. Production Cloudflare Workers Bundle Build
pnpm build
```

> [!IMPORTANT]  
> All 4 quality gates must exit with code `0`. Any lint warning, TypeScript failure, unit regression, or bundle size violation must be remediated before proceeding.

---

### Phase 4: User Deployment Request Gate (Strict Hold)

Once quality gates pass:
1. The agent reports implementation completion and test results to the user.
2. **Strict Gate:** The agent **MUST STOP** and await the user's explicit instruction to deploy (e.g., *"Deploy to Cloudflare"*, *"Push and deploy release v1.1"*).
3. The agent must **NOT** push to remote or deploy without this explicit authorization.

---

### Phase 5: Commit & Remote Branch Push

Upon receiving the user's deployment request:
1. Stage all relevant code and documentation changes:
   ```bash
   git add docs/ src/
   ```
2. Commit the changes using the Conventional Commits format with release version context:
   ```bash
   git commit -m "feat(scope): concise description of changes [v1.1]"
   ```
3. Push the feature branch to GitHub:
   ```bash
   git push -u origin feat/v1.1-<feature-slug>
   ```

---

### Phase 6: Cloudflare Edge Deployment

Immediately after the feature branch is pushed to GitHub:
1. Run production deployment via Wrangler:
   ```bash
   npx wrangler deploy
   ```
2. Confirm the Cloudflare Workers edge deployment finishes successfully.
3. Validate edge endpoints and service health at:  
   `https://brickwork.stefanvandyk3.workers.dev`
4. Report the live deployment confirmation, feature branch link, and verification summary to the user.

---

### Phase 7: Manual User Merge into Main

1. The user visits GitHub (`https://github.com/Pietieklipkop/brickwork`) to inspect the newly pushed branch and create a Pull Request or perform a manual merge into `main`.
2. The agent updates the [Release Log & Changelog](#6-release-log--changelog) to reflect the completed deployment status.

---

## 3. Production Environment & Edge Bindings Reference

Deployments target the following production configuration:

| Resource | Value / Identifier | Notes |
| :--- | :--- | :--- |
| **Worker Service** | `brickwork` | SvelteKit Cloudflare Workers runtime |
| **Cloudflare Account** | `bdd114ffa4f8ffaaf8b1c9bb4ee1bc85` | Primary tenant account |
| **Production URL** | `https://brickwork.stefanvandyk3.workers.dev` | Edge CDN endpoint |
| **D1 Database Binding** | `DB` (`brickwork-db`) | UUID: `e45e4c35-4001-4892-a31c-1a21d73acf54` |
| **R2 Bucket Binding** | `RECEIPTS_BUCKET` (`brickwork-receipts`) | Private asset store with 5-year SARS retention |
| **Workers AI Binding** | `AI` (`@cf/meta/llama-3.2-11b-vision-instruct`) | Vision OCR extraction model |
| **Compatibility Date** | `2024-09-23` | Node.js compatibility enabled |

---

## 4. Release Pre-Flight & Post-Flight Checklist

Before and after every release, verify each item:

### Pre-Flight Checklist (Lead Developer Responsibility)
- [x] Requirements aligned and specifications updated in `docs/`.
- [x] Release branch created and checked out (`feat/v1.4-multiple-payment-cards-per-entity`).
- [x] Code implemented using Svelte 5 runes and integer ZAR cents math.
- [x] `pnpm check` passes (0 errors, 0 warnings).
- [x] `pnpm test:unit --run` passes (all 65 unit & component tests green).
- [x] `npx playwright test` passes (all 17 E2E suites green).
- [x] `pnpm build` creates production bundle in `.svelte-kit/cloudflare/_worker.js`.
- [x] Awaiting explicit user deploy request (Holding at Phase 4 Gate).

### Post-Flight Checklist (DevOps & User Responsibility)
- [x] Changes committed with descriptive conventional commit.
- [x] Feature branch pushed to GitHub `origin <branch-name>`.
- [x] `npx wrangler deploy` executed successfully.
- [x] Live edge URL verified: `https://brickwork.stefanvandyk3.workers.dev`.
- [x] Release log in `docs/RELEASE_GUIDELINES.md` updated with commit hash and timestamp.
- [ ] User notified to perform manual merge into `main` on GitHub.

---

## 5. Rollback & Disaster Recovery Protocol

In the event that an edge deployment exhibits critical regressions:
1. **Instant Cloudflare Rollback:** Use Wrangler to immediately rollback to the previous active deployment:
   ```bash
   npx wrangler rollback
   ```
2. **Database Integrity Check:** Verify D1 migrations have not left orphaned or partially transformed tables. D1 backups/snapshots can be restored via Wrangler if required.
3. **Hotfix Branch Creation:** Branch from the last known good commit on `main`:
   ```bash
   git checkout -b fix/vX.Y-hotfix-<issue> main
   ```
4. Follow standard quality gates and redeploy upon user instruction.

---

## 6. Release Log & Changelog

This log is the permanent record of all production releases for the Brickwork platform.

### Release Summary Table

| Version | Release Date | Branch / Commit | Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| **v1.0.0** | 2026-09-16 | `main` ([`eb0dffd`](https://github.com/Pietieklipkop/brickwork/commit/eb0dffd)) | **Released** | Initial production release: Full Edge PWA (AC-01 - AC-14), D1 SQLite ORM, R2 receipts, Workers AI OCR, Svelte 5 Runes. |
| **v1.1.0** | 2026-09-17 | [`182be1c`](https://github.com/Pietieklipkop/brickwork/commit/182be1c) (`fix/v1.1-anonymize-registration-placeholders`) | **Deployed (Pending Merge)** | Fix: Anonymize registration form placeholders (John Doe, john.doe@example.com). |
| **v1.2.0** | 2026-09-17 | [`7f7090e`](https://github.com/Pietieklipkop/brickwork/commit/7f7090e) (`feat/v1.2-company-members-and-reimbursements`) | **Deployed (Pending Merge)** | Feature: Company collaboration (members & granular RBAC) & Personal reimbursable expense tracking. |
| **v1.3.0** | 2026-09-18 | [`0fc80fb`](https://github.com/Pietieklipkop/brickwork/commit/0fc80fb) (`feat/v1.3-dashboard-charts-date-filter-upload`) | **Deployed (Pending Merge)** | Feature: Dashboard date range filtering (AC-17), visual budget Donut/Pie charts (AC-18), and dedicated digital/email receipt file upload (AC-19). |
| **v1.4.0** | 2026-09-20 | [`345c4e0`](https://github.com/Pietieklipkop/brickwork/commit/345c4e0) (`feat/v1.4-multiple-payment-cards-per-entity`) | **Deployed (Pending Merge)** | Feature: Multiple payment cards/accounts management per entity for Personal and Business profiles (AC-20). |
| **v1.5.0** | 2026-09-21 | [`2580cc8`](https://github.com/Pietieklipkop/brickwork/commit/2580cc8) (`feat/v1.5-receipt-ocr-filters-and-auto-crop`) | **Deployed (Pending Merge)** | Feature: Receipt OCR Preprocessing, Reticle Auto-Crop, Dual-Stream Storage & AI Prompt Optimization (AC-21). |

---

### Detailed Release Notes

#### Version 1.0.0 — 2026-09-16 (Initial Production Release)
- **Deployment Status:** Live at `https://brickwork.stefanvandyk3.workers.dev`
- **Git Commit:** `eb0dffd`
- **Lead Engineer / Author:** Antigravity AI & Stefan van Dyk
- **Scope & Highlights:**
  - **Full Edge PWA Architecture:** SvelteKit 2 running natively on Cloudflare Workers with `@sveltejs/adapter-cloudflare`.
  - **D1 Database with Drizzle ORM:** Schema definitions, relations, indices, and migrations for `users`, `sessions`, `accounts`, `verifications`, `entities`, `budget_cycles`, `categories`, and `expenses`.
  - **Secure Authentication (Better Auth):** Email/password credentials, password hashing, session cookies, and multi-tenant user scoping.
  - **Private R2 Receipt Ingestion:** Direct streaming upload to Cloudflare R2 bucket `brickwork-receipts` with UUID asset isolation and deletion cascade.
  - **Cloudflare Workers AI OCR:** On-the-fly receipt vision extraction using `@cf/meta/llama-3.2-11b-vision-instruct` extracting merchant, total, date, and suggested category.
  - **Financial Math & SAST Cycle Math:** Strictly integer ZAR cents math, canonical SAST (UTC+2) monthly cycle boundary calculations.
  - **Mobile-First UI/UX:** DaisyUI 5 custom theme, bottom-sheet review modal, 48px touch targets, full offline-ready PWA service worker and manifest.
  - **Quality Gates:** 100% passing Vitest unit tests, Playwright E2E suites verifying all 14 core Acceptance Criteria (AC-01 through AC-14).

---

#### Version 1.1.0 — 2026-09-17 (Feature & Fix Release)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `0b06d804-1d32-4a5b-a147-9af172118627`)
- **Target Branch:** `fix/v1.1-anonymize-registration-placeholders` (Commit: `182be1c`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Anonymize Registration Placeholders:** Replaced personal developer name and email address in `/register` view input placeholders with neutral mock identifiers (`"John Doe"` and `"john.doe@example.com"`).
  - **Automated Regression Guard:** Added Playwright E2E test verifying registration placeholder attributes.

---

#### Version 1.2.0 — 2026-09-17 (Feature Release: Company Collaboration & Reimbursements)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `5af4fb23-906a-42c2-9f71-f33fb7c751d0`)
- **Target Branch:** `feat/v1.2-company-members-and-reimbursements` (Commit: `7f7090e`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Company Member Collaboration (AC-15):** Enable adding registered users by email to any company, allowing them to switch entities, view all company expenses, and log receipts/expenses.
  - **Granular Category Management Toggle:** When adding/managing members, owner can toggle whether the member can create/edit/delete categories and monthly spend targets. Non-permitted members view categories in read-only mode.
  - **Personal Reimbursable Expense Tracking (AC-16):** Context-aware toggle in `/capture` and `PreSaveBottomSheet` when in Personal profile to flag expenses as reimbursable and associate them with a designated business company.
  - **Ledger Badging:** Display `Reimbursable • [Company Name]` badges in `/expenses`.

---

#### Version 1.3.0 — 2026-09-18 (Feature Release: Dashboard Charts, Date Range Filter & Receipt Upload)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `f28c061e-d84e-4410-ab6d-8484b4d09c43`)
- **Target Branch:** `feat/v1.3-dashboard-charts-date-filter-upload` (Commit: `0fc80fb`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Dashboard Date Range Filter (AC-17):** Filter trigger on the Active Cycle card allowing custom from/to date filtering. When active, displays a warning indicator color and updates all dashboard metrics.
  - **Budget Utilization Donut/Pie Chart (AC-18):** Replaces 3 static metric blocks with an SVG Donut/Pie chart visualizing Spend vs Remaining Budget vs Monthly Target with high-density badges, saving screen real estate.
  - **Digital/Email Receipt File Upload (AC-19):** Dedicated file upload dropzone in `/capture` for uploading receipt screenshots and invoices without requiring a live camera feed.

---

#### Version 1.4.0 — 2026-09-20 (Feature Release: Multiple Payment Cards per Entity)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `378b8516-b171-4764-af00-d2b3a99917fb`)
- **Target Branch:** `feat/v1.4-multiple-payment-cards-per-entity` (Commit: `345c4e0`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Multiple Payment Cards per Entity (AC-20):** Allows users to add, rename, set default, and delete multiple payment cards/accounts for both Personal profiles and Business entities.
  - **Settings UI Management:** New payment card management section in `/settings` scoped dynamically to the currently active entity (Personal or Business).
  - **Seamless Capture Integration:** In `/capture`, the pre-save bottom sheet dynamically lists all active entity cards with the designated default automatically pre-selected.
  - **Expense Ledger Visibility:** Expenses in `/expenses` display the payment card name used to settle the transaction.

---

#### Version 1.5.0 — 2026-09-21 (Feature Release: Receipt OCR Preprocessing & Reticle Auto-Crop)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `9fda95c5-48e7-45fd-94e5-217730c1292f`)
- **Target Branch:** `feat/v1.5-receipt-ocr-filters-and-auto-crop` (Commit: `2580cc8`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Reticle-Locked Viewfinder Auto-Crop (AC-21):** Viewfinder snapshots are mapped and cropped directly to the user-visible reticle alignment frame (accounting for CSS `object-cover` geometry), removing 75% background clutter and boosting optical text resolution by 3x–4x.
  - **Client-Side Document Filter Pipeline:** Lightweight Canvas 2D image processing (< 40ms) applying:
    1. *Grayscale Normalization*: Rec. 601 luma weighting stripping distracting background table colors.
    2. *Adaptive Shadow Division*: Local background illumination division completely removing phone and hand cast shadows across the slip.
    3. *Auto-Levels Contrast*: Stretches 2nd–98th percentile histogram values to `[0, 255]`, turning faint grey thermal print into deep black.
    4. *High-Frequency Unsharp Masking*: 3x3 Laplacian sharpening convolution kernel crispening dot-matrix characters and decimal points.
  - **Dual-Stream Storage Architecture:** Clean natural-color cropped photos are saved to Cloudflare R2 (`RECEIPTS_BUCKET`) for legal accounting records, while high-contrast enhanced images are routed to `/api/extract` for Workers AI parsing.
  - **Dynamic Workers AI Vision Prompting:** Injects company categories dynamically into the system prompt and adds explicit South African retail till slip disambiguation rules (`TOTAL DUE` vs `15% VAT`, `CHANGE`, `CASH TENDERED`, and discounts).
  - **Quality Gates:** 100% passing Vitest unit & component tests (75 tests), Playwright E2E suites (17 tests), and Svelte type-check (0 errors, 0 warnings).

---

#### Version 1.6.0 — 2026-09-26 (Feature Release: Payment Card Detection, Torch Control & Resilient Receipt OCR)
- **Deployment Status:** Ready for deployment to Cloudflare Workers
- **Target Branch:** `feat/v1.6-card-detection-torch-and-robust-ocr`
- **Scope & Highlights:**
  - **Payment Card Detection & Auto-Matching (AC-22):** The receipt OCR engine automatically extracts card digits (e.g. `0855`, `5851`, `1357`) and payment brand (`Visa Credit`, `Mastercard`), and auto-selects the matching company card in `PreSaveBottomSheet`. Displays an `Auto-matched from slip` badge.
  - **Optional Card Number Field in Settings:** Added an optional `cardNumber` input field when creating or editing payment cards in `/settings`. Strictly non-mandatory per user privacy preference.
  - **D1 Migration `0002_add_card_number_to_payment_account.sql`:** Applied to both local and remote Cloudflare D1 databases.
  - **Resilient Multi-Format Extraction Parser:** Fixed critical bug where Llama-3.2-Vision conversational Markdown output (e.g. `**Vendor Name:** Crave and Co`, `**Amount:** 35.00`) caused JSON parsing to fail and default to `Unknown Vendor` and `R0.00`. Added line-by-line fallback key-value extraction and token-based category matching.
  - **Car Ergonomics: Hardware Torch / Flashlight Toggle:** Added an in-viewfinder flashlight toggle button utilizing `MediaStreamTrack.applyConstraints({ advanced: [{ torch: true }] })` to provide illumination in dark car interiors.
  - **Car Ergonomics: Aspect Ratio Toggle:** Added in-viewfinder switcher between `Standard (3:4)` and `Long Slip (1:2.2)` to ensure long till slips (grocery & restaurant receipts) are captured without cutting off totals or card numbers.
  - **Motion Blur & Focus Quantification:** Implemented `calculateSharpnessScore` using Laplacian focus variance to measure edge sharpness.
  - **Optimized Workers AI Inference:** Configured `max_tokens: 512, temperature: 0.1` and explicit year/dot-matrix digit disambiguation prompting.
  - **Quality Gates:** 100% passing Vitest tests (80 unit & component tests), 100% passing Playwright E2E suites (17 tests), and Svelte type-check (0 errors, 0 warnings).

---

#### Version 1.7.0 — 2026-09-28 (Feature Release: AI Receipt OCR Accuracy Tracking & Audit Metrics)
- **Deployment Status:** Ready for deployment to Cloudflare Workers (awaiting user authorization)
- **Target Branch:** `feat/v1.6-card-detection-torch-and-robust-ocr`
- **Scope & Highlights:**
  - **AI OCR Accuracy Tracking Engine (AC-23):** Systematically detects and records whether users modify AI-extracted receipt fields prior to saving across the 4 key financial fields: Vendor Name, Amount, Date, and Category.
  - **Strict Classification Logic:**
    - `total_fail`: All 4 fields changed by user before persisting.
    - `partial_fail`: 1 to 3 fields changed by user.
    - `full_success`: 0 fields changed (all AI-suggested fields kept as-is).
  - **D1 Schema & Migration (`0003_add_ocr_accuracy_log.sql`):** Created and successfully applied to both local and remote Cloudflare D1 databases (`brickwork-db`). Tracks deltas, field counts, before-and-after values, and raw AI extraction snapshots.
  - **Capture Flow Integration:** Automatically computes delta comparisons on receipt submission in `/capture` and records log entries into `ocr_accuracy_log`.
  - **Settings UI Accuracy Dashboard & Audit Table:**
    - Summary KPI cards in `/settings`: Total Scans Analyzed, Full Match % (green), Partial Fail % (amber), Total Fail % (rose), and individual field accuracy rates (Vendor, Amount, Date, Category).
    - Status filter pills (`All`, `Success`, `Partial`, `Fail`) for targeted auditing.
    - Comprehensive Audit Breakdown table with formatted SAST timestamps, status badges, and side-by-side extracted vs final values (with red/amber strike-through on altered fields).
  - **Zero-Downtime Historical Backfill:** On load, safely backfills existing historical expenses with raw AI extraction data so the metrics table is immediately populated with real historical data.
  - **Quality Gates:** 100% passing Vitest unit & component tests (86/86 passing), 100% passing Playwright E2E suites (17/17 passing), and `svelte-check` (0 errors, 0 warnings). Production Cloudflare Workers bundle build validated.

---

#### Version 1.8.0 — 2026-10-05 (Feature Release: Dual-Stream Receipt Image Storage: Original & Enhanced OCR Scans)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `49c24172-d87b-4012-9d51-49f6f9fe44b2`)
- **Target Branch:** `feat/v1.8-save-filtered-ocr-receipt-image` (Commit: `b02141d`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Dual-Stream Receipt Storage (AC-24):** Upon receipt capture or file upload, both the natural-color cropped receipt photo and the preprocessed, shadow-removed, high-contrast OCR image are saved to Cloudflare R2 (`RECEIPTS_BUCKET`).
  - **D1 Schema & Migration (`0004_add_ocr_image_key_to_expense.sql`):** Added `ocr_image_key` column to `expense` table and applied migration to both local and remote Cloudflare D1 databases.
  - **Storage Architecture & Key Conventions:**
    - Original photo: `receipts/{companyId}/{year}/{month}/{expenseId}.webp` (stored in `receipt_image_key`)
    - Enhanced OCR scan: `receipts/{companyId}/{year}/{month}/{expenseId}-ocr.jpg` (stored in `ocr_image_key`)
  - **Atomic Deletion:** Deleting an expense automatically removes both the original and filtered OCR images from R2 storage.
  - **Expenses Ledger & Interactive Image Viewer:**
    - Dedicated interactive pill buttons in `/expenses` (`[ Original ]` and `[ OCR Scan ]`) and an eye preview button allow users to immediately view either image variant or open side-by-side.
    - Enhanced image preview modal features a 3-way toggle (`[ Original ]`, `[ Filtered OCR ]`, `[ Side-by-Side ]`).
    - Side-by-side comparison view renders a dual-column layout with synchronized preview and full-resolution links, letting users directly contrast the original photo against the preprocessed OCR scan sent to Workers AI.
  - **Quality Gates:** 100% passing Vitest unit & component tests (86/86 passing across 11 test suites), 100% passing Playwright E2E suites (17/17 passing), and `svelte-check` (0 errors, 0 warnings). Production Cloudflare Workers build verified.

---

#### Version 1.9.0 — 2026-10-07 (Feature Release: Real-Time Document Detection, 4-Point Homography Perspective Dewarping & Auto-Capture)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `9df2bd7e-13b0-4b5d-b9a8-0802f2683d3f`)
- **Target Branch:** `feat/v1.9-document-scanner-and-perspective-dewarp` (Commit: `e7e57c3`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **Real-Time Quadrilateral Document Detection (AC-25):** Viewfinder runs a lightweight, frame-throttled edge and contour detector on downscaled video frames, computing paper boundaries via Otsu binarization and convex polygon approximation.
  - **Dynamic Viewfinder Boundary Overlay:** Renders an animated SVG quadrilateral boundary overlay with glowing corner nodes that tracks the physical receipt in the camera feed.
  - **Projective Homography Perspective Dewarping:** 4-point projective homography transform (Heckbert inverse quad mapping with bilinear interpolation) unwarps trapezoidal/angled receipt captures into flat, top-down rectangular scans before filter enhancement and storage.
  - **Stability Auto-Capture & Manual Override:** Auto-snaps receipt photo when the 4 corners remain stationary and motion blur is low, with manual shutter button and corner fallback.
  - **Interactive Corner Fine-Tuning UI:** Allows users to adjust the 4 corner points with touch-friendly magnifying loupes if manual crop refinement is desired.

---

#### Version 1.9.1 — 2026-10-08 (Enhancement Release: Resilient Hull Detection, Sweeping Laser HUD, PWA Auto-Reload)
- **Deployment Status:** Deployed to Cloudflare Workers (Version ID: `a29461f9-afec-422a-a8eb-c27966a176ca`)
- **Target Branch:** `feat/v1.9-document-scanner-and-perspective-dewarp` (Commit: `61799e1`)
- **Merge Status:** Branch pushed to GitHub, awaiting manual user merge into `main`.
- **Scope & Highlights:**
  - **PWA Stale Cache Auto-Update (`controllerchange`):** Automatically reloads the application when a new Service Worker takes over an existing installation (`hadPreviousController`), ensuring mobile users immediately receive newly deployed scanner code without manual cache clearing. Guarded against initial installation and automated test runners (`navigator.webdriver`).
  - **Combinatorial Convex Hull Maximal-Area Quad Detection (`findMaxAreaQuadFromHull`):** Replaces rigid RDP 4-vertex polygon approximation with combinatorial maximal-area quad selection from convex hull points, reliably detecting crumpled, folded, or curved retail receipts even when fingers or edges break simple polygon approximations.
  - **Multi-Threshold Adaptive Binarization:** Multi-pass Otsu threshold search (`[otsu, otsu - 20, otsu + 20]`) allowing document detection across dim car cabins, shadows, and reflective glare.
  - **Sweeping Laser Scanning Beam & Live HUD:** Viewfinder features an animated emerald laser beam scanning across the frame, active `🔍 Scanning for receipt...` indicator transitioning to `🟢 Document Locked` with animated stability progress bar, `v1.9 AI Scanner` header badge, and `⚡ Auto-Snap` toggle button.
  - **Perspective Dewarping Badge:** Pre-save review bottom sheet indicates `📐 Perspective Dewarped` alongside OCR confidence.
  - **Quality Gates:** 100% passing Vitest unit & component tests (103/103 tests across 12 test suites), 100% passing Playwright E2E tests (17/17 tests), and `svelte-check` (0 errors, 0 warnings). Production Cloudflare Workers build verified.
