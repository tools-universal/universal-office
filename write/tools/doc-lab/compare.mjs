// Comparação estrutural de dois .docx (o nosso convertido × o salvo pelo Word):
// extrai um modelo normalizado (parágrafos com texto e propriedades EFETIVAS —
// estilos resolvidos —, tabelas, seções, cabeçalhos/rodapés, numeração,
// imagens, notas) e conta divergências por categoria.
//
// Os dois lados são normalizados da mesma forma: o Word grava imagens de .doc
// como VML (w:pict/v:imagedata) e nós como DrawingML (wp:inline/wp:anchor);
// runs quebrados por rsid são irrelevantes (comparamos por caractere).
import { unzipSync, strFromU8 } from 'fflate';

const EMU_PER_PT = 12700;

// ───────────────────────────── XML ─────────────────────────────

function kids(el, name) {
  return el ? el.children.filter((c) => typeof c !== 'string' && (!name || c.name === name)) : [];
}
function kid(el, name) {
  return el ? el.children.find((c) => typeof c !== 'string' && c.name === name) : undefined;
}
function textOf(el) {
  let s = '';
  for (const c of el.children) s += typeof c === 'string' ? c : textOf(c);
  return s;
}
const onOffVal = (e) => (e ? !['0', 'false', 'off'].includes(e.attrs['w:val'] ?? '') : undefined);

// ───────────────────────────── estilos ─────────────────────────────

/** Propriedades de parágrafo relevantes (nomes estáveis). */
function readPPr(pPr) {
  const o = {};
  if (!pPr) return o;
  const jc = kid(pPr, 'w:jc');
  if (jc) {
    const v = jc.attrs['w:val'];
    o.jc = v === 'start' ? 'left' : v === 'end' ? 'right' : v;
  }
  const ind = kid(pPr, 'w:ind');
  if (ind) {
    const a = ind.attrs;
    const num = (k) => (a[k] !== undefined ? Number(a[k]) : undefined);
    const left = num('w:left') ?? num('w:start');
    const right = num('w:right') ?? num('w:end');
    if (left !== undefined) o.indLeft = left;
    if (right !== undefined) o.indRight = right;
    if (a['w:hanging'] !== undefined) o.indFirst = -Number(a['w:hanging']);
    else if (a['w:firstLine'] !== undefined) o.indFirst = Number(a['w:firstLine']);
  }
  const sp = kid(pPr, 'w:spacing');
  if (sp) {
    const a = sp.attrs;
    if (a['w:before'] !== undefined) o.spBefore = Number(a['w:before']);
    if (a['w:after'] !== undefined) o.spAfter = Number(a['w:after']);
    if (a['w:beforeAutospacing'] !== undefined) o.spBeforeAuto = a['w:beforeAutospacing'] === '1' || a['w:beforeAutospacing'] === 'true';
    if (a['w:afterAutospacing'] !== undefined) o.spAfterAuto = a['w:afterAutospacing'] === '1' || a['w:afterAutospacing'] === 'true';
    if (a['w:line'] !== undefined) { o.spLine = Number(a['w:line']); o.spLineRule = a['w:lineRule'] ?? 'auto'; }
  }
  for (const [k, n] of [['keepNext', 'w:keepNext'], ['keepLines', 'w:keepLines'], ['pageBreakBefore', 'w:pageBreakBefore'], ['widowControl', 'w:widowControl'], ['contextualSpacing', 'w:contextualSpacing']]) {
    const e = kid(pPr, n);
    if (e) o[k] = onOffVal(e);
  }
  const numPr = kid(pPr, 'w:numPr');
  if (numPr) {
    const id = kid(numPr, 'w:numId');
    const lvl = kid(numPr, 'w:ilvl');
    if (id) o.numId = id.attrs['w:val'];
    if (lvl) o.ilvl = Number(lvl.attrs['w:val']);
  }
  const fp = kid(pPr, 'w:framePr');
  if (fp) o.frame = ['w:w', 'w:h', 'w:hRule', 'w:x', 'w:y', 'w:xAlign', 'w:yAlign', 'w:hAnchor', 'w:vAnchor', 'w:wrap', 'w:dropCap', 'w:lines']
    .map((k) => fp.attrs[k] ?? '').join('|');
  const ol = kid(pPr, 'w:outlineLvl');
  if (ol) o.outlineLvl = Number(ol.attrs['w:val']);
  const shd = kid(pPr, 'w:shd');
  if (shd) o.shd = (shd.attrs['w:fill'] ?? 'auto').toUpperCase();
  const bdr = kid(pPr, 'w:pBdr');
  if (bdr) for (const s of ['top', 'left', 'bottom', 'right']) {
    const e = kid(bdr, `w:${s}`);
    if (e) o[`bdr_${s}`] = ['nil', 'none'].includes(e.attrs['w:val']) ? 'none' : `${e.attrs['w:val']}/${e.attrs['w:sz'] ?? ''}`;
  }
  const tabs = kid(pPr, 'w:tabs');
  if (tabs) o.tabs = kids(tabs, 'w:tab').map((t) => ({ val: t.attrs['w:val'], pos: Number(t.attrs['w:pos']), leader: t.attrs['w:leader'] }));
  return o;
}

