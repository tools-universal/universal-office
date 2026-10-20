// Faixa de cabeçalho como a do corpus (t205-ea65ae51): grupo (wpg) da largura da
// página, posicionado pela PÁGINA, com contorno quadrado, no parágrafo do
// cabeçalho; no mesmo parágrafo, uma caixa de texto atrás do texto (behindDoc)
// relativa ao parágrafo, com contorno justo. (1) Onde fica a linha do parágrafo
// do cabeçalho e quanto o corpo desce? (2) A caixa atrás do texto sai na frente
// ou atrás da imagem do grupo (ordem de pintura no cabeçalho × no corpo)?
// Arial 11; textos inventados; imagens sólidas geradas aqui.
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';
import { solidPng } from '../png.mjs';

const E = (pt) => Math.round(pt * 12700);
const WPG = 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup';
const WPS = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape';
const PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture';
const media = { 'image1.png': solidPng(20, 20, [20, 20, 160]) };

const picEl = (id, x, y, w, h) => `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="img${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`;
const txt = (text, color) => p(r(text, `<w:color w:val="${color}"/><w:sz w:val="28"/>`), '<w:spacing w:after="0"/>');
const sp = (id, x, y, w, h, fill, paras, ins = 0) => `<wps:wsp><wps:cNvPr id="${id}" name="f${id}"/><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}<a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx><wps:bodyPr lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}"><a:noAutofit/></wps:bodyPr></wps:wsp>`;
// chExt maior que ext (escala vertical), como no corpus
const group = (w, h, chH, kids) => `<wpg:wgp xmlns:wpg="${WPG}"><wpg:cNvGrpSpPr/><wpg:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/><a:chOff x="0" y="0"/><a:chExt cx="${E(w)}" cy="${E(chH)}"/></a:xfrm></wpg:grpSpPr>${kids}</wpg:wgp>`;
const wraps = {
  square: '<wp:wrapSquare wrapText="bothSides"/>',
  none: '<wp:wrapNone/>',
  tb: '<wp:wrapTopAndBottom/>',
  through: (w, h) => `<wp:wrapThrough wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="132" y="0"/><wp:lineTo x="132" y="20250"/><wp:lineTo x="21382" y="20250"/><wp:lineTo x="21382" y="0"/><wp:lineTo x="132" y="0"/></wp:wrapPolygon></wp:wrapThrough>`,
  tight: (w, h) => `<wp:wrapTight wrapText="bothSides"><wp:wrapPolygon edited="0"><wp:start x="132" y="0"/><wp:lineTo x="132" y="20250"/><wp:lineTo x="21382" y="20250"/><wp:lineTo x="21382" y="0"/><wp:lineTo x="132" y="0"/></wp:wrapPolygon></wp:wrapTight>`,
};
/** âncora: rel = [relH, relV], off = [x, y] pt */
const anchor = ({ id, rel, off, w, h, behind, z, wrap, uri, inner }) => `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${z}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${rel[0]}"><wp:posOffset>${E(off[0])}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${rel[1]}"><wp:posOffset>${E(off[1])}</wp:posOffset></wp:positionV><wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${typeof wrap === 'function' ? wrap(w, h) : wrap}<wp:docPr id="${id}" name="obj${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${uri}">${inner}</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;

// a faixa: grupo 595 × 93,75 pt na página (0, 0), imagem + caixa "Faixa Hxg"
const band = ({ wrap = wraps.square, kind = 'group', behind = false, z = 251638784 } = {}) => kind === 'group'
  ? anchor({ id: 10, rel: ['page', 'page'], off: [0, 0], w: 595, h: 93.75, behind, z, wrap, uri: WPG,
    inner: group(595, 93.75, 126, picEl(11, 0, 0, 595, 126) + sp(12, 39, 29.8, 464.7, 36.7, null, txt('Faixa Hxg', 'FFFFFF'))) })
  : anchor({ id: 10, rel: ['page', 'page'], off: [0, 0], w: 595, h: 93.75, behind, z, wrap, uri: PIC, inner: picEl(11, 0, 0, 595, 93.75) });
// a caixa do título: atrás do texto, relativa à coluna/parágrafo, contorno justo
const title = ({ behind = true, z = 251659264, wrap = wraps.tight, fill = null, color = 'FFFFFF', rel = ['column', 'paragraph'], off = [-13, 1.5], w = 489.5 } = {}) =>
  anchor({ id: 20, rel, off, w, h: 25.6, behind, z, wrap, uri: WPS, inner: sp(21, 0, 0, w, 25.6, fill, txt('Titulo Hxg', color), 0) });

const IND = '<w:spacing w:after="0" w:line="259" w:lineRule="auto"/><w:ind w:left="-711" w:right="11482" w:firstLine="0"/>';
const PLAIN = '<w:spacing w:after="0" w:line="259" w:lineRule="auto"/>';
const body = Array.from({ length: 6 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
const D = (hdr, bodyXml = body) => buildDocx({ body: bodyXml, headers: { default: hdr }, sect: sectPr({ top: 1417, header: 708 }), defaults: docDefaults({ font: 'Arial', size: 11 }), media });

export const cases = [];
// (1) contorno: onde fica a linha do parágrafo e o corpo
cases.push({ name: 'hg-full', docx: D(p(band() + title(), IND)) });
cases.push({ name: 'hg-full-text', docx: D(p(band() + title() + r('Cab Hxg'), IND)) });
cases.push({ name: 'hg-noind', docx: D(p(band() + title(), PLAIN)) });
cases.push({ name: 'hg-noind-text', docx: D(p(band() + title() + r('Cab Hxg'), PLAIN)) });
cases.push({ name: 'hg-notitle', docx: D(p(band(), IND)) });
cases.push({ name: 'hg-notitle-noind', docx: D(p(band(), PLAIN)) });
cases.push({ name: 'hg-pic', docx: D(p(band({ kind: 'pic' }) + title(), IND)) });
cases.push({ name: 'hg-pic-noind', docx: D(p(band({ kind: 'pic' }), PLAIN)) });
cases.push({ name: 'hg-titleonly', docx: D(p(title(), IND)) });
cases.push({ name: 'hg-full-2p', docx: D(p(band() + title(), IND) + p(r('Cab2 Hxg'), PLAIN)) });
// (2) ordem de pintura: caixa verde com texto vermelho sobre a imagem azul
const green = { fill: '00C000', color: 'FF0000', wrap: wraps.none, rel: ['page', 'page'], off: [100, 40] };
const pic = (behind, z) => band({ kind: 'pic', wrap: wraps.none, behind, z });
cases.push({ name: 'hz-hdr-tbbehind-hi', docx: D(p(pic(false, 251658240) + title({ ...green, behind: true, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-hdr-tbbehind-lo', docx: D(p(pic(false, 251659264) + title({ ...green, behind: true, z: 251658240 }), PLAIN)) });
cases.push({ name: 'hz-hdr-tbbehind-first', docx: D(p(title({ ...green, behind: true, z: 251659264 }) + pic(false, 251658240), PLAIN)) });
cases.push({ name: 'hz-hdr-picbehind-lo', docx: D(p(pic(true, 251658240) + title({ ...green, behind: false, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-hdr-picbehind-hi', docx: D(p(pic(true, 251659264) + title({ ...green, behind: false, z: 251658240 }), PLAIN)) });
cases.push({ name: 'hz-body-tbbehind-hi', docx: D(p(r('Cab Hxg')), p(pic(false, 251658240) + title({ ...green, behind: true, z: 251659264 }) + r('Ancora Hxg')) + body) });
cases.push({ name: 'hz-body-tbbehind-lo', docx: D(p(r('Cab Hxg')), p(pic(false, 251659264) + title({ ...green, behind: true, z: 251658240 }) + r('Ancora Hxg')) + body) });
// a faixa do corpus: grupo + caixa atrás com fundo verde
cases.push({ name: 'hz-full', docx: D(p(band() + title({ fill: '00C000', color: 'FF0000' }), IND)) });
// atrás do texto COM contorno (tight/square): o behindDoc ainda vale? (caixa estreita à
// direita: a linha vazia do cabeçalho cabe ao lado — só a ordem de pintura importa aqui)
const narrow = { ...green, off: [300, 40], w: 289.5 };
cases.push({ name: 'hz-hdr-tbbehind-tight', docx: D(p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-hdr-tbbehind-tight-lo', docx: D(p(pic(false, 251659264) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251658240 }), PLAIN)) });
cases.push({ name: 'hz-hdr-tbbehind-square', docx: D(p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.square, behind: true, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-body-tbbehind-tight', docx: D(p(r('Cab Hxg')), p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251659264 }) + r('Ancora Hxg')) + body) });
cases.push({ name: 'hz-body-tbbehind-tight-lo', docx: D(p(r('Cab Hxg')), p(pic(false, 251659264) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251658240 }) + r('Ancora Hxg')) + body) });
// grupo na frente (sem contorno) × caixa atrás sem contorno
cases.push({ name: 'hz-hdr-grp-tbbehind', docx: D(p(band({ wrap: wraps.none }) + title({ ...green, behind: true }), PLAIN)) });
// em cima e embaixo / através: o behindDoc vale? (caixa abaixo da linha do cabeçalho)
const low = { ...narrow, off: [300, 60] };
cases.push({ name: 'hz-hdr-tbbehind-tb', docx: D(p(pic(false, 251658240) + title({ ...low, wrap: wraps.tb, behind: true, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-hdr-tbbehind-through', docx: D(p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.through, behind: true, z: 251659264 }), PLAIN)) });
cases.push({ name: 'hz-body-tbbehind-tb', docx: D(p(r('Cab Hxg')), p(pic(false, 251658240) + title({ ...low, wrap: wraps.tb, behind: true, z: 251659264 }) + r('Ancora Hxg')) + body) });
cases.push({ name: 'hz-body-tbbehind-through', docx: D(p(r('Cab Hxg')), p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.through, behind: true, z: 251659264 }) + r('Ancora Hxg')) + body) });
// ordem no PDF: caixa com contorno atrás × na frente do texto, no corpo (texto antes e
// depois dela) — o Word a grava antes ou depois do texto da página?
const boxPara = (wrap, behind) => p(title({ fill: 'FFFFFF', color: '000000', wrap, behind, rel: ['column', 'paragraph'], off: [0, 6], w: 300 }) + r('Ancora Hxg'));
for (const [wn, wrap] of [['tb', wraps.tb], ['sq', wraps.square], ['tight', wraps.tight], ['none', wraps.none]]) {
  for (const behind of [true, false]) {
    cases.push({ name: `ho-body-${wn}-${behind ? 'behind' : 'front'}`, docx: D(p(r('Cab Hxg')), p(r('Antes Hxg')) + boxPara(wrap, behind) + p(r('Depois Hxg')) + body) });
  }
}
// os mesmos no modo de compatibilidade 14 (Word 2010)
const D14 = (hdr, bodyXml) => buildDocx({ body: bodyXml, headers: { default: hdr }, sect: sectPr({ top: 1417, header: 708 }), defaults: docDefaults({ font: 'Arial', size: 11 }), media, compat: 14 });
cases.push({ name: 'ho14-body-tb-behind', docx: D14(p(r('Cab Hxg')), p(r('Antes Hxg')) + boxPara(wraps.tb, true) + p(r('Depois Hxg')) + body) });
cases.push({ name: 'ho14-body-sq-behind', docx: D14(p(r('Cab Hxg')), p(r('Antes Hxg')) + boxPara(wraps.square, true) + p(r('Depois Hxg')) + body) });
cases.push({ name: 'hz14-body-tbbehind-tight', docx: D14(p(r('Cab Hxg')), p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251659264 }) + r('Ancora Hxg')) + body) });
cases.push({ name: 'hz14-hdr-tbbehind-tight', docx: D14(p(pic(false, 251658240) + title({ ...narrow, wrap: wraps.tight, behind: true, z: 251659264 }), PLAIN), body) });
cases.push({ name: 'hz14-full', docx: D14(p(band() + title({ fill: '00C000', color: 'FF0000' }), IND), body) });
// campo PAGE numa caixa de texto DENTRO do grupo do rodapé (o corpus grava o valor
// de uma página só): o Word recalcula em cada página?
{
  const pageFld = p('<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE   \* MERGEFORMAT </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>7</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t xml:space="preserve"> de 3</w:t></w:r>', '<w:spacing w:after="0"/>');
  const ftrGroup = anchor({ id: 30, rel: ['page', 'page'], off: [450, 790], w: 100, h: 30, behind: false, z: 251660000, wrap: wraps.none, uri: WPG,
    inner: group(100, 30, 30, picEl(31, 0, 0, 100, 30) + sp(32, 10, 5, 80, 20, null, pageFld)) });
  const longBody = Array.from({ length: 120 }, (_, k) => p(r(`Corpo ${k + 1} Hxg`))).join('');
  cases.push({ name: 'hg-page-ftr', docx: buildDocx({ body: longBody, footers: { default: p(ftrGroup + r('Rod Hxg')) }, sect: sectPr({ top: 1417, header: 708 }), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
// caixa mais estreita que a palavra (o "10" do número de página do corpus): o Word
// parte a palavra? Com e sem horzOverflow="overflow", solta e no grupo
{
  const spO = (id, x, y, w, h, text, ovf) => `<wps:wsp><wps:cNvPr id="${id}" name="f${id}"/><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${p(r(text, '<w:sz w:val="16"/>'), '<w:spacing w:after="160" w:line="259" w:lineRule="auto"/>')}</w:txbxContent></wps:txbx><wps:bodyPr${ovf ? ' horzOverflow="overflow"' : ''} vert="horz" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0"><a:noAutofit/></wps:bodyPr></wps:wsp>`;
  for (const [nm, text] of [['num', '10'], ['long', '123456'], ['two', '10 20']]) {
    for (const ovf of [true, false]) {
      const solo = anchor({ id: 40, rel: ['page', 'page'], off: [100, 300], w: 5.68, h: 13, behind: false, z: 251661000, wrap: wraps.none, uri: WPS, inner: spO(41, 0, 0, 5.68, 13, text, ovf) });
      const grp = anchor({ id: 50, rel: ['page', 'page'], off: [300, 300], w: 60, h: 30, behind: false, z: 251662000, wrap: wraps.none, uri: WPG, inner: group(60, 30, 30, spO(51, 17.5, 7, 5.68, 13, text, ovf)) });
      cases.push({ name: `hn-${nm}-${ovf ? 'ovf' : 'clip'}`, docx: D(p(r('Cab Hxg')), p(solo + grp + r('Ancora Hxg')) + body) });
    }
  }
}
// o mesmo "10" como RESULTADO do campo PAGE (numeração começando em 10): o Word parte?
{
  const fld = '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE   \* MERGEFORMAT </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>2</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';
  const spF = (id, x, y, w, h) => `<wps:wsp><wps:cNvPr id="${id}" name="f${id}"/><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="${E(x)}" y="${E(y)}"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${p(fld, '<w:spacing w:after="160" w:line="259" w:lineRule="auto"/>')}</w:txbxContent></wps:txbx><wps:bodyPr horzOverflow="overflow" vert="horz" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0"><a:noAutofit/></wps:bodyPr></wps:wsp>`;
  const solo = anchor({ id: 40, rel: ['page', 'page'], off: [100, 780], w: 5.68, h: 13, behind: false, z: 251661000, wrap: wraps.none, uri: WPS, inner: spF(41, 0, 0, 5.68, 13) });
  const grp = anchor({ id: 50, rel: ['page', 'page'], off: [300, 780], w: 60, h: 30, behind: false, z: 251662000, wrap: wraps.none, uri: WPG, inner: group(60, 30, 30, spF(51, 17.5, 7, 5.68, 13)) });
  for (const [nm, ftr] of [['hn-field-ftr', p(solo + grp + r('Rod Hxg'))]]) {
    cases.push({ name: nm, docx: buildDocx({ body, footers: { default: ftr }, sect: sectPr({ top: 1417, header: 708, extra: '<w:pgNumType w:start="10"/>' }), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
  }
  cases.push({ name: 'hn-field-body', docx: buildDocx({ body: p(r('Cab Hxg')) + p(solo.replace('>780<', '>300<').replace(String(E(780)), String(E(300))) + grp.replace(String(E(780)), String(E(300))) + r('Ancora Hxg')) + body, sect: sectPr({ top: 1417, header: 708, extra: '<w:pgNumType w:start="10"/>' }), defaults: docDefaults({ font: 'Arial', size: 11 }), media }) });
}
