/**
 * Listas do .doc → numbering.xml: cada LSTF vira w:abstractNum (nsid = lsid,
 * tmpl = tplc) e cada LFO vira w:num (numId = índice 1-based do LFO, o mesmo
 * valor de sprmPIlfo), com w:lvlOverride para os LFOLVL.
 */
import type { Lvl } from './lists.js';
import { applyChp, applyPap, type Chp, type ChpKey, type Pap, type PapKey } from './props.js';
import { numFmtOf, pPrInner, rPrInner, type PropCtx } from './ooxml-props.js';
import type { DocReader } from './reader.js';
import { prls } from './sprm.js';
import { el, XML_DECL, NS } from './xmlw.js';

const hex8 = (v: number): string => (v >>> 0).toString(16).toUpperCase().padStart(8, '0');

/** xst do LVL → w:lvlText ("%1." etc.). */
export function lvlText(lvl: Lvl): string {
  const marks = new Set(lvl.rgbxchNums);
  let s = '';
  for (let i = 0; i < lvl.xst.length; i++) {
    const c = lvl.xst.charCodeAt(i);
    if (marks.has(i + 1) && c <= 8) s += `%${c + 1}`;
    else s += lvl.xst[i];
  }
  return s;
}

function lvlXml(lvl: Lvl, ilvl: number, ctx: PropCtx, pStyle: string | undefined, tplc?: number): string {
  let x = '';
  x += el('w:start', { 'w:val': lvl.start });
  x += el('w:numFmt', { 'w:val': numFmtOf(lvl.nfc) });
  if (lvl.noRestart) x += el('w:lvlRestart', { 'w:val': lvl.ilvlRestartLim });
  if (pStyle) x += el('w:pStyle', { 'w:val': pStyle });
  if (lvl.legal) x += '<w:isLgl/>';
  if (lvl.follow === 1) x += el('w:suff', { 'w:val': 'space' });
  else if (lvl.follow === 2) x += el('w:suff', { 'w:val': 'nothing' });
  x += el('w:lvlText', { 'w:val': lvlText(lvl) });
  x += el('w:lvlJc', { 'w:val': ['left', 'center', 'right'][lvl.jc] ?? 'left' });
  const pap: Pap = { istd: 0 };
  const pt = new Set<PapKey>();
  for (const p of prls(lvl.grpprlPapx)) applyPap(pap, p, pt);
  const ppr = pPrInner(pap, pt, ctx, { withStyle: false, baseTabs: [] });
  if (ppr) x += `<w:pPr>${ppr}</w:pPr>`;
  const chp: Chp = {};
  const ct = new Set<ChpKey>();
  for (const p of prls(lvl.grpprlChpx)) applyChp(chp, p, { base: {} }, ct);
  const rpr = rPrInner(chp, ct, ctx, false);
  if (rpr) x += `<w:rPr>${rpr}</w:rPr>`;
  return el('w:lvl', { 'w:ilvl': ilvl, 'w:tplc': tplc !== undefined ? hex8(tplc) : undefined, 'w:tentative': lvl.tentative ? '1' : undefined }, x);
}

export function buildNumbering(r: DocReader, ctx: PropCtx): string | undefined {
  const { lsts, lfos } = r.lists;
  if (!lsts.length) return undefined;
  let x = '';
  const absByLsid = new Map<number, number>();
  lsts.forEach((l, i) => {
    absByLsid.set(l.lsid, i);
    let c = el('w:nsid', { 'w:val': hex8(l.lsid) });
    c += el('w:multiLevelType', { 'w:val': l.simple ? 'singleLevel' : l.hybrid ? 'hybridMultilevel' : 'multilevel' });
    c += el('w:tmpl', { 'w:val': hex8(l.tplc) });
    l.levels.forEach((lvl, k) => {
      const istd = l.rgistdPara[k];
      const pStyle = istd !== undefined && istd !== 0x0fff ? ctx.styleId(istd) : undefined;
      c += lvlXml(lvl, k, ctx, pStyle);
    });
    x += el('w:abstractNum', { 'w:abstractNumId': i }, c);
  });
  lfos.forEach((lfo, i) => {
    const abs = absByLsid.get(lfo.lsid);
    if (abs === undefined) return;
    let c = el('w:abstractNumId', { 'w:val': abs });
    for (const ov of lfo.overrides) {
      let o = '';
      if (ov.startAt !== undefined) o += el('w:startOverride', { 'w:val': ov.startAt });
      if (ov.lvl) o += lvlXml(ov.lvl, ov.ilvl, ctx, undefined);
      if (o) c += el('w:lvlOverride', { 'w:ilvl': ov.ilvl }, o);
    }
    x += el('w:num', { 'w:numId': i + 1 }, c);
  });
  return `${XML_DECL}<w:numbering xmlns:w="${NS.w}" xmlns:r="${NS.r}">${x}</w:numbering>`;
}
