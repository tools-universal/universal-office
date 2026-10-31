import type { FontVariant, InlineDrawContext, InlineMeasureContext, InlineRenderer } from '@universal-office/docx-layout';
import type { BarButtonOptions, BarContribution, BarRowOptions, ColorScheme, UiLang } from '@universal-office/ui';

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

/** Contrato de desenho dos inlines de plugin — o MESMO do viewer
 *  (`@universal-office/docx-layout`): um plugin serve aos dois componentes. */
export type UniversalWriteInlineMeasureContext<T = unknown> = InlineMeasureContext<T>;
export type UniversalWriteInlineDrawContext<T = unknown> = InlineDrawContext<T>;
export type UniversalWriteInlineRenderer<T = unknown> = InlineRenderer<T>;

export interface UniversalWritePluginHost extends HTMLElement {
  insertCustomInline<T>(
    type: string,
    data: T,
    options?: { fallbackText?: string },
  ): void;
  selectedText(): string;
  focusEditor(): void;
  /** tema efetivo da interface ('light' | 'dark'), pelo color-scheme do contexto ou `theme` */
  readonly effectiveTheme: ColorScheme;
}

export interface UniversalWritePluginContext {
  editor: UniversalWritePluginHost;
}

/**
 * Ferramentas para os WIDGETS da contribuição: botões e ícones com o visual da
 * barra (Material Symbols em SVG — fontes de ícone da página, como Font
 * Awesome, não chegam ao shadow root), ripple e claro/escuro pelos tokens.
 */
export interface UniversalWriteBarKit {
  /** botão: `filled` | `tonal` | `outlined` | `text` | `icon` | `icon-filled` | `icon-tonal`, `size: 'small'` (pílula de 24px); rótulo `{ en, pt, es }` ou texto, `lang` do contexto por padrão */
  createBarButton(options: BarButtonOptions): HTMLButtonElement;
  /** ícone (Material Symbol) num `<span class="uo-ic-box">`, na cor do texto */
  createBarIcon(name: string, options?: { size?: number; title?: string }): HTMLSpanElement;
  /** o ícone existe no conjunto embutido? */
  hasBarIcon(name: string): boolean;
  /** linha mínima com o visual da linha de título (título à esquerda, ações à direita) para montar FORA do editor */
  createBarRow(options?: BarRowOptions): HTMLDivElement;
  /** o CSS das barras (o mesmo do editor) */
  readonly barCss: string;
  /** o CSS das barras numa `CSSStyleSheet` construída e compartilhada (null sem suporte) */
  barStyleSheet(): CSSStyleSheet | null;
  /** põe o CSS das barras num documento ou shadow root (adoptedStyleSheets; senão um `<style>`), uma vez */
  adoptBarStyles(root: Document | ShadowRoot): void;
}

/** Contexto da contribuição para as barras: o editor, o idioma, o tema e o kit de widgets. */
export interface UniversalWriteToolbarContext extends UniversalWritePluginContext {
  lang: UiLang;
  /** tema efetivo na montagem; os widgets acompanham a troca no `sync()` (as barras sincronizam a cada `uw-theme-change`) */
  theme: ColorScheme;
  ui: UniversalWriteBarKit;
}

/**
 * Extensão do `<universal-write>` — o equivalente aos módulos/formatos do
 * Quill. Instalada por instância (`editor.use(plugin)`) ou para todas
 * (`UniversalWriteElement.register(plugin)`, como `Quill.register`).
 */
export interface UniversalWritePlugin {
  id: string;
  /** inlines atômicos (gravados como w:sdt) com medida e desenho próprios */
  inlineRenderers?: readonly UniversalWriteInlineRenderer[];
  /** liga ouvintes/estado; devolve a limpeza (chamada no unuse) */
  setup?(context: UniversalWritePluginContext): void | (() => void);
  /**
   * Comandos e lugares nas barras (topbar): menus, grupos e botões, na barra
   * compacta e na ribbon — o `modules.toolbar` do Quill. Chamado a cada
   * montagem da barra (troca de idioma, de compacta/ribbon, de plugins).
   */
  toolbar?(context: UniversalWriteToolbarContext): BarContribution;
}
