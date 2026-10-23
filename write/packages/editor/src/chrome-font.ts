// Diálogo FONTE (Ctrl+D / iniciador do grupo Fonte), com as duas guias do Word:
// Fonte (fonte, estilo, tamanho, cor, estilo e cor do sublinhado, efeitos,
// visualização) e Avançado (escala, espaçamento, posição, kerning). Aplica tudo de
// uma vez por setFontFormat (um passo de desfazer).
import { dialogTabs, openDialog, pickLabels, type UiLang } from '@universal-office/ui';
import type { FontFormat } from './universal-write.js';
import type { DialogEnv } from './chrome-dialogs.js';
import { colorButton, type Pick } from './chrome-borders.js';
import { UNDERLINE_ALL } from './chrome-home.js';
import type { ThemeColorRef } from './page-design.js';

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });
const select = (opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', {});
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = value;
  return s;
};
const check = (label: string, on: boolean): { el: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'checkbox', checked: on });
  return { el: el('label', { className: 'uo-check' }, input, label), input };
};
/** número com vírgula (pt) ou ponto (en) → número (NaN se não for) */
const num = (v: string): number => parseFloat(v.replace(/\s|pt|%/gi, '').replace(',', '.'));
const fmt = (n: number, lang: UiLang): string => (Math.round(n * 10) / 10).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { maximumFractionDigits: 1 });

const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
const SCALES = [200, 150, 100, 90, 80, 66, 50, 33];

/** Cor do botão (hex ou tema com tint/shade em hex) → cor da API (frações do tema). */
const apiColor = (p: Pick): string | ThemeColorRef | null => {
  if (p.hex === 'auto') return null;
  if (!p.themeColor) return p.hex;
  const frac = (h?: string): number | undefined => (h ? Math.round((1 - parseInt(h, 16) / 255) * 100) / 100 : undefined);
  const tint = frac(p.tint), shade = frac(p.shade);
  return { themeColor: p.themeColor, ...(tint !== undefined ? { tint } : {}), ...(shade !== undefined ? { shade } : {}) };
};

