// Extensões do <universal-slides>: o mesmo modelo do <universal-write> — um
// plugin por instância (`slides.use(plugin)`) ou para todas
// (`UniversalSlidesElement.register(plugin)`), com `setup` (ouvintes/estado) e
// `toolbar` (comandos e lugares nas barras, na compacta e na ribbon).
import type { BarButtonOptions, BarContribution, BarRowOptions, ColorScheme, UiLang } from '@universal-office/ui';
import type { HostFontProvider } from '@universal-office/fonts';
import type { UniversalSlidesElement } from './universal-slides.js';

/** Arquivo entregue pelo app hospedeiro (Abrir nativo, arquivo aberto pelo SO). */
export interface UniversalSlidesHostFile {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** Onde o host guarda o arquivo (opaco; Electron: caminho). Volta no saveFile para "Salvar" gravar no mesmo lugar. */
  path?: string;
}

/** Resultado do saveFile: o nome gravado (e onde, para o próximo "Salvar"). */
export type UniversalSlidesHostSaved = string | { name: string; path?: string };

/**
 * Integração OPCIONAL com o app hospedeiro (Electron, PWA): o que só ele sabe
 * fazer. Sem host, as barras usam o caminho web (File System Access,
 * download, janela de impressão do navegador, beforeunload).
 *
 *   slides.appHost = { openFile: () => bridge.open(), windowControlsOverlay: true };
 */
export interface UniversalSlidesHost {
  /** Diálogo de abrir do host; null = cancelado. */
  openFile?(): Promise<UniversalSlidesHostFile | null>;
  /** Grava; devolve o nome (ou { name, path }) ou null (cancelado). `path` ausente = Salvar como. */
  saveFile?(data: Uint8Array, opts: { name: string; saveAs: boolean; path?: string }): Promise<UniversalSlidesHostSaved | null>;
  /** Exportar pelo host: `data` gera os bytes só depois da escolha do destino. */
  exportFile?(kind: 'pdf' | 'html' | 'md' | 'png', name: string, data: () => Promise<Uint8Array | string>): Promise<string | null>;
  /** Imprimir pelo diálogo do sistema, um slide por folha (dataURLs). */
  print?(opts: { pages: string[]; title: string; landscape: boolean }): Promise<void>;
  /** Fontes do SO (famílias / bytes) — viram o host do resolvedor de fontes. */
  listFonts?: HostFontProvider['list'];
  resolveFonts?: HostFontProvider['resolve'];
  /** Alterações não salvas (confirmação ao fechar a janela). */
  setDirty?(dirty: boolean, name: string): void;
  /** "Salvar" na confirmação ao fechar: o componente salva e chama closeWindow. */
  onSaveBeforeClose?(cb: () => void): void;
  closeWindow?(): void;
  /** Tema efetivo (controles da janela sobrepostos à barra de título). */
  setTitleTheme?(dark: boolean): void;
  /** Nome da apresentação mudou (título da janela). */
  setTitle?(title: string): void;
  /**
   * O componente ocupa o topo de uma janela SEM MOLDURA cujos controles do SO
   * ficam sobrepostos (Electron `titleBarOverlay`, PWA window-controls-overlay):
   * a linha de título reserva a área deles e passa a arrastar a janela.
   */
  windowControlsOverlay?: boolean;
}

/**
 * Ferramentas para os WIDGETS da contribuição: botões e ícones com o visual da
 * barra (Material Symbols em SVG), a linha mínima e o CSS das barras.
 */
export interface UniversalSlidesBarKit {
  createBarButton(options: BarButtonOptions): HTMLButtonElement;
  createBarIcon(name: string, options?: { size?: number; title?: string }): HTMLSpanElement;
  hasBarIcon(name: string): boolean;
  createBarRow(options?: BarRowOptions): HTMLDivElement;
  readonly barCss: string;
  barStyleSheet(): CSSStyleSheet | null;
  adoptBarStyles(root: Document | ShadowRoot): void;
}

export interface UniversalSlidesPluginContext {
  editor: UniversalSlidesElement;
}

/** Contexto da contribuição para as barras: o editor, o idioma, o tema e o kit de widgets. */
export interface UniversalSlidesToolbarContext extends UniversalSlidesPluginContext {
  lang: UiLang;
  /** tema efetivo na montagem (as barras sincronizam a cada `us-theme-change`) */
  theme: ColorScheme;
  ui: UniversalSlidesBarKit;
}

export interface UniversalSlidesPlugin {
  id: string;
  /** liga ouvintes/estado; devolve a limpeza (chamada no unuse) */
  setup?(context: UniversalSlidesPluginContext): void | (() => void);
  /**
   * Comandos e lugares nas barras (topbar): menus, grupos e botões, na barra
   * compacta e na ribbon. Chamado a cada montagem da barra (troca de idioma,
   * de compacta/ribbon, de plugins).
   */
  toolbar?(context: UniversalSlidesToolbarContext): BarContribution;
}
