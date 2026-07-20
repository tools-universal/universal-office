/**
 * Gera samples/gaps-smoke.pptx — fixture sintética para os gaps da spec 03:
 *   A. cascata de estilos: título herda sz/algn do titleStyle do master;
 *      body herda bullets (•/–), marL/indent e sz por nível do bodyStyle;
 *      layout sobrescreve a COR do título via <a:lstStyle> do placeholder
 *   B. <p:style> (fillRef/lnRef/fontRef) na shape star5 → cores do tema
 *   C. shape rotacionada (rot=2700000 = 45°) — regressão, já suportado
 *   E. grupo <p:grpSp> com chOff/chExt (escala ×2) achatado no read
 *   F. geometria preset star5
 *   G. gradiente linear 2 stops com ang=5400000 (90°)
 *
 * Uso: node tools/gen-gaps-smoke.mjs  (grava samples/gaps-smoke.pptx)
 * Também é importado pelo teste de parse (buildGapsSmoke → bytes em memória).
 */
import { zipSync, strToU8 } from 'fflate';

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const CONTENT_TYPES = `${XML_DECL}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`;

const ROOT_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

// defaultTextStyle: fallback global sz=1800 (18pt) — só vale onde master/layout não define
const PRESENTATION = `${XML_DECL}
<p:presentation ${NS}>
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
<p:sldSz cx="9144000" cy="5143500" type="screen16x9"/>
<p:notesSz cx="6858000" cy="9144000"/>
<p:defaultTextStyle>
<a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>
</p:defaultTextStyle>
</p:presentation>`;

const PRESENTATION_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

// Tema com accent1 DISTINTO (#FF6600) e fontes major/minor distintas — prova
// que fillRef/fontRef e "+mj-lt"/"+mn-lt" resolvem via arquivo, não fallback.
const THEME = `${XML_DECL}
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="GapsSmoke">
<a:themeElements>
<a:clrScheme name="GapsSmoke">
<a:dk1><a:srgbClr val="111111"/></a:dk1>
<a:lt1><a:srgbClr val="FEFEFE"/></a:lt1>
<a:dk2><a:srgbClr val="1F3864"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="FF6600"/></a:accent1>
<a:accent2><a:srgbClr val="2E8B57"/></a:accent2>
<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
<a:accent4><a:srgbClr val="FFC000"/></a:accent4>
<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
<a:accent6><a:srgbClr val="70AD47"/></a:accent6>
<a:hlink><a:srgbClr val="0563C1"/></a:hlink>
<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="GapsSmoke">
<a:majorFont><a:latin typeface="Trebuchet MS"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Verdana"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="GapsSmoke">
<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
<a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;

// Master: placeholders com xfrm (herdados pelo slide) + txStyles com a cascata:
//   titleStyle: sz=4400, algn=ctr, buNone, fonte major
//   bodyStyle lvl1: buChar •, marL 342900, indent -342900, sz=2800
//   bodyStyle lvl2: buChar –, marL 742950, indent -285750, sz=2400
const MASTER = `${XML_DECL}
<p:sldMaster ${NS}>
<p:cSld>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp>
<p:nvSpPr><p:cNvPr id="2" name="Title Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="3" name="Body Placeholder"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="3000000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody>
</p:sp>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles>
<p:titleStyle>
<a:lvl1pPr algn="ctr"><a:buNone/><a:defRPr sz="4400"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr>
</p:titleStyle>
<p:bodyStyle>
<a:lvl1pPr marL="342900" indent="-342900" algn="l"><a:buChar char="•"/><a:defRPr sz="2800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>
<a:lvl2pPr marL="742950" indent="-285750" algn="l"><a:buChar char="–"/><a:defRPr sz="2400"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl2pPr>
</p:bodyStyle>
<p:otherStyle>
<a:lvl1pPr algn="l"><a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>
</p:otherStyle>
</p:txStyles>
</p:sldMaster>`;

const MASTER_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

// Layout: título com <a:lstStyle> que SOBRESCREVE a cor (accent2 #2E8B57) —
// camada layout > master na cascata. Body só repassa (lstStyle vazio).
const LAYOUT = `${XML_DECL}
<p:sldLayout ${NS} type="tx">
<p:cSld>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp>
<p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/>
<a:lstStyle><a:lvl1pPr><a:defRPr><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle>
<a:p><a:endParaRPr/></a:p></p:txBody>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
<p:spPr><a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="3000000"/></a:xfrm></p:spPr>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></p:txBody>
</p:sp>
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

