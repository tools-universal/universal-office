/**
 * Referências em fórmulas BIFF8 (rgce) — só o necessário para nomes
 * (_FilterDatabase) e séries de gráficos: ptgRef3d/ptgArea3d (com ixti do
 * EXTERNSHEET) e ptgRef/ptgArea locais; uniões e parênteses atravessados.
 */
import type { Bytes } from './biff.js';
import type { XlsGlobals } from './globals.js';

/** Área 0-based inclusiva; `ixti` = índice no EXTERNSHEET (−1 = local). */
export interface Area { ixti: number; r1: number; c1: number; r2: number; c2: number }

/** Áreas de uma fórmula em [off, off + cce). Para no 1º token não suportado. */
export function formulaAreas(r: Bytes, off: number, cce: number): Area[] {
  const out: Area[] = [];
  const end = Math.min(r.length, off + cce);
  let p = off;
  while (p < end) {
    const ptg = r.u8(p);
    const base = (ptg & 0x1f) | 0x20;
    if (ptg === 0x10 || ptg === 0x15) { p += 1; continue; } // união, parênteses
    if (ptg === 0x29 || ptg === 0x49 || ptg === 0x69) { p += 3; continue; } // ptgMemFunc: cce u16
    if (ptg < 0x20) break;
    if (base === 0x3a) { // ptgRef3d: ixti, rw, col
      out.push({ ixti: r.u16(p + 1), r1: r.u16(p + 3), c1: r.u16(p + 5) & 0x3fff, r2: r.u16(p + 3), c2: r.u16(p + 5) & 0x3fff });
      p += 7; continue;
    }
    if (base === 0x3b) { // ptgArea3d: ixti, rwFirst, rwLast, colFirst, colLast
      out.push({ ixti: r.u16(p + 1), r1: r.u16(p + 3), r2: r.u16(p + 5), c1: r.u16(p + 7) & 0x3fff, c2: r.u16(p + 9) & 0x3fff });
      p += 11; continue;
    }
    if (base === 0x24) { // ptgRef local
      out.push({ ixti: -1, r1: r.u16(p + 1), c1: r.u16(p + 3) & 0x3fff, r2: r.u16(p + 1), c2: r.u16(p + 3) & 0x3fff });
      p += 5; continue;
    }
    if (base === 0x25) { // ptgArea local
      out.push({ ixti: -1, r1: r.u16(p + 1), r2: r.u16(p + 3), c1: r.u16(p + 5) & 0x3fff, c2: r.u16(p + 7) & 0x3fff });
      p += 9; continue;
    }
    break; // erros, nomes, operadores: para
  }
  return out;
}

// ───────────────────────────── descompilação ─────────────────────────────

/** Contexto para descompilar: nomes, abas e a célula base (referências relativas RefN/AreaN). */
export interface FormulaContext {
  /**
   * ixti → prefixo da aba sem o "!" (já entre aspas se preciso; 3D = `Plan1:Plan3`),
   * `#REF` (aba apagada) ou undefined (externa/inválida).
   */
  sheetOf: (ixti: number) => string | undefined;
  /** Nome definido 1-based. */
  nameOf: (i: number) => string | undefined;
  /** Nome externo (ptgNameX: ixti + índice 1-based). */
  externOf: (ixti: number, i: number) => string | undefined;
  /** Célula base (0-based) para ptgRefN/ptgAreaN. */
  row: number;
  col: number;
  /**
   * Fórmula compartilhada/nome: ptgRef3d/ptgArea3d com bit relativo guardam
   * DESLOCAMENTO (como RefN/AreaN), não posição ([MS-XLS] RgceLocRel).
   */
  rel3d?: boolean;
}

/**
 * Funções do Excel por índice (FTAB, [MS-XLS] 2.5.198.17) com o nº FIXO de
 * argumentos para ptgFunc (−1 = variável). "nome/n" separados por vírgula.
 * Conferido com o catálogo do i18n do motor (número interno 0–367).
 */
