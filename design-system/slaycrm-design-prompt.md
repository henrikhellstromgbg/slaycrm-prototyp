Läs FÖRST dessa filer och bygg på dem, parafrasera dem inte:
~/sites/slaycrm-prototyp/ia-analysis/00-summary.md
~/sites/slaycrm-prototyp/ia-analysis/01-crud-path-matrix.md
~/sites/slaycrm-prototyp/ia-analysis/05-surface-inventory-and-empty-states.md

Du är senior UX/UI-produktdesigner specialiserad på B2B-sales-CRM. SlayCRM har fått en
brutal produktkritik med fokus på säljarens resa. Din uppgift: skapa ett konkret förslag
på hur det förenklade SlayCRM ska fungera efter förenklingarna. På svenska.

Datamodellens hårda regler du MÅSTE respektera (annars designar du omöjliga flöden):
- En affär (Affär) kräver ett företag. Kontakt är valfri.
- En offert (Offert) kan BARA skapas från en affär. Aldrig fristående.
- En kontaktperson tillhör ett företag idag (enkelriktad koppling).
- En aktivitet hänger på företag + kontakt + affär samtidigt, och ska auto-länkas uppåt:
  loggar du på affären ska den synas på kontakten och företaget utan att du väljer det.

Faktiska fynd att designa bort (från analysen ovan, inte en gissning):
- 3 olika sätt att skapa en aktivitet, 2 olika redigera-modaler.
- 2 skilda skapa-formulär för både Affär och Kontaktperson.
- "Affärer" och "Försäljning" är dubbelflikar som kör samma query på företag OCH kontakt.
- Global sök har döda seed-flikar för Aktiviteter/Möten.
- Ingen global quick-create finns. Projekt saknar helt mobilnavigation.

Leverera i markdown:

1. ÖVERSIKTLIG ARKITEKTUR. Den nya IA:n kort och tydligt: hem, Säljtavlan, global sök,
   entitetslistor, detaljsidor. Vad är kanoniskt, vad är nästlat, vad försvinner.

2. QUICK-CREATE-FLÖDEN. För varje vanlig uppgift (ny lead: företag+kontakt+affär; logga
   aktivitet efter samtal; skapa affär; skapa offert från affär) beskriv det exakta
   minimala flödet steg för steg, med de 3-5 fälten. Respektera modellreglerna ovan.

3. KANONISKA DETALJSIDOR. För Företag, Kontaktperson, Affär och Aktivitet: vad ska finnas
   där, vad ska vara collapsible, vad ska absolut INTE finnas där (t.ex. ingen andra
   redigerare, inga dubbelflikar).

4. SÄLJTAVLAN, NY ROLL. Hur blir den säljarens primära arbetsyta? Vad går att göra direkt
   på ett kort utan att öppna detaljsidan (flytta fas, logga aktivitet, sätt nästa steg)?

5. MOBILE-FIRST. Vilka kompromisser krävs på mobilen? Lös särskilt Projekt-hålet och
   var quick-create bor på en telefon.

6. PRIORITERAD BACKLOG. Topp 8 att bygga först, rangordnat efter friktion för säljaren.
   Stäm av mot de 5 rankade hävstängerna i 00-summary så listorna inte krockar.

Var rak, konkret, säljarfokuserad. Inga generiska CRM-fraser. Men behåll det som faktiskt
minskar friktion (t.ex. auto-länkning av aktiviteter uppåt). Svenska UI-etiketter ordagrant
i citat. Skriv resultatet till ~/sites/slaycrm-prototyp/ia-analysis/design-malbild.md
(eller klistra tillbaka hela markdownen till mig om du kör i en webbläsare).
