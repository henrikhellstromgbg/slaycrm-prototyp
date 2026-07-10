# SlayCRM — CRUD-path matrix

**Source:** fresh checkout of `origin/main`, `github.com/wbern/crm`, at
`/Users/henrikhellstrom/sites/slaycrm/repo-main/`.
**Commit:** `e73ca0d feat(#crm-46spf): port Henrik's Datum filter popover + two-step calendar (#301)`.
**Stack (confirmed while reading):** SolidJS + TanStack Solid Router (file-based routes under `src/routes/`), Supabase. UI in Swedish.

## Scope & method

Goal: enumerate *every* distinct UI path through which a user can Create, Read, Edit, or Delete each core entity — the evidence base for the complaint that "there are four different ways to do everything."

Method: (1) listed the full route/component tree; (2) read the route entry files, detail pages, `-sections/`, `-modals/`, and the shared components in `src/components/` and `src/components/account|contact/`; (3) grepped `src/` for the Swedish action labels ("Lägg till", "Ny", "Skapa", "Redigera", "Ta bort", "Radera", "Spara", "Logga aktivitet") and for every call site of the entity mutation functions in `src/lib/db/*` (`createAccount`, `createContact`, `createActivity`, `createDeal`, `createQuoteFromDeal`, `createProject`, and their `update*`/`delete*` siblings); (4) traced each trigger back to the view it fires from.

All writes go through server functions in `src/lib/db/*` (the actual `.insert/.update/.delete` live there). What varies — and what this matrix documents — is how many separate **UI forms/modals/drawers and trigger points** funnel into those few mutations. A single shared component invoked from many places is called out as such, and distinguished from genuinely separate form implementations.

Paths below are absolute, rooted at `/Users/henrikhellstrom/sites/slaycrm/repo-main/`.

---

## 1. Företag / account (table `accounts`)

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | `/accounts/new` route — `CreateCompanyForm` in a `Modal` | `src/routes/accounts/new.tsx:11` → `src/components/CreateCompanyForm.tsx:56` | Reached by URL / deep link. Form calls `createAccount`. |
| Create | "Skapa företag" button on the Företag list → opens `Modal` with the **same** `CreateCompanyForm` | `src/routes/accounts/-kunder-page.tsx:316` (button), `:448` (form), `showCreateModal` | Same form component as above; second trigger only. |
| Read | List: `/accounts` → `KunderPage` | `src/routes/accounts/index.tsx:7,22` → `src/routes/accounts/-kunder-page.tsx` | |
| Read | Detail: `/accounts/$id` → `AccountPageContent` (tabbed: Home, Kontaktpersoner, Aktiviteter, Affärer, Order, Dokument, Historik) | `src/routes/accounts/$id.tsx:3` → `src/routes/accounts/-page.tsx` | |
| Read | Global search "Företag" tab / topbar search result → link to detail | `src/routes/avancerad-sokning/…`, `src/components/TopbarGlobalSearch.tsx` | |
| Edit | "Redigera" icon in `AccountSidebar` → `RedigeraForetag` modal → `updateAccount` | `src/routes/accounts/-sections/AccountSidebar.tsx:174` → `src/routes/accounts/-page.tsx:78,378` → `src/routes/accounts/-modals/RedigeraForetag.tsx:335,713` | Also manages category add/remove ("Lägg till kategori", `RedigeraForetag.tsx:511,528`) inline. |
| Delete | "Radera företag" icon in `AccountSidebar` → confirm dialog → `deleteAccount` | `src/routes/accounts/-sections/AccountSidebar.tsx:185` → `src/routes/accounts/-page.tsx:260` ("Radera detta företag? Åtgärden kan inte ångras.") | Soft delete (`deleted_at`), `src/lib/db/accounts-mutations.ts:114`. |

**Count / verdict:** 2 create triggers (both funnel into one form, `CreateCompanyForm` → `createAccount`), 1 edit path, 1 delete path. Low redundancy — the two create entries are a route vs a list-page modal wrapping the *same* component; only mildly duplicative.