/** Propriedades de caractere relevantes. */
function readRPr(rPr) {
  const o = {};
  if (!rPr) return o;
  for (const [k, n] of [['b', 'w:b'], ['i', 'w:i'], ['caps', 'w:caps'], ['smallCaps', 'w:smallCaps'], ['strike', 'w:strike'], ['dstrike', 'w:dstrike'], ['vanish', 'w:vanish']]) {
    const e = kid(rPr, n);
    if (e) o[k] = onOffVal(e);
  }
  const u = kid(rPr, 'w:u');
  if (u) o.u = u.attrs['w:val'] === 'none' ? 'none' : u.attrs['w:val'];
  const sz = kid(rPr, 'w:sz');
  if (sz) o.sz = Number(sz.attrs['w:val']);
  const f = kid(rPr, 'w:rFonts');
  if (f && f.attrs['w:ascii']) o.font = f.attrs['w:ascii'];
  else if (f && f.attrs['w:asciiTheme']) o.font = `theme:${f.attrs['w:asciiTheme']}`;
  if (f && f.attrs['w:eastAsia']) o.fontEA = f.attrs['w:eastAsia'];
  if (f && f.attrs['w:cs']) o.fontCs = f.attrs['w:cs'];
  const sp = kid(rPr, 'w:spacing');
  if (sp) o.spacing = Number(sp.attrs['w:val']);
  const pos = kid(rPr, 'w:position');
  if (pos) o.position = Number(pos.attrs['w:val']);
  const c = kid(rPr, 'w:color');
  if (c) o.color = (c.attrs['w:val'] ?? 'auto').toUpperCase();
  const va = kid(rPr, 'w:vertAlign');
  if (va) o.vertAlign = va.attrs['w:val'] === 'baseline' ? undefined : va.attrs['w:val'];
  const hl = kid(rPr, 'w:highlight');
  if (hl) o.highlight = hl.attrs['w:val'];
  const rs = kid(rPr, 'w:rStyle');
  if (rs) o.rStyle = rs.attrs['w:val'];
  return o;
}

class Styles {
  constructor(xml) {
    this.byId = new Map();
    this.defRPr = {};
    this.defPPr = {};
    this.defaultPara = undefined;
    this.defaultChar = undefined;
    if (!xml) return;
    const dd = kid(xml, 'w:docDefaults');
    if (dd) {
      this.defRPr = readRPr(kid(kid(dd, 'w:rPrDefault'), 'w:rPr'));
      this.defPPr = readPPr(kid(kid(dd, 'w:pPrDefault'), 'w:pPr'));
    }
    for (const st of kids(xml, 'w:style')) {
      const id = st.attrs['w:styleId'];
      const s = {
        id, type: st.attrs['w:type'], name: kid(st, 'w:name')?.attrs['w:val'] ?? `#${id}`,
        basedOn: kid(st, 'w:basedOn')?.attrs['w:val'],
        pPr: readPPr(kid(st, 'w:pPr')), rPr: readRPr(kid(st, 'w:rPr')),
      };
      this.byId.set(id, s);
      if (st.attrs['w:default'] === '1' && s.type === 'paragraph') this.defaultPara = id;
      if (st.attrs['w:default'] === '1' && s.type === 'character') this.defaultChar = id;
    }
  }
  chain(id) {
    const out = [];
    const seen = new Set();
    let cur = id;
    while (cur && this.byId.has(cur) && !seen.has(cur) && out.length < 40) {
      seen.add(cur);
      const s = this.byId.get(cur);
      out.unshift(s);
      cur = s.basedOn;
    }
    return out;
  }
  name(id) { return this.byId.get(id)?.name ?? id; }
  paraEffective(pStyle) {
    const id = pStyle ?? this.defaultPara;
    const p = { ...this.defPPr };
    const r = { ...this.defRPr };
    for (const s of this.chain(id)) { Object.assign(p, s.pPr); Object.assign(r, s.rPr); }
    return { p, r };
  }
  charStyleRPr(id) {
    const r = {};
    for (const s of this.chain(id)) Object.assign(r, s.rPr);
    return r;
  }
}

// ───────────────────────────── numeração ─────────────────────────────

class Numbering {
  constructor(xml, styles) {
    this.abs = new Map();
    this.nums = new Map();
    this.links = new Map();
    this.styles = styles;
    if (!xml) return;
    for (const a of kids(xml, 'w:abstractNum')) {
      const lvls = new Map();
      for (const l of kids(a, 'w:lvl')) lvls.set(Number(l.attrs['w:ilvl']), this.lvl(l));
      this.abs.set(a.attrs['w:abstractNumId'], lvls);
      const link = kid(a, 'w:numStyleLink')?.attrs['w:val'];
      if (link) this.links.set(a.attrs['w:abstractNumId'], link);
    }
    for (const n of kids(xml, 'w:num')) {
      const absId = kid(n, 'w:abstractNumId')?.attrs['w:val'];
      const ov = new Map();
      for (const o of kids(n, 'w:lvlOverride')) {
        const l = kid(o, 'w:lvl');
        const so = kid(o, 'w:startOverride');
        ov.set(Number(o.attrs['w:ilvl']), { lvl: l ? this.lvl(l) : undefined, start: so ? Number(so.attrs['w:val']) : undefined });
      }
      this.nums.set(n.attrs['w:numId'], { absId, ov });
    }
  }
  lvl(l) {
    return {
      fmt: kid(l, 'w:numFmt')?.attrs['w:val'] ?? 'decimal',
      text: kid(l, 'w:lvlText')?.attrs['w:val'] ?? '',
      start: Number(kid(l, 'w:start')?.attrs['w:val'] ?? 0),
      pPr: readPPr(kid(l, 'w:pPr')),
    };
  }
  resolve(numId, ilvl, depth = 0) {
    if (!numId || numId === '0') return undefined;
    const n = this.nums.get(numId);
    if (!n) return undefined;
    // w:numStyleLink → estilo de numeração → numId do estilo
    const link = this.links.get(n.absId);
    if (link && depth < 4) {
      const st = this.styles?.byId.get(link);
      if (st?.pPr.numId) return this.resolve(st.pPr.numId, ilvl, depth + 1);
    }
    const o = n.ov.get(ilvl);
    const base = this.abs.get(n.absId)?.get(ilvl);
    const lvl = o?.lvl ?? base;
    if (!lvl) return undefined;
    return { ...lvl, start: o?.start ?? lvl.start };
  }
}

// ───────────────────────────── extração ─────────────────────────────

