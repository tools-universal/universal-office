/**
 * Texto binário → DrawingML (`<a:p>`/`<a:r>`), com TODAS as propriedades
 * efetivas escritas explicitamente — o resultado não depende da cascata de
 * estilos do leitor (que não sabe expressar a herança do .ppt).
 *
 * Cascata do PowerPoint binário, da menor para a maior prioridade:
 *   1. padrões do documento (TextCF/PFExceptionAtom do Environment)
 *   2. estilo-mestre do TIPO de texto (TextMasterStyleAtom do mestre), níveis
 *      encadeados: o nível n herda do n−1 (os átomos só trazem diferenças)
 *   3. estilos derivados (corpo-central/título-central/meio/quarto-corpo,
 *      instâncias 5–8) por cima do tipo-base (corpo/título)
 *   4. régua do bloco (TextRulerAtom: margens por nível)
 *   5. exceções das corridas (StyleTextPropAtom) + PP9 (numeração)
 *
 * Unidades: margens em mestre-unidades (576/pol → EMU ×1587,5); entrelinha e
 * espaços ≥ 0 = %, < 0 = −mestre-unidades (8 por ponto).
 */
import type { PptDocument } from './ppt-reader.js';
import type { TextBlock, TextCF, TextPF, MasterStyleLevel, ColorIndex } from './text.js';
import { RT } from './records.js';
import { el, escText, attrs } from './xmlw.js';

export const MU_TO_EMU = 1587.5;
export const emu = (mu: number): number => Math.round(mu * MU_TO_EMU);

export interface TextConvCtx {
  doc: PptDocument;
  /** Estilos-mestre (por instância) do mestre principal do slide. */
  styles?: Map<number, MasterStyleLevel[]>;
  /** Esquema de cores efetivo (8 cores 'RRGGBB'). */
  scheme: string[];
  /** Número do slide (campos de nº de slide). */
  slideNumber?: number;
  /** Registra a imagem do marcador (bulletBlipRef do PP9) na parte → rId. */
  bulletBlipRel?: (ref: number) => string | undefined;
  /** Registra um hiperlink externo na parte → rId. */
  linkRel?: (target: string) => string;
  /** Textos de cabeçalho/rodapé (meta-chars dos placeholders do mestre). */
  hf?: { footer?: string; header?: string; userDate?: string };
}

/** Hiperlink de uma corrida (`<a:hlinkClick>`). */
interface RunLink { rid: string; action?: string }

const JUMPS = ['', 'nextslide', 'previousslide', 'firstslide', 'lastslide', 'lastslideviewed', 'endshow'];

export interface LevelStyle { pf: TextPF; cf: TextCF }

/** Tipo-base dos estilos derivados (instâncias 5–8). */
function baseType(t: number): number {
  if (t === 6) return 0;
  if (t === 5 || t === 7 || t === 8) return 1;
  return t;
}

/** Nível `lvl` de uma lista de estilos (instâncias ≥ 5 trazem o nº do nível). */
function levelOf(levels: MasterStyleLevel[] | undefined, lvl: number): MasterStyleLevel | undefined {
  if (!levels) return undefined;
  if (levels.some((l) => l.level !== undefined)) return levels.find((l) => l.level === lvl);
  return levels[lvl];
}

const cache = new WeakMap<TextConvCtx, Map<string, LevelStyle>>();

