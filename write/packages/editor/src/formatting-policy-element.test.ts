// Política de formatação no <universal-write> de verdade (DOM falso, fontes
// abertas do demo): a API e os atalhos recusam, galerias e barras escondem, o
// colar converte (interno, HTML do Word, texto), o que já está no documento
// fica, e arquivos soltos passam primeiro pelo hospedeiro (uw-file-drop).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blankDocxPackage, DocxPackage, type Paragraph, type RunProps } from '@universal-office/docx-core';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { MiniDOMParser } from '../../../test-support/mini-html.js';
import type { UniversalWriteElement as Editor } from './universal-write.js';
import type { UniversalWriteFontAsset } from './plugins.js';
import { TEMPLATE_DOCUMENT_POLICY, type FormattingPolicy } from './formatting-policy.js';

const FONTS = join(__dirname, '..', 'demo', 'fonts');
const VARIANTS = { regular: 'regular', bold: 'bold', italic: 'italic', boldItalic: 'bolditalic' } as const;
const FONT_ASSETS: UniversalWriteFontAsset[] = Object.entries(VARIANTS).map(([variant, file]) => ({
  family: 'Liberation Sans', variant: variant as UniversalWriteFontAsset['variant'],
  data: new Uint8Array(readFileSync(join(FONTS, `liberationsans-${file}.ttf`))),
}));

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const style = (id: string, name: string, extra = ''): string =>
  `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:qFormat/>${extra}</w:style>`;
/** folha com ids em português (como o Word pt-BR grava) */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}>`
  + '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
  + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
  + style('Ttulo1', 'heading 1', '<w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr>')
  + style('Ttulo2', 'heading 2', '<w:pPr><w:outlineLvl w:val="1"/></w:pPr>')
  + style('Ttulo3', 'heading 3', '<w:pPr><w:outlineLvl w:val="2"/></w:pPr>')
  + style('Ttulo5', 'heading 5', '<w:pPr><w:outlineLvl w:val="4"/></w:pPr>')
  + style('Citao', 'Quote', '<w:rPr><w:i/></w:rPr>')
  + style('Ttulo', 'Title', '<w:rPr><w:sz w:val="56"/></w:rPr>')
  + '</w:styles>';
const p = (inner: string, pPr = ''): string => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${inner}</w:p>`;
const r = (t: string, rPr = ''): string => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;

