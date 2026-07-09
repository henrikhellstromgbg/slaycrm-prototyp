/* SlayCRM · screens.js — theme toggle shared by all applied-reference pages.
   The toggle stamps data-theme on <html>; screens.css redefines the neutral tokens per theme. */
(function () {
  var root = document.documentElement;
  var buttons = document.querySelectorAll('.toggle button');
  function apply(mode) {
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    var current = root.getAttribute('data-theme');
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === current)); });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      apply(current === b.dataset.set ? null : b.dataset.set);
    });
  });
})();

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
   to it and to the shared .overlay; Esc and overlay-click close everything. */
(function () {
  var overlay = document.querySelector('.overlay');
  function open(id) {
    var panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var first = panel.querySelector('input, select, textarea, [data-autofocus]');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeAll() {
    var open = document.querySelectorAll('.drawer.is-open, .modal-card.is-open');
    open.forEach(function (p) { p.classList.remove('is-open'); });
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) { e.preventDefault(); open(opener.getAttribute('data-open')); return; }
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeAll(); }
  });
  if (overlay) overlay.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
})();

/* Filter dropdown: a .filter button toggles its sibling .filter-menu; one open at a time.
   Selecting a .menu-item writes its label into the pill's .f-val and closes.
   Outside-click and Esc close. Reuses the nav popover's .menu-item styling. */
(function () {
  var groups = document.querySelectorAll('.filter-group');
  function closeAll() { groups.forEach(function (g) { g.classList.remove('is-open'); }); }
  groups.forEach(function (g) {
    var btn = g.querySelector('.filter');
    var val = g.querySelector('.f-val');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = g.classList.contains('is-open');
      closeAll();
      if (!isOpen) g.classList.add('is-open');
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
