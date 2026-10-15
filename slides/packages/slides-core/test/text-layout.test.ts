import { describe, expect, it } from 'vitest';
import { layoutTextBody, formatAutoNum, EMU_PER_POINT, type TextBody, type MeasureText } from '../src/index.js';

/**
 * Measurer fake determinístico: cada caractere mede metade do corpo em pontos
 * (ex.: sz=10 → 5pt/char). Suficiente para testar quebra/âncora/escala sem
 * canvas — mesmo contrato que o export PDF vai usar (spec 05).
 */
const fake: MeasureText = (text, f) => text.length * f.sizePt * 0.5;

const PT = EMU_PER_POINT; // 12700 EMU por ponto
const noIns = { insL: 0, insT: 0, insR: 0, insB: 0 };

function tb(paragraphs: TextBody['paragraphs'], extra: Partial<TextBody> = {}): TextBody {
  return { paragraphs, ...extra };
}

describe('layoutTextBody — word-wrap', () => {
  it('quebra por palavra na largura útil', () => {
    // "aaa bbb ccc" sz=10 → 5pt/char. Caixa de 40pt: "aaa bbb" (35pt) cabe,
    // "ccc" vai para a segunda linha.
    const body = tb([{ runs: [{ text: 'aaa bbb ccc', sz: 10 }] }]);
    const r = layoutTextBody(body, 40 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(2);
    expect(r.lines[0]!.runs[0]!.text).toBe('aaa bbb');
    expect(r.lines[1]!.runs[0]!.text).toBe('ccc');
  });

  it('wrap="none" não quebra', () => {
    const body = tb([{ runs: [{ text: 'aaa bbb ccc', sz: 10 }] }], { wrap: 'none' });
    const r = layoutTextBody(body, 40 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0]!.runs[0]!.text).toBe('aaa bbb ccc');
  });

  it('<a:br> (run "\\n") força quebra', () => {
    const body = tb([{ runs: [{ text: 'aa', sz: 10 }, { text: '\n' }, { text: 'bb', sz: 10 }] }]);
    const r = layoutTextBody(body, 1000 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(2);
    expect(r.lines[0]!.runs[0]!.text).toBe('aa');
    expect(r.lines[1]!.runs[0]!.text).toBe('bb');
  });

  it('CJK quebra entre caracteres; kinsoku só com idioma do Leste Asiático (medido, syn-a-tbl9)', () => {
    // 5 pt/char, caixa de 15 pt = 3 caracteres
    const run = (lang: string) => [{ runs: [{ text: 'あいう）えお', sz: 10, lang }] }];
    const lines = (lang: string) => layoutTextBody(tb(run(lang)), 15 * PT, 100 * PT, fake, noIns).lines.map((l) => l.runs.map((x) => x.text).join(''));
    expect(lines('en-US')).toEqual(['あいう', '）えお']);
    expect(lines('ja-JP')).toEqual(['あい', 'う）え', 'お']);
    // 。 fica pendurado além da margem
    const hang = layoutTextBody(tb([{ runs: [{ text: 'あいう。えお', sz: 10, lang: 'ja-JP' }] }]), 15 * PT, 100 * PT, fake, noIns);
    expect(hang.lines.map((l) => l.runs.map((x) => x.text).join(''))).toEqual(['あいう。', 'えお']);
  });

  it('entrelinha expandida/exata: 1ª base a 0,75 da entrelinha e pé da última = 0,24 × sz (medido, syn-a-tbl6/8)', () => {
    const body = tb([{ runs: [{ text: 'a', sz: 10 }], lineSpacing: 1.5 }]);
    const r = layoutTextBody(body, 100 * PT, 100 * PT, fake, noIns);
    // entrelinha 1,5 × 12 = 18 pt: base em 13,5 pt; altura = 13,5 + 2,4
    expect(r.lines[0]!.baseline / PT).toBeCloseTo(13.5, 6);
    expect(r.totalH / PT).toBeCloseTo(15.9, 6);
    const exact = layoutTextBody(tb([{ runs: [{ text: 'a', sz: 10 }], lineSpacingPt: 20 }]), 100 * PT, 100 * PT, fake, noIns);
    expect(exact.lines[0]!.baseline / PT).toBeCloseTo(15, 6);
  });

  it('palavra maior que a linha quebra por caractere no maior prefixo que cabe (syn-b-e19)', () => {
    // caixa de 10pt, 5pt/char: "aaaaaaaaaa" vira 5 linhas de "aa"; "bb" na 6ª
    const body = tb([{ runs: [{ text: 'aaaaaaaaaa bb', sz: 10 }] }]);
    const r = layoutTextBody(body, 10 * PT, 100 * PT, fake, noIns);
    expect(r.lines.map((l) => l.runs.map((x) => x.text).join(''))).toEqual(['aa', 'aa', 'aa', 'aa', 'aa', 'bb']);
    // antes de partir a palavra, ela desce para uma linha nova
    const r2 = layoutTextBody(tb([{ runs: [{ text: 'ab cdefghij', sz: 10 }] }]), 30 * PT, 100 * PT, fake, noIns);
    expect(r2.lines.map((l) => l.runs.map((x) => x.text).join(''))).toEqual(['ab', 'cdefgh', 'ij']);
  });

  it('quebra depois de hífen e travessões, não em espaço não separável nem entre runs sem espaço (syn-b-e19/e23)', () => {
    const lines = (text: string | string[], w: number): string[] => {
      const runs = (Array.isArray(text) ? text : [text]).map((t) => ({ text: t, sz: 10 }));
      return layoutTextBody(tb([{ runs }]), w * PT, 100 * PT, fake, noIns).lines.map((l) => l.runs.map((x) => x.text).join(''));
    };
    expect(lines('aa bb-cc', 30)).toEqual(['aa bb-', 'cc']);
    expect(lines('aa bb–cc', 30)).toEqual(['aa bb–', 'cc']);
    expect(lines('aa bb\u00a0cc', 30)).toEqual(['aa', 'bb\u00a0cc']);
    expect(lines('aa bb.\u00a0 cc dd', 45)).toEqual(['aa', 'bb.\u00a0 cc', 'dd']);
    expect(lines('aa bb.  cc dd', 45)).toEqual(['aa bb.', 'cc dd']);
    expect(lines(['aa bb', ':cc'], 30)).toEqual(['aa', 'bb:cc']);
  });

  it('o texto da 1ª linha começa no fim do marcador quando ele invade o recuo (syn-b-e20/e25/e26)', () => {
    const x0 = (marL: number, indent: number, pct?: number): number => {
      const body = tb([{ bullet: true, bulletChar: '•', marL: marL * PT, indent: indent * PT, ...(pct ? { bulletSizePct: pct } : {}), runs: [{ text: 'aa bb', sz: 10 }] }]);
      const l = layoutTextBody(body, 100 * PT, 100 * PT, fake, noIns).lines[0]!;
      return l.runs[0]!.x / PT;
    };
    expect(x0(0, 0)).toBe(5); // marcador de 5 pt em 0 → texto em 5
    expect(x0(0, 0, 2)).toBe(10); // a largura é a do marcador no tamanho DELE
    expect(x0(20, -20)).toBe(20); // recuo deslocado comum: texto em marL
    expect(x0(20, -3)).toBe(22); // marcador em 17, fim em 22 > 20 → texto em 22
    expect(x0(27, -42)).toBe(42); // marcador à esquerda da caixa: a 1ª linha desliza 15
    expect(x0(10, 10)).toBe(20); // indent > 0: marcador em marL, texto em marL+indent
  });

  it('autofit arredonda o tamanho ao ponto e não escala o spc; kern liga a partir do limiar (syn-b-e17/e23/e27)', () => {
    const body = tb([{ runs: [{ text: 'ab', sz: 46, spc: 3.5, kern: 12 }, { text: 'cd', sz: 11, kern: 12 }] }], { fontScale: 0.9 });
    const l = layoutTextBody(body, 1000 * PT, 100 * PT, fake, noIns).lines[0]!;
    expect(l.runs[0]!.font.sizePt).toBe(41);
    expect(l.runs[0]!.spc).toBe(3.5 * PT);
    expect(l.runs[0]!.font.kern).toBe(true);
    expect(l.runs[1]!.font.sizePt).toBe(10); // 11 × 0,9 = 9,9 → 10
    expect(l.runs[1]!.font.kern).toBeUndefined(); // 10 pt < 12 pt
  });

  it('o 1º TAB da linha usa a parada na posição atual (tabLst com pos=0 — syn-b-e30)', () => {
    const tabs = [0, 36, 72, 108].map((p) => ({ pos: p * PT, algn: 'l' }));
    const x = (t: string): number => layoutTextBody(tb([{ tabs, runs: [{ text: t, sz: 10 }] }]), 500 * PT, 100 * PT, fake, noIns).lines[0]!.runs[0]!.x / PT;
    expect(x('\tX')).toBe(0);
    expect(x('\t\t\tX')).toBe(72);
  });

  it('o TAB fica colado à palavra seguinte: se o par não cabe, descem juntos (gd-082972)', () => {
    // 5 pt/char, caixa de 40 pt, paradas a cada 10 pt: "aaaa \tbbbb" → TAB+bbbb vão para a 2ª linha
    const body = tb([{ defTabSz: 10 * PT, runs: [{ text: 'aaaa \tbbbb', sz: 10 }] }]);
    const r = layoutTextBody(body, 40 * PT, 100 * PT, fake, noIns);
    expect(r.lines.map((l) => l.runs.map((x) => x.text).join(''))).toEqual(['aaaa', 'bbbb']);
    expect(r.lines[1]!.runs[0]!.x / PT).toBe(10);
  });

  it('a largura útil é truncada a 1/8 pt (syn-b-e18)', () => {
    // "aaa bbb" = 35pt: cabe em 35,1 pt (→ 35), não em 34,95 pt (→ 34,875)
    const body = tb([{ runs: [{ text: 'aaa bbb', sz: 10 }] }]);
    expect(layoutTextBody(body, 35.1 * PT, 100 * PT, fake, noIns).lines.length).toBe(1);
    expect(layoutTextBody(body, 34.95 * PT, 100 * PT, fake, noIns).lines.length).toBe(2);
  });
});

describe('layoutTextBody — autofit (normAutofit)', () => {
  it('fontScale reduz o corpo efetivo (cabe sem quebrar)', () => {
    const body = tb([{ runs: [{ text: 'aaa bbb ccc', sz: 10 }] }], { fontScale: 0.5 });
    // com 0.5: 11 chars × 2.5pt = 27.5pt ≤ 40pt → 1 linha
    const r = layoutTextBody(body, 40 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(1);
    expect(r.lines[0]!.runs[0]!.font.sizePt).toBe(5);
  });

  it('lnSpcReduction reduz a altura da linha', () => {
    const p = [{ runs: [{ text: 'x', sz: 10 }] }];
    const base = layoutTextBody(tb(p), 100 * PT, 100 * PT, fake, noIns);
    const red = layoutTextBody(tb(p, { lnSpcReduction: 0.2 }), 100 * PT, 100 * PT, fake, noIns);
    expect(base.lines[0]!.height).toBeCloseTo(10 * PT * 1.2, 3);
    expect(red.lines[0]!.height).toBeCloseTo(10 * PT * 1.2 * 0.8, 3);
  });
});

describe('layoutTextBody — âncora vertical e alinhamento', () => {
  it('anchor=ctr centraliza o bloco (altura total considerada)', () => {
    const body = tb([{ runs: [{ text: 'aaa bbb ccc', sz: 10 }] }], { anchor: 'ctr' });
    const boxH = 100 * PT;
    const r = layoutTextBody(body, 40 * PT, boxH, fake, noIns);
    expect(r.lines.length).toBe(2);
    const firstTop = r.lines[0]!.baseline - r.lines[0]!.height * 0.8;
    expect(firstTop).toBeCloseTo((boxH - r.totalH) / 2, 3);
  });

  it('anchor=b encosta o bloco embaixo', () => {
    const body = tb([{ runs: [{ text: 'x', sz: 10 }] }], { anchor: 'b' });
    const boxH = 100 * PT;
    const r = layoutTextBody(body, 100 * PT, boxH, fake, noIns);
    const bottom = r.lines[0]!.baseline - r.lines[0]!.height * 0.8 + r.totalH;
    expect(bottom).toBeCloseTo(boxH, 3);
  });

  it('align ctr/r deslocam os runs', () => {
    const mk = (align: string) => layoutTextBody(
      tb([{ align, runs: [{ text: 'xx', sz: 10 }] }]), 100 * PT, 50 * PT, fake, noIns);
    const l = mk('l'), c = mk('ctr'), rr = mk('r');
    const w = 2 * 5 * PT; // 2 chars × 5pt
    expect(l.lines[0]!.runs[0]!.x).toBeCloseTo(0, 3);
    expect(c.lines[0]!.runs[0]!.x).toBeCloseTo((100 * PT - w) / 2, 3);
    expect(rr.lines[0]!.runs[0]!.x).toBeCloseTo(100 * PT - w, 3);
  });
});

describe('layoutTextBody — bullets e indent por nível', () => {
  it('buChar com hanging indent: bullet em marL+indent, texto em marL', () => {
    const body = tb([{
      bullet: true, bulletChar: '•', marL: 342900, indent: -342900,
      runs: [{ text: 'item', sz: 10 }],
    }]);
    const r = layoutTextBody(body, 500 * PT, 100 * PT, fake, noIns);
    expect(r.lines[0]!.bullet!.text).toBe('•');
    expect(r.lines[0]!.bullet!.x).toBe(0);            // marL + indent = 0
    expect(r.lines[0]!.runs[0]!.x).toBeCloseTo(342900, 3);
  });

  it('bullet aparece só na PRIMEIRA linha do parágrafo quebrado', () => {
    const body = tb([{
      bullet: true, bulletChar: '•', runs: [{ text: 'aaa bbb ccc', sz: 10 }],
    }]);
    const r = layoutTextBody(body, 40 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(2);
    expect(r.lines[0]!.bullet).toBeDefined();
    expect(r.lines[1]!.bullet).toBeUndefined();
  });

  it('buAutoNum numera por nível e reinicia níveis mais profundos', () => {
    const body = tb([
      { bullet: true, bulletAutoNum: 'arabicPeriod', runs: [{ text: 'a', sz: 10 }] },
      { bullet: true, bulletAutoNum: 'arabicPeriod', level: 1, runs: [{ text: 'b', sz: 10 }] },
      { bullet: true, bulletAutoNum: 'arabicPeriod', runs: [{ text: 'c', sz: 10 }] },
      { bullet: true, bulletAutoNum: 'arabicPeriod', level: 1, runs: [{ text: 'd', sz: 10 }] },
    ]);
    const r = layoutTextBody(body, 1000 * PT, 200 * PT, fake, noIns);
    expect(r.lines.map((l) => l.bullet?.text)).toEqual(['1.', '1.', '2.', '1.']);
  });
});

describe('formatAutoNum', () => {
  it('esquemas comuns', () => {
    expect(formatAutoNum('arabicPeriod', 3)).toBe('3.');
    expect(formatAutoNum('alphaLcParenR', 2)).toBe('b)');
    expect(formatAutoNum('alphaUcPeriod', 1)).toBe('A.');
    expect(formatAutoNum('romanUcPeriod', 4)).toBe('IV.');
    expect(formatAutoNum('romanLcPeriod', 9)).toBe('ix.');
  });
});
