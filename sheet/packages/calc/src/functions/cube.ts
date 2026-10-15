/**
 * Funções de dados externos sem fonte: CUBE* (OLAP/modelo de dados) e STOCKHISTORY.
 * O motor não tem conexão com cubo nem com o serviço de cotações; aqui fica o que o
 * Excel devolve nesse caso. Dono: agente CALC-FIX.
 *
 * Medido no Excel 365 pt-BR (banco fix-cube):
 * - CUBE*: sem conexão válida tudo dá #N/D, depois de propagar o 1º erro dos
 *   argumentos escalares (CUBEMEMBER("x";"y";#DIV/0!) = #DIV/0!) e de exigir número
 *   no posto (CUBERANKEDMEMBER) e na propriedade de KPI (CUBEKPIMEMBER): "a" →
 *   #VALOR! (0 e 9 não são validados: #N/D). A conexão em matriz é levantada
 *   ({"a";"b"} → [#N/D #N/D]); o membro/conjunto aceita matriz sem levantar.
 * - STOCKHISTORY: valida os argumentos (código "" ou número → #VALOR!; data em texto
 *   que não é data → #VALOR!; erro propaga); válida, o Excel devolve #OCUPADO! até
 *   o serviço responder — sem rede, fica #OCUPADO!.
 */
import { register, type FnDef } from '../fn.js';
import { toNumber } from '../coerce.js';
import { ArrayValue, CalcError, ERR, type Value } from '../values.js';

const BUSY = CalcError.of('#BUSY!');

/** 1º erro escalar entre os argumentos (matriz/referência em `any` não conta). */
function firstError(args: readonly unknown[]): CalcError | undefined {
  for (const a of args) if (a instanceof CalcError) return a;
  return undefined;
}

/**
 * CUBE*: `members` = posições (0-based) que aceitam matriz sem levantar; `numeric` =
 * posições que precisam ser número (texto não numérico → #VALUE!).
 */
function cubeFn(name: string, minArgs: number, maxArgs: number, members: readonly number[], numeric: readonly number[] = []): FnDef {
  return {
    name, minArgs, maxArgs, args: (i) => (members.includes(i) ? 'any' : 'value'), lift: true,
    call: (args, ctx) => {
      const e = firstError(args);
      if (e) return e;
      for (const i of numeric) {
        const v = args[i];
        if (v === undefined || v instanceof ArrayValue) continue;
        const n = toNumber(v, ctx.locale, ctx.date1904);
        if (n instanceof CalcError) return n;
      }
      return ERR.NA;
    },
  };
}

register(
  cubeFn('CUBEMEMBER', 2, 3, [1]),
  cubeFn('CUBEVALUE', 1, 255, Array.from({ length: 254 }, (_, i) => i + 1)),
  cubeFn('CUBEMEMBERPROPERTY', 3, 3, [1]),
  cubeFn('CUBERANKEDMEMBER', 3, 4, [1], [2]),
  cubeFn('CUBEKPIMEMBER', 3, 4, [], [2]),
  cubeFn('CUBESET', 2, 5, [1]),
  cubeFn('CUBESETCOUNT', 1, 1, []),
  {
    name: 'STOCKHISTORY', prefix: '_xlfn.', minArgs: 2, maxArgs: 254, args: 'value',
    call: (args: readonly Value[], ctx) => {
      const e = firstError(args);
      if (e) return e;
      const [stock, start, end] = args;
      if (typeof stock !== 'string' || stock.trim() === '') return ERR.VALUE;
      for (const d of [start, end]) {
        if (d === undefined || d === null) continue;
        const n = toNumber(d as never, ctx.locale, ctx.date1904);
        if (n instanceof CalcError) return ERR.VALUE;
      }
      return BUSY;
    },
  },
);
