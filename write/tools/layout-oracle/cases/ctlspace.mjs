// Quebra de linha LITERAL dentro de w:t (LF, CR, CRLF, inclusive como referência &#10;
// e &#13;): o Word a mostra como um ESPAÇO (e assim a grava) — só w:br/w:cr quebram a
// linha. CRLF vale um espaço só. TAB literal (ou &#9;) é tabulação.
import { buildDocx, p, docDefaults } from '../docx-builder.mjs';

const t = (s) => `<w:r><w:t xml:space="preserve">${s}</w:t></w:r>`;
const t0 = (s) => `<w:r><w:t>${s}</w:t></w:r>`;
const body = [
  p(t('abc\ndefgh LF')), p(t('abc\rdefgh CR')), p(t('abc\r\ndefgh CRLF')), p(t('abc\tdefgh TAB')), p(t0('abc\ndefgh LF sem preserve')),
  p(t('abc  \n  defgh LF com espacos')), p(t('abc&#10;defgh ent10')), p(t('abc&#13;defgh ent13')), p(t('abc&#9;defgh ent9')),
].join('');
export const cases = [{ name: 'cs-basico', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }) }];
