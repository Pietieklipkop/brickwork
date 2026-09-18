# Brickwork — Application Specification

**Version:** 0.2 (Draft)  
**Date:** 16 September 2026  
**Author:** Stefan van Dyk  
**Status:** DRAFT  

---

## 1. Executive Summary

Brickwork is a mobile-first Progressive Web Application (PWA) designed to eliminate the
end-of-month scramble of reconciling business and personal expenses. Users capture receipts
in real time by photographing them at the point of purchase. The application uses Cloudflare
AI to automatically extract the vendor name, total amount, and assign a spend category —
making the capture process as frictionless as possible.

Brickwork supports multiple entities per account. Each user manages a personal expense
profile alongside one or more registered companies. Spending targets are set per category,
per company, and reset automatically at the start of each user-defined month cycle. This is
particularly valuable for tax compliance purposes, where businesses need to track spend
against recognised expense thresholds in real time. For example, a user can see at a glance
whether a company has remaining budget in a category before deciding which card to use at
the point of purchase.

The dashboard is company-selectable and displays month-to-date spend versus targets per
category, including visual progress indicators and a recent transactions list. Receipt images
are stored securely in Cloudflare R2 for record-keeping. All monetary values are in South
African Rand (ZAR). Success is measured by the speed and accuracy of receipt capture and
the volume of receipts processed per month.

---

## 2. Scope of Work

### 2.1 In Scope — MVP

- Receipt capture via device camera with AI-powered data extraction (vendor, amount, category)
- Pre-save review screen allowing the user to verify and correct extracted fields before confirming
- Edit and delete functionality for saved expense records
- Multi-company support — Main Member can create and manage multiple company entities
- Personal expense profile per user, separate from company entities
- Payment account management with user-defined default account per company
- Category management with user-defined monthly spend targets per category, per company
- User-defined month cycle start day (e.g. 15th of each month) configured in settings
- Automatic monthly target reset based on the user-defined cycle
- Dashboard displaying month-to-date spend vs targets with progress bar indicators
- Dashboard company selector with user-configurable default company
- Recent transactions list on the dashboard
- Spend trend view across previous months
- Expense history with filters: current month (default), custom date range, vendor, category, company
- Receipt image upload and storage in Cloudflare R2
- User authentication via Better Auth (username and password)
- Password reset flow via Cloudflare Email Send
- Main Member self-registration
- Role-based access control: Main Member and Member roles
- PWA support — installable on mobile devices, mobile-first responsive design

### 2.2 Explicitly Out of Scope — MVP

- Multi-user / member invite functionality (deferred to future version)
- Viewer role (deferred to future version)
- Push, email, or in-app notifications (deferred to future version)
- Data import or export (CSV, PDF, Excel)
- Integration with accounting platforms (e.g. Xero, QuickBooks)
- Integration with payment providers or banking APIs
- Native iOS or Android applications
- Safari (iOS) PWA camera support — Android Chrome only at MVP
- Multi-language or localisation support
- Multi-currency support — ZAR only at MVP
- Approval workflows between roles
- Granular per-user permission configuration
- REST or GraphQL API layer
- Real-time collaborative data updates
- Multi-timezone support — SAST (UTC+2) only at MVP

---

## 3. Technical Requirements

### 3.1 Receipt Capture & AI Extraction

- The application must allow the user to capture a receipt image using the device camera via the PWA.
- The captured image must be submitted to Cloudflare AI via a Cloudflare Worker for processing.
- Cloudflare AI must extract the following fields: vendor name, total amount, and transaction date.
- The AI must suggest a spend category based on the receipt content. The user may override this suggestion.
- A pre-save review screen must display all extracted fields and allow the user to edit any field before saving.
- A Save button must be explicitly clicked by the user to confirm and persist the expense record.
- The receipt image must be uploaded to Cloudflare R2 upon saving and the resulting URL stored against the expense record.
- AI extraction must complete and return results within the 2-second response target where network conditions allow.

### 3.2 Expense Management

- Each expense record must store: vendor name, total amount (ZAR), transaction date, category, company, payment account, and receipt image URL.
- Users must be able to edit any field of a saved expense record.
- Users must be able to delete a saved expense record. Deletion must also remove the associated image from Cloudflare R2.
- Expense records must be associated with a specific company entity or the user's personal profile.

### 3.3 Company & Category Management

- Main Members must be able to create, edit, and delete company entities.
- Each company must support multiple user-defined spend categories.
- Each category must have a configurable monthly spend target in ZAR.
- Targets must reset automatically at the start of each user-defined month cycle.
- The month cycle start day must be configurable per user in their settings (day 1–28).
- Payment accounts must be manageable per company, with the ability to set a default account.

