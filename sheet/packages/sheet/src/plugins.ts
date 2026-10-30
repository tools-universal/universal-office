// Extensões do <universal-sheet> — o mesmo modelo do <universal-write>
// (PLUGINS.md do Write): instaladas por instância (`sheet.use(plugin)`) ou para
// todas (`UniversalSheetElement.register(plugin)`, como `Quill.register`), com
// `setup` (ouvintes/estado) e `toolbar` (comandos e lugares nas barras).
import type { BarButtonOptions, BarContribution, BarRowOptions, ColorScheme, UiLang } from '@universal-office/ui';

/** O que um plugin enxerga do elemento (a API pública inteira está no próprio elemento). */
export interface UniversalSheetPluginHost extends HTMLElement {
  /** tema efetivo da interface ('light' | 'dark'), pelo color-scheme do contexto ou `theme` */
  readonly effectiveTheme: ColorScheme;
}

export interface UniversalSheetPluginContext {
  sheet: UniversalSheetPluginHost;
}

/**
 * Ferramentas para os WIDGETS da contribuição: botões e ícones com o visual da
 * barra (Material Symbols em SVG — fontes de ícone da página não chegam ao
 * shadow root), ripple e claro/escuro pelos tokens. O mesmo kit do Write.
 */
export interface UniversalSheetBarKit {
  /** botão: `filled` | `tonal` | `outlined` | `text` | `icon` | `icon-filled` | `icon-tonal`; rótulo `{ en, pt }` ou texto */
  createBarButton(options: BarButtonOptions): HTMLButtonElement;
  /** ícone (Material Symbol) num `<span class="uo-ic-box">`, na cor do texto */
  createBarIcon(name: string, options?: { size?: number; title?: string }): HTMLSpanElement;
  /** o ícone existe no conjunto embutido? */
  hasBarIcon(name: string): boolean;
  /** linha mínima com o visual da linha de título, para montar FORA do elemento */
  createBarRow(options?: BarRowOptions): HTMLDivElement;
  /** o CSS das barras (o mesmo do elemento) */
  readonly barCss: string;
  barStyleSheet(): CSSStyleSheet | null;
  adoptBarStyles(root: Document | ShadowRoot): void;
}

/** Contexto da contribuição para as barras: o elemento, o idioma, o tema e o kit de widgets. */
export interface UniversalSheetToolbarContext extends UniversalSheetPluginContext {
  lang: UiLang;
  /** tema efetivo na montagem; os widgets acompanham a troca no `sync()` */
  theme: ColorScheme;
  ui: UniversalSheetBarKit;
}

/**
 * Extensão do `<universal-sheet>`. `toolbar` devolve os comandos e onde eles
 * aparecem (barra compacta e ribbon) — chamada a cada montagem da barra (troca
 * de idioma, de compacta/ribbon, de plugins).
 */
export interface UniversalSheetPlugin {
  id: string;
  /** liga ouvintes/estado; devolve a limpeza (chamada no unuse) */
  setup?(context: UniversalSheetPluginContext): void | (() => void);
  toolbar?(context: UniversalSheetToolbarContext): BarContribution;
}
