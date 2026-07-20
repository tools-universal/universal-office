// Entry for the documentation site's live examples.
// Importing the editor and compare packages registers <universal-write> and
// <universal-write-diff>; this module also exposes the API used by the examples
// on globalThis.UniversalOffice and pulls in the Material buttons used by the
// demo toolbars. It does not define any elements itself.
import '../src/index.js'; // side effect: registers <universal-write>
import { createMentionPlugin } from '../src/index.js';
import { diffDocuments } from '@universal-office/compare'; // side effect: registers <universal-write-diff>
import { DocxPackage, readFullDocument } from '@universal-office/docx-core';

// Material buttons (@universal-material/web) used in the live examples.
import '@universal-material/web/button/button.js';
import '@universal-material/web/button/icon-button.js';
import { ThemeBuilder } from '@universal-material/web/theme/index.js';

// Material Design 3 needs its theme tokens (--u-color-*) or the components fall
// back to unstyled defaults. Generate them from a seed and let light-dark()
// follow the page's color scheme, matching the docs' own light/dark support.
const themeStyle = document.createElement('style');
themeStyle.id = 'u-theme';
themeStyle.textContent = ThemeBuilder.create('#1A73E8').build();
document.head.appendChild(themeStyle);
// Só define um color-scheme padrão se a página host ainda não gerencia o tema.
// O seletor de tema do site (theme.js) roda antes, no <head>, e seta o
// color-scheme inline; sobrescrevê-lo aqui quebraria a escolha claro/escuro.
if (!document.documentElement.style.colorScheme) {
  document.documentElement.style.colorScheme = 'light dark';
}

(globalThis as unknown as { UniversalOffice: unknown }).UniversalOffice = {
  createMentionPlugin,
  diffDocuments,
  DocxPackage,
  readFullDocument,
};
