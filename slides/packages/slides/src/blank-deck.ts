// Apresentação EM BRANCO do "Novo" (Arquivo › Novo): o tema do Office com as
// fontes Calibri Light/Calibri (a Carlito, aberta e métrico-compatível, a
// substitui fora do Windows), slide 16:9 (ou 4:3), seis layouts (Slide de
// Título, Título e Conteúdo, Cabeçalho da Seção, Duas Partes de Conteúdo,
// Somente Título, Em Branco), um master de anotações (as anotações podem ser
// escritas) e um slide de título com os placeholders vazios.
import { PptxPackage } from '@universal-office/slides-core';

const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NS = `xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"`;
const REL = (t: string): string => `${R}/${t}`;
const CT = (t: string): string => `application/vnd.openxmlformats-officedocument.presentationml.${t}+xml`;

const rels = (list: [string, string, string][]): string =>
  `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type.startsWith('http') ? type : REL(type)}" Target="${target}"/>`).join('')
  + '</Relationships>';

/** Tema Office (cores, fontes e efeitos padrão) — também o do master de anotações criado sob demanda. */
export const theme = (name: string): string => `${DECL}<a:theme xmlns:a="${A}" name="${name}"><a:themeElements>`
  + '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>'
  + '<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1>'
  + '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>'
  + '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink>'
  + '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>'
  + '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light" panose="020F0302020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>'
  + '<a:minorFont><a:latin typeface="Calibri" panose="020F0502020204030204"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>'
  + '<a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:lumMod val="110000"/><a:satMod val="105000"/><a:tint val="67000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="50000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="103000"/><a:tint val="73000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="105000"/><a:satMod val="109000"/><a:tint val="81000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="50000"><a:schemeClr val="phClr"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:fillStyleLst>'
  + '<a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>'
  + '<a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>'
  + '<a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst>'
  + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle>'
  + '<a:effectStyle><a:effectLst><a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>'
  + '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>'
  + '<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="50000"><a:schemeClr val="phClr"><a:tint val="98000"/><a:satMod val="130000"/><a:shade val="90000"/><a:lumMod val="103000"/></a:schemeClr></a:gs>'
  + '<a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="63000"/><a:satMod val="120000"/></a:schemeClr></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill></a:bgFillStyleLst>'
  + '</a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>';

const TREE_HEAD = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const CLR_MAP = 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';

interface Ph { id: number; name: string; ph: string; xfrm?: [number, number, number, number]; body?: string; lst?: string; text?: string }

