// Frente Layout do texto nas barras do Write: Hifenização (Nenhuma, Automático,
// Manual, Opções), Números de Linha (Nenhum, Contínuo, Reiniciar Cada Página/
// Seção, Suprimir no Parágrafo Atual, Opções — o diálogo Números de Linha abre
// pelo Configurar Página › Layout, como no Word), as caixas Recuar/Espaçamento do
// grupo Parágrafo da guia Layout e os hífens opcional (Ctrl+-) e incondicional
// (Ctrl+Shift+-). Regras do Word medidas em write/tools/textlayout-lab.
import {
  uiLocale, barCaption, formatMeasure, openDialog, parseMeasure, pickLabels, spinField,
  type Command, type CommandRegistry, type MeasureUnit, type MenuEntry, type RibbonCell, type UiLang,
} from '@universal-office/ui';
import type { UniversalWriteElement, LineNumberingOptions, ManualHyphenation } from './universal-write.js';
import type { WriteApp } from './chrome-app.js';
import type { ChromeCtl } from './chrome-commands.js';
import type { WidgetEnv } from './chrome-widgets.js';
import type { DialogEnv } from './chrome-dialogs.js';
import { HYPHENATION_LIMITS, LINE_NUMBER_LIMITS, PARAGRAPH_LAYOUT_LIMITS } from './text-layout.js';

const L = (en: string, pt: string, es: string): { en: string; pt: string; es: string } => ({ en, pt, es });
const tr = (lang: UiLang, en: string, pt: string, es: string): string => pickLabels(lang, { en, pt, es });

/** Diálogos da frente (ChromeCtl.textLayoutDialog). */
export type TextLayoutDialogKind = 'hyphenation' | 'manualHyphenation';

/** Comandos da frente (aparecem quando o método da API existe). */
export function registerTextLayoutCommands(reg: CommandRegistry, ed: UniversalWriteElement, app: WriteApp, ctl: ChromeCtl): void {
  const api = ed as unknown as Record<string, unknown>;
  const has = (m: string) => (): boolean => typeof api[m] === 'function';
  const canEdit = (): boolean => !app.comparing && !ed.isProtected();
  const edit = (c: Omit<Command, 'isEnabled'> & { isEnabled?: () => boolean }): Command =>
    ({ ...c, isEnabled: c.isEnabled ? () => canEdit() && c.isEnabled!() : canEdit });
  const auto = (): boolean => (has('getHyphenation')() ? ed.getHyphenation().auto : false);
  const lnMode = (): string | null => { const i = has('getLineNumbering')() ? ed.getLineNumbering() : null; return !i || i.mixed ? null : i.mode; };
  const ln = (id: 'none' | 'continuous' | 'page' | 'section', label: { en: string; pt: string; es: string }): Command =>
    edit({ id: `ln:${id}`, label, supports: has('setLineNumbering'), isChecked: () => lnMode() === id, run: () => ed.setLineNumbering(id) });
  reg.add(
    edit({ id: 'hyph:none', label: L('None', 'Nenhuma', 'Ninguno'), tip: L('Turn off automatic hyphenation', 'Desativa a hifenização automática', 'Desactiva los guiones automáticos'), supports: has('setHyphenation'), isChecked: () => !auto(), run: () => ed.setHyphenation('none') }),
    edit({ id: 'hyph:auto', label: L('Automatic', 'Automático', 'Automático'), tip: L('Turn on automatic hyphenation', 'Ativa a hifenização automática', 'Activa los guiones automáticos'), supports: has('setHyphenation'), isChecked: auto, run: () => ed.setHyphenation('auto') }),
    edit({ id: 'hyph:manual', label: L('Manual', 'Manual', 'Manual'), tip: L('Manual hyphenation', 'Hifenização manual', 'Guiones manuales'), supports: has('nextManualHyphenation'), run: () => ctl.textLayoutDialog('manualHyphenation') }),
    edit({ id: 'dlg:hyphenation', label: L('Hyphenation Options…', 'Opções de Hifenização…', 'Opciones de guiones…'), icon: 'settings', supports: has('setHyphenationOptions'), run: () => ctl.textLayoutDialog('hyphenation') }),
    ln('none', L('None', 'Nenhum', 'Ninguno')),
    ln('continuous', L('Continuous', 'Contínuo', 'Continua')),
    ln('page', L('Restart Each Page', 'Reiniciar Cada Página', 'Reiniciar en cada página')),
    ln('section', L('Restart Each Section', 'Reiniciar Cada Seção', 'Reiniciar en cada sección')),
    edit({ id: 'ln:suppress', label: L('Suppress for Current Paragraph', 'Suprimir no Parágrafo Atual', 'Suprimir del párrafo actual'), supports: has('toggleLineNumberSuppression'), isChecked: () => ed.lineNumbersSuppressed(), run: () => ed.toggleLineNumberSuppression() }),
    edit({ id: 'dlg:lineNumbers', label: L('Line Numbering Options…', 'Opções de Numeração de Linhas…', 'Opciones de numeración de líneas…'), icon: 'settings', supports: has('setPageSetup'), run: () => ctl.pageDialog('layout') }),
    // hífens (Inserir › Símbolo › Caracteres Especiais no Word; aqui só pelos atalhos)
    edit({ id: 'hyphen:optional', label: L('Optional Hyphen', 'Hífen Opcional', 'Guion opcional'), shortcut: 'Ctrl+-', supports: has('pasteText'), run: () => ed.pasteText('\u00AD') }),
    edit({ id: 'hyphen:nonBreaking', label: L('Nonbreaking Hyphen', 'Hífen Incondicional', 'Guion de no separación'), shortcut: 'Ctrl+Shift+-', supports: has('pasteText'), run: () => ed.pasteText('\u2011') }),
  );
}

