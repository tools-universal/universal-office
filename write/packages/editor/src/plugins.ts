import type { FontVariant } from '@universal-office/layout';
import type { RunProps } from '@universal-office/docx-core';

export interface UniversalWriteFontAsset {
  family: string;
  variant: FontVariant;
  data: Uint8Array | ArrayBuffer;
  /** Tabela empírica opcional de advances: tamanho → caractere → twips. */
  advances?: Record<string, Record<string, number>>;
  weight?: string;
  style?: 'normal' | 'italic';
}

export interface UniversalWriteDocumentSource {
  bytes: Uint8Array;
  format?: 'docx' | 'odt';
  protected?: boolean;
}

export interface UniversalWriteInitializeOptions {
  /** Fornecer fontes em memória elimina todos os fetches obrigatórios. */
  fonts?: readonly UniversalWriteFontAsset[];
  /** Documento inicial em memória; ausente cria um documento vazio. */
  document?: UniversalWriteDocumentSource;
}

export interface UniversalWriteInlineMeasureContext<T = unknown> {
  data: T;
  fallbackText: string;
  props: RunProps;
  sizePt: number;
  measureText(text: string): number;
}

export interface UniversalWriteInlineDrawContext<T = unknown>
  extends UniversalWriteInlineMeasureContext<T> {
  ctx: CanvasRenderingContext2D;
  xTwips: number;
  yTwips: number;
  baselineTwips: number;
  widthTwips: number;
  heightTwips: number;
  scale: number;
  dark: boolean;
  color: string;
}

export interface UniversalWriteInlineRenderer<T = unknown> {
  type: string;
  toText?(data: T): string;
  measure?(context: UniversalWriteInlineMeasureContext<T>): {
    widthTwips: number;
    heightTwips?: number;
  };
  draw?(context: UniversalWriteInlineDrawContext<T>): void;
}

export interface UniversalWritePluginHost extends HTMLElement {
  insertCustomInline<T>(
    type: string,
    data: T,
    options?: { fallbackText?: string },
  ): void;
  selectedText(): string;
  focusEditor(): void;
}

export interface UniversalWritePluginContext {
  editor: UniversalWritePluginHost;
}

export interface UniversalWritePlugin {
  id: string;
  inlineRenderers?: readonly UniversalWriteInlineRenderer[];
  setup?(context: UniversalWritePluginContext): void | (() => void);
}
