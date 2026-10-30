/**
 * Motor e dicionários DESTE repositório (src/hunspell, src/dicts) no registro
 * de fontes — para os testes, as demos e os bundles de desenvolvimento. Os
 * produtos publicados não importam este módulo: lá o motor e os dicionários são
 * os pacotes `@universal-office/spellcheck` e `@universal-office/dictionary-*`,
 * gerados pelo tools/build-pkg.mjs a partir destes mesmos arquivos.
 *
 * Cada parte continua sendo um import() (um chunk no bundle): nada pesa antes da
 * 1ª revisão.
 */
import { registerDictionary, registerSpellcheck } from './sources.js';

export function registerBuiltinSources(): void {
  registerSpellcheck(() => import('./hunspell/wasm.js'));
  registerDictionary('pt-BR', () => import('./dicts/pt-BR.js'));
  registerDictionary('en-US', () => import('./dicts/en-US.js'));
}
