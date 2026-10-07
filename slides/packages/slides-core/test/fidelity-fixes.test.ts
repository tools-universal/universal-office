import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import {
  PptxPackage, readPresentation, readSlide, readEmbeddedFonts, parseChart, layoutTextBody,
  type TextBody, type Theme,
} from '../src/index.js';

const samples = join(__dirname, '..', '..', '..', 'samples');
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

/** Pacote mínimo com 1 slide cujo spTree é `tree`. */
function deckWith(tree: string): ReturnType<typeof readSlide> {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'),
    'ppt/presentation.xml': strToU8(`<?xml version="1.0"?><p:presentation ${NS}><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`),
    'ppt/_rels/presentation.xml.rels': strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>'),
    'ppt/slides/slide1.xml': strToU8(`<?xml version="1.0"?><p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${tree}</p:spTree></p:cSld></p:sld>`),
  };
  const pkg = PptxPackage.load(zipSync(files));
  return readSlide(pkg, readPresentation(pkg).slides[0]!.target!);
}

describe('fontes embutidas do Google Slides (EOT + MicroType Express)', () => {
  const deck = join(samples, 'animated-intro.pptx');
  it.skipIf(!existsSync(deck))('decodificam para TrueType, com peso/itálico REAIS da fonte', () => {
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(deck)));
    const fonts = readEmbeddedFonts(pkg);
    const fams = new Set(fonts.map((f) => f.family));
    for (const f of ['Bebas Neue', 'Chivo', 'Montserrat Medium', 'Roboto Medium', 'Amatic SC', 'DM Serif Display', 'Proxima Nova']) {
      expect(fams.has(f)).toBe(true);
    }
    for (const f of fonts) expect([...f.data.subarray(0, 4)]).toEqual([0, 1, 0, 0]); // sfnt TrueType
    // o Google repete a REGULAR na vaga "bold" da Chivo: registrada como 400 → negrito sintético
    const chivoBold = fonts.find((f) => f.family === 'Chivo' && f.variant === 'bold')!;
    expect(chivoBold.weight).toBe(400);
    expect(fonts.find((f) => f.family === 'Chivo' && f.variant === 'boldItalic')!.weight).toBe(700);
  });
});

describe('tabela: sobreposições explícitas do tcPr', () => {
  const tbl = (tcPr: string): string => `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="2" name="T"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="400000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid><a:gridCol w="1000000"/></a:tblGrid><a:tr h="400000"><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p></a:txBody>${tcPr}</a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;

  it('noFill no tcPr e nas bordas anula o estilo; vert e margens são lidos', () => {
    const s = deckWith(tbl('<a:tcPr vert="vert270" anchor="ctr" marL="1000" marT="2000"><a:lnL w="12700"><a:noFill/></a:lnL><a:lnB w="12700"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:lnB><a:noFill/></a:tcPr>'));
    const cell = s.shapes[0]!.table!.rows[0]!.cells[0]!;
    expect(cell.noFill).toBe(true);
    expect(cell.borderNone).toEqual({ l: true });
    expect(cell.borders?.b?.color).toBe('#FF0000');
    expect(cell.vert).toBe('vert270');
    expect([cell.anchor, cell.marL, cell.marT]).toEqual(['ctr', 1000, 2000]);
  });
});

describe('preenchimento de grupo (<a:grpFill/>)', () => {
  it('o filho herda o preenchimento (com alfa) do grupo, não o fillRef do estilo', () => {
    const s = deckWith(`<p:grpSp><p:nvGrpSpPr><p:cNvPr id="3" name="G"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/><a:chOff x="0" y="0"/><a:chExt cx="100" cy="100"/></a:xfrm><a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="7000"/></a:srgbClr></a:solidFill></p:grpSpPr>
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="R"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="50" cy="50"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:grpFill/></p:spPr>
      <p:style><a:lnRef idx="0"><a:srgbClr val="000000"/></a:lnRef><a:fillRef idx="1"><a:srgbClr val="4472C4"/></a:fillRef><a:effectRef idx="0"><a:srgbClr val="000000"/></a:effectRef><a:fontRef idx="minor"><a:srgbClr val="000000"/></a:fontRef></p:style></p:sp></p:grpSp>`);
    const r = s.shapes.find((x) => x.name === 'R')!;
    expect(r.fill).toEqual({ type: 'solid', color: '#FFFFFF' });
    expect(r.fillAlpha).toBeCloseTo(0.07, 6);
    expect(r.grpFill).toBeUndefined();
  });
});

describe('marcadores', () => {
  it('parágrafo vazio não mostra marcador nem consome número', () => {
    const tb: TextBody = {
      paragraphs: [
        { runs: [{ text: 'um' }], bullet: true, bulletAutoNum: 'arabicPeriod' },
        { runs: [], bullet: true, bulletAutoNum: 'arabicPeriod' },
        { runs: [{ text: 'dois' }], bullet: true, bulletAutoNum: 'arabicPeriod' },
      ],
    };
    const lay = layoutTextBody(tb, 5000000, 3000000, (t) => t.length * 10);
    const bullets = lay.lines.map((l) => l.bullet?.text ?? null);
    expect(bullets).toEqual(['1.', null, '2.']);
  });
});

describe('gráfico: eixos, grade e cores de tema do XML', () => {
  const theme: Theme = { colors: { accent2: '#FF6B6B', lt2: '#4F4FE8', bg2: '#4F4FE8' }, fonts: { minor: 'Arial' } };
  const xml = `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea>
    <c:barChart><c:barDir val="col"/>
      <c:ser><c:idx val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></c:spPr><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>55</c:v></c:pt><c:pt idx="1"><c:v>85</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
      <c:ser><c:idx val="1"/><c:spPr><a:solidFill><a:schemeClr val="bg2"/></a:solidFill></c:spPr><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>30</c:v></c:pt><c:pt idx="1"><c:v>65</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
      <c:ser><c:idx val="2"/><c:spPr><a:noFill/><a:ln><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></a:ln></c:spPr><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>1</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>
    </c:barChart>
    <c:catAx><c:delete val="0"/><c:txPr><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1197"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:pPr></a:p></c:txPr></c:catAx>
    <c:valAx><c:scaling><c:orientation val="minMax"/><c:max val="100"/></c:scaling><c:delete val="0"/></c:valAx>
  </c:plotArea></c:chart></c:chartSpace>`;

  it('schemeClr resolvido, noFill/linha, máximo explícito, sem grade, texto do txPr', () => {
    const m = parseChart(xml, theme);
    expect(m.series.map((s) => s.fill)).toEqual(['#FF6B6B', '#4F4FE8', null]);
    expect(m.series[2]!.line).toBe('#00FF00');
    expect(m.valAx).toMatchObject({ max: 100, grid: false, deleted: false });
    expect(m.catAx?.text).toEqual({ sizePt: 11.97, color: '#000000', font: 'Arial' });
  });
});
