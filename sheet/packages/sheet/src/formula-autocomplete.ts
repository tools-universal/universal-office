/**
 * Autocompletar de funções ao digitar uma fórmula (como o Excel): depois do
 * "=", o nome sendo digitado filtra as funções do catálogo NO IDIOMA das
 * fórmulas (prefixo, sem diferenciar maiúsculas nem acentos); ↑/↓ escolhem,
 * Tab (ou clique) completa com "(", Esc fecha a lista. Dentro dos parênteses de
 * uma função, uma dica mostra o nome dela — só o nome: o catálogo não tem os
 * nomes dos argumentos e eles não são inventados aqui.
 */
import { functionNames, type FunctionName } from '@universal-office/sheet-calc';
import type { FormulaLocale } from './formula-locale.js';

const ID_CHAR = /[\p{L}\p{N}_.\\]/u;
const ID_START = /[\p{L}_\\]/u;
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();

/** Nome de função sendo digitado no cursor (fora de textos e nomes de aba), ou null. */
export function functionTokenAt(text: string, caret: number): { start: number; prefix: string } | null {
  if (!text.startsWith('=') || caret < 2) return null;
  // dentro de "texto" ou 'aba'? (conta aspas até o cursor)
  let q = '';
  for (let i = 1; i < caret; i++) {
    const ch = text[i]!;
    if (q) { if (ch === q) { if (text[i + 1] === q && i + 1 < caret) i++; else q = ''; } continue; }
    if (ch === '"' || ch === "'") q = ch;
  }
  if (q) return null;
  let start = caret;
  while (start > 1 && ID_CHAR.test(text[start - 1]!)) start--;
  if (start === caret || !ID_START.test(text[start]!)) return null;
  const before = text[start - 1] ?? '';
  // Plan1!A…, [Coluna…], 1E… não são nomes de função
  if (before === '!' || before === '[' || /[\d$]/.test(before)) return null;
  // o resto do identificador depois do cursor (editando no meio) também conta
  if (caret < text.length && ID_CHAR.test(text[caret]!)) return null;
  return { start, prefix: text.slice(start, caret) };
}

/** Funções do idioma que começam com o prefixo (ordem alfabética do idioma). */
export function matchFunctions(prefix: string, lang: string): FunctionName[] {
  const p = fold(prefix);
  return namesFor(lang).filter((f) => fold(f.name).startsWith(p));
}

const NAMES = new Map<string, FunctionName[]>();
function namesFor(lang: string): FunctionName[] {
  let l = NAMES.get(lang);
  if (!l) { l = functionNames(lang); NAMES.set(lang, l); }
  return l;
}

/** Função cujos parênteses envolvem o cursor (a mais interna), como digitada. */
export function callAt(text: string, caret: number): string | null {
  if (!text.startsWith('=')) return null;
  const stack: (string | null)[] = [];
  let q = '';
  for (let i = 1; i < caret && i < text.length; i++) {
    const ch = text[i]!;
    if (q) { if (ch === q) { if (text[i + 1] === q) i++; else q = ''; } continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '(') {
      let s = i;
      while (s > 1 && ID_CHAR.test(text[s - 1]!)) s--;
      stack.push(s < i && ID_START.test(text[s]!) ? text.slice(s, i) : null);
    } else if (ch === ')') stack.pop();
  }
  for (let k = stack.length - 1; k >= 0; k--) if (stack[k]) return stack[k]!;
  return null;
}

/** Lista + dica presas a um <input> de fórmula. */
export class FormulaAutocomplete {
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private tip: HTMLDivElement | null = null;
  private items: FunctionName[] = [];
  private active = 0;
  private token: { start: number; prefix: string } | null = null;
  private ownKeys = false;

  /** `host`: onde a lista e a dica são anexadas (posição fixa, pela tela). */
  constructor(private readonly host: HTMLElement, private readonly locale: () => FormulaLocale) {}

  /** Liga ao input. `ownKeys`: trata ↑/↓/Tab/Esc sozinho (input fora do componente). */
  attach(input: HTMLInputElement, ownKeys = false): void {
    this.detach();
    this.input = input;
    this.ownKeys = ownKeys;
    input.addEventListener('input', this.refresh);
    input.addEventListener('click', this.refresh);
    input.addEventListener('keyup', this.onKeyUp);
    if (ownKeys) input.addEventListener('keydown', this.onOwnKey, true);
    input.addEventListener('blur', this.onBlur);
    this.refresh();
  }

  detach(): void {
    const i = this.input;
    if (i) {
      i.removeEventListener('input', this.refresh);
      i.removeEventListener('click', this.refresh);
      i.removeEventListener('keyup', this.onKeyUp);
      i.removeEventListener('keydown', this.onOwnKey, true);
      i.removeEventListener('blur', this.onBlur);
    }
    this.input = null;
    this.hideList();
    this.hideTip();
  }

