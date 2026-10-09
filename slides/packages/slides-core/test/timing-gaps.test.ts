import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  parseXml, parseSlideTiming, buildPlaybackTimeline, shapeAnimHooks, mediaStateAt, PptxPackage, readPresentation,
  type CountTextUnits, type AnimBase,
} from '../src/index.js';

// Lacunas do modelo de tempo apontadas na revisão (gatilhos, ocultos, tinta,
// spd, marcadores, "Configurar apresentação")
const NS = 'xmlns:p="p" xmlns:a="a" xmlns:p14="p14" xmlns:r="r"';
const one: CountTextUnits = () => 1;
const base: AnimBase = { x: 0.5, y: 0.5, w: 0.2, h: 0.1 };

const setVis = (spid: string, v = 'visible'): string =>
  `<p:set><p:cBhvr><p:cTn id="90" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${v}"/></p:to></p:set>`;
const effect = (spid: string, cls = 'entr', attrs = '', inner = setVis(spid)): string =>
  `<p:par><p:cTn id="5" presetID="1" presetClass="${cls}" presetSubtype="0" fill="hold" nodeType="clickEffect" ${attrs}><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${inner}</p:childTnLst></p:cTn></p:par>`;
const group = (fx: string): string =>
  `<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${fx}</p:childTnLst></p:cTn></p:par>`;
const interactive = (cond: string, groups: string[]): string =>
  `<p:seq concurrent="1" nextAc="seek"><p:cTn id="10" restart="whenNotActive" fill="hold" nodeType="interactiveSeq"><p:stCondLst>${cond}</p:stCondLst><p:childTnLst>${groups.join('')}</p:childTnLst></p:cTn></p:seq>`;
const onClickOf = (spid: string): string => `<p:cond evt="onClick" delay="0"><p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cond>`;
const sld = (seqs: string, attrs = ''): string =>
  `<p:sld ${NS} ${attrs}><p:cSld><p:spTree/></p:cSld><p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${seqs}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>`;
const mainSeq = (groups: string[]): string =>
  `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groups.map((g) => g.replace('<p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="4"', '<p:cond delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="4"')).join('')}</p:childTnLst></p:cTn></p:seq>`;

describe('gatilho interativo (clique numa forma)', () => {
  const model = parseSlideTiming(parseXml(sld(interactive(onClickOf('2'), [group(effect('3'))]))), one);

  it('não vira passo nem dispara sozinho, mas a forma do gatilho começa OCULTA', () => {
    expect(model.steps.length).toBe(0);
    expect(model.interactive.length).toBe(1);
    const tl = buildPlaybackTimeline([model], { defaultSlideMs: 2000 });
    const fx = tl.slides[0]!.effects;
    for (const t of [0, 1000, 5000, Infinity]) {
      const hooks = shapeAnimHooks(fx, ['3'], t);
      expect(hooks?.all(base).visible).toBe(false);
    }
  });

  it('comando de mídia de um gatilho (clicar no vídeo) não toca nem no fim do slide', () => {
    const cmd = '<p:cmd type="call" cmd="togglePause"><p:cBhvr><p:cTn id="20" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="7"/></p:tgtEl></p:cBhvr></p:cmd>';
    const play = '<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="21" dur="10000" fill="hold"/><p:tgtEl><p:spTgt spid="7"/></p:tgtEl></p:cBhvr></p:cmd>';
    const m = parseSlideTiming(parseXml(sld(
      mainSeq([group(effect('7', 'mediacall', '', play))]).replace('delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="4"', 'delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst><p:par><p:cTn id="4"')
      + interactive(onClickOf('7'), [group(effect('7', 'mediacall', '', cmd))]))), one);
    const fx = buildPlaybackTimeline([m]).slides[0]!.effects;
    expect(mediaStateAt(fx, '7', 3000).playing).toBe(true);
    expect(mediaStateAt(fx, '7', Infinity).timeSec).toBeGreaterThan(9); // não pausou no "fim"
  });
});

