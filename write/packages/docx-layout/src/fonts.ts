import type { LayoutFont } from '@universal-office/layout';

/**
 * Fontes do motor: o HOST resolve família+variante → face (métricas + bytes
 * para embutir). O motor aplica a substituição do Word para famílias ausentes
 * e mede com as regras observadas no oráculo (tools/layout-oracle):
 *
 *  - métricas verticais do DirectWrite: com OS/2.fsSelection bit 7
 *    (USE_TYPO_METRICS) valem as typo (asc/desc/lineGap); senão win
 *    ascent/descent e gap = max(0, total hhea − total win), posto ACIMA;
 *  - altura "simples" = (asc + desc + gap) × tamanho NOMINAL (não o em de
 *    dispositivo); baseline a (gap + asc) do topo da linha.
 */

export interface FontFace {
  /** chave única (família efetiva + variante) — identifica a face no PDF. */
  key: string;
  /** família EFETIVA (após substituição). */
  family: string;
  font: LayoutFont;
  /** bytes sfnt para embutir no PDF (ausente: não embutível). */
  bytes?: Uint8Array;
  bold: boolean;
  italic: boolean;
  /** negrito/itálico SINTÉTICO (a família não tem a variante). */
  synthBold?: boolean;
  synthItalic?: boolean;
}

export interface FontProvider {
  /** Face da família (nome como no documento) ou null se a família não existe. */
  face(family: string, bold: boolean, italic: boolean): FontFace | null;
}

export interface FaceMetrics {
  /** frações do em */
  ascent: number;
  descent: number;
  lineHeight: number;
  /** sublinhado (post table) — frações do em; positivo = abaixo da baseline */
  underlinePos: number;
  underlineThick: number;
  /** ascendente SEM o espaço entre linhas (ascent = este + gap) */
  bareAscent: number;
  /** OS/2 ySuperscriptYOffset (fração do em), se a fonte o tem */
  supOffset?: number;
}

const metricsCache = new WeakMap<LayoutFont, FaceMetrics>();

export function faceMetrics(font: LayoutFont): FaceMetrics {
  let m = metricsCache.get(font);
  if (!m) {
    const fm = font.metrics;
    const u = fm.unitsPerEm || 1000;
    const hheaTotal = fm.ascender - fm.descender + fm.lineGap;
    let asc: number, desc: number, gap: number;
    if ((fm.fsSelection ?? 0) & 0x80) {
      asc = fm.sTypoAscender; desc = -fm.sTypoDescender; gap = fm.sTypoLineGap;
    } else if (fm.usWinAscent > 0 || fm.usWinDescent > 0) {
      asc = fm.usWinAscent; desc = fm.usWinDescent; gap = Math.max(0, hheaTotal - (asc + desc));
    } else {
      asc = fm.ascender; desc = -fm.descender; gap = fm.lineGap;
    }
    // fonte do Leste Asiático (página de código JIS/GB/Wansung/Big5/Johab no OS/2):
    // o Word dá à linha ≈1,3 × (ascendente + descendente) — 15% em cima e 15%
    // embaixo, em unidades inteiras da fonte (MS Gothic: 220+38 / 36+38) — sem o
    // lineGap (oráculo vmea)
    if (((fm.codePageRange1 ?? 0) >>> 17) & 0x1f) {
      const extra = Math.round(0.15 * (asc + desc));
      asc += extra; desc += extra; gap = 0;
    }
    const lineHeight = (asc + desc + gap) / u;
    m = {
      ascent: (gap + asc) / u,
      descent: desc / u,
      lineHeight,
      underlinePos: fm.underlinePosition ? -fm.underlinePosition / u : 0.1,
      underlineThick: fm.underlineThickness > 0 ? fm.underlineThickness / u : 0.05,
      bareAscent: asc / u,
      ...(fm.ySuperscriptYOffset && fm.ySuperscriptYOffset > 0 ? { supOffset: fm.ySuperscriptYOffset / u } : {}),
    };
    metricsCache.set(font, m);
  }
  return m;
}

/**
 * Elevação do sobrescrito (pt), medida no Word em 10 fontes de 6 a 24pt (oráculo
 * supraise): o topo da ascendente do sobrescrito encosta no da linha base —
 * asc(linha)·corpo − asc·corpo_sobrescrito — limitado pelo ySuperscriptYOffset
 * da fonte; os dois em meios pontos.
 */
