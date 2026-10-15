import { describe, expect, it } from 'vitest';
import {
  openSpreadsheet, xlsToXlsxPackage, XlsEncryptedError, XlsFormatError, isXlsBytes,
  readWorkbook, readSharedStrings, readWorksheet, readStyles, colorContext, parseChart,
} from '../src/index.js';
import { rkValue } from '../src/xls/sheet.js';
import { normalizeFormat } from '../src/xls/styles-xml.js';
import { rowHeightPt } from '../src/xls/sheet-xml.js';
import { buildCfb } from './helpers/cfb-writer.js';
import {
  RT, rec, u8, u16, u32, i16, f64, chars, str16, str8, bstr8, font, xf, defaultFormatting, buildXls, buildStream, oa,
  type Rec,
} from './helpers/biff-writer.js';

// ───────────────────────── fixture BIFF8 sintética ─────────────────────────

/** SST com uma string partida num CONTINUE que troca para UTF-16 + uma string rica. */
function sst(): Rec[] {
  const head = [...u32(5), ...u32(4), ...str16('Olá')];
  // 2ª string: cch 6, comprimida, 3 chars aqui + 3 no CONTINUE (que recomeça com fHighByte=1)
  const split = [...u16(6), 0, ...chars('abc', false)];
  // 3ª string rica: "negrito fim" com run (ich 0 → fonte 6) e (ich 7 → fonte 0)
  const rich = [...u16(11), 0x08, ...u16(2), ...chars('negrito fim', false), ...u16(0), ...u16(6), ...u16(7), ...u16(0)];
  return [
    rec(RT.SST, [...head, ...split]),
    rec(RT.CONTINUE, [1, ...chars('ção', true), ...rich, ...str16('último')]),
  ];
}

const URL_CLSID = [0xe0, 0xc9, 0xea, 0x79, 0xf9, 0xba, 0xce, 0x11, 0x8c, 0x82, 0x00, 0xaa, 0x00, 0x4b, 0xa9, 0x0b];
function hlink(r: number, c: number, url: string, display: string): Rec {
  const utf16z = (s: string): number[] => [...chars(s, true), 0, 0];
  return rec(RT.HLINK, [
    ...u16(r), ...u16(r), ...u16(c), ...u16(c), ...new Array(16).fill(0), ...u32(2), ...u32(0x17),
    ...u32(display.length + 1), ...utf16z(display),
    ...URL_CLSID, ...u32((url.length + 1) * 2), ...utf16z(url),
  ]);
}

/** PNG 1×1 vermelho. */
const PNG_1PX = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
  0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

function drawingGroup(): Rec {
  const blip = oa(0xf01e, 0x6e0, 0, [...new Array(16).fill(7), 0xff, ...PNG_1PX]);
  const bse = oa(0xf007, 6, 2, [6, 6, ...new Array(16).fill(7), ...u16(0xff), ...u32(blip.length), ...u32(1), ...u32(0), 0, 0, 0, 0, ...blip]);
  const dgg = oa(0xf000, 0, 0xf, [...oa(0xf006, 0, 0, [...u32(1026), ...u32(2), ...u32(1), ...u32(1), ...u32(1), ...u32(2)]), ...oa(0xf001, 1, 0xf, bse)]);
  return rec(RT.MSODRAWINGGROUP, dgg);
}

/** Desenho da planilha: patriarca + 1 imagem (pib 1) ancorada em B3 (½ col, ½ linha) → D6. */
function sheetDrawing(): Rec[] {
  const patriarch = oa(0xf004, 0, 0xf, [...oa(0xf009, 0, 1, new Array(16).fill(0)), ...oa(0xf00a, 0, 2, [...u32(1024), ...u32(0x5)])]);
  const anchor = [...u16(0), ...u16(1), ...u16(512), ...u16(2), ...u16(128), ...u16(3), ...u16(0), ...u16(5), ...u16(0)];
  const pic = oa(0xf004, 0, 0xf, [
    ...oa(0xf00a, 75, 2, [...u32(1025), ...u32(0xa00)]),
    ...oa(0xf00b, 1, 3, [...u16(0x4104), ...u32(1)]),
    ...oa(0xf010, 0, 0, anchor),
    ...oa(0xf011, 0, 0, []),
  ]);
  const dg = oa(0xf002, 1, 0xf, [...oa(0xf008, 1, 0, [...u32(2), ...u32(1025)]), ...oa(0xf003, 0, 0xf, [...patriarch, ...pic])]);
  // OBJ: ftCmo (ot = 8 imagem, id 1) + ftEnd
  const obj = rec(RT.OBJ, [...u16(0x15), ...u16(0x12), ...u16(8), ...u16(1), ...u16(0x6011), ...new Array(12).fill(0), ...u32(0)]);
  return [rec(RT.MSODRAWING, dg), obj];
}

