// Copiado de slides/packages/slides-core/test/helpers/cfb-writer.ts (escritor
// de Compound File mínimo dos testes do conversor .ppt) — o docx-core não
// depende do slides-core.
// ───────────────────────── Compound File mínimo (escritor de teste) ─────────────────────────

/**
 * Monta um Compound File v3 (setores de 512 bytes) com streams na raiz.
 * Streams < 4096 bytes vão para o mini stream (miniFAT), como manda a spec.
 */
export function buildCfb(streams: Record<string, Uint8Array>): Uint8Array {
  const SS = 512, MS = 64, CUTOFF = 4096;
  const names = Object.keys(streams);
  const ENDC = 0xfffffffe, FREE = 0xffffffff, FATSECT = 0xfffffffd;
  // mini stream
  const mini: number[] = []; // bytes do mini stream
  const miniFat: number[] = [];
  const miniStart = new Map<string, number>();
  for (const n of names) {
    const d = streams[n]!;
    if (d.length >= CUTOFF || d.length === 0) continue;
    const first = mini.length / MS;
    const cnt = Math.ceil(d.length / MS);
    miniStart.set(n, first);
    for (let i = 0; i < cnt; i++) miniFat.push(i === cnt - 1 ? ENDC : first + i + 1);
    const padded = new Uint8Array(cnt * MS); padded.set(d);
    mini.push(...padded);
  }
  // layout de setores: [FAT][diretório][miniFAT][mini stream][streams grandes]
  const sectors: Uint8Array[] = [];
  const fat: number[] = [];
  const alloc = (data: Uint8Array): number => {
    const first = sectors.length;
    const cnt = Math.max(1, Math.ceil(data.length / SS));
    for (let i = 0; i < cnt; i++) {
      const s = new Uint8Array(SS);
      s.set(data.subarray(i * SS, Math.min(data.length, (i + 1) * SS)));
      sectors.push(s);
      fat.push(i === cnt - 1 ? ENDC : first + i + 1);
    }
    return first;
  };
  sectors.push(new Uint8Array(SS)); fat.push(FATSECT); // setor 0 = FAT (1 setor basta)
  const dirEntries = 1 + names.length;
  const dirBytes = new Uint8Array(Math.ceil(dirEntries / 4) * SS);
  const dirStart = alloc(dirBytes);
  const mfBytes = new Uint8Array(Math.max(1, miniFat.length) * 4);
  new DataView(mfBytes.buffer).setUint32(0, FREE, true);
  miniFat.forEach((v, i) => new DataView(mfBytes.buffer).setUint32(i * 4, v, true));
  const miniFatStart = miniFat.length ? alloc(mfBytes) : ENDC;
  const miniStreamStart = mini.length ? alloc(new Uint8Array(mini)) : ENDC;
  const bigStart = new Map<string, number>();
  for (const n of names) {
    const d = streams[n]!;
    if (d.length >= CUTOFF) bigStart.set(n, alloc(d));
  }
  // diretório: raiz + streams encadeados como irmãos à direita
  const dv = new DataView(dirBytes.buffer);
  const entry = (i: number, name: string, type: number, start: number, size: number, child: number, right: number): void => {
    const o = i * 128;
    for (let k = 0; k < name.length; k++) dv.setUint16(o + k * 2, name.charCodeAt(k), true);
    dv.setUint16(o + 0x40, (name.length + 1) * 2, true);
    dv.setUint8(o + 0x42, type);
    dv.setUint32(o + 0x44, FREE, true);
    dv.setUint32(o + 0x48, right, true);
    dv.setUint32(o + 0x4c, child, true);
    dv.setUint32(o + 0x74, start, true);
    dv.setUint32(o + 0x78, size, true);
  };
  entry(0, 'Root Entry', 5, miniStreamStart, mini.length, names.length ? 1 : FREE, FREE);
  names.forEach((n, i) => {
    const d = streams[n]!;
    const start = d.length >= CUTOFF ? bigStart.get(n)! : d.length ? miniStart.get(n)! : ENDC;
    entry(i + 1, n, 2, start, d.length, FREE, i + 2 <= names.length ? i + 2 : FREE);
  });
  for (let i = dirEntries; i < dirBytes.length / 128; i++) {
    dv.setUint32(i * 128 + 0x44, FREE, true); dv.setUint32(i * 128 + 0x48, FREE, true); dv.setUint32(i * 128 + 0x4c, FREE, true);
  }
  sectors[dirStart]!.set(dirBytes.subarray(0, SS));
  for (let i = 1; i < dirBytes.length / SS; i++) sectors[dirStart + i]!.set(dirBytes.subarray(i * SS, (i + 1) * SS));
  // FAT
  const fatSector = sectors[0]!;
  const fv = new DataView(fatSector.buffer);
  for (let i = 0; i < SS / 4; i++) fv.setUint32(i * 4, i < fat.length ? fat[i]! : FREE, true);
  // cabeçalho
  const hdr = new Uint8Array(SS);
  const hv = new DataView(hdr.buffer);
  hdr.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  hv.setUint16(0x18, 0x3e, true); hv.setUint16(0x1a, 3, true); hv.setUint16(0x1c, 0xfffe, true);
  hv.setUint16(0x1e, 9, true); hv.setUint16(0x20, 6, true);
  hv.setUint32(0x2c, 1, true); hv.setUint32(0x30, dirStart, true); hv.setUint32(0x38, CUTOFF, true);
  hv.setUint32(0x3c, miniFatStart, true); hv.setUint32(0x40, miniFat.length ? 1 : 0, true);
  hv.setUint32(0x44, ENDC, true); hv.setUint32(0x48, 0, true);
  hv.setUint32(0x4c, 0, true);
  for (let i = 1; i < 109; i++) hv.setUint32(0x4c + i * 4, FREE, true);
  const out = new Uint8Array(SS * (1 + sectors.length));
  out.set(hdr);
  sectors.forEach((s, i) => out.set(s, SS * (i + 1)));
  return out;
}