/**
 * Sobrescrito e subscrito MEDIDOS no Word (oráculo supraise): elevação e queda em meios
 * pontos (um dígito base 36 por corpo, de 6 a 24pt de meio em meio ponto). Só a fonte do
 * PRÓPRIO run e o corpo contam — não a fonte do texto ao redor nem a posição na página — e
 * nenhum arredondamento das métricas (ascendente, OS/2, TEXTMETRIC do GDI) reproduz os
 * valores: fora da tabela, a fórmula abaixo (e 8% do corpo no subscrito). Calibri Light
 * mede igual à Calibri.
 */
const VERT_TABLE: Record<string, [string, string]> = {
  'arial': ['5555666767878999aabbbcccdcdeeefffgggh', '1111221112221222222322233322333344434'],
  'calibri': ['5544555677888999aabbabbbcccdddeeefffg', '1221122212222322233333334434444544455'],
  'courier new': ['35445556567667778899999aababbccccdddd', '1221122222222322333233344434445444555'],
  'segoe ui': ['4556666778989aaabbccbddceeefffggghhhi', '1121112221222232223333333344334445444'],
  'times new roman': ['4555666777899999aabbbcccddeffefffgggh', '1112211222222222322233323233333333344'],
  'tahoma': ['4555666777888999aabbbcccdddeeefffgggh', '0111122211222212222223222333323333444'],
  'verdana': ['4555666777888999aabbbcccdddeeefffgggh', '0111112211222232222233222333223333444'],
  'cambria': ['333444455556666777788889999aaaabbbbcc', '1111111112221222222222333323333333344'],
  'georgia': ['334444555666677778888999aaaabbbbccccd', '1111111122221222222222333322333333333'],
  'century gothic': ['3344445555666677788889999aaaabbbbcccc', '1111111111122212222222222233333333333'],
};
const VERT_ALIAS: Record<string, string> = { 'calibri light': 'calibri' };

function vertTable(family: string, base: number, k: 0 | 1): number | undefined {
  const f = family.toLowerCase();
  const key = Object.hasOwn(VERT_ALIAS, f) ? VERT_ALIAS[f]! : f;
  const t = Object.hasOwn(VERT_TABLE, key) ? VERT_TABLE[key]![k] : undefined;
  const i = (base - 6) * 2;
  if (!t || !Number.isInteger(i) || i < 0 || i >= t.length) return undefined;
  return parseInt(t[i]!, 36) / 2;
}

/** Elevação do sobrescrito (pt) da fonte do run: tabela medida, senão a fórmula. */
export function superscriptRaiseFor(family: string, m: FaceMetrics, base: number, sup: number): number {
  return vertTable(family, base, 0) ?? superscriptRaisePt(m, base, sup);
}

/** Queda do subscrito (pt) da fonte do run: tabela medida, senão 8% do corpo. */
export function subscriptDropPt(family: string, base: number): number {
  return vertTable(family, base, 1) ?? base * 0.08;
}

export function superscriptRaisePt(m: FaceMetrics, base: number, sup: number): number {
  const half = (v: number) => Math.floor(v * 2 + 0.5) / 2;
  const align = half(m.ascent * base - m.bareAscent * sup);
  return m.supOffset !== undefined ? Math.min(half(m.supOffset * base), align) : align;
}

/** em arredondado ao pixel de 600 dpi (o Word mede LARGURAS nesse em). */
export function deviceEmPt(sizePt: number): number {
  return (Math.round((sizePt * 600) / 72) * 72) / 600;
}

// ───────────────────────── substituição de fontes ─────────────────────────

/** Substitutas que o Windows/Word aplicam (FontSubstitutes + nomes PostScript). */
/** Valor PRÓPRIO de um registro (nomes de fonte vindos do arquivo não herdam de Object.prototype). */
const own = <T>(rec: Record<string, T> | undefined, k: string | undefined): T | undefined =>
  rec && k !== undefined && Object.hasOwn(rec, k) ? rec[k] : undefined;

const ALIASES: Record<string, string> = {
  helvetica: 'Arial', 'helvetica neue': 'Arial', arialmt: 'Arial', 'arial mt': 'Arial', 'ms sans serif': 'Microsoft Sans Serif',
  'tms rmn': 'Times New Roman', times: 'Times New Roman', 'times roman': 'Times New Roman', timesnewromanpsmt: 'Times New Roman',
  'ms serif': 'Times New Roman', courier: 'Courier New', 'courier newpsmt': 'Courier New', couriernewpsmt: 'Courier New',
  'ms shell dlg': 'Microsoft Sans Serif', 'ms shell dlg 2': 'Tahoma', 'arial unicode ms': 'Arial',
  symbolmt: 'Symbol', 'wingdings-regular': 'Wingdings', 'zapfdingbats': 'Wingdings',
};

