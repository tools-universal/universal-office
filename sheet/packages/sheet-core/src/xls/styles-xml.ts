/**
 * Estilos do .xls (FONT/FORMAT/XF/PALETTE/XFEXT) → xl/styles.xml.
 *
 * Cada XF do BIFF (de estilo ou de célula) vira o `cellXfs[i]` de MESMO
 * índice — as células apontam o ixfe direto, sem remapeamento. Cores
 * indexadas saem já resolvidas em RGB pela paleta efetiva (PALETTE ou a
 * padrão do BIFF8); as cores completas do XFEXT (Excel 2007+) prevalecem.
 */
import { fontIndex, type FullColor, type XlsFont, type XlsGlobals, type XlsXf } from './globals.js';
import { XML_HEAD, NS_MAIN, xmlText } from './xmlw.js';
import type { FormatRun, RichString } from './biff.js';

const FILL_PATTERNS = [
  'none', 'solid', 'mediumGray', 'darkGray', 'lightGray', 'darkHorizontal', 'darkVertical', 'darkDown', 'darkUp',
  'darkGrid', 'darkTrellis', 'lightHorizontal', 'lightVertical', 'lightDown', 'lightUp', 'lightGrid', 'lightTrellis',
  'gray125', 'gray0625',
];
const BORDER_STYLES = [
  '', 'thin', 'medium', 'dashed', 'dotted', 'thick', 'double', 'hair', 'mediumDashed', 'dashDot', 'mediumDashDot',
  'dashDotDot', 'mediumDashDotDot', 'slantDashDot',
];
const H_ALIGN = ['', 'left', 'center', 'right', 'fill', 'justify', 'centerContinuous', 'distributed'];
const V_ALIGN = ['top', 'center', '', 'justify', 'distributed'];

/** Cor indexada (icv) → "#RRGGBB"; undefined = automática. */
export function icvColor(icv: number, palette: string[], role: 'font' | 'fg' | 'bg' | 'border'): string | undefined {
  if (icv < 64) return palette[icv];
  switch (icv) {
    case 0x40: return role === 'bg' ? undefined : '#000000'; // system foreground (texto da janela)
    case 0x41: return '#FFFFFF'; // system background
    case 0x50: return '#FFFFE1'; // fundo de dica
    case 0x51: return '#000000'; // texto de dica
    case 0x7fff: return undefined; // automática
    default: return role === 'bg' ? '#FFFFFF' : '#000000';
  }
}

/** `<color …/>` de uma cor XFEXT ou da cor indexada. */
function colorEl(tag: string, ext: FullColor | undefined, rgb: string | undefined): string {
  if (ext) {
    const tint = ext.tint ? ` tint="${+ext.tint.toFixed(6)}"` : '';
    if (ext.type === 2 && ext.rgb) return `<${tag} rgb="FF${ext.rgb.slice(1)}"${tint}/>`;
    if (ext.type === 3 && ext.index !== undefined) return `<${tag} theme="${ext.index}"${tint}/>`;
  }
  return rgb ? `<${tag} rgb="FF${rgb.slice(1)}"/>` : '';
}

/** Conteúdo de um `<font>`/`<rPr>` (sem a tag externa). `run`: booleanos explícitos. */
export function fontBody(f: XlsFont, palette: string[], run: boolean, colorOverride?: FullColor): string {
  const b = f.weight >= 600;
  let x = '';
  if (run) {
    x += b ? '<b/>' : '<b val="0"/>';
    x += f.italic ? '<i/>' : '<i val="0"/>';
    x += f.strike ? '<strike/>' : '<strike val="0"/>';
  } else {
    if (b) x += '<b/>';
    if (f.italic) x += '<i/>';
    if (f.strike) x += '<strike/>';
  }
  if (f.outline) x += '<outline/>';
  if (f.shadow) x += '<shadow/>';
  const u = f.underline === 1 ? '' : f.underline === 2 ? 'double' : f.underline === 0x21 ? 'singleAccounting' : f.underline === 0x22 ? 'doubleAccounting' : undefined;
  if (f.underline && u !== undefined) x += u ? `<u val="${u}"/>` : '<u/>';
  else if (run) x += '<u val="none"/>';
  if (f.script === 1) x += '<vertAlign val="superscript"/>';
  else if (f.script === 2) x += '<vertAlign val="subscript"/>';
  x += `<sz val="${f.height / 20}"/>`;
  x += colorEl('color', colorOverride, icvColor(f.color, palette, 'font'));
  x += run ? `<rFont val="${xmlText(f.name)}"/>` : `<name val="${xmlText(f.name)}"/>`;
  if (f.family) x += `<family val="${f.family}"/>`;
  if (f.charset) x += `<charset val="${f.charset}"/>`;
  return x;
}

