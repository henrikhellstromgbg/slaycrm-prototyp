# SlayCRM navigation IA — current state vs. prior audit findings

Source read: `/Users/henrikhellstrom/sites/slaycrm/repo-main/src/` at commit
**`e73ca0d`** (2026-07-09) — `feat(#crm-46spf): port Henrik's Datum filter popover + two-step calendar (#301)`.

**Stack correction:** the brief describes the stack as "TanStack Router + React". The
actual code is **SolidJS 1.9** (`solid-js`, `@tanstack/solid-router`, `@tanstack/solid-start`),
not React. `src/lib/i18n`, `nav-registry.ts`, `Topbar.tsx`, `BottomTabBar.tsx` etc. all use
Solid primitives (`createSignal`, `Show`, `For`). Noted because it affects how literally
any React-specific reasoning about this app should be trusted — there is none needed here,
but worth flagging since the task brief states it wrong.

---

## Part 1 — Current navigation tree

### Root shell composition

`src/routes/__root.tsx` composes, in order:
`ServerGate` (dev-agent identity gate, `-root-gates.tsx`) → `RootErrorBoundary`
(`-root-boundaries.tsx`) → `RootProviders` (`I18nProvider` + `AuthGate`,
`-root-providers.tsx`) → `AppShell` (`src/components/AppShell.tsx`) → `RouteErrorBoundary`
→ `<Outlet/>`. Head tags and dev-only devtools live in `-root-chrome.tsx`. This is a clean
1:1 decomposition of what used to be one file (per its own comments, "ADR-0020
decomposition") — no IA content lives in these files themselves; they only decide *when*
chrome renders, not *what* is in it.

`AppShell.tsx` (`useCrmChrome()`, lines 43-60) suppresses all CRM chrome (Topbar, bottom
tab bar, banners, feedback button) on `/login`, `/pending-access`, `/operator-mfa`,
`/platform*`, and public marketing paths. Everywhere else gets the full chrome.

`/platform` is a fully separate shell (`src/components/OperatorShell.tsx`) for platform
operators (tenant-less admins) — its own header, no Topbar/BottomTabBar, own
impersonation controls. It is architecturally outside the tenant-facing nav tree entirely
and is not discussed further below.

### The nav registry — single source of truth

`src/lib/nav-registry.ts` is a data table (`NAV_REGISTRY`, 9 entries) that both
`Topbar.tsx` (desktop subnav) and `BottomTabBar.tsx` / `bottom-nav.ts` (mobile) read from.
Each entry carries: route (`to`), label, a feature `gate`, `matchPrefixes` (for active-state
highlighting), and optional `topbar` config (desktop subnav membership) and `mobile` config
(`primaryTab` / `primaryDestination` / `more`). An entry with neither `topbar` nor `mobile`
set is invisible everywhere except direct URL — that combination occurs once (Admin has no
`topbar`; Projekt has no `mobile`, see below).

### Desktop navigation tree (chrome shown on ≥ ~480px per the container query)

```
Topbar (primary bar, dark)
├─ Logo → /aktiviteter
├─ Global search (TopbarGlobalSearch.tsx) — inline preview over accounts/contacts/deals
│    ⏎ / "Visa alla resultat" → /avancerad-sokning (not a persistent nav link, only reachable this way or by URL)
├─ Notifications (TopbarNotifications)
└─ Profile menu (TopbarProfileMenu, avatar dropdown)
     ├─ Admin  → /admin   (rendered ONLY if currentUser.is_admin — this is the ONLY
     │                      desktop entry point to /admin; code comment confirms:
     │                      "Admin lives only here on desktop — there is no admin
     │                      entry in the top subnav", TopbarProfileMenu.tsx:189-192)
     ├─ Stop impersonation (conditional)
     └─ Logout

Topbar (subnav bar, white) — TOPBAR_SUBNAV_ITEMS, in NAV_REGISTRY declaration order,
each individually feature-gated:
├─ Aktiviteter        → /aktiviteter   (gate: nav_dashboard)
├─ Företag            → /accounts     (gate: nav_accounts)
├─ Kontaktpersoner    → /contacts     (gate: nav_contacts)
├─ Projekt            → /projekt      (gate: nav_projekt)
├─ Affärer            → /deals        (gate: nav_deals)
├─ Säljtavlan         → /deals/board  (gate: nav_saljtavlan)
└─ Offerter           → /offerter     (gate: nav_offerter)
```

`Admin` and `Sök` (advanced search) have no `topbar` entry at all in the registry — they
are structurally excluded from the subnav, not merely hidden by a gate.

### Detail-view sub-nav (drill-in only, not part of the sidebar/topnav tree)

Each entity's detail page has its own internal tab strip, and the patterns are not
consistent with each other:

- **Account detail** (`/accounts/$id`, `routes/accounts/-page.tsx`): tabs `home`,
  `contacts`, `activities`, `opportunities`, `orders`, `documents`, `history`.
- **Contact detail** (`/contacts/$id`, `src/components/contact/ContactTabNav.tsx`): tabs
  `dashboard`, `activities`, `opportunities`, `sales`, `dokument`.
- **Projekt detail** (`/projekt/$projektId`): two tabs, `foretag` / `kontakter`.
- **Deal detail** (`/deals/$dealId`): **no tabs** — one stacked-sections page toggling
  between `DealReadSection`/`DealEditSection`, plus always-visible `DealQuotesSection` and
  `DealDocumentsSection`.
- **Quote detail** (`/offerter/$quoteId`): also **no tabs** — stacked sections
  (header/form/lines/snapshot).

So two of five detail views use a tab-strip sub-nav, two use a single scrolling page, and
the tab strips that do exist (account, contact, projekt) are three separately-coded
components with different tab vocabularies for conceptually similar data (activities,
opportunities/sales, documents/history) rather than one shared pattern.

### Mobile navigation tree (`BottomTabBar.tsx`, shown ≤480px via `@container`)

```
Bottom tab bar — 4 controls (NOT 5; see "already resolved" note in Part 2):
├─ Aktiviteter (icon ActivityIconBadge) → /aktiviteter
├─ [tab labeled "Företag"]  (icon EnterpriseIcon) → /accounts
├─ Affärer     (icon GrowthIcon)         → /deals
└─ Mer (···) — opens a bottom sheet modal
     ├─ Kontaktpersoner → /contacts
     ├─ Säljtavlan      → /deals/board
     ├─ Offerter        → /offerter
     ├─ Sök             → /avancerad-sokning   (gate feature_advanced_search, defaultLive:false)
     ├─ Admin           → /admin   (only if role admin AND feature_admin gate open)
     └─ Logout
```

**Label/naming mismatch found in code:** the second primary tab is universally called
"Kunder" in code — the variable is `KUNDER_DESTINATION`, the `TabId` union includes
`'kunder'`, comments say "Kunder (accounts+contacts)" (`BottomTabBar.tsx:50`) — but the
label actually rendered on screen is `t(KUNDER_DESTINATION.labelKey)`, and that label key
resolves to `nav.accounts` = **"Företag"** (`lib/i18n/locales/sv/nav.ts:3`), the same label
used on desktop. The Swedish string "Kunder" exists in `lib/i18n/locales/sv/bottomTabBar.ts`
(`accounts: 'Kunder'`) but that key is never referenced by any component — dead
translation key. So internally this is "the Kunder tab" but a user only ever sees
"Företag".

**Projekt has zero mobile presence.** The `projects` entry in `NAV_REGISTRY` has no
`mobile` key at all (no `primaryTab`, no `more: true`) — unlike every other live entry.
It is excluded from `MOBILE_MORE_LINKS` (`nav-registry.ts:169-171`) and from
`MOBILE_TAB_ROUTE_OWNERS` (`nav-registry.ts:196-207`). Projekt is reachable on a phone
only by typing `/projekt` directly — not from the bottom tab bar, not from the "Mer"
sheet.

### Global quick-create / command palette

**None exists.** The topbar primary bar has only: logo, global search, notifications,
profile menu — no "+ New" button, no keyboard-shortcut command palette. Creation is
per-entity: `/accounts/new`, `/contacts/new`, `/deals/new` exist as routes but are only
reachable via an in-page "+" CTA button on each list view (e.g. `contacts.tab.add` inside
`ContactTabNav.tsx`), never from global chrome. There is no single place to "just create
something" regardless of what page you're on.

### Routes that exist but are NOT in any nav surface (buried/orphan)

| Route | Status |
|---|---|
| `/app` | Redirect-only stub → `/aktiviteter` (`beforeLoad: () => redirect`). Legacy dashboard route, code (`-page-support.tsx`, `-empty-state.ts`) still present but unreachable/unrendered. |
| `/activities` | Redirect-only stub → `/aktiviteter`. Legacy alias for the pre-merge Aktiviteter page. |
| `/email`, `/email/mallar` | Redirect-only stub → `/aktiviteter`. Out of V1 scope per `docs/v1-scope.md` (mocked façade, 0 rows in Bauer DB). |
| `/kampanjer` | Redirect-only stub → `/aktiviteter`. Out of V1 scope. |
| `/kundportfolj` | Redirect-only stub → `/aktiviteter`. Out of V1 scope. |
| `/hitta-nya-kunder` | Redirect-only stub → `/aktiviteter`. Out of V1 scope. |
| `/rapportcenter`, `/rapportcenter/$id` | Redirect-only stub → `/aktiviteter`. Out of V1 scope. |
| `/signals` | Redirect-only stub → `/aktiviteter`. Out of V1 scope. |
| `/admin` | Live, real feature — reachable only via desktop profile-menu dropdown or mobile "Mer" sheet, never via primary nav on either surface. |
| `/avancerad-sokning` ("Sök") | Live-ish (gate `feature_advanced_search`, `defaultLive: false`) — no desktop subnav entry at all; reached via the global-search box's Enter/"visa alla" action, or mobile "Mer" sheet. |
| `/projekt` | Live, in desktop subnav — **entirely absent from mobile nav** (see above), a stricter form of "buried" than anything else in the tree. |
| `/accounts/new`, `/contacts/new`, `/deals/new` | Live create routes, reachable only from an in-page CTA on the corresponding list, never from global chrome. |
| `/platform` | Live, but architecturally a separate app (OperatorShell) for platform operators, not part of the tenant nav tree. |

---

## Part 2 — What prior audits already flagged (IA-relevant)

Prior audits read: `frontend-map.md`, `nav-audit.md`, `ux-audit-2026-06-22.md`,
`mobile-audit.md`, `layout-spec.md` — all dated 2026-06-22 to 2026-06-24. Main has since
moved to `e73ca0d` (2026-07-09), ~2.5 weeks and evidently a substantial refactor later.
Below, each finding is quoted with its source, grouped by theme, and marked against
current main.

### Navigation structure

- **nav-audit.md, #1** ("Two parallel navigation systems with different item sets"):
  *"Desktop top nav has 8 items. Mobile bottom tab bar has 4 items. Five items are
  entirely inaccessible from mobile: Aktiviteter, Kontaktpersoner, Projekt, Säljtavlan,
  Offerter."*
  **Partly outdated / partly still true.** The 8-item count came from Att göra +
  Aktiviteter being two separate desktop items — see the dashboard-merge finding below;
  desktop is now 7 items. Aktiviteter, Kontaktpersoner, Säljtavlan and Offerter are all
  now reachable from mobile (Aktiviteter is a primary tab; the other three are one tap
  into "Mer"). **Projekt remains genuinely unreachable from mobile** — the one item from
  this list that is still accurate, and by a stronger mechanism than in June (it isn't
  even registered for the "Mer" sheet now, see Part 1).

- **ux-audit-2026-06-22.md #4 / mobile-audit.md #3** ("Desktop subnav visible on mobile
  simultaneously with the bottom tab bar" — filed Critical/High in all three docs,
  attributed to `Topbar.tsx:34`'s inline `display:flex`):
  *"Inline `style=""` has higher specificity than any external stylesheet rule, including
  container queries... every mobile view shows both the horizontal 8-item desktop subnav
  ... and the 5-item bottom tab bar at the same time."*
  **Resolved, but not the way the audit recommended.** The audits' proposed fix was to
  delete `display:flex` from the inline style. Current main instead added an
  `!important` override in `BottomTabBar.css:163-169`
  (`.topbar-subnav { display: none !important; }`, tagged `sl-g8ax.24`, with a comment
  explicitly citing "Topbar.tsx injects a critical `display:flex` inline style... CSS
  Cascading L4 §6.3"). The inline style the audits wanted removed is still there
  unchanged in `Topbar.tsx`; the double-nav symptom is gone via a specificity fight
  instead. `frontend-map.md`'s fragility-hotspot #3 had already flagged this exact
  `!important` counter-hack as cross-component CSS coupling worth knowing about.

- **ux-audit-2026-06-22.md #10 / mobile-audit.md #4** ("Kontaktpersoner lights up
  'Kunder'/'Företag' tab when active, not 'Mer'"):
  *"the contacts entry is `more: true`... but `primaryTab: 'kunder'`... Result: users
  navigate Mer → Kontaktpersoner, land on contacts, and see the 'Företag' tab
  highlighted — not the tab they came from."*
  **Resolved.** In current `nav-registry.ts`, `MOBILE_TAB_ROUTE_OWNERS['kunder'].entryIds`
  is `['accounts']` only; `contacts` is owned by the `'more'` tab
  (`entryIds: ['contacts', 'sales-board', 'quotes', 'admin', 'advanced-search']`). Visiting
  `/contacts` now correctly activates "Mer", not "Företag".

- **ux-audit-2026-06-22.md #6 / nav-audit.md #2 / layout-spec.md** ("Säljtavlan listed as
  a peer of Affärer, should be a view toggle inside Affärer"):
  *"/deals/board is a view mode of /deals. Listing them side-by-side in the subnav... implies
  equal status, when one is a sub-route of the other."*
  **Not resolved.** `sales-board` remains its own `NAV_REGISTRY` entry with its own
  `topbar: { id: 'saljtavlan' }` slot, structurally identical to how it was in June.

- **ux-audit-2026-06-22.md #4** ("Mobile bottom tab bar is missing 5 of 8 destinations"),
  recommending *"promote Aktiviteter to a direct tab (replace Sök, which is
  lower-frequency). Move Sök to Mer."*
  **Effectively done, though the audit's own reasoning changed underneath it.** Aktiviteter
  is now a primary tab and Sök is in "Mer" — matching the recommendation — but this
  happened as a side effect of merging Att göra into Aktiviteter (see below), not as a
  standalone nav-registry edit. The bottom bar is 4 items now, not the "6 items" the
  companion `layout-spec.md` proposed (`Att göra, Aktiviteter, Företag, Affärer, Offerter,
  Sök`); it landed on a different shape than any prior doc specified.

- **nav-audit.md #3 / ux-audit-2026-06-22.md #13** ("Search has three representations,
  nav label 'Sök' vs. page title 'Avancerad sökning'"): still true in spirit — the "Sök"
  label inside the "Mer" sheet still points to a page titled "Avancerad sökning", and the
  inline topbar search box still separately exists. Not verified further (out of this
  task's grep depth), flagged as likely still current.

### Duplication / view sprawl

- **ux-audit-2026-06-22.md #16** ("'Att göra' vs 'Aktiviteter' — unclear role split
  makes two pages look like duplicates"), with root-cause detail: *"the dashboard
  titles itself after the other page... `src/routes/app/-page.tsx:49` renders
  `<h1>Aktiviteter</h1>` on the Att göra/home route"* and *"Both pages surface an
  activity list + a create button, so the two read as the same feature with different
  chrome."*
  **Resolved by outright merging the two routes, not by relabeling them as the audit
  suggested.** `/app` and `/activities` are now both pure redirect stubs to `/aktiviteter`
  (`beforeLoad: () => { throw redirect({ to: '/aktiviteter' }) }`), and `/aktiviteter`
  renders `ActivitiesPage` (`routes/activities/-page.tsx`) with heading
  `<h1>{t('nav.activities')}</h1>` = "Aktiviteter" (`-page.tsx:478`) — the mislabeled
  heading the audit called out is gone because the page it complained about no longer
  exists as a separate surface. The dashboard-specific KPI cards described in the audit
  ("Öppna affärer", "Pipelinevärde", "Försenade aktiviteter", "Bearbetat idag") no longer
  appear anywhere in `routes/activities/-page.tsx`; the only place those strings still
  exist in the codebase is dead code (`routes/app/-page-support.tsx`, unreachable now that
  `/app` redirects) and `lib/activity-stats.ts`. **Open question this audit did not
  resolve:** whether that KPI/dashboard content was intentionally dropped, or moved
  somewhere else in the merged page that a routes-and-nav-only pass wouldn't surface —
  worth a follow-up look at `routes/activities/-page.tsx` in full before assuming it's
  gone rather than relocated.

- **ux-audit-2026-06-22.md #9** ("Page heading 'Idag' when nav says 'Aktiviteter'"):
  *"Navigating to Aktiviteter shows the heading 'Idag' because the sidebar default
  selection is 'Idag'."*
  **Resolved as a byproduct of the same merge.** The unified route now defaults to bucket
  `'alla'` (`UNIFIED_ACTIVITIES_DEFAULT_BUCKET = 'alla'`,
  `routes/activities/-page-support.ts:119`) rather than `'idag'`, and the `<h1>` is a
  static "Aktiviteter" label, not a filter-state-derived string.

- **mobile-audit.md #1 / ux-audit-2026-06-22.md #3** ("Aktiviteter stats panel crushes
  content to ~170px on mobile" — the doc's other headline Critical/High finding, with a
  same-week follow-up in `ux-audit-2026-06-22.md` noting a specificity-losing attempted
  fix): *"the stats panel (`<aside class='attgora-stats-panel'>`, rendered in
  `src/routes/activities/-stats-panel.tsx:12`) has no equivalent [hide] rule."*
  **Very likely moot, not just fixed.** There is no `-stats-panel.tsx` file anywhere in
  current `src/routes/activities/` — the component the bug lived in appears to have been
  deleted (presumably as part of the Att göra/Aktiviteter merge). The class
  `.attgora-stats-panel` survives only as a dead selector in `styles.css`; it is not
  rendered by anything. This reads as "the offending component no longer exists" rather
  than "the CSS bug was fixed" — worth confirming directly in the browser before treating
  it as closed, since a route-and-CSS-only read can't rule out the panel having moved to
  a differently-named component.

