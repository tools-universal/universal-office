// Escritor XPS mínimo (OPC ZIP). Cada FixedPage é XAML; texto é emitido com
// elementos <Glyphs UnicodeString="..."> que o leitor XPS shape via CMap da
// fonte. Fontes vão como partes /Resources/Fonts/<name>.ttf com Content-Type
// application/vnd.ms-opentype (não obfuscadas — o spec aceita ambos).
//
// Unidades: XPS usa 1/96 de polegada (CSS pixel) em ambos eixos.
// Conversão: ponto → px = pt * 96/72; twip → px = twip / 1440 * 96.
import { zipSync, type Zippable } from 'fflate';

const PT_TO_PX = 96 / 72;
const TWIP_TO_PX = 96 / 1440;

export interface XpsGlyphRun {
  text: string;
  xPt: number;          // origem X (esq. da 1ª caixa de glifo) em pontos
  baselinePt: number;   // baseline Y em pontos
  fontFamily: string;   // 'Aptos' | 'Calibri' (deve estar em fontBytes)
  variant: 'regular' | 'bold' | 'italic' | 'boldItalic';
  sizePt: number;       // tamanho em pontos
  colorRgb: [number, number, number]; // 0..1
}

export interface XpsLine {
  ax: number; ay: number; bx: number; by: number;
  widthPt: number;      // espessura em pontos
  colorRgb: [number, number, number];
}

export interface XpsFillRect {
  xPt: number; yPt: number; wPt: number; hPt: number;
  colorRgb: [number, number, number];
}

export interface XpsPage {
  widthPt: number;
  heightPt: number;
  fills: XpsFillRect[];
  lines: XpsLine[];
  glyphs: XpsGlyphRun[];
}

export interface XpsBuildInput {
  pages: XpsPage[];
  /** Bytes brutos das fontes a embutir. Chave = familyName usado em glyphs. */
  fontBytes: Record<string, Partial<Record<XpsGlyphRun['variant'], Uint8Array>>>;
}

const ENC = new TextEncoder();
const enc = (s: string): Uint8Array => ENC.encode(s);

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function rgb(c: [number, number, number]): string {
  const f = (v: number): string => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#FF${f(c[0])}${f(c[1])}${f(c[2])}`;
}

/** Nome de parte OPC seguro: remove espaços (ex.: "Liberation Sans"). O lookup
 *  de bytes continua pela família ORIGINAL; só o path/URI é sanitizado. */
function safeFamily(family: string): string {
  return family.replace(/\s+/g, '');
}
function fontPartName(family: string, v: XpsGlyphRun['variant']): string {
  return `/Resources/Fonts/${safeFamily(family)}-${v}.ttf`;
}

function fixedDocSeq(): string {
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06">` +
    `<DocumentReference Source="/Documents/1/FixedDocument.fdoc"/>` +
    `</FixedDocumentSequence>`;
}