export async function fontDialog(env: DialogEnv, families: string[], openTextEffects?: () => void): Promise<void> {
  const lang = env.lang, L = env.app.ui!.L, ed = env.ed;
  const r = env.state().run;
  // ── guia Fonte ──
  const curFont = (r.fontAscii as string | undefined) ?? '';
  const fams = curFont && !families.includes(curFont) ? [curFont, ...families] : families;
  const font = el('input', { value: curFont, style: 'width:100%' });
  const fontList = el('select', { size: 6, style: 'width:100%;height:118px' });
  for (const f of fams) fontList.append(el('option', { value: f, textContent: f }));
  fontList.value = curFont;
  fontList.addEventListener('change', () => { font.value = fontList.value; preview(); });
  font.addEventListener('input', () => {
    const m = fams.find((f) => f.toLowerCase().startsWith(font.value.toLowerCase()));
    if (m) fontList.value = m;
    preview();
  });
  const styleNames: [string, string][] = [['r', tr(lang, 'Regular', 'Normal')], ['i', tr(lang, 'Italic', 'Itálico')], ['b', tr(lang, 'Bold', 'Negrito')], ['bi', tr(lang, 'Bold Italic', 'Negrito Itálico')]];
  const styleCur = `${r.bold ? 'b' : ''}${r.italic ? 'i' : ''}` || 'r';
  const fstyle = el('select', { size: 4, style: 'width:100%;height:146px' });
  for (const [v, t] of styleNames) fstyle.append(el('option', { value: v, textContent: t }));
  fstyle.value = styleCur;
  const curSize = ((r.szHalfPt as number | undefined) ?? 22) / 2;
  const size = el('input', { value: fmt(curSize, lang), style: 'width:100%' });
  const sizeList = el('select', { size: 4, style: 'width:100%;height:118px' });
  for (const s of SIZES) sizeList.append(el('option', { value: String(s), textContent: fmt(s, lang) }));
  sizeList.value = String(curSize);
  sizeList.addEventListener('change', () => { size.value = fmt(+sizeList.value, lang); preview(); });
  size.addEventListener('input', preview);
  fstyle.addEventListener('change', preview);

  const colorPick: Pick = r.color ? { hex: r.color as string, ...(r.colorTheme ? { themeColor: (r.colorTheme as { themeColor: string }).themeColor, tint: (r.colorTheme as { tint?: string }).tint, shade: (r.colorTheme as { shade?: string }).shade } : {}) } : { hex: 'auto' };
  const color = colorButton(env, colorPick, L.automatic);
  const ulCur = r.underline ? ((r.underlineStyle as string | undefined) ?? 'single') : 'none';
  const ul = select([['none', tr(lang, '(none)', '(nenhum)')], ...UNDERLINE_ALL.map(([v, l]): [string, string] => [v, pickLabels(lang, l)])], ulCur);
  const ulPick: Pick = r.underlineColor ? { hex: r.underlineColor as string, ...(r.underlineTheme ? { themeColor: (r.underlineTheme as { themeColor: string }).themeColor, tint: (r.underlineTheme as { tint?: string }).tint, shade: (r.underlineTheme as { shade?: string }).shade } : {}) } : { hex: 'auto' };
  const ulColor = colorButton(env, ulPick, L.automatic);
  const syncUl = (): void => { (ulColor.el as HTMLButtonElement).disabled = ul.value === 'none'; preview(); };
  ul.addEventListener('change', syncUl);
  color.onChange(preview);
  ulColor.onChange(preview);

  const fx = {
    strike: check(tr(lang, 'Strikethrough', 'Tachado'), !!r.strike),
    dstrike: check(tr(lang, 'Double strikethrough', 'Tachado duplo'), !!r.doubleStrike),
    sup: check(tr(lang, 'Superscript', 'Sobrescrito'), r.vertAlign === 'superscript'),
    sub: check(tr(lang, 'Subscript', 'Subscrito'), r.vertAlign === 'subscript'),
    small: check(tr(lang, 'Small caps', 'Versalete'), !!r.smallCaps),
    caps: check(tr(lang, 'All caps', 'Todas em maiúsculas'), !!r.allCaps),
    hidden: check(tr(lang, 'Hidden', 'Oculto'), !!r.hidden),
  };
  // pares que se excluem, como no Word
  const excl = (a: HTMLInputElement, b: HTMLInputElement): void => {
    a.addEventListener('change', () => { if (a.checked) b.checked = false; preview(); });
    b.addEventListener('change', () => { if (b.checked) a.checked = false; preview(); });
  };
  excl(fx.strike.input, fx.dstrike.input);
  excl(fx.sup.input, fx.sub.input);
  excl(fx.small.input, fx.caps.input);
  fx.hidden.input.addEventListener('change', preview);

  const col = (label: string, ...kids: Node[]): HTMLElement => el('label', { style: 'display:flex;flex-direction:column;gap:4px;min-width:0' }, label, ...kids);
  const fontTab = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    el('div', { style: 'display:grid;grid-template-columns:2fr 1.2fr 0.8fr;gap:10px' },
      col(tr(lang, 'Font:', 'Fonte:'), font, fontList), col(tr(lang, 'Font style:', 'Estilo da fonte:'), fstyle), col(tr(lang, 'Size:', 'Tamanho:'), size, sizeList)),
    el('div', { style: 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end' },
      col(tr(lang, 'Font color:', 'Cor da fonte:'), color.el), col(tr(lang, 'Underline style:', 'Estilo de sublinhado:'), ul), col(tr(lang, 'Underline color:', 'Cor do sublinhado:'), ulColor.el)),
    el('fieldset', { style: 'border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:6px 10px' },
      el('legend', {}, tr(lang, 'Effects', 'Efeitos')),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:4px 16px' },
        fx.strike.el, fx.small.el, fx.dstrike.el, fx.caps.el, fx.sup.el, fx.hidden.el, fx.sub.el)));

  // ── guia Avançado ──
  const scale = el('input', { value: `${(r.scalePct as number | undefined) ?? 100}%`, style: 'width:90px' });
  scale.setAttribute('list', 'uw-font-scales');
  const scales = el('datalist', { id: 'uw-font-scales' });
  for (const s of SCALES) scales.append(el('option', { value: `${s}%` }));
  const sp = (r.charSpacingTwips as number | undefined) ?? 0;
  const spacing = select([['normal', 'Normal'], ['expanded', tr(lang, 'Expanded', 'Expandido')], ['condensed', tr(lang, 'Condensed', 'Condensado')]], sp > 0 ? 'expanded' : sp < 0 ? 'condensed' : 'normal');
  const spBy = el('input', { value: sp ? fmt(Math.abs(sp) / 20, lang) : '', style: 'width:70px' });
  const pos = (r.positionHalfPt as number | undefined) ?? 0;
  const position = select([['normal', 'Normal'], ['raised', tr(lang, 'Raised', 'Elevado')], ['lowered', tr(lang, 'Lowered', 'Rebaixado')]], pos > 0 ? 'raised' : pos < 0 ? 'lowered' : 'normal');
  const posBy = el('input', { value: pos ? fmt(Math.abs(pos) / 2, lang) : '', style: 'width:70px' });
  const kern = (r.kernHalfPt as number | undefined) ?? 0;
  const kernOn = check(tr(lang, 'Kerning for fonts:', 'Kerning de fontes:'), kern > 0);
  const kernBy = el('input', { value: fmt(kern > 0 ? kern / 2 : curSize, lang), style: 'width:70px', disabled: kern <= 0 });
  // padrões do Word ao trocar a lista: 1 pt de espaçamento, 3 pt de posição
  spacing.addEventListener('change', () => { spBy.disabled = spacing.value === 'normal'; spBy.value = spacing.value === 'normal' ? '' : spBy.value || fmt(1, lang); preview(); });
  position.addEventListener('change', () => { posBy.disabled = position.value === 'normal'; posBy.value = position.value === 'normal' ? '' : posBy.value || fmt(3, lang); preview(); });
  kernOn.input.addEventListener('change', () => { kernBy.disabled = !kernOn.input.checked; });
  spBy.disabled = spacing.value === 'normal';
  posBy.disabled = position.value === 'normal';
  for (const i of [scale, spBy, posBy]) i.addEventListener('input', preview);
  const row = (label: string, ...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;gap:8px' }, el('span', { style: 'min-width:110px' }, label), ...kids);
  const advTab = el('div', { style: 'display:flex;flex-direction:column;gap:10px' },
    el('strong', {}, tr(lang, 'Character Spacing', 'Espaçamento de caracteres')),
    row(tr(lang, 'Scale:', 'Escala:'), scale, scales),
    row(tr(lang, 'Spacing:', 'Espaçamento:'), spacing, tr(lang, 'By:', 'Por:'), spBy, 'pt'),
    row(tr(lang, 'Position:', 'Posição:'), position, tr(lang, 'By:', 'Por:'), posBy, 'pt'),
    el('div', { style: 'display:flex;align-items:center;gap:8px' }, kernOn.el, kernBy, tr(lang, 'Points and above', 'Pontos e acima')));
  // ── Recursos OpenType ──
  const ot0 = typeof ed.textEffects === 'function' ? ed.textEffects().ot ?? {} : {};
  const lig = select([['none', tr(lang, 'None', 'Nenhuma')], ['standard', tr(lang, 'Standard Only', 'Somente Padrão')], ['standardContextual', tr(lang, 'Standard and Contextual', 'Padrão e Contextual')],
    ['historicalDiscretional', tr(lang, 'Historical and Discretionary', 'Histórica e Discricionária')], ['all', tr(lang, 'All', 'Todas')]], ot0.ligatures ?? 'none');
  const numSp = select([['default', tr(lang, 'Default', 'Padrão')], ['proportional', tr(lang, 'Proportional', 'Proporcional')], ['tabular', tr(lang, 'Tabular', 'Tabular')]], ot0.numSpacing ?? 'default');
  const numFm = select([['default', tr(lang, 'Default', 'Padrão')], ['lining', tr(lang, 'Lining', 'Alinhado')], ['oldStyle', tr(lang, 'Old-style', 'Estilo Antigo')]], ot0.numForm ?? 'default');
  const sets = select([['0', tr(lang, 'Default', 'Padrão')], ...Array.from({ length: 20 }, (_v, i): [string, string] => [String(i + 1), String(i + 1)])], String(ot0.stylisticSets?.[0] ?? 0));
  const calt = check(tr(lang, 'Use Contextual Alternates', 'Usar Alternativas Contextuais'), !!ot0.cntxtAlts);
  if (typeof ed.setOpenType === 'function') advTab.append(
    el('strong', { style: 'margin-top:6px' }, tr(lang, 'OpenType Features', 'Recursos OpenType')),
    row(tr(lang, 'Ligatures:', 'Ligaduras:'), lig),
    row(tr(lang, 'Number spacing:', 'Espaçamento de números:'), numSp),
    row(tr(lang, 'Number forms:', 'Formas de números:'), numFm),
    row(tr(lang, 'Stylistic sets:', 'Conjuntos estilísticos:'), sets),
    calt.el);

  // ── visualização (as duas guias) ──
  const sample = el('div', { style: 'height:56px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;overflow:hidden;background:#fff;color:#000' });
  const sampleText = el('span', {});
  sample.append(sampleText);
  function preview(): void {
    const fam = font.value || curFont;
    const css = ed.canvasFont(fam, fstyle.value.includes('b'), fstyle.value.includes('i'));
    const sz = num(size.value);
    sampleText.textContent = fam || tr(lang, 'Sample', 'Exemplo');
    const st = sampleText.style;
    st.fontFamily = `"${css.family}"`;
    st.fontWeight = String(css.weight);
    st.fontStyle = css.italic ? 'italic' : 'normal';
    st.fontSize = `${Math.min(Math.max(Number.isFinite(sz) ? sz : 11, 6), 36)}pt`;
    const c = color.value();
    st.color = c.hex === 'auto' ? '#000' : `#${c.hex}`;
    const lines: string[] = [];
    if (ul.value !== 'none') lines.push('underline');
    if (fx.strike.input.checked || fx.dstrike.input.checked) lines.push('line-through');
    st.textDecorationLine = lines.join(' ') || 'none';
    st.textDecorationStyle = /^double/.test(ul.value) || fx.dstrike.input.checked ? 'double' : /^dot/.test(ul.value) ? 'dotted' : /^dash/.test(ul.value) ? 'dashed' : /^wav/.test(ul.value) ? 'wavy' : 'solid';
    const uc = ulColor.value();
    st.textDecorationColor = uc.hex === 'auto' ? 'currentColor' : `#${uc.hex}`;
    st.textDecorationThickness = /Heavy$|^thick$/.test(ul.value) ? '2px' : 'auto';
    st.fontVariant = fx.small.input.checked ? 'small-caps' : 'normal';
    st.textTransform = fx.caps.input.checked ? 'uppercase' : 'none';
    st.verticalAlign = fx.sup.input.checked ? 'super' : fx.sub.input.checked ? 'sub' : 'baseline';
    st.opacity = fx.hidden.input.checked ? '0.4' : '1';
    const sc = num(scale.value);
    st.display = 'inline-block';
    st.transform = Number.isFinite(sc) && sc !== 100 ? `scaleX(${sc / 100})` : '';
    const by = num(spBy.value);
    st.letterSpacing = spacing.value === 'normal' || !Number.isFinite(by) ? 'normal' : `${spacing.value === 'condensed' ? -by : by}pt`;
  }
  syncUl();

  const tabs = dialogTabs([
    { id: 'font', label: tr(lang, 'Font', 'Fonte'), body: fontTab },
    { id: 'advanced', label: tr(lang, 'Advanced', 'Avançado'), body: advTab },
  ], 'font');
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' }, tabs.el,
    el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, tr(lang, 'Preview', 'Visualização'), sample));
  const h = openDialog({
    title: tr(lang, 'Font', 'Fonte'), body, layer: env.layer, lang, width: 560,
    actions: [
      ...(typeof ed.setDefaultFont === 'function' && !ed.isProtected() ? [{ id: 'default', label: tr(lang, 'Set As Default', 'Definir como Padrão') }] : []),
      ...(openTextEffects && !ed.isProtected() ? [{ id: 'effects', label: tr(lang, 'Text Effects...', 'Efeitos de Texto...') }] : []),
      { id: 'cancel', label: L.cancel }, { id: 'ok', label: 'OK', primary: true },
    ],
  });
  const res = await h.result;
  if (res === 'default') { setAsDefault(); return; }
  if (res === 'effects') { openTextEffects?.(); return; }
  if (res !== 'ok') return;

  // ── aplica só o que mudou ──
  const f: FontFormat = {};
  const fam = font.value.trim();
  if (fam && fam !== curFont) f.fontFamily = fam;
  if (fstyle.value !== styleCur) { f.bold = fstyle.value.includes('b'); f.italic = fstyle.value.includes('i'); }
  const sz = num(size.value);
  if (Number.isFinite(sz) && sz >= 1 && sz <= 1638 && Math.round(sz * 2) !== ((r.szHalfPt as number | undefined) ?? 22)) f.sizePt = Math.round(sz * 2) / 2;
  const c = color.value();
  if (JSON.stringify(c) !== JSON.stringify(colorPick)) f.color = apiColor(c);
  if (ul.value !== ulCur) f.underline = ul.value as FontFormat['underline'];
  const uc = ulColor.value();
  if (JSON.stringify(uc) !== JSON.stringify(ulPick) && ul.value !== 'none') f.underlineColor = apiColor(uc);
  if (fx.strike.input.checked !== !!r.strike) f.strike = fx.strike.input.checked;
  if (fx.dstrike.input.checked !== !!r.doubleStrike) f.doubleStrike = fx.dstrike.input.checked;
  if (fx.sup.input.checked !== (r.vertAlign === 'superscript') || fx.sub.input.checked !== (r.vertAlign === 'subscript')) {
    f.superscript = fx.sup.input.checked; f.subscript = fx.sub.input.checked;
  }
  if (fx.small.input.checked !== !!r.smallCaps) f.smallCaps = fx.small.input.checked;
  if (fx.caps.input.checked !== !!r.allCaps) f.allCaps = fx.caps.input.checked;
  if (fx.hidden.input.checked !== !!r.hidden) f.hidden = fx.hidden.input.checked;
  const sc = num(scale.value);
  if (Number.isFinite(sc) && sc >= 1 && sc <= 600 && Math.round(sc) !== ((r.scalePct as number | undefined) ?? 100)) f.scalePct = Math.round(sc);
  const spv = spacing.value === 'normal' ? 0 : Math.round((Number.isFinite(num(spBy.value)) ? num(spBy.value) : 0) * 20) * (spacing.value === 'condensed' ? -1 : 1);
  if (spv !== sp) f.spacingTwips = spv;
  const pv = position.value === 'normal' ? 0 : Math.round((Number.isFinite(num(posBy.value)) ? num(posBy.value) : 0) * 2) * (position.value === 'lowered' ? -1 : 1);
  if (pv !== pos) f.positionHalfPt = pv;
  const kv = kernOn.input.checked ? Math.max(1, Math.round((Number.isFinite(num(kernBy.value)) ? num(kernBy.value) : curSize) * 2)) : 0;
  if (kv !== kern) f.kernMinHalfPt = kv;
  if (Object.keys(f).length) ed.setFontFormat(f);
  // OpenType: só o que mudou
  if (typeof ed.setOpenType === 'function') {
    const ot: Parameters<typeof ed.setOpenType>[0] = {};
    if (lig.value !== (ot0.ligatures ?? 'none')) ot.ligatures = lig.value === 'none' ? null : lig.value;
    if (numSp.value !== (ot0.numSpacing ?? 'default')) ot.numSpacing = numSp.value === 'default' ? null : numSp.value as 'tabular';
    if (numFm.value !== (ot0.numForm ?? 'default')) ot.numForm = numFm.value === 'default' ? null : numFm.value as 'lining';
    if (sets.value !== String(ot0.stylisticSets?.[0] ?? 0)) ot.stylisticSets = sets.value === '0' ? null : [Number(sets.value)];
    if (calt.input.checked !== !!ot0.cntxtAlts) ot.cntxtAlts = calt.input.checked || null;
    if (Object.keys(ot).length) ed.setOpenType(ot);
  }

  /** Definir como Padrão: o que o diálogo mostra e difere do estilo Normal entra nele (medido). */
  function setAsDefault(): void {
    const def = ed.listStyles('all').find((x) => x.isDefault && x.kind !== 'character');
    const look = def ? ed.styleFormatting(def.id) : null;
    const d: FontFormat = {};
    const fam = font.value.trim() || curFont;
    if (!look || fam !== look.fontFamily) d.fontFamily = fam;
    const sz = num(size.value);
    if (Number.isFinite(sz) && (!look || Math.abs(sz - look.sizePt) > 0.01)) d.sizePt = sz;
    const b = fstyle.value.includes('b'), i = fstyle.value.includes('i');
    if (!look || b !== look.bold) d.bold = b;
    if (!look || i !== look.italic) d.italic = i;
    const c = color.value();
    if (c.hex !== 'auto' && (!look || c.hex.toUpperCase() !== (look.color ?? '').toUpperCase())) d.color = apiColor(c);
    if (!look || (ul.value !== 'none') !== look.underline) d.underline = ul.value as FontFormat['underline'];
    if (!look || fx.strike.input.checked !== look.strike) d.strike = fx.strike.input.checked;
    if (!look || fx.caps.input.checked !== look.allCaps) d.allCaps = fx.caps.input.checked;
    if (!look || fx.small.input.checked !== look.smallCaps) d.smallCaps = fx.small.input.checked;
    if (Object.keys(d).length) ed.setDefaultFont(d);
  }
}