### Editing / where-data-lives

- **ux-audit-2026-06-22.md #19** (Projekt list account/contact counts always render 0 —
  "the counts are never queried... `DBProject` interface doesn't even declare
  `account_count`/`contact_count`"). Not re-verified in this pass (out of scope — this
  task didn't read `lib/db/projects.ts`); flagged as plausibly still current since it's a
  data-layer gap, not something the nav/route refactor would touch.

- **ux-audit-2026-06-22.md #18** (Affärer: 4 of 5 sidebar filter sections — Datum,
  Säljare, Produkt, Summa — are non-interactive facades, only "Fas" works): an IA-adjacent
  finding (the filter *rail* is part of the navigation-to-data story) not re-verified here;
  flagged as plausibly still current for the same reason as above.

- **ux-audit-2026-06-22.md #15** (completed activities have no archive/undo view —
  *"a finished activity only resurfaces in context, tied to its company... You cannot
  browse your own completed work as a list anywhere"*): describes a real gap in
  where-data-lives (completed items are invisible except by drilling into the account
  they belong to). Not re-verified against current main's data layer; the underlying
  `listActivitiesPaged` hardcoding `completed_at IS NULL` was not re-checked in this pass.

### Mobile IA

- **layout-spec.md's proposed after-state** ("expand bottom tab bar from 4 to 6 items:
  Att göra, Aktiviteter, Företag, Affärer, Offerter, Sök"): current main did **not**
  follow this shape. It kept the bar at 4 primary destinations (Aktiviteter, Företag,
  Affärer, Mer) and put everything else — Kontaktpersoner, Säljtavlan, Offerter, Sök,
  Admin — one tap into "Mer". Different resolution than any prior doc proposed, but it
  does functionally address the "5 items unreachable" complaint for everything except
  Projekt.

