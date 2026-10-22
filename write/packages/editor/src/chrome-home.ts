// Guia PÁGINA INICIAL do Write (frente Página Inicial): botão dividido de Sublinhado
// (estilos + Cor do Sublinhado), Cor da Fonte com as cores do tema, Maiúsculas e
// Minúsculas, botão Bordas dos parágrafos e Linha Horizontal. Só DECLARA sobre a API
// pública do <universal-write>; regras do Word medidas em write/tools/home-lab.
import {
  colorGrid, themePaletteColors, parseThemePick, STANDARD_COLORS, tileGrid,
  type BarContext, type Command, type CommandRegistry, type MenuEntry,
} from '@universal-office/ui';
import type { UniversalWriteElement } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { ThemeColorRef } from './page-design.js';
import { BORDERS } from './chrome-table.js';

const L = (en: string, pt: string): { en: string; pt: string } => ({ en, pt });

/** Os 8 estilos do menu do botão Sublinhado do Word (os outros 9 ficam no diálogo Fonte). */
export const UNDERLINE_MENU: [string, { en: string; pt: string }][] = [
  ['single', L('Underline', 'Sublinhado')], ['double', L('Double underline', 'Sublinhado duplo')],
  ['thick', L('Thick underline', 'Sublinhado grosso')], ['dotted', L('Dotted underline', 'Sublinhado pontilhado')],
  ['dash', L('Dashed underline', 'Sublinhado tracejado')], ['dotDash', L('Dot-dash underline', 'Sublinhado traço-ponto')],
  ['dotDotDash', L('Dot-dot-dash underline', 'Sublinhado traço-ponto-ponto')], ['wave', L('Wave underline', 'Sublinhado ondulado')],
];

/** Os 17 estilos (lista do diálogo Fonte, na ordem do Word) com o nome em cada idioma. */
export const UNDERLINE_ALL: [string, { en: string; pt: string }][] = [
  ['single', L('Single', 'Simples')], ['words', L('Words only', 'Somente palavras')], ['double', L('Double', 'Duplo')],
  ['thick', L('Thick', 'Grosso')], ['dotted', L('Dotted', 'Pontilhado')], ['dottedHeavy', L('Dotted heavy', 'Pontilhado grosso')],
  ['dash', L('Dashed', 'Tracejado')], ['dashedHeavy', L('Dashed heavy', 'Tracejado grosso')], ['dashLong', L('Long dashed', 'Tracejado longo')],
  ['dashLongHeavy', L('Long dashed heavy', 'Tracejado longo grosso')], ['dotDash', L('Dot dash', 'Traço-ponto')],
  ['dashDotHeavy', L('Dot dash heavy', 'Traço-ponto grosso')], ['dotDotDash', L('Dot dot dash', 'Traço-ponto-ponto')],
  ['dashDotDotHeavy', L('Dot dot dash heavy', 'Traço-ponto-ponto grosso')], ['wave', L('Wave', 'Ondulado')],
  ['wavyHeavy', L('Wave heavy', 'Ondulado grosso')], ['wavyDouble', L('Double wave', 'Ondulado duplo')],
];

/** Amostra desenhada de um estilo de sublinhado (as proporções do Word, em escala de tela). */
export function underlineSampleSvg(style: string, w = 132, h = 14, color = 'currentColor'): string {
  const y = Math.round(h / 2) + 0.5;
  const ln = (yy: number, sw: number, dash = ''): string =>
    `<line x1="2" y1="${yy}" x2="${w - 2}" y2="${yy}" stroke="${color}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  const wave = (yy: number, amp: number, sw: number): string => {
    let d = `M2 ${yy}`;
    for (let x = 2, up = true; x < w - 2; x += 3, up = !up) d += ` Q${x + 1.5} ${up ? yy - amp * 2 : yy + amp * 2} ${x + 3} ${yy}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
  };
  const heavy = /Heavy$|^thick$/.test(style) ? 2.5 : 1;
  const dash: Record<string, string> = {
    dotted: '1.5 1.5', dottedHeavy: '2.5 2.5', dash: '4 2', dashedHeavy: '4 2', dashLong: '8 4', dashLongHeavy: '8 4',
    dotDash: '4 1.5 1.5 1.5', dashDotHeavy: '4 1.5 1.5 1.5', dotDotDash: '3 1.2 1.2 1.2 1.2 1.2', dashDotDotHeavy: '3 1.2 1.2 1.2 1.2 1.2',
  };
  let body: string;
  switch (style) {
    case 'double': body = ln(y - 1.5, 1) + ln(y + 1.5, 1); break;
    case 'wave': body = wave(y, 1, 1); break;
    case 'wavyHeavy': body = wave(y, 1, 2); break;
    case 'wavyDouble': body = wave(y - 2, 0.8, 0.9) + wave(y + 2, 0.8, 0.9); break;
    case 'words': body = `<line x1="2" y1="${y}" x2="${w * 0.42}" y2="${y}" stroke="${color}"/><line x1="${w * 0.52}" y1="${y}" x2="${w - 2}" y2="${y}" stroke="${color}"/>`; break;
    default: body = ln(y, heavy, dash[style] ?? '');
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
}

