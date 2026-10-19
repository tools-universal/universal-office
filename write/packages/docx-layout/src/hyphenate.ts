import type { FullDocument, PPr } from '@universal-office/docx-core';
import { hyphenatorFor } from './typography/index.js';
import type { DocContext } from './context.js';
import type { Glyph } from './para.js';
import { advanceTwips } from './para.js';

/**
 * Hifenização automática (w:autoHyphenation) e hífen opcional (w:softHyphen) como o
 * Word — regras medidas no oráculo (grupos hyph*):
 *
 *  - pontos: padrões de Liang do idioma do run (w:lang; sem padrões ou com w:noProof,
 *    não hifeniza); palavra = trecho de LETRAS (dígitos, apóstrofo, hífen, barra,
 *    pontuação separam: "res-pon2sa-bi", "d'ad-mi-nis-tra-ção"); mínimos do Word, iguais
 *    em pt/en/es: 2 letras antes; depois, 3 no modo 15 e 2 nos ≤ 14; w:doNotHyphenateCaps
 *    pula palavra toda em maiúsculas (também w:caps/versalete); o hífen opcional do
 *    texto SOMA-SE aos pontos automáticos, sem os mínimos;
 *  - o pedaço tem de caber COM o hífen da fonte (U+002D); nos modos ≤ 14 também a
 *    letra seguinte ao ponto (o Word antigo procura o ponto antes do caractere que
 *    estoura);
 *  - quando hifenizar (a palavra inteira não coube nem comprimindo — a compressão do
 *    justificado decide antes):
 *      modo 15, sem justificar: o vão que ficaria na linha se a palavra descesse (do fim
 *        do conteúdo, sem os espaços, à margem) ≥ ~421 twips — w:hyphenationZone é ignorada;
 *      modo 15, justificado: a expansão dos espaços que sobram se a palavra descesse >
 *        0,4868 da largura deles (senão desce); o pedaço pode comprimir os espaços como
 *        a palavra (≤ 25%) desde que perca ≤ metade da folga do ponto anterior;
 *      modos ≤ 14: o início da palavra fica a ≥ w:hyphenationZone da margem (sem o
 *        elemento, a zona padrão do Word pt-BR: 0,75 cm = 425);
 *    palavra que abre a linha (não tem para onde descer) hifeniza sempre que der;
 *  - w:consecutiveHyphenLimit: no máximo N linhas seguidas terminando em hífen
 *    AUTOMÁTICO; uma linha terminada de outro jeito (hífen opcional ou da própria
 *    palavra) zera.
 */

/** vão mínimo (twips) para hifenizar no modo 15 sem justificar (oráculo hyphzone):
 *  medido entre 419,5 e 423 conforme fonte e corpo (Arial 9 pt 423,1; 10 pt 421,9;
 *  11 pt 421,0; 12 pt 420,6; Calibri 11 pt 421,4; Times 11 pt 420,6; outros ≈ 420) */
export const HYPHEN_GAP15 = 421;
/** expansão relativa máxima dos espaços para a palavra descer em vez de hifenizar
 *  (modo 15 justificado, oráculo hyphzone) */
export const HYPHEN_EXPAND15 = 0.4868;

/** Mínimos de letras antes/depois do hífen no Word (oráculo hyphmin). */
export function hyphenMins(compat: number): [number, number] {
  return [2, compat >= 15 ? 3 : 2];
}

const LETTER = /^[\p{L}\p{M}]$/u;
const MARK = /^\p{M}$/u;

function langOf(ctx: DocContext, g: Glyph): string {
  return g.style.rpr.lang?.val ?? ctx.opts.lang;
}

function langAllowed(ctx: DocContext, lang: string): boolean {
  const list = ctx.opts.hyphenationLanguages;
  if (!list) return true;
  const l = lang.toLowerCase();
  return list.some((x) => { const y = x.toLowerCase(); return l === y || l.startsWith(`${y}-`); });
}

/** Idiomas (w:lang) do texto de um documento com hifenização automática — para o
 *  app carregar os padrões antes de diagramar (`loadHyphenation`). Vazio sem
 *  w:autoHyphenation. */
export function documentHyphenationLanguages(full: FullDocument, fallback = 'pt-BR'): string[] {
  const fmt = full.formatting;
  if (!fmt?.settings.autoHyphenation) return [];
  const out = new Set<string>([fmt.styles.docDefaults.rPr?.lang?.val ?? fallback]);
  const visit = (x: unknown): void => {
    if (!x || typeof x !== 'object') return;
    if (x instanceof Map) { for (const v of x.values()) visit(v); return; }
    if (Array.isArray(x)) { for (const y of x) visit(y); return; }
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      if (k === 'lang' && v && typeof v === 'object' && typeof (v as { val?: unknown }).val === 'string') out.add((v as { val: string }).val);
      else if (v && typeof v === 'object') visit(v);
    }
  };
  visit(fmt.styles.styles);
  visit(full.blocks);
  visit(full.sections);
  visit(full.footnoteBlocks);
  visit(full.endnoteBlocks);
  return [...out];
}

