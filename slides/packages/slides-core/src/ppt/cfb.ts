/**
 * Leitor de Compound File Binary ([MS-CFB]) — o contêiner "OLE2" que embrulha
 * os binários do Office 97-2003 (.ppt/.doc/.xls). É um mini sistema de arquivos
 * dentro do arquivo: setores de tamanho fixo encadeados por uma FAT, um
 * diretório em árvore rubro-negra e um "mini stream" (setores de 64 bytes,
 * encadeados pela miniFAT) para streams pequenos.
 *
 * Layout (v3 = setores de 512 bytes; v4 = 4096):
 *   cabeçalho (512 bytes) → DIFAT (109 entradas no cabeçalho + setores DIFAT
 *   encadeados) → setores da FAT → cadeias de setores (FAT[n] = próximo).
 *   O setor n começa em (n + 1) << sectorShift.
 *
 * Só leitura; tolerante a arquivos levemente truncados (setores fora do
 * arquivo leem como zero) mas detecta ciclos de cadeia.
 */

/** Assinatura D0 CF 11 E0 A1 B1 1A E1 no início do arquivo. */
export const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

const MAXREGSECT = 0xfffffffa;
const ENDOFCHAIN = 0xfffffffe;
const FREESECT = 0xffffffff;
const NOSTREAM = 0xffffffff;

/** Entrada do diretório (storage/stream). */
export interface CfbEntry {
  /** Nome da entrada (sem caminho). */
  name: string;
  /** Caminho completo separado por "/" (a raiz não entra no caminho). */
  path: string;
  type: 'root' | 'storage' | 'stream';
  /** Tamanho do stream em bytes. */
  size: number;
  /** Setor inicial (na FAT ou na miniFAT, conforme o tamanho). */
  start: number;
}

/** Verifica a assinatura de Compound File (D0 CF 11 E0 A1 B1 1A E1). */
export function isCfbBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== CFB_SIGNATURE[i]) return false;
  return true;
}

/** Arquivo CFB aberto: diretório + leitura de streams por caminho. */
export class CfbFile {
  readonly entries: CfbEntry[];
  private readonly bytes: Uint8Array;
  private readonly view: DataView;
  private readonly sectorShift: number;
  private readonly miniSectorShift: number;
  private readonly miniCutoff: number;
  private readonly fat: Uint32Array;
  private readonly miniFat: Uint32Array;
  private miniStream: Uint8Array | undefined;
  private readonly rootStart: number;
  private readonly rootSize: number;
  private readonly byPath = new Map<string, CfbEntry>();

