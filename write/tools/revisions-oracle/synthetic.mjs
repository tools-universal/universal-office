// Documentos sintéticos do oráculo do controle de alterações (entradas do Word):
//   fix/    — bases dos experimentos de revisions-xml.ps1 (-FixDir): inserção de
//             outro autor, todos os tipos de revisão, marcas de parágrafo;
//   render/ — PDFs com marcação (revisions-render.ps1): cor por autor, tipos,
//             barras de alteração (margens, espaçamento, tabela).
//   node write/tools/revisions-oracle/synthetic.mjs <pasta de saída>
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildDocx, docDefaults, p, r, sectPr } from '../layout-oracle/docx-builder.mjs';

const outRoot = process.argv[2];
if (!outRoot) { console.error('uso: synthetic.mjs <pasta>'); process.exit(1); }
const D = 'w:date="2024-03-05T10:20:00Z"';
let id = 1;
const ins = (a, inner) => `<w:ins w:id="${id++}" w:author="${a}" ${D}>${inner}</w:ins>`;
const del = (a, text, rpr = '') => `<w:del w:id="${id++}" w:author="${a}" ${D}><w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:delText xml:space="preserve">${text}</w:delText></w:r></w:del>`;
const defaults = docDefaults({ font: 'Arial', size: 11 });
const save = (dir, name, docx) => { mkdirSync(join(outRoot, dir), { recursive: true }); writeFileSync(join(outRoot, dir, `${name}.docx`), docx); };

// ── fix/ ──
id = 1;
save('fix', 'other-ins', buildDocx({ defaults, body: p(r('Hello') + ins('Outro Autor', r(' big')) + r(' world')) }));
id = 1;
save('fix', 'mixed', buildDocx({ defaults, body:
  p(r('Alpha ') + ins('Ana', r('inserted ')) + r('beta ') + del('Bruno', 'deleted ') + r('gamma.')) +
  p(r('Bold ') + `<w:r><w:rPr><w:b/><w:rPrChange w:id="${id++}" w:author="Carla" ${D}><w:rPr/></w:rPrChange></w:rPr><w:t>changed</w:t></w:r>` + r(' text.')) +
  p(r('Centered paragraph.'), `<w:jc w:val="center"/><w:pPrChange w:id="${id++}" w:author="Davi" ${D}><w:pPr/></w:pPrChange>`) +
  p(r('Mark inserted'), `<w:rPr><w:ins w:id="${id++}" w:author="Ana" ${D}/></w:rPr>`) +
  p(r('after mark ins.')) +
  p(r('Mark deleted'), `<w:jc w:val="right"/><w:rPr><w:del w:id="${id++}" w:author="Bruno" ${D}/></w:rPr>`) +
  p(r('after mark del.'), '<w:jc w:val="center"/>') }));
save('fix', 'marks', buildDocx({ defaults, body:
  p(r('First'), `<w:jc w:val="right"/><w:rPr><w:ins w:id="1" w:author="Ana" ${D}/></w:rPr>`) +
  p(r('Second'), '<w:jc w:val="center"/>') +
  p(r('Third'), `<w:jc w:val="right"/><w:rPr><w:del w:id="2" w:author="Bruno" ${D}/></w:rPr>`) +
  p(r('Fourth'), '<w:jc w:val="center"/>') }));