/** Posição de âncora normalizada: "relH:pos/relV:pos" (pos em pt inteiros ou alinhamento). */
function vmlAnchorPos(style) {
  const m = {};
  for (const part of (style ?? '').split(';')) {
    const [k, v] = part.split(':').map((s) => s && s.trim());
    if (k && v) m[k] = v;
  }
  if (m.position !== 'absolute') return undefined;
  const rel = (v, def) => ({ text: 'text', margin: 'margin', page: 'page', char: 'char', line: 'line' })[v] ?? def;
  const pt = (v) => {
    const n = parseFloat(v ?? '0');
    const u = (v ?? '').replace(/^[-\d.]+/, '');
    return Math.round(u === 'in' ? n * 72 : u === 'cm' ? (n * 72) / 2.54 : u === 'mm' ? (n * 72) / 25.4 : u === 'px' ? n * 0.75 : n);
  };
  const h = m['mso-position-horizontal'] && m['mso-position-horizontal'] !== 'absolute' ? m['mso-position-horizontal'] : pt(m['margin-left']);
  const v = m['mso-position-vertical'] && m['mso-position-vertical'] !== 'absolute' ? m['mso-position-vertical'] : pt(m['margin-top']);
  return `${rel(m['mso-position-horizontal-relative'], 'text')}:${h}/${rel(m['mso-position-vertical-relative'], 'text')}:${v}`;
}

function dmlAnchorPos(anchor) {
  const side = (el) => {
    const rf = el?.attrs.relativeFrom ?? '';
    const rel = { column: 'text', paragraph: 'text', character: 'char' }[rf] ?? rf;
    const al = kid(el, 'wp:align');
    const off = kid(el, 'wp:posOffset');
    return `${rel}:${al ? textOf(al) : Math.round(Number(off ? textOf(off) : 0) / 12700)}`;
  };
  return `${side(kid(anchor, 'wp:positionH'))}/${side(kid(anchor, 'wp:positionV'))}`;
}

function vmlExtent(style) {
  const m = {};
  for (const part of (style ?? '').split(';')) {
    const [k, v] = part.split(':').map((s) => s && s.trim());
    if (!k || !v) continue;
    const num = parseFloat(v);
    const unit = v.replace(/^[-\d.]+/, '');
    const pt = unit === 'in' ? num * 72 : unit === 'cm' ? (num * 72) / 2.54 : unit === 'mm' ? (num * 72) / 25.4 : unit === 'px' ? num * 0.75 : unit === 'emu' ? num / EMU_PER_PT : num;
    m[k] = pt;
  }
  return { cx: Math.round((m.width ?? 0) * EMU_PER_PT), cy: Math.round((m.height ?? 0) * EMU_PER_PT) };
}