/** "Arial-BoldMT", "Calibri-Italic", "Verdana-Bold" → família + variante. */
export function parsePostScriptName(name: string): { family: string; bold?: boolean; italic?: boolean } | null {
  const m = /^([A-Za-z][A-Za-z0-9 ]*?)[-,](Bold|BoldMT|Italic|ItalicMT|BoldItalic|BoldItalicMT|Regular|MT|Roman|BoldOblique|Oblique|Light|Semibold)$/.exec(name);
  if (!m) return null;
  const fam = m[1]!.replace(/MT$/, '').replace(/PS$/, '');
  const st = m[2]!.toLowerCase();
  return {
    family: fam.replace(/([a-z])([A-Z])/g, '$1 $2'),
    bold: st.includes('bold') || undefined,
    italic: st.includes('italic') || st.includes('oblique') || undefined,
  };
}

export interface FontTableInfo {
  altName?: string;
  family?: string;
  panose1?: string;
  pitch?: string;
  charset?: string;
  /** w:sig (usb0..3, csb0..1, hex) */
  sig?: Record<string, string>;
}

/** Família padrão do Word para uma família de fonte genérica do fontTable. */
function genericFor(info: FontTableInfo | undefined): string {
  switch (info?.family) {
    case 'roman': return 'Times New Roman';
    case 'modern': return 'Courier New';
    case 'script': return 'Times New Roman';
    case 'decorative': return 'Times New Roman';
    case 'swiss': return 'Arial';
    default: {
      // PANOSE: byte 0 = família (2 = texto latino), byte 1 = serifa (11-13 = sans)
      const p = info?.panose1;
      if (p && p.length >= 4) {
        const serif = parseInt(p.slice(2, 4), 16);
        if (serif >= 11 && serif <= 13) return 'Arial';
        if (serif > 0 && serif < 11) return 'Times New Roman';
      }
      return 'Times New Roman';
    }
  }
}

/** Fonte que o Word põe no lugar de uma família ausente com conjunto de caracteres
 *  do Leste Asiático no fontTable: [sem serifa, serifada] (oráculo altname). */
const CJK_DEFAULT: Record<string, [string, string]> = {
  '80': ['Yu Gothic', 'Yu Gothic'],
  '81': ['Dotum', 'Batang'],
  '86': ['Microsoft YaHei', 'SimSun'],
  '88': ['Microsoft JhengHei', 'PMingLiU'],
};

/** Resolve a face com a cadeia de substituição do Word; nunca devolve null
 *  se o provedor tiver ALGUMA das fontes padrão. */
export class FaceResolver {
  private cache = new Map<string, FontFace>();
  constructor(
    private provider: FontProvider,
    private fontTable: Record<string, FontTableInfo> = {},
    private fallbacks: string[] = ['Times New Roman', 'Arial', 'Liberation Serif', 'Liberation Sans'],
    /** fonte padrão do documento (docDefaults/tema): o Word a usa no lugar de
     *  uma família ausente sem altName (medido: "Inter" → Calibri) */
    private docDefault?: string,
  ) {}

  get(family: string | undefined, bold: boolean, italic: boolean): FontFace {
    const fam = (family ?? '').trim() || 'Times New Roman';
    const key = `${fam.toLowerCase()}|${bold ? 1 : 0}${italic ? 1 : 0}`;
    let f = this.cache.get(key);
    if (!f) {
      f = this.lookup(fam, bold, italic);
      this.cache.set(key, f);
    }
    return f;
  }

