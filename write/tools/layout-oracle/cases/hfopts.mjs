// Frente Cabeçalho e rodapé: paginação das opções da guia — Primeira Página
// Diferente (w:titlePg), Páginas Pares e Ímpares (w:evenAndOddHeaders), herança
// entre seções (vincular ao anterior), distâncias da borda, formato e capítulo
// do número de página (w:pgNumType fmt/start/chapStyle/chapSep) e a tabulação
// de alinhamento (w:ptab) — no XML que o Word grava (oráculo de edição em
// tools/hf-lab). O texto de cada cabeçalho/rodapé diz qual parte é.
import { buildDocx, docDefaults, lorem, p, r } from '../docx-builder.mjs';

const geo = (extra = '', hdr = 708, ftr = 708) => `<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="${hdr}" w:footer="${ftr}" w:gutter="0"/>${extra}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/>`;
const sect = (inner = '', extra = '', hdr, ftr) => `<w:sectPr>${inner}${geo(extra, hdr, ftr)}</w:sectPr>`;
const ref = (k, t, key = t) => `<w:${k}Reference w:type="${t}" r:id="rId_${k}_${key}"/>`;
const pgbr = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
/** n páginas de texto curto (uma quebra de página entre elas) */
const pages = (n, tag = 'Pagina') => Array.from({ length: n }, (_, i) => p(r(`${tag} ${i + 1} Hxg. ${lorem(30, i + 1)}`)) + (i < n - 1 ? pgbr : '')).join('');
const field = (instr) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const hp = (text) => p(r(`${text} Hxg`));
const defaults = docDefaults({ font: 'Arial', size: 11 });
const EO = '<w:evenAndOddHeaders/>';

export const cases = [
  // primeira página diferente: capa com "first", demais com "default"
  { name: 'tp-first', docx: buildDocx({ body: pages(3), headers: { default: hp('Cab padrao'), first: hp('Cab primeira') }, footers: { default: hp('Rod padrao'), first: hp('Rod primeira') }, sect: sect('', '<w:titlePg/>'), defaults }) },
  // titlePg sem parte "first": a capa fica sem cabeçalho
  { name: 'tp-nofirst', docx: buildDocx({ body: pages(2), headers: { default: hp('Cab padrao') }, sect: sect('', '<w:titlePg/>'), defaults }) },
  // pares e ímpares (settings): página par usa "even"
  { name: 'eo-even', docx: buildDocx({ body: pages(4), headers: { default: hp('Cab impar'), even: hp('Cab par') }, footers: { default: hp('Rod impar'), even: hp('Rod par') }, settings: EO, defaults }) },
  // pares e ímpares sem parte "even": páginas pares sem cabeçalho
  { name: 'eo-noeven', docx: buildDocx({ body: pages(3), headers: { default: hp('Cab impar') }, settings: EO, defaults }) },
  // os dois: capa "first", depois par/ímpar
  { name: 'eo-tp', docx: buildDocx({ body: pages(4), headers: { default: hp('Cab impar'), even: hp('Cab par'), first: hp('Cab primeira') }, settings: EO, sect: sect('', '<w:titlePg/>'), defaults }) },
  // pgNumType start par: a 1ª página é a 2 → par
  { name: 'eo-start2', docx: buildDocx({ body: pages(3), headers: { default: hp('Cab impar'), even: hp('Cab par') }, settings: EO, sect: sect('', '<w:pgNumType w:start="2"/>'), defaults }) },
];

