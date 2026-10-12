// Configurações de hifenização para os casos do oráculo (grupos hyph*): o
// docx-builder grava w:settings sem elas; aqui entram logo depois de
// w:defaultTabStop (ordem do esquema: autoHyphenation, consecutiveHyphenLimit,
// hyphenationZone, doNotHyphenateCaps).
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';

/** settings de hifenização: { auto = true, zone, limit, noCaps } */
export function hyphenationXml({ auto = true, zone, limit, noCaps = false } = {}) {
  return (auto ? '<w:autoHyphenation/>' : '')
    + (limit !== undefined ? `<w:consecutiveHyphenLimit w:val="${limit}"/>` : '')
    + (zone !== undefined ? `<w:hyphenationZone w:val="${zone}"/>` : '')
    + (noCaps ? '<w:doNotHyphenateCaps/>' : '');
}

/** O .docx com as configurações de hifenização acrescentadas. */
export function withHyphenation(docx, opts = {}) {
  const f = unzipSync(docx);
  const s = strFromU8(f['word/settings.xml']);
  f['word/settings.xml'] = strToU8(s.replace(/(<w:defaultTabStop[^>]*\/>)/, `$1${hyphenationXml(opts)}`));
  return zipSync(f, { level: 6 });
}

/** Seção A4 de margens estreitas (0,4"): linhas com a largura dada pelo recuo direito. */
export const NARROW_SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>';
export const NARROW_TEXTW = 11906 - 2 * 567;

/** Hífen opcional (w:softHyphen) como run: "respon|sabilidade" → runs com o hífen no '|'. */
export function shyRuns(text, rPr = '', r) {
  return text.split('|').map((t) => r(t, rPr)).join('<w:r><w:softHyphen/></w:r>');
}
