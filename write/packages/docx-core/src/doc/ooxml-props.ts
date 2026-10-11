/**
 * CHP/PAP/TAP/SEP → elementos OOXML (w:rPr, w:pPr, bordas, sombreamento),
 * na ordem do schema (CT_RPr / CT_PPr / CT_TblPr / CT_TcPr / CT_SectPr).
 * Só emite o que foi tocado (conjuntos `touched`), como o Word faz ao
 * converter um .doc.
 */
import type { DocFont } from './fonts.js';
import {
  AUTO, icoColor,
  type Brc, type Chp, type ChpKey, type Pap, type PapKey, type Shd, type TabStop,
} from './props.js';
import { el } from './xmlw.js';

export function hex(c: number): string {
  return c === AUTO ? 'auto' : c.toString(16).toUpperCase().padStart(6, '0');
}

const BRC_TYPE: Record<number, string> = {
  0: 'none', 1: 'single', 2: 'thick', 3: 'double', 5: 'single', 6: 'dotted', 7: 'dashed', 8: 'dotDash',
  9: 'dotDotDash', 10: 'triple', 11: 'thinThickSmallGap', 12: 'thickThinSmallGap', 13: 'thinThickThinSmallGap',
  14: 'thinThickMediumGap', 15: 'thickThinMediumGap', 16: 'thinThickThinMediumGap', 17: 'thinThickLargeGap',
  18: 'thickThinLargeGap', 19: 'thinThickThinLargeGap', 20: 'wave', 21: 'doubleWave', 22: 'dashSmallGap',
  23: 'dashDotStroked', 24: 'threeDEmboss', 25: 'threeDEngrave', 26: 'outset', 27: 'inset', 0xff: 'nil',
};

/** Borda → elemento (`name` = w:top, w:left...). undefined/nenhuma → val="nil"/"none". */
export function brcXml(name: string, b: Brc | undefined): string {
  if (!b) return el(name, { 'w:val': 'nil' });
  const val = BRC_TYPE[b.type] ?? 'single';
  if (val === 'none' || val === 'nil') return el(name, { 'w:val': val === 'none' && b.width === 0 ? 'nil' : val });
  return el(name, {
    'w:val': val,
    'w:sz': b.width,
    'w:space': b.space,
    'w:color': hex(b.color),
    'w:shadow': b.shadow || undefined,
    'w:frame': b.frame || undefined,
  });
}

const SHD_PAT: Record<number, string> = {
  0: 'clear', 1: 'solid', 2: 'pct5', 3: 'pct10', 4: 'pct20', 5: 'pct25', 6: 'pct30', 7: 'pct40', 8: 'pct50',
  9: 'pct60', 10: 'pct70', 11: 'pct75', 12: 'pct80', 13: 'pct90', 14: 'horzStripe', 15: 'vertStripe',
  16: 'reverseDiagStripe', 17: 'diagStripe', 18: 'horzCross', 19: 'diagCross', 20: 'thinHorzStripe',
  21: 'thinVertStripe', 22: 'thinReverseDiagStripe', 23: 'thinDiagStripe', 24: 'thinHorzCross',
  25: 'thinDiagCross', 0x25: 'pct12', 0x26: 'pct15', 0x2b: 'pct35', 0x2c: 'pct37', 0x2e: 'pct45',
  0x31: 'pct55', 0x33: 'pct62', 0x34: 'pct65', 0x39: 'pct85', 0x3a: 'pct87', 0x3c: 'pct95', 0xffff: 'nil',
};

export function shdXml(s: Shd | undefined): string {
  if (!s) return '';
  const val = SHD_PAT[s.pat] ?? 'clear';
  if (val === 'nil') return el('w:shd', { 'w:val': 'nil' });
  return el('w:shd', { 'w:val': val, 'w:color': hex(s.fore), 'w:fill': hex(s.back) });
}

