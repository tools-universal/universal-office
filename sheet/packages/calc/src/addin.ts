/**
 * Funções do Analysis ToolPak chamadas como SUPLEMENTO nos .xls (Excel 97–2003
 * e quem grava BIFF: LibreOffice, POI): o conversor do sheet-core as entrega
 * como `_xll.NOME(…)`. O Excel 365 as resolve PELO NOME NO IDIOMA DELE — medido
 * no pt-BR: o Excel grava os EXTERNNAME já traduzidos (ÉPAR, FRAÇÃOANO,
 * CONVERTER, ALEATÓRIOENTRE…) e, ao abrir um .xls com os nomes em inglês, só
 * resolve os que são iguais nos dois idiomas (BESSELJ, DELTA, NOMINAL, IMREAL…);
 * os outros ficam =@ISEVEN(A1) com #NAME? (corpus .xls: 45 funções).
 * Dono: agente CALC-IO.
 */
import type { Node } from './ast.js';
import { canonicalFunctionName } from './i18n/translate.js';

/** Funções do ATP (suplemento do Excel 97–2003), hoje nativas. */
export const ATP_FUNCTIONS: ReadonlySet<string> = new Set(('ACCRINT ACCRINTM AMORDEGRC AMORLINC BESSELI BESSELJ BESSELK BESSELY BIN2DEC '
  + 'BIN2HEX BIN2OCT COMPLEX CONVERT COUPDAYBS COUPDAYS COUPDAYSNC COUPNCD COUPNUM COUPPCD CUMIPMT CUMPRINC DEC2BIN DEC2HEX DEC2OCT '
  + 'DELTA DISC DOLLARDE DOLLARFR DURATION EDATE EFFECT EOMONTH ERF ERFC FACTDOUBLE FVSCHEDULE GCD GESTEP HEX2BIN HEX2DEC HEX2OCT '
  + 'IMABS IMAGINARY IMARGUMENT IMCONJUGATE IMCOS IMDIV IMEXP IMLN IMLOG10 IMLOG2 IMPOWER IMPRODUCT IMREAL IMSIN IMSQRT IMSUB IMSUM '
  + 'INTRATE ISEVEN ISODD LCM MDURATION MROUND MULTINOMIAL NETWORKDAYS NOMINAL OCT2BIN OCT2DEC OCT2HEX ODDFPRICE ODDFYIELD ODDLPRICE '
  + 'ODDLYIELD PRICE PRICEDISC PRICEMAT QUOTIENT RANDBETWEEN RECEIVED SERIESSUM SQRTPI TBILLEQ TBILLPRICE TBILLYIELD WEEKNUM '
  + 'WORKDAY XIRR XNPV YEARFRAC YIELD YIELDDISC YIELDMAT').split(' '));

/** Resolve as chamadas `_xll.NOME(…)` do ATP pelo nome no idioma `lang` ("pt-BR"); o resto fica (#NAME?). */
export function resolveAddinCalls(n: Node, lang: string): Node {
  switch (n.t) {
    case 'fn': {
      const args = n.args.map((a) => resolveAddinCalls(a, lang));
      if (n.prefix && /^_xll\./i.test(n.prefix)) {
        const canon = canonicalFunctionName(n.name, lang);
        if (canon && ATP_FUNCTIONS.has(canon)) return { t: 'fn', name: canon, args };
      }
      return { ...n, args };
    }
    case 'call': return { ...n, fn: resolveAddinCalls(n.fn, lang), args: n.args.map((a) => resolveAddinCalls(a, lang)) };
    case 'unary': case 'paren': return { ...n, e: resolveAddinCalls(n.e, lang) };
    case 'bin': return { ...n, a: resolveAddinCalls(n.a, lang), b: resolveAddinCalls(n.b, lang) };
    default: return n;
  }
}