---

## 2. Kontaktperson / contact (table `contacts`)

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | "Ny kontakt" on the Kontakter list → navigates to `/contacts/new`, a **full-page** form | `src/routes/contacts/index.tsx:355` → `src/routes/contacts/new.tsx:50,206` (`createContact`) | Standalone `CreateContactPage`, own fields, duplicate check, "Skapa ändå". |
| Create | Account detail → "Kontaktpersoner" tab → inline "Lägg till kontaktperson" **separate** add form | `src/components/account/ContactsTab.tsx:127` (`createContact`), `:362` (add button) | Distinct implementation from `contacts/new.tsx` — different component, own inline fields; same mutation. |
| Read | List `/contacts` | `src/routes/contacts/index.tsx` | |
| Read | Detail `/contacts/$id` (tabbed: dashboard, activities, sales, opportunities, documents) | `src/routes/contacts/$id.tsx:198,313` | |
| Read | Account `ContactsTab` list; project member list; global search "Kontaktpersoner" | `src/components/account/ContactsTab.tsx:328`, `src/routes/projekt/$projektId.tsx`, `src/routes/avancerad-sokning/…` | |
| Edit | Contact detail "Redigera" → `RedigeroKontaktperson` modal → `updateContact` | `src/routes/contacts/$id.tsx:249` → `src/components/contact/RedigeroKontaktperson.tsx:311` | Single edit form. |
| Delete | Contact detail → `deleteContact` (confirm dialog) | `src/routes/contacts/$id.tsx` (`createConfirmDialog`, `:30`; `deleteContact`) | Soft delete (`deleted_at`), `src/lib/db/contacts.ts:327`. |
| Delete | `ContactSidebar` → `deleteContact` | `src/components/contact/ContactSidebar.tsx` | Second trigger point on the detail view. |
| Delete | `RedigeroKontaktperson` edit modal → `deleteContact` | `src/components/contact/RedigeroKontaktperson.tsx` | Delete embedded inside the *edit* modal — third trigger. |

**Count / verdict:** 2 **distinct** create forms (full-page `contacts/new.tsx` vs the inline `ContactsTab` form — redundant, they do the same thing differently), 1 edit form, and 3 delete trigger points for the one `deleteContact` mutation.

---

## 3. Aktivitet / activity (table `activities`)