const KUL: Record<number, string> = {
  0: 'none', 1: 'single', 2: 'words', 3: 'double', 4: 'dotted', 6: 'thick', 7: 'dash', 9: 'dotDash',
  10: 'dotDotDash', 11: 'wave', 20: 'dottedHeavy', 23: 'dashedHeavy', 25: 'dashDotHeavy',
  26: 'dashDotDotHeavy', 27: 'wavyHeavy', 39: 'dashLong', 43: 'wavyDouble', 55: 'dashLongHeavy',
};

const HIGHLIGHT = ['none', 'black', 'blue', 'cyan', 'green', 'magenta', 'red', 'yellow', 'white',
  'darkBlue', 'darkCyan', 'darkGreen', 'darkMagenta', 'darkRed', 'darkYellow', 'darkGray', 'lightGray'];

/** LCID → marca de idioma BCP 47 (as usadas pelo Word). */
const LCID: Record<number, string> = {
  0x0000: 'x-none', 0x0401: 'ar-SA', 0x0402: 'bg-BG', 0x0403: 'ca-ES', 0x0404: 'zh-TW', 0x0405: 'cs-CZ',
  0x0406: 'da-DK', 0x0407: 'de-DE', 0x0408: 'el-GR', 0x0409: 'en-US', 0x040a: 'es-ES_tradnl', 0x040b: 'fi-FI',
  0x040c: 'fr-FR', 0x040d: 'he-IL', 0x040e: 'hu-HU', 0x040f: 'is-IS', 0x0410: 'it-IT', 0x0411: 'ja-JP',
  0x0412: 'ko-KR', 0x0413: 'nl-NL', 0x0414: 'nb-NO', 0x0415: 'pl-PL', 0x0416: 'pt-BR', 0x0417: 'rm-CH',
  0x0418: 'ro-RO', 0x0419: 'ru-RU', 0x041a: 'hr-HR', 0x041b: 'sk-SK', 0x041c: 'sq-AL', 0x041d: 'sv-SE',
  0x041e: 'th-TH', 0x041f: 'tr-TR', 0x0420: 'ur-PK', 0x0421: 'id-ID', 0x0422: 'uk-UA', 0x0423: 'be-BY',
  0x0424: 'sl-SI', 0x0425: 'et-EE', 0x0426: 'lv-LV', 0x0427: 'lt-LT', 0x0429: 'fa-IR', 0x042a: 'vi-VN',
  0x042d: 'eu-ES', 0x0436: 'af-ZA', 0x0439: 'hi-IN', 0x043e: 'ms-MY', 0x0456: 'gl-ES', 0x0804: 'zh-CN',
  0x0807: 'de-CH', 0x0809: 'en-GB', 0x080a: 'es-MX', 0x080c: 'fr-BE', 0x0810: 'it-CH', 0x0813: 'nl-BE',
  0x0816: 'pt-PT', 0x0c04: 'zh-HK', 0x0c07: 'de-AT', 0x0c09: 'en-AU', 0x0c0a: 'es-ES', 0x0c0c: 'fr-CA',
  0x1009: 'en-CA', 0x100c: 'fr-CH', 0x1409: 'en-NZ', 0x1809: 'en-IE', 0x1c09: 'en-ZA', 0x2009: 'en-JM',
  0x200a: 'es-VE', 0x240a: 'es-CO', 0x280a: 'es-PE', 0x2c0a: 'es-AR', 0x300a: 'es-EC', 0x340a: 'es-CL',
  0x380a: 'es-UY', 0x3c0a: 'es-PY', 0x400a: 'es-BO', 0x4009: 'en-IN', 0x540a: 'es-US', 0x0c01: 'ar-EG',
};

export function lcidTag(lid: number | undefined): string | undefined {
  if (lid === undefined) return undefined;
  return LCID[lid];
}

export interface PropCtx {
  fonts: DocFont[];
  styleId(istd: number): string | undefined;
}

