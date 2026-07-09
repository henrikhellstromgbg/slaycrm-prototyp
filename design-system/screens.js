/* SlayCRM · screens.js — beteende för de applicerade vyerna (nav, drawer, filter,
   composer, type-picker, rad-navigering, mobil-nav). Tema-växlaren bor i theme.js
   (delad, laddas i <head>); tokens.css äger tema-tokenlagret. */

/* Nav dropdown: clicking a .nav-parent toggles its .nav-group open; only one open at a time.
   Outside-click and Esc close. Menus carry the parent page + its nested view. */
(function () {
  var groups = document.querySelectorAll('.nav-group');
  function closeAll() {
    groups.forEach(function (g) {
      g.classList.remove('is-open');
      var b = g.querySelector('.nav-parent');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  groups.forEach(function (g) {
    var btn = g.querySelector('.nav-parent');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = g.classList.contains('is-open');
      closeAll();
      if (!isOpen) { g.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-group')) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();

/* Overlay / drawer / modal controller.
   Markup contract: a trigger carries data-open="<panel-id>"; any element inside a
   panel (or the shared .overlay) carries data-close. Opening a panel adds .is-open
   to it and to the shared .overlay; Esc and overlay-click close everything.

   Fokushantering (aria-modal-kontrakt): allt bakom den öppna panelen görs inert, så
   Tab stannar kvar i dialogen och skärmläsare hoppar över bakgrunden. Fokus flyttas in
   i panelen vid öppning och lämnas tillbaka till knappen som öppnade den vid stängning. */
(function () {
  var overlay = document.querySelector('.overlay');
  var lastFocused = null;
  function anyOpen() { return document.querySelector('.drawer.is-open, .modal-card.is-open'); }
  /* allt på body-nivå utom den öppna panelen och overlayn tas ur tab-ordning och göms för AT */
  function setBackgroundInert(panel, on) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === panel || el === overlay) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }
  function open(id, trigger) {
    var panel = document.getElementById(id);
    if (!panel) return;
    if (!anyOpen()) lastFocused = trigger || document.activeElement;  /* spara bara första öppnaren */
    panel.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setBackgroundInert(panel, true);
    var first = panel.querySelector('input, select, textarea, [data-autofocus]');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeAll() {
    var open = document.querySelectorAll('.drawer.is-open, .modal-card.is-open');
    open.forEach(function (p) { p.classList.remove('is-open'); });
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setBackgroundInert(null, false);  /* rensa inert/aria-hidden på alla bakgrundselement */
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) { e.preventDefault(); open(opener.getAttribute('data-open'), opener); return; }
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeAll(); }
  });
  if (overlay) overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && anyOpen()) closeAll(); });
})();

/* Filter dropdown: a .filter button toggles its sibling .filter-menu; one open at a time.
   Selecting an option writes its label into the pill's .f-val and closes.
   Outside-click and Esc close. Disclosure-mönster: knappen bär aria-expanded. */
(function () {
  var groups = document.querySelectorAll('.filter-group');
  function closeAll() {
    groups.forEach(function (g) {
      g.classList.remove('is-open');
      var b = g.querySelector('.filter');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  groups.forEach(function (g) {
    var btn = g.querySelector('.filter');
    var val = g.querySelector('.f-val');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = g.classList.contains('is-open');
      closeAll();
      if (!isOpen) { g.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
    g.querySelectorAll('.filter-menu .menu-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        g.querySelectorAll('.filter-menu .menu-item').forEach(function (o) { o.classList.remove('is-active'); });
        item.classList.add('is-active');
        if (val) val.textContent = (item.dataset.val || item.textContent).trim();
        closeAll();
      });
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.filter-group')) closeAll(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();

/* Composer: the submit button stays disabled until there's non-empty text. */
(function () {
  document.querySelectorAll('.composer').forEach(function (c) {
    var input = c.querySelector('.composer-input');
    var btn = c.querySelector('.composer-foot .btn');
    if (!input || !btn) return;
    function sync() { btn.disabled = input.value.trim() === ''; }
    input.addEventListener('input', sync);
    sync();
  });
})();

/* Type-picker: single-select icon chips within a .type-pick group. */
(function () {
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.type-opt');
    if (!opt) return;
    var group = opt.closest('.type-pick');
    if (!group) return;
    group.querySelectorAll('.type-opt').forEach(function (o) { o.classList.remove('is-active'); });
    opt.classList.add('is-active');
  });
})();

/* Row navigation: a .row carries data-href and behaves like a link. Clicking anywhere
   on the row follows it, except when the click lands on a real link or button inside it
   (t.ex. tel:/mailto:) — those keep their own behaviour. The row is focusable and Enter
   follows the href too. Rows that stay <a> (other views) are untouched. */
(function () {
  document.addEventListener('click', function (e) {
    var row = e.target.closest('.row[data-href]');
    if (!row) return;
    if (e.target.closest('a, button')) return;  /* låt inbäddade länkar/knappar sköta sitt */
    window.location.href = row.getAttribute('data-href');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var row = e.target.closest('.row[data-href]');
    if (row && e.target === row) { e.preventDefault(); window.location.href = row.getAttribute('data-href'); }
  });
})();

/* Mobil-nav: hamburgaren fäller ut .nav som en panel under topbaren (≤800).
   Klick utanför och Esc stänger. Nav-länkar navigerar bort, så de behöver inte stänga. */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (!toggle || !nav) return;
  function close() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    /* nolla grupper som kan ha lämnats öppna från desktop innan panelen fälls ut */
    document.querySelectorAll('.nav-group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.target.closest('.nav') || e.target.closest('.nav-toggle')) return;
    close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
