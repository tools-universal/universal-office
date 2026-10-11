// Cabeçalho/rodapé: quando o cabeçalho passa da margem superior, onde o corpo
// começa? (imagem inline, várias linhas, espaço depois, estilo com espaçamento);
// rodapé alto empurrando o corpo para cima; distância do cabeçalho.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

export const cases = [];
const media = { 'image1.png': solidPng(20, 20, [30, 30, 200]) };
const body = Array.from({ length: 6 }, (_, k) => p(r(`corpo linha ${k + 1} Hxg`))).join('');
const variants = [
  ['text-short', p(r('Cabecalho curto Hxg'))],
  ['text-tall', Array.from({ length: 6 }, (_, k) => p(r(`cabecalho ${k + 1} Hxg`))).join('')],
  ['img-60', p(inlineImage(1, 120, 60))],
  ['img-60-after', p(inlineImage(1, 120, 60), '<w:spacing w:after="240"/>')],
  ['img-60-empty', p('') + p(inlineImage(1, 120, 60))],
  ['img-60-trailing-empty', p(inlineImage(1, 120, 60)) + p('')],
  ['text-after', Array.from({ length: 6 }, (_, k) => p(r(`cab ${k + 1} Hxg`), '<w:spacing w:after="200"/>')).join('')],
];
for (const [name, hdr] of variants) {
  for (const [mt, hd] of [[1417, 708], [600, 300]]) {
    cases.push({
      name: `hdr-${name}-${mt}`,
      docx: buildDocx({ body, headers: { default: hdr }, sect: sectPr({ top: mt, header: hd }), defaults: docDefaults({ font: 'Arial', size: 11 }), media }),
    });
  }
}
// rodapé alto
cases.push({
  name: 'ftr-tall',
  docx: buildDocx({
    body: Array.from({ length: 60 }, (_, k) => p(r(`corpo ${k + 1} Hxg`))).join(''),
    footers: { default: Array.from({ length: 8 }, (_, k) => p(r(`rodape ${k + 1} Hxg`))).join('') },
    sect: sectPr({ bottom: 1000, footer: 500 }),
    defaults: docDefaults({ font: 'Arial', size: 11 }),
  }),
});
// herança entre seções: a seção sem referências usa o cabeçalho/rodapé da
// anterior; referência só de "first" (sem titlePg) não troca o padrão
{
  const geo = '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="708"/>';
  const ref = (k, t) => `<w:${k}Reference w:type="${t}" r:id="rId_${k}_${t}"/>`;
  const brk = (refs) => `<w:p><w:pPr><w:sectPr>${refs}${geo}</w:sectPr></w:pPr></w:p>`;
  const body = p(r('Secao um Hxg')) + brk(ref('header', 'default') + ref('footer', 'default'))
    + p(r('Secao dois sem referencias Hxg')) + brk('')
    + p(r('Secao tres so rodape first Hxg'));
  cases.push({
    name: 'hf-inherit',
    docx: buildDocx({
      body,
      headers: { default: p(r('Cabecalho padrao Hxg')) },
      footers: { default: p(r('Rodape padrao Hxg')), first: p(r('Rodape primeira Hxg')) },
      // atributo no sectPr final: o builder não injeta as referências nele
      sect: `<w:sectPr w:rsidR="00000001">${ref('footer', 'first')}${geo}</w:sectPr>`,
      defaults: docDefaults({ font: 'Arial', size: 11 }),
    }),
  });
}