function fontName(ctx: PropCtx, ftc: number | undefined): string | undefined {
  if (ftc === undefined) return undefined;
  return ctx.fonts[ftc]?.name;
}

const onOff = (name: string, v: boolean | undefined): string => (v === undefined ? '' : v ? `<${name}/>` : `<${name} w:val="0"/>`);

/**
 * Conteúdo do w:rPr (sem o elemento externo). `touched` decide o que sai;
 * `withStyle` inclui w:rStyle.
 */
export function rPrInner(chp: Chp, touched: Set<ChpKey>, ctx: PropCtx, withStyle = true): string {
  const t = (k: ChpKey): boolean => touched.has(k);
  let x = '';
  if (withStyle && chp.istd !== undefined && chp.istd !== 10 && t('istd')) {
    const id = ctx.styleId(chp.istd);
    if (id) x += el('w:rStyle', { 'w:val': id });
  }
  if (t('ftcAscii') || t('ftcOther') || t('ftcFE') || t('ftcBi') || t('idctHint')) {
    x += el('w:rFonts', {
      'w:ascii': t('ftcAscii') ? fontName(ctx, chp.ftcAscii) : undefined,
      'w:eastAsia': t('ftcFE') ? fontName(ctx, chp.ftcFE) : undefined,
      'w:hAnsi': t('ftcOther') ? fontName(ctx, chp.ftcOther) : undefined,
      'w:cs': t('ftcBi') ? fontName(ctx, chp.ftcBi) : undefined,
      'w:hint': t('idctHint') ? (chp.idctHint === 1 ? 'eastAsia' : chp.idctHint === 2 ? 'cs' : undefined) : undefined,
    });
  }
  if (t('bold')) x += onOff('w:b', chp.bold);
  if (t('boldBi')) x += onOff('w:bCs', chp.boldBi);
  if (t('italic')) x += onOff('w:i', chp.italic);
  if (t('italicBi')) x += onOff('w:iCs', chp.italicBi);
  if (t('caps')) x += onOff('w:caps', chp.caps);
  if (t('smallCaps')) x += onOff('w:smallCaps', chp.smallCaps);
  if (t('strike')) x += onOff('w:strike', chp.strike);
  if (t('dstrike')) x += onOff('w:dstrike', chp.dstrike);
  if (t('outline')) x += onOff('w:outline', chp.outline);
  if (t('shadow')) x += onOff('w:shadow', chp.shadow);
  if (t('emboss')) x += onOff('w:emboss', chp.emboss);
  if (t('imprint')) x += onOff('w:imprint', chp.imprint);
  if (t('noProof')) x += onOff('w:noProof', chp.noProof);
  if (t('vanish')) x += onOff('w:vanish', chp.vanish);
  if (t('webHidden')) x += onOff('w:webHidden', chp.webHidden);
  if (t('cv') || t('ico')) {
    const c = t('cv') && chp.cv !== undefined ? chp.cv : icoColor(chp.ico ?? 0);
    x += el('w:color', { 'w:val': hex(c) });
  }
  if (t('dxaSpace')) x += el('w:spacing', { 'w:val': chp.dxaSpace });
  if (t('charScale') && chp.charScale !== undefined) x += el('w:w', { 'w:val': chp.charScale });
  if (t('hpsKern')) x += el('w:kern', { 'w:val': chp.hpsKern });
  if (t('hpsPos')) x += el('w:position', { 'w:val': chp.hpsPos });
  if (t('hps')) x += el('w:sz', { 'w:val': chp.hps });
  if (t('hpsBi')) x += el('w:szCs', { 'w:val': chp.hpsBi });
  if (t('highlight')) x += el('w:highlight', { 'w:val': HIGHLIGHT[chp.highlight ?? 0] ?? 'none' });
  if (t('kul')) {
    const a: Record<string, string | undefined> = { 'w:val': KUL[chp.kul ?? 0] ?? 'single' };
    if (t('cvUl') && chp.cvUl !== undefined) a['w:color'] = hex(chp.cvUl);
    x += el('w:u', a);
  }
  if (t('brc')) x += brcXml('w:bdr', chp.brc);
  if (t('shd')) x += shdXml(chp.shd);
  if (t('iss')) x += el('w:vertAlign', { 'w:val': chp.iss === 1 ? 'superscript' : chp.iss === 2 ? 'subscript' : 'baseline' });
  if (t('rtl')) x += onOff('w:rtl', chp.rtl);
  if (t('cs')) x += onOff('w:cs', chp.cs);
  if (t('kcd')) x += el('w:em', { 'w:val': ['none', 'dot', 'comma', 'circle', 'underDot'][chp.kcd ?? 0] ?? 'none' });
  if (t('lid') || t('lidFE') || t('lidBi')) {
    const a = {
      'w:val': t('lid') ? lcidTag(chp.lid) : undefined,
      'w:eastAsia': t('lidFE') ? lcidTag(chp.lidFE) : undefined,
      'w:bidi': t('lidBi') ? lcidTag(chp.lidBi) : undefined,
    };
    if (a['w:val'] || a['w:eastAsia'] || a['w:bidi']) x += el('w:lang', a);
  }
  if (t('specVanish')) x += onOff('w:specVanish', chp.specVanish);
  return x;
}

