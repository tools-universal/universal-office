export {
  UniversalWriteElement, type FileFormat, type ViewMode, type SectionApplyTo, type SectionInfo,
  type UniversalWriteNoticeOptions, type UniversalWriteNoticeTone,
} from './universal-write.js';
export type { StyleInfo, StyleLook, StyleFilter, StyleKind, CreateStyleOptions, ModifyStyleOptions } from './styles.js';
export type { SectionType, ColumnSpec, ColumnPreset, StyleFormat } from '@universal-office/docx-core';
// guia Design: Cor da Página, Efeitos de Preenchimento e marca-d'água
export type { GradientStyle, PageBackgroundInfo, PageFillInput, ThemeColorRef } from './page-design.js';
export type { WatermarkSpec, WatermarkTextSpec, WatermarkPictureSpec, WatermarkInfo, WatermarkLayout } from '@universal-office/docx-core';
// barras (topbar/bottombar/toolbar): integração opcional com o app hospedeiro
export type { UniversalWriteHost, UniversalWriteHostFile } from './chrome-host.js';
import type { UniversalWriteElement } from './universal-write.js';
import type { UniversalWriteBarKit } from './plugins.js';

/**
 * Abre um documento como o menu Arquivo › Abrir das barras: título, recentes
 * e o critério do Word para o Modo Protegido (`motw` = veio da Internet;
 * `trustKey` = identidade para os Documentos Confiáveis). Carrega o módulo
 * das barras sob demanda. Devolve false se os bytes não são um documento.
 */
export async function openDocument(
  el: UniversalWriteElement,
  bytes: Uint8Array,
  name: string,
  opts: { motw?: boolean; trustKey?: string; path?: string } = {},
): Promise<boolean> {
  const { appFor } = await import('./chrome-app.js');
  return appFor(el).openBytes(bytes, name, null, opts);
}
/**
 * Kit das barras para o hospedeiro montar FORA do editor uma linha igual à da
 * barra compacta (título + ações; `titlePlacement: 'above-menus'` dá a mesma
 * geometria do título acima dos menus): `createBarRow`, `createBarButton`,
 * `createBarIcon`, `barCss`/`barStyleSheet()`/`adoptBarStyles(root)`. Carregado
 * sob demanda; `lang` põe o idioma nos rótulos `{ en, pt }`.
 */
export async function loadBarKit(lang?: 'en' | 'pt'): Promise<UniversalWriteBarKit> {
  const { barKit } = await import('./bar-kit.js');
  return lang ? { ...barKit, createBarButton: (o) => barKit.createBarButton({ lang, ...o }) } : barKit;
}
// política de formatação (modo "como o Quill" para documentos com modelo)
export { TEMPLATE_DOCUMENT_POLICY, FORMATTING_POLICY_PRESETS } from './formatting-policy.js';
export type { FormattingPolicy, CharacterFormat, ListKind } from './formatting-policy.js';
// resolvedor de fontes único dos apps: o host configura base/fontes do SO nele
export { FontResolver, type HostFontFace, type HostFontProvider } from '@universal-office/fonts';
export { createMentionPlugin, type MentionData, type MentionPluginOptions } from './mention-plugin.js';
export type {
  UniversalWriteDocumentSource,
  UniversalWriteFontAsset,
  UniversalWriteInitializeOptions,
  UniversalWriteInlineDrawContext,
  UniversalWriteInlineMeasureContext,
  UniversalWriteInlineRenderer,
  UniversalWritePlugin,
  UniversalWritePluginContext,
  UniversalWritePluginHost,
  UniversalWriteToolbarContext,
  UniversalWriteBarKit,
} from './plugins.js';
// extensão das barras (plugins.toolbar) e consultas de conteúdo (getLinks, getCustomInlines)
export type {
  BarButtonOptions, BarButtonVariant, BarButtonSize, BarRowOptions, BarContribution, BarGroup, BarItem, BarWidget, BarContext, ColorScheme, Command, CompactMenu, CompactTitlePlacement, Lbl, MenuEntry, MenuItem, MenuSource, Placed, RibbonCell, RibbonTab, ThemeMode, UiLang,
} from '@universal-office/ui';
export type { CustomInline, DocumentLink } from '@universal-office/docx-core';
// revisão ortográfica: o motor e os dicionários são pacotes à parte e opcionais
// (@universal-office/spellcheck, @universal-office/dictionary-*); sem eles, sem revisão
export {
  registerSpellcheck, registerDictionary, configureSpellcheck,
  type SpellcheckModule, type SpellcheckLoader, type SpellcheckUrlOptions, type DictionaryData, type DictionaryLoader,
} from '@universal-office/spell-sources';
