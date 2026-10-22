// Numeração de linhas (w:lnNumType), parte 2 — o que a frente Layout do texto
// precisa além do grupo lnnum: colunas (distância automática e explícita),
// seções contínuas no meio da página com reinícios diferentes (newPage,
// newSection, continuous, seção sem numeração), countBy/start em várias páginas,
// estilo "line number" mudado, recuos/alinhamentos do parágrafo, distância maior
// que a margem, objetos que não contam (tabela, caixa de texto, nota, quadro,
// cabeçalho), quebras de linha manuais e corpos diferentes, modo 14.
import { buildDocx, docDefaults, p, r, sz, font, lorem } from '../docx-builder.mjs';

const PG = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const sect = (ln, extra = '', cols = '<w:cols w:space="708"/>') => `<w:sectPr>${extra}${PG}${ln}${cols}<w:docGrid w:linePitch="360"/></w:sectPr>`;
const lnStyle = (rPr) => `<w:style w:type="character" w:styleId="Nmerodelinha"><w:name w:val="line number"/><w:basedOn w:val="DefaultParagraphFont"/><w:uiPriority w:val="99"/><w:semiHidden/><w:unhideWhenUsed/><w:rPr>${rPr}</w:rPr></w:style>`;
const lines = (n, tag, from = 1) => Array.from({ length: n }, (_, k) => p(r(`${tag} ${k + from} Hxg`))).join('');
const defaults = docDefaults({ font: 'Calibri', size: 11 });

export const cases = [];

// colunas: numera cada coluna, à esquerda dela
cases.push({ name: 'ln-cols2', docx: buildDocx({ defaults,
  body: p(r(lorem(260))) + lines(30, 'c'),
  sect: sect('<w:lnNumType w:countBy="1"/>', '', '<w:cols w:num="2" w:space="708"/>') }) });
cases.push({ name: 'ln-cols3-dist', docx: buildDocx({ defaults,
  body: lines(90, 'k'),
  sect: sect('<w:lnNumType w:countBy="1" w:distance="284" w:restart="continuous"/>', '', '<w:cols w:num="3" w:space="567"/>') }) });

