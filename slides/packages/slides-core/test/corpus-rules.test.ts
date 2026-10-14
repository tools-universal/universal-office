import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  PptxPackage, readPresentation, readSlide, layoutTextBody, isWmf, metafileSize, symbolToUnicode,
  type TextBody,
} from '../src/index.js';
import { symbolText, isSymbolFont } from '../src/symbol-fonts.js';
import { patternDensity, patternRows } from '../src/patterns.js';
import { SYMBOL_FAMILY } from '../src/text-layout.js';
import { diagramFallbackShapes } from '../src/diagram-fallback.js';
import { parseXml } from '../src/xml.js';

/**
 * Regras medidas no app de referência contra o corpus real (E:\UniversalSlidesTest,
 * fora do git; ver tools/ppt-lab/CORPUS-REPORT.md). Cada caso aqui é a forma
 * mínima da regra.
 */

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = (id: string, type: string, target: string): string =>
  `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
const RELS = (body: string): Uint8Array => strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${body}</Relationships>`);
const TREE = (s: string): string => `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${s}</p:spTree></p:cSld>`;

interface DeckParts {
  slide: string;
  slideRoot?: string; // atributos/filhos extras do <p:sld> (ex.: clrMapOvr)
  layout?: string;
  master?: string;
  clrMap?: string;
  txStyles?: string;
  bg?: string;
  defaultTextStyle?: string;
  theme?: string;
  media?: Record<string, Uint8Array>;
  slideRels?: string;
}

const THEME_COLORS = '<a:clrScheme name="t"><a:dk1><a:srgbClr val="111111"/></a:dk1><a:lt1><a:srgbClr val="EEEEEE"/></a:lt1><a:dk2><a:srgbClr val="222222"/></a:dk2><a:lt2><a:srgbClr val="DDDDDD"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>';
const FMT = '<a:fmtScheme name="f"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"/><a:ln w="12700"/><a:ln w="19050"/></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:srgbClr val="000000"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>';

function deck(d: DeckParts): ReturnType<typeof readSlide> {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>'),
    '_rels/.rels': RELS(REL('rId1', 'officeDocument', 'ppt/presentation.xml')),
    'ppt/presentation.xml': strToU8(`<?xml version="1.0"?><p:presentation ${NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/>${d.defaultTextStyle ?? ''}</p:presentation>`),
    'ppt/_rels/presentation.xml.rels': RELS(REL('rId1', 'slide', 'slides/slide1.xml') + REL('rId2', 'slideMaster', 'slideMasters/slideMaster1.xml') + REL('rId3', 'theme', 'theme/theme1.xml')),
    'ppt/theme/theme1.xml': strToU8(`<?xml version="1.0"?><a:theme ${NS} name="T"><a:themeElements>${THEME_COLORS}<a:fontScheme name="f"><a:majorFont><a:latin typeface="Major"/></a:majorFont><a:minorFont><a:latin typeface="Minor"/></a:minorFont></a:fontScheme>${FMT}</a:themeElements></a:theme>`),
    'ppt/slideMasters/slideMaster1.xml': strToU8(`<?xml version="1.0"?><p:sldMaster ${NS}><p:cSld>${d.bg ?? ''}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${d.master ?? ''}</p:spTree></p:cSld><p:clrMap ${d.clrMap ?? 'bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"'}/>${d.txStyles ?? ''}</p:sldMaster>`),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': RELS(REL('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml') + REL('rId2', 'theme', '../theme/theme1.xml')),
    'ppt/slideLayouts/slideLayout1.xml': strToU8(`<?xml version="1.0"?><p:sldLayout ${NS}>${TREE(d.layout ?? '')}</p:sldLayout>`),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': RELS(REL('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml')),
    'ppt/slides/slide1.xml': strToU8(`<?xml version="1.0"?><p:sld ${NS}>${TREE(d.slide)}${d.slideRoot ?? ''}</p:sld>`),
    'ppt/slides/_rels/slide1.xml.rels': RELS(REL('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml') + (d.slideRels ?? '')),
    ...(d.media ?? {}),
  };
  const pkg = PptxPackage.load(zipSync(files));
  return readSlide(pkg, readPresentation(pkg).slides[0]!.target!);
}