// ───────────────── menus e caixas ─────────────────

export const hyphenationMenu = (): MenuEntry[] => ['hyph:none', 'hyph:auto', 'hyph:manual', '-', 'dlg:hyphenation'];
export const lineNumbersMenu = (): MenuEntry[] => ['ln:none', 'ln:continuous', 'ln:page', 'ln:section', 'ln:suppress', '-', 'dlg:lineNumbers'];

/** Unidade dos recuos como a régua: cm (pt) ou polegadas (en). */
const indentUnit = (lang: UiLang): MeasureUnit => (lang !== 'en' ? 'cm' : 'in');
/** passo das setas: 0,1 cm / 0,1" (twips) */
const indentStep = (lang: UiLang): number => (lang !== 'en' ? 1440 / 2.54 / 10 : 144);

/**
 * Grupo Parágrafo da guia Layout, como no Word: Recuar (À Esquerda/À Direita) e
 * Espaçamento (Antes/Depois), caixas numéricas com setas sobre getParagraphLayout/
 * setParagraphLayout. O iniciador abre o diálogo Parágrafo.
 */
export function paragraphLayoutCells(env: WidgetEnv): RibbonCell[] {
  const ed = env.ed;
  const has = (): boolean => typeof (ed as unknown as Record<string, unknown>)['setParagraphLayout'] === 'function';
  const editable = (): boolean => !env.app.comparing && !ed.isProtected() && !!ed.getParagraphLayout();
  const cur = <K extends 'left' | 'right' | 'before' | 'after'>(k: K) => (): number | 'auto' | null => ed.getParagraphLayout()?.[k] ?? null;
  const [imin, imax] = PARAGRAPH_LAYOUT_LIMITS.indent;
  const [smin, smax] = PARAGRAPH_LAYOUT_LIMITS.spacing;
  return [
    { rows: [
      [barCaption(L('Indent', 'Recuar', 'Sangría'), 'indent:caption')],
      [spinField({ id: 'indent:left', label: L('Left:', 'À Esquerda:', 'Izquierda:'), tip: L('Indent Left', 'Recuar à Esquerda', 'Sangría izquierda'), icon: 'format_indent_increase',
        unit: indentUnit, step: indentStep, min: imin, max: imax, supports: has, isEnabled: editable,
        get: cur('left'), set: (v) => { if (v !== 'auto') ed.setParagraphLayout({ left: v }); } })],
      [spinField({ id: 'indent:right', label: L('Right:', 'À Direita:', 'Derecha:'), tip: L('Indent Right', 'Recuar à Direita', 'Sangría derecha'), icon: 'format_indent_decrease',
        unit: indentUnit, step: indentStep, min: imin, max: imax, supports: has, isEnabled: editable,
        get: cur('right'), set: (v) => { if (v !== 'auto') ed.setParagraphLayout({ right: v }); } })],
    ] },
    { rows: [
      [barCaption(L('Spacing', 'Espaçamento', 'Espaciado'), 'spacing:caption')],
      [spinField({ id: 'spacing:before', label: L('Before:', 'Antes:', 'Antes:'), tip: L('Spacing Before', 'Espaçamento Antes', 'Espaciado anterior'), icon: 'vertical_align_top',
        unit: 'pt', step: 120, min: smin, max: smax, auto: true, supports: has, isEnabled: editable,
        get: cur('before'), set: (v) => ed.setParagraphLayout({ before: v }) })],
      [spinField({ id: 'spacing:after', label: L('After:', 'Depois:', 'Después:'), tip: L('Spacing After', 'Espaçamento Depois', 'Espaciado posterior'), icon: 'vertical_align_bottom',
        unit: 'pt', step: 120, min: smin, max: smax, auto: true, supports: has, isEnabled: editable,
        get: cur('after'), set: (v) => ed.setParagraphLayout({ after: v }) })],
    ] },
  ];
}

