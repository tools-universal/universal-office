/**
 * Leitura de .xls (BIFF8 e BIFF5/7 dentro de um Compound File) por CONVERSÃO:
 * a pasta binária vira, em memória, um pacote OOXML equivalente (workbook,
 * planilhas, estilos, strings, comentários, desenhos) e segue pelo MESMO
 * caminho de leitura do .xlsx — um modelo só, um renderizador só.
 */
import { XlsxPackage } from '../package.js';
import { isCfbBytes, readCfb, type CfbFile } from './cfb.js';
import { OLD_BOFS, records, RT } from './biff.js';
import { readGlobals, XlsEncryptedError, type XlsGlobals } from './globals.js';
import { readSheet, StringTable, type XlsSheet } from './sheet.js';
import { stylesXml, richXml } from './styles-xml.js';
import { worksheetXml, commentsXml, type SheetParts } from './sheet-xml.js';
import { themeXml } from './theme-xml.js';
import type { MediaState } from './drawing.js';
import { XML_HEAD, NS_MAIN, NS_R, REL, relsXml, xmlText } from './xmlw.js';

export { XlsEncryptedError } from './globals.js';
export { isCfbBytes } from './cfb.js';

/** Erro amigável: o arquivo não é uma pasta do Excel legível. */
export class XlsFormatError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'XlsFormatError';
  }
}

/** O arquivo é um Compound File (assinatura D0 CF 11 E0 — .xls/.doc/.ppt)? */
export function isXlsBytes(bytes: Uint8Array): boolean {
  return isCfbBytes(bytes);
}

/** Substream de nível 0 (BOF … EOF). */
interface Substream { start: number; end: number; dt: number }

/** Varre os cabeçalhos (sem copiar dados) e acha os subfluxos de nível 0. */
function scanSubstreams(buf: Uint8Array): Substream[] {
  const out: Substream[] = [];
  let off = 0;
  let depth = 0;
  let cur: Substream | undefined;
  while (off + 4 <= buf.length) {
    const type = buf[off]! | (buf[off + 1]! << 8);
    const len = buf[off + 2]! | (buf[off + 3]! << 8);
    if (type === RT.BOF) {
      if (depth === 0) { cur = { start: off, end: buf.length, dt: buf[off + 6]! | (buf[off + 7]! << 8) }; out.push(cur); }
      depth++;
    } else if (type === RT.EOF && depth > 0) {
      depth--;
      if (depth === 0 && cur) { cur.end = off + 4 + len; cur = undefined; }
    }
    off += 4 + len;
  }
  return out;
}

/** Stream da pasta: "Workbook" (BIFF8) ou "Book" (BIFF5/7). */
function workbookStream(cfb: CfbFile): Uint8Array {
  const wb = cfb.getStream('Workbook') ?? cfb.getStream('Book');
  if (wb) return wb;
  if (cfb.has('EncryptedPackage') || cfb.has('EncryptionInfo')) throw new XlsEncryptedError();
  if (cfb.has('WordDocument')) throw new XlsFormatError('O arquivo é um documento do Word (.doc), não uma pasta de trabalho');
  if (cfb.has('PowerPoint Document')) throw new XlsFormatError('O arquivo é uma apresentação do PowerPoint (.ppt), não uma pasta de trabalho');
  throw new XlsFormatError('Arquivo .xls sem o stream "Workbook" — não é uma pasta de trabalho do Excel');
}

/**
 * Converte os bytes de um .xls no pacote OOXML equivalente. Erros sempre
 * amigáveis (XlsFormatError / XlsEncryptedError) — nunca exceções genéricas.
 */
