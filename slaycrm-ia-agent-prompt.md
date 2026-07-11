# Prompt till annan agent: IA-audit och förenklingsplan för SlayCRM

First read the existing analysis in `~/sites/slaycrm-prototyp/ia-analysis/` (files `00–06`) and treat it as prior art to verify and extend, not repeat.

Division of labor — this matters. Prior art already delivers the ER graph (`06`), the surface inventory with empty states (`05`), and the CRUD-path matrix (`01`). **Do not reproduce them from scratch.** Reference them, and correct them only where the code proves them wrong or thin. Spend your effort on the two things prior art LACKS: (a) the sequenced refactor PR plan, (b) code-level verification with exact file:line for every claim. If you find yourself rewriting the ER graph, stop — that already exists.

Concrete hypotheses to confirm or refute against the code (these are the prior-art claims most worth verifying):
- "Affärer" and "Försäljning" tabs on BOTH account and contact detail run the same underlying deal query (`getAccountDeals` / `getDealsForContact`).
- Global search "Aktiviteter" / "Möten" result tabs are hardcoded seed data and can structurally never show real rows.
- No global quick-create exists anywhere (no "+ Ny", no Cmd+K).
- `HomeTab` and `ContactDashboard` contain their own inline activity-create widgets that bypass the shared `BokAktivitetDrawer`.
- Aktivitet has two separate edit modals (`activities/-activity-detail-modal.tsx` and `account/EditActivityModal.tsx`).
- Projekt has zero mobile nav presence in `nav-registry.ts`.

You are doing a read-only information-architecture audit of SlayCRM, a TanStack Router + SolidJS + Supabase CRM with Swedish UI.

Goal: help the owner understand how the app hangs together and produce a concrete, staged plan to **SIMPLIFY** it by removing redundant views and collapsing the many parallel ways to do the same thing.

Deliver a written plan only.

Do **NOT**:
- change application code
- make implementation edits
- push to `main`
- open a PR in this pass

Repo:
`/Users/henrikhellstrom/sites/slaycrm/repo-main`

Deliverable:
`/Users/henrikhellstrom/sites/slaycrm-prototyp/ia-analysis/07-refactor-plan.md`
(write it beside the prior art, not into the repo worktree, so all analysis lives in one place)

Context from the owner:

"Det finns för många dörrar till allt. Man kan lägga till en kontakt via företaget, via kontaktlistan och via en affär. Många vyer är redundanta. En entitet dyker upp som en nested tab under andra entiteter, i global sök, och på dashboarden. Jag vill ha en ren modell: en global minimal quick-create som används i flödet, plus EN kanonisk plats att hantera varje record, plus global search. Inte fyra dörrar."

Your job is to verify that against the actual code and produce a concrete simplification plan.

## What to analyze

### 1. Data model
From:
- `src/lib/database.types.ts`
- `supabase/migrations/*.sql`

Build the entity-relationship graph with cardinalities for the core entities:
- Företag / account
- Kontaktperson / contact
- Aktivitet / activity
- Affär / deal
- Offert / quote
- Projekt / project
- quote line items
- documents / media
- comments / notes

Explicitly answer:
- Does a contact belong to one company or many?
- How do deals link to company and contact? Are both required?
- How do quotes, activities, documents, and projects attach to deal/company/contact?
- Is there any polymorphic attachment model such as `type + id parent`?
- Is everything tenant-scoped?

### 2. Display surfaces
Inventory every place each entity is rendered.

Do not stop at `src/routes/`.

Also inspect:
- embedded tabs/sections inside detail pages
- every `-sections/` file
- every `$id`, `$dealId`, `$quoteId`, `$projektId` route
- rails / sidebars
- dashboard widgets
- `avancerad-sokning` result tabs
- modals and drawers

For each surface, record:
- route/component
- entity shown
- purpose
- whether it is canonical, contextual, redundant, or dead/gated
- empty state copy if present

Grep and inspect Swedish empty-state copy such as:
- `"Inga "`
- `"Här visas"`
- `"Ännu inga"`
- `"Kom igång"`
- `"Ingen "`

Flag surfaces whose only realistic state is empty or whose purpose appears vestigial.

### 3. Create / edit / delete paths
Per entity, list every path for:
- create
- edit
- delete

