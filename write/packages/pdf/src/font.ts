import { ByteBuilder, utf16beHex } from './bytes.js';
import { subsetTrueType } from './subset.js';
import type { PdfWriter } from './writer.js';

/**
 * O mínimo que o gerador de PDF precisa saber de um programa de fonte TrueType.
 * A SfntFont do @universal-office/layout satisfaz esta interface estruturalmente, então
 * o pacote de PDF não depende dela — só dos bytes + estas consultas.
 */
export interface FontProgram {
  /** unitsPerEm da tabela head. */
  unitsPerEm: number;
  /** glyph id de um code point Unicode (0 se ausente). */
  glyphId(codePoint: number): number;
  /** advance width de um glifo em unidades de fonte. */
  advanceWidth(glyphId: number): number;
  /** opcional: caixa da fonte em unidades de fonte (head.xMin..yMax). */
  fontBBox?: [number, number, number, number];
  /** opcional: ascent/descent em unidades de fonte (senão derivado). */
  ascender?: number;
  descender?: number;
  italicAngle?: number;
}

/**
 * Fonte TrueType embutida como Type0/CIDFontType2 com encoding Identity-H
 * (CID = GID). Rastreia os glifos usados para emitir /W e o CMap ToUnicode
 * (texto pesquisável/copiável). Os outlines vêm do FontFile2 embutido, então o
 * render é fiel independentemente das métricas do descriptor.
 */
export class EmbeddedFont {
  /** Recurso usado no content stream (ex.: "F0"). */
  readonly resourceName: string;
  private used = new Map<number, number>(); // gid -> codePoint (para ToUnicode)
  /** fonte Symbol (codificação própria na área privada) */
  private get isSymbolFont(): boolean {
    return /^(?:[A-Z]{6}\+)?Symbol(?:MT)?$/i.test(this.baseName.replace(/[\s,-]+/g, ''));
  }
  private scale: number;

  constructor(
    readonly index: number,
    private readonly baseName: string,
    private readonly bytes: Uint8Array,
    private readonly program: FontProgram,
  ) {
    this.resourceName = `F${index}`;
    this.scale = 1000 / program.unitsPerEm;
  }

  /** Mapeia um code point para (gid, advance em unidades de fonte) e registra uso. */
  encode(codePoint: number): { gid: number; advanceWidth: number } {
    // Identity-H tem 2 bytes por glifo: id fora de 0..0xFFFF (fonte/cmap inválido) vira .notdef
    const g0 = this.program.glyphId(codePoint);
    const gid = g0 >= 0 && g0 <= 0xffff ? g0 : 0;
    if (!this.used.has(gid)) this.used.set(gid, codePoint);
    return { gid, advanceWidth: this.program.advanceWidth(gid) };
  }

  /** Largura em milésimos de em (espaço de texto do PDF) de um glifo. */
  widthThousandths(gid: number): number {
    return Math.round(this.program.advanceWidth(gid) * this.scale);
  }

  private psName(): string {
    // BaseFont não pode ter espaços; mantém ASCII.
    return this.baseName.replace(/[^A-Za-z0-9+\-]/g, '');
  }

  /** Emite o grafo de objetos da fonte e retorna o número do objeto Type0. */
  write(w: PdfWriter): number {
    const name = this.psName();
    const um = this.program.unitsPerEm;
    const asc = Math.round((this.program.ascender ?? um * 0.8) * this.scale);
    const desc = Math.round((this.program.descender ?? -um * 0.2) * this.scale);
    const bbox = this.program.fontBBox
      ? this.program.fontBBox.map((v) => Math.round(v * this.scale))
      : [-200, desc, 1200, asc];
    const italic = this.program.italicAngle ?? 0;
    // 4 = símbolo? não. 32 = não-simbólica (texto Latin). bit 7 (64) se itálica.
    const flags = 32 | (italic !== 0 ? 64 : 0);

    // FontFile2: programa TrueType com SUBSET (só glifos usados) — reduz de ~1MB
    // para dezenas de KB. /Length1 = tamanho descomprimido do subset.
    const gids = [...this.used.keys()].sort((a, b) => a - b);
    const subset = subsetTrueType(this.bytes, gids);
    const fontFile = w.addStream(`/Length1 ${subset.length}`, subset);

    const descriptor = w.addDict(
      `<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} ` +
        `/FontBBox [${bbox.join(' ')}] /ItalicAngle ${italic} ` +
        `/Ascent ${asc} /Descent ${desc} /CapHeight ${asc} /StemV 80 ` +
        `/FontFile2 ${fontFile} 0 R >>`,
    );

    // /W: largura por glifo usado, em milésimos de em
    const wParts: string[] = [];
    for (const gid of gids) wParts.push(`${gid} [${this.widthThousandths(gid)}]`);

    const cidFont = w.addDict(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} ` +
        `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
        `/FontDescriptor ${descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 ` +
        `/W [${wParts.join(' ')}] >>`,
    );

    const toUnicode = w.addStream('', this.buildToUnicode(gids));

