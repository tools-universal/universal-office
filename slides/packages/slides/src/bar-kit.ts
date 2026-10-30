// O kit dos widgets do hospedeiro (botões, ícones, linha mínima e o CSS das
// barras), num módulo próprio: as barras o passam aos plugins
// (`plugin.toolbar`) e o hospedeiro o carrega sob demanda com `loadBarKit()`.
import {
  adoptBarStyles, barCss, barStyleSheet, createBarButton, createBarIcon, createBarRow, hasBarIcon,
} from '@universal-office/ui';
import type { UniversalSlidesBarKit } from './plugins.js';

export const barKit: UniversalSlidesBarKit = { createBarButton, createBarIcon, hasBarIcon, createBarRow, barCss, barStyleSheet, adoptBarStyles };