const FTAB_SRC = '0:COUNT/-1,1:IF/-1,2:ISNA/1,3:ISERROR/1,4:SUM/-1,5:AVERAGE/-1,6:MIN/-1,7:MAX/-1,8:ROW/-1,9:COLUMN/-1,10:NA/0,'
  + '11:NPV/-1,12:STDEV/-1,13:DOLLAR/-1,14:FIXED/-1,15:SIN/1,16:COS/1,17:TAN/1,18:ATAN/1,19:PI/0,20:SQRT/1,21:EXP/1,22:LN/1,'
  + '23:LOG10/1,24:ABS/1,25:INT/1,26:SIGN/1,27:ROUND/2,28:LOOKUP/-1,29:INDEX/-1,30:REPT/2,31:MID/3,32:LEN/1,33:VALUE/1,34:TRUE/0,'
  + '35:FALSE/0,36:AND/-1,37:OR/-1,38:NOT/1,39:MOD/2,40:DCOUNT/3,41:DSUM/3,42:DAVERAGE/3,43:DMIN/3,44:DMAX/3,45:DSTDEV/3,'
  + '46:VAR/-1,47:DVAR/3,48:TEXT/2,49:LINEST/-1,50:TREND/-1,51:LOGEST/-1,52:GROWTH/-1,56:PV/-1,57:FV/-1,58:NPER/-1,59:PMT/-1,'
  + '60:RATE/-1,61:MIRR/3,62:IRR/-1,63:RAND/0,64:MATCH/-1,65:DATE/3,66:TIME/3,67:DAY/1,68:MONTH/1,69:YEAR/1,70:WEEKDAY/-1,'
  + '71:HOUR/1,72:MINUTE/1,73:SECOND/1,74:NOW/0,75:AREAS/1,76:ROWS/1,77:COLUMNS/1,78:OFFSET/-1,82:SEARCH/-1,83:TRANSPOSE/1,'
  + '86:TYPE/1,97:ATAN2/2,98:ASIN/1,99:ACOS/1,100:CHOOSE/-1,101:HLOOKUP/-1,102:VLOOKUP/-1,105:ISREF/1,109:LOG/-1,111:CHAR/1,'
  + '112:LOWER/1,113:UPPER/1,114:PROPER/1,115:LEFT/-1,116:RIGHT/-1,117:EXACT/2,118:TRIM/1,119:REPLACE/4,120:SUBSTITUTE/-1,'
  + '121:CODE/1,124:FIND/-1,125:CELL/-1,126:ISERR/1,127:ISTEXT/1,128:ISNUMBER/1,129:ISBLANK/1,130:T/1,131:N/1,140:DATEVALUE/1,'
  + '141:TIMEVALUE/1,142:SLN/3,143:SYD/4,144:DDB/-1,148:INDIRECT/-1,162:CLEAN/1,163:MDETERM/1,164:MINVERSE/1,165:MMULT/2,'
  + '167:IPMT/-1,168:PPMT/-1,169:COUNTA/-1,183:PRODUCT/-1,184:FACT/1,189:DPRODUCT/3,190:ISNONTEXT/1,193:STDEVP/-1,194:VARP/-1,'
  + '195:DSTDEVP/3,196:DVARP/3,197:TRUNC/-1,198:ISLOGICAL/1,199:DCOUNTA/3,204:USDOLLAR/-1,205:FINDB/-1,206:SEARCHB/-1,'
  + '207:REPLACEB/4,208:LEFTB/-1,209:RIGHTB/-1,210:MIDB/3,211:LENB/1,212:ROUNDUP/2,213:ROUNDDOWN/2,214:ASC/1,215:DBCS/1,216:RANK/-1,'
  + '219:ADDRESS/-1,220:DAYS360/-1,221:TODAY/0,222:VDB/-1,227:MEDIAN/-1,228:SUMPRODUCT/-1,229:SINH/1,230:COSH/1,231:TANH/1,'
  + '232:ASINH/1,233:ACOSH/1,234:ATANH/1,235:DGET/3,244:INFO/1,247:DB/-1,252:FREQUENCY/2,261:ERROR.TYPE/1,269:AVEDEV/-1,'
  + '270:BETADIST/-1,271:GAMMALN/1,272:BETAINV/-1,273:BINOMDIST/4,274:CHIDIST/2,275:CHIINV/2,276:COMBIN/2,277:CONFIDENCE/3,'
  + '278:CRITBINOM/3,279:EVEN/1,280:EXPONDIST/3,281:FDIST/3,282:FINV/3,283:FISHER/1,284:FISHERINV/1,285:FLOOR/2,286:GAMMADIST/4,'
  + '287:GAMMAINV/3,288:CEILING/2,289:HYPGEOMDIST/4,290:LOGNORMDIST/3,291:LOGINV/3,292:NEGBINOMDIST/3,293:NORMDIST/4,'
  + '294:NORMSDIST/1,295:NORMINV/3,296:NORMSINV/1,297:STANDARDIZE/3,298:ODD/1,299:PERMUT/2,300:POISSON/3,301:TDIST/3,'
  + '302:WEIBULL/4,303:SUMXMY2/2,304:SUMX2MY2/2,305:SUMX2PY2/2,306:CHITEST/2,307:CORREL/2,308:COVAR/2,309:FORECAST/3,310:FTEST/2,'
  + '311:INTERCEPT/2,312:PEARSON/2,313:RSQ/2,314:STEYX/2,315:SLOPE/2,316:TTEST/4,317:PROB/-1,318:DEVSQ/-1,319:GEOMEAN/-1,'
  + '320:HARMEAN/-1,321:SUMSQ/-1,322:KURT/-1,323:SKEW/-1,324:ZTEST/-1,325:LARGE/2,326:SMALL/2,327:QUARTILE/2,328:PERCENTILE/2,'
  + '329:PERCENTRANK/-1,330:MODE/-1,331:TRIMMEAN/2,332:TINV/2,336:CONCATENATE/-1,337:POWER/2,342:RADIANS/1,343:DEGREES/1,'
  + '344:SUBTOTAL/-1,345:SUMIF/-1,346:COUNTIF/2,347:COUNTBLANK/1,350:ISPMT/4,351:DATEDIF/3,352:DATESTRING/1,353:NUMBERSTRING/2,'
  + '354:ROMAN/-1,358:GETPIVOTDATA/-1,359:HYPERLINK/-1,360:PHONETIC/1,361:AVERAGEA/-1,362:MAXA/-1,363:MINA/-1,364:STDEVPA/-1,'
  + '365:VARPA/-1,366:STDEVA/-1,367:VARA/-1';
