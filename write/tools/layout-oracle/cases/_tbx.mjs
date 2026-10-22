// Caixa de texto (wps:wsp) para os casos do oráculo — XML como o Word grava
// (frente Caixa de texto, tools/textbox-lab): posição em pt relativa à página por
// padrão, conteúdo (blocos) ou vínculo (linkedTxbx), bodyPr completo.
const E = 12700;

/**
 * @param {object} o
 * @param {number} o.i índice (docPr id, relativeHeight)
 * @param {number} o.x @param {number} o.y posição (pt) relativa a `relH`/`relV`
 * @param {number} o.w @param {number} o.h tamanho (pt)
 * @param {string} [o.content] blocos do w:txbxContent (só a 1ª da cadeia)
 * @param {number} [o.id] id da história (wps:txbx id) — 1ª da cadeia
 * @param {{ id: number, seq: number }} [o.link] caixa vinculada (wps:linkedTxbx)
 * @param {string} [o.vert] bodyPr vert
 * @param {string} [o.anchor] t | ctr | b
 * @param {number[]} [o.ins] margens internas em pt [l, t, r, b]
 * @param {string} [o.prst] forma predefinida
 * @param {string} [o.wrap] wrapNone | wrapSquare …
 * @param {boolean} [o.hidden] docPr hidden
 * @param {boolean} [o.autofit] spAutoFit
 * @param {string} [o.fill] spPr do preenchimento (padrão noFill)
 * @param {string} [o.line] a:ln (padrão 0,5 pt preto)
 * @param {string} [o.style] wps:style
 * @param {string} [o.extra] atributos extras do wps:wsp
 * @param {boolean} [o.upright] bodyPr upright
 */
export function tbx(o) {
  const relH = o.relH ?? 'page', relV = o.relV ?? 'page';
  const ins = o.ins ?? [7.2, 3.6, 7.2, 3.6];
  const wrap = o.wrap ?? 'wrapNone';
  const wrapXml = wrap === 'wrapSquare' ? '<wp:wrapSquare wrapText="bothSides"/>' : wrap === 'wrapTopAndBottom' ? '<wp:wrapTopAndBottom/>' : '<wp:wrapNone/>';
  const story = o.link ? `<wps:linkedTxbx id="${o.link.id}" seq="${o.link.seq}"/>`
    : `<wps:txbx${o.id !== undefined ? ` id="${o.id}"` : ''}><w:txbxContent>${o.content ?? '<w:p/>'}</w:txbxContent></wps:txbx>`;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="${251658240 + o.i * 1024}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>`
    + `<wp:positionH relativeFrom="${relH}"><wp:posOffset>${Math.round(o.x * E)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${relV}"><wp:posOffset>${Math.round(o.y * E)}</wp:posOffset></wp:positionV>`
    + `<wp:extent cx="${Math.round(o.w * E)}" cy="${Math.round(o.h * E)}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>${wrapXml}<wp:docPr id="${100 + o.i}" name="Caixa de Texto ${o.i}"${o.hidden ? ' hidden="1"' : ''}/><wp:cNvGraphicFramePr/>`
    + `<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp${o.extra ?? ''}><wps:cNvSpPr txBox="1"/>`
    + `<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(o.w * E)}" cy="${Math.round(o.h * E)}"/></a:xfrm><a:prstGeom prst="${o.prst ?? 'rect'}"><a:avLst/></a:prstGeom>${o.fill ?? '<a:noFill/>'}${o.line ?? '<a:ln w="6350"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln>'}</wps:spPr>`
    + (o.style ?? '')
    + story
    + `<wps:bodyPr rot="0" spcFirstLastPara="0" vertOverflow="overflow" horzOverflow="overflow" vert="${o.vert ?? 'horz'}" wrap="square" lIns="${Math.round(ins[0] * E)}" tIns="${Math.round(ins[1] * E)}" rIns="${Math.round(ins[2] * E)}" bIns="${Math.round(ins[3] * E)}" numCol="1" spcCol="0" rtlCol="0" fromWordArt="0" anchor="${o.anchor ?? 't'}" anchorCtr="0" forceAA="0"${o.upright ? ' upright="1"' : ''} compatLnSpc="1"><a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp>${o.autofit ? '<a:spAutoFit/>' : '<a:noAutofit/>'}</wps:bodyPr>`
    + '</wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>';
}
