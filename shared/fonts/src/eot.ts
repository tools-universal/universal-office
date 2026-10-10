// Embedded OpenType (EOT) v2.2 SEM compressão — o contêiner que o PowerPoint
// usa em `ppt/fonts/*.fntdata`. O PowerPoint grava com MicroType Express
// (flags 0x4); gerar MTX é bem mais complexo e não é necessário: medido no
// PowerPoint desta máquina, o EOT sem compressão abre sem reparo, a fonte
// aparece como incorporada (Font.Embedded) e é preservada ao salvar de novo.
// Leitura (com MTX) fica em slides-core/eot.ts.
import { faceInfo } from './sfnt.js';

const TTEMBED_SUBSET = 0x1;

/** UTF-16LE (o EOT grava os nomes assim). */
function utf16le(s: string): Uint8Array {
  const out = new Uint8Array(s.length * 2);
  for (let i = 0; i < s.length; i++) { out[i * 2] = s.charCodeAt(i) & 0xff; out[i * 2 + 1] = s.charCodeAt(i) >> 8; }
  return out;
}

export function sfntToEot(font: Uint8Array, opts: { subsetted?: boolean } = {}): Uint8Array {
  const info = faceInfo(font);
  const fixed = new Uint8Array(82);
  const f = new DataView(fixed.buffer);
  f.setUint32(8, 0x00020002, true);                      // Version 2.2
  f.setUint32(12, opts.subsetted ? TTEMBED_SUBSET : 0, true);
  for (let i = 0; i < 10; i++) fixed[16 + i] = parseInt(info.panose.slice(i * 2, i * 2 + 2), 16);
  fixed[26] = 1;                                         // Charset: DEFAULT_CHARSET
  fixed[27] = info.italic ? 1 : 0;
  f.setUint32(28, info.weight, true);
  f.setUint16(32, info.fsType, true);
  f.setUint16(34, 0x504c, true);                         // MagicNumber
  info.unicodeRange.forEach((r, i) => f.setUint32(36 + i * 4, r, true));
  info.codePageRange.forEach((r, i) => f.setUint32(52 + i * 4, r, true));
  f.setUint32(60, info.checkSumAdjustment, true);
  // Reserved1-4 e Padding1 ficam zerados

  const u16 = (n: number) => { const a = new Uint8Array(2); new DataView(a.buffer).setUint16(0, n, true); return a; };
  const u32 = (n: number) => { const a = new Uint8Array(4); new DataView(a.buffer).setUint32(0, n, true); return a; };
  const parts: Uint8Array[] = [fixed];
  const { family, style, version, full } = info.names;
  [family, style, version, full].forEach((s, i) => {
    const b = utf16le(s);
    if (i) parts.push(u16(0));                           // Padding2..4 (o Padding1 está no bloco fixo)
    parts.push(u16(b.length), b);
  });
  parts.push(u16(0), u16(0));                            // Padding5 + RootStringSize (sem restrição de site)
  parts.push(u32(0), u32(0), u16(0), u16(0), u32(0), u32(0)); // RootStringCheckSum, EUDCCodePage, Padding6, SignatureSize, EUDCFlags, EUDCFontSize
  parts.push(font);

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  const v = new DataView(out.buffer);
  v.setUint32(0, total, true);                           // EOTSize
  v.setUint32(4, font.length, true);                     // FontDataSize
  return out;
}
