# Brickwork — Documentation & Specifications

This directory contains the formal architectural, database, UI/UX, API, and quality assurance specifications for **Brickwork**.

---

## Document Index

1. [**SPECIFICATION.md**](./SPECIFICATION.md)  
   The baseline Application Specification v0.2 by Stefan van Dyk detailing scope, business requirements, non-functional requirements, and acceptance criteria (AC-01 through AC-14).

2. [**DESIGN_PRINCIPLES.md**](./DESIGN_PRINCIPLES.md)  
   Core design pillars (Point-of-Purchase Velocity, Unambiguous Glanceability, Respectful Control), WCAG 2.1 AA accessibility commitment, and visual hierarchy guidelines.

3. [**DESIGN_TOKENS.md**](./DESIGN_TOKENS.md)  
   Comprehensive design tokens specification covering light/dark semantic color palette, typographic scale with tabular numerals, and the 8pt/4pt mobile spacing scale.

4. [**COMPONENT_SPECS.md**](./COMPONENT_SPECS.md)  
   Detailed anatomy, interactive states, and responsive specifications for the 3 critical components: `PrimaryActionButton`, `CurrencyInputField`, and `CategoryBudgetCard`.

5. [**LAYOUT_AND_ELEVATION.md**](./LAYOUT_AND_ELEVATION.md)  
   Responsive grid parameters across Mobile, Tablet, and Desktop, 4-tier elevation and box-shadow system, and spatial hierarchy rules.

6. [**templates/COMPONENT_DOC_TEMPLATE.md**](./templates/COMPONENT_DOC_TEMPLATE.md)  
   Standardized Markdown template for documenting any new component in the Brickwork design system (anatomy, states, Svelte 5 props, tokens, UX guidelines, WCAG 2.1 AA a11y).

7. [**ARCHITECTURE.md**](./ARCHITECTURE.md)  
   Cloudflare edge topology, SvelteKit Workers runtime, Cloudflare Workers AI pipeline (`@cf/meta/llama-3.2-11b-vision-instruct`), Cloudflare R2 bucket security & lifecycle, Cloudflare Email Send, and PWA configuration.

8. [**DATABASE_SCHEMA.md**](./DATABASE_SCHEMA.md)  
   Drizzle ORM entity definitions for Cloudflare D1 (SQLite), Better Auth schema, relations, index optimizations, integer ZAR cent conventions, and the SAST billing cycle calculation algorithm.

9. [**UI_UX_SPEC.md**](./UI_UX_SPEC.md)  
   Mobile-first screen specifications, thumb-zone ergonomics, DaisyUI theme, receipt camera viewfinder, pre-save review bottom sheet, dashboard progress bars, and expense filtering UX.

10. [**API_AND_WORKFLOWS.md**](./API_AND_WORKFLOWS.md)  
    SvelteKit form actions, REST endpoints, receipt image extraction and R2 streaming pipelines, error handling, and password reset email workflows.

11. [**TEST_PLAN.md**](./TEST_PLAN.md)  
    Quality assurance plan, Vitest unit test suites for cycle math & financial calculations, and Playwright end-to-end test suites mapped directly to AC-01 through AC-14.

12. [**ENTERPRISE_SYSTEM_SPECIFICATION.md**](./ENTERPRISE_SYSTEM_SPECIFICATION.md)  
    Enterprise System Architecture & Compliance Specification: statutory compliance (POPIA, GDPR, SARS s29, ISO 27001/25010, WCAG 2.1 AA), C4 context topology, Svelte 5 Runes lifecycle, 3-tier token pipeline, zero-trust R2/D1 security, and CI/CD quality gates.

13. [**RELEASE_GUIDELINES.md**](./RELEASE_GUIDELINES.md)  
    DevOps feature release and deployment guidelines: spec-first governance, release branch conventions, automated quality gates, explicit user deployment authorization, Cloudflare edge delivery, and release changelog.
