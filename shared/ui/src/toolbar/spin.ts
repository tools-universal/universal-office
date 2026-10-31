// Caixa numérica com setas (spin) das barras — Recuar/Espaçamento do grupo
// Parágrafo da guia Layout do Write; serve a qualquer medida (Slides, Sheet).
// O valor mora em uma unidade-base inteira (twips no Write) e é exibido/digitado
// numa unidade de medida ("1,5 cm", "8 pt", '0,5"', "12 mm", "1 pol"): o texto
// digitado aceita qualquer uma delas e converte. Enter aplica, Esc volta, ↑/↓ e a
// roda (com foco) andam um passo, encaixando no múltiplo do passo como o Word
// (8 pt → 12 pt). Vazia quando a seleção tem valores diferentes (get() = null).
import { symbol } from './icons.js';
import { esc, ripple } from './items.js';
import type { BarContext, BarItem, Lbl } from './types.js';
import { uiLocale, type UiLang } from '../i18n.js';

/** Unidades de medida aceitas (base = twips: 1/20 pt). */
export type MeasureUnit = 'cm' | 'mm' | 'in' | 'pt';

const PER: Record<MeasureUnit, number> = { cm: 1440 / 2.54, mm: 144 / 2.54, in: 1440, pt: 20 };
/** sufixos digitáveis de cada unidade (pt-BR e inglês) */
const SUFFIX: [RegExp, MeasureUnit][] = [
  [/^(cm|cent[ií]metros?)$/i, 'cm'], [/^(mm|mil[ií]metros?)$/i, 'mm'],
  [/^("|''|in|inch(es)?|pol(egadas?)?|pol\.)$/i, 'in'], [/^(pt|pts|pontos?|points?)$/i, 'pt'],
];

/**
 * "1,5", "1.5 cm", '0,5"', "12 pt", "1 pol" → twips (null se não for medida). Sem
 * unidade, vale a da caixa. Aceita vírgula ou ponto como separador decimal.
 */
export function parseMeasure(text: string, unit: MeasureUnit): number | null {
  const m = /^\s*([+-]?\d*[.,]?\d+)\s*(.*?)\s*$/.exec(text);
  if (!m) return null;
  const n = parseFloat(m[1]!.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  let u: MeasureUnit = unit;
  if (m[2]) {
    const s = SUFFIX.find(([re]) => re.test(m[2]!));
    if (!s) return null;
    u = s[1];
  }
  return Math.round(n * PER[u]);
}

/** twips → "1,27 cm" / "8 pt" / '0,5"' (até 2 casas, separador do idioma). */
export function formatMeasure(twips: number, unit: MeasureUnit, lang: UiLang): string {
  const v = Math.round((twips / PER[unit]) * 100) / 100;
  const n = v.toLocaleString(uiLocale(lang), { maximumFractionDigits: 2, useGrouping: false });
  return unit === 'in' ? `${n}"` : `${n} ${unit}`;
}

export interface SpinFieldConfig {
  id: string;
  /** rótulo à esquerda da caixa (ex.: "À Esquerda:") */
  label: Lbl;
  /** dica (tooltip) */
  tip?: Lbl;
  /** Material Symbol antes do rótulo */
  icon?: string;
  /** unidade de exibição (pode depender do idioma: cm × polegadas) */
  unit: MeasureUnit | ((lang: UiLang) => MeasureUnit);
  /** passo das setas, na base (twips) */
  step: number | ((lang: UiLang) => number);
  min: number;
  max: number;
  /** abaixo do mínimo vira "Automático" (espaçamento antes/depois) */
  auto?: boolean;
  /** valor atual na base; 'auto' = Automático; null = vazio (valores diferentes) */
  get(): number | 'auto' | null;
  set(v: number | 'auto'): void;
  supports?(): boolean;
  isEnabled?(): boolean;
  /** largura da caixa (px) */
  width?: number;
}

const AUTO: Record<UiLang, string> = { en: 'Auto', pt: 'Automático', es: 'Automático' };

/** Item de barra com a caixa numérica (ribbon ou compacta). */
export function spinField(cfg: SpinFieldConfig): BarItem {
  return {
    // o id oculta a caixa (hidden-commands, formattingPolicy do Write)
    id: cfg.id,
    widget: (ctx: BarContext) => {
      const lang = ctx.lang;
      const unit = typeof cfg.unit === 'function' ? cfg.unit(lang) : cfg.unit;
      const step = typeof cfg.step === 'function' ? cfg.step(lang) : cfg.step;
      const text = (l: Lbl | undefined): string => (l === undefined ? '' : ctx.registry.text(l));
      const wrap = document.createElement('span');
      wrap.className = 'uo-spin';
      wrap.dataset['a'] = cfg.id;
      const label = document.createElement('label');
      label.className = 'uo-spin-lbl';
      label.innerHTML = (cfg.icon ? symbol(cfg.icon) : '') + `<span>${esc(text(cfg.label))}</span>`;
      const box = document.createElement('span');
      box.className = 'uo-spin-box';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'uo-spin-in';
      input.inputMode = 'decimal';
      input.spellcheck = false;
      input.autocomplete = 'off';
      if (cfg.width) input.style.width = `${cfg.width}px`;
      const tip = text(cfg.tip ?? cfg.label);
      input.title = tip;
      input.setAttribute('aria-label', tip);
      input.setAttribute('role', 'spinbutton');
      const id = `uo-spin-${cfg.id.replace(/\W/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
      input.id = id;
      label.htmlFor = id;
      const arrows = document.createElement('span');
      arrows.className = 'uo-spin-arrows';
      const arrow = (dir: 1 | -1): HTMLButtonElement => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'uo-spin-arrow';
        b.tabIndex = -1;
        b.innerHTML = symbol(dir > 0 ? 'arrow_drop_up' : 'arrow_drop_down');
        b.setAttribute('aria-label', `${tip} ${dir > 0 ? '+' : '−'}`);
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { bump(dir); ctx.after(); });
        ripple(b);
        return b;
      };
      arrows.append(arrow(1), arrow(-1));
      box.append(input, arrows);
      wrap.append(label, box);

      const show = (v: number | 'auto' | null): string => (v === null ? '' : v === 'auto' ? AUTO[lang] : formatMeasure(v, unit, lang));
      let shown = '';
      const sync = (): void => {
        if (document.activeElement === input || (input.getRootNode() as ShadowRoot | Document).activeElement === input) return;
        shown = show(cfg.get());
        input.value = shown;
        const v = cfg.get();
        if (typeof v === 'number') input.setAttribute('aria-valuenow', String(v)); else input.removeAttribute('aria-valuenow');
      };
      const clamp = (v: number): number => Math.min(cfg.max, Math.max(cfg.min, v));
      /** um passo, encaixando no múltiplo (8 pt + 6 → 12) */
      const bump = (dir: 1 | -1): void => {
        if (input.disabled) return;
        const cur = cfg.get();
        let next: number | 'auto';
        if (cur === 'auto') { if (dir < 0) return; next = cfg.min; } else {
          const base = cur ?? 0;
          const snapped = dir > 0 ? Math.floor(base / step + 1e-9) * step + step : Math.ceil(base / step - 1e-9) * step - step;
          if (snapped < cfg.min && cfg.auto && dir < 0) next = 'auto';
          else next = clamp(snapped);
        }
        if (next === cur) return;
        cfg.set(next);
        shown = show(next);
        input.value = shown;
      };
      const commit = (): boolean => {
        const s = input.value.trim();
        if (s === shown) return true;
        if (cfg.auto && s.toLowerCase() === AUTO[lang].toLowerCase()) { cfg.set('auto'); return true; }
        const v = parseMeasure(s, unit);
        if (v === null) { input.setAttribute('aria-invalid', 'true'); input.value = shown; return false; }
        input.removeAttribute('aria-invalid');
        cfg.set(clamp(v));
        return true;
      };
      input.addEventListener('focus', () => input.select());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); input.blur(); ctx.after(); }
        else if (e.key === 'Escape') { e.preventDefault(); input.value = shown; input.blur(); ctx.after(); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (input.value.trim() !== shown) commit();
          bump(e.key === 'ArrowUp' ? 1 : -1);
          input.select();
        }
      });
      input.addEventListener('wheel', (e) => {
        if (document.activeElement !== input && (input.getRootNode() as ShadowRoot | Document).activeElement !== input) return;
        e.preventDefault();
        bump(e.deltaY < 0 ? 1 : -1);
        input.select();
      }, { passive: false });
      input.addEventListener('blur', () => { if (input.value.trim() !== shown) commit(); queueMicrotask(sync); });
      const visible = (): boolean => { try { return cfg.supports?.() ?? true; } catch { return false; } };
      return {
        el: wrap,
        visible,
        sync: () => {
          const off = cfg.isEnabled ? !cfg.isEnabled() : false;
          input.disabled = off;
          for (const b of arrows.querySelectorAll('button')) b.disabled = off;
          wrap.classList.toggle('uo-off', off);
          sync();
        },
      };
    },
  };
}

/** Título de coluna num grupo da ribbon (ex.: "Recuar", "Espaçamento"). */
export function barCaption(text: Lbl, id?: string): BarItem {
  return {
    ...(id ? { id } : {}),
    widget: (ctx: BarContext) => {
      const s = document.createElement('span');
      s.className = 'uo-caption';
      if (id) s.dataset['a'] = id;
      s.textContent = ctx.registry.text(text);
      return { el: s };
    },
  };
}
