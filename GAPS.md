# SlayCRM designsystem · luckor och öppna beslut

Skrivet 2026-07-08 efter att ha byggt sex applicerade vyer (Aktiviteter, Affärer, Företag, Kontakter, Säljtavlan, Detaljvy) ovanpå `tokens.css`. Här är allt jag stötte på som saknas i systemet, plus beslut jag tog provisoriskt och som du kan bekräfta eller ändra. Prioriterat.

## Så här hänger filerna ihop nu

- `tokens.css` / `tokens.json` — systemet. Äger nu även **theme-lagret** (ljust/mörkt) och **ikon-kontraktet** (v0.5.0).
- `DESIGN.md` — **nytt.** Systemkontraktet: personlighet, foundations, states, tillgänglighet, responsivt, ikon-/Carbon-plan.
- `index.html` — levande token-referens (med state-matris, tomt tillstånd och ikon-sektion).
- `screens.css` — **nytt.** Delat app-skal + vy-patterns (topbar, nav, listrad, kort, flikar, kanban, händelseflöde, avatarer). Alla vyer länkar det efter tokens.css och dogfoodar semantiska tokens.
- `screens.js` — **nytt.** Delat vy-beteende (nav, drawer, filter, composer, type-picker, rad-nav, mobil-nav).
- `theme.js` — **nytt (2026-07-09).** Delad tema-controller, laddad i `<head>` på alla sidor: hydrerar `data-theme` före paint, minns valet i `localStorage`, OS-tema som fallback.
- `screens*.html` — sex vyer, navigerbara via toppnav och klickbara rader.

Öppna `screens.html` och klicka runt: nav byter vy, rader och kort leder till detaljvyn.

---

## Review-fixar (2026-07-09, efter v0.5.0)

Fyra fynd ur reviewen av `db25ca3`, alla i delade lager:

