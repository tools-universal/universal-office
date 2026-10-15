/**
 * @universal/sheet-calc — motor de cálculo de fórmulas do Universal Sheet.
 * Por dentro tudo é canônico (nomes em inglês, "," e "." como no arquivo); a
 * tradução para o idioma do usuário fica na camada i18n.
 */
export * from './values.js';
export * from './fn.js';
export * from './coerce.js';
export * from './collation.js';
export * from './criteria.js';
export * from './collate.js';
export * from './stats.js';
export * from './special-functions.js';
export * from './dates.js';
export * from './apply.js';
export * from './i18n/index.js';
// aritmética do Excel para os operadores (^ = POWER; +/− com o cancelamento do Excel) e
// a fração de ano das bases 0–4 (YEARFRAC, títulos)
export { excelPower, snapAdd, approx15, decimalRound, RoundMode } from './functions/math-util.js';
export { yearFrac } from './functions/daycount.js';

// bibliotecas de funções (registram no carregamento)
import './functions/math.js';
import './functions/engineering.js';
import './functions/financial.js';
import './functions/statistical.js';
import './functions/conditional.js';
import './functions/distributions.js';
import './functions/regression.js';
import './functions/ets.js';
import './functions/database.js';
import './functions/text.js';
import './functions/datetime.js';
import './functions/info.js';
import './functions/lookup.js';
import './functions/dynamic.js';
import './functions/logical.js';
import './functions/reference.js';
