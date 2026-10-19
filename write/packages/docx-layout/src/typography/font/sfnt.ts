/**
 * Parser mínimo de fontes SFNT (TTF/OTF) — só o necessário para layout:
 *   head  → unitsPerEm
 *   hhea  → ascender/descender/lineGap, numberOfHMetrics
 *   hmtx  → advance width por glifo
 *   cmap  → char → glyph id (formats 4 e 12)
 *   OS/2  → usWinAscent/usWinDescent, sTypoAscender/Descender/LineGap
 *
 * O app de referência calcula altura de linha a partir dessas tabelas; qual fórmula
 * exata ele usa é validado empiricamente contra o oráculo (word-lab).
 */

export interface FontMetrics {
  unitsPerEm: number;
  /** hhea */
  ascender: number;
  descender: number; // negativo
  lineGap: number;
  /** OS/2 */
  usWinAscent: number;
  usWinDescent: number; // positivo
  sTypoAscender: number;
  sTypoDescender: number;
  sTypoLineGap: number;
  /** OS/2 fsSelection (bit 7 = USE_TYPO_METRICS). */
  fsSelection: number;
  /** OS/2 ulCodePageRange1 (bits 17–21 = páginas de código do Leste Asiático). */
  codePageRange1?: number;
  /** OS/2 ySuperscriptYOffset (deslocamento do sobrescrito, unidades da fonte). */
  ySuperscriptYOffset?: number;
  /** OS/2 xAvgCharWidth (largura média dos caracteres, unidades da fonte) — a
   *  compressão de espaços do layout asiático dos modos ≤ 14 (docx-layout). */
  xAvgCharWidth?: number;
  /** OS/2 PANOSE (10 bytes): família, serifa, peso, proporção… — a classe da fonte
   *  (sem serifa / serifada / monoespaçada) escolhe a fonte de fallback do Word. */
  panose?: number[];
  /** post: posição (negativa = abaixo da baseline) e espessura do sublinhado. */
  underlinePosition: number;
  underlineThickness: number;
}

/** Camada de glifo colorido: glifo, cor RRGGBB (null = cor do texto) e opacidade. */
export interface ColorLayer { glyphId: number; color: string | null; alpha: number }

import { parseGposKern, gposKernInLatin, kernKey, type KernMap, type KernClass0 } from './gpos.js';
import { parseGsubLigatures, applyLigatures, type GsubLigatures } from './gsub.js';
import type { LayoutFont } from './layout-font.js';

export class SfntFont implements LayoutFont {
  private view: DataView;
  private tables = new Map<string, { offset: number; length: number }>();
  readonly metrics: FontMetrics;
  private numGlyphs: number;
  private numberOfHMetrics: number;
  private hmtxOffset: number;
  private cmapRanges: { start: number; end: number; mapper: (c: number) => number }[] = [];
  private advanceCache = new Map<number, number>();
  /** 'kern' registrada no script latino (ou DFLT) do GPOS — com ligaduras OpenType o
   *  Word só kerneia nesse caso; sem GPOS (só a tabela 'kern' legada): true */
  kernInLatin = true;

