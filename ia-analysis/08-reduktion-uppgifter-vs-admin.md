# SlayCRM: reduktion till "Dina uppgifter" och "Din admin"

Källa: två kodgrundade audits av `wbern/crm` @ `e73ca0d` (repo-main, read-only), plus
tidigare rapporter `00`–`06`. Skriven 2026-07-09. Detta är ett beslutsdokument, inte en
inventering till. Inventeringen finns i `02`, `05` och de två rårapporterna i scratchpad.
Här står vad som ska hända och varför.

Ägarens fråga: "Här är dina uppgifter. Och här är din admin." Plus: hur ska företag, kontakt,
affär, offert kopplas så det slutar vara komplext. Svaret nedan är byggt på verifierad kod,
inte gissning.

---

## 1. Kärnbeslutet: uppgifter är verb, admin är substantiv

Det som gör SlayCRM till "sex appar" är att varje detaljsida försöker vara två saker
samtidigt. En affärssida (`routes/deals/$dealId.tsx`) redigerar affärsfält (admin) på samma
skrollande sida som den visar öppna aktiviteter och "markera klar" (uppgift), historik
(admin), offerter (admin) och orderrader (admin). Blandningen är sjukdomen. Inte antalet
entiteter.

Därför två lägen, inte sex dörrar:

**Dina uppgifter** är rörelse. Vad ska jag göra nu, vem ringer jag, hur flyttar affären sig.
Ytorna: "Idag"/aktivitetslistan, "Säljtavlan", logga aktivitet, uppföljning, pipeline.

**Din admin** är tillstånd. Vad står i registret, vilka fält, vilka rader, vilka medlemmar.
Ytorna: företags- och kontaktfält, offertens rader och villkor, projektmedlemskap, och
tenant-konsolen `/admin`.

Viktig nyans: det här är **inte** två separata appar. Detaljsidorna är av naturen blandade.
Lösningen är att göra sömmen synlig på de få sidor som blandar: en **topp-remsa "nästa steg"**
(uppgift) och en **record-zon under** (admin). Samma URL, tydlig delning. Mer om det i sektion 4.

---

## 2. Den reducerade kopplingsmodellen

Verifierat mot schema och varje skapa-formulär. Schemat är löst nästan överallt (nullable
i stort sett allt). Men UI:t kör redan en mycket stramare modell än tabellerna antyder. Vi
ska spika den strama modellen, inte den lösa.

Regeln, i en mening: **säljaren ska aldrig peka på samma relation två gånger.**

### Vad säljaren VÄLJER

- **Affär → Företag.** Alltid. Redan hårt tvingat i både schema (`deals.account_id NOT NULL`,
  `init.sql:2488`) och varje formulär. Ingen ändring.
- **Affär → Kontaktperson.** Äkta val ("vem på företaget"), valfritt. Systemet kan inte gissa
  det. Behåll som val, förifyll aldrig.
- **Offert → Affär.** Offert föds bara ur en affär. Bevisat: `createQuoteFromDeal`
  (`quotes-mutations.ts:79-126`) är den **enda** skapa-vägen i hela koden. Inget fristående
  offertformulär finns. Gör `quotes.deal_id NOT NULL` i schemat så databasen tvingar det
  koden redan tvingar.
- **Kontakt → Företag.** Valfritt, max ett företag. Nullbart är rätt: en lead från LinkedIn
  kan sakna arbetsgivare i registret än. Behåll.
- **Projektmedlemskap.** M:N, företag och kontakter. Äkta val utan default. Får aldrig gatea
  projektskapande (gör det inte idag, `projekt/index.tsx:116` tar bara ett namn). Behåll.

### Vad systemet HÄRLEDER, aldrig frågar om

- **Aktivitetens företag.** Härleds från vald kontakt eller vald affär. Halvbyggt redan:
  `BokAktivitetDrawer` `onContactChange` (`:146-150`) fyller företaget från kontakten. Men
  asymmetriskt, inget härleder företag från affär, och inget hindrar att en kontakt från
  företag A och en affär från företag B väljs på samma aktivitet. Fix: härled från *endera*
  (affär vinner om båda finns), rensa den som inte matchar. Utöka `syncedSelectionForAccount`
  (`book-activity-drawer.ts:58-85`) symmetriskt.
- **Offertens företag/kontakt.** Redan helt härlett, fruset från affären vid skapande
  (`quotes-mutations.ts:118-126`). `account_id`/`contact_id` skrivs en gång, uppdateras
  aldrig. Exponera dem **aldrig** som redigerbara fält i offert-UI, det skulle tyst desynka
  offerten från affären.
- **Dokumentets förälder.** Alla tre uppladdningsvägar nullar två av tre FK och sätter en.
  Schemats "hänga på flera föräldrar samtidigt" används aldrig. Kollapsa till ett
  `(parent_type, parent_id)`-par. (Aktivitet ska **inte** kollapsas så, dess tre FK kan
  äkta samexistera, ett möte loggat mot både företag och affär.)

