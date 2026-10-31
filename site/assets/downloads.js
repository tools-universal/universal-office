// Download badges of the desktop app (Beta) — the ONE place with its links.
// Pages put <div class="downloads" data-downloads="write|sheet|slides"></div>
// (with a <noscript> fallback) and load this file with `defer`.
//
// Universal Write, Universal Sheet and Universal Slides ship together in ONE
// desktop app, Universal Office (Beta): every editor's badges point to the same
// installers (the editor's page just names it). To update: change VERSION, or a
// target's `url`; `null` means "not published there yet" and is shown as
// "coming soon", not as a link.
(function () {
  // Release de pré-lançamento (Beta): o /releases/latest não aponta para ele,
  // então cada link vai à tag (`v<versão>`) ou ao arquivo dela.
  var BASE = 'https://github.com/erichideyuki/universal-office/releases/';
  var VERSION = '0.9.3';
  var TAG = 'v' + VERSION;
  var SUITE = 'Universal Office (Beta)';

  var APPS = {
    write: 'Universal Write (Beta)',
    sheet: 'Universal Sheet (Beta)',
    slides: 'Universal Slides (Beta)',
  };

  function file(suffix) { return BASE + 'download/' + TAG + '/Universal-Office-' + VERSION + '-beta' + suffix; }

  var TARGETS = [
    { label: 'Windows', url: file('-Setup.exe') },
    // macOS tem dois dmg (Apple Silicon e Intel): o link vai à página do release
    { label: 'macOS', url: BASE + 'tag/' + TAG },
    { label: 'Linux AppImage', url: file('-x86_64.AppImage') },
    { label: 'Snap Store', url: null },
    { label: 'Flathub', url: null },
  ];

  function part(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function badge(app, target) {
    var el;
    if (target.url) {
      el = document.createElement('a');
      el.href = target.url;
      el.rel = 'noopener';
      el.setAttribute('aria-label', 'Download ' + SUITE + ', with ' + APPS[app] + ', for ' + target.label);
      el.append(part('dl-k', 'Download for'), part('dl-v', target.label + ' (Beta)'));
    } else {
      el = document.createElement('span');
      el.className = 'soon';
      el.setAttribute('aria-label', SUITE + ' on ' + target.label + ': coming soon');
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
