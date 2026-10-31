/**
 * @universal-office/spell — revisão ortográfica ÚNICA dos apps (Write, Sheet,
 * Slides): Hunspell 1.7.2 (WASM) num Worker, dicionários abertos do LibreOffice
 * (pt-BR, en-US, es) carregados sob demanda, dicionário do usuário guardado pelo
 * hospedeiro. O motor e os dicionários vêm do registro de fontes (sources.ts):
 * nos produtos publicados, são pacotes à parte e opcionais. Ver README.md.
 */
export { SpellChecker, type SpellCheckerOptions, type DictionaryData, type DictionaryLoader, type Misspelling, type SpellChangeListener } from './checker.js';
export { resolveLanguage, type ResolvedLanguage } from './lang.js';
export {
  registerSpellcheck, registerDictionary, configureSpellcheck, spellcheckAvailable, onSpellSourcesChange,
  dictionaryPackage, PUBLISHED_DICTIONARIES, type SpellcheckModule, type SpellcheckLoader, type SpellcheckUrlOptions,
} from './sources.js';
export { tokenize, internetRanges, type WordToken, type TokenizeOptions } from './tokenize.js';
export { localStorageStore, memoryStore, type UserDictionaryStore } from './user-dictionary.js';
