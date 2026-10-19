// @universal-office/docx-core — modelo do documento do Write (leitura/gravação
// OOXML sem perdas, .doc binário) e as conversões de formato SEM DOM que
// trabalham sobre ele: export/ (HTML e Markdown) e odf/ (ler/gravar .odt).
// Antes eram os pacotes @universal-office/docx-export e @universal-office/odf.
export * from './core.js';
export * from './export/index.js';
export * from './odf/index.js';
