// Política de formatação (modo "como o Quill" para documentos com modelo): o
// preset se comporta como um editor de texto rico leve; os ids ocultos, a
// conversão de estilos e a limpeza do colar são funções puras.
import { describe, expect, it } from 'vitest';
import { DEFAULT_RUN_PROPS, type ParaProps, type RunProps } from '@universal-office/docx-core';
import {
  POLICY_GUARDS, TEMPLATE_DOCUMENT_POLICY, nearestAllowedStyle, policyHiddenIds, policyList, policySplitsToPlain,
  resolvePolicy, sanitizeParaProps, sanitizeRunProps, styleKey, type StyleResolver,
} from './formatting-policy.js';

const rp = resolvePolicy(TEMPLATE_DOCUMENT_POLICY)!;
const styles: StyleResolver = {
  keyOf: (id) => styleKey(({ Ttulo1: 'heading 1', Ttulo5: 'heading 5', Citao: 'Quote', NormalWeb: 'Normal (Web)' } as Record<string, string>)[id] ?? id),
  idOf: (key) => ({ heading1: 'Ttulo1', heading2: 'Ttulo2', heading3: 'Ttulo3', title: 'Ttulo', subtitle: 'Subttulo' } as Record<string, string>)[key],
};

describe('preset TEMPLATE_DOCUMENT_POLICY (documento com modelo, como o Quill)', () => {
  it('estilos Normal, Título 1–3, Título e Subtítulo; listas marcador/numerada em 9 níveis', () => {
    expect([...rp.styles!]).toEqual(['normal', 'heading1', 'heading2', 'heading3', 'title', 'subtitle']);
    expect(rp.lists).toEqual({ bullet: true, decimal: true, levels: 9 });
    expect(rp.charStyles!.size).toBe(0);
  });

  it('caractere: negrito, itálico, sublinhado, tachado, cor, realce e link; sem fonte, tamanho, sobrescrito/subscrito', () => {
    for (const f of ['bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'link'] as const) expect(rp.char(f)).toBe(true);
    for (const f of ['superscript', 'subscript', 'underlineStyles', 'doubleStrike', 'caps', 'charSpacing', 'textEffects', 'hidden'] as const) expect(rp.char(f)).toBe(false);
    expect(rp.allows('font')).toBe(false);
    expect(rp.allows('fontSize')).toBe(false);
  });

  it('parágrafo: alinhamento e recuo em passos; sem espaçamento, bordas, sombreamento, tabulações; página é do modelo', () => {
    expect(rp.allows('alignment')).toBe(true);
    expect(rp.indentation).toBe('steps');
    for (const f of ['spacing', 'borders', 'shading', 'tabs', 'pageSetup', 'pageBackground', 'headersFooters', 'sectionBreaks', 'styleEditing', 'formatPainter', 'shapes', 'imageFormatting'] as const) {
      expect(rp.allows(f)).toBe(false);
    }
    for (const f of ['tables', 'columns', 'images', 'pageBreaks'] as const) expect(rp.allows(f)).toBe(true);
  });

  it('é imutável', () => {
    expect(Object.isFrozen(TEMPLATE_DOCUMENT_POLICY)).toBe(true);
    expect(Object.isFrozen(TEMPLATE_DOCUMENT_POLICY.paragraphStyles)).toBe(true);
  });

  it('sem política: nada muda', () => {
    expect(resolvePolicy(null)).toBeNull();
    expect(policyHiddenIds(null)).toEqual([]);
    const props = { ...DEFAULT_RUN_PROPS, fontAscii: 'Arial' };
    expect(sanitizeRunProps(props, null)).toBe(props);
  });

  it('política vazia ({}) permite tudo', () => {
    const all = resolvePolicy({})!;
    expect(policyHiddenIds(all)).toEqual([]);
    expect(all.char('superscript')).toBe(true);
    expect(all.styles).toBeNull();
  });
});

describe('policyHiddenIds: o que some das barras, menus, menu de contexto e atalhos', () => {
  const hidden = new Set(policyHiddenIds(rp));

  it('fonte, tamanho, sobrescrito/subscrito, espaçamento, bordas, sombreamento, página, cabeçalho e pincel', () => {
    for (const id of ['font:family', 'font:size', 'grow', 'shrink', 'dlg:font', 'sup', 'sub', 'spacing', 'pspacing', 'spacing:before',
      'home:borders', 'dlg:borders', 'shading', 'dlg:tabs', 'margins', 'orientation', 'pageSize', 'dlg:page', 'view:ruler',
      'watermark:menu', 'pageColor:menu', 'dlg:pageBorders', 'hf', 'hf:headerMenu', 'sectionbreak', 'painter', 'fx:menu',
      'charSpacing', 'allCaps', 'specialIndent', 'indent:left', 'dlg:paragraph', 'textbox:sub', 'shape-tools', 'image-tools', 'cover:menu']) {
      expect(hidden.has(id), id).toBe(true);
    }
  });

  it('estilos: só edição e atalhos de estilos fora da política somem (Título 1–3 ficam)', () => {
    for (const id of ['styles:pane', 'style:inspector', 'style:new', 'style:modify', 'styleTools', 'toc:menu', 'caption']) expect(hidden.has(id), id).toBe(true);
    for (const id of ['style:normal', 'style:h1', 'style:h2', 'style:h3']) expect(hidden.has(id), id).toBe(false);
    const h2only = new Set(policyHiddenIds(resolvePolicy({ paragraphStyles: ['Normal', 'Heading2'] })));
    expect(h2only.has('style:h1')).toBe(true);
    expect(h2only.has('style:h3')).toBe(true);
    expect(h2only.has('style:h2')).toBe(false);
  });

  it('listas: só os botões marcador e numerada (galerias, vários níveis e definir formato saem)', () => {
    for (const id of ['list:multi', 'list:bulletMenu', 'list:numberMenu', 'list:defineBullet', 'list:defineNumber', 'list:defineMultilevel', 'list:setValue']) {
      expect(hidden.has(id), id).toBe(true);
    }
    expect(hidden.has('list:bullet')).toBe(false);
    expect(hidden.has('list:decimal')).toBe(false);
    expect([...policySplitsToPlain(rp)].sort()).toEqual(['list:bullet', 'list:decimal', 'underline']);
    expect(policyHiddenIds(resolvePolicy({ lists: { kinds: ['bullet'] } }))).toContain('list:decimal');
  });

  it('o que o Quill tinha continua: negrito, itálico, sublinhado, tachado, cor, realce, link, alinhamento, recuo, imagem, tabela', () => {
    for (const id of ['bold', 'italic', 'underline', 'strike', 'color', 'highlight', 'link', 'align:left', 'align:center', 'align:right', 'align:both',
      'indent', 'outdent', 'image', 'table:menu', 'pagebreak', 'columns', 'clear']) {
      expect(hidden.has(id), id).toBe(false);
    }
  });
});

describe('estilos: chave e o permitido mais próximo', () => {
  it('chave sem caixa nem espaços: "heading 1" = Heading1', () => {
    expect(styleKey('heading 1')).toBe('heading1');
    expect(styleKey('Heading1')).toBe('heading1');
    expect(styleKey('Normal (Web)')).toBe('normal(web)');
  });

  it('Título 5–9 → o último título permitido; Título 2 sem ele → Título 1; Title → Título 1 sem Title; resto → Normal', () => {
    expect(nearestAllowedStyle(rp, 'heading5')).toBe('heading3');
    expect(nearestAllowedStyle(rp, 'heading9')).toBe('heading3');
    expect(nearestAllowedStyle(rp, 'heading2')).toBe('heading2');
    expect(nearestAllowedStyle(rp, 'title')).toBe('title');
    expect(nearestAllowedStyle(rp, 'quote')).toBeNull();
    expect(nearestAllowedStyle(rp, 'normal')).toBeNull();
    const p = resolvePolicy({ paragraphStyles: ['Normal', 'Heading1'] });
    expect(nearestAllowedStyle(p, 'heading2')).toBe('heading1');
    expect(nearestAllowedStyle(p, 'title')).toBe('heading1');
    expect(nearestAllowedStyle(p, 'subtitle')).toBeNull();
    expect(nearestAllowedStyle(resolvePolicy({ paragraphStyles: ['Normal'] }), 'heading4')).toBeNull();
  });
});

describe('sanitizeRunProps: o colar só leva a formatação de caractere permitida', () => {
  const src: RunProps = {
    ...DEFAULT_RUN_PROPS, bold: true, italic: true, underline: true, underlineStyle: 'double', strike: false, doubleStrike: true,
    fontAscii: 'Comic Sans MS', szHalfPt: 40, color: 'FF0000', highlight: 'yellow', vertAlign: 'superscript', allCaps: true,
    charSpacingTwips: 40, link: 'https://example.com', charStyle: 'Strong', hidden: true,
  };
  const out = sanitizeRunProps(src, rp);

  it('fica negrito, itálico, sublinhado simples, cor, realce e link', () => {
    expect(out).toMatchObject({ bold: true, italic: true, underline: true, color: 'FF0000', highlight: 'yellow', link: 'https://example.com' });
    expect(out.underlineStyle).toBeUndefined();
  });

  it('fonte, tamanho, sobrescrito, maiúsculas, espaçamento, oculto e estilo de caractere caem; tachado duplo vira simples', () => {
    expect(out.fontAscii).toBeUndefined();
    expect(out.szHalfPt).toBeUndefined();
    expect(out.vertAlign).toBeUndefined();
    expect(out.allCaps).toBe(false);
    expect(out.charSpacingTwips).toBeUndefined();
    expect(out.hidden).toBeUndefined();
    expect(out.charStyle).toBeUndefined();
    expect(out.doubleStrike).toBeUndefined();
    expect(out.strike).toBe(true);
  });

  it('o estilo Hyperlink acompanha o link; não muda o objeto de origem', () => {
    expect(sanitizeRunProps({ ...DEFAULT_RUN_PROPS, link: 'x', charStyle: 'Hyperlink' }, rp).charStyle).toBe('Hyperlink');
    expect(src.fontAscii).toBe('Comic Sans MS');
  });
});

describe('sanitizeParaProps: estilos convertidos, espaçamento/bordas/recuos fora', () => {
  it('Título 5 → Título 3; Citação e Normal (Web) → Normal; Título 1 (id em pt) fica', () => {
    expect(sanitizeParaProps({ styleId: 'Ttulo5' }, rp, styles).styleId).toBe('Ttulo3');
    expect(sanitizeParaProps({ styleId: 'Citao' }, rp, styles).styleId).toBeUndefined();
    expect(sanitizeParaProps({ styleId: 'NormalWeb' }, rp, styles).styleId).toBeUndefined();
    expect(sanitizeParaProps({ styleId: 'Ttulo1' }, rp, styles).styleId).toBe('Ttulo1');
  });

  it('cai espaçamento, bordas, sombreamento, tabulações, quebra de seção, nível de tópico; alinhamento e numeração ficam', () => {
    const m: ParaProps = {
      alignment: 'center', lineTwentieths: 360, spaceAfterTwips: 240, spaceBeforeAuto: true, keepNext: true, shadingHex: 'FFFF00',
      borders: { top: { style: 'single', sizeEighthPt: 4, spacePt: 0 } }, tabStops: [{ posTwips: 1000, align: 'left' }] as ParaProps['tabStops'],
      outlineLvl: 2, numbering: { kind: 'decimal', ilvl: 1, numId: 5 }, indentRightTwips: 200, indentFirstLineTwips: 300,
    };
    const out = sanitizeParaProps(m, rp, styles);
    expect(out).toEqual({ alignment: 'center', numbering: { kind: 'decimal', ilvl: 1, numId: 5 } });
  });

  it("recuo em passos ('steps'): o esquerdo vira múltiplo de 0,5\" (o indent do Quill); com lista, o da lista", () => {
    expect(sanitizeParaProps({ indentLeftTwips: 1500 }, rp, styles).indentLeftTwips).toBe(1440);
    expect(sanitizeParaProps({ indentLeftTwips: 200 }, rp, styles).indentLeftTwips).toBeUndefined();
    expect(sanitizeParaProps({ indentLeftTwips: 1440, numbering: { kind: 'bullet', ilvl: 0 } }, rp, styles).indentLeftTwips).toBeUndefined();
  });
});

describe('policyList: listas coladas', () => {
  it('tipo permitido e nível dentro do limite; só marcador permitido: numerada vira marcador; nenhum: sem lista', () => {
    expect(policyList(rp, 'decimal', 12)).toEqual({ kind: 'decimal', level: 8 });
    expect(policyList(resolvePolicy({ lists: { kinds: ['bullet'], levels: 2 } }), 'decimal', 5)).toEqual({ kind: 'bullet', level: 1 });
    expect(policyList(resolvePolicy({ lists: { kinds: [] } }), 'bullet', 0)).toBeNull();
  });
});

describe('POLICY_GUARDS: a API recusa o que a política não permite', () => {
  const host = { styleKeyOf: (id: string) => styles.keyOf(id) };
  const ok = (m: string, ...args: unknown[]): boolean => POLICY_GUARDS[m]!(rp, args, host);

  it('caractere pelos argumentos', () => {
    expect(ok('toggleRunProp', 'bold')).toBe(true);
    expect(ok('toggleRunProp', 'allCaps')).toBe(false);
    expect(ok('toggleUnderline')).toBe(true);
    expect(ok('toggleUnderline', 'double')).toBe(false);
    expect(ok('toggleVertAlign', 'superscript')).toBe(false);
    expect(ok('setFontFamily', 'Arial')).toBe(false);
    expect(ok('setFontSize', 14)).toBe(false);
    expect(ok('setColor', 'FF0000')).toBe(true);
  });

  it('estilos pelo nome (id em português casa pelo w:name)', () => {
    expect(ok('applyStyle', 'Ttulo1')).toBe(true);
    expect(ok('applyStyle', 'Ttulo5')).toBe(false);
    expect(ok('applyStyle', undefined)).toBe(true);
    expect(ok('createStyle', {})).toBe(false);
  });

  it('listas: só o formato padrão da biblioteca; recuos: aumentar/diminuir sim, especial não', () => {
    expect(ok('toggleList', 'bullet')).toBe(true);
    expect(ok('applyListLibrary', 'number', 0)).toBe(true);
    expect(ok('applyListLibrary', 'number', 3)).toBe(false);
    expect(ok('applyMultilevelLibrary', 2)).toBe(false);
    expect(ok('setListLevel', 8)).toBe(true);
    expect(ok('setListLevel', 9)).toBe(false);
    expect(ok('indent', 1)).toBe(true);
    expect(ok('setSpecialIndent', 'hanging', 360)).toBe(false);
    expect(ok('setParagraphLayout', { left: 720 })).toBe(false);
    expect(ok('setAlignment', 'center')).toBe(true);
    expect(ok('setLineSpacing', 360)).toBe(false);
  });

  it('página, quebras e objetos', () => {
    expect(ok('setPageSetup', {})).toBe(false);
    expect(ok('insertPageBreak')).toBe(true);
    expect(ok('insertSectionBreak', 'nextPage')).toBe(false);
    expect(ok('insertSectionBreak', 'nextColumn')).toBe(true);
    expect(ok('setColumns', 'two')).toBe(true);
    expect(ok('insertTable', 2, 2)).toBe(true);
    expect(ok('insertImage')).toBe(true);
    expect(ok('setImageBorder', {})).toBe(false);
    expect(ok('insertTextbox')).toBe(false);
    expect(ok('enterHeaderFooter', 'header')).toBe(false);
  });
});