/** Valor da paleta ("RRGGBB" ou "theme|slot|tint|shade") → cor da API (hex ou tema com frações). */
export function colorFromPick(value: string, colors: Record<string, string>): string | ThemeColorRef {
  const p = parseThemePick(value, colors);
  if (!p) return value.toUpperCase();
  const frac = (h?: string): number | undefined => (h ? Math.round((1 - parseInt(h, 16) / 255) * 100) / 100 : undefined);
  const tint = frac(p.tint), shade = frac(p.shade);
  return { themeColor: p.themeColor, ...(tint !== undefined ? { tint } : {}), ...(shade !== undefined ? { shade } : {}) };
}

/** Hex de exibição de um valor da paleta (o botão dividido mostra a última cor). */
export function pickHex(value: string, colors: Record<string, string>): string {
  return parseThemePick(value, colors)?.hex ?? value.toUpperCase();
}

/** Paleta do Word: Automática, Cores do Tema, Cores Padrão e Mais Cores. */
function paletteMenu(env: WidgetEnv, ctx: BarContext, o: {
  autoLabel: string; onPick: (v: string) => void; onAuto: () => void; selected?: string;
}): MenuEntry[] {
  const L0 = env.app.ui!.L;
  const colors = env.ed.documentThemeColors();
  return [
    { id: 'palette:auto', label: o.autoLabel, swatch: '#000000', onClick: () => { o.onAuto(); ctx.after(); } },
    { content: (close) => {
      const box = document.createElement('div');
      box.className = 'uw-palette';
      const h = (txt: string): HTMLElement => { const d = document.createElement('div'); d.className = 'uo-tiles-h'; d.textContent = txt; return d; };
      box.append(
        h(ctx.registry.text(L('Theme Colors', 'Cores do Tema'))),
        colorGrid({ colors: themePaletteColors(colors), columns: 10, close, selected: o.selected, onPick: (v) => { o.onPick(v); ctx.after(); } }),
        h(ctx.registry.text(L('Standard Colors', 'Cores Padrão'))),
        colorGrid({ colors: STANDARD_COLORS.map((x) => ({ value: x, css: `#${x}` })), columns: 10, close, selected: o.selected, onPick: (v) => { o.onPick(v); ctx.after(); } }),
      );
      return box;
    } },
    {
      icon: 'palette', label: L0.moreColors,
      onClick: () => {
        const input = document.createElement('input');
        input.type = 'color';
        input.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
        ctx.layer.appendChild(input);
        input.addEventListener('change', () => { o.onPick(input.value.slice(1).toUpperCase()); input.remove(); ctx.after(); });
        input.addEventListener('blur', () => setTimeout(() => input.remove(), 1000));
        input.click();
      },
    },
  ];
}

/** Cor da Fonte (botão dividido): a última cor escolhida fica no botão. */
export function fontColorMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const colors = env.ed.documentThemeColors();
  return paletteMenu(env, ctx, {
    autoLabel: env.app.ui!.L.automatic,
    selected: env.ctl.state().run.color as string | undefined,
    onAuto: () => env.ed.setColor(undefined),
    onPick: (v) => { env.app.lastColor = v; env.ed.setColor(colorFromPick(v, colors)); },
  });
}

/** Menu do botão Sublinhado: os 8 estilos com amostras, Mais Sublinhados e Cor do Sublinhado. */
export function underlineMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const run = env.ctl.state().run;
  const cur = run.underline ? ((run.underlineStyle as string | undefined) ?? 'single') : undefined;
  return [
    {
      content: (close) => tileGrid({
        sections: [{ items: UNDERLINE_MENU.map(([id, label]) => ({ id, label })) }],
        tile: { w: 150, h: 24 }, cols: 1, close, text: (l) => ctx.registry.text(l), selected: cur,
        render: (tile, it) => { tile.innerHTML = underlineSampleSvg(it.id); },
        onPick: (id) => { env.ed.setUnderline(id as Parameters<UniversalWriteElement['setUnderline']>[0]); ctx.after(); },
      }),
    },
    '-', 'underline:more',
    { id: 'underline:color', label: L('Underline Color', 'Cor do Sublinhado'), icon: 'format_color_text', submenu: () => underlineColorMenu(env, ctx) },
  ];
}

