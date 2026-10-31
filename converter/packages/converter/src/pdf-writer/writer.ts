import { zlibSync } from 'fflate';
import { ByteBuilder } from './bytes.js';

/**
 * Writer PDF de baixo nível: aloca objetos indiretos, serializa dicionários e
 * streams, monta a tabela xref clássica e o trailer. Sem conhecimento de fontes
 * ou layout — só a mecânica do formato (PDF 1.7, ISO 32000-1).
 */
export class PdfWriter {
  /** Corpo serializado de cada objeto (índice 0 = objeto 1). null = ainda não definido. */
  private bodies: (Uint8Array | null)[] = [];
  private compress: boolean;

  constructor(opts: { compress?: boolean } = {}) {
    this.compress = opts.compress ?? true;
  }

  /** Reserva um número de objeto (1-based) para referência antecipada. */
  alloc(): number {
    this.bodies.push(null);
    return this.bodies.length;
  }

  /** Define o corpo de um objeto já alocado (entre `obj`/`endobj`). */
  define(num: number, body: Uint8Array | string): void {
    this.bodies[num - 1] = typeof body === 'string' ? new ByteBuilder().str(body).toUint8Array() : body;
  }

  /** Atalho: aloca e define um dicionário a partir de uma string `<< ... >>`. */
  addDict(dict: string): number {
    const n = this.alloc();
    this.define(n, dict);
    return n;
  }

  /**
   * Aloca e define um objeto stream. `dict` são as entradas extras do dicionário
   * (sem `/Length`, sem `<<`/`>>`). Comprime com FlateDecode quando habilitado e
   * vantajoso. Retorna o número do objeto.
   */
  addStream(dict: string, data: Uint8Array, opts: { allowCompress?: boolean } = {}): number {
    const n = this.alloc();
    this.defineStream(n, dict, data, opts);
    return n;
  }

  defineStream(num: number, dict: string, data: Uint8Array, opts: { allowCompress?: boolean } = {}): void {
    let payload = data;
    let filter = '';
    if (this.compress && (opts.allowCompress ?? true) && data.length > 64) {
      // /FlateDecode espera um stream zlib (RFC 1950), não deflate cru (RFC 1951)
      const z = zlibSync(data);
      // só vale a pena se realmente reduzir
      if (z.length < data.length) {
        payload = z;
        filter = ' /Filter /FlateDecode';
      }
    }
    const head = `<< ${dict.trim()}${filter} /Length ${payload.length} >>\nstream\n`;
    const b = new ByteBuilder();
    b.str(head).bytes(payload).str('\nendstream');
    this.define(num, b.toUint8Array());
  }

  /** Monta o arquivo PDF completo, com xref clássico e trailer. `root` = obj do /Catalog. */
  build(root: number): Uint8Array {
    const out = new ByteBuilder();
    out.str('%PDF-1.7\n');
    // bytes binários no comentário inicial sinalizam arquivo binário a ferramentas
    out.bytes(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3])).str('\n');

    const offsets: number[] = new Array(this.bodies.length).fill(0);
    for (let i = 0; i < this.bodies.length; i++) {
      const body = this.bodies[i];
      if (!body) throw new Error(`Objeto PDF ${i + 1} alocado mas não definido`);
      offsets[i] = out.length;
      out.str(`${i + 1} 0 obj\n`).bytes(body).str('\nendobj\n');
    }

    const xrefOffset = out.length;
    const count = this.bodies.length + 1; // +1 pelo objeto livre 0
    out.str(`xref\n0 ${count}\n`);
    out.str('0000000000 65535 f \n');
    for (let i = 0; i < this.bodies.length; i++) {
      out.str(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    out.str('trailer\n');
    out.str(`<< /Size ${count} /Root ${root} 0 R >>\n`);
    out.str(`startxref\n${xrefOffset}\n%%EOF\n`);
    return out.toUint8Array();
  }
}
