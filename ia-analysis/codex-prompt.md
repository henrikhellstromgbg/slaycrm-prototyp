# Codex prompt — SlayCRM IA verification + simplification plan

Paste the block below into Codex, pointed at the **`wbern/crm`** repo on the **`main`** branch.
Read-only pass: it should deliver a written plan, not change app code.

If you run Codex **locally**, add this line at the top so it builds on the work already done:
> First read the existing analysis in `~/sites/slaycrm-prototyp/ia-analysis/` (files `01`–`06`) and treat it as prior art to verify and extend, not repeat.

---

```
You are doing a read-only information-architecture audit of SlayCRM, a TanStack Router +
React + Supabase CRM (Swedish UI). Goal: help the owner understand how the app hangs
together and produce a concrete, staged plan to SIMPLIFY it — remove redundant views and
collapse the many parallel ways to do the same thing. Deliver a written plan only. Do NOT
change application code and do NOT push to main in this pass (a teammate owns deploys).

The problem, in the owner's words: there are too many doors to everything. You can add a
contact via the company, via the contacts list, and via a deal. Many views are redundant —
an entity shows up as a nested tab under other entities (a deal appears under a contact,
under a company, in global search, and on the dashboard). He wants a clean model: one
global minimal quick-create used in the flow ("Lägg till aktivitet" → 3-5 fields → done),
plus ONE canonical place to manage each record, plus global search. Not four doors.

Do all of the following, grounded in the actual code:

1. DATA MODEL. From `src/lib/database.types.ts` and `supabase/migrations/*.sql`, build the
   entity-relationship graph with cardinalities for the core entities (Företag/account,
   Kontaktperson/contact, Aktivitet/activity, Affär/deal, Offert/quote, Projekt/project,
   plus quote line items, documents/media, comments/notes). Explicitly answer: does a
   contact belong to one company or many? How do deals link to company and contact (both
   required?)? How do quotes/activities/documents/projects attach to deal/company/contact?
   Is there any polymorphic attachment (type+id parent)? Is everything tenant-scoped?

2. DISPLAY SURFACES. Inventory every place each entity is rendered — NOT just routes under
   `src/routes/`, but embedded tabs/sections inside detail pages (read every `-sections/`
   file and every `$id`/`$dealId`/`$quoteId`/`$projektId` route), rails/sidebars, dashboard
   widgets, the `avancerad-sokning` result tabs, and modals. For each surface record its
   empty state (grep Swedish empty copy: "Inga ", "Här visas", "Ännu inga", "Kom igång").
   Flag surfaces whose only realistic state is empty.

3. CREATE/EDIT/DELETE PATHS. Per entity, list every path (routes like `new.tsx`, modals,
   inline forms, Supabase `.insert/.update/.delete`) and mark which are redundant.

4. DEAD / NOT-LIVE / LEGACY. Use `not-live-guards.test.ts`, redirect stubs and gated
   façades to separate real surfaces from dead ends. Note residue like the live activities
   page whose component still physically lives in the old `activities/` folder while the
   route is `/aktiviteter`, and any orphaned modules nothing imports.

5. BASELINE. Run the test suite and the build. Report what passes, so the plan sits on a
   known-good baseline.

DELIVERABLE — write markdown to `docs/ia-simplification-plan.md`:
 - The ER graph + a surface×entity matrix + a CRUD-path matrix (concise, tables).
 - A ranked redundancy list with a KEEP / MERGE / DELETE verdict for each surface and path,
   and WHY — tie each verdict to the data model: a nested view is justified only when it is
   a natural foreign-key traversal the user needs in that context; otherwise it is sprawl
   that should collapse to the entity's canonical list + global search.
 - A design for the two-mode model: (a) one global quick-create (which entities, which
   minimal fields each), (b) the canonical manage-under-record surface per entity. Say how
   contact↔company add stays ONE relationship editable from either side, not two forms.
 - A SEQUENCED refactor plan: small, shippable PRs in order, each naming the exact
   files/routes/components to delete, merge, or keep, and which tests guard it. Order by
   risk, safest first. Flag anything risky to touch: RLS policies, tenant scoping, shared
   components used in many places.
 - Open questions for the owner.

Constraints: read-only this pass, no app-code changes, no push to main. Cite exact file
paths and line numbers. Keep Swedish UI labels verbatim in quotes. Be exhaustive over fast.
```
