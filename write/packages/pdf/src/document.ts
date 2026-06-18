import { ByteBuilder } from './bytes.js';
import { EmbeddedFont, type FontProgram } from './font.js';
import { PdfWriter } from './writer.js';

/** Cor RGB em componentes 0..1. */
export type PdfColor = readonly [number, number, number];

export function rgb255(r: number, g: number, b: number): PdfColor {
  return [r / 255, g / 255, b / 255];
}

/** Aceita "RRGGBB" (com ou sem #). */
export function hexColor(hex: string): PdfColor {
  const h = hex.replace('#', '');
  return rgb255(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/** Um glifo já posicionado: gid (=CID), code point (p/ ToUnicode) e coords em pt. */
export interface PlacedGlyph {
  gid: number;
  codePoint: number;
  /** x absoluto na página, em pontos (origem no canto superior esquerdo). */
  xPt: number;
  /** y da baseline medido a partir do TOPO da página, em pontos. */
  baselineFromTopPt: number;
}

/** Imagem embutida (XObject) pronta para desenhar. */
export interface PdfImage {
  readonly resourceName: string;
  readonly objNum: number;
}

const fmt = (n: number): string => {
  // até 3 casas, sem zeros/“.0” supérfluos
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

/**
 * Página PDF. As coordenadas de entrada usam origem no canto SUPERIOR esquerdo
 * (y cresce para baixo, como no canvas/Word); a conversão para o sistema do PDF
 * (origem inferior esquerda) é feita aqui.
 */
export class PdfPage {
  /** @internal */ readonly content = new ByteBuilder();

  constructor(
    readonly widthPt: number,
    readonly heightPt: number,
  ) {}

  private fromTop(yTop: number): number {
    return this.heightPt - yTop;
  }

  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt: number, yTopPt: number, wPt: number, hPt: number, color: PdfColor): void {
    const y = this.fromTop(yTopPt + hPt); // canto inferior em coords PDF
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg\n` +
        `${fmt(xPt)} ${fmt(y)} ${fmt(wPt)} ${fmt(hPt)} re f\n`,
    );
  }

  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(
    x0: number, y0Top: number, x1: number, y1Top: number,
    color: PdfColor, widthPt: number, dash?: readonly number[],
  ): void {
    const d = dash && dash.length ? `[${dash.map(fmt).join(' ')}] 0 d\n` : '[] 0 d\n';
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG\n` +
        `${fmt(widthPt)} w\n${d}` +
        `${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S\n`,
    );
  }

  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(font: EmbeddedFont, sizePt: number, color: PdfColor, glyphs: PlacedGlyph[]): void {
    if (!glyphs.length) return;
    const c = this.content;
    c.str(
      `BT\n/${font.resourceName} ${fmt(sizePt)} Tf\n` +
        `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg\n`,
    );
    for (const g of glyphs) {
      const y = this.fromTop(g.baselineFromTopPt);
      c.str(`1 0 0 1 ${fmt(g.xPt)} ${fmt(y)} Tm <${g.gid.toString(16).padStart(4, '0')}> Tj\n`);
    }
    c.str('ET\n');
  }

  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img: PdfImage, xPt: number, yTopPt: number, wPt: number, hPt: number): void {
    const y = this.fromTop(yTopPt + hPt);
    this.content.str(
      `q\n${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y)} cm\n/${img.resourceName} Do\nQ\n`,
    );
  }
}

/** Documento PDF: fontes/imagens compartilhadas + páginas, montado em build(). */
export class PdfDocument {
  private writer: PdfWriter;
  private fonts: EmbeddedFont[] = [];
  private images: { handle: PdfImage; objNum: number }[] = [];
  private pages: PdfPage[] = [];

  constructor(opts: { compress?: boolean } = {}) {
    this.writer = new PdfWriter({ compress: opts.compress });
  }

  /** Embute uma fonte TrueType (bytes crus + consultas de métrica). */
  embedFont(name: string, bytes: Uint8Array, program: FontProgram): EmbeddedFont {
    const f = new EmbeddedFont(this.fonts.length, name, bytes, program);
    this.fonts.push(f);
    return f;
  }

  /** Embute um JPEG (baseline) diretamente via DCTDecode. */
  embedJpeg(bytes: Uint8Array, widthPx: number, heightPx: number): PdfImage {
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      bytes,
      { allowCompress: false }, // já comprimido
    );
    const handle: PdfImage = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }

  /** Embute pixels RGBA crus (alpha descartado) via DeviceRGB + FlateDecode. */
  embedRgba(rgba: Uint8Array, widthPx: number, heightPx: number): PdfImage {
    const rgb = new Uint8Array(widthPx * heightPx * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i]!;
      rgb[j + 1] = rgba[i + 1]!;
      rgb[j + 2] = rgba[i + 2]!;
    }
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8`,
      rgb,
    );
    const handle: PdfImage = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }

  addPage(widthPt: number, heightPt: number): PdfPage {
    const p = new PdfPage(widthPt, heightPt);
    this.pages.push(p);
    return p;
  }

  /** Serializa o PDF completo. */
  build(): Uint8Array {
    const w = this.writer;
    // fontes
    const fontRefs = this.fonts.map((f) => ({ name: f.resourceName, ref: f.write(w) }));
    const fontDict = fontRefs.length
      ? `/Font << ${fontRefs.map((f) => `/${f.name} ${f.ref} 0 R`).join(' ')} >>`
      : '';
    const xobjDict = this.images.length
      ? `/XObject << ${this.images.map((i) => `/${i.handle.resourceName} ${i.objNum} 0 R`).join(' ')} >>`
      : '';
    const resources = `<< ${fontDict} ${xobjDict} >>`;

    const catalog = w.alloc();
    const pagesNode = w.alloc();

    const pageRefs: number[] = [];
    for (const page of this.pages) {
      const contentNum = w.addStream('', page.content.toUint8Array());
      const pageNum = w.addDict(
        `<< /Type /Page /Parent ${pagesNode} 0 R ` +
          `/MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] ` +
          `/Resources ${resources} /Contents ${contentNum} 0 R >>`,
      );
      pageRefs.push(pageNum);
    }

    w.define(
      pagesNode,
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r) => `${r} 0 R`).join(' ')}] >>`,
    );
    w.define(catalog, `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w.build(catalog);
  }
}