### 3.4 Dashboard

- The dashboard must display month-to-date spend versus the monthly target for each category.
- Each category must be represented with a visual progress bar indicator.
- The dashboard must include a recent transactions list.
- The dashboard must include a spend trend view showing historical monthly spend.
- The user must be able to select which company is displayed on the dashboard.
- The user must be able to configure a default company that loads on dashboard open.
- The default date filter must reflect the current month cycle based on the user's configured start day.
- The user must be able to apply a custom date range filter to the dashboard view.

### 3.5 Expense History & Filtering

- The expense history view must default to the current month cycle.
- Users must be able to filter expenses by: date range (from/to), vendor name, category, and company.
- All filters must be combinable (e.g. filter by category AND date range simultaneously).

### 3.6 Authentication, Password Reset & User Management

- Authentication must be implemented using Better Auth with username and password.
- Main Members must be able to self-register via a public registration page.
- A password reset flow must be implemented. Reset emails must be sent via Cloudflare Email Send.
- The password reset link must expire after 1 hour.
- Members are invited by the Main Member (multi-user functionality deferred to future version).
- Role-based access control must enforce: Main Members can manage companies, categories, targets,
  and settings; Members can add and manage their own expenses and view the dashboard.
- No session timeout is required at this stage.

### 3.7 Non-Functional Requirements

| Requirement       | Standard                                                        |
|-------------------|-----------------------------------------------------------------|
| Availability      | 99% uptime, 24/7                                                |
| Concurrent Users  | 5 users at peak load (MVP scale)                                |
| Response Time     | All pages and interactions must respond within 2 seconds        |
| Platform          | PWA — mobile-first, Android Chrome at MVP                       |
| Currency          | South African Rand (ZAR) only                                   |
| Timezone          | SAST (UTC+2) only                                               |
| Languages         | English only                                                    |
| Accessibility     | No formal accessibility standard required at MVP                |
| Data Compliance   | No formal compliance requirement at MVP                         |

---

## 4. Tech Stack

| Layer                    | Technology                                      |
|--------------------------|-------------------------------------------------|
| Frontend Framework       | SvelteKit                                       |
| Styling                  | Tailwind CSS + DaisyUI                          |
| ORM                      | Drizzle ORM                                     |
| Database                 | Cloudflare D1 (SQLite-compatible, edge-hosted)  |
| File Storage             | Cloudflare R2 (receipt image storage)           |
| Backend / Runtime        | Cloudflare Workers (serverless edge functions)  |
| AI / Receipt Extraction  | Cloudflare AI (via Cloudflare Workers)          |
| Email                    | Cloudflare Email Send (password reset)          |
| Authentication           | Better Auth                                     |
| Testing — End-to-End     | Playwright                                      |
| Testing — Unit           | Vitest                                          |
| Application Type         | Progressive Web App (PWA), mobile-first         |
| Hosting / Infrastructure | Cloudflare (fully edge-native deployment)       |

---

## 5. Data Model

| Entity             | Key Fields                                                                                                          |
|--------------------|---------------------------------------------------------------------------------------------------------------------|
| User               | id, username, email, password_hash, default_company_id, month_start_day, created_at                                |
| Company            | id, name, owner_user_id (Main Member), created_at                                                                   |
| Category           | id, company_id, name, monthly_target_amount (ZAR), created_at                                                      |
| Account            | id, company_id, name, is_default, created_at                                                                        |
| Expense            | id, user_id, company_id, category_id, account_id, vendor_name, amount (ZAR), transaction_date, receipt_image_url, created_at, updated_at |
| PasswordResetToken | id, user_id, token_hash, expires_at, used_at                                                                        |

---

## 6. Assumptions & Dependencies

### Confirmed

- ✔ Email provider is Cloudflare Email Send. Used for password reset flows only at MVP.
- ✔ Timezone is SAST (UTC+2). All date/time values are stored and displayed in SAST.
- ✔ Currency is South African Rand (ZAR) for all monetary values. Multi-currency not in scope.
- ✔ Safari (iOS) PWA camera support is not required at MVP. Android Chrome is the primary target.
- ✔ A password reset flow is in scope and will be delivered via Cloudflare Email Send.

### Outstanding Assumptions

> Items below must be confirmed before this document moves to IN REVIEW status.

- ⚠ Cloudflare AI accuracy on South African till slips must be benchmarked during development.
- ⚠ PWA camera access via MediaDevices API on Android Chrome must be tested explicitly during QA.
- ⚠ Cloudflare R2 bucket configuration, CORS policies, and access credentials are the responsibility
  of the development team during environment setup.
