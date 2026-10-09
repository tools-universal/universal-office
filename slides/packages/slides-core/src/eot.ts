/**
 * Fontes EOT (Embedded OpenType) — o formato que o Google Slides (e os
 * modelos Slidesgo feitos nele) grava em `ppt/fonts/*.fntdata`: cabeçalho
 * EOT + dados do sfnt, opcionalmente com XOR 0x50 e/ou compressão
 * MicroType Express (MTX). O PowerPoint usa essas fontes; sem decodificá-las
 * o texto cai em fontes substitutas (métricas e quebras de linha erradas).
 *
 * MTX = 3 blocos LZCOMP (LZ77 + Huffman adaptativo + RLE opcional): o 1º é
 * o sfnt em CTF (Compact Table Format: `glyf` em triplets, `loca` omitida,
 * `cvt ` em deltas), o 2º os dados de PUSH das instruções (hop codes) e o 3º
 * o resto do código das instruções. Reconstruímos um TrueType comum.
 *
 * Especificação: W3C Submission "MicroType Express (MTX) Font Format" e
 * "Embedded OpenType (EOT) File Format"; detalhes de bit conferidos com a
 * implementação de referência libeot.
 */

const EOT_MAGIC = 0x504c;
const TTEMBED_TTCOMPRESSED = 0x4;
const TTEMBED_XORENCRYPTDATA = 0x10000000;

/** É um cabeçalho EOT (tamanhos coerentes + magic 0x504C)? */
export function looksLikeEot(d: Uint8Array): boolean {
  if (d.length < 82) return false;
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const eotSize = v.getUint32(0, true), fontSize = v.getUint32(4, true);
  return v.getUint16(34, true) === EOT_MAGIC && eotSize <= d.length && fontSize > 0 && fontSize <= eotSize;
}

/** EOT → sfnt (TTF) pronto para FontFace; null se o formato não for reconhecido. */
export function eotToSfnt(d: Uint8Array): Uint8Array | null {
  if (!looksLikeEot(d)) return null;
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const eotSize = v.getUint32(0, true), fontSize = v.getUint32(4, true), flags = v.getUint32(12, true);
  // os dados da fonte são os ÚLTIMOS FontDataSize bytes (vale p/ todas as versões do cabeçalho)
  let font: Uint8Array = d.slice(eotSize - fontSize, eotSize);
  if (flags & TTEMBED_XORENCRYPTDATA) for (let i = 0; i < font.length; i++) font[i] = font[i]! ^ 0x50;
  if (flags & TTEMBED_TTCOMPRESSED) {
    try {
      font = ctfToSfnt(unpackMtx(font));
    } catch {
      return null;
    }
  }
  return font;
}

// ───────────────────────── MTX: contêiner e LZCOMP ─────────────────────────

/** Os 3 blocos LZCOMP do contêiner MTX, descomprimidos. */
function unpackMtx(d: Uint8Array): [Uint8Array, Uint8Array, Uint8Array] {
  const u24 = (o: number): number => (d[o]! << 16) | (d[o + 1]! << 8) | d[o + 2]!;
  const version = d[0]!;
  const off = [10, u24(4), u24(7), d.length];
  if (!(off[0]! <= off[1]! && off[1]! <= off[2]! && off[2]! <= d.length)) throw new Error('MTX: offsets');
  return [0, 1, 2].map((i) => lzcompUnpack(d.subarray(off[i]!, off[i + 1]!), version)) as [Uint8Array, Uint8Array, Uint8Array];
}

/** Leitura de bits, MSB primeiro. */
class BitIn {
  private pos = 0;
  private count = 0;
  private buf = 0;
  constructor(private readonly d: Uint8Array) {}
  bit(): number {
    if (this.count-- === 0) {
      if (this.pos >= this.d.length) throw new Error('MTX: fim dos dados');
      this.buf = this.d[this.pos++]!;
      this.count = 7;
    }
    this.buf = (this.buf << 1) & 0x1ff;
    return this.buf >> 8;
  }
  value(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) v = v * 2 + this.bit();
    return v;
  }
}

/**
 * Huffman ADAPTATIVO do LZCOMP: árvore completa inicial (nó i → filhos 2i e
 * 2i+1, folhas em range..2·range−1), pesos não-crescentes por índice; a cada
 * símbolo o peso da folha sobe e o nó troca com o líder do seu bloco de peso.
 */
