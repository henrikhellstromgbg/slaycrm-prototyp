# SlayCRM design-malbild efter förenkling

Källa: `00-summary.md`, `01-crud-path-matrix.md` och `05-surface-inventory-and-empty-states.md`, lästa 2026-07-09. Detta är inte en ny produktvision ovanpå analysen. Det är en konkret målbild för hur SlayCRM ska fungera när de värsta friktionspunkterna är bortdesignade.

## Princip

SlayCRM ska kännas som ett arbetsbord för säljaren, inte som sex separata register. Säljaren ska kunna svara på tre frågor utan att välja rätt intern väg först:

1. "Vad behöver jag göra nu?"
2. "Vem gäller det?"
3. "Hur rör sig affären framåt?"

All IA ska följa datamodellen:

- "Företag" är navet.
- "Kontaktperson" tillhör ett företag idag. Den kan sakna företag, men UI:t ska behandla det som undantag.
- "Affär" kräver företag. Kontaktperson är valfri.
- "Offert" skapas bara från "Affär". Aldrig fristående.
- "Aktivitet" kan vara kopplad till företag, kontaktperson och affär samtidigt, men säljaren ska inte behöva välja samma relationer om och om igen. Aktivitet ska auto-länkas uppåt.
- "Projekt" står vid sidan och är en grupp/segmentering av företag och kontaktpersoner, inte en del av säljpipelinen.

## Översiktlig arkitektur

Primär navigation:

- "Idag"
- "Företag"
- "Kontaktpersoner"
- "Affärer"
- "Offerter"
- "Aktiviteter"
- "Projekt"
- "Sök"

"Idag" ersätter otydliga dashboard-/app-fasader. Den visar bara live-data som hjälper säljaren att agera: öppna aktiviteter, försenade aktiviteter, affärer utan nästa steg och nyligen ändrade poster. Inga seed-flikar. Inga döda KPI-kort om datan inte faktiskt finns.

"Affärer" är objektets hem. Den har vy-växlare:

- "Lista"
- "Tavla"

"Säljtavlan" ska alltså inte vara en andra sak i modellen. Om den behålls som nav-genväg för vana användare ska den landa på samma "Affärer"-yta med vyn "Tavla" vald.

"Företag" och "Kontaktpersoner" är relationsnav. De visar säljarens sammanhang, men skapar inte parallella affärs- eller aktivitetsmodeller.

"Offerter" är ett läs- och uppföljningsregister. Primär skapväg ligger på affären. Listan får ha "Skapa offert" endast om första steget är "Välj affär"; UI:t ska aldrig antyda att en offert kan födas fristående.

"Projekt" hamnar i huvudnav på desktop och under "Mer" på mobil. Det är relevant men inte säljarens dagliga loop.

"Sök" ska bara visa live-källor. Flikarna "Aktiviteter" och "Möten" i avancerad sökning ska bort tills de söker riktig tenant-data.

## Kanoniska flöden

### Säljarens dagsloop

1. Säljaren öppnar "Idag".
2. Överst visas "Nästa att göra": försenat först, sedan dagens planerade aktiviteter.
3. Varje rad har snabbåtgärder: "Klart", "Omboka", "Logga", "Öppna".
4. När säljaren loggar från en rad är företag, kontaktperson och affär redan ifyllda om relationen finns.
5. Efter sparning ligger säljaren kvar i samma arbetsflöde.

Det viktiga: "Idag" ska inte vara en mini-version av hela CRM:et. Den ska vara en handlingslista.

### Företag till affär

1. Säljaren hittar eller skapar "Företag".
2. På företagssidan finns en primär åtgärd: "Ny affär".
3. Affärsformuläret har företaget låst och förifyllt.
4. Kontaktperson kan väljas eller lämnas tom.
5. När affären sparas öppnas affärens detaljsida.

Ingen separat "Försäljning"-skapväg från företag. Ingen andra modal med annan fältlogik.

### Affär till offert

1. Säljaren öppnar en affär.
2. I affärens flik "Offerter" klickar säljaren "Skapa offert".
3. Offerten ärver företag och eventuell kontaktperson från affären.
4. Säljaren fyller rader, villkor och giltighetstid.
5. Offerten sparas som en gren av affären.

