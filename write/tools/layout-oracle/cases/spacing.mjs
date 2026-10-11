// Espaçamento entre parágrafos e entrelinhas múltiplas (precisão: 12 linhas por regra).
import { buildDocx, docDefaults, p, r, sz } from '../docx-builder.mjs';

const lines = (n, label) => Array.from({ length: n }, (_, k) => `${label} ${k + 1} Hxg`).join('\n');

function doc(name, body, opts = {}) {
  return { name, docx: buildDocx({ body, defaults: docDefaults({ font: opts.font ?? 'Arial', size: 11 }), settings: opts.settings ?? '' }) };
}

export const cases = [];

// entrelinha "auto" múltipla: um parágrafo de 12 linhas por regra, separados por página
for (const font of ['Arial', 'Calibri', 'Aptos', 'Times New Roman']) {
  let body = '';
  [240, 259, 264, 276, 288, 300, 360, 420, 480, 600].forEach((line, i) => {
    body += p(r(lines(12, `line ${line}`)), `${i ? '<w:pageBreakBefore/>' : ''}<w:spacing w:line="${line}" w:lineRule="auto"/>`);
  });
  cases.push(doc(`multi-${font.toLowerCase().replace(/\s+/g, '-')}`, body, { font }));
}

// antes/depois entre parágrafos de 1 linha
const pairs = [[0, 0], [120, 0], [0, 120], [120, 240], [240, 120], [200, 200], [0, 240], [300, 60]];
for (const settings of ['', '<w:doNotUseHTMLParagraphAutoSpacing/>']) {
  let body = '';
  pairs.forEach(([before, after], i) => {
    for (let k = 0; k < 4; k++) {
      body += p(r(`b${before} a${after} p${k + 1} Hxg`), `${i && k === 0 ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${before}" w:after="${after}"/>`);
    }
  });
  cases.push(doc(`beforeafter${settings ? '-nohtml' : ''}`, body, { settings }));
}

// antes/depois DIFERENTES entre parágrafos vizinhos (qual soma/colapsa)
{
  let body = '';
  const seq = [[0, 240], [0, 0], [360, 0], [0, 120], [120, 0], [0, 360], [240, 240], [0, 0]];
  seq.forEach(([b, a], k) => { body += p(r(`seq${k + 1} b${b} a${a} Hxg`), `<w:spacing w:before="${b}" w:after="${a}"/>`); });
  cases.push(doc('mixed-neighbors', body));
}

// contextualSpacing: mesmo estilo × estilo diferente
{
  const styles = '<w:style w:type="paragraph" w:styleId="Lista"><w:name w:val="Lista"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="240"/><w:contextualSpacing/></w:pPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Outro"><w:name w:val="Outro"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="240"/></w:pPr></w:style>';
  let body = '';
  for (let k = 0; k < 3; k++) body += p(r(`lista ${k + 1} Hxg`), '<w:pStyle w:val="Lista"/>');
  for (let k = 0; k < 3; k++) body += p(r(`outro ${k + 1} Hxg`), '<w:pStyle w:val="Outro"/>');
  for (let k = 0; k < 3; k++) body += p(r(`lista2 ${k + 1} Hxg`), '<w:pStyle w:val="Lista"/>');
  body += p(r('direto ctx Hxg'), '<w:spacing w:before="120" w:after="240"/><w:contextualSpacing/>');
  body += p(r('direto ctx 2 Hxg'), '<w:spacing w:before="120" w:after="240"/><w:contextualSpacing/>');
  cases.push({ name: 'contextual', docx: buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }), styles }) });
}

// parágrafo vazio (altura vem do rPr da marca ¶) e tamanhos mistos na mesma linha
{
  let body = '';
  body += p(r('antes Hxg'));
  body += p('', '<w:rPr><w:sz w:val="40"/></w:rPr>');
  body += p(r('depois do vazio 20pt Hxg'));
  body += p('', '<w:rPr><w:sz w:val="12"/></w:rPr>');
  body += p(r('depois do vazio 6pt Hxg'));
  body += p(r('normal ') + r('GRANDE', sz(24)) + r(' normal Hxg'));
  body += p(r('linha seguinte Hxg'));
  body += p(r('mista Calibri ') + r('Times', '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>') + r(' Segoe', '<w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI"/>'));
  body += p(r('linha seguinte 2 Hxg'));
  cases.push(doc('empty-mixed', body));
}