const LAYOUT_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

// Slide: título herdado, bullets 2 níveis, rect rotacionado 45°, grupo com
// chOff/chExt (escala ×2), gradiente 90°, star5 com <p:style>.
const SLIDE1 = `${XML_DECL}
<p:sld ${NS}>
<p:cSld>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr/>
<p:sp>
<p:nvSpPr><p:cNvPr id="2" name="Titulo"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
<p:spPr/>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Titulo Herdado</a:t></a:r></a:p></p:txBody>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="3" name="Corpo"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr>
<p:spPr/>
<p:txBody><a:bodyPr><a:normAutofit fontScale="90000" lnSpcReduction="10000"/></a:bodyPr><a:lstStyle/>
<a:p><a:r><a:t>Primeiro nivel</a:t></a:r></a:p>
<a:p><a:pPr lvl="1"/><a:r><a:t>Segundo nivel</a:t></a:r></a:p>
</p:txBody>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="4" name="Rotacionada"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm rot="2700000"><a:off x="457200" y="4000000"/><a:ext cx="914400" cy="457200"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="4472C4"/></a:solidFill>
</p:spPr>
</p:sp>
<p:grpSp>
<p:nvGrpSpPr><p:cNvPr id="5" name="Grupo"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr>
<a:xfrm><a:off x="914400" y="914400"/><a:ext cx="1828800" cy="914400"/><a:chOff x="0" y="0"/><a:chExt cx="914400" cy="457200"/></a:xfrm>
</p:grpSpPr>
<p:sp>
<p:nvSpPr><p:cNvPr id="6" name="FilhoDoGrupo"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="228600" y="114300"/><a:ext cx="457200" cy="228600"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:solidFill><a:srgbClr val="2E8B57"/></a:solidFill>
</p:spPr>
</p:sp>
</p:grpSp>
<p:sp>
<p:nvSpPr><p:cNvPr id="7" name="Gradiente"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="3200400" y="4000000"/><a:ext cx="1371600" cy="685800"/></a:xfrm>
<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
<a:gradFill>
<a:gsLst>
<a:gs pos="0"><a:srgbClr val="FFFFFF"/></a:gs>
<a:gs pos="100000"><a:srgbClr val="4472C4"/></a:gs>
</a:gsLst>
<a:lin ang="5400000" scaled="1"/>
</a:gradFill>
</p:spPr>
</p:sp>
<p:sp>
<p:nvSpPr><p:cNvPr id="8" name="Estrela"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
<p:spPr>
<a:xfrm><a:off x="5486400" y="3657600"/><a:ext cx="1143000" cy="1143000"/></a:xfrm>
<a:prstGeom prst="star5"><a:avLst/></a:prstGeom>
</p:spPr>
<p:style>
<a:lnRef idx="2"><a:schemeClr val="accent2"/></a:lnRef>
<a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef>
<a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>
<a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef>
</p:style>
<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:t>Estrela</a:t></a:r></a:p></p:txBody>
</p:sp>
</p:spTree>
</p:cSld>
</p:sld>`;

const SLIDE1_RELS = `${XML_DECL}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

/** Monta o pacote e devolve os bytes .pptx (usado pelos testes em memória). */
export function buildGapsSmoke() {
  /** @type {Record<string, Uint8Array>} */
  const parts = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'ppt/presentation.xml': strToU8(PRESENTATION),
    'ppt/_rels/presentation.xml.rels': strToU8(PRESENTATION_RELS),
    'ppt/theme/theme1.xml': strToU8(THEME),
    'ppt/slideMasters/slideMaster1.xml': strToU8(MASTER),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': strToU8(MASTER_RELS),
    'ppt/slideLayouts/slideLayout1.xml': strToU8(LAYOUT),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': strToU8(LAYOUT_RELS),
    'ppt/slides/slide1.xml': strToU8(SLIDE1),
    'ppt/slides/_rels/slide1.xml.rels': strToU8(SLIDE1_RELS),
  };
  return zipSync(parts, { level: 6 });
}

// Execução direta: grava samples/gaps-smoke.pptx
const isMain = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, '..', 'samples', 'gaps-smoke.pptx');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildGapsSmoke());
  console.log(`gravado: ${out}`);
}