export function xlsToXlsxPackage(bytes: Uint8Array): XlsxPackage {
  try {
    return convert(bytes);
  } catch (e) {
    if (e instanceof XlsFormatError || e instanceof XlsEncryptedError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new XlsFormatError(`Arquivo .xls corrompido ou não suportado (${msg})`);
  }
}

function convert(bytes: Uint8Array): XlsxPackage {
  let cfb: CfbFile;
  try { cfb = readCfb(bytes); } catch (e) {
    throw new XlsFormatError(`Arquivo .xls corrompido: ${e instanceof Error ? e.message : String(e)}`);
  }
  const buf = workbookStream(cfb);
  if (buf.length < 8) throw new XlsFormatError('Arquivo .xls vazio ou truncado');
  const t0 = buf[0]! | (buf[1]! << 8);
  if (OLD_BOFS.has(t0)) throw new XlsFormatError('Formato do Excel 2.x–4.0 (BIFF2–4) não suportado — salve como .xlsx no Excel');
  if (t0 !== RT.BOF) throw new XlsFormatError('Stream "Workbook" sem registro BOF — arquivo corrompido');
  const vers = buf[4]! | (buf[5]! << 8);
  const biff: 5 | 8 = vers === 0x0600 ? 8 : vers === 0x0500 ? 5 : cfb.has('Workbook') ? 8 : 5;

  const subs = scanSubstreams(buf);
  const globalsSub = subs[0]!;
  const g = readGlobals(records(buf, globalsSub.start, globalsSub.end), biff);
  const strings = new StringTable(g.sst);

  // subfluxos das planilhas: pelo lbPlyPos do BOUNDSHEET; se não bater, pela ordem
  const byPos = new Map(subs.map((s) => [s.start, s]));
  const rest = subs.slice(1);
  const sheets: { name: string; state: number; sheet: XlsSheet; chart: boolean }[] = [];
  const usedNames = new Set<string>();
  let activeOut = 0;
  g.sheets.forEach((info, i) => {
    const sub = byPos.get(info.pos) ?? rest[i];
    if (info.type === 6) return; // módulo VBA (BIFF5): não é aba
    const isChart = info.type === 2 || sub?.dt === 0x20;
    let sheet: XlsSheet;
    if (sub) {
      const it = records(buf, sub.start, sub.end);
      it.next(); // BOF
      sheet = readSheet(it, g, strings, isChart);
    } else sheet = readSheet([][Symbol.iterator](), g, strings, isChart);
    let name = info.name.trim() ? info.name : `Planilha${sheets.length + 1}`;
    for (let k = 2; usedNames.has(name.toLowerCase()); k++) name = `${info.name} (${k})`;
    usedNames.add(name.toLowerCase());
    if (i === g.activeTab) activeOut = sheets.length;
    sheets.push({ name, state: info.state, sheet, chart: isChart });
  });
  if (!sheets.length) throw new XlsFormatError('Pasta de trabalho .xls sem planilhas');

  const parts = new Map<string, Uint8Array>();
  const enc = new TextEncoder();
  const put = (path: string, text: string): void => { parts.set(path, enc.encode(text)); };
  const overrides: [string, string][] = [];
  const defaults = new Map<string, string>([['rels', 'application/vnd.openxmlformats-package.relationships+xml'], ['xml', 'application/xml']]);

  // workbook
  const wbRels: { id: string; type: string; target: string }[] = [];
  let sheetsXml = '';
  sheets.forEach((s, i) => {
    const rid = `rId${i + 1}`;
    wbRels.push({ id: rid, type: `${REL}/worksheet`, target: `worksheets/sheet${i + 1}.xml` });
    const st = s.state === 1 ? ' state="hidden"' : s.state === 2 ? ' state="veryHidden"' : '';
    sheetsXml += `<sheet name="${xmlText(s.name)}" sheetId="${i + 1}"${st} r:id="${rid}"/>`;
  });
  let n = sheets.length;
  wbRels.push({ id: `rId${++n}`, type: `${REL}/styles`, target: 'styles.xml' });
  wbRels.push({ id: `rId${++n}`, type: `${REL}/sharedStrings`, target: 'sharedStrings.xml' });
  wbRels.push({ id: `rId${++n}`, type: `${REL}/theme`, target: 'theme/theme1.xml' });
  put('xl/workbook.xml', `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_R}">`
    + (g.date1904 ? '<workbookPr date1904="1"/>' : '<workbookPr/>')
    + `<bookViews><workbookView activeTab="${activeOut}"/></bookViews>`
    + `<sheets>${sheetsXml}</sheets></workbook>`);
  put('xl/_rels/workbook.xml.rels', relsXml(wbRels));
  overrides.push(['/xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml']);

  // planilhas (+ comentários, hyperlinks, desenhos)
  const media: MediaState = { n: 0, charts: 0 };
  sheets.forEach((s, i) => {
    const sp: SheetParts = worksheetXml(g, s.sheet, i + 1, media);
    put(`xl/worksheets/sheet${i + 1}.xml`, sp.xml);
    overrides.push([`/xl/worksheets/sheet${i + 1}.xml`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml']);
    const rels = [...sp.rels];
    if (s.sheet.notes.length) {
      const path = `xl/comments${i + 1}.xml`;
      put(path, commentsXml(s.sheet.notes));
      overrides.push([`/${path}`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml']);
      rels.push({ id: `rId${rels.length + 1}`, type: `${REL}/comments`, target: `../comments${i + 1}.xml` });
    }
    for (const [path, data] of sp.parts) parts.set(path, data);
    for (const [path, ct] of sp.overrides) overrides.push([path, ct]);
    for (const [ext, ct] of sp.defaults) defaults.set(ext, ct);
    if (rels.length) put(`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, relsXml(rels));
  });

  // estilos, strings, tema
  put('xl/styles.xml', stylesXml(g).xml);
  overrides.push(['/xl/styles.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml']);
  const si: string[] = [];
  for (const s of strings.items) si.push(`<si>${richXml(g, s)}</si>`);
  put('xl/sharedStrings.xml', `${XML_HEAD}<sst xmlns="${NS_MAIN}" count="${si.length}" uniqueCount="${si.length}">${si.join('')}</sst>`);
  overrides.push(['/xl/sharedStrings.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml']);
  put('xl/theme/theme1.xml', themeXml(g.themeZip));
  overrides.push(['/xl/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml']);

  // pacote
  put('_rels/.rels', relsXml([{ id: 'rId1', type: `${REL}/officeDocument`, target: 'xl/workbook.xml' }]));
  let ct = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`;
  for (const [ext, type] of defaults) ct += `<Default Extension="${ext}" ContentType="${type}"/>`;
  for (const [path, type] of overrides) ct += `<Override PartName="${path}" ContentType="${type}"/>`;
  // ordem do zip como a do Excel: tipos e rels do pacote primeiro
  const ordered = new Map<string, Uint8Array>([
    ['[Content_Types].xml', enc.encode(ct + '</Types>')],
    ['_rels/.rels', parts.get('_rels/.rels')!],
  ]);
  for (const [p, d] of parts) if (!ordered.has(p)) ordered.set(p, d);
  return XlsxPackage.fromParts(ordered);
}

export type { XlsGlobals };
