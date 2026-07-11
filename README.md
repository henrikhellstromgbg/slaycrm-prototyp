# SlayCRM design system

Designsystemet för SlayCRM: tokens, komponenter, teman och en navigerbar prototyp som dogfoodar systemet. Ren HTML/CSS/vanilla-JS, inget byggsteg. Push till `master` bygger om GitHub Pages automatiskt.

## Direktlänkar

- **Referensyta (tokens + komponenter):** https://henrikhellstromgbg.github.io/slaycrm-design-system/
- **Navigerbar prototyp:** https://henrikhellstromgbg.github.io/slaycrm-design-system/app.html
- **Koncept (action vs admin + handlingsregistret):** https://henrikhellstromgbg.github.io/slaycrm-design-system/koncept.html

## Struktur

- `tokens.css` / `tokens.json` — designtokens (primitiver, semantik, teman, komponentmått)
- `screens.css` / `screens.js` / `theme.js` — delat app-skal och patterns
- `index.html` — levande referensyta för systemet
- `app.html` / `app.js` — navigerbar prototyp byggd rakt på systemet
- `screens-*.html` — statiska vyer (aktiviteter, affärer, offerter, företag, kontakter, säljtavla, detalj)
- `DESIGN.md` — systemkontraktet (personlighet, foundations, states, tillgänglighet)
- `GAPS.md` — prioriterad lista över luckor och öppna beslut
- `KONCEPT.md` + `ia-analysis/` — IA-analys och porteringskoncept
- `archive/` — äldre wireframe, kvar som historik

## Snabbfakta

- Typsnitt: Geist (self-hostad i `fonts/`)
- Brand: orange `#e26a00`, skilt från danger `#dc2626`
- Font-golv 14 px, knappar är pills, H1 20 px
- Ljust/mörkt tema via `[data-theme]`, växlare i kontomenyn
- Statusvokabulär speglar skarpa appens `crm.ts`

## Syfte

Rikta in intressenter kring flöde, struktur och visuell riktning innan något byggs skarpt. Systemet är källan; prototypen är underordnad och finns för att visa systemet i bruk.