/** Placeholder: `ph` é o miolo da tag (ex.: `type="title"`). */
function ph(p: Ph): string {
  const xf = p.xfrm ? `<a:xfrm><a:off x="${p.xfrm[0]}" y="${p.xfrm[1]}"/><a:ext cx="${p.xfrm[2]}" cy="${p.xfrm[3]}"/></a:xfrm>` : '';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${p.id}" name="${p.name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph ${p.ph}/></p:nvPr></p:nvSpPr>`
    + `<p:spPr>${xf}</p:spPr><p:txBody>${p.body ?? '<a:bodyPr/>'}${p.lst ? `<a:lstStyle>${p.lst}</a:lstStyle>` : '<a:lstStyle/>'}`
    + `<a:p>${p.text ? `<a:r><a:rPr lang="en-US"/><a:t>${p.text}</a:t></a:r>` : ''}<a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`;
}

/** Geometria do master, proporcional à largura do slide (16:9 = 12192000). */
function geometry(w: number, h: number) {
  const sx = (v: number): number => Math.round(v * w / 12192000);
  const sy = (v: number): number => Math.round(v * h / 6858000);
  const box = (x: number, y: number, cx: number, cy: number): [number, number, number, number] => [sx(x), sy(y), sx(cx), sy(cy)];
  return {
    title: box(838200, 365125, 10515600, 1325563),
    body: box(838200, 1825625, 10515600, 4351338),
    dt: box(838200, 6356350, 2743200, 365125),
    ftr: box(4038600, 6356350, 4114800, 365125),
    sldNum: box(8610600, 6356350, 2743200, 365125),
    ctrTitle: box(1524000, 1122363, 9144000, 2387600),
    subTitle: box(1524000, 3602038, 9144000, 1655762),
    secTitle: box(831850, 1709738, 10515600, 2852737),
    secBody: box(831850, 4589463, 10515600, 1500187),
    left: box(838200, 1825625, 5181600, 4351338),
    right: box(6172200, 1825625, 5181600, 4351338),
  };
}

const lvl = (n: number, marL: number, sz: number): string =>
  `<a:lvl${n}pPr marL="${marL}" indent="-228600" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">`
  + `<a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPts val="${n === 1 ? 1000 : 500}"/></a:spcBef><a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:buChar char="•"/>`
  + `<a:defRPr sz="${sz}" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl${n}pPr>`;

function master(g: ReturnType<typeof geometry>): string {
  const footer = (id: number, name: string, type: string, x: [number, number, number, number], algn: string): string =>
    ph({ id, name, ph: `type="${type}" sz="quarter" idx="${type === 'dt' ? 2 : type === 'ftr' ? 3 : 4}"`, xfrm: x,
      body: '<a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"/>',
      lst: `<a:lvl1pPr algn="${algn}"><a:defRPr sz="1200"><a:solidFill><a:schemeClr val="tx1"><a:tint val="75000"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr>` });
  return `${DECL}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${TREE_HEAD}`
    + ph({ id: 2, name: 'Title Placeholder 1', ph: 'type="title"', xfrm: g.title, body: '<a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="ctr"><a:normAutofit/></a:bodyPr>', text: 'Click to edit Master title style' })
    + ph({ id: 3, name: 'Text Placeholder 2', ph: 'type="body" idx="1"', xfrm: g.body, body: '<a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"><a:normAutofit/></a:bodyPr>', text: 'Click to edit Master text styles' })
    + footer(4, 'Date Placeholder 3', 'dt', g.dt, 'l') + footer(5, 'Footer Placeholder 4', 'ftr', g.ftr, 'ctr') + footer(6, 'Slide Number Placeholder 5', 'sldNum', g.sldNum, 'r')
    + `</p:spTree></p:cSld><p:clrMap ${CLR_MAP}/>`
    + '<p:sldLayoutIdLst>' + [1, 2, 3, 4, 5, 6].map((i) => `<p:sldLayoutId id="${2147483648 + i}" r:id="rId${i}"/>`).join('') + '</p:sldLayoutIdLst>'
    + '<p:txStyles><p:titleStyle><a:lvl1pPr algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:spcBef><a:spcPct val="0"/></a:spcBef><a:buNone/>'
    + '<a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/><a:ea typeface="+mj-ea"/><a:cs typeface="+mj-cs"/></a:defRPr></a:lvl1pPr></p:titleStyle>'
    + `<p:bodyStyle>${lvl(1, 228600, 2800)}${lvl(2, 685800, 2400)}${lvl(3, 1143000, 2000)}${lvl(4, 1600200, 1800)}${lvl(5, 2057400, 1800)}</p:bodyStyle>`
    + '<p:otherStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:otherStyle>'
    + '</p:txStyles></p:sldMaster>';
}

const FOOTERS = '<p:sp><p:nvSpPr><p:cNvPr id="90" name="Date Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="dt" sz="half" idx="10"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>'
  + '<p:sp><p:nvSpPr><p:cNvPr id="91" name="Footer Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ftr" sz="quarter" idx="11"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>'
  + '<p:sp><p:nvSpPr><p:cNvPr id="92" name="Slide Number Placeholder"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldNum" sz="quarter" idx="12"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum"><a:rPr lang="en-US"/><a:t>‹#›</a:t></a:fld><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>';

function layout(type: string, name: string, shapes: string): string {
  return `${DECL}<p:sldLayout ${NS} type="${type}" preserve="1"><p:cSld name="${name}"><p:spTree>${TREE_HEAD}${shapes}${FOOTERS}</p:spTree></p:cSld>`
    + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
}

function layouts(g: ReturnType<typeof geometry>): string[] {
  const title = ph({ id: 2, name: 'Title 1', ph: 'type="title"', text: 'Click to edit Master title style' });
  const noBullet = (sz: number, extra = ''): string => `<a:lvl1pPr marL="0" indent="0"${extra}><a:buNone/><a:defRPr sz="${sz}"/></a:lvl1pPr>`;
  return [
    layout('title', 'Title Slide',
      ph({ id: 2, name: 'Title 1', ph: 'type="ctrTitle"', xfrm: g.ctrTitle, body: '<a:bodyPr anchor="b"/>', lst: '<a:lvl1pPr algn="ctr"><a:defRPr sz="6000"/></a:lvl1pPr>', text: 'Click to edit Master title style' })
      + ph({ id: 3, name: 'Subtitle 2', ph: 'type="subTitle" idx="1"', xfrm: g.subTitle, lst: noBullet(2400, ' algn="ctr"'), text: 'Click to edit Master subtitle style' })),
    layout('obj', 'Title and Content', title + ph({ id: 3, name: 'Content Placeholder 2', ph: 'idx="1"', text: 'Click to edit Master text styles' })),
    layout('secHead', 'Section Header',
      ph({ id: 2, name: 'Title 1', ph: 'type="title"', xfrm: g.secTitle, body: '<a:bodyPr anchor="b"/>', lst: '<a:lvl1pPr><a:defRPr sz="6000"/></a:lvl1pPr>', text: 'Click to edit Master title style' })
      + ph({ id: 3, name: 'Text Placeholder 2', ph: 'type="body" idx="1"', xfrm: g.secBody, lst: `<a:lvl1pPr marL="0" indent="0"><a:buNone/><a:defRPr sz="2400"><a:solidFill><a:schemeClr val="tx1"><a:tint val="75000"/></a:schemeClr></a:solidFill></a:defRPr></a:lvl1pPr>`, text: 'Click to edit Master text styles' })),
    layout('twoObj', 'Two Content', title
      + ph({ id: 3, name: 'Content Placeholder 2', ph: 'sz="half" idx="1"', xfrm: g.left, text: 'Click to edit Master text styles' })
      + ph({ id: 4, name: 'Content Placeholder 3', ph: 'sz="half" idx="2"', xfrm: g.right, text: 'Click to edit Master text styles' })),
    layout('titleOnly', 'Title Only', title),
    layout('blank', 'Blank', ''),
  ];
}

/** Master de anotações padrão (imagem do slide + corpo); deck-edit o cria quando a apresentação não tem. */
export function notesMaster(): string {
  return `${DECL}<p:notesMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${TREE_HEAD}`
    + '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr>'
    + '<p:spPr><a:xfrm><a:off x="685800" y="1143000"/><a:ext cx="5486400" cy="3086100"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln w="12700"><a:solidFill><a:prstClr val="black"/></a:solidFill></a:ln></p:spPr></p:sp>'
    + '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr>'
    + '<p:spPr><a:xfrm><a:off x="685800" y="4400550"/><a:ext cx="5486400" cy="3600450"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>'
    + '<p:txBody><a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0"/><a:lstStyle/><a:p><a:pPr lvl="0"/><a:r><a:rPr lang="en-US"/><a:t>Click to edit Master text styles</a:t></a:r></a:p></p:txBody></p:sp>'
    + `</p:spTree></p:cSld><p:clrMap ${CLR_MAP}/>`
    + '<p:notesStyle><a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1"><a:defRPr sz="1200" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:notesStyle>'
    + '</p:notesMaster>';
}

export interface BlankDeckOptions {
  /** 16:9 (padrão, 33,867 × 19,05 cm) ou 4:3 (25,4 × 19,05 cm) */
  aspect?: '16:9' | '4:3';
  /** título gravado nas propriedades */
  title?: string;
  /** idioma do texto (`lang` dos runs novos) */
  lang?: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Bytes de uma apresentação em branco (um slide de título vazio). */
export function blankDeck(opts: BlankDeckOptions = {}): Uint8Array {
  const wide = (opts.aspect ?? '16:9') === '16:9';
  const W = wide ? 12192000 : 9144000, H = 6858000;
  const g = geometry(W, H);
  const lang = opts.lang ?? 'en-US';
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const files: Record<string, string> = {
    '[Content_Types].xml': `${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
      + `<Override PartName="/ppt/presentation.xml" ContentType="${CT('presentation.main')}"/>`
      + `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT('slideMaster')}"/>`
      + [1, 2, 3, 4, 5, 6].map((i) => `<Override PartName="/ppt/slideLayouts/slideLayout${i}.xml" ContentType="${CT('slideLayout')}"/>`).join('')
      + `<Override PartName="/ppt/slides/slide1.xml" ContentType="${CT('slide')}"/>`
      + `<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="${CT('notesMaster')}"/>`
      + '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
      + '<Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'
      + `<Override PartName="/ppt/presProps.xml" ContentType="${CT('presProps')}"/><Override PartName="/ppt/viewProps.xml" ContentType="${CT('viewProps')}"/>`
      + `<Override PartName="/ppt/tableStyles.xml" ContentType="${CT('tableStyles')}"/>`
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>',
    '_rels/.rels': rels([
      ['rId1', 'officeDocument', 'ppt/presentation.xml'],
      ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'],
      ['rId3', 'extended-properties', 'docProps/app.xml'],
    ]),
    'docProps/core.xml': `${DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
      + `${opts.title ? `<dc:title>${esc(opts.title)}</dc:title>` : ''}<cp:revision>1</cp:revision>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml': `${DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">`
      + '<TotalTime>0</TotalTime><Words>0</Words><Application>Universal Slides</Application><PresentationFormat>'
      + (wide ? 'Widescreen' : 'On-screen Show (4:3)') + '</PresentationFormat><Slides>1</Slides><Notes>0</Notes></Properties>',
    'ppt/presentation.xml': `${DECL}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>`
      + '<p:notesMasterIdLst><p:notesMasterId r:id="rId8"/></p:notesMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>'
      + `<p:sldSz cx="${W}" cy="${H}"${wide ? '' : ' type="screen4x3"'}/><p:notesSz cx="6858000" cy="9144000"/>`
      + '<p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr><a:lvl1pPr marL="0" algn="l" defTabSz="914400" rtl="0" eaLnBrk="1" latinLnBrk="0" hangingPunct="1">'
      + '<a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle></p:presentation>',
    'ppt/_rels/presentation.xml.rels': rels([
      ['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'],
      ['rId2', 'slide', 'slides/slide1.xml'],
      ['rId3', 'presProps', 'presProps.xml'],
      ['rId4', 'viewProps', 'viewProps.xml'],
      ['rId5', 'theme', 'theme/theme1.xml'],
      ['rId6', 'tableStyles', 'tableStyles.xml'],
      ['rId8', 'notesMaster', 'notesMasters/notesMaster1.xml'],
    ]),
    'ppt/presProps.xml': `${DECL}<p:presentationPr ${NS}><p:showPr showNarration="1"><p:present/><p:sldAll/><p:penClr><a:prstClr val="red"/></p:penClr></p:showPr></p:presentationPr>`,
    'ppt/viewProps.xml': `${DECL}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`,
    'ppt/tableStyles.xml': `${DECL}<a:tblStyleLst xmlns:a="${A}" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`,
    'ppt/theme/theme1.xml': theme('Office Theme'),
    'ppt/theme/theme2.xml': theme('Office Theme'),
    'ppt/slideMasters/slideMaster1.xml': master(g),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([
      ...[1, 2, 3, 4, 5, 6].map((i): [string, string, string] => [`rId${i}`, 'slideLayout', `../slideLayouts/slideLayout${i}.xml`]),
      ['rId7', 'theme', '../theme/theme1.xml'],
    ]),
    'ppt/notesMasters/notesMaster1.xml': notesMaster(),
    'ppt/notesMasters/_rels/notesMaster1.xml.rels': rels([['rId1', 'theme', '../theme/theme2.xml']]),
    'ppt/slides/slide1.xml': `${DECL}<p:sld ${NS}><p:cSld><p:spTree>${TREE_HEAD}`
      + `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ctrTitle"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody></p:sp>`
      + `<p:sp><p:nvSpPr><p:cNvPr id="3" name="Subtitle 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="${lang}" dirty="0"/></a:p></p:txBody></p:sp>`
      + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',
    'ppt/slides/_rels/slide1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']]),
  };
  layouts(g).forEach((xml, i) => {
    files[`ppt/slideLayouts/slideLayout${i + 1}.xml`] = xml;
    files[`ppt/slideLayouts/_rels/slideLayout${i + 1}.xml.rels`] = rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]);
  });
  const enc = new TextEncoder();
  const parts: Record<string, Uint8Array> = {};
  for (const [k, v] of Object.entries(files)) parts[k] = enc.encode(v);
  return PptxPackage.fromParts(parts).save();
}
