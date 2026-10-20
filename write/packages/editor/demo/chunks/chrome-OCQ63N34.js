import {
  ACCENTS,
  CommandRegistry,
  HIGHLIGHT_COLORS,
  OFFICE_COLORS,
  appFor,
  applyTheme,
  bindHostFonts,
  closeDialogs,
  closeMenus,
  closePopover,
  colorGrid,
  createCompactBar,
  createRibbon,
  ensureBarStyles,
  hostOf,
  isDark,
  isMenuOpen,
  openDialog,
  openMenu,
  promptDialog,
  renderItem,
  ripple,
  showToast,
  symbol,
  toggleMenu
} from "./chunk-E4J7TX2A.js";
import "./chunk-2OGOPGPS.js";
import {
  pickLabels
} from "./chunk-WKEEN2RM.js";

// ../../node_modules/tslib/tslib.es6.mjs
function __decorate(decorators, target, key, desc) {
  var c4 = arguments.length, r5 = c4 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r5 = Reflect.decorate(decorators, target, key, desc);
  else for (var i5 = decorators.length - 1; i5 >= 0; i5--) if (d3 = decorators[i5]) r5 = (c4 < 3 ? d3(r5) : c4 > 3 ? d3(target, key, r5) : d3(target, key)) || r5;
  return c4 > 3 && r5 && Object.defineProperty(target, key, r5), r5;
}

// ../../node_modules/@lit/reactive-element/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = /* @__PURE__ */ Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e6, o6) {
    if (this._$cssResult$ = true, o6 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e6;
  }
  get styleSheet() {
    let t5 = this.o;
    const s4 = this.t;
    if (e && void 0 === t5) {
      const e6 = void 0 !== s4 && 1 === s4.length;
      e6 && (t5 = o.get(s4)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s4, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e6) => {
  const o6 = 1 === t5.length ? t5[0] : e6.reduce((e7, s4, o7) => e7 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s4) + t5[o7 + 1], t5[0]);
  return new n(o6, t5, s);
};
var S = (s4, o6) => {
  if (e) s4.adoptedStyleSheets = o6.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e6 of o6) {
    const o7 = document.createElement("style"), n5 = t.litNonce;
    void 0 !== n5 && o7.setAttribute("nonce", n5), o7.textContent = e6.cssText, s4.appendChild(o7);
  }
};
var c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e6 = "";
  for (const s4 of t6.cssRules) e6 += s4.cssText;
  return r(e6);
})(t5) : t5;

// ../../node_modules/@lit/reactive-element/reactive-element.js
var { is: i2, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object;
var a = globalThis;
var c2 = a.trustedTypes;
var l = c2 ? c2.emptyScript : "";
var p = a.reactiveElementPolyfillSupport;
var d = (t5, s4) => t5;
var u = { toAttribute(t5, s4) {
  switch (s4) {
    case Boolean:
      t5 = t5 ? l : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s4) {
  let i5 = t5;
  switch (s4) {
    case Boolean:
      i5 = null !== t5;
      break;
    case Number:
      i5 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i5 = JSON.parse(t5);
      } catch (t6) {
        i5 = null;
      }
  }
  return i5;
} };
var f = (t5, s4) => !i2(t5, s4);
var b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var y = class extends HTMLElement {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s4 = b) {
    if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t5, s4), !s4.noAccessor) {
      const i5 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i5, s4);
      void 0 !== h3 && e2(this.prototype, t5, h3);
    }
  }
  static getPropertyDescriptor(t5, s4, i5) {
    const { get: e6, set: r5 } = h(this.prototype, t5) ?? { get() {
      return this[s4];
    }, set(t6) {
      this[s4] = t6;
    } };
    return { get: e6, set(s5) {
      const h3 = e6?.call(this);
      r5?.call(this, s5), this.requestUpdate(t5, h3, i5);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? b;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d("elementProperties"))) return;
    const t5 = n2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d("properties"))) {
      const t6 = this.properties, s4 = [...r2(t6), ...o2(t6)];
      for (const i5 of s4) this.createProperty(i5, t6[i5]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s4 = litPropertyMetadata.get(t5);
      if (void 0 !== s4) for (const [t6, i5] of s4) this.elementProperties.set(t6, i5);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s4] of this.elementProperties) {
      const i5 = this._$Eu(t6, s4);
      void 0 !== i5 && this._$Eh.set(i5, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s4) {
    const i5 = [];
    if (Array.isArray(s4)) {
      const e6 = new Set(s4.flat(1 / 0).reverse());
      for (const s5 of e6) i5.unshift(c(s5));
    } else void 0 !== s4 && i5.push(c(s4));
    return i5;
  }
  static _$Eu(t5, s4) {
    const i5 = s4.attribute;
    return false === i5 ? void 0 : "string" == typeof i5 ? i5 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s4 = this.constructor.elementProperties;
    for (const i5 of s4.keys()) this.hasOwnProperty(i5) && (t5.set(i5, this[i5]), delete this[i5]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s4, i5) {
    this._$AK(t5, i5);
  }
  _$ET(t5, s4) {
    const i5 = this.constructor.elementProperties.get(t5), e6 = this.constructor._$Eu(t5, i5);
    if (void 0 !== e6 && true === i5.reflect) {
      const h3 = (void 0 !== i5.converter?.toAttribute ? i5.converter : u).toAttribute(s4, i5.type);
      this._$Em = t5, null == h3 ? this.removeAttribute(e6) : this.setAttribute(e6, h3), this._$Em = null;
    }
  }
  _$AK(t5, s4) {
    const i5 = this.constructor, e6 = i5._$Eh.get(t5);
    if (void 0 !== e6 && this._$Em !== e6) {
      const t6 = i5.getPropertyOptions(e6), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
      this._$Em = e6;
      const r5 = h3.fromAttribute(s4, t6.type);
      this[e6] = r5 ?? this._$Ej?.get(e6) ?? r5, this._$Em = null;
    }
  }
  requestUpdate(t5, s4, i5, e6 = false, h3) {
    if (void 0 !== t5) {
      const r5 = this.constructor;
      if (false === e6 && (h3 = this[t5]), i5 ??= r5.getPropertyOptions(t5), !((i5.hasChanged ?? f)(h3, s4) || i5.useDefault && i5.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r5._$Eu(t5, i5)))) return;
      this.C(t5, s4, i5);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s4, { useDefault: i5, reflect: e6, wrapped: h3 }, r5) {
    i5 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r5 ?? s4 ?? this[t5]), true !== h3 || void 0 !== r5) || (this._$AL.has(t5) || (this.hasUpdated || i5 || (s4 = void 0), this._$AL.set(t5, s4)), true === e6 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s5] of this._$Ep) this[t7] = s5;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s5, i5] of t6) {
        const { wrapped: t7 } = i5, e6 = this[s5];
        true !== t7 || this._$AL.has(s5) || void 0 === e6 || this.C(s5, void 0, i5, e6);
      }
    }
    let t5 = false;
    const s4 = this._$AL;
    try {
      t5 = this.shouldUpdate(s4), t5 ? (this.willUpdate(s4), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s4)) : this._$EM();
    } catch (s5) {
      throw t5 = false, this._$EM(), s5;
    }
    t5 && this._$AE(s4);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
y.elementStyles = [], y.shadowRootOptions = { mode: "open" }, y[d("elementProperties")] = /* @__PURE__ */ new Map(), y[d("finalized")] = /* @__PURE__ */ new Map(), p?.({ ReactiveElement: y }), (a.reactiveElementVersions ??= []).push("2.1.2");

// ../../node_modules/lit-html/lit-html.js
var t2 = globalThis;
var i3 = (t5) => t5;
var s2 = t2.trustedTypes;
var e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i5, ...s4) => ({ _$litType$: t5, strings: i5, values: s4 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = /* @__PURE__ */ Symbol.for("lit-noChange");
var A = /* @__PURE__ */ Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i5) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i5) : i5;
}
var N = (t5, i5) => {
  const s4 = t5.length - 1, e6 = [];
  let n5, l3 = 2 === i5 ? "<svg>" : 3 === i5 ? "<math>" : "", c4 = v;
  for (let i6 = 0; i6 < s4; i6++) {
    const s5 = t5[i6];
    let a3, u3, d3 = -1, f3 = 0;
    for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
    const x2 = c4 === p2 && t5[i6 + 1].startsWith("/>") ? " " : "";
    l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e6.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x2) : s5 + o3 + (-2 === d3 ? i6 : x2);
  }
  return [V(t5, l3 + (t5[s4] || "<?>") + (2 === i5 ? "</svg>" : 3 === i5 ? "</math>" : "")), e6];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i5 }, e6) {
    let r5;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u3 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i5);
    if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i5 || 3 === i5) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r5 = P.nextNode()) && d3.length < u3; ) {
      if (1 === r5.nodeType) {
        if (r5.hasAttributes()) for (const t6 of r5.getAttributeNames()) if (t6.endsWith(h2)) {
          const i6 = v2[a3++], s4 = r5.getAttribute(t6).split(o3), e7 = /([.?@])?(.*)/.exec(i6);
          d3.push({ type: 1, index: l3, name: e7[2], strings: s4, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r5.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r5.removeAttribute(t6));
        if (y2.test(r5.tagName)) {
          const t6 = r5.textContent.split(o3), i6 = t6.length - 1;
          if (i6 > 0) {
            r5.textContent = s2 ? s2.emptyScript : "";
            for (let s4 = 0; s4 < i6; s4++) r5.append(t6[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r5.append(t6[i6], c3());
          }
        }
      } else if (8 === r5.nodeType) if (r5.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r5.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i5) {
    const s4 = l2.createElement("template");
    return s4.innerHTML = t5, s4;
  }
};
function M(t5, i5, s4 = t5, e6) {
  if (i5 === E) return i5;
  let h3 = void 0 !== e6 ? s4._$Co?.[e6] : s4._$Cl;
  const o6 = a2(i5) ? void 0 : i5._$litDirective$;
  return h3?.constructor !== o6 && (h3?._$AO?.(false), void 0 === o6 ? h3 = void 0 : (h3 = new o6(t5), h3._$AT(t5, s4, e6)), void 0 !== e6 ? (s4._$Co ??= [])[e6] = h3 : s4._$Cl = h3), void 0 !== h3 && (i5 = M(t5, h3._$AS(t5, i5.values), h3, e6)), i5;
}
var R = class {
  constructor(t5, i5) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i5;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i5 }, parts: s4 } = this._$AD, e6 = (t5?.creationScope ?? l2).importNode(i5, true);
    P.currentNode = e6;
    let h3 = P.nextNode(), o6 = 0, n5 = 0, r5 = s4[0];
    for (; void 0 !== r5; ) {
      if (o6 === r5.index) {
        let i6;
        2 === r5.type ? i6 = new k(h3, h3.nextSibling, this, t5) : 1 === r5.type ? i6 = new r5.ctor(h3, r5.name, r5.strings, this, t5) : 6 === r5.type && (i6 = new Z(h3, this, t5)), this._$AV.push(i6), r5 = s4[++n5];
      }
      o6 !== r5?.index && (h3 = P.nextNode(), o6++);
    }
    return P.currentNode = l2, e6;
  }
  p(t5) {
    let i5 = 0;
    for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t5, s4, i5), i5 += s4.strings.length - 2) : s4._$AI(t5[i5])), i5++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i5, s4, e6) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i5, this._$AM = s4, this.options = e6, this._$Cv = e6?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i5 = this._$AM;
    return void 0 !== i5 && 11 === t5?.nodeType && (t5 = i5.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i5 = this) {
    t5 = M(this, t5, i5), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i5, _$litType$: s4 } = t5, e6 = "number" == typeof s4 ? this._$AC(t5) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
    if (this._$AH?._$AD === e6) this._$AH.p(i5);
    else {
      const t6 = new R(e6, this), s5 = t6.u(this.options);
      t6.p(i5), this.T(s5), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i5 = C.get(t5.strings);
    return void 0 === i5 && C.set(t5.strings, i5 = new S2(t5)), i5;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i5 = this._$AH;
    let s4, e6 = 0;
    for (const h3 of t5) e6 === i5.length ? i5.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i5[e6], s4._$AI(h3), e6++;
    e6 < i5.length && (this._$AR(s4 && s4._$AB.nextSibling, e6), i5.length = e6);
  }
  _$AR(t5 = this._$AA.nextSibling, s4) {
    for (this._$AP?.(false, true, s4); t5 !== this._$AB; ) {
      const s5 = i3(t5).nextSibling;
      i3(t5).remove(), t5 = s5;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i5, s4, e6, h3) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i5, this._$AM = e6, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
  }
  _$AI(t5, i5 = this, s4, e6) {
    const h3 = this.strings;
    let o6 = false;
    if (void 0 === h3) t5 = M(this, t5, i5, 0), o6 = !a2(t5) || t5 !== this._$AH && t5 !== E, o6 && (this._$AH = t5);
    else {
      const e7 = t5;
      let n5, r5;
      for (t5 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r5 = M(this, e7[s4 + n5], i5, n5), r5 === E && (r5 = this._$AH[n5]), o6 ||= !a2(r5) || r5 !== this._$AH[n5], r5 === A ? t5 = A : t5 !== A && (t5 += (r5 ?? "") + h3[n5 + 1]), this._$AH[n5] = r5;
    }
    o6 && !e6 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i5, s4, e6, h3) {
    super(t5, i5, s4, e6, h3), this.type = 5;
  }
  _$AI(t5, i5 = this) {
    if ((t5 = M(this, t5, i5, 0) ?? A) === E) return;
    const s4 = this._$AH, e6 = t5 === A && s4 !== A || t5.capture !== s4.capture || t5.once !== s4.once || t5.passive !== s4.passive, h3 = t5 !== A && (s4 === A || e6);
    e6 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i5, s4) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i5, this.options = s4;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i5, s4) => {
  const e6 = s4?.renderBefore ?? i5;
  let h3 = e6._$litPart$;
  if (void 0 === h3) {
    const t6 = s4?.renderBefore ?? null;
    e6._$litPart$ = h3 = new k(i5.insertBefore(c3(), t6), t6, void 0, s4 ?? {});
  }
  return h3._$AI(t5), h3;
};

// ../../node_modules/lit-element/lit-element.js
var s3 = globalThis;
var i4 = class extends y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r5 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r5, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i4._$litElement$ = true, i4["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i4 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i4 });
(s3.litElementVersions ??= []).push("4.2.2");

// ../../node_modules/@lit/reactive-element/decorators/custom-element.js
var t3 = (t5) => (e6, o6) => {
  void 0 !== o6 ? o6.addInitializer(() => {
    customElements.define(t5, e6);
  }) : customElements.define(t5, e6);
};

// ../../node_modules/@lit/reactive-element/decorators/property.js
var o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
var r4 = (t5 = o5, e6, r5) => {
  const { kind: n5, metadata: i5 } = r5;
  let s4 = globalThis.litPropertyMetadata.get(i5);
  if (void 0 === s4 && globalThis.litPropertyMetadata.set(i5, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t5 = Object.create(t5)).wrapped = true), s4.set(r5.name, t5), "accessor" === n5) {
    const { name: o6 } = r5;
    return { set(r6) {
      const n6 = e6.get.call(this);
      e6.set.call(this, r6), this.requestUpdate(o6, n6, t5, true, r6);
    }, init(e7) {
      return void 0 !== e7 && this.C(o6, void 0, t5, e7), e7;
    } };
  }
  if ("setter" === n5) {
    const { name: o6 } = r5;
    return function(r6) {
      const n6 = this[o6];
      e6.call(this, r6), this.requestUpdate(o6, n6, t5, true, r6);
    };
  }
  throw Error("Unsupported decorator location: " + n5);
};
function n4(t5) {
  return (e6, o6) => "object" == typeof o6 ? r4(t5, e6, o6) : ((t6, e7, o7) => {
    const r5 = e7.hasOwnProperty(o7);
    return e7.constructor.createProperty(o7, t6), r5 ? Object.getOwnPropertyDescriptor(e7, o7) : void 0;
  })(t5, e6, o6);
}

// ../../node_modules/@lit/reactive-element/decorators/base.js
var e4 = (e6, t5, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e6, t5, c4), c4);

// ../../node_modules/@lit/reactive-element/decorators/query.js
function e5(e6, r5) {
  return (n5, s4, i5) => {
    const o6 = (t5) => t5.renderRoot?.querySelector(e6) ?? null;
    if (r5) {
      const { get: e7, set: r6 } = "object" == typeof s4 ? n5 : i5 ?? /* @__PURE__ */ (() => {
        const t5 = /* @__PURE__ */ Symbol();
        return { get() {
          return this[t5];
        }, set(e8) {
          this[t5] = e8;
        } };
      })();
      return e4(n5, s4, { get() {
        let t5 = e7.call(this);
        return void 0 === t5 && (t5 = o6(this), (null !== t5 || this.hasUpdated) && r6.call(this, t5)), t5;
      } });
    }
    return e4(n5, s4, { get() {
      return o6(this);
    } });
  };
}

// ../../node_modules/@universal-material/web/ripple/ripple.styles.js
var styles = i`
  :host,
  .ripple-container::before {
    --_ripple-hover-color: var(--u-ripple-hover-color, var(--u-ripple-color, var(--u-state-layer-color, currentColor)));
    --_ripple-pressed-color: var(--u-ripple-pressed-color, var(--u-ripple-color, var(--u-state-layer-color, currentColor)));
    --_ripple-hover-opacity: var(--u-ripple-pressed-opacity, var(--u-state-hover-opacity, 0.08));
    --_ripple-pressed-opacity: var(--u-ripple-pressed-opacity, .2);
    display: block;
    inset: 0;
    isolation: isolate;
  }

  .ripple-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: var(--u-ripple-border-radius, inherit);
  }

  .ripple-container::before {
    content: "";
    background: var(--_ripple-hover-color);
    opacity: 0;
    transition: opacity 200ms;
  }

  @media (hover: hover) {
    :host(:not([disabled]):hover) .ripple-container::before {
      content: "";
      background: var(--_ripple-hover-color);
      opacity: var(--_ripple-hover-opacity);
    }
  }
  :host,
  .ripple-container::before,
  .ripple {
    position: absolute;
    border-radius: inherit;
  }

  .ripple {
    top: 50%;
    left: 50%;
    background: var(--_ripple-pressed-color);
    border-radius: 50%;
    box-shadow: 0 0 64px 64px var(--_ripple-pressed-color);
    opacity: var(--_ripple-pressed-opacity);
    transform: scale3d(0, 0, 1);
    pointer-events: none;
    will-change: transform;
  }
  .ripple.show {
    transition: transform calc(var(--_ripple-transition-duration) / var(--u-ripple-speed, 1)) cubic-bezier(0.19, 1, 0.22, 1), opacity calc(750ms / var(--u-ripple-speed, 1));
    transform: scale3d(1, 1, 1);
  }
  .ripple.show-forced {
    transition: transform calc(var(--_ripple-transition-duration) / var(--u-ripple-speed, 1)) cubic-bezier(0.19, 1, 0.22, 1), opacity calc(200ms / var(--u-ripple-speed, 1)) 300ms;
    transform: scale3d(2, 2, 1);
    opacity: 0;
  }
  .ripple.dismiss {
    opacity: 0;
    transform: scale3d(2, 2, 1);
  }

  ::slotted(*) {
    position: absolute !important;
    inset: 0;
    border-radius: inherit;
  }
`;