function note(): Rec[] {
  const obj = rec(RT.OBJ, [...u16(0x15), ...u16(0x12), ...u16(0x19), ...u16(2), ...u16(0x4011), ...new Array(12).fill(0), ...u32(0)]);
  const txo = rec(RT.TXO, [...u16(0x12), ...u16(0), ...new Array(6).fill(0), ...u16(4), ...u16(16), ...u16(0), ...u32(0)]);
  return [
    obj, txo,
    rec(RT.CONTINUE, [0, ...chars('Nota', false)]),
    rec(RT.CONTINUE, [...u16(0), ...u16(0), ...u32(0), ...u16(4), ...u16(0), ...u32(0)]),
    rec(RT.NOTE, [...u16(0), ...u16(0), ...u16(0), ...u16(2), ...str16('Ana'), 0]),
  ];
}

function workbook(): Uint8Array {
  const globals: Rec[] = [
    rec(RT.WINDOW1, [...u16(0), ...u16(0), ...u16(0x4000), ...u16(0x2000), ...u16(0x38), ...u16(1), ...u16(0), ...u16(1), ...u16(600)]),
    rec(RT.DATEMODE, u16(0)),
    // _FilterDatabase da aba 1: A1:G1 (área local)
    rec(0x0018, [...u16(0x21), 0, 1, ...u16(9), ...u16(0), ...u16(1), ...u32(0), 0, 0x0d, 0x25, ...u16(0), ...u16(0), ...u16(0), ...u16(6)]),
    ...defaultFormatting(),
    font('Arial', { bold: true, color: 10 }), // ifnt 6 (o índice 4 não existe no BIFF)
    rec(RT.FORMAT, [...u16(164), ...str16('0.000')]),
    rec(RT.FORMAT, [...u16(165), ...str16('GENERAL;[Red]-GENERAL')]),
    xf({ font: 6, pattern: 1, fore: 13, halign: 2, wrap: true, bBottom: 2, cBottom: 8 }), // XF 16
    xf({ fmt: 164 }), // XF 17
    // paleta: índice 13 (8 + 5) = #123456
    rec(RT.PALETTE, [...u16(6), 0, 0, 0, 0, 255, 255, 255, 0, 255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0x12, 0x34, 0x56, 0]),
    drawingGroup(),
    ...sst(),
  ];
  const sheet1: Rec[] = [
    rec(RT.DEFCOLWIDTH, u16(8)),
    rec(RT.DEFAULTROWHEIGHT, [...u16(0), ...u16(255)]),
    rec(RT.COLINFO, [...u16(0), ...u16(0), ...u16(2340 * 2), ...u16(15), ...u16(0), ...u16(0)]),
    rec(RT.COLINFO, [...u16(4), ...u16(5), ...u16(2340), ...u16(15), ...u16(1), ...u16(0)]),
    rec(RT.ROW, [...u16(0), ...u16(0), ...u16(8), ...u16(282), ...u16(0), ...u16(0), ...u32(0x100 | 0x40 | (15 << 16))]),
    rec(RT.ROW, [...u16(3), ...u16(0), ...u16(1), ...u16(255), ...u16(0), ...u16(0), ...u32(0x100 | 0x20 | (15 << 16))]),
    rec(RT.NUMBER, [...u16(0), ...u16(0), ...u16(17), ...f64(3.5)]),
    rec(RT.RK, [...u16(0), ...u16(1), ...u16(15), ...u32((100 << 2) | 2)]),
    rec(RT.LABELSST, [...u16(0), ...u16(2), ...u16(16), ...u32(1)]),
    rec(RT.BOOLERR, [...u16(0), ...u16(3), ...u16(15), 1, 0]),
    rec(RT.BOOLERR, [...u16(0), ...u16(4), ...u16(15), 0x07, 1]),
    rec(RT.FORMULA, [...u16(0), ...u16(5), ...u16(15), 0, 0, 0, 0, 0, 0, 0xff, 0xff, ...u16(0), ...u32(0), ...u16(0)]),
    rec(RT.STRING, str16('texto')),
    rec(RT.FORMULA, [...u16(0), ...u16(6), ...u16(15), ...f64(42), ...u16(0), ...u32(0), ...u16(0)]),
    rec(RT.MULRK, [...u16(1), ...u16(0), ...u16(15), ...u32((123 << 2) | 3), ...u16(15), ...u32((-7 << 2) | 2), ...u16(1)]),
    rec(RT.LABELSST, [...u16(1), ...u16(2), ...u16(15), ...u32(2)]),
    rec(RT.LABEL, [...u16(1), ...u16(3), ...u16(15), ...str16('rótulo')]),
    rec(RT.MULBLANK, [...u16(2), ...u16(0), ...u16(16), ...u16(16), ...u16(1)]),
    rec(RT.LABELSST, [...u16(1), ...u16(4), ...u16(15), ...u32(0)]),
    ...sheetDrawing(),
    ...note(),
    rec(RT.WINDOW2, [...u16(0x02b8), ...u16(0), ...u16(0), ...u32(64), ...u16(0), ...u16(0), ...u32(0)]),
    rec(RT.SCL, [...i16(3), ...i16(4)]),
    rec(RT.PANE, [...u16(1), ...u16(2), ...u16(2), ...u16(1), 0]),
    rec(RT.MERGECELLS, [...u16(1), ...u16(2), ...u16(3), ...u16(0), ...u16(1)]),
    hlink(2, 2, 'https://example.com/', 'Exemplo'),
    rec(0x009d, u16(7)), // AUTOFILTERINFO
  ];
  const sheet2: Rec[] = [rec(RT.LABELSST, [...u16(0), ...u16(0), ...u16(15), ...u32(3)])];
  return buildXls(globals, [{ name: 'Dados', recs: sheet1 }, { name: 'Oculta', state: 1, recs: sheet2 }]);
}

