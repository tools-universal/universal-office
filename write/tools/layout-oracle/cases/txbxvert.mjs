// Direção do texto da caixa (wps:bodyPr vert): vert (90°), vert270, eaVert,
// mongolianVert, wordArtVert (empilhado), wordArtVertRtl; com alinhamento
// vertical (t/ctr/b), margens assimétricas, dois parágrafos que quebram,
// alinhamento centralizado e a caixa girada (rot) com upright. As linhas giradas vão
// em `vlines` (pdftext). Arial 11, conteúdo inventado.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { tbx } from './_tbx.mjs';

const TXT = 'Texto vertical Hxg ate quebrar a linha na caixa';
const D = (objs) => buildDocx({ body: p(objs + r('Ancora Hxg')) + p(r('Depois Hxg')), defaults: docDefaults({ font: 'Arial', size: 11 }) });
const at = (k) => ({ x: 80 + (k % 4) * 120, y: 120 + Math.floor(k / 4) * 220, w: 90, h: 180 });

export const cases = [];
for (const vert of ['vert', 'vert270', 'eaVert', 'mongolianVert', 'wordArtVert', 'wordArtVertRtl']) {
  cases.push({
    name: `tv-${vert}`, docx: D([
      tbx({ i: 0, ...at(0), vert, content: p(r(TXT)) }),
      tbx({ i: 1, ...at(1), vert, anchor: 'ctr', content: p(r(TXT)) }),
      tbx({ i: 2, ...at(2), vert, anchor: 'b', content: p(r(TXT)) }),
      tbx({ i: 3, ...at(3), vert, ins: [20, 6, 2, 12], content: p(r(TXT)) }),
      tbx({ i: 4, ...at(4), vert, content: p(r(TXT)) + p(r('Segundo paragrafo Hxg')) }),
      tbx({ i: 5, ...at(5), vert, content: p(r('Centro Hxg'), '<w:jc w:val="center"/>') }),
      tbx({ i: 6, ...at(6), vert, autofit: true, content: p(r('Ajuste Hxg')) }),
    ].join('')),
  });
}
// passo das linhas giradas: várias linhas por caixa, corpos 8/11/16/24 e Times New Roman
const LONG = 'Um texto comprido que quebra em muitas linhas dentro da caixa vertical para medir o passo entre elas Hxg';
const sz = (pt, font) => `<w:rPr>${font ? `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>` : ''}<w:sz w:val="${pt * 2}"/></w:rPr>`;
const runSz = (t, pt, font) => `<w:r>${sz(pt, font)}<w:t xml:space="preserve">${t}</w:t></w:r>`;
for (const vert of ['vert', 'horz']) {
  cases.push({
    name: `tp-${vert}`, docx: D([[8], [11], [16], [24], [11, 'Times New Roman'], [11, 'Courier New']].map(([pt, font], k) =>
      tbx({ i: k, x: 60 + (k % 3) * 170, y: 100 + Math.floor(k / 3) * 330, w: 160, h: 300, vert, content: p(runSz(LONG, pt, font)) })).join('')),
  });
}
export const vlines = true;
