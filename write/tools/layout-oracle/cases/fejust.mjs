// Layout asiático ligado pela fonte asiática PADRÃO do documento (docDefaults w:eastAsia
// do Leste Asiático — MS Gothic, Yu Gothic…), com as opções de compatibilidade dos
// modelos japoneses (balanceSingleByteDoubleByteWidth, useFELayout, doNotLeaveBackslashAlone…):
//  - modos ≤ 14 com characterSpacingControl ≠ doNotCompress: o hífen e o travessão (em) NÃO
//    são oportunidade de quebra ("self-|guided" desce inteiro); o meia-risca (en) é no
//    modo 14, não nos ≤ 12; a barra nunca. Com doNotCompress ou no modo 15, quebra normal;
//  - balanceSingleByteDoubleByteWidth: espaços comuns SEGUIDOS (dois ou mais) medem meio em
//    cada (dois = um caractere de largura dupla), qualquer que seja a fonte asiática, e não
//    comprimem nem expandem no justificado; o espaço isolado fica como está (modos 14 e 15);
//  - doNotLeaveBackslashAlone: com idioma eastAsia japonês no texto, a barra invertida sai
//    como o iene "¥" (U+00A5) da fonte do run.
// Fonte asiática padrão latina (Arial): nada disso.
import { buildDocx, p, r, sz, esc } from '../docx-builder.mjs';
import { createNodeFontProvider } from '../../corpus-lab/node-fonts.mjs';

const prov = await createNodeFontProvider();
const TEXTW = 11906 - 2 * 1701;
const width = (fam, pt) => { const f = prov.face(fam, false, false).font; return (t) => [...t].reduce((a, c) => a + (f.advanceWidth(f.glyphId(c.codePointAt(0))) * pt * 20) / f.metrics.unitsPerEm, 0); };
const defaults = (ea) => `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="${esc(ea)}" w:hAnsi="Arial" w:cs="Arial"/>${sz(10.5)}<w:lang w:val="en-US" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`;
const REST = '<w:spaceForUL/><w:doNotLeaveBackslashAlone/><w:ulTrailSpace/><w:doNotExpandShiftReturn/><w:adjustLineHeightInTable/>';
const BAL = '<w:balanceSingleByteDoubleByteWidth/>';
const FE = '<w:useFELayout/>';
const JA = '<w:lang w:eastAsia="ja-JP"/>';
const font = (fam) => `<w:rFonts w:ascii="${fam}" w:hAnsi="${fam}" w:cs="${fam}"/>`;

function body() {
  let b = '';
  // 1) hífen, travessões, barra: "self" + separador cabe com folga de 160 twips, a palavra inteira não
  {
    const W = width('Times New Roman', 11);
    const S = 'The garden club meets every second week near the old river to plant young trees, and later there is a';
    const rp = font('Times New Roman') + '<w:sz w:val="22"/>';
    for (const [sep, lang, jc] of [['-', '', 'left'], ['-', JA, 'left'], ['-', JA, 'both'], ['–', '', 'left'], ['—', '', 'left'], ['/', '', 'left']]) {
      const A = Math.round(W(S + ' self' + sep) + 160);
      b += p(r(S + ' self' + sep + 'guided walk along the shore for every visitor.', rp + lang), `<w:jc w:val="${jc}"/><w:ind w:right="${TEXTW - A}"/>`);
    }
  }
  // 2) justificado: vão simples, duplo/triplo no meio ou duplo antes da palavra; excesso =
  //    q × (espaços da linha pela largura da fonte)
  {
    const W = width('Arial', 10.5);
    for (const [gap, where] of [[' ', 'meio'], ['  ', 'meio'], ['   ', 'meio'], ['  ', 'antes']]) for (const q of [0.02, 0.05, 0.08, 0.11, 0.14, 0.2, 0.24]) {
      let words = 'as aves do parque voam sobre o lago quando o sol nasce e a brisa fresca chega';
      if (where === 'meio') words = words.replace('fresca ', 'fresca' + gap);
      const first = words + (where === 'antes' ? gap : ' ') + 'logo';
      const A = Math.round(W(first) - q * W(first.replace(/[^ ]/g, '')));
      b += p(r(first + ' e o dia segue claro.', font('Arial')), `<w:jc w:val="both"/><w:ind w:right="${TEXTW - A}"/>`);
    }
  }
  // 3) larguras (alinhado à direita: o x da 1ª letra mede a linha): espaços seguidos, barra invertida
  for (const [fam, pt] of [['Arial', 10.5], ['Times New Roman', 12]]) {
    for (const k of [1, 2, 3, 4]) b += p(r('ab' + ' '.repeat(k) + 'cd', font(fam) + sz(pt)), '<w:jc w:val="right"/>');
    b += p(r('xa b' + '  ' + 'c' + '   ' + 'd', font(fam) + sz(pt)) + r(' ', font(fam) + sz(pt)) + r(' e', font(fam) + sz(pt)), '<w:jc w:val="right"/>');
  }
  for (const [hint, lang] of [[true, true], [true, false], [false, true]]) {
    const rp = `<w:rFonts w:ascii="Times New Roman" w:eastAsia="MS Mincho" w:hAnsi="Times New Roman" w:cs="Times New Roman"${hint ? ' w:hint="eastAsia"' : ''}/>${sz(10)}${lang ? JA : ''}`;
    b += p(r('x', font('Times New Roman')) + r('\\'.repeat(10) + '10', rp) + r('x', font('Times New Roman')), '<w:jc w:val="right"/>');
  }
  return b;
}
export const cases = [];
for (const [nm, compat, flags, ea, cs] of [
  ['jp-c14', 14, REST + BAL + FE, 'MS Gothic', 'compressPunctuation'],
  ['jp-c15', 15, REST + BAL + FE, 'MS Gothic', 'compressPunctuation'],
  ['yu-c15', 15, REST + BAL + FE, 'Yu Gothic', 'compressPunctuation'],
  ['nc-c15', 15, REST + BAL + FE, 'MS Gothic', 'doNotCompress'],
  ['nc-c14', 14, REST + BAL + FE, 'MS Gothic', 'doNotCompress'],
  ['nc-c11', 11, '', 'MS Mincho', 'doNotCompress'],
  ['cp-c11', 11, '', 'MS Mincho', 'compressPunctuation'],
  ['cp-c12', 12, '', 'MS Mincho', 'compressPunctuation'],
  ['bal-c14', 14, BAL, 'MS Gothic', 'compressPunctuation'],
  ['bal-c15', 15, BAL, 'MS Gothic', 'compressPunctuation'],
  ['fe-c15', 15, FE, 'MS Gothic', 'compressPunctuation'],
  ['rest-c15', 15, REST, 'MS Gothic', 'compressPunctuation'],
  ['nofl-c14', 14, '', 'MS Gothic', 'compressPunctuation'],
  ['lat-c14', 14, REST + BAL + FE, 'Arial', 'compressPunctuation'],
  ['lat-c15', 15, REST + BAL + FE, 'Arial', 'compressPunctuation'],
]) cases.push({ name: `fj-${nm}`, docx: buildDocx({ body: body(), compat, charSpacing: cs, extraCompat: flags, defaults: defaults(ea) }) });
