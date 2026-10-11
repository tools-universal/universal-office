// Molduras de texto (w:framePr sem capitular): parágrafos posicionados fora do
// fluxo, com o texto ao redor. Posição (âncoras text/margin/page, alinhamentos,
// padrões sem âncora), largura automática, wrap around/notBeside/none,
// distâncias hSpace/vSpace, altura exata, molduras seguidas e no cabeçalho.
import { buildDocx, docDefaults, font, lorem, p, r, sectPr, sz } from '../docx-builder.mjs';

const fr = (attrs) => `<w:framePr ${attrs}/>`;
const long = (seed) => p(r(lorem(90, seed)), '<w:jc w:val="both"/>');
const intro = p(r('Primeiro paragrafo Hxg'));
const body = (frameParas, after = long(3)) => intro + frameParas + after + p(r('Depois Hxg')) + long(5);

export const cases = [];
const add = (name, b, extra = {}) =>
  cases.push({ name, docx: buildDocx({ body: b, defaults: docDefaults({ font: 'Arial', size: 11 }), ...extra }) });

add('fr-body-left', body(p(r('Moldura curta Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-auto', body(p(r('Moldura Hxg'), fr('w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-auto-long', body(p(r(lorem(40, 7)), fr('w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-notbeside', body(p(r('Moldura Hxg'), fr('w:w="2400" w:wrap="notBeside" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-none', body(p(r('Moldura Hxg'), fr('w:w="2400" w:wrap="none" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-page', body(p(r('Moldura na pagina Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="3000" w:y="5000"'))));
add('fr-body-margin-right', body(p(r('Moldura a direita Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="margin" w:hAnchor="margin" w:xAlign="right" w:y="2000"'))));
add('fr-body-defaults', body(p(r('Moldura sem ancoras Hxg'), fr('w:w="2400" w:x="1500" w:y="600"'))));
add('fr-body-space', body(p(r('Moldura com folga Hxg'), fr('w:w="2400" w:hSpace="284" w:vSpace="142" w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:xAlign="right" w:y="1"'))));
add('fr-body-two', body(
  p(r('Moldura linha um Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))
  + p(r('Moldura linha dois Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-hexact', body(p(r('Moldura alta Hxg'), fr('w:w="2400" w:h="1200" w:hRule="exact" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-hatleast', body(p(r('Moldura alta Hxg'), fr('w:w="2400" w:h="1200" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"'))));
add('fr-body-border', body(p(r('Moldura com borda Hxg'),
  fr('w:w="2400" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="1"')
  + '<w:pBdr>' + ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="single" w:sz="6" w:space="1" w:color="auto"/>`).join('') + '</w:pBdr>')));
add('fr-body-yoff', body(p(r('Moldura abaixo Hxg'), fr('w:w="2400" w:wrap="around" w:vAnchor="text" w:hAnchor="text" w:x="1" w:y="700"'))));
add('fr-body-center', body(p(r('Moldura centro Hxg'), fr('w:w="3000" w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:xAlign="center" w:y="1"'))));

// cabeçalho: número de página numa moldura à direita (y=1 relativo ao texto) e
// depois um parágrafo alinhado à direita com recuo + parágrafos vazios
const hdrPg = p(r('1/2', font('Arial') + sz(8)), fr('w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:xAlign="right" w:y="1"'));
const hdrRest = p(r('Cabecalho Hxg', sz(16)), '<w:ind w:right="360"/><w:jc w:val="right"/>') + p('', '<w:jc w:val="right"/>') + p('', '<w:ind w:right="360"/>');
const filler = Array.from({ length: 8 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
cases.push({ name: 'fr-hdr-pgnum', docx: buildDocx({ body: filler, headers: { default: hdrPg + hdrRest }, sect: sectPr({ top: 1134, header: 567 }), defaults: docDefaults({ font: 'Times New Roman', size: 12 }) }) });
// moldura à esquerda no cabeçalho, sem nada ao lado
cases.push({ name: 'fr-hdr-left', docx: buildDocx({ body: filler, headers: { default: p(r('Moldura Hxg'), fr('w:w="2000" w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:y="1"')) + p(r('Texto do cabecalho Hxg')) }, sect: sectPr({ top: 1134, header: 567 }), defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
// moldura como ÚLTIMO parágrafo do cabeçalho
cases.push({ name: 'fr-hdr-last', docx: buildDocx({ body: filler, headers: { default: p(r('Texto do cabecalho Hxg')) + p(r('Pag 1'), fr('w:wrap="around" w:vAnchor="text" w:hAnchor="margin" w:xAlign="right" w:y="1"')) }, sect: sectPr({ top: 1134, header: 567 }), defaults: docDefaults({ font: 'Arial', size: 10 }) }) });
