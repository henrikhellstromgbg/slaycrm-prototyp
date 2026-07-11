/* SlayCRM · theme.js — delad tema-controller för alla sidor (referens + vyer).
   tokens.css äger tema-tokenlagret (:root ljust → @media dark → [data-theme]).
   Den här filen bara stämplar data-theme på <html> och minns det explicita valet.

   Laddas i <head> (blockerande) så hydreringen körs före första paint = inget fel
   initialt tema (FOUC). Klick-controllern kopplas på när DOM är redo. Utan explicit
   val ligger data-theme borta och OS-temat (@media prefers-color-scheme) styr. */
(function () {
  var root = document.documentElement;
  var KEY = 'slay-theme';

  /* hydrering: kör direkt vid head-parse, före paint */
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  function syncPressed() {
    var current = root.getAttribute('data-theme');
    document.querySelectorAll('.toggle button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.set === current));
    });
  }
  function apply(mode) {
    if (mode === 'light' || mode === 'dark') {
      root.setAttribute('data-theme', mode);
      try { localStorage.setItem(KEY, mode); } catch (e) {}
    } else {
      root.removeAttribute('data-theme');            /* tillbaka till OS-fallback */
      try { localStorage.removeItem(KEY); } catch (e) {}
    }
    syncPressed();
  }
  function init() {
    document.querySelectorAll('.toggle button').forEach(function (b) {
      b.addEventListener('click', function () {
        var current = root.getAttribute('data-theme');
        apply(current === b.dataset.set ? null : b.dataset.set);  /* klick på aktivt = OS igen */
      });
    });
    syncPressed();  /* speglar hydrerat tema vid första laddning */
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