/**
 * Marca os pontos de hifenização automática (`hyph` = pode quebrar com hífen DEPOIS
 * deste glifo) nos trechos de letras do parágrafo.
 */
export function markHyphenation(ctx: DocContext, ppr: PPr, glyphs: Glyph[], skipRuns?: Set<number>): void {
  const s = ctx.fmt.settings;
  if (!s.autoHyphenation || ppr.suppressAutoHyphens || ctx.opts.hyphenation === false) return;
  const [left, right] = hyphenMins(s.compatibilityMode);
  for (let k = 0; k < glyphs.length;) {
    const g = glyphs[k]!;
    // (equações — skipRuns — não hifenizam)
    if (g.kind !== 'char' || !LETTER.test(g.ch) || MARK.test(g.ch) || skipRuns?.has(g.runIdx)) { k++; continue; }
    const lang = langOf(ctx, g);
    // trecho: letras do mesmo idioma; o hífen opcional fica dentro (o Word hifeniza a
    // palavra inteira e soma o ponto dele)
    const idx: number[] = [];
    let e = k;
    for (; e < glyphs.length; e++) {
      const q = glyphs[e]!;
      if (q.kind === 'shy') continue;
      if (q.kind !== 'char' || !LETTER.test(q.ch) || langOf(ctx, q) !== lang || skipRuns?.has(q.runIdx)) break;
      idx.push(e);
    }
    k = e;
    const rpr = g.style.rpr;
    if (rpr.noProof || rpr.cs || rpr.rtl || !langAllowed(ctx, lang)) continue;
    if (s.doNotHyphenateCaps && idx.every((j) => { const c = glyphs[j]!.ch; return c.toLowerCase() === c.toUpperCase() || c === c.toUpperCase(); })) continue;
    const h = hyphenatorFor(lang);
    if (!h) continue;
    // aglomerados letra + marcas combinantes → um código NFC (os padrões são NFC)
    const clusters: number[][] = [];
    for (const j of idx) {
      if (MARK.test(glyphs[j]!.ch) && clusters.length) clusters[clusters.length - 1]!.push(j);
      else clusters.push([j]);
    }
    if (clusters.length < left + right) continue;
    const word = clusters.map((c) => {
      const t = c.map((j) => glyphs[j]!.ch).join('');
      const n = t.normalize('NFC');
      return Array.from(n).length === 1 ? n : glyphs[c[0]!]!.ch;
    }).join('');
    for (const p of h.hyphenate(word, left, right)) {
      const c = clusters[p - 1]!;
      glyphs[c[c.length - 1]!]!.hyph = true;
    }
  }
}

/** Unidade (palavra até a próxima oportunidade de quebra) que não coube na linha. */
export interface HyphenUnit {
  /** índices [i, e) da unidade em para.glyphs */
  i: number;
  e: number;
  /** x do início da unidade e margem direita da linha (twips, relativos ao quadro) */
  x: number;
  right: number;
  /** a unidade abre a linha: não há para onde descer */
  lineStart: boolean;
  /** fim do conteúdo (sem espaços) no ponto de quebra anterior à unidade */
  contentEnd: number;
  justify: boolean;
  /** espaços que comprimem/expandem até a unidade (com o vão antes dela) e os que
   *  sobram se ela descer */
  spacesW: number;
  restW: number;
  nSpaces: number;
  /** linhas anteriores seguidas terminadas em hífen */
  hyphenRun: number;
}

export interface HyphenChoice {
  /** último glifo da linha (letra com `hyph` ou o próprio hífen opcional) */
  k: number;
  /** largura do hífen */
  w: number;
}

/** Pontos candidatos da unidade: automáticos (com ≥ 2 letras desde o início da
 *  unidade — a continuação de uma palavra partida na linha anterior conta do início da
 *  linha) e hífens opcionais (sem mínimos). */
export function hyphenCandidates(gs: Glyph[], i: number, e: number): number[] {
  const out: number[] = [];
  let letters = 0;
  for (let k = i; k < e - 1; k++) {
    const g = gs[k]!;
    if (g.kind === 'shy') { if (k > i) out.push(k); continue; }
    if (g.kind === 'char' && LETTER.test(g.ch) && !MARK.test(g.ch)) letters++;
    // ponto automático seguido do hífen opcional no mesmo lugar: fica o opcional
    if (g.hyph && gs[k + 1]?.kind !== 'shy' && letters >= 2) out.push(k);
  }
  return out;
}