- **mobile-audit.md #6** ("'Mer' overflow tab — unknown contents, no visual indication
  of what's hidden"): still structurally true — the "Mer" sheet still surfaces its
  contents only on tap, nothing signals what's inside before opening it. Not re-verified
  visually in this pass but nothing in the route/registry layer would have changed this.

---

## Gaps — IA questions prior audits did not address

1. **What happened to the Att göra dashboard content (KPI cards, "Bearbetat idag"
   counter, quick-capture entry points) when `/app` and `/activities` were merged into
   `/aktiviteter`?** No prior audit could have seen this (it postdates all of them). This
   report found the strings gone from the live route and only present in now-unreachable
   dead code, but did not do a full content diff of `routes/activities/-page.tsx` to
   confirm nothing was preserved under new names.
2. **Why does Projekt have no mobile nav surface at all**, when every other live
   NAV_REGISTRY entry has at least a "Mer" presence — is this an intentional V1 mobile
   scope decision, an oversight in the registry, or leftover from some other reshuffle?
   No prior audit flagged this because in June, Projekt *was* in the Mer sheet.
3. **Is the Admin-only-via-profile-menu / Sök-only-via-search-box pattern intentional
   IA** (i.e., "some destinations are deliberately not primary nav, reached via a
   secondary discovery path"), or is it an artifact of features being added without a
   nav-registry entry? No prior audit examined the registry's `topbar`/`mobile` opt-in
   model at all — it postdates the June audits (`frontend-map.md`, the latest of them,
   describes the registry but does not analyze which entries are missing which surface).
4. **Is there a real IA distinction between the four detail-view patterns** (tab-strip
   account/contact/projekt vs. single-scroll deal/quote), or is it accidental drift from
   different authorship? Prior audits examined *list*-view sub-nav inconsistency (nav-audit
   #6, ux-audit #8) but never looked at *detail*-view sub-nav, which this pass shows is at
   least as inconsistent.
5. **Whether `/avancerad-sokning`'s `defaultLive: false` gate means most tenants never see
   "Sök" at all** — none of the prior docs mention feature-gate defaults; this pass
   surfaced that Sök and Admin are the only two `NAV_REGISTRY` entries with
   `defaultLive: false`, meaning their visibility depends on Statsig/feature-gate state
   in a way the desktop subnav's other five items don't.
6. **Whether the "Kunder" internal naming vs. "Företag" rendered label** (mobile tab)
   is a copy decision in progress or a naming-drift bug — not something a content/visual
   audit would catch since the rendered string ("Företag") is technically correct and
   consistent with desktop; it only shows up by reading the source.
