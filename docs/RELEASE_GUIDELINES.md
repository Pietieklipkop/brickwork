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
- [x] Release branch created and checked out (`feat/v1.3-dashboard-charts-date-filter-upload`).
- [x] Code implemented using Svelte 5 runes and integer ZAR cents math.
- [x] `pnpm check` passes (0 errors, 0 warnings).
- [x] `pnpm test:unit --run` passes (all 64 unit & component tests green).
- [x] `npx playwright test` passes (all 17 E2E suites green).
- [x] `pnpm build` creates production bundle in `.svelte-kit/cloudflare/_worker.js`.
- [x] Awaiting explicit user deploy request (Holding at Phase 4 Gate).

### Post-Flight Checklist (DevOps & User Responsibility)
- [x] Changes committed with descriptive conventional commit.
- [x] Feature branch pushed to GitHub `origin <branch-name>`.
- [x] Remote D1 migration executed (`0001_add_company_members_and_reimbursements.sql`).
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
| **v1.3.0** | 2026-09-18 | `feat/v1.3-dashboard-charts-date-filter-upload` | **In Specification** | Feature: Dashboard date range filtering (AC-17), visual budget Donut/Pie charts (AC-18), and dedicated digital/email receipt file upload (AC-19). |

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
- **Deployment Status:** In Specification / Development
- **Target Branch:** `feat/v1.3-dashboard-charts-date-filter-upload`
- **Scope & Highlights:**
  - **Dashboard Date Range Filter (AC-17):** Filter trigger on the Active Cycle card allowing custom from/to date filtering. When active, displays a warning indicator color and updates all dashboard metrics.
  - **Budget Utilization Donut/Pie Chart (AC-18):** Replaces 3 static metric blocks with an SVG Donut/Pie chart visualizing Spend vs Remaining Budget vs Monthly Target with high-density badges, saving screen real estate.
  - **Digital/Email Receipt File Upload (AC-19):** Dedicated file upload dropzone in `/capture` for uploading receipt screenshots and invoices without requiring a live camera feed.


