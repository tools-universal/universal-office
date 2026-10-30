// O kit dos widgets do hospedeiro (botões, ícones, linha mínima e o CSS das
// barras), num módulo próprio: as barras o passam aos plugins (`plugin.toolbar`)
// e o hospedeiro o carrega sob demanda com `loadBarKit()` para montar fora do
// editor (os Material Symbols não pesam no bundle principal).
import {
  adoptBarStyles, barCss, barStyleSheet, createBarButton, createBarIcon, createBarRow, hasBarIcon,
} from '@universal-office/ui';
import type { UniversalWriteBarKit } from './plugins.js';

export const barKit: UniversalWriteBarKit = { createBarButton, createBarIcon, hasBarIcon, createBarRow, barCss, barStyleSheet, adoptBarStyles };
