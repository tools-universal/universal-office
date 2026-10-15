import { XlsxPackage } from './package.js';
import { isXlsBytes, xlsToXlsxPackage } from './xls/index.js';

/**
 * Abre uma pasta de trabalho pelos bytes, qualquer que seja o formato
 * suportado: .xlsx/.xlsm (ZIP OOXML) ou .xls (Compound File BIFF5/8, convertido
 * em memória para o pacote OOXML equivalente). Detecta pela assinatura.
 */
export function openSpreadsheet(bytes: Uint8Array): XlsxPackage {
  return isXlsBytes(bytes) ? xlsToXlsxPackage(bytes) : XlsxPackage.load(bytes);
}
