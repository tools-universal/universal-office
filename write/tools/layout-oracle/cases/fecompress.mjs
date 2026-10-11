// Layout asiático nos modos de compatibilidade ≤ 14, ligado pela fonte asiática
// PADRÃO do documento (docDefaults w:eastAsia) ser do Leste Asiático (MS Mincho…):
//  - characterSpacingControl ≠ doNotCompress: para a palavra caber, cada espaço
//    comprime até METADE da largura média da sua fonte (OS/2 xAvgCharWidth) — também
//    no alinhado à esquerda (Arial ~20%, Times ~19%, Verdana ~27%, Calibri nada);
//  - idioma eastAsia ja/zh/ko no texto: a pontuação final (",", ".", ")"…) pendura
//    além da margem direita (w:overflowPunct).
// No modo 15, com a fonte asiática só no estilo, ou com doNotCompress, nada disso.
import { strToU8 } from 'fflate';
import { buildDocx, p, r, sz, esc, lorem } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const font = (fam) => prov.face(fam, false, false).font;
const width = (fam, pt) => { const f = font(fam); return (t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * pt * 20) / f.metrics.unitsPerEm, 0); };
const defaults = (fam, pt, ea, eaLang) => `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${fam}"${ea ? ` w:eastAsia="${esc(ea)}"` : ''} w:hAnsi="${fam}" w:cs="${fam}"/>${sz(pt)}<w:lang w:val="pt-BR" w:eastAsia="${eaLang}" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
// fração do espaço que comprime: (espaço − ½·xAvgCharWidth) / espaço
function shrinkRatio(fam) {
  const f = font(fam);
  const sp = f.advanceWidth(f.glyphId(32));
  // OS/2 xAvgCharWidth (direto da tabela, se o provedor ainda não o expõe)
  const t = f.tables?.get?.('OS/2');
  const os2 = f.metrics.xAvgCharWidth ?? (t ? f.view.getInt16(t.offset + 2) : undefined);
  return os2 ? Math.max(0, (sp - os2 / 2) / sp) : 0;
}
export const cases = [];
// compressão: excesso = (limiar ± 3%) × espaços
for (const [fam, pt] of [['Arial', 12], ['Times New Roman', 12], ['Verdana', 10], ['Georgia', 11], ['Calibri', 11]]) {
  const W = width(fam, pt);
  const thr = shrinkRatio(fam);
  for (const [nm, compat, csc, ddEa, styleEa] of [['cp-c11', 11, 'compressPunctuation', 'MS Mincho', ''], ['cp-c14', 14, 'compressPunctuation', 'MS Mincho', ''],
    ['cp-c15', 15, 'compressPunctuation', 'MS Mincho', ''], ['nc-c11', 11, 'doNotCompress', 'MS Mincho', ''], ['estilo-c11', 11, 'compressPunctuation', '', 'MS Mincho']]) {
    let body = '';
    for (const jc of ['left', 'both']) for (const n of [5, 9]) for (const d of [-0.06, -0.03, 0.03, 0.06]) {
      const words = lorem(n, 20 + n).replace(/\.$/, '').split(' ').slice(0, n).join(' ');
      const first = words + ' FIM';
      const ratio = Math.max(0.01, thr + d);
      const A = Math.round(W(first) - ratio * n * W(' '));
      body += p(r(`${first} segunda linha que continua`), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
    }
    cases.push({ name: `fc-${fam.toLowerCase().replace(/\s+/g, '')}-${nm}`, docx: buildDocx({ body, compat, charSpacing: csc, defaults: defaults(fam, pt, ddEa, 'pt-BR'), ...(styleEa ? { normal: `<w:rPr><w:rFonts w:eastAsia="${esc(styleEa)}"/></w:rPr>` } : {}) }) });
  }
}
// com balanceSingleByteDoubleByteWidth o espaço comprime só até ¼ de em (Arial ~10%,
// Tahoma ~20%, Verdana ~29%, Times nada); a fonte asiática listada no fontTable com
// conjunto de caracteres japonês (80) conta mesmo sem estar entre as conhecidas
const fontTable = (name) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="${esc(name)}"><w:charset w:val="80"/><w:family w:val="swiss"/><w:pitch w:val="variable"/></w:font></w:fonts>`;
for (const [fam, pt] of [['Arial', 11], ['Tahoma', 11], ['Verdana', 10], ['Times New Roman', 12]]) {
  const W = width(fam, pt);
  const sp = W(' ');
  const thr = Math.max(0, (sp - (pt * 20) / 4) / sp);
  for (const ea of ['MS Mincho', 'MS PGothic']) {
    let body = '';
    for (const jc of ['left', 'both']) for (const d of [-0.04, -0.02, 0.02, 0.04]) {
      const words = lorem(8, 60).replace(/\.$/, '').split(' ').slice(0, 8).join(' ');
      const first = words + ' FIM';
      const ratio = Math.max(0.005, thr + d);
      const A = Math.round(W(first) - ratio * 8 * sp);
      body += p(r(`${first} segunda linha que continua`), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
    }
    cases.push({ name: `fb-${fam.toLowerCase().replace(/\s+/g, '')}-${ea.toLowerCase().replace(/\s+/g, '')}`, docx: buildDocx({ body, compat: 11, charSpacing: 'compressPunctuation', extraCompat: '<w:balanceSingleByteDoubleByteWidth/>', extraParts: { 'word/fontTable.xml': strToU8(fontTable(ea)) }, defaults: defaults(fam, pt, ea, 'pt-BR') }) });
  }
}
// pontuação pendurada: excesso = largura da pontuação ± 15 twips
{
  const W = width('Arial', 11);
  for (const [nm, compat, ddEa, lang, extra] of [['ko-c11', 11, 'MS Mincho', 'ko-KR', ''], ['zh-c11', 11, 'MS Mincho', 'zh-CN', ''], ['ko-c11-tnr', 11, 'Times New Roman', 'ko-KR', ''],
    ['ko-c15', 15, 'MS Mincho', 'ko-KR', ''], ['pt-c11', 11, 'MS Mincho', 'pt-BR', ''], ['ko-c11-semoverflow', 11, 'MS Mincho', 'ko-KR', '<w:overflowPunct w:val="0"/>']]) {
    let body = '';
    for (const pc of [',', '.', ')', ';']) for (const jc of ['left', 'both']) for (const d of [-15, 15]) {
      const first = lorem(12, 40).replace(/\.$/, '').split(' ').slice(0, 11).join(' ') + ' fim' + pc;
      const over = W(pc) + d;
      const A = Math.round(W(first) - over);
      body += p(r(`${first} segunda linha que continua`), `${extra}<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
    }
    cases.push({ name: `fh-${nm}`, docx: buildDocx({ body, compat, defaults: defaults('Arial', 11, ddEa, lang) }) });
  }
}
