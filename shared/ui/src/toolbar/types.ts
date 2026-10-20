// Tipos do framework declarativo de barras (compacta estilo Google Docs e
// ribbon estilo Word) — o app declara COMANDOS e LAYOUTS; o framework desenha,
// sincroniza estado (habilitado/marcado/oculto) e recolhe por prioridade.
import type { UiLang } from '../i18n.js';

/** Rótulo: texto fixo ou a tabela `{ en, pt }` (escolhida com pickLabels). */
export type Lbl = string | Record<UiLang, string>;

/** Comando da barra/menus. Sem suporte (`supports` falso) fica oculto em tudo. */
export interface Command {
  id: string;
  label: Lbl;
  /** tooltip quando difere do rótulo */
  tip?: Lbl;
  /** nome do Material Symbol (ver symbols.ts) ou SVG cru (`<path…>`) */
  icon?: string;
  /** atalho exibido (tooltip e menus) */
  shortcut?: string;
  /** a API existe? (ex.: `typeof editor.insertTable === 'function'`) */
  supports?: () => boolean;
  isEnabled?: () => boolean;
  isChecked?: () => boolean;
  /** cor da faixa sob o ícone (cor da fonte, realce) */
  color?: () => string | undefined;
  run: () => unknown;
}

/** Item de menu. `label` aceita `{ en, pt }`; `submenu` é resolvido ao abrir. */
export interface MenuItem {
  id?: string;
  sep?: boolean;
  icon?: string;
  /** cor CSS de um chip no lugar do ícone ('' = "sem cor", tracejado) */
  swatch?: string;
  label?: Lbl;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
  submenu?: MenuEntry[] | (() => MenuEntry[]);
  /** bloco livre (grade de cores, seletor…); `close` fecha os menus */
  content?: (close: () => void) => HTMLElement;
}

/** Entrada declarativa: id de comando, '-' (separador) ou item. */
export type MenuEntry = string | MenuItem;
export type MenuSource = MenuEntry[] | (() => MenuEntry[]);

/** Controle livre do app (seletor de fonte, caixa de tamanho, título…). */
export interface BarWidget {
  el: HTMLElement;
  sync?(): void;
  visible?(): boolean;
}

export type BarItem =
  /** id de comando → botão de ícone (alterna se o comando tem isChecked) */
  | string
  | { cmd: string; size?: 'small' | 'large'; label?: boolean; icon?: string }
  /** botão que abre menu (ícone ou texto dinâmico + ▾) */
  | {
      menu: MenuSource; id: string; label: Lbl; icon?: string;
      /** texto no lugar do ícone (ex.: "100%") */
      text?: () => string;
      size?: 'small' | 'large'; showLabel?: boolean;
      supports?: () => boolean; isEnabled?: () => boolean; isChecked?: () => boolean;
    }
  /** botão dividido: a parte principal roda o comando, a seta abre o menu */
  | { split: string; menu: MenuSource; size?: 'small' | 'large' }
  | { widget: (ctx: BarContext) => BarWidget };

/** Célula da ribbon: um item grande, ou até 3 linhas de itens pequenos. */
export type RibbonCell = BarItem | { rows: BarItem[][] };

export interface BarGroup {
  id: string;
  label: Lbl;
  /** ícone do gatilho quando o grupo recolhe */
  icon?: string;
  /** recolhe primeiro quem tem prio menor; 0 = sempre no "⋮"; 9 = nunca recolhe */
  prio?: number;
  /** barra compacta: uma linha de itens */
  items?: BarItem[];
  /** ribbon: colunas */
  cells?: RibbonCell[];
  /** ribbon: comando do iniciador de diálogo (↘ no rodapé do grupo) */
  launcher?: string;
}

export interface BarContext {
  registry: import('./commands.js').CommandRegistry;
  lang: UiLang;
  /** onde ficam menus, popovers, diálogos e avisos (position: fixed) */
  layer: HTMLElement;
  /** depois de qualquer ação: devolve o foco ao documento e sincroniza */
  after: () => void;
}

export interface CompactMenu { id: string; label: Lbl; items: MenuSource }

export interface CompactConfig {
  /** controle à esquerda da barra de menus (título do documento) */
  title?: BarItem;
  menus: CompactMenu[];
  groups: BarGroup[];
  /** à direita da linha de menus (ex.: botão Salvar) */
  trailing?: BarItem[];
}

export interface RibbonTab {
  id: string;
  label: Lbl;
  groups: BarGroup[];
  /** guia contextual: só aparece enquanto o predicado vale */
  contextual?: () => boolean;
  /** guia "Arquivo": abre este menu em vez de um painel */
  menu?: MenuSource;
}

export interface RibbonConfig {
  title?: BarItem;
  /** barra de acesso rápido (à esquerda do título) */
  qat?: BarItem[];
  tabs: RibbonTab[];
  trailing?: BarItem[];
}

export interface BarHandle {
  el: HTMLElement;
  sync(): void;
  relayout(): void;
  destroy(): void;
}
