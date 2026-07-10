# SlayCRM — view inventory and duplication map

Source: `wbern/crm`, commit `e73ca0d` ("feat(#crm-46spf): port Henrik's Datum
filter popover + two-step calendar (#301)", 2026-07-09 18:24 +0200). Checkout
audited at `/Users/henrikhellstrom/sites/slaycrm/repo-main/src/`.

Scope: catalog every route under `src/routes/`, state what each shows, and flag
where views overlap or duplicate the same underlying data. Read-only audit, no
code changed. Swedish UI labels are quoted verbatim; everything else is my
description.

The repo's own `docs/v1-scope.md` (owner: William) already documents a
LIVE/NOT-LIVE split — I've used it as a starting point but verified every claim
against the actual route source, because the doc is dated 2026-06-10 and the
routes have moved since (see "Doc drift" below).

---

## Master table

| View (Swedish) | Route | Type | Entity shown | Live? | Purpose |
|---|---|---|---|---|---|
| Marketing landing page | `/` (`index.tsx`) | marketing/public | n/a (static copy + FAQ schema.org) | live (public) | SEO landing page for signed-out visitors; not part of the app shell, no nav chrome. |
| "Aktiviteter" (unified) | `/aktiviteter` | list + dashboard hybrid | `client_activity` / `event` (calls, meetings, tasks) | **live** | Primary post-login home. Bucketed list (idag/kommande/försenat/klart) with owner/type/date filters. This is both the "Att göra" dashboard and the activities list — see cluster 1. |
| Activities redirect stub | `/activities` | redirect stub | — | stub (302→`/aktiviteter`) | Legacy path, kept so old links/bookmarks don't 404. Route file only throws `redirect`. |
| App redirect stub | `/app` | redirect stub | — | stub (302→`/aktiviteter`) | Same pattern as `/activities` — an older "dashboard" URL, now just forwards. |
| "Företag" (accounts list) | `/accounts` | list | `client` (companies) | live | Company list, "Mina företag" / "Alla företag" tab, status/owner/category filters. |
| Company detail | `/accounts/$id` | detail | single `client` + related contacts/deals/activities | live | Account card: sidebar + tabbed detail (`-page.tsx`). |
| New company modal | `/accounts/new` | modal-as-route | `client` (create) | live | `CreateCompanyForm` in a `Modal`, routed so it's linkable/back-button-able. |
| "Kontakter" (contacts list) | `/contacts` | list | `client_contact` | live | Contact list, paged, search, filters. |
| Contact detail | `/contacts/$id` | detail (tabbed) | single `client_contact` | live | Sidebar + `ContactTabNav` (dashboard/activities/etc, lazy-loaded tabs). |
| New contact modal | `/contacts/new` | modal-as-route | `client_contact` (create) | live | Full create form incl. duplicate detection (`checkContactDuplicates`). |
| "Projekt" (projects list) | `/projekt` | list | `project` (custom SlayCRM entity, not in Upsales export) | live | Project list. |
| Project detail | `/projekt/$projektId` | detail | single `project` + member companies/contacts | live | Tabbed (Företag/Kontakter) membership manager. |
| "Affärer" (deals list) | `/deals` | list | `order` / `ordered_product` | live | Flat sortable/filterable deal list, grid or list toggle. |
| Deal detail | `/deals/$dealId` | detail | single `order` | live | Read/edit sections, documents, quotes sub-section. |
| New deal | `/deals/new` | full-page form | `order` (create) | live | `CreateDealForm`, not a modal (own page). |
| "Säljtavlan" (pipeline board) | `/deals/board` | board (kanban) | `order` grouped by `pipeline_history` stage | live | Same `order` data as `/deals`, laid out as drag-column board with stage counts/forecast. |
| "Offerter" (quotes list) | `/offerter` | list | `document_template` / quote records tied to deals | live | Quote list. |
| Quote detail | `/offerter/$quoteId` | detail | single quote | live | Breadcrumb + form + line items + snapshot sections. |
| "Sök" (advanced search) | `/avancerad-sokning` | global search | `client`, `client_contact`, `order` (server-paged) + activities/meetings (**client-side hardcoded seed**, not live) | **partially live** | Cross-entity search with an overview + 5 focus tabs (Företag/Kontaktpersoner/Försäljning live; Aktiviteter/Möten still `ACTIVITIES[]`/`MEETINGS[]` seed per `docs/v1-scope.md`). |
| "Admin" (tenant settings) | `/admin` | admin/settings | users, roles, custom fields, products, categories, stages, invitations, integrations ("Dina appar") | live | Tenant-scoped configuration console, section-switcher UI (not a data view). |
| Platform (operator console) | `/platform` | admin (superuser) | tenants, feature gates, impersonation | live, but **not a CRM view** | Internal operator tool for Henrik/William, not a salesperson-facing surface — different audience than everything else in this table. |
| "Kampanjer & ringlistor" | `/kampanjer` | list + tabs (façade) | `mail_campaign`/`flow`/`segment` (0 rows) | **NOT LIVE** | `beforeLoad` redirects to `/aktiviteter`; component code (2 tabs, full CRUD-looking modals) is unreachable dead code. |
| Rapportcenter (dashboard list) | `/rapportcenter/$id` | dashboard | mocked KPI widgets, no live aggregation | **NOT LIVE** | 5 named dashboards (Försäljning/Pipeline/Aktiviteter/Möten/Prestationsöversikt); only "Försäljning" and "Aktiviteter" have real-looking (but hardcoded seed) widgets, rest are stub panels. Guarded, redirects. |
| Rapportcenter index | `/rapportcenter` | redirect stub | — | **NOT LIVE** | No component at all, pure guard+redirect. |
| Signals | `/signals` | stub/façade | `web_visit`/`web_page`/`web_form` (0 rows) | **NOT LIVE** | Single empty-state card behind a redirect guard. |
| Hitta nya kunder | `/hitta-nya-kunder` | stub/façade | `lead`/`lead_source` (0 rows) | **NOT LIVE** | Single empty-state card behind a redirect guard. |
| Kundportfölj | `/kundportfolj` | stub/façade (tabbed) | hardcoded, no backing table | **NOT LIVE** | 3 tabs (Kunder/Risker/Riskhändelser), each an empty-state; guarded/redirects. |
| E-post (inbox) | `/email` | stub/façade | none (mocked) | **NOT LIVE** | Single empty-state; guarded/redirects. The *real* live email feature is a `mailto:` link on the account/contact sidebar (`src/routes/accounts/-sections/AccountSidebar.tsx:353`), not this route. |
| E-post mallar (templates) | `/email/mallar` | grid/gallery (façade) | 2 hardcoded templates | **NOT LIVE** | Fully-built-looking template gallery UI (grid/list toggle, hover delete) but every action is a stub; guarded/redirects. `email/-compose.ts` (template-selection helper) is dead code — nothing imports it, including this route's own `index.tsx`. |
| Login | `/login` | auth form | Supabase auth | live | — |
| Accept invite | `/accept-invite` | auth flow | invitation token | live | — |
| Operator MFA | `/operator-mfa` | auth flow | operator 2FA | live | Gate for `/platform` access. |
| Pending access | `/pending-access` | gate/waiting screen | tenant access state | live | Shown when a user is authenticated but not yet provisioned. |
| Auth callback | `/auth/callback` | technical redirect | Supabase OAuth callback | live | Not a user-facing "view". |

---

## Duplication clusters

### Cluster 1 — `activities/` vs `aktiviteter/` (already resolved, but worth understanding)

This is the one the owner should know is **already fixed**, not an open
problem — but the fix is recent and left scaffolding worth knowing about.

- Commit `30e8e7f` ("unify Att göra + Aktiviteter into one /aktiviteter tab",
  PR #292) merged what used to be two separate views — a dashboard-style
  "Att göra" and a plain "Aktiviteter" list — into one route, `/aktiviteter`.
  Commit `a3f9c69` (PR #297) then reshaped that unified list to match a
  prototype Henrik built.
- **Current state**: `/aktiviteter/index.tsx` is the only live route. It
  renders `ActivitiesPage` (defined in `src/routes/activities/-page.tsx`) —
  note the component still physically lives inside the old `activities/`
  folder, alongside its supporting files (`-activity-detail-modal.tsx`,
  `-activity-list.tsx`, `-datum-filter.tsx`, `-owner-multiselect.tsx`,
  `-type-combobox.tsx`, `-live-activity-list.tsx`, `-page-support.ts`). None of
  these are routes themselves (leading `-` excludes them from TanStack's file
  router) — they're just parked in a folder whose name no longer matches the
  live URL.
- `/activities/index.tsx` (the old route) is now a 7-line stub: it throws
  `redirect({ to: '/aktiviteter' })` and nothing else. Same pattern for
  `/app/index.tsx` — also just a redirect to `/aktiviteter`. Both exist purely
  so old bookmarks/links don't 404.
- `src/lib/nav-registry.ts` confirms only one entry, `id: 'activities'`,
  `to: '/aktiviteter'`, with `matchPrefixes: ['/aktiviteter', '/activities', '/app']` —
  so all three prefixes highlight the same nav tab. There is no separate "Att
  göra" label anywhere in the registry; the label is `nav.activities` →
  "Aktiviteter".
- **Recommendation**: not urgent, but the `activities/` folder should
  eventually be renamed to `aktiviteter/` (or the shared kit moved to
  `src/components/activities/`) so the folder name matches the route it
  actually serves — cosmetic but it's exactly the kind of stale-name trap this
  audit is trying to flag before it causes a wrong edit.

### Cluster 2 — Företag vs Kundportfölj vs Hitta nya kunder (three "customer" surfaces, only one alive)

- `/accounts` ("Företag") is the one live, real view: full CRUD company list
  backed by `client` (14,467 rows in the Bauer export per `docs/v1-scope.md`).
- `/kundportfolj` ("Kundportfölj") is a façade with three tabs — Kunder,
  Risker, Riskhändelser — that each render nothing but an `EmptyState`. No
  backing table; `docs/v1-scope.md` calls it a "no matching contract module"
  façade. Guarded, redirects to `/aktiviteter`.
- `/hitta-nya-kunder` ("Hitta nya kunder") is a single empty-state card for
  prospecting/lead-gen (`lead`/`lead_source`, 0 rows). Guarded, redirects.
- These aren't really "three views of the same data" — only `/accounts` has
  data. The other two are placeholder concepts for adjacent-but-different jobs
  (portfolio risk monitoring; lead sourcing) that were scaffolded, given nav
  entries at some point, and then hidden. No merge needed — they're not live
  competitors to Företag, just unbuilt features parked behind redirects.

### Cluster 3 — Affärer (deals list) vs Säljtavlan (board): same data, two layouts, by design

- `/deals` and `/deals/board` both read `order` (deals) — confirmed by
  `listDealsPaged`/`getDealStages` in `deals/index.tsx` vs
  `fetchBoardShellData` in `deals/board.tsx`, both hitting the same
  `order`/`pipeline_history` tables.
- `/deals` is a flat, sortable, filterable table — optimized for scanning,
  bulk actions, search.
- `/deals/board` is a kanban view grouped by pipeline stage — optimized for
  moving deals through stages, forecast visibility.
- This is a legitimate, common CRM pattern (Upsales, Pipedrive, HubSpot all do
  list+board for the same entity) — **not** a duplication to merge. Both are
  first-class nav entries (`deals` and `sales-board` in `nav-registry.ts`).
  Flagging only to confirm it's intentional, not an accident of two people
  building the same thing twice.

### Cluster 4 — Avancerad sökning vs per-entity list filters

- `/avancerad-sokning` ("Sök") is a global, cross-entity search: one query box
  fans out to `client`, `client_contact`, and `order` (each server-paged, see
  `avancerad-sokning/-page.tsx`), with an overview screen showing counts across
  all categories plus a focused per-category result panel.
- Each entity list (`/accounts`, `/contacts`, `/deals`) also has its own
  inline filter bar (owner, status, category, etc.) — a **narrower, single-
  entity** filter, not a search.
- These don't fully overlap: global search answers "where is this thing,
  wherever it lives" (cross-entity, by free-text query); list filters answer
  "narrow this one list by structured criteria." Real overlap exists only in
  the free-text case — e.g., searching a company name is possible both via
  `/avancerad-sokning?query=...` and by typing into `/accounts`'s own filter —
  but the *filtering* dimensions (status/owner/category) are unique to the
  list pages and not exposed in the global search's Företag tab. Low-priority
  finding, not a structural duplicate.
- **Caveat inherited from `docs/v1-scope.md`**: the Aktiviteter/Möten tabs
  inside this page are **not** wired to live data — they filter a hardcoded
  `ACTIVITIES[]`/`MEETINGS[]` array client-side (confirmed: `-page.tsx`'s
  `aktiviteter()`/`moten()` helpers operate on a local `activities()` array,
  not a query result). A user searching for an activity here will only ever
  see seed data, regardless of what's really in their tenant. This is a
  bigger deal than it sounds because the other two tabs on the same page
  (Företag/Kontaktpersoner) *are* live — so within one screen, two tabs are
  real and two are decorative. That inconsistency is a strong candidate to fix
  or hide before this page reaches a shipping salesperson.

### Cluster 5 — Startsida (`/aktiviteter`) vs Rapportcenter vs Signals: overlapping "overview" pretenders

- `/aktiviteter` is the real, live "what do I need to do" dashboard —
  activities feed, bucketed counts, overdue badge.
- `/rapportcenter/$id` ("Försäljning"/"Pipeline"/"Aktiviteter"/"Möten"/
  "Prestationsöversikt") is a 5-dashboard mock reporting suite. Two of the
  five ("Försäljning", "Aktiviteter") render fairly complete-looking charts
  and tables from a hardcoded seed file (`rapportcenter/-seed.ts`); the other
  three ("Pipeline", "Möten", "Prestationsöversikt") are bare "Funktionen är
  under uppbyggnad" stubs. All five sit behind the same `beforeLoad` redirect,
  so none are reachable in the running app regardless of how finished they
  look.
- `/signals` is a single "no signals yet" empty-state card, gated the same way.
- There's no live overlap today (Rapportcenter and Signals are both fully
  gated off) — but the *concept* overlap is worth naming for whoever decides
  what V2 looks like: "Aktiviteter" already answers a personal daily-work
  question, while the mocked "Rapportcenter → Aktiviteter" dashboard answers a
  team/manager reporting question (who logged what, org-wide, per period).
  They use the same word ("Aktiviteter") for two different audiences and
  should probably not both be top-level nav items with overlapping labels
  once Rapportcenter is unhidden.

---

## Orphans / stubs / not-live

Confirmed via `src/routes/not-live-guards.test.ts` (which asserts `beforeLoad`
+ `redirect` on each) plus direct file reads:

| Route | Redirects to | Notes |
|---|---|---|
| `/kampanjer` | `/aktiviteter` | Fully-built-looking 2-tab UI (Kampanjer/Ringlistor) with create/edit modals wired to `lib/db/campaigns.ts` — the most "finished" of the NOT-LIVE façades, but `mail_campaign`/`flow`/`segment` = 0 rows in Bauer, so it's out of scope per `docs/v1-scope.md`. |
| `/rapportcenter` | `/aktiviteter` | Pure guard, no component. |
| `/rapportcenter/$id` | `/aktiviteter` | 5 sub-dashboards, 2 have real-looking mock content, 3 are bare stubs. |
| `/signals` | `/aktiviteter` | Single empty-state. |
| `/hitta-nya-kunder` | `/aktiviteter` | Single empty-state. |
| `/email` | `/aktiviteter` | Single empty-state; the real live email touchpoint is a `mailto:` link on account/contact sidebars, not this route. |
| `/email/mallar` | `/aktiviteter` | Full template-gallery UI, entirely non-functional (delete/edit/create are all no-ops per its own `DevNote` block). |
| `/kundportfolj` | `/aktiviteter` | 3-tab façade, all empty-states. |

Additional stubs **not** in the `not-live-guards.test.ts` list (different
mechanism — plain redirect, no gate infrastructure):

| Route | Redirects to | Notes |
|---|---|---|
| `/activities` | `/aktiviteter` | Legacy URL from the pre-unification IA; kept for backward-compat links. |
| `/app` | `/aktiviteter` | Same — an older "dashboard" URL. |

Dead code found in passing: `src/routes/email/-compose.ts` (template
subject/body resolution helpers) is not imported by `email/index.tsx` or
anywhere else in `src/` — it's orphaned from an earlier iteration of the
email façade.

---

## Doc drift worth flagging

`docs/v1-scope.md` (dated 2026-06-10) lists "Att göra (dashboard)" as living
at route `/` with Bauer data "activities/notifications". That's stale: `/` is
now the public marketing landing page (`index.tsx`, JSON-LD + hero + FAQ,
`component: LandingPage`), and the actual signed-in dashboard is
`/aktiviteter`. The unification commits (`30e8e7f`, `a3f9c69`) postdate the
doc. Worth a one-line fix in that table so a future agent doesn't go looking
for the dashboard at `/`.

---

## Count

- **Total route files under `src/routes/`** (excluding `-`-prefixed
  non-route support files, `.css`, and `.test.*`): **34** distinct
  `createFileRoute(...)` registrations, across 24 folders + top-level files.
- **Core, live, salesperson-facing views**: 16 — landing (`/`), aktiviteter,
  accounts list + detail + new, contacts list + detail + new, projekt list +
  detail, deals list + detail + new, board, offerter list + detail,
  avancerad-sokning.
- **Secondary/support live views**: 6 — admin, platform (different audience —
  operator, not salesperson), login, accept-invite, operator-mfa,
  pending-access, auth/callback (technical, not user-facing) — that's 7,
  adjust as: admin (1), platform (1), auth-flow screens (4: login,
  accept-invite, operator-mfa, pending-access), auth callback (1, non-UI) = 7.
- **NOT-LIVE façades/stubs** (gated, redirect to `/aktiviteter`): 8 routes —
  kampanjer, rapportcenter/index, rapportcenter/$id, signals,
  hitta-nya-kunder, email/index, email/mallar, kundportfolj.
- **Legacy redirect-only stubs** (pre-unification URLs, no façade UI): 2 —
  activities, app.

So of 34 routes, **10 are dead ends by design** (8 gated façades + 2 plain
redirects) — roughly 30% of the route surface exists only to catch stale
links or park unbuilt ideas. The one genuine "were these built twice"
question (`activities/` vs `aktiviteter/`) turned out to already be resolved
in-repo, just with leftover folder-naming residue. The three-way
Företag/Kundportfölj/Hitta-nya-kunder split and the Aktiviteter-named
dashboard-vs-list overlap in Rapportcenter are naming/scope questions for
later, not present-day duplicate builds.