// ───────────────── diálogos ─────────────────

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const check = (name: string, label: string, on: boolean): [HTMLLabelElement, HTMLInputElement] => {
  const i = el('input', { type: 'checkbox', name, checked: on });
  return [el('label', { className: 'uo-check' }, i, label), i];
};
const radio = (name: string, value: string, label: string, on: boolean): HTMLLabelElement =>
  el('label', { className: 'uo-check' }, el('input', { type: 'radio', name, value, checked: on }), label);
const radioValue = (box: HTMLElement, name: string): string => box.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '';

/** Nome do idioma no idioma da interface ("Português (Brasil)"). */
function languageName(tag: string, lang: UiLang): string {
  try {
    const n = new Intl.DisplayNames([uiLocale(lang)], { type: 'language' }).of(tag) ?? tag;
    return n.charAt(0).toLocaleUpperCase() + n.slice(1);
  } catch { return tag; }
}

/**
 * Opções de Hifenização: hifenizar automaticamente, palavras em MAIÚSCULAS, zona
 * (cm/pol) e limite de hifens consecutivos ("Sem limite" = 0); Manual… aplica e
 * começa a hifenização manual, como no Word.
 */
export async function hyphenationDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const h = ed.getHyphenation();
  const unit = indentUnit(lang);
  const noLimit = tr(lang, 'No limit', 'Sem limite', 'Sin límite');
  const [autoL, autoI] = check('auto', tr(lang, 'Automatically hyphenate document', 'Hifenizar documento automaticamente', 'Dividir automáticamente el documento'), h.auto);
  const [capsL, capsI] = check('caps', tr(lang, 'Hyphenate words in CAPS', 'Hifenizar palavras em MAIÚSCULAS', 'Dividir palabras en MAYÚSCULAS'), h.caps);
  const zone = el('input', { type: 'text', name: 'zone', inputMode: 'decimal', value: formatMeasure(h.zoneTwips, unit, lang), style: 'width:120px' });
  const limit = el('input', { type: 'text', name: 'limit', inputMode: 'numeric', value: h.limit ? String(h.limit) : noLimit, style: 'width:120px' });
  limit.addEventListener('focus', () => limit.select());
  zone.addEventListener('focus', () => zone.select());
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, tr(lang, 'Hyphenation zone:', 'Zona de hifenização:', 'Zona de división:')), zone,
    el('span', {}, tr(lang, 'Limit consecutive hyphens to:', 'Limitar hifens consecutivos a:', 'Limitar guiones consecutivos a:')), limit);
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, autoL, capsL, grid);
  const dlg = openDialog({
    title: tr(lang, 'Hyphenation', 'Hifenização', 'Guiones'), icon: 'horizontal_rule', body, layer: env.layer, lang, width: 420,
    actions: [{ id: 'manual', label: L('Manual…', 'Manual…', 'Manual…') }, { id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }],
  });
  const res = await dlg.result;
  if (res !== 'ok' && res !== 'manual') return;
  const z = parseMeasure(zone.value, unit);
  const ls = limit.value.trim();
  const lv = ls === '' || ls.toLowerCase() === noLimit.toLowerCase() ? 0 : parseInt(ls, 10);
  ed.setHyphenationOptions({
    auto: autoI.checked, caps: capsI.checked,
    ...(z !== null && z !== h.zoneTwips ? { zoneTwips: Math.min(HYPHENATION_LIMITS.zoneTwips[1], Math.max(HYPHENATION_LIMITS.zoneTwips[0], z)) } : {}),
    ...(Number.isFinite(lv) ? { limit: lv } : {}),
  });
  if (res === 'manual') await manualHyphenationDialog(env);
}

