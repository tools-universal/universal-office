// Sumário × parágrafo que COMEÇA com quebra de página: em que página o Word
// põe o indicador (PAGEREF) quando ele vem depois da quebra? O número da lista
// fica na página de cima (com a quebra) ou desce com o texto? E o espaço antes
// do parágrafo na página nova? Texto inventado.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const fld = (instr, cached) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${cached}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const bmS = (id, name) => `<w:bookmarkStart w:id="${id}" w:name="${name}"/>`;
const bmE = (id) => `<w:bookmarkEnd w:id="${id}"/>`;
const pbr = '<w:r><w:br w:type="page"/></w:r>';
const numbering = '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="multilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>';
const TABS = '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="8494"/></w:tabs>';
const NUM = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>';
const SB = '<w:spacing w:before="240" w:after="60"/>';

export const cases = [];
for (const compat of [15, 14, 11]) {
  const names = ['A', 'B', 'C', 'D', 'E'];
  let toc = '';
  names.forEach((n, i) => {
    const begin = i === 0 ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : '';
    const end = i === names.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '';
    toc += `<w:p><w:pPr>${TABS}</w:pPr>${begin}${r(`Capitulo ${n} Hxg`)}<w:r><w:tab/></w:r>${fld(`PAGEREF _Toc${i + 1} \\h`, '99')}${end}</w:p>`;
  });
  const body = toc
    + p(r('Texto da primeira pagina Hxg'))
    // A: numerado, quebra no início, indicador DEPOIS da quebra, espaço antes
    + `<w:p><w:pPr>${NUM}${SB}</w:pPr>${pbr}${bmS(1, '_Toc1')}${r('Capitulo A Hxg')}${bmE(1)}</w:p>`
    + p(r('Corpo A Hxg'))
    // B: numerado, indicador ANTES da quebra
    + `<w:p><w:pPr>${NUM}${SB}</w:pPr>${bmS(2, '_Toc2')}${pbr}${r('Capitulo B Hxg')}${bmE(2)}</w:p>`
    + p(r('Corpo B Hxg'))
    // C: sem numeração, quebra no início, indicador depois
    + `<w:p><w:pPr>${SB}</w:pPr>${pbr}${bmS(3, '_Toc3')}${r('Capitulo C Hxg')}${bmE(3)}</w:p>`
    + p(r('Corpo C Hxg'))
    // D: numerado, texto ANTES da quebra e indicador depois (meio do parágrafo)
    + `<w:p><w:pPr>${NUM}${SB}</w:pPr>${r('Antes Hxg')}${pbr}${bmS(4, '_Toc4')}${r('Capitulo D Hxg')}${bmE(4)}</w:p>`
    + p(r('Corpo D Hxg'))
    // E: quebra num run, indicador no mesmo run de texto depois (quebra + texto no MESMO w:r)
    + `<w:p><w:pPr>${NUM}${SB}</w:pPr>${bmS(5, '_Toc5')}<w:r><w:br w:type="page"/><w:t>Capitulo E Hxg</w:t></w:r>${bmE(5)}</w:p>`
    + p(r('Corpo E Hxg'));
  cases.push({ name: `tocref-pbstart-c${compat}`, docx: buildDocx({ body, compat, numbering, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// espaço ANTES no topo da página depois de quebra MANUAL: pageBreakBefore,
// quebra no fim do parágrafo anterior, parágrafo só com a quebra, quebra de
// seção (próxima página) e quebra natural (página cheia)
for (const compat of [15, 14, 11]) {
  const sp = (t) => `<w:p><w:pPr>${SB}</w:pPr>${r(t)}</w:p>`;
  const body = p(r('Inicio Hxg'))
    + `<w:p><w:pPr><w:pageBreakBefore/>${SB}</w:pPr>${r('F quebra antes Hxg')}</w:p>`
    + `<w:p>${r('Fim com quebra Hxg')}${pbr}</w:p>` + sp('G depois de quebra no fim Hxg')
    + p(pbr) + sp('H depois de paragrafo so com quebra Hxg')
    + `<w:p><w:pPr>${sectPr().replace('<w:sectPr>', '<w:sectPr><w:type w:val="nextPage"/>')}</w:pPr>${r('Fim da secao Hxg')}</w:p>` + sp('I depois de quebra de secao Hxg')
    + Array.from({ length: 60 }, (_, i) => p(r(`Linha ${i + 1} Hxg`))).join('') + sp('J depois de quebra natural Hxg');
  cases.push({ name: `tocref-spbefore-c${compat}`, docx: buildDocx({ body, compat, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}

// quebra de seção (próxima página) × espaço antes do 1º parágrafo da seção nova:
// parágrafo VAZIO × com texto, parágrafo da quebra vazio × com texto, com cabeçalho
for (const compat of [15, 11]) {
  const sectBreak = (withText) => `<w:p><w:pPr>${sectPr().replace('<w:sectPr>', '<w:sectPr><w:type w:val="nextPage"/>')}</w:pPr>${withText ? r('Fim da secao Hxg') : ''}</w:p>`;
  const variants = {
    vazio: `<w:p><w:pPr>${SB}</w:pPr></w:p>` + p(r('Texto depois do vazio Hxg')),
    texto: `<w:p><w:pPr>${SB}</w:pPr>${r('Texto com espaco antes Hxg')}</w:p>`,
    quebravazia: null,
    vaziocab: `<w:p><w:pPr>${SB}</w:pPr></w:p>` + p(r('Texto depois do vazio Hxg')),
  };
  for (const [name, v] of Object.entries(variants)) {
    const body = p(r('Inicio Hxg')) + sectBreak(name !== 'quebravazia')
      + (v ?? `<w:p><w:pPr>${SB}</w:pPr>${r('Texto com espaco antes Hxg')}</w:p>`) + p(r('Depois Hxg'));
    const headers = name === 'vaziocab' ? { default: p(r('Cabecalho Hxg')) } : {};
    cases.push({ name: `tocref-sect-${name}-c${compat}`, docx: buildDocx({ body, compat, headers, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
  }
}

// seção nova que começa com parágrafo VAZIO (antes/depois 6 pt, 1,15) seguido de
// título (antes 18 pt, keepNext): o espaço antes do vazio fica no topo?
{
  const G = '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Arial"/>';
  const emptyP = `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="0"/></w:tabs><w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/><w:rPr>${G}</w:rPr></w:pPr></w:p>`;
  const sectP = `<w:p><w:pPr><w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/><w:rPr>${G}</w:rPr>${sectPr()}</w:pPr></w:p>`;
  const title = (pPr) => `<w:p><w:pPr>${pPr}<w:spacing w:line="276" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>${r('Anexo de teste Hxg', G + '<w:b/>')}</w:p>`;
  const styles = '<w:style w:type="paragraph" w:styleId="Titulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="360" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr></w:style>';
  const variants = {
    titulo: emptyP + title('<w:pStyle w:val="Titulo1"/>'),
    texto: emptyP + p(r('Texto comum Hxg', G)),
    sotitulo: title('<w:pStyle w:val="Titulo1"/>'),
  };
  for (const [name, v] of Object.entries(variants)) {
    for (const hf of [false, true]) {
      const body = p(r('Inicio Hxg', G)) + emptyP + emptyP + sectP + v + p(r('Depois Hxg', G));
      const extra = hf ? { headers: { default: p(r('Cabecalho Hxg')) + p(r('Linha 2 Hxg')) + p(r('Linha 3 Hxg')) }, footers: { default: p(r('Rodape Hxg')) } } : {};
      cases.push({ name: `tocref-sect2-${name}${hf ? '-hf' : ''}`, docx: buildDocx({ body, styles, ...extra, defaults: docDefaults({ font: 'Georgia', size: 11, after: 160, line: 259 }) }) });
    }
  }
}

// o espaço antes no topo da seção nova desconta o "depois" do último parágrafo
// da seção anterior? (depois X, antes Y) × colapso HTML (padrão) × soma
// (doNotUseHTMLParagraphAutoSpacing); e o mesmo para parágrafo que começa com quebra
{
  const pairs = [[6, 18], [18, 6], [12, 12], [0, 12], [9, 15]];
  for (const add of [false, true]) {
    let body = p(r('Inicio Hxg'));
    for (const [a, b] of pairs) {
      const sp = (before, after) => `<w:spacing w:before="${before * 20}" w:after="${after * 20}"/>`;
      body += `<w:p><w:pPr>${sp(0, a)}${sectPr()}</w:pPr>${r(`Fim secao depois ${a} Hxg`)}</w:p>`;
      body += `<w:p><w:pPr>${sp(b, 0)}</w:pPr>${r(`Secao antes ${b} Hxg`)}</w:p>`;
    }
    for (const [a, b] of pairs) {
      body += `<w:p><w:pPr><w:spacing w:before="0" w:after="${a * 20}"/></w:pPr>${r(`Antes da quebra depois ${a} Hxg`)}</w:p>`;
      body += `<w:p><w:pPr><w:spacing w:before="${b * 20}" w:after="0"/></w:pPr>${pbr}${r(`Quebra no inicio antes ${b} Hxg`)}</w:p>`;
    }
    cases.push({ name: `tocref-sectgap${add ? '-soma' : ''}`, docx: buildDocx({ body, extraCompat: add ? '<w:doNotUseHTMLParagraphAutoSpacing/>' : '', defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
  }
}
