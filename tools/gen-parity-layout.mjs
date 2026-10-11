// Gera as fixtures de paridade do LAYOUT do Write (motor docx-layout) para o
// port .NET: roda o motor JS do mesmo jeito que o convert() de
// write/tools/corpus-lab/run-engine.mjs (readFullDocument + fontes embutidas
// via withEmbeddedFonts + layoutDocument com as opções padrão) sobre cada caso
// do oráculo Word — write/packages/docx-layout/test/oracle/<grupo>/<caso>.docx,
// em ordem — e grava a árvore normalizada em
// dotnet/tests/fixtures/expected/layout/<grupo>/<caso>.layout.json.
//
// Fontes: as INSTALADAS na máquina (corpus-lab/node-fonts.mjs), lidas e nunca
// copiadas; o dump guarda só nomes de família e números (CLAUDE.md). Sem
// Arial, Calibri ou Times New Roman o motor cairia nas substitutas e as
// fixtures mudariam: avisa e sai sem gravar nada.
//
// Formato (o teste .NET compara a estrutura exata e os números com ±0,05):
//   { "pages": [{ "w", "h", "section", "number", "items": [...], "lines": [...] }],
//     "warnings": [...] }
// números arredondados a 0,01 (recorte e alfas a 0,0001), -0 → 0; ordem de
// chaves fixa; um item / uma linha de texto por linha do arquivo (diff
// legível). Exceção do motor num caso: { "error": "<mensagem>" } e segue.
// NaN/Infinity/undefined onde se espera valor viram null no JSON — são
// detectados e listados no resumo (caso, tipo de item, campo).
//
// Regenerável: `node tools/gen-parity-layout.mjs [--only grupo/caso,grupo/caso]`
// (dist de docx-core, layout, pdf e docx-layout já buildado).
// `normalizeLayout(res)` e `formatLayout(norm)` são exportados para outros scripts.
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const oracleDir = join(root, 'write', 'packages', 'docx-layout', 'test', 'oracle');
const outDir = join(root, 'dotnet', 'tests', 'fixtures', 'expected', 'layout');

// ─────────────────────── normalização ───────────────────────

const noNegZero = (v) => (Object.is(v, -0) ? 0 : v);

/**
 * Árvore do motor (LayoutResult) → objeto normalizado do dump. `onIssue`
 * recebe cada valor inválido ({ where, t, field, kind, value }): número não
 * finito (NaN/Infinity), valor ausente onde o formato exige um, tipo de item
 * desconhecido. Padrão: console.warn.
 */