- ⚠ The month cycle start day is a single value per user and applies across all linked companies.
- ⚠ The personal expense profile is treated as a special company-like entity in the data model.
- ⚠ Cloudflare Workers, D1, R2, AI, and Email Send tier limits are sufficient for 3–5 MVP users.

---

## 7. Acceptance Criteria

| Ref   | Feature            | Criteria                                                                                                                              |
|-------|--------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| AC-01 | Receipt Capture    | A user can photograph a receipt and the app correctly extracts vendor name, amount, and suggests a category without manual input.      |
| AC-02 | Pre-Save Review    | The pre-save screen displays all extracted fields and allows editing. No record is created until Save is clicked.                     |
| AC-03 | Image Storage      | Upon saving, the receipt image is stored in Cloudflare R2 and the URL is persisted against the expense record.                        |
| AC-04 | Edit & Delete      | A saved expense record can be edited and deleted. Deletion removes the associated image from R2.                                      |
| AC-05 | Company Management | A Main Member can create, edit, and delete companies. Members cannot access company management.                                       |
| AC-06 | Category & Targets | Categories with monthly ZAR targets can be created per company. Targets reset on the user-defined month start day.                   |
| AC-07 | Dashboard          | The dashboard displays correct month-to-date spend vs target per category with progress bars for the selected company.                |
| AC-08 | Company Selector   | The user can switch between companies on the dashboard. The default company loads based on user settings.                             |
| AC-09 | Filters            | Expense history can be filtered by date range, vendor, category, and company. Filters are combinable.                                 |
| AC-10 | Authentication     | A Main Member can self-register and log in via Better Auth. Role permissions are enforced correctly.                                  |
| AC-11 | Password Reset     | A user can request a password reset. A reset link is delivered via Cloudflare Email Send and expires after 1 hour.                   |
| AC-12 | Performance        | All pages and interactions respond within 2 seconds under normal network conditions.                                                  |
| AC-13 | PWA                | The application is installable as a PWA on Android devices and functions correctly on mobile screen sizes.                            |
| AC-14 | Uptime             | The application maintains 99% uptime on a 24/7 basis via Cloudflare edge infrastructure.                                             |
| AC-15 | Company Members    | An owner can add registered users by email to a business company with an optional category management permission toggle. Members can log and view shared expenses, while only permitted members or owners can manage categories/targets. |
| AC-16 | Reimbursable Field | When capturing an expense under a Personal profile, the user can flag it as Reimbursable and select the target business company. Reimbursable expenses are badged in the ledger. |
| AC-17 | Dashboard Date Filter | A filter button in the top left of the dashboard cycle card allows selecting custom from/to dates. When active, the button adopts a warning color and recalculates dashboard metrics for that date window. |
| AC-18 | Dashboard Visual Charts | The 3 metric blocks (Cycle Spend, Monthly Target, Remaining Budget) are represented via a compact visual Donut/Pie Chart that maximizes screen real estate and visual comparative appeal with clean ZAR badges. |
| AC-19 | Digital/Email Receipt Upload | A dedicated file upload option in `/capture` allows users to drag-and-drop or select receipt images from their device or email attachments without requiring a live camera feed. |

---

## 8. Revision History

| Version | Date         | Author          | Status | Changes                                                                                     |
|---------|--------------|-----------------|--------|---------------------------------------------------------------------------------------------|
| 0.1     | 16 Sep 2026  | Stefan van Dyk  | Draft  | Initial specification draft generated from stakeholder interview.                           |
| 0.2     | 16 Sep 2026  | Stefan van Dyk  | Draft  | Confirmed: email provider (Cloudflare Email Send), timezone (SAST), currency (ZAR), Safari exclusion, password reset flow added. |
| 1.0     | 16 Sep 2026  | Stefan van Dyk  | Approved | Baseline production delivery (AC-01 through AC-14).                                         |
| 1.2     | 17 Sep 2026  | Senior DevOps / Arch | Approved | Added AC-15 (Multi-User Company Collaboration & RBAC) and AC-16 (Personal Reimbursable Expenses). |
| 1.3     | 18 Sep 2026  | Senior DevOps / Arch | In Review | Added AC-17 (Dashboard Date Range Filter), AC-18 (Dashboard Visual Charts), and AC-19 (Dedicated Receipt Upload). |

---

*This document is classified as DRAFT. All ⚠ ASSUMPTION items must be confirmed before moving to IN REVIEW.*

