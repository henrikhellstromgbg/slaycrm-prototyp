# SlayCRM — hur allt hänger ihop och hur vi förenklar

Sammanfattning av nattens analys. Källa: färsk `origin/main` (`wbern/crm`), commit
`e73ca0d`, 2026-07-09. Sex delrapporter ligger bredvid den här filen (`01`–`06`), plus
prompter till Codex och Grok. Läs den här först. Detaljerna finns i de andra.

En viktig korrigering först: appen är **SolidJS**, inte React. Ändrar inget för dig, men
värt att veta om någon påstår annat.

---

## 1. Kärnan: det finns bara sex saker

Bakom alla vyer finns bara sex entiteter. Allt annat är sätt att visa relationerna mellan
dem. När du förstår grafen förstår du appen.

```
                         ┌─────────────┐
                         │   FÖRETAG    │  ← navet. Allt landar här till slut.
                         │  (accounts)  │
                         └──────┬───────┘
             ┌──────────────────┼───────────────────┐
             │                  │                    │
      account_id           account_id           account_id
      (kan vara tom)       (MÅSTE finnas)       (multi)
             │                  │                    │
      ┌──────▼──────┐    ┌──────▼──────┐      ┌──────▼──────┐
      │ KONTAKT-    │    │   AFFÄR      │      │ AKTIVITET    │
      │ PERSON       │    │  (deals)     │      │ (activities) │
      │ (contacts)   │    └──────┬──────┘      └─────────────┘
      └─────────────┘           │              hänger på företag +
      1 person → 1 företag   deal_id           kontakt + affär samtidigt
      (idag)                     │
                          ┌──────▼──────┐
                          │   OFFERT     │  ← skapas ALLTID från en affär.
                          │  (quotes)    │     Kan inte skapas fristående.
                          └─────────────┘

      PROJEKT (projects) ── M:N ──> företag + kontakter (via kopplingstabeller,
                                     ingen direkt FK, står lite vid sidan)
```

Läsning av grafen, i klartext:

- **Företag är navet.** Kontakt, affär, aktivitet, offert, dokument, allt resolvar till ett
  företag. Det är därför företagssidan känns som att den har oändligt många flikar. Den har
  det, för allt hänger på den.
- **En kontaktperson tillhör ETT företag idag** (`contacts.account_id`, kan vara tom). Det
  är en enkelriktad koppling. Det här är viktigt för förenklingen längre ner.
- **En affär MÅSTE ha ett företag** men kontakt är valfri (`deals.account_id` NOT NULL,
  `contact_id` nullable). Så affären lever på företaget, inte på personen.
- **En offert är en gren av en affär.** Den ärver företag och kontakt från affären som en
  frusen kopia. Det finns ingen väg att skapa en offert utan affär.
- **En aktivitet hänger på flera saker samtidigt** (företag + kontakt + affär). Det är
  därför "en affär dyker upp under en kontaktperson". Det är inte en bugg i datan, det är en
  FK-traversering. Men i UI:t har den kopierats till fyra ställen istället för att länkas.
- **Projekt står vid sidan.** M:N mot företag och kontakter via kopplingstabeller. Minst
  kopplat, minst dubblerat, lugnast.

Tre tabeller är döda i UI (`document_files`, `project_plans`, `account_relationships`) —
bara ETL, ingen vy. Ligger kvar men syns aldrig.

---

## 2. Diagnosen: för många dörrar, och för många façader

Två problem, inte ett.

### Problem A — dubbletter av skapa/redigera (din huvudpoäng)

Vi räknade varje väg att skapa, redigera och radera varje entitet (full matris i `01`).
Kort version, värst först:

| Entitet | Skapa | Redigera | Radera | Dom |
|---|---|---|---|---|
| **Aktivitet** | **3 olika implementationer** | **2 olika modaler** | **4 triggers** | värst |
| **Affär** | **2 olika formulär**, 6 knappar | 3 ytor (2 befogade) | 1 | näst värst |
| **Kontaktperson** | **2 olika formulär** | 1 | **3 triggers** | dubbelt |
| Företag | 1 formulär, 2 knappar | 1 | 1 | mild |
| Offert | 1 väg, 2 knappar | 1 | 1 | mild |
| Projekt | 1 | 1 | 1 | renast |

Det konkreta:

- **Aktivitet är värst.** Tre helt olika sätt att skapa en aktivitet: en delad drawer
  (`BokAktivitetDrawer`, avfyrad från 7 ställen, den är faktiskt ok), PLUS två handbyggda
  "snabb-widgets" inbakade i `HomeTab` och `ContactDashboard` som ringer databasen själva
  och kringgår drawern helt. Och två separata redigera-modaler, där den ena har en kommentar
  i koden som erkänner att den "speglar BokAktivitetDrawer-fälten". Ren dubbelkod.
