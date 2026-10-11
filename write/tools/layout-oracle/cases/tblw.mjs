// Geometria de tabela (largura da tabela e das colunas) por modo de compatibilidade:
// tblW pct/dxa/auto × tcW pct/dxa/auto × grade (tblGrid), tblLayout fixo/autoajuste,
// recuo, alinhamento, margens de célula e espessura de borda. Conteúdo inventado.
// Linha 1: um rótulo por célula, em degraus (a célula k desce k linhas) — o x de
// cada rótulo dá a borda esquerda do texto da célula. Linha 2 (opcional): conteúdo
// que mede o autoajuste (palavra longa, frase que quebra).
import { buildDocx, docDefaults, p, r } from '../docx-builder.mjs';
import { solidPng, inlineImage } from '../png.mjs';

const bdr = (sz) => (sz ? '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="auto"/>`).join('') + '</w:tblBorders>' : '');
const W = (w, type = 'dxa') => `w:w="${w}" w:type="${type}"`;
/**
 * t: id da tabela (prefixo dos rótulos); grid: gridCol; tblW: xml; tcW(k): xml do tcW (ou '');
 * content: textos da linha 2 por coluna (ou null); extra: xml extra do tblPr.
 */
function tbl({ t, grid, tblW = '', tcW = () => '', tcMar = () => '', content = null, extra = '', sz = 4, align = 'left' }) {
  const jc = align === 'left' ? '' : `<w:jc w:val="${align}"/>`;
  const row1 = grid.map((g, k) => `<w:tc><w:tcPr>${tcW(k, g)}${tcMar(k)}</w:tcPr>${p('').repeat(k)}${p(r(`${t}c${k + 1}`), jc)}</w:tc>`).join('');
  const row2 = content ? grid.map((g, k) => `<w:tc><w:tcPr>${tcW(k, g)}${tcMar(k)}</w:tcPr>${content[k] ? p(r(content[k])) : p('')}</w:tc>`).join('') : '';
  return p(r(`Tabela ${t}`)) + `<w:tbl><w:tblPr>${tblW}${extra}${bdr(sz)}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>`
    + `<w:tr>${row1}</w:tr>${row2 ? `<w:tr>${row2}</w:tr>` : ''}</w:tbl>`;
}
const pctOf = (grid) => { const s = grid.reduce((a, b) => a + b, 0); return (k) => `<w:tcW ${W(Math.round((grid[k] / s) * 5000), 'pct')}/>`; };
const dxa = (ws) => (k, g) => `<w:tcW ${W(ws ? ws[k] : g)}/>`;
const autoW = () => '<w:tcW w:w="0" w:type="auto"/>';
const tblAuto = '<w:tblW w:w="0" w:type="auto"/>';
const g3 = [2000, 3000, 4000];

// A — tblW em porcentagem: base da largura, margens, recuo, alinhamento, borda
function groupA() {
  let b = '';
  b += tbl({ t: 'a1', grid: g3, tblW: `<w:tblW ${W(2500, 'pct')}/>`, tcW: pctOf(g3) });
  b += tbl({ t: 'a2', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), extra: `<w:tblCellMar><w:left ${W(400)}/><w:right ${W(50)}/></w:tblCellMar>` });
  b += tbl({ t: 'a3', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), tcMar: (k) => (k === 0 ? `<w:tcMar><w:left ${W(400)}/><w:right ${W(50)}/></w:tcMar>` : '') });
  b += tbl({ t: 'a4', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), extra: `<w:tblInd ${W(500)}/>` });
  b += tbl({ t: 'a5', grid: g3, tblW: `<w:tblW ${W(4000, 'pct')}/>`, tcW: pctOf(g3), extra: '<w:jc w:val="center"/>' });
  b += tbl({ t: 'a6', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), sz: 24 });
  b += tbl({ t: 'a7', grid: g3, tblW: `<w:tblW ${W(6000, 'pct')}/>`, tcW: pctOf(g3) });
  b += tbl({ t: 'a8', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), extra: `<w:tblInd ${W(-300)}/>` });
  b += tbl({ t: 'a9', grid: g3, tblW: `<w:tblW ${W(2500, 'pct')}/>`, tcW: pctOf(g3), extra: '<w:jc w:val="right"/>' });
  b += tbl({ t: 'a10', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), sz: 0 });
  b += tbl({ t: 'a11', grid: g3, tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf(g3), extra: `<w:tblCellMar><w:left ${W(0)}/><w:right ${W(0)}/></w:tblCellMar>` });
  b += tbl({ t: 'a12', grid: g3, tblW: `<w:tblW ${W(2500, 'pct')}/>`, tcW: dxa() });
  return b;
}
// B — tblW dxa/auto × tcW × grade em conflito; layout fixo
function groupB() {
  let b = '';
  b += tbl({ t: 'b1', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa([1000, 2000, 3000]) });
  b += tbl({ t: 'b2', grid: [1000, 2000, 3000], tblW: `<w:tblW ${W(6000)}/>` });
  b += tbl({ t: 'b3', grid: [3000, 3000, 3000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa() });
  b += tbl({ t: 'b4', grid: [1000, 1000, 1000], tblW: `<w:tblW ${W(9000)}/>`, tcW: dxa() });
  b += tbl({ t: 'b5', grid: [2500, 2500, 5000], tblW: `<w:tblW ${W(10000)}/>`, tcW: dxa() });
  b += tbl({ t: 'b6', grid: [1000, 2000, 3000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa([3000, 2000, 1000]), extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'b7', grid: [1000, 1000, 1000], tblW: `<w:tblW ${W(9000)}/>`, tcW: dxa(), extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'b8', grid: [3000, 3000, 3700], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: dxa(), extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'b9', grid: [1000, 2000, 3000], tblW: tblAuto, tcW: dxa([3000, 2000, 1000]), extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'b10', grid: [1000, 2000, 3000], tblW: tblAuto });
  b += tbl({ t: 'b11', grid: [1000, 2000, 3000], tblW: tblAuto, tcW: dxa() });
  b += tbl({ t: 'b12', grid: [2000, 2000, 2000], tblW: tblAuto, tcW: dxa([1000, 2000, 3000]) });
  b += tbl({ t: 'b13', grid: [3000, 3000, 4000], tblW: tblAuto, tcW: dxa() });
  b += tbl({ t: 'b14', grid: [3000, 3000, 4000], tblW: `<w:tblW ${W(10000)}/>`, tcW: dxa(), extra: '<w:tblLayout w:type="fixed"/>' });
  return b;
}
// C — autoajuste ao conteúdo (palavra longa, frase que quebra, tcW auto)
const LW = 'Desproporcionalidades';
const SENT = 'uma frase de teste com varias palavras curtas que precisa quebrar em linhas';
const LONG = 'texto comprido de teste que ocupa bem mais que a largura da area util da pagina inteira e por isso precisa quebrar em pelo menos duas linhas dentro da celula';
function groupC() {
  let b = '';
  b += tbl({ t: 'c1', grid: [1000, 1000, 1000], tblW: tblAuto, tcW: dxa(), content: ['', SENT, ''] });
  b += tbl({ t: 'c2', grid: [600, 600, 600], tblW: tblAuto, tcW: dxa(), content: ['', LW, ''] });
  b += tbl({ t: 'c3', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa([2000, 600, 2000]), content: ['', LW, ''] });
  b += tbl({ t: 'c4', grid: [2000, 2000, 2000], tblW: tblAuto, tcW: autoW, content: ['curto', SENT, ''] });
  b += tbl({ t: 'c5', grid: [2000, 2000, 2000], tblW: tblAuto, tcW: autoW, content: ['curto', LONG, ''] });
  b += tbl({ t: 'c6', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: autoW, content: ['curto', SENT, ''] });
  b += tbl({ t: 'c7', grid: [600, 600, 600], tblW: tblAuto, tcW: dxa(), content: ['', LW, ''], extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'c8', grid: [2000, 2000, 2000], tblW: tblAuto, tcW: dxa(), content: ['', LONG, ''] });
  b += tbl({ t: 'c9', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(6000)}/>`, tcW: autoW, content: ['curto', SENT, 'x'] });
  b += tbl({ t: 'c10', grid: [3000, 3000, 3000], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctOf([1, 1, 1]), content: ['', LONG, ''] });
  return b;
}

// D — distribuição mista (dxa + auto), layout fixo sem tcW, várias linhas, mesclas,
// encolhimento/expansão assimétricos e tabela aninhada
function rows2(t, grid, tblW, r1, r2, extra = '') {
  const cellX = (w, txt, k, span = 1) => `<w:tc><w:tcPr>${w}${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}</w:tcPr>${p('').repeat(k)}${p(r(txt))}</w:tc>`;
  const mk = (cells) => `<w:tr>${cells.map(([w, txt, span], k) => cellX(w, txt, k, span)).join('')}</w:tr>`;
  return p(r(`Tabela ${t}`)) + `<w:tbl><w:tblPr>${tblW}${extra}${bdr(4)}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>${mk(r1)}${r2 ? mk(r2) : ''}</w:tbl>`;
}
const tw = (w, type = 'dxa') => `<w:tcW ${W(w, type)}/>`;
function groupD() {
  let b = '';
  b += tbl({ t: 'd1', grid: [1000, 1000, 1000], tblW: `<w:tblW ${W(9000)}/>`, tcW: (k) => (k === 0 ? tw(1000) : autoW()) });
  b += tbl({ t: 'd2', grid: [1000, 2000, 3000], tblW: `<w:tblW ${W(6000)}/>`, extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'd3', grid: [1000, 2000, 3000], tblW: tblAuto, extra: '<w:tblLayout w:type="fixed"/>' });
  b += tbl({ t: 'd4', grid: [1000, 1000, 1000], tblW: `<w:tblW ${W(9000)}/>`, content: ['curto', SENT, ''] });
  b += rows2('d5', [2000, 2000, 2000], tblAuto, [[tw(1000), 'd5a'], [tw(2000), 'd5b'], [tw(3000), 'd5c']], [[tw(3000), 'd5d'], [tw(2000), 'd5e'], [tw(1000), 'd5f']]);
  b += rows2('d6', [2000, 2000, 2000], tblAuto, [[tw(4000), 'd6a', 2], [tw(1000), 'd6b']], [[tw(1000), 'd6c'], [tw(1000), 'd6d'], [tw(1000), 'd6e']]);
  b += tbl({ t: 'd7', grid: [4000, 4000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa([4000, 4000]), content: [LW, ''] });
  b += tbl({ t: 'd8', grid: [1000, 600, 4000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa([1000, 600, 4000]), content: ['', LW, ''] });
  b += tbl({ t: 'd9', grid: [600, 600, 600, 600, 600], tblW: tblAuto, tcW: dxa(), content: [LW, LW, LW, LW, LW] });
  b += tbl({ t: 'd10', grid: [1000, 1000, 1000], tblW: `<w:tblW ${W(9000)}/>`, tcW: (k) => (k === 0 ? tw(1000) : k === 1 ? tw(1000, 'pct') : autoW()) });
  b += tbl({ t: 'd11', grid: [1000, 1000, 1000], tblW: tblAuto, tcW: (k) => (k === 0 ? tw(1000) : k === 1 ? tw(1000, 'pct') : autoW()) });
  b += tbl({ t: 'd12', grid: [2000, 2000], tblW: tblAuto, tcW: autoW, content: ['curto', SENT] });
  // aninhada: tabela em pct dentro de uma célula de 4000
  const inner = `<w:tbl><w:tblPr><w:tblW ${W(5000, 'pct')}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${tw(2500, 'pct')}</w:tcPr>${p(r('n1'))}</w:tc><w:tc><w:tcPr>${tw(2500, 'pct')}</w:tcPr>${p('')}${p(r('n2'))}</w:tc></w:tr></w:tbl>`;
  b += p(r('Tabela d13')) + `<w:tbl><w:tblPr><w:tblW ${W(6000)}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${tw(4000)}</w:tcPr>${p(r('d13a'))}${inner}${p(r('d13z'))}</w:tc><w:tc><w:tcPr>${tw(2000)}</w:tcPr>${p(r('d13b'))}</w:tc></w:tr></w:tbl>`;
  return b;
}

// E — células vazias sem tcW, tcW 0, cabeçalho mesclado mais largo, recuo no conteúdo,
// tabela aninhada automática
function groupE() {
  let b = '';
  const empty = (k) => `<w:tc><w:tcPr></w:tcPr>${p('').repeat(k)}${p('')}</w:tc>`;
  b += p(r('Tabela e1')) + `<w:tbl><w:tblPr>${tblAuto}${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="2000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>${empty(0)}${empty(0)}${empty(0)}</w:tr></w:tbl>`;
  b += p(r('Tabela e2')) + `<w:tbl><w:tblPr><w:tblW ${W(6000)}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="2000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>${empty(0)}${empty(0)}${empty(0)}</w:tr></w:tbl>`;
  b += tbl({ t: 'e3', grid: [1000, 2000, 3000], tblW: tblAuto, tcW: () => `<w:tcW ${W(0)}/>` });
  b += rows2('e4', [1000, 1000, 1000], tblAuto, [[tw(6000), 'e4a', 3]], [[tw(1000), 'e4b'], [tw(1000), 'e4c'], [tw(1000), 'e4d']]);
  b += rows2('e5', [1000, 1000, 1000], `<w:tblW ${W(6000)}/>`, [[tw(6000), 'e5a', 3]], [[tw(1000), 'e5b'], [tw(1000), 'e5c'], [tw(1000), 'e5d']]);
  b += p(r('Tabela e6')) + `<w:tbl><w:tblPr>${tblAuto}${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${autoW()}</w:tcPr>${p(r('e6a recuado'), `<w:ind w:left="400" w:right="300"/>`)}</w:tc><w:tc><w:tcPr>${autoW()}</w:tcPr>${p('')}${p(r('e6b'))}</w:tc></w:tr></w:tbl>`;
  const innerAuto = `<w:tbl><w:tblPr>${tblAuto}${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${autoW()}</w:tcPr>${p(r('n3 curto'))}</w:tc><w:tc><w:tcPr>${autoW()}</w:tcPr>${p('')}${p(r('n4'))}</w:tc></w:tr></w:tbl>`;
  b += p(r('Tabela e7')) + `<w:tbl><w:tblPr><w:tblW ${W(6000)}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${tw(4000)}</w:tcPr>${p(r('e7a'))}${innerAuto}${p(r('e7z'))}</w:tc><w:tc><w:tcPr>${tw(2000)}</w:tcPr>${p(r('e7b'))}</w:tc></w:tr></w:tbl>`;
  const innerInd = `<w:tbl><w:tblPr><w:tblW ${W(2000)}/><w:tblInd ${W(300)}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="1000"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${tw(1000)}</w:tcPr>${p(r('n5'))}</w:tc><w:tc><w:tcPr>${tw(1000)}</w:tcPr>${p('')}${p(r('n6'))}</w:tc></w:tr></w:tbl>`;
  b += p(r('Tabela e8')) + `<w:tbl><w:tblPr><w:tblW ${W(6000)}/>${bdr(4)}</w:tblPr><w:tblGrid><w:gridCol w:w="4000"/><w:gridCol w:w="2000"/></w:tblGrid><w:tr>`
    + `<w:tc><w:tcPr>${tw(4000)}</w:tcPr>${p(r('e8a'))}${innerInd}${p(r('e8z'))}</w:tc><w:tc><w:tcPr>${tw(2000)}</w:tcPr>${p(r('e8b'))}</w:tc></w:tr></w:tbl>`;
  return b;
}

// F — quem encolhe primeiro (colunas automáticas × tcW dxa × pct), mínimo maior que a
// fração em pct, soma dos mínimos acima do tblW, tabela automática com recuo
function groupF() {
  let b = '';
  const pctW = (ws) => (k) => tw(ws[k], 'pct');
  b += tbl({ t: 'f1', grid: [1000, 1000, 1000, 2000], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctW([1000, 1000, 1000, 2000]), content: [LW, '', '', ''] });
  b += tbl({ t: 'f2', grid: [1500, 1500, 1500, 1500], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctW([1000, 1500, 2000, 1500]) });
  b += tbl({ t: 'f3', grid: [1000, 1000, 3000], tblW: `<w:tblW ${W(6000)}/>`, tcW: pctW([1000, 1000, 3000]), content: [LW, '', ''] });
  b += tbl({ t: 'f4', grid: [3000, 3000, 3000], tblW: tblAuto, tcW: (k) => (k === 0 ? autoW() : tw(3000)), content: [LONG, '', ''] });
  b += tbl({ t: 'f5', grid: [3000, 3000, 3000], tblW: `<w:tblW ${W(8000)}/>`, tcW: (k) => (k === 0 ? autoW() : tw(3000)), content: [LONG, '', ''] });
  b += tbl({ t: 'f6', grid: [1000, 1000], tblW: `<w:tblW ${W(2000)}/>`, tcW: dxa([1000, 1000]), content: [LW, LW] });
  b += tbl({ t: 'f7', grid: [3000, 3000], tblW: tblAuto, tcW: autoW, content: ['curto', LONG], extra: `<w:tblInd ${W(1000)}/>` });
  b += tbl({ t: 'f8', grid: [500, 1000, 3500], tblW: `<w:tblW ${W(5000, 'pct')}/>`, tcW: pctW([500, 1000, 3500]), content: [LW, '', ''] });
  b += tbl({ t: 'f9', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(6000)}/>`, tcW: (k) => (k === 0 ? tw(1000, 'pct') : k === 1 ? tw(3000) : autoW()), content: ['', '', LONG] });
  b += tbl({ t: 'f10', grid: [4000, 4000, 4000], tblW: `<w:tblW ${W(6000)}/>`, tcW: (k) => (k === 0 ? tw(2500, 'pct') : tw(3000)), content: ['', SENT, ''] });
  return b;
}

// G — imagem inline mais larga que a célula (autoajuste): a coluna cresce?
function groupG() {
  let b = '';
  b += tbl({ t: 'g1', grid: [1000, 1000, 1000], tblW: tblAuto, tcW: dxa(), content: ['', 'IMG', ''] });
  b += tbl({ t: 'g2', grid: [2000, 2000, 2000], tblW: `<w:tblW ${W(6000)}/>`, tcW: dxa(), content: ['', 'IMG', ''] });
  b += tbl({ t: 'g3', grid: [2000, 2000, 2000], tblW: tblAuto, tcW: autoW, content: ['curto', 'IMG', ''] });
  b += tbl({ t: 'g4', grid: [1000, 1000, 1000], tblW: tblAuto, tcW: dxa(), content: ['', 'IMG', ''], extra: '<w:tblLayout w:type="fixed"/>' });
  return b.replaceAll(r('IMG'), inlineImage(1, 100, 30));
}
// H — gridBefore/gridAfter sem wBefore/wAfter (coluna sem célula): largura e centralização
function rowsGb(t, grid, tblPr, rows) {
  const tr = ([gb, ga, cells]) => `<w:tr>${gb || ga ? `<w:trPr>${gb ? `<w:gridBefore w:val="${gb}"/>` : ''}${ga ? `<w:gridAfter w:val="${ga}"/>` : ''}</w:trPr>` : ''}${cells.map(([w, txt], k) => `<w:tc><w:tcPr><w:tcW ${W(w)}/></w:tcPr>${p('').repeat(k)}${p(r(txt))}</w:tc>`).join('')}</w:tr>`;
  return p(r(`Tabela ${t}`)) + `<w:tbl><w:tblPr>${tblPr}${bdr(4)}</w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join('')}</w:tblGrid>${rows.map(tr).join('')}</w:tbl>`;
}
function groupH() {
  let b = '';
  const cells = [[1000, 'X1'], [1000, 'X2'], [1000, 'X3']];
  b += rowsGb('h1', [3000, 1000, 1000, 1000], `<w:tblW ${W(6000)}/><w:tblLayout w:type="fixed"/>`, [[1, 0, cells.map(([w, x]) => [w, 'h1' + x])]]);
  b += rowsGb('h2', [3000, 1000, 1000, 1000], `<w:tblW ${W(6000)}/><w:tblLayout w:type="fixed"/><w:jc w:val="center"/>`, [[1, 0, cells.map(([w, x]) => [w, 'h2' + x])]]);
  b += rowsGb('h3', [3000, 1000, 1000, 1000], `<w:tblW ${W(6000)}/>`, [[1, 0, cells.map(([w, x]) => [w, 'h3' + x])]]);
  b += rowsGb('h4', [3000, 1000, 1000, 1000], tblAuto, [[1, 0, cells.map(([w, x]) => [w, 'h4' + x])]]);
  b += rowsGb('h5', [1000, 1000, 1000, 3000], `<w:tblW ${W(6000)}/><w:tblLayout w:type="fixed"/>`, [[0, 1, cells.map(([w, x]) => [w, 'h5' + x])]]);
  b += rowsGb('h6', [3000, 1000, 1000, 1000], `<w:tblW ${W(6000)}/><w:tblLayout w:type="fixed"/>`, [[1, 0, cells.map(([w, x]) => [w, 'h6' + x])], [0, 0, [[3000, 'h6Y0'], ...cells.map(([w, x]) => [w, 'h6Y' + x])]]]);
  return b;
}
const media = { 'image1.png': solidPng(20, 20, [200, 30, 30]) };

export const cases = [];
const defaults = docDefaults({ font: 'Arial', size: 9 });
for (const [g, fn, modes] of [['a', groupA, [11, 14, 15]], ['b', groupB, [11, 15]], ['c', groupC, [11, 15]], ['d', groupD, [11, 15]], ['e', groupE, [11, 15]], ['f', groupF, [11, 15]], ['g', groupG, [11, 15]], ['h', groupH, [11, 15]]]) {
  for (const compat of modes) {
    const body = p(r('Inicio Hxg')) + fn() + p(r('Fim Hxg'));
    cases.push({ name: `tblw-${g}-c${compat}`, docx: buildDocx({ body, compat, defaults, ...(g === 'g' ? { media } : {}) }) });
  }
}