// herança entre seções (vincular ao anterior)
{
  const s1 = (extra = '') => sect(ref('header', 'default') + ref('header', 'first') + ref('footer', 'default'), extra);
  const brk = (sp) => `<w:p><w:pPr>${sp}</w:pPr>${r('Fim da secao Hxg')}</w:p>`;
  cases.push(
    // s2 sem refs e com titlePg: herda "first" e "default" da s1
    { name: 'ln-inherit-first', docx: buildDocx({ body: pages(2, 'S1') + brk(s1('<w:titlePg/>')) + pages(2, 'S2'), headers: { default: hp('Cab S1 padrao'), first: hp('Cab S1 primeira') }, footers: { default: hp('Rod S1') }, sect: '<w:sectPr w:rsidR="00000001">' + geo('<w:titlePg/>') + '</w:sectPr>', defaults }) },
    // s2 com parte própria só para "default" (desvinculada); "first" herdado
    { name: 'ln-own-default', docx: buildDocx({ body: pages(2, 'S1') + brk(s1('<w:titlePg/>')) + pages(2, 'S2'), headers: { default: hp('Cab S1 padrao'), first: hp('Cab S1 primeira'), s2: hp('Cab S2 proprio') }, footers: { default: hp('Rod S1') }, sect: `<w:sectPr w:rsidR="00000001">${ref('header', 'default', 's2')}${geo('<w:titlePg/>')}</w:sectPr>`, defaults }) },
    // s1 sem titlePg, s2 com titlePg e sem "first" em lugar nenhum: capa da s2 em branco
    { name: 'ln-first-none', docx: buildDocx({ body: pages(2, 'S1') + brk(sect(ref('header', 'default'))) + pages(2, 'S2'), headers: { default: hp('Cab S1 padrao') }, sect: '<w:sectPr w:rsidR="00000001">' + geo('<w:titlePg/>') + '</w:sectPr>', defaults }) },
  );
}

// distâncias da borda (w:pgMar header/footer), também maiores que a margem
const tall = Array.from({ length: 3 }, (_, k) => hp(`Rodape linha ${k + 1}`)).join('');
cases.push(
  { name: 'dist-2cm', docx: buildDocx({ body: pages(2), headers: { default: hp('Cab 2cm') }, footers: { default: tall }, sect: sect('', '', 1134, 850), defaults }) },
  { name: 'dist-big', docx: buildDocx({ body: pages(2), headers: { default: hp('Cab longe') }, footers: { default: hp('Rod longe') }, sect: sect('', '', 2500, 2200), defaults }) },
  { name: 'dist-small', docx: buildDocx({ body: pages(2), headers: { default: hp('Cab perto') }, footers: { default: hp('Rod perto') }, sect: sect('', '', 200, 150), defaults }) },
);

// formato do número de página
const pgFtr = { default: p(r('Pagina ') + field('PAGE'), '<w:jc w:val="center"/>') };
for (const [name, attrs] of [
  ['fmt-lroman', 'w:fmt="lowerRoman" w:start="3"'], ['fmt-uroman', 'w:fmt="upperRoman"'], ['fmt-uletter', 'w:fmt="upperLetter"'],
  ['fmt-lletter', 'w:fmt="lowerLetter" w:start="26"'], ['fmt-dash', 'w:fmt="numberInDash"'], ['fmt-start0', 'w:start="0"'],
]) cases.push({ name, docx: buildDocx({ body: pages(3), footers: pgFtr, sect: sect('', `<w:pgNumType ${attrs}/>`), defaults }) });

// número do capítulo: Título 1 numerado por lista ligada ao estilo
const numbering = '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo1"/><w:lvlText w:val="%1"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="432" w:hanging="432"/></w:pPr></w:lvl>'
  + '<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo2"/><w:lvlText w:val="%1.%2"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="576" w:hanging="576"/></w:pPr></w:lvl></w:abstractNum>'
  + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
const romanNumbering = numbering.replace('<w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo1"/><w:lvlText w:val="%1"/>', '<w:numFmt w:val="upperRoman"/><w:pStyle w:val="Ttulo1"/><w:lvlText w:val="Capitulo %1"/>');
const hstyles = '<w:style w:type="paragraph" w:styleId="Ttulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:numPr><w:numId w:val="1"/></w:numPr><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
  + '<w:style w:type="paragraph" w:styleId="Ttulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr><w:spacing w:before="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>';
