# SlayCRM designsystem · kontrakt

Kort, praktiskt kontrakt för hur systemet ska användas. `GAPS.md` är backloggen (vad som saknas), den här filen är regeln (vad som gäller nu). Källorna: `tokens.css` (implementation), `tokens.json` (struktur med provenance), `index.html` (levande referens), `screens.css`/`screens.js` (skal, patterns och beteende), `screens*.html` (sju applicerade vyer).

Version 0.5.1, 2026-07-09.

## Personlighet

Tät CRM-arbetsyta, inte marknadssida. Lågmäld yta, innehållet bär. Orange är enda accenten och används sparsamt: primär åtgärd, aktivt läge, valt värde. Allt annat är neutralt.

En regel bär hela systemet: **brand skiljs från fara.** Brand är orange `#e26a00`, danger är ren röd `#dc2626`. En primärknapp och en raderaknapp får aldrig vara samma färg. Den skarpa appen använder en vermillion för båda, det är medvetet slängt här.

## Foundations

- **Typsnitt:** Geist (en familj), self-hostad i `fonts/`. Golv 14px, inget mindre oavsett roll. Skala i `.t-*`-hjälparna.
- **Neutraler:** 3 bakgrunder (white / ground `#f5f5f3` / sunken `#f9f9fb`), 1 linje `#e5e5e5`, 3 textgrå (ink / muted / faint).
- **Brand:** orange-500 `#e26a00`, hover orange-400 `#f47300`.
- **Feedback:** en ton per status, solid + tint + badge-fg. success / info / warning / danger / neutral. Solid är identitet (temaoberoende); tint och fg trimmas per tema (se Tema). Statusfärg är inte fri, den binds i `statusMap` (`tokens.json`) mot `src/lib/crm.ts`. Badges renderar det kontraktet, inte påhittade etiketter.
- **Spacing:** 4-baserad (4/8/12/16/20/24/32/40).
- **Radie:** default 8 (kontroller), 12 (kort), pill 999 (knappar, badges-pill). Accent-kant = alltid skarpa hörn (composer, callout), aldrig rundade.
- **Skugga:** `--shadow-card` (vilande lyft), `--shadow-button` (primärknapp: drop + inset-highlight), `--shadow-popover` (menyer).

Två lager: `--p-*` primitiver (råa värden), `--*` semantiska (roller). Bygg alltid mot de semantiska.

## Tema

Ljust och mörkt bor i `tokens.css` (theme-lagret), inte per fil. Neutralerna byts per tema. Feedback-tonernas **identitet** (solid) är temaoberoende, men **chip-bakgrund** (`--tone-*-tint`) och **badge-text** (`--tone-*-fg`) trimmas per tema: ljusa 100-tinter glimmar mot mörk yta, så mörkt läge dämpar chippen till en tonad mörk yta och ljusar texten till 400-nivå (behåller AA). `fg` finns just för att badge-texten måste kunna ljusas utan att röra solid, som också fyller danger-knappen och fältramar och därför måste stanna mörk. Kaskad: `:root` (ljust) → `@media (prefers-color-scheme: dark)` (följer OS) → `:root[data-theme]` (explicit växlare vinner, högre specificitet); `[data-theme="light"]` återställer tinterna så explicit ljust slår igenom på en mörk OS-grund. Alla sidor läser `tokens.css`, så `index.html` och vyerna delar exakt samma tema.

Växlaren är delad (`theme.js`, laddad i `<head>` på alla sidor). Den stämplar bara `data-theme` på `<html>` och minns det explicita valet i `localStorage` (`slay-theme`). Hydreringen körs före första paint så temat aldrig blinkar fel vid laddning, och `aria-pressed` speglar valt tema direkt. Utan explicit val ligger `data-theme` borta och OS-temat styr. Klick på det redan aktiva temat nollar valet tillbaka till OS.

Mörka feedback-tinter är nu trimmade (v0.5.1): dämpad tonad chip + ljus 400-text per ton, verifierat i `index.html` och vyerna i båda lägena.

## Komponenter och states

Varje komponent har definierade lägen. Se dem levande i `index.html` under *Komponent-states*.

- **Knappar** (`.btn` + `.btn-primary/-secondary/-ghost/-danger`): default, hover, focus (2px orange ring, offset 2), disabled (tappar skugga, sänks till sunken), active (nedtryckning `scale(.96)`). Padding beror på ikon: utan ikon symmetrisk 20/20, med ikon 16 ikonsida / 8 gap / 24 textsida.
- **Fält** (`.input/.select/.textarea`): default, focus (orange kant + `--shadow-focus`-glow), disabled (sunken, faint text), error (danger-röd kant, aldrig brand-orange). Fel visas med `.field-err`.
- **Badges** (`.badge--*`): en per feedback-ton, se statuskontraktet ovan.
- **Menyer** (`.nav-menu`, `.filter-menu`, delar `.menu-item` + `--shadow-popover`): stängd, öppen (orange kant på triggern, chevron roterar), vald rad (`.is-active`, orange text).
- **Drawer / modal:** höger-drawer 480px (skapa/redigera), centrerad modal 420px (bekräfta destruktivt). Footer: destruktiv åtgärd vänster, avbryt + bekräfta höger.
- **Tomt tillstånd** (`.empty`): tre delar, alltid, ikon + rubrik + en rad hjälpcopy + primär CTA. Säljer nästa steg, inte tomheten.
- **Övrigt tokeniserat:** flikar (`--tab-height`), kanban (`--board-col-width/-gap`), nyckel-värde (`--kv-label-width`), avatar (40 / `--avatar-sm-size` 32).