- **Fältens error-state flyttat till delade lagret.** `.input/.select/.textarea` med `.is-error` **och** `aria-invalid="true"` får danger-röd kant + röd fokus-glow, plus `.field-err`-hjälptext, nu i `screens.css` (inte bara i `index.html`). Riktiga vy-formulär kan använda kontraktet. `index.html` behåller sin lokala spegel (den läser bara `tokens.css`).
- **Tema-state över sidor.** Växlaren flyttad till delad `theme.js`: explicit val sparas i `localStorage`, hydreras i `<head>` före paint, OS-tema som fallback, `aria-pressed` korrekt vid första laddning. Tidigare satte `screens.js` och `index.html` bara `data-theme` på aktuell sida utan att minnas det.
- **Ikonkontraktet ärligt i `screens.css`.** De hårdkodade `width:16px/18px` på svg-reglerna läser nu `--icon-size` / `--icon-size-lg`. Full Carbon-migrering fortfarande uppskjuten (#21). Kvarvarande outlier: tomt-tillståndets 20px-ikon.
- **Stale kommentar i `screens.js`** (pekade på att `screens.css` omdefinierar tema-tokens) borttagen — tema bor i `tokens.css`, växling i `theme.js`.

## P1 — beslut som låser systemet

1. ~~**Mörkt tema bor inte i systemet än.**~~ **LÖST 2026-07-09 (v0.5.0 → v0.5.1).** Theme-lagret (ljust + mörkt + `[data-theme]`-växlaren) flyttat från `screens.css` och `index.html` till **`tokens.css`**, speglat i `tokens.json` (`semantic.theme`), alla sidor delar tema-tokens. **v0.5.1:** feedback-tinterna trimmade mot mörk yta. De ljusa 100-tinterna (`#dcfce7` osv.) glimmade som godis-chips och info/warning läste blekt. Mörkt läge dämpar nu chippen till en tonad mörk yta (`#16311f`/`#17263f`/`#38290f`/`#3a1a1c`/`#2b2b28`) och ljusar badge-texten till 400-nivå (`#4ade80`/`#60a5fa`/`#fbbf24`/`#f87171`/`#b3b1a8`, alla AA mot sin chip). Badge-texten bröts ut till ett eget `--tone-*-fg`-token eftersom solid-tonen också fyller danger-knappen och fältramar och därför inte kan ljusas; solid/identitet är fortsatt temaoberoende. `[data-theme="light"]` återställer tinterna så explicit ljust slår `@media dark`.

2. ~~**H1-storleken är fortfarande provisorisk.**~~ **LÖST 2026-07-09.** Henrik bekräftade **20px**. `.screen-title` sänkt från 28/32 till 20/24, matchar `.t-page-title`-token. PROVISORISK-flaggan borttagen.

3. ~~**Statusvokabulär är påhittat.**~~ **LÖST 2026-07-09** mot `src/lib/crm.ts`. Alla påhittade etiketter utbytta mot appens riktiga vokabulär:
   - **Affärssteg** (`STAGE_LABELS`): Lead · Kvalificerad · Offert · Vunnen · Förlorad. (Mina gamla Kvalificering/Förslag/Förhandling fanns inte.)
   - **Företagsrelation** (`ACCOUNT_STATUS`): Kund (success) · Prospekt (info) · Partner (**warning**, inte info, så den inte krockar med Prospekt) · Inaktiv (danger). ("Ny" fanns inte, borttagen.)
   - **Kontakter**: har ingen roll-enum i crm.ts. Titlar (VD, Inköpschef …) är fri text och behålls; de påhittade rollerna (Beslutsfattare/Påverkare/Användare) borttagna. Riktig kontaktstatus = Aktiv/Inaktiv (`CONTACT_STATUS`); den rika resan är `KUNDRESA` (Ny/Tilldelad/SQL/Pipeline/Kund …).
   - **Aktiviteter**: har **ingen statusenum** i schemat, bara `completed_at` (öppen/klar) + `due_date`. UI-vokabulären är tidshinkar från `dashboard-buckets.ts`: **Försenade · Idag · Imorgon · Denna vecka · Nästa vecka · Utan datum** (bara Försenade är röd/overdue, resten neutrala). Aktivitetsvyn och detaljvyn använder nu dessa. Mina gamla "Följ upp"/"Pågående" var påhittade.
   - **Aktivitetstyp** (`ACTIVITY_TYPE_LABELS`): Samtal · E-post · Möte · Anteckning · Uppgift (dessa stämde redan).
   - Kvar att bekräfta: affärsstegens **toner** (jag valde lead=neutral, qualified=info, proposal=warning, won=success, lost=danger; crm.ts tonar inte steg, bara status) och om Aktiviteter ska visa tidshink som badge **plus** relativ tid i datumkolumnen (nu görs båda).

4. ~~**Kontakter i toppnaven.**~~ **LÖST 2026-07-09.** Henrik: Kontakter nästlas **under Företag** med chevron, och Offerter nästlas **under Affärer** med chevron. Toppnaven är nu Aktiviteter · Affärer▾ · Företag▾ · Säljtavlan, där Affärer▾ = {Affärer, Offerter} och Företag▾ = {Företag, Kontakter}. Byggd som klickbar dropdown (`.nav-group/.nav-parent/.nav-menu/.menu-item` i screens.css, controller i screens.js: en öppen i taget, outside-klick + Esc stänger). Detta är också första instansen av dropdown-mönstret (se P3 #16).

---

## P2 — komponenter jag byggde men som inte är tokeniserade/dokumenterade

Dessa finns i `screens.css` och funkar, men de är inte formaliserade i `tokens.json`/`index.html` och bör lyftas in i systemet.

**Måtten tokeniserade 2026-07-09 (v0.4.0).** Alla magiska tal i `screens.css` är utbrutna till semantiska tokens (`--drawer-width` 480, `--modal-width` 420, `--overlay-scrim`, `--shadow-focus`, `--tab-height` 44, `--kv-label-width` 120, `--menu-min-width` 200, `--board-col-width` 300, `--board-gap` 16, `--avatar-sm-size` 32). Speglade i `tokens.json` (ny `semantic.component`-grupp) och dokumenterade i `index.html` (ny "Komponentmått"-sektion + fält-specimen för select/textarea/avatar). `screens.css` dogfoodar dem nu, vyerna är oförändrade. **Kvar för P2 = beslutsfrågorna nedan** (avatarskala/färg #5, hover-stil #9, numeric-helper #14, ghost-knappens plats #15), inte måtten. (List-head-policy #8 löst 2026-07-09: etikett-på-raden.)

5. **Avatar / initialer.** `avatar-sm` 32px och toppbarens 40px. Bara en neutral variant. Beslut: en storleksskala (sm/md) och ska avataren färgkodas per entitet eller vara neutral?

6. **Flikar (tabs).** Detaljvyns flikrad: höjd 44, aktiv orange understrykning, räknar-pill. Ny. Behöver token (tab-height) och plats i referensen.

7. **Kanban / tavla.** Kolumnbredd 300, gap 16, affärskort (radius-card, padding), steg-prick färgad per ton. Inget tokeniserat (board-col-width, board-gap).

8. ~~**Listrubrik-rad (`list-head`).**~~ **LÖST 2026-07-09** mot Figma. Ingen rubrikrad någonstans, istället **etikett direkt på raden**: varje cell visar sitt värde (`.primary`) med en liten mutad fältetikett (`.secondary`) under. `list-head`-CSS och alla rubrikrader borttagna ur Affärer/Offerter/Företag/Kontakter (Aktiviteter saknade den redan). Telefon/e-post i listrader färgas orange via `.cell .primary.link`. Affärer/Offerter self-describade redan så bara belopp-cellen fick "Värde"-etikett.

9. **Rad som länk + hover.** Rader är nu klickbara `<a>` med hover = starkare kant + pekare. Var inte definierat förut. Beslut: bekräfta hover (kant vs bakgrund vs skugga).

10. **Nyckel-värde (kv).** Detaljvyns Detaljer/Adresser: etikett 120 / värde. Ny pattern.

11. **Händelseflöde (feed).** Två varianter nu: (a) `.feed` med ikon-cirkel 32 + titel + tid + text, hairline mellan rader (äldre). (b) **rad-kort på detaljvyn 2026-07-09**: `.list.feed-list` med rader som separata kort i 3-kolumnsgrid (datum · text · ansvarig-höger), ej klickbara (cursor:default). Matchar Figma-detaljvyn. Beslut kvar: vilken variant vinner systemet.

12. ~~**Brödsmulor (breadcrumb).**~~ **BORTTAGNA 2026-07-09.** Henrik: ta bort brödsmulor på undersidorna. `.breadcrumb`-CSS och markup borttagna. Tillbaka-navigering sker nu via en orange "‹ Tillbaka"-länk i detaljvyns page-actions.

13. ~~**Kort (`card` / `side-card`).**~~ **side-card BORTTAGET 2026-07-09.** Detaljvyns sidokolumn är nu **rena block utan kortram** (`.side-block` + `.side-divider` + `.side-entity`) enligt Figma. `.side-card`-CSS borttaget. Generiska `.card` finns kvar men används ej i vy just nu.

14. **Numeriskt värde.** `amount` 16/600 med tabular-nums (Affärer, kanban). Överväg en type-helper "numeric" i systemet.

15. **Ghost-knapp.** La till `btn-ghost` (används ej i vy än). Bekräfta att den hör till knappuppsättningen.

---

## P3 — hela mönster som saknas (behövs för nästa vygeneration)

16. **Dropdowns / menyer.** **Mest klart 2026-07-09:** (a) nav-dropdown byggd (`.nav-menu/.menu-item`, klick-toggle, outside-klick + Esc) för Affärer▾/Företag▾. (b) **Filter-pillren är nu levande** i alla fem listvyer (Aktiviteter/Affärer/Offerter/Företag/Kontakter). Varje pill wrappad i `.filter-group` med en `.filter-menu`-popover som återanvänder `menu-item`-stilen; val skrivs in i pillens `.f-val` och menyn stänger (controller i `screens.js`, en öppen i taget, outside-klick + Esc). Menyinnehållet är riktig vokabulär (STAGE_LABELS, QUOTE_STATUS, ACCOUNT_STATUS, CONTACT_STATUS, tidshinkar, ACTIVITY_TYPE_LABELS). Popover-skuggan är nu en token (`--shadow-popover`) som nav och filter delar. `menu-item` fick button-reset så den funkar för både `<a>` (nav) och `<button>` (filter). Verifierat i Chrome ljust+mörkt. **Kvar:** radens kebab-meny saknas fortfarande (samma popover kan återanvändas). En generisk `.menu`-komponent kan lyftas ut när kebab byggs.

17. ~~**Formulär, drawers, modaler.**~~ **BYGGT 2026-07-09** (fältkit + drawer + bekräftelse-modal). Fältkit i `screens.css` (input/select/textarea/type-picker, brand-fokusring via color-mix, disabled-läge), overlay/drawer/modal i `screens.css`, styrning i `screens.js` (data-open/data-close, Esc + overlay-klick, type-picker single-select). Skapa-drawers byggda och verifierade i ljust+mörkt på **tre entiteter**: Ny aktivitet (`screens.html`), Ny affär (`screens-affarer.html`), Ny kontakt (`screens-kontakter.html`). Samma fältkit generaliserade utan per-vy-CSS. ~~tokenisering av fält/drawer/modal~~ **KLART 2026-07-09** (se P2: drawer/modal/overlay/fokus-glow är tokens nu). Öppna beslut jag tog: höger-drawer 480px, centrerad bekräftelse-modal 420px, footer destruktiv-vänster / avbryt+bekräfta-höger, type-picker som valbara ikon-chips.

**Detaljvyn ombyggd 2026-07-09** till Figma-utseendet: meta-rad (datum/ansvarig/syfte som värde+etikett) → **composer** → flikar (ej i kort) → händelseflöde som rad-kort → ren sidokolumn. Composer = orange vänsterkant, textarea, "Lägg till"-knapp som är disabled tills det finns text (JS i `screens.js`). Actions: orange "‹ Tillbaka", "Åtgärder ▾" (sekundär), "Markera klar" (primär med check-ikon). Ersätter det gamla edit-mönstret ("Logga händelse"/"Redigera") och brödsmulorna.

18. **Paginering / ladda fler.** Listorna har ingen sidbrytning eller "ladda fler".

19. **Radval + massåtgärder.** Kryssrutor, vald rad, bulk-actionbar saknas.

20. ~~**Tomt tillstånd.**~~ **LÖST 2026-07-09 (v0.5.0).** `.empty` är nu ett riktigt kontrakt: ikon-cirkel + rubrik + en rad hjälpcopy + primär CTA, i både `screens.css` och `index.html` (sektion *Tomt tillstånd*). **Kvar (valfritt):** droppa in ett skarpt tomt-läge i en faktisk listvy (nu bara dokumenterat som komponent).

21. **Ikonsystem — kontrakt satt, migrering kvar.** **2026-07-09 (v0.5.0):** ikon-kontraktet är definierat (16 standard / 18 icon-only, stroke harmoniserad till `--icon-stroke` 1.6 systemiskt, `aria-hidden` på alla dekorativa SVG i alla vyer + index). Målbibliotek **beslutat: IBM Carbon** (fill, Apache-2.0), adoptionsväg + animerade ikoner dokumenterade i `DESIGN.md`. **Kvar:** själva migreringen av det interima hand-ritade stroke-setet till Carbons fill-ikoner (större, egen omgång, gör setet konsekvent på riktigt).

22. **Mobil / responsiv lista.** Listorna får horisontell scroll under ~1030px istället för att omflöda. Ett staplat kort-per-rad-läge för mobil är odesignat.

23. **Notiser (toast) och aviseringar.** Klockan i toppbaren och bekräftelse-toaster saknar design.

---

## Vad jag INTE rörde (medvetet)

- `tokens.css` / `tokens.json` semantiska värden — oförändrade, bara dogfoodade.
- Skarpa SlayCRM-repot och dess Vercel-deploy — aldrig vidrört (läsrätt).
- Historik: detta pass gjordes före första commit. Allt bor nu i repo-roten av `slaycrm-design-system`.