**Route duplication first (a finding in itself):** the app has two folders. `src/routes/activities/index.tsx:3-6` is now a **redirect shim** — its loader `throw redirect({ to: '/aktiviteter' })`. The canonical route is `src/routes/aktiviteter/index.tsx`, which renders `ActivitiesPage` imported from `src/routes/activities/-page.tsx:12`. So the two routes are **not** two implementations: `/aktiviteter` is the live nav target (`src/lib/nav-registry.ts:45`; topbar logo `src/components/Topbar.tsx:70`), `/activities` redirects to it, and the entire implementation still physically **lives in the `activities/` folder** (never moved). Dead route path + un-relocated code, not parallel logic.

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | `BokAktivitetDrawer` — the shared "Ny aktivitet" drawer → `createActivity` | `src/components/BokAktivitetDrawer.tsx:36,83` | One component, invoked from **7 trigger points** (rows below). |
| Create | ↳ Trigger: `/aktiviteter` page "+ Ny aktivitet" **and** "Logga aktivitet" (two buttons, same drawer, different initial state) | `src/routes/activities/-page.tsx:491,501,627` | Two buttons for one drawer. |
| Create | ↳ Trigger: contact detail | `src/routes/contacts/$id.tsx:261` | |
| Create | ↳ Trigger: deal detail | `src/routes/deals/$dealId.tsx:713` | |
| Create | ↳ Trigger: account `HomeTab` | `src/components/account/HomeTab.tsx:540` | |
| Create | ↳ Trigger: account `ActivitiesTab` | `src/components/account/ActivitiesTab.tsx:313` | |
| Create | ↳ Trigger: contact `ContactDashboard` | `src/components/contact/ContactDashboard.tsx:197` | |
| Create | account `HomeTab` **inline quick-add widget** (call/möte/todo/note tabs) → `createActivity` **directly** | `src/components/account/HomeTab.tsx:105` (`handleSkapa`), `:265` | Separate mini-form, bypasses the drawer entirely. |
| Create | contact `ContactDashboard` **inline quick-add widget** → `createActivity` **directly** | `src/components/contact/ContactDashboard.tsx:134` (`handleSkapa`), `:295` | Third distinct create implementation. |
| Read | `/aktiviteter` unified activity list (`ActivitiesPage`) | `src/routes/aktiviteter/index.tsx:35` → `src/routes/activities/-page.tsx` | |
| Read | `ActivityDetailModal` opened from the unified list | `src/routes/activities/-activity-detail-modal.tsx:79` | |
| Read | Per-account `ActivitiesTab` / `ActivitiesTable`; per-contact `ContactActivitiesTab`; Home/Dashboard timelines | `src/components/account/ActivitiesTab.tsx`, `ActivitiesTable.tsx`, `src/components/contact/ContactActivitiesTab.tsx` | |
| Edit | `ActivityDetailModal` "Spara" → `updateActivity` | `src/routes/activities/-activity-detail-modal.tsx:235,550` (`updateActivity`, `:11 import`) | From the unified list. |
| Edit | account `ActivitiesTab` → `EditActivityModal` → `updateActivity` | `src/components/account/ActivitiesTab.tsx:171` ("mirrors BokAktivitetDrawer fields") → `src/components/account/EditActivityModal.tsx` | **Second, separate** edit modal that re-implements the drawer's fields. |
| Delete | `ActivityDetailModal` → `deleteActivity` (confirm "Radera denna aktivitet?") | `src/routes/activities/-activity-detail-modal.tsx:216,545` | |
| Delete | account `ActivitiesTab` → `deleteActivity` | `src/components/account/ActivitiesTab.tsx` | |
| Delete | account `ActivitiesTable` → `deleteActivity` | `src/components/account/ActivitiesTable.tsx` | |
| Delete | contact `ContactActivitiesTab` → `deleteActivity` | `src/components/contact/ContactActivitiesTab.tsx` | |

**Count / verdict:** **3 distinct create implementations** — the shared `BokAktivitetDrawer` (fired from 7 places) plus two hand-rolled inline quick-add widgets (`HomeTab`, `ContactDashboard`) that call `createActivity` themselves. **2 distinct edit modals** (`ActivityDetailModal` and account `EditActivityModal`, which the code comment admits "mirrors BokAktivitetDrawer fields"). **4 delete trigger points.** This is the worst entity: the inline widgets and the second edit modal are pure redundancy; the 7 drawer triggers are defensible context entry points but there is no single canonical create surface.

---