function docx(body: string): Uint8Array {
  const pkg = blankDocxPackage();
  pkg.setPartText('word/styles.xml', STYLES);
  pkg.setPartText('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}`
    + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return pkg.save();
}

/** documento "fora da política": Título 5, fonte e tamanho, espaçamento, borda, citação */
const RICH = docx(
  p(r('Cinco'), '<w:pStyle w:val="Ttulo5"/>')
  + p(r('Arial grande', '<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="40"/><w:vertAlign w:val="superscript"/>'),
    '<w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr><w:spacing w:before="480" w:after="240" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>')
  + p(r('Citação'), '<w:pStyle w:val="Citao"/>')
  + p(r('Fim')),
);
const PLAIN = docx(p(r('Olá mundo')) + p(r('Segunda linha')));

let dom: FakeDom;
let Ctor: typeof Editor;
let ed: Editor;

type Internals = {
  model: { paragraphs: Paragraph[] };
  extractSelection(): { text: string } & Record<string, unknown>;
  numbering: { level(numId: number, ilvl: number): { numFmt: string } | undefined };
  tableAnchors: unknown[];
};
const I = (): Internals => ed as unknown as Internals;
const paras = (): Paragraph[] => I().model.paragraphs;
const textOf = (q: Paragraph): string => q.runs.map((x) => x.text).join('');
const para = (t: string): Paragraph => paras().find((q) => textOf(q).includes(t))!;
const runOf = (t: string): RunProps => paras().flatMap((q) => q.runs).find((x) => x.text.includes(t))!.props;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  vi.stubGlobal('DOMParser', MiniDOMParser);
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
});
afterEach(() => {
  (ed as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

describe('formattingPolicy: propriedade e atributo', () => {
  it('atributo com o nome do preset; a propriedade manda depois de definida; null desliga; avisa a troca', () => {
    expect(ed.formattingPolicy).toBeNull();
    ed.setAttribute('formatting-policy', 'template-document');
    expect(ed.formattingPolicy).toBe(TEMPLATE_DOCUMENT_POLICY);
    const seen: unknown[] = [];
    ed.addEventListener('uw-formatting-policy-change', (e) => seen.push((e as CustomEvent<{ policy: unknown }>).detail.policy));
    const custom: FormattingPolicy = { font: false };
    ed.formattingPolicy = custom;
    expect(ed.formattingPolicy).toBe(custom);
    ed.formattingPolicy = null;
    expect(ed.formattingPolicy).toBeNull();
    expect(ed.resolvedFormattingPolicy()).toBeNull();
    expect(seen).toEqual([custom, null]);
  });
});

describe('API e atalhos fora da política não têm efeito', () => {
  beforeEach(() => {
    ed.load(PLAIN);
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 3 });
  });

  it('fonte, tamanho, sobrescrito, sublinhado duplo, espaçamento e bordas: recusados; negrito, cor e alinhamento: aplicados', () => {
    ed.setFontFamily('Arial');
    ed.setFontSize(20);
    ed.toggleVertAlign('superscript');
    ed.toggleUnderline('double');
    ed.setLineSpacing(480);
    ed.toggleBorder();
    expect(runOf('Olá').fontAscii).toBeUndefined();
    expect(runOf('Olá').szHalfPt).toBeUndefined();
    expect(runOf('Olá').vertAlign).toBeUndefined();
    expect(runOf('Olá').underline).toBe(false);
    expect(paras()[0]!.props.lineTwentieths).toBeUndefined();
    expect(paras()[0]!.props.borders).toBeUndefined();
    ed.toggleRunProp('bold');
    ed.setColor('FF0000');
    ed.setAlignment('center');
    expect(runOf('Olá')).toMatchObject({ bold: true, color: 'FF0000' });
    expect(paras()[0]!.props.alignment).toBe('center');
  });

  it('Ctrl+B passa; Ctrl+Shift+D (sublinhado duplo) e Ctrl+Shift+A (maiúsculas) não', () => {
    const input = (ed as unknown as { input: EventTarget }).input;
    const key = (k: string, code: string, shift = false): void => {
      const e = Object.assign(new Event('keydown', { cancelable: true }), { key: k, code, ctrlKey: true, metaKey: false, shiftKey: shift, altKey: false, repeat: false });
      input.dispatchEvent(e);
    };
    key('b', 'KeyB');
    key('D', 'KeyD', true);
    key('A', 'KeyA', true);
    expect(runOf('Olá')).toMatchObject({ bold: true, underline: false, allCaps: false });
  });

  it('estilos: Título 1 entra; Título 5 e Citação não (nem pelo id em português)', () => {
    ed.load(RICH);
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 3, offset: 0 });
    ed.applyStyle('Ttulo5');
    expect(paras()[3]!.props.styleId).toBeUndefined();
    ed.applyStyle('Citao');
    expect(paras()[3]!.props.styleId).toBeUndefined();
    ed.applyStyle('Ttulo1');
    expect(paras()[3]!.props.styleId).toBe('Ttulo1');
  });

  it('listas: só o formato padrão; a galeria e vários níveis recusados; o nível para no limite', () => {
    ed.formattingPolicy = { ...TEMPLATE_DOCUMENT_POLICY, lists: { kinds: ['bullet', 'decimal'], levels: 2 } };
    ed.applyListLibrary('number', 2); // romanos: fora
    expect(paras()[0]!.props.numbering).toBeUndefined();
    ed.toggleList('decimal');
    const n = paras()[0]!.props.numbering!;
    expect(I().numbering.level(n.numId!, 0)!.numFmt).toBe('decimal');
    ed.indent(1);
    ed.indent(1);
    ed.indent(1);
    expect(paras()[0]!.props.numbering!.ilvl).toBe(1);
  });
});