// ───────────────────────────── parágrafo ─────────────────────────────

const JC = ['left', 'center', 'right', 'both', 'distribute', 'mediumKashida', 'both', 'highKashida', 'lowKashida', 'thaiDistribute'];

export function jcVal(jc: number | undefined, paraJc80 = false): string {
  if (paraJc80 && jc !== undefined && jc >= 3 && jc <= 5) return 'both';
  return JC[jc ?? 0] ?? 'left';
}

const TAB_JC = ['left', 'center', 'right', 'decimal', 'bar', 'clear', 'num', 'left'];
const TAB_TLC = [undefined, 'dot', 'hyphen', 'underscore', 'heavy', 'middleDot', undefined, undefined];

/** Diferença de tabulações: limpa as do estilo que sumiram e acrescenta as novas. */
export function tabsXml(base: TabStop[] | undefined, final: TabStop[] | undefined, cleared: number[] = []): string {
  const b = base ?? [];
  const f = final ?? [];
  const same = (x: TabStop, y: TabStop): boolean => x.pos === y.pos && x.jc === y.jc && x.tlc === y.tlc;
  const clearPos = new Set(b.filter((x) => !f.some((y) => same(x, y))).map((x) => x.pos));
  // remoções explícitas do próprio nível (o Word as mantém mesmo sem tab correspondente no estilo)
  for (const p of cleared) if (!f.some((y) => y.pos === p)) clearPos.add(p);
  const adds = f.filter((y) => !b.some((x) => same(x, y)));
  if (!clearPos.size && !adds.length) return '';
  let x = '';
  for (const c of [...clearPos].sort((p, q) => p - q)) if (!adds.some((a) => a.pos === c)) x += el('w:tab', { 'w:val': 'clear', 'w:pos': c });
  for (const a of adds) x += el('w:tab', { 'w:val': TAB_JC[a.jc] ?? 'left', 'w:leader': TAB_TLC[a.tlc], 'w:pos': a.pos });
  return x ? `<w:tabs>${x}</w:tabs>` : '';
}

export interface PPrOpts {
  /** Tabulações do nível de baixo (estilo/pai) para o diff. */
  baseTabs?: TabStop[];
  /** numId para o ilfo. */
  numId?: (ilfo: number) => number;
  /** Conteúdo extra no fim (rPr da marca, sectPr). */
  rPr?: string;
  sectPr?: string;
  withStyle?: boolean;
}