class AHuff {
  private readonly up: Int32Array;
  private readonly left: Int32Array;
  private readonly right: Int32Array;
  private readonly code: Int32Array;
  private readonly weight: Float64Array;
  private readonly symbolIndex: Int32Array;

  constructor(private readonly bits: BitIn, range: number) {
    const n = 2 * range;
    this.up = new Int32Array(n);
    this.left = new Int32Array(n);
    this.right = new Int32Array(n);
    this.code = new Int32Array(n);
    this.weight = new Float64Array(n);
    this.symbolIndex = new Int32Array(range);
    for (let i = 2; i < n; i++) { this.up[i] = i >> 1; this.weight[i] = 1; }
    for (let i = 1; i < range; i++) { this.left[i] = 2 * i; this.right[i] = 2 * i + 1; }
    for (let i = 0; i < range; i++) {
      this.code[i] = -1;
      this.code[range + i] = i;
      this.left[range + i] = this.right[range + i] = -1;
      this.symbolIndex[i] = range + i;
    }
    this.weight[0] = Number.MAX_SAFE_INTEGER; // sentinela (nunca alcançada)
    this.initWeight(1);
    if (range > 256 && range < 512) {
      // árvore de símbolos: favorece os 2 primeiros códigos de cópia e DUP2/DUP4
      this.update(this.symbolIndex[256]!);
      this.update(this.symbolIndex[257]!);
      for (let i = 0; i < 12; i++) this.update(this.symbolIndex[range - 3]!);
      for (let i = 0; i < 6; i++) this.update(this.symbolIndex[range - 2]!);
    } else {
      for (let j = 0; j < 2; j++) for (let i = 0; i < range; i++) this.update(this.symbolIndex[i]!);
    }
  }

  private initWeight(a: number): number {
    if (this.code[a]! < 0) this.weight[a] = this.initWeight(this.left[a]!) + this.initWeight(this.right[a]!);
    return this.weight[a]!;
  }

  private swap(a: number, b: number): void {
    const { up, left, right, code, weight, symbolIndex } = this;
    const upa = up[a]!, upb = up[b]!;
    [left[a], left[b]] = [left[b]!, left[a]!];
    [right[a], right[b]] = [right[b]!, right[a]!];
    [code[a], code[b]] = [code[b]!, code[a]!];
    [weight[a], weight[b]] = [weight[b]!, weight[a]!];
    up[a] = upa; up[b] = upb;
    for (const k of [a, b]) {
      if (code[k]! < 0) { up[left[k]!] = k; up[right[k]!] = k; }
      else symbolIndex[code[k]!] = k;
    }
  }

  private update(a: number): void {
    const w = this.weight;
    for (; a !== 1; a = this.up[a]!) {
      const wa = w[a]!;
      let b = a - 1;
      if (w[b] === wa) {
        do { b--; } while (w[b] === wa);
        b++;
        if (b > 1) { this.swap(a, b); a = b; }
      }
      w[a] = wa + 1;
    }
    w[1] = w[1]! + 1;
  }

  read(): number {
    let a = 1;
    let sym: number;
    do {
      a = this.bits.bit() ? this.right[a]! : this.left[a]!;
      sym = this.code[a]!;
    } while (sym < 0);
    this.update(a);
    return sym;
  }
}

/**
 * Teto de qualquer saída intermediária/final (fonte real: poucos MB; CJK
 * grande ~20 MB). Dados forjados pediam até 16 MB por bloco a partir de
 * poucos bytes (cópias longas do LZ, RLE ×255) e a reconstrução do `glyf`
 * pré-alocava 2 × um u32 do arquivo (até 8,6 GB).
 */
const MAX_FONT_BYTES = 32 * 1024 * 1024;