describe('marcador de mídia: um grupo por passagem', () => {
  it('só o 1º grupo dispara no marcador; o 2º fica pendente (estado inicial)', () => {
    const bmk = '<p:cond evt="onMediaBookmark" delay="0"><p:tgtEl><p14:bmkTgt spid="5" bmkName="m1"/></p:tgtEl></p:cond>';
    const m = parseSlideTiming(parseXml(sld(interactive(bmk, [group(effect('3')), group(effect('4'))]))), one);
    expect(m.bookmarkTriggers?.[0]?.effects.map((e) => e.target?.spid)).toEqual(['3']);
    expect(m.interactive.map((e) => e.target?.spid)).toEqual(['4']);
  });
});

describe('detalhes do parser', () => {
  it('show="false" também é oculto', () => {
    expect(parseSlideTiming(parseXml(sld('', 'show="false"')), one).hidden).toBe(true);
    expect(parseSlideTiming(parseXml(sld('', 'show="0"')), one).hidden).toBe(true);
    expect(parseSlideTiming(parseXml(sld('', 'show="1"')), one).hidden).toBe(false);
  });

  it('alvo de TINTA (<p:inkTgt> irmão de <p:spTgt>)', () => {
    const ink = setVis('9').replace('<p:spTgt spid="9"/>', '<p:inkTgt spid="12"/>');
    const m = parseSlideTiming(parseXml(sld(mainSeq([group(effect('9', 'entr', '', ink))]))), one);
    expect(m.steps[0]!.effects[0]!.target).toEqual({ spid: '12', sub: 'inkTgt' });
  });

  it('iterate backwards="true" vale como "1"', () => {
    const inner = setVis('3');
    const it = effect('3', 'entr', '', inner).replace('<p:childTnLst>', '<p:iterate type="lt" backwards="true"><p:tmPct val="10000"/></p:iterate><p:childTnLst>');
    const m = parseSlideTiming(parseXml(sld(mainSeq([group(it)]))), one);
    expect(m.steps[0]!.effects[0]!.node.iterate?.backwards).toBe(true);
  });

  it('spd NÃO encurta a duração na sequência (medido no oráculo: pb-tempo-2 "Velocidade 2x")', () => {
    const fade = '<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="91" dur="2000"/><p:tgtEl><p:spTgt spid="3"/></p:tgtEl></p:cBhvr></p:animEffect>';
    const m = parseSlideTiming(parseXml(sld(mainSeq([group(effect('3', 'entr', 'spd="200000"', setVis('3') + fade))]))), one);
    expect(m.steps[0]!.effects[0]!.durMs).toBe(2000);
    expect(m.steps[0]!.durMs).toBe(2000);
  });
});

describe('"Configurar apresentação" (<p:showPr> do presProps)', () => {
  const deck = (showPr: string | null): PptxPackage => {
    const files: Record<string, Uint8Array> = {
      'ppt/presentation.xml': strToU8(`<p:presentation ${NS}><p:sldSz cx="9144000" cy="5143500"/></p:presentation>`),
      'ppt/_rels/presentation.xml.rels': strToU8('<Relationships><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/></Relationships>'),
    };
    if (showPr !== null) files['ppt/presProps.xml'] = strToU8(`<p:presentationPr ${NS}>${showPr}</p:presentationPr>`);
    return PptxPackage.load(zipSync(files));
  };

  it('loop / useTimings / showAnimation / quiosque / faixa de slides', () => {
    const p = readPresentation(deck('<p:showPr loop="1" useTimings="0" showAnimation="0"><p:kiosk/><p:sldRg st="2" end="4"/></p:showPr>'));
    expect(p.show).toEqual({ loop: true, useTimings: false, showAnimation: false, kiosk: true, range: [1, 3] });
  });

  it('sem showPr/presProps: nada (default do app)', () => {
    expect(readPresentation(deck(null)).show).toBeUndefined();
    expect(readPresentation(deck('<p:showPr showNarration="1"><p:sldAll/></p:showPr>')).show).toEqual({});
  });
});
