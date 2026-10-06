/**
 * Conversor PowerPoint 97-2003 (.ppt binário) → .pptx (PresentationML) em
 * memória. O pipeline existente (PptxPackage.load → readPresentation/readSlide
 * → paintSlideTo, tempo/reprodução) roda sem mudanças sobre o resultado.
 *
 *   import { isCfb, convertPptToPptx } from './ppt/index.js';
 *   const pptx = isCfb(bytes) ? convertPptToPptx(bytes) : bytes;
 *
 * Specs: [MS-CFB] (contêiner), [MS-PPT] (registros), [MS-ODRAW] (desenhos).
 */
import { isCfbBytes } from './cfb.js';
import { readPptDocument, PptFormatError } from './ppt-reader.js';
import { pptDocumentToPptx, type ConvertOptions } from './to-pptx.js';

/** Bytes começam com a assinatura de Compound File (D0 CF 11 E0 A1 B1 1A E1)? */
export function isCfb(bytes: Uint8Array): boolean {
  return isCfbBytes(bytes);
}

/**
 * Converte um .ppt (bytes do arquivo) em um .pptx (bytes ZIP). Lança erro com
 * mensagem em português para arquivos criptografados, de versões não
 * suportadas ou corrompidos.
 */
export function convertPptToPptx(bytes: Uint8Array, options: ConvertOptions = {}): Uint8Array {
  if (!isCfbBytes(bytes)) throw new PptFormatError('O arquivo não é um .ppt (Compound File) — assinatura ausente.');
  try {
    const doc = readPptDocument(bytes);
    if (!doc.slides.length && !doc.masters.length) {
      throw new PptFormatError('Apresentação .ppt sem slides legíveis.');
    }
    return pptDocumentToPptx(doc, options);
  } catch (e) {
    if (e instanceof PptFormatError) throw e;
    // qualquer falha interna (arquivo corrompido de forma inesperada) vira erro de formato
    throw new PptFormatError(`Arquivo .ppt corrompido ou não suportado: ${(e as Error).message}`);
  }
}

export { PptFormatError } from './ppt-reader.js';
export { readPptDocument, type PptDocument, type PptSlide } from './ppt-reader.js';
export { pptToPptxParts, type ConvertOptions } from './to-pptx.js';