    return w.addDict(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H ` +
        `/DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`,
    );
  }

  /** CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode. */
  private buildToUnicode(gids: number[]): Uint8Array {
    const b = new ByteBuilder();
    b.str(
      '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
        '/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
        '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n',
    );
    for (let i = 0; i < gids.length; i += 100) {
      const chunk = gids.slice(i, i + 100);
      b.str(`${chunk.length} beginbfchar\n`);
      for (const gid of chunk) {
        const cp0 = this.used.get(gid)!;
        // fonte Symbol (área privada F020–F0FF): o Word grava o caractere Unicode da
        // codificação Symbol (• − α ≤ …); nas demais (Wingdings…) fica o código privado
        const sym = this.isSymbolFont && cp0 >= 0xf020 && cp0 <= 0xf0ff ? SYMBOL_UNICODE[cp0 - 0xf000] : undefined;
        const cp = sym ?? cp0;
        b.str(`<${gid.toString(16).padStart(4, '0')}> <${utf16beHex(String.fromCodePoint(cp))}>\n`);
      }
      b.str('endbfchar\n');
    }
    b.str('endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n');
    return b.toUint8Array();
  }
}

/** Codificação da fonte Symbol (código 0x20–0xFE) → Unicode (tabela da Adobe). */
const SYMBOL_UNICODE: Record<number, number> = (() => {
  const t: Record<number, number> = {};
  for (let c = 0x20; c <= 0x7e; c++) t[c] = c;
  const map: [number, number][] = [
    [0x22, 0x2200], [0x24, 0x2203], [0x27, 0x220b], [0x2a, 0x2217], [0x2d, 0x2212], [0x40, 0x2245],
    [0x41, 0x391], [0x42, 0x392], [0x43, 0x3a7], [0x44, 0x394], [0x45, 0x395], [0x46, 0x3a6], [0x47, 0x393], [0x48, 0x397],
    [0x49, 0x399], [0x4a, 0x3d1], [0x4b, 0x39a], [0x4c, 0x39b], [0x4d, 0x39c], [0x4e, 0x39d], [0x4f, 0x39f], [0x50, 0x3a0],
    [0x51, 0x398], [0x52, 0x3a1], [0x53, 0x3a3], [0x54, 0x3a4], [0x55, 0x3a5], [0x56, 0x3c2], [0x57, 0x3a9], [0x58, 0x39e],
    [0x59, 0x3a8], [0x5a, 0x396], [0x5c, 0x2234], [0x5e, 0x22a5], [0x60, 0x203e],
    [0x61, 0x3b1], [0x62, 0x3b2], [0x63, 0x3c7], [0x64, 0x3b4], [0x65, 0x3b5], [0x66, 0x3c6], [0x67, 0x3b3], [0x68, 0x3b7],
    [0x69, 0x3b9], [0x6a, 0x3d5], [0x6b, 0x3ba], [0x6c, 0x3bb], [0x6d, 0x3bc], [0x6e, 0x3bd], [0x6f, 0x3bf], [0x70, 0x3c0],
    [0x71, 0x3b8], [0x72, 0x3c1], [0x73, 0x3c3], [0x74, 0x3c4], [0x75, 0x3c5], [0x76, 0x3d6], [0x77, 0x3c9], [0x78, 0x3be],
    [0x79, 0x3c8], [0x7a, 0x3b6], [0x7e, 0x223c],
    [0xa0, 0x20ac], [0xa1, 0x3d2], [0xa2, 0x2032], [0xa3, 0x2264], [0xa4, 0x2044], [0xa5, 0x221e], [0xa6, 0x192], [0xa7, 0x2663],
    [0xa8, 0x2666], [0xa9, 0x2665], [0xaa, 0x2660], [0xab, 0x2194], [0xac, 0x2190], [0xad, 0x2191], [0xae, 0x2192], [0xaf, 0x2193],
    [0xb0, 0xb0], [0xb1, 0xb1], [0xb2, 0x2033], [0xb3, 0x2265], [0xb4, 0xd7], [0xb5, 0x221d], [0xb6, 0x2202], [0xb7, 0x2022],
    [0xb8, 0xf7], [0xb9, 0x2260], [0xba, 0x2261], [0xbb, 0x2248], [0xbc, 0x2026], [0xbf, 0x21b5],
    [0xc0, 0x2135], [0xc1, 0x2111], [0xc2, 0x211c], [0xc3, 0x2118], [0xc4, 0x2297], [0xc5, 0x2295], [0xc6, 0x2205], [0xc7, 0x2229],
    [0xc8, 0x222a], [0xc9, 0x2283], [0xca, 0x2287], [0xcb, 0x2284], [0xcc, 0x2282], [0xcd, 0x2286], [0xce, 0x2208], [0xcf, 0x2209],
    [0xd0, 0x2220], [0xd1, 0x2207], [0xd2, 0xae], [0xd3, 0xa9], [0xd4, 0x2122], [0xd5, 0x220f], [0xd6, 0x221a], [0xd7, 0x22c5],
    [0xd8, 0xac], [0xd9, 0x2227], [0xda, 0x2228], [0xdb, 0x21d4], [0xdc, 0x21d0], [0xdd, 0x21d1], [0xde, 0x21d2], [0xdf, 0x21d3],
    [0xe0, 0x25ca], [0xe1, 0x2329], [0xe2, 0xae], [0xe3, 0xa9], [0xe4, 0x2122], [0xe5, 0x2211], [0xf1, 0x232a], [0xf2, 0x222b],
  ];
  for (const [k, v] of map) t[k] = v;
  return t;
})();