// ../../node_modules/@universal-material/web/ripple/ripple.js
var Ripple_1;
var Ripple = class Ripple2 extends i4 {
  static {
    Ripple_1 = this;
  }
  static {
    this.styles = styles;
  }
  constructor() {
    super();
    this.isTouching = false;
    this.disabled = false;
  }
  render() {
    return b2`<div class="ripple-container"></div><slot></slot>`;
  }
  connectedCallback() {
    super.connectedCallback();
    this.attachEvents();
    this.ariaHidden = "true";
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dettachEvents();
  }
  attachEvents() {
    this.addEventListener("mousedown", this.handleMouseDown);
    this.addEventListener("touchstart", this.handleTouchStart);
  }
  dettachEvents() {
    this.removeEventListener("mousedown", this.handleMouseDown);
    this.removeEventListener("touchstart", this.handleTouchStart);
  }
  handleMouseDown(e6) {
    if (this.isTouching || !this.canCreateRipple()) {
      return;
    }
    this.createRipple(e6.clientX, e6.clientY, "mouseup");
  }
  handleTouchStart(e6) {
    if (!this.canCreateRipple()) {
      return;
    }
    this.isTouching = true;
    const dismiss = this.createRipple(e6.touches[0].clientX, e6.touches[0].clientY, "touchend");
    this.addEventListener("touchmove", dismiss);
  }
  canCreateRipple() {
    return !this.disabled;
  }
  createRipple(targetX = null, targetY = null, releaseEventName = null) {
    const preClientRect = this.rippleContainer.getBoundingClientRect();
    targetX ??= preClientRect.x + this.rippleContainer.clientWidth / 2;
    targetY ??= preClientRect.y + this.rippleContainer.clientHeight / 2;
    const ripple2 = document.createElement("DIV");
    ripple2.classList.add("ripple");
    this.rippleContainer.appendChild(ripple2);
    requestAnimationFrame(() => {
      const clientRect = this.getBoundingClientRect();
      const largestDimensionSize = Math.max(this.clientWidth, this.clientHeight);
      const rippleSize = largestDimensionSize * 2;
      Ripple_1._setElementSquareSizeAndCenter(ripple2, rippleSize);
      ripple2.style.setProperty("--_ripple-transition-duration", `${1080 * Math.pow(rippleSize, 0.3)}ms`);
      const x2 = targetX - clientRect.left + (rippleSize - this.rippleContainer.clientWidth) / 2;
      const y3 = targetY - clientRect.top + (rippleSize - this.rippleContainer.clientHeight) / 2;
      ripple2.style.transformOrigin = `${x2}px ${y3}px`;
      ripple2.classList.add(releaseEventName ? "show" : "show-forced");
    });
    const interval = setInterval(() => {
      if (!ripple2.classList.contains("dismiss") && !ripple2.classList.contains("show-forced")) {
        return;
      }
      const animations = ripple2.getAnimations();
      if (animations.length) {
        return;
      }
      clearInterval(interval);
      ripple2.remove();
    }, 1e3);
    if (!releaseEventName) {
      return null;
    }
    return this.createDismissEvent(ripple2, releaseEventName);
  }
  createDismissEvent(ripple2, releaseEventName) {
    const dismiss = () => {
      ripple2.classList.add("dismiss");
      this.isTouching = false;
      this.removeEventListener("dragover", dismiss);
      this.removeEventListener("mouseleave", dismiss);
      window.removeEventListener(releaseEventName, dismiss);
    };
    this.addEventListener("dragover", dismiss);
    this.addEventListener("mouseleave", dismiss);
    window.addEventListener(releaseEventName, dismiss);
    return dismiss;
  }
  static _setElementSquareSizeAndCenter(element, size) {
    element.style.top = "50%";
    element.style.left = "50%";
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.marginLeft = `${-size / 2}px`;
    element.style.marginTop = `${-size / 2}px`;
  }
};
__decorate([
  n4({ type: Boolean, reflect: true })
], Ripple.prototype, "disabled", void 0);
__decorate([
  e5(".ripple-container")
], Ripple.prototype, "rippleContainer", void 0);
Ripple = Ripple_1 = __decorate([
  t3("u-ripple")
], Ripple);

// src/chrome-commands.ts
var ZOOMS = [50, 75, 90, 100, 125, 150, 200];
function registerWriteCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const call = (m2, ...args) => api[m2].apply(ed, args);
  const canEdit2 = () => !app.comparing && !ed.isProtected();
  const notComparing = () => !app.comparing;
  const run = () => ctl.state().run;
  const para = () => ctl.state().para;
  const L3 = app.ui.L;
  const edit = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => canEdit2() && c4.isEnabled() : canEdit2 });
  const cmds = [
    // ── Arquivo ──
    { id: "new", label: { en: "New", pt: "Novo" }, tip: { en: "New document", pt: "Novo documento" }, icon: "note_add", run: () => app.newDocument(), isEnabled: notComparing },
    { id: "open", label: { en: "Open\u2026", pt: "Abrir\u2026" }, icon: "folder_open", shortcut: "Ctrl+O", run: () => app.open(), isEnabled: notComparing },
    { id: "save", label: { en: "Save", pt: "Salvar" }, icon: "save", shortcut: "Ctrl+S", run: () => app.save(false), isEnabled: notComparing },
    { id: "saveAs", label: { en: "Save as\u2026", pt: "Salvar como\u2026" }, icon: "save_as", shortcut: "Ctrl+Shift+S", run: () => app.save(true), isEnabled: notComparing },
    { id: "fontsInFile", label: { en: "Fonts in the file\u2026", pt: "Fontes no arquivo\u2026" }, icon: "font_download", run: () => app.fontEmbedding() },
    { id: "export:pdf", label: { en: "PDF document (.pdf)", pt: "Documento PDF (.pdf)" }, icon: "picture_as_pdf", run: () => app.export("pdf") },
    { id: "export:odt", label: { en: "OpenDocument (.odt)", pt: "OpenDocument (.odt)" }, icon: "description", run: () => app.export("odt") },
    { id: "export:html", label: { en: "Web page (.html)", pt: "P\xE1gina da Web (.html)" }, icon: "html", run: () => app.export("html") },
    { id: "export:md", label: { en: "Markdown (.md)", pt: "Markdown (.md)" }, icon: "markdown", run: () => app.export("md") },
    { id: "export:xps", label: { en: "XPS document (.xps)", pt: "Documento XPS (.xps)" }, icon: "draft", run: () => app.export("xps") },
    { id: "print", label: { en: "Print", pt: "Imprimir" }, icon: "print", shortcut: "Ctrl+P", run: () => ed.print(), isEnabled: notComparing },
    { id: "compare", label: { en: "Compare with\u2026", pt: "Comparar com\u2026" }, tip: { en: "Compare the current document with another .docx", pt: "Compara o documento atual com outro .docx" }, icon: "compare", run: () => ctl.compare(), isEnabled: notComparing },
    // ── Editar ──
    edit({ id: "undo", label: { en: "Undo", pt: "Desfazer" }, icon: "undo", shortcut: "Ctrl+Z", run: () => ed.undo() }),
    edit({ id: "redo", label: { en: "Redo", pt: "Refazer" }, icon: "redo", shortcut: "Ctrl+Y", run: () => ed.redo() }),
    edit({ id: "cut", label: { en: "Cut", pt: "Recortar" }, icon: "content_cut", shortcut: "Ctrl+X", run: () => ed.cut(), isEnabled: () => ed.selectedText().length > 0 }),
    { id: "copy", label: { en: "Copy", pt: "Copiar" }, icon: "content_copy", shortcut: "Ctrl+C", run: () => ed.copy(), isEnabled: () => notComparing() && ed.selectedText().length > 0 },
    edit({ id: "paste", label: { en: "Paste", pt: "Colar" }, icon: "content_paste", shortcut: "Ctrl+V", run: () => ed.paste() }),
    edit({ id: "pastePlain", label: { en: "Paste without formatting", pt: "Colar sem formata\xE7\xE3o" }, icon: "content_paste_go", shortcut: "Ctrl+Shift+V", run: () => ed.pastePlain() }),
    { id: "selectAll", label: { en: "Select all", pt: "Selecionar tudo" }, icon: "select_all", shortcut: "Ctrl+A", run: () => ed.selectAll(), isEnabled: notComparing },
    { id: "find", label: { en: "Find", pt: "Localizar" }, icon: "search", shortcut: "Ctrl+F", run: () => ctl.find(false), isEnabled: notComparing },
    { id: "replace", label: { en: "Replace", pt: "Substituir" }, icon: "find_replace", shortcut: "Ctrl+H", run: () => ctl.find(true), isEnabled: canEdit2 },
    edit({ id: "painter", label: { en: "Format Painter", pt: "Pincel de Formata\xE7\xE3o" }, icon: "format_paint", run: () => ed.copyFormat(), isChecked: () => ed.painterActive() }),
    // ── Exibir ──
    ...["print", "web", "read"].map((v2) => ({
      id: `view:${v2}`,
      label: { print: { en: "Print Layout", pt: "Layout de Impress\xE3o" }, web: { en: "Web Layout", pt: "Layout da Web" }, read: { en: "Read Mode", pt: "Modo de Leitura" } }[v2],
      icon: { print: "article", web: "language", read: "menu_book" }[v2],
      run: () => ed.setView(v2),
      isChecked: () => ed.getView() === v2,
      isEnabled: notComparing
    })),
    { id: "focus", label: { en: "Focus", pt: "Foco" }, tip: { en: "Focus mode \u2014 full screen (Esc to exit)", pt: "Modo foco \u2014 tela inteira (Esc para sair)" }, icon: "center_focus_strong", run: () => ctl.focusMode(), isChecked: () => ctl.inFocusMode() },
    { id: "marks", label: { en: "Formatting marks", pt: "Mostrar tudo" }, tip: { en: "Show paragraph marks and other formatting symbols", pt: "Mostrar marcas de par\xE1grafo e outros s\xEDmbolos de formata\xE7\xE3o" }, icon: "format_paragraph", shortcut: "Ctrl+Shift+8", run: () => ed.toggleMarks(), isChecked: () => ctl.state().marks },
    { id: "comments", label: { en: "Show comments", pt: "Mostrar coment\xE1rios" }, icon: "comment", run: () => ctl.toggleComments(), isChecked: () => app.commentsVisible, supports: () => true },
    { id: "zoomin", label: { en: "Zoom in", pt: "Ampliar" }, icon: "zoom_in", run: () => ed.setZoom(Math.min(5, Math.round(ed.getZoom() * 110) / 100)) },
    { id: "zoomout", label: { en: "Zoom out", pt: "Reduzir" }, icon: "zoom_out", run: () => ed.setZoom(Math.max(0.1, Math.round(ed.getZoom() / 1.1 * 100) / 100)) },
    { id: "zoom100", label: { en: "100%", pt: "100%" }, tip: { en: "Zoom to 100%", pt: "Zoom em 100%" }, icon: "search", run: () => ed.setZoom(1) },
    { id: "toolbar:ribbon", label: { en: "Ribbon (Word style)", pt: "Faixa de op\xE7\xF5es (estilo Word)" }, icon: "view_compact_alt", run: () => ctl.setToolbarMode("ribbon"), isChecked: () => ctl.toolbarMode() === "ribbon" },
    { id: "toolbar:compact", label: { en: "Compact toolbar (Docs style)", pt: "Barra compacta (estilo Docs)" }, icon: "toolbar", run: () => ctl.setToolbarMode("compact"), isChecked: () => ctl.toolbarMode() === "compact" },
    { id: "statusbar", label: { en: "Status bar", pt: "Barra de status" }, icon: "call_to_action", run: () => {
      ed.bottombar = !ed.bottombar;
    }, isChecked: () => ed.bottombar },
    // ── Inserir ──
    edit({ id: "image", label: { en: "Image\u2026", pt: "Imagem\u2026" }, tip: { en: "Insert image", pt: "Inserir imagem" }, icon: "image", run: () => ctl.image() }),
    edit({ id: "link", label: { en: "Link\u2026", pt: "Link\u2026" }, tip: { en: "Insert link", pt: "Inserir link" }, icon: "link", shortcut: "Ctrl+K", run: () => ctl.link(), isChecked: () => !!run().link }),
    edit({ id: "comment", label: { en: "Comment", pt: "Coment\xE1rio" }, tip: { en: "New comment", pt: "Novo coment\xE1rio" }, icon: "add_comment", shortcut: "Ctrl+Alt+M", run: () => ctl.comment() }),
    edit({ id: "pagebreak", label: { en: "Page break", pt: "Quebra de p\xE1gina" }, icon: "insert_page_break", shortcut: "Ctrl+Enter", run: () => ed.insertPageBreak() }),
    edit({ id: "field:page", label: { en: "Page number", pt: "N\xFAmero da p\xE1gina" }, icon: "numbers", run: () => ed.insertField("PAGE") }),
    edit({ id: "field:numpages", label: { en: "Page count", pt: "N\xFAmero de p\xE1ginas" }, icon: "filter_none", run: () => ed.insertField("NUMPAGES") }),
    edit({ id: "field:date", label: { en: "Date", pt: "Data" }, tip: { en: "Insert date field", pt: "Inserir campo de data" }, icon: "calendar_today", run: () => ed.insertField("DATE") }),
    edit({ id: "header", label: { en: "Header", pt: "Cabe\xE7alho" }, icon: "vertical_align_top", run: () => ed.enterHeaderFooter("header") }),
    edit({ id: "footer", label: { en: "Footer", pt: "Rodap\xE9" }, icon: "vertical_align_bottom", run: () => ed.enterHeaderFooter("footer") }),
    { id: "hf:close", label: { en: "Close Header and Footer", pt: "Fechar Cabe\xE7alho e Rodap\xE9" }, icon: "close", run: () => ed.exitHeaderFooter() },
    edit({ id: "toc", label: { en: "Update table of contents", pt: "Atualizar sum\xE1rio" }, icon: "toc", run: () => ctl.flash(ed.updateToc() ? L3.tocUpdated : L3.noToc) }),
    // frentes futuras: aparecem quando o método existir
    edit({ id: "table", label: { en: "Table", pt: "Tabela" }, tip: { en: "Insert table", pt: "Inserir tabela" }, icon: "table", supports: has("insertTable"), run: () => call("insertTable", 3, 3) }),
    edit({ id: "footnote", label: { en: "Footnote", pt: "Nota de rodap\xE9" }, tip: { en: "Insert footnote", pt: "Inserir nota de rodap\xE9" }, icon: "notes", shortcut: "Ctrl+Alt+F", supports: has("insertFootnote"), run: () => call("insertFootnote") }),
    edit({ id: "endnote", label: { en: "Endnote", pt: "Nota de fim" }, tip: { en: "Insert endnote", pt: "Inserir nota de fim" }, icon: "short_text", shortcut: "Ctrl+Alt+D", supports: has("insertEndnote"), run: () => call("insertEndnote") }),
    edit({ id: "bookmark", label: { en: "Bookmark", pt: "Indicador" }, icon: "bookmark", supports: has("insertBookmark"), run: () => call("insertBookmark") }),
    edit({ id: "textbox", label: { en: "Text box", pt: "Caixa de texto" }, icon: "text_fields", supports: has("insertTextbox"), run: () => call("insertTextbox") }),
    edit({ id: "sectionbreak", label: { en: "Section break (next page)", pt: "Quebra de se\xE7\xE3o (pr\xF3xima p\xE1gina)" }, icon: "insert_page_break", supports: has("insertSectionBreak"), run: () => call("insertSectionBreak", "nextPage") }),
    edit({ id: "columnbreak", label: { en: "Column break", pt: "Quebra de coluna" }, icon: "view_column", supports: has("insertColumnBreak"), run: () => call("insertColumnBreak") }),
    // ── Formatar: fonte ──
    edit({ id: "bold", label: { en: "Bold", pt: "Negrito" }, icon: "format_bold", shortcut: "Ctrl+B", run: () => ed.toggleRunProp("bold"), isChecked: () => !!run().bold }),
    edit({ id: "italic", label: { en: "Italic", pt: "It\xE1lico" }, icon: "format_italic", shortcut: "Ctrl+I", run: () => ed.toggleRunProp("italic"), isChecked: () => !!run().italic }),
    edit({ id: "underline", label: { en: "Underline", pt: "Sublinhado" }, icon: "format_underlined", shortcut: "Ctrl+U", run: () => ed.toggleRunProp("underline"), isChecked: () => !!run().underline }),
    edit({ id: "strike", label: { en: "Strikethrough", pt: "Tachado" }, icon: "format_strikethrough", run: () => ed.toggleRunProp("strike"), isChecked: () => !!run().strike }),
    edit({ id: "sup", label: { en: "Superscript", pt: "Sobrescrito" }, icon: "superscript", shortcut: "Ctrl+Shift+=", run: () => ed.toggleVertAlign("superscript"), isChecked: () => run().vertAlign === "superscript" }),
    edit({ id: "sub", label: { en: "Subscript", pt: "Subscrito" }, icon: "subscript", shortcut: "Ctrl+=", run: () => ed.toggleVertAlign("subscript"), isChecked: () => run().vertAlign === "subscript" }),
    edit({ id: "allCaps", label: { en: "All caps", pt: "Todas em mai\xFAsculas" }, icon: "uppercase", run: () => ed.toggleRunProp("allCaps"), isChecked: () => !!run().allCaps }),
    edit({ id: "smallCaps", label: { en: "Small caps", pt: "Versalete" }, icon: "match_case", run: () => ed.toggleRunProp("smallCaps"), isChecked: () => !!run().smallCaps }),
    edit({ id: "case:upper", label: { en: "UPPERCASE", pt: "MAI\xDASCULAS" }, run: () => ed.changeCase("upper") }),
    edit({ id: "case:lower", label: { en: "lowercase", pt: "min\xFAsculas" }, run: () => ed.changeCase("lower") }),
    edit({ id: "grow", label: { en: "Increase font size", pt: "Aumentar Fonte" }, icon: "text_increase", shortcut: "Ctrl+]", run: () => ed.growFont(1) }),
    edit({ id: "shrink", label: { en: "Decrease font size", pt: "Diminuir Fonte" }, icon: "text_decrease", shortcut: "Ctrl+[", run: () => ed.growFont(-1) }),
    edit({ id: "color", label: { en: "Font color", pt: "Cor da Fonte" }, icon: "format_color_text", run: () => ed.setColor(app.lastColor), color: () => `#${app.lastColor}` }),
    edit({ id: "highlight", label: { en: "Text highlight color", pt: "Cor do Realce do Texto" }, icon: "format_ink_highlighter", run: () => ed.setHighlight(app.lastHighlight), color: () => HL_CSS[app.lastHighlight] }),
    edit({ id: "clear", label: { en: "Clear formatting", pt: "Limpar Toda a Formata\xE7\xE3o" }, icon: "format_clear", shortcut: "Ctrl+Space", run: () => ed.clearFormatting() }),
    edit({ id: "dlg:font", label: { en: "Font\u2026", pt: "Fonte\u2026" }, tip: { en: "Font settings", pt: "Configura\xE7\xF5es de fonte" }, icon: "text_format", shortcut: "Ctrl+D", run: () => ctl.fontDialog() }),
    // ── Formatar: parágrafo ──
    ...[
      ["left", "Align left", "Alinhar \xE0 Esquerda", "Ctrl+L"],
      ["center", "Center", "Centralizar", "Ctrl+E"],
      ["right", "Align right", "Alinhar \xE0 Direita", "Ctrl+R"],
      ["both", "Justify", "Justificar", "Ctrl+J"]
    ].map(([a3, en, pt, sc]) => edit({
      id: `align:${a3}`,
      label: { en, pt },
      icon: a3 === "both" ? "format_align_justify" : `format_align_${a3}`,
      shortcut: sc,
      run: () => ed.setAlignment(a3),
      isChecked: () => (para().alignment ?? "left") === a3
    })),
    edit({ id: "list:bullet", label: { en: "Bullets", pt: "Marcadores" }, icon: "format_list_bulleted", run: () => ed.toggleList("bullet"), isChecked: () => para().numbering?.kind === "bullet" }),
    edit({ id: "list:decimal", label: { en: "Numbering", pt: "Numera\xE7\xE3o" }, icon: "format_list_numbered", run: () => ed.toggleList("decimal"), isChecked: () => para().numbering?.kind === "decimal" }),
    edit({ id: "outdent", label: { en: "Decrease indent", pt: "Diminuir Recuo" }, icon: "format_indent_decrease", run: () => ed.indent(-1) }),
    edit({ id: "indent", label: { en: "Increase indent", pt: "Aumentar Recuo" }, icon: "format_indent_increase", run: () => ed.indent(1) }),
    edit({ id: "shading", label: { en: "Shading", pt: "Sombreamento" }, icon: "format_color_fill", run: () => ed.setShading(app.lastShading), color: () => `#${app.lastShading}` }),
    edit({ id: "borders", label: { en: "Borders", pt: "Bordas" }, icon: "border_outer", run: () => ed.toggleBorder(), isChecked: () => !!para().boxBorder }),
    edit({ id: "dlg:paragraph", label: { en: "Paragraph\u2026", pt: "Par\xE1grafo\u2026" }, tip: { en: "Paragraph settings", pt: "Configura\xE7\xF5es de par\xE1grafo" }, icon: "format_textdirection_l_to_r", run: () => ctl.paragraphDialog() }),
    edit({ id: "dlg:page", label: { en: "Page setup\u2026", pt: "Configurar p\xE1gina\u2026" }, icon: "settings", run: () => ctl.pageDialog() }),
    edit({ id: "pageColor", label: { en: "Page Color", pt: "Cor da P\xE1gina" }, icon: "format_color_fill", supports: has("setPageColor"), run: () => call("setPageColor") }),
    edit({ id: "watermark", label: { en: "Watermark", pt: "Marca d\u2019\xC1gua" }, icon: "branding_watermark", supports: has("setWatermark"), run: () => call("setWatermark") }),
    edit({ id: "hyphenation", label: { en: "Hyphenation", pt: "Hifeniza\xE7\xE3o" }, icon: "horizontal_rule", supports: has("setHyphenation"), run: () => call("setHyphenation") }),
    // ── Revisão ──
    { id: "comment:prev", label: { en: "Previous", pt: "Anterior" }, tip: { en: "Previous comment", pt: "Coment\xE1rio anterior" }, icon: "navigate_before", run: () => stepComment(-1), isEnabled: () => ed.getComments().length > 0 },
    { id: "comment:next", label: { en: "Next", pt: "Pr\xF3ximo" }, tip: { en: "Next comment", pt: "Pr\xF3ximo coment\xE1rio" }, icon: "navigate_next", run: () => stepComment(1), isEnabled: () => ed.getComments().length > 0 },
    edit({ id: "comment:delete", label: { en: "Delete", pt: "Excluir" }, tip: { en: "Delete comment", pt: "Excluir coment\xE1rio" }, icon: "delete", run: () => {
      for (const id of app.activeCommentIds) ed.removeComment(id);
      app.activeCommentIds = [];
    }, isEnabled: () => app.activeCommentIds.length > 0 }),
    edit({ id: "comment:deleteAll", label: { en: "Delete all comments", pt: "Excluir todos os coment\xE1rios" }, icon: "delete_sweep", run: () => {
      for (const c4 of ed.getComments()) ed.removeComment(c4.id);
    }, isEnabled: () => ed.getComments().length > 0 }),
    { id: "enableEditing", label: { en: "Enable Editing", pt: "Habilitar Edi\xE7\xE3o" }, icon: "edit_document", run: () => app.enableEditing(), isEnabled: () => ed.isProtected(), supports: () => true },
    { id: "wordCount", label: { en: "Word count", pt: "Contar Palavras" }, icon: "numbers", shortcut: "Ctrl+Shift+G", run: () => ctl.wordCount() },
    { id: "spelling", label: { en: "Spelling & grammar", pt: "Ortografia e gram\xE1tica" }, icon: "spellcheck", shortcut: "F7", supports: has("nextMisspelling"), run: () => ctl.spelling(), isEnabled: canEdit2 },
    { id: "spellAsYouType", label: { en: "Check spelling as you type", pt: "Verificar ortografia ao digitar" }, icon: "spellcheck", supports: has("toggleSpellCheck"), run: () => call("toggleSpellCheck"), isChecked: () => typeof api["spellCheckEnabled"] === "function" && !!call("spellCheckEnabled") },
    edit({ id: "trackChanges", label: { en: "Track changes", pt: "Controlar altera\xE7\xF5es" }, icon: "track_changes", shortcut: "Ctrl+Shift+E", supports: has("toggleTrackChanges"), run: () => call("toggleTrackChanges"), isChecked: () => typeof api["isTrackingChanges"] === "function" && !!call("isTrackingChanges") }),
    edit({ id: "change:accept", label: { en: "Accept", pt: "Aceitar" }, icon: "check_circle", supports: has("acceptChange"), run: () => call("acceptChange") }),
    edit({ id: "change:reject", label: { en: "Reject", pt: "Rejeitar" }, icon: "cancel", supports: has("rejectChange"), run: () => call("rejectChange") }),
    edit({ id: "change:acceptAll", label: { en: "Accept all changes", pt: "Aceitar todas as altera\xE7\xF5es" }, icon: "done_all", supports: has("acceptAllChanges"), run: () => call("acceptAllChanges") }),
    edit({ id: "change:rejectAll", label: { en: "Reject all changes", pt: "Rejeitar todas as altera\xE7\xF5es" }, icon: "remove_done", supports: has("rejectAllChanges"), run: () => call("rejectAllChanges") }),
    edit({ id: "mailmerge", label: { en: "Start Mail Merge", pt: "Iniciar Mala Direta" }, icon: "mail", supports: has("startMailMerge"), run: () => call("startMailMerge") }),
    edit({ id: "mergefield", label: { en: "Insert Merge Field", pt: "Inserir Campo de Mesclagem" }, icon: "data_object", supports: has("insertMergeField"), run: () => call("insertMergeField") }),
    // tabela (guia contextual)
    ...[
      ["row:above", "Insert above", "Inserir acima", "insertRowAbove", "add_row_above"],
      ["row:below", "Insert below", "Inserir abaixo", "insertRowBelow", "add_row_below"],
      ["col:left", "Insert left", "Inserir \xE0 esquerda", "insertColumnLeft", "add_column_left"],
      ["col:right", "Insert right", "Inserir \xE0 direita", "insertColumnRight", "add_column_right"],
      ["row:delete", "Delete row", "Excluir linha", "deleteRow", "delete"],
      ["col:delete", "Delete column", "Excluir coluna", "deleteColumn", "delete"],
      ["table:delete", "Delete table", "Excluir tabela", "deleteTable", "delete_forever"],
      ["cells:merge", "Merge cells", "Mesclar c\xE9lulas", "mergeCells", "cell_merge"],
      ["cells:split", "Split cells", "Dividir c\xE9lulas", "splitCell", "splitscreen_vertical_add"]
    ].map(([id, en, pt, m2, icon]) => edit({ id, label: { en, pt }, icon, supports: has(m2), run: () => call(m2) })),
    edit({ id: "image:delete", label: { en: "Delete image", pt: "Excluir imagem" }, icon: "delete", supports: has("deleteSelectedImage"), run: () => call("deleteSelectedImage") }),
    // ── Ferramentas / Ajuda ──
    { id: "fontAccess", label: { en: "Use installed fonts\u2026", pt: "Usar as fontes instaladas\u2026" }, icon: "font_download", run: () => ctl.requestFonts(), supports: () => !ed.hasHostSystemFonts() && typeof window.queryLocalFonts === "function" },
    { id: "shortcuts", label: { en: "Keyboard shortcuts", pt: "Atalhos de teclado" }, icon: "keyboard", shortcut: "Ctrl+/", run: () => ctl.shortcuts() },
    { id: "about", label: { en: "About Universal Write", pt: "Sobre o Universal Write" }, icon: "info", run: () => ctl.about() }
  ];
  reg.add(...cmds);
  function stepComment(dir) {
    const cs = ed.getComments();
    if (!cs.length) return;
    const cur = cs.findIndex((c4) => app.activeCommentIds.includes(c4.id));
    const next = cs[cur < 0 ? dir > 0 ? 0 : cs.length - 1 : (cur + dir + cs.length) % cs.length];
    app.activeCommentIds = [next.id];
    ed.goToComment(next.id);
  }
}
var HL_CSS = Object.fromEntries(HIGHLIGHT_COLORS.map((h3) => [h3.value, h3.css]));

