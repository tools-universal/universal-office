// Gera as fixtures SINTÉTICAS dos testes do conversor .doc → .docx
// (write/packages/docx-core/test/fixtures/doc/):
//   1. monta .docx com texto inventado cobrindo cada recurso (só fontes Arial,
//      Calibri, Times New Roman, Symbol, Wingdings — sem fontes embutidas);
//   2. o Word real (COM invisível, gen-fixtures.ps1) salva cada um como .doc
//      (SaveAs2 formato 0 = Word 97-2003, EmbedTrueTypeFonts desligado) e, do
//      .doc, salva o .docx de referência (<nome>.word.docx, formato 16).
//
// Uso: node write/tools/doc-lab/gen-fixtures.mjs [--only nome,nome] [--keep-src]
import { zipSync, zlibSync, strToU8 } from 'fflate';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { runWordBatch } from './word-batch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', '..', 'packages', 'docx-core', 'test', 'fixtures', 'doc');
const srcDir = join(tmpdir(), 'doc-fixtures-src');
mkdirSync(outDir, { recursive: true });
mkdirSync(srcDir, { recursive: true });

// ───────────────────────────── OOXML mínimo ─────────────────────────────

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const NSDECL = `xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" ' +
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" ' +
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" ' +
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" ' +
  'xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ' +
  'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14"';
const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const r = (text, rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const p = (content, pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${content}</w:p>`;
const fld = (instr, result, rPr = '') =>
  `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:fldChar w:fldCharType="begin"/></w:r>` +
  `<w:r><w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r>` +
  `<w:r><w:fldChar w:fldCharType="separate"/></w:r>${r(result, rPr)}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const fonts = (f) => `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/>`;

const BASE_STYLES = `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="pt-BR" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:semiHidden/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="60"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Heading1"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:i/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="center" w:pos="4252"/><w:tab w:val="right" w:pos="8504"/></w:tabs><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="EndnoteText"><w:name w:val="endnote text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="EndnoteReference"><w:name w:val="endnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="CommentText"><w:name w:val="annotation text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style>`;

function stylesXml(extra = '') {
  return `${DECL}<w:styles ${NSDECL}>${BASE_STYLES}${extra}</w:styles>`;
}

const SECT_A4 = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>';

/** Monta um .docx: { body, styles?, numbering?, parts: {nome: xml}, rels: [{id,type,target}], media: {nome: bytes}, settings? } */
function buildDocx(o) {
  const files = {};
  const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>', '<Default Extension="png" ContentType="image/png"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>',
    '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'];
  const rels = [['rIdStyles', 'styles', 'styles.xml'], ['rIdSettings', 'settings', 'settings.xml']];
  const partType = {
    numbering: ['numbering', 'numbering+xml'], footnotes: ['footnotes', 'footnotes+xml'], endnotes: ['endnotes', 'endnotes+xml'],
    comments: ['comments', 'comments+xml'],
  };
  for (const [name, xml] of Object.entries(o.parts ?? {})) {
    files[`word/${name}`] = strToU8(xml);
    const base = name.replace(/\d*\.xml$/, '');
    const kind = base === 'header' ? ['header', 'header+xml'] : base === 'footer' ? ['footer', 'footer+xml'] : partType[base];
    ct.push(`<Override PartName="/word/${name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${kind[1]}"/>`);
    if (!(o.rels ?? []).some((x) => x[2] === name)) rels.push([`rId_${name.replace('.xml', '')}`, kind[0], name]);
  }
  for (const x of o.rels ?? []) rels.push(x);
  for (const [name, bytes] of Object.entries(o.media ?? {})) files[`word/media/${name}`] = bytes;
  files['[Content_Types].xml'] = strToU8(`${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>`);
  files['_rels/.rels'] = strToU8(`${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  files['word/_rels/document.xml.rels'] = strToU8(`${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join('')}</Relationships>`);
  files['word/document.xml'] = strToU8(`${DECL}<w:document ${NSDECL}><w:body>${o.body}</w:body></w:document>`);
  files['word/styles.xml'] = strToU8(o.styles ?? stylesXml());
  files['word/settings.xml'] = strToU8(`${DECL}<w:settings ${NSDECL}>${o.settings ?? ''}<w:defaultTabStop w:val="708"/><w:characterSpacingControl w:val="doNotCompress"/>${o.settingsTail ?? ''}<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`);
  return zipSync(files, { level: 6 });
}

// ───────────────────────────── PNG sintético ─────────────────────────────

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(w, h, color) {
  const raw = new Uint8Array(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 3) + 1 + x * 3;
      const stripe = Math.floor(x / 10) % 2;
      raw[o] = stripe ? color[0] : 255; raw[o + 1] = stripe ? color[1] : 255; raw[o + 2] = stripe ? color[2] : 255;
    }
  }
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(strToU8(type), 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibSync(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((s, x) => s + x.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const x of parts) { out.set(x, o); o += x.length; }
  return out;
}

// ───────────────────────────── fixtures ─────────────────────────────

const fixtures = {};

fixtures.caracteres = () => ({
  body: [
    p(r('Negrito', '<w:b/>') + r(' itálico', '<w:i/>') + r(' sublinhado', '<w:u w:val="single"/>') + r(' duplo', '<w:u w:val="double"/>') +
      r(' pontilhado', '<w:u w:val="dotted"/>') + r(' ondulado', '<w:u w:val="wave"/>') + r(' palavras soltas', '<w:u w:val="words"/>') +
      r(' tachado', '<w:strike/>') + r(' tachado duplo', '<w:dstrike/>')),
    p(r('Maiúsculas', '<w:caps/>') + r(' Versalete', '<w:smallCaps/>') + r(' oculto', '<w:vanish/>') + r(' visível') +
      r('sobrescrito', '<w:vertAlign w:val="superscript"/>') + r(' e ') + r('subscrito', '<w:vertAlign w:val="subscript"/>')),
    p(r('Oito pontos', '<w:sz w:val="16"/><w:szCs w:val="16"/>') + r(' quatorze', '<w:sz w:val="28"/><w:szCs w:val="28"/>') +
      r(' vermelho', '<w:color w:val="FF0000"/>') + r(' azul escuro', '<w:color w:val="1F4E79"/>') + r(' realçado', '<w:highlight w:val="yellow"/>') +
      r(' expandido', '<w:spacing w:val="40"/>') + r(' elevado', '<w:position w:val="6"/>') + r(' kerning', '<w:kern w:val="28"/>')),
    p(r('Arial ', fonts('Arial')) + r('Times New Roman ', fonts('Times New Roman')) + r('Calibri ', fonts('Calibri')) +
      r('símbolo: ') + '<w:r><w:sym w:font="Symbol" w:char="F0E3"/></w:r>' + r(' fim') + r(' inglês', '<w:lang w:val="en-US"/>')),
    p(r('Tab:') + '<w:r><w:tab/></w:r>' + r('depois do tab') + '<w:r><w:br/></w:r>' + r('quebra de linha; espaço rígido; hífen') +
      '<w:r><w:noBreakHyphen/></w:r>' + r('incondicional; hífen') + '<w:r><w:softHyphen/></w:r>' + r('opcional.')),
    p(r('Pontuação: – — “aspas” ‘simples’ … • € ™ Œ œ Š š Ÿ ƒ ‰ ‹ › † ‡ ˆ ˜ ¶ § © ® °')),
    p(r('Outras escritas: Ελληνικά, Русский, 汉字.')),
    p(r('Revisão: ') + '<w:ins w:id="1" w:author="Autor Teste" w:date="2024-01-02T03:04:00Z">' + r('texto inserido') + '</w:ins>' +
      r(' e ') + '<w:del w:id="2" w:author="Autor Teste" w:date="2024-01-02T03:05:00Z"><w:r><w:delText xml:space="preserve">texto removido</w:delText></w:r></w:del>' + r(' fim.')),
    p(r('Antes da quebra de página.') + '<w:r><w:br w:type="page"/></w:r>' + r('Depois da quebra de página.')),
    SECT_A4,
  ].join(''),
});

fixtures.paragrafos = () => ({
  body: [
    p(r('Centralizado'), '<w:jc w:val="center"/>'),
    p(r('À direita'), '<w:jc w:val="right"/>'),
    p(r('Justificado com texto suficientemente longo para quebrar em mais de uma linha e mostrar a justificação entre as palavras do parágrafo.'), '<w:jc w:val="both"/>'),
    p(r('Recuos esquerdo, direito e primeira linha com um texto um pouco maior para ocupar duas linhas no documento sintético.'), '<w:ind w:left="1134" w:right="567" w:firstLine="567"/>'),
    p(r('Recuo deslocado (hanging) com texto que também ocupa mais de uma linha para que o recuo apareça de verdade.'), '<w:ind w:left="1134" w:hanging="567"/>'),
    p(r('Espaçamento antes 12 pt e depois 6 pt, entrelinhas 1,5.'), '<w:spacing w:before="240" w:after="120" w:line="360" w:lineRule="auto"/>'),
    p(r('Entrelinhas exatamente 15 pt.'), '<w:spacing w:line="300" w:lineRule="exact"/>'),
    p(r('Entrelinhas pelo menos 20 pt.'), '<w:spacing w:line="400" w:lineRule="atLeast"/>'),
    p(r('Manter com o próximo e linhas juntas, sem controle de viúvas.'), '<w:keepNext/><w:keepLines/><w:widowControl w:val="0"/>'),
    p(r('Com bordas e sombreamento.'), '<w:pBdr><w:top w:val="single" w:sz="12" w:space="1" w:color="FF0000"/><w:left w:val="double" w:sz="4" w:space="4" w:color="auto"/><w:bottom w:val="dotted" w:sz="8" w:space="1" w:color="0000FF"/><w:right w:val="single" w:sz="4" w:space="4" w:color="auto"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>'),
    p(r('A') + '<w:r><w:tab/></w:r>' + r('B') + '<w:r><w:tab/></w:r>' + r('C') + '<w:r><w:tab/></w:r>' + r('12,50'),
      '<w:tabs><w:tab w:val="left" w:pos="1440"/><w:tab w:val="center" w:leader="dot" w:pos="4320"/><w:tab w:val="right" w:leader="hyphen" w:pos="6480"/><w:tab w:val="decimal" w:leader="underscore" w:pos="8000"/><w:tab w:val="bar" w:pos="2880"/></w:tabs>'),
    p(r('Espaçamento contextual 1'), '<w:spacing w:before="200" w:after="200"/><w:contextualSpacing/>'),
    p(r('Espaçamento contextual 2'), '<w:spacing w:before="200" w:after="200"/><w:contextualSpacing/>'),
    p(r('Parágrafo com nível de tópico 2.'), '<w:outlineLvl w:val="1"/>'),
    p(r('Capitular: texto com letra capitular ocupando três linhas para o teste do quadro de texto.'), '<w:framePr w:dropCap="drop" w:lines="3" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/>'),
    p(r('Parágrafo depois da capitular, que deve contornar o quadro com o texto que continua normalmente.')),
    p(r('Quebra de página antes.'), '<w:pageBreakBefore/>'),
    SECT_A4,
  ].join(''),
});

fixtures.estilos = () => ({
  styles: stylesXml(
    '<w:style w:type="paragraph" w:customStyle="1" w:styleId="Destaque"><w:name w:val="Destaque"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="240"/><w:ind w:left="567"/></w:pPr><w:rPr><w:b/><w:color w:val="C00000"/><w:sz w:val="26"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:customStyle="1" w:styleId="DestaqueFilho"><w:name w:val="Destaque Filho"/><w:basedOn w:val="Destaque"/><w:rPr><w:b w:val="0"/><w:i/></w:rPr></w:style>' +
    '<w:style w:type="character" w:customStyle="1" w:styleId="Codigo"><w:name w:val="Código"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:color w:val="00B050"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="48"/></w:rPr></w:style>' +
    '<w:style w:type="table" w:customStyle="1" w:styleId="TabelaTeste"><w:name w:val="Tabela Teste"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="0070C0"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="0070C0"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="0070C0"/></w:tblBorders></w:tblPr></w:style>'),
  body: [
    p(r('Título do documento'), '<w:pStyle w:val="Title"/>'),
    p(r('Primeiro título'), '<w:pStyle w:val="Heading1"/>'),
    p(r('Corpo normal com ') + r('estilo de caractere', '<w:rStyle w:val="Codigo"/>') + r(' e ') + r('negrito direto', '<w:b/>') + r('.')),
    p(r('Subtítulo'), '<w:pStyle w:val="Heading2"/>'),
    p(r('Parágrafo no estilo Destaque.'), '<w:pStyle w:val="Destaque"/>'),
    p(r('Parágrafo no estilo Destaque Filho (herda e troca negrito por itálico).'), '<w:pStyle w:val="DestaqueFilho"/>'),
    p(r('Destaque com formatação direta por cima.', '<w:sz w:val="20"/><w:u w:val="single"/>'), '<w:pStyle w:val="Destaque"/><w:jc w:val="right"/>'),
    '<w:tbl><w:tblPr><w:tblStyle w:val="TabelaTeste"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>' +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r('Estilo de tabela')) + '</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r('célula 2')) + '</w:tc></w:tr>' +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r('linha 2')) + '</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r('fim')) + '</w:tc></w:tr></w:tbl>',
    p(r('Último parágrafo.')),
    SECT_A4,
  ].join(''),
});