  private lookup(fam: string, bold: boolean, italic: boolean): FontFace {
    const tries: { family: string; bold: boolean; italic: boolean }[] = [{ family: fam, bold, italic }];
    const alias = own(ALIASES, fam.toLowerCase());
    const info0 = own(this.fontTable, fam);
    // conjunto de caracteres do Leste Asiático no fontTable: a fonte padrão da escrita
    // (sem serifa × serifada) — antes do mapeamento próprio do Word; o altName só vale
    // para família que o Word não conhece (oráculo altname, sessão nova do Word)
    const cjk = CJK_DEFAULT[info0?.charset?.toUpperCase() ?? '']?.[info0?.family === 'roman' ? 1 : 0];
    if (cjk) {
      if (!alias && info0?.altName) for (const alt of info0.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
      tries.push({ family: cjk, bold, italic });
    }
    if (alias) tries.push({ family: alias, bold, italic });
    const ps = parsePostScriptName(fam);
    if (ps) {
      const a2 = own(ALIASES, ps.family.toLowerCase()) ?? ps.family;
      tries.push({ family: a2, bold: bold || !!ps.bold, italic: italic || !!ps.italic });
    }
    const info = own(this.fontTable, fam);
    if (info?.altName) for (const alt of info.altName.split(/[,;]/)) tries.push({ family: alt.trim(), bold, italic });
    const symbolic = info?.charset === '02' || info?.family === 'decorative';
    // família ausente sem altName (oráculo fontsub, independe do padrão do
    // documento e do tema): serifada (roman) ou fora do fontTable → Cambria;
    // swiss/auto/modern → Calibri
    if (!symbolic) {
      // assinatura (w:sig) com o bloco árabe: o mapeador de fontes escolhe uma fonte
      // com árabe — Arial (sem serifa/auto) ou Sakkal Majalla (serifada) (oráculo fontsubmark)
      const arabic = info?.sig?.usb0 ? (parseInt(info.sig.usb0, 16) & (1 << 13)) !== 0 : false;
      if (arabic) tries.push({ family: info?.family === 'roman' ? 'Sakkal Majalla' : 'Arial', bold, italic });
      else tries.push({ family: !info || info.family === 'roman' ? 'Cambria' : 'Calibri', bold, italic });
    }
    void this.docDefault;
    tries.push({ family: genericFor(info), bold, italic });
    for (const fb of this.fallbacks) tries.push({ family: fb, bold, italic });
    for (const t of tries) {
      if (!t.family) continue;
      const face = this.provider.face(t.family, t.bold, t.italic);
      if (face) return face;
    }
    throw new Error(`nenhuma fonte disponível para "${fam}"`);
  }
}

/** Face embutida no documento (word/fonts, já desofuscada). */
export interface EmbeddedFace {
  family: string;
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic';
  data: Uint8Array;
}

/**
 * Provedor que consulta primeiro as fontes EMBUTIDAS no documento (o Word as
 * usa quando a família não está instalada — e mesmo quando está, salvo
 * subconjunto) e depois o provedor do host.
 */
export function withEmbeddedFonts(
  provider: FontProvider, embedded: EmbeddedFace[], makeFont: (bytes: Uint8Array) => LayoutFont,
): FontProvider {
  if (!embedded.length) return provider;
  const byFam = new Map<string, Map<string, { font: LayoutFont; bytes: Uint8Array }>>();
  for (const e of embedded) {
    try {
      const font = makeFont(e.data);
      const m = byFam.get(e.family.toLowerCase()) ?? new Map();
      m.set(e.variant, { font, bytes: e.data });
      byFam.set(e.family.toLowerCase(), m);
    } catch { /* fonte embutida ilegível: ignora */ }
  }
  const cache = new Map<string, FontFace | null>();
  return {
    face(family: string, bold: boolean, italic: boolean): FontFace | null {
      const fam = byFam.get(family.toLowerCase());
      if (!fam) return provider.face(family, bold, italic);
      const key = `${family.toLowerCase()}|${bold}|${italic}`;
      if (cache.has(key)) return cache.get(key)!;
      const want = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
      const order = [want, bold ? 'bold' : 'regular', italic ? 'italic' : 'regular', 'regular', 'bold', 'italic', 'boldItalic'];
      let out: FontFace | null = null;
      for (const v of order) {
        const f = fam.get(v);
        if (!f) continue;
        const fb = v === 'bold' || v === 'boldItalic', fi = v === 'italic' || v === 'boldItalic';
        out = {
          key: `embed:${family}|${v}`, family, font: f.font, bytes: f.bytes, bold, italic,
          ...(bold && !fb ? { synthBold: true } : {}),
          ...(italic && !fi ? { synthItalic: true } : {}),
        };
        break;
      }
      // variante pedida não embutida mas a família existe no sistema: prefere o sistema
      if (out && (out.synthBold || out.synthItalic)) out = provider.face(family, bold, italic) ?? out;
      cache.set(key, out);
      return out;
    },
  };
}
