# CRM information-architecture patterns: quick-create vs record management

The core problem in the current SlayCRM is that the same action, adding a contact, logging an activity, linking a person to a company, can be started from four different places, each with a slightly different form and no clear "canonical" home. Leading CRMs solve this with a consistent split: a fast, minimal, contextual quick-add for capturing something *in the flow* of work, and one canonical record page per entity that owns full editing and richer detail. Below is what Attio, HubSpot, Pipedrive, Salesforce, Folk, Copper and Notion-based CRMs actually do, question by question, with a fit verdict for SlayCRM at the end of each section.

---

## 1. Global quick-create vs record-level management

**Dominant pattern:** a persistent, global "+" or command-bar trigger that opens a *minimal* creation form (name/email/company, maybe 2-4 fields), available from anywhere in the app without navigating away. Anything beyond those core fields is deferred to the full record, which you reach immediately after creation or later.

- **HubSpot**: a "Quick Create" **+** button sits next to global search in the top nav on almost every screen. It creates a Contact, Company, Deal, Ticket or Task without leaving the current page. Admins explicitly configure which fields appear on this create form per object (Data Management → Objects → "Customize the Create form"), and best practice is to keep it to 3-5 fields (e.g. contact: first name, last name, email, phone, lifecycle stage). Everything else is added later by editing the record. Locked defaults (name/email) can't be removed, guaranteeing the record is at least identifiable.
- **Attio**: quick creation happens through the Cmd/Ctrl+K command bar ("quick actions"), through relationship tabs on a record ("+ Add Person"), and via "record and list entry templates" that let admins define exactly which attributes show up in the create modal, independent of the full record's field set. Default is "show all editable attributes," but teams typically trim this via a template.
- **Pipedrive**: a global "+" (or the `.`/`+` keyboard shortcut) opens an "Add new ___" dialog for deals, people, organizations or activities from anywhere. Each object type has its own single-key shortcut.
- **Salesforce**: Global Actions in the Lightning header let admins expose a "New Contact"/"New Case" action anywhere, but it's explicitly *not context-aware* — it can't pre-fill a parent relationship. Object-specific quick actions (e.g. "New Contact" from an Account's related list) are used instead whenever the new record should be linked to the current one. This is the clearest evidence in the market that "global create" and "create-in-context" are treated as two distinct, well-defined tools, not one form trying to do both jobs.

**Fit for SlayCRM:** adopt a single global "+ Ny" trigger (button or Cmd+K) with a per-object minimal field set (3-5 fields), and treat it as strictly separate from the richer edit surface on the record page — don't let the quick form grow fields over time, that's how sprawl comes back.

---

## 2. Associating a contact with a company (the bidirectional problem)

**Dominant pattern:** the contact-company link is *one relationship*, editable from either side, but the underlying data model (not the UI) is what keeps it feeling singular. Good CRMs express this as a **relation/association**, not a form field owned by one entity — both entry points write to the same edge, and both record pages render it live.

- **HubSpot**: contacts and companies are associated via a bidirectional "association" object. You can add the link from the contact's create form (pick a company inline), from the company's sidebar association card ("+Add contact" → search existing or "Create new" tab), or automatically via email-domain matching. All three paths converge on the same association record — there's no separate "ownership" concept, only associations, which is why HubSpot recommends turning on automatic domain-based association to remove the *need* to pick a door at all.
- **Attio**: every record has "relationship tabs." Adding a person from a company record's People tab, or adding a company from a person's Company attribute, both edit the same underlying relationship. Attio's object model treats company↔person as a real relational attribute (not two independent fields), so there's structurally only one fact being edited, just two doors to reach it.
- **Pipedrive**: people link to organizations via a single `org_id`-style relationship. You can link from the organization page ("+ " in the People section → "Link a person" or "+Add" to create new) or from the person's page (organization card → "..." menu → search/select). Notable constraint: a person can only belong to **one** organization at a time in the base model — Pipedrive treats this as ownership, not many-to-many association, which is simpler to reason about but has known limitations for people who work with multiple companies.
- **Salesforce**: the base model is single-owner (Contact belongs to one Account, "New" button on the Account's Contacts related list auto-fills the account lookup). For genuine many-to-many, Salesforce requires enabling "Contacts to Multiple Accounts," which introduces a junction object (Account Contact Relationship) and a *second* related list ("Add Relationship," for linking existing contacts only — it cannot create new ones). Salesforce's own guidance is to keep only one of the two related lists on the page layout to avoid the exact confusion SlayCRM is trying to eliminate — direct evidence that two doors to the same relationship, done badly, actively confuses users.
- **Notion-based CRMs**: implemented literally as a two-way `Relation` property between the Contacts and Companies databases. Setting the relation on either database auto-populates the reverse side. This is the cleanest mental illustration of "one relationship, two visible surfaces" — there's no logic layer, the reverse link is structural.

**Fit for SlayCRM:** model company↔contact as one relationship (a true many-to-many association, given SlayCRM's B2B reality of people who move between or serve multiple companies), and let both the company page and the contact page render/edit it. Take Salesforce's cautionary note seriously: don't show two *different-looking* controls for the same edge (e.g. a "link" button on one and a "create" button on the other with different fields) — one visual pattern, mirrored.

---

## 3. Where does "add activity / log a call" live?

**Dominant pattern:** activity logging is overwhelmingly **contextual**, attached to the specific record whose timeline it belongs to, rather than a global "log anything" action. Where a global entry point exists, it still asks "which record is this about" as its first step, collapsing back into the contextual pattern immediately.

- **Copper**: every record type (lead, person, company, opportunity, project, task) has its own Activity Log in the center of the record page, with a "Log Activity" control directly above it. There is no global activity logger — logging is *always* done from the record itself, reinforcing that the record page is the canonical home for its own history.
- **Pipedrive**: activities can be added from the global "+" shortcut, but also directly from a deal/person/organization's Activities tab, or inline on a contact's timeline. Crucially, Pipedrive auto-links activities upward: an activity logged on a deal is automatically linked to that deal's person and organization too, so logging once from the most specific context (the deal) still shows up correctly on the broader records — you don't have to choose where to log it "for visibility."
- **HubSpot**: logged activity lives on the record timeline; the Quick Create global button *can* create a Task but calls/notes/emails are logged directly on the contact/deal timeline via a compose bar at the top of that timeline, not the global create menu.
- **Salesforce**: "Log a Call" is a quick action typically surfaced directly on the record page (via the publisher/action layout), object-specific rather than global, consistent with Salesforce's broader philosophy that context-aware creation belongs on the record, global actions are for things with no natural parent.

**Fit for SlayCRM:** "Lägg till aktivitet" should live on the record's timeline (deal, contact, or company) as the primary path, and inherit/auto-link upward the way Pipedrive does (an activity on a deal also touches its contact and company). A secondary global quick-log is fine for genuine "I just got off a call, which deal was that" cases, but it should immediately ask which record to attach to, not offer an unattached activity.

---

## 4. Reducing view sprawl

**Dominant pattern:** one object, one underlying list of records, many **saved views** (table/board/filter/sort combinations) layered on top — not separate screens or separate data structures for "the list," "the board," "the portfolio." A view is a lens (filter + sort + visible columns + layout), not a different copy of the data.

- **Attio**: explicitly documented as "the List is the database; the View is the report." A kanban board is not a separate module, it's a list switched into kanban view rendering the exact same records. You can have unlimited views per list/object (table and board side by side), each with its own saved filter/sort, without forking the data. Attribute visibility changes are shared across the team; filter/sort changes are personal unless explicitly saved — a clean way to let people have "their" view without permanently changing anyone else's.
- **HubSpot / Salesforce list views**: both use the "single object, many saved list views with different filters" pattern for records (e.g. "My open deals," "This quarter's deals closing"), rather than separate pages per audience.
- **General SaaS IA guidance** (dashboard/role-based view design writing referencing NN/g principles like progressive disclosure and managing visual complexity): the recommended pattern is a shared "home shell" where different roles load different *saved views* of the same underlying object, rather than maintaining one dashboard per audience. Views are treated as first-class, nameable, shareable parts of the IA — "CS Manager, week start" — not a bolt-on filter that resets.

**Fit for SlayCRM:** collapse "aktiviteter list," "kontaktpersoner list," "projekt list," "affärer list/board," "säljtavla," "offerter list" wherever they're duplicating the same underlying object (e.g. deals shown as both a board and a separate "säljtavla" screen) into one object with a view-switcher (table ⇄ board) and saved, named filters, rather than parallel pages that can drift out of sync.

---

## 5. "One object, many entry points, one edit surface"

**Dominant pattern:** the record detail page is the canonical, single place where an entity's full data is edited. Every other surface (quick-create modal, list row, kanban card, related-list row, search result) is a *pointer* to that record, not an alternate editor. Editing anywhere else either opens the same record (in a panel/modal that is the record, not a copy) or is restricted to a narrow, explicitly-scoped action (like "log activity" or "link existing").

- **Attio**: record pages are the hub; relationship tabs, list entries and views all reference the same record object. Editing an attribute from a list view edits the actual record (list rows are live views onto records, not snapshots).
- **Data-architecture framing (single-source-of-truth / canonical record pattern)**: the general principle used to justify this UI approach is that every data element should be mastered in exactly one place, with all other surfaces holding references, not copies. Applied to CRM UI, this literally becomes "record page owns the write, every other screen reads and links."
- **Salesforce's global-vs-object-specific action split** (section 1) exists specifically to prevent duplicate, out-of-sync editors: a global action that doesn't know the record context is kept deliberately "dumb" (create-only, no parent link) precisely so it can't become a second, subtly-different way to edit a record that already exists.
- **NN/g on progressive disclosure applied to forms**: the record page can afford to progressively disclose secondary/rarely-used fields (defer them behind "show more," conditional sections, or a settings-like edit mode) precisely because it's the *one* place that owns the complete field set — quick-create surfaces don't need this complexity because they intentionally only expose the 20% of fields needed to get started.

**Fit for SlayCRM:** designate one detail page per object (company, contact, deal) as the only place with a full edit form. Every quick-create, inline link, or "add from list" action should either (a) create a bare-minimum record and route/point back to that canonical page for anything more, or (b) open that canonical page in a drawer/modal rather than inventing a parallel edit form.

---

## Recommended patterns for SlayCRM

1. **One global "+ Ny" quick-create (button or Cmd+K), 3-5 fields max, per object type** — mirrors HubSpot/Pipedrive/Attio. Stops the quick-add form from silently regrowing into a duplicate of the full record.
2. **Company↔contact as one many-to-many relationship, rendered identically on both sides** — not Salesforce's default single-owner model (too restrictive for real B2B relationships) but not two different-looking controls either; take the Notion-relation mental model (one edge, two mirrored views) as the design target.
3. **Activities live on the record timeline they belong to, and auto-link upward** (deal → its contact and company) — Pipedrive's and Copper's pattern. Removes the "where do I log this" decision entirely for the common case.
4. **Collapse duplicate views (list/board/säljtavla/etc.) into one object with a view-switcher and named saved views**, Attio-style ("list is the database, view is the report") — directly resolves the "duplicated views" complaint without losing the board visualization people like.
5. **Canonical record detail page as the only full editor; every other surface is create-minimal or link-only, never a second editor** — Salesforce's explicit global-vs-object-specific action split is the clearest cautionary example of why this discipline matters.
6. **Use progressive disclosure on the canonical record page itself** (primary fields visible, secondary fields behind "show more"/an edit mode) rather than solving complexity by adding more entry points — NN/g's guidance on cognitive load in forms applies directly once SlayCRM has consolidated onto one editor per object.

---

## Sources

- [Create and view records — Attio Help Center](https://attio.com/help/reference/managing-your-data/records/create-and-view-records)
- [Create record and list entry templates — Attio Help Center](https://attio.com/help/reference/managing-your-data/create-record-and-list-entry-templates)
- [Define your data model: objects, lists, and views — Attio Help Center](https://attio.com/help/reference/attio-101/attios-data-model/define-your-data-model-objects-lists-and-views)
- [Understanding lists — Attio Help Center](https://attio.com/help/reference/attio-101/attios-data-model/understanding-lists)
- [Create and manage table views — Attio Help Center](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views)
- [Associate records — HubSpot Knowledge Base](https://knowledge.hubspot.com/records/associate-records)
- [Automatically create and associate companies with contacts — HubSpot](https://knowledge.hubspot.com/object-settings/automatically-create-and-associate-companies-with-contacts)
- [Customize the create form for each object — HubSpot](https://knowledge.hubspot.com/object-settings/set-up-fields-seen-when-manually-creating-records)
- [Create contacts — HubSpot](https://knowledge.hubspot.com/records/create-contacts)
- [A guide to HubSpot's navigation](https://knowledge.hubspot.com/help-and-resources/a-guide-to-hubspots-navigation)
- [The Journey of Redesigning HubSpot's Global Navigation (Again)](https://product.hubspot.com/blog/new-hubspot-nav)
- [Linking people and organizations — Pipedrive Knowledge Base](https://support.pipedrive.com/en/article/linking-people-and-organizations)
- [Contacts: people and organizations — Pipedrive Knowledge Base](https://support.pipedrive.com/en/article/contacts-people-and-organizations)
- [How can I add related people or organizations to a deal? — Pipedrive](https://support.pipedrive.com/en/article/how-can-i-add-related-people-or-organizations-to-a-deal)
- [Pipedrive interface / quick actions — Pipedrive Knowledge Base](https://support.pipedrive.com/en/article/quick-actions-in-pipedrive)
- [Activities — Pipedrive Knowledge Base](https://support.pipedrive.com/en/article/activities)
- [Handling contacts associated with multiple orgs — Pipedrive Community](https://community.pipedrive.com/discussion/13264/handling-contacts-associated-with-multiple-orgs)
- [Add the Related Contacts Related List to the Account Page — Salesforce Help](https://help.salesforce.com/s/articleView?id=sf.psc_related_contacts_to_account.htm&language=en_US&type=5)
- [Considerations for Relating a Contact to Multiple Accounts — Salesforce Help](https://help.salesforce.com/s/articleView?id=sales.shared_contacts_considerations.htm&language=en_US&type=5)
- [Salesforce Account Contact Relationship Fields — Salesforce Ben](https://www.salesforceben.com/salesforce-account-contact-relationship-fields-relate-a-contact-to-multiple-accounts/)
- [Actions in Lightning Experience Overview — Trailhead](https://trailhead.salesforce.com/content/learn/modules/lex_migration_customization/lex_migration_customization_actions)
- [Salesforce Quick Actions — Salesforce Ben](https://www.salesforceben.com/salesforce-quick-actions/)
- [Global Actions in Lightning — SimplySfdc](https://www.simplysfdc.com/2018/03/salesforce-global-actions-in-lightning.html)
- [Bring all your contacts to folk — Folk Help & Support](https://help.folk.app/en/articles/6364626-bring-all-your-contacts-to-folk)
- [Create groups & Manage your sidebar — Folk Help & Support](https://help.folk.app/en/articles/4970706-create-groups-manage-your-sidebar)
- [Understanding and Using the Activity Log — Copper Help Center](https://support.copper.com/en/articles/8823270-understanding-and-using-the-activity-log)
- [Create and edit Activity Types — Copper Help Center](https://support.copper.com/en/articles/8823328-create-and-edit-activity-types)
- [Build a Notion CRM Template in Under an Hour — NotionSender](https://www.notionsender.com/blog/post/notion-crm-template)
- [Information Architecture for SaaS Dashboards: Ship Clarity, Not Chaos — Medium (Brandon McCrae)](https://medium.com/@brandon.mccrae/information-architecture-for-saas-dashboards-ship-clarity-not-chaos-da5295cb8e82)
- [Dashboards: Making Charts and Graphs Easier to Understand — NN/G](https://www.nngroup.com/articles/dashboards-preattentive/)
- [3 Strategies for Managing Visual Complexity in Applications and Websites — NN/G](https://www.nngroup.com/videos/managing-visual-complexity/)
- [Few Guesses, More Success: 4 Principles to Reduce Cognitive Load in Forms — NN/G](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)
- [Progressive Disclosure — NN/G video](https://www.nngroup.com/videos/progressive-disclosure/)
- [What is Command Palette? — SaaSUI Glossary](https://www.saasui.design/glossary/command-palette)
- [Command K Bars — Maggie Appleton](https://maggieappleton.com/command-bar)
- [Single source of truth — Wikipedia](https://en.wikipedia.org/wiki/Single_source_of_truth)
- [Single Source of Truth in CRM — addtocrm glossary](https://addtocrm.com/glossary/single-source-of-truth-in-crm)
