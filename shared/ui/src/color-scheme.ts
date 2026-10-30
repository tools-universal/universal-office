/**
 * Claro/escuro dos web components — um lugar só (<universal-write>,
 * <universal-document-viewer>). Regra combinada com o usuário: o componente
 * segue a propriedade CSS `color-scheme` do CONTEXTO (herdada, atravessa o
 * shadow DOM), sem procurar classes de tema em ancestrais. O @universal-material
 * já funciona assim: `:root { color-scheme: light dark }` segue o SO e as classes
 * `.u-light`/`.u-dark` só trocam o `color-scheme`; os tokens `--u-color-*` são
 * `light-dark(claro, escuro)` e se resolvem sozinhos no elemento que os usa.
 *
 *  - CSS: as cores dos componentes são tokens ou `light-dark()` — a troca é só
 *    CSS, sem JS. Sem `color-scheme` no contexto vale o do navegador (`normal`
 *    = claro); `light dark` segue o SO.
 *  - Atributo `theme="light|dark"` força: define `color-scheme` no próprio host
 *    (`forceColorScheme`); `auto`/ausente herda.
 *  - JS que precisa do tema efetivo (pintura em canvas, controles da janela,
 *    evento para o hospedeiro) usa o `ColorSchemeWatcher`: uma SONDA no shadow
 *    root com `color: light-dark(rgb(0,0,1), rgb(0,0,2))` — o `getComputedStyle`
 *    devolve a cor já resolvida pelo `color-scheme` usado no host, o que cobre
 *    `normal`, `only`, `<meta name="color-scheme">` e o SO. A mudança chega por
 *    uma transição de 1 ms no `background-color` da sonda (o mesmo light-dark):
 *    trocar o `color-scheme` de um ancestral ou o tema do SO muda o valor
 *    computado e dispara `transitionend` — sem polling e sem observar classes.
 *    Medido no Chromium (Edge 2026): o `color` sem transição já lê o valor novo
 *    na hora; a transição dispara em troca de classe/estilo de ancestral e na
 *    troca do `prefers-color-scheme`; elemento em `display: none` não dispara —
 *    por isso também relê no ResizeObserver do host (quando volta a aparecer)
 *    e no `change` do `matchMedia`.
 */

export type ColorScheme = 'light' | 'dark';

/** Valores aceitos no atributo `theme` (`auto` = herdar o `color-scheme` do contexto). */
export type ThemeMode = 'auto' | 'light' | 'dark';

const LIGHT = 'rgb(0, 0, 1)';
const DARK = 'rgb(0, 0, 2)';

/** Estilo da sonda: fora do fluxo, invisível, sem eventos — mas COM caixa (display:none não transiciona). */
const PROBE_CSS = 'position:absolute;top:0;left:0;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);'
  + `pointer-events:none;color:light-dark(${LIGHT},${DARK});background-color:light-dark(${LIGHT},${DARK});transition:background-color 1ms`;

const prefersDark = (): boolean => typeof matchMedia === 'function' && !!matchMedia('(prefers-color-scheme: dark)')?.matches;

/**
 * Tema pelo valor computado de `color-scheme` (recuo para navegador sem
 * `light-dark()`): só `dark` → escuro; `light dark` → o do SO; o resto → claro.
 */
export function schemeFromColorScheme(value: string | null | undefined, osDark = prefersDark()): ColorScheme {
  const t = (value ?? '').trim().toLowerCase().split(/\s+/);
  const light = t.includes('light'), dark = t.includes('dark');
  if (dark && !light) return 'dark';
  if (dark && light) return osDark ? 'dark' : 'light';
  return 'light';
}

/** Cor lida na sonda → tema (null = não é a cor da sonda: sem suporte a light-dark()). */
export function schemeFromProbeColor(color: string | null | undefined): ColorScheme | null {
  const m = /^rgba?\(\s*0\s*,\s*0\s*,\s*([\d.]+)\s*[,)]/.exec((color ?? '').trim());
  if (!m) return null;
  const b = Number(m[1]);
  if (!(b >= 0.5 && b <= 2.5)) return null;
  return b >= 1.5 ? 'dark' : 'light';
}

/** Valor do atributo `theme` normalizado (desconhecido/ausente = `auto`). */
export function themeMode(value: string | null | undefined): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

/**
 * Força (ou solta) o `color-scheme` do host: um `<style data-uo-scheme>` com
 * `:host { color-scheme: … !important }` no shadow root — `!important` de
 * dentro do shadow vence o da página, então o atributo sempre manda. null =
 * herda o contexto (remove a regra).
 */
export function forceColorScheme(root: ShadowRoot, scheme: ColorScheme | null): void {
  let s = root.querySelector<HTMLStyleElement>('style[data-uo-scheme]');
  if (!scheme) { s?.remove(); return; }
  if (!s) {
    s = document.createElement('style');
    s.setAttribute('data-uo-scheme', '');
    root.prepend(s);
  }
  const css = `:host { color-scheme: ${scheme} !important; }`;
  if (s.textContent !== css) s.textContent = css;
}

/**
 * Tema efetivo de um web component, reavaliado em tempo real. `connect()` no
 * connectedCallback, `disconnect()` no disconnectedCallback (tira a sonda e
 * todos os ouvintes). `onChange` só dispara quando o tema MUDA depois da
 * primeira leitura (a primeira é silenciosa: o hospedeiro lê o getter).
 */
export class ColorSchemeWatcher {
  readonly probe: HTMLElement;
  private value: ColorScheme = 'light';
  private read0 = false;
  private ac: AbortController | null = null;
  private ro: ResizeObserver | null = null;

  constructor(
    private readonly root: ShadowRoot,
    private readonly host: HTMLElement,
    private readonly onChange: (scheme: ColorScheme) => void,
  ) {
    this.probe = document.createElement('span');
    this.probe.className = 'uo-scheme-probe';
    this.probe.setAttribute('aria-hidden', 'true');
    this.probe.style.cssText = PROBE_CSS;
  }

  /** Tema efetivo agora (relido se ainda não conectado). */
  get scheme(): ColorScheme {
    if (!this.ac) return this.read();
    return this.value;
  }

  get connected(): boolean { return !!this.ac; }

  connect(): void {
    if (this.ac) return;
    const ac = this.ac = new AbortController();
    const { signal } = ac;
    if (this.probe.parentNode !== this.root) this.root.appendChild(this.probe);
    const refresh = (): void => { this.refresh(); };
    this.probe.addEventListener('transitionend', refresh, { signal });
    this.probe.addEventListener('transitioncancel', refresh, { signal });
    const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    if (mq?.addEventListener) {
      mq.addEventListener('change', refresh);
      signal.addEventListener('abort', () => mq.removeEventListener('change', refresh));
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(refresh);
      this.ro.observe(this.host);
    }
    this.refresh();
  }

  disconnect(): void {
    this.ac?.abort();
    this.ac = null;
    this.ro?.disconnect();
    this.ro = null;
    this.probe.remove();
  }

  /** Relê o tema; avisa se mudou. Devolve o tema efetivo. */
  refresh(): ColorScheme {
    const v = this.read();
    const first = !this.read0;
    this.read0 = true;
    if (v !== this.value) {
      this.value = v;
      if (!first) this.onChange(v);
    }
    return v;
  }

  private read(): ColorScheme {
    if (typeof getComputedStyle !== 'function') return 'light';
    const fromProbe = this.probe.isConnected ? schemeFromProbeColor(getComputedStyle(this.probe).color) : null;
    return fromProbe ?? schemeFromColorScheme(getComputedStyle(this.host).colorScheme);
  }
}
