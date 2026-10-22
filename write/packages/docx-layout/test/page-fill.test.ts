/**
 * Frente Página: Cor da Página / Efeitos de Preenchimento e a marca-d'água VML —
 * regras medidas no Word (write/tools/page-lab: ladrilhos da exportação para a Web,
 * PDF e captura da janela). Fontes ABERTAS versionadas (Carlito) — roda no CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument, writePageBackground, type PageBackground } from '@universal-office/docx-core';
import { SfntFont } from '../src/typography/index.js';
import { fillParam, gradientTileRgba, layoutDocument, patternRgba, type FontFace, type FontProvider, type GlyphRunItem, type LayoutResult, type PageFillPaint } from '../src/index.js';
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
import { buildDocx, docDefaults, p, r } from '../../../tools/layout-oracle/docx-builder.mjs';

const FILES = join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files');
let carlito: { font: SfntFont; bytes: Uint8Array } | undefined;
const provider: FontProvider = {
  face(family, bold, italic): FontFace | null {
    if (family.toLowerCase() !== 'carlito') return null;
    if (!carlito) { const bytes = new Uint8Array(readFileSync(join(FILES, 'carlito-regular.ttf'))); carlito = { font: new SfntFont(bytes), bytes }; }
    return { key: 'Carlito|r', family: 'Carlito', font: carlito.font, bytes: carlito.bytes, bold, italic, ...(bold ? { synthBold: true } : {}), ...(italic ? { synthItalic: true } : {}) };
  },
};

/** Documento com o w:background gravado como o editor grava. */
const withBackground = (bg: PageBackground | null, settings = '', body = p(r('Corpo'))): LayoutResult => {
  const pkg = DocxPackage.load(buildDocx({ body, defaults: docDefaults({ font: 'Carlito', size: 11 }), settings }));
  writePageBackground(pkg, bg);
  return layoutDocument(readFullDocument(DocxPackage.load(pkg.save())), provider);
};
const paint = (o: Partial<PageFillPaint>): PageFillPaint => ({ type: 'gradient', c1: '000000', c2: 'FFFFFF', angle: 0, focus: 100, ...o });

describe('Cor da Página: tela, PDF e w:displayBackgroundShape', () => {
  it('a cor vai para a página; a tela só a mostra com w:displayBackgroundShape', () => {
    const off = withBackground({ color: 'FFFF00' });
    expect(off.pages[0]!.background).toBe('FFFF00');
    expect(off.pages[0]!.backgroundShow).toBeUndefined();
    const on = withBackground({ color: 'FFFF00' }, '<w:displayBackgroundShape/>');
    expect(on.pages[0]!.backgroundShow).toBe(true);
  });

  it('efeito de uma cor: "fill darken(n)" truncado como o Word (⌊c·n/255⌋)', () => {
    const res = withBackground({ color: '4472C4', fill: { type: 'gradient', color: '4472C4', color2: 'fill darken(118)', focus: 100, method: 'linear sigma' } }, '<w:displayBackgroundShape/>');
    const f = res.pages[0]!.backgroundFill!;
    expect([f.c1, f.c2]).toEqual(['4472C4', '1F345A']);
  });
});

describe('ladrilho do gradiente (campos espelhados do Word)', () => {
  it('horizontal, variante 1 (foco 100): cor 1 em cima e embaixo, cor 2 no meio', () => {
    const f = paint({});
    expect(fillParam(f, 0.3, 0)).toBeCloseTo(0, 6);
    expect(fillParam(f, 0.3, 0.5)).toBeCloseTo(1, 6);
    expect(fillParam(f, 0.3, 1)).toBeCloseTo(0, 6);
    // a variante 2 (foco 0) inverte
    expect(fillParam(paint({ focus: 0 }), 0.3, 0.5)).toBeCloseTo(0, 6);
  });

  it('vertical: o ±50% tem o sinal trocado em relação ao horizontal (tl-2-3/2-4)', () => {
    expect(fillParam(paint({ focus: 50 }), 0.5, 0.5)).toBeCloseTo(1, 6);
    expect(fillParam(paint({ angle: -90, focus: 50 }), 0.5, 0.5)).toBeCloseTo(0, 6);
    expect(fillParam(paint({ angle: -90, focus: -50 }), 0.5, 0.5)).toBeCloseTo(1, 6);
  });

  it('do canto no PDF: o quadrante sem espelho (512×384)', () => {
    const f = paint({ type: 'gradientRadial', gradientCenter: true, focusPosition: [0, 0] });
    // na tela o ladrilho espelha: o canto oposto volta à cor 1
    expect(fillParam(f, 1, 1)).toBeCloseTo(0, 6);
    expect(fillParam(f, 1, 1, true)).toBeCloseTo(1, 6);
  });

  it('as paradas saem nas cores pedidas nas pontas', () => {
    const px = gradientTileRgba(paint({ c1: 'FF0000', c2: '0000FF' }), 4, 3);
    expect([...px.subarray(0, 3)]).toEqual([255, 0, 0]);
    const mid = (1 * 4 + 0) * 4; // linha do meio, coluna 0
    expect([...px.subarray(mid, mid + 3)]).toEqual([0, 0, 255]);
  });
});

describe('padrão 8×8', () => {
  it('bit 7 é a coluna 0 e o bit ligado é a cor de primeiro plano', () => {
    const px = patternRgba(paint({ type: 'pattern', c1: '112233', c2: 'FFFFFF', pattern: [0x80, 0, 0, 0, 0, 0, 0, 0] }));
    expect([...px.subarray(0, 4)]).toEqual([0x11, 0x22, 0x33, 255]);
    expect([...px.subarray(4, 8)]).toEqual([255, 255, 255, 255]);
  });
});

describe('marca-d\'água VML (v:textpath)', () => {
  it('o em ocupa a altura da caixa e a linha de base fica a altura·winDescent/upm do fundo (oráculo wmf-*)', () => {
    const shape = '<w:r><w:pict><v:shape id="w1" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:100pt;width:300pt;height:100pt;z-index:-1;'
      + 'mso-position-horizontal-relative:page;mso-position-vertical-relative:page" fillcolor="silver" stroked="f">'
      + '<v:textpath style="font-family:&quot;Carlito&quot;;font-size:1pt" string="RASCUNHO"/></v:shape></w:pict></w:r>';
    const res = withBackground(null, '', p(shape) + p(r('Corpo')));
    const items = res.pages[0]!.items;
    const g = items.find((i): i is GlyphRunItem => i.t === 'glyphs' && !!i.asPath)!;
    const k = items.indexOf(g);
    const xf = items.slice(0, k).reverse().find((i) => (i as { t: string }).t === 'xform') as unknown as { m: number[] };
    const fm = g.face.font.metrics;
    const desc = (fm.usWinDescent || -fm.descender) / (fm.unitsPerEm || 1000);
    const h = 100 * 20;
    expect(g.sizePt * 20 * xf.m[3]!).toBeCloseTo(h, 3); // em = altura da caixa
    const baseline = xf.m[3]! * g.y + xf.m[5]!;
    expect(baseline).toBeCloseTo(2000 + h - h * desc, 1);
  });
});
