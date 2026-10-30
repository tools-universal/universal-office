import type { CustomInline, DocumentLink } from '@universal-office/docx-core';
import type { InlineRenderer } from '@universal-office/docx-layout';

/** O que um plugin enxerga do viewer. */
export interface UniversalDocumentViewerPluginHost extends HTMLElement {
  getLinks(): DocumentLink[];
  getCustomInlines(type?: string): CustomInline[];
  repaint(): void;
}

export interface UniversalDocumentViewerPluginContext {
  viewer: UniversalDocumentViewerPluginHost;
}

/**
 * Extensão do `<universal-document-viewer>` — o mesmo modelo do
 * `<universal-write>` (e dos módulos/formatos do Quill): os `inlineRenderers`
 * são os MESMOS objetos que o editor usa, então um plugin desenha o inline do
 * mesmo jeito nos dois. Instalada por instância (`viewer.use(plugin)`) ou para
 * todas (`UniversalDocumentViewerElement.register(plugin)`).
 */
export interface UniversalDocumentViewerPlugin {
  id: string;
  inlineRenderers?: readonly InlineRenderer[];
  /** liga ouvintes (ex.: `udv-inline-click`); devolve a limpeza (chamada no unuse) */
  setup?(context: UniversalDocumentViewerPluginContext): void | (() => void);
}

/** Detalhe do `udv-link-click` (cancelável: sem preventDefault, http/https/mailto abrem numa aba nova). */
export interface ViewerLinkClickDetail extends DocumentLink {
  page: number;
}

/** Detalhe do `udv-inline-click`. */
export interface ViewerInlineClickDetail extends CustomInline {
  page: number;
}
