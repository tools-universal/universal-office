// Compressão da justificação no modo 11 com o perfil de compatibilidade do Word
// 2003 japonês (useFELayout, idioma EA ja-JP, kern, flags de layout do leste asiático): o justify6 mede
// que o modo 11 "puro" não comprime; aqui isolamos o que liga a compressão.
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXT_W = 11906 - 1701 * 2; // twips
export const cases = [];
const VARIANTS = [
  ['fe', '<w:useFELayout/>', 'ja-JP', false],
  ['fekern', '<w:useFELayout/>', 'ja-JP', true],
  ['kern', '', 'pt-BR', true],
  ['all', '<w:spaceForUL/><w:balanceSingleByteDoubleByteWidth/><w:doNotLeaveBackslashAlone/><w:ulTrailSpace/><w:doNotExpandShiftReturn/><w:adjustLineHeightInTable/><w:useFELayout/><w:useNormalStyleForList/><w:doNotUseIndentAsNumberingTabStop/><w:useAltKinsokuLineBreakRules/><w:allowSpaceOfSameStyleInTable/><w:doNotSuppressIndentation/><w:doNotAutofitConstrainedTables/><w:autofitToFirstFixedWidthCell/><w:displayHangulFixedWidth/><w:splitPgBreakAndParaMark/><w:doNotVertAlignCellWithSp/><w:doNotBreakConstrainedForcedTable/><w:doNotVertAlignInTxbx/><w:useAnsiKerningPairs/><w:cachedColBalance/>', 'ja-JP', true],
];
const configs = [['Arial', 11, 6, 'mmmm'], ['Times New Roman', 11, 12, 'mmmm']];
for (const [vname, flags, ea, kern] of VARIANTS) for (const [font, size, words, w] of configs) {
  const face = prov.face(font, false, false);
  const u = face.font.metrics.unitsPerEm;
  const W = (t) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0))) * size * 20) / u, 0);
  const first = Array.from({ length: words - 1 }, () => w).join(' ') + ' FIM';
  const nat = W(first);
  const spaces = words - 1;
  const sp = W(' ');
  // janela: de 2% de excesso a 40% de compressão, em passos de 4 twips
  const lo = TEXT_W - nat - 0.02 * spaces * sp;           // recuo pequeno → cabe sem comprimir
  const steps = Math.ceil((0.42 * spaces * sp) / 4);
  let body = '';
  const meta = [];
  for (let k = 0; k <= steps; k++) {
    const ind = Math.max(0, Math.round(lo + k * 4));
    meta.push(ind);
    body += p(r(`${first} segunda linha que continua`, sz(size)), `<w:jc w:val="both"/><w:ind w:right="${ind}"/><w:spacing w:after="0"/>`);
  }
  cases.push({ name: `c11${vname}-thr-${font.toLowerCase().replace(/\s+/g, '-')}-${size}-${words}-${w.length}${w[0]}`, docx: buildDocx({ body, compat: 11, extraCompat: flags, defaults: docDefaults({ font, size: 11, kern, lang: 'pt-BR' }).replace('w:eastAsia="en-US"', `w:eastAsia="${ea}"`) }) });
}