const lvl = (ilvl, fmt, text, ind, extra = '', rPr = '') =>
  `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>${extra}<w:lvlText w:val="${esc(text)}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${ind}" w:hanging="360"/></w:pPr>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:lvl>`;

fixtures.listas = () => ({
  parts: {
    'numbering.xml': `${DECL}<w:numbering ${NSDECL}>` +
      `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvl(0, 'bullet', '', 720, '', '<w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/>')}${lvl(1, 'bullet', 'o', 1440, '', '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:hint="default"/>')}${lvl(2, 'bullet', '', 2160, '', '<w:rFonts w:ascii="Wingdings" w:hAnsi="Wingdings" w:hint="default"/>')}</w:abstractNum>` +
      `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="multilevel"/>${lvl(0, 'decimal', '%1.', 360)}${lvl(1, 'decimal', '%1.%2.', 792)}${lvl(2, 'lowerLetter', '%3)', 1224, '<w:suff w:val="space"/>')}${lvl(3, 'lowerRoman', '%4.', 1728, '<w:suff w:val="nothing"/>')}</w:abstractNum>` +
      `<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="multilevel"/>${lvl(0, 'upperRoman', 'Capítulo %1', 720)}${lvl(1, 'decimal', '%1.%2', 1080, '<w:isLgl/>')}${lvl(2, 'upperLetter', '(%3)', 1440)}</w:abstractNum>` +
      '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>' +
      '<w:num w:numId="3"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride></w:num>' +
      '<w:num w:numId="4"><w:abstractNumId w:val="2"/></w:num></w:numbering>',
  },
  body: [
    p(r('Lista com marcadores:')),
    p(r('marcador nível 1'), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'),
    p(r('marcador nível 2'), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr>'),
    p(r('marcador nível 3'), '<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr>'),
    p(r('Lista numerada multinível:')),
    p(r('item um'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'),
    p(r('item um ponto um'), '<w:numPr><w:ilvl w:val="1"/><w:numId w:val="2"/></w:numPr>'),
    p(r('item com letra'), '<w:numPr><w:ilvl w:val="2"/><w:numId w:val="2"/></w:numPr>'),
    p(r('item romano sem separador'), '<w:numPr><w:ilvl w:val="3"/><w:numId w:val="2"/></w:numPr>'),
    p(r('item dois'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>'),
    p(r('Lista reiniciada em 5:')),
    p(r('item cinco'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr>'),
    p(r('item seis'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr>'),
    p(r('Capítulos:')),
    p(r('primeiro capítulo'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr>'),
    p(r('seção legal'), '<w:numPr><w:ilvl w:val="1"/><w:numId w:val="4"/></w:numPr>'),
    p(r('subitem'), '<w:numPr><w:ilvl w:val="2"/><w:numId w:val="4"/></w:numPr>'),
    p(r('Item com recuo próprio depois da lista'), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:ind w:left="1080" w:hanging="720"/>'),
    SECT_A4,
  ].join(''),
});

const tc = (w, content, tcPr = '') => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${tcPr}</w:tcPr>${content}</w:tc>`;
const BORDERS = '<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders>';

fixtures.tabelas = () => ({
  body: [
    p(r('Tabela 1: cabeçalho repetido, alturas, sombreamento, mesclas.')),
    `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/>${BORDERS}<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>` +
      '<w:tr><w:trPr><w:tblHeader/><w:trHeight w:val="400" w:hRule="exact"/></w:trPr>' +
        tc(3000, p(r('Cabeçalho A', '<w:b/>'), '<w:jc w:val="center"/>'), '<w:shd w:val="clear" w:color="auto" w:fill="BDD7EE"/>') +
        tc(3000, p(r('Cabeçalho B', '<w:b/>'), '<w:jc w:val="center"/>'), '<w:shd w:val="clear" w:color="auto" w:fill="BDD7EE"/>') +
        tc(3000, p(r('Cabeçalho C', '<w:b/>'), '<w:jc w:val="center"/>'), '<w:shd w:val="clear" w:color="auto" w:fill="BDD7EE"/>') + '</w:tr>' +
      '<w:tr><w:trPr><w:trHeight w:val="600"/></w:trPr>' +
        tc(6000, p(r('Mescla horizontal (2 colunas)')), '<w:gridSpan w:val="2"/><w:vAlign w:val="center"/>') +
        tc(3000, p(r('Mescla vertical início')), '<w:vMerge w:val="restart"/><w:vAlign w:val="bottom"/>') + '</w:tr>' +
      '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + tc(3000, p(r('a1')) + p(r('a1 segundo parágrafo'))) + tc(3000, p(r('b1'))) + tc(3000, p(''), '<w:vMerge/>') + '</w:tr>' +
      '<w:tr>' + tc(3000, p(r('a2'))) + tc(3000, p(r('b2'))) + tc(3000, p(r('c2'))) + '</w:tr></w:tbl>',
    p(r('Tabela 2: centralizada, largura em porcentagem, bordas por célula.')),
    `<w:tbl><w:tblPr><w:tblW w:w="3000" w:type="pct"/><w:jc w:val="center"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2500"/><w:gridCol w:w="2500"/></w:tblGrid>` +
      '<w:tr>' + tc(2500, p(r('borda grossa vermelha')), '<w:tcBorders><w:top w:val="single" w:sz="18" w:space="0" w:color="FF0000"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>') +
        tc(2500, p(r('sem bordas'))) + '</w:tr></w:tbl>',
    p(r('Tabela 3: recuo, margens de célula e tabela aninhada.')),
    `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblInd w:w="720" w:type="dxa"/>${BORDERS}<w:tblCellMar><w:top w:w="57" w:type="dxa"/><w:left w:w="170" w:type="dxa"/><w:bottom w:w="57" w:type="dxa"/><w:right w:w="170" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="4000"/></w:tblGrid>` +
      '<w:tr>' + tc(4000, p(r('externa 1'))) + tc(4000,
        p(r('antes da aninhada')) +
        `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${BORDERS}<w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/></w:tblGrid><w:tr>${tc(1500, p(r('int 1')))}${tc(1500, p(r('int 2')))}</w:tr><w:tr>${tc(1500, p(r('int 3')))}${tc(1500, p(r('int 4')))}</w:tr></w:tbl>` +
        p(r('depois da aninhada'))) + '</w:tr></w:tbl>',
    p(r('Fim das tabelas.')),
    SECT_A4,
  ].join(''),
});

const hdrPart = (tag, content) => `${DECL}<w:${tag} ${NSDECL}>${content}</w:${tag}>`;

fixtures.secoes = () => ({
  parts: {
    'header1.xml': hdrPart('hdr', p(r('Cabeçalho da seção 1'), '<w:pStyle w:val="Header"/>')),
    'footer1.xml': hdrPart('ftr', p(r('Página ') + fld('PAGE', '1'), '<w:pStyle w:val="Footer"/><w:jc w:val="center"/>')),
    'header2.xml': hdrPart('hdr', p(r('Seção 3 — páginas ímpares'), '<w:pStyle w:val="Header"/><w:jc w:val="right"/>')),
    'header3.xml': hdrPart('hdr', p(r('Seção 3 — primeira página'), '<w:pStyle w:val="Header"/>')),
    'header4.xml': hdrPart('hdr', p(r('Seção 3 — páginas pares'), '<w:pStyle w:val="Header"/>')),
  },
  settingsTail: '<w:evenAndOddHeaders/>',
  body: [
    p(r('Seção 1: A4 retrato com margens próprias.')),
    p(r('Fim da seção 1.'), '<w:sectPr><w:headerReference w:type="default" r:id="rId_header1"/><w:footerReference w:type="default" r:id="rId_footer1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1418" w:left="1701" w:header="567" w:footer="510" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>'),
    p(r('Seção 2: Carta paisagem com duas colunas e linha entre elas. ' + 'Texto de coluna. '.repeat(30))),
    p(r('Fim da seção 2.'), '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:num="2" w:space="720" w:sep="1"/><w:docGrid w:linePitch="360"/></w:sectPr>'),
    p(r('Seção 3: primeira página diferente, numeração romana a partir de 1, cabeçalhos pares.')),
    p(r('Quebra de coluna não se aplica; quebra de página:') + '<w:r><w:br w:type="page"/></w:r>' + r('segunda página da seção 3.')),
    p(r('Fim do documento.')),
    '<w:sectPr><w:headerReference w:type="even" r:id="rId_header4"/><w:headerReference w:type="default" r:id="rId_header2"/><w:headerReference w:type="first" r:id="rId_header3"/><w:type w:val="oddPage"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:pgNumType w:fmt="lowerRoman" w:start="1"/><w:cols w:space="708"/><w:titlePg/><w:docGrid w:linePitch="360"/></w:sectPr>',
  ].join(''),
});

fixtures['notas-campos'] = () => ({
  parts: {
    'footnotes.xml': `${DECL}<w:footnotes ${NSDECL}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>` +
      `<w:footnote w:id="1">${p('<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>' + r(' Primeira nota de rodapé.'), '<w:pStyle w:val="FootnoteText"/>')}</w:footnote>` +
      `<w:footnote w:id="2">${p('<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>' + r(' Segunda nota, com ') + r('negrito', '<w:b/>') + r('.'), '<w:pStyle w:val="FootnoteText"/>')}</w:footnote>` +
      `<w:footnote w:id="3">${p(r('* Nota com marca personalizada.'), '<w:pStyle w:val="FootnoteText"/>')}</w:footnote></w:footnotes>`,
    'endnotes.xml': `${DECL}<w:endnotes ${NSDECL}><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote><w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote>` +
      `<w:endnote w:id="1">${p('<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteRef/></w:r>' + r(' Nota de fim.'), '<w:pStyle w:val="EndnoteText"/>')}</w:endnote></w:endnotes>`,
    'comments.xml': `${DECL}<w:comments ${NSDECL}><w:comment w:id="0" w:author="Revisor Fictício" w:date="2024-05-06T07:08:00Z" w:initials="RF">${p('<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:annotationRef/></w:r>' + r('Comentário de exemplo.'), '<w:pStyle w:val="CommentText"/>')}</w:comment></w:comments>`,
  },
  body: [
    p(r('Texto com nota') + '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="1"/></w:r>' + r(' e outra') +
      '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="2"/></w:r>' + r(' e marca própria') +
      '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:customMarkFollows="1" w:id="3"/><w:t>*</w:t></w:r>' +
      r(' e nota de fim') + '<w:r><w:rPr><w:rStyle w:val="EndnoteReference"/></w:rPr><w:endnoteReference w:id="1"/></w:r>' + r('.')),
    p(r('Página ') + fld('PAGE', '1') + r(' de ') + fld('NUMPAGES', '1') + r('; data ') + fld('DATE \\@ "dd/MM/yyyy"', '01/02/2024') + r('.')),
    p(r('Link: ') + fld('HYPERLINK "https://exemplo.invalid/pagina"', 'exemplo', '<w:rStyle w:val="Hyperlink"/>') + r('.')),
    p('<w:bookmarkStart w:id="0" w:name="marcador_teste"/>' + r('Texto marcado') + '<w:bookmarkEnd w:id="0"/>' + r(' — referência: ') + fld('REF marcador_teste \\h', 'Texto marcado') + r('.')),
    p('<w:commentRangeStart w:id="0"/>' + r('Trecho comentado') + '<w:commentRangeEnd w:id="0"/>' + '<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>' + r(' depois do comentário.')),
    p(r('Campo aninhado: ') + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> IF </w:instrText></w:r>' +
      fld('PAGE', '1') + '<w:r><w:instrText xml:space="preserve"> = 1 "primeira" "outra" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' + r('primeira') + '<w:r><w:fldChar w:fldCharType="end"/></w:r>' + r('.')),
    SECT_A4,
  ].join(''),
});

const EMU = 360000; // 1 cm
const inlinePic = (rid, id, cx, cy, extra = '') =>
  `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Imagem ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Imagem ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/>${extra}<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const anchor = (id, cx, cy, x, y, wrap, graphic, behind = 0) =>
  `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="${behind}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id}" name="Forma ${id}"/><wp:cNvGraphicFramePr/>${graphic}</wp:anchor></w:drawing></w:r>`;

fixtures.imagens = () => {
  const blue = png(100, 50, [0, 112, 192]);
  const red = png(60, 60, [192, 0, 0]);
  const picGraphic = (rid, id, cx, cy) => `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Imagem ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>`;
  const textbox = (id, text) => `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${4 * EMU}" cy="${1.5 * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFF2CC"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="BF9000"/></a:solidFill></a:ln></wps:spPr><wps:txbx><w:txbxContent>${p(r(text, '<w:b/>'))}${p(r('segunda linha da caixa'))}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
  const rect = `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${2 * EMU}" cy="${EMU}"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="00B050"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>`;
  return {
    media: { 'azul.png': blue, 'vermelho.png': red },
    rels: [['rIdImg1', 'image', 'media/azul.png'], ['rIdImg2', 'image', 'media/vermelho.png']],
    body: [
      p(r('Imagem em linha 4 cm × 2 cm: ') + inlinePic('rIdImg1', 1, 4 * EMU, 2 * EMU) + r(' fim.')),
      p(r('Mesma imagem reduzida: ') + inlinePic('rIdImg1', 2, 2 * EMU, EMU)),
      p(r('Imagem recortada: ') + inlinePic('rIdImg2', 3, 1.5 * EMU, 1.5 * EMU, '<a:srcRect l="10000" t="20000" r="10000" b="0"/>')),
      p(anchor(4, 3 * EMU, 3 * EMU, 2 * EMU, EMU, '<wp:wrapSquare wrapText="bothSides"/>', picGraphic('rIdImg2', 4, 3 * EMU, 3 * EMU)) +
        r('Imagem flutuante com quebra quadrada. ' + 'Texto que contorna a imagem flutuante. '.repeat(8))),
      p(anchor(5, 4 * EMU, 2 * EMU, 0, 0, '<wp:wrapNone/>', picGraphic('rIdImg1', 5, 4 * EMU, 2 * EMU), 1) + r('Imagem atrás do texto.')),
      p(anchor(6, 4 * EMU, 1.5 * EMU, 8 * EMU, 0, '<wp:wrapSquare wrapText="bothSides"/>', textbox(6, 'Caixa de texto')) + r('Parágrafo com caixa de texto ancorada. ' + 'Mais texto. '.repeat(10))),
      p(anchor(7, 2 * EMU, EMU, 3 * EMU, 0, '<wp:wrapTopAndBottom/>', rect) + r('Elipse com quebra superior/inferior.')),
      p(r('Linha horizontal:')),
      p('<w:r><w:pict><v:rect id="_x0000_i1025" style="width:425.2pt;height:1.5pt" o:hralign="center" o:hrstd="t" o:hrnoshade="t" o:hr="t" fillcolor="#a0a0a0" stroked="f"/></w:pict></w:r>'),
      p(r('Fim.')),
      SECT_A4,
    ].join(''),
  };
};

// Formas flutuantes (regressões): caixa de texto sem preenchimento e
// sem linha no cabeçalho (o Word grava os booleanos de preenchimento/linha
// divididos entre FOPT e TertiaryFOPT), retângulo atrás do texto e fora da
// célula/sem sobreposição (0x3BF), ordem Z oposta à ordem do texto,
// conectores (sem preenchimento) e geometrias com ajustes.
fixtures.formas = () => {
  const wsp = (prst, { av = '', fill = '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>', ln = '<a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>', txbx = '', cnv = '<wps:cNvSpPr/>', cx = 2 * EMU, cy = EMU } = {}) =>
    `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp>${cnv}<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst>${av}</a:avLst></a:prstGeom>${fill}${ln}</wps:spPr>` +
    `${txbx ? `<wps:txbx><w:txbxContent>${txbx}</w:txbxContent></wps:txbx>` : ''}<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
  const anchorEx = (id, cx, cy, x, y, graphic, { rel = 'column', relV = 'paragraph', behind = 0, z = id, inCell = 1, overlap = 1, wrap = '<wp:wrapNone/>' } = {}) =>
    `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + z}" behindDoc="${behind}" locked="0" layoutInCell="${inCell}" allowOverlap="${overlap}"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${rel}"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrap}<wp:docPr id="${id}" name="Forma ${id}"/><wp:cNvGraphicFramePr/>${graphic}</wp:anchor></w:drawing></w:r>`;
  const noFill = '<a:noFill/>', noLine = '<a:ln><a:noFill/></a:ln>';
  const color = (c) => `<a:solidFill><a:srgbClr val="${c}"/></a:solidFill>`;
  // marca-d'água WordArt (VML textpath, como a do Word): vira forma geoText (msosptTextPlainText) no .doc
  const watermark = '<w:r><w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype>' +
    '<v:shape id="MarcaDagua1" o:spid="_x0000_s2049" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:300pt;height:100pt;rotation:315;z-index:-251655168;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="#fbe4d5" stroked="f"><v:textpath style="font-family:&quot;Arial&quot;;font-size:44pt" string="RASCUNHO"/></v:shape></w:pict></w:r>';
  const header = p(anchorEx(1, 15 * EMU, EMU, 3 * EMU, EMU / 2,
    wsp('rect', { fill: noFill, ln: noLine, cnv: '<wps:cNvSpPr txBox="1"/>', cx: 15 * EMU, txbx: p(r('Rótulo do cabeçalho sem fundo'), '<w:jc w:val="right"/>') }),
    { rel: 'page', relV: 'page' }) + watermark, '<w:pStyle w:val="Header"/>');
  return {
    parts: { 'header1.xml': hdrPart('hdr', header) },
    body: [
      p(r('Moldura atrás do texto: ') + anchorEx(2, 15 * EMU, 6 * EMU, -EMU / 4, -EMU / 4,
        wsp('rect', { cnv: '<wps:cNvSpPr txBox="1"/>', cx: 15 * EMU, cy: 6 * EMU, txbx: p(r('')) }), { behind: 1, inCell: 0, overlap: 0 }) +
        r('o texto continua visível sobre a moldura branca. ' + 'Conteúdo do formulário. '.repeat(6))),
      p(r('Ordem Z: o primeiro retângulo fica na frente do segundo.') +
        anchorEx(3, 3 * EMU, 2 * EMU, EMU, EMU, wsp('rect', { fill: color('C00000') }), { z: 20 }) +
        anchorEx(4, 3 * EMU, 2 * EMU, 2 * EMU, 1.5 * EMU, wsp('rect', { fill: color('0070C0') }), { z: 10 })),
      p(r('Conectores e geometrias com ajuste:') +
        anchorEx(5, 3 * EMU, 2 * EMU, 7 * EMU, EMU, wsp('bentConnector3', { cnv: '<wps:cNvCnPr/>', fill: '', ln: '<a:ln w="12700"><a:solidFill><a:srgbClr val="7030A0"/></a:solidFill><a:tailEnd type="triangle"/></a:ln>', cx: 3 * EMU, cy: 2 * EMU })) +
        anchorEx(6, 3 * EMU, 0, 7 * EMU, 3.5 * EMU, wsp('straightConnector1', { cnv: '<wps:cNvCnPr/>', fill: '', cx: 3 * EMU, cy: 0 })) +
        anchorEx(7, 3 * EMU, 1.5 * EMU, 11 * EMU, EMU, wsp('roundRect', { av: '<a:gd name="adj" fmla="val 35000"/>', fill: color('FFC000') })) +
        anchorEx(8, 3 * EMU, 1.5 * EMU, 11 * EMU, 3 * EMU, wsp('rightArrow', { av: '<a:gd name="adj1" fmla="val 30000"/><a:gd name="adj2" fmla="val 70000"/>', fill: color('00B050') }))),
      p(r('Fim.')),
      '<w:sectPr><w:headerReference w:type="default" r:id="rId_header1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>',
    ].join(''),
  };
};

// Degradês lineares (DrawingML → OfficeArt fillType 7 no .doc): direções, foco espelhado
// (3 paradas simétricas) e lista de cores (fillShadeColors); em VML, ângulo negativo com foco 0
// e a 2ª cor derivada do preenchimento ("fill lighten(153)") — cores inventadas.
fixtures.degrades = () => {
  const gs = (stops) => `<a:gsLst>${stops.map(([pos, c]) => `<a:gs pos="${pos}"><a:srgbClr val="${c}"/></a:gs>`).join('')}</a:gsLst>`;
  const grad = (stops, ang) => `<a:gradFill rotWithShape="1">${gs(stops)}<a:lin ang="${ang}" scaled="1"/></a:gradFill>`;
  const shape = (id, x, fill) =>
    `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>${EMU / 2}</wp:posOffset></wp:positionV><wp:extent cx="${2 * EMU}" cy="${EMU}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Forma ${id}"/><wp:cNvGraphicFramePr/>` +
    `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${2 * EMU}" cy="${EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill}<a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
  const WG = [[0, 'FFFFFF'], [100000, '999999']];
  const rows = [
    [grad(WG, 5400000), grad(WG, 0), grad(WG, 2700000)],
    [grad(WG, 16200000), grad([[0, '999999'], [50000, 'FFFFFF'], [100000, '999999']], 5400000), grad([[0, 'C04040'], [40000, 'FFFFFF'], [100000, '2E5C8A']], 5400000)],
  ];
  let id = 0;
  const vml = '<w:r><w:pict><v:rect id="Degrade7" style="position:absolute;margin-left:0;margin-top:14pt;width:56.7pt;height:28.35pt;z-index:7;mso-position-horizontal-relative:text;mso-position-vertical-relative:text" fillcolor="#3a7a5c"><v:fill color2="fill lighten(153)" angle="-45" focus="0" method="linear sigma" type="gradient"/></v:rect></w:pict></w:r>';
  return {
    body: [
      ...rows.map((row, k) => p(r(`Degradês, linha ${k + 1}.`) + row.map((f, j) => shape(++id, j * 3 * EMU, f)).join('')) + p('') + p('') + p('')),
      p(r('Degradê VML.') + vml) + p('') + p('') + p(''),
      p(r('Fim.')),
      SECT_A4,
    ].join(''),
  };
};

// só caracteres que cabem na peça COMPRIMIDA (Latin-1 + a tabela 0x82-0x9F do
// [MS-DOC]); €, Ž e ž ficam de fora da tabela e fariam o Word gravar UTF-16
fixtures.cp1252 = () => ({
  body: [
    p(r('Acentuação: ação, coração, pão, avó, você, à, ü.')),
    p(r('Pontuação cp1252: – — “duplas” ‘simples’ „baixas‚ … • † ‡ ‰ ‹ › ™ ƒ ˆ ˜ Š š Œ œ Ÿ.')),
    SECT_A4,
  ].join(''),
});

// ───────────────────────────── execução ─────────────────────────────

const argv = process.argv.slice(2);
const oi = argv.indexOf('--only');
const only = oi >= 0 ? new Set(argv[oi + 1].split(',')) : undefined;
const names = Object.keys(fixtures).filter((n) => !only || only.has(n));
const items = [];
for (const name of names) {
  const src = join(srcDir, `${name}.docx`);
  writeFileSync(src, buildDocx(fixtures[name]()));
  items.push({ id: name, path: src });
}
console.log(`fixtures: ${names.join(', ')} → Word (.doc e .word.docx)`);
const res = await runWordBatch({
  script: join(here, 'gen-fixtures.ps1'),
  items,
  args: ['-OutDir', outDir],
  workDir: srcDir,
  timeout: 180_000,
  onLine: (l) => console.log(`  ${l}`),
});
let bad = 0;
for (const name of names) {
  const line = res.get(name) ?? 'sem resultado';
  if (!line.startsWith('OK')) { bad++; continue; }
  // garantia: nenhuma fonte embutida nas fixtures (CLAUDE.md)
  const docx = readFileSync(join(outDir, `${name}.word.docx`));
  if (docx.includes(strToU8('word/fonts/'))) { console.log(`  ✖ ${name}: o .docx de referência embute fontes`); bad++; }
}
if (!argv.includes('--keep-src')) rmSync(srcDir, { recursive: true, force: true });
if (bad) { console.log(`${bad} fixture(s) com problema`); process.exit(1); }
console.log(`ok — ${outDir}`);
void existsSync;
