// Leitura mínima de cabeçalhos sfnt — só o que o resolvedor precisa: licença
// de incorporação (OS/2 fsType) e extrair uma face de coleção `.ttc`.

const tag = (v: DataView, p: number): string =>
  String.fromCharCode(v.getUint8(p), v.getUint8(p + 1), v.getUint8(p + 2), v.getUint8(p + 3));

function tableOf(v: DataView, base: number, want: string): { off: number; len: number } | null {
  const num = v.getUint16(base + 4);
  for (let i = 0; i < num; i++) {
    const p = base + 12 + i * 16;
    if (tag(v, p) === want) return { off: v.getUint32(p + 8), len: v.getUint32(p + 12) };
  }
  return null;
}

/**
 * A licença permite embutir a fonte em documento/PDF? OS/2 fsType: 0x2 sozinho
 * = "Restricted License"; 0x4/0x8 liberam; 0x200 = só bitmap. Sem OS/2
 * legível: permite (o padrão da especificação é fsType 0).
 */
export function isEmbeddable(bytes: Uint8Array): boolean {
  try {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const os2 = tableOf(v, 0, 'OS/2');
    if (!os2 || os2.len < 10) return true;
    const fsType = v.getUint16(os2.off + 8);
    return !((fsType & 0x2) && !(fsType & 0xc)) && !(fsType & 0x200);
  } catch {
    return true;
  }
}

/** Nome PostScript (name ID 6) da face que começa em `base`. */
function postscriptName(v: DataView, base: number): string | null {
  const name = tableOf(v, base, 'name');
  if (!name) return null;
  const count = v.getUint16(name.off + 2);
  const strOff = name.off + v.getUint16(name.off + 4);
  for (let i = 0; i < count; i++) {
    const r = name.off + 6 + i * 12;
    if (v.getUint16(r + 6) !== 6) continue;
    const platform = v.getUint16(r), len = v.getUint16(r + 8), o = strOff + v.getUint16(r + 10);
    let s = '';
    if (platform === 3 || platform === 0) for (let k = 0; k + 1 < len; k += 2) s += String.fromCharCode(v.getUint16(o + k));
    else for (let k = 0; k < len; k++) s += String.fromCharCode(v.getUint8(o + k));
    if (s) return s;
  }
  return null;
}

/**
 * Bytes de uma face como sfnt AVULSO. Arquivo comum: devolve o próprio. Coleção
 * `.ttc`: extrai a face cujo nome PostScript bate (ou a 0) — offset table +
 * diretório + tabelas copiadas, alinhadas a 4. O FontFace aceitaria o `.ttc`,
 * mas o parser de métricas e o embutidor de PDF do Write só leem TTF/OTF.
 */
export function standaloneFace(bytes: Uint8Array, wantPostscript?: string): Uint8Array {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 12 || tag(v, 0) !== 'ttcf') return bytes;
  const numFonts = v.getUint32(8);
  let base = v.getUint32(12);
  if (wantPostscript) {
    for (let i = 0; i < numFonts; i++) {
      const b = v.getUint32(12 + i * 4);
      if (postscriptName(v, b) === wantPostscript) { base = b; break; }
    }
  }
  const num = v.getUint16(base + 4);
  const recs: { o: number; off: number; len: number }[] = [];
  for (let i = 0; i < num; i++) {
    const o = base + 12 + i * 16;
    const off = v.getUint32(o + 8), len = v.getUint32(o + 12);
    if (off + len > bytes.length) throw new RangeError('tabela fora do arquivo');
    recs.push({ o, off, len });
  }
  const headerLen = 12 + num * 16;
  const out = new Uint8Array(recs.reduce((n, r) => n + ((r.len + 3) & ~3), headerLen));
  const ov = new DataView(out.buffer);
  out.set(bytes.subarray(base, base + 12), 0);
  let pos = headerLen;
  recs.forEach((r, i) => {
    const d = 12 + i * 16;
    out.set(bytes.subarray(r.o, r.o + 8), d); // tag + checksum
    ov.setUint32(d + 8, pos);
    ov.setUint32(d + 12, r.len);
    out.set(bytes.subarray(r.off, r.off + r.len), pos);
    pos += (r.len + 3) & ~3;
  });
  return out;
}