Textgraf, minsta ärliga modellen:

```
                 FÖRETAG  (navet, ingen förälder)
        ┌───────────┬───────────┬───────────┐
     1:N│        1:N│        M:N│        1:N│
        ▼           ▼           ▼           ▼
   KONTAKT       AFFÄR       PROJEKT     DOKUMENT (ett parent_id)
   (≤1 företag,  (företag                 (härlett)
    valfritt)     TVINGAT,
        │         kontakt valfri)
        │             │
        │          1:N│
        │             ▼
        │          OFFERT (affär tvingat, företag/kontakt fruset)
        │
        └──────┐   ┌── AFFÄR (valfri)
               ▼   ▼
           AKTIVITET (företag HÄRLETT från kontakt/affär)

   KOMMENTAR: förblir polymorf (entity_type + entity_id). Enda stället
   där "hänga på vad som helst" är äkta och lätt.
```

Nettot: ingen entitet försvinner, ingen hård regel luckras upp. Det som krymper är antalet
gånger säljaren väljer samma sak (företaget) och antalet schemakolumner som lovar flexibilitet
produkten aldrig använder.

---

## 3. Varje entitet: uppgift-yta vs admin-yta

| Entitet | Uppgift-yta (göra) | Admin-yta (registret) |
|---|---|---|
| **Aktivitet** | Hela dess existens. Logga, boka, markera klar. | Ingen egen adminsida. En aktivitet administreras inte, den utförs. |
| **Affär** | "Säljtavlan" + affärslistan som arbetslista. Flytta fas, sätt nästa steg. | Affärens fält, orderrader, offerter, dokument, historik. |
| **Företag** | Öppna aktiviteter för kunden (topp-remsa). | Företagsfält, kontakter, affärer, dokument, historik. Detta är kundens hem. |
| **Kontakt** | Öppna aktiviteter för personen (topp-remsa). | Kontaktfält, roll, koppling till företag. |
| **Offert** | Nej. Offert är ett dokument, inte en daglig uppgift. | Rader, villkor, giltighet, status. Länkar alltid tydligt tillbaka till affären. |
| **Projekt** | Nej. Projekt är segmentering, inte pipeline. | Medlemslistor: företag, kontakter. Inget annat. |

Den enda entiteten som är **ren uppgift** är Aktivitet. Den enda som är **ren admin** är
Projekt och Offert. Resten är record med en uppgift-remsa på toppen.

---

## 4. Reduktionslistan, rankad, värst först

Varje rad är kodgrundad. Verdikt: DELETE, MERGE, GATE, DECIDE.