/** zona padrão dos modos ≤ 14 sem w:hyphenationZone: a do Word pt-BR (0,75 cm) */
export const HYPHEN_ZONE_DEFAULT = 425;

/**
 * Escolhe onde hifenizar a unidade que não coube (ou null: ela desce inteira / quebra
 * por caractere). Regras do cabeçalho deste arquivo; além delas (oráculo hyphshy):
 *  - w:consecutiveHyphenLimit só conta (e só barra) os pontos AUTOMÁTICOS: linha que
 *    termina em hífen opcional zera a contagem, e ele vale mesmo no limite;
 *  - modos ≤ 14: o hífen opcional que cabe tem prioridade sobre os automáticos, sem a
 *    zona e sem a regra da letra seguinte.
 */
export function chooseHyphenation(ctx: DocContext, gs: Glyph[], u: HyphenUnit): HyphenChoice | null {
  const s = ctx.fmt.settings;
  let cands = hyphenCandidates(gs, u.i, u.e);
  const limit = s.consecutiveHyphenLimit ?? 0;
  if (limit > 0 && u.hyphenRun >= limit) cands = cands.filter((k) => gs[k]!.kind === 'shy');
  if (!cands.length) return null;
  const modern = s.compatibilityMode >= 15;
  const justify = u.justify && modern;
  const hyphenW = (k: number): number => advanceTwips(ctx, gs[k]!.face, 0x2d, gs[k]!.sizePt);
  // fim de cada pedaço (até o glifo k, sem o hífen)
  const ends: number[] = [];
  let x = u.x;
  let ci = 0;
  for (let k = u.i; k < u.e && ci < cands.length; k++) {
    const g = gs[k]!;
    if (g.kind !== 'shy') x += g.adv;
    if (k === cands[ci]) { ends.push(x); ci++; }
  }
  if (!modern) {
    // modos ≤ 14: hífen opcional que cabe (o maior) primeiro
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n]!;
      if (gs[k]!.kind === 'shy' && ends[n]! + hyphenW(k) - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    if (!u.lineStart && u.right - u.x < (s.hyphenationZone ?? HYPHEN_ZONE_DEFAULT) - 1e-3) return null;
    // automáticos: o pedaço com o hífen E a letra seguinte ao ponto têm de caber
    for (let n = cands.length - 1; n >= 0; n--) {
      const k = cands[n]!;
      if (gs[k]!.kind === 'shy') continue;
      let nx = k + 1;
      while (nx < u.e && (gs[nx]!.kind === 'shy' || (gs[nx]!.kind === 'obj' && gs[nx]!.adv === 0))) nx++;
      const end = Math.max(ends[n]! + hyphenW(k), ends[n]! + (nx < u.e ? gs[nx]!.adv : 0));
      if (end - u.right <= 1e-3) return { k, w: hyphenW(k) };
    }
    return null;
  }
  if (!u.lineStart) {
    if (justify) {
      const slack = u.right - u.contentEnd;
      if (u.restW > 0 && slack / u.restW <= HYPHEN_EXPAND15) return null;
    } else if (u.right - u.contentEnd < HYPHEN_GAP15) return null;
  }
  const fits = cands.map((k, n) => ends[n]! + hyphenW(k) - u.right);
  for (let n = cands.length - 1; n >= 0; n--) {
    const ov = fits[n]!;
    if (ov <= 1e-3) return { k: cands[n]!, w: hyphenW(cands[n]!) };
    if (!justify || u.nSpaces === 0) continue;
    // justificado (modo 15): comprime até 25% dos espaços, perdendo no máximo metade da
    // folga que o ponto anterior deixaria (oráculo hyphfit); o último ponto compara
    // com a palavra descer (regra do jsweep)
    const shrink = ctx.opts.justifyShrink;
    if (ov > shrink.ratio * u.spacesW + 0.0175) continue;
    if (n > 0) {
      // (+0,02 twip: quantização sub-twip do Word — medido entre 0,005 e 0,034)
      const slackPrev = -fits[n - 1]!;
      if (ov <= shrink.expandRatio * slackPrev + 0.02) return { k: cands[n]!, w: hyphenW(cands[n]!) };
    } else {
      const slack = u.right - u.contentEnd;
      if (u.lineStart || u.restW <= 0 || ov / u.spacesW <= (shrink.expandRatio * slack) / u.restW + 0.0075 * u.nSpaces / u.spacesW) return { k: cands[n]!, w: hyphenW(cands[n]!) };
    }
  }
  return null;
}