export function normalizeLayout(res, onIssue = (i) => console.warn(`aviso: ${i.where} ${i.t}.${i.field}: ${i.kind}`)) {
  let where = '', t = '';
  const issue = (field, kind, value) => onIssue({ where, t, field, kind, value });
  const num = (v, field, k = 100) => {
    if (typeof v !== 'number') { issue(field, v === undefined ? 'undefined' : `tipo ${typeof v}`, v); return null; }
    if (!Number.isFinite(v)) { issue(field, String(v), v); return null; }
    return noNegZero(Math.round(v * k) / k);
  };
  const r = (v, field) => num(v, field, 100);
  const r4 = (v, field) => num(v, field, 1e4);
  /** número opcional: ausente → null sem aviso */
  const optR4 = (v, field) => (v === undefined || v === null ? null : r4(v, field));
  const str = (v, field) => {
    if (typeof v !== 'string') { issue(field, v === undefined ? 'undefined' : `tipo ${typeof v}`, v); return v ?? null; }
    return v;
  };
  const optStr = (v, field) => (v === undefined || v === null ? null : str(v, field));
  const bool = (v, field) => {
    if (typeof v !== 'boolean') { issue(field, v === undefined ? 'undefined' : `tipo ${typeof v}`, v); return v ?? null; }
    return v;
  };
  const stroke = (s) => (s
    ? { color: str(s.color, 'stroke.color'), width: r(s.widthPt, 'stroke.widthPt'), dash: optStr(s.dash, 'stroke.dash') }
    : null);

  const item = (it) => {
    switch (it.t) {
      case 'glyphs': {
        const face = it.face ?? {};
        if (!it.face) issue('face', 'undefined', it.face);
        return {
          t: 'glyphs',
          family: str(face.family, 'face.family'),
          bold: bool(face.bold, 'face.bold'),
          italic: bool(face.italic, 'face.italic'),
          synthBold: !!it.synthBold,
          synthItalic: !!it.synthItalic,
          size: r(it.sizePt, 'sizePt'),
          color: str(it.color, 'color'),
          y: r(it.y, 'y'),
          scaleX: r(it.scaleX ?? 1, 'scaleX'),
          text: str(it.text, 'text'),
          g: (it.glyphs ?? []).map((g) => [num(g.cp, 'glyphs.cp', 1), r(g.x, 'glyphs.x')]),
        };
      }
      case 'rect':
        return {
          t: 'rect', x: r(it.x, 'x'), y: r(it.y, 'y'), w: r(it.w, 'w'), h: r(it.h, 'h'),
          fill: str(it.fill, 'fill'), alpha: optR4(it.alpha, 'alpha'),
        };
      case 'line':
        return {
          t: 'line', x1: r(it.x1, 'x1'), y1: r(it.y1, 'y1'), x2: r(it.x2, 'x2'), y2: r(it.y2, 'y2'),
          color: str(it.color, 'color'), width: r(it.widthPt, 'widthPt'), dash: optStr(it.dash, 'dash'),
        };
      case 'image': {
        const img = it.image ?? {};
        if (!it.image) issue('image', 'undefined', it.image);
        const c = it.crop;
        return {
          t: 'image', x: r(it.x, 'x'), y: r(it.y, 'y'), w: r(it.w, 'w'), h: r(it.h, 'h'),
          ext: str(img.ext, 'image.ext'),
          bytes: num(img.data?.length, 'image.data.length', 1),
          crop: c ? [r4(c.l, 'crop.l'), r4(c.t, 'crop.t'), r4(c.r, 'crop.r'), r4(c.b, 'crop.b')] : null,
          rot: r(it.rot ?? 0, 'rot'),
          flipH: !!it.flipH,
          flipV: !!it.flipV,
        };
      }
      case 'shape': {
        const st = it.style ?? {};
        if (!it.style) issue('style', 'undefined', it.style);
        const l = it.line;
        return {
          t: 'shape', x: r(it.x, 'x'), y: r(it.y, 'y'), w: r(it.w, 'w'), h: r(it.h, 'h'),
          geom: str(st.geom, 'style.geom'),
          rot: r(st.rot ?? 0, 'style.rot'),
          flipH: !!st.flipH,
          flipV: !!st.flipV,
          fillAlpha: optR4(st.fillAlpha, 'style.fillAlpha'),
          lineAlpha: optR4(st.line?.alpha, 'style.line.alpha'),
          fill: optStr(it.fill, 'fill'),
          stroke: stroke(it.stroke),
          line: l ? [r(l.x1, 'line.x1'), r(l.y1, 'line.y1'), r(l.x2, 'line.x2'), r(l.y2, 'line.y2')] : null,
        };
      }
      case 'path':
        return {
          t: 'path',
          cmds: (it.cmds ?? []).map((c) => {
            switch (c.op) {
              case 'M': case 'L': return [c.op, r(c.x, `cmds.${c.op}.x`), r(c.y, `cmds.${c.op}.y`)];
              case 'C': return ['C', r(c.x1, 'cmds.C.x1'), r(c.y1, 'cmds.C.y1'), r(c.x2, 'cmds.C.x2'),
                r(c.y2, 'cmds.C.y2'), r(c.x, 'cmds.C.x'), r(c.y, 'cmds.C.y')];
              case 'Z': return ['Z'];
              default: issue('cmds.op', `op desconhecido ${c.op}`, c.op); return [String(c.op)];
            }
          }),
          fill: optStr(it.fill, 'fill'),
          stroke: stroke(it.stroke),
          evenOdd: !!it.evenOdd,
        };
      case 'clip':
        return it.op === 'pop'
          ? { t: 'clip', op: 'pop' }
          : { t: 'clip', op: 'push', x: r(it.x ?? 0, 'x'), y: r(it.y ?? 0, 'y'), w: r(it.w ?? 0, 'w'), h: r(it.h ?? 0, 'h') };
      default:
        issue('t', 'tipo de item desconhecido', it.t);
        return { t: it.t };
    }
  };

  const pages = (res.pages ?? []).map((p, pi) => {
    where = `p${pi + 1}`; t = 'page';
    const page = {
      w: r(p.widthTw, 'widthTw'), h: r(p.heightTw, 'heightTw'),
      section: num(p.section, 'section', 1), number: num(p.number, 'number', 1),
      items: [], lines: [],
    };
    (p.items ?? []).forEach((it, ii) => {
      where = `p${pi + 1}/item${ii}`; t = it?.t ?? '?';
      page.items.push(item(it));
    });
    (p.lines ?? []).forEach((ln, li) => {
      where = `p${pi + 1}/line${li}`; t = 'line-record';
      page.lines.push({
        ref: str(ln.ref, 'ref'), start: r(ln.start, 'start'), end: r(ln.end, 'end'),
        x: r(ln.x, 'x'), y: r(ln.y, 'y'), height: r(ln.height, 'height'),
        baseline: r(ln.baseline, 'baseline'), width: r(ln.width, 'width'),
      });
    });
    return page;
  });
  where = 'warnings'; t = 'warning';
  const warnings = (res.warnings ?? []).map((w) => str(w, 'warning'));
  return { pages, warnings };
}