const FTAB = new Map<number, [string, number]>(FTAB_SRC.split(',').map((e) => {
  const [i, rest] = e.split(':') as [string, string];
  const [name, n] = rest.split('/') as [string, string];
  return [parseInt(i, 10), [name, parseInt(n, 10)]];
}));

const BIN_OPS: Record<number, string> = {
  0x03: '+', 0x04: '-', 0x05: '*', 0x06: '/', 0x07: '^', 0x08: '&', 0x09: '<', 0x0a: '<=', 0x0b: '=', 0x0c: '>=', 0x0d: '>', 0x0e: '<>',
  0x0f: ' ', 0x10: ',', 0x11: ':',
};
const ERR: Record<number, string> = { 0x00: '#NULL!', 0x07: '#DIV/0!', 0x0f: '#VALUE!', 0x17: '#REF!', 0x1d: '#NAME?', 0x24: '#NUM!', 0x2a: '#N/A' };

function colLetters(c: number): string {
  let n = c + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/** Referência A1 com $ conforme os bits relativos (col: bit 14, linha: bit 15 do campo da coluna). */
function a1(row: number, colField: number): string {
  const col = colField & 0x3fff;
  return `${colField & 0x4000 ? '' : '$'}${colLetters(col)}${colField & 0x8000 ? '' : '$'}${row + 1}`;
}

/** RefN/AreaN: deslocamentos relativos à célula base (BIFF8: linha i16, coluna i8 com 256 colunas). */
function a1Rel(rowField: number, colField: number, ctx: FormulaContext): string {
  const rRel = (colField & 0x8000) !== 0, cRel = (colField & 0x4000) !== 0;
  const row = rRel ? (ctx.row + ((rowField << 16) >> 16) + 65536) % 65536 : rowField;
  const col = cRel ? (ctx.col + ((colField << 24) >> 24) + 256) % 256 : colField & 0x3fff;
  return `${cRel ? '' : '$'}${colLetters(col)}${rRel ? '' : '$'}${row + 1}`;
}

/** Área A1; linha/coluna inteira do BIFF8 (65536 linhas / 256 colunas) vira A:A / 1:1. */
function areaText(r1f: number, r2f: number, c1f: number, c2f: number, rel: boolean, ctx: FormulaContext): string {
  const pos = (rw: number, cf: number): { r: number; c: number; rAbs: boolean; cAbs: boolean } => {
    const rRel = (cf & 0x8000) !== 0, cRel = (cf & 0x4000) !== 0;
    const r = rel && rRel ? (ctx.row + ((rw << 16) >> 16) + 65536) % 65536 : rw;
    const c = rel && cRel ? (ctx.col + ((cf << 24) >> 24) + 256) % 256 : cf & 0x3fff;
    return { r, c, rAbs: !rRel, cAbs: !cRel };
  };
  const a = pos(r1f, c1f), b = pos(r2f, c2f);
  const col = (x: typeof a): string => `${x.cAbs ? '$' : ''}${colLetters(x.c)}`;
  const row = (x: typeof a): string => `${x.rAbs ? '$' : ''}${x.r + 1}`;
  if (a.r === 0 && b.r === 0xffff) return `${col(a)}:${col(b)}`;
  if (a.c === 0 && b.c === 0xff) return `${row(a)}:${row(b)}`;
  return `${col(a)}${row(a)}:${col(b)}${row(b)}`;
}

/** Número como o Excel o escreve na fórmula ("1E-07" → "1E-7"; o parser aceita os dois). */
function numText(v: number): string {
  const s = String(v);
  return s.includes('e') ? s.replace('e', 'E') : s;
}

/** Constante de matriz (PtgExtraArray, BIFF8) a partir de `p`: texto `{…}` e o fim. */
function arrayConst(r: Bytes, p: number): { text: string; next: number } | undefined {
  if (p + 3 > r.length) return undefined;
  const cols = r.u8(p) + 1, rows = r.u16(p + 1) + 1;
  p += 3;
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      if (p >= r.length) return undefined;
      const t = r.u8(p);
      switch (t) {
        case 0x00: row.push(''); p += 9; break;
        case 0x01: row.push(numText(r.f64(p + 1))); p += 9; break;
        case 0x02: {
          const cch = r.u16(p + 1), high = (r.u8(p + 3) & 1) !== 0;
          let s = '';
          for (let k = 0; k < cch; k++) s += String.fromCharCode(high ? r.u16(p + 4 + k * 2) : r.u8(p + 4 + k));
          row.push(`"${s.replace(/"/g, '""')}"`);
          p += 4 + cch * (high ? 2 : 1);
          break;
        }
        case 0x04: row.push(r.u8(p + 1) ? 'TRUE' : 'FALSE'); p += 9; break;
        case 0x10: row.push(ERR[r.u8(p + 1)] ?? '#N/A'); p += 9; break;
        default: return undefined;
      }
    }
    out.push(row.join(','));
  }
  return { text: `{${out.join(';')}}`, next: p };
}