Include:
- routes such as `new.tsx`
- modals
- drawers
- inline forms
- direct Supabase `.insert`, `.update`, `.delete` usage

Mark which paths are redundant and which should become canonical.

### 4. Dead / not-live / legacy
Use:
- `src/routes/not-live-guards.test.ts`
- redirect stubs
- gated facades
- nav registry / route intent files if present

Separate real live surfaces from:
- dead ends
- legacy route aliases
- gated placeholders
- unshipped facade pages

Call out residue such as:
- live `/aktiviteter` behavior whose component still physically lives in older `activities/` folders
- orphaned modules that nothing imports
- compatibility redirects that should remain only temporarily

### 5. Baseline verification (do this LAST, and it is optional)
Do the written analysis first. Only after the plan is drafted, and only if it is quick, run the baseline so the plan sits on a known-good footing:
- `pnpm test:unit`
- `pnpm build`
- `pnpm test`

Do not get stuck here. If the suite is slow or the local setup fights you, note that and move on — a missing baseline does not block the plan. If `pnpm test` fails, capture the exact failing tests and treat them as baseline findings, not as proof your IA plan is wrong.

## Deliverable requirements

Write markdown to:
`/Users/henrikhellstrom/sites/slaycrm-prototyp/ia-analysis/07-refactor-plan.md`
(write it beside the prior art, not into the repo worktree, so all analysis lives in one place)

The document must include:

### A. ER graph
Provide a concise ER graph with cardinalities and cite exact file paths and line numbers.

### B. Surface × entity matrix
Show where each entity appears.

For each surface include:
- file path
- line number
- surface type
- verdict: `KEEP`, `MERGE`, `DELETE`, or `GATE`
- rationale

### C. CRUD-path matrix
Per entity, show all create/edit/delete paths and mark which are redundant.

### D. Ranked redundancy list
Give a ranked list of the worst duplication.

For each item include:
- surface/path name
- verdict: `KEEP`, `MERGE`, `DELETE`
- why

Tie each verdict to this principle:

A nested view is justified only when it is a natural foreign-key traversal the user truly needs in that context. Otherwise it is sprawl and should collapse to the canonical entity surface plus global search.

### E. Target operating model
Design the simplified two-mode model:

1. One global quick-create
   Explain which entities should be creatable there and the minimal fields for each.

2. One canonical management surface per entity
   Explain where each record should primarily live and be managed.

Be explicit about relationship editing:
- contact ↔ company must remain one relationship editable from either side, not two different creation models

### F. Sequenced refactor plan
Propose small PRs in safe order, naming exact:
- files
- routes
- components
- tests

For each step say:
- what to delete / merge / keep
- why now
- what test or check guards it
- risk level

Order safest first.

Flag risky areas clearly, including:
- tenant scoping
- RLS assumptions
- shared components reused across many surfaces
- route aliases that may still be linked from navigation or tests

### G. Open questions
List the questions that still need owner input before implementation.

## Working style constraints

- Be exhaustive over fast.
- Ground every claim in the actual code.
- Cite exact file paths and line numbers.
- Keep Swedish UI labels verbatim in quotes.
- Treat prior art in `~/sites/slaycrm-prototyp/ia-analysis/` as input to verify and extend, not to repeat blindly.
- Do not change product behavior in this pass.
- Do not hand-wave with generic CRM advice if the repo says otherwise.

## Useful starting points

Likely relevant files include:
- `src/lib/database.types.ts`
- `supabase/migrations/*.sql`
- `src/lib/nav-registry.ts`
- `src/routes/not-live-guards.test.ts`
- `src/routes/accounts/**`
- `src/routes/contacts/**`
- `src/routes/aktiviteter/**`
- `src/routes/activities/**`
- `src/routes/deals/**`
- `src/routes/offerter/**`
- `src/routes/projekt/**`
- `src/routes/avancerad-sokning/**`
- `src/components/account/**`
- `src/components/contact/**`
- `src/components/BokAktivitetDrawer.tsx`
- `src/components/CreateDealForm.tsx`
- `src/components/NyForsaljningModal.tsx`
- `src/lib/db/**`

## Expected outcome

The final markdown should help the owner decide:
- what the one true place is for each record type
- what quick-create should exist globally
- what redundant doors should be closed
- what can be safely removed first
- what is legacy, gated, or effectively dead