/** Saída crescente (bytes), com teto. */
class Out {
  buf: Uint8Array;
  len = 0;
  constructor(cap: number, private readonly max = MAX_FONT_BYTES) {
    this.buf = new Uint8Array(Math.max(16, Math.min(cap, max)));
  }
  private grow(n: number): void {
    if (this.len + n <= this.buf.length) return;
    if (this.len + n > this.max) throw new Error('fonte: saída grande demais');
    const nb = new Uint8Array(Math.min(this.max, Math.max(this.buf.length * 2, this.len + n)));
    nb.set(this.buf.subarray(0, this.len));
    this.buf = nb;
  }
  u8(v: number): void { this.grow(1); this.buf[this.len++] = v & 0xff; }
  u16(v: number): void { this.u8(v >> 8); this.u8(v); }
  u32(v: number): void { this.u16(v >>> 16); this.u16(v & 0xffff); }
  bytes(src: Uint8Array): void { this.grow(src.length); this.buf.set(src, this.len); this.len += src.length; }
  setU16(at: number, v: number): void { this.buf[at] = (v >> 8) & 0xff; this.buf[at + 1] = v & 0xff; }
  done(): Uint8Array { return this.buf.slice(0, this.len); }
}

/** Histórico pré-carregado do LZCOMP (pares 0..31×0..95 e cada byte 4×). */
const PRELOAD = ((): Uint8Array => {
  const p = new Uint8Array(2 * 32 * 96 + 4 * 256);
  let i = 0;
  for (let k = 0; k < 32; k++) for (let j = 0; j < 96; j++) { p[i++] = k; p[i++] = j; }
  for (let j = 0; j < 256; j++) for (let r = 0; r < 4; r++) p[i++] = j;
  return p;
})();

/** Um bloco LZCOMP → bytes. */
function lzcompUnpack(src: Uint8Array, version: number): Uint8Array {
  const bits = new BitIn(src);
  const usingRunLength = version !== 1 && bits.bit() === 1;
  const distTree = new AHuff(bits, 8);
  const lenTree = new AHuff(bits, 8);
  const outLen = bits.value(24);
  // o tamanho declarado é do arquivo: além de uma razão plausível (o MTX comprime
  // ~2–4×) é forjado — evita alocar/gerar 16 MB a partir de poucos bytes
  if (outLen > Math.max(64 * 1024, src.length * 64)) throw new Error('MTX: tamanho declarado implausível');
  // faixas de distância: 3 bits por símbolo, o bastante p/ cobrir o tamanho
  let numDist = 1;
  while (1 + 2 ** (3 * numDist) - 1 < outLen) numDist++;
  const DUP2 = 256 + 8 * numDist, DUP4 = DUP2 + 1, DUP6 = DUP4 + 1;
  const symTree = new AHuff(bits, DUP6 + 1);
  const PRE = PRELOAD.length;
  const hist = new Uint8Array(PRE + outLen);
  hist.set(PRELOAD);
  const out = new Out(outLen);
  // RLE: o 1º byte é o escape; escape, n, v = v repetido n vezes (n = 0: o próprio escape)
  let rlState = usingRunLength ? 100 : -1, rlEscape = 0, rlCount = 0;
  const emit = (v: number): void => {
    if (rlState < 0) { out.u8(v); return; }
    if (rlState === 100) { rlEscape = v; rlState = 0; }
    else if (rlState === 0) { if (v === rlEscape) rlState = 1; else out.u8(v); }
    else if (rlState === 1) { rlCount = v; if (v === 0) { out.u8(rlEscape); rlState = 0; } else rlState = 2; }
    else { for (let i = 0; i < rlCount; i++) out.u8(v); rlState = 0; }
  };
  let pos = 0;
  const put = (v: number): void => { hist[PRE + pos++] = v; emit(v); };
  while (pos < outLen) {
    const s = symTree.read();
    if (s < 256) put(s);
    else if (s === DUP2) put(hist[PRE + pos - 2]!);
    else if (s === DUP4) put(hist[PRE + pos - 4]!);
    else if (s === DUP6) put(hist[PRE + pos - 6]!);
    else {
      // comprimento: blocos de 2 bits; o bit 4 de cada símbolo diz "continua"
      let b = s - 256;
      const nDist = Math.floor(b / 8) + 1;
      b %= 8;
      let length = 0;
      for (;;) {
        const done = (b & 4) === 0;
        length = length * 4 + (b & 3);
        if (done) break;
        b = lenTree.read();
      }
      length += 2;
      let distance = 0;
      for (let i = 0; i < nDist; i++) distance = distance * 8 + distTree.read();
      distance += 1;
      if (distance >= 512) length++;
      const start = PRE + pos - distance - length + 1;
      if (start < 0) throw new Error('MTX: distância inválida');
      for (let j = 0; j < length && pos < outLen; j++) put(hist[start + j]!);
    }
  }
  return out.done();
}

