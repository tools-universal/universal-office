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

  it('palavra maior que a caixa não entra em loop (uma palavra por linha)', () => {
    const body = tb([{ runs: [{ text: 'aaaaaaaaaa bb', sz: 10 }] }]);
    const r = layoutTextBody(body, 10 * PT, 100 * PT, fake, noIns);
    expect(r.lines.length).toBe(2);
    expect(r.lines[0]!.runs[0]!.text).toBe('aaaaaaaaaa');
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
