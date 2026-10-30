// Estado sujo do <universal-write> (isDirty/setDirty/uw-dirty-change): o
// hospedeiro só manda o .docx quando isDirty() — falso negativo perde edição.
// Elemento de verdade sobre o DOM falso (write/test-support), fontes ABERTAS
// versionadas (Liberation Sans do demo): roda no CI.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blankDocxPackage } from '@universal-office/docx-core';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';

const FONTS = join(__dirname, '..', 'demo', 'fonts');
const VARIANTS = { regular: 'regular', bold: 'bold', italic: 'italic', boldItalic: 'bolditalic' } as const;
const FONT_ASSETS: UniversalWriteFontAsset[] = Object.entries(VARIANTS).map(([variant, file]) => ({
  family: 'Liberation Sans', variant: variant as UniversalWriteFontAsset['variant'],
  data: new Uint8Array(readFileSync(join(FONTS, `liberationsans-${file}.ttf`))),
}));

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const p = (inner: string, pPr = ''): string => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`;
const r = (t: string): string => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;
const cell = (inner: string): string => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
const begin = (instr: string): string =>
  `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>`;
const end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>';

/** .docx em branco (estilos do Word, ou só os dados) com o corpo dado. */
function docx(body: string, styles?: string): Uint8Array {
  const pkg = blankDocxPackage();
  if (styles) pkg.setPartText('word/styles.xml', styles);
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}`
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return pkg.save();
}

const PLAIN = docx(p(r('Olá mundo')));
/** tabela com fórmula de soma desatualizada (cache "0") */
const FORMULA = docx(p(r('Antes'))
  + '<w:tbl><w:tblPr><w:tblW w:w="2000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid>'
  + `<w:tr>${cell(p(r('1')))}</w:tr><w:tr>${cell(p(r('2')))}</w:tr><w:tr>${cell(p(begin('=SUM(ABOVE)') + r('0') + end))}</w:tr></w:tbl>`
  + p(r('Depois')));
/** sumário (como o Word grava: o campo atravessa parágrafos) cujo cache não tem o título */
const TOC = docx(p(begin('TOC \\o "1-3" \\h \\z \\u') + r('Velho')) + p(end)
  + p(r('Introdução'), '<w:pStyle w:val="Ttulo1"/><w:outlineLvl w:val="0"/>') + p(r('Texto')));
/** só o Normal no styles.xml: usar um estilo interno o acrescenta */
const ONLY_NORMAL = docx(p(r('Olá')), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>`
  + '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
  + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');

let dom: FakeDom;
let Ctor: typeof Editor;
let ed: Editor;
let events: boolean[];
const type = (text: string): void => (ed as unknown as { type(t: string): void }).type(text);

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  Ctor = (await import('./universal-write.js')).UniversalWriteElement;
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  ed = new Ctor();
  ed.setAttribute('manual-init', '');
  dom.document.body.appendChild(ed as unknown as FakeNode);
  await ed.initialize({ fonts: FONT_ASSETS });
  events = [];
  ed.addEventListener('uw-dirty-change', (e) => events.push((e as CustomEvent<{ dirty: boolean }>).detail.dirty));
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

describe('isDirty / setDirty / uw-dirty-change', () => {
  it('carregar deixa limpo; editar suja e avisa; setDirty(false) limpa e avisa; recarregar limpa', () => {
    ed.load(PLAIN);
    expect(ed.isDirty()).toBe(false);
    expect(events).toEqual([]);

    ed.setSelection({ para: 0, offset: 3 });
    type('!');
    expect(ed.isDirty()).toBe(true);
    expect(events).toEqual([true]);

    ed.setDirty(false);
    expect(ed.isDirty()).toBe(false);
    expect(events).toEqual([true, false]);

    type('?');
    expect(ed.isDirty()).toBe(true);
    ed.load(PLAIN);
    expect(ed.isDirty()).toBe(false);
    expect(events).toEqual([true, false, true, false]);
  });

  it('desfazer depois de salvar suja (o documento difere do salvo)', () => {
    ed.load(PLAIN);
    type('x');
    ed.setDirty(false);
    ed.undo();
    expect(ed.isDirty()).toBe(true);
  });

  it('atualizar campos com mudança suja sem uw-change; sem mudança fica limpo', () => {
    ed.load(FORMULA);
    const changes = vi.fn();
    ed.addEventListener('uw-change', changes);
    expect(ed.updateFields('all')).toBeGreaterThan(0);
    expect(ed.isDirty()).toBe(true);
    expect(changes).not.toHaveBeenCalled(); // atualizar campo não é edição para o autosave

    ed.setDirty(false);
    events.length = 0;
    expect(ed.updateFields('all')).toBe(0); // já atualizados
    expect(ed.isDirty()).toBe(false);
    // o passo descartado pode avisar true e logo false: o que vale é terminar limpo
    expect(events.at(-1) ?? false).toBe(false);
  });

  it('atualizar o sumário suja', () => {
    ed.load(TOC);
    expect(ed.isDirty()).toBe(false);
    expect(ed.updateToc('all')).toBe(true);
    expect(ed.isDirty()).toBe(true);
    expect(events).toEqual([true]);
  });

  it('a opção de fontes no arquivo suja (só quando muda)', () => {
    ed.load(PLAIN);
    const cur = ed.getFontEmbedding();
    ed.setFontEmbedding({ embed: cur.embed });
    expect(ed.isDirty()).toBe(false);
    ed.setFontEmbedding({ embed: !cur.embed });
    expect(ed.isDirty()).toBe(true);
    expect(events).toEqual([true]);
  });

  it('passo descartado sem mudança (Backspace no início do documento) não suja', () => {
    ed.load(PLAIN);
    ed.setSelection({ para: 0, offset: 0 });
    (ed as unknown as { pressBackspace(): void }).pressBackspace();
    expect(ed.isDirty()).toBe(false);
    expect(events.at(-1) ?? false).toBe(false);

    // já sujo antes: descartar o passo não limpa
    type('a');
    ed.setSelection({ para: 0, offset: 0 });
    (ed as unknown as { pressBackspace(): void }).pressBackspace();
    expect(ed.isDirty()).toBe(true);
  });

  it('estilo interno definido fora de um passo de desfazer suja', () => {
    ed.load(ONLY_NORMAL);
    ed.ensureBuiltinStyle('Quote');
    expect(ed.isDirty()).toBe(true);
  });
});
