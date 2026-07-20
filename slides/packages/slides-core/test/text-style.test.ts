import { describe, expect, it } from 'vitest';
import {
  parseXml, firstChild,
  parseTxStyleLevels, mergeStyleLevels, applyTextStyles, resolveFontAlias,
  type Theme, type TextBody,
} from '../src/index.js';

const theme: Theme = {
  colors: { tx1: '#111111', accent1: '#FF6600', lt1: '#FEFEFE' },
  fonts: { major: 'Georgia', minor: 'Tahoma' },
};

describe('parseTxStyleLevels (cascata — camada única)', () => {
  it('lvl1..lvl9 + defPPr como base de todos os níveis', () => {
    const xml = parseXml(
      '<p:bodyStyle xmlns:p="p" xmlns:a="a">' +
      '<a:defPPr algn="l"><a:defRPr sz="1800"/></a:defPPr>' +
      '<a:lvl1pPr marL="342900" indent="-342900"><a:buChar char="•"/><a:defRPr sz="2800" b="1"><a:solidFill><a:schemeClr val="accent1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>' +
      '<a:lvl2pPr marL="742950"><a:buAutoNum type="arabicPeriod"/><a:defRPr sz="2400" i="1"/></a:lvl2pPr>' +
      '<a:lvl3pPr><a:buNone/></a:lvl3pPr>' +
      '</p:bodyStyle>');
    const lv = parseTxStyleLevels(xml, theme);
    expect(lv[0]).toEqual({
      align: 'l', marL: 342900, indent: -342900, buChar: '•',
      sz: 28, bold: true, color: '#FF6600', font: '+mn-lt',
    });
    expect(lv[1]!.buAutoNum).toBe('arabicPeriod');
    expect(lv[1]!.sz).toBe(24);
    expect(lv[1]!.italic).toBe(true);
    expect(lv[1]!.align).toBe('l');      // herdado do defPPr
    expect(lv[2]!.buNone).toBe(true);
    // nível sem lvlNpPr: só a base do defPPr
    expect(lv[8]).toEqual({ align: 'l', sz: 18 });
  });
});

describe('mergeStyleLevels (prioridade entre camadas)', () => {
  it('camada posterior sobrescreve apenas o que define', () => {
    const a = [{ sz: 28, color: '#111111', buChar: '•' }];
    const b = [{ color: '#FF0000' }];
    const m = mergeStyleLevels([a[0]!], [b[0]!]);
    expect(m[0]).toEqual({ sz: 28, color: '#FF0000', buChar: '•' });
  });

  it('bullet é substituído por inteiro (buNone apaga buChar herdado)', () => {
    const m = mergeStyleLevels([{ buChar: '•' }], [{ buNone: true }]);
    expect(m[0]!.buChar).toBeUndefined();
    expect(m[0]!.buNone).toBe(true);
    const m2 = mergeStyleLevels([{ buChar: '•' }], [{ buAutoNum: 'arabicPeriod' }]);
    expect(m2[0]).toEqual({ buAutoNum: 'arabicPeriod' });
  });
});

describe('applyTextStyles (preenche só o que falta)', () => {
  it('props diretas do run/pPr vencem; ausentes herdam', () => {
    const tb: TextBody = {
      paragraphs: [
        { runs: [{ text: 'a', sz: 20 }, { text: 'b' }] },
        { level: 1, align: 'r', runs: [{ text: 'c', bold: false }] },
      ],
    };
    const levels = mergeStyleLevels(
      [{ sz: 28, bold: true, align: 'l', color: '#111111', font: '+mj-lt', buChar: '•', marL: 100 },
       { sz: 24, align: 'ctr', buChar: '–' }],
    );
    applyTextStyles(tb, levels, theme);
    const [p0, p1] = tb.paragraphs;
    expect(p0!.runs[0]!.sz).toBe(20);          // direto vence
    expect(p0!.runs[1]!.sz).toBe(28);          // herdado lvl0
    expect(p0!.runs[1]!.bold).toBe(true);
    expect(p0!.runs[1]!.font).toBe('Georgia'); // +mj-lt resolvido
    expect(p0!.align).toBe('l');
    expect(p0!.bullet).toBe(true);
    expect(p0!.bulletChar).toBe('•');
    expect(p0!.marL).toBe(100);
    expect(p1!.align).toBe('r');               // direto vence
    expect(p1!.runs[0]!.bold).toBe(false);     // b="0" explícito BLOQUEIA herança
    expect(p1!.bulletChar).toBe('–');          // lvl1
  });

  it('buNone herdado desliga bullet; pPr buNone (bullet=false) não é sobrescrito', () => {
    const tb: TextBody = { paragraphs: [{ runs: [{ text: 'x' }] }, { bullet: false, runs: [{ text: 'y' }] }] };
    applyTextStyles(tb, mergeStyleLevels([{ buNone: true }]), theme);
    expect(tb.paragraphs[0]!.bullet).toBe(false);
    applyTextStyles(tb, mergeStyleLevels([{ buChar: '•' }]), theme);
    // parágrafo 1 tinha buNone explícito no pPr — segue sem bullet
    expect(tb.paragraphs[1]!.bullet).toBe(false);
    expect(tb.paragraphs[1]!.bulletChar).toBeUndefined();
  });
});

describe('resolveFontAlias', () => {
  it('resolve +mj-lt/+mn-lt via fontScheme do tema', () => {
    expect(resolveFontAlias('+mj-lt', theme)).toBe('Georgia');
    expect(resolveFontAlias('+mn-lt', theme)).toBe('Tahoma');
    expect(resolveFontAlias('Arial', theme)).toBe('Arial');
    expect(resolveFontAlias(undefined, theme)).toBeUndefined();
  });
});

// sanidade do parser XML usado nos testes acima
describe('firstChild helper', () => {
  it('acha lvl1pPr', () => {
    const el = parseXml('<x xmlns:a="a"><a:lvl1pPr algn="ctr"/></x>');
    expect(firstChild(el, 'a:lvl1pPr')!.attrs['algn']).toBe('ctr');
  });
});
