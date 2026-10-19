// Smoke test do gerador de PDF (docx-layout/src/pdf-writer): layout real (breakRich) → PDF, com o MESMO
// algoritmo de posicionamento por glifo do editor (snap de 1/600", baseline).
// Gera temp/smoke.pdf para rasterizar com tools/word-lab/rasterize-pdf.ps1.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { SfntFont, breakRich, deviceEmPt, PdfDocument, hexColor } from '../packages/docx-layout/dist/index.js';

const FONTS = 'tools/word-lab/fonts';
const TWIPS_PER_PT = 20;

const bytes = new Uint8Array(readFileSync(`${FONTS}/aptos-regular.ttf`));
const sfnt = new SfntFont(bytes);
try { sfnt.setAdvanceTable(JSON.parse(readFileSync(`${FONTS}/aptos-advances.json`, 'utf8'))); } catch {}

const fonts = { resolve: () => sfnt };

const text =
  'O UniversalWrite gera PDF próprio reaproveitando o layout do editor. ' +
  'Cada glifo é posicionado exatamente onde o canvas o desenha, com o ' +
  'mesmo arredondamento de 1/600 de polegada que o Word usa para o pitch. ' +
  'Acentuação: ção, ável, índice, número, José. Kerning: AVATAR Wave To.';

const sizePt = 11;
const spans = [{ text, variant: 'regular', sizePt }];

// geometria de página (A4, margens de 1")
const pageWTw = 11906, pageHTw = 16838, marginTw = 1440;
const availableTwips = pageWTw - 2 * marginTw;
const { lines, charAdvances } = breakRich(spans, fonts, { availableTwips });

const ascentTwips = (sfnt.metrics.ascender / sfnt.metrics.unitsPerEm) * deviceEmPt(sizePt) * TWIPS_PER_PT;
const lineHeightTwips = Math.round((deviceEmPt(sizePt) * 1.15 * TWIPS_PER_PT) / 2.4) * 2.4;

const doc = new PdfDocument({ compress: true });
const font = doc.embedFont('Aptos', bytes, {
  unitsPerEm: sfnt.metrics.unitsPerEm,
  ascender: sfnt.metrics.ascender,
  descender: sfnt.metrics.descender,
  glyphId: (cp) => sfnt.glyphId(cp),
  advanceWidth: (g) => sfnt.advanceWidth(g),
});
const page = doc.addPage(pageWTw / TWIPS_PER_PT, pageHTw / TWIPS_PER_PT);

let yTop = marginTw;
for (const line of lines) {
  const baselineTwips = yTop + ascentTwips;
  const lineXTwips = marginTw;
  let x = lineXTwips;
  const placed = [];
  for (let gi = line.start; gi < line.end; gi++) {
    const ch = text[gi];
    const a = charAdvances[gi];
    if (ch !== ' ') {
      const rel = x - lineXTwips;
      const xSnap = lineXTwips + Math.round(rel / 2.4) * 2.4;
      const cp = ch.codePointAt(0);
      const { gid } = font.encode(cp);
      placed.push({ gid, codePoint: cp, xPt: xSnap / TWIPS_PER_PT, baselineFromTopPt: baselineTwips / TWIPS_PER_PT });
    }
    x += a;
  }
  page.glyphs(font, sizePt, hexColor('000000'), placed);
  yTop += lineHeightTwips;
}

mkdirSync('temp', { recursive: true });
const out = doc.build();
writeFileSync('temp/smoke.pdf', out);
console.log(`temp/smoke.pdf escrito (${out.length} bytes, ${lines.length} linhas)`);
