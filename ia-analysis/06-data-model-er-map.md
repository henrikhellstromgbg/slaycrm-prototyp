# SlayCRM data model — ER map

Source: `wbern/crm`, commit `e73ca0d` — "feat(#crm-46spf): port Henrik's Datum
filter popover + two-step calendar (#301)" (2026-07-09), checked out at
`/Users/henrikhellstrom/sites/slaycrm/repo-main/`.

Sources read: `src/lib/database.types.ts` (4585 lines, 63 tables), the full
`CREATE TABLE` + `ADD CONSTRAINT ... FOREIGN KEY` block of
`supabase/migrations/20260610120000_init.sql` (schema baseline, ~180 FK
constraints), the four later migrations that add tables
(`20260629000300_company_registry.sql`, `20260703000200_deal_revenue_schedule.sql`,
`20260705133000_crm_mgoyi_agent_beacon_hits.sql`,
`20260701000400_crm_xn8x7_correct_imported_timestamps_tz.sql`), `supabase/seed.sql`,
and the query layer in `src/lib/db/*.ts` (which `.from()`/`.select()` embeds the
UI actually issues) plus `src/lib/nav-registry.ts` for the Swedish labels.

Everything below is **Postgres/Supabase, tenant-scoped** unless noted. Every
business table carries a `tenant_id uuid NOT NULL REFERENCES tenants(id) ON
DELETE CASCADE` and RLS tenant-isolation policies (see
`20260622000200_crm_wid20_2_rls_tenant_isolation.sql`); `tenants` is the
multi-tenancy root (one row per customer org, e.g. Bauer, Demo AB).

---

## Entity table

Only business-meaningful tables. "Row scope" = tenant unless marked otherwise.

| Table | Swedish entity | Purpose | Key FKs → target | Row scope |
|---|---|---|---|---|
| `accounts` | **Företag** | Core company/client record | `owner_id→users`, `created_by→users` | tenant |
| `contacts` | **Kontaktperson** | Person at a company | `account_id→accounts` (nullable), `owner_id→users` | tenant |
| `deals` | **Affär** | Sales opportunity/order | `account_id→accounts` (**NOT NULL**), `contact_id→contacts` (nullable), `stage_id→deal_stages`, `owner_id→users` | tenant |
| `deal_stages` | Affärsfas (pipeline stage) | Kanban column definition | — | tenant |
| `deal_line_items` | Affärsrad | Line items on a deal | `deal_id→deals` (cascade), `product_id→products` | tenant |
| `deal_pipeline_snapshots` | (internal, forecasting) | Daily/period snapshot of a deal's pipeline state for reporting | `deal_id→deals`, `account_id→accounts`, `owner_id→users`, `stage_id→deal_stages` | tenant |
| `deal_revenue_schedule` | Intäktsplan | Month-by-month revenue/margin schedule for a deal (recurring revenue) | `deal_id→deals` (cascade), unique on `(deal_id, month_idx)` | tenant |
| `activities` | **Aktivitet** (Att göra) | Task/call/meeting/email/note | `account_id→accounts`, `contact_id→contacts`, `deal_id→deals` (all nullable), `owner_id→users` (NOT NULL) | tenant |
| `activity_quotas` | Aktivitetsmål | Per-user quota targets | `user_id→users` | tenant |
| `quotes` | **Offert** | Quote/proposal document | `deal_id→deals`, `account_id→accounts`, `contact_id→contacts` (**all nullable**) | tenant |
| `quote_line_items` | Offertrad | Line items on a quote | `quote_id→quotes` (cascade), `product_id→products` | tenant |
| `quote_counters` | (internal) | Per-tenant-per-year quote number sequence | — | tenant |
| `projects` | **Projekt** | Lightweight project container | none to account/contact/deal (see junctions) | tenant |
| `project_account_members` | Projekt↔Företag-koppling | M:N junction, project ↔ account | `project_id→projects`, `account_id→accounts`, both cascade | tenant |
| `project_contact_members` | Projekt↔Kontakt-koppling | M:N junction, project ↔ contact | `project_id→projects`, `contact_id→contacts`, both cascade | tenant |
| `project_plans` | *(none — no UI)* | Rich ETL landing table for legacy Upsales "project"/appointment/ticket data | `account_id`, `contact_id`, `deal_id`, `related_deal_id`, `activity_id`, `owner_id`, + 4 lookup FKs (`project_plan_priority_id`/`_status_id`/`_type_id`/`_stage_id`), all nullable/`ON DELETE SET NULL` | tenant |
| `project_plan_priorities`/`_statuses`/`_types`/`_stages` | Projektplan-referens | Lookup tables feeding `project_plans` | — | tenant |
| `documents` | **Dokument** | File attached to a business record | `account_id`, `contact_id`, `deal_id` (cascade), `activity_id`, `folder_id` (all nullable) | tenant |
| `document_folders` | Dokumentmapp | Folder hierarchy for documents | `account_id→accounts`, `parent_folder_id→document_folders` (self, cascade) | tenant |
| `document_files` | *(unused legacy twin of `documents`)* | Generic entity_type/entity_id file table, no CHECK constraint, no active query-layer usage | `entity_type`+`entity_id` (soft/untyped) | tenant |
| `document_templates` / `document_template_profiles` | Dokumentmall | Offert/contract templates | — | tenant |
| `comments` | Kommentar | Threaded note/@mention, polymorphic parent | `entity_type` (`account`\|`contact`\|`deal`\|`activity`, CHECK-enforced) + `entity_id` (no FK — see below), `parent_comment_id→comments` (self, cascade) | tenant |
| `products` | Produkt | Product catalog item | `category_id→product_categories` | tenant |
| `product_categories` | Produktkategori | Hierarchical catalog category | `parent_id→product_categories` (self) | tenant |
| `campaigns` | Kampanj | Marketing campaign — **out of V1 scope**, hidden from nav | `owner_id→users` | tenant |
| `account_categories` | Företagskategori (segment) | Hierarchical account tagging taxonomy | `parent_id→account_categories` (self) | tenant |
| `account_category_assignments` | Företag↔Kategori-koppling | M:N junction, account ↔ category | `account_id`, `category_id` (both cascade) | tenant |
| `account_addresses` | Adress (besök/faktura/leverans) | Multiple addresses per account | `account_id→accounts` (cascade) | tenant |
| `account_relationships` | Företagsrelation (parent/related/ultimate_parent) | Company hierarchy (e.g. subsidiaries) — **ETL-populated, no UI query-layer reads it** | `account_id→accounts`, `related_account_id→accounts` (self, nullable) | tenant |
| `account_enrichment` (+`_financial_details`, `_people_details`, `_profile_details`, `_site`) | Företagsberikning | 1:1 (or 1:few, `_site`) companion rows of third-party firmographic data per account | `account_id→accounts` (cascade), PK **is** `account_id` for the 1:1 tables | tenant |
| `company_registry` | Bolagsregister | Shared Bolagsverket/SCB reference data (autocomplete on account creation) | none — **not tenant-scoped**, PK is `org_number` | global/shared |
| `email_messages` | E-post | Logged email, linkable to account/contact/deal | `account_id`, `contact_id`, `deal_id` (all nullable, `SET NULL`), `owner_id→users` | tenant |
| `email_attachments` / `email_message_events` / `email_message_tags` | E-post-bilaga/-händelse/-tagg | Children of `email_messages` | `email_message_id→email_messages` (cascade) | tenant |
| `email_compose_templates` / `_attachments` | E-postmall | Reusable compose templates | `compose_template_id→email_compose_templates` | tenant |
| `email_signatures` / `email_signature_assignments` | Signatur | User email signatures | `signature_id→email_signatures`, `user_id→users` | tenant |
| `users` | Användare | Tenant member / salesperson | `tenant_id`, `role_id→roles`, `auth_user_id→auth.users` | tenant |
| `roles` | Roll | Permission set | — | tenant |
| `invitations` | Inbjudan | Invite-only membership | `role_id→roles`, `invited_by→users`, `accepted_user_id→users` | tenant |
| `user_identity_claims` | (internal identity linking) | Evidence trail linking imported/candidate emails to a `users` row | `user_id→users` | tenant |
| `pipeline_boards` / `board_views` | Pipeline / Vy | Kanban board + its saved view configs | `board_id→pipeline_boards` (cascade) | tenant |
| `saved_views` | Sparad vy | Per-user saved filter/sort config | `user_id→users`, `board_id→pipeline_boards` (nullable) | tenant |
| `notifications` | Notis | In-app notification | `recipient_user_id→users` (cascade), `actor_user_id→users`, `entity_type`+`entity_id` (untyped, no FK) | tenant |
| `audit_log` | Ändringslogg | Field-level change history | `entity_type`+`entity_id` (untyped, no FK), `user_id→users` | tenant |
| `legacy_timeline_events` | (ETL migration artifact) | Flattened historical Upsales feed, multi-attached | `account_id`, `contact_id`, `deal_id`, `activity_id`, `comment_id` (all nullable, `SET NULL`) | tenant |
| `custom_field_definitions` | Anpassat fält (definition) | Per-tenant custom field schema for account/contact/activity/deal/product/deal_line_item | — | tenant |
| `tenants` | Organisation (multi-tenancy root) | The customer org itself | — | global |
| `platform_admins` / `platform_audit_log` / `impersonation_sessions` | (operator tooling) | Cross-tenant platform-operator identities and actions | `auth_user_id→auth.users`, `target_tenant_id→tenants` | **not tenant-scoped** (system) |
| `agent_beacon_hits`, `applied_data_fixes`, `seed_state`, `reserved_demo_tenants`, `calendar_sync_queue` | — | Ops/telemetry/dev-tooling, no UI entity | — | mixed, mostly system |

---

## Relationship graph

```
                                   tenants (root, 1)
                                       │  (every table below hangs off tenant_id)
                                       │
                    ┌──────────────────┼───────────────────────┐
                    │                  │                       │
                 users 1          accounts (Företag) 1        roles 1
             (owner/creator          │    │    │  │              │
              on nearly every   ┌────┘    │    │  └────┐     users ∞──1 roles
              entity below)     │         │    │       │
                                 ∞         │    ∞       ∞
                         contacts∞──1  account_    account_addresses
                        (Kontakt-  accounts categories∞
                         person)      │    (M:N via
                          │           │  account_category_
                          │           │   assignments)
                          │           │
                          │      account_relationships
                          │      (self FK: parent/related/
                          │       ultimate_parent — ETL only,
                          │       no UI reads)
                          │
                          │      account_enrichment(+4 satellites)
                          │      accounts 1──1 account_enrichment
                          │
        ┌─────────────────┴───────────────────────────┐
        │                                              │
        ∞                                              ∞
     deals (Affär) ∞──1 accounts (REQUIRED)     activities (Aktivitet)
        │    ∞──1 contacts (OPTIONAL)                  │  ∞──0/1 accounts
        │    ∞──1 deal_stages                           │  ∞──0/1 contacts
        │                                                │  ∞──0/1 deals
        ├── 1──∞ deal_line_items ──∞──1 products         │  ∞──1 users(owner)
        ├── 1──∞ deal_revenue_schedule (month_idx 1-12)
        ├── 1──∞ deal_pipeline_snapshots (reporting)
        ├── 0──∞ quotes (Offert) ──┐
        │                          ├─ ∞──0/1 accounts
        │                          ├─ ∞──0/1 contacts
        │                          └─ 1──∞ quote_line_items ──∞──1 products
        ├── 0──∞ documents (Dokument) [also 0/1 accounts, 0/1 contacts, 0/1 activities]
        └── 0──∞ email_messages [also 0/1 accounts, 0/1 contacts]

     projects (Projekt) ── standalone, NO FK to account/contact/deal
        │
        ├── ∞──∞ accounts   via project_account_members (junction)
        └── ∞──∞ contacts   via project_contact_members (junction)

     comments (polymorphic: entity_type ∈ {account,contact,deal,activity} + entity_id)
        — attaches to any ONE of those four tables per row, enforced only by a
          CHECK constraint + app code, NOT a real FK (Postgres can't FK into a union)
        — self-referencing parent_comment_id for one-level threading

     audit_log / notifications / legacy_timeline_events
        — same untyped entity_type/entity_id polymorphism as comments, no FK
        — legacy_timeline_events additionally carries direct nullable FKs to
          account_id/contact_id/deal_id/activity_id/comment_id (belt-and-braces
          from the Upsales migration)

     project_plans (ETL landing zone, comment in code: "no UI")
        — same multi-FK-not-polymorphic shape as activities/documents:
          account_id, contact_id, deal_id, related_deal_id, activity_id
          all nullable, ON DELETE SET NULL
```

---

## Answers to the specific questions

### Does a Kontaktperson belong to ONE Företag or many?

**One (or zero), via a plain nullable FK — not a junction table.**
`contacts.account_id uuid` (nullable) →
`contacts_client_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE`
(`supabase/migrations/20260610120000_init.sql:4999`, table def at line 2333‑2352).
There is no `contact_account_members` junction anywhere in the schema. A contact
with `account_id IS NULL` is an unassigned/"loose" person record. The query
layer confirms the direction: `getAccountContacts` in
`src/lib/db/accounts-detail.ts:89-103` does
`.from('contacts').select('*').eq('account_id', accountId)` — always looked up
*from* the account side, i.e. account is the "1" and contacts is the "∞".

### Does an Affär link to a Företag AND a Kontaktperson? Both required?

**Företag is required, Kontaktperson is optional.**
`deals.account_id uuid NOT NULL` with `deals_client_id_fkey → accounts(id) ON
DELETE CASCADE`; `deals.contact_id uuid` (nullable) with `deals_contact_id_fkey
→ contacts(id)` (no cascade — orphaning a contact just nulls the pointer
behaviourally, though the column itself doesn't specify `ON DELETE SET NULL`
explicitly, it defaults to `NO ACTION`/restrict in Postgres without an
`ON DELETE` clause; see line 5079 vs 5069). Definitions at
`20260610120000_init.sql:2479-2501` and FKs at lines 5069-5079. So every deal
has exactly one company; the associated contact is an optional "who at that
company is this deal with" pointer, not a co-required field.

### How do Offert, Aktivitet, Dokument, Projekt attach to Affär / Företag / Kontakt?

Three different attachment shapes coexist in this schema:

1. **Offert (`quotes`)** — direct nullable FKs to all three:
   `deal_id`, `account_id`, `contact_id` (lines 3175-3194, FKs 5554/5544/5549),
   all `ON DELETE SET NULL`. In practice the UI always creates a quote *from* a
   deal (`quotes-read.ts` `listQuotes` filters by `filter.dealId` or
   `filter.accountId`, `src/lib/db/quotes-read.ts:44-58`), and
   `customer_snapshot jsonb` freezes the buyer's name/address at issue time —
   so `account_id`/`contact_id` on a quote are a **denormalized convenience
   copy** of `deals.account_id`/`deals.contact_id` at creation time, not an
   independent relationship a user picks separately in the common path.

2. **Aktivitet (`activities`) and Dokument (`documents`)** — the same
   "multi-FK, not polymorphic" shape: three (four for documents) independent
   nullable columns — `account_id`, `contact_id`, `deal_id` (+`activity_id` and
   `folder_id` for documents) — each with its own real FK
   (`activities`: lines 2153-2172/4869-4894; `documents`: lines
   2601-2623/5144-5174). A single activity or document can simultaneously be
   attached to an account, a contact, *and* a deal at once (e.g. a call logged
   against both the company and the specific deal it's about) — these are not
   mutually exclusive slots.

3. **Projekt (`projects`)** — genuinely different: **no FK columns to
   account/contact/deal at all.** Membership is many-to-many via two junction
   tables, `project_account_members` and `project_contact_members`
   (`(project_id, account_id)` / `(project_id, contact_id)` composite keys,
   both `ON DELETE CASCADE`, lines 2996-3017/5414-5439). Confirmed by the query
   layer: `src/lib/db/projects.ts` has `addAccountMembership`/
   `addContactMembership` server functions that insert into these junctions,
   and `listProjectsWithCounts` (`projects.ts:49-68`) uses PostgREST embedded
   `project_account_members(count)` / `project_contact_members(count)` to show
   member counts on the list page. A project can have many companies and many
   contacts; a company/contact can belong to many projects. There is a second,
   richer table, `project_plans`, that *does* have deal/activity/account/
   contact FKs plus four lookup-table FKs (priority/status/type/stage) — but
   the migration fixture that introduced it says explicitly "no UI" (`src/lib/
   db/__migration_fixtures__/20260618000500_sl_e3e3_project_plans.sql:3`) and
   no route or `src/lib/db/*.ts` server function outside the ETL/test files
   reads from it. It's a legacy-import landing table, not the live Projekt
   feature.

### Is there polymorphic attachment (e.g. activity/comment/document that can attach to any of several parent types via a type+id pair)?

Yes, but only for three tables, and it's the exception rather than the rule:

- **`comments`** — `entity_type text CHECK (entity_type IN ('account','contact','deal','activity'))` + `entity_id uuid` with **no FK** (lines 2293-2330). Enforced only by the CHECK + application code (`src/lib/db/comments.ts` validates UUID shape and takes `entity_type`/`entity_id` straight from the caller).
- **`notifications`** and **`audit_log`** — same `entity_type`/`entity_id` shape, but *without* even a CHECK constraint restricting the type values (lines 2875-2894, 2204-2220) — the loosest form in the schema.
- **`document_files`** also has `entity_type`/`entity_id` (lines 2513-2526) but is dead code — the live `documents` table (used everywhere in `src/lib/db/documents.ts`) uses the multi-FK shape instead, not this polymorphic one. `document_files` appears to be an earlier schema iteration left in place.

Everything else that looks superficially "polymorphic" in the UI (activities, documents, project_plans, legacy_timeline_events attaching to multiple parent kinds) is actually **several independent real FK columns on one row**, not a type+id pair — an important distinction: those relationships are queryable/joinable by Postgres/PostgREST directly (`select('*, accounts(name), deal_stages(*)')`), whereas the true polymorphic tables (comments/notifications/audit_log) can only be fetched by first knowing the type and running a plain `eq()` filter, never an embedded join.

---

## What this implies for the UI

- **Företag is the true hub.** Contacts, deals, activities, documents, quotes, and (indirectly, via the junctions) projects all resolve back to a single `accounts` row. A "company detail" page that surfaces contacts/deals/activities/documents for that account (as `accounts-detail.ts` already does with four separate `eq('account_id', …)` queries) is a direct, cheap traversal of the real graph — keep this as the canonical hub view, not a redundant one.
- **Kontaktperson is genuinely subordinate to Företag** (plain FK, not M:N) — a "contacts" top-level list that lets a person float free of any company is legitimate (nullable FK), but a UI that lets one contact "belong" to multiple companies would be fighting the schema; that's not a case the data model supports today.
- **Affär's required Företag / optional Kontakt** should be reflected in any create/edit form: company must always be picked first, contact is a refinement, not a parallel required field. Deal detail pages nesting "quotes for this deal," "activities on this deal," and "documents on this deal" are all real FK traversals (`deal_id` on `quotes`/`activities`/`documents`) — natural and worth keeping.
- **Offert's own `account_id`/`contact_id` columns are redundant with going through `deal_id`** in the common flow (they're a snapshot convenience, confirmed by `customer_snapshot jsonb` freezing the buyer identity at issue time). A UI that lets a user pick a *different* company/contact on a quote than the parent deal's is technically possible in the schema but is an edge case, not the backbone — don't over-invest UI real estate in that path.
- **Projekt is structurally an M:N hub of its own, independent of the Affär/Företag/Kontakt chain.** Since it links to accounts/contacts directly (not via deals), nesting Projekt only under an Affär (as some IA drafts have floated) misrepresents the data — Projekt should live as its own top-level entity with an accounts/contacts membership picker, exactly like the current `projects.ts` server functions already model it.
- **The rich `project_plans` table is a dead end for UI purposes right now** — it has the most complete relational shape in the whole schema (deal, contact, account, activity, plus four lookup tables for status/type/priority/stage) but is explicitly ETL-only. If "Projekt" is ever meant to grow into something like Upsales's ticket/project-plan feature, this is the pre-built schema waiting for a UI — worth knowing before designing a new richer Projekt view from scratch.
- **Comments/notifications/audit_log's polymorphism means their UI is necessarily generic** — a shared "activity feed" or "comment thread" component keyed by `(entity_type, entity_id)` is the right shape (it already is, per `comments.ts`), but it also means these can never be embedded-joined by Postgres; any list view showing "recent comments across all my accounts" has to do a second round-trip per entity, which explains why such a view doesn't seem to exist yet — a real technical constraint, not just an oversight.
- **`document_files` is unused legacy schema** — confirm before building anything against it; the live path is `documents`, which already supports multi-attach (account + contact + deal + activity + folder simultaneously) without needing a polymorphic redesign.
- **`account_relationships` (parent/subsidiary company hierarchy) is populated by ETL but has zero UI query-layer consumers.** If the owner wants a "see also: parent company / subsidiaries" panel on the Företag detail page, the data may already be sitting there for at least the imported (Bauer) tenant — worth checking row counts before assuming it needs to be built from scratch.
