export { UniversalDocumentViewerElement } from './universal-document-viewer.js';
export type {
  UniversalDocumentViewerPlugin, UniversalDocumentViewerPluginContext, UniversalDocumentViewerPluginHost,
  ViewerInlineClickDetail, ViewerLinkClickDetail,
} from './plugins.js';
export type { InlineDrawContext, InlineMeasureContext, InlineRenderer } from '@universal-office/docx-layout';
export type { CustomInline, DocumentLink } from '@universal-office/docx-core';
export { CONTROL_ITEMS, type ControlItem, type ZoomSpec } from './controls.js';
export { VIEW_MODES, type ViewMode } from './views.js';
// resolvedor de fontes único dos apps: o host configura base/fontes do SO nele
export { FontResolver, type HostFontFace, type HostFontProvider } from '@universal-office/fonts';