/**
 * Descompila uma fórmula BIFF8 (RPN) no texto do Excel (sem o "="), em inglês
 * e com vírgulas, como o `<f>` do .xlsx. Os dados extras (constantes de
 * matriz, áreas de ptgMem*) vêm DEPOIS do rgce, na ordem dos tokens.
 * undefined = token não suportado (referência a outra pasta, extensões futuras…).
 */
export function decompile(r: Bytes, off: number, cce: number, ctx: FormulaContext): string | undefined {
  const end = Math.min(r.length, off + cce);
  let extra = off + cce;
  const st: string[] = [];
  let p = off;
  const pop = (): string | undefined => st.pop();
  const sheet = (ixti: number): string | undefined => {
    const s = ctx.sheetOf(ixti);
    return s === undefined ? undefined : s === '#REF' ? '#REF!' : `${s}!`;
  };
  while (p < end) {
    const ptg = r.u8(p);
    if (ptg >= 0x03 && ptg <= 0x11) {
      const b = pop(), a = pop();
      if (a === undefined || b === undefined) return undefined;
      st.push(a + BIN_OPS[ptg]! + b);
      p += 1; continue;
    }
    switch (ptg) {
      case 0x01: case 0x02: return undefined; // ptgExp/ptgTbl: tratados por quem chama
      case 0x12: { const a = pop(); if (a === undefined) return undefined; st.push('+' + a); p += 1; continue; }
      case 0x13: { const a = pop(); if (a === undefined) return undefined; st.push('-' + a); p += 1; continue; }
      case 0x14: { const a = pop(); if (a === undefined) return undefined; st.push(a + '%'); p += 1; continue; }
      case 0x15: { const a = pop(); if (a === undefined) return undefined; st.push(`(${a})`); p += 1; continue; }
      case 0x16: st.push(''); p += 1; continue;
      case 0x17: {
        const cch = r.u8(p + 1), high = (r.u8(p + 2) & 1) !== 0;
        let s = '';
        for (let i = 0; i < cch; i++) s += String.fromCharCode(high ? r.u16(p + 3 + i * 2) : r.u8(p + 3 + i));
        st.push(`"${s.replace(/"/g, '""')}"`);
        p += 3 + cch * (high ? 2 : 1); continue;
      }
      case 0x18: return undefined; // extensões (ptgElfLel…): não suportado
      case 0x19: {
        const kind = r.u8(p + 1), w = r.u16(p + 2);
        if (kind & 0x10) { const a = pop(); if (a === undefined) return undefined; st.push(`SUM(${a})`); }
        p += 4 + (kind & 0x04 ? (w + 1) * 2 : 0); continue;
      }
      case 0x1c: st.push(ERR[r.u8(p + 1)] ?? '#N/A'); p += 2; continue;
      case 0x1d: st.push(r.u8(p + 1) ? 'TRUE' : 'FALSE'); p += 2; continue;
      case 0x1e: st.push(String(r.u16(p + 1))); p += 3; continue;
      case 0x1f: st.push(numText(r.f64(p + 1))); p += 9; continue;
    }
    const base = (ptg & 0x1f) | 0x20;
    switch (base) {
      case 0x20: { // ptgArray: os valores estão nos dados extras
        const a = arrayConst(r, extra);
        if (!a) return undefined;
        st.push(a.text); extra = a.next; p += 8; continue;
      }
      case 0x21: case 0x22: {
        const varArgs = base === 0x22;
        const argc = varArgs ? r.u8(p + 1) & 0x7f : 0;
        const tab = r.u16(p + (varArgs ? 2 : 1)) & 0x7fff;
        p += varArgs ? 4 : 3;
        let name: string, n: number;
        if (tab === 255) {
          // função de suplemento/definida pelo usuário: o 1º argumento é o nome
          n = argc;
          const args = st.splice(st.length - n, n);
          if (args.length !== n || !args[0]) return undefined;
          st.push(`${args[0]}(${args.slice(1).join(',')})`);
          continue;
        }
        const f = FTAB.get(tab);
        if (!f) return undefined;
        [name, n] = f;
        if (varArgs) n = argc;
        if (n < 0) return undefined;
        const args = n ? st.splice(st.length - n, n) : [];
        if (args.length !== n) return undefined;
        st.push(`${name}(${args.join(',')})`);
        continue;
      }
      case 0x23: { const nm = ctx.nameOf(r.u32(p + 1)); if (nm === undefined) return undefined; st.push(nm); p += 5; continue; }
      case 0x24: st.push(a1(r.u16(p + 1), r.u16(p + 3))); p += 5; continue;
      case 0x25: st.push(areaText(r.u16(p + 1), r.u16(p + 3), r.u16(p + 5), r.u16(p + 7), false, ctx)); p += 9; continue;
      case 0x26: case 0x27: case 0x28: {
        // ptgMemArea/MemErr/MemNoMem: a área vem nos tokens seguintes; MemArea tem dados extras (cAreas + Ref8U)
        if (base === 0x26) extra += 2 + r.u16(extra) * 8;
        p += 7; continue;
      }
      case 0x29: p += 3; continue;
      case 0x2a: st.push('#REF!'); p += 5; continue;
      case 0x2b: st.push('#REF!'); p += 9; continue;
      case 0x2c: st.push(a1Rel(r.u16(p + 1), r.u16(p + 3), ctx)); p += 5; continue;
      case 0x2d: st.push(areaText(r.u16(p + 1), r.u16(p + 3), r.u16(p + 5), r.u16(p + 7), true, ctx)); p += 9; continue;
      case 0x39: { const nm = ctx.externOf(r.u16(p + 1), r.u16(p + 3)); if (nm === undefined) return undefined; st.push(nm); p += 7; continue; }
      case 0x3a: {
        const sh = sheet(r.u16(p + 1));
        if (sh === undefined) return undefined;
        if (sh === '#REF!') { st.push('#REF!'); p += 7; continue; }
        st.push(sh + (ctx.rel3d ? a1Rel(r.u16(p + 3), r.u16(p + 5), ctx) : a1(r.u16(p + 3), r.u16(p + 5)))); p += 7; continue;
      }
      case 0x3b: {
        const sh = sheet(r.u16(p + 1));
        if (sh === undefined) return undefined;
        if (sh === '#REF!') { st.push('#REF!'); p += 11; continue; }
        st.push(sh + areaText(r.u16(p + 3), r.u16(p + 5), r.u16(p + 7), r.u16(p + 9), !!ctx.rel3d, ctx)); p += 11; continue;
      }
      case 0x3c: { const sh = sheet(r.u16(p + 1)); st.push(sh && sh !== '#REF!' ? `${sh}#REF!` : '#REF!'); p += 7; continue; }
      case 0x3d: { const sh = sheet(r.u16(p + 1)); st.push(sh && sh !== '#REF!' ? `${sh}#REF!` : '#REF!'); p += 11; continue; }
    }
    return undefined;
  }
  return st.length === 1 ? st[0] : undefined;
}