## 4. Affär / deal (table `deals`)

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | `CreateDealForm` (form #1) — `/deals/new` route | `src/routes/deals/new.tsx:2,12` → `src/components/CreateDealForm.tsx:35` (`createDeal`) | |
| Create | `CreateDealForm` — deals list "Skapa" modal (`showDealModal`) | `src/routes/deals/index.tsx:22,288,342` | Same form #1, list-page modal trigger. |
| Create | Board "Skapa affär" → `onCreateDeal` → navigates to `/deals/new` | `src/routes/deals/-sections/BoardToolbar.tsx:169` → `src/routes/deals/-page.tsx:452` (`navigate({ to: '/deals/new' })`) | Routes into form #1. |
| Create | `NyForsaljningModal` (form #2) — account "Order" tab | `src/components/account/OrdersTab.tsx:119` → `src/components/NyForsaljningModal.tsx:101` (`createDeal`) | **Second, separate** deal-create form. |
| Create | `NyForsaljningModal` — account "Affärer/Opportunities" tab | `src/components/account/OpportunitiesTab.tsx:555` | |
| Create | `NyForsaljningModal` — contact "Affärer" tab | `src/components/contact/ContactOpportunitiesTab.tsx:36` | |
| Read | List `/deals` | `src/routes/deals/index.tsx` | |
| Read | Kanban board `/deals/board` | `src/routes/deals/board.tsx` → `src/routes/deals/-page.tsx` | |
| Read | Detail `/deals/$dealId` | `src/routes/deals/$dealId.tsx` | |
| Read | account Orders/Opportunities tabs; contact Opportunities/Sales tabs; global search "Försäljning" | `src/components/account/*Tab.tsx`, `src/components/contact/*Tab.tsx` | |
| Edit | Deal detail `DealEditSection` "Spara" → `updateDeal` | `src/routes/deals/$dealId.tsx` → `src/routes/deals/-sections/DealEditSection.tsx:227` | Full edit form. |
| Edit | Board drag-and-drop between stage columns → `updateDeal` (stage change) | `src/routes/deals/-page.tsx` (`updateDeal`), `src/routes/deals/-sections/BoardColumn.tsx` | Different mechanism (drag), field-specific. |
| Edit | `CloseDatePrompt` "Spara slutdatum" → `updateDeal` | `src/routes/deals/-sections/CloseDatePrompt.tsx:63` | Field-specific side-effect edit. |
| Delete | Deal detail `DealEditSection` "Radera affär" → `deleteDeal` | `src/routes/deals/-sections/DealEditSection.tsx:261` → `src/routes/deals/$dealId.tsx` | Hard delete, `src/lib/db/deals-mutations.ts:257`. |

**Count / verdict:** **2 distinct create form components** (`CreateDealForm` and `NyForsaljningModal`) reached from **6 trigger points** — the two forms are redundant (both call `createDeal`). Edit is spread across 3 surfaces (full form + board drag + close-date prompt), of which the drag and close-date are justified field-specific interactions rather than duplicates. 1 delete path.

---

## 5. Offert / quote (table `quotes`)

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | Deal detail → `DealQuotesSection` "+ Skapa offert" → `createQuoteFromDeal` | `src/routes/deals/-sections/DealQuotesSection.tsx:34` → `src/routes/deals/$dealId.tsx:25` | Quotes are only ever created *from a deal*. |
| Create | Offerter list "Skapa offert" → modal to pick a deal → `createQuoteFromDeal` | `src/routes/offerter/index.tsx:102` (`openCreateModal`), `:122`, `:205` | Same mutation; the list just adds a deal-picker step. |
| Read | List `/offerter` | `src/routes/offerter/index.tsx` | |
| Read | Detail `/offerter/$quoteId` | `src/routes/offerter/$quoteId.tsx` | |
| Read | Deal detail `DealQuotesSection` (quotes belonging to a deal) | `src/routes/deals/-sections/DealQuotesSection.tsx` | |
| Edit | Quote detail `QuoteFormSection` "Spara ändringar" → `updateQuote`; line items via `QuoteLinesSection` ("Lägg till" / "Ta bort rad") | `src/routes/offerter/-sections/QuoteFormSection.tsx:95`, `src/routes/offerter/-sections/QuoteLinesSection.tsx:368,54` → `src/routes/offerter/$quoteId.tsx` | Single edit surface. |
| Delete | Quote detail `QuoteHeader` "Ta bort" → `deleteQuote` | `src/routes/offerter/-sections/QuoteHeader.tsx:99` → `src/routes/offerter/$quoteId.tsx` | Hard delete, `src/lib/db/quotes-mutations.ts:338`. |

**Count / verdict:** 2 create triggers, both funnelling into the one `createQuoteFromDeal` mutation (no from-scratch quote creation exists); 1 edit surface; 1 delete. Low redundancy — the two create entries differ only in whether the deal is pre-selected.

---

## 6. Projekt / project (table `projects`)

| Operation | Path / Trigger (label + where) | Route or component (file:line) | Notes |
|---|---|---|---|
| Create | Projekt list → create → `createProject` | `src/routes/projekt/index.tsx:13,116` | Single create entry. |
| Read | List `/projekt` | `src/routes/projekt/index.tsx` | |
| Read | Detail `/projekt/$projektId` | `src/routes/projekt/$projektId.tsx` | |
| Edit | Project detail → rename → `updateProject`; add/remove members ("Lägg till kontakt", `addContactMembership` / account membership) | `src/routes/projekt/$projektId.tsx:20,154,258,500` | Membership management is genuinely distinct from rename. |
| Delete | Project detail "Ta bort projekt" → `deleteProject` | `src/routes/projekt/$projektId.tsx:21,129,217` | (`src/lib/db/projects.ts` also exposes an `is_active:false` archive at `:189`; the detail view wires the hard `deleteProject`.) |

**Count / verdict:** 1 create, 1 edit (plus membership add/remove, which is legitimately separate), 1 delete. The least duplicated entity.

---

## Redundancy summary (worst first)

1. **Aktivitet / activity — worst.**
   - **3 distinct create implementations:** shared `BokAktivitetDrawer` (`src/components/BokAktivitetDrawer.tsx`) fired from **7 trigger points**, *plus* two hand-rolled inline quick-add widgets that call `createActivity` themselves — `src/components/account/HomeTab.tsx:105` and `src/components/contact/ContactDashboard.tsx:134`.
   - **2 distinct edit modals:** `src/routes/activities/-activity-detail-modal.tsx:235` and `src/components/account/EditActivityModal.tsx` (via `ActivitiesTab.tsx:171`, whose own comment says it "mirrors BokAktivitetDrawer fields").
   - **4 delete trigger points:** `-activity-detail-modal.tsx:216`, `account/ActivitiesTab.tsx`, `account/ActivitiesTable.tsx`, `contact/ContactActivitiesTab.tsx`.
   - Plus the dead `/activities` → `/aktiviteter` redirect with un-relocated code (`src/routes/activities/index.tsx:3-6`).

2. **Affär / deal.**
   - **2 separate create form components** — `src/components/CreateDealForm.tsx` (routes `/deals/new`, deals-list modal, board "Skapa affär") and `src/components/NyForsaljningModal.tsx` (account `OrdersTab.tsx:119`, account `OpportunitiesTab.tsx:555`, contact `ContactOpportunitiesTab.tsx:36`) — **6 trigger points, 2 forms**, both calling `createDeal`.
   - 3 edit surfaces (full `DealEditSection` + board drag + `CloseDatePrompt`), 2 of which are justified field-specific interactions.

3. **Kontaktperson / contact.**
   - **2 separate create forms** — full-page `src/routes/contacts/new.tsx:50` vs inline `src/components/account/ContactsTab.tsx:127` — doing the same thing (`createContact`) with different UIs.
   - **3 delete trigger points** for one mutation: `src/routes/contacts/$id.tsx`, `src/components/contact/ContactSidebar.tsx`, and inside the edit modal `src/components/contact/RedigeroKontaktperson.tsx`.

4. **Företag / account.**
   - 2 create triggers sharing one form (`src/routes/accounts/new.tsx:11` route modal vs `src/routes/accounts/-kunder-page.tsx:316` list-page modal, both wrapping `CreateCompanyForm`). 1 edit, 1 delete — mild.

5. **Offert / quote.**
   - 2 create triggers (`src/routes/deals/-sections/DealQuotesSection.tsx:34` and `src/routes/offerter/index.tsx:102`), both into the single `createQuoteFromDeal`; differ only by whether the deal is pre-selected. 1 edit, 1 delete — mild.

6. **Projekt / project.**
   - 1 create, 1 edit, 1 delete. No meaningful CRUD duplication.
