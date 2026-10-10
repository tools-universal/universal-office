export { UniversalWriteElement, type FileFormat, type ViewMode } from './universal-write.js';
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