/**
 * Contexto de descompilação da pasta: abas pelo EXTERNSHEET (só a própria
 * pasta; 3D = `Plan1:Plan3`; aba apagada = #REF!), nomes e nomes externos.
 */
export function workbookFormulaContext(g: XlsGlobals): FormulaContext {
  return {
    sheetOf: (ixti) => {
      const x = g.xti[ixti];
      if (!x || !g.supbooks[x.book]) return undefined;
      if (x.tab < 0 || x.last < 0) return '#REF';
      const a = g.sheets[x.tab], b = g.sheets[x.last];
      if (!a || !b) return '#REF';
      if (x.last === x.tab) return quoteSheet(a.name);
      const both = `${a.name}:${b.name}`;
      return quoteSheet(a.name) === a.name && quoteSheet(b.name) === b.name ? both : `'${both.replace(/'/g, "''")}'`;
    },
    nameOf: (i) => g.names[i - 1],
    externOf: (ixti, i) => { const x = g.xti[ixti]; return x ? g.externNames[x.book]?.[i - 1] : undefined; },
    row: 0, col: 0,
  };
}

/** Nome de aba como aparece numa fórmula (entre aspas se tiver espaço/símbolo). */
export function quoteSheet(name: string): string {
  return /^[A-Za-z_\u00C0-\uFFFF][A-Za-z0-9_.\u00C0-\uFFFF]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}