// ───────────────────────── CTF → TrueType ─────────────────────────

/** Leitor big-endian de um bloco. */
class In {
  pos = 0;
  constructor(readonly d: Uint8Array) {}
  private need(n: number): void { if (this.pos + n > this.d.length) throw new Error('CTF: fim dos dados'); }
  u8(): number { this.need(1); return this.d[this.pos++]!; }
  u16(): number { this.need(2); const v = (this.d[this.pos]! << 8) | this.d[this.pos + 1]!; this.pos += 2; return v; }
  s16(): number { const v = this.u16(); return v >= 0x8000 ? v - 0x10000 : v; }
  u32(): number { return this.u16() * 0x10000 + this.u16(); }
  bytes(n: number): Uint8Array { this.need(n); const b = this.d.subarray(this.pos, this.pos + n); this.pos += n; return b; }
  /** 255USHORT do MTX. */
  u255(): number {
    const c = this.u8();
    if (c === 253) return this.u16();
    if (c === 255) return 253 + this.u8();
    if (c === 254) return 506 + this.u8();
    return c;
  }
  /** 255SHORT do MTX. */
  s255(): number {
    let c = this.u8();
    if (c === 253) return this.s16();
    let sign = 1;
    if (c === 250) { sign = -1; c = this.u8(); }
    const v = c === 255 ? 250 + this.u8() : c === 254 ? 500 + this.u8() : c;
    return sign * v;
  }
}

/** Triplet: (bytes extras, bits x, bits y, base x, base y), sinais nos bits 0 (x) e 1 (y) do índice. */
function triplet(flag: number, inp: In): [number, number] {
  const sgn = (bit: number, v: number): number => (bit ? v : -v);
  if (flag < 10) return [0, sgn(flag & 1, ((flag & 14) << 7) + inp.u8())];
  if (flag < 20) return [sgn(flag & 1, (((flag - 10) & 14) << 7) + inp.u8()), 0];
  if (flag < 84) {
    const b0 = flag - 20, b1 = inp.u8();
    return [sgn(flag & 1, 1 + (b0 & 0x30) + (b1 >> 4)), sgn(flag & 2, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f))];
  }
  if (flag < 120) {
    const b0 = flag - 84, x = inp.u8(), y = inp.u8();
    return [sgn(flag & 1, 1 + (Math.floor(b0 / 12) << 8) + x), sgn(flag & 2, 1 + (((b0 % 12) >> 2) << 8) + y)];
  }
  if (flag < 124) {
    const a = inp.u8(), b = inp.u8(), c = inp.u8();
    return [sgn(flag & 1, (a << 4) + (b >> 4)), sgn(flag & 2, ((b & 0x0f) << 8) + c)];
  }
  const a = inp.u8(), b = inp.u8(), c = inp.u8(), e = inp.u8();
  return [sgn(flag & 1, (a << 8) + b), sgn(flag & 2, (c << 8) + e)];
}

/**
 * Instruções de PUSH do glifo (fluxo 2, "hop codes"): reemite PUSHB/PUSHW
 * (N≤8) ou NPUSHB/NPUSHW (até 255) agrupando valores do mesmo tamanho.
 * `0xFB c` → A c A (A = penúltimo valor); `0xFC c d` → A c A d A.
 */
function decodePush(push: In, out: Out, count: number): void {
  const data: number[] = [];
  let groupStart = 0;
  let groupByte = true;
  const dump = (): void => {
    const n = data.length - groupStart;
    if (!n) return;
    if (n < 8) out.u8((groupByte ? 0xb0 : 0xb8) | (n - 1));
    else { out.u8(groupByte ? 0x40 : 0x41); out.u8(n); }
    for (let i = groupStart; i < data.length; i++) {
      if (groupByte) out.u8(data[i]!); else out.u16(data[i]! & 0xffff);
    }
    groupStart = data.length;
  };
  const putVal = (v: number): void => {
    const byte = v >= 0 && v < 256;
    if (byte !== groupByte || data.length - groupStart === 255) { dump(); groupByte = byte; }
    data.push(v);
  };
  let remaining = count;
  while (remaining > 0) {
    const code = push.d[push.pos];
    if (code === 0xfb || code === 0xfc) {
      const need = code === 0xfb ? 3 : 5;
      if (remaining < need || data.length < 2) throw new Error('CTF: hop code');
      remaining -= need;
      push.u8();
      const prev = data[data.length - 2]!;
      putVal(prev);
      putVal(push.s255());
      putVal(prev);
      if (code === 0xfc) { putVal(push.s255()); putVal(prev); }
    } else {
      putVal(push.s255());
      remaining--;
    }
  }
  dump();
}

