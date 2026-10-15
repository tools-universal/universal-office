/**
 * Camada de idioma × Excel pt-BR desta máquina (test/oracle/locale-pt-BR.*.json,
 * gerados por tools/locale/generate.mjs a partir do oráculo — nunca à mão).
 * Divergências aceitas: locale-pt-BR.known.json ({ "id": "motivo medido" }; "file:<id>"
 * só no teste da forma de arquivo).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import '../src/index.js';
import { allFns, EN_US, PT_BR, type ValueLocale } from '../src/fn.js';
import {
  acceptsArgCount, canonicalError, canonicalFunctionName, catalog, catalogEntry, deriveValueLocale, EXCEL_LANGUAGES,
  fromLocal, functionKind, functionNames, getLanguage, languages, localFunctionName, localizeBool, localizeError,
  resolveSyntax, toLocal, valueLocaleFor, withFilePrefix,
} from '../src/i18n/index.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'oracle');
const read = (f: string): any => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const known: Record<string, string> = existsSync(join(dir, 'locale-pt-BR.known.json')) ? read('locale-pt-BR.known.json') : {};
const PT = { lang: 'pt-BR' } as const;

describe('pt-BR × Excel: nome de cada função do catálogo', () => {
  const { fns } = read('locale-pt-BR.functions.json') as { fns: { name: string; canonical: string; local: string; unknown?: boolean }[] };
  it('Formula2 → Formula2Local e Formula2Local → Formula2', () => {
    const bad: string[] = [];
    for (const f of fns) {
      const loc = toLocal(f.canonical, PT), back = fromLocal(f.local, PT);
      if (loc !== f.local) bad.push(`${f.name}: toLocal ${loc} × Excel ${f.local}`);
      if (back !== f.canonical) bad.push(`${f.name}: fromLocal ${back} × Excel ${f.canonical}`);
    }
    expect(bad).toEqual([]);
    expect(fns.filter((f) => !f.unknown).length).toBe(catalog().length);
  });
});

describe('pt-BR × Excel: sintaxe', () => {
  const { cases, names } = read('locale-pt-BR.syntax.json') as { cases: any[]; names: string[] };
  const ok = cases.filter((c) => !c.err && !known[c.id]);
  it('A1: canônico ↔ local', () => {
    const bad: string[] = [];
    for (const c of ok) {
      const o = { ...PT, inTable: c.inTable, names };
      const loc = toLocal(c.canonical, o), back = fromLocal(c.local, o);
      if (loc !== c.local) bad.push(`${c.id}: toLocal ${loc} × Excel ${c.local}`);
      if (back !== c.canonical) bad.push(`${c.id}: fromLocal ${back} × Excel ${c.canonical}`);
    }
    expect(bad).toEqual([]);
  });
  it('R1C1: canônico ↔ local', () => {
    const bad: string[] = [];
    for (const c of ok) {
      const o = { ...PT, r1c1: true, inTable: c.inTable, names };
      const loc = toLocal(c.r1c1, o), back = fromLocal(c.r1c1Local, o);
      if (loc !== c.r1c1Local) bad.push(`${c.id}: toLocal ${loc} × Excel ${c.r1c1Local}`);
      if (back !== c.r1c1) bad.push(`${c.id}: fromLocal ${back} × Excel ${c.r1c1}`);
    }
    expect(bad).toEqual([]);
  });
  it('forma do arquivo (OOXML) → tela no idioma', () => {
    const bad: string[] = [];
    for (const c of ok) {
      if (c.file === undefined || known[`file:${c.id}`]) continue;
      const loc = toLocal(c.file, { ...PT, inTable: c.inTable, names });
      if (loc !== c.local) bad.push(`${c.id}: ${c.file} → ${loc} × Excel ${c.local}`);
    }
    expect(bad).toEqual([]);
  });
  it('o que o usuário digita no idioma (minúsculas, #Esta Linha, L1C1 em A1, nome em inglês…)', () => {
    const bad: string[] = [];
    for (const c of ok) {
      if (c.set !== 'f2Local' && c.set !== 'r1c1Local') continue;
      const r1c1 = c.set === 'r1c1Local';
      const back = fromLocal(c.input, { ...PT, r1c1, inTable: c.inTable, names });
      const want = r1c1 ? c.r1c1 : c.canonical;
      if (back !== want) bad.push(`${c.id}: ${c.input} → ${back} × Excel ${want}`);
    }
    expect(bad).toEqual([]);
  });
  it('en-US com separadores canônicos é a identidade', () => {
    const bad: string[] = [];
    for (const c of ok) {
      if (/_xludf\./.test(c.canonical)) continue;
      const o = { lang: 'en-US', inTable: c.inTable, names };
      if (toLocal(c.canonical, o) !== c.canonical) bad.push(`${c.id}: ${toLocal(c.canonical, o)}`);
      if (fromLocal(c.canonical, o) !== c.canonical) bad.push(`${c.id}: ${fromLocal(c.canonical, o)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('pt-BR × Excel: erros, booleanos, separadores e valores', () => {
  const env = read('locale-pt-BR.env.json');
  it('nome local de cada erro', () => {
    for (const e of env.errors) {
      if (!e.local) continue;
      expect(localizeError(e.name, 'pt-BR')).toBe(e.local);
      expect(canonicalError(e.local, 'pt-BR')).toBe(e.name);
      expect(canonicalError(e.local.toLowerCase(), 'pt-BR')).toBe(e.name);
    }
    expect(localizeBool(true, 'pt-BR')).toBe('VERDADEIRO');
  });
  it('separadores padrão = Application.International', () => {
    const s = resolveSyntax(PT);
    const i = env.international;
    expect([s.decimal, s.list, s.arrayCol, s.arrayRow]).toEqual([i['3'], i['5'], i['14'], i['15']]);
    // decimal "." no Windows de quem usa pt-BR: lista volta a ","; a coluna da matriz não colide
    expect(resolveSyntax({ lang: 'pt-BR', decimal: '.' })).toMatchObject({ list: ',', arrayCol: '\\' });
    // en-US com decimal ",": lista ";" e coluna da matriz alternativa
    expect(resolveSyntax({ lang: 'en-US', decimal: ',' })).toMatchObject({ list: ';', arrayCol: '\\' });
  });
  it('PT_BR (ValueLocale) bate com o Excel', () => {
    const v = (id: string): string => String(env.values.find((x: any) => x.id === id).v);
    expect(PT_BR.trueText).toBe(v('locale-val-true'));
    expect(PT_BR.falseText).toBe(v('locale-val-false'));
    expect(v('locale-val-dec')).toBe(`1234${PT_BR.decimal}5`);
    for (let m = 1; m <= 12; m++) {
      const [long, abbr] = v(`locale-val-month-${m}`).split('|');
      expect([PT_BR.monthNames[m - 1], PT_BR.monthAbbr[m - 1]]).toEqual([long, abbr]);
    }
    for (let d = 0; d < 7; d++) {
      const [long, abbr] = v(`locale-val-day-${d}`).split('|');
      expect([PT_BR.dayNames[d], PT_BR.dayAbbr[d]]).toEqual([long, abbr]);
    }
    expect(v('locale-val-am-pm')).toBe(`6 ${PT_BR.pm}`);
    const i = env.international;
    expect(PT_BR.group).toBe(i['4']);
    expect(PT_BR.currency).toBe(i['25']);
    expect(PT_BR.generalName).toBe(i['26']);
    expect(PT_BR.dateSep).toBe(i['17']);
    expect(PT_BR.timeSep).toBe(i['18']);
    expect(PT_BR.dateOrder).toBe(['MDY', 'DMY', 'YMD'][i['32']]);
    expect(PT_BR.formatLetters).toEqual({ year: i['19'], month: i['20'], day: i['21'], hour: i['22'], minute: i['23'], second: i['24'] });
    expect(valueLocaleFor('pt-BR')).toBe(PT_BR);
  });
  it('Intl (CLDR) reproduz o pt-BR medido nos campos que o Excel tira do Windows', () => {
    const d: ValueLocale = deriveValueLocale('pt-BR');
    expect({ ...d, id: PT_BR.id }).toMatchObject({
      decimal: PT_BR.decimal, group: PT_BR.group, dateOrder: PT_BR.dateOrder, dateSep: PT_BR.dateSep, timeSep: PT_BR.timeSep,
      monthNames: PT_BR.monthNames, dayNames: PT_BR.dayNames, currency: PT_BR.currency, trueText: PT_BR.trueText,
      generalName: PT_BR.generalName, formatLetters: PT_BR.formatLetters,
    });
  });
});

describe('catálogo', () => {
  it('nomes únicos, prefixos e aridades coerentes', () => {
    const names = catalog().map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    expect(catalogEntry('_xlfn.XLOOKUP')?.prefix).toBe('_xlfn.');
    expect(catalogEntry('sort')?.prefix).toBe('_xlfn._xlws.');
    expect(withFilePrefix('FILTER')).toBe('_xlfn._xlws.FILTER');
    expect(withFilePrefix('VLOOKUP')).toBe('VLOOKUP');
    const sumifs = catalogEntry('SUMIFS')!;
    expect([2, 3, 4, 5, 255, 256].map((n) => acceptsArgCount(sumifs, n))).toEqual([false, true, false, true, true, false]);
    const gpd = catalogEntry('GETPIVOTDATA')!;
    expect([2, 3, 4, 5, 6, 13, 14].map((n) => acceptsArgCount(gpd, n))).toEqual([true, true, true, false, true, false, true]);
    expect(functionKind('GET.CELL')).toBe('reserved');
    expect(functionKind('FOO')).toBe('unknown');
    expect(functionKind('_xlfn.LET')).toBe('sheet');
  });
  it('registro de funções × catálogo (prefixo e aridade medidos)', () => {
    const bad: string[] = [];
    for (const def of allFns()) {
      const e = catalogEntry(def.name);
      if (!e) { bad.push(`${def.name}: fora do catálogo do Excel`); continue; }
      if ((def.prefix ?? '') !== e.prefix) bad.push(`${def.name}: prefixo ${def.prefix ?? "''"} × Excel ${e.prefix || "''"}`);
      if (def.minArgs !== e.minArgs || def.maxArgs !== e.maxArgs) bad.push(`${def.name}: args ${def.minArgs}..${def.maxArgs} × Excel ${e.minArgs}..${e.maxArgs}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('idiomas', () => {
  it('toda tabela registrada: nomes locais únicos e ida e volta de cada função', () => {
    for (const lang of languages()) {
      const seen = new Map<string, string>();
      for (const e of catalog()) {
        const loc = localFunctionName(e.name, lang).toLocaleUpperCase(lang.id);
        expect(seen.get(loc), `${lang.id}: ${loc} para ${e.name} e ${seen.get(loc)}`).toBeUndefined();
        seen.set(loc, e.name);
        if (e.operator) continue;
        const f = `=${e.name}()`;
        expect(fromLocal(toLocal(f, { lang }), { lang })).toBe(f);
        expect(canonicalFunctionName(localFunctionName(e.name, lang), lang)).toBe(e.name);
      }
    }
  });
  it('lista dos idiomas do Excel', () => {
    const ids = EXCEL_LANGUAGES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXCEL_LANGUAGES.filter((l) => l.measured).map((l) => l.id).sort()).toEqual(['en-US', 'pt-BR']);
    expect(getLanguage('pt-br')?.id).toBe('pt-BR');
    expect(getLanguage('de-AT')).toBeUndefined();
    expect(functionNames('pt-BR').find((f) => f.canonical === 'VLOOKUP')?.name).toBe('PROCV');
  });
  it('idioma sem tabela usa os nomes em inglês com os separadores regionais', () => {
    expect(toLocal('=SUM(1.5,{1,2;3,4})', { lang: 'xx-YY', decimal: ',' })).toBe('=SUM(1,5;{1\\2;3\\4})');
    expect(toLocal('=SUM(1.5,2)', { lang: 'de-DE' })).toBe('=SUM(1.5,2)');
  });
  it('ValueLocale derivado do Intl para outro idioma', () => {
    const de = deriveValueLocale('de-DE');
    expect([de.decimal, de.group, de.dateOrder, de.dateSep, de.monthNames[0], de.currency]).toEqual([',', '.', 'DMY', '.', 'Januar', '€']);
    expect(valueLocaleFor('en-US')).toBe(EN_US);
  });
});

describe('tradutor: casos que o oráculo não cobre', () => {
  it('parâmetros de LAMBDA/LET com nome de função não viram função como valor', () => {
    expect(fromLocal('=LAMBDA(taxa;taxa*2)(3)', PT)).toBe('=LAMBDA(taxa,taxa*2)(3)');
    expect(toLocal('=LAMBDA(rate,rate*2)(3)', PT)).toBe('=LAMBDA(rate;rate*2)(3)');
    expect(fromLocal('=AGRUPARPOR(A1:A3;B1:B3;soma)', PT)).toBe('=GROUPBY(A1:A3,B1:B3,SUM)');
  });
  it('forma do arquivo com prefixos', () => {
    expect(fromLocal('=LET(x;1,5;y;2;x*y)', { ...PT, filePrefixes: true })).toBe('=_xlfn.LET(_xlpm.x,1.5,_xlpm.y,2,_xlpm.x*_xlpm.y)');
    expect(fromLocal('=LAMBDA(a;[b];SE(ISOMITTED(b);a;b))(1)', { ...PT, filePrefixes: true }))
      .toBe('=_xlfn.LAMBDA(_xlpm.a,_xlop.b,IF(_xlfn.ISOMITTED(_xlpm.b),_xlpm.a,_xlpm.b))(1)');
    expect(fromLocal('=AGRUPARPOR(A1:A3;B1:B3;SOMA)', { ...PT, filePrefixes: true })).toBe('=_xlfn.GROUPBY(A1:A3,B1:B3,_xleta.SUM)');
    expect(fromLocal('=CLASSIFICAR(A1:A3)', { ...PT, filePrefixes: true })).toBe('=_xlfn._xlws.SORT(A1:A3)');
    expect(fromLocal('=SOMA(Vendas)', { ...PT, filePrefixes: true })).toBe('=SUM(Vendas)');
    expect(fromLocal('=[@B]*2', { ...PT, filePrefixes: true, inTable: 'Vendas' })).toBe('=Vendas[[#This Row],[B]]*2');
  });
  it('textos, nomes de aba e referências externas passam intactos', () => {
    expect(toLocal(`=SUM('Plan, 1'!A1,[1]Dados!B2,"SUM(1,2)")`, PT)).toBe(`=SOMA('Plan, 1'!A1;[1]Dados!B2;"SUM(1,2)")`);
    expect(toLocal('=IF(A1="#N/A",TRUE,#N/A)', PT)).toBe('=SE(A1="#N/A";VERDADEIRO;#N/D)');
  });
});