Om säljaren startar från "Offerter" ska första steget vara "Välj affär". Efter valet fortsätter samma offertflöde.

### Kontaktperson till aktivitet

1. Säljaren öppnar kontaktpersonen.
2. Klickar "Ny aktivitet" eller global "+ Ny" -> "Aktivitet".
3. Kontaktpersonen är förifylld.
4. Företaget hämtas från kontaktpersonen.
5. Om kontaktpersonen är kopplad till öppna affärer kan säljaren välja affär; annars lämnas affär tom.
6. Aktiviteten syns sedan på kontaktpersonen, företaget och affären om affär valdes.

Ingen inline-widget som skapar aktivitet direkt utanför den kanoniska skaparen.

## Quick-create

Det ska finnas en global knapp "+ Ny" i toppbaren på desktop och i bottom bar på mobil. Den öppnar en kompakt skapare med dessa val:

- "Aktivitet"
- "Företag"
- "Kontaktperson"
- "Affär"

"Offert" visas inte som fristående quick-create. Den visas bara som "Offert från affär" när användaren står på en affär, eller som en sekundär väg från "Offerter" med obligatoriskt första steg "Välj affär".

Quick-create-regler:

- Samma komponent per entitet oavsett var den öppnas.
- 3-5 fält per formulär.
- Förifyll relationer från aktuell sida.
- Spara snabbt och stanna kvar.
- Efter sparning: visa toast med "Öppna" som sekundär åtgärd.
- Behöver säljaren fler fält leder UI:t till "Öppna detalj".

Fält:

| Val | Fält | Relationer |
|---|---|---|
| "Aktivitet" | "Typ", "Rubrik", "När", "Resultat/anteckning", "Nästa steg" | Förifyll företag, kontaktperson och affär från kontext. Auto-länka uppåt. |
| "Företag" | "Företagsnamn", "Webbplats", "Telefon", "Ägare" | Ingen dold relation krävs. |
| "Kontaktperson" | "Namn", "E-post", "Telefon", "Företag", "Roll" | Företag förifylls på företagssida. |
| "Affär" | "Affärsnamn", "Företag", "Värde", "Steg", "Kontaktperson" | Företag obligatoriskt. Kontaktperson valfri. |

## Kanoniska detaljsidor

### 1. "Företag"

Syfte: visa hela kundsammanhanget utan att bli en andra app.

Flikar:

- "Översikt"
- "Kontaktpersoner"
- "Aktiviteter"
- "Affärer"
- "Dokument"
- "Historik"

"Översikt" visar företagsfält, viktigaste kontaktpersoner, nästa aktivitet och öppna affärer. Den ska inte ha en egen aktivitets-skapare och inte duplicera historikfliken som full feed.

"Affärer" ersätter dagens separata "Affärer" och "Försäljning". Inuti fliken finns filter:

- "Öppna"
- "Vunna"
- "Förlorade"
- "Alla"

Vunna affärer kan ha summering per år i samma flik. Det ska inte vara en egen toppflik som heter "Försäljning".

Tomma lägen:

- "Inga kontaktpersoner än" + "Lägg till kontaktperson"
- "Inga aktiviteter än" + "Ny aktivitet"
- "Inga affärer än" + "Ny affär"

Viktigt: även "Kontaktpersoner" och "Aktiviteter" ska ha riktiga empty states, inte tom tabell.

### 2. "Kontaktperson"

Syfte: visa personens relation till företaget och säljarens senaste/nästa kontakt.

Flikar:

- "Översikt"
- "Aktiviteter"
- "Affärer"
- "Dokument"

Byt label från "Dashboard" till "Översikt". Det är en detaljsida, inte en separat dashboard.

"Affärer" ersätter dagens "Affärer" och "Försäljning" även här, med samma filter som på företag.

"Översikt" visar kontaktfält, företag, nästa aktivitet, senaste aktivitet och öppna affärer. Ingen egen direkt-skapande aktivitetswidget. Knappen "Ny aktivitet" öppnar samma quick-create/drawer som överallt annars.

### 3. "Affär"

Syfte: vara säljarens arbetsyta för att driva affären framåt.

Sektioner/flikar:

- "Översikt"
- "Aktiviteter"
- "Offerter"
- "Dokument"
- "Historik"