/** Estilo efetivo de um tipo de texto num nível (0–4; níveis > 4 usam o 4). */
export function resolveLevel(ctx: TextConvCtx, textType: number, level: number): LevelStyle {
  let m = cache.get(ctx);
  if (!m) { m = new Map(); cache.set(ctx, m); }
  const lvl = Math.max(0, Math.min(4, level));
  const key = `${textType}:${lvl}`;
  const hit = m.get(key);
  if (hit) return hit;
  const pf: TextPF = { ...ctx.doc.docPF };
  const cf: TextCF = { ...ctx.doc.docCF };
  const base = baseType(textType);
  // texto "outro" (caixas de texto/autoformas): estilo do DOCUMENTO (Environment —
  // vira o defaultTextStyle; o app NÃO usa o "outro" do mestre nesse texto, medido:
  // Times New Roman negrito do documento × Arial do mestre); demais tipos: o do
  // mestre, com fallback no "outro" do mestre e por fim no do documento
  const baseLevels = base === 4
    ? (ctx.doc.docOtherStyle ?? ctx.styles?.get(4))
    : (ctx.styles?.get(base) ?? ctx.styles?.get(4) ?? ctx.doc.docOtherStyle);
  const derived = base !== textType ? ctx.styles?.get(textType) : undefined;
  for (let l = 0; l <= lvl; l++) {
    const b = levelOf(baseLevels, l);
    if (b) { Object.assign(pf, b.pf); Object.assign(cf, b.cf); }
  }
  for (let l = 0; l <= lvl; l++) {
    const d = levelOf(derived, l);
    if (d) { Object.assign(pf, d.pf); Object.assign(cf, d.cf); }
  }
  const out = { pf, cf };
  m.set(key, out);
  return out;
}

/** Cor de texto/marcador → 'RRGGBB' (índice 0xFE = RGB; 0..7 = esquema). */
export function colorIndexHex(ci: ColorIndex | undefined, scheme: string[]): string | undefined {
  if (!ci) return undefined;
  if (ci.index === 0xfe) return hex3(ci.r, ci.g, ci.b);
  if (ci.index <= 7) return scheme[ci.index];
  return undefined;
}

