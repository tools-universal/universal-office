export {
  UniversalSlidesElement,
  type TextFormatState, type ShapeInfo, type FindHit, type SlideAnimationInfo,
} from './universal-slides.js';
export { UniversalSlidesViewerElement } from '@universal-office/slides-viewer';
// edição: tipos das operações (transição, formatação, propriedades, área de transferência)
export type {
  Frame, TransitionSpec, RunFormat, ArrangeMode, LayoutInfo, DocProperties, ShowSettingsSpec, ShapeClip,
} from './deck-edit.js';
export { TRANSITION_TYPES, INSERTABLE_SHAPES } from './deck-edit.js';
export { blankDeck, type BlankDeckOptions } from './blank-deck.js';
// barras (topbar/bottombar/toolbar): plugins e integração opcional com o app hospedeiro
export type {
  UniversalSlidesPlugin, UniversalSlidesPluginContext, UniversalSlidesToolbarContext, UniversalSlidesBarKit,
  UniversalSlidesHost, UniversalSlidesHostFile, UniversalSlidesHostSaved,
} from './plugins.js';
export type { BarContribution, Command } from '@universal-office/ui';
import type { UiLang } from '@universal-office/ui';
import type { UniversalSlidesBarKit } from './plugins.js';

/**
 * Kit das barras para o hospedeiro montar FORA do editor uma linha igual à da
 * barra compacta (`createBarRow`, `createBarButton`, `createBarIcon`,
 * `barCss`/`barStyleSheet()`/`adoptBarStyles(root)`). Carregado sob demanda;
 * `lang` põe o idioma nos rótulos `{ en, pt, es }`.
 */
export async function loadBarKit(lang?: UiLang): Promise<UniversalSlidesBarKit> {
  const { barKit } = await import('./bar-kit.js');
  return lang ? { ...barKit, createBarButton: (o) => barKit.createBarButton({ lang, ...o }) } : barKit;
}
// resolvedor de fontes único dos apps: o host configura base/fontes do SO nele
export { FontResolver, type HostFontFace, type HostFontProvider } from '@universal-office/fonts';