describe('galerias e menus: só os estilos permitidos; o documento fica como está', () => {
  it('listStyles/paragraphStyles filtrados (o "all" não); salvar sem mudança devolve o mesmo document.xml', async () => {
    ed.load(RICH);
    const before = DocxPackage.load(await ed.save('docx') as Uint8Array).getPartText('word/document.xml');
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.load(RICH);
    const ids = ed.paragraphStyles().map((s) => s.id);
    expect(ids).toContain('Ttulo1');
    expect(ids).not.toContain('Ttulo5');
    expect(ids).not.toContain('Citao');
    expect(ed.listStyles('gallery').every((s) => ['normal', 'heading1', 'heading2', 'heading3', 'title', 'subtitle'].includes(s.rawName.toLowerCase().replace(/\s+/g, '')))).toBe(true);
    expect(ed.listStyles('all').some((s) => s.id === 'Ttulo5')).toBe(true);
    // carregar não filtra nada: o Título 5, a fonte, o espaçamento e a borda continuam
    expect(paras()[0]!.props.styleId).toBe('Ttulo5');
    expect(runOf('Arial').fontAscii).toBe('Arial');
    expect(paras()[1]!.props.borders?.top).toBeDefined();
    const after = DocxPackage.load(await ed.save('docx') as Uint8Array).getPartText('word/document.xml');
    expect(after).toBe(before);
  });
});

