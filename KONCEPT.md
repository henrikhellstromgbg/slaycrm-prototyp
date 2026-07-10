# Koncept: så porterar vi gammal design

Detta dokument är kontraktet för allt arbete i prototypen. Det ska hålla även när vi
flyttar, slår ihop eller tar bort saker. Läses före varje porteringspass. Detaljbesluten
för SlayCRM ligger i `ia-analysis/08-reduktion-uppgifter-vs-admin.md`, det här är
principerna ovanför dem.

---

## Grundhållning: gamla designen är ett vittne, inte en ritning

Den gamla appen bevisar vad användare *behövt göra*. Den bevisar inte hur det ska göras.
Skärmar kan sakna handlingar, vara felbyggda eller ha ren UX-skuld. Därför porterar vi
aldrig skärmar. Vi porterar handlingar och records, och ritar sedan skärmarna som behövs
för att bära dem.

Konsekvens: "det såg ut så i gamla appen" är aldrig ett argument. "Säljaren behöver kunna
göra X" är det enda argumentet.

---

## Regel 1: varje yta deklarerar sig, action eller admin

**Action är verb.** Logga, boka, ringa, flytta fas, markera klar, skapa. Något händer i
säljarens verklighet. Actions är snabba, minimala, inline. Drawer eller quick-create,
3 till 5 fält, aldrig en hel sida. Optimerade för flöde, inte fullständighet.

**Admin är substantiv.** Fält, rader, villkor, medlemmar, historik. Tillstånd i registret.
Admin bor på recordets kanoniska sida och får vara långsam, komplett och noggrann.

**Lackmustestet:** gör detta att något händer i verkligheten (ett samtal, ett möte, en
affär rör sig)? Action. Ändrar det bara vad som står i registret? Admin. Kan du inte
svara, är ytan feldesignad, dela den.

**Blandade sidor är tillåtna men sömmen ska synas.** En detaljsida får ha en topp-remsa
"nästa steg" (action) och en record-zon under (admin). Aldrig blandat inom en zon. En
redigera-knapp hör inte hemma i uppgiftsremsan, en "markera klar" hör inte hemma bland
fälten.

---

## Regel 2: handlingsregistret är kontraktet

Varje handling som finns i produkten står i registret nedan: verb + entitet, en kanonisk
komponent, och de ingångar som får trigga den.

- **En handling = en implementation.** Flera triggers är fint. Flera formulär är förbjudet.
  (Gamla appen hade fyra aktivitets-overlays. Det är sjukdomen vi opererar bort.)
- **Flytta en knapp** = ändra en rad i ingångskolumnen. Inget nytt formulär föds.
- **Ta bort en skärm** = kolla registret först. Varje handling som bara nåddes därifrån
  måste få en ny ingång eller avvecklas medvetet. Inga föräldralösa handlingar.
- **Saknad handling i gamla designen är ett beslut, inte en lucka att kopiera.** Hittar vi
  ett behov gamla appen aldrig löste: antingen in i registret med motivering, eller
  medvetet nej med motivering. Aldrig tyst.

### Register (seed, utökas löpande)

| Handling (verb + entitet) | Typ | Kanonisk komponent | Tillåtna ingångar |
|---|---|---|---|
| Logga/boka aktivitet | action | aktivitets-drawern (en enda) | global "+ Ny", företag, kontakt, affär, aktivitetslistan |
| Markera aktivitet klar | action | inline-toggle i lista/remsa | aktivitetslistan, topp-remsor |
| Redigera aktivitet | admin | en delad redigera-drawer | aktivitetsdetalj, listan |
| Flytta affär mellan faser | action | Säljtavlan (drag) + fasväljare | tavlan, affärsdetaljens topp-remsa |
| Skapa företag / kontakt / affär | action | quick-create per entitet, 3 till 5 fält | global "+ Ny", kontextuella "+" på record |
| Skapa offert | action | "Offert från affär", enda vägen | affärsdetaljen. Aldrig fristående |
| Redigera företag / kontakt / affär | admin | recordets hem | endast recordets hem |
| Offertens rader och villkor | admin | offertens hem | endast offertens hem |
| Projektmedlemskap | admin | projektets hem | endast projektets hem |

---

## Regel 3: en record har ett hem

Varje entitet har exakt en kanonisk detaljsida. Full redigering finns bara där. Alla
andra ställen entiteten syns (flik under annan entitet, sökträff, dashboard-kort) är
länkar eller läs-ytor som pekar hem. En inbäddad flik får visa och länka, aldrig äga ett
eget redigeringsformulär.

**Härledd data är aldrig ett redigerbart fält.** Aktivitetens företag härleds från kontakt
eller affär. Offertens företag fryses från affären. Sådana fält visas, men exponeras
aldrig för redigering, det är så tyst desynk föds.

---

## Porteringsprotokollet, per gammal vy

1. **Inventera.** Vilka handlingar påstår vyn att den erbjuder? Knappar, menyer, implicita
   (en tom lista med "+" är en handling).
2. **Klassa.** Varje handling: action eller admin. Varje yta: uppgiftsremsa, record-zon,
   eller ren lista.
3. **Slå upp.** Finns handlingen i registret? Använd den kanoniska komponenten. Finns den
   inte? Fatta beslutet (in eller medvetet nej), logga det i registret eller i `08`.
4. **Portera aldrig fel.** Buggar, döda menyval, fasad-flikar, dubblerade formulär i gamla
   appen är evidens på skuld, inte krav. Datamodellen och registret är sanningen, inte
   pixlarna.
5. **Klart är:** vyn innehåller inga formulär som inte står i registret, varje admin-fält
   nås via recordets hem, inga tomma fasader (en yta utan innehåll visas inte), och
   sömmen action/admin är synlig där sidan blandar.

---

## Vad som får ändras fritt, och vad som inte får det

**Fritt:** layout, navplacering, flikordning, gruppering, namn på skärmar, vilka ingångar
en handling har. Konceptet bryr sig inte om var saker sitter.

**Aldrig tyst:** en handlings kanoniska komponent, en records hem, en härledd relation som
blir redigerbar, en handling som försvinner för att dess sista ingång togs bort. Sådant
är registerändringar och görs medvetet, med raden uppdaterad.

Det är detta som gör konceptet flyttsäkert: invarianten är registret och
klassificeringen, inte skärmarna. Skärmar är förbrukningsvara.
