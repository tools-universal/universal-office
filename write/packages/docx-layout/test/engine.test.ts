/**
 * Regras do motor que não dependem das fontes instaladas: usa só as fontes
 * ABERTAS versionadas em shared/fonts/files (Carlito, Liberation Serif) — roda
 * no CI. Os números de referência vêm do oráculo do Word (tools/layout-oracle).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';
import { SfntFont } from '../src/typography/index.js';
import { layoutDocument, type FontFace, type FontProvider, type GlyphRunItem, type LayoutResult } from '../src/index.js';
import { directPPr } from '../src/context.js';
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
import { buildDocx, docDefaults, p, r, sz } from '../../../tools/layout-oracle/docx-builder.mjs';

const FILES = join(__dirname, '..', '..', '..', '..', 'shared', 'fonts', 'files');
const load = (f: string) => new Uint8Array(readFileSync(join(FILES, f)));
/** "Mono Regular": família SÓ com a regular (negrito/itálico sintéticos). */
const FAMILIES: Record<string, Partial<Record<'r' | 'b' | 'i' | 'bi', string>>> = {
  Carlito: { r: 'carlito-regular.ttf', b: 'carlito-bold.ttf', i: 'carlito-italic.ttf', bi: 'carlito-bolditalic.ttf' },
  'Liberation Serif': { r: 'liberationserif-regular.ttf', b: 'liberationserif-bold.ttf' },
  'Only Regular': { r: 'carlito-regular.ttf' },
};
const cache = new Map<string, { font: SfntFont; bytes: Uint8Array }>();
const provider: FontProvider = {
  face(family, bold, italic): FontFace | null {
    const fam = Object.hasOwn(FAMILIES, family) ? FAMILIES[family] : undefined;
    if (!fam) return null;
    const want = bold && italic ? 'bi' : bold ? 'b' : italic ? 'i' : 'r';
    const v = fam[want] ? want : 'r';
    const file = fam[v]!;
    let e = cache.get(file);
    if (!e) { const bytes = load(file); e = { font: new SfntFont(bytes), bytes }; cache.set(file, e); }
    return {
      key: `${family}|${v}`, family, font: e.font, bytes: e.bytes, bold, italic,
      ...(bold && !v.includes('b') ? { synthBold: true } : {}),
      ...(italic && !v.includes('i') ? { synthItalic: true } : {}),
    };
  },
};
const run = (body: string, opts: Record<string, unknown> = {}): LayoutResult => {
  const bytes: Uint8Array = buildDocx({ body, defaults: docDefaults({ font: 'Carlito', size: 11 }), ...opts });
  return layoutDocument(readFullDocument(DocxPackage.load(bytes)), provider);
};
const glyphRuns = (res: LayoutResult) => res.pages.flatMap((pg) => pg.items.filter((i): i is GlyphRunItem => i.t === 'glyphs'));