export function pPrInner(pap: Pap, touched: Set<PapKey>, ctx: PropCtx, o: PPrOpts = {}): string {
  const t = (k: PapKey): boolean => touched.has(k);
  let x = '';
  if (o.withStyle !== false && pap.istd !== 0 && pap.istd !== undefined) {
    const id = ctx.styleId(pap.istd);
    if (id) x += el('w:pStyle', { 'w:val': id });
  }
  if (t('keepFollow')) x += onOff('w:keepNext', pap.keepFollow);
  if (t('keep')) x += onOff('w:keepLines', pap.keep);
  if (t('pageBreakBefore')) x += onOff('w:pageBreakBefore', pap.pageBreakBefore);
  x += framePrXml(pap, touched);
  if (t('widowControl')) x += onOff('w:widowControl', pap.widowControl);
  if (t('ilfo') || t('ilvl')) {
    const ilfo = pap.ilfo ?? 0;
    const numId = ilfo === 0 || ilfo === -2047 ? 0 : o.numId ? o.numId(Math.abs(ilfo)) : Math.abs(ilfo);
    let n = '';
    if (t('ilvl') || numId) n += el('w:ilvl', { 'w:val': Math.min(8, pap.ilvl ?? 0) });
    n += el('w:numId', { 'w:val': numId });
    x += `<w:numPr>${n}</w:numPr>`;
  }
  if (t('noLineNumb')) x += onOff('w:suppressLineNumbers', pap.noLineNumb);
  const bdr = (['brcTop', 'brcLeft', 'brcBottom', 'brcRight', 'brcBetween', 'brcBar'] as const)
    .filter((k) => t(k))
    .map((k) => brcXml(`w:${({ brcTop: 'top', brcLeft: 'left', brcBottom: 'bottom', brcRight: 'right', brcBetween: 'between', brcBar: 'bar' })[k]}`, pap[k]))
    .join('');
  if (bdr) x += `<w:pBdr>${bdr}</w:pBdr>`;
  if (t('shd')) x += shdXml(pap.shd);
  if (t('tabs')) x += tabsXml(o.baseTabs, pap.tabs, pap.tabsCleared);
  if (t('noAutoHyph')) x += onOff('w:suppressAutoHyphens', pap.noAutoHyph);
  if (t('kinsoku')) x += onOff('w:kinsoku', pap.kinsoku);
  if (t('wordWrap')) x += onOff('w:wordWrap', pap.wordWrap);
  if (t('overflowPunct')) x += onOff('w:overflowPunct', pap.overflowPunct);
  if (t('topLinePunct')) x += onOff('w:topLinePunct', pap.topLinePunct);
  if (t('autoSpaceDE')) x += onOff('w:autoSpaceDE', pap.autoSpaceDE);
  if (t('autoSpaceDN')) x += onOff('w:autoSpaceDN', pap.autoSpaceDN);
  if (t('bidi')) x += onOff('w:bidi', pap.bidi);
  if (t('adjustRight')) x += onOff('w:adjustRightInd', pap.adjustRight);
  if (t('usePgsuSettings')) x += onOff('w:snapToGrid', pap.usePgsuSettings);
  if (t('dyaBefore') || t('dyaAfter') || t('lineSpacing') || t('beforeAuto') || t('afterAuto') || t('dylBefore') || t('dylAfter')) {
    const ls = pap.lineSpacing;
    x += el('w:spacing', {
      'w:before': t('dyaBefore') ? pap.dyaBefore : undefined,
      'w:beforeLines': t('dylBefore') ? pap.dylBefore : undefined,
      'w:beforeAutospacing': t('beforeAuto') ? (pap.beforeAuto ? '1' : '0') : undefined,
      'w:after': t('dyaAfter') ? pap.dyaAfter : undefined,
      'w:afterLines': t('dylAfter') ? pap.dylAfter : undefined,
      'w:afterAutospacing': t('afterAuto') ? (pap.afterAuto ? '1' : '0') : undefined,
      'w:line': t('lineSpacing') && ls ? Math.abs(ls.line) : undefined,
      'w:lineRule': t('lineSpacing') && ls ? (ls.mult ? 'auto' : ls.line < 0 ? 'exact' : 'atLeast') : undefined,
    });
  }
  if (t('dxaLeft') || t('dxaRight') || t('dxaLeft1') || t('dxcLeft') || t('dxcRight') || t('dxcLeft1')) {
    const l1 = pap.dxaLeft1;
    const a: Record<string, number | undefined> = {
      'w:left': t('dxaLeft') ? pap.dxaLeft : undefined,
      'w:leftChars': t('dxcLeft') ? pap.dxcLeft : undefined,
      'w:right': t('dxaRight') ? pap.dxaRight : undefined,
      'w:rightChars': t('dxcRight') ? pap.dxcRight : undefined,
    };
    if (t('dxaLeft1') && l1 !== undefined) {
      if (l1 < 0) a['w:hanging'] = -l1; else a['w:firstLine'] = l1;
    }
    if (t('dxcLeft1') && pap.dxcLeft1 !== undefined) {
      if (pap.dxcLeft1 < 0) a['w:hangingChars'] = -pap.dxcLeft1; else a['w:firstLineChars'] = pap.dxcLeft1;
    }
    x += el('w:ind', a);
  }
  if (t('contextualSpacing')) x += onOff('w:contextualSpacing', pap.contextualSpacing);
  if (t('mirrorIndents')) x += onOff('w:mirrorIndents', pap.mirrorIndents);
  if (t('jc')) x += el('w:jc', { 'w:val': jcVal(pap.jc) });
  if (t('wAlignFont')) x += el('w:textAlignment', { 'w:val': ['top', 'center', 'baseline', 'bottom', 'auto'][pap.wAlignFont ?? 4] ?? 'auto' });
  if (t('outLvl') && pap.outLvl !== undefined && pap.outLvl <= 9) x += el('w:outlineLvl', { 'w:val': pap.outLvl });
  if (o.rPr) x += `<w:rPr>${o.rPr}</w:rPr>`;
  if (o.sectPr) x += o.sectPr;
  return x;
}

