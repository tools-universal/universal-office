/**
 * Conversor Word 97-2003 (.doc binário, [MS-DOC]) → .docx (WordprocessingML)
 * em memória. O editor abre o resultado com DocxPackage.load/readFullDocument
 * sem mudanças.
 *
 *   import { isWordBinary, convertDocToDocx } from './doc/index.js';
 *   const docx = isWordBinary(bytes) ? convertDocToDocx(bytes) : bytes;
 *
 * Specs: [MS-CFB] (contêiner), [MS-DOC] (FIB, peças, FKPs, sprms, estilos,
 * listas, tabelas, seções), [MS-ODRAW] (imagens e formas).
 *
 * Porta .NET: dotnet/src/OfficeNext.DocBinary (partes idênticas às daqui). Mudou
 * algo neste módulo? Porte a mudança e regenere as fixtures de paridade
 * (`node tools/gen-parity-doc.mjs`, com o dist do docx-core recompilado).
 */
import { isCfbBytes, readCfb } from './cfb.js';
import { DocFormatError } from './fib.js';
import { DocReader } from './reader.js';
import { DocxWriter, type ConvertOptions } from './docx-writer.js';

/** Compound File com um stream "WordDocument" (documento do Word 97-2003)? */
export function isWordBinary(bytes: Uint8Array): boolean {
  if (!isCfbBytes(bytes)) return false;
  try {
    return readCfb(bytes).has('WordDocument');
  } catch {
    return false;
  }
}

/**
 * Converte um .doc (bytes do arquivo) em .docx (bytes ZIP). Lança
 * DocFormatError com mensagem em português para arquivos criptografados, de
 * versões anteriores ao Word 97 ou corrompidos.
 */
export function convertDocToDocx(bytes: Uint8Array, options: ConvertOptions = {}): Uint8Array {
  if (!isCfbBytes(bytes)) throw new DocFormatError('O arquivo não é um .doc do Word 97-2003 (assinatura de Compound File ausente).');
  try {
    const reader = new DocReader(bytes);
    return new DocxWriter(reader).build(options);
  } catch (e) {
    if (e instanceof DocFormatError) throw e;
    throw new DocFormatError(`Arquivo .doc corrompido ou não suportado: ${(e as Error).message}`);
  }
}

export { DocFormatError } from './fib.js';
export type { ConvertOptions } from './docx-writer.js';
