/**
 * "Navegador" de mentira para o claro/escuro sobre o DOM falso (fake-dom.ts):
 * o `color-scheme` do CONTEXTO (o que a página herda para o host: `normal`,
 * `light`, `dark`, `light dark`), o tema do SO (`prefers-color-scheme`) e o
 * `getComputedStyle` que resolve a sonda do ColorSchemeWatcher
 * (`light-dark(rgb(0,0,1), rgb(0,0,2))`) como o navegador faria — inclusive o
 * `:host { color-scheme }` que `theme="light|dark"` põe no shadow root.
 *
 * Como no navegador, a troca de contexto/SO só chega ao componente pela
 * transição da sonda (`settle()` = `transitionend`) ou pelo `change` do
 * matchMedia (`setOsDark`). Instale DEPOIS de `installFakeDom()`.
 */
import { vi } from 'vitest';

type Listener = () => void;

export interface ColorSchemeEnv {
  /** `color-scheme` herdado do contexto (padrão `normal`) */
  context: string;
  /** a página define os tokens do @universal-material (`--u-color-surface`) */
  tokens: boolean;
  /** navegador sem `light-dark()`: a sonda não resolve (cai no `color-scheme` computado) */
  noLightDark: boolean;
  /** troca o tema do SO e avisa os ouvintes do matchMedia */
  setOsDark(dark: boolean): void;
  /** ouvintes ativos do `change` do matchMedia */
  readonly mqListeners: number;
  /** ResizeObservers criados (observe/disconnect contados) */
  readonly observers: { observed: unknown[]; disconnected: boolean }[];
  /** dispara o fim da transição nas sondas do elemento (o que o navegador faz quando o valor muda) */
  settle(el: Element): void;
}

const used = (scheme: string, osDark: boolean): 'light' | 'dark' => {
  const t = scheme.trim().split(/\s+/);
  if (t.includes('dark') && !t.includes('light')) return 'dark';
  if (t.includes('dark') && t.includes('light')) return osDark ? 'dark' : 'light';
  return 'light';
};

export function installColorSchemeEnv(): ColorSchemeEnv {
  let osDark = false;
  const listeners = new Set<Listener>();
  const observers: ColorSchemeEnv['observers'] = [];
  const env = {
    context: 'normal',
    tokens: false,
    noLightDark: false,
    setOsDark(dark: boolean) { osDark = dark; for (const l of [...listeners]) l(); },
    get mqListeners() { return listeners.size; },
    observers,
    settle(el: Element) {
      const root = (el as unknown as { shadowRoot: ShadowRoot | null }).shadowRoot;
      for (const p of root?.querySelectorAll('.uo-scheme-probe') ?? []) p.dispatchEvent(new Event('transitionend'));
    },
  } satisfies ColorSchemeEnv;

  const mql = {
    media: '(prefers-color-scheme: dark)',
    get matches() { return osDark; },
    addEventListener: (_t: string, l: Listener) => { listeners.add(l); },
    removeEventListener: (_t: string, l: Listener) => { listeners.delete(l); },
    addListener: (l: Listener) => { listeners.add(l); },
    removeListener: (l: Listener) => { listeners.delete(l); },
  };
  const other = { matches: false, media: '', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
  const matchMedia = (q: string) => (q.includes('prefers-color-scheme: dark') ? mql : other);

  /** color-scheme computado do host: o forçado pelo `theme` (no shadow root) ou o do contexto */
  const hostScheme = (host: Element | null): string => {
    const forced = (host as unknown as { shadowRoot: ShadowRoot | null } | null)?.shadowRoot
      ?.querySelector('style[data-uo-scheme]')?.textContent ?? '';
    return /color-scheme:\s*(light|dark)/.exec(forced)?.[1] ?? env.context;
  };
  const getComputedStyle = (el: Element) => {
    const isProbe = (el as HTMLElement).className === 'uo-scheme-probe';
    const host = isProbe ? ((el.getRootNode() as ShadowRoot).host ?? null) : el;
    const scheme = hostScheme(host);
    const color = !isProbe ? 'rgb(0, 0, 0)' : env.noLightDark ? 'rgb(0, 0, 0)' : used(scheme, osDark) === 'dark' ? 'rgb(0, 0, 2)' : 'rgb(0, 0, 1)';
    return {
      color,
      colorScheme: scheme,
      getPropertyValue: (name: string) => (name === '--u-color-surface' && env.tokens ? 'light-dark(#faf9fd, #121316)' : ''),
    } as unknown as CSSStyleDeclaration;
  };

  class TrackingResizeObserver {
    private readonly rec = { observed: [] as unknown[], disconnected: false };
    constructor(_cb: unknown) { observers.push(this.rec); }
    observe(t: unknown): void { this.rec.observed.push(t); }
    unobserve(): void {}
    disconnect(): void { this.rec.disconnected = true; }
  }

  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('getComputedStyle', getComputedStyle);
  vi.stubGlobal('ResizeObserver', TrackingResizeObserver);
  const win = (globalThis as unknown as { window: Record<string, unknown> }).window;
  Object.assign(win, { matchMedia, getComputedStyle });
  return env;
}
