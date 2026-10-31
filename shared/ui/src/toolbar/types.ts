// Tipos do framework declarativo de barras (compacta estilo Google Docs e
// ribbon estilo Word) — o app declara COMANDOS e LAYOUTS; o framework desenha,
// sincroniza estado (habilitado/marcado/oculto) e recolhe por prioridade.
import type { UiLang } from '../i18n.js';

/**
 * Tabela de um rótulo por idioma. Os rótulos dos próprios componentes trazem os
 * três (os testes de varredura em espanhol garantem); para quem estende as barras
 * o `es` é opcional e, sem ele, vale o inglês.
 */
export interface LabelTable { en: string; pt: string; es?: string }

/** Rótulo: texto fixo ou a tabela `{ en, pt, es }` (escolhida com pickLabels). */
export type Lbl = string | LabelTable;

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

/** Item de menu. `label` aceita `{ en, pt, es }`; `submenu` é resolvido ao abrir. */
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
  | { split: string; menu: MenuSource; size?: 'small' | 'large'; label?: boolean }
  /** `id` permite ocultar o controle (hidden-commands) */
  | { widget: (ctx: BarContext) => BarWidget; id?: string }
  /** galeria de miniaturas (ribbon: faixa elástica com ▲ ▼ ⌄; compacta: botão que abre a grade) */
  | { gallery: import('./gallery.js').GalleryConfig };

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
  /** barra compacta estreita (celular): a linha de ferramentas desce para este
   *  elemento (a barra de baixo, como no Google Docs); sem ele, fica no topo */
  dock?: HTMLElement;
}

export interface CompactMenu { id: string; label: Lbl; items: MenuSource }

/**
 * Onde fica o título na barra compacta: `above-menus` (padrão quando há título) —
 * como o Google Docs: o título numa linha ACIMA dos menus, o `leading` (logo/ícone)
 * à esquerda e as ações do `trailing` à direita ocupando as duas linhas,
 * centralizados na altura; `inline` — título, menus e ações numa linha só.
 */
export type CompactTitlePlacement = 'inline' | 'above-menus';

export interface CompactConfig {
  /** controle à esquerda da barra de menus (título do documento) */
  title?: BarItem;
  /** ícone/logo antes do título (em `above-menus`, ocupa a altura das duas linhas) */
  leading?: BarItem;
  /** padrão `above-menus` quando há `title`; `inline` sem título */
  titlePlacement?: CompactTitlePlacement;
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

/** Tom da faixa de aviso: `info` (padrão, cor de destaque do tema), `warning` ou `error`. */
export type BarNoticeTone = 'info' | 'warning' | 'error';

export interface BarHandle {
  el: HTMLElement;
  sync(): void;
  relayout(): void;
  destroy(): void;
  /**
   * Faixa de aviso logo abaixo da linha de título/menus (antes das ferramentas na
   * compacta; antes das guias na ribbon), como os avisos de armazenamento do
   * Google Docs. `content` entra na faixa (sai de onde estava); null esconde.
   */
  setNotice(content: HTMLElement | null, tone?: BarNoticeTone): void;
}

/** Item acrescentado por quem estende a barra: `before` = id de um item irmão
 *  (menu, grupo ou guia) antes do qual ele entra; ausente ou desconhecido, no fim. */
export type Placed<T> = T & { before?: string };

/**
 * Contribuição de um plugin (ou do hospedeiro) para as barras — o equivalente
 * ao `modules.toolbar` do Quill: comandos novos e onde eles aparecem na barra
 * compacta e na ribbon. Os ids seguem as mesmas regras dos do componente (um
 * prefixo próprio evita colisão, ex.: `acme:tags`).
 */
export interface BarContribution {
  /** comandos registrados junto com os do componente (atalhos inclusive) */
  commands?: Command[];
  compact?: {
    /**
     * Título à esquerda da linha de menus (normalmente um widget: nome do
     * documento + estado). SUBSTITUI o título embutido do componente (id
     * `title`); a última contribuição com título vence.
     */
    title?: BarItem;
    /**
     * Ícone/logo antes do título; em `titlePlacement: 'above-menus'` ocupa a altura
     * das duas linhas (título e menus), como o logo do Google Docs. A última
     * contribuição com `leading` vence.
     */
    leading?: BarItem;
    /**
     * `above-menus` (padrão quando há título): o título (`title`) numa linha ACIMA
     * dos menus, com `leading` à esquerda e `trailing` à direita ocupando as duas
     * linhas; `inline`: tudo na linha dos menus. A última contribuição que define vence.
     */
    titlePlacement?: CompactTitlePlacement;
    /** menus da linha de menus (Arquivo, Editar…) */
    menus?: Placed<CompactMenu>[];
    /** grupos da linha de ferramentas */
    groups?: Placed<BarGroup>[];
    /** itens à direita da linha de menus (em `above-menus`, à direita das duas linhas) */
    trailing?: BarItem[];
  };
  ribbon?: {
    /** título da linha de título da ribbon; SUBSTITUI o embutido (id `title`), como `compact.title` */
    title?: BarItem;
    tabs?: Placed<RibbonTab>[];
    /** grupos numa guia existente (`tab` = id da guia) */
    groups?: Placed<BarGroup & { tab: string }>[];
    /** barra de acesso rápido */
    qat?: BarItem[];
  };
}