Primära åtgärder:

- "Ny aktivitet"
- "Skapa offert"
- "Markera som vunnen"
- "Markera som förlorad"

"Aktiviteter" ska använda samma aktivitetslista och samma aktivitetsredigerare som resten av appen. Loggar du aktivitet här ska företag och eventuell kontaktperson följa med automatiskt.

"Offerter" är den enda direkta skapytan för offert utan att först välja affär, eftersom affären redan är känd.

### 4. "Offert"

Syfte: redigera och följa upp ett affärsdokument, inte bli en säljprocess i sig.

Yta:

- Header med offertstatus, offertnummer, affär, företag och kontaktperson.
- "Rader"
- "Villkor"
- "Intern historik"

Primära åtgärder:

- "Spara"
- "Skicka"
- "Markera accepterad"
- "Markera avvisad"

Offerten ska alltid länka tydligt tillbaka till affären: "Till affär". Det ska vara uppenbart att affären är föräldern.

### 5. "Projekt"

Syfte: segmentera företag och kontaktpersoner. Inte säljpipeline, inte aktivitetsnav.

Flikar:

- "Företag"
- "Kontaktpersoner"

Projekt ska ha enkla medlemsflöden:

- "Lägg till företag"
- "Lägg till kontaktperson"
- "Ta bort från projekt"

Inga affärsflikar, inga aktivitetsflikar, inga offertvägar. Om projekt senare ska få säljfunktion behöver datamodellen först ändras eller ett tydligt relationsbeslut tas.

## Vad som ska bort eller slås ihop

| Idag | Målbild |
|---|---|
| 3 sätt att skapa aktivitet | 1 skapare: global/contextuell "Ny aktivitet" |
| 2 aktivitetsredigerare | 1 aktivitetsredigerare |
| Inline quick-add i företag och kontakt | Bort. Ersätts med samma "Ny aktivitet" |
| 2 skapa-affär-formulär | 1 "Ny affär" |
| 2 skapa-kontakt-formulär | 1 "Ny kontaktperson" |
| Företag: "Affärer" + "Försäljning" | 1 flik "Affärer" med filter |
| Kontaktperson: "Affärer" + "Försäljning" | 1 flik "Affärer" med filter |
| Avancerad sökning: seed-flikar "Aktiviteter" och "Möten" | Bort tills live-sök finns |
| NOT-LIVE-fasader | Dölj från nav tills de är byggda |
| `/app` och `/activities` redirect-stubbar | Städa bort |

## Mobile-first

Mobil ska optimeras för fältarbete, inte för att spegla desktop.

Bottom navigation:

- "Idag"
- "Företag"
- "Affärer"
- "Aktiviteter"
- "Mer"

"Mer" innehåller:

- "Kontaktpersoner"
- "Offerter"
- "Projekt"
- "Sök"
- kommande funktioner om de är live

Global "+ Ny" ligger som fast primär åtgärd nära tummen. Den ska öppna samma quick-create men som fullhöjds-bottom-sheet.

Mobil detaljsida:

- Header: namn, typ, status.
- Primär åtgärd synlig direkt.
- Relationer som horisontella chips: företag, kontaktperson, affär.
- Flikar som segmenterad kontroll under headern.
- Listor ska ha tydliga tomlägen och en primär nästa åtgärd.

På mobil ska "Säljtavlan" inte vara en tung kanban som kräver horisontell precision. Default är affärslista grupperad per steg. Tavla kan finnas som vy, men listan är mobilens huvudvy.

## Projekt-hålet

Projekt är just nu lugnast eftersom det inte blandar in affärer och aktiviteter. Men det har ett IA-hål: det finns inte i mobilnav och riskerar därför att kännas som admin-yta, inte produktfunktion.

Målbild:

- Projekt syns i desktop-nav.
- Projekt syns i mobil under "Mer".
- Projekt får inte snabbskapas från global "+ Ny" om målgruppen inte använder det dagligen.
- Projekt får en tydlig tomtext: "Inga projekt än. Skapa ett projekt för att samla företag och kontaktpersoner i en arbetslista."
- Projektmedlemmar ska ha samma ordval som resten: "Företag" och "Kontaktpersoner", inte "kontakter".

