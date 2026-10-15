/**
 * Camada de idioma das fórmulas: catálogo de funções do Excel, tabelas por
 * idioma e o tradutor canônico ↔ local. O motor só vê o canônico.
 */
export * from './types.js';
export * from './catalog.js';
export * from './languages.js';
export * from './translate.js';
export * from './value-locale.js';
export { PT_BR_LANG } from './langs/pt-BR.js';
