/**
 * Árvore de Títulos (Painel de Navegação) e os pPr herdado/efetivo da régua.
 * Regras medidas no Word (write/tools/nav-lab: heading-rules.ps1 e o corpus —
 * run-headings.mjs, 140 de 141 documentos com a árvore idêntica).
 */
import { describe, it, expect } from 'vitest';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { documentOutline, inheritedPPr, effectivePPr } from '../src/index.js';
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
import { buildDocx, p, r } from '../../../tools/layout-oracle/docx-builder.mjs';

const style = (id: string, name: string, pPr = '', rPr = '', basedOn = 'Normal'): string =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="${basedOn}"/><w:pPr>${pPr}</w:pPr><w:rPr>${rPr}</w:rPr></w:style>`;
const STYLES = [
  // título interno SEM w:outlineLvl (gerado por biblioteca): o Word dá o nível pelo nome
  style('Heading1', 'Heading 1'),
  style('Ttulo2', 'heading 2', '<w:outlineLvl w:val="1"/>', '<w:caps/>'),
  // baseado em Título 2: herda o nível 2
  style('Derivado', 'Meu Título', '', '', 'Ttulo2'),
  // estilo próprio com nível de tópico
  style('Secao', 'Seção', '<w:outlineLvl w:val="2"/>'),
  style('Num', 'Numerado', '<w:numPr><w:numId w:val="1"/></w:numPr><w:outlineLvl w:val="0"/>'),
  style('Tabs', 'Tabs', '<w:tabs><w:tab w:val="left" w:pos="2000"/></w:tabs><w:ind w:left="720" w:firstLine="360"/>'),
].join('');
const NUMBERING = '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
const ps = (id: string, extra = ''): string => `<w:pStyle w:val="${id}"/>${extra}`;

const doc = (body: string) => readFullDocument(DocxPackage.load(buildDocx({ body, styles: STYLES, numbering: NUMBERING })));

describe('árvore de títulos como o Word', () => {
  it('níveis pelo nome do título interno, pelo estilo, direto e da lista; texto com numeração e maiúsculas', () => {
    const full = doc([
      p(r('Introdução'), ps('Heading1')),
      p(r('corpo')),
      p(r('Contexto'), ps('Ttulo2')),
      p(r('Derivado'), ps('Derivado')),
      p(r('Seção própria'), ps('Secao')),
      p(r('Direto'), '<w:outlineLvl w:val="3"/>'),
      p(r('Lista'), ps('Num')),
      p(r('Segunda'), ps('Num')),
    ].join(''));
    const h = documentOutline(full).map((x) => [x.level, x.text, x.number]);
    expect(h).toEqual([
      [1, 'Introdução', ''],
      [2, 'CONTEXTO', ''],
      [2, 'DERIVADO', ''],
      [3, 'Seção própria', ''],
      [4, 'Direto', ''],
      [1, '1. Lista', '1.'],
      [1, '2. Segunda', '2.'],
    ]);
  });

  it('nível direto num Título interno não muda nada (o Word trava o nível)', () => {
    const full = doc(p(r('Título'), ps('Heading1', '<w:outlineLvl w:val="5"/>')));
    expect(documentOutline(full)[0]!.level).toBe(1);
  });

  it('título vazio, em tabela ou excluído em revisão não entra', () => {
    const tbl = `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r('Na tabela'), ps('Heading1'))}</w:tc></w:tr></w:tbl>`;
    const full = doc([
      p('', ps('Heading1')),
      tbl,
      p(r('Só um objeto'), ps('Heading1')),
      p('<w:del w:id="1" w:author="a"><w:r><w:delText>Apagado</w:delText></w:r></w:del>', ps('Heading1')),
    ].join(''));
    expect(documentOutline(full).map((x) => x.text)).toEqual(['Só um objeto']);
  });

  it('a numeração conta também os parágrafos das tabelas (ordem do documento)', () => {
    const tbl = `<w:tbl><w:tblPr/><w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r('item'), ps('Num'))}</w:tc></w:tr></w:tbl>`;
    const full = doc(p(r('Um'), ps('Num')) + tbl + p(r('Três'), ps('Num')));
    expect(documentOutline(full).map((x) => x.text)).toEqual(['1. Um', '3. Três']);
  });
});

describe('pPr herdado × efetivo (régua)', () => {
  it('herdado = estilo (+ lista) sem o direto; efetivo = tudo', () => {
    const full = doc(p(r('a'), ps('Tabs', '<w:tabs><w:tab w:val="clear" w:pos="2000"/><w:tab w:val="center" w:pos="3000"/></w:tabs><w:ind w:left="1080"/>')));
    const para = (full.blocks[0] as { paragraph: import('@universal-office/docx-core').Paragraph }).paragraph;
    const fmt = full.formatting!;
    const inh = inheritedPPr(fmt, para);
    expect(inh.ind).toEqual({ left: 720, firstLine: 360 });
    expect(inh.tabs).toEqual([{ val: 'left', pos: 2000 }]);
    const eff = effectivePPr(fmt, para);
    expect(eff.ind).toEqual({ left: 1080, firstLine: 360 });
    expect(eff.tabs).toEqual([{ val: 'center', pos: 3000 }]);
  });
});
