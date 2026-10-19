import { unzipSync, zipSync, type Zippable } from 'fflate';

/**
 * Leitor de container ODF (um ZIP, como o .docx).
 *
 * Reaproveita o mesmo fflate que `DocxPackage` (packages/docx-core/src/package.ts)
 * usa por baixo — não introduz dependência nova. `DocxPackage` não serve direto
 * aqui porque ele exige `word/document.xml`; um .odt expõe `content.xml`/`styles.xml`.
 */
export class OdfPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  private readonly parts: Map<string, Uint8Array>;

  private constructor(parts: Map<string, Uint8Array>) {
    this.parts = parts;
  }

  static load(bytes: Uint8Array): OdfPackage {
    let unzipped: ReturnType<typeof unzipSync>;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error('Arquivo não é um pacote ODF válido (ZIP corrompido)');
    }
    return new OdfPackage(new Map(Object.entries(unzipped)));
  }

  getPart(path: string): Uint8Array | undefined {
    return this.parts.get(path);
  }

  getPartText(path: string): string | undefined {
    const data = this.parts.get(path);
    return data === undefined ? undefined : new TextDecoder().decode(data);
  }

  partNames(): string[] {
    return [...this.parts.keys()];
  }
}

/**
 * Escreve um ZIP a partir de um mapa caminho→bytes — mesmo `zipSync` do
 * DocxPackage.save(). Usado pelos testes para montar um .odt em memória.
 *
 * O ODF exige que `mimetype` seja a PRIMEIRA entrada e fique STORED (sem
 * compressão). `level: 0` para essa entrada garante STORED; a ordem de
 * inserção do objeto é preservada pelo fflate.
 */
export function writeZip(files: Record<string, Uint8Array>): Uint8Array {
  const zippable: Zippable = {};
  for (const [path, data] of Object.entries(files)) {
    zippable[path] = path === 'mimetype' ? [data, { level: 0 }] : data;
  }
  return zipSync(zippable, { level: 6 });
}