// src/chrome-dialogs.ts
var el = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var select = (name, opts, value) => {
  const s4 = el("select", { name });
  for (const [v2, t5] of opts) s4.append(el("option", { value: v2, textContent: t5 }));
  s4.value = value;
  return s4;
};
var check = (name, label, on) => {
  const i5 = el("input", { type: "checkbox", name, checked: on });
  return el("label", { className: "uo-check" }, i5, label);
};
var tr = (lang, en, pt) => pickLabels(lang, { en, pt });
async function linkDialog(env) {
  const L3 = env.app.ui.L;
  const cur = env.state().run.link ?? "";
  const url = await promptDialog({ title: L3.linkTitle, label: L3.linkUrl, value: cur || "https://", ok: L3.linkApply, layer: env.layer, lang: env.lang });
  if (url === null) return;
  const v2 = url.trim();
  env.ed.setLink(v2 && v2 !== "https://" ? v2 : void 0);
}
async function commentDialog(env) {
  const L3 = env.app.ui.L;
  if (!env.ed.selectedText()) {
    env.app.ui.flash(L3.selectToComment);
    return;
  }
  const text = await promptDialog({ title: L3.commentTitle, label: L3.commentText, multiline: true, ok: L3.commentAdd, layer: env.layer, lang: env.lang });
  if (!text?.trim()) return;
  env.app.ui.flash(env.ed.addComment(text.trim()) === null ? L3.selectToComment : L3.commentAdded);
}
async function fontDialog(env, families) {
  const L3 = env.app.ui.L, lang = env.lang;
  const r5 = env.state().run;
  const cur = r5.fontAscii ?? "";
  const fams = cur && !families.includes(cur) ? [cur, ...families] : families;
  const font = select("font", fams.map((f3) => [f3, f3]), cur);
  const size = el("input", { type: "number", name: "size", min: "1", max: "1638", step: "0.5", value: String((r5.szHalfPt ?? 22) / 2) });
  const color = el("input", { type: "color", name: "color", value: `#${r5.color && /^[0-9a-f]{6}$/i.test(r5.color) ? r5.color : "000000"}` });
  color.style.cssText = "width:48px;height:32px;padding:2px;border-radius:8px";
  const spacing = select("spacing", [
    ["0", "Normal"],
    ["20", tr(lang, "Expanded 1 pt", "Expandido 1 pt")],
    ["40", tr(lang, "Expanded 2 pt", "Expandido 2 pt")],
    ["-10", tr(lang, "Condensed 0.5 pt", "Condensado 0,5 pt")],
    ["-20", tr(lang, "Condensed 1 pt", "Condensado 1 pt")]
  ], String(r5.charSpacingTwips ?? 0));
  const flags = {
    bold: [tr(lang, "Bold", "Negrito"), !!r5.bold],
    italic: [tr(lang, "Italic", "It\xE1lico"), !!r5.italic],
    underline: [tr(lang, "Underline", "Sublinhado"), !!r5.underline],
    strike: [tr(lang, "Strikethrough", "Tachado"), !!r5.strike],
    sup: [tr(lang, "Superscript", "Sobrescrito"), r5.vertAlign === "superscript"],
    sub: [tr(lang, "Subscript", "Subscrito"), r5.vertAlign === "subscript"],
    allCaps: [tr(lang, "All caps", "Todas em mai\xFAsculas"), !!r5.allCaps],
    smallCaps: [tr(lang, "Small caps", "Versalete"), !!r5.smallCaps]
  };
  const grid = el(
    "div",
    { className: "uo-dialog-grid" },
    el("span", {}, L3.fontDlg),
    font,
    el("span", {}, L3.size),
    size,
    el("span", {}, L3.color),
    color,
    el("span", {}, L3.charSpacing),
    spacing
  );
  const fx = el("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px 16px" });
  for (const [k2, [label, on]] of Object.entries(flags)) fx.append(check(k2, label, on));
  const body = el("div", { style: "display:flex;flex-direction:column;gap:14px" }, grid, el("strong", {}, L3.effects), fx);
  const h3 = openDialog({
    title: L3.fontDlg,
    body,
    layer: env.layer,
    lang,
    width: 440,
    actions: [{ id: "cancel", label: L3.cancel }, { id: "ok", label: L3.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  const ed = env.ed;
  const box = (k2) => fx.querySelector(`input[name="${k2}"]`).checked;
  if (font.value && font.value !== cur) ed.setFontFamily(font.value);
  const sz = parseFloat(size.value);
  if (sz > 0 && sz * 2 !== r5.szHalfPt) ed.setFontSize(sz);
  const hex = color.value.slice(1).toUpperCase();
  if (hex !== (r5.color ?? "000000").toUpperCase()) ed.setColor(hex);
  for (const k2 of ["bold", "italic", "underline", "strike", "allCaps", "smallCaps"]) {
    if (box(k2) !== flags[k2][1]) ed.toggleRunProp(k2);
  }
  if (box("sup") !== flags.sup[1]) ed.toggleVertAlign("superscript");
  else if (box("sub") !== flags.sub[1]) ed.toggleVertAlign("subscript");
  const cs = Number(spacing.value);
  if (cs !== (r5.charSpacingTwips ?? 0)) ed.setCharSpacing(cs || void 0);
}
async function paragraphDialog(env) {
  const L3 = env.app.ui.L, lang = env.lang;
  const p3 = env.state().para;
  const first = p3.indentFirstLineTwips;
  const align = select("align", [
    ["left", tr(lang, "Left", "Esquerda")],
    ["center", tr(lang, "Centered", "Centralizada")],
    ["right", tr(lang, "Right", "Direita")],
    ["both", tr(lang, "Justified", "Justificada")]
  ], p3.alignment ?? "left");
  const special = select("special", [
    ["none", tr(lang, "(none)", "(nenhum)")],
    ["firstLine", tr(lang, "First line", "Primeira linha")],
    ["hanging", tr(lang, "Hanging", "Deslocamento")]
  ], !first ? "none" : first > 0 ? "firstLine" : "hanging");
  const pt = (tw) => String(Math.round((tw ?? 0) / 2) / 10);
  const before = el("input", { type: "number", name: "before", min: "0", step: "6", value: pt(p3.spaceBeforeTwips) });
  const after = el("input", { type: "number", name: "after", min: "0", step: "6", value: pt(p3.spaceAfterTwips) });
  const dec = tr(lang, ".", ",");
  const line = select(
    "line",
    [["240", `1${dec}0`], ["259", `1${dec}08`], ["276", `1${dec}15`], ["360", `1${dec}5`], ["480", `2${dec}0`]],
    String(p3.lineTwentieths ?? 259)
  );
  const grid = el(
    "div",
    { className: "uo-dialog-grid" },
    el("span", {}, L3.alignment),
    align,
    el("span", {}, L3.specialIndent),
    special,
    el("span", {}, L3.before),
    before,
    el("span", {}, L3.after),
    after,
    el("span", {}, L3.lineSpacing),
    line
  );
  const h3 = openDialog({
    title: L3.paraDlg,
    body: grid,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: L3.cancel }, { id: "ok", label: L3.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  const ed = env.ed;
  ed.setAlignment(align.value);
  ed.setSpecialIndent(special.value);
  ed.setSpaceBefore(Math.round(Number(before.value) * 20));
  ed.setSpaceAfter(Math.round(Number(after.value) * 20));
  ed.setLineSpacing(Number(line.value));
}
async function pageDialog(env) {
  const L3 = env.app.ui.L, lang = env.lang;
  const orient = select("orientation", [["portrait", tr(lang, "Portrait", "Retrato")], ["landscape", tr(lang, "Landscape", "Paisagem")]], "portrait");
  const size = select("size", [["A4", "A4"], ["Letter", tr(lang, "Letter", "Carta")]], "A4");
  const margins = select("margins", [["normal", "Normal"], ["narrow", tr(lang, "Narrow", "Estreita")], ["wide", tr(lang, "Wide", "Larga")]], "normal");
  try {
    const s4 = env.ed.sectPrAt(0);
    const w2 = s4.pageWidthTwips, hgt = s4.pageHeightTwips;
    orient.value = w2 > hgt ? "landscape" : "portrait";
    size.value = Math.abs(Math.min(w2, hgt) - 12240) < 60 ? "Letter" : "A4";
    const m2 = s4.marginLeftTwips;
    margins.value = m2 < 1e3 ? "narrow" : m2 > 2200 ? "wide" : "normal";
  } catch {
  }
  const grid = el(
    "div",
    { className: "uo-dialog-grid" },
    el("span", {}, L3.orientation),
    orient,
    el("span", {}, L3.paper),
    size,
    el("span", {}, L3.margins),
    margins
  );
  const h3 = openDialog({
    title: L3.pageDlg,
    body: grid,
    layer: env.layer,
    lang,
    width: 380,
    actions: [{ id: "cancel", label: L3.cancel }, { id: "ok", label: L3.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  env.ed.setPageSetup({
    orientation: orient.value,
    size: size.value,
    margins: margins.value
  });
}
function wordCountDialog(env) {
  const L3 = env.app.ui.L;
  const s4 = env.ed.stats();
  const fmt = (n5) => n5.toLocaleString(tr(env.lang, "en-US", "pt-BR"));
  const grid = el(
    "div",
    { className: "uo-dialog-grid" },
    el("span", {}, L3.pages),
    el("strong", {}, fmt(s4.pages)),
    el("span", {}, L3.words),
    el("strong", {}, fmt(s4.words)),
    el("span", {}, L3.chars),
    el("strong", {}, fmt(s4.chars))
  );
  openDialog({ title: L3.wordCountTitle, body: grid, layer: env.layer, lang: env.lang, width: 320 });
}
var SHORTCUTS = [
  ["Ctrl+O", "Open", "Abrir"],
  ["Ctrl+S", "Save", "Salvar"],
  ["Ctrl+Shift+S", "Save as", "Salvar como"],
  ["Ctrl+P", "Print", "Imprimir"],
  ["Ctrl+Z / Ctrl+Y", "Undo / Redo", "Desfazer / Refazer"],
  ["Ctrl+X / C / V", "Cut / Copy / Paste", "Recortar / Copiar / Colar"],
  ["Ctrl+Shift+V", "Paste without formatting", "Colar sem formata\xE7\xE3o"],
  ["Ctrl+F / Ctrl+H", "Find / Replace", "Localizar / Substituir"],
  ["Ctrl+B / I / U", "Bold / Italic / Underline", "Negrito / It\xE1lico / Sublinhado"],
  ["Ctrl+L / E / R / J", "Align left / center / right / justify", "Alinhar \xE0 esquerda / centralizar / \xE0 direita / justificar"],
  ["Ctrl+] / Ctrl+[", "Increase / decrease font size", "Aumentar / diminuir fonte"],
  ["Ctrl+K", "Insert link", "Inserir link"],
  ["Ctrl+Alt+M", "New comment", "Novo coment\xE1rio"],
  ["Ctrl+Enter", "Page break", "Quebra de p\xE1gina"],
  ["Ctrl+D", "Font dialog", "Di\xE1logo Fonte"],
  ["Ctrl+Shift+8", "Formatting marks", "Marcas de formata\xE7\xE3o"],
  ["Ctrl+scroll", "Zoom", "Zoom"]
];
function shortcutsDialog(env) {
  const grid = el("div", { className: "uo-dialog-grid" });
  grid.style.gridTemplateColumns = "auto 1fr";
  for (const [k2, en, pt] of SHORTCUTS) {
    grid.append(el("kbd", { style: "font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap" }, k2), el("span", {}, tr(env.lang, en, pt)));
  }
  openDialog({ title: env.app.ui.L.shortcutsTitle, body: grid, layer: env.layer, lang: env.lang, width: 520 });
}
function aboutDialog(env) {
  const L3 = env.app.ui.L;
  openDialog({ title: L3.aboutTitle, icon: "info", body: L3.aboutText, layer: env.layer, lang: env.lang, width: 400 });
}
async function spellingDialog(env) {
  const lang = env.lang, ed = env.ed;
  const done = tr(lang, "The spelling check is complete.", "A verifica\xE7\xE3o ortogr\xE1fica foi conclu\xEDda.");
  const skip = /* @__PURE__ */ new Set();
  const always = /* @__PURE__ */ new Map();
  let cur = await ed.nextMisspelling(skip);
  if (!cur) {
    env.app.ui.flash(done);
    return;
  }
  const word = el("div", { style: "font-size:18px;font-weight:600;color:#e81123;margin-bottom:2px" });
  const info = el("div", { style: "opacity:.7;font-size:12px;margin-bottom:10px" });
  const list = el("select", { size: 6, style: "width:100%;box-sizing:border-box;height:auto;min-height:132px;padding:4px" });
  const show = async (m2) => {
    word.textContent = m2.word;
    info.textContent = tr(lang, `Not in dictionary (${m2.lang})`, `N\xE3o consta no dicion\xE1rio (${m2.lang})`);
    const sug = await ed.spellingSuggestions(m2, 8);
    list.replaceChildren(...sug.length ? sug.map((x2) => el("option", { value: x2, textContent: x2 })) : [el("option", { value: "", disabled: true, textContent: tr(lang, "(no suggestions)", "(sem sugest\xF5es)") })]);
    list.selectedIndex = sug.length ? 0 : -1;
  };
  await show(cur);
  const body = el("div", {}, word, info, el("div", { style: "font-size:12px;margin-bottom:4px" }, tr(lang, "Suggestions", "Sugest\xF5es")), list);
  const next = async () => {
    cur = await ed.nextMisspelling(skip);
    while (cur && always.has(cur.word)) {
      if (!ed.replaceSpelling(cur, always.get(cur.word))) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      cur = await ed.nextMisspelling(skip);
    }
    if (!cur) {
      h3.close();
      env.app.ui.flash(done);
      return;
    }
    await show(cur);
  };
  let busy = false;
  const step = async (id) => {
    if (!cur || busy) return;
    busy = true;
    try {
      const choice = list.value;
      if (id === "ignore") skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      else if (id === "ignoreAll") ed.ignoreSpelling(cur.word);
      else if (id === "add") await ed.addToDictionary(cur.word);
      else if (id === "change" || id === "changeAll") {
        if (!choice) return;
        if (id === "changeAll") always.set(cur.word, choice);
        if (!ed.replaceSpelling(cur, choice)) skip.add(`${cur.para}:${cur.start}:${cur.word}`);
      }
      await next();
    } finally {
      busy = false;
    }
  };
  list.addEventListener("dblclick", () => {
    void step("change");
  });
  const h3 = openDialog({
    title: tr(lang, "Spelling", "Ortografia"),
    icon: "spellcheck",
    body,
    layer: env.layer,
    lang,
    width: 400,
    modal: false,
    actions: [
      { id: "ignore", label: { en: "Ignore Once", pt: "Ignorar uma vez" } },
      { id: "ignoreAll", label: { en: "Ignore All", pt: "Ignorar tudo" } },
      { id: "add", label: { en: "Add to Dictionary", pt: "Adicionar ao dicion\xE1rio" } },
      { id: "changeAll", label: { en: "Change All", pt: "Alterar todas" } },
      { id: "change", label: { en: "Change", pt: "Alterar" }, primary: true }
    ],
    onAction: (id) => {
      void step(id);
      return false;
    }
  });
  await h3.result;
}

// src/chrome-labels.ts
var LABELS = {
  en: {
    untitled: "Untitled document",
    docTitle: "Document title",
    decimal: ".",
    status: (page, pages, words) => `Page ${page} of ${pages} \xB7 ${words} word${words === 1 ? "" : "s"}`,
    saved: (fmt) => `Saved \u2713 (${fmt})`,
    autosaved: "Autosaved \u2713",
    autosavePending: "Autosave pending \u2014 save once to choose the file",
    autosaveOff: "Autosave off",
    autosaveEvery: (n5) => `Autosave every ${n5} min`,
    invalidDoc: (n5) => `"${n5}" is not a valid document or is corrupted`,
    notDoc: (n5) => `"${n5}" doesn't look like a .docx or .odt`,
    dropHere: "Drop the .docx to open",
    exported: (k2) => `${k2} downloaded \u2713`,
    protectedTitle: "PROTECTED VIEW",
    protectedText: "Be careful \u2014 files from the Internet can contain viruses. Unless you need to edit, it\u2019s safer to stay in Protected View.",
    enableEditing: "Enable Editing",
    editingEnabled: "Editing enabled",
    editingEnabledSaved: "Editing enabled \u2014 saved \u2713",
    blocked: "Protected document \u2014 click \u201CEnable Editing\u201D to edit",
    fieldsTitle: "Security Warning",
    fieldsText: "This document contains fields that may refer to other content (table of contents, dates, page numbers). Do you want to update them?",
    updateFields: "Update Fields",
    notNow: "Not now",
    fieldsUpdated: "Fields updated \u2713",
    noFields: "No field to update",
    tocUpdated: "Table of contents updated \u2713",
    noToc: "The document has no table of contents",
    find: "Find",
    replaceWith: "Replace with",
    findNext: "Find next",
    replace: "Replace",
    replaceAll: "Replace all",
    findTitle: "Find and replace",
    replaced: (n5) => `${n5} replacement${n5 === 1 ? "" : "s"}`,
    notFound: "No matches",
    commentTitle: "New comment",
    commentText: "Comment",
    commentAdd: "Comment",
    selectToComment: "Select some text to comment on",
    comments: "Comments",
    deleteComment: "Delete comment",
    anonymous: "Anonymous",
    commentAdded: "Comment added \u2713",
    linkTitle: "Insert link",
    linkUrl: "Address (URL)",
    linkApply: "Apply",
    compareWith: "Compare with\u2026",
    compareCurrent: (n5) => `${n5} (current)`,
    stillLoading: "The editor is still loading \u2014 try again in a moment",
    readFailed: "Could not read the selected file",
    compareNeedsFs: "Comparison needs a browser with File System Access",
    compareStats: (s4) => `Comparison: +${s4.inserted} \u2212${s4.deleted} ~${s4.changed} \u270E${s4.formatOnly}`,
    notValidDocx: (n5) => `"${n5}" is not a valid .docx`,
    closeCompare: "Close comparison",
    wordCountTitle: "Word count",
    pages: "Pages",
    words: "Words",
    chars: "Characters (with spaces)",
    shortcutsTitle: "Keyboard shortcuts",
    aboutTitle: "About",
    aboutText: "Universal Write \u2014 a .docx editor web component with canvas rendering faithful to Microsoft Word.",
    fontDlg: "Font",
    paraDlg: "Paragraph",
    pageDlg: "Page Setup",
    size: "Size",
    effects: "Effects",
    color: "Color",
    alignment: "Alignment",
    specialIndent: "Special indent",
    before: "Spacing before (pt)",
    after: "Spacing after (pt)",
    lineSpacing: "Line spacing",
    orientation: "Orientation",
    paper: "Paper size",
    margins: "Margins",
    charSpacing: "Character spacing",
    apply: "OK",
    cancel: "Cancel",
    fontAccessDenied: "The browser did not allow access to the installed fonts",
    fontAccessOk: (n5) => `${n5} installed fonts available`,
    automatic: "Automatic",
    noColor: "No color",
    moreColors: "More colors\u2026",
    rows: (r5, c4) => `${c4} \xD7 ${r5} table`
  },
  pt: {
    untitled: "Documento sem t\xEDtulo",
    docTitle: "T\xEDtulo do documento",
    decimal: ",",
    status: (page, pages, words) => `P\xE1gina ${page} de ${pages} \xB7 ${words} palavra${words === 1 ? "" : "s"}`,
    saved: (fmt) => `Salvo \u2713 (${fmt})`,
    autosaved: "Salvamento autom\xE1tico \u2713",
    autosavePending: "Salvamento autom\xE1tico pendente \u2014 salve uma vez para escolher o arquivo",
    autosaveOff: "Salvamento autom\xE1tico desligado",
    autosaveEvery: (n5) => `Salvamento autom\xE1tico a cada ${n5} min`,
    invalidDoc: (n5) => `"${n5}" n\xE3o \xE9 um documento v\xE1lido ou est\xE1 corrompido`,
    notDoc: (n5) => `"${n5}" n\xE3o parece um .docx nem um .odt`,
    dropHere: "Solte o .docx para abrir",
    exported: (k2) => `${k2} baixado \u2713`,
    protectedTitle: "MODO DE EXIBI\xC7\xC3O PROTEGIDO",
    protectedText: "Cuidado \u2014 arquivos da Internet podem conter v\xEDrus. A menos que voc\xEA precise editar, \xE9 mais seguro permanecer no Modo de Exibi\xE7\xE3o Protegido.",
    enableEditing: "Habilitar Edi\xE7\xE3o",
    editingEnabled: "Edi\xE7\xE3o habilitada",
    editingEnabledSaved: "Edi\xE7\xE3o habilitada \u2014 salvo \u2713",
    blocked: "Documento protegido \u2014 clique em \u201CHabilitar Edi\xE7\xE3o\u201D para editar",
    fieldsTitle: "Aviso de Seguran\xE7a",
    fieldsText: "Este documento cont\xE9m campos que podem se referir a outro conte\xFAdo (sum\xE1rio, datas, n\xFAmeros de p\xE1gina). Deseja atualiz\xE1-los?",
    updateFields: "Atualizar Campos",
    notNow: "Agora n\xE3o",
    fieldsUpdated: "Campos atualizados \u2713",
    noFields: "Nenhum campo para atualizar",
    tocUpdated: "Sum\xE1rio atualizado \u2713",
    noToc: "O documento n\xE3o tem sum\xE1rio",
    find: "Localizar",
    replaceWith: "Substituir por",
    findNext: "Localizar pr\xF3xima",
    replace: "Substituir",
    replaceAll: "Substituir tudo",
    findTitle: "Localizar e substituir",
    replaced: (n5) => `${n5} substitui\xE7${n5 === 1 ? "\xE3o" : "\xF5es"}`,
    notFound: "Nenhuma ocorr\xEAncia",
    commentTitle: "Novo coment\xE1rio",
    commentText: "Coment\xE1rio",
    commentAdd: "Comentar",
    selectToComment: "Selecione um trecho para comentar",
    comments: "Coment\xE1rios",
    deleteComment: "Excluir coment\xE1rio",
    anonymous: "An\xF4nimo",
    commentAdded: "Coment\xE1rio inserido \u2713",
    linkTitle: "Inserir link",
    linkUrl: "Endere\xE7o (URL)",
    linkApply: "Aplicar",
    compareWith: "Comparar com\u2026",
    compareCurrent: (n5) => `${n5} (atual)`,
    stillLoading: "O editor ainda est\xE1 carregando \u2014 tente de novo em instantes",
    readFailed: "N\xE3o foi poss\xEDvel ler o arquivo escolhido",
    compareNeedsFs: "A compara\xE7\xE3o precisa de um navegador com File System Access",
    compareStats: (s4) => `Compara\xE7\xE3o: +${s4.inserted} \u2212${s4.deleted} ~${s4.changed} \u270E${s4.formatOnly}`,
    notValidDocx: (n5) => `"${n5}" n\xE3o \xE9 um .docx v\xE1lido`,
    closeCompare: "Fechar compara\xE7\xE3o",
    wordCountTitle: "Contar palavras",
    pages: "P\xE1ginas",
    words: "Palavras",
    chars: "Caracteres (com espa\xE7os)",
    shortcutsTitle: "Atalhos de teclado",
    aboutTitle: "Sobre",
    aboutText: "Universal Write \u2014 web component de edi\xE7\xE3o de .docx com renderiza\xE7\xE3o em canvas fiel ao Microsoft Word.",
    fontDlg: "Fonte",
    paraDlg: "Par\xE1grafo",
    pageDlg: "Configurar P\xE1gina",
    size: "Tamanho",
    effects: "Efeitos",
    color: "Cor",
    alignment: "Alinhamento",
    specialIndent: "Recuo especial",
    before: "Espa\xE7amento antes (pt)",
    after: "Espa\xE7amento depois (pt)",
    lineSpacing: "Espa\xE7amento entre linhas",
    orientation: "Orienta\xE7\xE3o",
    paper: "Tamanho do papel",
    margins: "Margens",
    charSpacing: "Espa\xE7amento entre caracteres",
    apply: "OK",
    cancel: "Cancelar",
    fontAccessDenied: "O navegador n\xE3o permitiu acesso \xE0s fontes instaladas",
    fontAccessOk: (n5) => `${n5} fontes instaladas dispon\xEDveis`,
    automatic: "Autom\xE1tico",
    noColor: "Sem cor",
    moreColors: "Mais cores\u2026",
    rows: (r5, c4) => `Tabela ${c4} \xD7 ${r5}`
  }
};

// src/chrome-widgets.ts
function btn(cls, id, title) {
  const b3 = document.createElement("button");
  b3.type = "button";
  b3.className = cls;
  b3.dataset["a"] = id;
  b3.title = title;
  b3.setAttribute("aria-label", title);
  b3.addEventListener("mousedown", (e6) => e6.preventDefault());
  ripple(b3);
  return b3;
}
var t4 = (ctx, l3) => ctx.registry.text(l3);
var canEdit = (env) => !env.app.comparing && !env.ed.isProtected();
var titleWidget = (env) => ({
  widget: (ctx) => {
    const input = document.createElement("input");
    input.dataset["a"] = "title";
    input.spellcheck = false;
    input.title = env.app.ui.L.docTitle;
    input.setAttribute("aria-label", input.title);
    input.addEventListener("change", () => {
      env.app.setTitle(input.value.trim());
      ctx.after();
    });
    input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        input.blur();
        ctx.after();
      }
    });
    return {
      el: input,
      sync: () => {
        const v2 = env.app.title || env.app.ui.L.untitled;
        if (document.activeElement !== input && env.root.activeElement !== input && input.value !== v2) input.value = v2;
      }
    };
  }
});
var saveWidget = (env) => ({
  widget: (ctx) => {
    const b3 = btn("uo-pill uo-pill-primary", "save", ctx.registry.tooltip("save"));
    b3.innerHTML = `${symbol("save")}<span></span>`;
    const span = b3.querySelector("span");
    b3.addEventListener("click", () => {
      void ctx.registry.run("save");
    });
    return {
      el: b3,
      sync: () => {
        span.textContent = `${ctx.registry.label("save")} .${env.app.format}`;
        b3.disabled = env.app.comparing;
      }
    };
  }
});
var styleWidget = (env, width = 120) => ({
  widget: (ctx) => {
    const b3 = btn("uo-btn uo-drop uo-combo", "style", t4(ctx, { en: "Paragraph style", pt: "Estilo de par\xE1grafo" }));
    b3.style.width = `${width}px`;
    b3.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    const text = b3.querySelector(".uo-drop-text");
    const styles2 = () => {
      const ds = env.ed.paragraphStyles();
      if (ds.length) return ds;
      return [
        { id: "Normal", name: "Normal" },
        { id: "Title", name: t4(ctx, { en: "Title", pt: "T\xEDtulo" }) },
        ...[1, 2, 3].map((n5) => ({ id: `Heading${n5}`, name: t4(ctx, { en: `Heading ${n5}`, pt: `T\xEDtulo ${n5}` }) }))
      ];
    };
    const cur = () => env.ctl.state().para.styleId || "Normal";
    b3.addEventListener("click", (e6) => {
      e6.stopPropagation();
      const c4 = cur();
      toggleMenu(b3, () => styles2().map((s4) => ({
        id: `style:${s4.id}`,
        label: s4.name,
        checked: s4.id === c4,
        onClick: () => {
          env.ed.applyStyle(s4.id === "Normal" ? void 0 : s4.id);
          ctx.after();
        }
      })), ctx);
    });
    return {
      el: b3,
      sync: () => {
        const c4 = cur();
        text.textContent = styles2().find((s4) => s4.id === c4)?.name ?? c4;
        b3.disabled = !canEdit(env);
      }
    };
  }
});
var fontWidget = (env, width = 130) => ({
  widget: (ctx) => {
    const b3 = btn("uo-btn uo-drop uo-combo", "font", t4(ctx, { en: "Font", pt: "Fonte" }));
    b3.style.width = `${width}px`;
    b3.innerHTML = `<span class="uo-drop-text"></span><span class="uo-chev">${symbol("arrow_drop_down")}</span>`;
    const text = b3.querySelector(".uo-drop-text");
    let families = env.ed.knownFontFamilies();
    let lastKnown = families.length;
    const refresh = () => {
      void env.ed.listAvailableFonts().then((f3) => {
        families = f3;
      });
    };
    refresh();
    b3.addEventListener("click", (e6) => {
      e6.stopPropagation();
      env.ctl.requestFonts();
      const cur = env.ctl.state().run.fontAscii ?? "";
      const list = cur && !families.includes(cur) ? [cur, ...families] : families;
      toggleMenu(b3, () => list.map((f3) => ({
        id: `font:${f3}`,
        label: f3,
        checked: f3 === cur,
        onClick: () => {
          env.ed.setFontFamily(f3);
          ctx.after();
        }
      })), ctx);
    });
    return {
      el: b3,
      sync: () => {
        const known = env.ed.knownFontFamilies().length;
        if (known !== lastKnown) {
          lastKnown = known;
          refresh();
        }
        text.textContent = env.ctl.state().run.fontAscii ?? "";
        b3.disabled = !canEdit(env);
      }
    };
  }
});
var SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
var sizeWidget = (env, variant) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.className = "uo-g-inline";
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:1px";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.dataset["a"] = "size";
    input.inputMode = "decimal";
    input.maxLength = 5;
    input.title = t4(ctx, { en: "Font size", pt: "Tamanho da fonte" });
    input.setAttribute("aria-label", input.title);
    const apply = () => {
      const v2 = parseFloat(input.value.replace(",", "."));
      if (!isNaN(v2) && v2 > 0) env.ed.setFontSize(v2);
      ctx.after();
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        apply();
      }
    });
    input.addEventListener("focus", () => input.select());
    const dec = ctx.registry.text({ en: ".", pt: "," });
    const fmt = (n5) => String(n5).replace(".", dec);
    if (variant === "steppers") {
      const minus = btn("uo-btn", "shrink", ctx.registry.tooltip("shrink"));
      minus.innerHTML = symbol("remove");
      minus.addEventListener("click", () => {
        void ctx.registry.run("shrink");
      });
      const plus = btn("uo-btn", "grow", ctx.registry.tooltip("grow"));
      plus.innerHTML = symbol("add");
      plus.addEventListener("click", () => {
        void ctx.registry.run("grow");
      });
      wrap.append(minus, input, plus);
    } else {
      input.style.width = "44px";
      const drop = btn("uo-btn uo-split-arrow", "size:menu", input.title);
      drop.innerHTML = symbol("arrow_drop_down");
      drop.addEventListener("click", (e6) => {
        e6.stopPropagation();
        toggleMenu(drop, () => SIZES.map((s4) => ({
          label: fmt(s4),
          checked: input.value === fmt(s4),
          onClick: () => {
            env.ed.setFontSize(s4);
            ctx.after();
          }
        })), ctx);
      });
      wrap.append(input, drop);
    }
    return {
      el: wrap,
      sync: () => {
        const half = env.ctl.state().run.szHalfPt;
        if (half && env.root.activeElement !== input) input.value = fmt(half / 2);
        const ok = canEdit(env);
        for (const el2 of wrap.querySelectorAll("input,button")) el2.disabled = !ok;
      }
    };
  }
});
var zoomItem = (env) => ({
  menu: () => [
    ...ZOOMS.map((z2) => ({
      label: `${z2}%`,
      checked: Math.round(env.ed.getZoom() * 100) === z2,
      onClick: () => {
        env.ed.setZoom(z2 / 100);
        env.ed.focusEditor();
      }
    }))
  ],
  id: "zoom",
  label: { en: "Zoom", pt: "Zoom" },
  text: () => `${Math.round(env.ed.getZoom() * 100)}%`
});
var moreColors = (ctx, label, onPick) => ({
  icon: "palette",
  label,
  onClick: () => {
    const input = document.createElement("input");
    input.type = "color";
    input.style.cssText = "position:fixed;left:-100px;top:0;opacity:0";
    ctx.layer.appendChild(input);
    input.addEventListener("change", () => {
      onPick(input.value.slice(1).toUpperCase());
      input.remove();
      ctx.after();
    });
    input.addEventListener("blur", () => setTimeout(() => input.remove(), 1e3));
    input.click();
  }
});
var colorMenu = (env, ctx) => {
  const L3 = env.app.ui.L;
  const pick = (hex) => {
    env.app.lastColor = hex;
    env.ed.setColor(hex);
    ctx.after();
  };
  return [
    { id: "color:auto", label: L3.automatic, swatch: "#000000", onClick: () => {
      env.ed.setColor(void 0);
      ctx.after();
    } },
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })), selected: env.ctl.state().run.color, onPick: pick, close }) },
    moreColors(ctx, L3.moreColors, pick)
  ];
};
var highlightMenu = (env, ctx) => {
  const L3 = env.app.ui.L;
  return [
    { content: (close) => colorGrid({
      colors: HIGHLIGHT_COLORS.map((h3) => ({ value: h3.value, css: h3.css, title: ctx.registry.text(h3.label) })),
      columns: 5,
      selected: env.ctl.state().run.highlight,
      onPick: (v2) => {
        env.app.lastHighlight = v2;
        env.ed.setHighlight(v2);
        ctx.after();
      },
      close
    }) },
    { id: "highlight:none", label: L3.noColor, swatch: "", onClick: () => {
      env.ed.setHighlight(void 0);
      ctx.after();
    } }
  ];
};
var shadingMenu = (env, ctx) => {
  const L3 = env.app.ui.L;
  const pick = (hex) => {
    env.app.lastShading = hex;
    env.ed.setShading(hex);
    ctx.after();
  };
  return [
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })), selected: env.ctl.state().para.shadingHex, onPick: pick, close }) },
    { id: "shading:none", label: L3.noColor, swatch: "", onClick: () => {
      env.ed.setShading(void 0);
      ctx.after();
    } },
    moreColors(ctx, L3.moreColors, pick)
  ];
};
var lineSpacingMenu = (env, ctx) => {
  const p3 = env.ctl.state().para;
  const dec = ctx.registry.text({ en: ".", pt: "," });
  const line = p3.lineTwentieths;
  const sb = p3.spaceBeforeTwips, sa = p3.spaceAfterTwips;
  const ok = canEdit(env);
  return [
    ...[[240, "1.0"], [259, "1.08"], [276, "1.15"], [360, "1.5"], [480, "2.0"]].map(([v2, txt]) => ({
      id: `spacing:${v2}`,
      label: txt.replace(".", dec),
      checked: line === v2,
      disabled: !ok,
      onClick: () => {
        env.ed.setLineSpacing(v2);
        ctx.after();
      }
    })),
    "-",
    sb ? { id: "spaceBefore:remove", label: t4(ctx, { en: "Remove space before paragraph", pt: "Remover espa\xE7o antes do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceBefore(0);
      ctx.after();
    } } : { id: "spaceBefore:add", label: t4(ctx, { en: "Add space before paragraph", pt: "Adicionar espa\xE7o antes do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceBefore(240);
      ctx.after();
    } },
    sa ? { id: "spaceAfter:remove", label: t4(ctx, { en: "Remove space after paragraph", pt: "Remover espa\xE7o depois do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceAfter(0);
      ctx.after();
    } } : { id: "spaceAfter:add", label: t4(ctx, { en: "Add space after paragraph", pt: "Adicionar espa\xE7o depois do par\xE1grafo" }), disabled: !ok, onClick: () => {
      env.ed.setSpaceAfter(160);
      ctx.after();
    } },
    "-",
    "dlg:paragraph"
  ];
};
var paragraphSpacingMenu = (env, ctx) => {
  const ok = canEdit(env);
  const preset = (id, en, pt, before, after, line) => ({
    id: `pspacing:${id}`,
    label: { en, pt },
    disabled: !ok,
    onClick: () => {
      env.ed.setSpaceBefore(before);
      env.ed.setSpaceAfter(after);
      env.ed.setLineSpacing(line);
      ctx.after();
    }
  });
  return [
    preset("none", "No paragraph space", "Sem espa\xE7o entre par\xE1grafos", 0, 0, 240),
    preset("compact", "Compact", "Compacto", 0, 80, 240),
    preset("tight", "Tight", "Apertado", 0, 120, 259),
    preset("open", "Open", "Aberto", 0, 200, 276),
    preset("relaxed", "Relaxed", "Relaxado", 0, 120, 300),
    preset("double", "Double", "Duplo", 0, 160, 480)
  ];
};
var charSpacingMenu = (env, ctx) => {
  const cur = env.ctl.state().run.charSpacingTwips;
  const ok = canEdit(env);
  return [
    [void 0, "Normal", "Normal"],
    [20, "Expanded 1 pt", "Expandido 1 pt"],
    [40, "Expanded 2 pt", "Expandido 2 pt"],
    [-10, "Condensed 0.5 pt", "Condensado 0,5 pt"],
    [-20, "Condensed 1 pt", "Condensado 1 pt"]
  ].map(([v2, en, pt]) => ({
    id: `charSpacing:${v2 ?? 0}`,
    label: { en, pt },
    checked: (cur ?? void 0) === v2,
    disabled: !ok,
    onClick: () => {
      env.ed.setCharSpacing(v2);
      ctx.after();
    }
  }));
};
var specialIndentMenu = (env, ctx) => {
  const first = env.ctl.state().para.indentFirstLineTwips;
  const cur = !first ? "none" : first > 0 ? "firstLine" : "hanging";
  const ok = canEdit(env);
  return [["none", "None", "Nenhum"], ["firstLine", "First line", "Primeira linha"], ["hanging", "Hanging", "Deslocamento"]].map(([v2, en, pt]) => ({
    id: `specialIndent:${v2}`,
    label: { en, pt },
    checked: cur === v2,
    disabled: !ok,
    onClick: () => {
      env.ed.setSpecialIndent(v2);
      ctx.after();
    }
  }));
};
var pageItems = (env, ctx, key, opts) => opts.map(([v2, en, pt, icon]) => ({
  id: `${key}:${v2}`,
  label: { en, pt },
  icon,
  disabled: !canEdit(env),
  onClick: () => {
    env.ed.setPageSetup({ [key]: v2 });
    ctx.after();
  }
}));
var orientationMenu = (env, ctx) => pageItems(env, ctx, "orientation", [["portrait", "Portrait", "Retrato", "crop_portrait"], ["landscape", "Landscape", "Paisagem", "crop_landscape"]]);
var sizeMenu = (env, ctx) => pageItems(env, ctx, "size", [["A4", "A4 (21 \xD7 29.7 cm)", "A4 (21 \xD7 29,7 cm)"], ["Letter", "Letter (21.59 \xD7 27.94 cm)", "Carta (21,59 \xD7 27,94 cm)"]]);
var marginsMenu = (env, ctx) => [
  ...pageItems(env, ctx, "margins", [["normal", "Normal (2.5 cm)", "Normal (2,5 cm)"], ["narrow", "Narrow (1.27 cm)", "Estreita (1,27 cm)"], ["wide", "Wide (5.08 cm)", "Larga (5,08 cm)"]]),
  "-",
  "dlg:page"
];
var caseMenu = () => ["case:upper", "case:lower", "-", "allCaps", "smallCaps"];
var fieldsMenu = () => ["field:page", "field:numpages", "field:date"];
var SYMBOL_CHARS = "\xA9\xAE\u2122\xA7\xB6\u20AC\xA3\xA5\xA2\xB0\xB1\xD7\xF7\u2260\u2264\u2265\u2248\u221E\xB5\u2013\u2014\u2026\u201C\u201D\u2018\u2019\xAB\xBB\u2022\xB7\u2020\u2021\u2192\u2190\u2191\u2193\u2713\u2717\xBD\xBC\xBE\u03B1\u03B2\u03C0\u03A9\u03A3";
var symbolMenu = (env, ctx) => [{
  content: (close) => {
    const g2 = document.createElement("div");
    g2.className = "uo-colors";
    g2.style.gridTemplateColumns = "repeat(8, 28px)";
    for (const ch of SYMBOL_CHARS) {
      const b3 = document.createElement("button");
      b3.type = "button";
      b3.textContent = ch;
      b3.dataset["symbol"] = ch;
      b3.style.cssText = "width:28px;height:28px;border-radius:6px;background:transparent;font:inherit;font-size:16px;color:inherit;border:1px solid transparent";
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.disabled = !canEdit(env);
      b3.addEventListener("click", () => {
        close();
        env.ed.pasteText(ch);
        ctx.after();
      });
      g2.appendChild(b3);
    }
    return g2;
  }
}];
var tableMenu = (env, ctx) => [{
  content: (close) => {
    const box = document.createElement("div");
    const cap = document.createElement("div");
    cap.style.cssText = "font-size:12.5px;margin-bottom:6px";
    cap.textContent = env.app.ui.L.rows(1, 1);
    const g2 = document.createElement("div");
    g2.style.cssText = "display:grid;grid-template-columns:repeat(10,18px);gap:3px";
    const cells = [];
    for (let r5 = 1; r5 <= 8; r5++) for (let c4 = 1; c4 <= 10; c4++) {
      const cell = document.createElement("div");
      cell.style.cssText = "width:18px;height:18px;border:1px solid currentColor;opacity:.35;border-radius:2px;cursor:pointer";
      cell.addEventListener("mouseenter", () => {
        cap.textContent = env.app.ui.L.rows(r5, c4);
        cells.forEach((x2, i5) => {
          const rr = Math.floor(i5 / 10) + 1, cc = i5 % 10 + 1;
          x2.style.opacity = rr <= r5 && cc <= c4 ? "1" : ".35";
        });
      });
      cell.addEventListener("mousedown", (e6) => e6.preventDefault());
      cell.addEventListener("click", () => {
        close();
        env.ed.insertTable(r5, c4);
        ctx.after();
      });
      cells.push(cell);
      g2.appendChild(cell);
    }
    box.append(cap, g2);
    return box;
  }
}];
var themeMenu = (env, ctx) => [
  {
    id: "theme:page",
    label: { en: "Follow the page", pt: "Seguir a p\xE1gina" },
    icon: "web_asset",
    checked: env.app.mode === null,
    onClick: () => {
      setMode(env, null);
      ctx.after();
    }
  },
  "-",
  ...[
    ["auto", "Automatic", "Autom\xE1tico", "brightness_auto"],
    ["light", "Light", "Claro", "light_mode"],
    ["dark", "Dark", "Escuro", "dark_mode"],
    ["black", "Black (dark page)", "Escuro total (p\xE1gina escura)", "bedtime"]
  ].map(([m2, en, pt, icon]) => ({
    id: `theme:${m2}`,
    label: { en, pt },
    icon,
    checked: env.app.mode === m2,
    onClick: () => {
      setMode(env, m2);
      ctx.after();
    }
  }))
];
function setMode(env, m2) {
  env.app.chosenMode = m2;
  env.app.prefs.set("mode", m2 ?? "");
  if (m2 === null) env.ed.removeAttribute("theme");
  else if (env.ed.hasAttribute("theme")) env.ed.setAttribute("theme", m2);
  env.ctl.applyTheme();
}
var accentMenu = (env, ctx) => [{
  content: (close) => colorGrid({
    colors: ACCENTS.map((a3) => ({ value: a3.id, css: a3.id === "neutral" ? "linear-gradient(135deg,#111 0 50%,#fff 50% 100%)" : a3.seed, title: ctx.registry.text(a3.label) })),
    columns: 7,
    selected: env.app.accent,
    close,
    onPick: (id) => {
      env.app.chosenAccent = id;
      env.app.prefs.set("accent", id);
      if (env.ed.hasAttribute("accent")) env.ed.setAttribute("accent", id);
      if (env.app.mode === null) setMode(env, "auto");
      else env.ctl.applyTheme();
      ctx.after();
    }
  })
}];

// src/chrome-layout.ts
function menus(env, ctx) {
  const sub = (label, icon, items, id) => ({ id, label, icon, submenu: items });
  const autosave = () => [
    [0, "Off", "Desligado"],
    [1, "1 min", "1 min"],
    [5, "5 min", "5 min"],
    [10, "10 min (Word)", "10 min (Word)"],
    [30, "30 min", "30 min"]
  ].map(([n5, en, pt]) => ({
    id: `autosave:${n5}`,
    label: { en, pt },
    checked: env.app.autosaveMinutes === n5,
    onClick: () => {
      env.app.autosaveMinutes = n5;
    }
  }));
  const recents = () => env.app.recents.map((r5) => ({
    id: `recent:${r5.name}`,
    label: r5.name,
    icon: "description",
    onClick: () => {
      void env.app.openRecent(r5);
    }
  }));
  const zoom = () => ZOOMS.map((z2) => ({
    id: `zoom:${z2}`,
    label: `${z2}%`,
    checked: Math.round(env.ed.getZoom() * 100) === z2,
    onClick: () => {
      env.ed.setZoom(z2 / 100);
      ctx.after();
    }
  }));
  return {
    exportAs: sub({ en: "Download", pt: "Baixar" }, "download", () => ["export:pdf", "export:odt", "export:html", "export:md", "export:xps"], "export"),
    recent: sub({ en: "Open recent", pt: "Abrir recente" }, "history", recents, "recent"),
    autosave: sub({ en: "Autosave", pt: "Salvamento autom\xE1tico" }, "autorenew", autosave, "autosave"),
    zoomItems: () => [...zoom(), "-", "zoomin", "zoomout"],
    zoom: sub({ en: "Zoom", pt: "Zoom" }, "zoom_in", () => [...zoom(), "-", "zoomin", "zoomout"], "zoom"),
    theme: sub({ en: "Theme", pt: "Tema" }, "contrast", () => themeMenu(env, ctx), "theme"),
    accent: sub({ en: "Accent color", pt: "Cor de destaque" }, "palette", () => accentMenu(env, ctx), "accent"),
    toolbar: sub({ en: "Toolbar", pt: "Barra de ferramentas" }, "toolbar", () => ["toolbar:compact", "toolbar:ribbon", "-", "statusbar"], "toolbar"),
    fields: sub({ en: "Field", pt: "Campo" }, "data_object", fieldsMenu, "fields"),
    symbols: sub({ en: "Special characters", pt: "Caracteres especiais" }, "special_character", () => symbolMenu(env, ctx), "symbols"),
    breaks: sub({ en: "Break", pt: "Quebra" }, "insert_page_break", () => ["pagebreak", "columnbreak", "sectionbreak"], "breaks"),
    hf: sub({ en: "Headers & footers", pt: "Cabe\xE7alhos e rodap\xE9s" }, "call_to_action", () => ["header", "footer"], "hf"),
    text: sub({ en: "Text", pt: "Texto" }, "format_bold", () => ["bold", "italic", "underline", "strike", "sup", "sub", "-", "grow", "shrink", "-", "allCaps", "smallCaps", "case:upper", "case:lower"], "text"),
    color: sub({ en: "Font color", pt: "Cor da fonte" }, "format_color_text", () => colorMenu(env, ctx), "color"),
    highlight: sub({ en: "Highlight color", pt: "Cor do realce" }, "format_ink_highlighter", () => highlightMenu(env, ctx), "highlightMenu"),
    styles: sub({ en: "Paragraph styles", pt: "Estilos de par\xE1grafo" }, "style", () => {
      const cur = env.ctl.state().para.styleId || "Normal";
      const ds = env.ed.paragraphStyles();
      return (ds.length ? ds : [{ id: "Normal", name: "Normal" }]).map((s4) => ({
        id: `style:${s4.id}`,
        label: s4.name,
        checked: s4.id === cur,
        onClick: () => {
          env.ed.applyStyle(s4.id === "Normal" ? void 0 : s4.id);
          ctx.after();
        }
      }));
    }, "styles"),
    align: sub({ en: "Align & indent", pt: "Alinhar e recuar" }, "format_align_left", () => [
      "align:left",
      "align:center",
      "align:right",
      "align:both",
      "-",
      "indent",
      "outdent",
      "-",
      sub({ en: "Special indent", pt: "Recuo especial" }, void 0, () => specialIndentMenu(env, ctx), "specialIndent")
    ], "align"),
    spacing: sub({ en: "Line & paragraph spacing", pt: "Espa\xE7amento entre linhas e par\xE1grafos" }, "format_line_spacing", () => lineSpacingMenu(env, ctx), "spacing"),
    lists: sub({ en: "Bullets & numbering", pt: "Marcadores e numera\xE7\xE3o" }, "format_list_bulleted", () => ["list:bullet", "list:decimal"], "lists"),
    shading: sub({ en: "Paragraph shading", pt: "Sombreamento do par\xE1grafo" }, "format_color_fill", () => shadingMenu(env, ctx), "shadingMenu"),
    charSpacing: sub({ en: "Character spacing", pt: "Espa\xE7amento entre caracteres" }, "format_letter_spacing", () => charSpacingMenu(env, ctx), "charSpacing"),
    page: sub({ en: "Page setup", pt: "Configurar p\xE1gina" }, "description", () => [
      sub({ en: "Orientation", pt: "Orienta\xE7\xE3o" }, "crop_rotate", () => orientationMenu(env, ctx), "orientation"),
      sub({ en: "Size", pt: "Tamanho" }, "aspect_ratio", () => sizeMenu(env, ctx), "pageSize"),
      sub({ en: "Margins", pt: "Margens" }, "margin", () => marginsMenu(env, ctx), "margins")
    ], "page"),
    trackChanges: sub({ en: "Track changes", pt: "Controlar altera\xE7\xF5es" }, "track_changes", () => ["trackChanges", "-", "change:accept", "change:reject", "change:acceptAll", "change:rejectAll"], "tracking"),
    comments: sub({ en: "Comments", pt: "Coment\xE1rios" }, "comment", () => ["comment", "comment:prev", "comment:next", "comment:delete", "comment:deleteAll", "-", "comments"], "commentsMenu")
  };
}
var fileMenu = (m2) => [
  "new",
  "open",
  m2.recent,
  "-",
  "save",
  "saveAs",
  m2.exportAs,
  "fontsInFile",
  "-",
  "compare",
  "-",
  "print",
  "-",
  m2.autosave
];
function compactLayout(env, ctx) {
  const m2 = menus(env, ctx);
  return {
    title: titleWidget(env),
    trailing: [saveWidget(env)],
    menus: [
      { id: "file", label: { en: "File", pt: "Arquivo" }, items: () => fileMenu(m2) },
      { id: "edit", label: { en: "Edit", pt: "Editar" }, items: ["undo", "redo", "-", "cut", "copy", "paste", "pastePlain", "-", "selectAll", "-", "find", "replace"] },
      { id: "view", label: { en: "View", pt: "Ver" }, items: () => ["view:print", "view:web", "view:read", "focus", "-", "marks", "comments", "-", m2.zoom, "-", m2.theme, m2.accent, m2.toolbar] },
      { id: "insert", label: { en: "Insert", pt: "Inserir" }, items: () => ["image", "table", "link", "comment", "-", m2.breaks, m2.hf, m2.fields, "toc", "-", "footnote", "endnote", "bookmark", "textbox", m2.symbols] },
      { id: "format", label: { en: "Format", pt: "Formatar" }, items: () => [m2.text, m2.color, m2.highlight, m2.styles, "-", m2.align, m2.spacing, m2.lists, m2.shading, "borders", m2.charSpacing, "-", m2.page, "-", "dlg:font", "dlg:paragraph", "-", "clear"] },
      { id: "tools", label: { en: "Tools", pt: "Ferramentas" }, items: () => ["spelling", "spellAsYouType", "wordCount", "-", m2.trackChanges, m2.comments, "-", "compare", "mailmerge", "-", "fontAccess", "hyphenation", "-", "enableEditing"] },
      { id: "help", label: { en: "Help", pt: "Ajuda" }, items: ["shortcuts", "about"] }
    ],
    groups: [
      { id: "tools", label: { en: "Tools", pt: "Ferramentas" }, icon: "undo", prio: 4, items: ["undo", "redo", "print", "spelling", "painter", zoomItem(env)] },
      { id: "style", label: { en: "Style", pt: "Estilo" }, icon: "style", prio: 8, items: [styleWidget(env)] },
      { id: "font", label: { en: "Font", pt: "Fonte" }, icon: "font_download", prio: 8, items: [fontWidget(env)] },
      { id: "size", label: { en: "Font size", pt: "Tamanho da fonte" }, icon: "format_size", prio: 7, items: [sizeWidget(env, "steppers")] },
      { id: "format", label: { en: "Formatting", pt: "Formata\xE7\xE3o" }, icon: "format_bold", prio: 9, items: [
        "bold",
        "italic",
        "underline",
        { split: "color", menu: () => colorMenu(env, ctx) },
        { split: "highlight", menu: () => highlightMenu(env, ctx) }
      ] },
      { id: "insert", label: { en: "Insert", pt: "Inserir" }, icon: "link", prio: 5, items: ["link", "comment", "image", { menu: () => tableMenu(env, ctx), id: "table:menu", label: { en: "Table", pt: "Tabela" }, icon: "table", supports: () => typeof env.ed.insertTable === "function" }] },
      { id: "para", label: { en: "Paragraph", pt: "Par\xE1grafo" }, icon: "format_align_left", prio: 6, items: [
        "align:left",
        "align:center",
        "align:right",
        "align:both",
        { menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: { en: "Line & paragraph spacing", pt: "Espa\xE7amento entre linhas e par\xE1grafos" }, icon: "format_line_spacing" },
        "list:bullet",
        "list:decimal",
        "outdent",
        "indent",
        "clear"
      ] },
      { id: "extras", label: { en: "More tools", pt: "Mais ferramentas" }, icon: "more_horiz", prio: 0, items: [
        "strike",
        "sub",
        "sup",
        { menu: caseMenu, id: "case", label: { en: "Change case", pt: "Mai\xFAsculas e min\xFAsculas" }, icon: "match_case" },
        { split: "shading", menu: () => shadingMenu(env, ctx) },
        "borders",
        "marks",
        { menu: () => charSpacingMenu(env, ctx), id: "charSpacing", label: { en: "Character spacing", pt: "Espa\xE7amento entre caracteres" }, icon: "format_letter_spacing" },
        { menu: () => specialIndentMenu(env, ctx), id: "specialIndent", label: { en: "Special indent", pt: "Recuo especial" }, icon: "format_indent_increase" },
        { menu: () => orientationMenu(env, ctx), id: "orientation", label: { en: "Orientation", pt: "Orienta\xE7\xE3o" }, icon: "crop_rotate" },
        { menu: () => sizeMenu(env, ctx), id: "pageSize", label: { en: "Paper size", pt: "Tamanho do papel" }, icon: "aspect_ratio" },
        { menu: () => marginsMenu(env, ctx), id: "margins", label: { en: "Margins", pt: "Margens" }, icon: "margin" },
        "find"
      ] }
    ]
  };
}
var L2 = (en, pt) => ({ en, pt });
var large = (cmd) => ({ cmd, size: "large" });
function ribbonLayout(env, ctx) {
  const m2 = menus(env, ctx);
  const has = (meth) => () => typeof env.ed[meth] === "function";
  return {
    qat: ["save", "undo", "redo"],
    title: titleWidget(env),
    tabs: [
      { id: "file", label: L2("File", "Arquivo"), groups: [], menu: () => fileMenu(m2) },
      {
        id: "home",
        label: L2("Home", "P\xE1gina Inicial"),
        groups: [
          { id: "clipboard", label: L2("Clipboard", "\xC1rea de Transfer\xEAncia"), icon: "content_paste", prio: 3, cells: [
            { split: "paste", size: "large", menu: ["paste", "pastePlain"] },
            { rows: [["cut"], ["copy"], ["painter"]] }
          ] },
          { id: "font", label: L2("Font", "Fonte"), icon: "text_format", prio: 8, launcher: "dlg:font", cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, "dropdown"), "grow", "shrink", { menu: caseMenu, id: "case", label: L2("Change case", "Mai\xFAsculas e min\xFAsculas"), icon: "match_case" }, "clear"],
              ["bold", "italic", "underline", "strike", "sub", "sup", { split: "color", menu: () => colorMenu(env, ctx) }, { split: "highlight", menu: () => highlightMenu(env, ctx) }]
            ] }
          ] },
          { id: "paragraph", label: L2("Paragraph", "Par\xE1grafo"), icon: "format_align_left", prio: 7, launcher: "dlg:paragraph", cells: [
            { rows: [
              ["list:bullet", "list:decimal", "outdent", "indent", "marks"],
              [
                "align:left",
                "align:center",
                "align:right",
                "align:both",
                { menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: L2("Line & paragraph spacing", "Espa\xE7amento entre linhas e par\xE1grafos"), icon: "format_line_spacing" },
                { split: "shading", menu: () => shadingMenu(env, ctx) },
                "borders"
              ]
            ] }
          ] },
          { id: "styles", label: L2("Styles", "Estilos"), icon: "style", prio: 5, cells: [
            { rows: [[styleWidget(env, 150)]] }
          ] },
          { id: "editing", label: L2("Editing", "Edi\xE7\xE3o"), icon: "search", prio: 4, cells: [
            { rows: [[{ cmd: "find", label: true }], [{ cmd: "replace", label: true }], [{ cmd: "selectAll", label: true }]] }
          ] }
        ]
      },
      {
        id: "insert",
        label: L2("Insert", "Inserir"),
        groups: [
          { id: "pages", label: L2("Pages", "P\xE1ginas"), icon: "insert_page_break", prio: 4, cells: [large("pagebreak")] },
          { id: "tables", label: L2("Tables", "Tabelas"), icon: "table", prio: 6, cells: [{ menu: () => tableMenu(env, ctx), id: "table:menu", label: L2("Table", "Tabela"), icon: "table", size: "large", supports: has("insertTable") }] },
          { id: "illustrations", label: L2("Illustrations", "Ilustra\xE7\xF5es"), icon: "image", prio: 6, cells: [large("image")] },
          { id: "links", label: L2("Links", "Links"), icon: "link", prio: 5, cells: [large("link"), { rows: [["bookmark"]] }] },
          { id: "comments", label: L2("Comments", "Coment\xE1rios"), icon: "add_comment", prio: 5, cells: [large("comment")] },
          { id: "hf", label: L2("Header & Footer", "Cabe\xE7alho e Rodap\xE9"), icon: "call_to_action", prio: 4, cells: [
            large("header"),
            large("footer"),
            { menu: fieldsMenu, id: "fields", label: L2("Page Number", "N\xFAmero de P\xE1gina"), icon: "numbers", size: "large" }
          ] },
          { id: "text", label: L2("Text", "Texto"), icon: "text_fields", prio: 3, cells: [
            large("textbox"),
            { rows: [[{ cmd: "field:date", label: true }], [{ menu: () => symbolMenu(env, ctx), id: "symbols", label: L2("Symbol", "S\xEDmbolo"), icon: "special_character", showLabel: true }]] }
          ] },
          { id: "notes", label: L2("Notes", "Notas"), icon: "notes", prio: 2, cells: [large("footnote"), large("endnote")] }
        ]
      },
      {
        id: "design",
        label: L2("Design", "Design"),
        groups: [
          { id: "formatting", label: L2("Document Formatting", "Formata\xE7\xE3o do Documento"), icon: "style", prio: 5, cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: "pspacing", label: L2("Paragraph Spacing", "Espa\xE7amento entre Par\xE1grafos"), icon: "format_line_spacing", size: "large" }
          ] },
          { id: "background", label: L2("Page Background", "Plano de Fundo da P\xE1gina"), icon: "format_color_fill", prio: 4, cells: [
            { cmd: "pageColor", size: "large" },
            { cmd: "watermark", size: "large" }
          ] }
        ]
      },
      {
        id: "layout",
        label: L2("Layout", "Layout"),
        groups: [
          { id: "pagesetup", label: L2("Page Setup", "Configurar P\xE1gina"), icon: "description", prio: 6, launcher: "dlg:page", cells: [
            { menu: () => marginsMenu(env, ctx), id: "margins", label: L2("Margins", "Margens"), icon: "margin", size: "large" },
            { menu: () => orientationMenu(env, ctx), id: "orientation", label: L2("Orientation", "Orienta\xE7\xE3o"), icon: "crop_rotate", size: "large" },
            { menu: () => sizeMenu(env, ctx), id: "pageSize", label: L2("Size", "Tamanho"), icon: "aspect_ratio", size: "large" },
            { menu: () => ["pagebreak", "columnbreak", "sectionbreak"], id: "breaks", label: L2("Breaks", "Quebras"), icon: "insert_page_break", size: "large" },
            { rows: [["hyphenation"]] }
          ] },
          { id: "paragraph", label: L2("Paragraph", "Par\xE1grafo"), icon: "format_indent_increase", prio: 5, launcher: "dlg:paragraph", cells: [
            { rows: [
              [{ cmd: "outdent", label: true }, { cmd: "indent", label: true }],
              [{ menu: () => specialIndentMenu(env, ctx), id: "specialIndent", label: L2("Special indent", "Recuo especial"), icon: "format_indent_increase", showLabel: true }],
              [{ menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: L2("Spacing", "Espa\xE7amento"), icon: "format_line_spacing", showLabel: true }]
            ] }
          ] }
        ]
      },
      {
        id: "references",
        label: L2("References", "Refer\xEAncias"),
        groups: [
          { id: "toc", label: L2("Table of Contents", "Sum\xE1rio"), icon: "toc", prio: 5, cells: [large("toc")] },
          { id: "footnotes", label: L2("Footnotes", "Notas de Rodap\xE9"), icon: "notes", prio: 4, cells: [large("footnote"), { rows: [["endnote"]] }] }
        ]
      },
      {
        id: "mailings",
        label: L2("Mailings", "Correspond\xEAncias"),
        groups: [
          { id: "merge", label: L2("Mail Merge", "Mala Direta"), icon: "mail", prio: 5, cells: [large("mailmerge"), large("mergefield")] }
        ]
      },
      {
        id: "review",
        label: L2("Review", "Revis\xE3o"),
        groups: [
          { id: "proofing", label: L2("Proofing", "Revis\xE3o de Texto"), icon: "spellcheck", prio: 5, cells: [large("spelling"), { rows: [[{ cmd: "wordCount", label: true }]] }] },
          { id: "comments", label: L2("Comments", "Coment\xE1rios"), icon: "comment", prio: 6, cells: [
            large("comment"),
            { rows: [[{ cmd: "comment:delete", label: true }], [{ cmd: "comment:prev", label: true }], [{ cmd: "comment:next", label: true }]] },
            { cmd: "comments", size: "large" }
          ] },
          { id: "tracking", label: L2("Tracking", "Controle"), icon: "track_changes", prio: 4, cells: [large("trackChanges")] },
          { id: "changes", label: L2("Changes", "Altera\xE7\xF5es"), icon: "check_circle", prio: 3, cells: [large("change:accept"), large("change:reject")] },
          { id: "compare", label: L2("Compare", "Comparar"), icon: "compare", prio: 3, cells: [large("compare")] },
          { id: "protect", label: L2("Protect", "Proteger"), icon: "edit_document", prio: 2, cells: [large("enableEditing")] }
        ]
      },
      {
        id: "view",
        label: L2("View", "Exibir"),
        groups: [
          { id: "views", label: L2("Views", "Modos de Exibi\xE7\xE3o"), icon: "article", prio: 6, cells: [large("view:read"), large("view:print"), large("view:web")] },
          { id: "immersive", label: L2("Immersive", "Imersivo"), icon: "center_focus_strong", prio: 4, cells: [large("focus")] },
          { id: "show", label: L2("Show", "Mostrar"), icon: "visibility", prio: 3, cells: [{ rows: [[{ cmd: "marks", label: true }], [{ cmd: "comments", label: true }], [{ cmd: "statusbar", label: true }]] }] },
          { id: "zoom", label: L2("Zoom", "Zoom"), icon: "zoom_in", prio: 5, cells: [
            { menu: m2.zoomItems, id: "zoom", label: L2("Zoom", "Zoom"), icon: "zoom_in", size: "large" },
            large("zoom100"),
            { rows: [["zoomin"], ["zoomout"]] }
          ] },
          { id: "appearance", label: L2("Appearance", "Apar\xEAncia"), icon: "palette", prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: "theme", label: L2("Theme", "Tema"), icon: "contrast", size: "large" },
            { menu: () => accentMenu(env, ctx), id: "accent", label: L2("Accent", "Destaque"), icon: "palette", size: "large" },
            { menu: () => ["toolbar:compact", "toolbar:ribbon"], id: "toolbarMode", label: L2("Toolbar", "Barra"), icon: "toolbar", size: "large" }
          ] }
        ]
      },
      {
        id: "hf-tools",
        label: L2("Header & Footer", "Cabe\xE7alho e Rodap\xE9"),
        contextual: () => env.ed.editingHeaderFooter() !== null,
        groups: [
          { id: "hf-insert", label: L2("Insert", "Inserir"), icon: "numbers", prio: 5, cells: [large("field:page"), large("field:numpages"), large("field:date")] },
          { id: "hf-close", label: L2("Close", "Fechar"), icon: "close", prio: 9, cells: [large("hf:close")] }
        ]
      },
      {
        id: "table-tools",
        label: L2("Table", "Tabela"),
        contextual: () => env.ed.editingTableCell(),
        groups: [
          { id: "rows", label: L2("Rows & Columns", "Linhas e Colunas"), icon: "table_rows", prio: 5, cells: [
            large("row:above"),
            large("row:below"),
            large("col:left"),
            large("col:right"),
            { rows: [["row:delete"], ["col:delete"], ["table:delete"]] }
          ] },
          { id: "merge", label: L2("Merge", "Mesclar"), icon: "cell_merge", prio: 4, cells: [large("cells:merge"), large("cells:split")] }
        ]
      },
      {
        id: "image-tools",
        label: L2("Picture", "Imagem"),
        contextual: () => {
          const f3 = env.ed.selectedImage;
          return typeof f3 === "function" && !!f3.call(env.ed);
        },
        groups: [
          { id: "image", label: L2("Picture", "Imagem"), icon: "image", prio: 5, cells: [large("image:delete")] }
        ]
      }
    ]
  };
}

