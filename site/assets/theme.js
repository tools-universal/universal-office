// Theme selector for the docs site: Auto (follow OS) / Light / Dark.
// Applies the saved choice to <html data-theme> before paint (no flash);
// CSS uses light-dark() + color-scheme, so this just flips color-scheme.
(function () {
  var KEY = 'uo-theme';
  var root = document.documentElement;

  function apply(t) {
    // Set color-scheme INLINE (não só via regra de stylesheet): o web component
    // <universal-write> seta document.documentElement.style.colorScheme inline
    // quando carrega, e uma regra de folha de estilo perderia pra esse inline.
    // Como este script roda no <head> (antes do componente), o inline aqui
    // vence e o componente respeita (ele só seta se ainda não houver um).
    if (t === 'dark' || t === 'light') {
      root.setAttribute('data-theme', t);
      root.style.colorScheme = t;
    } else {
      root.removeAttribute('data-theme'); // 'auto' → follow the OS
      root.style.colorScheme = 'light dark';
    }
  }

  var saved;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  saved = saved || 'auto';
  apply(saved); // run immediately (in <head>) so there's no theme flash

  function wire() {
    var sw = document.querySelector('.theme-switch');
    if (!sw) return;
    var btns = sw.querySelectorAll('button[data-theme]');
    btns.forEach(function (b) {
      if (b.getAttribute('data-theme') === saved) b.classList.add('active');
      b.addEventListener('click', function () {
        saved = b.getAttribute('data-theme');
        try { localStorage.setItem(KEY, saved); } catch (e) { /* ignore */ }
        apply(saved);
        btns.forEach(function (x) { x.classList.toggle('active', x === b); });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
