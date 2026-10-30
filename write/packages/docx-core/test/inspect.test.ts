import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RUN_PROPS,
  documentCustomInlines,
  documentIsEmpty,
  documentLinks,
  type Block,
  type Paragraph,
  type Run,
  type TableBlock,
} from '../src/index.js';

const run = (text: string, extra: Partial<Run> = {}, link?: string): Run => ({
  text,
  props: { ...DEFAULT_RUN_PROPS, ...(link ? { link } : {}) },
  ...extra,
});
const para = (...runs: Run[]): Paragraph => ({ runs, props: {} });
const p = (...runs: Run[]): Block => ({ type: 'paragraph', paragraph: para(...runs) });
const table = (...cells: Paragraph[][]): TableBlock => ({
  type: 'table',
  gridColsTwips: cells.map(() => 1000),
  rows: [{ cells: cells.map((paragraphs) => ({ paragraphs, tables: [], gridSpan: 1 })) }],
});
const tag = (name: string): Run => run('FFFC', { custom: { type: 'acme.tag', data: { name }, fallbackText: `@${name}` } });

describe('documentIsEmpty', () => {
  it('documento só com parágrafos vazios ou de espaços é vazio', () => {
    expect(documentIsEmpty([p(), p(run('   \t')), p(run(''))])).toBe(true);
    expect(documentIsEmpty([])).toBe(true);
  });

  it('texto, tabela, imagem, inline de plugin ou nota tornam o documento não vazio', () => {
    expect(documentIsEmpty([p(), p(run('a'))])).toBe(false);
    expect(documentIsEmpty([p(), table([para()])])).toBe(false);
    expect(documentIsEmpty([p(run('FFFC', { image: { rId: 'rId9', widthEmu: 1, heightEmu: 1 } as never }))])).toBe(false);
    expect(documentIsEmpty([p(tag('nome'))])).toBe(false);
    expect(documentIsEmpty([p(run('FFFC', { noteRef: { kind: 'footnote', id: 1 } }))])).toBe(false);
  });

  it('caixa de texto conta pelo conteúdo dela', () => {
    const textbox = (blocks: Block[]): Run => run('FFFC', { textbox: { blocks } as never });
    expect(documentIsEmpty([p(textbox([p()]))])).toBe(true);
    expect(documentIsEmpty([p(textbox([p(run('x'))]))])).toBe(false);
  });
});

describe('documentLinks', () => {
  it('junta runs vizinhos do mesmo link e separa endereço externo de âncora', () => {
    const links = documentLinks([
      p(run('Veja '), run('o ', {}, 'https://a.test/x'), run('site', {}, 'https://a.test/x'), run(' e '), run('aqui', {}, '#cap1')),
    ]);
    expect(links).toEqual([
      { address: 'https://a.test/x', text: 'o site' },
      { anchor: 'cap1', text: 'aqui' },
    ]);
  });

  it('procura dentro de tabelas (inclusive aninhadas) e caixas de texto', () => {
    const inner = table([para(run('n', {}, 'mailto:a@b.test'))]);
    const outer: TableBlock = {
      ...table([para(run('c', {}, 'https://c.test'))]),
    };
    outer.rows[0]!.cells[0]!.tables = [inner];
    outer.rows[0]!.cells[0]!.blocks = [{ type: 'paragraph', paragraph: outer.rows[0]!.cells[0]!.paragraphs[0]! }, inner];
    const links = documentLinks([outer, p(run('FFFC', { textbox: { blocks: [p(run('t', {}, 'https://t.test'))] } as never }))]);
    expect(links.map((l) => l.address)).toEqual(['https://c.test', 'mailto:a@b.test', 'https://t.test']);
  });

  it('o mesmo endereço em parágrafos diferentes são dois links', () => {
    expect(documentLinks([p(run('a', {}, 'https://x.test')), p(run('b', {}, 'https://x.test'))])).toHaveLength(2);
  });
});

describe('documentCustomInlines', () => {
  it('lista os inlines de plugin na ordem do documento, com filtro por tipo', () => {
    const blocks = [
      p(tag('nome'), run(' e '), run('FFFC', { custom: { type: 'acme.link', data: { id: 7 }, fallbackText: 'Doc' } })),
      table([para(tag('email'))]),
    ];
    expect(documentCustomInlines(blocks).map((c) => c.type)).toEqual(['acme.tag', 'acme.link', 'acme.tag']);
    expect(documentCustomInlines(blocks, 'acme.tag')).toEqual([
      { type: 'acme.tag', data: { name: 'nome' }, fallbackText: '@nome' },
      { type: 'acme.tag', data: { name: 'email' }, fallbackText: '@email' },
    ]);
  });
});