## Ikoner

Kontrakt (`tokens.css` icon-lagret):

- **Storlek:** 16px standard (i text, knappar, celler), 18px (`--icon-size-lg`) för icon-only knappar och avatar. Hjälpare `.icon` / `.icon--lg`. `screens.css` läser `--icon-size` / `--icon-size-lg` direkt på sina svg-regler (sök, knapp, filter, cell, händelse, select, type-chip, drawer-stäng), så vyerna dogfoodar kontraktet. Enda kvarvarande undantaget är tomt-tillståndets illustrativa 20px-ikon i sin 40px-cirkel.
- **Stroke:** harmoniseras systemiskt till `--icon-stroke` (1.6) via `svg[stroke]:not([stroke="none"])`. CSS stroke-width vinner över SVG:ns attribut, så det hand-ritade setet (1.4/1.6/2) dras till ett värde utan markup-ändring i vyerna.
- **Tillgänglighet:** dekorativa ikoner bär `aria-hidden="true"` när knappen eller länken redan har text eller `aria-label`. Icon-only knappar (notiser, konto, stäng, hamburgare) bär `aria-label`, deras SVG är `aria-hidden`.

**Målbibliotek: IBM Carbon** (`@carbon/icons`, Apache-2.0). Carbon är fill-baserat (`fill: currentColor`, ingen stroke), sizes 16/20/24/32. Det nuvarande stroke-setet är interimt.

Adoptionsväg i det här repot (inget build-steg, ingen `package.json`, körs över `file://`):

1. Kopiera enskilda SVG-källfiler från paketets `src/svg/16/` till en lokal `icons/`-mapp och inline:a dem, eller bygg en inline-sprite med ett `<symbol>` per ikon per sida. Undvik extern `<use href>` mot annan fil på `file://` (CORS blockerar). Noll JS, noll dependency.
2. Stroke-regeln rör bara `[stroke]`-SVG, så Carbons fill-ikoner droppar in utan konflikt. `.icon` / `.icon--lg` sköter storleken.

**Animerade ikoner:** Carbons `icons-motion` är CSS/SCSS + SVG, inte Lottie, så den passar en no-build-prototyp. Mönstret är samma vi redan använder (chevron roterar vid öppning): CSS-transition på SVG-element vid hover eller state. Håll animationerna mikro, respektera alltid `prefers-reduced-motion`. Full `icons-motion`-SCSS-mixin väntar tills det finns ett build-steg, hand-författa de få som behövs i CSS tills dess.

## Tillgänglighet och fokus

- **Fokus:** synligt alltid. 2px orange ring (`--color-focus-ring`, offset 2) på knappar, rader och länkar. Fält får glow (`--shadow-focus`) i stället för ring.
- **Dialoger** (`screens.js`): bakgrunden görs `inert` när en drawer eller modal öppnas (enkel focus trap, Tab stannar i dialogen, AT hoppar över bakgrunden). Fokus flyttas in i panelen vid öppning och **återställs till knappen som öppnade den** vid stängning. Esc, overlay-klick och `data-close` stänger.
- **Disclosure:** nav- och filter-triggers bär `aria-expanded`, inte menyroller.
- **Länkar:** telefon och e-post är riktiga `tel:` / `mailto:`.
- **Golv 14px:** ingen text under 14px, oavsett roll.

## Responsivt

Fast sid-gutter, full bredd. Brytpunkter:

- `≤1180px`: gutter 123 → 24.
- `≤900px`: detaljvyn faller till en kolumn.
- `≤800px`: gutter → 16, toppnav blir hamburgare (nedfällbar panel, grupperna listas platt), listrader blir vertikala kort, kanban staplas, fältpar staplas, sök flyttar till filterraden i full bredd.

## Öppna beslut

Detaljer och prioritet i `GAPS.md`. I korthet:

- Avatarskala och färgkodning (#5), radens hover-stil (#9), numeric type-helper (#14), ghost-knappens plats (#15).
- Saknade mönster: radens kebab-meny, paginering (#18), radval + massåtgärder (#19), toasts (#23), riktig mobil kort-lista (#22).
- Migrera det interima stroke-setet till Carbon när tid finns.