/**
 * Hifenização Manual: para cada palavra que a hifenização automática partiria no
 * fim da linha, "Hifenizar em:" com os pontos possíveis (os depois da margem não
 * se escolhem); Sim grava o hífen opcional, Não pula, Cancelar encerra.
 */
export async function manualHyphenationDialog(env: DialogEnv): Promise<void> {
  const lang = env.lang, ed = env.ed;
  const done = tr(lang, 'Hyphenation is complete.', 'A hifenização foi concluída.', 'La división de palabras ha finalizado.');
  let cur: ManualHyphenation | null = await ed.nextManualHyphenation();
  if (!cur) { ed.endManualHyphenation(); env.app.ui!.flash(done); return; }
  let pick = cur.suggested;
  const wordEl = el('div', { className: 'uw-hyph-word', style: 'font-size:20px;letter-spacing:.5px;padding:8px 10px;border:1px solid var(--u-color-outline-variant,#c4c6d0);border-radius:8px;font-family:inherit;user-select:none' });
  wordEl.setAttribute('role', 'listbox');
  wordEl.tabIndex = 0;
  const hint = el('div', { style: 'font-size:12px;opacity:.75;margin-top:6px' }, tr(lang, 'Click a hyphen (or use ← →) to choose where the word breaks.', 'Clique num hífen (ou use ← →) para escolher onde a palavra quebra.', 'Haz clic en un guion (o usa ← →) para elegir dónde se divide la palabra.'));
  const label = el('div', { style: 'margin-bottom:6px' }, tr(lang, 'Hyphenate at:', 'Hifenizar em:', 'Dividir en:'));
  const render = (): void => {
    const m = cur!;
    const kids: Node[] = [];
    let k = 0;
    for (const ch of m.word) {
      kids.push(document.createTextNode(ch));
      k++;
      if (!m.points.includes(k)) continue;
      const on = k === pick;
      const beyond = k > m.limit;
      const b = el('span', { className: 'uw-hyph-pt', textContent: '-', style: `cursor:${beyond ? 'default' : 'pointer'};padding:0 1px;border-radius:3px;${on ? 'background:var(--u-color-primary,#005bc0);color:var(--u-color-on-primary,#fff);' : ''}${beyond ? 'opacity:.4;' : ''}` });
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(on));
      const at = k;
      if (!beyond) b.addEventListener('click', () => { pick = at; render(); });
      kids.push(b);
      // a margem da linha: barra depois do último ponto que cabe
      if (k === m.limit) kids.push(el('span', { textContent: '|', style: 'opacity:.6;margin:0 1px' }));
    }
    wordEl.replaceChildren(...kids);
  };
  wordEl.addEventListener('keydown', (e) => {
    const m = cur;
    if (!m) return;
    const ok = m.points.filter((p) => p <= m.limit);
    const i = ok.indexOf(pick);
    if (e.key === 'ArrowLeft' && i > 0) { pick = ok[i - 1]!; render(); e.preventDefault(); }
    if (e.key === 'ArrowRight' && i >= 0 && i < ok.length - 1) { pick = ok[i + 1]!; render(); e.preventDefault(); }
  });
  render();
  const title = (m: ManualHyphenation): string => `${tr(lang, 'Manual Hyphenation', 'Hifenização Manual', 'Guiones manuales')}: ${languageName(m.lang, lang)}`;
  let busy = false;
  const step = async (id: string): Promise<void> => {
    if (!cur || busy) return;
    busy = true;
    try {
      if (id === 'cancel') { ed.endManualHyphenation(); dlg.close(); return; }
      if (id === 'yes') ed.applyManualHyphenation(pick);
      else ed.skipManualHyphenation();
      cur = await ed.nextManualHyphenation();
      if (!cur) { ed.endManualHyphenation(); dlg.close(); env.app.ui!.flash(done); return; }
      pick = cur.suggested;
      dlg.setTitle(title(cur));
      render();
    } finally { busy = false; }
  };
  const dlg = openDialog({
    title: title(cur), icon: 'horizontal_rule', body: el('div', {}, label, wordEl, hint), layer: env.layer, lang, width: 480,
    actions: [{ id: 'yes', label: L('Yes', 'Sim', 'Sí'), primary: true }, { id: 'no', label: L('No', 'Não', 'No') }, { id: 'cancel', label: env.app.ui!.L.cancel }],
    onAction: (id) => { void step(id); return false; },
  });
  setTimeout(() => wordEl.focus(), 0);
  await dlg.result;
  ed.endManualHyphenation();
}

