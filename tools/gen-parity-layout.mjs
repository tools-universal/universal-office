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
// imagem com Formato da Imagem leva `pic` (forma, contorno, efeitos e ajustes do
// a:blip, cores resolvidas; frações como sx/stA a 0,0001); as demais não têm a chave.
// forma com padrão (a:pattFill) leva `pattern` (prst, cores resolvidas) e com imagem/textura
// (a:blipFill) `blip` (ext, bytes, a:tile, alfa) e com Efeitos de Forma `fx` (sombra, brilho,
// bordas suaves e reflexo como no `pic`) — idem, só quando há; xform leva op e a
// matriz (6 números a 0,0001).
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
// entradas sintéticas de paridade fora do oráculo (sem medida do Word): fixtures/input/<nome>.docx
// → expected/layout-input/<nome>.layout.json, casos "input/<nome>" (Formato da Imagem:
// tools/gen-parity-pictures.mjs; caixas de texto: tools/gen-parity-textboxes.mjs)
const inputDir = join(root, 'dotnet', 'tests', 'fixtures', 'input');
const inputOutDir = join(root, 'dotnet', 'tests', 'fixtures', 'expected', 'layout-input');
const INPUT_CASES = ['input/pictures', 'input/page', 'input/page-pattern', 'input/page-frame', 'input/page-tile', 'input/textboxes'];

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
  /** número opcional a 0,01: ausente → null sem aviso */
  const optR = (v, field) => (v === undefined || v === null ? null : r(v, field));
  const optBool = (v, field) => (v === undefined || v === null ? null : bool(v, field));
  // sombra, brilho e reflexo de um PictureLook (Formato da Imagem e Efeitos de Forma); `pre`
  // só nomeia o campo nos avisos
  const shadowOf = (s, pre) => (s
    ? {
      kind: str(s.kind, `${pre}.shadow.kind`), color: str(s.color, `${pre}.shadow.color`), alpha: r4(s.alpha, `${pre}.shadow.alpha`),
      blur: r(s.blurPt, `${pre}.shadow.blurPt`), dist: r(s.distPt, `${pre}.shadow.distPt`), dir: r(s.dirDeg, `${pre}.shadow.dirDeg`),
      sx: optR4(s.sx, `${pre}.shadow.sx`), sy: optR4(s.sy, `${pre}.shadow.sy`),
      kx: optR(s.kxDeg, `${pre}.shadow.kxDeg`), ky: optR(s.kyDeg, `${pre}.shadow.kyDeg`),
      algn: optStr(s.algn, `${pre}.shadow.algn`), rotWithShape: optBool(s.rotWithShape, `${pre}.shadow.rotWithShape`),
    }
    : null);
  const glowOf = (g, pre) => (g
    ? { color: str(g.color, `${pre}.glow.color`), alpha: r4(g.alpha, `${pre}.glow.alpha`), rad: r(g.radPt, `${pre}.glow.radPt`) }
    : null);
  const reflectionOf = (x, pre) => (x
    ? {
      blur: r(x.blurPt, `${pre}.reflection.blurPt`), stA: r4(x.stA, `${pre}.reflection.stA`),
      stPos: r4(x.stPos, `${pre}.reflection.stPos`), endA: r4(x.endA, `${pre}.reflection.endA`),
      endPos: r4(x.endPos, `${pre}.reflection.endPos`), dist: r(x.distPt, `${pre}.reflection.distPt`),
      dir: r(x.dirDeg, `${pre}.reflection.dirDeg`), sy: r4(x.sy, `${pre}.reflection.sy`),
      algn: optStr(x.algn, `${pre}.reflection.algn`), rotWithShape: optBool(x.rotWithShape, `${pre}.reflection.rotWithShape`),
    }
    : null);
  // Efeitos de Forma (ShapeItem.fx): sombra, brilho, bordas suaves e reflexo — só nos itens
  // que os têm; chaves fixas, null = ausente
  const shapeFx = (f) => ({
    shadow: shadowOf(f.shadow, 'fx'),
    glow: glowOf(f.glow, 'fx'),
    softEdge: optR(f.softEdgePt, 'fx.softEdgePt'),
    reflection: reflectionOf(f.reflection, 'fx'),
  });
  // Formato da Imagem (PictureLook): forma, contorno, efeitos e ajustes do a:blip — só
  // nos itens que o têm (as demais imagens ficam como antes); chaves fixas, null = ausente
  const pic = (p) => ({
    geom: p.geom
      ? {
        prst: str(p.geom.prst, 'pic.geom.prst'),
        adj: p.geom.adj ? Object.fromEntries(Object.entries(p.geom.adj).map(([k, v]) => [k, r(v, `pic.geom.adj.${k}`)])) : null,
      }
      : null,
    line: p.line
      ? {
        color: str(p.line.color, 'pic.line.color'), alpha: r4(p.line.alpha, 'pic.line.alpha'), width: r(p.line.widthPt, 'pic.line.widthPt'),
        dash: optStr(p.line.dash, 'pic.line.dash'), cmpd: optStr(p.line.cmpd, 'pic.line.cmpd'),
        cap: optStr(p.line.cap, 'pic.line.cap'), join: optStr(p.line.join, 'pic.line.join'),
      }
      : null,
    shadow: shadowOf(p.shadow, 'pic'),
    glow: glowOf(p.glow, 'pic'),
    softEdge: optR(p.softEdgePt, 'pic.softEdgePt'),
    bevel: p.bevel
      ? {
        w: r(p.bevel.wPt, 'pic.bevel.wPt'), h: r(p.bevel.hPt, 'pic.bevel.hPt'), prst: optStr(p.bevel.prst, 'pic.bevel.prst'),
        rig: optStr(p.bevel.rig, 'pic.bevel.rig'), dir: optStr(p.bevel.dir, 'pic.bevel.dir'), material: optStr(p.bevel.material, 'pic.bevel.material'),
      }
      : null,
    reflection: reflectionOf(p.reflection, 'pic'),
    alpha: optR4(p.alpha, 'pic.alpha'),
    duotone: p.duotone ? [str(p.duotone[0], 'pic.duotone.0'), str(p.duotone[1], 'pic.duotone.1')] : null,
    clrChange: p.clrChange
      ? { from: str(p.clrChange.from, 'pic.clrChange.from'), to: str(p.clrChange.to, 'pic.clrChange.to'), toAlpha: r4(p.clrChange.toAlpha, 'pic.clrChange.toAlpha') }
      : null,
  });

  // imagem do a:blipFill (Imagem/Textura): bytes, mosaico (a:tile) e opacidade
  const blip = (b) => ({
    ext: str(b.image?.ext, 'blip.image.ext'),
    bytes: num(b.image?.data?.length, 'blip.image.data.length', 1),
    tile: b.tile
      ? {
        tx: r(b.tile.tx, 'blip.tile.tx'), ty: r(b.tile.ty, 'blip.tile.ty'), sx: r(b.tile.sx, 'blip.tile.sx'), sy: r(b.tile.sy, 'blip.tile.sy'),
        algn: str(b.tile.algn, 'blip.tile.algn'), flip: str(b.tile.flip, 'blip.tile.flip'),
      }
      : null,
    alpha: optR4(b.alpha, 'blip.alpha'),
  });

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
          ...(it.pic ? { pic: pic(it.pic) } : {}),
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
          // padrão (a:pattFill) e imagem/textura (a:blipFill): só nos itens que os têm
          ...(it.pattern ? { pattern: { prst: str(it.pattern.prst, 'pattern.prst'), fg: str(it.pattern.fg, 'pattern.fg'), bg: str(it.pattern.bg, 'pattern.bg') } } : {}),
          ...(it.blip ? { blip: blip(it.blip) } : {}),
          // Efeitos de Forma (brilho, bordas suaves, sombra interna/perspectiva, reflexo): idem
          ...(it.fx ? { fx: shapeFx(it.fx) } : {}),
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
      case 'xform':
        // transformação afim (giro de caixa, escala do WordArt/marca-d'água): a,b,c,d a 0,0001; e,f em twips a 0,01
        return it.op === 'pop'
          ? { t: 'xform', op: 'pop' }
          : { t: 'xform', op: 'push', m: (it.m ?? []).map((v, i) => num(v, 'm', i < 4 ? 10000 : 100)) };
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
    // Cor da Página (frente Página): cor, se a tela mostra e o efeito resolvido — só quando há
    if (p.background || p.backgroundFill) {
      where = `p${pi + 1}/bg`; t = 'bg';
      const f = p.backgroundFill;
      page.bg = {
        color: p.background ?? null, show: !!p.backgroundShow,
        fill: f ? {
          type: str(f.type, 'type'), c1: str(f.c1, 'c1'), c2: str(f.c2, 'c2'), angle: r(f.angle, 'angle'), focus: r(f.focus, 'focus'),
          fp: f.focusPosition ? [r(f.focusPosition[0], 'fp'), r(f.focusPosition[1], 'fp')] : null, center: !!f.gradientCenter,
          stops: f.stops ? f.stops.map((x) => [num(x.pos, 'pos', 10000), x.color]) : null,
          pattern: f.pattern ?? null, img: f.imagePx ? [f.imagePx.w, f.imagePx.h, f.imagePx.dpi] : null,
        } : null,
      };
    }
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
    `      "lines": ${list(p.lines, '      ')}${p.bg ? ',' : ''}`,
    ...(p.bg ? [`      "bg": ${J(p.bg)}`] : []),
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
  const layout = eng; // base tipográfica dentro do docx-layout (src/typography) desde a consolidação
  const { createNodeFontProvider } = await import(
    new URL('../write/tools/corpus-lab/node-fonts.mjs', import.meta.url).href);
  const provider = await createNodeFontProvider();
  // hifenização automática (grupos hyph*): padrões carregados antes, como no oracle.test.ts
  await layout.loadHyphenation(layout.HYPHENATION_PATTERN_IDS);

  const missing = ['Arial', 'Calibri', 'Times New Roman'].filter((f) => !provider.face(f, false, false));
  if (missing.length) {
    console.warn(`aviso: fontes ausentes na máquina (${missing.join(', ')}) — as fixtures de layout dependem delas; nada foi gravado.`);
    process.exit(0);
  }

  // mesmo caminho do convert() de write/tools/corpus-lab/run-engine.mjs
  // (o oráculo só tem .docx; .odt não entra aqui)
  // casos mk-* (controle de alterações): Todas as Marcações — o .NET faz o mesmo
  const convert = (bytes, opts = {}) => {
    if (core.isWordBinary(bytes)) bytes = core.convertDocToDocx(bytes);
    const pkg = core.DocxPackage.load(bytes);
    const full = core.readFullDocument(pkg);
    let embedded = [];
    try { embedded = core.readEmbeddedFonts(pkg); } catch { /* sem fontes embutidas legíveis */ }
    const prov = eng.withEmbeddedFonts(provider, embedded, (b) => new layout.SfntFont(b));
    return eng.layoutDocument(full, prov, opts);
  };

  const all = [...listCases(), ...INPUT_CASES.filter((c) => existsSync(join(inputDir, `${c.slice(6)}.docx`)))];
  if (only) for (const c of only) if (!all.includes(c)) console.warn(`aviso: --only ${c}: caso inexistente`);
  const cases = only ? all.filter((c) => only.has(c)) : all;

  const t0 = Date.now();
  let pages = 0, items = 0, bytesOut = 0;
  const errors = [];
  const issues = new Map(); // caso → Map("tipo.campo: kind" → { n, first })
  for (const c of cases) {
    let norm;
    try {
      const res = convert(new Uint8Array(readFileSync(c.startsWith('input/') ? join(inputDir, `${c.slice(6)}.docx`) : join(oracleDir, `${c}.docx`))), c.split('/').pop().startsWith('mk-') ? { revisions: { mode: 'all' } } : {});
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
    const file = c.startsWith('input/') ? join(inputOutDir, `${c.slice(6)}.layout.json`) : join(outDir, `${c}.layout.json`);
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