/** Modelo normalizado de uma parte de conteúdo (document/header/footer/notas). */
function extractBlocks(root, ctx) {
  const paras = [];
  const tables = [];
  const images = [];
  let textboxes = 0;
  const txbxTexts = [];
  const fields = [];
  const formFields = [];

  function runText(r, out, rPr) {
    for (const c of kids(r)) {
      switch (c.name) {
        case 'w:t': out.push([textOf(c), rPr]); break;
        case 'w:tab': out.push(['\t', rPr]); break;
        case 'w:br': out.push([c.attrs['w:type'] === 'page' ? '\f' : c.attrs['w:type'] === 'column' ? '\v' : '\n', rPr]); break;
        case 'w:cr': out.push(['\n', rPr]); break;
        case 'w:noBreakHyphen': out.push(['‑', rPr]); break;
        case 'w:sym': out.push(['', rPr]); break;
        case 'w:footnoteReference': case 'w:endnoteReference': out.push(['¹', rPr]); break;
        case 'w:drawing': case 'w:pict': case 'w:object': drawing(c, out, rPr); break;
      }
    }
  }

  function drawing(d, out, rPr) {
    // imagem(ns) e caixas de texto
    const walk = (e, inGroup) => {
      for (const c of kids(e)) {
        if (c.name === 'w:txbxContent') { textboxes++; txbxTexts.push(extractBlocks(c, ctx).paras.map((p) => p.text).join('¶')); continue; }
        if (c.name === 'wp:inline' || c.name === 'wp:anchor') {
          const ext = kid(c, 'wp:extent');
          const isPic = JSON.stringify(c).includes('"pic:pic"');
          if (isPic) images.push({ cx: Number(ext?.attrs.cx ?? 0), cy: Number(ext?.attrs.cy ?? 0), anchor: c.name === 'wp:anchor', inGroup: JSON.stringify(c).includes('"wpg:wgp"'), pos: c.name === 'wp:anchor' ? dmlAnchorPos(c) : undefined });
        }
        if (c.name === 'v:shape' || c.name === 'v:rect' || c.name === 'v:roundrect') {
          const hasImg = kids(c, 'v:imagedata').length > 0;
          if (hasImg) images.push({ ...vmlExtent(c.attrs.style), anchor: (c.attrs.style ?? '').includes('position:absolute'), inGroup, pos: inGroup ? undefined : vmlAnchorPos(c.attrs.style) });
        }
        walk(c, inGroup || c.name === 'v:group');
      }
    };
    walk(d, false);
    // w:pict só com v:shapetype (o Word grava assim a forma-mestre do WordArt): nada é desenhado
    if (d.name === 'w:pict' && kids(d).every((c) => c.name === 'v:shapetype')) return;
    out.push(['￼', rPr]);
  }

  function paragraph(p, where) {
    const pPrEl = kid(p, 'w:pPr');
    const direct = readPPr(pPrEl);
    const pStyle = kid(pPrEl, 'w:pStyle')?.attrs['w:val'];
    const eff = ctx.styles.paraEffective(pStyle);
    const pp = { ...eff.p };
    // numeração (direta ou do estilo) e recuo do nível
    const numId = direct.numId ?? eff.p.numId;
    const ilvl = direct.ilvl ?? eff.p.ilvl ?? 0;
    const num = ctx.numbering.resolve(numId, ilvl);
    if (num) Object.assign(pp, num.pPr);
    Object.assign(pp, direct);
    const tabs = (direct.tabs ?? []).map((t) => `${t.val}@${t.pos}${t.leader && t.leader !== 'none' ? ':' + t.leader : ''}`).sort().join(',');
    delete pp.numId; delete pp.ilvl; delete pp.tabs;
    const chars = [];
    const fstack = [];
    const visit = (e, rPrBase) => {
      for (const c of kids(e)) {
        if (c.name === 'w:r') {
          const rPrEl = kid(c, 'w:rPr');
          const dr = readRPr(rPrEl);
          const rs = dr.rStyle;
          const eff2 = { ...eff.r, ...(rs ? ctx.styles.charStyleRPr(rs) : {}), ...dr };
          delete eff2.rStyle;
          runText(c, chars, eff2);
          const fc = kid(c, 'w:fldChar');
          const ft = fc?.attrs['w:fldCharType'];
          if (ft === 'begin') {
            fstack.push({ instr: '', done: false });
            const ffd = kid(fc, 'w:ffData');
            if (ffd) formFields.push(kids(ffd).filter((e) => e.name !== 'w:name').map((e) => e.name.slice(2) + (e.attrs['w:val'] !== undefined ? '=' + e.attrs['w:val'] : '') + (kids(e).length ? '(' + kids(e).map((k) => k.name.slice(2) + (k.attrs['w:val'] !== undefined ? '=' + k.attrs['w:val'] : '')).join(',') + ')' : '')).join(';'));
          }
          const top = fstack[fstack.length - 1];
          if (top && !top.done) for (const it of kids(c, 'w:instrText')) top.instr += textOf(it);
          if ((ft === 'separate' || ft === 'end') && top && !top.done) {
            top.done = true;
            const code = top.instr.trim().split(/\s+/)[0]?.toUpperCase();
            // EMBED/SHAPE: o Word grava objetos OLE/telas como w:object/w:pict (sem campo)
            if (code && code !== 'EMBED' && code !== 'SHAPE') fields.push(code);
          }
          if (ft === 'end') fstack.pop();
        } else if (c.name === 'w:hyperlink' && ctx.countHyperlinks) {
          fields.push('HYPERLINK');
          visit(c, rPrBase);
        } else if (['w:hyperlink', 'w:ins', 'w:smartTag', 'w:customXml', 'w:fldSimple', 'w:sdt', 'w:sdtContent', 'w:moveTo', 'w:dir', 'w:bdo'].includes(c.name)) {
          visit(c, rPrBase);
        }
      }
    };
    visit(p, eff.r);
    let text = '';
    const props = [];
    for (const [s, r] of chars) { text += s; for (let i = 0; i < s.length; i++) props.push(r); }
    paras.push({
      where, text, style: ctx.styles.name(pStyle ?? ctx.styles.defaultPara),
      num: num ? `${num.fmt}|${num.text}|${ilvl}|${num.start}` : undefined,
      tabs,
      mark: (() => { const m = { ...eff.r, ...readRPr(kid(pPrEl, 'w:rPr')) }; return `${m.sz ?? 20}|${m.font ?? ''}`; })(),
      pPr: pp, props,
    });
  }

  function table(t, where) {
    const tblPr = kid(t, 'w:tblPr');
    const tInfo = {
      where, rows: [], rowInfo: [],
      jc: kid(tblPr, 'w:jc')?.attrs['w:val'] ?? 'left',
      tblW: `${kid(tblPr, 'w:tblW')?.attrs['w:w'] ?? '0'}/${kid(tblPr, 'w:tblW')?.attrs['w:type'] ?? 'auto'}`,
      layout: kid(tblPr, 'w:tblLayout')?.attrs['w:type'] ?? 'autofit',
      floating: !!kid(tblPr, 'w:tblpPr'),
      ind: Number(kid(tblPr, 'w:tblInd')?.attrs['w:w'] ?? 0),
      grid: kids(kid(t, 'w:tblGrid'), 'w:gridCol').map((g) => Number(g.attrs['w:w'] ?? 0)),
    };
    const tblBorders = readBorders(kid(tblPr, 'w:tblBorders'));
    tables.push(tInfo);
    const trs = kids(t, 'w:tr');
    trs.forEach((tr, ri) => {
      const cells = kids(tr, 'w:tc');
      tInfo.rows.push(cells.length);
      const trPr = kid(tr, 'w:trPr');
      const exBorders = readBorders(kid(kid(tr, 'w:tblPrEx'), 'w:tblBorders'));
      const rowBorders = { ...tblBorders, ...exBorders };
      const h = kid(trPr, 'w:trHeight');
      const before = Number(kid(trPr, 'w:gridBefore')?.attrs['w:val'] ?? 0);
      tInfo.rowInfo.push({
        height: h ? `${h.attrs['w:val']}/${h.attrs['w:hRule'] ?? 'atLeast'}` : '',
        header: !!kid(trPr, 'w:tblHeader'), cantSplit: !!kid(trPr, 'w:cantSplit'), hidden: !!kid(trPr, 'w:hidden'), before,
        cells: cells.map((tc, ci) => {
          const tcPr = kid(tc, 'w:tcPr');
          const vm = kid(tcPr, 'w:vMerge');
          const tcB = readBorders(kid(tcPr, 'w:tcBorders'));
          const isFirst = ci === 0, isLast = ci === cells.length - 1, isTop = ri === 0, isBottom = ri === trs.length - 1;
          const eff = (side, inner, outer, edge) => tcB[side] ?? (edge ? rowBorders[outer] : rowBorders[inner]) ?? 'none';
          return {
            span: Number(kid(tcPr, 'w:gridSpan')?.attrs['w:val'] ?? 1),
            vMerge: vm ? (vm.attrs['w:val'] === 'restart' ? 'restart' : 'continue') : '',
            w: Number(kid(tcPr, 'w:tcW')?.attrs['w:w'] ?? 0),
            fill: (kid(tcPr, 'w:shd')?.attrs['w:fill'] ?? 'auto').toUpperCase(),
            vAlign: kid(tcPr, 'w:vAlign')?.attrs['w:val'] ?? 'top',
            hideMark: !!kid(tcPr, 'w:hideMark'),
            noWrap: !!kid(tcPr, 'w:noWrap'),
            bTop: eff('top', 'insideH', 'top', isTop), bBottom: eff('bottom', 'insideH', 'bottom', isBottom),
            bLeft: eff('left', 'insideV', 'left', isFirst), bRight: eff('right', 'insideV', 'right', isLast),
          };
        }),
      });
      cells.forEach((tc, ci) => blocks(tc, `${where}/t${tables.length - 1}r${ri}c${ci}`));
    });
  }

  function readBorders(el) {
    const o = {};
    if (!el) return o;
    for (const c of kids(el)) {
      const side = c.name.slice(2);
      const v = c.attrs['w:val'];
      o[side] = ['nil', 'none'].includes(v) ? 'none' : `${v}/${c.attrs['w:sz'] ?? ''}`;
    }
    return o;
  }

  function blocks(e, where) {
    for (const c of kids(e)) {
      if (c.name === 'w:p') paragraph(c, where);
      else if (c.name === 'w:tbl') table(c, where);
      else if (c.name === 'w:sdt') blocks(kid(c, 'w:sdtContent') ?? c, where);
      else if (c.name === 'w:customXml' || c.name === 'w:ins') blocks(c, where);
    }
  }
  blocks(root, '');
  return { paras, tables, images, textboxes, txbxTexts, fields, formFields };
}

