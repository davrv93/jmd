var U = (function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function incluye(a, x) { return a.indexOf(x) >= 0; }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  return { esc: esc, incluye: incluye, hoy: hoy };
})();