## Prioriterad backlog

### 1. Slå ihop aktivitetskapandet

Hävstång: störst friktion och mest duplicerad kod.

Leverans:

- Behåll en skapare för "Ny aktivitet".
- Ta bort direktanropen från inline-widgetarna i företagets "Översikt" och kontaktpersonens "Översikt".
- Förifyll relationer från kontext.
- Auto-länka uppåt så aktivitet på affär syns på kontaktperson och företag.

Acceptans:

- Säljaren kan skapa aktivitet från "Idag", företag, kontaktperson och affär.
- Samma fält och samma sparbeteende överallt.
- Ingen yta skapar aktivitet via egen mini-implementation.

### 2. Slå ihop aktivitetsredigering

Hävstång: samma objekt ska inte ha två sanningskällor.

Leverans:

- En aktivitetsdetalj/drawer för visa och redigera.
- Alla aktivitetslistor öppnar samma editor.
- Radera ligger på samma plats med samma confirm-copy.

Acceptans:

- Aktivitet från lista, företag, kontaktperson och affär öppnar samma editor.
- Ändringar reflekteras på alla relaterade ytor.

### 3. Slå ihop "Affärer" och "Försäljning"

Hävstång: tar bort den mest förvirrande dubbelfliken utan att förlora information.

Leverans:

- Företag får en flik "Affärer".
- Kontaktperson får en flik "Affärer".
- Lägg in filter "Öppna", "Vunna", "Förlorade", "Alla".
- Flytta års-/summeringsvy för vunna affärer in i filtret "Vunna".

Acceptans:

- Ingen detaljsida har både "Affärer" och "Försäljning".
- Vunna affärer är fortfarande lätta att hitta.

### 4. Slå ihop skapa-affär

Hävstång: en affär kräver företag; UI:t ska spegla det.

Leverans:

- En "Ny affär"-komponent.
- Företag förifylls och låses när flödet startar från företag.
- Kontaktperson förifylls när flödet startar från kontaktperson, men kan ändras eller tas bort.
- Tavla, lista, företag och kontaktperson använder samma skapare.

Acceptans:

- Inget `NyForsaljningModal`-spår som skiljer sig från huvudformuläret.
- Alla nya affärer har företag.

### 5. Slå ihop skapa-kontaktperson

Hävstång: kontaktpersoner är central relation; skapflödet ska inte byta beteende mellan lista och företag.

Leverans:

- En "Ny kontaktperson"-komponent.
- Företag förifylls från företagssidan.
- Dubblettkontroll och "Skapa ändå" finns i samma flöde oavsett startpunkt.

Acceptans:

- Lista och företagssida använder samma formulär.
- Tomläge på företagets kontaktflik leder till samma formulär.

### 6. Rensa seed- och fasadytor

Hävstång: färre falska dörrar gör appen mer pålitlig direkt.

Leverans:

- Dölj NOT-LIVE-rutter från navigation.
- Ta bort eller göm sökflikarna "Aktiviteter" och "Möten" tills de är live.
- Städa redirect-stubbarna om de inte behövs för bakåtkompatibilitet.

Acceptans:

- Användaren ser inga funktionsytor som bara visar seed eller redirect.
- Global sök visar bara riktiga datakällor.

### 7. Bygg "Idag" som handlingslista

Hävstång: ger säljaren en tydlig startpunkt utan att återinföra dashboard-sprawl.

Leverans:

- Lista över dagens och försenade aktiviteter.
- Affärer utan nästa aktivitet.
- Snabbåtgärder "Klart", "Omboka", "Logga", "Öppna".
- Inga tomma KPI-kort utan live-data.

Acceptans:

- Säljaren kan börja dagen och beta av arbete utan att öppna fem register.
- Allt som visas är klickbart och live.

### 8. Inför en konsekvent detaljsidesmall

Hävstång: minskar kognitiv friktion och gör framtida funktioner billigare.

Leverans:

- Samma struktur: header, relationer, primär åtgärd, flikar, tomlägen.
- Byt "Dashboard" till "Översikt".
- Säkerställ empty states i kontakt-/aktivitetsflikar som idag kan bli tom tabell.
- Harmoniera ord: använd "Företag", "Kontaktpersoner", "Affärer", "Aktiviteter", "Offerter", "Projekt".

