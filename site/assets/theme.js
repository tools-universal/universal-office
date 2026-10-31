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

  // Every .theme-switch on the page (the top bar's and the drawer's copy) stays in sync.
  function wireTheme() {
    var btns = document.querySelectorAll('.theme-switch button[data-theme]');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === saved);
      b.addEventListener('click', function () {
        saved = b.getAttribute('data-theme');
        try { localStorage.setItem(KEY, saved); } catch (e) { /* ignore */ }
        apply(saved);
        btns.forEach(function (x) { x.classList.toggle('active', x.getAttribute('data-theme') === saved); });
      });
    });
  }

  // Phones: the top bar keeps only "☰" and the brand, like Google's mobile apps; the
  // nav links, the docs sidebar and the theme switch move into a navigation drawer.
  var MENU_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  function buildDrawer() {
    var bar = document.querySelector('.topbar, .live-bar');
    if (!bar) return;
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) root.classList.add('has-sidebar');

    var drawer = document.createElement('nav');
    drawer.className = 'drawer';
    drawer.id = 'site-drawer';
    drawer.setAttribute('aria-label', 'Site');
    drawer.hidden = true;
    var brand = bar.querySelector('.brand');
    if (brand) {
      var head = brand.cloneNode(true);
      head.classList.add('drawer-brand');
      drawer.appendChild(head);
    }
    var links = bar.querySelectorAll('nav a');
    if (links.length) {
      var list = document.createElement('div');
      list.className = 'drawer-links';
      links.forEach(function (a) { list.appendChild(a.cloneNode(true)); });
      drawer.appendChild(list);
    }
    if (sidebar) {
      sidebar.querySelectorAll('.group').forEach(function (g) {
        var c = g.cloneNode(true);
        c.classList.add('drawer-group');
        drawer.appendChild(c);
      });
    }
    var sw = bar.querySelector('.theme-switch');
    if (sw) {
      var row = document.createElement('div');
      row.className = 'drawer-theme';
      var label = document.createElement('span');
      label.textContent = 'Theme';
      row.appendChild(label);
      row.appendChild(sw.cloneNode(true));
      drawer.appendChild(row);
    }
    var scrim = document.createElement('div');
    scrim.className = 'drawer-scrim';
    scrim.hidden = true;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Menu');
    toggle.setAttribute('aria-controls', drawer.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = MENU_ICON;
    bar.insertBefore(toggle, bar.firstChild);
    document.body.appendChild(scrim);
    document.body.appendChild(drawer);

    function setOpen(open) {
      drawer.hidden = !open;
      scrim.hidden = !open;
      root.classList.toggle('drawer-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (open) (drawer.querySelector('.drawer-group a.active') || drawer.querySelector('a.active') || drawer.querySelector('a, button')).focus({ preventScroll: true });
      else toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener('click', function () { setOpen(drawer.hidden); });
    scrim.addEventListener('click', function () { setOpen(false); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) setOpen(false); });
    // back to a wide window with the drawer open: close it
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches && !drawer.hidden) setOpen(false); });
  }

  function init() {
    buildDrawer();
    wireTheme();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
