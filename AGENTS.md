# AGENTS.md — Brickwork Engineering & Design Workflow Rules

You are working on **Brickwork**, a mobile-first Progressive Web Application (PWA) designed for real-time point-of-purchase expense tracking, multi-entity tax budgeting, and automated Cloudflare AI receipt extraction.

---

## 1. Governing Specifications (Living Sources of Truth)

Before proposing or executing any code, architecture, or design changes, you **MUST** read and cross-reference the relevant governing documents located in the [`docs/`](./docs/) directory:

| Document | File Path | Scope & Authority |
| :--- | :--- | :--- |
| **Enterprise Architecture & Compliance** | [docs/ENTERPRISE_SYSTEM_SPECIFICATION.md](./docs/ENTERPRISE_SYSTEM_SPECIFICATION.md) | **Primary Architecture Blueprint:** Statutory compliance (POPIA, GDPR, SARS s29, ISO 27001/25010), C4 topology, Svelte 5 Runes state model, token hierarchy, Zero Trust edge security, and CI/CD quality gates. |
| **Application Specification** | [docs/SPECIFICATION.md](./docs/SPECIFICATION.md) | **Product Scope & Acceptance Criteria:** Business rules, entity isolation, edge AI requirements, and AC-01 through AC-14. |
| **System Architecture** | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | **Edge Infrastructure:** Cloudflare Workers runtime, Workers AI (`@cf/meta/llama-3.2-11b-vision-instruct`), R2 bucket, and Email Send bindings. |
| **Database Schema** | [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | **Persistence Engine:** Drizzle ORM entity definitions for Cloudflare D1 (SQLite), Better Auth schema, relations, index optimizations, integer ZAR cent conventions, and SAST cycle calculation algorithm. |
| **Design Principles** | [docs/DESIGN_PRINCIPLES.md](./docs/DESIGN_PRINCIPLES.md) | **Core UX Pillars:** Point-of-Purchase Velocity, Unambiguous Glanceability, Respectful Control, WCAG 2.1 AA accessibility commitment, and visual hierarchy. |
| **Design Tokens** | [docs/DESIGN_TOKENS.md](./docs/DESIGN_TOKENS.md) | **Visual System Tokens:** Light/dark semantic color palette, tabular numeral typography scales, and 8pt/4pt mobile spacing scale. |
| **Component Specifications** | [docs/COMPONENT_SPECS.md](./docs/COMPONENT_SPECS.md) | **Component Contracts:** Detailed anatomy, interactive states, and responsive specifications for `PrimaryActionButton`, `CurrencyInputField`, and `CategoryBudgetCard`. |
| **Layout & Elevation** | [docs/LAYOUT_AND_ELEVATION.md](./docs/LAYOUT_AND_ELEVATION.md) | **Spatial Hierarchy:** Responsive viewport grids (Mobile, Tablet, Desktop) and 4-tier elevation shadow tokens. |
| **UI/UX Specification** | [docs/UI_UX_SPEC.md](./docs/UI_UX_SPEC.md) | **Screen Flows & Ergonomics:** Thumb-zone layout, DaisyUI theme, receipt viewfinder, pre-save review bottom sheet, and dashboard progress bars. |
| **API & Workflows** | [docs/API_AND_WORKFLOWS.md](./docs/API_AND_WORKFLOWS.md) | **Network & Endpoints:** SvelteKit form actions, REST endpoints, receipt image extraction, and R2 streaming pipelines. |
| **Test Plan** | [docs/TEST_PLAN.md](./docs/TEST_PLAN.md) | **Quality Assurance:** Vitest unit test suites for cycle math & financial calculations, and Playwright end-to-end test suites mapped directly to AC-01 through AC-14. |
| **Component Template** | [docs/templates/COMPONENT_DOC_TEMPLATE.md](./docs/templates/COMPONENT_DOC_TEMPLATE.md) | **Documentation Blueprint:** Required template for documenting any newly introduced UI component. |
| **Release & Deployment Guidelines** | [docs/RELEASE_GUIDELINES.md](./docs/RELEASE_GUIDELINES.md) | **DevOps & Release Policy:** Mandatory spec-first workflow, branch naming (`feat/vX.Y-...`), quality gates, explicit user deployment approval gate, Cloudflare deploy protocol, and release changelog. |

---

## 2. Mandatory Change Alignment & Approval Protocol

Every time a feature, modification, refactoring, or UI adjustment is requested, the agent **MUST** follow this strict protocol:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          AGENT CHANGE MANAGEMENT PROTOCOL                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. EVALUATE: Cross-reference requested change against all specifications in docs/      │
│ 2. DETECT: Identify any deviation, architectural discrepancy, or missing standard     │
│ 3. INFORM: If not aligned, immediately inform the user with exact conflict details     │
│ 4. SUGGEST: Propose the recommended specification amendment and design update          │
│ 5. SEEK APPROVAL: Explicitly await user sign-off BEFORE changing application design   │
│ 6. APPLY TO SPEC: Update relevant docs/ markdown files upon user approval             │
│ 7. IMPLEMENT CODE: Write production code in strict conformity with updated spec        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Protocol Rules:

1. **Continuous Spec-First Alignment Check:**
   - Before writing any code or modifying existing files, verify whether the change aligns with all standards in `docs/` (Architecture, Database Schema, Design Tokens, UX Specs, APIs, and Compliance).
2. **Mandatory User Advisory on Misalignment:**
   - If the change conflicts with existing standards, breaches performance SLAs, introduces non-tokenized colors/spacing, alters schema boundaries, or introduces unvetted design patterns:
     - **Do NOT proceed directly to implementation.**
     - **Inform the user immediately**, detailing the exact document and section where the conflict occurs.
     - **Suggest a clear, concrete change/solution** (e.g., how the spec can be updated or an alternative architectural approach that maintains compliance).
3. **Strict Gate: Seek Approval Before Application Design Changes:**
   - **You must seek explicit user approval before making any changes to the application design or specification.**
   - Once the user explicitly approves the proposed design/specification update, update the corresponding markdown document(s) in `docs/` first, and then execute the code implementation.

---

## 3. Core Architectural Non-Negotiables

When building or modifying any part of Brickwork, the following engineering rules are mandatory:

1. **Svelte 5 Runes Architecture:**
   - Legacy Svelte 3/4 stores (`writable`, `readable`, `derived`) and reactive declarations (`$:`) are strictly prohibited.
   - Use native Svelte 5 runes only: `$state()`, `$derived()`, `$derived.by()`, `$effect()`, and `$props()`.
2. **Integer ZAR Cent Financial Mathematics:**
   - Never use floating-point numbers for currency calculations.
   - All monetary values must be stored, manipulated, and transferred as **integer ZAR cents** ($100\text{ cents} = \text{R } 1.00$).
3. **Canonical SAST Timezone (UTC+2):**
   - All billing cycle boundaries, month-to-date rollover checks, and financial timestamps must be evaluated in **South African Standard Time (SAST)**.
4. **Touch Ergonomics & Accessibility (WCAG 2.1 AA):**
   - Minimum touch target: **$48 \times 48\text{ px}$** with at least **$8\text{ px}$** spacing.
   - Contrast ratio: minimum **4.5:1** for body text and **3:1** for large text/interactive borders.
   - Optical Character Recognition (OCR) status transitions must be announced via `aria-live="polite"`.
5. **Private R2 Media & Atomic Purge:**
   - The receipt bucket is private; images must never be exposed publicly.
   - Deleting an expense record must atomically delete both the D1 database row and the R2 image asset.
6. **Zero Arbitrary Tokens:**
   - Never hardcode arbitrary hex colors, shadows, or margins. Use the design tokens defined in [`docs/DESIGN_TOKENS.md`](./docs/DESIGN_TOKENS.md) and DaisyUI themes.

---

## 4. Mandatory Feature Release & Deployment Workflow

Every release of a new feature, improvement, or bug fix must strictly adhere to [`docs/RELEASE_GUIDELINES.md`](./docs/RELEASE_GUIDELINES.md):

1. **Specification First:** Update all relevant documentation files in `docs/` before writing code. Obtain explicit user confirmation.
2. **Branch Creation:** Create an isolated branch named `feat/v<Version>-<feature-slug>` or `fix/v<Version>-<issue-slug>` (e.g. `feat/v1.1-recurring-expenses`). Never push release feature work directly to `main`.
3. **Quality Gate Verification:** Run and pass all verification checks prior to signaling completion:
   - `pnpm check`
   - `pnpm test:unit --run`
   - `npx playwright test`
   - `pnpm build`
4. **User Deployment Request Gate (Strict Hold):** Report readiness and **await the user's explicit command** to deploy. Do NOT deploy without user authorization.
5. **Commit & Push Branch:** When deployment is requested:
   - Commit with a descriptive conventional commit message indicating the release version.
   - Push the feature branch to GitHub (`git push -u origin <branch-name>`).
6. **Cloudflare Deployment:** Deploy the build to Cloudflare Workers (`npx wrangler deploy`) and verify the live endpoint (`https://brickwork.stefanvandyk3.workers.dev`).
7. **Manual Merge Authority:** The user merges the branch into `main` manually on GitHub. The agent must never merge into `main` during feature release cycles.
8. **Release Log:** Update the Release Log in [`docs/RELEASE_GUIDELINES.md`](./docs/RELEASE_GUIDELINES.md) with the version, commit hash, date, and description.