/** Texto do arquivo: determinístico, LF, um item / uma linha de texto por linha. */
export function formatLayout(norm) {
  if (norm.error !== undefined) return `${JSON.stringify({ error: norm.error }, null, 2)}\n`;
  const J = JSON.stringify;
  const list = (arr, ind) => (arr.length
    ? `[\n${arr.map((x) => `${ind}  ${J(x)}`).join(',\n')}\n${ind}]`
    : '[]');
  const page = (p) => [
    '    {',
    `      "w": ${J(p.w)},`,
    `      "h": ${J(p.h)},`,
    `      "section": ${J(p.section)},`,
    `      "number": ${J(p.number)},`,
    `      "items": ${list(p.items, '      ')},`,
    `      "lines": ${list(p.lines, '      ')}`,
    '    }',
  ].join('\n');
  return [
    '{',
    `  "pages": ${norm.pages.length ? `[\n${norm.pages.map(page).join(',\n')}\n  ]` : '[]'},`,
    `  "warnings": ${list(norm.warnings, '  ')}`,
    '}',
    '',
  ].join('\n');
}

// ─────────────────────── geração ───────────────────────

/** Casos do oráculo (grupo/caso, sem extensão), em ordem de code unit. */
function listCases() {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.docx$/i.test(e.name)) out.push(relative(oracleDir, p).split(sep).join('/').replace(/\.docx$/i, ''));
    }
  };
  walk(oracleDir);
  return out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const oi = argv.indexOf('--only');
  const only = oi >= 0 ? new Set((argv[oi + 1] ?? '').split(',').map((s) => s.trim().replace(/\.docx$/i, '')).filter(Boolean)) : null;

  const dist = (p) => import(new URL(`../write/packages/${p}/dist/index.js`, import.meta.url).href);
  const core = await dist('docx-core');
  const eng = await dist('docx-layout');
  const layout = await dist('layout');
  const { createNodeFontProvider } = await import(
    new URL('../write/tools/corpus-lab/node-fonts.mjs', import.meta.url).href);
  const provider = await createNodeFontProvider();

  const missing = ['Arial', 'Calibri', 'Times New Roman'].filter((f) => !provider.face(f, false, false));
  if (missing.length) {
    console.warn(`aviso: fontes ausentes na máquina (${missing.join(', ')}) — as fixtures de layout dependem delas; nada foi gravado.`);
    process.exit(0);
  }

  // mesmo caminho do convert() de write/tools/corpus-lab/run-engine.mjs
  // (o oráculo só tem .docx; .odt não entra aqui)
  const convert = (bytes) => {
    if (core.isWordBinary(bytes)) bytes = core.convertDocToDocx(bytes);
    const pkg = core.DocxPackage.load(bytes);
    const full = core.readFullDocument(pkg);
    let embedded = [];
    try { embedded = core.readEmbeddedFonts(pkg); } catch { /* sem fontes embutidas legíveis */ }
    const prov = eng.withEmbeddedFonts(provider, embedded, (b) => new layout.SfntFont(b));
    return eng.layoutDocument(full, prov);
  };

  const all = listCases();
  if (only) for (const c of only) if (!all.includes(c)) console.warn(`aviso: --only ${c}: caso inexistente`);
  const cases = only ? all.filter((c) => only.has(c)) : all;

  const t0 = Date.now();
  let pages = 0, items = 0, bytesOut = 0;
  const errors = [];
  const issues = new Map(); // caso → Map("tipo.campo: kind" → { n, first })
  for (const c of cases) {
    let norm;
    try {
      const res = convert(new Uint8Array(readFileSync(join(oracleDir, `${c}.docx`))));
      norm = normalizeLayout(res, (i) => {
        const m = issues.get(c) ?? new Map();
        const k = `${i.t}.${i.field}: ${i.kind}`;
        const e = m.get(k) ?? { n: 0, first: i.where };
        e.n++;
        m.set(k, e);
        issues.set(c, m);
      });
      pages += norm.pages.length;
      items += norm.pages.reduce((n, p) => n + p.items.length, 0);
    } catch (e) {
      const msg = String(e?.message ?? e);
      errors.push(`${c}: ${msg}`);
      norm = { error: msg };
    }
    const text = formatLayout(norm);
    const file = join(outDir, `${c}.layout.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text, 'utf8');
    bytesOut += Buffer.byteLength(text, 'utf8');
  }
  const ms = Date.now() - t0;

  // dumps órfãos (caso removido do oráculo): só avisa — não apaga
  if (!only && existsSync(outDir)) {
    const want = new Set(all.map((c) => `${c}.layout.json`));
    const stale = [];
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.layout.json') && !want.has(relative(outDir, p).split(sep).join('/'))) stale.push(p);
      }
    };
    walk(outDir);
    for (const p of stale) console.warn(`aviso: dump órfão (caso não existe mais): ${relative(root, p)}`);
  }

  for (const [c, m] of issues) {
    for (const [k, e] of m) console.warn(`valor inválido: ${c} ${k} ×${e.n} (1º em ${e.first})`);
  }
  for (const e of errors) console.warn(`erro: ${e}`);
  const mb = (bytesOut / 1048576).toFixed(2);
  console.log(`${cases.length} casos, ${pages} páginas, ${items} itens, ${errors.length} erros, ` +
    `${issues.size} casos com valores inválidos, ${mb} MB, ${ms} ms → ${relative(root, outDir)}`);
}