const sp = (id: number, body: string, ph = '', spPr = ''): string =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="s${id}"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${spPr}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp>`;
const XF = '<a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="500000"/></a:xfrm>';

describe('cores do tema: clrMap do master e override', () => {
  const dark = 'bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';
  it('tema escuro: tx1 → lt1 (texto sem cor nenhuma usa tx1)', () => {
    const s = deck({ clrMap: dark, slide: sp(2, '<a:p><a:r><a:t>x</a:t></a:r></a:p>', '', XF) });
    expect(s.shapes[0]!.txBody!.paragraphs[0]!.runs[0]!.color?.toUpperCase()).toBe('#EEEEEE');
  });
  it('clrMapOvr do slide substitui o do master', () => {
    const s = deck({
      clrMap: dark, slide: sp(2, '<a:p><a:r><a:rPr><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr><a:t>x</a:t></a:r></a:p>', '', XF),
      slideRoot: '<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>',
    });
    expect(s.shapes[0]!.txBody!.paragraphs[0]!.runs[0]!.color?.toUpperCase()).toBe('#111111');
  });
});

describe('fundo/preenchimento por estilo do tema', () => {
  it('bgRef 1002 → degradê do bgFillStyleLst com phClr = cor da referência', () => {
    const s = deck({ bg: '<p:bg><p:bgRef idx="1002"><a:schemeClr val="accent1"/></p:bgRef></p:bg>', slide: '' });
    expect(s.bg?.type).toBe('gradient');
    expect(s.bg?.stops?.[0]?.color.toUpperCase()).toBe('#4472C4');
  });
  it('fillRef 2 → degradê do fillStyleLst', () => {
    const s = deck({ slide: `<p:sp><p:nvSpPr><p:cNvPr id="2" name="a"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${XF}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="2"><a:schemeClr val="accent2"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style></p:sp>` });
    expect(s.shapes[0]!.fill?.type).toBe('gradient');
  });
  it('pattFill → padrão + cor média de fallback', () => {
    const s = deck({ slide: `<p:sp><p:nvSpPr><p:cNvPr id="2" name="a"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${XF}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:pattFill prst="ltHorz"><a:fgClr><a:srgbClr val="000000"/></a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr></a:pattFill></p:spPr></p:sp>` });
    const f = s.shapes[0]!.fill!;
    expect(f.pattern?.prst).toBe('ltHorz');
    expect(f.color).toBe('#bfbfbf'); // 25% de frente
    expect(patternDensity('ltHorz')).toBe(0.25);
    expect(patternRows('ltHorz')).toEqual([0xff, 0, 0, 0, 0xff, 0, 0, 0]);
  });
});

describe('cascata de texto (camadas exclusivas, medido)', () => {
  const dts = '<p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="2000" b="1"><a:latin typeface="DocFont"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle>';
  const tx = '<p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"><a:latin typeface="BodyFont"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1200"><a:latin typeface="OtherFont"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles>';
  it('caixa de texto usa o defaultTextStyle (não o otherStyle do master)', () => {
    const r = deck({ defaultTextStyle: dts, txStyles: tx, slide: sp(2, '<a:p><a:r><a:t>x</a:t></a:r></a:p>', '', XF) }).shapes[0]!.txBody!.paragraphs[0]!.runs[0]!;
    expect([r.font, r.sz, r.bold]).toEqual(['DocFont', 20, true]);
  });
  it('placeholder usa só o estilo do master (o defaultTextStyle não chega)', () => {
    const r = deck({ defaultTextStyle: dts, txStyles: tx, slide: sp(2, '<a:p><a:r><a:t>x</a:t></a:r></a:p>', '<p:ph type="body" idx="1"/>', XF) }).shapes[0]!.txBody!.paragraphs[0]!.runs[0]!;
    expect([r.font, r.sz, r.bold]).toEqual(['BodyFont', 28, undefined]);
  });
  it('placeholder do master é buscado por TIPO (idx do slide ≠ idx do master)', () => {
    const dtPh = `<p:sp><p:nvSpPr><p:cNvPr id="9" name="dt"/><p:cNvSpPr/><p:nvPr><p:ph type="dt" idx="2"/></p:nvPr></p:nvSpPr><p:spPr>${XF}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr><a:defRPr><a:latin typeface="DateFont"/></a:defRPr></a:lvl1pPr></a:lstStyle><a:p/></p:txBody></p:sp>`;
    const r = deck({ txStyles: tx, master: dtPh, slide: sp(2, '<a:p><a:r><a:t>x</a:t></a:r></a:p>', '<p:ph type="body" idx="2"/>', XF) }).shapes.find((s) => !s.inherited)!.txBody!.paragraphs[0]!.runs[0]!;
    expect(r.font).toBe('BodyFont');
  });
  it('hiperlink: cor hlink do tema + sublinhado no layout', () => {
    const s = deck({ slide: sp(2, '<a:p><a:r><a:rPr><a:hlinkClick r:id="rId9"/></a:rPr><a:t>link</a:t></a:r></a:p>', '', XF), slideRels: '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://x.org" TargetMode="External"/>' });
    expect(s.shapes[0]!.txBody!.paragraphs[0]!.runs[0]!.linkColor?.toUpperCase()).toBe('#0563C1');
  });
});

describe('imagem em placeholder herda a geometria do layout', () => {
  it('<p:pic> com <p:ph type="pic" idx> sem xfrm', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const layoutPh = '<p:sp><p:nvSpPr><p:cNvPr id="5" name="ph"/><p:cNvSpPr/><p:nvPr><p:ph type="pic" idx="13"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="100" y="200"/><a:ext cx="300" cy="400"/></a:xfrm></p:spPr></p:sp>';
    const pic = '<p:pic><p:nvPicPr><p:cNvPr id="2" name="p"/><p:cNvPicPr/><p:nvPr><p:ph type="pic" idx="13"/></p:nvPr></p:nvPicPr><p:blipFill><a:blip r:embed="rId5"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr/></p:pic>';
    const s = deck({ layout: layoutPh, slide: pic, slideRels: REL('rId5', 'image', '../media/image1.png'), media: { 'ppt/media/image1.png': png } });
    expect(s.shapes.find((x) => x.image)!.xfrm).toMatchObject({ x: 100, y: 200, cx: 300, cy: 400 });
  });
});

describe('espaçamento de parágrafo (medido)', () => {
  const measure = (t: string, f: { sizePt: number }): number => t.length * f.sizePt * 0.5;
  const tb = (extra: Partial<TextBody>): TextBody => ({
    ...extra,
    paragraphs: [
      { runs: [{ text: 'A', sz: 20 }], spaceBeforePct: 1 },
      { runs: [{ text: 'B', sz: 20 }], spaceBeforePct: 1 },
    ],
  });
  const lineTops = (t: TextBody): number[] => layoutTextBody(t, 9_000_000, 9_000_000, measure, { insT: 0 }).lines.map((l) => l.baseline - l.height * 0.8);
  it('spcBef do 1º parágrafo é ignorado; spcPct = fração de sz × 1,2', () => {
    const [a, b] = lineTops(tb({}));
    expect(a).toBe(0);
    // linha 1 (20 pt × 1,2) + spcBef 100% de uma linha (20 × 1,2 pt)
    expect(b).toBeCloseTo(2 * 20 * 1.2 * 12700, 0);
  });
  it('spcFirstLastPara="1" aplica o spcBef do 1º parágrafo', () => {
    expect(lineTops(tb({ spcFirstLastPara: true }))[0]).toBeCloseTo(20 * 1.2 * 12700, 0);
  });
});

describe('fontes de símbolo → Unicode', () => {
  it('Wingdings/Symbol mapeiam códigos 0x20–0xFF e U+F0xx', () => {
    expect(isSymbolFont('Wingdings')).toBe(true);
    expect(isSymbolFont('Arial')).toBe(false);
    expect(symbolText('Wingdings', 'nü§')).toBe('◼✓▪');
    expect(symbolText('Wingdings', '\uF0FC')).toBe('✓');
    expect(symbolText('Symbol', 'm')).toBe('μ');
    expect(symbolToUnicode(0x61)).toBe(0x3b1);
  });
  it('marcador com buFont Wingdings sai no equivalente Unicode', () => {
    const t: TextBody = { paragraphs: [{ runs: [{ text: 'x', sz: 20 }], bullet: true, bulletChar: 'n', bulletFont: 'Wingdings', bulletSizePct: 0.5, bulletColor: '#FF0000' }] };
    const b = layoutTextBody(t, 9_000_000, 9_000_000, (s) => s.length * 10).lines[0]!.bullet!;
    expect([b.text, b.font.family, b.font.sizePt, b.color]).toEqual(['◼', SYMBOL_FAMILY, 10, '#FF0000']);
  });
});

describe('metarquivos', () => {
  it('WMF "placeable": reconhecido e com tamanho natural pela caixa/unidade', () => {
    const b = new Uint8Array(64);
    const dv = new DataView(b.buffer);
    dv.setUint32(0, 0x9ac6cdd7, true);
    dv.setInt16(6, 0, true); dv.setInt16(8, 0, true); dv.setInt16(10, 1440, true); dv.setInt16(12, 720, true);
    dv.setUint16(14, 1440, true); // unidades por polegada
    expect(isWmf(b)).toBe(true);
    expect(metafileSize(b)).toEqual({ w: 96, h: 48 });
  });
});

describe('SmartArt sem desenho pré-calculado (Office 2007)', () => {
  const theme = { colors: { accent1: '#4472C4', lt1: '#FFFFFF', tx1: '#000000', dk1: '#000000' } } as unknown as Parameters<typeof diagramFallbackShapes>[3];
  const frame = { x: 0, y: 0, cx: 9144000, cy: 4572000 };
  const data = (nodes: [string, string, string?][], pres = ''): ReturnType<typeof parseXml> => parseXml(
    `<dgm:dataModel xmlns:dgm="d" xmlns:a="a"><dgm:ptLst><dgm:pt modelId="0" type="doc"/>${nodes.map(([id, t]) =>
      `<dgm:pt modelId="${id}"><dgm:t><a:p><a:r><a:t>${t}</a:t></a:r></a:p></dgm:t></dgm:pt>`).join('')}${pres}</dgm:ptLst><dgm:cxnLst>${nodes.map(([id, , par], i) =>
      `<dgm:cxn modelId="c${id}" srcId="${par ?? '0'}" destId="${id}" srcOrd="${i}"/>`).join('')}</dgm:cxnLst></dgm:dataModel>`);
  const nodes = (s: ReturnType<typeof diagramFallbackShapes>) => s.filter((x) => x.name === 'nó');

  it('layout fora da lista medida não desenha palpite', () => {
    expect(diagramFallbackShapes(data([['1', 'a'], ['2', 'b']]), 'urn:microsoft.com/office/officeart/2005/8/layout/arrow5', frame, theme)).toEqual([]);
  });

  it('bloco básico: 5 itens em 2 colunas (bloco maior), última linha centralizada', () => {
    const s = nodes(diagramFallbackShapes(data([['1', 'a'], ['2', 'b'], ['3', 'c'], ['4', 'd'], ['5', 'e']]), 'urn:microsoft.com/office/officeart/2005/8/layout/default', { ...frame, cx: 5486400 }, theme));
    expect(s).toHaveLength(5);
    const xs = s.map((b) => b.xfrm!.x);
    expect(xs[0]).toBe(xs[2]);
    expect(xs[1]).toBe(xs[3]);
    expect(xs[4]! + s[4]!.xfrm!.cx / 2).toBeCloseTo((xs[0]! + xs[1]! + s[1]!.xfrm!.cx) / 2, -2);
  });

  it('organograma: hierBranch="r" pendura os filhos abaixo, à direita do pai', () => {
    const pres = `<dgm:pt modelId="p2" type="pres"><dgm:prSet presAssocID="2" presName="hierRoot1"><dgm:presLayoutVars><dgm:hierBranch val="r"/></dgm:presLayoutVars></dgm:prSet></dgm:pt>`;
    const s = nodes(diagramFallbackShapes(data([['2', 'A'], ['3', 'C1', '2'], ['4', 'C2', '2']], pres), 'urn:microsoft.com/office/officeart/2005/8/layout/orgChart1', frame, theme));
    const [a, c1, c2] = ['A', 'C1', 'C2'].map((t) => s.find((b) => b.txBody?.paragraphs[0]?.runs[0]?.text === t)!.xfrm!);
    expect(c1!.x).toBe(c2!.x);
    expect(c1!.x).toBeGreaterThan(a!.x);
    expect(c2!.y).toBeGreaterThan(c1!.y);
  });
});

describe('WordArt (prstTxWarp) e sombra do texto', () => {
  const sp = (bodyPr: string, rPr = ''): string => `<p:sp><p:nvSpPr><p:cNvPr id="2" name="W"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3810000" cy="1905000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody>${bodyPr}<a:p><a:r><a:rPr lang="en-US" sz="4000">${rPr}</a:rPr><a:t>HHHH</a:t></a:r></a:p></p:txBody></p:sp>`;
  it('a deformação do 2007+ (sem fromWordArt) também vale — o app deforma (syn-b-e1)', () => {
    const s = deck({ slide: sp('<a:bodyPr wrap="none"><a:prstTxWarp prst="textWave1"><a:avLst><a:gd name="adj1" fmla="val 20000"/><a:gd name="adj2" fmla="val 5000"/></a:avLst></a:prstTxWarp></a:bodyPr>') });
    expect(s.shapes[0]!.txBody!.warp).toEqual({ prst: 'textWave1', adj: [20000, 5000] });
  });
  it('fromWordArt="1" marca o legado; textNoShape não deforma', () => {
    const a = deck({ slide: sp('<a:bodyPr fromWordArt="1"><a:prstTxWarp prst="textArchUp"><a:avLst/></a:prstTxWarp></a:bodyPr>') });
    expect(a.shapes[0]!.txBody!.warp).toEqual({ prst: 'textArchUp', fromWordArt: true });
    const b = deck({ slide: sp('<a:bodyPr><a:prstTxWarp prst="textNoShape"><a:avLst/></a:prstTxWarp></a:bodyPr>') });
    expect(b.shapes[0]!.txBody!.warp).toBeUndefined();
  });
  it('sombra do texto sem <a:alpha> é opaca (syn-b-e7)', () => {
    const s = deck({ slide: sp('<a:bodyPr/>', '<a:effectLst><a:outerShdw dist="76200" dir="2700000"><a:srgbClr val="FF8000"/></a:outerShdw></a:effectLst>') });
    expect(s.shapes[0]!.txBody!.paragraphs[0]!.runs[0]!.shadow).toMatchObject({ color: '#FF8000', alpha: 1 });
  });
});
