// Numeração de linhas (w:lnNumType), parte 3 — reinício entre seções contínuas na
// MESMA página (lnnum2/ln-sects mostrou: newPage depois de uma seção sem números
// recomeça; continuous com w:start no meio continua). Cada caso: seções curtas
// separadas por quebras contínuas; o nome diz a sequência de reinícios.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const PG = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>';
const LN = {
  page: '<w:lnNumType w:countBy="1"/>',
  sect: '<w:lnNumType w:countBy="1" w:restart="newSection"/>',
  cont: '<w:lnNumType w:countBy="1" w:restart="continuous"/>',
  none: '',
};
const ln = (k) => LN[k] ?? k;
const sectXml = (k, type = 'continuous') => `<w:sectPr>${type ? `<w:type w:val="${type}"/>` : ''}${PG}${ln(k)}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
const defaults = docDefaults({ font: 'Calibri', size: 11 });

/** seções [lnNumType, linhas]: as quebras são contínuas; a última é o sectPr do corpo */
function doc(name, secs, { firstType = '' } = {}) {
  let body = '';
  secs.forEach(([k, n], i) => {
    const tag = String.fromCharCode(97 + i);
    for (let j = 1; j < n; j++) body += p(r(`${tag}${j} Hxg`));
    const last = i === secs.length - 1;
    if (!last) body += p(r(`${tag}${n} Hxg`), sectXml(k, i === 0 ? firstType : 'continuous'));
    else body += p(r(`${tag}${n} Hxg`));
  });
  const [lk] = secs[secs.length - 1];
  return { name, docx: buildDocx({ defaults, body, sect: sectXml(lk, secs.length > 1 ? 'continuous' : '') }) };
}

export const cases = [
  doc('s-page-page', [['page', 3], ['page', 3]]),
  doc('s-cont-page', [['cont', 3], ['page', 3]]),
  doc('s-page-none-page', [['page', 3], ['none', 2], ['page', 3]]),
  doc('s-cont-none-cont', [['cont', 3], ['none', 2], ['cont', 3]]),
  doc('s-sect-cont', [['sect', 3], ['cont', 3]]),
  doc('s-cont-sect', [['cont', 3], ['sect', 3]]),
  doc('s-page-cont', [['page', 3], ['cont', 3]]),
  doc('s-cont-cont-start', [['<w:lnNumType w:countBy="1" w:start="4" w:restart="continuous"/>', 3], ['<w:lnNumType w:countBy="1" w:start="19" w:restart="continuous"/>', 3]]),
  doc('s-cont-sect-start', [['cont', 3], ['<w:lnNumType w:countBy="1" w:start="3" w:restart="newSection"/>', 3]]),
  doc('s-cont-page-start', [['cont', 3], ['<w:lnNumType w:countBy="1" w:start="6"/>', 3]]),
  doc('s-page-page-start', [['<w:lnNumType w:countBy="1" w:start="2"/>', 3], ['<w:lnNumType w:countBy="1" w:start="7"/>', 3]]),
  doc('s-none-cont', [['none', 2], ['<w:lnNumType w:countBy="1" w:start="4" w:restart="continuous"/>', 3]]),
  doc('s-cont-none-sect', [['cont', 3], ['none', 2], ['sect', 3]]),
  doc('s-countby', [['<w:lnNumType w:countBy="2" w:restart="continuous"/>', 3], ['<w:lnNumType w:countBy="3" w:restart="continuous"/>', 5]]),
  // quebra de página dentro da seção "continuous" seguida de seção "newPage" (mesma página)
  doc('s-cont-long-page', [['cont', 60], ['page', 3]]),
  doc('s-page-long-cont', [['page', 60], ['cont', 3]]),
];