  constructor(bytes: Uint8Array) {
    if (!isCfbBytes(bytes)) throw new Error('Arquivo não é um Compound File (assinatura D0CF11E0 ausente)');
    if (bytes.length < 512) throw new Error('Compound File truncado (cabeçalho incompleto)');
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v = this.view;
    const major = v.getUint16(0x1a, true);
    if (v.getUint16(0x1c, true) !== 0xfffe) throw new Error('Compound File com byte order inválido');
    this.sectorShift = v.getUint16(0x1e, true);
    this.miniSectorShift = v.getUint16(0x20, true);
    if ((major === 3 && this.sectorShift !== 9) || (major === 4 && this.sectorShift !== 12)) {
      // tolera combinações fora do padrão, mas exige tamanhos sãos
      if (this.sectorShift < 7 || this.sectorShift > 16) throw new Error(`Compound File com setor inválido (2^${this.sectorShift})`);
    }
    if (this.miniSectorShift < 2 || this.miniSectorShift > this.sectorShift) throw new Error('Compound File com mini setor inválido');
    const numFatSectors = v.getUint32(0x2c, true);
    const firstDirSector = v.getUint32(0x30, true);
    this.miniCutoff = v.getUint32(0x38, true) || 4096;
    const firstMiniFatSector = v.getUint32(0x3c, true);
    const numMiniFatSectors = v.getUint32(0x40, true);
    const firstDifatSector = v.getUint32(0x44, true);
    const numDifatSectors = v.getUint32(0x48, true);
    const sectorSize = 1 << this.sectorShift;

    // DIFAT: 109 entradas no cabeçalho + setores DIFAT encadeados (o último
    // u32 de cada setor DIFAT aponta para o próximo).
    const fatSectors: number[] = [];
    for (let i = 0; i < 109; i++) {
      const s = v.getUint32(0x4c + i * 4, true);
      if (s <= MAXREGSECT) fatSectors.push(s);
    }
    let difat = firstDifatSector;
    const perDifat = sectorSize / 4 - 1;
    const seenDifat = new Set<number>();
    for (let n = 0; n < numDifatSectors && difat <= MAXREGSECT; n++) {
      if (seenDifat.has(difat)) throw new Error('Compound File com ciclo na DIFAT');
      seenDifat.add(difat);
      const off = this.sectorOffset(difat);
      for (let i = 0; i < perDifat; i++) {
        const s = this.u32At(off + i * 4);
        if (s <= MAXREGSECT) fatSectors.push(s);
      }
      difat = this.u32At(off + perDifat * 4);
    }
    const fatCount = Math.min(fatSectors.length, numFatSectors || fatSectors.length);
    const perSector = sectorSize / 4;
    this.fat = new Uint32Array(fatCount * perSector);
    for (let i = 0; i < fatCount; i++) {
      const off = this.sectorOffset(fatSectors[i]!);
      for (let j = 0; j < perSector; j++) this.fat[i * perSector + j] = this.u32At(off + j * 4);
    }

    // miniFAT (cadeia na FAT)
    const miniFatBytes = numMiniFatSectors > 0 && firstMiniFatSector <= MAXREGSECT
      ? this.readChain(firstMiniFatSector, numMiniFatSectors * sectorSize)
      : new Uint8Array(0);
    this.miniFat = new Uint32Array(miniFatBytes.length >> 2);
    const mfv = new DataView(miniFatBytes.buffer, miniFatBytes.byteOffset, miniFatBytes.byteLength);
    for (let i = 0; i < this.miniFat.length; i++) this.miniFat[i] = mfv.getUint32(i * 4, true);

    // diretório: entradas de 128 bytes numa cadeia da FAT
    const dir = this.readChain(firstDirSector, -1);
    const dv = new DataView(dir.buffer, dir.byteOffset, dir.byteLength);
    interface RawEntry { name: string; type: number; left: number; right: number; child: number; start: number; size: number }
    const raw: RawEntry[] = [];
    for (let off = 0; off + 128 <= dir.length; off += 128) {
      const nameLen = dv.getUint16(off + 0x40, true);
      let name = '';
      const chars = Math.max(0, Math.min(32, nameLen / 2) - 1);
      for (let i = 0; i < chars; i++) name += String.fromCharCode(dv.getUint16(off + i * 2, true));
      const sizeLo = dv.getUint32(off + 0x78, true);
      const sizeHi = dv.getUint32(off + 0x7c, true);
      // v3: os 32 bits altos podem conter lixo (gravadores antigos) — ignorar
      const size = major === 3 ? sizeLo : sizeLo + sizeHi * 0x100000000;
      raw.push({
        name, type: dv.getUint8(off + 0x42),
        left: dv.getUint32(off + 0x44, true), right: dv.getUint32(off + 0x48, true),
        child: dv.getUint32(off + 0x4c, true), start: dv.getUint32(off + 0x74, true), size,
      });
    }
    const root = raw[0];
    if (!root || root.type !== 5) throw new Error('Compound File sem entrada raiz');
    this.rootStart = root.start;
    this.rootSize = root.size;

    // percorre a árvore (irmãos left/right em ordem; filhos de storages)
    this.entries = [{ name: root.name, path: '', type: 'root', size: root.size, start: root.start }];
    const visited = new Set<number>([0]);
    const walk = (id: number, prefix: string): void => {
      // pilha explícita: árvores degeneradas podem ser profundas
      const stack: number[] = [];
      let cur = id;
      while (stack.length || (cur !== NOSTREAM && cur < raw.length)) {
        while (cur !== NOSTREAM && cur < raw.length) {
          if (visited.has(cur)) { cur = NOSTREAM; break; }
          visited.add(cur);
          stack.push(cur);
          cur = raw[cur]!.left;
        }
        const top = stack.pop();
        if (top === undefined) break;
        const e = raw[top]!;
        const path = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.type === 1 || e.type === 2) {
          const entry: CfbEntry = { name: e.name, path, type: e.type === 1 ? 'storage' : 'stream', size: e.size, start: e.start };
          this.entries.push(entry);
          this.byPath.set(path.toLowerCase(), entry);
          if (e.type === 1 && e.child !== NOSTREAM) walk(e.child, path);
        }
        cur = e.right;
      }
    };
    if (root.child !== NOSTREAM) walk(root.child, '');
  }

  /** Lê um stream pelo caminho (case-insensitive, como no Windows). */
  getStream(path: string): Uint8Array | undefined {
    const e = this.byPath.get(path.toLowerCase());
    if (!e || e.type !== 'stream') return undefined;
    if (e.size === 0) return new Uint8Array(0);
    if (e.size < this.miniCutoff) return this.readMiniChain(e.start, e.size);
    return this.readChain(e.start, e.size);
  }

  /** Há um stream/storage com esse caminho? */
  has(path: string): boolean { return this.byPath.has(path.toLowerCase()); }

  private sectorOffset(sector: number): number { return (sector + 1) << this.sectorShift; }

  private u32At(off: number): number {
    return off + 4 <= this.bytes.length ? this.view.getUint32(off, true) : FREESECT;
  }

  /** Lê uma cadeia da FAT. `size < 0` = cadeia inteira. */
  private readChain(start: number, size: number): Uint8Array {
    const sectorSize = 1 << this.sectorShift;
    const sectors: number[] = [];
    const limit = this.fat.length + 1;
    let s = start;
    while (s <= MAXREGSECT) {
      if (sectors.length > limit) throw new Error('Compound File com ciclo na FAT');
      sectors.push(s);
      if (size >= 0 && sectors.length * sectorSize >= size) break;
      s = s < this.fat.length ? this.fat[s]! : ENDOFCHAIN;
    }
    const total = size >= 0 ? size : sectors.length * sectorSize;
    const out = new Uint8Array(total);
    let pos = 0;
    for (const sec of sectors) {
      if (pos >= total) break;
      const off = this.sectorOffset(sec);
      const n = Math.min(sectorSize, total - pos);
      const avail = Math.max(0, Math.min(n, this.bytes.length - off));
      if (avail > 0) out.set(this.bytes.subarray(off, off + avail), pos);
      pos += n;
    }
    return out;
  }

  /** Lê uma cadeia da miniFAT (dentro do mini stream da raiz). */
  private readMiniChain(start: number, size: number): Uint8Array {
    if (!this.miniStream) this.miniStream = this.readChain(this.rootStart, this.rootSize);
    const mini = this.miniStream;
    const ms = 1 << this.miniSectorShift;
    const out = new Uint8Array(size);
    let pos = 0;
    let s = start;
    let guard = 0;
    while (s <= MAXREGSECT && pos < size) {
      if (guard++ > this.miniFat.length + 1) throw new Error('Compound File com ciclo na miniFAT');
      const off = s * ms;
      const n = Math.min(ms, size - pos);
      const avail = Math.max(0, Math.min(n, mini.length - off));
      if (avail > 0) out.set(mini.subarray(off, off + avail), pos);
      pos += n;
      s = s < this.miniFat.length ? this.miniFat[s]! : ENDOFCHAIN;
    }
    return out;
  }
}

/** Abre um Compound File. Lança erro descritivo se a estrutura for inválida. */
export function readCfb(bytes: Uint8Array): CfbFile {
  return new CfbFile(bytes);
}
