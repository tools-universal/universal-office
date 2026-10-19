/**
 * @universal-office/spell — revisão ortográfica ÚNICA dos apps (Write, Sheet,
 * Slides): Hunspell 1.7.2 (WASM) num Worker, dicionários abertos do LibreOffice
 * (pt-BR, en-US) carregados sob demanda, dicionário do usuário guardado pelo
 * hospedeiro. Ver README.md.
 */
export { SpellChecker, type SpellCheckerOptions, type DictionaryData, type DictionaryLoader, type Misspelling, type SpellChangeListener } from './checker.js';
export { resolveLanguage, BUILTIN_DICTIONARIES, type ResolvedLanguage } from './lang.js';
export { tokenize, internetRanges, type WordToken, type TokenizeOptions } from './tokenize.js';
export { localStorageStore, memoryStore, type UserDictionaryStore } from './user-dictionary.js';