- **Affär har två skilda skapa-formulär** — `CreateDealForm` och `NyForsaljningModal` — som
  gör exakt samma sak från olika ställen.
- **Kontaktperson har två skilda skapa-formulär** — en helsida (`contacts/new`) och ett
  inline-formulär under företagets kontaktflik. Och tre olika ställen att radera från, för
  en och samma databasoperation.

Det här är precis din känsla, bekräftad i koden. Det är inte fyra vägar överallt, men det
är två-till-tre vägar på de tre viktigaste sakerna du gör varje dag.

### Problem B — döda vyer och façader (det du bad oss leta efter)

Av 34 rutter är **10 återvändsgränder**. 8 är gate-släckta NOT-LIVE-façader
(`kampanjer`, `rapportcenter`, `signals`, `hitta-nya-kunder`, `email`, `kundportfolj`) och
2 är rena redirect-stubbar (`activities`, `app`). De pekar alla tillbaka till
`/aktiviteter`. De ser ut som funktioner men är tomma skal.

Utöver rutterna finns ~32 inbäddade ytor (flikar och sektioner inne i detaljsidor). Totalt
~64 ytor som renderar en entitet. Det är där dubbletterna gömmer sig, inte i rutt-listan.

De skarpaste fynden (full lista i `05`):

- **"Affärer" och "Försäljning" är två flikar på BÅDE företags- och kontaktsidan som kör
  exakt samma databasfråga.** Den ena visar öppen pipeline, den andra visar stängt/årsvis.
  Samma data, två flikar. Systematisk dubblett, samma mönster på två ställen.
- **Global sök har flikar för "Aktiviteter" och "Möten" som är hårdkodad seed-data.** De kan
  strukturellt aldrig visa riktig data. Rena façader.
- **Startsidans "Hem"/"Dashboard"-flikar** dubblerar mini-listor av aktiviteter och historik
  som redan finns i egna flikar.

### Bonusfynd i navigationen (`03`)

- **Det finns ingen global "+ Ny" någonstans.** Ingen snabb-skapa i toppen, ingen Cmd+K.
  Allt skapande sker per-entitet inne på respektive lista. Det är själva hålet vi ska fylla.
- **Projekt saknar helt mobilnavigation.** Går bara att nå genom att skriva `/projekt` i
  adressfältet. Inte i tab-baren, inte i "Mer".
- **"Kunder" vs "Företag":** koden kallar det internt "Kunder", användaren ser alltid
  "Företag". Namndrift, inte en bugg, men värt att spika ett namn.
- **Detaljvyer har fyra olika mönster** för sin egen undernavigering. Företag/kontakt/projekt
  har flikar (tre olika vokabulärer), affär/offert har en lång scrollsida. Ingen delad mall.

---

## 3. Lösningen: två lägen, inte fyra dörrar

Det här är modellen. Den vilar på hur ledande CRM (Attio, HubSpot, Pipedrive, Salesforce)
faktiskt löser exakt det här, plus på datamodellen ovan. Detaljer och källor i `04`.

### Läge 1 — snabb-skapa i flödet (EN väg)

En enda global **"+ Ny"** (knapp i toppen eller Cmd+K), tillgänglig var du än är. Öppnar ett
**minimalt formulär, 3 till 5 fält**, sparar, klart, utan att du lämnar det du gjorde.

- Aktivitet: typ, vad, när, mot vilken post. Klart.
- Kontakt: namn, e-post, företag. Klart.
- Affär: namn, företag, värde. Klart.
- Företag: namn. Klart.

Regeln som håller det rent: **snabb-formuläret får aldrig växa.** Behöver du fler fält går du
till postens egen sida. Det är så sprawlet kommer tillbaka annars, fält för fält.

### Läge 2 — en kanonisk plats att förvalta varje post (EN redigerare)

Varje entitet har **en** detaljsida. Den är den enda fulla redigeraren. Allt annat, varje
listrad, kanban-kort, sökträff, snabb-formulär, är en **pekare tillbaka till den sidan**, inte
en egen redigerare.

- Vill du fylla i rik info om ett företag? Företagets sida. Enda stället.
- Vill du redigera en aktivitet på riktigt? Aktivitetens post. Inte tre modaler.

### Regeln för nästlade vyer

En nästlad flik (en affär under en kontakt, kontakter under ett företag) får bara finnas när
den är en **naturlig FK-traversering du behöver just i det sammanhanget**. Företagets
kontakter, ja. En affärs offerter och aktiviteter, ja. Allt annat kollapsar till entitetens
egen lista plus global sök.

