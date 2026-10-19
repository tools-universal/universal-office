/**
 * Acumulador de bytes para montar um PDF: a estrutura do arquivo é ASCII/latin1,
 * mas streams (fontes, imagens, conteúdo comprimido) são binários. Esta classe
 * permite intercalar texto (latin1) e Uint8Array sem custo de conversão repetida.
 */
export class ByteBuilder {
  private chunks: Uint8Array[] = [];
  private len = 0;

  /** Comprimento atual em bytes (offset corrente). */
  get length(): number {
    return this.len;
  }

  /** Anexa uma string como latin1 (1 byte por code unit; só use ASCII/latin1). */
  str(s: string): this {
    const n = s.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = s.charCodeAt(i) & 0xff;
    return this.bytes(out);
  }

  /** Anexa bytes crus. */
  bytes(b: Uint8Array): this {
    this.chunks.push(b);
    this.len += b.length;
    return this;
  }

  /** Concatena tudo num único Uint8Array. */
  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.len);
    let off = 0;
    for (const c of this.chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  }
}

/** Converte uma string UTF-16 (JS) numa sequência de bytes UTF-16BE (para CMaps/ToUnicode). */
export function utf16beHex(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out += ((c >> 8) & 0xff).toString(16).padStart(2, '0');
    out += (c & 0xff).toString(16).padStart(2, '0');
  }
  return out;
}
