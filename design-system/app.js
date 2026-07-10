/* SlayCRM · app.js — prototypens egen logik ovanpå det kanoniska designsystemet.
   Rör inte screens.js/theme.js. Ansvar:
     1. hash-router som växlar .view.is-active + nav-highlight
     2. Affär-detaljvyn fylls från en DEALS-tabell
     3. undertabbar i detaljvyn (.tab ↔ .tab-pane)
     4. uppföljnings-modalens innandöme (kalender, affärsbox)
     5. datumintervall-filter med inline-kalender i .range-menu
   screens.js äger fortsatt nav-dropdown, drawer/modal, filter-toggle,
   type-picker och mobil-nav. */
(function () {
  'use strict';

  var MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  var MONTHS_LONG = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
  var DOW = ['må', 'ti', 'on', 'to', 'fr', 'lö', 'sö'];

  /* ── data ──────────────────────────────────────────────────────── */

  var COMPANIES = {
    'Nordvik Logistik AB': {
      id: 'nordvik', city: 'Göteborg', addr1: 'Lindholmsallén 10', addr2: '417 55 Göteborg',
      relation: 'Kund', tone: 'success', kategori: 'Logistik', tel: '08-611 22 00', owner: 'W. Bernting', senaste: '16 juni 2026',
      contacts: [
        { name: 'Elin Åkerlund', role: 'Inköpschef', email: 'elin@nordviklogistik.se', tel: '031-266 77 80' },
        { name: 'Anders Petterson', role: 'VD', email: 'anders@nordviklogistik.se', tel: '031-266 77 88' }
      ]
    },
    'Bergström Automation AB': {
      id: 'bergstrom', city: 'Västerås', addr1: 'Kopparbergsvägen 8', addr2: '722 13 Västerås',
      relation: 'Prospekt', tone: 'info', kategori: 'Automation', tel: '021-14 88 00', owner: 'P. Steinberger', senaste: '12 juni 2026',
      contacts: [
        { name: 'Petra Bergström', role: 'VD', email: 'petra@bergstrom.se', tel: '021-14 88 00' },
        { name: 'Sven Ohlin', role: 'Teknikchef', email: 'sven@bergstrom.se', tel: '021-14 88 12' }
      ]
    },
    'Op & Partners AB': {
      id: 'oppartners', city: 'Hässleholm', addr1: 'Järnvägsgatan 4', addr2: '281 31 Hässleholm',
      relation: 'Partner', tone: 'warning', kategori: 'Konsult', tel: '0451-210 00', owner: 'A. Malmberg', senaste: '4 juli 2026',
      contacts: [
        { name: 'Ola Persson', role: 'Delägare', email: 'ola@oppartners.se', tel: '0451-210 00' },
        { name: 'Mia Berg', role: 'Inköp', email: 'mia@oppartners.se', tel: '0451-210 04' }
      ]
    },
    'Kvist Industri AB': {
      id: 'kvist', city: 'Jönköping', addr1: 'Industrigatan 22', addr2: '553 02 Jönköping',
      relation: 'Kund', tone: 'success', kategori: 'Tillverkning', tel: '036-71 40 00', owner: 'P. Steinberger', senaste: '27 juni 2026',
      contacts: [
        { name: 'Mia Kvist', role: 'VD', email: 'mia@kvistindustri.se', tel: '036-71 40 00' }
      ]
    },
    'Sydfrakt & Co AB': {
      id: 'sydfrakt', city: 'Malmö', addr1: 'Hamngatan 3', addr2: '211 22 Malmö',
      relation: 'Inaktiv', tone: 'danger', kategori: '—', tel: '040-660 12 00', owner: 'W. Bernting', senaste: '2 maj 2026',
      contacts: [
        { name: 'Lars Sydfrakt', role: 'VD', email: 'lars@sydfrakt.se', tel: '040-660 12 00' }
      ]
    }
  };

  /* slår upp företag på id (för #/foretag/<id>) och listar affärer per företag */
  var COMPANY_BY_ID = {};
  Object.keys(COMPANIES).forEach(function (name) { COMPANY_BY_ID[COMPANIES[name].id] = name; });
  function dealsForCompany(name) {
    return Object.keys(DEALS).filter(function (id) { return DEALS[id].company === name; })
      .map(function (id) { return { id: id, deal: DEALS[id] }; });
  }

  /* affärer — trogen mot routes/deals/$dealId.tsx: pipeline-fas (stage) + tone för listbadge,
     härledd status (öppen/vunnen/förlorad), sannolikhet, kontaktperson (→ CONTACTS), beskrivning
     och ett händelseflöde. Affärsvärdet stäms av mot ev. accepterad offert (reconcile). */
  var DEALS = {
    'AFF-2041': { name: 'Q3-leverans automation', company: 'Bergström Automation AB', value: '1 250 000 kr', stage: 'Offert', tone: 'warning', owner: 'P. Steinberger', close: '31 aug 2026',
      prob: 60, created: '18 juni 2026', contact: 'petra-bergstrom',
      desc: 'Leverans av automationslinje för Q3 med installation och utbildning på plats. Kunden vill förankra pris internt före beslut.',
      orderLines: [
        { product: 'Automationslinje AL-500', qty: 1, unit: 780000, moms: 25 },
        { product: 'Installation på plats', qty: 1, unit: 180000, moms: 25 },
        { product: 'Utbildning', benamning: '2 dagar', qty: 2, unit: 50000, moms: 25 }
      ],
      events: [
        { date: '10 juli, 14:00', type: 'Samtal', text: 'Prisdiskussion 3-årsavtal. Ville ha 5% rabatt, kollar med chef.', owner: 'W. Bernting' },
        { date: '5 juli, 14:00', type: 'E-post', text: 'Skickade prisunderlag för Q3 till Petra.', owner: 'W. Bernting' },
        { date: '2 juli, 09:15', type: 'Samtal', text: 'Samtal med Petra, positiv ton. Vill förankra internt.', owner: 'W. Bernting' },
        { date: '18 juni, 11:00', type: 'Möte', text: 'Uppstartsmöte, gick igenom behov och tidplan.', owner: 'P. Steinberger' }
      ] },
    'AFF-2038': { name: 'Ramavtal transport 2026', company: 'Nordvik Logistik AB', value: '480 000 kr', stage: 'Kvalificerad', tone: 'info', owner: 'W. Bernting', close: '31 aug 2026',
      prob: 40, created: '2 juni 2026', contact: 'ola-nordvik',
      desc: 'Ramavtal för transportslinga Göteborg–Stockholm under 2026, med option på expressleverans.',
      orderLines: [
        { product: 'Transportslinga Gbg–Sthlm', benamning: 'per månad', qty: 12, unit: 32000, moms: 25 },
        { product: 'Expressoption', qty: 1, unit: 80000, moms: 25 }
      ],
      events: [
        { date: '7 juli, 09:00', type: 'Samtal', text: 'Väntar på styrelsebeslut, hör av dig efter v.28.', owner: 'W. Bernting' },
        { date: '20 juni, 13:30', type: 'Möte', text: 'Genomgång av ramavtalets omfattning.', owner: 'W. Bernting' }
      ] },
    'AFF-2044': { name: 'Servicekontrakt 3 år', company: 'Op & Partners AB', value: '320 000 kr', stage: 'Lead', tone: 'neutral', owner: 'A. Malmberg', close: '30 sep 2026',
      prob: 20, created: '24 juni 2026', contact: 'johan-op',
      desc: 'Serviceavtal med årlig revision under 36 månader. Offert accepterad, väntar på signering.',
      events: [
        { date: '9 juli, 09:00', type: 'Möte', text: 'Uppföljningsmöte inför 3-årsavtal, båda delägarna med.', owner: 'P. Steinberger' }
      ] },
    'AFF-2029': { name: 'Utökning lagersystem', company: 'Nordvik Logistik AB', value: '210 000 kr', stage: 'Vunnen', tone: 'success', owner: 'W. Bernting', close: '20 maj 2026',
      prob: 100, created: '4 april 2026', contact: 'ola-nordvik',
      desc: 'Utbyggnad av WMS med integrationsarbete mot befintligt affärssystem.',
      orderLines: [
        { product: 'WMS-utökning', qty: 1, unit: 150000, moms: 25 },
        { product: 'Integrationsarbete', qty: 1, unit: 40000, moms: 25 }
      ],
      events: [
        { date: '20 maj, 16:00', type: 'Anteckning', text: 'Affär vunnen. Order lagd på utökning av WMS.', owner: 'W. Bernting' }
      ] },
    'AFF-2015': { name: 'Pilotprojekt sensorer', company: 'Bergström Automation AB', value: '95 000 kr', stage: 'Förlorad', tone: 'danger', owner: 'A. Malmberg', close: '—',
      prob: 0, created: '2 maj 2026', contact: 'petra-bergstrom',
      desc: 'Pilot med sensorpaket och analysrapport inför breddad utrullning.',
      events: [
        { date: '18 juni, 10:00', type: 'Anteckning', text: 'Affär förlorad. Kunden valde konkurrent på pris.', owner: 'A. Malmberg' }
      ] },
    'AFF-2050': { name: 'Supportavtal drift', company: 'Sydfrakt & Co AB', value: '60 000 kr', stage: 'Lead', tone: 'neutral', owner: 'W. Bernting', close: '31 okt 2026',
      prob: 20, created: '1 juli 2026', contact: 'lars-sydfrakt',
      desc: 'Löpande supportavtal för drift, första kontakt taget.',
      events: [] },
    'AFF-2051': { name: 'Utbyggnad terminal', company: 'Kvist Industri AB', value: '540 000 kr', stage: 'Kvalificerad', tone: 'info', owner: 'P. Steinberger', close: '30 nov 2026',
      prob: 40, created: '12 juni 2026', contact: 'mia-kvist',
      desc: 'Utbyggnad av terminal med ny hanteringsutrustning.',
      events: [
        { date: '27 juni, 10:30', type: 'Möte', text: 'Platsbesök på terminalen, kartlade behov.', owner: 'P. Steinberger' }
      ] },
    'AFF-2052': { name: 'Serviceavtal drift', company: 'Kvist Industri AB', value: '180 000 kr', stage: 'Vunnen', tone: 'success', owner: 'P. Steinberger', close: '15 jun 2026',
      prob: 100, created: '20 april 2026', contact: 'mia-kvist',
      desc: 'Serviceavtal för drift av befintlig anläggning.',
      events: [
        { date: '15 juni, 14:00', type: 'Anteckning', text: 'Affär vunnen, avtal signerat.', owner: 'P. Steinberger' }
      ] }
  };

  var CONTACTS = {
    'ola-nordvik':     { name: 'Ola Nordvik',     role: 'VD',        company: 'Nordvik Logistik AB',     email: 'ola@nordvik.se',       tel: '070 111 22 33', owner: 'W. Bernting',    status: 'Aktiv',   tone: 'success' },
    'petra-bergstrom': { name: 'Petra Bergström', role: 'VD',        company: 'Bergström Automation AB', email: 'petra@bergstrom.se',   tel: '070 222 33 44', owner: 'P. Steinberger', status: 'Aktiv',   tone: 'success' },
    'johan-op':        { name: 'Johan Op',        role: 'Delägare',  company: 'Op & Partners AB',        email: 'johan@oppartners.se',  tel: '070 333 44 55', owner: 'A. Malmberg',    status: 'Aktiv',   tone: 'success' },
    'mia-kvist':       { name: 'Mia Kvist',       role: 'VD',        company: 'Kvist Industri AB',       email: 'mia@kvistindustri.se', tel: '070 444 55 66', owner: 'P. Steinberger', status: 'Aktiv',   tone: 'success' },
    'lars-sydfrakt':   { name: 'Lars Sydfrakt',   role: 'VD',        company: 'Sydfrakt & Co AB',        email: 'lars@sydfrakt.se',     tel: '070 555 66 77', owner: 'W. Bernting',    status: 'Inaktiv', tone: 'neutral' }
  };

  /* produktkatalog för "Välj produkt (valfritt)" i lägg-till-raden (motsvarar DBProduct) */
  var PRODUCTS = [
    { id: 'p-crm-start', name: 'Demo CRM Start', price: 4800, moms: 25 },
    { id: 'p-crm-pro', name: 'Demo CRM Pro', price: 7200, moms: 25 },
    { id: 'p-crm-ent', name: 'Demo CRM Enterprise', price: 12000, moms: 25 },
    { id: 'p-integr', name: 'Integrationspaket', price: 35000, moms: 25 },
    { id: 'p-support', name: 'Support Premium', price: 18000, moms: 25 },
    { id: 'p-utb', name: 'Utbildningsdag', price: 12000, moms: 25 }
  ];

  /* offerter — trogen mot routes/offerter/$quoteId.tsx: offertnummer + statusnyckel
     (draft/sent/accepted/rejected/expired), följebrev, villkor, momsade rader och
     ett fruset kund-snapshot. Rad = { product, benamning, qty, unit, discount, moms }. */
  var OFFERS = {
    'OFF-3041': { number: '2026-0041', title: 'Q3-leverans automation — Bergström Automation', company: 'Bergström Automation AB', orgnr: '556021-0041',
      status: 'sent', sentISO: '2026-07-04', validISO: '2026-08-15', deal: 'AFF-2041',
      coverNote: 'Offert på automationsleverans för Q3 med installation och utbildning på plats.',
      terms: 'Betalningsvillkor: 30 dagar netto. Leverans enligt överenskommen tidplan.',
      lines: [
        { product: 'Automationsmodul X3', benamning: 'Grundpaket', qty: 5, unit: 180000, discount: 0, moms: 25 },
        { product: 'Installation och driftsättning', benamning: '', qty: 1, unit: 250000, discount: 0, moms: 25 },
        { product: 'Utbildning på plats', benamning: '2 dagar', qty: 2, unit: 50000, discount: 0, moms: 25 }
      ] },
    'OFF-3038': { number: '2026-0038', title: 'Ramavtal transport 2026 — Nordvik Logistik', company: 'Nordvik Logistik AB', orgnr: '556021-0038',
      status: 'draft', sentISO: '', validISO: '', deal: 'AFF-2038',
      coverNote: '',
      terms: '',
      lines: [
        { product: 'Transportslinga Göteborg–Stockholm', benamning: 'Månadsavgift', qty: 12, unit: 30000, discount: 0, moms: 25 },
        { product: 'Expressleverans, tillägg', benamning: '', qty: 1, unit: 120000, discount: 0, moms: 25 }
      ] },
    'OFF-3044': { number: '2026-0044', title: 'Servicekontrakt 3 år — Op & Partners', company: 'Op & Partners AB', orgnr: '556021-0044',
      status: 'accepted', sentISO: '2026-06-28', validISO: '', deal: 'AFF-2044',
      coverNote: 'Serviceavtal med årlig revision under 36 månader.',
      terms: 'Betalningsvillkor: 30 dagar netto.',
      lines: [
        { product: 'Serviceavtal drift', benamning: 'Månadsavgift', qty: 36, unit: 8000, discount: 0, moms: 25 },
        { product: 'Årlig revision', benamning: '', qty: 2, unit: 16000, discount: 0, moms: 25 }
      ] },
    'OFF-3029': { number: '2026-0029', title: 'Utökning lagersystem — Nordvik Logistik', company: 'Nordvik Logistik AB', orgnr: '556021-0038',
      status: 'expired', sentISO: '2026-06-02', validISO: '2026-06-30', deal: 'AFF-2029',
      coverNote: 'Utbyggnad av WMS med integrationsarbete.',
      terms: 'Betalningsvillkor: 30 dagar netto.',
      lines: [
        { product: 'Lagermodul WMS', benamning: '', qty: 1, unit: 150000, discount: 0, moms: 25 },
        { product: 'Integrationsarbete', benamning: 'Löpande timmar', qty: 40, unit: 1500, discount: 0, moms: 25 }
      ] },
    'OFF-3015': { number: '2026-0015', title: 'Pilotprojekt sensorer — Bergström Automation', company: 'Bergström Automation AB', orgnr: '556021-0041',
      status: 'rejected', sentISO: '2026-06-18', validISO: '', deal: 'AFF-2015',
      coverNote: 'Pilot med sensorpaket och analysrapport.',
      terms: 'Betalningsvillkor: 30 dagar netto.',
      lines: [
        { product: 'Sensorpaket pilot', benamning: '', qty: 10, unit: 6500, discount: 0, moms: 25 },
        { product: 'Analys och rapport', benamning: '', qty: 1, unit: 30000, discount: 0, moms: 25 }
      ] }
  };

  var ACTIVITIES = {
    'AKT-4021': {
      title: 'Transportavtal', type: 'Samtal', date: '7 juli, 09:00', rel: '2 dgr sedan',
      company: 'Nordvik Logistik AB', owner: 'W. Bernting', count: 2,
      status: 'Försenad', tone: 'danger', note: 'Väntar på styrelsebeslut, hör av dig efter v.28.',
      deal: 'AFF-2038', contact: 'ola-nordvik', source: 'Uppföljning affär'
    },
    'AKT-4022': {
      title: 'Uppföljningsmöte inför Q3-avtal', type: 'Möte', date: '9 juli, 09:00', rel: 'Idag',
      company: 'Op & Partners AB', owner: 'P. Steinberger', count: 4,
      status: 'Idag', tone: 'info', note: 'Ola vill ha med båda delägarna. Föreslå tisdag fm.',
      deal: 'AFF-2044', contact: 'johan-op', source: 'Inbokat möte'
    },
    'AKT-4023': {
      title: 'Prisdiskussion 3-årsavtal', type: 'Samtal', date: '10 juli, 14:00', rel: 'Imorgon',
      company: 'Bergström Automation AB', owner: 'W. Bernting', count: 1,
      status: 'Imorgon', tone: 'neutral', note: 'Ville ha 5% rabatt vid 3-årsavtal. Kolla med chef.',
      deal: 'AFF-2041', contact: 'petra-bergstrom', source: 'Inkommande samtal'
    },
    'AKT-4024': {
      title: 'Följ upp leveransfråga', type: 'Möte', date: '11 juli, 16:00', rel: 'Denna vecka',
      company: 'Nordvik Logistik AB', owner: 'A. Malmberg', count: 10,
      status: 'Denna vecka', tone: 'neutral', note: 'Undrar om vi klarar leverans inom 48h till Norrland.',
      deal: 'AFF-2038', contact: 'ola-nordvik', source: 'Uppföljning affär'
    }
  };

  /* ── router ────────────────────────────────────────────────────── */

  var ROUTES = {
    aktiviteter:    { sec: 'view-aktiviteter',   nav: 'aktiviteter', group: null },
    affarer:        { sec: 'view-affarer',       nav: 'affarer',     group: 'affar' },
    offerter:       { sec: 'view-offerter',      nav: 'offerter',    group: 'affar' },
    foretag:        { sec: 'view-foretag',       nav: 'foretag',     group: 'foretag' },
    kontakter:      { sec: 'view-kontakter',     nav: 'kontakter',   group: 'foretag' },
    saljtavlan:       { sec: 'view-saljtavlan',      nav: 'saljtavlan',  group: null },
    'affar-detalj':   { sec: 'view-affar-detalj',    nav: 'affarer',     group: 'affar' },
    'foretag-detalj': { sec: 'view-foretag-detalj',  nav: 'foretag',     group: 'foretag' },
    'kontakt-detalj': { sec: 'view-kontakt-detalj',  nav: 'kontakter',   group: 'foretag' },
    'offert-detalj':  { sec: 'view-offert-detalj',   nav: 'offerter',    group: 'affar' },
    'aktivitet-detalj': { sec: 'view-aktivitet-detalj', nav: 'aktiviteter', group: null }
  };

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    if (!h) return { view: 'aktiviteter' };
    var parts = h.split('/');
    if (parts[0] === 'affar' && parts[1] && DEALS[parts[1]]) return { view: 'affar-detalj', id: parts[1] };
    if (parts[0] === 'foretag' && parts[1] && COMPANY_BY_ID[parts[1]]) return { view: 'foretag-detalj', id: parts[1] };
    if (parts[0] === 'kontakt' && parts[1] && CONTACTS[parts[1]]) return { view: 'kontakt-detalj', id: parts[1] };
    if (parts[0] === 'offert' && parts[1] && OFFERS[parts[1]]) return { view: 'offert-detalj', id: parts[1] };
    if (parts[0] === 'aktivitet' && parts[1] && ACTIVITIES[parts[1]]) return { view: 'aktivitet-detalj', id: parts[1] };
    if (ROUTES[parts[0]]) return { view: parts[0] };
    return { view: 'aktiviteter' };
  }

  function setNav(route) {
    document.querySelectorAll('.nav [data-nav]').forEach(function (el) { el.classList.remove('is-active'); });
    document.querySelectorAll('.nav .nav-parent').forEach(function (el) { el.classList.remove('is-active'); });
    var item = document.querySelector('.nav [data-nav="' + route.nav + '"]');
    if (item) item.classList.add('is-active');
    if (route.group) {
      var parent = document.querySelector('.nav-group[data-group="' + route.group + '"] .nav-parent');
      if (parent) parent.classList.add('is-active');
    }
  }

  function route() {
    var r = parseHash();
    var def = ROUTES[r.view];
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('is-active'); });
    var sec = document.getElementById(def.sec);
    if (sec) sec.classList.add('is-active');
    setNav(def);
    if (r.view === 'affar-detalj') fillDetail(r.id);
    if (r.view === 'foretag-detalj') fillCompanyDetail(r.id);
    if (r.view === 'kontakt-detalj') fillContactDetail(r.id);
    if (r.view === 'offert-detalj') fillOfferDetail(r.id);
    if (r.view === 'aktivitet-detalj') fillActivityDetail(r.id);

    /* stäng ev. öppen mobil-nav och nav-grupper vid vybyte (ingen sidladdning i SPA) */
    var nav = document.querySelector('.nav');
    if (nav) nav.classList.remove('is-open');
    document.querySelectorAll('.nav-group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
    var navToggle = document.querySelector('.nav-toggle');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');

    window.scrollTo(0, 0);
  }

  /* ── Affär-detalj: fyll från DEALS ─────────────────────────────── */

  function txt(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }

  /* pipeline-faser (klickbara chips när affären är öppen); Vunnen/Förlorad = stängda lägen */
  var DEAL_STAGES = ['Lead', 'Kvalificerad', 'Offert', 'Förhandling'];
  var STAGE_TONE = { Lead: 'neutral', Kvalificerad: 'info', Offert: 'warning', 'Förhandling': 'info' };
  var STAGE_PROB = { Lead: 20, Kvalificerad: 40, Offert: 60, 'Förhandling': 80 };

  var afCurrent = null;

  function dealStatus(d) { return d.stage === 'Vunnen' ? 'won' : d.stage === 'Förlorad' ? 'lost' : 'open'; }
  function offersForDeal(id) {
    return Object.keys(OFFERS).filter(function (o) { return OFFERS[o].deal === id; });
  }
  function parseSEK(s) { return parseFloat(String(s == null ? '' : s).replace(/[^\d]/g, '')) || 0; }
  function acceptedNetForDeal(id) {
    var acc = offersForDeal(id).filter(function (o) { return OFFERS[o].status === 'accepted'; })[0];
    return acc ? orderTotals(OFFERS[acc].lines).net : null;
  }

  /* Åtgärder-meny — allt som ändrar affären bor här: fasflytt + stäng (öppen), återöppna (stängd).
     Speglar DealDetailHeader men samlat i en dropdown (samma mönster som offert-detaljens Åtgärder). */
  function renderDealMenu(id) {
    var d = DEALS[id];
    var menu = document.getElementById('af-actions-menu');
    if (!menu || !d) return;
    var st = dealStatus(d), items = [];
    if (st === 'open') {
      DEAL_STAGES.forEach(function (s) {
        items.push('<button type="button" role="menuitem" data-stage="' + s + '"' + (s === d.stage ? ' aria-current="true"' : '') + '>' + s +
          (s === d.stage ? '<span class="af-menu-now">nuvarande</span>' : '') + '</button>');
      });
      items.push('<hr class="oqd-menu-sep">');
      items.push('<button type="button" role="menuitem" data-dealstatus="won">Stäng som vunnen</button>');
      items.push('<button type="button" role="menuitem" class="danger" data-dealstatus="lost">Stäng som förlorad</button>');
    } else {
      items.push('<button type="button" role="menuitem" data-dealstatus="reopen">Återöppna affären</button>');
    }
    menu.innerHTML = items.join('');
  }

  /* affärsfakta bor i höger-railen (som offert-detaljens snapshot): sannolikhet + skapad
     (värde/fas/avslut/ansvarig sätts i fillDetail/reRenderDeal). Här även avstämningsvarningen. */
  function renderDealFacts(id) {
    var d = DEALS[id];
    txt('af-prob', d.prob + ' %');
    txt('af-created', d.created);

    /* avstämning: accepterad offert vs affärsvärde (dormant när de stämmer) */
    var rec = document.getElementById('af-reconcile');
    if (rec) {
      var net = acceptedNetForDeal(id);
      if (net != null && Math.round(net) !== parseSEK(d.value)) {
        rec.querySelector('.notice-inline__text').textContent =
          'Affärsvärdet stämmer inte med accepterad offert (' + fmtSEK(net) + ').';
        rec.hidden = false;
      } else {
        rec.hidden = true;
      }
    }
  }

  function renderDealActivities(id) {
    var d = DEALS[id];
    setCount('af-akt-count', d.events.length);
    var feed = document.getElementById('af-akt-feed');
    if (!feed) return;
    if (!d.events.length) {
      feed.innerHTML = '<div class="empty"><div class="empty-title">Inga aktiviteter ännu</div>' +
        '<p>Logga ett samtal, ett möte eller en anteckning så byggs flödet här.</p></div>';
      return;
    }
    feed.innerHTML = d.events.map(function (e) {
      return '<div class="row">' +
        '<div class="cell"><div class="primary">' + e.date + '</div><div class="secondary">' + e.type + '</div></div>' +
        '<div class="cell"><div class="primary">' + e.text + '</div></div>' +
        '<div class="cell col-owner"><div class="primary">' + e.owner + '</div><div class="secondary">Ansvarig</div></div>' +
      '</div>';
    }).join('');
  }

  function renderDealOffers(id) {
    var ids = offersForDeal(id);
    setCount('af-off-count', ids.length);
    var list = document.getElementById('af-off-list');
    if (!list) return;
    if (!ids.length) {
      list.innerHTML = '<div class="empty"><div class="empty-title">Inga offerter ännu</div>' +
        '<p>Skapa en offert från affären så visas den här.</p></div>';
      return;
    }
    /* samma radformat som offertlistan (col-title/col-amount/col-status); företag utelämnas
       eftersom hela listan hör till en och samma affär (och därmed ett företag). */
    list.innerHTML = ids.map(function (oid) {
      var o = OFFERS[oid];
      var meta = QSTATUS[o.status] || { label: o.status, tone: 'neutral' };
      var gross = orderTotals(o.lines).gross;
      var title = String(o.title).split(' — ')[0];
      var sub = oid + ' · ' + meta.label.toLowerCase() + (o.sentISO ? ' ' + isoToSv(o.sentISO) : '');
      return '<a class="row" href="#/offert/' + oid + '">' +
        '<div class="cell col-title"><div class="primary">' + title + '</div><div class="secondary">' + sub + '</div></div>' +
        '<div class="cell col-amount"><span class="amount">' + fmtSEK(gross) + '</span><div class="secondary">Värde</div></div>' +
        '<div class="col-status"><span class="badge badge--' + meta.tone + '">' + meta.label + '</span></div></a>';
    }).join('');
  }

  /* omritning efter en status-/fasändring i minnet (utan att byta vy) */
  function reRenderDeal(id) {
    var d = DEALS[id];
    txt('af-value', d.value);
    var stage = document.getElementById('af-stage');
    if (stage) { stage.className = 'badge badge--' + d.tone; stage.textContent = d.stage; }
    txt('af-owner', d.owner);
    txt('af-close', d.close);
    renderDealMenu(id);
    renderDealFacts(id);
    renderDealActivities(id);
    if (afOrderEditor) afOrderEditor.render();
  }
  function setDealStage(id, s) {
    var d = DEALS[id];
    d.stage = s; d.tone = STAGE_TONE[s] || 'neutral';
    if (STAGE_PROB[s] != null) d.prob = STAGE_PROB[s];
    reRenderDeal(id);
  }
  function closeDeal(id, won) {
    var d = DEALS[id];
    if (dealStatus(d) === 'open') d._prevStage = d.stage;
    d.stage = won ? 'Vunnen' : 'Förlorad';
    d.tone = won ? 'success' : 'danger';
    d.prob = won ? 100 : 0;
    reRenderDeal(id);
  }
  function reopenDeal(id) {
    var d = DEALS[id];
    var s = d._prevStage || 'Kvalificerad';
    d.stage = s; d.tone = STAGE_TONE[s] || 'info';
    d.prob = STAGE_PROB[s] != null ? STAGE_PROB[s] : 40;
    reRenderDeal(id);
  }

  /* delegerade lyssnare (kopplas en gång): Åtgärder-meny (toggle + fasflytt/stäng/återöppna), skapa offert */
  function initDealDetail() {
    var view = document.getElementById('view-affar-detalj');
    if (!view) return;

    /* Åtgärder-dropdown: egen toggle (screens.js rör bara .filter-group) — mönster ur offert-detaljen */
    var actBtn = document.getElementById('af-actions-btn');
    var actMenu = document.getElementById('af-actions-menu');
    function closeActMenu() {
      if (actMenu) actMenu.classList.remove('is-open');
      if (actBtn) actBtn.setAttribute('aria-expanded', 'false');
    }
    if (actBtn && actMenu) {
      actBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = actMenu.classList.toggle('is-open');
        actBtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('.af-menu-wrap')) closeActMenu(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeActMenu(); });
    }

    view.addEventListener('click', function (e) {
      if (!afCurrent) return;
      var mi = e.target.closest('#af-actions-menu button');
      if (mi) {
        if (mi.dataset.stage) setDealStage(afCurrent, mi.dataset.stage);
        else if (mi.dataset.dealstatus === 'won') closeDeal(afCurrent, true);
        else if (mi.dataset.dealstatus === 'lost') closeDeal(afCurrent, false);
        else if (mi.dataset.dealstatus === 'reopen') reopenDeal(afCurrent);
        closeActMenu();
        return;
      }
      if (e.target.closest('#af-new-offer')) {
        /* prototypen persisterar inte nya offerter; öppna affärens offert-arbetsyta
           (draft om sådan finns) — det är där raderna redigeras, precis som i skarpa flödet */
        var ids = offersForDeal(afCurrent);
        var draft = ids.filter(function (o) { return OFFERS[o].status === 'draft'; })[0];
        var target = draft || ids[0];
        if (target) location.hash = '#/offert/' + target;
        else setTab(document.querySelector('#view-affar-detalj .detail-main'), 'offerter');
        return;
      }
    });
  }

  function fillDetail(id) {
    var d = DEALS[id];
    if (!d) return;
    afCurrent = id;
    var co = COMPANIES[d.company] || { city: '', addr1: '', addr2: '', contacts: [] };

    txt('af-title', d.name);
    txt('af-value', d.value);
    txt('af-owner', d.owner);
    txt('af-close', d.close);
    var stage = document.getElementById('af-stage');
    if (stage) { stage.className = 'badge badge--' + d.tone; stage.textContent = d.stage; }
    txt('af-ov-desc', d.desc || '—');

    renderDealMenu(id);
    renderDealFacts(id);
    renderDealActivities(id);
    renderDealOffers(id);
    if (afOrderEditor) { afOrderEditor.clearAdd(); afOrderEditor.render(); }

    var sideCo = document.getElementById('af-side-company');
    if (sideCo) sideCo.innerHTML = co.id
      ? '<a href="#/foretag/' + co.id + '">' + d.company + '</a>'
      : d.company;
    txt('af-side-addr1', co.addr1);
    txt('af-side-addr2', co.addr2);

    var wrap = document.getElementById('af-side-contacts');
    if (wrap) {
      wrap.innerHTML = '';
      (co.contacts || []).forEach(function (c) {
        var box = document.createElement('div');
        box.className = 'side-entity';
        box.innerHTML =
          '<div class="primary">' + c.name + '</div>' +
          '<div class="secondary">' + c.role + '</div>' +
          '<div class="secondary"><a href="mailto:' + c.email + '">' + c.email + '</a></div>' +
          '<div class="secondary"><a href="tel:' + c.tel.replace(/\s/g, '') + '">' + c.tel + '</a></div>';
        wrap.appendChild(box);
      });
    }

    /* alltid tillbaka till Översikt när en ny affär öppnas */
    setTab(document.querySelector('#view-affar-detalj .detail-main'), 'oversikt');
  }

  /* ── Företag-detalj: fyll från COMPANIES + härledda affärer ─────── */

  function fillCompanyDetail(cid) {
    var name = COMPANY_BY_ID[cid];
    if (!name) return;
    var co = COMPANIES[name];

    txt('fo-title', name);
    txt('fo-city', co.city);
    txt('fo-owner', co.owner);
    txt('fo-senaste', co.senaste);

    var rel = document.getElementById('fo-relation');
    if (rel) { rel.className = 'badge badge--' + co.tone; rel.textContent = co.relation; }

    /* rail-fakta (Kategori/Telefon nya i railen; övriga id:n återanvänds från gamla meta-row) */
    txt('fo-kategori', co.kategori);
    txt('fo-tel', co.tel);

    /* Kontakter-fliken */
    var kWrap = document.getElementById('fo-kontakter');
    if (kWrap) {
      kWrap.innerHTML = '';
      co.contacts.forEach(function (c) {
        var row = document.createElement('div');
        row.className = 'mini-row';
        /* namn + roll räcker här – kontaktkanalerna (e-post/tel) bor i högerrailen */
        row.innerHTML =
          '<div><div class="mini-title">' + c.name + '</div><div class="mini-sub">' + c.role + '</div></div>';
        kWrap.appendChild(row);
      });
    }
    setCount('fo-kontakter-count', co.contacts.length);

    /* Affärer-fliken — länkar till respektive affär-detalj */
    var dWrap = document.getElementById('fo-affarer');
    var deals = dealsForCompany(name);
    if (dWrap) {
      dWrap.innerHTML = '';
      if (!deals.length) {
        dWrap.innerHTML = '<div class="mini-sub" style="padding:4px 2px">Inga affärer på företaget än.</div>';
      }
      deals.forEach(function (d) {
        var a = document.createElement('a');
        a.className = 'mini-row';
        a.href = '#/affar/' + d.id;
        a.innerHTML =
          '<div><div class="mini-title">' + d.deal.name + '</div><div class="mini-sub">' + d.id + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:16px"><span class="amount">' + d.deal.value + '</span>' +
          '<span class="badge badge--' + d.deal.tone + '">' + d.deal.stage + '</span></div>';
        dWrap.appendChild(a);
      });
    }
    setCount('fo-affarer-count', deals.length);

    /* sidorail: primär kontakt */
    var pWrap = document.getElementById('fo-side-primary');
    if (pWrap) {
      var c = co.contacts[0];
      pWrap.innerHTML = c
        ? '<div class="side-entity"><div class="primary">' + c.name + '</div>' +
          '<div class="secondary">' + c.role + '</div>' +
          '<div class="secondary"><a href="mailto:' + c.email + '">' + c.email + '</a></div>' +
          '<div class="secondary"><a href="tel:' + c.tel.replace(/\s/g, '') + '">' + c.tel + '</a></div></div>'
        : '';
    }
    txt('fo-side-addr1', co.addr1);
    txt('fo-side-addr2', co.addr2);

    setTab(document.querySelector('#view-foretag-detalj .detail-main'), 'fo-oversikt');
  }

  /* ── Kontakt-detalj: fyll från CONTACTS + härledda affärer ─────── */

  function companyLink(companyName) {
    var co = COMPANIES[companyName];
    return (co && co.id)
      ? '<a href="#/foretag/' + co.id + '">' + companyName + '</a>'
      : companyName;
  }

  function renderDealMiniList(wrap, deals, emptyMsg) {
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!deals.length) {
      wrap.innerHTML = '<div class="mini-sub" style="padding:4px 2px">' + emptyMsg + '</div>';
      return;
    }
    deals.forEach(function (d) {
      var a = document.createElement('a');
      a.className = 'mini-row';
      a.href = '#/affar/' + d.id;
      a.innerHTML =
        '<div><div class="mini-title">' + d.deal.name + '</div><div class="mini-sub">' + d.id + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:16px"><span class="amount">' + d.deal.value + '</span>' +
        '<span class="badge badge--' + d.deal.tone + '">' + d.deal.stage + '</span></div>';
      wrap.appendChild(a);
    });
  }

  function fillContactDetail(cid) {
    var c = CONTACTS[cid];
    if (!c) return;
    var co = COMPANIES[c.company];

    txt('ko-title', c.name);
    txt('ko-role', c.role);
    txt('ko-owner', c.owner);

    var st = document.getElementById('ko-status');
    if (st) { st.className = 'badge badge--' + c.tone; st.textContent = c.status; }

    /* Affärer-fliken — företagets affärer */
    var deals = dealsForCompany(c.company);
    renderDealMiniList(document.getElementById('ko-affarer'), deals, 'Inga affärer på företaget än.');
    setCount('ko-affarer-count', deals.length);

    /* sidorail: företag + kanaler */
    var sideCo = document.getElementById('ko-side-company');
    if (sideCo) sideCo.innerHTML = companyLink(c.company);
    txt('ko-side-addr1', co ? co.addr1 : '');
    txt('ko-side-addr2', co ? co.addr2 : '');

    var chan = document.getElementById('ko-side-channels');
    if (chan) chan.innerHTML =
      '<div class="secondary"><a href="mailto:' + c.email + '">' + c.email + '</a></div>' +
      '<div class="secondary"><a href="tel:' + c.tel.replace(/\s/g, '') + '">' + c.tel + '</a></div>';

    setTab(document.querySelector('#view-kontakt-detalj .detail-main'), 'ko-oversikt');
  }

  /* ── Offert-detalj: fyll från OFFERS ───────────────────────────── */

  function dealLink(dealId) {
    var d = DEALS[dealId];
    return d ? '<a href="#/affar/' + dealId + '">' + d.name + '</a>' : '—';
  }

  /* Offert-detalj — trogen re-implementation av routes/offerter/$quoteId.tsx,
     omskinnad i vårt designsystem. Ordning och beteende speglar den skarpa vyn:
     header (nummer + statuschip + status-drivna åtgärder) → formulär
     → offertrader (moms, rabatt, låst läge) → fruset kund-snapshot. */

  /* status → { label, ton } (lib/crm.ts QUOTE_STATUS) */
  var QSTATUS = {
    draft:    { label: 'Utkast',     tone: 'neutral' },
    sent:     { label: 'Skickad',    tone: 'info' },
    accepted: { label: 'Accepterad', tone: 'success' },
    rejected: { label: 'Avböjd',     tone: 'danger' },
    expired:  { label: 'Förfallen',  tone: 'warning' }
  };
  /* tillåtna statusövergångar (support-filens TRANSITIONS) */
  var QTRANSITIONS = { sent: ['accepted', 'rejected', 'expired'] };
  var QACTION_LABEL = { accepted: 'Accepterad', rejected: 'Avböjd', expired: 'Markera förfallen' };

  /* momsmatematik, identisk med lib/vat.ts */
  function clampPct(v) { return Math.max(0, Math.min(100, v || 0)); }
  function lineNet(l)   { return (l.qty || 0) * (l.unit || 0) * (1 - clampPct(l.discount) / 100); }
  function lineVat(l)   { return lineNet(l) * (l.moms || 0) / 100; }
  function lineGross(l) { return lineNet(l) * (1 + (l.moms || 0) / 100); }
  function orderTotals(lines) {
    return lines.reduce(function (t, l) {
      t.net += lineNet(l); t.vat += lineVat(l); t.gross += lineGross(l); return t;
    }, { net: 0, vat: 0, gross: 0 });
  }
  function fmtNum(v) { return Math.round(v).toLocaleString('sv-SE').replace(/[  ]/g, ' '); }
  function fmtSEK(v) { return fmtNum(v) + ' SEK'; }

  function isoToSv(iso) {
    if (!iso) return '—';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
  function setVal(id, value) { var el = document.getElementById(id); if (el) el.value = value; }
  function flashButton(btn, label) {
    if (!btn) return;
    if (!btn._orig) btn._orig = btn.textContent;
    if (btn._t) clearTimeout(btn._t);
    btn.textContent = label;
    btn.disabled = true;
    btn._t = setTimeout(function () { btn.textContent = btn._orig; btn.disabled = false; btn._t = null; }, 1200);
  }

  var CHEV_SVG = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
  var TRASH_SVG = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.6 8.5a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.5M6.5 7v4M9.5 7v4"/></svg>';

  /* arbetskopia: { id, status, lines:[{product,benamning,qty,unit,discount,moms}] } */
  var ofCurrent = null;
  var ofEditor = null;        // offertens instans av den delade radeditorn
  var afOrderEditor = null;   // affärens orderrad-instans (samma editor, samma vy)

  function quoteLocked(status) { return status === 'accepted' || status === 'rejected'; }

  function momsOptions(sel) {
    return [25, 12, 6, 0].map(function (r) {
      return '<option value="' + r + '"' + (r === (sel || 0) ? ' selected' : '') + '>' + r + '%</option>';
    }).join('');
  }

  /* en offertrad.
     REDIGERBAR → självmärkande kort (DS .field-mönster som "Lägg till rad"): Produkt på egen
       rad, fältband under, summa nere till höger.
     LÅST → kompakt tabellrad under den delade rubrikremsan, alla värden högerlinjerade. */
  function lineRowHtml(l, i, locked) {
    var sum = fmtSEK(lineGross(l));
    if (locked) {
      return '<div class="oqd-line oqd-line-locked" data-row data-i="' + i + '">' +
        '<div class="oqd-name-cell"><span class="oqd-locked-val">' + escHtml(l.product) + '</span>' +
          (l.benamning ? '<span class="oqd-locked-desc">' + escHtml(l.benamning) + '</span>' : '') + '</div>' +
        '<span class="oqd-locked-val num">' + escHtml(l.qty) + '</span>' +
        '<span class="oqd-locked-val num">' + fmtNum(l.unit) + '</span>' +
        '<span class="oqd-locked-val num">' + (l.discount || 0) + '%</span>' +
        '<span class="oqd-locked-val">' + (l.moms || 0) + '%</span>' +
        '<span class="oqd-line-sum num">' + sum + '</span>' +
      '</div>';
    }
    return '<div class="oqd-line" data-row data-i="' + i + '">' +
      '<button class="dt-remove" type="button" aria-label="Ta bort rad">' + TRASH_SVG + '</button>' +
      '<div class="field oqd-line-product"><label class="field-label">Produkt</label>' +
        '<input class="input l-name" type="text" value="' + escAttr(l.product) + '" aria-label="Produktnamn"></div>' +
      '<div class="oqd-line-grid">' +
        '<div class="field oqd-line-benamning"><label class="field-label">Benämning</label>' +
          '<input class="input l-desc" type="text" value="' + escAttr(l.benamning || '') + '" placeholder="Valfri beskrivning" aria-label="Benämning"></div>' +
        '<div class="field"><label class="field-label">Antal</label>' +
          '<input class="input l-qty" type="number" min="0" step="1" value="' + l.qty + '" aria-label="Antal"></div>' +
        '<div class="field"><label class="field-label">À-pris (SEK)</label>' +
          '<input class="input l-unit" type="number" min="0" step="100" value="' + l.unit + '" aria-label="À-pris"></div>' +
        '<div class="field"><label class="field-label">Rabatt %</label>' +
          '<input class="input l-disc" type="number" min="0" max="100" step="1" value="' + (l.discount || 0) + '" aria-label="Rabatt"></div>' +
        '<div class="field"><label class="field-label">Moms</label>' +
          '<div class="select-wrap"><select class="select l-moms" aria-label="Moms">' + momsOptions(l.moms) + '</select>' + CHEV_SVG + '</div></div>' +
      '</div>' +
      '<div class="oqd-line-foot"><span class="oqd-line-sum" data-linesum>' + sum + '</span></div>' +
    '</div>';
  }

  function readLineFromRow(tr) {
    return {
      product: tr.querySelector('.l-name').value,
      benamning: tr.querySelector('.l-desc').value,
      qty: parseFloat(tr.querySelector('.l-qty').value) || 0,
      unit: parseFloat(tr.querySelector('.l-unit').value) || 0,
      discount: parseFloat(tr.querySelector('.l-disc').value) || 0,
      moms: parseFloat(tr.querySelector('.l-moms').value) || 0
    };
  }

  /* offertens render/totals delegeras till den delade radeditorn (createLineEditor) */
  function renderTotals() { if (ofEditor) ofEditor.renderTotals(); }
  function renderLines() { if (ofEditor) ofEditor.render(); }

  /* top-bar: primär CTA = statusens nästa steg, Åtgärder-meny = resten */
  function renderHeadActions() {
    var cta = document.getElementById('oqd-cta');
    var menu = document.getElementById('oqd-actions-menu');
    if (!cta || !menu || !ofCurrent) return;
    var s = ofCurrent.status;

    /* orange primär endast vid äkta framåtsteg (skicka utkast). statusregistrering
       (accepterad/avböjd/förfallen) bor i Åtgärder. låst läge: bara sekundär PDF. */
    var items = [];
    if (s === 'draft') {
      cta.hidden = false; cta.className = 'btn btn-primary';
      cta.textContent = 'Markera som skickad';
      cta.dataset.act = 'sent'; delete cta.dataset.setstatus;
      items.push('<button type="button" role="menuitem" data-act="pdf">↓ Ladda ned PDF</button>');
      items.push('<hr class="oqd-menu-sep">');
      items.push('<button type="button" role="menuitem" class="danger" data-act="delete">Radera offert</button>');
    } else if (s === 'sent') {
      cta.hidden = true; delete cta.dataset.act; delete cta.dataset.setstatus;
      items.push('<button type="button" role="menuitem" data-setstatus="accepted">Markera accepterad</button>');
      items.push('<button type="button" role="menuitem" data-setstatus="rejected">Avböjd</button>');
      items.push('<button type="button" role="menuitem" data-setstatus="expired">Markera förfallen</button>');
      items.push('<hr class="oqd-menu-sep">');
      items.push('<button type="button" role="menuitem" data-act="pdf">↓ Ladda ned PDF</button>');
    } else {
      cta.hidden = false; cta.className = 'btn btn-secondary';
      cta.textContent = '↓ Ladda ned PDF';
      cta.dataset.act = 'pdf'; delete cta.dataset.setstatus;
    }
    menu.innerHTML = items.join('');
    var wrap = menu.closest('.oqd-menu-wrap');
    if (wrap) wrap.hidden = !items.length;
  }

  function renderQuoteHeader() {
    if (!ofCurrent) return;
    var o = OFFERS[ofCurrent.id];
    var meta = QSTATUS[ofCurrent.status] || { label: ofCurrent.status, tone: 'neutral' };
    txt('oqd-title-head', o.title || o.number);
    txt('oqd-number', o.number);
    var chip = document.getElementById('oqd-status');
    if (chip) { chip.className = 'badge badge--' + meta.tone; chip.textContent = meta.label; }
    txt('oqd-sent', o.sentISO ? isoToSv(o.sentISO) : '—');
    txt('oqd-valid-meta', o.validISO ? isoToSv(o.validISO) : '—');
    renderHeadActions();
  }

  function renderSnapshot() {
    if (!ofCurrent) return;
    var o = OFFERS[ofCurrent.id];
    var co = COMPANIES[o.company] || {};
    var rows = [['Företagsnamn', o.company], ['Organisationsnummer', o.orgnr], ['Adress', co.addr1]];
    if (co.addr2) {
      var m = String(co.addr2).match(/^(\d{3}\s?\d{2})\s+(.+)$/);
      if (m) { rows.push(['Postnummer', m[1]]); rows.push(['Stad', m[2]]); }
      else rows.push(['Ort', co.addr2]);
    }
    rows.push(['Land', 'Sverige']);
    var grid = document.getElementById('oqd-snap-grid');
    if (grid) grid.innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<span class="oqd-snap-key">' + escHtml(r[0]) + '</span><span class="oqd-snap-val">' + escHtml(r[1]) + '</span>';
    }).join('');

    var dealBox = document.getElementById('oqd-side-deal');
    if (dealBox) {
      var d = o.deal && DEALS[o.deal];
      dealBox.innerHTML = d
        ? '<div class="primary">' + escHtml(d.name) + '</div><div class="secondary"><a href="#/affar/' + escAttr(o.deal) + '">Öppna affären</a></div>'
        : '<div class="secondary">Ingen kopplad affär</div>';
    }
  }

  function showStatusMsg(msg, tone) {
    var el = document.getElementById('oqd-status-msg');
    if (!el) return;
    var txt = el.querySelector('.notice-inline__text');
    if (!txt) return;
    txt.textContent = msg;
    el.dataset.tone = tone || 'info';
    el.hidden = false;
    if (el._t) clearTimeout(el._t);
    el._t = setTimeout(function () { el.hidden = true; }, 3200);
  }

  function ofSetStatus(ns) {
    ofCurrent.status = ns;
    OFFERS[ofCurrent.id].status = ns;
    var addRow = document.getElementById('oqd-add-row');
    if (addRow) addRow.hidden = quoteLocked(ns);
    renderQuoteHeader();
    renderLines();
  }

  /* offertens lägg-till-rad delegeras till den delade radeditorn */
  function clearAddRow() { if (ofEditor) ofEditor.clearAdd(); }

  /* ── delad radeditor ────────────────────────────────────────────────
     Offertens radvy (oqd-*) och affärens orderrader (afr-*) är samma vy och
     samma motor. Skillnaden är bara vilka fält-id:n den binder mot och var
     raderna bor: getLines() pekar på arbetskopian (offert) eller affärens
     egna rader (affär). isLocked() styr om raderna renderas läsbara/redigerbara.
     onChange() valfri notis efter mutation (t.ex. skriv-igenom). */
  function createLineEditor(cfg) {
    var body = document.getElementById(cfg.bodyId);
    if (!body) return null;
    var head = cfg.headId ? document.getElementById(cfg.headId) : null;

    function lines() { return cfg.getLines() || []; }
    function locked() { return cfg.isLocked ? !!cfg.isLocked() : false; }
    function changed() { if (cfg.onChange) cfg.onChange(); }

    function renderTotals() {
      var t = orderTotals(lines());
      txt(cfg.netId, fmtSEK(t.net));
      txt(cfg.vatId, fmtSEK(t.vat));
      txt(cfg.grossId, fmtSEK(t.gross));
    }
    function render() {
      var ls = lines(), lk = locked();
      if (head) head.hidden = !(lk && ls.length);
      if (!ls.length) {
        body.innerHTML = '<div class="oqd-lines-empty">Inga rader ännu.</div>';
      } else {
        body.innerHTML = ls.map(function (l, i) { return lineRowHtml(l, i, lk); }).join('');
      }
      renderTotals();
    }

    /* redigera befintlig rad (text/nummer via input, moms-select via change) */
    function syncRow(row) {
      if (!row || !row.querySelector('.l-name')) return;
      var i = parseInt(row.getAttribute('data-i'), 10);
      lines()[i] = readLineFromRow(row);
      var cell = row.querySelector('[data-linesum]');
      if (cell) cell.textContent = fmtSEK(lineGross(lines()[i]));
      renderTotals();
      changed();
    }
    body.addEventListener('input', function (e) { syncRow(e.target.closest('.oqd-line[data-row]')); });
    body.addEventListener('change', function (e) {
      if (e.target.classList.contains('l-moms')) syncRow(e.target.closest('.oqd-line[data-row]'));
    });
    body.addEventListener('click', function (e) {
      var btn = e.target.closest('.dt-remove');
      if (!btn) return;
      var i = parseInt(btn.closest('.oqd-line[data-row]').getAttribute('data-i'), 10);
      lines().splice(i, 1);
      render();
      changed();
    });

    /* lägg-till-raden */
    function readAdd() {
      return {
        product: (document.getElementById(cfg.addNameId).value || ''),
        benamning: (document.getElementById(cfg.addDescId).value || ''),
        qty: parseFloat(document.getElementById(cfg.addQtyId).value) || 0,
        unit: parseFloat(document.getElementById(cfg.addPriceId).value) || 0,
        discount: parseFloat(document.getElementById(cfg.addDiscId).value) || 0,
        moms: parseFloat(document.getElementById(cfg.addMomsId).value) || 0
      };
    }
    function updateAdd() {
      var l = readAdd();
      txt(cfg.addTotalId, fmtSEK(lineGross(l)));
      var btn = document.getElementById(cfg.addBtnId);
      if (btn) btn.disabled = !(l.product.trim() && l.qty && l.unit);
    }
    function clearAdd() {
      [cfg.addProductId, cfg.addNameId, cfg.addDescId, cfg.addQtyId, cfg.addPriceId, cfg.addDiscId].forEach(function (id) { setVal(id, ''); });
      setVal(cfg.addMomsId, '25');
      updateAdd();
    }

    var prodSel = document.getElementById(cfg.addProductId);
    if (prodSel) {
      prodSel.insertAdjacentHTML('beforeend', PRODUCTS.map(function (p) {
        return '<option value="' + p.id + '">' + escHtml(p.name) + '</option>';
      }).join(''));
      prodSel.addEventListener('change', function () {
        var p = PRODUCTS.filter(function (x) { return x.id === prodSel.value; })[0];
        if (p) { setVal(cfg.addNameId, p.name); setVal(cfg.addPriceId, p.price); setVal(cfg.addMomsId, String(p.moms)); }
        updateAdd();
      });
    }
    [cfg.addNameId, cfg.addDescId, cfg.addQtyId, cfg.addPriceId, cfg.addDiscId, cfg.addMomsId].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.addEventListener('input', updateAdd); el.addEventListener('change', updateAdd); }
    });
    var addBtn = document.getElementById(cfg.addBtnId);
    if (addBtn) addBtn.addEventListener('click', function () {
      var l = readAdd();
      if (!l.product.trim() || !l.qty || !l.unit) return;
      lines().push(l);
      render();
      clearAdd();
      changed();
      var nm = document.getElementById(cfg.addNameId); if (nm) nm.focus();
    });

    return { render: render, renderTotals: renderTotals, clearAdd: clearAdd };
  }

  /* designat datumfält för "Giltig till": ISO i dolt fält, sv-datum på knappen */
  function setValidValue(iso) {
    var hid = document.getElementById('oqd-valid');
    var lbl = document.getElementById('oqd-valid-label');
    if (hid) hid.value = iso || '';
    if (lbl) {
      if (iso) { lbl.textContent = isoToSv(iso); lbl.classList.remove('placeholder'); }
      else { lbl.textContent = 'Välj datum'; lbl.classList.add('placeholder'); }
    }
  }

  function initValidDatePicker() {
    var btn = document.getElementById('oqd-valid-btn');
    var pop = document.getElementById('oqd-valid-pop');
    if (!btn || !pop) return;
    function toISO(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function close() { pop.hidden = true; pop.innerHTML = ''; btn.setAttribute('aria-expanded', 'false'); }
    function open() {
      var cur = document.getElementById('oqd-valid').value;
      var cal = createCalendar({ initial: cur || null, onSelect: function (s) { if (s) { setValidValue(toISO(s)); close(); } } });
      pop.innerHTML = '';
      pop.appendChild(cal.el);
      var foot = document.createElement('div');
      foot.className = 'oqd-cal-foot';
      foot.innerHTML = '<button type="button" data-cal="clear">Rensa</button><button type="button" data-cal="today">Idag</button>';
      pop.appendChild(foot);
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); if (pop.hidden) open(); else close(); });
    pop.addEventListener('click', function (e) {
      e.stopPropagation();
      var b = e.target.closest('[data-cal]');
      if (!b) return;
      if (b.dataset.cal === 'clear') { setValidValue(''); close(); }
      else if (b.dataset.cal === 'today') { setValidValue(toISO(new Date())); close(); }
    });
    document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('.oqd-datefield')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) close(); });
  }

  function initOfferEditor() {
    if (!document.getElementById('oqd-lines-body')) return;
    initValidDatePicker();

    /* offertens radvy = delade editorn, bunden mot arbetskopian ofCurrent.lines */
    ofEditor = createLineEditor({
      bodyId: 'oqd-lines-body', headId: 'oqd-lines-head',
      netId: 'oqd-net', vatId: 'oqd-vat', grossId: 'oqd-gross',
      addProductId: 'oqd-add-product', addNameId: 'oqd-add-name', addDescId: 'oqd-add-desc',
      addQtyId: 'oqd-add-qty', addPriceId: 'oqd-add-price', addDiscId: 'oqd-add-disc',
      addMomsId: 'oqd-add-moms', addTotalId: 'oqd-add-total', addBtnId: 'oqd-add-btn',
      getLines: function () { return ofCurrent ? ofCurrent.lines : []; },
      isLocked: function () { return !!(ofCurrent && quoteLocked(ofCurrent.status)); }
    });

    /* spara formulär (titel/giltig/följebrev/villkor + rader) */
    var saveBtn = document.getElementById('oqd-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (!ofCurrent) return;
      var o = OFFERS[ofCurrent.id];
      o.title = document.getElementById('oqd-title').value.trim() || o.title;
      o.validISO = document.getElementById('oqd-valid').value;
      o.coverNote = document.getElementById('oqd-cover').value;
      o.terms = document.getElementById('oqd-terms').value;
      o.lines = ofCurrent.lines.slice();
      flashButton(saveBtn, 'Sparar…');
      showStatusMsg('Sparat!', 'success');
    });

    /* status-drivna åtgärder: CTA + Åtgärder-meny delar samma handler */
    function runOfferAction(ds) {
      if (ds.act === 'pdf') { window.print(); return; }
      if (ds.act === 'delete') {
        if (window.confirm('Radera offerten? I prototypen tas den inte bort på riktigt, du skickas bara tillbaka till listan.')) location.hash = '#/offerter';
        return;
      }
      if (ds.act === 'sent') {
        if (!ofCurrent.lines.length) { showStatusMsg('Kan inte skicka en offert utan rader, lägg till minst en rad först.', 'danger'); return; }
        ofSetStatus('sent'); showStatusMsg('Offerten är markerad som skickad.', 'success'); return;
      }
      if (ds.setstatus) {
        ofSetStatus(ds.setstatus);
        showStatusMsg('Status uppdaterad: ' + (QSTATUS[ds.setstatus] || {}).label, (QSTATUS[ds.setstatus] || {}).tone || 'info');
      }
    }

    var cta = document.getElementById('oqd-cta');
    if (cta) cta.addEventListener('click', function () { runOfferAction(cta.dataset); });

    /* Åtgärder-dropdown: egen toggle (screens.js rör bara .filter-group) */
    var actBtn = document.getElementById('oqd-actions-btn');
    var actMenu = document.getElementById('oqd-actions-menu');
    function closeActMenu() {
      if (actMenu) actMenu.classList.remove('is-open');
      if (actBtn) actBtn.setAttribute('aria-expanded', 'false');
    }
    if (actBtn && actMenu) {
      actBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = actMenu.classList.toggle('is-open');
        actBtn.setAttribute('aria-expanded', String(open));
      });
      actMenu.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        runOfferAction(b.dataset);
        closeActMenu();
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('.oqd-menu-wrap')) closeActMenu(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeActMenu(); });
    }
  }

  function fillOfferDetail(oid) {
    var o = OFFERS[oid];
    if (!o) return;
    ofCurrent = {
      id: oid, status: o.status,
      lines: o.lines.map(function (l) {
        return { product: l.product, benamning: l.benamning, qty: l.qty, unit: l.unit, discount: l.discount, moms: l.moms };
      })
    };
    setVal('oqd-title', o.title);
    setValidValue(o.validISO || '');
    setVal('oqd-cover', o.coverNote || '');
    setVal('oqd-terms', o.terms || '');
    var addRow = document.getElementById('oqd-add-row');
    if (addRow) addRow.hidden = quoteLocked(o.status);
    var msg = document.getElementById('oqd-status-msg'); if (msg) msg.hidden = true;
    clearAddRow();
    renderQuoteHeader();
    renderLines();
    renderSnapshot();
  }

  /* ── Aktivitet-detalj: fyll från ACTIVITIES ────────────────────── */

  function contactLink(slug) {
    var c = CONTACTS[slug];
    return c ? '<a href="#/kontakt/' + slug + '">' + c.name + '</a>' : '—';
  }

  function fillActivityDetail(aid) {
    var a = ACTIVITIES[aid];
    if (!a) return;
    var co = COMPANIES[a.company];
    var ct = CONTACTS[a.contact];

    txt('ak-title', a.title);
    txt('ak-type', a.type);
    txt('ak-date', a.date);
    txt('ak-owner', a.owner);

    var st = document.getElementById('ak-status');
    if (st) { st.className = 'badge badge--' + a.tone; st.textContent = a.status; }

    /* rail-fakta: Källa ny i railen; Typ/Datum/Ansvarig/Status återanvänder gamla meta-row-id:n */
    txt('ak-source', a.source);

    /* Händelser-fliken — not + skapad-post */
    var hWrap = document.getElementById('ak-handelser');
    if (hWrap) {
      hWrap.innerHTML =
        '<div class="row"><div class="cell"><div class="primary">' + a.date + '</div><div class="secondary">' + a.type + '</div></div>' +
        '<div class="cell"><div class="primary">' + a.note + '</div></div>' +
        '<div class="cell col-owner"><div class="primary">' + a.owner + '</div><div class="secondary">Ansvarig</div></div></div>' +
        '<div class="row"><div class="cell"><div class="primary">' + a.date + '</div><div class="secondary">System</div></div>' +
        '<div class="cell"><div class="primary">Aktivitet skapad och kopplad till ' + a.company + '.</div></div>' +
        '<div class="cell col-owner"><div class="primary">' + a.owner + '</div><div class="secondary">Ansvarig</div></div></div>';
    }
    setCount('ak-handelser-count', a.count);

    /* sidorail: företag + kontakt + kopplad affär */
    var sideCo = document.getElementById('ak-side-company');
    if (sideCo) sideCo.innerHTML = companyLink(a.company);
    txt('ak-side-addr1', co ? co.addr1 : '');
    txt('ak-side-addr2', co ? co.addr2 : '');

    var sideCt = document.getElementById('ak-side-contact');
    if (sideCt) {
      sideCt.innerHTML = ct
        ? '<div class="primary">' + contactLink(a.contact) + '</div>' +
          '<div class="secondary">' + ct.role + '</div>' +
          '<div class="secondary"><a href="mailto:' + ct.email + '">' + ct.email + '</a></div>' +
          '<div class="secondary"><a href="tel:' + ct.tel.replace(/\s/g, '') + '">' + ct.tel + '</a></div>'
        : '<div class="secondary">Ingen kontakt kopplad</div>';
    }

    var sideDeal = document.getElementById('ak-side-deal');
    if (sideDeal) sideDeal.innerHTML = dealLink(a.deal);

    setTab(document.querySelector('#view-aktivitet-detalj .detail-main'), 'ak-oversikt');
  }

  function setCount(id, n) { var el = document.getElementById(id); if (el) el.textContent = n; }

  /* ── undertabbar (delas av alla detaljvyer, scopas till .detail-main) ── */

  function setTab(scope, name) {
    if (!scope) return;
    scope.querySelectorAll('.tabs .tab').forEach(function (t) {
      var on = t.dataset.tab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1; /* roving tabindex: bara aktiv flik är i tab-ordningen */
    });
    scope.querySelectorAll('.tab-pane').forEach(function (p) {
      p.classList.toggle('is-active', p.dataset.pane === name);
    });
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.tabs .tab[data-tab]');
    if (!tab) return;
    e.preventDefault();
    setTab(tab.closest('.detail-main'), tab.dataset.tab);
    tab.focus();
  });

  /* tangentbord: flikar är <a role="tab"> utan href, så gör dem operabla.
     Enter/Space aktiverar, pil vänster/höger flyttar (wrap) och aktiverar. */
  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('.tabs .tab[data-tab]');
    if (!tab) return;
    var key = e.key;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      setTab(tab.closest('.detail-main'), tab.dataset.tab);
      return;
    }
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    e.preventDefault();
    var tabs = Array.prototype.slice.call(tab.closest('.tabs').querySelectorAll('.tab[data-tab]'));
    var i = tabs.indexOf(tab);
    var next = key === 'Home' ? 0
      : key === 'End' ? tabs.length - 1
      : key === 'ArrowRight' ? (i + 1) % tabs.length
      : (i - 1 + tabs.length) % tabs.length;
    var target = tabs[next];
    setTab(target.closest('.detail-main'), target.dataset.tab);
    target.focus();
  });

  /* ARIA-wiring för alla fliklistor: role=tablist/tab/tabpanel + koppling.
     Körs en gång vid init; flikmarkupen är statisk i app.html. */
  function initTabs() {
    document.querySelectorAll('.detail-main .tabs').forEach(function (list) {
      list.setAttribute('role', 'tablist');
      var main = list.closest('.detail-main');
      list.querySelectorAll('.tab[data-tab]').forEach(function (tab) {
        var name = tab.dataset.tab;
        tab.setAttribute('role', 'tab');
        if (!tab.id) tab.id = 'tab-' + name;
        var pane = main.querySelector('.tab-pane[data-pane="' + name + '"]');
        if (pane) {
          pane.setAttribute('role', 'tabpanel');
          if (!pane.id) pane.id = 'pane-' + name;
          tab.setAttribute('aria-controls', pane.id);
          pane.setAttribute('aria-labelledby', tab.id);
        }
        var on = tab.classList.contains('is-active');
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
    });
  }

  /* ── inline-kalender (delad av uppföljning + datumintervall) ───── */

  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function dayShort(d) { return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }

  /* prototypens referensår (seed-datan saknar år i radtexten) */
  var SEED_YEAR = 2026;

  /* "7 juli, 09:00" → Date(2026, 6, 7); null om raden saknar datum */
  function parseRowDate(txt) {
    var m = /(\d{1,2})\s+([a-zåäö]+)/i.exec(txt || '');
    if (!m) return null;
    var mi = MONTHS_LONG.indexOf(m[2].toLowerCase());
    if (mi < 0) return null;
    return new Date(SEED_YEAR, mi, +m[1]);
  }

  /* dölj listrader i vyn vars datum ligger utanför [s, e]; returnerar antal synliga */
  function applyDateRange(group, s, e) {
    var view = group.closest('.view');
    if (!view) return 0;
    var list = view.querySelector('.list');
    if (!list) return 0;
    var shown = 0, dated = 0;
    list.querySelectorAll(':scope > .row').forEach(function (row) {
      /* datumet bor i .col-date (Aktiviteter) eller som suffix i .col-title (Affärer, "…· öppnad 12 juni") */
      var cell = row.querySelector('.col-date .primary') || row.querySelector('.col-title .secondary');
      if (!cell) return; /* rad utan datum – rör den inte */
      dated++;
      var d = parseRowDate(cell.textContent);
      var inRange = !s ? true : (!e ? sameDay(d, s) : (d && d >= s && d <= e));
      row.style.display = inRange ? '' : 'none';
      if (inRange) shown++;
    });
    /* tom-läge: visa ett meddelande om intervallet gömmer allt */
    var noun = view.id === 'view-affarer' ? 'affärer' : 'aktiviteter';
    var empty = list.querySelector('.list-empty');
    if (dated && shown === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'list-empty';
        list.appendChild(empty);
      }
      empty.textContent = 'Inga ' + noun + ' i valt datumintervall.';
      empty.style.display = '';
    } else if (empty) {
      empty.style.display = 'none';
    }
    return shown;
  }

  function createCalendar(opts) {
    opts = opts || {};
    var range = !!opts.range;
    var view = new Date(); view.setDate(1); view.setHours(0, 0, 0, 0);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = null, end = null;
    if (opts.initial) {
      var init = new Date(opts.initial);
      if (!isNaN(init)) { init.setHours(0, 0, 0, 0); start = init; view = new Date(init.getFullYear(), init.getMonth(), 1); }
    }

    var el = document.createElement('div');
    el.className = 'cal';

    function render() {
      var y = view.getFullYear(), m = view.getMonth();
      var lead = (new Date(y, m, 1).getDay() + 6) % 7; /* måndag först */
      var days = new Date(y, m + 1, 0).getDate();

      var html = '<div class="cal-head">' +
        '<button class="cal-nav" type="button" data-dir="prev" aria-label="Föregående månad">‹</button>' +
        '<span class="mlbl">' + MONTHS_LONG[m] + ' ' + y + '</span>' +
        '<button class="cal-nav" type="button" data-dir="next" aria-label="Nästa månad">›</button>' +
        '</div><div class="cal-grid">';
      DOW.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
      for (var i = 0; i < lead; i++) html += '<button class="cal-day" type="button" disabled></button>';
      for (var day = 1; day <= days; day++) {
        var cur = new Date(y, m, day);
        var cls = 'cal-day';
        var isToday = sameDay(cur, today);
        var isStart = sameDay(cur, start);
        var isEnd = sameDay(cur, end);
        var hasRange = range && start && end && !sameDay(start, end);
        if (isToday) cls += ' today';
        if (isStart || isEnd) cls += ' sel';
        else if (range && start && end && cur > start && cur < end) cls += ' in-range';
        if (hasRange && isStart) cls += ' range-start';
        if (hasRange && isEnd) cls += ' range-end';
        html += '<button class="' + cls + '" type="button" data-day="' + day + '">' + day + '</button>';
      }
      html += '</div>';
      el.innerHTML = html;
    }

    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var nav = e.target.closest('.cal-nav');
      if (nav) { view.setMonth(view.getMonth() + (nav.dataset.dir === 'next' ? 1 : -1)); render(); return; }
      var cell = e.target.closest('.cal-day');
      if (!cell || cell.disabled) return;
      var d = new Date(view.getFullYear(), view.getMonth(), +cell.dataset.day);
      if (!range) {
        start = d; end = null;
      } else if (!start || (start && end)) {
        start = d; end = null;
      } else if (d < start) {
        end = start; start = d;
      } else {
        end = d;
      }
      render();
      if (opts.onSelect) opts.onSelect(start, end);
    });

    render();
    return {
      el: el,
      getStart: function () { return start; },
      getEnd: function () { return end; },
      clear: function () { start = null; end = null; render(); }
    };
  }

  function rangeLabel(s, e) {
    if (!s) return 'Alla datum';
    if (!e || sameDay(s, e)) return dayShort(s);
    return dayShort(s) + ' – ' + dayShort(e);
  }

  /* ── datumintervall-filter: montera kalender i varje .range-menu ── */

  function mountRangeFilters() {
    document.querySelectorAll('[data-daterange]').forEach(function (group) {
      var menu = group.querySelector('.range-menu');
      var val = group.querySelector('.f-val');
      var btn = group.querySelector('.filter');
      if (!menu || menu.dataset.mounted) return;
      menu.dataset.mounted = '1';

      var cal = createCalendar({ range: true, onSelect: function (s, e) { lbl.textContent = rangeLabel(s, e); } });
      menu.appendChild(cal.el);

      var foot = document.createElement('div');
      foot.className = 'range-foot';
      foot.innerHTML = '<span class="range-lbl">Välj intervall</span>' +
        '<span style="display:flex;gap:8px">' +
        '<button class="btn btn-ghost" type="button" data-range-clear>Rensa</button>' +
        '<button class="btn btn-primary" type="button" data-range-apply>Använd</button>' +
        '</span>';
      menu.appendChild(foot);
      var lbl = foot.querySelector('.range-lbl');

      function closeGroup() {
        group.classList.remove('is-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }

      foot.addEventListener('click', function (e) { e.stopPropagation(); });
      foot.querySelector('[data-range-clear]').addEventListener('click', function () {
        cal.clear(); lbl.textContent = 'Välj intervall'; if (val) val.textContent = 'Alla datum';
        applyDateRange(group, null, null);
      });
      foot.querySelector('[data-range-apply]').addEventListener('click', function () {
        var s = cal.getStart(), e = cal.getEnd();
        if (val) val.textContent = s ? rangeLabel(s, e) : 'Alla datum';
        applyDateRange(group, s, e);
        closeGroup();
      });
    });
  }

  /* ── uppföljnings-modalens innandöme ───────────────────────────── */

  /* ── affärens orderrader ────────────────────────────────────────────
     Samma inline-radvy som offerten (createLineEditor), men bunden mot
     affärens EGNA rader DEALS[id].orderLines (skilt från offerternas).
     Live-redigering: ändringar skrivs direkt till affären, ingen separat
     Spara, eftersom bara radkortet återanvänds (inte offertens formulär).
     Avstämningen (renderDealFacts) rör inte dessa rader. */
  function initDealOrderEditor() {
    if (!document.getElementById('afr-lines-body')) return;
    afOrderEditor = createLineEditor({
      bodyId: 'afr-lines-body', headId: 'afr-lines-head',
      netId: 'afr-net', vatId: 'afr-vat', grossId: 'afr-gross',
      addProductId: 'afr-add-product', addNameId: 'afr-add-name', addDescId: 'afr-add-desc',
      addQtyId: 'afr-add-qty', addPriceId: 'afr-add-price', addDiscId: 'afr-add-disc',
      addMomsId: 'afr-add-moms', addTotalId: 'afr-add-total', addBtnId: 'afr-add-btn',
      getLines: function () {
        var d = afCurrent && DEALS[afCurrent];
        if (!d) return [];
        if (!d.orderLines) d.orderLines = [];
        return d.orderLines;
      },
      /* samma redigerbara radvy som offerten; affärens rader är live-bundna
         så ändringar sparas direkt (ingen separat Spara som i offertformuläret) */
      isLocked: function () { return false; }
    });
  }

  var fuCal = null;

  /* företaget för uppföljningens kontext: affär- eller aktivitet-detalj */
  function currentContextCompany() {
    var r = parseHash();
    if (r.view === 'affar-detalj' && DEALS[r.id]) return DEALS[r.id].company;
    if (r.view === 'aktivitet-detalj' && ACTIVITIES[r.id]) return ACTIVITIES[r.id].company;
    return null;
  }

  function initFollowup() {
    var calHost = document.getElementById('fu-cal');
    var subject = document.getElementById('fu-subject');
    var dealBox = document.getElementById('deal-box');
    var dealToggle = document.getElementById('deal-toggle');
    var dealRemove = document.getElementById('deal-remove');

    /* förifyll rubrik + nollställ modalen varje gång "Markera klar" öppnar den */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-open="modal-followup"]')) return;
      var co = currentContextCompany();
      if (subject) subject.value = co ? 'Följ upp ' + co : 'Följ upp';
      if (calHost) { calHost.innerHTML = ''; fuCal = null; }
      if (dealBox) dealBox.classList.remove('is-open');
    });

    /* "Annat datum…" fäller ut kalendern; ett preset-chip fäller ihop den igen */
    document.addEventListener('click', function (e) {
      var opt = e.target.closest('#fu-when .type-opt');
      if (!opt || !calHost) return;
      if (opt.dataset.cal) {
        if (!fuCal) { fuCal = createCalendar({ range: false }); calHost.appendChild(fuCal.el); }
      } else {
        calHost.innerHTML = ''; fuCal = null;
      }
    });

    if (dealToggle && dealBox) {
      dealToggle.addEventListener('click', function () { dealBox.classList.toggle('is-open'); });
    }
    if (dealRemove && dealBox) {
      dealRemove.addEventListener('click', function () { dealBox.classList.remove('is-open'); });
    }
  }

  /* ── bekräftelsedialogens "Avbryt" (stänger bara dialogen) ──────────
     screens.js closeAll() slår igen alla öppna paneler. Bekräftelsen ligger
     ovanpå en create-drawer, så en delad stängning skulle kasta formuläret.
     "Ta bort" behåller data-close (bekräfta = stäng allt, avsett); "Avbryt"
     stänger bara dialogen och gör den underliggande drawern aktiv igen. */
  (function () {
    var confirm = document.getElementById('modal-confirm');
    var cancel = document.getElementById('confirm-cancel');
    var overlay = document.querySelector('.overlay');
    if (!confirm || !cancel) return;
    cancel.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation(); /* hindra screens.js document-lyssnare från closeAll */
      confirm.classList.remove('is-open');
      var drawer = document.querySelector('.drawer.is-open');
      if (!drawer) {
        if (overlay) overlay.classList.remove('is-open');
        document.body.style.overflow = '';
        Array.prototype.forEach.call(document.body.children, function (el) {
          el.removeAttribute('inert'); el.removeAttribute('aria-hidden');
        });
        return;
      }
      /* gör drawern aktiv igen: allt utom drawern + overlay blir inert */
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el === drawer || el === overlay) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
        else { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      });
      var f = drawer.querySelector('input, select, textarea, [data-autofocus]');
      if (f) f.focus();
    });
  })();

  /* ── topbar-popovers (notiser + konto) ──────────────────────────────
     Egen liten controller i samma anda som nav-gruppernas i screens.js:
     en öppen i taget, stängs på utsideklick och Escape. Klick inuti panelen
     bubblar inte vidare (tema-växlaren ska kunna klickas utan att stänga). */
  (function () {
    var menus = Array.prototype.slice.call(document.querySelectorAll('.topbar-menu'));
    if (!menus.length) return;
    function closeAll(except) {
      menus.forEach(function (m) {
        if (m === except) return;
        m.classList.remove('is-open');
        var b = m.querySelector('.topbar-menu-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }
    menus.forEach(function (m) {
      var btn = m.querySelector('.topbar-menu-btn');
      var pop = m.querySelector('.topbar-pop');
      if (!btn || !pop) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = !m.classList.contains('is-open');
        closeAll(m);
        m.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
      pop.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });

    /* "Markera alla som lästa": nollar oläst-prickarna + badgen (prototypgest) */
    var readBtn = document.querySelector('[data-notis-read]');
    if (readBtn) readBtn.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.notis-item.is-unread').forEach(function (n) { n.classList.remove('is-unread'); });
      var badge = document.querySelector('.notis-badge');
      if (badge) badge.remove();
    });
  })();

  /* Generiska Åtgärder-menyer på aktivitet/företag/kontakt-detalj. Affär och offert har
     egna toggles (initDealDetail/oqd); dessa wraps bär data-actions och sköts här.
     Alla poster stänger menyn; data-open (Ny kontakt) öppnar drawern via screens.js. */
  (function () {
    var wraps = Array.prototype.slice.call(document.querySelectorAll('.oqd-menu-wrap[data-actions]'));
    if (!wraps.length) return;
    function closeAll(except) {
      wraps.forEach(function (w) {
        if (w === except) return;
        var menu = w.querySelector('.oqd-menu');
        var btn = w.querySelector('.oqd-menu-btn');
        if (menu) menu.classList.remove('is-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
    wraps.forEach(function (w) {
      var btn = w.querySelector('.oqd-menu-btn');
      var menu = w.querySelector('.oqd-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = !menu.classList.contains('is-open');
        closeAll(w);
        menu.classList.toggle('is-open', willOpen);
        btn.setAttribute('aria-expanded', String(willOpen));
      });
      menu.addEventListener('click', function () {
        menu.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(null); });
  })();

  /* Kommentar-composer: posta en kommentar → renderas som ett kort under composern och
     fältet töms. Samma mönster på alla detaljvyer; en .comment-list injiceras efter varje
     .composer. Cmd/Ctrl+Enter postar också. (Prototypen persisterar inte — korten lever i DOM.) */
  (function () {
    var composers = Array.prototype.slice.call(document.querySelectorAll('.composer'));
    composers.forEach(function (composer) {
      var input = composer.querySelector('.composer-input');
      var btn = composer.querySelector('.composer-foot .btn');
      if (!input || !btn) return;

      var list = document.createElement('div');
      list.className = 'comment-list';
      composer.parentNode.insertBefore(list, composer.nextSibling);

      function post() {
        var text = input.value.trim();
        if (!text) return;
        var item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML =
          '<div class="comment-avatar">D</div>' +
          '<div class="comment-main">' +
            '<div class="comment-head">' +
              '<span class="comment-author">Demo User</span>' +
              '<span class="comment-time">Just nu</span>' +
            '</div>' +
            '<div class="comment-body"></div>' +
          '</div>';
        item.querySelector('.comment-body').textContent = text;  /* textContent = ingen HTML-injektion */
        list.insertBefore(item, list.firstChild);
        input.value = '';
        btn.disabled = true;
        input.focus();
      }

      btn.addEventListener('click', post);
      input.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); post(); }
      });
    });
  })();

  /* ── init ──────────────────────────────────────────────────────── */

  initTabs();
  mountRangeFilters();
  initFollowup();
  initOfferEditor();
  initDealDetail();
  initDealOrderEditor();
  window.addEventListener('hashchange', route);
  route();
})();
