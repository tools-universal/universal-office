/**
 * DOM mínimo para testar os web components (<universal-write>,
 * <universal-document-viewer>) no Node, sem jsdom: o bastante para construir,
 * conectar e carregar os elementos. Não há layout de CSS (medidas zeradas,
 * salvo onde o teste definir) e o canvas tem um contexto 2D de mentira — a
 * pintura roda, mas não desenha nada.
 *
 * As propriedades dos elementos ficam no PROTÓTIPO (acessores sobre um estado
 * interno), nunca como campos da instância: um campo `type`/`download`/`src`
 * na base esconderia o método de mesmo nome do componente.
 *
 * `installFakeDom()` troca os globais com `vi.stubGlobal`; desfaça com
 * `vi.unstubAllGlobals()`.
 */
import { vi } from 'vitest';

type Listener = EventListenerOrEventListenerObject;

const rect = (): DOMRect => ({ x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;

/** Seletor simples: tag, #id, .classe, [attr], [attr=valor] (combinadores: só a última parte conta). */
function matches(el: FakeElement, selector: string): boolean {
  return selector.split(',').some((alt) => {
    const last = alt.trim().split(/\s+|>/).filter(Boolean).pop() ?? '';
    const re = /([#.]?[\w-]+|\[[^\]]+\]|\*)/g;
    let m: RegExpExecArray | null;
    let any = false;
    while ((m = re.exec(last))) {
      any = true;
      const t = m[1]!;
      if (t === '*') continue;
      if (t.startsWith('#')) { if (el.id !== t.slice(1)) return false; continue; }
      if (t.startsWith('.')) { if (!el.classList.contains(t.slice(1))) return false; continue; }
      if (t.startsWith('[')) {
        const [, name, value] = /^\[\s*([\w:-]+)\s*(?:[~|^$*]?=\s*["']?([^"'\]]*)["']?)?\s*\]$/.exec(t) ?? [];
        if (!name || !el.hasAttribute(name)) return false;
        if (value !== undefined && el.getAttribute(name) !== value) return false;
        continue;
      }
      if (el.localName !== t.toLowerCase()) return false;
    }
    return any;
  });
}

class FakeClassList {
  constructor(private readonly el: FakeElement) {}
  private get list(): string[] { return this.el.className.split(/\s+/).filter(Boolean); }
  private set list(v: string[]) { this.el.className = v.join(' '); }
  add(...cs: string[]): void { this.list = [...new Set([...this.list, ...cs])]; }
  remove(...cs: string[]): void { this.list = this.list.filter((c) => !cs.includes(c)); }
  contains(c: string): boolean { return this.list.includes(c); }
  toggle(c: string, force?: boolean): boolean {
    const on = force ?? !this.contains(c);
    if (on) this.add(c); else this.remove(c);
    return on;
  }
  get length(): number { return this.list.length; }
  [Symbol.iterator](): Iterator<string> { return this.list[Symbol.iterator](); }
}

/** Estilo inline: qualquer propriedade; setProperty/getPropertyValue/removeProperty. */
function makeStyle(): CSSStyleDeclaration {
  const s: Record<string, unknown> = {
    cssText: '',
    setProperty(k: string, v: string) { s[k] = v; },
    getPropertyValue(k: string) { return (s[k] as string | undefined) ?? ''; },
    removeProperty(k: string) { const v = s[k]; delete s[k]; return v ?? ''; },
  };
  return s as unknown as CSSStyleDeclaration;
}

/** Contexto 2D de mentira: todos os métodos existem e não desenham. */
function fakeContext2d(canvas: FakeElement): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = {
    canvas,
    measureText: (t: string) => ({ width: t.length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2, fontBoundingBoxAscent: 9, fontBoundingBoxDescent: 3 }),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    getLineDash: () => [],
    isPointInPath: () => false,
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createConicGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({ setTransform() {} }),
  };
  return new Proxy(target, {
    get(t, k) { return k in t ? t[k] : () => undefined; },
    set(t, k, v) { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

export class FakeNode extends EventTarget {
  nodeType = 1;
  childNodes: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  protected __text = '';
  private readonly __listeners = new Map<string, Set<Listener>>();

  get parentElement(): FakeElement | null { return this.parentNode instanceof FakeElement ? this.parentNode : null; }
  get children(): FakeElement[] { return this.childNodes.filter((n): n is FakeElement => n instanceof FakeElement); }
  get firstChild(): FakeNode | null { return this.childNodes[0] ?? null; }
  get lastChild(): FakeNode | null { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get firstElementChild(): FakeElement | null { return this.children[0] ?? null; }
  get lastElementChild(): FakeElement | null { return this.children[this.children.length - 1] ?? null; }
  get childElementCount(): number { return this.children.length; }
  get nextSibling(): FakeNode | null { const p = this.parentNode; return p ? p.childNodes[p.childNodes.indexOf(this) + 1] ?? null : null; }
  get previousSibling(): FakeNode | null { const p = this.parentNode; return p ? p.childNodes[p.childNodes.indexOf(this) - 1] ?? null : null; }
  get nextElementSibling(): FakeElement | null { const p = this.parentNode; if (!p) return null; const cs = p.children; return cs[cs.indexOf(this as unknown as FakeElement) + 1] ?? null; }
  get previousElementSibling(): FakeElement | null { const p = this.parentNode; if (!p) return null; const cs = p.children; return cs[cs.indexOf(this as unknown as FakeElement) - 1] ?? null; }
  get ownerDocument(): FakeDocument { return fakeDocument!; }
  get isConnected(): boolean { return this.getRootNode({ composed: true }) === fakeDocument; }

  appendChild<T extends FakeNode>(n: T): T {
    if (n instanceof FakeFragment) { for (const c of [...n.childNodes]) this.appendChild(c); return n; }
    n.remove();
    n.parentNode = this;
    this.childNodes.push(n);
    connectedChanged(n, true);
    return n;
  }
  append(...ns: (FakeNode | string)[]): void { for (const n of ns) this.appendChild(typeof n === 'string' ? new FakeText(n) : n); }
  prepend(...ns: (FakeNode | string)[]): void {
    const first = this.firstChild;
    for (const n of ns) this.insertBefore(typeof n === 'string' ? new FakeText(n) : n, first);
  }
  insertBefore<T extends FakeNode>(n: T, ref: FakeNode | null): T {
    if (!ref) return this.appendChild(n);
    if (n instanceof FakeFragment) { for (const c of [...n.childNodes]) this.insertBefore(c, ref); return n; }
    n.remove();
    n.parentNode = this;
    this.childNodes.splice(this.childNodes.indexOf(ref), 0, n);
    connectedChanged(n, true);
    return n;
  }
  before(...ns: FakeNode[]): void { for (const n of ns) this.parentNode?.insertBefore(n, this); }
  after(...ns: FakeNode[]): void { const next = this.nextSibling; for (const n of ns) this.parentNode?.insertBefore(n, next); }
  removeChild<T extends FakeNode>(n: T): T { n.remove(); return n; }
  replaceChild<T extends FakeNode>(n: FakeNode, old: T): T { this.insertBefore(n, old); old.remove(); return old; }
  replaceChildren(...ns: (FakeNode | string)[]): void {
    for (const c of [...this.childNodes]) c.remove();
    this.append(...ns);
  }
  replaceWith(...ns: FakeNode[]): void { const p = this.parentNode; if (!p) return; for (const n of ns) p.insertBefore(n, this); this.remove(); }
  remove(): void {
    const p = this.parentNode;
    if (!p) return;
    const wasConnected = this.isConnected;
    p.childNodes.splice(p.childNodes.indexOf(this), 1);
    this.parentNode = null;
    if (wasConnected) connectedChanged(this, false);
  }
  contains(n: FakeNode | null): boolean {
    for (let x: FakeNode | null = n; x; x = x.parentNode) if (x === this) return true;
    return false;
  }
  getRootNode(opts?: { composed?: boolean }): FakeNode {
    let x: FakeNode = this;
    for (;;) {
      if (x.parentNode) { x = x.parentNode; continue; }
      if (opts?.composed && x instanceof FakeShadowRoot) { x = x.host; continue; }
      return x;
    }
  }
  get textContent(): string { return this.__text + this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v: string | null) { for (const c of [...this.childNodes]) c.remove(); this.__text = v ?? ''; }
  cloneNode(_deep?: boolean): FakeNode { return new FakeNode(); }
  /** descendentes (elementos) em ordem do documento */
  *descendants(): Generator<FakeElement> {
    for (const c of this.childNodes) {
      if (c instanceof FakeElement) { yield c; yield* c.descendants(); }
    }
  }
  querySelector<E = FakeElement>(sel: string): E | null {
    for (const d of this.descendants()) if (matches(d, sel)) return d as unknown as E;
    return null;
  }
  querySelectorAll<E = FakeElement>(sel: string): E[] {
    const out: E[] = [];
    for (const d of this.descendants()) if (matches(d, sel)) out.push(d as unknown as E);
    return out;
  }
  getElementById(id: string): FakeElement | null { return this.querySelector(`#${id}`); }

  override dispatchEvent(e: Event): boolean {
    // o EventTarget do Node não borbulha: os pais (e, da raiz de sombra, o
    // hospedeiro) recebem depois, quando o evento pede bolha
    const path: FakeNode[] = [];
    for (let x: FakeNode | null = this; x;) {
      path.push(x);
      // filho (light DOM) de um hospedeiro com sombra: segue pelo <slot> que o recebe, como o navegador
      const p: FakeNode | null = x.parentNode;
      const sr: FakeShadowRoot | null = p instanceof FakeElement && x instanceof FakeElement ? (p as unknown as { shadowRoot: FakeShadowRoot | null }).shadowRoot : null;
      const name: string = x instanceof FakeElement ? x.getAttribute('slot') ?? '' : '';
      const slot: FakeElement | undefined = sr?.querySelectorAll<FakeElement>('slot').find((s: FakeElement) => (s.getAttribute('name') ?? '') === name);
      x = slot ?? p ?? (x instanceof FakeShadowRoot ? x.host : null);
    }
    Object.defineProperty(e, 'composedPath', { value: () => path, configurable: true });
    super.dispatchEvent(e);
    if (e.bubbles) {
      for (const x of path.slice(1)) {
        if (e.cancelBubble) break;
        x.dispatchToListeners(e);
      }
    }
    return !e.defaultPrevented;
  }

  override addEventListener(type: string, l: Listener | null, opts?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, l, opts);
    if (!l) return;
    if (!this.__listeners.has(type)) this.__listeners.set(type, new Set());
    this.__listeners.get(type)!.add(l);
    const signal = typeof opts === 'object' ? opts.signal : undefined;
    signal?.addEventListener('abort', () => this.removeEventListener(type, l));
  }
  override removeEventListener(type: string, l: Listener | null, opts?: boolean | EventListenerOptions): void {
    super.removeEventListener(type, l, opts);
    if (l) this.__listeners.get(type)?.delete(l);
  }
  /** entrega a bolha aos ouvintes deste nó */
  dispatchToListeners(e: Event): void {
    for (const l of [...(this.__listeners.get(e.type) ?? [])]) {
      if (typeof l === 'function') l.call(this, e); else l.handleEvent(e);
    }
  }
}

class FakeText extends FakeNode {
  constructor(t: string) { super(); this.nodeType = 3; this.__text = t; }
  get data(): string { return this.__text; }
  set data(v: string) { this.__text = v; }
  get nodeValue(): string { return this.__text; }
}

class FakeFragment extends FakeNode {
  constructor() { super(); this.nodeType = 11; }
}

/** Propriedades genéricas dos elementos (acessores no protótipo) e o valor inicial. */
const ELEMENT_PROPS: Record<string, unknown> = {
  hidden: false, tabIndex: -1, title: '', lang: '', dir: '', draggable: false, spellcheck: false,
  type: '', value: '', name: '', disabled: false, checked: false, placeholder: '', href: '', download: '', src: '', alt: '',
  offsetWidth: 0, offsetHeight: 0, offsetLeft: 0, offsetTop: 0, clientWidth: 0, clientHeight: 0,
  scrollWidth: 0, scrollHeight: 0, scrollTop: 0, scrollLeft: 0, width: 0, height: 0,
  shadowRoot: null, files: null, selectionStart: 0, selectionEnd: 0, open: false, onclick: null,
};

interface ElementState {
  tag: string;
  attrs: Map<string, string>;
  props: Record<string, unknown>;
  style: CSSStyleDeclaration;
  dataset: Record<string, string>;
  classList?: FakeClassList;
  html: string;
  ctx?: CanvasRenderingContext2D;
}

export class FakeElement extends FakeNode {
  protected readonly __el: ElementState;

  constructor(tag: string) {
    super();
    this.__el = { tag: tag.toLowerCase(), attrs: new Map(), props: {}, style: makeStyle(), dataset: {}, html: '' };
  }
  get localName(): string { return this.__el.tag; }
  get tagName(): string { return this.__el.tag.toUpperCase(); }
  get nodeName(): string { return this.tagName; }
  get id(): string { return this.getAttribute('id') ?? ''; }
  set id(v: string) { this.setAttribute('id', v); }
  get className(): string { return this.getAttribute('class') ?? ''; }
  set className(v: string) { this.setAttribute('class', v); }
  get classList(): FakeClassList { return (this.__el.classList ??= new FakeClassList(this)); }
  get style(): CSSStyleDeclaration { return this.__el.style; }
  get dataset(): Record<string, string> { return this.__el.dataset; }

  getAttribute(n: string): string | null { return this.__el.attrs.get(n) ?? null; }
  setAttribute(n: string, v: string): void {
    this.__el.attrs.set(n, String(v));
    attributeChanged(this, n);
  }
  hasAttribute(n: string): boolean { return this.__el.attrs.has(n); }
  removeAttribute(n: string): void {
    if (!this.__el.attrs.delete(n)) return;
    attributeChanged(this, n);
  }
  toggleAttribute(n: string, force?: boolean): boolean {
    const on = force ?? !this.hasAttribute(n);
    if (on) this.setAttribute(n, ''); else this.removeAttribute(n);
    return on;
  }
  getAttributeNames(): string[] { return [...this.__el.attrs.keys()]; }
  attachShadow(_init: ShadowRootInit): FakeShadowRoot {
    const root = new FakeShadowRoot(this);
    this.__el.props['shadowRoot'] = root;
    return root;
  }
  matches(sel: string): boolean { return matches(this, sel); }
  closest<E = FakeElement>(sel: string): E | null {
    for (let x: FakeNode | null = this; x; x = x.parentNode) if (x instanceof FakeElement && matches(x, sel)) return x as unknown as E;
    return null;
  }
  getBoundingClientRect(): DOMRect { return rect(); }
  getClientRects(): DOMRect[] { return []; }
  get innerHTML(): string { return this.__el.html; }
  set innerHTML(v: string) { for (const c of [...this.childNodes]) c.remove(); this.__el.html = v; }
  get innerText(): string { return this.textContent; }
  set innerText(v: string) { this.textContent = v; }
  get outerHTML(): string { return `<${this.localName}>${this.__el.html}</${this.localName}>`; }
  insertAdjacentHTML(): void { /* sem parser */ }
  insertAdjacentElement(_where: string, el: FakeElement): FakeElement { this.appendChild(el); return el; }
  focus(): void { fakeDocument!.activeElement = this; }
  blur(): void { if (fakeDocument!.activeElement === this) fakeDocument!.activeElement = fakeDocument!.body; }
  click(): void { this.dispatchEvent(new Event('click', { bubbles: true, cancelable: true })); }
  scrollIntoView(): void {}
  scrollTo(): void {}
  scrollBy(): void {}
  select(): void {}
  setSelectionRange(): void {}
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  hasPointerCapture(): boolean { return false; }
  requestFullscreen(): Promise<void> { return Promise.resolve(); }
  animate(): Animation { return { finished: Promise.resolve(), cancel() {}, finish() {}, onfinish: null } as unknown as Animation; }
  getAnimations(): Animation[] { return []; }
  showModal(): void { this.setAttribute('open', ''); }
  show(): void { this.setAttribute('open', ''); }
  close(): void { this.removeAttribute('open'); }
  showPopover(): void {}
  hidePopover(): void {}
  togglePopover(): boolean { return false; }
  getContext(type: string): CanvasRenderingContext2D | null {
    if (type !== '2d') return null;
    return (this.__el.ctx ??= fakeContext2d(this));
  }
  toDataURL(): string { return 'data:image/png;base64,'; }
  toBlob(cb: (b: Blob | null) => void): void { cb(new Blob([])); }
  override cloneNode(deep?: boolean): FakeElement {
    const c = createElement(this.localName);
    for (const [k, v] of this.__el.attrs) c.__el.attrs.set(k, v);
    Object.assign(c.dataset, this.dataset);
    if (deep) for (const ch of this.childNodes) c.appendChild(ch.cloneNode(true));
    return c;
  }
}
for (const [k, initial] of Object.entries(ELEMENT_PROPS)) {
  Object.defineProperty(FakeElement.prototype, k, {
    configurable: true,
    get(this: FakeElement) { const p = (this as unknown as { __el: ElementState }).__el.props; return k in p ? p[k] : initial; },
    set(this: FakeElement, v: unknown) { (this as unknown as { __el: ElementState }).__el.props[k] = v; },
  });
}

export class FakeShadowRoot extends FakeNode {
  adoptedStyleSheets: unknown[] = [];
  activeElement: FakeElement | null = null;
  readonly mode = 'open';
  constructor(readonly host: FakeElement) { super(); this.nodeType = 11; }
  getSelection(): null { return null; }
  get innerHTML(): string { return ''; }
  set innerHTML(_v: string) { for (const c of [...this.childNodes]) c.remove(); }
}

class FakeDocument extends FakeNode {
  readonly documentElement = new FakeElement('html');
  readonly head = new FakeElement('head');
  readonly body = new FakeElement('body');
  activeElement: FakeElement | null = null;
  fullscreenElement: FakeElement | null = null;
  readonly hidden = false;
  readonly visibilityState = 'visible';
  readonly readyState = 'complete';
  readonly fonts = Object.assign(new Set<unknown>(), {
    check: () => true,
    load: () => Promise.resolve([]),
    ready: Promise.resolve(),
    status: 'loaded',
    addEventListener() {},
    removeEventListener() {},
  });
  constructor() {
    super();
    this.nodeType = 9;
    this.appendChild(this.documentElement);
    this.documentElement.append(this.head, this.body);
    this.activeElement = this.body;
  }
  createElement(tag: string): FakeElement { return createElement(tag); }
  createElementNS(_ns: string, tag: string): FakeElement { return createElement(tag); }
  createTextNode(t: string): FakeNode { return new FakeText(t); }
  createDocumentFragment(): FakeNode { return new FakeFragment(); }
  createComment(): FakeNode { return new FakeText(''); }
  createTreeWalker(root: FakeNode): { currentNode: FakeNode; nextNode(): null } { return { currentNode: root, nextNode: () => null }; }
  importNode<T extends FakeNode>(n: T, deep?: boolean): FakeNode { return n.cloneNode(deep); }
  getSelection(): null { return null; }
  exitFullscreen(): Promise<void> { return Promise.resolve(); }
  elementFromPoint(): null { return null; }
  elementsFromPoint(): [] { return []; }
  execCommand(): boolean { return false; }
  hasFocus(): boolean { return true; }
}

let fakeDocument: FakeDocument | null = null;

// ───────── custom elements ─────────

/** Classes registradas por nome (customElements.define) — createElement as instancia. */
const registry = new Map<string, CustomElementConstructor>();
/** Classe → nome, para o construtor do HTMLElement falso saber a tag. */
const tagOf = new WeakMap<object, string>();

function createElement(tag: string): FakeElement {
  const ctor = registry.get(tag.toLowerCase());
  return ctor ? (new ctor() as unknown as FakeElement) : new FakeElement(tag);
}

type CustomHooks = {
  connectedCallback?(): unknown;
  disconnectedCallback?(): void;
  attributeChangedCallback?(name: string, oldV: string | null, newV: string | null): void;
};

/** Elemento de uma classe que estende o HTMLElement falso (custom element). */
const isCustom = (x: FakeNode): x is FakeElement => x instanceof FakeHTMLElement;

function connectedChanged(n: FakeNode, added: boolean): void {
  if (added && !n.isConnected) return;
  const visit = (x: FakeNode): void => {
    const hooks = x as unknown as CustomHooks;
    if (isCustom(x)) {
      if (added) void hooks.connectedCallback?.(); else hooks.disconnectedCallback?.();
    }
    for (const c of x.childNodes) visit(c);
    const root = x instanceof FakeElement ? (x as unknown as { shadowRoot: FakeShadowRoot | null }).shadowRoot : null;
    if (root) for (const c of root.childNodes) visit(c);
  };
  visit(n);
}

function attributeChanged(el: FakeElement, name: string): void {
  if (!isCustom(el)) return;
  const observed = (el.constructor as { observedAttributes?: string[] }).observedAttributes ?? [];
  if (observed.includes(name)) (el as unknown as CustomHooks).attributeChangedCallback?.(name, null, el.getAttribute(name));
}

export class FakeCustomElementRegistry {
  readonly define = vi.fn((name: string, ctor: CustomElementConstructor) => {
    if (registry.has(name)) throw new DOMException(`"${name}" has already been used with this registry`, 'NotSupportedError');
    registry.set(name, ctor);
    tagOf.set(ctor, name);
  });
  get(name: string): CustomElementConstructor | undefined { return registry.get(name); }
  whenDefined(): Promise<void> { return Promise.resolve(); }
  upgrade(): void {}
}

/** HTMLElement falso: a tag vem do registro (customElements.define). */
class FakeHTMLElement extends FakeElement {
  constructor() {
    let tag = 'div';
    for (let p = new.target as unknown as object | null; p && p !== FakeHTMLElement; p = Object.getPrototypeOf(p)) {
      const t = tagOf.get(p);
      if (t) { tag = t; break; }
    }
    super(tag);
  }
}

// ───────── janela ─────────

class FakeResizeObserver { constructor(_cb: unknown) {} observe(): void {} unobserve(): void {} disconnect(): void {} }
class FakeIntersectionObserver { constructor(_cb: unknown) {} observe(): void {} unobserve(): void {} disconnect(): void {} takeRecords(): [] { return []; } }
class FakeMutationObserver { constructor(_cb: unknown) {} observe(): void {} disconnect(): void {} takeRecords(): [] { return []; } }
class FakeFontFace {
  status = 'loaded';
  constructor(readonly family: string, _src: unknown, readonly descriptors: Record<string, string> = {}) {}
  load(): Promise<this> { return Promise.resolve(this); }
}
class FakeImage extends FakeElement {
  constructor() { super('img'); }
  get naturalWidth(): number { return 0; }
  get naturalHeight(): number { return 0; }
  get complete(): boolean { return true; }
  decode(): Promise<void> { return Promise.resolve(); }
}

export interface FakeDom {
  document: FakeDocument;
  window: EventTarget & Record<string, unknown>;
  customElements: FakeCustomElementRegistry;
  /** chamadas de window.open: [url, alvo, recursos] */
  opened: [string, string | undefined, string | undefined][];
}

/**
 * Instala o DOM falso nos globais (vi.stubGlobal). `defined` = elementos já
 * registrados antes (ex.: u-ripple de outra versão da biblioteca).
 */
export function installFakeDom(opts: { defined?: Record<string, CustomElementConstructor> } = {}): FakeDom {
  registry.clear();
  fakeDocument = new FakeDocument();
  const opened: FakeDom['opened'] = [];
  const win = Object.assign(new EventTarget(), {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 800,
    location: { href: 'http://localhost/', origin: 'http://localhost', protocol: 'http:', host: 'localhost', pathname: '/' },
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    setInterval: (fn: () => void, ms?: number) => setInterval(fn, ms),
    clearInterval: (id: ReturnType<typeof setInterval>) => clearInterval(id),
    requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0) as unknown as number,
    cancelAnimationFrame: (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    requestIdleCallback: (fn: () => void) => setTimeout(fn, 0) as unknown as number,
    cancelIdleCallback: (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
    matchMedia: (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    getComputedStyle: () => makeStyle(),
    getSelection: () => null,
    open: (url: string, target?: string, features?: string) => { opened.push([url, target, features]); return null; },
    print: () => {},
    scrollTo: () => {},
    focus: () => {},
  });
  const ce = new FakeCustomElementRegistry();
  for (const [name, ctor] of Object.entries(opts.defined ?? {})) registry.set(name, ctor);
  Object.assign(win, { document: fakeDocument, customElements: ce });
  const globals: Record<string, unknown> = {
    window: win,
    self: win,
    document: fakeDocument,
    customElements: ce,
    HTMLElement: FakeHTMLElement,
    HTMLDivElement: FakeElement,
    HTMLCanvasElement: FakeElement,
    HTMLImageElement: FakeImage,
    HTMLInputElement: FakeElement,
    HTMLButtonElement: FakeElement,
    HTMLTextAreaElement: FakeElement,
    HTMLDialogElement: FakeElement,
    HTMLAnchorElement: FakeElement,
    Element: FakeElement,
    Node: FakeNode,
    Document: FakeDocument,
    ShadowRoot: FakeShadowRoot,
    Image: FakeImage,
    FontFace: FakeFontFace,
    ResizeObserver: FakeResizeObserver,
    IntersectionObserver: FakeIntersectionObserver,
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame: win.requestAnimationFrame,
    cancelAnimationFrame: win.cancelAnimationFrame,
    matchMedia: win.matchMedia,
    getComputedStyle: win.getComputedStyle,
    devicePixelRatio: 1,
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
  };
  for (const [k, v] of Object.entries(globals)) vi.stubGlobal(k, v);
  return { document: fakeDocument, window: win as unknown as FakeDom['window'], customElements: ce, opened };
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
}

/** Evento de mouse (o Node não tem MouseEvent): clientX/clientY no evento. */
export function mouseEvent(type: string, init: { clientX?: number; clientY?: number; bubbles?: boolean } = {}): MouseEvent {
  const e = new Event(type, { bubbles: init.bubbles ?? true, cancelable: true });
  Object.assign(e, { clientX: init.clientX ?? 0, clientY: init.clientY ?? 0, button: 0, buttons: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, pointerType: 'mouse' });
  return e as MouseEvent;
}