describe('colar sob a política', () => {
  /** copia um trecho do RICH (sem política) e cola num documento com a política */
  function copyRich(from: { para: number; offset: number }, to: { para: number; offset: number }): ReturnType<Internals['extractSelection']> {
    ed.load(RICH);
    ed.setSelection(from, to);
    return I().extractSelection();
  }

  it('interno: Título 5 → Título 3, Citação → Normal; fonte, tamanho, sobrescrito, espaçamento e borda saem; negrito e alinhamento ficam', () => {
    const clip = copyRich({ para: 0, offset: 0 }, { para: 3, offset: 0 });
    ed.load(PLAIN);
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    expect(para('Cinco').props.styleId).toBe('Ttulo3');
    expect(para('Citação').props.styleId).toBeUndefined();
    const big = para('Arial grande');
    expect(big.props.borders).toBeUndefined();
    expect(big.props.spaceBeforeTwips).toBeUndefined();
    expect(big.props.lineTwentieths).toBeUndefined();
    expect(big.props.alignment).toBe('center');
    expect(runOf('Arial grande')).toMatchObject({ bold: true });
    expect(runOf('Arial grande').fontAscii).toBeUndefined();
    expect(runOf('Arial grande').szHalfPt).toBeUndefined();
    expect(runOf('Arial grande').vertAlign).toBeUndefined();
  });

  it('sem política, o mesmo colar mantém tudo (Manter Formatação Original)', () => {
    const clip = copyRich({ para: 0, offset: 0 }, { para: 3, offset: 0 });
    ed.load(PLAIN);
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    expect(para('Cinco').props.styleId).toBe('Ttulo5');
    expect(runOf('Arial grande').fontAscii).toBe('Arial');
  });

  it('lista de outro formato (romanos) vira numerada padrão', () => {
    ed.load(PLAIN);
    ed.setSelection({ para: 0, offset: 0 }, { para: 1, offset: 3 });
    ed.applyListLibrary('number', 2);
    expect(I().numbering.level(paras()[0]!.props.numbering!.numId!, 0)!.numFmt).toBe('upperRoman');
    ed.setSelection({ para: 0, offset: 0 }, { para: 1, offset: 0 });
    const clip = I().extractSelection();
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never }, 'keep');
    const pasted = paras().filter((q) => textOf(q) === 'Olá mundo');
    expect(pasted).toHaveLength(2);
    const n = pasted[1]!.props.numbering!;
    expect(I().numbering.level(n.numId!, 0)!.numFmt).toBe('decimal');
  });

  it('HTML do Word: Título → Title, h5 → Título 3, lista com marcador e numerada sem o marcador como texto, fonte fora', () => {
    ed.load(PLAIN);
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 1, offset: 0 });
    const html = '<style>@list l0:level1 {mso-level-number-format:bullet;} @list l1:level1 {mso-level-number-format:roman-lower;}</style><!--StartFragment-->'
      + '<p class=MsoTitle>Política</p><h5>Cinco</h5>'
      + "<p style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>·<span> </span></span><![endif]><span style='font-family:\"Comic Sans MS\";font-size:20pt'>Item A</span></p>"
      + "<p style='mso-list:l1 level1 lfo2'><![if !supportLists]><span style='mso-list:Ignore'>i.<span> </span></span><![endif]>Item B</p>"
      + '<p style="margin-top:30pt;line-height:200%;border:1px solid">Corpo <sup>2</sup></p><!--EndFragment-->';
    ed.pasteData({ text: '', html });
    expect(para('Política').props.styleId).toBe('Ttulo');
    expect(para('Cinco').props.styleId).toBe('Ttulo3');
    const a = para('Item A'), b = para('Item B');
    expect(textOf(a)).toBe('Item A');
    expect(I().numbering.level(a.props.numbering!.numId!, 0)!.numFmt).toBe('bullet');
    expect(I().numbering.level(b.props.numbering!.numId!, 0)!.numFmt).toBe('decimal');
    expect(runOf('Item A').fontAscii).toBeUndefined();
    expect(runOf('Item A').szHalfPt).toBeUndefined();
    const corpo = para('Corpo');
    expect(corpo.props.styleId).toBeUndefined(); // Normal (Web) não é permitido: Normal
    expect(corpo.props.spaceBeforeTwips).toBeUndefined();
    expect(runOf('2').vertAlign).toBeUndefined();
  });

  it('tabela copiada: com tabelas permitidas entra tabela (células pela política); sem, as células viram parágrafos', () => {
    const TABLE = docx(p(r('Antes'))
      + '<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="2000"/><w:gridCol w:w="2000"/></w:tblGrid>'
      + `<w:tr><w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r('Célula A', '<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="40"/>'), '<w:pStyle w:val="Ttulo5"/>')}</w:tc>`
      + `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>${p(r('Célula B'))}</w:tc></w:tr></w:tbl>`
      + p(r('Depois')));
    const copyTable = (): ReturnType<Internals['extractSelection']> => {
      ed.load(TABLE);
      ed.setSelection({ para: 0, offset: 0 }, { para: 1, offset: 0 });
      return I().extractSelection();
    };
    let clip = copyTable();
    expect((clip as { tables?: unknown[] }).tables).toHaveLength(1);
    ed.load(PLAIN);
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    const anchors = I().tableAnchors as { table: { rows: { cells: { paragraphs: Paragraph[] }[] }[] } }[];
    expect(anchors).toHaveLength(1);
    const a = anchors[0]!.table.rows[0]!.cells[0]!.paragraphs[0]!;
    expect(a.props.styleId).toBe('Ttulo3');
    expect(a.runs[0]!.props.fontAscii).toBeUndefined();
    expect(a.runs[0]!.props.szHalfPt).toBeUndefined();

    clip = copyTable();
    ed.load(PLAIN);
    ed.formattingPolicy = { ...TEMPLATE_DOCUMENT_POLICY, tables: false };
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    expect(I().tableAnchors).toHaveLength(0);
    expect(para('Célula A').props.styleId).toBe('Ttulo3');
    expect(textOf(para('Célula B'))).toBe('Célula B');
  });

  it('HTML com tabela no meio do texto sem tabelas permitidas: as células numa linha, por tabulação', () => {
    ed.load(PLAIN);
    ed.formattingPolicy = { ...TEMPLATE_DOCUMENT_POLICY, tables: false };
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: '', html: '<table><tr><td><span style="font-family:Arial">1</span></td><td>2</td></tr></table>' });
    expect(I().tableAnchors).toHaveLength(0);
    expect(paras().some((q) => textOf(q).includes('1	2'))).toBe(true);
    expect(runOf('1').fontAscii).toBeUndefined();
  });

  it('imagem colada não entra quando a política não permite imagens', async () => {
    ed.load(PLAIN);
    ed.formattingPolicy = { images: false };
    const spy = vi.spyOn(ed, 'insertImage');
    ed.pasteData({ text: '', image: { data: new Uint8Array([0x89, 0x50]), ext: 'png' } });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('inline de plugin (w:sdt) no colar', () => {
  const plugin = { id: 'acme', inlineRenderers: [{ type: 'acme.tag', toText: (d: unknown) => `@${(d as { label: string }).label}` }] };

  it('copiado deste editor continua inline (com ou sem política)', () => {
    ed.use(plugin);
    ed.load(PLAIN);
    ed.setSelection({ para: 0, offset: 0 });
    ed.insertCustomInline('acme.tag', { label: 'Nome' });
    ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 1 });
    const clip = I().extractSelection();
    ed.formattingPolicy = TEMPLATE_DOCUMENT_POLICY;
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    const customs = ed.getCustomInlines('acme.tag');
    expect(customs).toHaveLength(2);
    expect(customs[1]!.data).toEqual({ label: 'Nome' });
  });

  it('de outro documento sem o tipo registrado: fica o texto alternativo (como o Word)', () => {
    ed.use(plugin);
    ed.load(PLAIN);
    ed.setSelection({ para: 0, offset: 0 });
    ed.insertCustomInline('acme.tag', { label: 'Nome' });
    ed.setSelection({ para: 0, offset: 0 }, { para: 0, offset: 1 });
    const clip = { ...I().extractSelection(), doc: {} };
    ed.unuse('acme');
    ed.setSelection({ para: 1, offset: 0 });
    ed.pasteData({ text: clip.text, rich: clip as never });
    expect(ed.getCustomInlines('acme.tag')).toHaveLength(1);
    expect(textOf(paras()[1]!)).toContain('@Nome');
  });
});