const DEFAULT_FONT: XlsFont = {
  height: 200, italic: false, strike: false, outline: false, shadow: false, weight: 400, script: 0, underline: 0,
  family: 2, charset: 0, color: 0x7fff, name: 'Arial',
};

/** Fonte BIFF (ifnt) → registro (com fallback para a 0 / Arial 10). */
export function fontAt(g: XlsGlobals, ifnt: number): XlsFont {
  return g.fonts[fontIndex(ifnt)] ?? g.fonts[0] ?? DEFAULT_FONT;
}

/** Saída do conversor de estilos. */
export interface StylesOut {
  xml: string;
}

/** Monta xl/styles.xml. */
export function stylesXml(g: XlsGlobals): StylesOut {
  const pal = g.palette;
  // fontes: as do arquivo na ordem (fontId = posição) + variantes de cor do XFEXT
  const fonts: string[] = [];
  const fontKey = new Map<string, number>();
  const addFont = (body: string): number => {
    const k = fontKey.get(body);
    if (k !== undefined) return k;
    fonts.push(body);
    fontKey.set(body, fonts.length - 1);
    return fonts.length - 1;
  };
  const baseFonts = g.fonts.length ? g.fonts : [DEFAULT_FONT];
  for (const f of baseFonts) {
    // não deduplica as fontes do arquivo: fontId = posição BIFF
    const body = fontBody(f, pal, false);
    fonts.push(body);
    if (!fontKey.has(body)) fontKey.set(body, fonts.length - 1);
  }

  const fills: string[] = ['<patternFill patternType="none"/>', '<patternFill patternType="gray125"/>'];
  const fillKey = new Map<string, number>(fills.map((f, i) => [f, i]));
  const borders: string[] = ['<left/><right/><top/><bottom/><diagonal/>'];
  const borderAttrs: string[] = [''];
  const borderKey = new Map<string, number>([['|<left/><right/><top/><bottom/><diagonal/>', 0]]);

  const xfXml: string[] = [];
  const xfs = g.xfs.length ? g.xfs : [defaultXf()];
  for (const xf of xfs) {
    // fonte
    let fontId = Math.min(fontIndex(xf.font), baseFonts.length - 1);
    if (fontId < 0) fontId = 0;
    const fcol = xf.ext?.get(13);
    if (fcol && (fcol.type === 2 || fcol.type === 3)) {
      fontId = addFont(fontBody(baseFonts[fontId]!, pal, false, fcol));
    }
    // preenchimento
    let fillId = 0;
    if (xf.pattern > 0) {
      const pt = FILL_PATTERNS[xf.pattern] ?? 'solid';
      const fg = colorEl('fgColor', xf.ext?.get(4), icvColor(xf.fore, pal, 'fg'));
      const bg = colorEl('bgColor', xf.ext?.get(5), icvColor(xf.back, pal, 'bg'));
      const body = `<patternFill patternType="${pt}">${fg}${bg}</patternFill>`;
      fillId = fillKey.get(body) ?? -1;
      if (fillId < 0) { fills.push(body); fillId = fills.length - 1; fillKey.set(body, fillId); }
    }
    // bordas
    const edge = (tag: string, dg: number, icv: number, extType: number): string => {
      const st = BORDER_STYLES[dg];
      if (!dg || !st) return `<${tag}/>`;
      return `<${tag} style="${st}">${colorEl('color', xf.ext?.get(extType), icvColor(icv, pal, 'border')) || '<color auto="1"/>'}</${tag}>`;
    };
    const diagOn = xf.diag !== 0 && xf.bDiag !== 0;
    const bBody = edge('left', xf.bLeft, xf.cLeft, 9) + edge('right', xf.bRight, xf.cRight, 10)
      + edge('top', xf.bTop, xf.cTop, 7) + edge('bottom', xf.bBottom, xf.cBottom, 8)
      + (diagOn ? edge('diagonal', xf.bDiag, xf.cDiag, 11) : '<diagonal/>');
    const bAttr = diagOn ? `${xf.diag & 2 ? ' diagonalUp="1"' : ''}${xf.diag & 1 ? ' diagonalDown="1"' : ''}` : '';
    const bk = bAttr + '|' + bBody;
    let borderId = borderKey.get(bk);
    if (borderId === undefined) { borders.push(bBody); borderAttrs.push(bAttr); borderId = borders.length - 1; borderKey.set(bk, borderId); }
    // alinhamento
    let al = '';
    const h = H_ALIGN[xf.halign] ?? '';
    if (h) al += ` horizontal="${h}"`;
    const v = V_ALIGN[xf.valign] ?? '';
    if (v) al += ` vertical="${v}"`;
    if (xf.wrap) al += ' wrapText="1"';
    if (xf.rot) al += ` textRotation="${xf.rot}"`;
    if (xf.indent) al += ` indent="${xf.indent}"`;
    if (xf.shrink) al += ' shrinkToFit="1"';
    let a = `<xf numFmtId="${xf.fmt}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`;
    if (xf.fmt) a += ' applyNumberFormat="1"';
    if (fontId) a += ' applyFont="1"';
    if (fillId) a += ' applyFill="1"';
    if (borderId) a += ' applyBorder="1"';
    if (al) a += ' applyAlignment="1"';
    xfXml.push(al ? `${a}><alignment${al}/></xf>` : `${a}/>`);
  }

  let numFmts = '';
  let nNum = 0;
  for (const [id, code] of g.formats) {
    if (!includeFormat(id)) continue;
    numFmts += `<numFmt numFmtId="${id}" formatCode="${xmlText(normalizeFormat(code))}"/>`;
    nNum++;
  }

  let x = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">`;
  if (nNum) x += `<numFmts count="${nNum}">${numFmts}</numFmts>`;
  x += `<fonts count="${fonts.length}">${fonts.map((f) => `<font>${f}</font>`).join('')}</fonts>`;
  x += `<fills count="${fills.length}">${fills.map((f) => `<fill>${f}</fill>`).join('')}</fills>`;
  x += `<borders count="${borders.length}">${borders.map((b, i) => `<border${borderAttrs[i]}>${b}</border>`).join('')}</borders>`;
  x += '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>';
  x += `<cellXfs count="${xfXml.length}">${xfXml.join('')}</cellXfs>`;
  x += '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>';
  x += '</styleSheet>';
  return { xml: x };
}