export function underlineColorMenu(env: WidgetEnv, ctx: BarContext): MenuEntry[] {
  const colors = env.ed.documentThemeColors();
  return paletteMenu(env, ctx, {
    autoLabel: env.app.ui!.L.automatic,
    selected: env.ctl.state().run.underlineColor as string | undefined,
    onAuto: () => env.ed.setUnderlineColor(null),
    onPick: (v) => env.ed.setUnderlineColor(colorFromPick(v, colors)),
  });
}

/** Botão Bordas (Página Inicial): parágrafos, ou as células numa tabela, e Linha Horizontal. */
export const homeBordersMenu = (): MenuEntry[] => [
  ...BORDERS.map(([k]) => `home:border:${k}`), '-', 'home:hrule', 'table:draw', 'view:gridlines', '-', 'dlg:borders',
];

export function registerHomeCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const e = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  const inCell = (): boolean => ed.editingTableCell();
  const cmds: Command[] = [
    e({ id: 'underline:more', label: L('More Underlines…', 'Mais Sublinhados...'), icon: 'format_underlined', supports: has('setFontFormat'), run: () => ctl.fontDialog() }),
    // Maiúsculas e Minúsculas (Shift+F3 alterna — o editor trata a tecla)
    e({ id: 'case:sentence', label: L('Sentence case.', 'Primeira letra da frase em maiúscula.'), run: () => ed.changeCase('sentence') }),
    e({ id: 'case:title', label: L('Capitalize Each Word', 'Colocar Cada Palavra em Maiúscula'), run: () => ed.changeCase('title') }),
    e({ id: 'case:toggle', label: L('tOGGLE cASE', 'aLTERNAR mAIÚSC./mINÚSC.'), run: () => ed.changeCase('toggle') }),
    e({ id: 'case:next', label: L('Change Case', 'Maiúsculas e Minúsculas'), icon: 'match_case', shortcut: 'Shift+F3', run: () => ed.changeCase('next') }),
    // botão Bordas: o último item escolhido fica no botão (Borda Inferior de início)
    ...BORDERS.map(([kind, en, pt, icon]): Command => e({
      id: `home:border:${kind}`, label: L(en, pt), icon, supports: has('paragraphBorderPreset'),
      // diagonais só nas células (o Word as desabilita fora de tabela)
      isEnabled: () => inCell() || (kind !== 'tl2br' && kind !== 'tr2bl'),
      isChecked: () => !inCell() && borderOn(ed, kind),
      run: () => { app.lastHomeBorder = kind; applyBorder(ed, kind); },
    })),
    e({ id: 'home:borders', label: L('Borders', 'Bordas'), icon: 'border_bottom', supports: has('paragraphBorderPreset'), run: () => applyBorder(ed, app.lastHomeBorder) }),
    e({ id: 'home:hrule', label: L('Horizontal Line', 'Linha Horizontal'), icon: 'horizontal_rule', supports: has('insertHorizontalLine'), run: () => ed.insertHorizontalLine() }),
  ];
  reg.add(...cmds);
}

type BorderKind = (typeof BORDERS)[number][0];

function applyBorder(ed: UniversalWriteElement, kind: BorderKind): void {
  if (ed.editingTableCell()) { ed.setCellBorders(kind); return; }
  if (kind === 'tl2br' || kind === 'tr2bl') return;
  ed.paragraphBorderPreset(kind);
}

function borderOn(ed: UniversalWriteElement, kind: BorderKind): boolean {
  const s = new Set(ed.paragraphBorderSides());
  switch (kind) {
    case 'bottom': case 'top': case 'left': case 'right': return s.has(kind);
    case 'all': return ['top', 'left', 'bottom', 'right', 'between'].every((x) => s.has(x as never));
    case 'outside': return ['top', 'left', 'bottom', 'right'].every((x) => s.has(x as never));
    case 'inside': case 'insideH': return s.has('between');
    case 'insideV': return s.has('bar');
    default: return false;
  }
}

