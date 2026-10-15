/**
 * Matemática e trigonometria (SUM, SUMPRODUCT, ROUND*, MOD, POWER, LOG*, trig, MROUND, CEILING*, FLOOR*, GCD/LCM, FACT*, COMBIN*, BASE/DECIMAL, ROMAN/ARABIC, MMULT/MINVERSE/MDETERM/MUNIT, RAND*…).
 * Dono: agente FN-MATH.
 */
import { register } from '../fn.js';
import { toNumber } from '../coerce.js';
import { CalcError } from '../values.js';

register(
  // exemplo do padrão: escalar levantada sobre matrizes, erro propagado pelo avaliador
  {
    name: 'ABS', minArgs: 1, maxArgs: 1, args: 'value', lift: true,
    call: ([x], ctx) => {
      const n = toNumber(x, ctx.locale);
      return n instanceof CalcError ? n : Math.abs(n);
    },
  },
);