const h1 = (t) => p(r(t), '<w:pStyle w:val="Ttulo1"/>');
const h2 = (t) => p(r(t), '<w:pStyle w:val="Ttulo2"/>');
const txt = (seed) => p(r(lorem(40, seed)));
// pág. 1: título no topo; pág. 2: título no meio; pág. 3: sem título; pág. 4: título no topo
const chapBody = h1('Primeiro capitulo Hxg') + txt(1) + pgbr + txt(2) + h1('Segundo capitulo Hxg') + txt(3) + pgbr + txt(4) + pgbr + h1('Terceiro capitulo Hxg') + txt(5);
// o título só aparece na pág. 2 (pág. 1 sem capítulo)
const lateBody = txt(1) + pgbr + h1('Primeiro capitulo Hxg') + txt(2) + h2('Secao Hxg') + txt(3) + pgbr + txt(4);
// dois títulos na mesma página (vale o 1º ou o último?)
const twoBody = h1('Primeiro capitulo Hxg') + txt(1) + pgbr + txt(2) + h1('Segundo capitulo Hxg') + txt(3) + h1('Terceiro capitulo Hxg') + txt(4) + pgbr + txt(5);
const start5 = (n) => n.replace('<w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo1"/>', '<w:start w:val="5"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Ttulo1"/>');
for (const [name, attrs, body, num] of [
  ['chap-hyphen', 'w:chapStyle="1"', chapBody, numbering],
  ['chap-period', 'w:chapStyle="1" w:chapSep="period"', chapBody, numbering],
  ['chap-colon', 'w:chapStyle="1" w:chapSep="colon"', chapBody, numbering],
  ['chap-emdash', 'w:fmt="lowerLetter" w:chapStyle="1" w:chapSep="emDash"', chapBody, numbering],
  ['chap-endash', 'w:chapStyle="1" w:chapSep="enDash"', chapBody, numbering],
  ['chap-late', 'w:chapStyle="1"', lateBody, numbering],
  ['chap-h2', 'w:chapStyle="2"', lateBody, numbering],
  ['chap-roman', 'w:chapStyle="1"', chapBody, romanNumbering],
  ['chap-nonum', 'w:chapStyle="1"', chapBody, ''],
  ['chap-two', 'w:chapStyle="1"', twoBody, numbering],
  ['chap-start5', 'w:chapStyle="1"', lateBody, start5(numbering)],
]) {
  cases.push({ name, docx: buildDocx({ body, footers: pgFtr, headers: { default: p(r('Cab ') + field('PAGE')) }, sect: sect('', `<w:pgNumType ${attrs}/>`), defaults, styles: num ? hstyles : hstyles.replace(/<w:numPr>.*?<\/w:numPr>/g, ''), ...(num ? { numbering: num } : {}) }) });
}

// tabulação de alinhamento (w:ptab) no cabeçalho com recuos
const ptab = (al, rel) => `<w:r><w:ptab w:relativeTo="${rel}" w:alignment="${al}" w:leader="none"/></w:r>`;
cases.push(
  { name: 'ptab-margin', docx: buildDocx({ body: pages(1), headers: { default: p(r('Esq') + ptab('center', 'margin') + r('Centro') + ptab('right', 'margin') + r('Dir Hxg')) }, defaults }) },
  { name: 'ptab-indent', docx: buildDocx({ body: pages(1), headers: { default: p(r('Esq') + ptab('center', 'indent') + r('Centro') + ptab('right', 'indent') + r('Dir Hxg'), '<w:ind w:left="720" w:right="1440"/>') }, defaults }) },
  { name: 'ptab-dots', docx: buildDocx({ body: pages(1), footers: { default: p(r('Titulo') + '<w:r><w:ptab w:relativeTo="margin" w:alignment="right" w:leader="dot"/></w:r>' + field('PAGE')) }, defaults }) },
);