// seções contínuas no meio da página: reinícios diferentes e seção sem numeração
{
  const sb = (ln) => `<w:sectPr><w:type w:val="continuous"/>${PG}${ln}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const end = (tag, ln, t = 'continuous') => p(r(`${tag} fim Hxg`), sb(ln).replace('continuous', t));
  const body = lines(5, 'a') + end('a', '<w:lnNumType w:countBy="1" w:restart="newSection"/>')
    + lines(4, 'b') + end('b', '')
    + lines(5, 'c') + end('c', '<w:lnNumType w:countBy="1"/>')
    + lines(5, 'd') + end('d', '<w:lnNumType w:countBy="1" w:start="9" w:restart="continuous"/>')
    + lines(5, 'e') + end('e', '<w:lnNumType w:countBy="1" w:restart="continuous"/>')
    + lines(40, 'f');
  // a última seção (nova página): reinicia por seção, contando de 2 em 2
  cases.push({ name: 'ln-sects', docx: buildDocx({ defaults, body, sect: sect('<w:lnNumType w:countBy="2" w:restart="newSection"/>') }) });
}

// várias páginas, reinício por página (padrão), countBy 3, início 4
cases.push({ name: 'ln-pages', docx: buildDocx({ defaults, body: lines(130, 'pg'), sect: sect('<w:lnNumType w:countBy="3" w:start="3"/>') }) });

// estilo "line number" mudado (fonte, corpo, negrito, cor) e corpos diferentes no texto
cases.push({ name: 'ln-style', docx: buildDocx({ defaults,
  styles: lnStyle(`${font('Times New Roman')}<w:b/><w:color w:val="C00000"/>${sz(14)}`),
  body: lines(6, 's') + p(r('grande Hxg', sz(20))) + p(r('pequeno Hxg', sz(7))) + p(r('misto ') + r('Grande', sz(18)) + r(' fim Hxg'))
    + p(r('quebra manual') + '<w:r><w:br/></w:r>' + r('segunda linha Hxg') + '<w:r><w:br/></w:r>' + r('terceira Hxg')) + lines(6, 't'),
  sect: sect('<w:lnNumType w:countBy="1" w:restart="continuous"/>') }) });

// recuos, alinhamentos e espaçamentos do parágrafo: o número segue a coluna, não o texto
cases.push({ name: 'ln-indent', docx: buildDocx({ defaults,
  body: p(r('recuo esquerdo Hxg'), '<w:ind w:left="1440"/>') + p(r('recuo negativo Hxg'), '<w:ind w:left="-567"/>')
    + p(r(lorem(40)), '<w:ind w:left="720" w:hanging="720"/>') + p(r('direita Hxg'), '<w:jc w:val="right"/>')
    + p(r('centro Hxg'), '<w:jc w:val="center"/>') + p(r(lorem(45)), '<w:jc w:val="both"/>')
    + p(r('espacado Hxg'), '<w:spacing w:before="480" w:after="240"/>') + p(r('linha exata Hxg'), '<w:spacing w:line="480" w:lineRule="exact"/>')
    + p(r('dupla Hxg'), '<w:spacing w:line="480" w:lineRule="auto"/>') + lines(4, 'i'),
  sect: sect('<w:lnNumType w:countBy="1" w:restart="continuous"/>') }) });

// distância maior que a margem esquerda e distância grande com recuo
cases.push({ name: 'ln-dist-wide', docx: buildDocx({ defaults,
  body: lines(8, 'w') + p(r('recuado Hxg'), '<w:ind w:left="2000"/>'),
  sect: sect('<w:lnNumType w:countBy="1" w:distance="2400" w:restart="continuous"/>') }) });

// objetos que não contam: tabela, caixa de texto, nota de rodapé, quadro, cabeçalho; vazio conta
{
  const tbl = '<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>'
    + '<w:tr><w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>' + p(r('celula Hxg')) + p(r('celula 2 Hxg')) + '</w:tc></w:tr></w:tbl>';
  const tbx = '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>3600000</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="1440000" cy="720000"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="1" name="Caixa 1"/><wp:cNvGraphicFramePr/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1440000" cy="720000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr><wps:txbx><w:txbxContent>'
    + p(r('caixa Hxg')) + p(r('caixa 2 Hxg')) + '</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t" anchorCtr="0"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
  const notes = '<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>'
    + '<w:footnote w:id="1"><w:p><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> nota de rodape Hxg</w:t></w:r></w:p><w:p><w:r><w:t>nota 2 Hxg</w:t></w:r></w:p></w:footnote></w:footnotes>';
  const body = lines(3, 'o') + p('') + p('') + tbl + p(r('depois da tabela Hxg') + tbx)
    + p(r('com nota Hxg') + '<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="1"/></w:r>')
    + p(r('quadro Hxg'), '<w:framePr w:w="2000" w:hSpace="180" w:wrap="around" w:vAnchor="text" w:hAnchor="page" w:x="7000" w:y="1"/>')
    + lines(6, 'q');
  cases.push({ name: 'ln-objects', docx: buildDocx({ defaults, body,
    headers: { default: p(r('cabecalho Hxg')) }, footers: { default: p(r('rodape Hxg')) },
    extraParts: { 'word/footnotes.xml': new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${notes}`) },
    sect: sect('<w:lnNumType w:countBy="1" w:restart="continuous"/>') }) });
}

// modo de compatibilidade 14 e parágrafos suprimidos pelo estilo
cases.push({ name: 'ln-compat14', docx: buildDocx({ defaults, compat: 14,
  styles: '<w:style w:type="paragraph" w:customStyle="1" w:styleId="SemNum"><w:name w:val="Sem numero"/><w:basedOn w:val="Normal"/><w:pPr><w:suppressLineNumbers/></w:pPr></w:style>',
  body: lines(4, 'm') + p(r('pelo estilo Hxg'), '<w:pStyle w:val="SemNum"/>') + p(r('volta Hxg'), '<w:pStyle w:val="SemNum"/><w:suppressLineNumbers w:val="0"/>') + lines(4, 'n'),
  sect: sect('<w:lnNumType w:countBy="1" w:distance="0"/>') }) });
