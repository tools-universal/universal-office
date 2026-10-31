#!/usr/bin/env node
/**
 * gen-docs — documentação dos web components no site, a partir dos READMEs dos
 * produtos (fonte ÚNICA: o README publicado e a página do site dizem o mesmo).
 *
 *   - gera site/docs/<slug>/index.html para os produtos sem página própria
 *     (document-viewer, sheet, slides-viewer, slides), com o visual do
 *     site (topo, barra lateral, tema);
 *   - reescreve a barra lateral de TODAS as páginas de docs (as escritas à mão
 *     do Write e do diff também), para elas apontarem umas para as outras.
 *
 * O Markdown aceito é o subconjunto usado nos READMEs: títulos, parágrafos,
 * listas, tabelas, blocos de código, `código`, **negrito**, links e imagens.
 *
 * Uso: node tools/site/gen-docs.mjs
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = path.join(ROOT, 'site', 'docs');

/** Páginas geradas a partir de README. */
const GENERATED = [
  { slug: 'document-viewer', readme: 'write/packages/viewer/README.md', title: '<universal-document-viewer>', suite: 'write' },
  { slug: 'sheet', readme: 'sheet/packages/sheet/README.md', title: '<universal-sheet>', suite: 'sheet' },
  { slug: 'slides', readme: 'slides/packages/slides/README.md', title: '<universal-slides>', suite: 'slides' },
  { slug: 'slides-viewer', readme: 'slides/packages/viewer/README.md', title: '<universal-slides-viewer>', suite: 'slides' },
];

/** README (caminho no repo) → página do site (para links entre READMEs). */
const README_PAGE = {
  'write/packages/editor/README.md': 'write/index.html',
  'write/packages/compare/README.md': 'universal-write-diff/index.html',
  ...Object.fromEntries(GENERATED.map((g) => [g.readme, `${g.slug}/index.html`])),
};

// ── barra lateral única ────────────────────────────────────────────────────────
const SIDEBAR = [
  { title: 'Universal Write', icon: 'write', items: [
    ['write/index.html', 'Getting started'], ['write/examples.html', 'Examples'], ['write/api.html', 'API reference'],
    ['write/events.html', 'Events'], ['write/plugins.html', 'Plugins'], ['write/compatibility.html', 'Compatibility'],
    ['document-viewer/index.html', '&lt;universal-document-viewer&gt;'], ['universal-write-diff/index.html', '&lt;universal-write-diff&gt;'],
  ] },
  { title: 'Universal Sheet', icon: 'sheet', items: [['sheet/index.html', '&lt;universal-sheet&gt;']] },
  { title: 'Universal Slides', icon: 'slides', items: [
    ['slides/index.html', '&lt;universal-slides&gt;'], ['slides-viewer/index.html', '&lt;universal-slides-viewer&gt;'],
  ] },
];

/** Barra lateral para a página `page` (relativa a site/docs). */
function sidebar(page) {
  const rel = (to) => path.posix.relative(path.posix.dirname(page), to) || path.posix.basename(to);
  return `<aside class="sidebar">\n${SIDEBAR.map((g) => `      <div class="group">
        <p class="title with-ico"><img class="nav-ico" src="../../assets/icons/${g.icon}.svg" alt="" />${g.title}</p>
        <ul>
${g.items.map(([to, label]) => `          <li><a href="${rel(to)}"${to === page ? ' class="active"' : ''}>${label}</a></li>`).join('\n')}
        </ul>
      </div>`).join('\n')}
    </aside>`;
}

