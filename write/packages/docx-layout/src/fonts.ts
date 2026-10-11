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
    const lineHeight = (asc + desc + gap) / u;
    m = {
      ascent: (gap + asc) / u,
      descent: desc / u,
      lineHeight,
      underlinePos: fm.underlinePosition ? -fm.underlinePosition / u : 0.1,
      underlineThick: fm.underlineThickness > 0 ? fm.underlineThickness / u : 0.05,
    };
    metricsCache.set(font, m);
  }
  return m;
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
    if (!symbolic) tries.push({ family: !info || info.family === 'roman' ? 'Cambria' : 'Calibri', bold, italic });
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