/** Um glifo CTF → glifo TrueType (vazio = nada). */
function decodeGlyph(s: [In, In, In], out: Out): void {
  const inp = s[0];
  let numContours = inp.s16();
  if (numContours < 0) { decodeComposite(s, out); return; }
  let bbox: [number, number, number, number] | null = null;
  if (numContours === 0x7fff) {
    numContours = inp.s16();
    bbox = [inp.s16(), inp.s16(), inp.s16(), inp.s16()];
  }
  if (numContours === 0) return;
  // pontos por contorno: o 1º é o índice final do contorno 0; os demais, contagens
  const endPts: number[] = [];
  let total = 1;
  for (let i = 0; i < numContours; i++) { total += inp.u255(); endPts.push(total - 1); }
  const n = total;
  const flags = inp.bytes(n).slice();
  const xs = new Int32Array(n), ys = new Int32Array(n);
  let cx = 0, cy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const [dx, dy] = triplet(flags[i]! & 0x7f, inp);
    xs[i] = dx; ys[i] = dy;
    cx += dx; cy += dy;
    x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
  }
  const [bx0, by0, bx1, by1] = bbox ?? [x0, y0, x1, y1];
  out.u16(numContours);
  out.u16(bx0 & 0xffff); out.u16(by0 & 0xffff); out.u16(bx1 & 0xffff); out.u16(by1 & 0xffff);
  for (const e of endPts) out.u16(e);
  const instrAt = out.len;
  out.u16(0);
  decodePush(s[1], out, inp.u255());
  out.bytes(s[2].bytes(inp.u255()));
  out.setU16(instrAt, out.len - instrAt - 2);
  // flags TrueType (sem repetição) + deltas em byte (com sinal na flag) ou palavra
  for (let i = 0; i < n; i++) {
    let f = flags[i]! & 0x80 ? 0 : 0x01;
    for (const [v, short, same] of [[xs[i]!, 0x02, 0x10], [ys[i]!, 0x04, 0x20]] as const) {
      if (i > 0 && v === 0) f |= same;
      else if (v > -256 && v < 0) f |= short;
      else if (v >= 0 && v < 256) f |= short | same;
    }
    out.u8(f);
  }
  for (const arr of [xs, ys]) {
    for (let i = 0; i < n; i++) {
      const v = arr[i]!;
      if (i > 0 && v === 0) continue;
      if (v > -256 && v < 256) out.u8(Math.abs(v));
      else out.u16(v & 0xffff);
    }
  }
}

function decodeComposite(s: [In, In, In], out: Out): void {
  const inp = s[0];
  out.u16(0xffff); // numberOfContours = −1
  out.bytes(inp.bytes(8)); // caixa
  let flags: number;
  do {
    flags = inp.u16();
    out.u16(flags);
    out.bytes(inp.bytes(2)); // índice do glifo
    out.bytes(inp.bytes(flags & 0x1 ? 4 : 2));
    out.bytes(inp.bytes(flags & 0x80 ? 8 : flags & 0x40 ? 4 : flags & 0x8 ? 2 : 0));
  } while (flags & 0x20);
  if (flags & 0x100) {
    const at = out.len;
    out.u16(0);
    decodePush(s[1], out, inp.u255());
    out.bytes(s[2].bytes(inp.u255()));
    out.setU16(at, out.len - at - 2);
  }
}