/**
 * Moldura (framePr). Como o Word grava (medido no Word): só quando há
 * posição, tamanho, quebra ou capitular (sprmPPc sozinho não basta); w:wrap
 * sempre; w:vAnchor omitido quando é "margin"; w:hRule só quando exata.
 */
function framePrXml(pap: Pap, touched: Set<PapKey>): string {
  const keys: PapKey[] = ['dxaAbs', 'dyaAbs', 'dxaWidth', 'wr', 'wHeightAbs', 'dcs'];
  if (!keys.some((k) => touched.has(k) && pap[k])) return '';
  const pc = pap.pc ?? 0;
  const pcVert = (pc >> 4) & 3; // 0 margem, 1 página, 2 texto
  const pcHorz = (pc >> 6) & 3; // 0 coluna, 1 margem, 2 página
  const a: Record<string, string | number | undefined> = {};
  if (pap.dcs) {
    const fdct = pap.dcs & 7;
    const lines = (pap.dcs >> 3) & 0x1f;
    if (fdct) { a['w:dropCap'] = fdct === 1 ? 'drop' : 'margin'; a['w:lines'] = lines; }
  }
  if (pap.dxaWidth) a['w:w'] = pap.dxaWidth;
  if (pap.wHeightAbs) {
    a['w:h'] = pap.wHeightAbs & 0x7fff;
    if (!(pap.wHeightAbs & 0x8000)) a['w:hRule'] = 'exact';
  }
  if (pap.dxaFromText) a['w:hSpace'] = pap.dxaFromText;
  if (pap.dyaFromText) a['w:vSpace'] = pap.dyaFromText;
  a['w:wrap'] = ['auto', 'notBeside', 'around', 'none', 'tight', 'through'][pap.wr ?? 0] ?? 'auto';
  const v = ['margin', 'page', 'text'][pcVert];
  if (v && v !== 'margin') a['w:vAnchor'] = v;
  a['w:hAnchor'] = ['text', 'margin', 'page'][pcHorz] ?? 'text';
  const xa = pap.dxaAbs ?? 0;
  const xAlign: Record<number, string> = { [-4]: 'center', [-8]: 'right', [-12]: 'inside', [-16]: 'outside' };
  // o Word grava no .docx o valor do XAS_plusOne como está (medido: dyaAbs 1 → w:y=1)
  if (xAlign[xa]) a['w:xAlign'] = xAlign[xa]; else if (xa) a['w:x'] = xa;
  const ya = pap.dyaAbs ?? 0;
  const yAlign: Record<number, string> = { [-4]: 'top', [-8]: 'center', [-12]: 'bottom', [-16]: 'inside', [-20]: 'outside' };
  if (yAlign[ya]) a['w:yAlign'] = yAlign[ya]; else if (ya) a['w:y'] = ya;
  if (pap.frameLocked) a['w:anchorLock'] = '1';
  // ordem dos atributos como o Word: x antes de xAlign, y antes de yAlign
  const order = ['w:dropCap', 'w:lines', 'w:w', 'w:h', 'w:hRule', 'w:hSpace', 'w:vSpace', 'w:wrap', 'w:vAnchor', 'w:hAnchor', 'w:x', 'w:xAlign', 'w:y', 'w:yAlign', 'w:anchorLock'];
  const sorted: Record<string, string | number | undefined> = {};
  for (const k of order) if (a[k] !== undefined) sorted[k] = a[k];
  return el('w:framePr', sorted);
}