// ── Markdown (subconjunto dos READMEs) → HTML ──────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(text, readmeDir) {
  // imagens e links primeiro (o rótulo pode ter `código`), guardados como marcadores
  const held = [];
  const hold = (html) => `\u0000${held.push(html) - 1}\u0000`;
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) =>
    hold(`<img class="doc-demo" src="${siteUrl(src, readmeDir)}" alt="${esc(alt)}" loading="lazy" />`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
    hold(`<a href="${siteUrl(href, readmeDir)}">${inline(label, readmeDir)}</a>`));
  const html = text.split(/(`[^`]*`)/).map((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) return `<code>${esc(part.slice(1, -1))}</code>`;
    return esc(part).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }).join('');
  return html.replace(/\u0000(\d+)\u0000/g, (_, n) => held[+n]);
}

/** URL de um link do README vista de site/docs/<slug>/index.html. */
function siteUrl(href, readmeDir) {
  if (/^(https?:|#|mailto:)/.test(href)) return href;
  const [file, hash] = href.split('#');
  const repoPath = path.posix.normalize(path.posix.join(readmeDir, file));
  if (repoPath.startsWith('site/')) return `../../${repoPath.slice('site/'.length)}${hash ? `#${hash}` : ''}`;
  const page = README_PAGE[repoPath];
  if (page) return `../${page}${hash ? `#${hash}` : ''}`;
  return href;
}

function markdown(md, readmeDir) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0, title = '', lead = '';
  const para = [];
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), readmeDir)}</p>`); para.length = 0; } };
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      i++; continue;
    }
    if (/^# /.test(l)) { flush(); title = l.slice(2).trim(); i++; continue; }
    const h = l.match(/^(#{2,3}) (.*)$/);
    if (h) { flush(); const tag = h[1].length === 2 ? 'h2' : 'h3'; out.push(`<${tag} id="${slugify(h[2])}">${inline(h[2], readmeDir)}</${tag}>`); i++; continue; }
    if (/^\|/.test(l)) {
      flush();
      const rows = [];
      for (; i < lines.length && /^\|/.test(lines[i]); i++) rows.push(lines[i]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => inline(c.trim().replace(/\\\|/g, '|'), readmeDir));
      const [head, , ...body] = rows;
      out.push(`<table>\n<thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead>\n<tbody>\n${body.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n')}\n</tbody>\n</table>`);
      continue;
    }
    if (/^- /.test(l)) {
      flush();
      const items = [];
      for (; i < lines.length && /^(- |  \S)/.test(lines[i]); i++) {
        if (/^- /.test(lines[i])) items.push(lines[i].slice(2)); else items[items.length - 1] += ' ' + lines[i].trim();
      }
      out.push(`<ul>\n${items.map((t) => `<li>${inline(t, readmeDir)}</li>`).join('\n')}\n</ul>`);
      continue;
    }
    if (!l.trim()) { flush(); i++; continue; }
    para.push(l.trim());
    i++;
  }
  flush();
  // 1º parágrafo vira a abertura (lead) da página
  const first = out.findIndex((x) => x.startsWith('<p>'));
  if (first >= 0) { lead = out[first].slice(3, -4); out.splice(first, 1); }
  return { title, lead, body: out.join('\n\n') };
}

// ── página ─────────────────────────────────────────────────────────────────────
const THEME_SWITCH = `<div class="theme-switch" role="group" aria-label="Theme">
      <button type="button" data-theme="auto" title="Auto (system)" aria-label="Auto theme"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg></button>
      <button type="button" data-theme="light" title="Light" aria-label="Light theme"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
      <button type="button" data-theme="dark" title="Dark" aria-label="Dark theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
    </div>`;

function pageHtml(g, doc) {
  const page = `${g.slug}/index.html`;
  const plainLead = doc.lead.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(g.title)} — Universal Office</title>
  <meta name="description" content="${plainLead.replace(/"/g, '&quot;')}" />
  <link rel="icon" type="image/svg+xml" href="../../assets/icons/universal-office.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" />
  <link rel="stylesheet" href="../../assets/style.css" />
  <script src="../../assets/theme.js?v=2"></script>
</head>
<body>
  <!-- Gerado por tools/site/gen-docs.mjs a partir de ${g.readme} — edite o README, não esta página. -->

  <header class="topbar">
    <a class="brand" href="../../index.html">
      <img class="brand-logo" src="../../assets/icons/universal-office.svg" width="30" height="30" alt="Universal Office" />
      Universal Office<span class="beta">Beta</span>
    </a>
    <nav>
      <a href="../../index.html">Home</a>
      <a href="../write/index.html" class="active">Documentation</a>
    </nav>
    ${THEME_SWITCH}
  </header>

  <div class="docs-layout">
    ${sidebar(page)}

    <main class="content">
      <h1>${esc(g.title)}</h1>
      <p class="lead-doc">${doc.lead}</p>
      <p><small>Package <code>${esc(doc.title)}</code></small></p>

${doc.body}
    </main>
  </div>

</body>
</html>
`;
}

// ── execução ───────────────────────────────────────────────────────────────────
for (const g of GENERATED) {
  const md = readFileSync(path.join(ROOT, g.readme), 'utf8');
  const doc = markdown(md, path.posix.dirname(g.readme));
  mkdirSync(path.join(DOCS, g.slug), { recursive: true });
  writeFileSync(path.join(DOCS, g.slug, 'index.html'), pageHtml(g, doc));
  console.log(`gen-docs: site/docs/${g.slug}/index.html ← ${g.readme}`);
}
// barra lateral de todas as páginas de docs
for (const dir of readdirSync(DOCS)) {
  if (!statSync(path.join(DOCS, dir)).isDirectory()) continue;
  for (const f of readdirSync(path.join(DOCS, dir)).filter((x) => x.endsWith('.html'))) {
    const file = path.join(DOCS, dir, f);
    const html = readFileSync(file, 'utf8');
    const nl = html.includes('\r\n') ? '\r\n' : '\n'; // as páginas escritas à mão são CRLF
    const next = html.replace(/<aside class="sidebar">[\s\S]*?<\/aside>/, () => sidebar(`${dir}/${f}`).replace(/\r?\n/g, nl));
    if (next !== html) { writeFileSync(file, next); console.log(`gen-docs: barra lateral de site/docs/${dir}/${f}`); }
  }
}
