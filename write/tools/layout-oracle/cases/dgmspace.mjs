// Elemento gráfico SmartArt (a:graphicData .../diagram) EM LINHA: ocupa na linha a
// altura da extensão (wp:extent) como uma imagem? O desenho guardado
// (diagrams/drawing1.xml, formas com texto) é o que o Word mostra. Conteúdo inventado.
import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';

const DGM = 'http://schemas.openxmlformats.org/drawingml/2006/diagram';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const DSP = 'http://schemas.microsoft.com/office/drawing/2008/diagram';
const ids = ['{6B2B7E0A-1111-4C3A-9A51-000000000001}', '{6B2B7E0A-1111-4C3A-9A51-000000000002}', '{6B2B7E0A-1111-4C3A-9A51-000000000003}'];
const dataOf = (nodes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><dgm:dataModel xmlns:dgm="${DGM}" xmlns:a="${A}"><dgm:ptLst>`
  + `<dgm:pt modelId="${ids[0]}" type="doc"><dgm:prSet loTypeId="urn:microsoft.com/office/officeart/2005/8/layout/default" loCatId="list" qsTypeId="urn:microsoft.com/office/officeart/2005/8/quickstyle/simple1" qsCatId="simple" csTypeId="urn:microsoft.com/office/officeart/2005/8/colors/accent1_2" csCatId="accent1"/><dgm:spPr/><dgm:t><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></dgm:t></dgm:pt>`
  + nodes.map((t, k) => `<dgm:pt modelId="${ids[k + 1]}"><dgm:prSet/><dgm:spPr/><dgm:t><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR"/><a:t>${t}</a:t></a:r></a:p></dgm:t></dgm:pt>`).join('')
  + `</dgm:ptLst><dgm:cxnLst>${nodes.map((_, j) => j + 1).map((k) => `<dgm:cxn modelId="{6B2B7E0A-2222-4C3A-9A51-00000000000${k}}" srcId="${ids[0]}" destId="${ids[k]}" srcOrd="${k - 1}" destOrd="0"/>`).join('')}</dgm:cxnLst><dgm:bg/><dgm:whole/>`
  + `<dgm:extLst><a:ext uri="http://schemas.microsoft.com/office/drawing/2008/diagram"><dsp:dataModelExt xmlns:dsp="${DSP}" relId="rIdDgmDrw" minVer="http://schemas.openxmlformats.org/drawingml/2006/diagram"/></a:ext></dgm:extLst></dgm:dataModel>`;
const layout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><dgm:layoutDef xmlns:dgm="${DGM}" xmlns:a="${A}" uniqueId="urn:microsoft.com/office/officeart/2005/8/layout/default"><dgm:title val=""/><dgm:desc val=""/><dgm:layoutNode name="diagram"><dgm:alg type="snake"/><dgm:shape/><dgm:forEach name="Name0" axis="ch" ptType="node"><dgm:layoutNode name="node"><dgm:alg type="tx"/><dgm:shape type="rect"/><dgm:presOf axis="desOrSelf" ptType="node"/></dgm:layoutNode></dgm:forEach></dgm:layoutNode></dgm:layoutDef>`;
const style = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><dgm:styleDef xmlns:dgm="${DGM}" xmlns:a="${A}" uniqueId="urn:microsoft.com/office/officeart/2005/8/quickstyle/simple1"><dgm:title val=""/><dgm:desc val=""/></dgm:styleDef>`;
const colors = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><dgm:colorsDef xmlns:dgm="${DGM}" xmlns:a="${A}" uniqueId="urn:microsoft.com/office/officeart/2005/8/colors/accent1_2"><dgm:title val=""/><dgm:desc val=""/></dgm:colorsDef>`;
/** desenho guardado: dois retângulos com texto, lado a lado, na extensão cx × cy */
const drawing = (cx, cy, nodes) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><dsp:drawing xmlns:dgm="${DGM}" xmlns:dsp="${DSP}" xmlns:a="${A}"><dsp:spTree><dsp:nvGrpSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvGrpSpPr/></dsp:nvGrpSpPr><dsp:grpSpPr/>`
  + nodes.map((t, k) => {
    const w = Math.round(cx * 0.45), x = k ? cx - w : 0;
    return `<dsp:sp modelId="${ids[k + 1]}"><dsp:nvSpPr><dsp:cNvPr id="0" name=""/><dsp:cNvSpPr/></dsp:nvSpPr><dsp:spPr><a:xfrm><a:off x="${x}" y="0"/><a:ext cx="${w}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="4472C4"/></a:solidFill><a:ln><a:noFill/></a:ln></dsp:spPr><dsp:txBody><a:bodyPr spcFirstLastPara="0" vert="horz" wrap="square" lIns="45720" tIns="45720" rIns="45720" bIns="45720" numCol="1" spcCol="1270" anchor="ctr" anchorCtr="0"><a:noAutofit/></a:bodyPr><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="2000"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${t}</a:t></a:r></a:p></dsp:txBody><dsp:txXfrm><a:off x="${x}" y="0"/><a:ext cx="${w}" cy="${cy}"/></dsp:txXfrm></dsp:sp>`;
  }).join('') + '</dsp:spTree></dsp:drawing>';
const inline = (cx, cy) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Diagrama 1"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="${DGM}"><dgm:relIds xmlns:dgm="${DGM}" r:dm="rIdDgmData" r:lo="rIdDgmLo" r:qs="rIdDgmQs" r:cs="rIdDgmCs"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

/** .docx com o SmartArt (partes do diagrama acrescentadas ao pacote do gerador) */
function withDiagram(body, cx, cy, nodes = ['Alfa', 'Beta']) {
  const files = unzipSync(buildDocx({ body, defaults: docDefaults({ font: 'Arial', size: 11 }) }));
  const ct = strFromU8(files['[Content_Types].xml']).replace('</Types>', [
    ['data1', 'diagramData'], ['layout1', 'diagramLayout'], ['quickStyle1', 'diagramStyle'], ['colors1', 'diagramColors'],
  ].map(([n, t]) => `<Override PartName="/word/diagrams/${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.${t}+xml"/>`).join('')
    + '<Override PartName="/word/diagrams/drawing1.xml" ContentType="application/vnd.ms-office.drawingml.diagramDrawing+xml"/></Types>');
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rels = strFromU8(files['word/_rels/document.xml.rels']).replace('</Relationships>',
    `<Relationship Id="rIdDgmData" Type="${R}/diagramData" Target="diagrams/data1.xml"/><Relationship Id="rIdDgmLo" Type="${R}/diagramLayout" Target="diagrams/layout1.xml"/>`
    + `<Relationship Id="rIdDgmQs" Type="${R}/diagramQuickStyle" Target="diagrams/quickStyle1.xml"/><Relationship Id="rIdDgmCs" Type="${R}/diagramColors" Target="diagrams/colors1.xml"/>`
    + '<Relationship Id="rIdDgmDrw" Type="http://schemas.microsoft.com/office/2007/relationships/diagramDrawing" Target="diagrams/drawing1.xml"/></Relationships>');
  files['[Content_Types].xml'] = strToU8(ct);
  files['word/_rels/document.xml.rels'] = strToU8(rels);
  files['word/diagrams/data1.xml'] = strToU8(dataOf(nodes));
  files['word/diagrams/layout1.xml'] = strToU8(layout);
  files['word/diagrams/quickStyle1.xml'] = strToU8(style);
  files['word/diagrams/colors1.xml'] = strToU8(colors);
  files['word/diagrams/drawing1.xml'] = strToU8(drawing(cx, cy, nodes));
  return zipSync(files, { level: 6 });
}

// controle: imagem em linha do mesmo tamanho
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==', 'base64'));
const pic = (cx, cy) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="2" name="img"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="2" name="img"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

export const cases = [];
for (const [name, cy] of [['dgm-pic-94', 1200000], ['dgm-pic-189', 2400000]]) {
  cases.push({ name, docx: buildDocx({ body: p(r('Antes Hxg')) + p(pic(6000000, cy)) + p(r('Depois Hxg')), media: { 'image1.png': png }, defaults: docDefaults({ font: 'Arial', size: 11 }) }) });
}
// diagrama SEM nós (moldura vazia, 472 × 189 pt): ocupa a extensão, como a imagem
// (com nós, ou mais baixo, o Word refaz o diagrama pelo leiaute mínimo daqui e a
// moldura muda de tamanho — casos fora do oráculo; o SmartArt real usa o desenho guardado)
cases.push({ name: 'dgm-empty-189', docx: withDiagram(p(r('Antes Hxg')) + p(inline(6000000, 2400000)) + p(r('Depois Hxg')), 6000000, 2400000, []) });