function sectionsOf(body, rels) {
  const out = [];
  const sect = (s) => {
    const pg = kid(s, 'w:pgSz')?.attrs ?? {};
    const mar = kid(s, 'w:pgMar')?.attrs ?? {};
    const cols = kid(s, 'w:cols')?.attrs ?? {};
    const refs = {};
    for (const r of [...kids(s, 'w:headerReference'), ...kids(s, 'w:footerReference')]) {
      const kind = r.name === 'w:headerReference' ? 'h' : 'f';
      refs[`${kind}:${r.attrs['w:type']}`] = rels.get(r.attrs['r:id']);
    }
    out.push({
      w: Number(pg['w:w'] ?? 0), h: Number(pg['w:h'] ?? 0), orient: pg['w:orient'] ?? 'portrait',
      top: Number(mar['w:top'] ?? 0), bottom: Number(mar['w:bottom'] ?? 0), left: Number(mar['w:left'] ?? 0), right: Number(mar['w:right'] ?? 0),
      header: Number(mar['w:header'] ?? 0), footer: Number(mar['w:footer'] ?? 0), gutter: Number(mar['w:gutter'] ?? 0),
      cols: Number(cols['w:num'] ?? 1), colSpace: Number(cols['w:space'] ?? 0),
      titlePg: !!kid(s, 'w:titlePg') && onOffVal(kid(s, 'w:titlePg')),
      type: kid(s, 'w:type')?.attrs['w:val'] ?? 'nextPage',
      pgNumStart: kid(s, 'w:pgNumType')?.attrs['w:start'],
      pgNumFmt: kid(s, 'w:pgNumType')?.attrs['w:fmt'] ?? 'decimal',
      gridType: kid(s, 'w:docGrid')?.attrs['w:type'] ?? 'default',
      linePitch: kid(s, 'w:docGrid')?.attrs['w:linePitch'],
      vAlign: kid(s, 'w:vAlign')?.attrs['w:val'] ?? 'top',
      lnNum: kid(s, 'w:lnNumType')?.attrs['w:countBy'],
      pgBorders: kid(s, 'w:pgBorders') ? kids(kid(s, 'w:pgBorders')).map((b) => `${b.name}:${b.attrs['w:val']}/${b.attrs['w:sz']}`).join(',') : '',
      colSep: !!kid(s, 'w:cols')?.attrs['w:sep'] && kid(s, 'w:cols').attrs['w:sep'] !== '0',
      refs,
    });
  };
  const walk = (e) => {
    for (const c of kids(e)) {
      if (c.name === 'w:p') { const s = kid(kid(c, 'w:pPr'), 'w:sectPr'); if (s) sect(s); }
      else if (c.name === 'w:sectPr') sect(c);
    }
  };
  walk(body);
  return out;
}