**1. DELETE/GATE: 15 döda menyval i `/admin`.** `admin/-page-support.ts:8-73` har 27 val,
bara 12 renderar innehåll. De andra 15 visar samma platshållare ("Välj en sektion i menyn
till vänster", `-page.tsx:146-150`) *efter* att du valt. 56% dött, i själva ytan som **är**
"Din admin". Värre än de kända NOT-LIVE-rutterna, för de är åtminstone gömda bakom guard.
Detta är synligt och ser trasigt ut. Göm de 15 direkt (matchar husfilosofin i
`bottom-nav.ts:10-12`: "showing zero-data façades gaslights the customer"), bygg sen ut de
värdefullaste (`kontoinst`, `roller` först).

**2. MERGE: "Affärer" + "Försäljning" på företag, "Affärer" + "Sales" på kontakt.** Samma
`getAccountDeals`/`getDealsForContact`-query, två flikar. En flik med filterchip
(Alla/Aktiva/Förlorade/Avslutade), samma mönster `OpportunitiesTab.tsx:284-288` redan har
internt. Löser också uppgift/admin-oklarheten: default "Aktiva" (uppgift), kliv till
"Avslutade" (admin) utan andra flik.

**3. MERGE: fyra aktivitets-overlays ner till två.** Inte två som `05` trodde, fyra:
`AktivitetDetailDrawer` (visa), `activities/-activity-detail-modal.tsx` (redigera från
listan), `BokAktivitetDrawer` (skapa, 7 anropställen), `account/EditActivityModal.tsx`
(redigera, bara i företagsfliken). Ett fält du lägger i en når inte de andra. Behåll exakt
en "visa/skapa" (`BokAktivitetDrawer`, mest återanvänd) och en delad "redigera". Pensionera
de två redundanta. Detta är förutsättningen för att "logga aktivitet" ska bli **en** uppgift.

**4. DELETE: historik-preview på företagets "Kund"-flik och kontaktens "Dashboard".**
Icke-delad återimplementation av `AuditLogTimeline`, dubblerad två gånger, egen empty-state
var. Ta bort båda previews, behåll den dedikerade Historik-fliken.

**5. DECIDE: affärens "orderrader" (`deal-line-items`) vs offertens "offertrader"
(`quote_line`).** Två osynkade radlistor på en affär-med-offert (`EditLineItemsModal` vs
`QuoteLinesSection`). Kan vara avsiktligt (affärens baslinje kopieras in i offerten, divergerar
sen). Ingen har dokumenterat vilket. Beslut, inte automatisk merge. Ditt bord.

**6. GATE: flytta `BoardManagementModal` ut ur `/deals`-listan.** Den konfigurerar vad tavlan
visar (admin) men triggas från den platta listan (uppgift). Flytta till `/deals/board` eller
`/admin` → Försäljning bredvid `faser` "Affärsfaser".

**7. FIX (kod, inte IA): tre latenta FK-buggar.** `deals_contact_id_fkey` (`:5079`) och
`activities_contact_id/deal_id_fkey` (`:4874`, `:4884`) saknar `ON DELETE`. Radera en kontakt
kopplad till öppen affär eller aktivitet → rå FK-violation. Fix `SET NULL` (som `quotes_*`
redan gör) i samma pass som rör kolumnerna. Plus: kontaktens `required`-attribut på för/efternamn
säger strängare regel än JS:en (som bara kräver ett av dem, `contacts/new.tsx:185-188`).

**8. KOSMETISKT, sist: döp om `activities/`-mappen** att matcha `/aktiviteter`, och
`accounts/-page.tsx`/`-kunder-page.tsx` (detalj vs lista, namnfällan). Noll användareffekt,
men fällor som orsakar felredigering under arbetet ovan.

Redan bra, rör inte: de 8 NOT-LIVE-fasaderna är korrekt guardade och korrekt uteslutna ur
mobilens "Mer". Dubbelfliken är redan kollapsad i prototypen. Kommentar-polymorfin är rätt.

---

## 5. Vad det gör med prototypen (`app.html`)

Prototypen har idag 6 jämbördiga nav-dörrar (Aktiviteter, Företag, Kontakter, Affärer,
Offerter, Säljtavlan). Det speglar det gamla "sex register". Den reducerade modellen ritar
om navet:

- **Toppnivå blir två idéer, inte sex:** en uppgift-ingång ("Idag"/aktiviteter + Säljtavlan)
  och admin-registren (Företag, Kontakter, Offerter, Projekt) nådda mest via sök och via
  företaget som nav.
- **Global "+ Ny"** (redan planerad, task #13) blir uppgift-lägets motor: Aktivitet, Företag,
  Kontakt, Affär. Offert visas bara som "Offert från affär".
- **Detaljsidorna får två-zons-layouten:** topp-remsa nästa steg, record under. Affär-detaljen
  vi redan byggt är rätt ställe att bevisa det.
- **Aktivitet får ingen egen tung adminsida** i prototypen. Den är en drawer, överallt samma.

Det här är nästa pass på prototypen, efter QA och buggfixarna (task #12, #14). Inget av det
kräver nya skärmar. Det kräver att ta bort döda ytor, slå ihop två kända dubbletter, och rita
om en söm.

---

## 6. Beslut (låsta med Henrik 2026-07-10)

1. **Hem: "Aktiviteter" är default.** Navet rörs inte nu, nav-omritningen i sektion 5 skjuts
   till reduktionen faktiskt byggs. Aktivitetslistan är det närmaste "Idag" appen har idag och
   får vara startytan tills vidare.
2. **Rader: modell A, en sanning.** Produkter bor på offerten. Affärens värde är en siffra
   (summerad från offerten om den finns, annars manuell). Affärens egna "orderrader" dödas:
   ta bort `EditLineItemsModal` (`components/EditLineItemsModal.tsx`) och dess trigger i
   `deals/$dealId.tsx:746`, och sluta skriva `deal-line-items`. (Punkt 5 i reduktionslistan
   är därmed avgjord, inte längre en öppen DECIDE.)
3. **Aktivitet: en kontakt per aktivitet nu.** Ingen M:N ännu. Huvudkontakt kopplas, övriga
   nämns i anteckningen, och gränsen skrivs ut synligt i UI:t (ingen tyst lögn). M:N
   aktivitet↔kontakt tas upp igen *efter* att fyra-overlays-till-två har landat.
4. **Admin: göm alla döda val.** De ~15 icke-renderande posterna i `ADMIN_NAV`
   (`admin/-page-support.ts:8-73`) döljs. Inga byggs ut i detta pass. Admin visar bara de 12
   som faktiskt har innehåll. Matchar `bottom-nav.ts:10-12`-hållningen.
5. **Kontakt utan företag: tillåt men flagga.** Att spara utan företag går (visitkort,
   LinkedIn-lead), men kontakten bär en synlig markör **"Saknar företag"**. Inget hårt tvång
   vid skapande. Fixa samtidigt att `contacts/new.tsx` HTML-`required` överdriver den verkliga
   regeln (`:185-188` kräver bara ett av för-/efternamn).