export function hex3(r: number, g: number, b: number): string {
  return [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const ALIGN = ['l', 'ctr', 'r', 'just', 'dist', 'thaiDist', 'justLow'];

/** Esquemas de numeração automática (TextAutoNumberScheme) → ST_TextAutonumberScheme. */
const AUTONUM = [
  'alphaLcPeriod', 'alphaUcPeriod', 'arabicParenR', 'arabicPeriod', 'romanLcParenBoth', 'romanLcParenR',
  'romanLcPeriod', 'romanUcPeriod', 'alphaLcParenBoth', 'alphaLcParenR', 'alphaUcParenBoth', 'alphaUcParenR',
  'arabicParenBoth', 'arabicPlain', 'romanUcParenBoth', 'romanUcParenR', 'ea1ChsPlain', 'ea1ChsPeriod',
  'circleNumDbPlain', 'circleNumWdWhitePlain', 'circleNumWdBlackPlain', 'thaiAlphaPeriod', 'thaiAlphaParenR',
  'thaiAlphaParenBoth', 'thaiNumPeriod', 'thaiNumParenR', 'thaiNumParenBoth', 'hindiAlphaPeriod',
  'hindiNumPeriod', 'ea1JpnChsDbPeriod', 'hindiNumParenR', 'hindiAlpha1Period', 'ea1ChtPlain', 'ea1ChtPeriod',
  'arabicDbPlain', 'arabicDbPeriod', 'ea1JpnKorPlain', 'ea1JpnKorPeriod', 'arabic1Minus', 'arabic2Minus',
  'hebrew2Minus', 'thaiAlphaPeriod', 'thaiAlphaParenR',
];

/** Espaço (entrelinha/antes/depois): ≥ 0 → spcPct; < 0 → spcPts. */
function spacingXml(tag: string, v: number | undefined): string {
  if (v === undefined) return '';
  if (v >= 0) return el(tag, {}, el('a:spcPct', { val: Math.round(v * 1000) }));
  return el(tag, {}, el('a:spcPts', { val: Math.round((-v / 8) * 100) }));
}

function fontName(ctx: TextConvCtx, idx: number | undefined): string | undefined {
  if (idx === undefined || idx === 0xffff) return undefined;
  return ctx.doc.fonts[idx]?.name || undefined;
}

/** Caractere do marcador: fontes de símbolo usam a área privada F0xx. */
function bulletCharStr(code: number): string {
  const c = code >= 0xf000 && code <= 0xf0ff ? code - 0xf000 : code;
  return String.fromCharCode(c || 0x2022);
}

/** `<a:pPr>` (ou `<a:lvlNpPr>`) com as propriedades de parágrafo efetivas. */
export function pPrXml(tag: string, pf: TextPF, cf: TextCF, ctx: TextConvCtx, extra: { lvl?: number; marginOverride?: { left?: number; indent?: number } } = {}): string {
  const left = extra.marginOverride?.left ?? pf.leftMargin ?? 0;
  const ind = extra.marginOverride?.indent ?? pf.indent ?? 0;
  const a: Record<string, string | number | undefined> = {
    marL: emu(left),
    lvl: extra.lvl ? extra.lvl : undefined,
    indent: emu(ind - left),
    algn: ALIGN[pf.align ?? 0] ?? 'l',
  };
  if (pf.defaultTabSize !== undefined) a['defTabSz'] = emu(pf.defaultTabSize);
  if (pf.textDirection === 1) a['rtl'] = '1';
  if (pf.fontAlign !== undefined) a['fontAlgn'] = ['base', 't', 'ctr', 'b'][pf.fontAlign] ?? undefined;
  let kids = '';
  kids += spacingXml('a:lnSpc', pf.lineSpacing);
  kids += spacingXml('a:spcBef', pf.spaceBefore);
  kids += spacingXml('a:spcAft', pf.spaceAfter);
  if (pf.hasBullet) {
    if (pf.bulletHasColor) {
      const c = colorIndexHex(pf.bulletColor, ctx.scheme);
      if (c) kids += el('a:buClr', {}, el('a:srgbClr', { val: c }));
    }
    if (pf.bulletHasSize && pf.bulletSize !== undefined && pf.bulletSize !== 0) {
      kids += pf.bulletSize > 0
        ? el('a:buSzPct', { val: Math.round(pf.bulletSize * 1000) })
        : el('a:buSzPts', { val: Math.round(-pf.bulletSize * 100) });
    }
    const bf = pf.bulletHasFont ? fontName(ctx, pf.bulletFont) : undefined;
    if (bf) kids += el('a:buFont', { typeface: bf });
    const blipRid = !pf.hasAutoNum && pf.bulletBlipRef !== undefined && pf.bulletBlipRef >= 0 ? ctx.bulletBlipRel?.(pf.bulletBlipRef) : undefined;
    if (blipRid) {
      kids += el('a:buBlip', {}, el('a:blip', { 'r:embed': blipRid }));
    } else if (pf.hasAutoNum) {
      kids += el('a:buAutoNum', {
        type: AUTONUM[pf.autoNumScheme ?? 3] ?? 'arabicPeriod',
        startAt: pf.autoNumStart !== undefined && pf.autoNumStart > 1 ? pf.autoNumStart : undefined,
      });
    } else kids += el('a:buChar', { char: bulletCharStr(pf.bulletChar ?? 0x2022) });
  } else kids += '<a:buNone/>';
  if (pf.tabStops?.length) {
    kids += el('a:tabLst', {}, pf.tabStops.map((t) =>
      el('a:tab', { pos: emu(t.pos), algn: ['l', 'ctr', 'r', 'dec'][t.type] ?? 'l' })).join(''));
  }
  if (tag !== 'a:pPr') kids += rPrXml('a:defRPr', cf, ctx);
  return el(tag, a, kids);
}

/** LCIDs mais comuns → etiqueta de idioma (BCP 47) para `<a:rPr lang>`. */
const LCID: Record<number, string> = {
  0x0416: 'pt-BR', 0x0816: 'pt-PT', 0x0409: 'en-US', 0x0809: 'en-GB', 0x0c09: 'en-AU', 0x1009: 'en-CA',
  0x0c0a: 'es-ES', 0x040a: 'es-ES', 0x080a: 'es-MX', 0x2c0a: 'es-AR', 0x040c: 'fr-FR', 0x0c0c: 'fr-CA',
  0x0407: 'de-DE', 0x0807: 'de-CH', 0x0c07: 'de-AT', 0x0410: 'it-IT', 0x0413: 'nl-NL', 0x0813: 'nl-BE',
  0x0419: 'ru-RU', 0x0415: 'pl-PL', 0x0405: 'cs-CZ', 0x040e: 'hu-HU', 0x041d: 'sv-SE', 0x0406: 'da-DK',
  0x0414: 'nb-NO', 0x040b: 'fi-FI', 0x0408: 'el-GR', 0x041f: 'tr-TR', 0x0411: 'ja-JP', 0x0412: 'ko-KR',
  0x0804: 'zh-CN', 0x0404: 'zh-TW', 0x040d: 'he-IL', 0x0401: 'ar-SA', 0x041e: 'th-TH', 0x042a: 'vi-VN',
  0x0418: 'ro-RO', 0x0422: 'uk-UA', 0x0402: 'bg-BG', 0x041a: 'hr-HR', 0x041b: 'sk-SK', 0x0424: 'sl-SI',
  0x0403: 'ca-ES', 0x0421: 'id-ID', 0x0439: 'hi-IN',
};

/** `<a:rPr>`/`<a:defRPr>`/`<a:endParaRPr>` com as propriedades efetivas. */
export function rPrXml(tag: string, cf: TextCF, ctx: TextConvCtx, link?: RunLink): string {
  const a: Record<string, string | number | undefined> = {
    lang: ctx.doc.docLcid !== undefined ? LCID[ctx.doc.docLcid] : undefined,
    sz: cf.size !== undefined && cf.size > 0 ? Math.round(cf.size * 100) : undefined,
    b: cf.bold ? '1' : '0',
    i: cf.italic ? '1' : '0',
    u: cf.underline ? 'sng' : undefined,
    baseline: cf.position ? Math.round(cf.position * 1000) : undefined,
  };
  if (tag === 'a:defRPr') delete a['lang'];
  let kids = '';
  const color = colorIndexHex(cf.color, ctx.scheme) ?? ctx.scheme[1];
  if (color) kids += el('a:solidFill', {}, el('a:srgbClr', { val: color }));
  if (cf.shadow) {
    kids += '<a:effectLst><a:outerShdw blurRad="38100" dist="38100" dir="2700000" algn="tl"><a:srgbClr val="000000"><a:alpha val="43137"/></a:srgbClr></a:outerShdw></a:effectLst>';
  }
  const latin = fontName(ctx, cf.font);
  if (latin) kids += el('a:latin', { typeface: latin });
  const ea = fontName(ctx, cf.eaFont);
  if (ea) kids += el('a:ea', { typeface: ea });
  const sym = fontName(ctx, cf.symbolFont);
  if (sym) kids += el('a:sym', { typeface: sym });
  if (link) kids += el('a:hlinkClick', { 'r:id': link.rid, action: link.action });
  return el(tag, a, kids);
}

/** Hiperlink (ou salto) da faixa → `RunLink`; texto com link usa a cor de hiperlink do esquema. */
function runLinkFor(lk: LinkIndex, pos: number, ctx: TextConvCtx): RunLink | undefined {
  // links ordenados por início: candidatos = os últimos com start ≤ pos (as
  // faixas de hiperlink não se sobrepõem; olha poucos para não varrer tudo)
  let l: LinkIndex['links'][number] | undefined;
  const hi = upperBound(lk.starts, pos);
  for (let i = hi - 1; i >= Math.max(0, hi - 8); i--) {
    const c = lk.links[i]!;
    if (pos < c.end) { l = c; break; }
  }
  if (!l) return undefined;
  if (l.action === 4) {
    const target = ctx.doc.hyperlinks.get(l.hyperlinkId)?.target;
    if (target && ctx.linkRel) return { rid: ctx.linkRel(target) };
    return undefined;
  }
  if (l.action === 3 && JUMPS[l.jump]) return { rid: '', action: `ppaction://hlinkshowjump?jump=${JUMPS[l.jump]}` };
  return undefined;
}

/**
 * Meta-char → campo (`<a:fld type>`) ou texto literal: nº do slide e data
 * automática viram campos; data fixa, cabeçalho e rodapé viram o texto do
 * HeadersFootersContainer.
 */
function metaCharContent(recType: number, ctx: TextConvCtx): { fld?: string; text: string } | undefined {
  switch (recType) {
    case RT.SlideNumberMetaCharAtom: return { fld: 'slidenum', text: String(ctx.slideNumber ?? 1) };
    case RT.DateTimeMetaCharAtom:
    case RT.GenericDateMetaCharAtom:
    case RT.RtfDateTimeMetaCharAtom: {
      if (ctx.hf?.userDate !== undefined) return { text: ctx.hf.userDate };
      const d = new Date();
      return { fld: 'datetime1', text: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` };
    }
    case RT.FooterMetaCharAtom: return { text: ctx.hf?.footer ?? '' };
    case RT.HeaderMetaCharAtom: return { text: ctx.hf?.header ?? '' };
    default: return undefined;
  }
}

let fieldSeq = 0;
function fieldId(): string {
  fieldSeq = (fieldSeq + 1) % 0xffff;
  return `{B6F15528-21DE-4FAA-801E-634DDDAF${fieldSeq.toString(16).padStart(4, '0').toUpperCase()}}`;
}

/**
 * Índice das corridas de um bloco (fins acumulados + busca binária): cada
 * consulta é O(log n). Antes, cada parágrafo/segmento varria TODAS as corridas
 * — O(n²) num bloco de corridas de 1 caractere (1 MB ≈ 10¹⁰ passos).
 */
interface RunIndex<T> { runs: T[]; ends: number[] }

function runIndex<T extends { count: number }>(runs: T[]): RunIndex<T> {
  const ends: number[] = [];
  let acc = 0;
  for (const r of runs) { acc += r.count; ends.push(acc); }
  return { runs, ends };
}

/** 1º índice i com `v < a[i]` (a não-decrescente); a.length se nenhum. */
function upperBound(a: readonly number[], v: number): number {
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (v < a[mid]!) hi = mid; else lo = mid + 1; }
  return lo;
}

/** Corrida que cobre a posição `pos` (a última, se `pos` passa do fim). */
function runAt<T>(ix: RunIndex<T>, pos: number): T | undefined {
  if (!ix.runs.length) return undefined;
  return ix.runs[Math.min(upperBound(ix.ends, pos), ix.runs.length - 1)];
}

/** Hiperlinks de um bloco ordenados por início + fronteiras (para busca binária). */
interface LinkIndex { links: NonNullable<TextBlock['links']>; starts: number[]; bounds: number[] }

function linkIndex(block: TextBlock): LinkIndex {
  const links = [...(block.links ?? [])].sort((a, b) => a.start - b.start);
  const bounds = [...new Set(links.flatMap((l) => [l.start, l.end]))].sort((a, b) => a - b);
  return { links, starts: links.map((l) => l.start), bounds };
}

/** Fronteiras das corridas de caractere (e dos hiperlinks) dentro de [start, end). */
function cfBoundaries(cf: RunIndex<unknown>, lk: LinkIndex, start: number, end: number): number[] {
  const set = new Set<number>([start, end]);
  for (const a of [cf.ends, lk.bounds]) {
    for (let i = upperBound(a, start); i < a.length && a[i]! < end; i++) set.add(a[i]!);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Bloco de texto → sequência de `<a:p>`. `textType` sobrepõe o do bloco
 * (placeholders no slide podem herdar o tipo do mestre).
 */
export function paragraphsXml(block: TextBlock, ctx: TextConvCtx): string {
  const text = block.text;
  const paras: { start: number; end: number }[] = [];
  let s = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r') { paras.push({ start: s, end: i }); s = i + 1; }
  }
  paras.push({ start: s, end: text.length });
  const fields = new Map<number, { fld?: string; text: string }>();
  for (const m of block.metaChars ?? []) {
    const c = metaCharContent(m.type, ctx);
    if (c) fields.set(m.pos, c);
  }
  const pfIx = runIndex(block.pfRuns), cfIx = runIndex(block.cfRuns), lk = linkIndex(block);
  let out = '';
  for (const para of paras) {
    const pfRun = runAt(pfIx, para.start);
    const level = Math.min(pfRun?.indentLevel ?? 0, 4);
    const base = resolveLevel(ctx, block.textType, level);
    const pf: TextPF = { ...base.pf };
    // régua do bloco: margens do nível
    const ruler = block.ruler;
    if (ruler) {
      const lm = ruler.leftMargin[level];
      const id = ruler.indent[level];
      if (lm !== undefined) pf.leftMargin = lm;
      if (id !== undefined) pf.indent = id;
      if (ruler.defaultTabSize !== undefined) pf.defaultTabSize = ruler.defaultTabSize;
      if (ruler.tabStops?.length) pf.tabStops = ruler.tabStops;
    }
    if (pfRun) Object.assign(pf, pfRun.pf);
    // PP9: o pp9rt da 1ª corrida do parágrafo indexa o StyleTextProp9Atom
    const firstCf = runAt(cfIx, para.start);
    if (block.pf9?.length && pf.hasBullet) {
      const p9 = block.pf9[firstCf?.cf.pp9rt ?? 0];
      if (p9?.hasAutoNum) {
        pf.hasAutoNum = true;
        if (p9.autoNumScheme !== undefined) pf.autoNumScheme = p9.autoNumScheme;
        if (p9.autoNumStart !== undefined) pf.autoNumStart = p9.autoNumStart;
      }
      if (p9?.bulletBlipRef !== undefined) pf.bulletBlipRef = p9.bulletBlipRef;
    }
    let body = pPrXml('a:pPr', pf, base.cf, ctx, { lvl: level });
    const cfAt = (pos: number): TextCF => ({ ...base.cf, ...(runAt(cfIx, pos)?.cf ?? {}) });
    if (para.end > para.start) {
      const bounds = cfBoundaries(cfIx, lk, para.start, para.end);
      for (let k = 0; k + 1 < bounds.length; k++) {
        const a = bounds[k]!, b = bounds[k + 1]!;
        const cf = cfAt(a);
        const link = runLinkFor(lk, a, ctx);
        // no binário, texto com hiperlink é pintado na cor "acento e hiperlink" do esquema
        if (link && !link.action && ctx.scheme[6]) cf.color = { r: 0, g: 0, b: 0, index: 6 };
        const rPr = rPrXml('a:rPr', cf, ctx, link);
        // quebras de linha (\v) e campos (meta-chars) partem a corrida
        let seg = '';
        const flush = (): void => {
          if (seg) body += `<a:r>${rPr}<a:t>${escText(seg)}</a:t></a:r>`;
          seg = '';
        };
        for (let i = a; i < b; i++) {
          const ch = text[i]!;
          const fld = fields.get(i);
          if (fld) {
            flush();
            if (fld.fld) body += `<a:fld${attrs({ id: fieldId(), type: fld.fld })}>${rPr}<a:t>${escText(fld.text)}</a:t></a:fld>`;
            else if (fld.text) body += `<a:r>${rPr}<a:t>${escText(fld.text)}</a:t></a:r>`;
          } else if (ch === '\v') {
            flush();
            body += `<a:br>${rPr}</a:br>`;
          } else seg += ch;
        }
        flush();
      }
    } else {
      // parágrafo vazio: corrida vazia leva o tamanho da linha para o layout
      body += `<a:r>${rPrXml('a:rPr', cfAt(para.start), ctx)}<a:t></a:t></a:r>`;
    }
    body += rPrXml('a:endParaRPr', cfAt(para.end), ctx);
    out += `<a:p>${body}</a:p>`;
  }
  return out;
}

/** `<p:titleStyle>`/`<p:bodyStyle>`/`<p:otherStyle>`/`<p:defaultTextStyle>`: 9 níveis. */
export function levelsXml(tag: string, ctx: TextConvCtx, textType: number): string {
  let kids = '';
  for (let i = 0; i < 9; i++) {
    const st = resolveLevel(ctx, textType, Math.min(i, 4));
    kids += pPrXml(`a:lvl${i + 1}pPr`, st.pf, st.cf, ctx);
  }
  return el(tag, {}, kids);
}