/**
 * Código de formato do BIFF → como o Excel o interpreta: a palavra-chave
 * "General" não diferencia maiúsculas (o LibreOffice grava "GENERAL"); fora
 * de aspas, colchetes e escapes ela vira a grafia canônica.
 */
export function normalizeFormat(code: string): string {
  if (!/general/i.test(code)) return code;
  let out = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"') { const j = code.indexOf('"', i + 1); const e = j < 0 ? code.length : j + 1; out += code.slice(i, e); i = e - 1; continue; }
    if (ch === '[') { const j = code.indexOf(']', i + 1); const e = j < 0 ? code.length : j + 1; out += code.slice(i, e); i = e - 1; continue; }
    if (ch === '\\' || ch === '_' || ch === '*') { out += code.slice(i, i + 2); i++; continue; }
    if (code.slice(i, i + 7).toLowerCase() === 'general') { out += 'General'; i += 6; continue; }
    out += ch;
  }
  return out;
}

/**
 * FORMAT do arquivo que entra em `<numFmts>`. O BIFF grava os de moeda/
 * contábil (5–8, 41–44) no locale de quem salvou e o Excel pt-BR USA esses
 * (medido: id 6 "£"#,##0 exibe "£1", não "R$"); os demais embutidos (< 50)
 * seguem o locale de quem abre — ficam com o código embutido do motor.
 */
function includeFormat(id: number): boolean {
  return id >= 50 || (id >= 5 && id <= 8) || (id >= 41 && id <= 44);
}

function defaultXf(): XlsXf {
  return {
    font: 0, fmt: 0, isStyle: true, parent: 0xfff, halign: 0, wrap: false, valign: 2, rot: 0, indent: 0, shrink: false,
    bLeft: 0, bRight: 0, bTop: 0, bBottom: 0, bDiag: 0, cLeft: 0, cRight: 0, cTop: 0, cBottom: 0, cDiag: 0, diag: 0,
    pattern: 0, fore: 64, back: 65,
  };
}

/** `<si>` (ou conteúdo de `<is>`/`<text>`) de uma string rica. */
export function richXml(g: XlsGlobals, s: RichString): string {
  const runs = s.runs;
  if (!runs || runs.length === 0) return `<t xml:space="preserve">${xmlText(s.text)}</t>`;
  const sorted: FormatRun[] = [...runs].sort((a, b) => a.ich - b.ich);
  let x = '';
  const text = s.text;
  if (sorted[0]!.ich > 0) x += `<r><t xml:space="preserve">${xmlText(text.slice(0, sorted[0]!.ich))}</t></r>`;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!.ich;
    const b = i + 1 < sorted.length ? sorted[i + 1]!.ich : text.length;
    if (b <= a || a >= text.length) continue;
    x += `<r><rPr>${fontBody(fontAt(g, sorted[i]!.ifnt), g.palette, true)}</rPr><t xml:space="preserve">${xmlText(text.slice(a, b))}</t></r>`;
  }
  return x || `<t xml:space="preserve">${xmlText(text)}</t>`;
}
