// Imagem inline colada ao texto ("abaixo:<img>", "123<img>", "(<img>"): quando a
// imagem não cabe no fim da linha, o Word quebra ANTES dela — a palavra fica e a
// imagem desce sozinha; colada por NBSP ("abaixo<NBSP><img>"), desce junto.
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

// PNG 1×1 (sem conteúdo real), escalado
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==', 'base64'));
let id = 0;
const img = (wpt, hpt) => {
  id++;
  const cx = Math.round(wpt * 12700), cy = Math.round(hpt * 12700);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="img${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
};
const PRE = ['Veja os itens do exemplo a seguir abaixo:', 'Veja os itens do exemplo a seguir abaixo', 'Veja os itens do exemplo a seguir 123', 'Veja os itens do exemplo a seguir (',
  'Veja os itens do exemplo a seguir abaixo-', 'Veja os itens do exemplo a seguir abaixo ', 'Veja os itens do exemplo a seguir abaixo\u00a0', 'Veja os itens do exemplo a seguir “'];
let body = '';
for (const w of [150, 300, 380]) for (const pre of PRE) {
  body += p(r(pre) + img(w, 14) + r('depois da imagem fim'), '<w:spacing w:after="80"/>');
}
// imagem logo depois de texto longo, no meio do parágrafo
for (const w of [60, 120, 240]) {
  body += p(r('Texto de exemplo que ocupa boa parte da linha antes da figura') + img(w, 14) + r('e o texto continua depois dela ate o fim do paragrafo.'), '<w:spacing w:after="80"/>');
}
export const cases = [{ name: 'ib-antes', docx: buildDocx({ body, media: { 'image1.png': png }, defaults: docDefaults({ font: 'Arial', size: 11 }) }) }];