/** Lê um .docx (bytes) → modelo normalizado. */
export function extractDocx(bytes, parseXml) {
  const z = unzipSync(bytes);
  const xml = (p) => (z[p] ? parseXml(strFromU8(z[p])) : undefined);
  const rels = new Map();
  const relXml = xml('word/_rels/document.xml.rels');
  for (const r of kids(relXml, 'Relationship')) rels.set(r.attrs.Id, r.attrs.Target);
  const styles = new Styles(xml('word/styles.xml'));
  const numbering = new Numbering(xml('word/numbering.xml'), styles);
  const ctx = { styles, numbering, countHyperlinks: true };
  const doc = xml('word/document.xml');
  const body = kid(doc, 'w:body');
  const main = extractBlocks(body, ctx);
  const sections = sectionsOf(body, rels);
  const parts = {};
  for (const target of new Set(rels.values())) {
    if (/^(header|footer)\d+\.xml$/.test(target)) {
      const root = xml(`word/${target}`);
      if (root) parts[target] = extractBlocks(root, ctx);
    }
  }
  const notes = (p, tag) => {
    const root = xml(p);
    if (!root) return [];
    return kids(root, tag).filter((n) => !n.attrs['w:type'] || n.attrs['w:type'] === 'normal').map((n) => extractBlocks(n, ctx).paras.map((pp) => pp.text).join('\n'));
  };
  const settings = xml('word/settings.xml');
  const compat = kid(settings, 'w:compat');
  return {
    main, sections, parts, styles,
    footnotes: notes('word/footnotes.xml', 'w:footnote'),
    endnotes: notes('word/endnotes.xml', 'w:endnote'),
    defaultTab: kid(settings, 'w:defaultTabStop')?.attrs['w:val'],
    evenAndOdd: !!kid(settings, 'w:evenAndOddHeaders'),
    protection: (() => { const p = kid(settings, 'w:documentProtection'); return p ? `${p.attrs['w:edit'] ?? ''}|${p.attrs['w:enforcement'] ?? ''}|${p.attrs['w:formatting'] ?? ''}` : ''; })(),
    // demais configurações que afetam layout/exibição (valor ou presença)
    other: ['characterSpacingControl', 'noPunctuationKerning', 'bordersDoNotSurroundHeader', 'bordersDoNotSurroundFooter', 'alignBordersAndEdges', 'mirrorMargins', 'gutterAtTop', 'doNotShadeFormData', 'autoHyphenation', 'hyphenationZone', 'consecutiveHyphenLimit', 'doNotHyphenateCaps', 'drawingGridHorizontalSpacing', 'drawingGridVerticalSpacing', 'doNotUseMarginsForDrawingGridOrigin', 'printTwoOnOne', 'strictFirstAndLastChars', 'noLineBreaksAfter', 'noLineBreaksBefore']
      .map((k) => { const n = kid(settings, `w:${k}`); return n ? `${k}=${n.attrs['w:val'] ?? 'on'}` : ''; }).filter(Boolean),
    compat: compat ? kids(compat).map((c) => (c.name === 'w:compatSetting' ? `${c.attrs['w:name']}=${c.attrs['w:val']}` : c.name.slice(2))).sort() : [],
  };
}

// ───────────────────────────── comparação ─────────────────────────────

const norm = (s) => s.replace(/ /g, ' ');

/** Alinha duas listas de parágrafos pelo texto (casamento guloso com janela). */
function align(a, b) {
  const pairs = [];
  let i = 0, j = 0;
  const W = 60;
  while (i < a.length && j < b.length) {
    if (norm(a[i].text) === norm(b[j].text)) { pairs.push([i, j]); i++; j++; continue; }
    let found = false;
    for (let d = 1; d <= W && !found; d++) {
      if (j + d < b.length && norm(a[i].text) === norm(b[j + d].text) && a[i].text.trim()) { j += d; found = true; }
      else if (i + d < a.length && norm(a[i + d].text) === norm(b[j].text) && b[j].text.trim()) { i += d; found = true; }
    }
    if (!found) { pairs.push([i, j]); i++; j++; }
  }
  return pairs;
}

const PROP_KEYS_P = ['frame', 'jc', 'indLeft', 'indRight', 'indFirst', 'spBefore', 'spAfter', 'spBeforeAuto', 'spAfterAuto', 'spLine', 'spLineRule', 'keepNext', 'keepLines', 'pageBreakBefore', 'widowControl', 'contextualSpacing', 'outlineLvl', 'shd', 'bdr_top', 'bdr_bottom', 'bdr_left', 'bdr_right'];
const PROP_KEYS_R = ['b', 'i', 'u', 'sz', 'font', 'fontEA', 'fontCs', 'color', 'vertAlign', 'caps', 'smallCaps', 'strike', 'vanish', 'highlight', 'spacing', 'position'];

function defaultsP(k, v) {
  if (v !== undefined) return v;
  return { jc: 'left', indLeft: 0, indRight: 0, indFirst: 0, spBefore: 0, spAfter: 0, spBeforeAuto: false, spAfterAuto: false, spLine: 240, spLineRule: 'auto', keepNext: false, keepLines: false, pageBreakBefore: false, widowControl: true, contextualSpacing: false, outlineLvl: 9, shd: 'AUTO' }[k];
}
function defaultsR(k, v) {
  if (v !== undefined) return v === 'auto' && k === 'color' ? 'AUTO' : v;
  return { b: false, i: false, u: 'none', sz: 20, color: 'AUTO', caps: false, smallCaps: false, strike: false, vanish: false, highlight: 'none', spacing: 0, position: 0 }[k];
}

function samePos(a, b) {
  if (!a || !b) return a === b;
  const pa = a.split(/[/:]/), pb = b.split(/[/:]/);
  return pa.every((x, i) => x === pb[i] || (/^-?\d+$/.test(x) && /^-?\d+$/.test(pb[i]) && Math.abs(Number(x) - Number(pb[i])) <= 1));
}

