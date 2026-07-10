# SlayCRM — display-surface inventory and empty states

Source: `wbern/crm`, commit `e73ca0d` ("feat(#crm-46spf): port Henrik's Datum
filter popover + two-step calendar (#301)"). Checkout audited at
`/Users/henrikhellstrom/sites/slaycrm/repo-main/src/`. Same commit as
`02-view-inventory-duplication.md` — that doc's 34-route table is taken as
given and referenced, not re-derived here.

Scope: go one level deeper than routes. Every place a core entity
(Företag/account, Kontaktperson/contact, Aktivitet/activity, Affär/deal,
Offert/quote, Projekt/project — plus Dokument, Möten, Anteckningar where
embedded) is rendered anywhere in the app: own route, embedded tab/section in
another entity's detail page, sidebar/rail, dashboard widget, global-search
tab, or modal. For each surface, its empty state, quoted verbatim in Swedish.
Read-only audit, no code changed.

(Sections below are appended incrementally as each area is investigated.)

---

## 1. Account detail (`/accounts/$id`) — embedded surfaces

Route: `src/routes/accounts/$id.tsx` → `src/routes/accounts/-page.tsx`. Tabs
built at `routes/accounts/-page.tsx:289-342` (`tabs()` function), each
lazy-loaded except the two eager "landing" tabs (comment at
`-page.tsx:47-52`).

| Tab id | Label (sv) | Component | Entity shown |
|---|---|---|---|
| `home` | "Kund" | `components/account/HomeTab.tsx` (eager) | account fields **+ embedded mini-timeline of open activities and a mini "Historik" feed** (see below) |
| `contacts` | "Kontaktpersoner" | `components/account/ContactsTab.tsx` (eager) | Kontaktperson — contacts belonging to this account |
| `activities` | "Aktiviteter" | `components/account/ActivitiesTab.tsx` (lazy, ~915 lines) | Aktivitet — account's activities |
| `opportunities` | "Affärer" | `components/account/OpportunitiesTab.tsx` (lazy) | Affär/deal, **open pipeline view** |
| `orders` | "Försäljning" | `components/account/OrdersTab.tsx` (lazy) | Affär/deal, **closed/won, grouped-by-year financial view** |
| `documents` | "Dokument" | `components/account/DocumentsTab.tsx` (lazy) | Dokument |
| `history` | "Historik" | `components/account/HistorikTab.tsx` (lazy, 13-line wrapper around shared `components/AuditLogTimeline.tsx`) | audit log of changes to the account record |

**Key finding — "Affärer" and "Försäljning" tabs both render the exact same
underlying data.** `OpportunitiesTab.tsx:4` and `OrdersTab.tsx:6` both call
`getAccountDeals` (`src/lib/db/accounts.ts`) against the same
`DBDealWithStage[]` shape (`OpportunitiesTab.tsx:6`, `OrdersTab.tsx:7`). They
differ only in presentation:
- **Opportunities** (`OpportunitiesTab.tsx:284-288`): client-side filter
  toggle all/active/lost (`stage !== 'Förlorad'` vs `=== 'Förlorad'`) — a flat
  row-per-deal list, i.e. a scoped-down `/deals` list.
- **Orders** (`OrdersTab.tsx:44-46`, `lib/orders-grouping.ts`): groups the
  same rows by year with a bar chart + KPI (`kpi12m`), i.e. a mini
  Rapportcenter-style rollup.

Both tabs are also gated: `opportunities` only shows if
`showOpportunities !== false`, `orders` only if `showOrders !== false`
(`-page.tsx:315,323`) — a per-account visibility flag, not a global toggle.

**"Kund" (home) tab embeds two more mini-surfaces of the same data already
shown in dedicated tabs**, at `components/account/HomeTab.tsx`:
- Open-activities preview (`HomeTab.tsx:296-312`) — same `client_activity`
  data as the "Aktiviteter" tab, but only open items, no full list.
- "Historik" preview feed (`HomeTab.tsx:518-536`) — a separate, inline,
  non-shared re-implementation of a change/activity feed, distinct from the
  dedicated "Historik" tab which delegates to the shared `AuditLogTimeline`.

So the account detail page alone contains **4 activity-adjacent or
deal-adjacent renderings that reduce to 2 underlying datasets**: activities
(full tab + home-tab preview) and deals (opportunities view + orders/KPI
view).

### Empty states found

| Surface | Empty text (sv) | Source |
|---|---|---|
| Opportunities tab (no deals at all) | "Inga affärer ännu" / "Skapa en ny affär för att börja följa pipeline här." | `lib/i18n/locales/sv/account.ts:124-126`, rendered `OpportunitiesTab.tsx:449-454` |
| Orders tab (no closed sales) | "Ingen försäljning ännu" / "När affärer stängs syns sammanställningen här." | `account.ts:106-107`, rendered `OrdersTab.tsx:156-161` and again `:222-227` (seed-account and DB-account branches both call the same empty copy) |
| Documents tab | "Inga filer" | `account.ts:59` (`account.documents.empty`), rendered `DocumentsTab.tsx:481-482` |
| Home tab — open-activities preview | "Företaget har inga öppna aktiviteter" | `account.ts:82` (`account.home.noOpenActivities`), rendered `HomeTab.tsx:305` |
| Home tab — inline historik preview | "Ingen historik än" | `account.ts:89` (`account.home.noHistory`), rendered `HomeTab.tsx:534` |
| Historik tab (via shared `AuditLogTimeline`) | "Inga ändringar" / "När någon uppdaterar posten visas historiken här." | `lib/i18n/locales/sv/common.ts:29-30`, rendered `components/AuditLogTimeline.tsx:244-249` |
| Activities tab (full "Aktiviteter" tab) | **none found** — no `EmptyState`/`Show...fallback` guard in `ActivitiesTab.tsx`; a zero-row account silently renders a bare/empty table | grep of `components/account/ActivitiesTab.tsx` for `length === 0`/`fallback=`/`EmptyState` returned nothing |
| Contacts tab | **none found** — same silent-empty pattern | grep of `components/account/ContactsTab.tsx` returned nothing |

`AuditLogTimeline` (`components/AuditLogTimeline.tsx`) is shared: used by the
account "Historik" tab (via `HistorikTab.tsx`) **and** by the deal detail's
history section (`routes/deals/-sections/DealReadSection.tsx`) — confirmed
canonical reuse, not a duplicate build. It is **not** used by contact detail,
which has no "Historik" tab at all (see section 2).

Account sidebar (`routes/accounts/-sections/AccountSidebar.tsx`) is a
quick-info rail, not an embedded entity list: company fields plus a
`mailto:` link (`AccountSidebar.tsx:353`). No contacts/deals/activities
sub-list lives there.

---

## 2. Contact detail (`/contacts/$id`) — embedded surfaces

Route: `src/routes/contacts/$id.tsx`, tabs rendered via
`components/contact/ContactTabNav.tsx` (labels `contact.tab.*` at
`lib/i18n/locales/sv/contact.ts:17-26`), tab bodies lazily imported at
`routes/contacts/$id.tsx:37-56`.

| Tab id | Label (sv) | Component | Entity shown |
|---|---|---|---|
| `dashboard` | "Dashboard" | `components/contact/ContactDashboard.tsx` (eager) | contact overview **+ embedded mini open-activities preview + mini historik preview** (same pattern as account's "Kund" tab) |
| `activities` | "Aktiviteter" | `components/contact/ContactActivitiesTab.tsx` (lazy) | Aktivitet — full activity list for this contact, plus an email sub-section (`emailRows()`, `ContactActivitiesTab.tsx:335`) |
| `opportunities` | "Affärer" | `components/contact/ContactOpportunitiesTab.tsx` (lazy) | Affär/deal, **open pipeline view** |
| `sales` | "Försäljning" | `components/contact/ContactSalesTab.tsx` (lazy) | Affär/deal, **closed/won financial rollup** |
| `dokument` | "Dokument" | `components/contact/ContactDocumentsTab.tsx` (lazy) | Dokument |

**Same "two lenses on one dataset" pattern found on account detail repeats
here exactly**: `ContactOpportunitiesTab.tsx:5` and `ContactSalesTab.tsx:7`
both call `getDealsForContact` (`src/lib/db/deals.ts`) against the same
`DBDealWithStage[]` — Affärer = pipeline/stage view, Försäljning = closed
rollup. This is now a **confirmed cross-entity pattern** (account + contact
both split one deal query into an "open pipeline" tab and a "closed
financials" tab), not a one-off.

Contact detail has **no "Historik" tab** — unlike account detail, there is no
audit-log surface for a contact record; the only history-flavoured surface is
the dashboard's own inline preview (below), which is a different, non-shared
implementation (not `AuditLogTimeline`).

**Contact sidebar** (`components/contact/ContactSidebar.tsx`) — quick-info
rail plus a single free-text "note" field (`sidebar.addNote` /
`contact.note.*`, not a list of Anteckningar records). No deals/activities
sub-list embedded.

### Empty states found

| Surface | Empty text (sv) | Source |
|---|---|---|
| Opportunities tab (no deals) | "Inga affärer" / "När kontakten kopplas till affärer visas de här." | `contact.ts:129-130`, rendered `ContactOpportunitiesTab.tsx:114-116` |
| Sales tab (no closed deals) | "Ingen avslutad försäljning ännu" / "När kontakten får en vunnen affär visas försäljningen här." | `contact.ts:133-134`, rendered `ContactSalesTab.tsx:141-143` |
| Documents tab | "Inga dokument ännu" / "Ladda upp ett dokument så visas det i kontaktens arkiv här." | `contact.ts:92-94`, rendered `ContactDocumentsTab.tsx:81-83` |
| Activities tab | "Ingen historik ännu" / "När kontaktens aktiviteter loggas visas historiken här." | `contact.ts:68-69` (`contact.activities.emptyTitle`), rendered `ContactActivitiesTab.tsx:203-205` |
| Dashboard tab — inline open-activities preview | "Kontakten har inga öppna aktiviteter" | `contact.ts:49` (`contact.dashboard.noOpenActivities`) |
| Dashboard tab — inline historik preview | "Ingen historik än" | `contact.ts:56` (`contact.dashboard.noHistory`), rendered around `ContactDashboard.tsx:409` (`groupedEvents().length === 0`) |

---

## 3. Deal detail (`/deals/$dealId`) — embedded surfaces

Route: `src/routes/deals/$dealId.tsx`. Unlike account/contact, this is **not
tabbed** — it's a single scrolling detail with always-visible sections
(`$dealId.tsx:37-40` imports, rendered `:573-690`):

| Section | Component | Entity shown |
|---|---|---|
| Read/edit deal fields | `DealReadSection.tsx` / `DealEditSection.tsx` | deal fields |
| Activities list (embedded in `DealReadSection`) | `DealReadSection.tsx:224-254` | Aktivitet — this deal's activities, clicking one opens `AktivitetDetailDrawer` (shared component, also used from account HomeTab) |
| History (embedded in `DealReadSection`) | `AuditLogTimeline` via `DealReadSection.tsx:4,262` | audit log — same shared component as account's "Historik" tab |
| Quotes | `DealQuotesSection.tsx` | Offert — quotes tied to this deal |
| Documents | `DealDocumentsSection.tsx` | Dokument |

This is the cleanest embedding pattern found: activities and history both
reuse the exact same shared components used elsewhere (`AktivitetDetailDrawer`,
`AuditLogTimeline`), rather than reimplementing.

### Empty states found

| Surface | Empty text (sv) | Source |
|---|---|---|
| Activities list | "Inga aktiviteter." | `DealReadSection.tsx:226` (inline literal, not an i18n key) |
| Quotes section | "Inga offerter ännu." | `DealQuotesSection.tsx:45` (inline literal) |
| Documents section | "Inga dokument ännu." | `DealDocumentsSection.tsx:36` (inline literal) |
| Quote line items (inside `/offerter/$quoteId`, one level further down) | "Inga rader ännu." | `routes/offerter/-sections/QuoteLinesSection.tsx:273` (inline literal) |

Note: deal-detail's three empty strings are hardcoded Swedish literals, not
`t('...')` i18n keys, unlike almost every other surface in this inventory —
worth flagging for consistency (i18n coverage gap), independent of the
duplication question.

---

## 4. Project detail (`/projekt/$projektId`) — embedded surfaces

Route: `src/routes/projekt/$projektId.tsx`. Only two tabs, both membership
managers, not activity/deal/document tabs:

| Tab id | Label (sv) | Component | Entity shown |
|---|---|---|---|
| `foretag` | "Företag ({{count}})" | `AccountMembersTab` (in-file, `$projektId.tsx:303`) | Företag/account — accounts that are members of this project |
| `kontakter` | "Kontakter ({{count}})" | `ContactMembersTab` (in-file, `$projektId.tsx:474`) | Kontaktperson — contacts that are members |

Project is the one core entity with **no** embedded Aktiviteter/Affärer/
Dokument/Historik surface anywhere — it's purely a membership/segmentation
container, confirming `02-view-inventory-duplication.md`'s description
("custom SlayCRM entity, not in Upsales export").

### Empty states found

| Surface | Empty text (sv) | Source |
|---|---|---|
| Företag tab, project has zero member accounts | "Inga företag tillagda ännu. Klicka \"Lägg till företag\" för att börja." | `lib/i18n/locales/sv/project.ts:24-25`, rendered `$projektId.tsx:330-335` |
| Företag tab, search yields no hits (has members, none match) | "Inga träffar för din sökning." | `project.ts:28`, same `Show` block |
| Kontakter tab, zero member contacts | "Inga kontakter tillagda ännu. Klicka \"Lägg till kontakt\" för att börja." | `project.ts:26-27`, rendered `$projektId.tsx:503-508` |
| Kontakter tab, search yields no hits | "Inga träffar för din sökning." | `project.ts:28` |
| `/projekt` list, zero projects at all | "Inga projekt. Skapa ett projekt för att segmentera företag och kontakter." | `project.ts:5-6` (`project.empty`), rendered `routes/projekt/index.tsx:158-162` |

---

## 5. Global search (`/avancerad-sokning`) — 5 focus tabs

Route: `src/routes/avancerad-sokning/index.tsx` → `-page.tsx`. Tab set defined
by `FocusCategory` (`-page-support.tsx:99-104`): `foretag`,
`kontaktpersoner`, `forsaljning` (deals), `aktiviteter`, `moten`. Rendered by
`-sections/ResultsPanel.tsx:62-195` plus an all-category overview screen
(`-sections/ResultsOverview.tsx`) shown before a tab is focused.

Confirms the caveat already on record in `02-view-inventory-duplication.md`
cluster 4: **Företag/Kontaktpersoner/Försäljning tabs are server-paged and
live; Aktiviteter/Möten tabs filter a hardcoded client-side seed array**, so
their "loading" and "no results" states are cosmetic — they never reflect the
tenant's real data.

### Empty states found (all via shared `EmptyState` component, `ResultsPanel.tsx`)

| Surface / tab | Empty text (sv) | Source |
|---|---|---|
| Overview screen, zero hits across all categories | loading: "..." / no results: per `avanceradSokning.overview.noResults` | `ResultsOverview.tsx:140-150`, keys in `lib/i18n/locales/sv/avanceradSokning.ts` (overview section) |
| Aktiviteter tab, seed still loading | "Laddar aktiviteter" / "Resultaten visas här så snart listan är redo." | `avanceradSokning.ts:79,81`, rendered `ResultsPanel.tsx:62-72` |
| Aktiviteter tab, zero matches | "Inga aktiviteter" / "Testa att justera filtren eller byt flik för att hitta rätt resultat." | `avanceradSokning.ts:82,84-85`, rendered `ResultsPanel.tsx:74-83` |
| Möten tab, loading | "Laddar möten" / same loading subtitle | `avanceradSokning.ts:80,81`, rendered `ResultsPanel.tsx:90-100` |
| Möten tab, zero matches | "Inga möten" / same filter hint | `avanceradSokning.ts:83,84-85`, rendered `ResultsPanel.tsx:102-111` |
| Försäljning tab, no query yet | "Ange sökterm" / "Klicka Sök för att visa försäljning som matchar din fråga." | `avanceradSokning.ts:86-88`, rendered `ResultsPanel.tsx:118-128` |
| Försäljning tab, query with zero hits | "Inga resultat" / "Försök med en bredare sökterm eller justera filtren." | `avanceradSokning.ts:93-94`, rendered `ResultsPanel.tsx:130-139` |
| Företag tab, no query yet | "Ange sökterm" / "Klicka Sök för att visa företag som matchar din fråga." | `avanceradSokning.ts:86,89-90`, rendered `ResultsPanel.tsx:146-156` |
| Företag tab, query with zero hits | "Inga resultat" / same subtitle | `avanceradSokning.ts:93-94`, rendered `ResultsPanel.tsx:158-167` |
| Kontaktpersoner tab, no query yet | "Ange sökterm" / "Klicka Sök för att visa kontaktpersoner som matchar din fråga." | `avanceradSokning.ts:86,91-92`, rendered `ResultsPanel.tsx:174-184` |
| Kontaktpersoner tab, query with zero hits | "Inga resultat" / same subtitle | `avanceradSokning.ts:93-94`, rendered `ResultsPanel.tsx:186-195` |

---

## 6. Shared modals that display or edit a record

- **`components/AktivitetDetailDrawer.tsx`** — lightweight read view of a
  single Aktivitet (subject, type, date, "mark done" action). Used from
  `components/account/HomeTab.tsx` (clicking an open-activity preview row)
  and `routes/deals/$dealId.tsx` (`selectedActivity`, clicking a row in
  `DealReadSection`'s embedded activity list). Confirmed canonical shared
  component, imported by both call sites, not copy-pasted.
- **`routes/activities/-activity-detail-modal.tsx`** — a **second, separate**
  activity modal: full edit form (subject, account/contact/deal linkage via
  `listAccounts`/`listContacts`/`listDeals`, `CommentThread`). Used only from
  `routes/activities/-page.tsx` (the `/aktiviteter` list). Does **not** share
  code with `AktivitetDetailDrawer` — two independently-built "view an
  activity" surfaces exist in the app, one thin (drawer, from account/deal
  context) and one full (modal, from the aktiviteter list), with no shared
  base component. Not necessarily wrong (different jobs: quick-peek vs full
  edit) but worth knowing before "unify the activity modal" work starts,
  since there are two to unify, not one to reuse.
- **`components/NyForsaljningModal.tsx`** — "Ny försäljning" create-deal
  modal, invoked from `ContactOpportunitiesTab.tsx`, `OrdersTab.tsx`, and
  `OpportunitiesTab.tsx` (account). It does **not** reuse `CreateDealForm`
  (the component backing the full-page `/deals/new` route) — it calls
  `createDeal`/`getDealStages`/`listProducts` directly itself
  (`NyForsaljningModal.tsx:6-10`). So deal *creation* also has two
  independent implementations: a full-page form and a modal triggered from
  account/contact tabs. Flagged for completeness — this audit's focus is
  display surfaces/empty states, but the same "two lenses, no shared base"
  pattern recurs here on the write side.

---

## Surface × entity matrix

Rows are every surface found; "canonical" routes are marked, embedded
surfaces show their nesting path. ✓ = entity rendered there.

| Surface (file) | Företag | Kontaktperson | Aktivitet | Affär | Offert | Projekt | Dokument |
|---|---|---|---|---|---|---|---|
| `/accounts` list (`routes/accounts/index.tsx` + `-sections/AccountsTableSection.tsx`) | ✓ | | | | | | |
| `/accounts/$id` → "Kund" tab (`HomeTab.tsx`) | ✓ | | ✓ (preview) | | | | |
| `/accounts/$id` → "Kontaktpersoner" tab (`ContactsTab.tsx`) | | ✓ | | | | | |
| `/accounts/$id` → "Aktiviteter" tab (`ActivitiesTab.tsx`) | | | ✓ | | | | |
| `/accounts/$id` → "Affärer" tab (`OpportunitiesTab.tsx`) | | | | ✓ | | | |
| `/accounts/$id` → "Försäljning" tab (`OrdersTab.tsx`) | | | | ✓ | | | |
| `/accounts/$id` → "Dokument" tab (`DocumentsTab.tsx`) | | | | | | | ✓ |
| `/accounts/$id` → "Historik" tab (`HistorikTab.tsx`→`AuditLogTimeline`) | | | | | | | |
| `/contacts` list (`routes/contacts/index.tsx`) | | ✓ | | | | | |
| `/contacts/$id` → "Dashboard" tab (`ContactDashboard.tsx`) | | ✓ | ✓ (preview) | | | | |
| `/contacts/$id` → "Aktiviteter" tab (`ContactActivitiesTab.tsx`) | | | ✓ | | | | |
| `/contacts/$id` → "Affärer" tab (`ContactOpportunitiesTab.tsx`) | | | | ✓ | | | |
| `/contacts/$id` → "Försäljning" tab (`ContactSalesTab.tsx`) | | | | ✓ | | | |
| `/contacts/$id` → "Dokument" tab (`ContactDocumentsTab.tsx`) | | | | | | | ✓ |
| `/deals` list (`routes/deals/index.tsx`) | | | | ✓ | | | |
| `/deals/board` (`routes/deals/board.tsx`) | | | | ✓ | | | |
| `/deals/$dealId` → read/edit section | | | | ✓ | | | |
| `/deals/$dealId` → activities list (`DealReadSection.tsx`) | | | ✓ | | | | |
| `/deals/$dealId` → history (`AuditLogTimeline`) | | | | | | | |
| `/deals/$dealId` → quotes (`DealQuotesSection.tsx`) | | | | | ✓ | | |
| `/deals/$dealId` → documents (`DealDocumentsSection.tsx`) | | | | | | | ✓ |
| `/offerter` list | | | | | ✓ | | |
| `/offerter/$quoteId` → header/form/lines/snapshot | | | | ✓ (parent deal ref) | ✓ | | |
| `/projekt` list | | | | | | ✓ | |
| `/projekt/$projektId` → "Företag" tab (`AccountMembersTab`) | ✓ | | | | | ✓ | |
| `/projekt/$projektId` → "Kontakter" tab (`ContactMembersTab`) | | ✓ | | | | ✓ | |
| `/aktiviteter` (dashboard/list) | | | ✓ | | | | |
| `/avancerad-sokning` → overview | ✓ | ✓ | ✓ | ✓ | | | |
| `/avancerad-sokning` → Företag tab | ✓ | | | | | | |
| `/avancerad-sokning` → Kontaktpersoner tab | | ✓ | | | | | |
| `/avancerad-sokning` → Försäljning tab | | | | ✓ | | | |
| `/avancerad-sokning` → Aktiviteter tab (seed, not live) | | | ✓ | | | | |
| `/avancerad-sokning` → Möten tab (seed, not live) | | | ✓ (meeting) | | | | |
| `AktivitetDetailDrawer` (modal, from account+deal) | | | ✓ | | | | |
| `-activity-detail-modal.tsx` (modal, from `/aktiviteter`) | ✓ (linkage) | ✓ (linkage) | ✓ | ✓ (linkage) | | | |
| `NyForsaljningModal` (modal, from account+contact tabs) | | | | ✓ (create) | | | |

---

## Per-entity "where it appears"

### Företag / account
- `/accounts` list — **[canonical]** the primary list, own `EmptyState`.
- `/accounts/$id` "Kund" tab — **[canonical]** the record's own detail.
- `/projekt/$projektId` → "Företag" tab — **[contextual—justified]** project
  membership is a genuinely different question (which accounts are grouped
  into this project) than the accounts list.
- `/avancerad-sokning` → Företag tab / overview — **[contextual—justified]**
  cross-entity search, narrower filters than the list but a different job
  (find, not manage).
- No embedded "accounts inside a deal/contact/quote" surface exists — accounts
  are the top of the hierarchy here, never nested under another entity's tab.

### Kontaktperson / contact
- `/contacts` list — **[canonical]**.
- `/contacts/$id` "Dashboard" tab — **[canonical]** own detail.
- `/accounts/$id` → "Kontaktpersoner" tab (`ContactsTab.tsx`) —
  **[contextual—justified]** the account-archetype embedding this whole audit
  was scoped to find: contacts scoped to one company.
- `/projekt/$projektId` → "Kontakter" tab — **[contextual—justified]** project
  membership, same reasoning as Företag above.
- `/avancerad-sokning` → Kontaktpersoner tab — **[contextual—justified]**.
- Not embedded inside deal or quote detail (a deal references a contact as a
  field, not as a sub-list) — no redundant contact surface found there.

### Aktivitet / activity — the entity with the most surfaces
- `/aktiviteter` — **[canonical]** primary list/dashboard.
- `/accounts/$id` → "Aktiviteter" tab (`ActivitiesTab.tsx`, full list) —
  **[contextual—justified]** account-scoped activity history.
- `/accounts/$id` → "Kund" tab open-activities preview (`HomeTab.tsx:296-312`)
  — **[redundant?]** a second, smaller rendering of the same open-activities
  slice already fully covered by the "Aktiviteter" tab one click away, inside
  the same detail page.
- `/contacts/$id` → "Aktiviteter" tab (`ContactActivitiesTab.tsx`) —
  **[contextual—justified]** contact-scoped.
- `/contacts/$id` → "Dashboard" tab open-activities preview — **[redundant?]**
  same pattern as account's, a duplicate mini-view of data one tab away.
- `/deals/$dealId` → embedded activities list (`DealReadSection.tsx:224-254`)
  — **[contextual—justified]** deal-scoped, reuses `AktivitetDetailDrawer`
  cleanly.
- `/avancerad-sokning` → Aktiviteter tab — **[redundant? / broken]** not
  `[contextual—justified]` like the others: this tab is wired to a **hardcoded
  client-side seed array**, not live tenant data (confirmed in
  `02-view-inventory-duplication.md` cluster 4). A user's real activities
  never appear here regardless of tenant. This is the strongest "usually
  empty / actively misleading" candidate in the whole inventory — it's not
  that it's *usually* empty, it's that it can **never** show real results.
- Two independent "view/edit an activity" **modals** exist
  (`AktivitetDetailDrawer` vs `routes/activities/-activity-detail-modal.tsx`)
  — see section 6.

### Affär / deal
- `/deals` list — **[canonical]** flat sortable list.
- `/deals/board` — **[canonical]** kanban, same `order` data, different job
  (already confirmed non-duplicate in `02-view-inventory-duplication.md`
  cluster 3).
- `/deals/$dealId` — **[canonical]** own detail.
- `/accounts/$id` → "Affärer" tab (`OpportunitiesTab.tsx`) —
  **[contextual—justified]** account-scoped open pipeline.
- `/accounts/$id` → "Försäljning" tab (`OrdersTab.tsx`) — **[redundant?]**
  same underlying `getAccountDeals` rows as "Affärer" tab, re-sliced by
  closed/won + grouped by year. Two full tabs for one query result, both
  reachable from the same detail page — the strongest structural duplication
  candidate found (see below).
- `/contacts/$id` → "Affärer" tab (`ContactOpportunitiesTab.tsx`) —
  **[contextual—justified]** contact-scoped open pipeline.
- `/contacts/$id` → "Försäljning" tab (`ContactSalesTab.tsx`) —
  **[redundant?]** identical relationship to Affärer as the account-detail
  case, same `getDealsForContact` source.
- `/avancerad-sokning` → Försäljning tab — **[contextual—justified]**, live.
- `/offerter/$quoteId` — references its parent deal but doesn't render a deal
  list; not counted as a duplicate deal surface.
- `NyForsaljningModal` — a *second* create-deal implementation parallel to
  `/deals/new`'s `CreateDealForm` (write-side note, section 6).

### Offert / quote
- `/offerter` list — **[canonical]**.
- `/offerter/$quoteId` — **[canonical]** own detail (breadcrumb, form, line
  items, snapshot sections).
- `/deals/$dealId` → `DealQuotesSection.tsx` — **[contextual—justified]**
  deal-scoped quotes, the archetype "affär embedded under another entity" in
  reverse (quote embedded under deal). No account/contact detail embeds a
  quotes tab directly — quotes are only reachable via their parent deal.

### Projekt / project
- `/projekt` list — **[canonical]**.
- `/projekt/$projektId` — **[canonical]** own detail (Företag/Kontakter
  membership tabs).
- Not embedded anywhere else — no account/contact/deal detail shows "which
  projects is this in." One-directional membership UI, entity with the
  fewest surfaces (2 total, both canonical).

---

## Empty-state catalogue (consolidated)

All entries already cited with `path:line` in sections 1-5 above; this table
collects them in one place, plus the usually-empty-façade judgment.

| Surface | Empty text (sv, verbatim) | Component/file | Usually-empty façade? |
|---|---|---|---|
| Account → Affärer tab | "Inga affärer ännu" / "Skapa en ny affär för att börja följa pipeline här." | `OpportunitiesTab.tsx:449` (`account.ts:124`) | n — real pipeline data |
| Account → Försäljning tab | "Ingen försäljning ännu" / "När affärer stängs syns sammanställningen här." | `OrdersTab.tsx:156,222` (`account.ts:106`) | possibly — many accounts have open deals but no *closed* ones yet; second lens on data already shown |
| Account → Dokument tab | "Inga filer" | `DocumentsTab.tsx:481` (`account.ts:59`) | n |
| Account → Kund tab, open-activities preview | "Företaget har inga öppna aktiviteter" | `HomeTab.tsx:305` (`account.ts:82`) | y — duplicate of Aktiviteter tab's own emptiness |
| Account → Kund tab, historik preview | "Ingen historik än" | `HomeTab.tsx:534` (`account.ts:89`) | y — duplicate of Historik tab |
| Account → Historik tab | "Inga ändringar" / "När någon uppdaterar posten visas historiken här." | `AuditLogTimeline.tsx:244` (`common.ts:29`) | n |
| Account → Aktiviteter tab | *(none — no empty-state guard found)* | `ActivitiesTab.tsx` | unknown — silently renders empty table |
| Account → Kontaktpersoner tab | *(none — no empty-state guard found)* | `ContactsTab.tsx` | unknown — silently renders empty table |
| Contact → Affärer tab | "Inga affärer" / "När kontakten kopplas till affärer visas de här." | `ContactOpportunitiesTab.tsx:114` (`contact.ts:129`) | n |
| Contact → Försäljning tab | "Ingen avslutad försäljning ännu" / "När kontakten får en vunnen affär visas försäljningen här." | `ContactSalesTab.tsx:141` (`contact.ts:133`) | possibly — same second-lens concern as account's Försäljning |
| Contact → Dokument tab | "Inga dokument ännu" / "Ladda upp ett dokument så visas det i kontaktens arkiv här." | `ContactDocumentsTab.tsx:81` (`contact.ts:92`) | n |
| Contact → Aktiviteter tab | "Ingen historik ännu" / "När kontaktens aktiviteter loggas visas historiken här." | `ContactActivitiesTab.tsx:203` (`contact.ts:68`) | n |
| Contact → Dashboard tab, open-activities preview | "Kontakten har inga öppna aktiviteter" | (`contact.ts:49`) | y — duplicate of Aktiviteter tab |
| Contact → Dashboard tab, historik preview | "Ingen historik än" | (`contact.ts:56`) | y — duplicate feed, and contact has no dedicated Historik tab to even point to |
| Deal → activities list | "Inga aktiviteter." | `DealReadSection.tsx:226` (inline, no i18n key) | n |
| Deal → quotes section | "Inga offerter ännu." | `DealQuotesSection.tsx:45` (inline) | n |
| Deal → documents section | "Inga dokument ännu." | `DealDocumentsSection.tsx:36` (inline) | n |
| Quote → line items | "Inga rader ännu." | `QuoteLinesSection.tsx:273` (inline) | n |
| Project → Företag tab (no members) | "Inga företag tillagda ännu. Klicka \"Lägg till företag\" för att börja." | `$projektId.tsx:333` (`project.ts:24`) | n |
| Project → Kontakter tab (no members) | "Inga kontakter tillagda ännu. Klicka \"Lägg till kontakt\" för att börja." | `$projektId.tsx:506` (`project.ts:26`) | n |
| Project → either tab, search no-hits | "Inga träffar för din sökning." | `project.ts:28` | n |
| `/projekt` list | "Inga projekt. Skapa ett projekt för att segmentera företag och kontakter." | `routes/projekt/index.tsx:158` (`project.ts:5`) | n |
| `/accounts` list | "Inga företag hittades" / "Prova en bredare sökning eller justera filtren." | `AccountsTableSection.tsx:65` (inline, in `-sections/`, **not** in `routes/accounts/index.tsx` itself) | n |
| `/contacts` list | via shared `EmptyState`, `routes/contacts/index.tsx:417` | — | n |
| `/deals` list | `dealsPage.empty` / `dealsPage.emptySubtitle` — "Inga affärer hittades." / "Skapa en affär för att komma igång." | `routes/deals/index.tsx:176` (`dealsPage.ts:35,17`) | n |
| `/offerter` list | "Inga offerter att visa" | `routes/offerter/index.tsx:247` (`offerter.ts:9`) | n |
| Search overview (zero hits across categories) | per `avanceradSokning.overview.noResults` (loading vs empty variants) | `ResultsOverview.tsx:140` | n |
| Search → Aktiviteter tab | "Inga aktiviteter" / "Testa att justera filtren eller byt flik..." | `ResultsPanel.tsx:74` (`avanceradSokning.ts:82,84`) | **y — structurally, this tab can never show real data** (seed array, not live query) |
| Search → Möten tab | "Inga möten" / same filter hint | `ResultsPanel.tsx:102` (`avanceradSokning.ts:83,84`) | **y — same as above** |
| Search → Försäljning/Företag/Kontaktpersoner tabs, no query | "Ange sökterm" + entity-specific subtitle | `ResultsPanel.tsx:118,146,174` (`avanceradSokning.ts:86-92`) | n — expected pre-search state |
| Search → Försäljning/Företag/Kontaktpersoner tabs, zero hits | "Inga resultat" / "Försök med en bredare sökterm eller justera filtren." | `ResultsPanel.tsx:130,158,186` (`avanceradSokning.ts:93-94`) | n |

---

## Redundancy candidates, ranked

1. **`/avancerad-sokning` → Aktiviteter and Möten tabs** — highest-confidence
   candidate for removal/hiding, already flagged in
   `02-view-inventory-duplication.md` cluster 4 but reconfirmed here from the
   empty-state angle: these two tabs are not merely *often* empty, they are
   **structurally incapable of ever showing real tenant data** (hardcoded
   seed array per `-page-support.tsx`'s `activities()` helper). Every other
   tab on the same page is live. Either wire them to real queries or hide the
   two tabs (and their nav-adjacent entry points) until they are.

2. **Account "Försäljning" tab vs "Affärer" tab, and the identical Contact
   "Sales" vs "Opportunities" tab** — both pairs read the exact same deal
   query (`getAccountDeals` / `getDealsForContact`) and re-present it: one as
   a stage-filtered pipeline list, one as a closed/won year-grouped rollup.
   Recommend collapsing into **one tab with a view toggle** ("Alla / Aktiva /
   Förlorade / Avslutade" filter chips, akin to what `OpportunitiesTab`
   already does internally at `OpportunitiesTab.tsx:284-288`) rather than two
   separate tabs — halves the account-detail and contact-detail tab count
   (7→6 and 5→4) with no data loss, and removes one of the two "second lens,
   usually thinner" empty states per entity.

3. **Home/Dashboard landing-tab inline previews** (account "Kund" tab's
   open-activities + historik mini-feeds; contact "Dashboard" tab's identical
   pair) — both duplicate data one click away in the dedicated "Aktiviteter"
   and "Historik" tabs, using **separate, non-shared** empty-state copy and
   (for historik) a separate, non-shared implementation from
   `AuditLogTimeline`. If the home tab is meant as an at-a-glance summary,
   fine — but the historik preview on both account and contact is a second
   hand-rolled implementation of a feed the shared `AuditLogTimeline`
   component already renders correctly elsewhere. Recommend either (a)
   reusing `AuditLogTimeline` in "compact" mode for both previews, or (b)
   dropping the preview and linking straight to the tab.

4. **Two independent "view an activity" modals** (`AktivitetDetailDrawer` vs
   `routes/activities/-activity-detail-modal.tsx`) — not an empty-state issue
   but a build-twice risk: whoever next touches "the activity modal" needs to
   know there are two, serving different contexts (account/deal quick-peek
   vs the `/aktiviteter` list's full edit). Worth a decision on whether the
   full modal should replace the drawer everywhere, or whether the split is
   intentional and should be documented as such.

5. **Two independent "create a deal" surfaces** (`CreateDealForm` at
   `/deals/new` vs `NyForsaljningModal` invoked from account/contact tabs) —
   write-side analogue of #4, lower priority since this audit's brief is
   display surfaces, but flagged because it means a future "add a field to
   deal creation" change has to be made twice.

6. **Account → Aktiviteter tab and Account → Kontaktpersoner tab have no
   empty-state guard at all** (`ActivitiesTab.tsx`, `ContactsTab.tsx`) —
   not a redundancy but a gap: every other account tab has a proper
   `EmptyState`; these two silently render an empty table/list. Lower
   priority than the structural duplicates above, but cheap to fix and
   inconsistent with the rest of the page.

---

## Count

- `02-view-inventory-duplication.md` counted **34 routes**.
- This audit adds **32 embedded/nested display surfaces** found one or more
  levels inside 5 of those routes (account detail: 9, contact detail: 7, deal
  detail: 5, project detail: 2, quote detail: 1, global search: 6) plus 2
  shared modals reachable from multiple parents (`AktivitetDetailDrawer`,
  `-activity-detail-modal.tsx`) and 1 duplicate create-modal
  (`NyForsaljningModal`) noted for completeness.
- **Total distinct places a core entity renders: ~64** (34 routes + 32
  embedded surfaces, with sidebars/rails counted but contributing no entity
  lists of their own).
- Of those, **6 are flagged `[redundant?]`** in the per-entity breakdown
  above (2 seed-data search tabs structurally incapable of showing real data,
  2 second-lens deal tabs duplicating account/contact pipeline data, 2
  home/dashboard inline previews duplicating dedicated tabs) — roughly **9%**
  of all surfaces found, concentrated entirely in account detail, contact
  detail, and global search. Deal detail, project detail, and quote detail
  had zero redundant surfaces — their embedded sections all reuse shared
  components (`AuditLogTimeline`, `AktivitetDetailDrawer`) cleanly.

