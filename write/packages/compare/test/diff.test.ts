import { describe, expect, it } from 'vitest';
import { diffBlocks } from '../src/index.js';
import { bytes, doc, imageRun, para, run, table } from './helpers.js';

const kinds = (d: ReturnType<typeof diffBlocks>) => d.edits.map((e) => e.kind);

describe('diffBlocks — parágrafos', () => {
  it('documentos idênticos produzem um único edit equal', () => {
    const a = doc(para('Um'), para('Dois'), para('Três'));
    const b = doc(para('Um'), para('Dois'), para('Três'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal']);
    expect(d.stats).toEqual({ inserted: 0, deleted: 0, changed: 0, formatOnly: 0, equal: 3 });
  });

  it('parágrafo inserido vira insert ancorado no lugar certo', () => {
    const a = doc(para('Um'), para('Três'));
    const b = doc(para('Um'), para('Dois'), para('Três'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'insert', 'equal']);
    const ins = d.edits[1]!;
    // Convenção OpenCompare: range A vazio, ancorado após o bloco 1.
    expect(ins.a).toEqual({ start: 2, end: 1 });
    expect(ins.b).toEqual({ start: 2, end: 2 });
    expect(ins.bBlocks).toEqual([1]);
    expect(d.stats.inserted).toBe(1);
  });

  it('parágrafo removido vira delete', () => {
    const a = doc(para('Um'), para('Dois'), para('Três'));
    const b = doc(para('Um'), para('Três'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'delete', 'equal']);
    const del = d.edits[1]!;
    expect(del.a).toEqual({ start: 2, end: 2 });
    expect(del.b).toEqual({ start: 2, end: 1 });
    expect(d.stats.deleted).toBe(1);
  });

  it('texto alterado vira change com marcas intra por palavra', () => {
    const a = doc(para('a rápida raposa marrom'), para('fim'));
    const b = doc(para('a lenta raposa cinzenta'), para('fim'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['change', 'equal']);
    const ch = d.edits[0]!;
    expect(ch.formatOnly).toBeUndefined();
    expect(ch.intra).toBeDefined();
    const dels = ch.intra!.filter((m) => m.kind === 'delete');
    const inss = ch.intra!.filter((m) => m.kind === 'insert');
    // 'rápida' e 'marrom' removidos; 'lenta' e 'cinzenta' inseridos.
    expect(dels.map((m) => 'a rápida raposa marrom'.slice(m.startCh, m.endCh)))
      .toEqual(['rápida', 'marrom']);
    expect(inss.map((m) => 'a lenta raposa cinzenta'.slice(m.startCh, m.endCh)))
      .toEqual(['lenta', 'cinzenta']);
  });

  it('mudança só de formatação vira change formatOnly minor sem quebrar alinhamento', () => {
    const a = doc(para('Um'), para([run('Dois')]), para('Três'));
    const b = doc(para('Um'), para([run('Dois', { bold: true })]), para('Três'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'change', 'equal']);
    const ch = d.edits[1]!;
    expect(ch.formatOnly).toBe(true);
    expect(ch.importance).toBe('minor');
    expect(d.stats.formatOnly).toBe(1);
    expect(d.stats.changed).toBe(0);
  });

  it('mesma formatação dividida em mais runs NÃO é mudança', () => {
    const a = doc(para([run('Dois juntos')]));
    const b = doc(para([run('Dois '), run('juntos')]));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal']);
  });

  it('mudança de props de parágrafo (alinhamento) é formatOnly', () => {
    const a = doc(para('Título'));
    const b = doc(para([run('Título')], { alignment: 'center' }));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBe(true);
  });

  it('parágrafos duplicados alinham pela âncora rara (histogram)', () => {
    const a = doc(para(''), para('função um'), para(''), para('função dois'), para(''));
    const b = doc(para(''), para('função um'), para(''), para('nova função'), para(''), para('função dois'), para(''));
    const d = diffBlocks(a, b);
    // As duas funções (tokens únicos) devem permanecer alinhadas como equal.
    const equalBlocksA = d.edits.filter((e) => e.kind === 'equal').flatMap((e) => e.aBlocks);
    expect(equalBlocksA).toContain(1); // 'função um'
    expect(equalBlocksA).toContain(3); // 'função dois'
    expect(d.stats.inserted).toBe(2); // 'nova função' + um vazio
  });
});

describe('diffBlocks — imagens (byte a byte)', () => {
  const img1 = bytes(1, 2, 3, 4, 5);
  const img1Copy = bytes(1, 2, 3, 4, 5);
  const img2 = bytes(1, 2, 3, 4, 6); // último byte difere

  it('mesmos bytes (instâncias diferentes) comparam iguais', () => {
    const a = doc(para('antes'), para([imageRun(img1)]), para('depois'));
    const b = doc(para('antes'), para([imageRun(img1Copy)]), para('depois'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal']);
  });

  it('um byte diferente vira change', () => {
    const a = doc(para('antes'), para([imageRun(img1)]), para('depois'));
    const b = doc(para('antes'), para([imageRun(img2)]), para('depois'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'change', 'equal']);
    expect(d.edits[1]!.formatOnly).toBeUndefined();
    expect(d.stats.changed).toBe(1);
  });

  it('imagem redimensionada com bytes iguais é formatOnly', () => {
    const a = doc(para([imageRun(img1, { widthTwips: 2880, heightTwips: 1440 })]));
    const b = doc(para([imageRun(img1Copy, { widthTwips: 5760, heightTwips: 2880 })]));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBe(true);
  });

  it('imagem + texto ao redor: só o parágrafo da imagem muda', () => {
    const a = doc(para('x'), para([run('foto: '), imageRun(img1)]), para('y'));
    const b = doc(para('x'), para([run('foto: '), imageRun(img2)]), para('y'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'change', 'equal']);
  });
});

describe('diffBlocks — tabelas', () => {
  it('tabelas idênticas são equal', () => {
    const a = doc(table([['a', 'b'], ['c', 'd']]));
    const b = doc(table([['a', 'b'], ['c', 'd']]));
    expect(kinds(diffBlocks(a, b))).toEqual(['equal']);
  });

  it('linha inserida vira change com diff aninhado de linhas', () => {
    const a = doc(para('antes'), table([['a', 'b'], ['e', 'f']]));
    const b = doc(para('antes'), table([['a', 'b'], ['c', 'd'], ['e', 'f']]));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['equal', 'change']);
    const rows = d.edits[1]!.tableRows![0]!;
    expect(rows.map((r) => r.kind)).toEqual(['equal', 'insert', 'equal']);
    expect(rows[1]!.bRows).toEqual([1]);
  });

  it('célula alterada vira change de linha no diff aninhado', () => {
    const a = doc(table([['a', 'b'], ['c', 'd']]));
    const b = doc(table([['a', 'b'], ['c', 'MUDOU']]));
    const d = diffBlocks(a, b);
    const rows = d.edits[0]!.tableRows![0]!;
    expect(rows.map((r) => r.kind)).toEqual(['equal', 'change']);
    expect(rows[1]!.aRows).toEqual([1]);
    expect(rows[1]!.bRows).toEqual([1]);
  });

  it('shading de célula é formatOnly no nível de bloco', () => {
    const a = doc(table([['a']]));
    const t = table([['a']]);
    t.rows[0]!.cells[0]!.shadingHex = 'FFFF00';
    const d = diffBlocks(a, doc(t));
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBe(true);
  });
});

describe('diffBlocks — casos de borda', () => {
  it('A vazio → tudo insert', () => {
    const d = diffBlocks([], doc(para('a'), para('b')));
    expect(kinds(d)).toEqual(['insert']);
    expect(d.edits[0]!.a).toEqual({ start: 1, end: 0 });
    expect(d.stats.inserted).toBe(2);
  });

  it('B vazio → tudo delete', () => {
    const d = diffBlocks(doc(para('a')), []);
    expect(kinds(d)).toEqual(['delete']);
    expect(d.stats.deleted).toBe(1);
  });

  it('ambos vazios → sem edits', () => {
    const d = diffBlocks([], []);
    expect(d.edits).toEqual([]);
  });

  it('troca total (nenhum token comum) vira um único change sem intra', () => {
    const a = doc(para('completamente diferente'));
    const b = doc(para('outra coisa nova'));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.intra).toBeUndefined();
  });

  it('myers e histogram produzem scripts válidos para a mesma entrada', () => {
    const a = doc(para('um'), para('dois'), para('três'), para('quatro'));
    const b = doc(para('um'), para('DOIS'), para('três'), para('cinco'));
    for (const algorithm of ['myers', 'histogram'] as const) {
      const d = diffBlocks(a, b, { algorithm });
      // Cobertura: todos os blocos de A e B aparecem exatamente uma vez.
      const aCovered = d.edits.flatMap((e) => e.aBlocks);
      const bCovered = d.edits.flatMap((e) => e.bBlocks);
      expect(aCovered).toEqual([0, 1, 2, 3]);
      expect(bCovered).toEqual([0, 1, 2, 3]);
    }
  });

  it('parágrafo ↔ tabela com mesmo texto não colide', () => {
    const a = doc(para('a'));
    const b = doc(table([['a']]));
    const d = diffBlocks(a, b);
    expect(kinds(d)).toEqual(['change']);
    expect(d.edits[0]!.formatOnly).toBeUndefined();
  });
});