describe('.xls (BIFF8) → pacote OOXML', () => {
  const bytes = workbook();
  const pkg = openSpreadsheet(bytes);
  const cx = colorContext(pkg);
  const wb = readWorkbook(pkg);
  const ss = readSharedStrings(pkg, cx);
  const st = readStyles(pkg, cx);
  const ws = readWorksheet(pkg, wb.sheets[0]!.target!, cx);
  const cell = (ref: string) => ws.rows.flatMap((r) => r.cells).find((c) => c.ref === ref);

  it('detecta o Compound File pela assinatura', () => {
    expect(isXlsBytes(bytes)).toBe(true);
    expect(isXlsBytes(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe(false);
  });

  it('abas, estado oculto e aba ativa', () => {
    expect(wb.sheets.map((s) => s.name)).toEqual(['Dados', 'Oculta']);
    expect(wb.sheets[1]!.state).toBe('hidden');
    expect(wb.activeTab).toBe(1);
  });

  it('SST: string partida no CONTINUE (troca para UTF-16) e texto rico', () => {
    expect(ss[0]!.text).toBe('Olá');
    expect(ss[1]!.text).toBe('abcção');
    expect(ss[2]!.runs?.map((r) => [r.text, r.props?.bold])).toEqual([['negrito', true], [' fim', false]]);
    expect(ss[3]!.text).toBe('último');
  });

  it('células: NUMBER, RK, MULRK, LABELSST, LABEL, BOOLERR, FORMULA + STRING, MULBLANK', () => {
    expect(cell('A1')).toMatchObject({ value: '3.5', style: 17 });
    expect(cell('B1')).toMatchObject({ value: '100' });
    expect(cell('C1')).toMatchObject({ type: 's', value: '1', style: 16 });
    expect(cell('D1')).toMatchObject({ type: 'b', value: '1' });
    expect(cell('E1')).toMatchObject({ type: 'e', value: '#DIV/0!' });
    expect(cell('F1')).toMatchObject({ type: 'str', value: 'texto' });
    expect(cell('G1')).toMatchObject({ value: '42' });
    expect(cell('A2')!.value).toBe('1.23');
    expect(cell('B2')!.value).toBe('-7');
    expect(ss[parseInt(cell('D2')!.value!, 10)]!.text).toBe('rótulo');
    expect(cell('A3')).toMatchObject({ style: 16 });
    expect(cell('A3')!.value).toBeUndefined();
    // células da linha fora de ordem (E2 depois de D2) saem ordenadas
    expect(ws.rows.find((r) => r.r === 2)!.cells.map((c) => c.ref)).toEqual(['A2', 'B2', 'C2', 'D2', 'E2']);
  });

  it('estilos: fonte, preenchimento pela PALETTE, alinhamento, borda e formato', () => {
    const x16 = st.cellXfs[16]!;
    expect(st.fonts[x16.fontId]).toMatchObject({ bold: true, color: '#FF0000' });
    expect(st.fills[x16.fillId]).toMatchObject({ pattern: 'solid', fgColor: '#123456' });
    expect(x16).toMatchObject({ horizontal: 'center', wrapText: true });
    expect(st.borders[x16.borderId]!.bottom).toMatchObject({ style: 'medium', color: '#000000' });
    expect(st.numFmts.get(164)).toBe('0.000');
    expect(st.numFmts.get(165)).toBe('General;[Red]-General');
  });

  it('linhas, colunas, mesclagem e padrões do grid', () => {
    const r1 = ws.rows.find((r) => r.r === 1)!;
    expect(r1).toMatchObject({ height: 13.5, customHeight: true }); // 282 tw = 18,8 px → 18 px
    expect(ws.rows.find((r) => r.r === 4)!.hidden).toBe(true);
    // linha sem altura manual (fUnsynced = 0): sem customHeight — o renderizador refaz o auto-ajuste
    expect(ws.rows.find((r) => r.r === 4)!.customHeight).toBeUndefined();
    expect(ws.cols).toEqual([
      expect.objectContaining({ min: 1, max: 1, width: 18.28125 }),
      expect.objectContaining({ min: 5, max: 6, width: 9.140625, hidden: true }),
    ]);
    expect(ws.merges).toEqual(['A3:B4']);
    expect(ws.sheetFormatPr).toMatchObject({ baseColWidth: 8, defaultRowHeight: 12.75 });
  });

  it('janela: sem grade, painel congelado', () => {
    expect(ws.showGridLines).toBe(false);
    expect(ws.pane).toMatchObject({ xSplit: 1, ySplit: 2, state: 'frozen', topLeftCell: 'B3' });
    expect(pkg.getPartText('xl/worksheets/sheet1.xml')).toContain('zoomScale="75"');
  });

  it('autofiltro: AUTOFILTERINFO + nome _FilterDatabase', () => {
    expect(ws.autoFilter).toBe('A1:G1');
  });

  it('hyperlink e comentário (NOTE + OBJ + TXO)', () => {
    expect(ws.hyperlinks).toEqual([expect.objectContaining({ ref: 'C3', target: 'https://example.com/', display: 'Exemplo' })]);
    expect(ws.comments).toEqual([{ ref: 'A1', text: 'Nota', author: 'Ana' }]);
  });

  it('imagem do BStore ancorada pela âncora de célula', () => {
    expect(ws.pictures).toHaveLength(1);
    const p = ws.pictures![0]!;
    expect(p.ext).toBe('png');
    expect([...p.data.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    // dx 512/1024 da coluna B (64 px) e dy 128/256 da linha 3 (17 px)
    expect(p.anchor.from).toEqual({ col: 1, row: 2, colOff: 32 * 9525, rowOff: Math.round(8.5 * 9525) });
    expect(p.anchor.to).toEqual({ col: 3, row: 5, colOff: 0, rowOff: 0 });
  });

  it('o pacote convertido salva como .xlsx e reabre igual', () => {
    const again = openSpreadsheet(pkg.save());
    expect(readWorkbook(again).sheets.map((s) => s.name)).toEqual(['Dados', 'Oculta']);
    expect(readSharedStrings(again)[1]!.text).toBe('abcção');
  });
});

describe('.xls — BIFF5, data 1904 e erros amigáveis', () => {
  it('BIFF5 (stream "Book"): strings de 8 bits na codepage', () => {
    const font5 = rec(RT.FONT, [...u16(200), ...u16(0), ...u16(0x7fff), ...u16(400), ...u16(0), 0, 0, 0, 0, ...bstr8('Arial')]);
    const xf5 = (style: boolean): Rec => rec(RT.XF, [...u16(0), ...u16(0), ...u16(style ? 0xfff4 : 0), 0x20, 0, ...u32(0x20c0 | (65 << 7) | 64), ...u32(0)]);
    const globals = [rec(RT.CODEPAGE, u16(1252)), font5, font5, font5, font5, ...Array.from({ length: 15 }, () => xf5(true)), xf5(false)];
    const label = rec(RT.LABEL, [...u16(0), ...u16(0), ...u16(15), ...u16(6), ...chars('Café ', false), 0x80]);
    const pkg = openSpreadsheet(buildXls(globals, [{ name: 'Folha', recs: [label] }], 5));
    const wb = readWorkbook(pkg);
    expect(wb.sheets[0]!.name).toBe('Folha');
    const ws = readWorksheet(pkg, wb.sheets[0]!.target!);
    const ss = readSharedStrings(pkg);
    expect(ss[parseInt(ws.rows[0]!.cells[0]!.value!, 10)]!.text).toBe('Café €');
  });

  it('DATEMODE 1904', () => {
    const pkg = openSpreadsheet(buildXls([rec(RT.DATEMODE, u16(1)), ...defaultFormatting()], [{ name: 'A', recs: [] }]));
    expect(readWorkbook(pkg).date1904).toBe(true);
  });

  it('FILEPASS → erro de pasta criptografada', () => {
    const b = buildXls([rec(RT.FILEPASS, [...u16(1), ...new Array(52).fill(0)]), ...defaultFormatting()], [{ name: 'A', recs: [] }]);
    expect(() => xlsToXlsxPackage(b)).toThrow(XlsEncryptedError);
  });

  it('Compound File sem "Workbook" e .doc → erros amigáveis', () => {
    expect(() => xlsToXlsxPackage(buildCfb({ Outro: new Uint8Array(10) }))).toThrow(XlsFormatError);
    expect(() => xlsToXlsxPackage(buildCfb({ WordDocument: new Uint8Array(10) }))).toThrow(/Word/);
    expect(() => xlsToXlsxPackage(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 1, 2]))).toThrow(XlsFormatError);
  });

  it('BIFF2–4 → erro amigável de formato não suportado', () => {
    const b = buildCfb({ Workbook: new Uint8Array([0x09, 0x04, 6, 0, 0, 4, 0x10, 0, 0, 0]) });
    expect(() => xlsToXlsxPackage(b)).toThrow(/BIFF2/);
  });

  it('arquivos corrompidos (mutações aleatórias) falham só com erro amigável e rápido', () => {
    const stream = buildStream([...defaultFormatting(), ...sst()], [{ name: 'A', recs: [
      rec(RT.NUMBER, [...u16(0), ...u16(0), ...u16(15), ...f64(1)]), ...sheetDrawing(), ...note(), hlink(0, 0, 'http://x', 'x'),
    ] }]);
    let seed = 12345;
    const rnd = (n: number): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const t0 = Date.now();
    for (let k = 0; k < 400; k++) {
      const s = new Uint8Array(stream);
      const muts = 1 + rnd(8);
      for (let m = 0; m < muts; m++) s[rnd(s.length)] = rnd(256);
      const b = buildCfb({ Workbook: rnd(10) === 0 ? s.subarray(0, rnd(s.length)) : s });
      try {
        xlsToXlsxPackage(b);
      } catch (e) {
        expect(e instanceof XlsFormatError || e instanceof XlsEncryptedError).toBe(true);
      }
    }
    expect(Date.now() - t0).toBeLessThan(20000);
  });
});

describe('.xls — gráfico embutido (subfluxo BIFF8 → c:chartSpace)', () => {
  const C = {
    CHART: 0x1002, SERIES: 0x1003, DATAFORMAT: 0x1006, LINEFORMAT: 0x1007, AREAFORMAT: 0x100a, SERIESTEXT: 0x100d,
    CHARTFORMAT: 0x1014, LEGEND: 0x1015, BAR: 0x1017, AXIS: 0x101d, TICK: 0x101e, VALUERANGE: 0x101f, CATSERRANGE: 0x1020,
    AXISLINEFORMAT: 0x1021, FRAME: 0x1032, BEGIN: 0x1033, END: 0x1034, PLOTAREA: 0x1035, AXISPARENT: 0x1041,
    SERTOCRT: 0x1045, AI: 0x1051,
  };
  const B = rec(C.BEGIN), E = rec(C.END);
  const area3d = (r1: number, r2: number, c: number): number[] => [0x3b, ...u16(0), ...u16(r1), ...u16(r2), ...u16(c), ...u16(c)];
  const ai = (id: number, rt: number, f: number[] = []): Rec => rec(C.AI, [id, rt, ...u16(0), ...u16(0), ...u16(f.length), ...f]);
  const line = (icv: number, auto = false): Rec => rec(C.LINEFORMAT, [0, 0, 0, 0, ...u16(0), ...i16(0), ...u16(auto ? 1 : 0), ...u16(icv)]);
  const areaFmt = (icv: number, auto = false): Rec => rec(C.AREAFORMAT, [0, 0, 0, 0, 0, 0, 0, 0, ...u16(1), ...u16(auto ? 1 : 0), ...u16(icv), ...u16(9)]);
  const chartStream: Rec[] = [
    rec(RT.BOF, [...u16(0x0600), ...u16(0x20), ...u16(0), ...u16(0), ...u32(0), ...u32(6)]),
    rec(C.CHART, [...u32(0), ...u32(0), ...u32(300 << 16), ...u32(200 << 16)]), B,
    rec(C.SERIES, [...u16(3), ...u16(1), ...u16(3), ...u16(3), ...u16(1), ...u16(0)]), B,
    ai(0, 1), rec(C.SERIESTEXT, [...u16(0), ...str8('Série')]),
    ai(1, 2, area3d(0, 2, 1)), ai(2, 2, area3d(0, 2, 0)), ai(3, 1),
    rec(C.DATAFORMAT, [...u16(0xffff), ...u16(0), ...u16(0), ...u16(0)]), B, line(0, true), areaFmt(0x4e, true), E,
    rec(C.SERTOCRT, u16(0)), E,
    rec(C.AXISPARENT, [...u16(0), ...u32(400), ...u32(300), ...u32(3200), ...u32(3200)]), B,
    rec(C.AXIS, [...u16(0), ...new Array(16).fill(0)]), B, rec(C.CATSERRANGE, [...u16(1), ...u16(1), ...u16(1), ...u16(1)]),
    rec(C.TICK, [2, 0, 3, 1, 0, 0, 0, 0, ...new Array(16).fill(0), ...u16(1), ...u16(0x4d), ...u16(0)]), E,
    rec(C.AXIS, [...u16(1), ...new Array(16).fill(0)]), B,
    rec(C.VALUERANGE, [...f64(0), ...f64(0), ...f64(0), ...f64(0), ...f64(0), ...u16(0x1f)]),
    rec(C.TICK, [2, 0, 3, 1, 0, 0, 0, 0, ...new Array(16).fill(0), ...u16(1), ...u16(0x4d), ...u16(0)]),
    rec(C.AXISLINEFORMAT, u16(1)), line(8), E,
    rec(C.PLOTAREA), rec(C.FRAME, [...u16(0), ...u16(3)]), B, line(23), areaFmt(22), E,
    rec(C.CHARTFORMAT, [...new Array(16).fill(0), ...u16(0), ...u16(0)]), B,
    rec(C.BAR, [...i16(0), ...u16(150), ...u16(0)]),
    rec(C.LEGEND, [...u32(3400), ...u32(1600), ...u32(500), ...u32(400), 3, 1, ...u16(0x1f)]), E,
    E, E,
    rec(RT.EOF),
  ];
  const anchor = [...u16(0), ...u16(3), ...u16(0), ...u16(0), ...u16(0), ...u16(9), ...u16(0), ...u16(15), ...u16(0)];
  const shape = oa(0xf004, 0, 0xf, [...oa(0xf00a, 201, 2, [...u32(1026), ...u32(0xa00)]), ...oa(0xf010, 0, 0, anchor), ...oa(0xf011, 0, 0, [])]);
  const patriarch = oa(0xf004, 0, 0xf, [...oa(0xf009, 0, 1, new Array(16).fill(0)), ...oa(0xf00a, 0, 2, [...u32(1024), ...u32(0x5)])]);
  const dg = oa(0xf002, 1, 0xf, [...oa(0xf008, 1, 0, [...u32(2), ...u32(1026)]), ...oa(0xf003, 0, 0xf, [...patriarch, ...shape])]);
  const sheetRecs: Rec[] = [
    ...['a', 'b', 'c'].map((s, i) => rec(RT.LABEL, [...u16(i), ...u16(0), ...u16(15), ...str16(s)])),
    ...[1, 2, 3].map((v, i) => rec(RT.NUMBER, [...u16(i), ...u16(1), ...u16(15), ...f64(v)])),
    rec(RT.MSODRAWING, dg),
    rec(RT.OBJ, [...u16(0x15), ...u16(0x12), ...u16(5), ...u16(1), ...u16(0x6011), ...new Array(12).fill(0), ...u32(0)]),
    ...chartStream,
  ];
  const globals: Rec[] = [
    ...defaultFormatting(),
    rec(0x01ae, [...u16(1), ...u16(0x0401)]), // SUPBOOK da própria pasta
    rec(0x0017, [...u16(1), ...u16(0), ...i16(0), ...i16(0)]), // EXTERNSHEET: ixti 0 → aba 0
  ];
  const pkg = openSpreadsheet(buildXls(globals, [{ name: 'Dados', recs: sheetRecs }]));
  const ws = readWorksheet(pkg, readWorkbook(pkg).sheets[0]!.target!);

  it('âncora do OBJ do gráfico e séries resolvidas pelas referências das células', () => {
    expect(ws.charts).toHaveLength(1);
    const ch = ws.charts![0]!;
    expect(ch.anchor.from).toMatchObject({ col: 3, row: 0 });
    expect(ch.anchor.to).toMatchObject({ col: 9, row: 15 });
    const m = parseChart(ch.chartXml);
    expect(m.type).toBe('bar-col');
    expect(m.series).toEqual([expect.objectContaining({ name: 'Série', values: [1, 2, 3], color: '#9999FF' })]);
    expect(m.categories).toEqual(['a', 'b', 'c']);
    expect(ch.chartXml).toContain("<c:f>Dados!$B$1:$B$3</c:f>");
    // área de plotagem cinza (paleta 22) com layout do AXISPARENT, grade principal, legenda à direita
    expect(ch.chartXml).toContain('<c:x val="0.1"/><c:y val="0.075"/><c:w val="0.8"/><c:h val="0.8"/>');
    expect(ch.chartXml).toContain('<c:majorGridlines>');
    expect(ch.chartXml).toContain('<c:legendPos val="r"/>');
    expect(m.space.plotSp.fill).toMatchObject({ kind: 'solid', color: '#C0C0C0' });
  });
});

describe('.xls — utilitários', () => {
  it('RK: inteiro, inteiro ÷100, double truncado', () => {
    expect(rkValue((100 << 2) | 2)).toBe(100);
    expect(rkValue((123 << 2) | 3)).toBe(1.23);
    expect(rkValue((-7 << 2) | 2)).toBe(-7);
    expect(rkValue(0x3ff00000)).toBe(1); // 1.0: só os 30 bits altos do double
  });

  it('"General" em qualquer caixa, fora de aspas', () => {
    expect(normalizeFormat('GENERAL')).toBe('General');
    expect(normalizeFormat('general;[Red]-general')).toBe('General;[Red]-General');
    expect(normalizeFormat('"general" 0')).toBe('"general" 0');
  });

  it('altura em twips ajustada ao pixel como o Excel', () => {
    expect(rowHeightPt(282)).toBe(13.5);
    expect(rowHeightPt(224)).toBe(11.25);
    expect(rowHeightPt(255)).toBe(12.75);
  });

  it('uso dos helpers de escrita', () => {
    expect(str8('ab')).toEqual([2, 0, 0x61, 0x62]);
    expect(u8(300)).toEqual([44]);
  });
});