  /** A lista está aberta (o clique nela não deve encerrar a edição). */
  holdsFocus(): boolean { return !!this.list?.isConnected && this.pointerDown; }
  private pointerDown = false;

  /** Tecla no input: true = consumida pela lista (↑, ↓, Tab, Esc). */
  handleKey(ev: KeyboardEvent): boolean {
    if (!this.list?.isConnected || !this.items.length) return false;
    switch (ev.key) {
      case 'ArrowDown': this.move(1); break;
      case 'ArrowUp': this.move(-1); break;
      case 'Tab': this.accept(this.items[this.active]!); break;
      case 'Escape': this.hideList(); break;
      default: return false;
    }
    ev.preventDefault();
    ev.stopPropagation();
    return true;
  }

  private readonly onOwnKey = (ev: KeyboardEvent): void => {
    if (this.handleKey(ev)) ev.stopImmediatePropagation();
  };

  private readonly onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'Home' || ev.key === 'End') this.refresh();
  };

  private readonly onBlur = (): void => {
    if (this.pointerDown) return;
    this.hideList();
    this.hideTip();
  };

  private readonly refresh = (): void => {
    const input = this.input;
    if (!input) return;
    const caret = input.selectionStart ?? input.value.length;
    const lang = this.locale().lang;
    const tok = functionTokenAt(input.value, caret);
    this.token = tok;
    this.items = tok ? matchFunctions(tok.prefix, lang) : [];
    this.active = 0;
    if (this.items.length) this.showList(); else this.hideList();
    const call = this.items.length ? null : callAt(input.value, caret);
    if (call) this.showTip(call); else this.hideTip();
  };

  private move(d: number): void {
    this.active = (this.active + d + this.items.length) % this.items.length;
    this.renderList();
  }

  private accept(f: FunctionName): void {
    const input = this.input, tok = this.token;
    if (!input || !tok) return;
    const caret = input.selectionStart ?? input.value.length;
    const after = input.value.slice(caret);
    const paren = after.startsWith('(') ? '' : '(';
    input.value = input.value.slice(0, tok.start) + f.name + paren + after;
    const pos = tok.start + f.name.length + 1;
    input.setSelectionRange(pos, pos);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    this.refresh();
  }

  private place(el: HTMLElement): void {
    const r = this.input!.getBoundingClientRect();
    el.style.left = `${Math.round(r.left)}px`;
    el.style.top = `${Math.round(r.bottom + 2)}px`;
  }

  private showList(): void {
    const list = this.list ??= this.makeList();
    if (!list.isConnected) this.host.appendChild(list);
    this.place(list);
    this.renderList();
  }

  private makeList(): HTMLDivElement {
    const list = document.createElement('div');
    list.setAttribute('role', 'listbox');
    list.style.cssText =
      'position:fixed;z-index:20;min-width:180px;max-height:176px;overflow-y:auto;background:#fff;color:#1f1f1f;' +
      'border:1px solid #c8c8c8;box-shadow:0 2px 6px rgba(0,0,0,.18);font:12px Segoe UI,Arial,sans-serif;padding:2px 0;';
    list.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      this.pointerDown = true;
      const item = (ev.target as HTMLElement).closest('[data-i]') as HTMLElement | null;
      if (item) this.accept(this.items[Number(item.dataset.i)]!);
      this.pointerDown = false;
    });
    return list;
  }

  private renderList(): void {
    const list = this.list!;
    list.replaceChildren();
    this.items.forEach((f, i) => {
      const d = document.createElement('div');
      d.dataset.i = String(i);
      d.setAttribute('role', 'option');
      d.textContent = f.name;
      d.style.cssText = `padding:2px 10px;cursor:default;white-space:nowrap;${i === this.active ? 'background:#cfe3f7;' : ''}`;
      list.appendChild(d);
    });
    const a = list.children[this.active] as HTMLElement | undefined;
    if (a) {
      if (a.offsetTop < list.scrollTop) list.scrollTop = a.offsetTop;
      else if (a.offsetTop + a.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = a.offsetTop + a.offsetHeight - list.clientHeight;
    }
  }

  private hideList(): void {
    this.list?.remove();
    this.items = [];
  }

  private showTip(name: string): void {
    const known = namesFor(this.locale().lang).find((f) => fold(f.name) === fold(name));
    if (!known) { this.hideTip(); return; }
    const tip = this.tip ??= document.createElement('div');
    tip.textContent = known.name;
    tip.style.cssText =
      'position:fixed;z-index:20;background:#ffffe1;color:#1f1f1f;border:1px solid #a0a0a0;padding:1px 6px;' +
      'font:600 11px Segoe UI,Arial,sans-serif;white-space:nowrap;pointer-events:none;';
    if (!tip.isConnected) this.host.appendChild(tip);
    this.place(tip);
  }

  private hideTip(): void {
    this.tip?.remove();
  }
}