/** sfnt em CTF (+ fluxos de push e código) → TrueType. */
function ctfToSfnt([ctf, push, code]: [Uint8Array, Uint8Array, Uint8Array]): Uint8Array {
  const s: [In, In, In] = [new In(ctf), new In(push), new In(code)];
  const inp = s[0];
  inp.u32(); // versão sfnt
  const numTables = inp.u16();
  inp.pos += 6;
  const recs: { tag: string; offset: number; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const tag = String.fromCharCode(...inp.bytes(4));
    inp.u32(); // checksum
    recs.push({ tag, offset: inp.u32(), length: inp.u32() });
  }
  const tables = new Map<string, Uint8Array>();
  for (const r of recs) {
    // hdmx/VDMX vêm transformados no CTF e são opcionais: ficam de fora
    if (r.tag === 'hdmx' || r.tag === 'VDMX' || r.tag === 'loca' || r.tag === 'glyf') continue;
    if (r.tag === 'cvt ') {
      inp.pos = r.offset;
      const n = inp.u16();
      const o = new Out(n * 2);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const c = inp.u8();
        let v: number;
        if (c >= 248) v = 238 * (c - 247) + inp.u8();
        else if (c >= 239) v = -(238 * (c - 239) + inp.u8());
        else if (c === 238) v = inp.s16();
        else v = c;
        last = ((last + v + 0x8000) & 0xffff) - 0x8000;
        o.u16(last & 0xffff);
      }
      tables.set('cvt ', o.done());
      continue;
    }
    tables.set(r.tag, ctf.slice(r.offset, r.offset + r.length));
  }
  const head = tables.get('head'), maxp = tables.get('maxp');
  if (!head || head.length < 54 || !maxp || maxp.length < 6) throw new Error('CTF: head/maxp');
  head[8] = head[9] = head[10] = head[11] = 0; // checkSumAdjustment: recalculado
  const glyfRec = recs.find((r) => r.tag === 'glyf');
  if (glyfRec) {
    const numGlyphs = (maxp[4]! << 8) | maxp[5]!;
    inp.pos = glyfRec.offset;
    // capacidade inicial pelo que EXISTE no bloco (o `length` da tabela é do arquivo)
    const glyf = new Out(Math.min(glyfRec.length, ctf.length) * 2);
    const offsets: number[] = [0];
    for (let g = 0; g < numGlyphs; g++) {
      decodeGlyph(s, glyf);
      if (glyf.len % 2) glyf.u8(0);
      offsets.push(glyf.len);
    }
    // `loca` curta só se couber (offset/2 em 16 bits)
    const short = ((head[50]! << 8) | head[51]!) === 0 && glyf.len / 2 <= 0xffff;
    head[50] = 0; head[51] = short ? 0 : 1;
    const loca = new Out(offsets.length * 4);
    for (const o of offsets) { if (short) loca.u16(o / 2); else loca.u32(o); }
    tables.set('glyf', glyf.done());
    tables.set('loca', loca.done());
  }
  return writeSfnt(tables);
}

/** Soma de verificação de tabela sfnt (palavras de 32 bits, big-endian). */
function checksum(d: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const w = ((d[i] ?? 0) << 24 | (d[i + 1] ?? 0) << 16 | (d[i + 2] ?? 0) << 8 | (d[i + 3] ?? 0)) >>> 0;
    sum = (sum + w) >>> 0;
  }
  return sum;
}

/** Monta o arquivo sfnt (tabelas em ordem de tag, alinhadas a 4 bytes). */
function writeSfnt(tables: Map<string, Uint8Array>): Uint8Array {
  const tags = [...tables.keys()].sort();
  const n = tags.length;
  let es = 0;
  while (2 ** (es + 1) <= n) es++;
  const sr = 2 ** es * 16;
  let size = 12 + 16 * n;
  for (const t of tags) size += (tables.get(t)!.length + 3) & ~3;
  const out = new Uint8Array(size);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x00010000);
  dv.setUint16(4, n); dv.setUint16(6, sr); dv.setUint16(8, es); dv.setUint16(10, n * 16 - sr);
  let off = 12 + 16 * n;
  let headOff = -1;
  tags.forEach((t, i) => {
    const d = tables.get(t)!;
    const r = 12 + 16 * i;
    for (let k = 0; k < 4; k++) out[r + k] = t.charCodeAt(k);
    dv.setUint32(r + 4, checksum(d));
    dv.setUint32(r + 8, off);
    dv.setUint32(r + 12, d.length);
    out.set(d, off);
    if (t === 'head') headOff = off;
    off += (d.length + 3) & ~3;
  });
  if (headOff >= 0) dv.setUint32(headOff + 8, (0xb1b0afba - checksum(out)) >>> 0);
  return out;
}