/**
 * Números de Linha (Configurar Página › Layout › Números de Linha…): Adicionar
 * numeração de linha, Iniciar em, Do texto (Automático = 0), Contar por e
 * Numeração. Devolve as opções (null = Cancelar); o Configurar Página aplica.
 */
export async function lineNumbersDialog(env: DialogEnv, cur: LineNumberingOptions): Promise<LineNumberingOptions | null> {
  const lang = env.lang;
  const unit = indentUnit(lang);
  const autoTxt = tr(lang, 'Auto', 'Automático', 'Automático');
  const [onL, onI] = check('on', tr(lang, 'Add line numbering', 'Adicionar numeração de linha', 'Agregar numeración de líneas'), cur.on);
  const num = (name: string, v: number, [lo, hi]: readonly [number, number]): HTMLInputElement =>
    el('input', { type: 'number', name, value: String(v), min: String(lo), max: String(hi), step: '1', style: 'width:110px' });
  const start = num('start', cur.startAt, LINE_NUMBER_LIMITS.startAt);
  const count = num('count', cur.countBy, LINE_NUMBER_LIMITS.countBy);
  const dist = el('input', { type: 'text', name: 'distance', inputMode: 'decimal', value: cur.distanceTwips ? formatMeasure(cur.distanceTwips, unit, lang) : autoTxt, style: 'width:110px' });
  dist.addEventListener('focus', () => dist.select());
  const restart = el('div', { style: 'display:flex;flex-direction:column;gap:4px;margin-left:8px' },
    radio('restart', 'page', tr(lang, 'Restart each page', 'Reiniciar cada página', 'Reiniciar en cada página'), cur.restart === 'page'),
    radio('restart', 'section', tr(lang, 'Restart each section', 'Reiniciar cada seção', 'Reiniciar en cada sección'), cur.restart === 'section'),
    radio('restart', 'continuous', tr(lang, 'Continuous', 'Contínua', 'Continua'), cur.restart === 'continuous'));
  const grid = el('div', { className: 'uo-dialog-grid' },
    el('span', {}, tr(lang, 'Start at:', 'Iniciar em:', 'Iniciar en:')), start,
    el('span', {}, tr(lang, 'From text:', 'Do texto:', 'Desde el texto:')), dist,
    el('span', {}, tr(lang, 'Count by:', 'Contar por:', 'Intervalo:')), count);
  const opts = el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, grid, el('strong', {}, tr(lang, 'Numbering:', 'Numeração:', 'Numeración:')), restart);
  const sync = (): void => { for (const i of opts.querySelectorAll('input')) i.disabled = !onI.checked; };
  onI.addEventListener('change', sync);
  sync();
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }, onL, opts);
  const dlg = openDialog({
    title: tr(lang, 'Line Numbers', 'Números de Linha', 'Números de línea'), icon: 'format_list_numbered', body, layer: env.layer, lang, width: 380,
    actions: [{ id: 'cancel', label: env.app.ui!.L.cancel }, { id: 'ok', label: 'OK', primary: true }],
  });
  if ((await dlg.result) !== 'ok') return null;
  const ds = dist.value.trim();
  const d = ds === '' || ds.toLowerCase() === autoTxt.toLowerCase() ? 0 : parseMeasure(ds, unit);
  return {
    on: onI.checked,
    startAt: Number(start.value) || 1,
    countBy: Number(count.value) || 1,
    distanceTwips: d ?? cur.distanceTwips,
    restart: (radioValue(restart, 'restart') || 'page') as LineNumberingOptions['restart'],
  };
}