  constructor(bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;

    const numTables = v.getUint16(4);
    for (let i = 0; i < numTables; i++) {
      const p = 12 + i * 16;
      const tag = String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));
      this.tables.set(tag, { offset: v.getUint32(p + 8), length: v.getUint32(p + 12) });
    }

    const head = this.req('head');
    const hhea = this.req('hhea');
    const maxp = this.req('maxp');
    const os2 = this.req('OS/2');
    this.numGlyphs = v.getUint16(maxp.offset + 4);
    this.numberOfHMetrics = v.getUint16(hhea.offset + 34);
    this.hmtxOffset = this.req('hmtx').offset;

    this.metrics = {
      unitsPerEm: v.getUint16(head.offset + 18),
      ascender: v.getInt16(hhea.offset + 4),
      descender: v.getInt16(hhea.offset + 6),
      lineGap: v.getInt16(hhea.offset + 8),
      sTypoAscender: v.getInt16(os2.offset + 68),
      sTypoDescender: v.getInt16(os2.offset + 70),
      sTypoLineGap: v.getInt16(os2.offset + 72),
      usWinAscent: v.getUint16(os2.offset + 74),
      usWinDescent: v.getUint16(os2.offset + 76),
      fsSelection: v.getUint16(os2.offset + 62),
      ...(os2.length >= 86 && v.getUint16(os2.offset) >= 1 ? { codePageRange1: v.getUint32(os2.offset + 78) } : {}),
      ...(os2.length >= 26 ? { ySuperscriptYOffset: v.getInt16(os2.offset + 24) } : {}),
      ...(os2.length >= 4 ? { xAvgCharWidth: v.getInt16(os2.offset + 2) } : {}),
      ...(os2.length >= 42 ? { panose: Array.from({ length: 10 }, (_, i) => v.getUint8(os2.offset + 32 + i)) } : {}),
      underlinePosition: 0,
      underlineThickness: 0,
    };
    const post = this.tables.get('post');
    if (post && post.length >= 12) {
      this.metrics.underlinePosition = v.getInt16(post.offset + 8);
      this.metrics.underlineThickness = v.getInt16(post.offset + 10);
    }

    this.parseCmap();
    const gpos = this.tables.get('GPOS');
    if (gpos) {
      try {
        this.kernMap = parseGposKern(this.view, gpos.offset, this.kernClass0);
        this.kernInLatin = gposKernInLatin(this.view, gpos.offset);
      }
      catch { this.kernMap = new Map(); this.kernClass0.clear(); }
    } else this.kernMap = new Map();
    // sem pares no GPOS: tabela 'kern' legada (formato 0) — Tahoma, Arial Narrow…
    const kernT = this.tables.get('kern');
    if (this.kernMap.size === 0 && kernT) {
      try { this.parseLegacyKern(kernT.offset); } catch { /* tabela inválida: sem kerning */ }
    }
  }

  private kernMap: KernMap;
  /** PairPos formato 2: ajuste contra a classe 0 do 2º glifo, por 1º glifo */
  private kernClass0: KernClass0 = new Map();

  /** Tabela 'kern' (versão 0, subtabelas formato 0 horizontais). */
  private parseLegacyKern(off: number): void {
    const v = this.view;
    if (v.getUint16(off) !== 0) return;
    const n = v.getUint16(off + 2);
    let p = off + 4;
    for (let t = 0; t < n; t++) {
      const length = v.getUint16(p + 2);
      const coverage = v.getUint16(p + 4);
      const format = coverage >> 8;
      const horizontal = (coverage & 1) !== 0;
      const cross = (coverage & 4) !== 0;
      if (format === 0 && horizontal && !cross) {
        const pairs = v.getUint16(p + 6);
        for (let i = 0; i < pairs; i++) {
          const r = p + 14 + i * 6;
          const key = kernKey(v.getUint16(r), v.getUint16(r + 2));
          if (!this.kernMap.has(key)) this.kernMap.set(key, v.getInt16(r + 4));
        }
      }
      p += length;
    }
  }

  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O app de referência (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint: number, codePoint: number, sizePt: number): number {
    return this.kernGlyphsTwips(this.glyphId(prevCodePoint), this.glyphId(codePoint), sizePt);
  }

  /** Kerning do par de GLIFOS (g1→g2) em twips — para pares com glifo de ligadura. */
  kernGlyphsTwips(g1: number, g2: number, sizePt: number): number {
    // as tabelas só têm ids de 16 bits: fora disso a chave colidiria com outro par
    if (g1 > 0xffff || g2 > 0xffff) return 0;
    let units = this.kernMap.get(kernKey(g1, g2));
    if (units === undefined) {
      const c0 = this.kernClass0.get(g1);
      if (c0 && !c0.cd2.has(g2)) units = c0.adv;
    }
    if (!units) return 0;
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (units * deviceEmPt * 20) / this.metrics.unitsPerEm;
  }

  private gsub: GsubLigatures | null | undefined;

  /**
   * Ligaduras OpenType (GSUB, script latino) das features pedidas ('liga', 'clig',
   * 'dlig', 'hlig') sobre uma sequência de glifos: grupos {glifo, quantos glifos de
   * entrada cobre}; null se a fonte não tem nenhuma dessas ligaduras.
   */
  ligate(gids: number[], features: readonly string[]): { gid: number; len: number }[] | null {
    if (this.gsub === undefined) {
      const t = this.tables.get('GSUB');
      try { this.gsub = t ? parseGsubLigatures(this.view, t.offset) : null; } catch { this.gsub = null; }
    }
    const g = this.gsub;
    if (!g || !g.lookups.size || !features.some((f) => (g.features.get(f) ?? []).some((li) => g.lookups.has(li)))) return null;
    return applyLigatures(g, gids, features);
  }

  private req(tag: string) {
    const t = this.tables.get(tag);
    if (!t) throw new Error(`Tabela ${tag} ausente`);
    return t;
  }

  private parseCmap(): void {
    const v = this.view;
    const cmap = this.req('cmap');
    const n = v.getUint16(cmap.offset + 2);
    let best = -1;
    let bestScore = -1;
    for (let i = 0; i < n; i++) {
      const p = cmap.offset + 4 + i * 8;
      const platform = v.getUint16(p);
      const encoding = v.getUint16(p + 2);
      const offset = v.getUint32(p + 4);
      // Preferência: Windows UCS-4 (3,10) > Windows BMP (3,1) > Unicode >
      // Windows Symbol (3,0: Wingdings, Symbol — códigos U+F0xx) > Mac
      const score =
        platform === 3 && encoding === 10 ? 4 :
        platform === 3 && encoding === 1 ? 3 :
        platform === 0 ? 2 :
        platform === 3 && encoding === 0 ? 1 : 0;
      if (score > bestScore) { bestScore = score; best = cmap.offset + offset; }
    }
    if (best < 0) throw new Error('cmap sem subtabela utilizável');
    this.symbolCmap = bestScore === 1;

    const format = v.getUint16(best);
    if (format === 4) {
      const segCount = v.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = v.getUint16(endP + s * 2);
        const start = v.getUint16(startP + s * 2);
        const delta = v.getInt16(deltaP + s * 2);
        const rangeOffset = v.getUint16(rangeP + s * 2);
        const idP = rangeP + s * 2;
        this.cmapRanges.push({
          start, end,
          mapper: rangeOffset === 0
            ? (c) => (c + delta) & 0xffff
            : (c) => {
                const gp = idP + rangeOffset + (c - start) * 2;
                const g = v.getUint16(gp);
                return g === 0 ? 0 : (g + delta) & 0xffff;
              },
        });
      }
    } else if (format === 12) {
      const nGroups = v.getUint32(best + 12);
      for (let g = 0; g < nGroups; g++) {
        const p = best + 16 + g * 12;
        const start = v.getUint32(p);
        const end = v.getUint32(p + 4);
        const startGlyph = v.getUint32(p + 8);
        this.cmapRanges.push({ start, end, mapper: (c) => startGlyph + (c - start) });
      }
    } else {
      throw new Error(`cmap format ${format} não suportado`);
    }
    this.cmapRanges.sort((a, b) => a.start - b.start);
  }

  /** cmap Windows Symbol (3,0): os glifos ficam em U+F000+código */
  private symbolCmap = false;

  /** COLR v0 (registros base/camadas — o v1 os mantém) + CPAL; preparado sob demanda */
  private colr: { base: number; nBase: number; layers: number; nLayers: number; colors: number; firstColor: number; nColors: number } | null | undefined;

  private colrInfo() {
    if (this.colr !== undefined) return this.colr;
    this.colr = null;
    const t = this.tables.get('COLR'), cp = this.tables.get('CPAL');
    if (!t || !cp || t.length < 14 || cp.length < 14) return null;
    const v = this.view;
    try {
      const nBase = v.getUint16(t.offset + 2), bo = v.getUint32(t.offset + 4), lo = v.getUint32(t.offset + 8), nLayers = v.getUint16(t.offset + 12);
      if (!nBase || !bo || !lo) return null;
      this.colr = {
        base: t.offset + bo, nBase, layers: t.offset + lo, nLayers,
        colors: cp.offset + v.getUint32(cp.offset + 8), firstColor: v.getUint16(cp.offset + 12), nColors: v.getUint16(cp.offset + 2),
      };
    } catch { this.colr = null; }
    return this.colr;
  }

  hasColorGlyphs(): boolean {
    return this.colrInfo() !== null;
  }

  colorLayers(glyphId: number): ColorLayer[] | null {
    const c = this.colrInfo();
    if (!c) return null;
    const v = this.view;
    let lo = 0, hi = c.nBase - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, p = c.base + mid * 6, g = v.getUint16(p);
      if (g < glyphId) { lo = mid + 1; continue; }
      if (g > glyphId) { hi = mid - 1; continue; }
      const first = v.getUint16(p + 2), n = v.getUint16(p + 4);
      const out: ColorLayer[] = [];
      for (let k = 0; k < n && first + k < c.nLayers; k++) {
        const q = c.layers + (first + k) * 4;
        const pal = v.getUint16(q + 2);
        if (pal === 0xffff || pal >= c.nColors) { out.push({ glyphId: v.getUint16(q), color: null, alpha: 1 }); continue; }
        const r = c.colors + (c.firstColor + pal) * 4; // BGRA
        const hex = (o: number) => v.getUint8(r + o).toString(16).padStart(2, '0').toUpperCase();
        out.push({ glyphId: v.getUint16(q), color: hex(2) + hex(1) + hex(0), alpha: v.getUint8(r + 3) / 255 });
      }
      return out.length ? out : null;
    }
    return null;
  }

  glyphId(codePoint: number): number {
    const g = this.lookupGlyph(codePoint);
    // fonte de símbolo: o código de 8 bits também vale (U+F000 + código)
    if (g === 0 && this.symbolCmap && codePoint < 0x100) return this.lookupGlyph(codePoint + 0xf000);
    return g;
  }

  private lookupGlyph(codePoint: number): number {
    // busca binária nos ranges
    let lo = 0, hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = this.cmapRanges[mid]!;
      if (codePoint < r.start) hi = mid - 1;
      else if (codePoint > r.end) lo = mid + 1;
      else return r.mapper(codePoint);
    }
    return 0;
  }

  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId: number): number {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== undefined) return cached;
    const i = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w = this.view.getUint16(this.hmtxOffset + i * 4);
    this.advanceCache.set(glyphId, w);
    return w;
  }

  /** Tabela empírica de advances do app de referência (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  private advanceTable: Record<string, Record<string, number>> | null = null;

  setAdvanceTable(table: Record<string, Record<string, number>>): void {
    this.advanceTable = table;
  }

  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do app de referência; fallback: escala linear com o em
   *  arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt). */
  advanceTwips(codePoint: number, sizePt: number): number {
    if (this.advanceTable) {
      const t = this.advanceTable[String(sizePt)]?.[String.fromCodePoint(codePoint)];
      if (t !== undefined) return t;
    }
    const units = this.advanceWidth(this.glyphId(codePoint));
    const deviceEmPt = (Math.round((sizePt * 600) / 72) * 72) / 600;
    return (units * deviceEmPt * 20) / this.metrics.unitsPerEm;
  }

  private outlineCache = new Map<number, GlyphOutlineCmd[] | null>();

  /**
   * Contorno do glifo (TrueType `glyf`, glifos simples e compostos) em unidades
   * da fonte, y para CIMA: M/L/Q/Z. null se a fonte não tem `glyf` (CFF) ou o
   * glifo não existe. Usado para desenhar texto como curvas (WordArt no PDF,
   * como o Word faz).
   */
  glyphOutline(glyphId: number): GlyphOutlineCmd[] | null {
    if (this.outlineCache.has(glyphId)) return this.outlineCache.get(glyphId)!;
    let out: GlyphOutlineCmd[] | null = null;
    try {
      const pts = this.glyphContours(glyphId, 0);
      out = pts ? contoursToPath(pts) : null;
    } catch {
      out = null;
    }
    this.outlineCache.set(glyphId, out);
    return out;
  }

  /** Contornos (pontos com on/off curve) de um glifo, compostos resolvidos. */
  private glyphContours(gid: number, depth: number): { x: number; y: number; on: boolean }[][] | null {
    const glyf = this.tables.get('glyf'), loca = this.tables.get('loca'), head = this.tables.get('head'), maxp = this.tables.get('maxp');
    if (!glyf || !loca || !head || !maxp || depth > 8) return null;
    const v = this.view;
    const numGlyphs = v.getUint16(maxp.offset + 4);
    if (gid < 0 || gid >= numGlyphs) return null;
    const longLoca = v.getInt16(head.offset + 50) === 1;
    const at = (i: number) => (longLoca ? v.getUint32(loca.offset + i * 4) : v.getUint16(loca.offset + i * 2) * 2);
    const start = at(gid), end = at(gid + 1);
    if (end <= start) return []; // glifo vazio (espaço)
    const p0 = glyf.offset + start;
    const nContours = v.getInt16(p0);
    if (nContours >= 0) {
      let p = p0 + 10;
      const ends: number[] = [];
      for (let i = 0; i < nContours; i++) { ends.push(v.getUint16(p)); p += 2; }
      const nPts = nContours ? ends[nContours - 1]! + 1 : 0;
      p += 2 + v.getUint16(p); // instruções
      const flags: number[] = [];
      while (flags.length < nPts) {
        const f = v.getUint8(p++);
        flags.push(f);
        if (f & 8) { let rep = v.getUint8(p++); while (rep-- > 0 && flags.length < nPts) flags.push(f); }
      }
      const xs: number[] = [], ys: number[] = [];
      let x = 0;
      for (const f of flags) {
        if (f & 2) { const d = v.getUint8(p++); x += f & 16 ? d : -d; }
        else if (!(f & 16)) { x += v.getInt16(p); p += 2; }
        xs.push(x);
      }
      let y = 0;
      for (const f of flags) {
        if (f & 4) { const d = v.getUint8(p++); y += f & 32 ? d : -d; }
        else if (!(f & 32)) { y += v.getInt16(p); p += 2; }
        ys.push(y);
      }
      const contours: { x: number; y: number; on: boolean }[][] = [];
      let s = 0;
      for (const e of ends) {
        const c: { x: number; y: number; on: boolean }[] = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i]!, y: ys[i]!, on: (flags[i]! & 1) === 1 });
        contours.push(c);
        s = e + 1;
      }
      return contours;
    }
    // composto
    const all: { x: number; y: number; on: boolean }[][] = [];
    let p = p0 + 10;
    for (let guard = 0; guard < 64; guard++) {
      const flags = v.getUint16(p), comp = v.getUint16(p + 2);
      p += 4;
      let dx = 0, dy = 0;
      if (flags & 1) { dx = v.getInt16(p); dy = v.getInt16(p + 2); p += 4; }
      else { dx = v.getInt8(p); dy = v.getInt8(p + 1); p += 2; }
      if (!(flags & 2)) { dx = 0; dy = 0; } // casamento de pontos (raro): ignora
      let a = 1, b = 0, c = 0, d = 1;
      const f2 = (o: number) => v.getInt16(o) / 16384;
      if (flags & 8) { a = d = f2(p); p += 2; }
      else if (flags & 0x40) { a = f2(p); d = f2(p + 2); p += 4; }
      else if (flags & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
      const sub = this.glyphContours(comp, depth + 1);
      if (sub) for (const ct of sub) all.push(ct.map((q) => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
      if (!(flags & 0x20)) break;
    }
    return all;
  }
}

/** Comando de contorno de glifo (unidades da fonte, y para cima). */
export type GlyphOutlineCmd =
  | { op: 'M' | 'L'; x: number; y: number }
  | { op: 'Q'; cx: number; cy: number; x: number; y: number }
  | { op: 'Z' };

/** Pontos TrueType (on/off curve) → M/L/Q/Z (pontos "on" implícitos no meio de dois "off"). */
function contoursToPath(contours: { x: number; y: number; on: boolean }[][]): GlyphOutlineCmd[] {
  const out: GlyphOutlineCmd[] = [];
  for (const c of contours) {
    const n = c.length;
    if (n < 2) continue;
    // começa num ponto "on" (ou no meio de dois "off")
    let startIdx = c.findIndex((q) => q.on);
    let start: { x: number; y: number };
    if (startIdx < 0) { start = { x: (c[0]!.x + c[1]!.x) / 2, y: (c[0]!.y + c[1]!.y) / 2 }; startIdx = 0; }
    else start = c[startIdx]!;
    out.push({ op: 'M', x: start.x, y: start.y });
    let ctrl: { x: number; y: number } | null = null;
    for (let k = 1; k <= n; k++) {
      const q = c[(startIdx + k) % n]!;
      if (q.on) {
        if (ctrl) { out.push({ op: 'Q', cx: ctrl.x, cy: ctrl.y, x: q.x, y: q.y }); ctrl = null; }
        else out.push({ op: 'L', x: q.x, y: q.y });
      } else if (ctrl) {
        const mid = { x: (ctrl.x + q.x) / 2, y: (ctrl.y + q.y) / 2 };
        out.push({ op: 'Q', cx: ctrl.x, cy: ctrl.y, x: mid.x, y: mid.y });
        ctrl = q;
      } else ctrl = q;
    }
    if (ctrl) out.push({ op: 'Q', cx: ctrl.x, cy: ctrl.y, x: start.x, y: start.y });
    out.push({ op: 'Z' });
  }
  return out;
}
