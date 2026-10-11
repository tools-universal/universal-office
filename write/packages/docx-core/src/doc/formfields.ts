/**
 * Campos de formulário (FORMTEXT / FORMCHECKBOX / FORMDROPDOWN): o caractere
 * 0x01 com sprmCFData na instrução do campo aponta (sprmCPicLocation) para um
 * NilPICFAndBinData no Data stream cujo binData é um FFData ([MS-DOC] 2.9.75).
 * Vira w:ffData dentro do w:fldChar "begin", como o Word grava.
 */
import { ByteReader } from './bytes.js';
import { el } from './xmlw.js';

/** Xstz: cch (u16) + caracteres UTF-16 + terminador. */
function xstz(r: ByteReader, off: number): { s: string; next: number } {
  const cch = Math.min(r.u16(off), 0x7fff);
  return { s: r.utf16(off + 2, cch), next: off + 2 + cch * 2 + 2 };
}

export function ffDataXml(data: Uint8Array | undefined, fc: number): string | undefined {
  if (!data || fc < 0 || fc + 0x44 + 10 > data.length) return undefined;
  const r = new ByteReader(data);
  const lcb = r.i32(fc);
  const cbHeader = r.u16(fc + 4);
  if (cbHeader !== 0x44 || lcb < cbHeader) return undefined;
  const end = Math.min(data.length, fc + lcb);
  let o = fc + cbHeader;
  // FFData.version: a spec pede 0xFFFFFFFF, mas há .doc com 0 (medido no Word) — não validar
  const bits = r.u16(o + 4);
  const iType = bits & 3;
  const iRes = (bits >> 2) & 0x1f;
  const fOwnHelp = (bits & 0x80) !== 0;
  const fOwnStat = (bits & 0x100) !== 0;
  const fProt = (bits & 0x200) !== 0;
  const iSize = (bits & 0x400) !== 0;
  const iTypeTxt = (bits >> 11) & 7;
  const fRecalc = (bits & 0x4000) !== 0;
  const cch = r.u16(o + 6);
  const hps = r.u16(o + 8);
  o += 10;
  const read = (): string => {
    if (o + 2 > end) return '';
    const x = xstz(r, o);
    o = x.next;
    return x.s;
  };
  const name = read();
  let textDef = '';
  let wDef = 0;
  if (iType === 0) textDef = read();
  else { wDef = r.u16(o); o += 2; }
  const format = read();
  const help = read();
  const stat = read();
  const entryMcr = read();
  const exitMcr = read();
  const entries: string[] = [];
  if (iType === 2 && o + 6 <= end) {
    // STTB estendida: fExtend (0xFFFF), cData, cbExtra, entradas cch (u16) + UTF-16
    let p = o;
    if (r.u16(p) === 0xffff) p += 2;
    const n = r.u16(p);
    const cbExtra = r.u16(p + 2);
    p += 4;
    for (let i = 0; i < n && p + 2 <= end; i++) {
      const c = r.u16(p);
      entries.push(r.utf16(p + 2, c));
      p += 2 + c * 2 + cbExtra;
    }
  }
  let x = el('w:name', { 'w:val': name });
  if (!fProt) x += '<w:enabled/>';
  x += fRecalc ? '<w:calcOnExit/>' : '<w:calcOnExit w:val="0"/>';
  if (entryMcr) x += el('w:entryMacro', { 'w:val': entryMcr });
  if (exitMcr) x += el('w:exitMacro', { 'w:val': exitMcr });
  if (fOwnHelp && help) x += el('w:helpText', { 'w:type': 'text', 'w:val': help });
  if (fOwnStat && stat) x += el('w:statusText', { 'w:type': 'text', 'w:val': stat });
  if (iType === 1) {
    let c = iSize ? el('w:size', { 'w:val': hps }) : '<w:sizeAuto/>';
    c += el('w:default', { 'w:val': wDef ? 1 : 0 });
    if (iRes !== 25) c += el('w:checked', { 'w:val': iRes ? 1 : 0 });
    x += `<w:checkBox>${c}</w:checkBox>`;
  } else if (iType === 2) {
    let c = '';
    if (iRes && iRes !== 25) c += el('w:result', { 'w:val': iRes });
    if (wDef) c += el('w:default', { 'w:val': wDef });
    for (const e of entries) c += el('w:listEntry', { 'w:val': e });
    x += `<w:ddList>${c}</w:ddList>`;
  } else {
    let c = '';
    const type = ['regular', 'number', 'date', 'currentDate', 'currentTime', 'calculated'][iTypeTxt];
    if (type && type !== 'regular') c += el('w:type', { 'w:val': type });
    if (textDef) c += el('w:default', { 'w:val': textDef });
    if (cch) c += el('w:maxLength', { 'w:val': cch });
    if (format) c += el('w:format', { 'w:val': format });
    x += c ? `<w:textInput>${c}</w:textInput>` : '<w:textInput/>';
  }
  return `<w:ffData>${x}</w:ffData>`;
}