### Kontakt ↔ företag = EN relation

Redigerbar från båda hållen, men det är **en** koppling, inte två formulär. Lägg till en
kontakt från företaget eller ett företag från kontakten, det skriver till samma kant, och
båda sidorna visar den live. Samma visuella mönster speglat, inte två olika kontroller.

(Öppen fråga: idag är en kontakt låst till ett företag. Ska vi göra det till M:N så en person
kan tillhöra flera företag? B2B-verkligheten talar för det, men det är ett datamodellbeslut.
Se öppna frågor.)

---

## 4. Nuvarande → föreslagen: vad slås ihop, vad dör

| Idag | Åtgärd | Blir |
|---|---|---|
| 3 sätt att skapa aktivitet | **SLÅ IHOP** | 1 delad snabb-skapa + drawern |
| 2 redigera-aktivitet-modaler | **SLÅ IHOP** | 1 kanonisk aktivitetsredigerare |
| 2 skapa-affär-formulär | **SLÅ IHOP** | 1 |
| 2 skapa-kontakt-formulär | **SLÅ IHOP** | 1 |
| "Affärer" + "Försäljning" (företag) | **SLÅ IHOP** | 1 flik med vy-växlare öppen/stängd |
| "Affärer" + "Försäljning" (kontakt) | **SLÅ IHOP** | 1 flik med vy-växlare |
| Global sök "Aktiviteter"/"Möten" (seed) | **DÖDA** | bort |
| 8 NOT-LIVE-façader | **DÖDA/GÖM** | bort tills de byggs |
| 2 redirect-stubbar (`app`, `activities`) | **DÖDA** | redan redirect, städa bort koden |
| Ingen global "+ Ny" | **BYGG** | 1 global snabb-skapa |
| Affärer vs Säljtavlan (2 nav-poster) | **BEHÅLL men koppla** | 1 objekt, vy-växlare lista ⇄ tavla |
| Projekt utan mobilnav | **FIXA** | lägg i "Mer" |
| Företagets kontakter, affärens offerter | **BEHÅLL** | äkta FK-traversering, befogade |

De fem högsta hävstängerna, rankade:

1. **Bygg den globala snabb-skapa.** Det är hålet allt annat läcker ur. Utan den faller folk
   tillbaka på de gamla dörrarna.
2. **En kanonisk redigerare per entitet.** Döda de andra redigerarna. Det här ensamt tar bort
   mest förvirring om "var redigerar jag det här".
3. **Slå ihop aktivitets-sprawlet.** Tre skapa blir en, två redigera blir en. Din värsta
   entitet blir din renaste.
4. **Kollapsa "Affärer/Försäljning"-dubbelflikarna.** Samma fråga, två flikar, på två sidor.
   Snabb vinst.
5. **Döda façaderna och seed-flikarna.** ~30% av rutterna är återvändsgränder. Bort med dem
   tills de är riktiga.

---

## 5. Öppna frågor till dig

1. **Kontakt → ett eller flera företag?** Idag ett. M:N är mer B2B-riktigt men är ett
   datamodellbeslut med RLS- och migrationskonsekvens. Ditt val.
2. **Säljtavlan:** egen nav-post eller vy-växlare inne i Affärer? Marknaden säger vy-växlare
   ("list is the database, view is the report"). Men folk som lever på tavlan kanske vill ha
   den som egen ingång.
3. **Façaderna** (`kampanjer`, `rapportcenter`, `signals`, ...): dör de, eller är de planerad
   V2 som bara ska gömmas tills vidare?
4. **Namnet:** "Kunder" eller "Företag"? Spika ett.
5. **Vad hände med Att göra-dashboardens KPI-kort** (Öppna affärer, Pipelinevärde, Försenade)
   när `/app` slogs ihop till `/aktiviteter`? Strängarna finns bara i död kod nu. Medvetet
   bortplockat eller tappat? Värt en titt innan vi antar.

---

## 6. Vad du gör med det här

- Läs den här filen. Gå till `01` (CRUD-vägar) och `05` (yt-inventering) om du vill se
  bevisen. `06` är datamodellen, `03` är navigationen, `04` är hur andra CRM löser det.
- **Codex-prompten** (`codex-prompt.md`): pekad på repot kan Codex köra testerna, verifiera
  fynden mot koden och skriva en sekvenserad refaktoreringsplan (små PR:er, säkrast först).
- **Grok-prompten** (`grok-prompt.md`): utifrån-och-in, säljarens resa, red-teamar modellen
  ovan så vi inte överförenklar.

Analysen är read-only. Inget är rört i appen, inget commitat. William äger deploys.
```