describe('motor: regras medidas no Word', () => {
  it('negrito sintético não se funde com o texto regular da mesma face', () => {
    const res = run(p(r('Negrito', '<w:rFonts w:ascii="Only Regular" w:hAnsi="Only Regular"/><w:b/>') + r(' normal', '<w:rFonts w:ascii="Only Regular" w:hAnsi="Only Regular"/>')));
    const runs = glyphRuns(res).filter((g) => g.face.family === 'Only Regular');
    expect(runs.map((g) => [g.text.trim(), !!g.synthBold])).toEqual([['Negrito', true], ['normal', false]]);
  });

  it('w:br no fim do parágrafo cria a linha vazia da marca (oráculo breaks/br-line)', () => {
    const a = run(p(r('Um Hxg')) + p(r('Dois Hxg')));
    const b = run(p(r('Um Hxg') + '<w:r><w:br/></w:r>') + p(r('Dois Hxg')));
    const y = (res: LayoutResult) => glyphRuns(res).find((g) => g.text.startsWith('Dois'))!.y;
    const line = a.pages[0]!.lines[1]!.y - a.pages[0]!.lines[0]!.y;
    expect(y(b) - y(a)).toBeCloseTo(line, 1);
  });

  it('numeração de linhas: start+1, countBy, alinhada à direita da coluna − distância (oráculo lnnum)', () => {
    const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1701" w:bottom="1417" w:left="2268" w:header="708" w:footer="708" w:gutter="0"/><w:lnNumType w:countBy="2" w:start="3" w:distance="567"/><w:cols w:space="708"/></w:sectPr>';
    const body = Array.from({ length: 6 }, (_, k) => p(r(`linha ${k + 1}`))).join('') + p(r('sem'), '<w:suppressLineNumbers/>') + p(r('depois'));
    const res = run(body, { sect });
    const nums = glyphRuns(res).filter((g) => /^\d+$/.test(g.text));
    // 1ª linha = 4; countBy 2 → 4, 6, 8; a suprimida não conta; "depois" = 10
    expect(nums.map((g) => g.text)).toEqual(['4', '6', '8', '10']);
    for (const g of nums) {
      const last = g.glyphs[g.glyphs.length - 1]!;
      const right = last.x + (g.face.font.advanceWidth(g.face.font.glyphId(last.cp)) * g.sizePt * 20) / g.face.font.metrics.unitsPerEm;
      expect(right).toBeCloseTo(2268 - 567, 0);
    }
  });

  it('tabela: cada divisa ocupa a espessura da borda; altura exata inclui a de cima (oráculo tables)', () => {
    const tbl = (sz8: number, trPr = '') => `<w:tbl><w:tblPr><w:tblW w:w="4000" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((s) => `<w:${s} w:val="${sz8 ? 'single' : 'nil'}" w:sz="${sz8}" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="4000"/></w:tblGrid>`
      + ['A', 'B', 'C'].map((k) => `<w:tr>${trPr}<w:tc><w:tcPr><w:tcW w:w="4000" w:type="dxa"/></w:tcPr>${p(r(`cel ${k}`))}</w:tc></w:tr>`).join('') + '</w:tbl>';
    const baselines = (res: LayoutResult) => glyphRuns(res).filter((g) => g.text.startsWith('cel') || g.text.startsWith('fim')).map((g) => g.y);
    const none = baselines(run(tbl(0) + p(r('fim'))));
    const thick = baselines(run(tbl(24) + p(r('fim')))); // 3 pt = 60 twips
    const d = thick.map((y, k) => y - none[k]!);
    // 1ª linha desce a borda de cima; cada linha seguinte +1 divisa; o parágrafo depois +1 (inferior)
    expect(d.map((v) => Math.round(v))).toEqual([60, 120, 180, 240]);
    const exact = baselines(run(tbl(24, '<w:trPr><w:trHeight w:val="600" w:hRule="exact"/></w:trPr>') + p(r('fim'))));
    expect(Math.round(exact[1]! - exact[0]!)).toBe(600);
    expect(Math.round(exact[2]! - exact[1]!)).toBe(600);
  });

  it('modo de compatibilidade ≤ 14 não comprime espaços na justificação (oráculo justify6)', () => {
    const face = provider.face('Carlito', false, false)!;
    const adv = (t: string) => [...t].reduce((a, c) => a + (face.font.advanceWidth(face.font.glyphId(c.codePointAt(0)!)) * 11 * 20) / face.font.metrics.unitsPerEm, 0);
    const first = 'aaaa '.repeat(20) + 'FIM';
    // o FIM passa 60 twips da margem: cabe comprimindo (< 35% de FIM+espaço) só no Word 2013+
    const ind = Math.round(8504 - adv(first) + 60);
    const body = p(r(`${first} ${'bbbb '.repeat(20)}`), `<w:jc w:val="both"/><w:ind w:right="${ind}"/>`);
    const firstLineEndsWithFim = (compat: number) => {
      const l = run(body, { compat }).pages[0]!.lines[0]!;
      return `${first} `.slice(0, l.end).trimEnd().endsWith('FIM');
    };
    expect(firstLineEndsWithFim(15)).toBe(true);
    expect(firstLineEndsWithFim(14)).toBe(false);
  });
});

describe('motor: fundo de mescla vertical que atravessa a página (oráculo vmshd)', () => {
  // mescla de 6 linhas na 1ª coluna: fundo A na inicial e B nas continuações (o Word ignora B)
  const tc = (xml: string, vm: string, fill: string) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/>${vm}${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:tcPr>${xml}</w:tc>`;
  const rows = Array.from({ length: 6 }, (_, k) => `<w:tr>${tc(p(k ? '' : r('mescla')), k ? '<w:vMerge/>' : '<w:vMerge w:val="restart"/>', k ? 'C04040' : '2E5C8A')}${tc(p(r(`linha ${k + 1}`)), '', '')}</w:tr>`).join('');
  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="6000" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>${rows}</w:tbl>`;
  const N_FILL = 49; // linhas de enchimento: 3 linhas da tabela em cada página
  const glyphRunsOf = (pg: LayoutResult['pages'][number]) => pg.items.filter((i): i is GlyphRunItem => i.t === 'glyphs');
  it('o fundo da inicial em cada página, do topo ao pé da parte; o das continuações não', () => {
    const res = run(Array.from({ length: N_FILL }, (_, k) => p(r(`enchimento ${k + 1}`))).join('') + tbl + p(r('Fim')));
    const parts = res.pages.map((pg) => ({ pg, rows: glyphRunsOf(pg).filter((g) => g.text.startsWith('linha')) })).filter((x) => x.rows.length);
    expect(parts.length).toBe(2);
    for (const { pg, rows: ls } of parts) {
      const fills = pg.items.filter((i) => i.t === 'rect' && i.fill === '2E5C8A');
      expect(fills.length).toBe(1);
      const f = fills[0] as Extract<(typeof pg.items)[number], { t: 'rect' }>;
      const ys = ls.map((g) => g.y);
      // cobre as linhas da parte e não passa do pé dela (uma linha de tabela abaixo da última)
      expect(f.y).toBeLessThan(Math.min(...ys));
      expect(f.y + f.h).toBeGreaterThan(Math.max(...ys));
      expect(f.y + f.h - Math.max(...ys)).toBeLessThan(300);
    }
    expect(res.pages.some((pg) => pg.items.some((i) => i.t === 'rect' && i.fill === 'C04040'))).toBe(false);
  });
});

describe('motor: medições sem efeito colateral', () => {
  const NUM = '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>';
  const numbered = (t: string) => p(r(t), '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>');
  const seq = (id: string) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> SEQ ${id} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>9</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`;

  it('as medições do rodapé não avançam o campo SEQ', () => {
    const res = run(p(r('Corpo')), { footers: { default: p(r('Fig ') + seq('Fig')) } });
    expect(glyphRuns(res).map((g) => g.text)).toContain('Fig1');
  });

  it('as medições do texto vertical não avançam a lista', () => {
    const cell = `<w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/><w:textDirection w:val="btLr"/></w:tcPr>${numbered('Vertical')}</w:tc>`;
    const tbl = `<w:tbl><w:tblPr><w:tblW w:w="1500" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="1500"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="1500"/></w:trPr>${cell}</w:tr></w:tbl>`;
    const res = run(tbl + numbered('Depois'), { numbering: NUM });
    expect(glyphRuns(res).map((g) => g.text)).toEqual(['1.Vertical', '2.Depois']);
  });

  it('a prévia de "manter com o próximo" não avança a lista nem o SEQ', () => {
    const res = run(p(r('Titulo'), '<w:keepNext/>') + numbered('Um') + numbered('Dois') + p(r('Tab ') + seq('Tab')), { numbering: NUM });
    expect(glyphRuns(res).map((g) => g.text)).toEqual(['Titulo', '1.Um', '2.Dois', 'Tab1']);
  });
});

describe('motor: hiperlinks (oráculo hlink)', () => {
  const HSTYLE = '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:basedOn w:val="DefaultParagraphFont"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>';
  const link = (runs: string) => p(`<w:hyperlink w:anchor="alvo">${runs}</w:hyperlink>`) + p('<w:bookmarkStart w:id="0" w:name="alvo"/>' + r('Alvo') + '<w:bookmarkEnd w:id="0"/>');
  const probe = (runs: string, styles = HSTYLE) => {
    const res = run(link(runs), { styles });
    const g = glyphRuns(res).find((x) => x.text.startsWith('Link'))!;
    const underlined = res.pages[0]!.items.some((i) => i.t === 'line' && Math.abs(i.y1 - g.y) < 100);
    return { color: g.color, underlined };
  };
  it('o w:hyperlink sozinho não formata: run sem rPr fica preto e sem sublinhado', () => {
    expect(probe(r('Link simples'))).toEqual({ color: '000000', underlined: false });
  });
  it('estilo Hyperlink: cor e sublinhado do estilo', () => {
    expect(probe(r('Link estilo', '<w:rStyle w:val="Hyperlink"/>'))).toEqual({ color: '0563C1', underlined: true });
  });
  it('w:u="none" direto tira o sublinhado do estilo', () => {
    expect(probe(r('Link sem', '<w:rStyle w:val="Hyperlink"/><w:u w:val="none"/>'))).toEqual({ color: '0563C1', underlined: false });
  });
  it('cor direta sem estilo: só a cor', () => {
    expect(probe(r('Link vermelho', '<w:color w:val="FF0000"/>'))).toEqual({ color: 'FF0000', underlined: false });
  });
  it('estilo Hyperlink ausente do styles.xml: sem formatação', () => {
    expect(probe(r('Link ausente', '<w:rStyle w:val="Hyperlink"/>'), '')).toEqual({ color: '000000', underlined: false });
  });
});

describe('leitor: WordArt VML', () => {
  it('o parágrafo do v:textpath mantém o espaçamento 0/0/simples (props do mesmo pPr)', () => {
    const shape = '<w:r><w:pict><v:shape id="w1" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:300pt;height:100pt;z-index:-1" fillcolor="silver" stroked="f"><v:textpath style="font-family:&quot;Carlito&quot;;font-size:1pt" string="RASCUNHO"/></v:shape></w:pict></w:r>';
    const bytes: Uint8Array = buildDocx({ body: p(shape) + p(r('Corpo')), defaults: docDefaults({ font: 'Carlito', size: 11, after: 400, line: 360 }) });
    const full = readFullDocument(DocxPackage.load(bytes));
    const blk = full.blocks[0]!;
    const tb = blk.type === 'paragraph' ? blk.paragraph.runs.find((x) => x.textbox?.wordArt)?.textbox : undefined;
    expect(tb).toBeDefined();
    expect(directPPr(tb!.paras[0]!).spacing).toEqual({ before: 0, after: 0, line: 240, lineRule: 'auto' });
  });
});

describe('nomes vindos do arquivo não herdam de Object.prototype', () => {
  it('realce, cor de tema, fonte e estilo chamados "constructor"/"__proto__" não quebram nem colorem', () => {
    const rpr = '<w:rStyle w:val="__proto__"/><w:rFonts w:ascii="constructor" w:hAnsi="constructor"/><w:highlight w:val="constructor"/><w:color w:val="auto" w:themeColor="constructor"/>';
    const res = run(p(r('Texto', rpr), '<w:pStyle w:val="toString"/>'));
    const g = glyphRuns(res).find((x) => x.text === 'Texto')!;
    expect(g.color).toBe('000000');
    expect(res.pages[0]!.items.some((i) => i.t === 'rect')).toBe(false);
  });
});
