// Gera demo/amostra-indice-comentarios.docx — documento sintético (sem fontes
// embutidas) com títulos em 2 níveis e comentários, para a demo do viewer.
// Uso: node demo/make-sample.mjs
import { zipSync, strToU8 } from 'fflate';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const run = (t) => `<w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (t, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${run(t)}</w:p>`;
const commented = (before, text, after, id) => `<w:p>${run(before)}<w:commentRangeStart w:id="${id}"/>${run(text)}<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>${run(after)}</w:p>`;

const lorem = 'Este parágrafo existe para ocupar espaço e fazer o documento ter várias páginas, como um relatório de verdade. '
  + 'O viewer diagrama com o mesmo motor do editor e do PDF, então as quebras de linha e de página saem iguais nos três. ';
const filler = (n) => Array.from({ length: n }, () => para(lorem.repeat(3))).join('');

const body = [
  para('Relatório de exemplo', 'Title'),
  para('Introdução', 'Heading1'),
  commented('Este documento mostra o ', 'índice e os comentários', ' no viewer de documentos.', 0),
  filler(3),
  para('Objetivos', 'Heading2'),
  filler(4),
  para('Escopo', 'Heading2'),
  commented('O escopo cobre ', 'apenas a visualização', '; a edição fica no editor.', 1),
  filler(4),
  para('Metodologia', 'Heading1'),
  filler(3),
  para('Coleta de dados', 'Heading2'),
  filler(4),
  para('Análise', 'Heading2'),
  commented('Os resultados foram ', 'conferidos contra o Word', ' página a página.', 2),
  filler(4),
  para('Conclusão', 'Heading1'),
  filler(2),
  commented('Próximos passos: ', 'publicar o pacote no npm', '.', 3),
].join('');

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Liberation Sans" w:hAnsi="Liberation Sans" w:cs="Liberation Sans"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:sz w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2F5496"/><w:sz w:val="26"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style>
</w:styles>`;

const comment = (id, author, text) => `<w:comment w:id="${id}" w:author="${esc(author)}" w:date="2026-10-16T10:00:00Z" w:initials="${author.split(' ').map((p) => p[0]).join('')}"><w:p>${run(text)}</w:p></w:comment>`;
const comments = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments ${W}>
${comment(0, 'Ana Souza', 'Dá para abrir os dois painéis ao mesmo tempo?')}
${comment(1, 'Bruno Lima', 'Confirmar se a impressão também entra no escopo.')}
${comment(2, 'Ana Souza', 'Incluir o link para o relatório do corpus.')}
${comment(3, 'Carla Dias', 'Publicação no npm: viewers e editores, licença MIT.')}
</w:comments>`;

const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>`,
  'word/document.xml': document,
  'word/styles.xml': styles,
  'word/comments.xml': comments,
};
const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 9 });
const out = fileURLToPath(new URL('./amostra-indice-comentarios.docx', import.meta.url));
writeFileSync(out, zip);
console.log(`${out} (${zip.length} bytes)`);
