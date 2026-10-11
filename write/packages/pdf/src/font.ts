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
  /** fonte de símbolo (Symbol, Wingdings — códigos na área privada F0xx) com a tabela de
   *  equivalentes Unicode que o Word grava no ToUnicode; também a negrita/itálica */
  private get symbolTable(): Record<number, number> | undefined {
    const n = this.baseName.replace(/^[A-Z]{6}\+/, '').replace(/[\s,]+/g, '');
    if (/^Symbol(?:MT)?(?:-|$)/i.test(n)) return WORD_SYMBOL_UNICODE;
    if (/^Wingdings(?:-|$)/i.test(n)) return WORD_WINGDINGS_UNICODE;
    return undefined;
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
        // fonte de símbolo (área privada F020–F0FF): o Word grava o equivalente Unicode só
        // de alguns códigos (• − → ✓ ▪ ➢ ⚫…); os demais ficam com o código privado
        const table = this.symbolTable;
        const sym = table && cp0 >= 0xf020 && cp0 <= 0xf0ff ? table[cp0 - 0xf000] : undefined;
        const cp = sym ?? cp0;
        b.str(`<${gid.toString(16).padStart(4, '0')}> <${utf16beHex(String.fromCodePoint(cp))}>\n`);
      }
      b.str('endbfchar\n');
    }
    b.str('endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n');
    return b.toUint8Array();
  }
}

/**
 * Códigos da fonte Symbol (0x20–0xFF) que o Word grava como Unicode no ToUnicode do PDF —
 * medido (os 224 códigos via w:sym); os demais, inclusive as letras gregas, ficam com o
 * código privado F0xx.
 */
const WORD_SYMBOL_UNICODE: Record<number, number> = {
  0x28: 0x28, 0x29: 0x29, 0x2b: 0x2b, 0x2d: 0x2212, 0x3d: 0x3d, 0x5e: 0x22a5,
  0xae: 0x2192, 0xb7: 0x2022, 0xbe: 0x23af, 0xd3: 0xa9, 0xe3: 0xa9,
};

/** Idem para a Wingdings (Wingdings 2/3 e Webdings: nenhum — tudo fica no código privado). */
const WORD_WINGDINGS_UNICODE: Record<number, number> = {
  0x4a: 0x263a, 0x6c: 0x26ab, 0x6e: 0x25fc, 0x71: 0x2751, 0x73: 0x2b27, 0x74: 0x29eb, 0x75: 0x25c6,
  0x76: 0x2756, 0xa7: 0x25aa, 0xd8: 0x27a2, 0xe0: 0x2192, 0xe8: 0x2794, 0xfc: 0x2713,
};
