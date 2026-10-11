// Texto que o Word NÃO grava como texto no PDF (ou grava e nós não):
//  - caixas/objetos inteiramente fora da página (à direita, abaixo, no rodapé);
//    e os que só cruzam a borda (o que sobra de cada linha?)
//  - w14:textFill: transparência parcial (vira imagem?), noFill, alpha 100%,
//    contorno (w14:textOutline), caixa girada
//  - mc:AlternateContent com OUTRO prefixo para o namespace MC (ve:)
//  - FORMDROPDOWN sem resultado (o Word mostra a entrada escolhida)
//  - U+00AD literal dentro de w:t × w:softHyphen
//  - emoji colorido (Segoe UI Emoji)
import { buildDocx, docDefaults, p, r, sectPr } from '../docx-builder.mjs';

const E = (pt) => Math.round(pt * 12700);
const D = docDefaults({ font: 'Arial', size: 11 });
/** caixa de texto wps ancorada (posições em pt) */
const tbox = ({ id = 1, relH = 'page', x = 0, relV = 'page', y = 0, w = 150, h = 40, inner, wrap = 'square', rot = 0, auto = false }) =>
  `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251660000 + id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
  + `<wp:positionH relativeFrom="${relH}"><wp:posOffset>${E(x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${E(y)}</wp:posOffset></wp:positionV>`
  + `<wp:extent cx="${E(w)}" cy="${E(h)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="tb${id}"/>`
  + `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm${rot ? ` rot="${rot}"` : ''}><a:off x="0" y="0"/><a:ext cx="${E(w)}" cy="${E(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr>`
  + `<wps:txbx><w:txbxContent>${inner}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="${wrap}" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0">${auto ? '<a:spAutoFit/>' : '<a:noAutofit/>'}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
const BODY = p(r('Corpo antes Hxg')) + p(r('Corpo depois Hxg'));
const anchorPara = (obj) => p(obj + r('Ancora Hxg'));

export const cases = [];
const add = (name, opts) => cases.push({ name, docx: buildDocx({ defaults: D, ...opts }) });

// ───────────── fora da página (A4: 595,3 × 841,9 pt) ─────────────
add('off-right', { body: anchorPara(tbox({ x: 620, y: 100, inner: p(r('Fora direita Hxg')) })) + BODY });
add('off-bottom', { body: anchorPara(tbox({ x: 100, y: 850, inner: p(r('Fora abaixo Hxg')) })) + BODY });
add('off-left', { body: anchorPara(tbox({ x: -200, y: 100, inner: p(r('Fora esquerda Hxg')) })) + BODY });
// caixa que cruza a borda direita (sem quebra): que palavras saem?
add('straddle-right', { body: anchorPara(tbox({ x: 480, y: 100, w: 60, h: 30, wrap: 'none', inner: p(r('Alfa Beta Gama Delta Epsilon Zeta Eta Teta')) })) + BODY });
// caixa que cruza a borda de baixo: 6 linhas, as últimas abaixo da página
add('straddle-bottom', { body: anchorPara(tbox({ x: 100, y: 790, w: 200, h: 120, inner: [1, 2, 3, 4, 5, 6].map((k) => p(r(`Linha ${k} Hxg`))).join('') })) + BODY });
// caixa que cruza a borda esquerda
add('straddle-left', { body: anchorPara(tbox({ x: -30, y: 100, w: 200, h: 30, wrap: 'none', inner: p(r('Esquerda parcial Hxg')) })) + BODY });
// parágrafo do corpo com recuo direito negativo: a linha passa da borda da página
add('body-negind', { body: p(r('Inicio ' + 'palavra '.repeat(20) + 'fim Hxg'), '<w:ind w:right="-4000"/>') + BODY });
// rodapé: caixa 743 pt abaixo do parágrafo do rodapé (rótulo de classificação)
add('ftr-far', { body: BODY, footers: { default: p(tbox({ relH: 'rightMargin', x: 0, relV: 'paragraph', y: 743, w: 35, h: 35, wrap: 'none', auto: true, inner: p(r('Rotulo longe Hxg')) }) + r('Rodape Hxg')) } });
add('ftr-near', { body: BODY, footers: { default: p(tbox({ relH: 'rightMargin', x: 0, relV: 'paragraph', y: 0, w: 35, h: 35, wrap: 'none', auto: true, inner: p(r('Rotulo perto Hxg')) }) + r('Rodape Hxg')) } });

// ───────────── w14:textFill / textOutline ─────────────
const fill = (alpha) => `<w14:textFill><w14:solidFill><w14:srgbClr w14:val="000000">${alpha !== undefined ? `<w14:alpha w14:val="${alpha}"/>` : ''}</w14:srgbClr></w14:solidFill></w14:textFill>`;
const outline = (w, alpha) => `<w14:textOutline w14:w="${w}" w14:cap="flat" w14:cmpd="sng" w14:algn="ctr"><w14:solidFill><w14:srgbClr w14:val="000000">${alpha !== undefined ? `<w14:alpha w14:val="${alpha}"/>` : ''}</w14:srgbClr></w14:solidFill><w14:prstDash w14:val="solid"/><w14:bevel/></w14:textOutline>`;
const NOFILL = '<w14:textFill><w14:noFill/></w14:textFill>';
const mid = (rPr) => p(r('Antes Hxg ') + r('Meio efeito', rPr) + r(' depois Hxg'));
add('tf-alpha50', { body: mid(fill(50000)) + BODY });
add('tf-alpha100', { body: mid(fill(100000)) + BODY });
add('tf-alpha0', { body: mid(fill(0)) + BODY });
add('tf-solid', { body: mid(fill()) + BODY });
add('tf-nofill', { body: mid('<w:color w:val="FFFFFF"/>' + NOFILL) + BODY });
add('tf-outline-nofill', { body: mid(outline(9525) + NOFILL) + BODY });
add('tf-outline0-alpha', { body: mid(outline(0, 95294) + fill(95294)) + BODY });
add('tf-outline-solid', { body: mid(outline(9525) + fill()) + BODY });
// caixa girada (315°) com texto normal e com texto transparente
add('rot-tb', { body: anchorPara(tbox({ x: 150, y: 200, w: 120, h: 14, rot: 18900000, inner: p(r('Girada normal')) })) + BODY });
add('rot-tb-alpha', { body: anchorPara(tbox({ x: 150, y: 200, w: 120, h: 14, rot: 18900000, inner: p(r('Girada transparente', outline(0, 95294) + fill(95294))) })) + BODY });
add('tb-alpha', { body: anchorPara(tbox({ x: 150, y: 200, w: 200, h: 20, inner: p(r('Caixa transparente', fill(60000))) })) + BODY });

// ───────────── mc:AlternateContent com prefixo ve: ─────────────
{
  const VE = 'xmlns:ve="http://schemas.openxmlformats.org/markup-compatibility/2006"';
  const alt = (pfx, inner, decl) => `<w:r><${pfx}:AlternateContent${decl ? ` ${decl}` : ''}><${pfx}:Choice Requires="wps">${inner.replace(/^<w:r>|<\/w:r>$/g, '')}</${pfx}:Choice><${pfx}:Fallback><w:t>FALLBACK</w:t></${pfx}:Fallback></${pfx}:AlternateContent></w:r>`;
  const tb = (txt) => tbox({ relH: 'margin', x: 300, relV: 'paragraph', y: 0, w: 120, h: 20, inner: p(r(txt)) });
  add('mc-ve-body', { body: p(r('Ancora ') + alt('ve', tb('Caixa VE Hxg'), VE)) + BODY });
  add('mc-mc-body', { body: p(r('Ancora ') + alt('mc', tb('Caixa MC Hxg'))) + BODY });
  add('mc-ve-ftr', { body: BODY, footers: { default: p(r('Rodape ') + alt('ve', tb('Caixa VE rodape'), VE)) } });
}

// ───────────── FORMDROPDOWN ─────────────
{
  const dd = (list, cached) => `<w:r><w:fldChar w:fldCharType="begin"><w:ffData><w:name w:val="Lista"/><w:enabled/><w:calcOnExit w:val="0"/><w:ddList>${list}</w:ddList></w:ffData></w:fldChar></w:r>`
    + '<w:r><w:instrText xml:space="preserve"> FORMDROPDOWN </w:instrText></w:r>'
    + (cached !== undefined ? `<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t xml:space="preserve">${cached}</w:t></w:r>` : '')
    + '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
  const ents = '<w:listEntry w:val="Primeira opcao"/><w:listEntry w:val="Segunda opcao"/><w:listEntry w:val="Terceira opcao"/>';
  const line = (k, list, cached) => p(r(`Lista ${k}: `) + dd(list, cached) + r(' fim Hxg'));
  const body = line(1, ents)
    + line(2, '<w:default w:val="2"/>' + ents)
    + line(3, '<w:result w:val="1"/><w:default w:val="2"/>' + ents)
    + line(4, ents, 'Cache velho')
    + line(5, '<w:result w:val="2"/>' + ents, 'Cache velho')
    + line(6, '')
    + line(7, '<w:result w:val="9"/>' + ents);
  add('ff-dropdown', { body });
}

// ───────────── hífen opcional literal (U+00AD em w:t) × w:softHyphen ─────────────
add('shy-literal', {
  body: p(r('Codigo 0001\u00AD06 literal Hxg'))
    + p(r('Codigo 0001') + '<w:r><w:softHyphen/></w:r>' + r('06 elemento Hxg'))
    + p(r('Palavra\u00ADcomprida literal Hxg'))
    // fim de linha: o literal quebra a linha? (palavra longa no limite)
    + p(r('xxxxxxxxx '.repeat(7) + 'abcdefgh\u00ADijklmnop fim'))
    + p(r('xxxxxxxxx '.repeat(7) + 'abcdefgh') + '<w:r><w:softHyphen/></w:r>' + r('ijklmnop fim')),
});

// ───────────── emoji colorido ─────────────
{
  const emo = (t) => r(t, '<w:rFonts w:ascii="Segoe UI Emoji" w:hAnsi="Segoe UI Emoji" w:cs="Segoe UI Emoji"/>');
  const sym = (t) => r(t, '<w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/>');
  add('emoji', {
    body: p(emo('⚠️') + r(' Aviso emoji Hxg'))
      + p(emo('\u{1F600}') + r(' Sorriso Hxg'))
      + p(sym('⚠') + r(' Simbolo Hxg'))
      + p(r('Letras ') + emo('ABC') + r(' na fonte emoji Hxg')),
  });
}
void sectPr;

// ───────────── rodada 2: limiares e variantes ─────────────
// rotação da caixa: qualquer ângulo fora de múltiplos de 90° (até 1°) vira
// IMAGEM no PDF do Word. Medido também (casos retirados — o comparador do
// teste não aplica rotação): 90°/180°/270° e bodyPr vert="vert" continuam TEXTO.
add('rot-1', { body: anchorPara(tbox({ x: 150, y: 200, w: 120, h: 14, rot: 60000, inner: p(r('Girada caixa')) })) + BODY });
// VML (sem mc): caixa com rotation:-45
add('vml-rot', {
  body: p('<w:r><w:pict><v:shape id="tbv" o:spid="_x0000_s1025" type="#_x0000_t202" style="position:absolute;margin-left:100pt;margin-top:50pt;width:120pt;height:14pt;rotation:-45;z-index:1;mso-position-horizontal-relative:text;mso-position-vertical-relative:text" filled="f" stroked="f"><v:textbox inset="0,0,0,0"><w:txbxContent>'
    + p(r('Girada VML')) + '</w:txbxContent></v:textbox></v:shape></w:pict></w:r>' + r('Ancora Hxg')) + BODY,
});
// borda de baixo: caixas de UMA linha (40 pt, sem margens internas) com o topo
// perto da borda (841,9 pt) — a linha some quando a caixa da linha sai ou quando
// a caixa da FONTE (ascendente) sai?
{
  const tops = [838.0, 840.0, 841.0, 841.4, 841.7, 842.1, 842.6, 843.5];
  let objs = '';
  tops.forEach((t, k) => { objs += tbox({ id: 10 + k, x: 20 + k * 70, y: t, w: 70, h: 60, wrap: 'none', inner: p(r(`B${k}`, '<w:sz w:val="80"/>')) }); });
  add('cull-bottom', { body: p(objs + r('Ancora Hxg')) + BODY });
}
// borda direita: caixa sem quebra a partir de x = 560 com runs separados;
// os runs inteiramente além da borda somem ou a linha sai inteira?
{
  const B = '<w:b/>';
  const inner = p(r('Ra ') + r('Rb ', B) + r('Rc ') + r('Rd ', B) + r('Re ') + r('Rf ', B) + r('Rg ') + r('Rh', B));
  add('straddle-right-runs', { body: anchorPara(tbox({ x: 575, y: 100, w: 40, h: 20, wrap: 'none', inner })) + BODY });
  // linha que começa JÁ fora (x = 596) mas a caixa começa dentro (recuo)
  add('right-start-out', { body: anchorPara(tbox({ x: 560, y: 100, w: 200, h: 20, wrap: 'none', inner: p(r('Fora mas caixa dentro'), '<w:ind w:left="800"/>') })) + BODY });
}
// w:noBreakHyphen: o Word desenha o hífen DA PRÓPRIA FONTE (U+002D)? (Arial/Calibri não têm U+2011)
for (const f of ['Arial', 'Calibri']) {
  add(`nbh-${f.toLowerCase()}`, {
    defaults: docDefaults({ font: f, size: 11 }),
    body: p(r('Numero 0001') + '<w:r><w:noBreakHyphen/></w:r>' + r('06 elemento Hxg'))
      + p(r('Numero 0001-06 comum Hxg'))
      + p(r('xxxxxxxxx '.repeat(7) + 'abcdefgh') + '<w:r><w:noBreakHyphen/></w:r>' + r('ijklmnop fim')),
  });
}