Acceptans:

- Företag, kontaktperson, affär, offert och projekt känns som samma produkt.
- Varje tom yta svarar på "vad gör jag nu?"

## Raka produktbeslut

- Spika publik term till "Företag". Interna "Kunder" får inte läcka till UI om inte produktstrategin byter språk.
- Behåll "Aktiviteter" som samlat objekt. Skilj typ med "Samtal", "Möte", "Att göra", "Anteckning".
- Behåll offertens hårda beroende av affär och gör det synligt i UI.
- Behandla kontaktperson utan företag som undantag med tydlig varning: "Saknar företag".
- Lägg inte till M:N för kontaktpersoner nu. Det är ett datamodellbeslut, inte en IA-fix.

## Slutläge

Efter förenklingen ska säljaren kunna lära sig SlayCRM som fyra rörelser:

1. "Planera dagen" i "Idag".
2. "Förstå relationen" på "Företag" eller "Kontaktperson".
3. "Driv affären" på "Affär".
4. "Skriv offert" från "Affär".

Allt annat ska stödja de rörelserna. Om en yta inte gör det, ska den antingen döljas, slås ihop eller bli en vy av samma objekt.

---

## Granskningsnotering (Claude, 2026-07-09)

Läst mot hela `00`–`06`. Dokumentet håller och är byggbart. Fyra saker att lägga till innan
det spikas.

### Ett vägval du måste ta: vad är hemmet, "Idag" eller Säljtavlan?

Dokumentet väljer **"Idag"** (en handlingslista) som startpunkt och gör Säljtavlan till en
vy av Affärer. Det är rätt för jobbet "planera min dag". Men en stor grupp säljare lever i
**pipelinen**, inte i en att-göra-lista. För dem är Säljtavlan hemmet: se korten, dra dem,
logga direkt på kortet.

De utesluter inte varandra, de svarar på olika frågor ("vad ska jag göra?" vs "var står mina
affärer?"). Beslut: landar säljaren på "Idag" eller på Säljtavlan? Mitt förslag: **"Idag" som
default, Säljtavlan ett tapp bort och lika snabb att jobba i** (dra fas, logga, sätt nästa
steg direkt på kortet, utan att öppna detaljsidan). Annars faller tavel-säljaren tillbaka i
de gamla dörrarna, exakt det vi river.

### Lucka 1: kedjad lead-skapning saknas

Det vanligaste första jobbet är "ny lead": företag + första kontakt + första affär. Idag är
det tre separata quick-creates. Lägg till en kedja: när du sparat ett företag i "+ Ny",
erbjud direkt "Lägg till kontakt?" och sen "Skapa affär?", med relationerna redan ifyllda.
Varje steg valfritt. En rörelse istället för tre.

### Lucka 2: en aktivitet mot flera kontakter

Datamodellen länkar en aktivitet till EN kontakt (`activities.contact_id`, singular). Ett
möte med tre personer på kunden går inte att logga ärligt idag. Vanligt nog att det är värt
ett beslut: lever vi med en kontakt per aktivitet, eller är det nästa datamodelländring efter
kontakt-M:N? Nämn det, göm det inte.

### Lucka 3: offertens "eget" företag är en frusen kopia, inte en relation

`quotes.account_id`/`contact_id` finns i schemat men är en denormaliserad snapshot av
affärens kund vid skapandet (`customer_snapshot jsonb` fryser den). Investera ingen UI i att
låta en offert peka på ett *annat* företag än sin affär. Det är en teoretisk edge, inte
ryggraden. Dokumentets "ärver från affären" är rätt, förstärk bara att det är enkelriktat och
fruset.

### Litet: Företag-detalj kan sakna Offerter-flik

En företagssida visar idag inte offerter (de hänger på affärer). Oftast räcker det, men
"alla offerter för den här kunden" är en äkta traversering (via kundens affärer) och en
vanlig fråga inför förhandling. Överväg en sekundär, hopfälld Offerter-lista på företaget.
Inte kritiskt.

Resten står. De 8 backlog-punkterna är rätt rangordnade. Bygg [+ Ny] och aktivitets-
sammanslagningen först, det är där säljaren blöder mest tid dagligen.