function fixedDoc(pageCount: number): string {
  let inner = '';
  for (let i = 1; i <= pageCount; i++) {
    inner += `<PageContent Source="/Documents/1/Pages/${i}.fpage"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06">` +
    `${inner}</FixedDocument>`;
}

function fixedPage(page: XpsPage, usedFonts: Set<string>): string {
  const w = page.widthPt * PT_TO_PX;
  const h = page.heightPt * PT_TO_PX;
  let body = '';
  for (const r of page.fills) {
    const x = r.xPt * PT_TO_PX, y = r.yPt * PT_TO_PX;
    const ww = r.wPt * PT_TO_PX, hh = r.hPt * PT_TO_PX;
    body += `<Path Fill="${rgb(r.colorRgb)}" Data="M ${x} ${y} L ${x + ww} ${y} ${x + ww} ${y + hh} ${x} ${y + hh} Z"/>`;
  }
  for (const ln of page.lines) {
    const ax = ln.ax * PT_TO_PX, ay = ln.ay * PT_TO_PX;
    const bx = ln.bx * PT_TO_PX, by = ln.by * PT_TO_PX;
    const w = ln.widthPt * PT_TO_PX;
    body += `<Path Stroke="${rgb(ln.colorRgb)}" StrokeThickness="${w.toFixed(2)}" Data="M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)}"/>`;
  }
  for (const g of page.glyphs) {
    if (!g.text) continue;
    usedFonts.add(`${g.fontFamily}-${g.variant}`);
    const x = g.xPt * PT_TO_PX;
    const y = g.baselinePt * PT_TO_PX;
    const em = g.sizePt * PT_TO_PX;
    const ital = (g.variant === 'italic' || g.variant === 'boldItalic') ? ' StyleSimulations="ItalicSimulation"' : '';
    body += `<Glyphs OriginX="${x.toFixed(2)}" OriginY="${y.toFixed(2)}" ` +
      `FontRenderingEmSize="${em.toFixed(2)}" FontUri="${fontPartName(g.fontFamily, g.variant)}" ` +
      `Fill="${rgb(g.colorRgb)}"${ital} UnicodeString="${xmlEscape(g.text)}"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" ` +
    `Width="${w.toFixed(2)}" Height="${h.toFixed(2)}" xml:lang="pt-BR">${body}</FixedPage>`;
}

function relsPagesDir(usedFonts: Set<string>): string {
  let rels = '';
  let id = 1;
  for (const key of usedFonts) {
    const [family, variant] = key.split('-');
    rels += `<Relationship Id="R${id++}" ` +
      `Type="http://schemas.microsoft.com/xps/2005/06/required-resource" ` +
      `Target="/Resources/Fonts/${safeFamily(family!)}-${variant}.ttf"/>`;
  }
  return rels;
}

function contentTypes(pageCount: number, usedFonts: Set<string>): string {
  let overrides = `<Override PartName="/FixedDocumentSequence.fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/>` +
    `<Override PartName="/Documents/1/FixedDocument.fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/>`;
  for (let i = 1; i <= pageCount; i++) {
    overrides += `<Override PartName="/Documents/1/Pages/${i}.fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>`;
  }
  void usedFonts;
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/>` +
    `<Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/>` +
    `<Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>` +
    `<Default Extension="ttf" ContentType="application/vnd.ms-opentype"/>` +
    `${overrides}</Types>`;
}

function rootRels(): string {
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" ` +
    `Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" ` +
    `Target="/FixedDocumentSequence.fdseq"/>` +
    `</Relationships>`;
}

export function buildXps(input: XpsBuildInput): Uint8Array {
  const z: Zippable = {};
  const usedFonts = new Set<string>();
  z['FixedDocumentSequence.fdseq'] = enc(fixedDocSeq());
  z['Documents/1/FixedDocument.fdoc'] = enc(fixedDoc(input.pages.length));
  for (let i = 0; i < input.pages.length; i++) {
    z[`Documents/1/Pages/${i + 1}.fpage`] = enc(fixedPage(input.pages[i]!, usedFonts));
  }
  // por-página rels (referência às fontes usadas em cada página) — XPS exige
  // que os recursos sejam declarados via _rels para serem resolvidos
  for (let i = 0; i < input.pages.length; i++) {
    z[`Documents/1/Pages/_rels/${i + 1}.fpage.rels`] = enc(
      `<?xml version="1.0" encoding="utf-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      relsPagesDir(usedFonts) +
      `</Relationships>`);
  }
  // fontes
  for (const key of usedFonts) {
    const [family, variant] = key.split('-') as [string, XpsGlyphRun['variant']];
    const bytes = input.fontBytes[family]?.[variant];
    if (!bytes) throw new Error(`fonte sem bytes para XPS: ${key}`);
    z[`Resources/Fonts/${safeFamily(family)}-${variant}.ttf`] = bytes;
  }
  z['[Content_Types].xml'] = enc(contentTypes(input.pages.length, usedFonts));
  z['_rels/.rels'] = enc(rootRels());
  return zipSync(z, { level: 6 });
}

export const xpsHelpers = { PT_TO_PX, TWIP_TO_PX, xmlEscape };