describe('arquivos soltos: uw-file-drop antes de tudo; nofiledrop', () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  const file = (name: string, type: string): File => ({ name, type, arrayBuffer: async () => PNG.buffer.slice(0) }) as unknown as File;
  const drop = (files: File[]): Event => {
    const e = Object.assign(new Event('drop', { cancelable: true }), { dataTransfer: { types: ['Files'], files }, clientX: 0, clientY: 0 });
    ed.dispatchEvent(e);
    return e;
  };
  let later: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    ed.load(PLAIN);
    // o ouvinte das barras (abrir o .docx) vem depois do elemento
    later = vi.fn();
    ed.addEventListener('drop', later);
  });

  it('o hospedeiro recebe os arquivos e, cancelando, o editor não faz nada', () => {
    const spy = vi.spyOn(ed, 'insertImage');
    const seen: File[][] = [];
    ed.addEventListener('uw-file-drop', (e) => { seen.push((e as CustomEvent<{ files: File[] }>).detail.files); e.preventDefault(); });
    const doc = file('novo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const ev = drop([doc]);
    expect(seen).toEqual([[doc]]);
    expect(ev.defaultPrevented).toBe(true);
    expect(later).not.toHaveBeenCalled();
    drop([file('a.png', 'image/png')]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('nofiledrop: o evento chega ao hospedeiro, mas o editor não abre nem insere', () => {
    ed.setAttribute('nofiledrop', '');
    expect(ed.fileDropDisabled).toBe(true);
    const spy = vi.spyOn(ed, 'insertImage');
    const host = vi.fn();
    ed.addEventListener('uw-file-drop', host);
    drop([file('a.png', 'image/png')]);
    drop([file('b.docx', '')]);
    expect(host).toHaveBeenCalledTimes(2);
    expect(spy).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
  });

  it('sem cancelar: imagem entra no texto (se a política permite imagens); outro arquivo segue para as barras', async () => {
    const spy = vi.spyOn(ed, 'insertImage').mockResolvedValue(undefined);
    drop([file('a.png', 'image/png')]);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]![1]).toBe('png');
    expect(later).not.toHaveBeenCalled();
    drop([file('b.docx', '')]);
    expect(later).toHaveBeenCalledTimes(1);
    ed.formattingPolicy = { images: false };
    drop([file('c.png', 'image/png')]);
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