/** Compara o nosso (a) com o do Word (b). */
export function compareDocx(ours, word) {
  const cats = {};
  const details = [];
  const add = (cat, n = 1, detail) => {
    cats[cat] = (cats[cat] ?? 0) + n;
    if (detail && details.length < 400) details.push(`${cat}: ${detail}`);
  };
  const A = ours.main.paras, B = word.main.paras;
  if (A.length !== B.length) add('paragrafos.contagem', Math.abs(A.length - B.length), `${A.length} × ${B.length}`);
  const pairs = align(A, B);
  for (const [i, j] of pairs) {
    const a = A[i], b = B[j];
    if (norm(a.text) !== norm(b.text)) { add('paragrafos.texto', 1, `#${j} ${JSON.stringify(a.text.slice(0, 80))} × ${JSON.stringify(b.text.slice(0, 80))}`); continue; }
    if (a.style !== b.style) add('estilos', 1, `#${j} ${a.style} × ${b.style}`);
    if (a.mark !== b.mark) add('pPr.marca', 1, `#${j} ${a.mark} × ${b.mark} ${JSON.stringify(b.text.slice(0, 30))}`);
    if (a.tabs !== b.tabs) add('pPr.tabs', 1, `#${j} ${a.tabs} × ${b.tabs} ${JSON.stringify(b.text.slice(0, 30))}`);
    if ((a.num ?? '') !== (b.num ?? '')) add('numeracao', 1, `#${j} ${a.num} × ${b.num} ${JSON.stringify(b.text.slice(0, 40))}`);
    for (const k of PROP_KEYS_P) {
      const va = defaultsP(k, a.pPr[k]), vb = defaultsP(k, b.pPr[k]);
      if (JSON.stringify(va) !== JSON.stringify(vb)) add(`pPr.${k}`, 1, `#${j} ${JSON.stringify(va)} × ${JSON.stringify(vb)} ${JSON.stringify(b.text.slice(0, 30))}`);
    }
    // propriedades de caractere, por caractere visível
    const bad = {};
    for (let c = 0; c < Math.min(a.props.length, b.props.length); c++) {
      if (/\s/.test(b.text[c] ?? '')) continue;
      for (const k of PROP_KEYS_R) {
        const va = defaultsR(k, a.props[c]?.[k]), vb = defaultsR(k, b.props[c]?.[k]);
        if (JSON.stringify(va) !== JSON.stringify(vb)) bad[k] = bad[k] ?? `${JSON.stringify(va)} × ${JSON.stringify(vb)}`;
      }
    }
    for (const [k, d] of Object.entries(bad)) add(`rPr.${k}`, 1, `#${j} ${d} ${JSON.stringify(b.text.slice(0, 30))}`);
  }
  // tabelas
  const TA = ours.main.tables, TB = word.main.tables;
  if (TA.length !== TB.length) add('tabelas.contagem', Math.abs(TA.length - TB.length), `${TA.length} × ${TB.length}`);
  for (let t = 0; t < Math.min(TA.length, TB.length); t++) {
    if (TA[t].rows.length !== TB[t].rows.length) add('tabelas.linhas', 1, `t${t} ${TA[t].rows.length} × ${TB[t].rows.length}`);
    else if (TA[t].rows.join(',') !== TB[t].rows.join(',')) add('tabelas.celulas', 1, `t${t} ${TA[t].rows.join(',')} × ${TB[t].rows.join(',')}`);
  }
  // seções
  const SA = ours.sections, SB = word.sections;
  if (SA.length !== SB.length) add('secoes.contagem', Math.abs(SA.length - SB.length), `${SA.length} × ${SB.length}`);
  for (let s = 0; s < Math.min(SA.length, SB.length); s++) {
    for (const k of ['w', 'h', 'orient', 'top', 'bottom', 'left', 'right', 'header', 'footer', 'gutter', 'cols', 'colSpace', 'colSep', 'titlePg', 'type', 'pgNumStart', 'pgNumFmt', 'gridType', 'linePitch', 'vAlign', 'lnNum', 'pgBorders']) {
      if (JSON.stringify(SA[s][k]) !== JSON.stringify(SB[s][k])) add(`secoes.${k}`, 1, `s${s} ${SA[s][k]} × ${SB[s][k]}`);
    }
    // cabeçalhos/rodapés: tipos referenciados e texto
    const ka = Object.keys(SA[s].refs).sort().join(','), kb = Object.keys(SB[s].refs).sort().join(',');
    if (ka !== kb) add('cabecalhos.refs', 1, `s${s} ${ka} × ${kb}`);
    for (const k of Object.keys(SB[s].refs)) {
      const pa = ours.parts[SA[s].refs[k]], pb = word.parts[SB[s].refs[k]];
      if (!pa || !pb) continue;
      const ta = pa.paras.map((p) => norm(p.text)).join('¶'), tb = pb.paras.map((p) => norm(p.text)).join('¶');
      if (ta !== tb) add('cabecalhos.texto', 1, `s${s} ${k} ${JSON.stringify(ta.slice(0, 80))} × ${JSON.stringify(tb.slice(0, 80))}`);
      if (pa.images.length !== pb.images.length) add('cabecalhos.imagens', 1, `s${s} ${k} ${pa.images.length} × ${pb.images.length}`);
      else pa.images.forEach((ia, n) => {
        const ib = pb.images[n];
        if ((ia.pos || ib.pos) && !samePos(ia.pos, ib.pos)) add('cabecalhos.imagens.posicao', 1, `s${s} ${k} img${n} ${ia.pos} × ${ib.pos}`);
      });
    }
  }
  // imagens (corpo)
  const IA = ours.main.images, IB = word.main.images;
  if (IA.length !== IB.length) add('imagens.contagem', Math.abs(IA.length - IB.length), `${IA.length} × ${IB.length}`);
  else {
    for (let k = 0; k < IA.length; k++) {
      const a = IA[k], b = IB[k];
      const tol = (x, y) => Math.abs(x - y) <= Math.max(12700, 0.02 * Math.max(x, y));
      if (a.inGroup || b.inGroup) continue; // coordenadas do grupo, não EMU
      if (!tol(a.cx, b.cx) || !tol(a.cy, b.cy)) add('imagens.tamanho', 1, `img${k} ${a.cx}x${a.cy} × ${b.cx}x${b.cy}`);
      if ((a.pos || b.pos) && !samePos(a.pos, b.pos)) add('imagens.posicao', 1, `img${k} ${a.pos} × ${b.pos}`);
    }
  }
  for (let t = 0; t < Math.min(TA.length, TB.length); t++) {
    const a = TA[t], b = TB[t];
    if (a.rows.join(',') !== b.rows.join(',')) continue;
    if (a.jc !== b.jc) add('tabelas.jc', 1, `t${t} ${a.jc} × ${b.jc}`);
    for (const k of ['tblW', 'layout', 'floating']) if (a[k] !== b[k]) add(`tabelas.${k}`, 1, `t${t} ${a[k]} × ${b[k]}`);
    if (Math.abs(a.ind - b.ind) > 1 && a.jc === 'left') add('tabelas.recuo', 1, `t${t} ${a.ind} × ${b.ind}`);
    if (a.grid.join(',') !== b.grid.join(',')) add('tabelas.grade', 1, `t${t} ${a.grid.join(',')} × ${b.grid.join(',')}`);
    a.rowInfo.forEach((ra, r) => {
      const rb = b.rowInfo[r];
      for (const k of ['height', 'header', 'cantSplit', 'hidden', 'before']) if (ra[k] !== rb[k]) add(`tabelas.linha.${k}`, 1, `t${t}r${r} ${ra[k]} × ${rb[k]}`);
      ra.cells.forEach((ca, c) => {
        const cb = rb.cells[c];
        for (const k of ['span', 'vMerge', 'fill', 'vAlign', 'hideMark', 'noWrap', 'bTop', 'bBottom', 'bLeft', 'bRight']) {
          if (ca[k] !== cb[k]) add(`tabelas.celula.${k}`, 1, `t${t}r${r}c${c} ${ca[k]} × ${cb[k]}`);
        }
        if (Math.abs(ca.w - cb.w) > 2) add('tabelas.celula.largura', 1, `t${t}r${r}c${c} ${ca.w} × ${cb.w}`);
      });
    });
  }
  const xa = ours.main.txbxTexts.map(norm).join('|'), xb = word.main.txbxTexts.map(norm).join('|');
  if (ours.main.textboxes === word.main.textboxes && xa !== xb) add('caixasTexto.texto', 1, `${JSON.stringify(xa.slice(0, 80))} × ${JSON.stringify(xb.slice(0, 80))}`);
  const fa = [...ours.main.fields].sort().join(','), fb = [...word.main.fields].sort().join(',');
  const ffa = ours.main.formFields.join('|'), ffb = word.main.formFields.join('|');
  if (ffa !== ffb) add('campos.formulario', 1, `${ffa.slice(0, 160)} × ${ffb.slice(0, 160)}`);
  if (fa !== fb) add('campos', 1, `${fa.slice(0, 160)} × ${fb.slice(0, 160)}`);
  if (ours.main.textboxes !== word.main.textboxes) add('caixasTexto.contagem', Math.abs(ours.main.textboxes - word.main.textboxes), `${ours.main.textboxes} × ${word.main.textboxes}`);
  // notas
  if (ours.footnotes.length !== word.footnotes.length) add('notas.contagem', 1, `${ours.footnotes.length} × ${word.footnotes.length}`);
  else ours.footnotes.forEach((t, k) => { if (norm(t) !== norm(word.footnotes[k])) add('notas.texto', 1, `fn${k} ${JSON.stringify(t.slice(0, 60))} × ${JSON.stringify(word.footnotes[k].slice(0, 60))}`); });
  if (ours.endnotes.length !== word.endnotes.length) add('notas.contagem', 1, `edn ${ours.endnotes.length} × ${word.endnotes.length}`);
  // estilos definidos: mesmos nomes e mesmas propriedades efetivas
  const sa = ours.styles, sb = word.styles;
  const byName = (st) => new Map([...st.byId.values()].map((s) => [s.name, s]));
  const na = byName(sa), nb = byName(sb);
  for (const [name, s] of nb) {
    const o = na.get(name);
    // estilos de caractere vinculados ("X Char"): o Word renomeia pelo nome localizado
    // do estilo de parágrafo ("Header Char" → "Cabeçalho Char") — não é divergência
    if (!o) { if (!name.endsWith(' Char')) add('estilos.ausentes', 1, name); continue; }
    if (o.type !== s.type) { add('estilos.tipo', 1, `${name} ${o.type} × ${s.type}`); continue; }
    const baseA = o.basedOn ? sa.name(o.basedOn) : '', baseB = s.basedOn ? sb.name(s.basedOn) : '';
    if (baseA !== baseB) add('estilos.basedOn', 1, `${name} ${baseA} × ${baseB}`);
    if (s.type === 'paragraph' || s.type === 'table') {
      const ea = sa.paraEffective(o.id), eb = sb.paraEffective(s.id);
      for (const k of PROP_KEYS_P) {
        const va = defaultsP(k, ea.p[k]), vb = defaultsP(k, eb.p[k]);
        if (JSON.stringify(va) !== JSON.stringify(vb)) add(`estilos.pPr.${k}`, 1, `${name} ${JSON.stringify(va)} × ${JSON.stringify(vb)}`);
      }
      for (const k of PROP_KEYS_R) {
        const va = defaultsR(k, ea.r[k]), vb = defaultsR(k, eb.r[k]);
        if (JSON.stringify(va) !== JSON.stringify(vb)) add(`estilos.rPr.${k}`, 1, `${name} ${JSON.stringify(va)} × ${JSON.stringify(vb)}`);
      }
    } else if (s.type === 'character') {
      const ra = sa.charStyleRPr(o.id), rb = sb.charStyleRPr(s.id);
      for (const k of PROP_KEYS_R) {
        if (ra[k] === undefined && rb[k] === undefined) continue;
        if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) add(`estilos.rPr.${k}`, 1, `${name} ${JSON.stringify(ra[k])} × ${JSON.stringify(rb[k])}`);
      }
    }
  }
  for (const name of na.keys()) if (!nb.has(name) && !name.endsWith(' Char')) add('estilos.extras', 1, name);
  // configurações
  if (ours.defaultTab !== word.defaultTab) add('config.defaultTabStop', 1, `${ours.defaultTab} × ${word.defaultTab}`);
  if (ours.evenAndOdd !== word.evenAndOdd) add('config.evenAndOddHeaders', 1);
  if (ours.protection !== word.protection) add('config.protecao', 1, `${ours.protection} × ${word.protection}`);
  if (ours.other.join(',') !== word.other.join(',')) add('config.outras', 1, `${ours.other.join(',')} × ${word.other.join(',')}`);
  const ca = ours.compat.join(','), cb = word.compat.filter((c) => !c.startsWith('allowHyphenationAtTrackBottom') && !c.startsWith('useWord2013TrackBottomHyphenation')).join(',');
  if (ca !== cb) add('config.compat', 1, `${ca} × ${cb}`);
  return { cats, details, paras: { ours: A.length, word: B.length } };
}