const NFC: Record<number, string> = {
  0: 'decimal', 1: 'upperRoman', 2: 'lowerRoman', 3: 'upperLetter', 4: 'lowerLetter', 5: 'ordinal',
  6: 'cardinalText', 7: 'ordinalText', 8: 'hex', 9: 'chicago', 10: 'ideographDigital', 11: 'japaneseCounting',
  12: 'aiueo', 13: 'iroha', 14: 'decimalFullWidth', 15: 'decimalHalfWidth', 16: 'japaneseLegal',
  17: 'japaneseDigitalTenThousand', 18: 'decimalEnclosedCircle', 19: 'decimalFullWidth2', 20: 'aiueoFullWidth',
  21: 'irohaFullWidth', 22: 'decimalZero', 23: 'bullet', 24: 'ganada', 25: 'chosung', 26: 'decimalEnclosedFullstop',
  27: 'decimalEnclosedParen', 28: 'decimalEnclosedCircleChinese', 29: 'ideographEnclosedCircle',
  30: 'ideographTraditional', 31: 'ideographZodiac', 32: 'ideographZodiacTraditional', 33: 'taiwaneseCounting',
  34: 'ideographLegalTraditional', 35: 'taiwaneseCountingThousand', 36: 'taiwaneseDigital', 37: 'chineseCounting',
  38: 'chineseLegalSimplified', 39: 'chineseCountingThousand', 41: 'koreanDigital', 42: 'koreanCounting',
  43: 'koreanLegal', 44: 'koreanDigital2', 45: 'hebrew1', 46: 'arabicAlpha', 47: 'hebrew2', 48: 'arabicAbjad',
  49: 'hindiVowels', 50: 'hindiConsonants', 51: 'hindiNumbers', 52: 'thaiLetters', 53: 'thaiNumbers',
  54: 'thaiCounting', 55: 'vietnameseCounting', 56: 'numberInDash', 57: 'russianLower', 58: 'russianUpper',
  255: 'none',
};

export function numFmtOf(nfc: number): string {
  return NFC[nfc] ?? 'decimal';
}