// ── render/ ──
let body = '';
id = 1;
for (const a of ['Zeca', 'Ana', 'Mia', 'Bruno', 'Carla', 'Davi', 'Eva', 'Fabio', 'Gil', 'Hugo', 'Iris']) {
  body += p(r(`${a}: base `) + ins(a, r('inserido')) + r(' meio ') + del(a, 'excluido') + r(' fim.'));
}
save('render', 'colors', buildDocx({ defaults, body }));
id = 1;
const long = 'texto inserido longo que ocupa mais de uma linha inteira para medir as barras de alteracao na margem esquerda da pagina e o sublinhado continuo';
body = p(r('Linha comum sem revisao.'));
body += p(r('Antes ') + ins('Ana', r(long)) + r(' depois.'));
body += p(r('Formatado ') + `<w:r><w:rPr><w:b/><w:rPrChange w:id="${id++}" w:author="Bruno" ${D}><w:rPr/></w:rPrChange></w:rPr><w:t>negrito</w:t></w:r>` + r(' aqui.'));
body += p(r('Paragrafo centralizado com pPrChange.'), `<w:jc w:val="center"/><w:pPrChange w:id="${id++}" w:author="Carla" ${D}><w:pPr/></w:pPrChange>`);
body += p(r('Marca inserida'), `<w:rPr><w:ins w:id="${id++}" w:author="Ana" ${D}/></w:rPr>`);
body += p(r('Marca excluida'), `<w:rPr><w:del w:id="${id++}" w:author="Bruno" ${D}/></w:rPr>`);
body += p(r('Seguinte a marca excluida.'));
body += p(`<w:moveFromRangeStart w:id="${id++}" w:author="Davi" ${D} w:name="move1"/><w:moveFrom w:id="${id++}" w:author="Davi" ${D}><w:r><w:t>Frase movida.</w:t></w:r></w:moveFrom><w:moveFromRangeEnd w:id="${id - 2}"/>` + r(' Fica aqui.'));
body += p(r('Destino: ') + `<w:moveToRangeStart w:id="${id++}" w:author="Davi" ${D} w:name="move1"/><w:moveTo w:id="${id++}" w:author="Davi" ${D}><w:r><w:t>Frase movida.</w:t></w:r></w:moveTo><w:moveToRangeEnd w:id="${id - 2}"/>`);
body += p(r('Excluido com cor: ') + del('Ana', 'vermelho', '<w:color w:val="00B050"/>') + r(' e inserido sublinhado: ') + ins('Ana', r('duplo', '<w:u w:val="double"/>')) + r('.'));
body += p(r('Recuado com revisao ') + ins('Ana', r('X')) + r('.'), '<w:ind w:left="1440"/>');
body += p(r('Ultima linha comum.'));
save('render', 'types', buildDocx({ defaults, body }));
const one = (name, authors, extra = {}) => {
  id = 1;
  let b = '';
  for (const a of authors) b += p(r(`${a}: `) + ins(a, r('inserido')) + r(' fim.'));
  save('render', name, buildDocx({ defaults, body: b, ...extra }));
};
one('a-zeca', ['Zeca']);
one('b-bruno-carla', ['Bruno', 'Carla']);
one('c-carla-bruno', ['Carla', 'Bruno']);
one('e-lower', ['ana', 'ANA', 'Ana']);
for (const m of [400, 720, 1000, 1100, 1300, 1440, 2000, 3000]) one(`m${m}`, ['Ana'], { sect: sectPr({ left: m, right: 1000 }) });
id = 1;
body = p(r('Comum.')) + p(r('Com espaco ') + ins('Ana', r('X')) + r(' antes e depois.'), '<w:spacing w:before="240" w:after="240"/>') + p(r('Comum.'));
body += p(r('Entrelinha dupla ') + ins('Ana', r('Y')) + r(' aqui.'), '<w:spacing w:line="480" w:lineRule="auto"/>') + p(r('Comum.'));
body += p(r('Fonte grande ') + ins('Ana', r('Z', '<w:sz w:val="48"/>')) + r(' aqui.')) + p(r('Comum.'));
save('render', 'i-extent', buildDocx({ defaults, body }));
id = 1;
const cell = (inner, w = 3000) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
body = p(r('Antes.'));
body += '<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/><w:tblInd w:w="1000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>'
  + `<w:tr>${cell(p(r('Celula A')))}${cell(p(r('Celula ') + ins('Ana', r('B'))))}</w:tr></w:tbl>`;
body += p(r('Recuo negativo ') + ins('Ana', r('X')), '<w:ind w:left="-700"/>');
body += p(r('Depois.'));
save('render', 'tbl', buildDocx({ defaults, body }));
console.log('ok', outRoot);
