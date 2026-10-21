export { UniversalWriteElement, type FileFormat, type ViewMode, type SectionApplyTo, type SectionInfo } from './universal-write.js';
export type { StyleInfo, StyleLook, StyleFilter, StyleKind, CreateStyleOptions, ModifyStyleOptions } from './styles.js';
export type { SectionType, ColumnSpec, ColumnPreset, StyleFormat } from '@universal-office/docx-core';
// barras (topbar/bottombar/toolbar): integração opcional com o app hospedeiro
export type { UniversalWriteHost, UniversalWriteHostFile } from './chrome-host.js';
import type { UniversalWriteElement } from './universal-write.js';

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
} from './plugins.js';