// src/chrome-panels.ts
var FindPanel = class {
  constructor(ed, app, layer) {
    this.ed = ed;
    this.app = app;
    const L3 = app.ui.L;
    const el2 = document.createElement("div");
    el2.className = "uw-find";
    el2.setAttribute("role", "dialog");
    el2.setAttribute("aria-label", L3.findTitle);
    el2.setAttribute("part", "find");
    el2.hidden = true;
    el2.innerHTML = `
      <div class="uw-find-head"><strong></strong>
        <button type="button" class="uo-btn" data-a="find:close">${symbol("close")}</button></div>
      <input type="text" data-a="find:text" />
      <input type="text" data-a="find:replace" />
      <div class="uw-find-actions"><span class="uw-find-msg"></span>
        <button type="button" class="uo-pill" data-a="find:next"></button>
        <button type="button" class="uo-pill" data-a="find:one"></button>
        <button type="button" class="uo-pill uo-pill-primary" data-a="find:all"></button></div>`;
    el2.querySelector("strong").textContent = L3.findTitle;
    this.find = el2.querySelector('[data-a="find:text"]');
    this.repl = el2.querySelector('[data-a="find:replace"]');
    this.msg = el2.querySelector(".uw-find-msg");
    this.find.placeholder = L3.find;
    this.repl.placeholder = L3.replaceWith;
    const b3 = (id, label, fn) => {
      const x2 = el2.querySelector(`[data-a="find:${id}"]`);
      x2.textContent = label;
      x2.addEventListener("click", fn);
    };
    b3("next", L3.findNext, () => this.next());
    b3("one", L3.replace, () => this.replaceOne());
    b3("all", L3.replaceAll, () => this.replaceAll());
    el2.querySelector('[data-a="find:close"]').addEventListener("click", () => this.close());
    for (const i5 of [this.find, this.repl]) {
      i5.addEventListener("keydown", (e6) => {
        if (e6.key === "Escape") {
          e6.preventDefault();
          this.close();
        }
        if (e6.key === "Enter") {
          e6.preventDefault();
          if (i5 === this.repl && e6.ctrlKey) this.replaceAll();
          else this.next();
        }
      });
    }
    this.find.addEventListener("input", () => {
      this.msg.textContent = "";
      this.find.classList.remove("uw-miss");
    });
    layer.appendChild(el2);
    this.el = el2;
  }
  ed;
  app;
  el;
  find;
  repl;
  msg;
  get isOpen() {
    return !this.el.hidden;
  }
  open(replace, top) {
    this.el.hidden = false;
    this.el.style.top = `${Math.max(8, top)}px`;
    const editable = !this.ed.isProtected();
    for (const x2 of this.el.querySelectorAll('[data-a="find:replace"],[data-a="find:one"],[data-a="find:all"]')) x2.hidden = !editable;
    const sel = this.ed.selectedText();
    if (sel && !sel.includes("\n") && sel.length < 200) this.find.value = sel;
    const t5 = replace && editable ? this.repl : this.find;
    t5.focus();
    t5.select();
  }
  close() {
    this.el.hidden = true;
    this.ed.focusEditor();
  }
  next() {
    const ok = !!this.find.value && this.ed.findNext(this.find.value);
    this.find.classList.toggle("uw-miss", !ok && !!this.find.value);
    this.msg.textContent = ok || !this.find.value ? "" : this.app.ui.L.notFound;
    return ok;
  }
  replaceOne() {
    const needle = this.find.value;
    if (!needle) return;
    if (this.ed.selectedText().toLowerCase() === needle.toLowerCase()) this.ed.pasteText(this.repl.value);
    this.next();
  }
  replaceAll() {
    if (!this.find.value) return;
    const n5 = this.ed.replaceAll(this.find.value, this.repl.value);
    this.msg.textContent = n5 ? this.app.ui.L.replaced(n5) : this.app.ui.L.notFound;
  }
};
var CommentCards = class {
  constructor(ed, app, root, after) {
    this.ed = ed;
    this.app = app;
    this.after = after;
    const el2 = document.createElement("div");
    el2.className = "uw-comments";
    el2.setAttribute("part", "comments");
    for (const t5 of ["mousedown", "dblclick", "contextmenu", "keydown", "wheel"]) {
      el2.addEventListener(t5, (e6) => {
        if (t5 !== "wheel") e6.stopPropagation();
      }, { passive: t5 === "wheel" });
    }
    root.appendChild(el2);
    this.el = el2;
  }
  ed;
  app;
  after;
  el;
  raf = 0;
  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.el.remove();
    this.ed.classList.remove("uw-has-comments");
  }
  render() {
    const pages = [...this.ed.shadowRoot?.querySelectorAll("canvas.page") ?? []];
    const all = this.app.commentsVisible && this.ed.getView() === "print" ? this.ed.getComments() : [];
    const pageW = Math.max(0, ...all.map((c4) => pages[this.ed.commentAnchorPx(c4.id)?.page ?? -1]?.offsetWidth ?? 0));
    const comments = this.ed.clientWidth >= pageW + 300 + 48 ? all : [];
    this.ed.classList.toggle("uw-has-comments", comments.length > 0);
    const L3 = this.app.ui.L;
    const active = new Set(this.app.activeCommentIds);
    this.el.replaceChildren();
    if (!comments.length) return;
    const placed = [];
    for (const c4 of comments) {
      const a3 = this.ed.commentAnchorPx(c4.id);
      const page = a3 ? pages[a3.page] : void 0;
      if (!a3 || !page) continue;
      const card = document.createElement("div");
      card.className = `uw-card${active.has(c4.id) ? " active" : ""}`;
      card.dataset["commentId"] = String(c4.id);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span>
        <button type="button" class="uo-btn" data-a="comment:delete:${c4.id}" title="${L3.deleteComment}">${symbol("delete")}</button></div>
        <div class="txt"></div>`;
      card.querySelector(".who").textContent = c4.author ?? L3.anonymous;
      card.querySelector(".txt").textContent = c4.text;
      card.querySelector("button").addEventListener("click", (e6) => {
        e6.stopPropagation();
        if (this.ed.isProtected()) return;
        this.ed.removeComment(c4.id);
        this.after();
      });
      card.addEventListener("click", () => {
        this.app.activeCommentIds = [c4.id];
        this.ed.goToComment(c4.id);
        this.render();
        this.after();
      });
      card.style.left = `${page.offsetLeft + page.offsetWidth + 24}px`;
      this.el.appendChild(card);
      placed.push({ card, ideal: a3.topPx });
    }
    placed.sort((x2, y3) => x2.ideal - y3.ideal);
    let bottom = -Infinity;
    for (const p3 of placed) {
      const top = Math.max(p3.ideal, bottom + 8);
      p3.card.style.top = `${top}px`;
      p3.card.classList.toggle("anchored", Math.abs(top - p3.ideal) <= 6);
      bottom = top + (p3.card.offsetHeight || 56);
    }
  }
};
var StatusBar = class {
  constructor(ed, app, container, ctx) {
    this.ed = ed;
    this.app = app;
    const bar = document.createElement("div");
    bar.className = "uw-status-bar";
    bar.setAttribute("part", "statusbar");
    this.status = document.createElement("span");
    this.status.className = "uw-status";
    this.status.dataset["a"] = "status";
    this.status.setAttribute("role", "status");
    const sp = document.createElement("span");
    sp.className = "uo-spacer";
    bar.append(this.status, sp);
    const views = document.createElement("span");
    views.className = "uw-views";
    for (const id of ["view:print", "view:web", "view:read", "focus"]) {
      const r5 = renderItem(id, ctx);
      views.appendChild(r5.el);
      this.items.push(r5);
    }
    bar.appendChild(views);
    const zo = renderItem("zoomout", ctx);
    this.slider = document.createElement("input");
    this.slider.type = "range";
    this.slider.min = "10";
    this.slider.max = "500";
    this.slider.step = "5";
    this.slider.className = "uw-zoom-slider";
    this.slider.dataset["a"] = "zoom:slider";
    this.slider.title = ctx.registry.text({ en: "Zoom (Ctrl+scroll on the document)", pt: "Zoom (Ctrl+rolagem no documento)" });
    this.slider.addEventListener("input", () => ed.setZoom(Number(this.slider.value) / 100));
    this.slider.addEventListener("change", () => ctx.after());
    const zi = renderItem("zoomin", ctx);
    const pct = document.createElement("button");
    pct.type = "button";
    pct.className = "uo-btn uw-zoom-pct";
    pct.dataset["a"] = "zoom";
    pct.title = ctx.registry.text({ en: "Zoom", pt: "Zoom" });
    pct.addEventListener("mousedown", (e6) => e6.preventDefault());
    pct.addEventListener("click", (e6) => {
      e6.stopPropagation();
      toggleMenu(pct, () => ZOOMS.map((z2) => ({
        label: `${z2}%`,
        checked: Math.round(ed.getZoom() * 100) === z2,
        onClick: () => {
          ed.setZoom(z2 / 100);
          ctx.after();
        }
      })), ctx);
    });
    this.items.push(zo, zi, { el: pct, visible: () => true, sync: () => {
      pct.textContent = `${Math.round(ed.getZoom() * 100)}%`;
    } });
    bar.append(zo.el, this.slider, zi.el, pct);
    container.appendChild(bar);
  }
  ed;
  app;
  status;
  slider;
  items = [];
  flashTimer = 0;
  flashing = false;
  flash(msg) {
    window.clearTimeout(this.flashTimer);
    if (!msg) {
      this.flashing = false;
      this.sync();
      return;
    }
    this.flashing = true;
    this.status.textContent = msg;
    this.flashTimer = window.setTimeout(() => {
      this.flashing = false;
      this.sync();
    }, 2400);
  }
  sync() {
    if (!this.flashing) {
      const s4 = this.ed.stats();
      this.status.textContent = this.app.ui.L.status(s4.page, s4.pages, s4.words);
    }
    for (const r5 of this.items) r5.sync();
    if (this.ed.getRootNode() && document.activeElement !== this.slider) this.slider.value = String(Math.round(this.ed.getZoom() * 100));
  }
};

// src/chrome.ts
var CHROME_CSS = (
  /* css */
  `
:host { --uo-font: var(--uw-font, "Segoe UI", system-ui, -apple-system, sans-serif); }
/* "mesa" atr\xE1s das p\xE1ginas no tom do tema (claro/escuro) */
:host { background: var(--uw-desk, var(--u-color-surface-container-high, #e8e8e8)); }
.uw-topbar { background: var(--uo-bar-bg, var(--u-color-surface, #fdfbff)) !important; border-bottom: 0 !important; }
.uw-bottombar { background: var(--uo-bar-bg, var(--u-color-surface-container, #eef0f4)) !important; }
:host(.view-read) .uo-toolrow, :host(.view-read) .uo-ribbon-body, :host(.view-read) .uw-protbar { display: none !important; }
:host(.uw-focus) .uw-topbar, :host(.uw-focus) .uw-bottombar { display: none !important; }
:host(.uw-comparing) .pages { display: none !important; }
:host(.uw-has-comments) .pages { padding-right: 300px; }

/* camada flutuante (menus, popovers, di\xE1logos, localizar, avisos) */
.uw-layer { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 60; }

/* barra de Modo Protegido (Word: faixa amarela sob a faixa de op\xE7\xF5es) */
.uw-protbar {
  display: flex; align-items: center; gap: 12px; padding: 6px 16px; font-size: 13px;
  font-family: var(--uo-font);
  background: var(--u-color-warning-container, #ffdea8); color: var(--u-color-on-warning-container, #271900);
}
.uw-protbar[hidden] { display: none; }
.uw-protbar .uo-ic { width: 20px; height: 20px; flex: none; }
.uw-protbar span { flex: 1 1 auto; min-width: 0; }
.uw-protbar .uo-pill { flex: none; height: 30px; background: var(--u-color-warning, #7c5800); color: var(--u-color-on-warning, #fff); border: 0; }
@keyframes uwPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,181,0,0); } 30% { box-shadow: 0 0 0 5px rgba(232,181,0,.9); } }
.uw-pulse { animation: uwPulse .5s ease-out 2; }

/* barra de status */
.uw-status-bar {
  display: flex; align-items: center; gap: 4px; padding: 2px 12px; min-height: 30px;
  font-family: var(--uo-font); font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f);
}
.uw-status { font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.uw-views { display: inline-flex; gap: 1px; margin-right: 6px; }
.uw-status-bar .uo-btn { height: 26px; min-width: 26px; }
.uw-status-bar .uo-ic { width: 18px; height: 18px; }
.uw-zoom-slider { width: 120px; accent-color: var(--u-color-primary, #005bc0); }
.uw-zoom-pct { min-width: 46px !important; font-variant-numeric: tabular-nums; font-size: 12.5px !important; }
@media (max-width: 560px) { .uw-zoom-slider { display: none; } }

/* localizar e substituir (flutuante, n\xE3o modal) */
.uw-find {
  position: fixed; right: 20px; z-index: 950; width: 340px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 14px;
  background: var(--u-color-surface-container-high, #e9e7ec); color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px;
  box-shadow: 0 12px 32px light-dark(rgba(0,0,0,.16), rgba(0,0,0,.5)); font-family: var(--uo-font); font-size: 14px;
}
.uw-find[hidden] { display: none; }
.uw-find-head { display: flex; align-items: center; justify-content: space-between; }
.uw-find input {
  height: 36px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 10px;
  background: var(--u-color-surface-container-lowest, #fff); color: inherit; font: inherit;
}
.uw-find input:focus { outline: 2px solid var(--u-color-primary, #005bc0); outline-offset: -1px; }
.uw-find input.uw-miss { outline: 2px solid var(--u-color-error, #ba1a1a); outline-offset: -1px; }
.uw-find-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.uw-find-actions .uo-pill { height: 32px; padding: 0 12px; font-size: 13px; }
.uw-find-msg { flex: 1 1 auto; font-size: 12.5px; color: var(--u-color-on-surface-variant, #44474f); }

/* coment\xE1rios ao lado da p\xE1gina */
.uw-comments { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 5; }
.uw-card {
  position: absolute; width: 240px; padding: 8px 10px; border-radius: 10px; cursor: pointer;
  background: var(--u-color-surface-container-low, #f6f4f8); color: var(--u-color-on-surface, #1b1b1f);
  border: 1px solid var(--u-color-outline-variant, #c4c6d0); box-shadow: 0 1px 3px rgba(0,0,0,.08);
  font-family: var(--uo-font); font-size: 13px; line-height: 1.4; transition: top 120ms ease-out;
}
.uw-card::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px; width: 3px; border-radius: 2px; background: rgba(255,187,0,.6); }
.uw-card.anchored::after {
  content: ""; position: absolute; right: 100%; top: 18px; width: 24px; margin-right: 12px;
  border-top: 1px dotted rgba(255,187,0,.7); pointer-events: none;
}
.uw-card.active { border-color: var(--u-color-primary, #005bc0); box-shadow: 0 0 0 2px var(--u-color-primary, #005bc0); }
.uw-card-head { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin: -2px -4px 2px 0; }
.uw-card .who { font-weight: 600; font-size: 12px; }
.uw-card .uo-btn { height: 24px; min-width: 24px; }
.uw-card .uo-ic { width: 16px; height: 16px; }
.uw-card .txt { white-space: pre-wrap; word-break: break-word; }

/* comparar */
.uw-compare { display: none; }
:host(.uw-comparing) .uw-compare { display: flex; flex-direction: column; }

/* arrastar e soltar */
.uw-drop {
  position: fixed; inset: 12px; z-index: 1200; display: grid; place-items: center; pointer-events: none;
  border: 3px dashed var(--u-color-primary, #005bc0); border-radius: 14px;
  background: color-mix(in srgb, var(--u-color-primary, #005bc0) 12%, transparent);
  color: var(--u-color-primary, #005bc0); font-family: var(--uo-font); font-size: 22px;
}
.uw-drop[hidden] { display: none; }
`
);
var EDITOR_KEYS = /* @__PURE__ */ new Set(["Ctrl+C", "Ctrl+X", "Ctrl+V", "Ctrl+Shift+V", "Ctrl+Z", "Ctrl+Y", "Ctrl+A", "Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+E", "Ctrl+L", "Ctrl+R", "Ctrl+J", "Ctrl+Enter"]);
var APP_SHORTCUTS = /* @__PURE__ */ new Set(["open", "save", "saveAs", "print", "find", "replace"]);
var lastFocused = null;
function isField(t5) {
  if (!(t5 instanceof HTMLElement)) return false;
  if (t5.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(t5.tagName) && !t5.classList.contains("proxy");
}
function comboOf(e6) {
  const code = e6.code;
  let k2 = code.startsWith("Key") ? code.slice(3) : code.startsWith("Digit") ? code.slice(5) : { Equal: "=", Minus: "-", BracketLeft: "[", BracketRight: "]", Slash: "/", Space: "Space", Enter: "Enter", IntlRo: "/" }[code] ?? e6.key;
  if (/^F\d+$/.test(e6.key)) k2 = e6.key;
  return `${e6.ctrlKey || e6.metaKey ? "Ctrl+" : ""}${e6.altKey ? "Alt+" : ""}${e6.shiftKey ? "Shift+" : ""}${k2}`;
}
var WriteChrome = class {
  constructor(ed, topEl, bottomEl, opts) {
    this.ed = ed;
    this.topEl = topEl;
    this.bottomEl = bottomEl;
    this.root = topEl.getRootNode();
    this.lang = opts.lang;
    this.L = pickLabels(opts.lang, LABELS);
    ensureBarStyles(this.root);
    if (!this.root.querySelector("style[data-uw-chrome]")) {
      const s4 = document.createElement("style");
      s4.dataset["uwChrome"] = "";
      s4.textContent = CHROME_CSS;
      this.root.appendChild(s4);
    }
    this.layer = this.root.querySelector(".uw-layer") ?? this.makeLayer();
    this.layer.replaceChildren();
    const app = this.app = appFor(ed);
    app.ui = {
      L: this.L,
      layer: this.layer,
      flash: (m2) => this.flash(m2),
      sync: () => this.sync(),
      protectedChanged: () => this.sync(),
      pulseEnable: () => {
        const b3 = this.protbar?.querySelector(".uo-pill");
        if (!b3) return;
        b3.classList.remove("uw-pulse");
        void b3.offsetWidth;
        b3.classList.add("uw-pulse");
      }
    };
    if (!app.title) app.title = this.L.untitled;
    app.attach();
    app.bindHost();
    bindHostFonts(hostOf(ed));
    this.applyTheme();
    this.reg = new CommandRegistry(opts.lang);
    this.reg.afterRun = () => this.after();
    this.ctx = { registry: this.reg, lang: opts.lang, layer: this.layer, after: () => this.after() };
    registerWriteCommands(this.reg, ed, app, this.ctl());
    const env = { ed, app, ctl: this.ctl(), root: this.root };
    topEl.replaceChildren();
    bottomEl.replaceChildren();
    if (opts.topbar) {
      this.bar = this.mode() === "ribbon" ? createRibbon(topEl, ribbonLayout(env, this.ctx), this.ctx) : createCompactBar(topEl, compactLayout(env, this.ctx), this.ctx);
      this.protbar = this.makeProtectedBar();
      topEl.appendChild(this.protbar);
      this.cards = new CommentCards(ed, app, this.root, () => this.after());
      this.bindDocumentFeatures();
    }
    if (opts.bottombar) this.status = new StatusBar(ed, app, bottomEl, this.ctx);
    this.bindEvents();
    const mo = new MutationObserver((recs) => {
      if (!ed.hasAttribute("topbar") && !ed.hasAttribute("bottombar")) {
        teardownChrome(ed);
        return;
      }
      if (recs.some((r5) => r5.attributeName === "theme" || r5.attributeName === "accent")) {
        this.applyTheme();
        this.sync();
      }
    });
    mo.observe(ed, { attributes: true, attributeFilter: ["topbar", "bottombar", "theme", "accent"] });
    if (typeof matchMedia !== "undefined") {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        const m2 = this.app.mode;
        if (m2 === "auto" || m2 === null) hostOf(ed)?.setTitleTheme?.(isDark(m2));
      }, { signal: this.ac.signal });
    }
    this.ac.signal.addEventListener("abort", () => mo.disconnect());
    void ed.listAvailableFonts().then((f3) => {
      this.families = f3;
    });
    this.sync();
    this.cards?.schedule();
  }
  ed;
  topEl;
  bottomEl;
  ac = new AbortController();
  root;
  app;
  reg;
  ctx;
  layer;
  L;
  lang;
  bar = null;
  status = null;
  cards = null;
  find = null;
  protbar = null;
  stateCache = null;
  families = [];
  fontAsked = false;
  makeLayer() {
    const l3 = document.createElement("div");
    l3.className = "uw-layer";
    for (const t5 of ["mousedown", "mouseup", "click", "dblclick", "contextmenu", "keydown", "keyup", "keypress", "wheel", "input", "paste", "copy", "cut"]) {
      l3.addEventListener(t5, (e6) => e6.stopPropagation(), { passive: t5 === "wheel" });
    }
    this.root.appendChild(l3);
    return l3;
  }
  mode() {
    const a3 = this.ed.getAttribute("toolbar");
    if (a3 === "ribbon" || a3 === "compact") return a3;
    return this.app.prefs.get("toolbar") === "ribbon" ? "ribbon" : "compact";
  }
  ctl() {
    const d3 = () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
    return {
      state: () => this.state(),
      find: (replace) => this.openFind(replace),
      comment: () => {
        void commentDialog(d3()).then(() => this.after());
      },
      link: () => {
        void linkDialog(d3()).then(() => this.after());
      },
      image: () => this.pickImage(),
      fontDialog: () => {
        void fontDialog(d3(), this.families).then(() => this.after());
      },
      paragraphDialog: () => {
        void paragraphDialog(d3()).then(() => this.after());
      },
      pageDialog: () => {
        void pageDialog(d3()).then(() => this.after());
      },
      wordCount: () => wordCountDialog(d3()),
      spelling: () => {
        void spellingDialog(d3()).then(() => this.after());
      },
      shortcuts: () => shortcutsDialog(d3()),
      about: () => aboutDialog(d3()),
      compare: () => {
        void this.compare();
      },
      focusMode: () => this.toggleFocus(),
      inFocusMode: () => this.ed.classList.contains("uw-focus"),
      toolbarMode: () => this.mode(),
      setToolbarMode: (m2) => {
        this.app.prefs.set("toolbar", m2);
        this.ed.setAttribute("toolbar", m2);
      },
      toggleComments: () => {
        this.app.commentsVisible = !this.app.commentsVisible;
        this.app.prefs.set("comments", this.app.commentsVisible ? "1" : "0");
        this.cards?.render();
      },
      requestFonts: () => this.requestFonts(),
      flash: (m2) => this.flash(m2),
      applyTheme: () => this.applyTheme()
    };
  }
  state() {
    return this.stateCache ??= this.ed.getSelectionState();
  }
  /** Tema só quando pedido (atributo `theme` ou escolha no menu); senão herda a página. */
  applyTheme() {
    const mode = this.app.mode;
    applyTheme(this.ed, this.root, this.app.accent, mode);
    hostOf(this.ed)?.setTitleTheme?.(isDark(mode));
  }
  /** Depois de qualquer ação: foco de volta ao documento (se não abriu painel) e sincroniza. */
  after() {
    if (this.ac.signal.aborted) return;
    const a3 = this.root.activeElement;
    const inLayer = !!a3 && this.layer.contains(a3);
    const inBar = !!a3 && this.topEl.contains(a3) && a3.tagName === "INPUT";
    if (!isMenuOpen()) closePopover();
    if (!inLayer && !inBar && !isMenuOpen()) this.ed.focusEditor();
    this.sync();
  }
  /** Um sync por quadro, venha de onde vier (seleção, eventos, ações). */
  sync() {
    if (this.raf || this.ac.signal.aborted) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.syncNow();
    });
  }
  raf = 0;
  syncNow() {
    this.stateCache = null;
    this.app.bindHost();
    this.topEl.classList.toggle("uo-wco", !!hostOf(this.ed)?.windowControlsOverlay);
    if (this.protbar) this.protbar.hidden = !this.ed.isProtected();
    this.bar?.sync();
    this.status?.sync();
  }
  flash(msg) {
    if (this.status) this.status.flash(msg);
    else if (msg) showToast(this.layer, msg);
  }
  destroy() {
    this.ac.abort();
    cancelAnimationFrame(this.raf);
    closeMenus();
    closePopover();
    closeDialogs(this.layer);
    this.bar?.destroy();
    this.cards?.destroy();
    this.layer.replaceChildren();
    this.root.querySelector(".uw-compare")?.remove();
    this.topEl.classList.remove("uo-wco");
    this.topEl.replaceChildren();
    this.bottomEl.replaceChildren();
    this.ed.classList.remove("uw-comparing", "uw-focus");
    if (this.app.ui?.layer === this.layer) this.app.detach();
  }
  // ───── Modo Protegido ─────
  makeProtectedBar() {
    const el2 = document.createElement("div");
    el2.className = "uw-protbar";
    el2.setAttribute("part", "protected-bar");
    el2.setAttribute("role", "alert");
    el2.innerHTML = `<svg class="uo-ic" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-81q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 143-80 264.5T505-85q-6 2-12 3t-13 1Z"/></svg>
      <span><b></b> \u2014 </span><button type="button" class="uo-pill" data-a="enableEditing"></button>`;
    el2.querySelector("b").textContent = this.L.protectedTitle;
    el2.querySelector("span").append(this.L.protectedText);
    const b3 = el2.querySelector("button");
    b3.textContent = this.L.enableEditing;
    b3.addEventListener("click", () => {
      this.app.enableEditing();
      this.after();
    });
    el2.hidden = true;
    return el2;
  }
  // ───── localizar ─────
  openFind(replace) {
    this.find ??= new FindPanel(this.ed, this.app, this.layer);
    if (!this.find.el.isConnected) this.layer.appendChild(this.find.el);
    const r5 = this.topEl.getBoundingClientRect();
    this.find.open(replace, Math.max(r5.bottom, this.ed.getBoundingClientRect().top) + 8);
  }
  // ───── imagem ─────
  pickImage() {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp,image/bmp" });
    input.addEventListener("change", async () => {
      const f3 = input.files?.[0];
      if (!f3) return;
      const ext = { "image/jpeg": "jpeg", "image/gif": "gif", "image/webp": "webp", "image/bmp": "bmp" }[f3.type] ?? "png";
      await this.ed.insertImage(new Uint8Array(await f3.arrayBuffer()), ext);
      this.after();
    });
    input.click();
  }
  // ───── fontes instaladas (Local Font Access, Chromium) ─────
  requestFonts() {
    if (this.fontAsked || this.ed.hasHostSystemFonts()) return;
    this.fontAsked = true;
    void this.ed.requestSystemFonts().then(async (ok) => {
      this.families = await this.ed.listAvailableFonts();
      if (!ok) return;
      this.flash(this.L.fontAccessOk(this.families.length));
    });
  }
  // ───── foco ─────
  toggleFocus() {
    const ed = this.ed;
    if (ed.classList.contains("uw-focus")) {
      ed.classList.remove("uw-focus");
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {
      });
    } else {
      ed.classList.add("uw-focus");
      void ed.requestFullscreen?.().catch(() => {
      });
    }
    this.after();
  }
  // ───── comparar ─────
  closeCompare = null;
  async compare() {
    const other = await this.app.pickForCompare();
    if (!other) return;
    let current;
    try {
      current = this.ed.saveDocx();
    } catch {
      this.flash(`\u26A0 ${this.L.stillLoading}`);
      return;
    }
    await import("./src-HQY56LPT.js");
    let box = this.root.querySelector(".uw-compare");
    if (!box) {
      box = document.createElement("div");
      box.className = "uw-compare";
      box.setAttribute("part", "compare");
      for (const t5 of ["mousedown", "dblclick", "contextmenu", "keydown", "wheel"]) {
        box.addEventListener(t5, (e6) => e6.stopPropagation(), { passive: t5 === "wheel" });
      }
      box.addEventListener("keydown", (e6) => {
        if (e6.key === "Escape" && !e6.defaultPrevented && !isMenuOpen()) {
          e6.preventDefault();
          this.closeCompare?.();
        }
      });
      const wd2 = document.createElement("universal-write-diff");
      wd2.setAttribute("lang", this.lang);
      wd2.style.cssText = "flex:1;min-height:0;display:flex";
      box.appendChild(wd2);
      this.root.querySelector(".pages")?.after(box);
    }
    const wd = box.firstElementChild;
    const fit = () => {
      const h3 = this.ed.clientHeight - this.topEl.offsetHeight - this.bottomEl.offsetHeight;
      box.style.height = `${Math.max(200, h3)}px`;
    };
    const close = () => {
      this.closeCompare = null;
      this.app.comparing = false;
      this.ed.classList.remove("uw-comparing");
      ro.disconnect();
      this.after();
    };
    this.closeCompare = close;
    const ro = new ResizeObserver(fit);
    this.ac.signal.addEventListener("abort", () => ro.disconnect());
    try {
      wd.loadPair(current, other.bytes, { leftLabel: this.L.compareCurrent(this.app.docName), rightLabel: other.name });
    } catch {
      this.flash(`\u26A0 ${this.L.notValidDocx(other.name)}`);
      return;
    }
    wd.addEventListener("close-request", close, { once: true, signal: this.ac.signal });
    wd.addEventListener("ready", (e6) => {
      this.flash(this.L.compareStats(e6.detail.stats));
    }, { once: true, signal: this.ac.signal });
    this.app.comparing = true;
    this.ed.classList.add("uw-comparing");
    this.ed.scrollTop = 0;
    ro.observe(this.ed);
    fit();
    this.sync();
  }
  // ───── eventos ─────
  bindEvents() {
    const { ed } = this;
    const signal = this.ac.signal;
    const resync = () => this.sync();
    for (const t5 of ["uw-hfmode", "uw-cellmode", "uw-tbmode", "uw-protected", "uw-ready"]) {
      ed.addEventListener(t5, resync, { signal });
    }
    let tick = false;
    ed.addEventListener("scroll", () => {
      if (tick || !this.status) return;
      tick = true;
      setTimeout(() => {
        tick = false;
        this.status?.sync();
      }, 150);
    }, { signal, passive: true });
    if (this.cards) {
      const cards = this.cards;
      for (const t5 of ["uw-comments-changed", "uw-change", "uw-zoom", "uw-ready", "uw-protected"]) ed.addEventListener(t5, () => cards.schedule(), { signal });
      const cro = new ResizeObserver(() => cards.schedule());
      cro.observe(ed);
      signal.addEventListener("abort", () => cro.disconnect());
      ed.addEventListener("uw-comment-click", ((e6) => {
        this.app.activeCommentIds = e6.detail.ids;
        cards.render();
        this.sync();
      }), { signal });
    }
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && ed.classList.contains("uw-focus")) {
        ed.classList.remove("uw-focus");
        this.sync();
      }
    }, { signal });
  }
  /** Recursos de documento só com a barra superior: atalhos, contexto, arrastar e soltar. */
  bindDocumentFeatures() {
    const { ed } = this;
    const signal = this.ac.signal;
    const byShortcut = /* @__PURE__ */ new Map();
    for (const id of this.reg.ids()) {
      const sc = this.reg.get(id).shortcut;
      if (sc && !EDITOR_KEYS.has(sc)) byShortcut.set(sc, id);
    }
    const run = (e6, id) => {
      e6.preventDefault();
      e6.stopPropagation();
      void this.reg.run(id);
    };
    ed.addEventListener("keydown", (e6) => {
      if (e6.defaultPrevented) return;
      if (e6.key === "Escape" && this.app.comparing) {
        e6.preventDefault();
        this.closeCompare?.();
        return;
      }
      const id = byShortcut.get(comboOf(e6));
      if (!id || !this.reg.supported(id)) return;
      if (isField(e6.composedPath()[0]) && !APP_SHORTCUTS.has(id)) return;
      run(e6, id);
    }, { signal });
    ed.addEventListener("focusin", () => {
      lastFocused = new WeakRef(ed);
    }, { signal });
    document.addEventListener("keydown", (e6) => {
      if (e6.defaultPrevented) return;
      const path = e6.composedPath();
      if (path.some((n5) => n5 instanceof HTMLElement && n5.localName === "universal-write")) return;
      if (isField(path[0])) return;
      const id = byShortcut.get(comboOf(e6));
      if (!id || !APP_SHORTCUTS.has(id) || !this.reg.supported(id)) return;
      const last = lastFocused?.deref();
      const mine = last?.isConnected ? last === ed : document.querySelectorAll("universal-write[topbar]").length === 1;
      if (mine) run(e6, id);
    }, { signal });
    ed.addEventListener("contextmenu", (e6) => {
      if (e6.composedPath().some((n5) => n5 === this.topEl || n5 === this.bottomEl || n5 === this.layer)) return;
      if (this.app.comparing) return;
      e6.preventDefault();
      const at = { x: e6.clientX, y: e6.clientY };
      const items = [
        "cut",
        "copy",
        "paste",
        "pastePlain",
        "-",
        "bold",
        "italic",
        "underline",
        "-",
        "link",
        "comment",
        "-",
        "list:bullet",
        "list:decimal",
        "-",
        "find",
        "selectAll"
      ];
      const open = (pre) => {
        openMenu([...pre, ...items], at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
      };
      const m2 = ed.spellingAtCaret();
      if (!m2) {
        open([]);
        return;
      }
      void ed.spellingSuggestions(m2).then((sug) => {
        const pre = sug.length ? sug.map((s4) => ({ label: s4, onClick: () => {
          ed.replaceSpelling(m2, s4);
          this.after();
        } })) : [{ label: { en: "(no suggestions)", pt: "(sem sugest\xF5es)" }, disabled: true }];
        open([
          ...pre,
          "-",
          { icon: "visibility_off", label: { en: "Ignore All", pt: "Ignorar tudo" }, onClick: () => ed.ignoreSpelling(m2.word) },
          { icon: "library_add", label: { en: "Add to Dictionary", pt: "Adicionar ao dicion\xE1rio" }, onClick: () => {
            void ed.addToDictionary(m2.word);
          } },
          "-"
        ]);
      }, () => open([]));
    }, { signal });
    const overlay = document.createElement("div");
    overlay.className = "uw-drop";
    overlay.hidden = true;
    overlay.textContent = this.L.dropHere;
    this.layer.appendChild(overlay);
    let depth = 0;
    const hasFiles = (e6) => !!e6.dataTransfer?.types?.includes("Files");
    ed.addEventListener("dragenter", (e6) => {
      if (!hasFiles(e6)) return;
      e6.preventDefault();
      depth++;
      overlay.hidden = false;
    }, { signal });
    ed.addEventListener("dragleave", (e6) => {
      if (!hasFiles(e6)) return;
      if (--depth <= 0) {
        depth = 0;
        overlay.hidden = true;
      }
    }, { signal });
    ed.addEventListener("dragover", (e6) => {
      if (hasFiles(e6)) e6.preventDefault();
    }, { signal });
    ed.addEventListener("drop", (e6) => {
      if (!hasFiles(e6)) return;
      e6.preventDefault();
      depth = 0;
      overlay.hidden = true;
      const f3 = e6.dataTransfer?.files?.[0];
      if (!f3) return;
      void (async () => {
        const bytes = new Uint8Array(await f3.arrayBuffer());
        const ok = /\.(docx|odt|doc)$/i.test(f3.name) || bytes[0] === 80 && bytes[1] === 75 || bytes[0] === 208 && bytes[1] === 207;
        if (!ok) {
          this.flash(`\u26A0 ${this.L.notDoc(f3.name)}`);
          return;
        }
        await this.app.openFile(f3);
        this.sync();
      })();
    }, { signal });
  }
};
var chromes = /* @__PURE__ */ new WeakMap();
function setupChrome(editor, topbarEl, bottombarEl, opts) {
  chromes.get(editor)?.destroy();
  const c4 = new WriteChrome(editor, topbarEl, bottombarEl, opts);
  chromes.set(editor, c4);
  return { sync: () => c4.sync() };
}
function teardownChrome(editor) {
  chromes.get(editor)?.destroy();
  chromes.delete(editor);
}
export {
  CHROME_CSS,
  setupChrome,
  teardownChrome
};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
