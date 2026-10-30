// Download badges of the desktop apps (Beta) — the ONE place with their links.
// Pages put <div class="downloads" data-downloads="write|sheet|slides"></div>
// (with a <noscript> fallback) and load this file with `defer`.
//
// To update: change RELEASES or a target's `url`. A `url` can be one string for
// the three apps or an object per app ({ write, sheet, slides }); `null` means
// "not published there yet" and is shown as "coming soon", not as a link.
(function () {
  // Releases de pré-lançamento (Beta): o /releases/latest não aponta para eles,
  // então cada link vai à tag do app (`<app>-v<versão>`) ou ao arquivo dela.
  var BASE = 'https://github.com/tools-universal/universal-office-desktop/releases/';
  var VERSIONS = { write: '0.9.1', sheet: '0.0.1', slides: '0.0.1' };
  var NAMES = { write: 'Write', sheet: 'Sheet', slides: 'Slides' };

  var APPS = {
    write: 'Universal Write (Beta)',
    sheet: 'Universal Sheet (Beta)',
    slides: 'Universal Slides (Beta)',
  };

  function tag(app) { return app + '-v' + VERSIONS[app]; }
  function file(app, suffix) {
    return BASE + 'download/' + tag(app) + '/Universal-' + NAMES[app] + '-' + VERSIONS[app] + '-beta' + suffix;
  }
  function perApp(make) { return { write: make('write'), sheet: make('sheet'), slides: make('slides') }; }

  var TARGETS = [
    { label: 'Windows', url: perApp(function (app) { return file(app, '-Setup.exe'); }) },
    // macOS tem dois dmg (Apple Silicon e Intel): o link vai à página do release
    { label: 'macOS', url: perApp(function (app) { return BASE + 'tag/' + tag(app); }) },
    { label: 'Linux AppImage', url: perApp(function (app) { return file(app, '-x86_64.AppImage'); }) },
    { label: 'Snap Store', url: null },
    { label: 'Flathub', url: null },
  ];

  function urlFor(target, app) {
    var u = target.url;
    return u && typeof u === 'object' ? u[app] || null : u;
  }

  function part(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function badge(app, target) {
    var url = urlFor(target, app);
    var el;
    if (url) {
      el = document.createElement('a');
      el.href = url;
      el.rel = 'noopener';
      el.setAttribute('aria-label', 'Download ' + APPS[app] + ' for ' + target.label);
      el.append(part('dl-k', 'Download for'), part('dl-v', target.label + ' (Beta)'));
    } else {
      el = document.createElement('span');
      el.className = 'soon';
      el.setAttribute('aria-label', APPS[app] + ' on ' + target.label + ': coming soon');
      el.append(part('dl-k', target.label), part('dl-v', 'coming soon'));
    }
    el.classList.add('dl-badge');
    return el;
  }

  function render() {
    var boxes = document.querySelectorAll('[data-downloads]');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var app = box.getAttribute('data-downloads');
      if (!APPS[app]) continue;
      box.textContent = '';
      for (var j = 0; j < TARGETS.length; j++) box.append(badge(app, TARGETS[j]));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
