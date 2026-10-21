// Operações de tabela contra o ORÁCULO (write/tools/table-lab/results): cada
// caso monta a tabela inicial do experimento, aplica a operação e compara o
// XML gravado (tblPr, grade, trPr, tcPr, texto e pPr de cada célula) com o
// que o Word gravou.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DocxPackage, readFullDocument, writeDocument, tableOps as T,
  type TableBlock, type Block, type DocumentModel, type Paragraph,
} from '../src/index.js';

const RESULTS = join(__dirname, '../../../tools/table-lab/results');

/** Resumo comparável de cada w:tbl de um XML (uma linha por linha da tabela). */
function summarize(xml: string, o: { grid?: boolean } = {}): string[] {
  const flat = xml.replace(/\n\s*/g, '').replace(/\s(w:rsid\w*|w14:paraId|w14:textId)="[^"]*"/g, '');
  const out: string[] = [];
  for (const t of flat.matchAll(/<w:tbl>((?:(?!<w:tbl>)[\s\S])*?)<\/w:tbl>/g)) {
    const tb = t[1]!;
    out.push(`tblPr ${(/<w:tblPr>([\s\S]*?)<\/w:tblPr>/.exec(tb) ?? [])[1] ?? ''}`);
    if (o.grid !== false) out.push(`grid ${[...tb.matchAll(/gridCol w:w="(\d+)"/g)].map((m) => m[1]).join(',')}`);
    for (const r of tb.matchAll(/<w:tr>([\s\S]*?)<\/w:tr>/g)) {
      const trPr = (/<w:trPr>([\s\S]*?)<\/w:trPr>/.exec(r[1]!) ?? [])[1] ?? '';
      const ex = (/<w:tblPrEx>([\s\S]*?)<\/w:tblPrEx>/.exec(r[1]!) ?? [])[1] ?? '';
      const cells = [...r[1]!.matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((c) => {
        const tc = (/<w:tcPr>([\s\S]*?)<\/w:tcPr>/.exec(c[1]!) ?? [])[1] ?? '';
        const paras = [...c[1]!.matchAll(/<w:p(?:\/>|>([\s\S]*?)<\/w:p>)/g)].map((p) => {
          const inner = p[1] ?? '';
          const ppr = (/<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(inner) ?? [])[1];
          const txt = [...inner.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
          return `"${txt}"${ppr ? `{${ppr}}` : ''}`;
        });
        return `[${tc}] ${paras.join(' / ')}`;
      });
      out.push(`tr${ex ? ` EX{${ex}}` : ''}${trPr ? ` {${trPr}}` : ''} ${cells.join(' | ')}`);
    }
  }
  return out;
}

const word = (name: string, o?: { grid?: boolean }): string[] => summarize(readFileSync(join(RESULTS, `${name}.xml`), 'utf8'), o);

const SECT = { pageWidthTwips: 11906, pageHeightTwips: 16838, marginLeftTwips: 1701, marginRightTwips: 1701, marginTopTwips: 1417, marginBottomTwips: 1417 };

function xmlOf(blocks: Block[]): string {
  const pkg = DocxPackage.empty();
  const model: DocumentModel = { paragraphs: [{ runs: [], props: {} }], sectPr: SECT };
  writeDocument(pkg, model, [], { blocks: [...blocks, { type: 'paragraph', paragraph: { runs: [], props: {} } }] });
  return pkg.documentXml();
}
const ours = (t: TableBlock | TableBlock[], o?: { grid?: boolean }): string[] => summarize(xmlOf(Array.isArray(t) ? t : [t]), o);

const text = (s: string): Paragraph => ({ runs: [{ text: s, props: {} }], props: {} } as Paragraph);
const setText = (t: TableBlock, r: number, c: number, ...ps: string[]): void => {
  T.setCellContent(t.rows[r]!.cells[c]!, ps.map((s) => ({ type: 'paragraph' as const, paragraph: s ? text(s) : { runs: [], props: {} } })));
};
/** A tabela-base dos experimentos: 3×3 do botão, texto rLcC. */
function base(rows = 3, cols = 3): TableBlock {
  const t = T.newTable(rows, cols, { availTwips: 8504 });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) setText(t, r, c, `r${r + 1}c${c + 1}`);
  return t;
}
const R = (r1: number, c1: number, r2 = r1, c2 = c1): T.CellRect => ({ r1, c1, r2, c2 });

describe('inserir tabela (oráculo)', () => {
  it('3×4 do botão: Tabelacomgrade, tblW auto, tblLook 04A0, (8504−10)/4', () => {
    expect(ours(T.newTable(3, 4, { availTwips: 8504 }))).toEqual(word('insert-grid'));
  });
  for (const n of [1, 2, 5, 6, 7, 10]) {
    it(`${n} coluna(s): resto nas últimas`, () => {
      expect(ours(T.newTable(2, n, { availTwips: 8504 }))).toEqual(word(`insert-cols-${n}`));
    });
  }
  it('margens de 72 pt', () => expect(ours(T.newTable(2, 3, { availTwips: 9026 }))).toEqual(word('insert-margins')));
  it('parágrafo recuado vira tblInd', () => expect(ours(T.newTable(2, 3, { availTwips: 7784, indTwips: 720 }))).toEqual(word('insert-indented')));
  it('AutoAjuste ao conteúdo', () => expect(ours(T.newTable(2, 3, { availTwips: 8504, autofit: 'content' }), { grid: false })).toEqual(word('insert-autofit-content', { grid: false })));
  it('AutoAjuste à janela', () => expect(ours(T.newTable(2, 3, { availTwips: 8504, autofit: 'window' }))).toEqual(word('insert-autofit-window')));
  it('largura fixa de coluna', () => expect(ours(T.newTable(2, 3, { availTwips: 8504, colTwips: 1440 }))).toEqual(word('insert-fixed-width')));
});

describe('linhas e colunas (oráculo)', () => {
  it('inserir 1 linha acima de 2 selecionadas', () => {
    const t = base();
    T.insertRows(t, R(0, 0, 1, 2), 'above', 1);
    expect(ours(t)).toEqual(word('rows-above-2sel'));
  });
  it('inserir colunas à direita de 2 selecionadas (alarga, tblW dxa)', () => {
    const t = base();
    expect(T.insertColumns(t, R(0, 0, 2, 1), 'right')).toEqual(R(0, 2, 2, 3));
    expect(ours(t)).toEqual(word('cols-right-2sel'));
  });
  it('coluna à direita de uma célula mesclada', () => {
    const t = base();
    T.mergeCells(t, R(0, 0, 0, 1));
    T.insertColumns(t, R(1, 0), 'right');
    expect(ours(t)).toEqual(word('cols-right-span'));
  });
  it('excluir linha / última linha', () => {
    const a = base(); T.deleteRows(a, 1, 1); expect(ours(a)).toEqual(word('del-row'));
    const b = base(); T.deleteRows(b, 2, 2); expect(ours(b)).toEqual(word('del-lastrow'));
  });
  it('excluir coluna (a grade perde a coluna, sem redistribuir)', () => {
    const t = base();
    T.setColumnWidth(t, 0, 0, 1000);
    T.deleteColumns(t, 1, 1);
    expect(ours(t)).toEqual(word('del-col'));
  });
  it('excluir células: para cima', () => {
    const t = base();
    T.deleteCells(t, R(1, 1), 'up');
    expect(ours(t)).toEqual(word('del-cells-up'));
  });
  it('excluir células: à esquerda (gridAfter)', () => {
    const t = base();
    T.deleteCells(t, R(1, 1), 'left');
    expect(ours(t, { grid: false })).toEqual(word('del-cells-left', { grid: false }));
  });
  it('inserir células: para baixo', () => {
    const t = base();
    T.insertCells(t, R(1, 1), 'down');
    expect(ours(t)).toEqual(word('cells-insert-down'));
  });
  it('inserir células: à direita', () => {
    const t = base();
    T.insertCells(t, R(1, 1), 'right');
    expect(ours(t, { grid: false })).toEqual(word('cells-insert-right', { grid: false }));
  });
});

describe('mesclar e dividir (oráculo)', () => {
  const normal = { after: 160, line: 259 };
  it('horizontal', () => { const t = base(); T.mergeCells(t, R(0, 0, 0, 1)); expect(ours(t)).toEqual(word('merge-h')); });
  it('vertical (com o espaçamento do Normal)', () => { const t = base(); T.mergeCells(t, R(0, 0, 1, 0), { normalSpacing: normal }); expect(ours(t)).toEqual(word('merge-v')); });
  it('bloco 2×2', () => { const t = base(); T.mergeCells(t, R(0, 0, 1, 1), { normalSpacing: normal }); expect(ours(t)).toEqual(word('merge-block')); });
  it('célula vazia some', () => { const t = base(); setText(t, 0, 1, ''); T.mergeCells(t, R(0, 0, 0, 2)); expect(ours(t)).toEqual(word('merge-empty')); });
  it('vertical de 3 linhas', () => { const t = base(); T.mergeCells(t, R(0, 1, 2, 1), { normalSpacing: normal }); expect(ours(t)).toEqual(word('merge-v-3')); });
  it('vertical com 2 parágrafos por célula', () => {
    const t = base(); setText(t, 0, 0, 'a1', 'a2'); setText(t, 1, 0, 'b1', 'b2');
    T.mergeCells(t, R(0, 0, 1, 0), { normalSpacing: normal });
    expect(ours(t)).toEqual(word('merge-v-2paras'));
  });
  it('dividir em 1×2', () => { const t = base(); T.splitCells(t, R(0, 0), 2, 1); expect(ours(t)).toEqual(word('split-1x2')); });
  it('dividir em 2×2 (linhas novas com metade da altura)', () => {
    const t = base(); T.splitCells(t, R(1, 1), 2, 2, { rowHeights: [270] });
    expect(ours(t)).toEqual(word('split-2x2'));
  });
  it('dividir a célula mesclada', () => {
    const t = base(); T.mergeCells(t, R(0, 0, 0, 2)); T.splitCells(t, R(0, 0, 0, 2), 2, 1);
    expect(ours(t)).toEqual(word('split-merged'));
  });
  for (const [name, txt, cols] of [['split-paras-3to2', ['p1', 'p2', 'p3'], 2], ['split-paras-4to3', ['p1', 'p2', 'p3', 'p4'], 3], ['split-paras-2to3', ['p1', 'p2'], 3]] as const) {
    it(`parágrafos: ${name}`, () => { const t = base(); setText(t, 0, 0, ...txt); T.splitCells(t, R(0, 0), cols, 1); expect(ours(t)).toEqual(word(name)); });
  }
  it('dividir em linhas: parágrafos ficam na 1ª', () => {
    const t = base(); setText(t, 0, 0, 'p1', 'p2', 'p3');
    T.splitCells(t, R(0, 0), 1, 3, { rowHeights: [810] });
    expect(ours(t)).toEqual(word('split-paras-rows'));
  });
  it('2 células sem mesclar antes', () => { const t = base(); T.splitCells(t, R(0, 0, 0, 1), 2, 1, { mergeFirst: false }); expect(ours(t)).toEqual(word('split-sel-nomerge')); });
  it('2 células mescladas e divididas em 3', () => { const t = base(); T.splitCells(t, R(0, 0, 0, 1), 3, 1); expect(ours(t)).toEqual(word('split-sel-merge')); });
  it('dividir tabela', () => {
    const t = base(); const t2 = T.splitTable(t, 1)!;
    const both = summarize(xmlOf([t, { type: 'paragraph', paragraph: { runs: [], props: {} } }, t2]));
    expect(both).toEqual(word('split-table'));
  });
});

describe('tamanho, alinhamento e propriedades (oráculo)', () => {
  it('distribuir colunas', () => {
    const t = base(); T.setColumnWidth(t, 0, 0, 1000); T.setColumnWidth(t, 1, 1, 2000); T.setColumnWidth(t, 2, 2, 3000);
    T.distributeColumns(t, 0, 2);
    expect(ours(t)).toEqual(word('dist-cols'));
  });
  it('distribuir linhas', () => {
    const t = base(); T.setRowHeight(t, 0, 0, 400); T.setRowHeight(t, 1, 1, 800); T.setRowHeight(t, 2, 2, 1200);
    T.distributeRows(t, 0, 2, [400, 800, 1200]);
    expect(ours(t)).toEqual(word('dist-rows'));
  });
  it('AutoAjuste à janela', () => { const t = base(); T.setColumnWidth(t, 0, 0, 1000); T.autoFit(t, 'window', 8504); expect(ours(t)).toEqual(word('autofit-window')); });
  it('AutoAjuste ao conteúdo', () => { const t = base(); setText(t, 0, 1, 'a much longer piece of text here'); T.autoFit(t, 'content'); expect(ours(t, { grid: false })).toEqual(word('autofit-content', { grid: false })); });
  it('largura fixa', () => {
    const t = T.newTable(2, 3, { availTwips: 8504, autofit: 'content' }); setText(t, 0, 0, 'abc');
    t.gridColsTwips = [2831, 2831, 2832];
    T.autoFit(t, 'fixed');
    expect(ours(t)).toEqual(word('autofit-fixed'));
  });
  it('altura exata / pelo menos', () => {
    const a = base(); T.setRowHeight(a, 1, 1, 600, 'exact'); expect(ours(a)).toEqual(word('row-height-exact'));
    const b = base(); T.setRowHeight(b, 1, 1, 600); expect(ours(b)).toEqual(word('row-height-atleast'));
  });
  it('largura da coluna', () => { const t = base(); T.setColumnWidth(t, 1, 1, 2000); expect(ours(t)).toEqual(word('col-width')); });
  it('repetir cabeçalho / não dividir linha', () => {
    const a = base(); T.setRowProps(a, 0, 0, { tblHeader: true }); expect(ours(a)).toEqual(word('header-repeat'));
    const b = base(); T.setRowProps(b, 0, 1, { tblHeader: true }); expect(ours(b)).toEqual(word('header-repeat-2'));
    const c = base(); T.setRowProps(c, 1, 1, { cantSplit: true }); expect(ours(c)).toEqual(word('row-cantsplit'));
  });
  it('alinhar no centro (vAlign + jc)', () => {
    const t = base(); T.setCellProps(t, R(1, 1), { vAlign: 'center' });
    t.rows[1]!.cells[1]!.paragraphs[0]!.props.alignment = 'center';
    expect(ours(t)).toEqual(word('align-middle-center'));
  });
  for (const [n, dir] of [['textdir-2', 'btLr'], ['textdir-3', 'tbRl'], ['textdir-1', 'tbRlV'], ['textdir-5', 'tbLrV']] as const) {
    it(`direção do texto ${dir}`, () => {
      const t = base(); T.setTextDirection(t, R(1, 1), dir);
      for (const p of t.rows[1]!.cells[1]!.paragraphs) { p.props.indentLeftTwips = 113; p.props.indentRightTwips = 113; }
      expect(ours(t)).toEqual(word(n));
    });
  }
  it('direção lrTbV não mexe na linha', () => { const t = base(); T.setTextDirection(t, R(1, 1), 'lrTbV'); expect(ours(t)).toEqual(word('textdir-4')); });
  it('margens e espaçamento das células', () => {
    const t = base();
    T.setTableProps(t, { tblCellMar: { top: { w: 100, type: 'dxa' }, left: { w: 200, type: 'dxa' }, bottom: { w: 80, type: 'dxa' }, right: { w: 180, type: 'dxa' } }, tblLayout: 'fixed' });
    T.setCellSpacing(t, 40);
    expect(ours(t, { grid: false })).toEqual(word('cell-margins', { grid: false }));
  });
  it('propriedades da tabela: alinhar, recuo, %, ao redor, Texto Alt', () => {
    const a = base(); T.setColumnWidth(a, 0, 2, 1200); T.setTableAlign(a, 'center'); expect(ours(a)).toEqual(word('table-align-center'));
    const b = base(); T.setColumnWidth(b, 0, 2, 1200); T.setTableProps(b, { tblInd: { w: 720, type: 'dxa' } }); expect(ours(b)).toEqual(word('table-indent'));
    const c = base(); T.setTableProps(c, { tblW: { w: 4000, type: 'pct' } }); expect(ours(c, { grid: false })).toEqual(word('table-prefwidth-pct', { grid: false }));
    const d = base(); T.setColumnWidth(d, 0, 2, 1200);
    T.setTableProps(d, { tblpPr: { leftFromText: 141, rightFromText: 141, vertAnchor: 'text', tblpY: 1 }, tblOverlap: 'never' });
    expect(ours(d)).toEqual(word('table-wrap-around'));
    const e = base(); T.setTableProps(e, { tblCaption: 'Alt title', tblDescription: 'Alt description' }); expect(ours(e)).toEqual(word('table-alttext'));
  });
  it('opções de estilo (tblLook)', () => {
    for (const [n, patch] of [
      ['look-noheader', { firstRow: false }], ['look-total', { lastRow: true }], ['look-nofirstcol', { firstColumn: false }],
      ['look-lastcol', { lastColumn: true }], ['look-norowbands', { noHBand: true }], ['look-colbands', { noVBand: false }],
    ] as const) {
      const t = base(); T.setLook(t, patch); expect(ours(t)).toEqual(word(n));
    }
  });
});

describe('sombreamento e bordas (oráculo)', () => {
  // o Word grava a borda inferior do estilo na célula de cima ao mexer numa
  // célula (artefato sem efeito visual) — fora da comparação
  const noArtifact = (s: string[]): string[] => s.map((l) => l.replace('[<w:tcW w:w="2831" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tcBorders>] "r1c2"', '[<w:tcW w:w="2831" w:type="dxa"/>] "r1c2"'));
  it('célula amarela / do tema / do tema com tint', () => {
    const a = base(); T.setShading(a, R(1, 1), { val: 'clear', color: 'auto', fill: 'FFFF00' }); expect(ours(a)).toEqual(noArtifact(word('shade-cell')));
    const b = base(); T.setShading(b, R(1, 1), { val: 'clear', color: 'auto', fill: '156082', themeFill: 'accent1' }); expect(ours(b)).toEqual(noArtifact(word('shade-theme')));
    const c = base(); T.setShading(c, R(1, 1), { val: 'clear', color: 'auto', fill: 'C1E4F5', themeFill: 'accent1', themeFillTint: '33' }); expect(ours(c)).toEqual(noArtifact(word('shade-theme-tint')));
  });
  it('tabela inteira: tblPr e cada célula', () => {
    const t = base(); T.setShading(t, T.wholeRect(t), { val: 'clear', color: 'auto', fill: 'FFFF00' }, true);
    expect(ours(t)).toEqual(word('shade-table'));
  });
  it('borda inferior dupla vermelha: as duas células da aresta', () => {
    const t = base(); T.setBorders(t, R(1, 1), 'bottom', { val: 'double', sz: 6, space: 0, color: 'FF0000' });
    expect(ours(t)).toEqual(noArtifact(word('border-cell-bottom')));
  });
  it('tabela inteira sem bordas / só as externas (diferença do estilo)', () => {
    const grid = { val: 'single', sz: 4, space: 0, color: 'auto' };
    const styleBorders = { top: grid, left: grid, bottom: grid, right: grid, insideH: grid, insideV: grid };
    const a = base(); T.setBorders(a, T.wholeRect(a), 'none', null, { wholeTable: true, styleBorders }); expect(ours(a)).toEqual(word('border-table-none'));
    const b = base(); T.setBorders(b, T.wholeRect(b), 'none', null, { wholeTable: true, styleBorders });
    T.setBorders(b, T.wholeRect(b), 'outside', grid, { wholeTable: true, styleBorders }); expect(ours(b)).toEqual(word('border-table-outside'));
    const c = base(); T.setBorders(c, T.wholeRect(c), 'none', null, { wholeTable: true, styleBorders });
    T.setBorders(c, T.wholeRect(c), 'all', grid, { wholeTable: true, styleBorders }); expect(ours(c)).toEqual(word('border-table-all'));
  });
  it('bordas internas de um bloco de células', () => {
    const grid = { val: 'single', sz: 4, space: 0, color: 'auto' };
    const t = base(); T.setBorders(t, T.wholeRect(t), 'none', null, { wholeTable: true, styleBorders: { top: grid, left: grid, bottom: grid, right: grid, insideH: grid, insideV: grid } });
    T.setBorders(t, R(0, 0, 1, 1), 'inside', grid);
    expect(ours(t)).toEqual(word('border-cells-inside'));
  });
  it('diagonais', () => {
    const t = base(); const b = { val: 'single', sz: 4, space: 0, color: 'auto' };
    T.setBorders(t, R(1, 1), 'tl2br', b); T.setBorders(t, R(1, 1), 'tr2bl', b);
    expect(ours(t)).toEqual(noArtifact(word('border-diag')));
  });
});

describe('converter tabela em texto (oráculo)', () => {
  // fronteiras de run sem rPr não mudam nada (o Word separa por rsid)
  const mergeRuns = (x: string): string => x.replace(/<\/w:r><w:r>(?!<w:rPr>)/g, '').replace(/<\/w:t><w:t(?: [^>]*)?>/g, '');
  const body = (name: string): string => {
    const x = readFileSync(join(RESULTS, `${name}.xml`), 'utf8').replace(/\n\s*/g, '');
    return mergeRuns(x.slice(x.indexOf('<w:body>') + 8, x.indexOf('<w:sectPr>')).replace(/<w:p\/>$/, ''));
  };
  const paras = (ps: Paragraph[]): string => {
    const x = xmlOf(ps.map((paragraph) => ({ type: 'paragraph' as const, paragraph })));
    return mergeRuns(x.slice(x.indexOf('<w:body>') + 8, x.indexOf('<w:sectPr>')).replace(/(<w:p\/>|<w:p><\/w:p>)$/, ''));
  };
  it('tabulações: paradas nas divisas + recuo de 113', () => expect(paras(T.tableToText(base(), 'tab'))).toBe(body('to-text-tabs')));
  it('marcas de parágrafo', () => expect(paras(T.tableToText(base(), 'paragraph'))).toBe(body('to-text-paras')));
  it('outro caractere', () => expect(paras(T.tableToText(base(), { char: '-' }))).toBe(body('to-text-other')));
  it('ponto e vírgula', () => expect(paras(T.tableToText(base(), 'semicolon'))).toBe(body('to-text-semi')));
});

describe('gravação sem perdas de tabela editada', () => {
  /** Documento escrito pelo Word (resultado do oráculo), lido com as fontes originais. */
  function wordDoc(name: string, extraTrAttr = '') {
    const x = readFileSync(join(RESULTS, `${name}.xml`), 'utf8');
    let body = x.slice(x.indexOf('<w:body>'), x.indexOf('</w:body>') + 9).replace(/\n\s*/g, '');
    // marcas de origem que só o cru carrega (para ver que sobrevivem)
    if (extraTrAttr) body = body.replace(/<w:tr>/g, () => `<w:tr ${extraTrAttr}>`);
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">' + body + '</w:document>';
    const pkg = DocxPackage.empty();
    pkg.setPartText('word/document.xml', doc);
    const full = readFullDocument(pkg, { sources: true });
    full.sources!.baseline();
    const t = full.blocks.find((b): b is TableBlock => b.type === 'table')!;
    const save = (): string => {
      const paragraphs = full.blocks.filter((b): b is Extract<Block, { type: 'paragraph' }> => b.type === 'paragraph').map((b) => b.paragraph);
      writeDocument(pkg, { paragraphs, sectPr: full.sections[0]!.sectPr }, [], { blocks: full.blocks, sources: full.sources });
      return pkg.documentXml();
    };
    return { pkg, full, t, doc, save };
  }
  const rowsOf = (xml: string): string[] => [...xml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((m) => m[0]);

  const bodyOf = (x: string): string => x.slice(x.indexOf('<w:body>'));
  it('sem editar: a tabela sai byte a byte', () => {
    const w = wordDoc('rows-above', 'w14:paraId="0A0B0C0D"');
    expect(bodyOf(w.save())).toBe(bodyOf(w.doc));
  });

  it('inserir linha abaixo: linhas lidas cruas (com a abertura original), a nova copia trPr/tcPr/pPr', () => {
    const w = wordDoc('rows-above', 'w14:paraId="0A0B0C0D"');
    const orig = rowsOf(w.doc);
    T.insertRows(w.t, R(2, 0, 2, 2), 'below');
    const rows = rowsOf(w.save());
    expect(rows).toHaveLength(5);
    expect(rows.slice(0, 3)).toEqual(orig.slice(0, 3));
    expect(rows[4]).toBe(orig[3]);
    // a linha nova: abertura simples, trPr e tcPr copiados da linha 3 (a de cima)
    expect(rows[3]).toMatch(/^<w:tr><w:trPr><w:trHeight w:hRule="exact" w:val="600"\/><\/w:trPr>/);
    expect(rows[3]).toContain('<w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/>');
    expect(rows[3]).toContain('<w:pPr><w:jc w:val="right"/><w:rPr><w:b/></w:rPr></w:pPr>');
    expect(rows[3]).not.toContain('<w:t>');
  });

  it('excluir a 1ª linha: as outras continuam com o próprio trPr (a fonte segue a linha, não o índice)', () => {
    const w = wordDoc('rows-above');
    const orig = rowsOf(w.doc);
    T.deleteRows(w.t, 0, 0);
    expect(rowsOf(w.save())).toEqual(orig.slice(1));
  });

  it('mudar só o sombreamento de uma célula: o resto do tcPr fica cru', () => {
    const w = wordDoc('rows-above');
    T.setShading(w.t, R(1, 1), { val: 'clear', color: 'auto', fill: '00FF00' });
    const xml = w.save();
    expect(xml).toContain('<w:tcPr><w:tcW w:w="2831" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="00FF00"/><w:tcMar><w:left w:w="300" w:type="dxa"/></w:tcMar></w:tcPr>');
    // as outras linhas não mudaram
    expect(rowsOf(xml)[0]).toBe(rowsOf(w.doc)[0]);
  });

  it('estilo e opções: só tblStyle/tblLook mudam no tblPr', () => {
    const w = wordDoc('rows-above');
    T.setTableProps(w.t, { tblStyle: 'TabeladeGrade4-nfase1' });
    T.setLook(w.t, { lastRow: true });
    expect(w.save()).toContain('<w:tblPr><w:tblStyle w:val="TabeladeGrade4-nfase1"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04E0" w:firstRow="1" w:lastRow="1" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>');
  });

  it('mesclar: a célula que fica mantém a abertura e o tcPr cru com gridSpan novo', () => {
    const w = wordDoc('rows-above');
    T.mergeCells(w.t, R(3, 0, 3, 1));
    const last = rowsOf(w.save())[3]!;
    expect(last).toContain('<w:tc><w:tcPr><w:tcW w:w="3831" w:type="dxa"/><w:gridSpan w:val="2"/></w:tcPr><w:p><w:r><w:t>r3c1</w:t></w:r></w:p><w:p><w:r><w:t>r3c2</w:t></w:r></w:p></w:tc>');
  });

  it('dividir a tabela: a 2ª parte reusa o cru das linhas', () => {
    const w = wordDoc('rows-above', 'w14:paraId="0A0B0C0D"');
    const orig = rowsOf(w.doc);
    const t2 = T.splitTable(w.t, 2)!;
    const i = w.full.blocks.indexOf(w.t);
    w.full.blocks.splice(i + 1, 0, { type: 'paragraph', paragraph: { runs: [], props: {} } }, t2);
    const xml = w.save();
    expect((xml.match(/<w:tbl>/g) ?? []).length + (xml.match(/<w:tbl /g) ?? []).length).toBe(2);
    expect(rowsOf(xml)).toEqual(orig);
  });
});
