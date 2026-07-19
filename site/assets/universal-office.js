var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err2) => function __init() {
  if (err2) throw err2[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e8) {
    throw err2 = [e8], e8;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../node_modules/tslib/tslib.es6.mjs
function __decorate(decorators, target, key, desc) {
  var c4 = arguments.length, r6 = c4 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d3;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r6 = Reflect.decorate(decorators, target, key, desc);
  else for (var i7 = decorators.length - 1; i7 >= 0; i7--) if (d3 = decorators[i7]) r6 = (c4 < 3 ? d3(r6) : c4 > 3 ? d3(target, key, r6) : d3(target, key)) || r6;
  return c4 > 3 && r6 && Object.defineProperty(target, key, r6), r6;
}
var init_tslib_es6 = __esm({
  "../../node_modules/tslib/tslib.es6.mjs"() {
  }
});

// ../../node_modules/@lit/reactive-element/css-tag.js
var t, e, s, o, n, r, i2, S, c;
var init_css_tag = __esm({
  "../../node_modules/@lit/reactive-element/css-tag.js"() {
    t = globalThis;
    e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
    s = /* @__PURE__ */ Symbol();
    o = /* @__PURE__ */ new WeakMap();
    n = class {
      constructor(t5, e8, o7) {
        if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
        this.cssText = t5, this.t = e8;
      }
      get styleSheet() {
        let t5 = this.o;
        const s4 = this.t;
        if (e && void 0 === t5) {
          const e8 = void 0 !== s4 && 1 === s4.length;
          e8 && (t5 = o.get(s4)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e8 && o.set(s4, t5));
        }
        return t5;
      }
      toString() {
        return this.cssText;
      }
    };
    r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
    i2 = (t5, ...e8) => {
      const o7 = 1 === t5.length ? t5[0] : e8.reduce((e9, s4, o8) => e9 + ((t6) => {
        if (true === t6._$cssResult$) return t6.cssText;
        if ("number" == typeof t6) return t6;
        throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
      })(s4) + t5[o8 + 1], t5[0]);
      return new n(o7, t5, s);
    };
    S = (s4, o7) => {
      if (e) s4.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
      else for (const e8 of o7) {
        const o8 = document.createElement("style"), n5 = t.litNonce;
        void 0 !== n5 && o8.setAttribute("nonce", n5), o8.textContent = e8.cssText, s4.appendChild(o8);
      }
    };
    c = e ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
      let e8 = "";
      for (const s4 of t6.cssRules) e8 += s4.cssText;
      return r(e8);
    })(t5) : t5;
  }
});

// ../../node_modules/@lit/reactive-element/reactive-element.js
var i3, e2, h, r2, o2, n2, a, c2, l, p, d, u, f, b, y;
var init_reactive_element = __esm({
  "../../node_modules/@lit/reactive-element/reactive-element.js"() {
    init_css_tag();
    init_css_tag();
    ({ is: i3, defineProperty: e2, getOwnPropertyDescriptor: h, getOwnPropertyNames: r2, getOwnPropertySymbols: o2, getPrototypeOf: n2 } = Object);
    a = globalThis;
    c2 = a.trustedTypes;
    l = c2 ? c2.emptyScript : "";
    p = a.reactiveElementPolyfillSupport;
    d = (t5, s4) => t5;
    u = { toAttribute(t5, s4) {
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
      let i7 = t5;
      switch (s4) {
        case Boolean:
          i7 = null !== t5;
          break;
        case Number:
          i7 = null === t5 ? null : Number(t5);
          break;
        case Object:
        case Array:
          try {
            i7 = JSON.parse(t5);
          } catch (t6) {
            i7 = null;
          }
      }
      return i7;
    } };
    f = (t5, s4) => !i3(t5, s4);
    b = { attribute: true, type: String, converter: u, reflect: false, useDefault: false, hasChanged: f };
    Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), a.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
    y = class extends HTMLElement {
      static addInitializer(t5) {
        this._$Ei(), (this.l ??= []).push(t5);
      }
      static get observedAttributes() {
        return this.finalize(), this._$Eh && [...this._$Eh.keys()];
      }
      static createProperty(t5, s4 = b) {
        if (s4.state && (s4.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s4 = Object.create(s4)).wrapped = true), this.elementProperties.set(t5, s4), !s4.noAccessor) {
          const i7 = /* @__PURE__ */ Symbol(), h3 = this.getPropertyDescriptor(t5, i7, s4);
          void 0 !== h3 && e2(this.prototype, t5, h3);
        }
      }
      static getPropertyDescriptor(t5, s4, i7) {
        const { get: e8, set: r6 } = h(this.prototype, t5) ?? { get() {
          return this[s4];
        }, set(t6) {
          this[s4] = t6;
        } };
        return { get: e8, set(s5) {
          const h3 = e8?.call(this);
          r6?.call(this, s5), this.requestUpdate(t5, h3, i7);
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
          for (const i7 of s4) this.createProperty(i7, t6[i7]);
        }
        const t5 = this[Symbol.metadata];
        if (null !== t5) {
          const s4 = litPropertyMetadata.get(t5);
          if (void 0 !== s4) for (const [t6, i7] of s4) this.elementProperties.set(t6, i7);
        }
        this._$Eh = /* @__PURE__ */ new Map();
        for (const [t6, s4] of this.elementProperties) {
          const i7 = this._$Eu(t6, s4);
          void 0 !== i7 && this._$Eh.set(i7, t6);
        }
        this.elementStyles = this.finalizeStyles(this.styles);
      }
      static finalizeStyles(s4) {
        const i7 = [];
        if (Array.isArray(s4)) {
          const e8 = new Set(s4.flat(1 / 0).reverse());
          for (const s5 of e8) i7.unshift(c(s5));
        } else void 0 !== s4 && i7.push(c(s4));
        return i7;
      }
      static _$Eu(t5, s4) {
        const i7 = s4.attribute;
        return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
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
        for (const i7 of s4.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
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
      attributeChangedCallback(t5, s4, i7) {
        this._$AK(t5, i7);
      }
      _$ET(t5, s4) {
        const i7 = this.constructor.elementProperties.get(t5), e8 = this.constructor._$Eu(t5, i7);
        if (void 0 !== e8 && true === i7.reflect) {
          const h3 = (void 0 !== i7.converter?.toAttribute ? i7.converter : u).toAttribute(s4, i7.type);
          this._$Em = t5, null == h3 ? this.removeAttribute(e8) : this.setAttribute(e8, h3), this._$Em = null;
        }
      }
      _$AK(t5, s4) {
        const i7 = this.constructor, e8 = i7._$Eh.get(t5);
        if (void 0 !== e8 && this._$Em !== e8) {
          const t6 = i7.getPropertyOptions(e8), h3 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : u;
          this._$Em = e8;
          const r6 = h3.fromAttribute(s4, t6.type);
          this[e8] = r6 ?? this._$Ej?.get(e8) ?? r6, this._$Em = null;
        }
      }
      requestUpdate(t5, s4, i7, e8 = false, h3) {
        if (void 0 !== t5) {
          const r6 = this.constructor;
          if (false === e8 && (h3 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? f)(h3, s4) || i7.useDefault && i7.reflect && h3 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
          this.C(t5, s4, i7);
        }
        false === this.isUpdatePending && (this._$ES = this._$EP());
      }
      C(t5, s4, { useDefault: i7, reflect: e8, wrapped: h3 }, r6) {
        i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s4 ?? this[t5]), true !== h3 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s4 = void 0), this._$AL.set(t5, s4)), true === e8 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
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
          if (t6.size > 0) for (const [s5, i7] of t6) {
            const { wrapped: t7 } = i7, e8 = this[s5];
            true !== t7 || this._$AL.has(s5) || void 0 === e8 || this.C(s5, void 0, i7, e8);
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
  }
});

// ../../node_modules/lit-html/lit-html.js
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e3 ? e3.createHTML(i7) : i7;
}
function M(t5, i7, s4 = t5, e8) {
  if (i7 === E) return i7;
  let h3 = void 0 !== e8 ? s4._$Co?.[e8] : s4._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h3?.constructor !== o7 && (h3?._$AO?.(false), void 0 === o7 ? h3 = void 0 : (h3 = new o7(t5), h3._$AT(t5, s4, e8)), void 0 !== e8 ? (s4._$Co ??= [])[e8] = h3 : s4._$Cl = h3), void 0 !== h3 && (i7 = M(t5, h3._$AS(t5, i7.values), h3, e8)), i7;
}
var t2, i4, s2, e3, h2, o3, n3, r3, l2, c3, a2, u2, d2, f2, v, _, m, p2, g, $, y2, x2, b3, w, T, E, A, C, P, N, S2, R, k, H, I, L, z, Z, B, D;
var init_lit_html = __esm({
  "../../node_modules/lit-html/lit-html.js"() {
    t2 = globalThis;
    i4 = (t5) => t5;
    s2 = t2.trustedTypes;
    e3 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
    h2 = "$lit$";
    o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
    n3 = "?" + o3;
    r3 = `<${n3}>`;
    l2 = document;
    c3 = () => l2.createComment("");
    a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
    u2 = Array.isArray;
    d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
    f2 = "[ 	\n\f\r]";
    v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
    _ = /-->/g;
    m = />/g;
    p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
    g = /'/g;
    $ = /"/g;
    y2 = /^(?:script|style|textarea|title)$/i;
    x2 = (t5) => (i7, ...s4) => ({ _$litType$: t5, strings: i7, values: s4 });
    b3 = x2(1);
    w = x2(2);
    T = x2(3);
    E = /* @__PURE__ */ Symbol.for("lit-noChange");
    A = /* @__PURE__ */ Symbol.for("lit-nothing");
    C = /* @__PURE__ */ new WeakMap();
    P = l2.createTreeWalker(l2, 129);
    N = (t5, i7) => {
      const s4 = t5.length - 1, e8 = [];
      let n5, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c4 = v;
      for (let i8 = 0; i8 < s4; i8++) {
        const s5 = t5[i8];
        let a3, u3, d3 = -1, f3 = 0;
        for (; f3 < s5.length && (c4.lastIndex = f3, u3 = c4.exec(s5), null !== u3); ) f3 = c4.lastIndex, c4 === v ? "!--" === u3[1] ? c4 = _ : void 0 !== u3[1] ? c4 = m : void 0 !== u3[2] ? (y2.test(u3[2]) && (n5 = RegExp("</" + u3[2], "g")), c4 = p2) : void 0 !== u3[3] && (c4 = p2) : c4 === p2 ? ">" === u3[0] ? (c4 = n5 ?? v, d3 = -1) : void 0 === u3[1] ? d3 = -2 : (d3 = c4.lastIndex - u3[2].length, a3 = u3[1], c4 = void 0 === u3[3] ? p2 : '"' === u3[3] ? $ : g) : c4 === $ || c4 === g ? c4 = p2 : c4 === _ || c4 === m ? c4 = v : (c4 = p2, n5 = void 0);
        const x3 = c4 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
        l3 += c4 === v ? s5 + r3 : d3 >= 0 ? (e8.push(a3), s5.slice(0, d3) + h2 + s5.slice(d3) + o3 + x3) : s5 + o3 + (-2 === d3 ? i8 : x3);
      }
      return [V(t5, l3 + (t5[s4] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e8];
    };
    S2 = class _S {
      constructor({ strings: t5, _$litType$: i7 }, e8) {
        let r6;
        this.parts = [];
        let l3 = 0, a3 = 0;
        const u3 = t5.length - 1, d3 = this.parts, [f3, v2] = N(t5, i7);
        if (this.el = _S.createElement(f3, e8), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
          const t6 = this.el.content.firstChild;
          t6.replaceWith(...t6.childNodes);
        }
        for (; null !== (r6 = P.nextNode()) && d3.length < u3; ) {
          if (1 === r6.nodeType) {
            if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
              const i8 = v2[a3++], s4 = r6.getAttribute(t6).split(o3), e9 = /([.?@])?(.*)/.exec(i8);
              d3.push({ type: 1, index: l3, name: e9[2], strings: s4, ctor: "." === e9[1] ? I : "?" === e9[1] ? L : "@" === e9[1] ? z : H }), r6.removeAttribute(t6);
            } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
            if (y2.test(r6.tagName)) {
              const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
              if (i8 > 0) {
                r6.textContent = s2 ? s2.emptyScript : "";
                for (let s4 = 0; s4 < i8; s4++) r6.append(t6[s4], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
                r6.append(t6[i8], c3());
              }
            }
          } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
          else {
            let t6 = -1;
            for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
          }
          l3++;
        }
      }
      static createElement(t5, i7) {
        const s4 = l2.createElement("template");
        return s4.innerHTML = t5, s4;
      }
    };
    R = class {
      constructor(t5, i7) {
        this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
      }
      get parentNode() {
        return this._$AM.parentNode;
      }
      get _$AU() {
        return this._$AM._$AU;
      }
      u(t5) {
        const { el: { content: i7 }, parts: s4 } = this._$AD, e8 = (t5?.creationScope ?? l2).importNode(i7, true);
        P.currentNode = e8;
        let h3 = P.nextNode(), o7 = 0, n5 = 0, r6 = s4[0];
        for (; void 0 !== r6; ) {
          if (o7 === r6.index) {
            let i8;
            2 === r6.type ? i8 = new k(h3, h3.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h3, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h3, this, t5)), this._$AV.push(i8), r6 = s4[++n5];
          }
          o7 !== r6?.index && (h3 = P.nextNode(), o7++);
        }
        return P.currentNode = l2, e8;
      }
      p(t5) {
        let i7 = 0;
        for (const s4 of this._$AV) void 0 !== s4 && (void 0 !== s4.strings ? (s4._$AI(t5, s4, i7), i7 += s4.strings.length - 2) : s4._$AI(t5[i7])), i7++;
      }
    };
    k = class _k {
      get _$AU() {
        return this._$AM?._$AU ?? this._$Cv;
      }
      constructor(t5, i7, s4, e8) {
        this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s4, this.options = e8, this._$Cv = e8?.isConnected ?? true;
      }
      get parentNode() {
        let t5 = this._$AA.parentNode;
        const i7 = this._$AM;
        return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
      }
      get startNode() {
        return this._$AA;
      }
      get endNode() {
        return this._$AB;
      }
      _$AI(t5, i7 = this) {
        t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
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
        const { values: i7, _$litType$: s4 } = t5, e8 = "number" == typeof s4 ? this._$AC(t5) : (void 0 === s4.el && (s4.el = S2.createElement(V(s4.h, s4.h[0]), this.options)), s4);
        if (this._$AH?._$AD === e8) this._$AH.p(i7);
        else {
          const t6 = new R(e8, this), s5 = t6.u(this.options);
          t6.p(i7), this.T(s5), this._$AH = t6;
        }
      }
      _$AC(t5) {
        let i7 = C.get(t5.strings);
        return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
      }
      k(t5) {
        u2(this._$AH) || (this._$AH = [], this._$AR());
        const i7 = this._$AH;
        let s4, e8 = 0;
        for (const h3 of t5) e8 === i7.length ? i7.push(s4 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s4 = i7[e8], s4._$AI(h3), e8++;
        e8 < i7.length && (this._$AR(s4 && s4._$AB.nextSibling, e8), i7.length = e8);
      }
      _$AR(t5 = this._$AA.nextSibling, s4) {
        for (this._$AP?.(false, true, s4); t5 !== this._$AB; ) {
          const s5 = i4(t5).nextSibling;
          i4(t5).remove(), t5 = s5;
        }
      }
      setConnected(t5) {
        void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
      }
    };
    H = class {
      get tagName() {
        return this.element.tagName;
      }
      get _$AU() {
        return this._$AM._$AU;
      }
      constructor(t5, i7, s4, e8, h3) {
        this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e8, this.options = h3, s4.length > 2 || "" !== s4[0] || "" !== s4[1] ? (this._$AH = Array(s4.length - 1).fill(new String()), this.strings = s4) : this._$AH = A;
      }
      _$AI(t5, i7 = this, s4, e8) {
        const h3 = this.strings;
        let o7 = false;
        if (void 0 === h3) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
        else {
          const e9 = t5;
          let n5, r6;
          for (t5 = h3[0], n5 = 0; n5 < h3.length - 1; n5++) r6 = M(this, e9[s4 + n5], i7, n5), r6 === E && (r6 = this._$AH[n5]), o7 ||= !a2(r6) || r6 !== this._$AH[n5], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h3[n5 + 1]), this._$AH[n5] = r6;
        }
        o7 && !e8 && this.j(t5);
      }
      j(t5) {
        t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
      }
    };
    I = class extends H {
      constructor() {
        super(...arguments), this.type = 3;
      }
      j(t5) {
        this.element[this.name] = t5 === A ? void 0 : t5;
      }
    };
    L = class extends H {
      constructor() {
        super(...arguments), this.type = 4;
      }
      j(t5) {
        this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
      }
    };
    z = class extends H {
      constructor(t5, i7, s4, e8, h3) {
        super(t5, i7, s4, e8, h3), this.type = 5;
      }
      _$AI(t5, i7 = this) {
        if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
        const s4 = this._$AH, e8 = t5 === A && s4 !== A || t5.capture !== s4.capture || t5.once !== s4.once || t5.passive !== s4.passive, h3 = t5 !== A && (s4 === A || e8);
        e8 && this.element.removeEventListener(this.name, this, s4), h3 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
      }
      handleEvent(t5) {
        "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
      }
    };
    Z = class {
      constructor(t5, i7, s4) {
        this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s4;
      }
      get _$AU() {
        return this._$AM._$AU;
      }
      _$AI(t5) {
        M(this, t5);
      }
    };
    B = t2.litHtmlPolyfillSupport;
    B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
    D = (t5, i7, s4) => {
      const e8 = s4?.renderBefore ?? i7;
      let h3 = e8._$litPart$;
      if (void 0 === h3) {
        const t6 = s4?.renderBefore ?? null;
        e8._$litPart$ = h3 = new k(i7.insertBefore(c3(), t6), t6, void 0, s4 ?? {});
      }
      return h3._$AI(t5), h3;
    };
  }
});

// ../../node_modules/lit-element/lit-element.js
var s3, i5, o4;
var init_lit_element = __esm({
  "../../node_modules/lit-element/lit-element.js"() {
    init_reactive_element();
    init_reactive_element();
    init_lit_html();
    init_lit_html();
    s3 = globalThis;
    i5 = class extends y {
      constructor() {
        super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
      }
      createRenderRoot() {
        const t5 = super.createRenderRoot();
        return this.renderOptions.renderBefore ??= t5.firstChild, t5;
      }
      update(t5) {
        const r6 = this.render();
        this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
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
    i5._$litElement$ = true, i5["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i5 });
    o4 = s3.litElementPolyfillSupport;
    o4?.({ LitElement: i5 });
    (s3.litElementVersions ??= []).push("4.2.2");
  }
});

// ../../node_modules/lit-html/is-server.js
var init_is_server = __esm({
  "../../node_modules/lit-html/is-server.js"() {
  }
});

// ../../node_modules/lit/index.js
var init_lit = __esm({
  "../../node_modules/lit/index.js"() {
    init_reactive_element();
    init_lit_html();
    init_lit_element();
    init_is_server();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/custom-element.js
var t3;
var init_custom_element = __esm({
  "../../node_modules/@lit/reactive-element/decorators/custom-element.js"() {
    t3 = (t5) => (e8, o7) => {
      void 0 !== o7 ? o7.addInitializer(() => {
        customElements.define(t5, e8);
      }) : customElements.define(t5, e8);
    };
  }
});

// ../../node_modules/@lit/reactive-element/decorators/property.js
function n4(t5) {
  return (e8, o7) => "object" == typeof o7 ? r4(t5, e8, o7) : ((t6, e9, o8) => {
    const r6 = e9.hasOwnProperty(o8);
    return e9.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e9, o8) : void 0;
  })(t5, e8, o7);
}
var o5, r4;
var init_property = __esm({
  "../../node_modules/@lit/reactive-element/decorators/property.js"() {
    init_reactive_element();
    o5 = { attribute: true, type: String, converter: u, reflect: false, hasChanged: f };
    r4 = (t5 = o5, e8, r6) => {
      const { kind: n5, metadata: i7 } = r6;
      let s4 = globalThis.litPropertyMetadata.get(i7);
      if (void 0 === s4 && globalThis.litPropertyMetadata.set(i7, s4 = /* @__PURE__ */ new Map()), "setter" === n5 && ((t5 = Object.create(t5)).wrapped = true), s4.set(r6.name, t5), "accessor" === n5) {
        const { name: o7 } = r6;
        return { set(r7) {
          const n6 = e8.get.call(this);
          e8.set.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
        }, init(e9) {
          return void 0 !== e9 && this.C(o7, void 0, t5, e9), e9;
        } };
      }
      if ("setter" === n5) {
        const { name: o7 } = r6;
        return function(r7) {
          const n6 = this[o7];
          e8.call(this, r7), this.requestUpdate(o7, n6, t5, true, r7);
        };
      }
      throw Error("Unsupported decorator location: " + n5);
    };
  }
});

// ../../node_modules/@lit/reactive-element/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}
var init_state = __esm({
  "../../node_modules/@lit/reactive-element/decorators/state.js"() {
    init_property();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/event-options.js
var init_event_options = __esm({
  "../../node_modules/@lit/reactive-element/decorators/event-options.js"() {
  }
});

// ../../node_modules/@lit/reactive-element/decorators/base.js
var e4;
var init_base = __esm({
  "../../node_modules/@lit/reactive-element/decorators/base.js"() {
    e4 = (e8, t5, c4) => (c4.configurable = true, c4.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e8, t5, c4), c4);
  }
});

// ../../node_modules/@lit/reactive-element/decorators/query.js
function e5(e8, r6) {
  return (n5, s4, i7) => {
    const o7 = (t5) => t5.renderRoot?.querySelector(e8) ?? null;
    if (r6) {
      const { get: e9, set: r7 } = "object" == typeof s4 ? n5 : i7 ?? /* @__PURE__ */ (() => {
        const t5 = /* @__PURE__ */ Symbol();
        return { get() {
          return this[t5];
        }, set(e10) {
          this[t5] = e10;
        } };
      })();
      return e4(n5, s4, { get() {
        let t5 = e9.call(this);
        return void 0 === t5 && (t5 = o7(this), (null !== t5 || this.hasUpdated) && r7.call(this, t5)), t5;
      } });
    }
    return e4(n5, s4, { get() {
      return o7(this);
    } });
  };
}
var init_query = __esm({
  "../../node_modules/@lit/reactive-element/decorators/query.js"() {
    init_base();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/query-all.js
var init_query_all = __esm({
  "../../node_modules/@lit/reactive-element/decorators/query-all.js"() {
    init_base();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/query-async.js
var init_query_async = __esm({
  "../../node_modules/@lit/reactive-element/decorators/query-async.js"() {
    init_base();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/query-assigned-elements.js
var init_query_assigned_elements = __esm({
  "../../node_modules/@lit/reactive-element/decorators/query-assigned-elements.js"() {
    init_base();
  }
});

// ../../node_modules/@lit/reactive-element/decorators/query-assigned-nodes.js
var init_query_assigned_nodes = __esm({
  "../../node_modules/@lit/reactive-element/decorators/query-assigned-nodes.js"() {
    init_base();
  }
});

// ../../node_modules/lit/decorators.js
var init_decorators = __esm({
  "../../node_modules/lit/decorators.js"() {
    init_custom_element();
    init_property();
    init_state();
    init_event_options();
    init_query();
    init_query_all();
    init_query_async();
    init_query_assigned_elements();
    init_query_assigned_nodes();
  }
});

// ../../node_modules/lit-html/directive.js
var t4, e6, i6;
var init_directive = __esm({
  "../../node_modules/lit-html/directive.js"() {
    t4 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
    e6 = (t5) => (...e8) => ({ _$litDirective$: t5, values: e8 });
    i6 = class {
      constructor(t5) {
      }
      get _$AU() {
        return this._$AM._$AU;
      }
      _$AT(t5, e8, i7) {
        this._$Ct = t5, this._$AM = e8, this._$Ci = i7;
      }
      _$AS(t5, e8) {
        return this.update(t5, e8);
      }
      update(t5, e8) {
        return this.render(...e8);
      }
    };
  }
});

// ../../node_modules/lit-html/directives/class-map.js
var e7;
var init_class_map = __esm({
  "../../node_modules/lit-html/directives/class-map.js"() {
    init_lit_html();
    init_directive();
    e7 = e6(class extends i6 {
      constructor(t5) {
        if (super(t5), t5.type !== t4.ATTRIBUTE || "class" !== t5.name || t5.strings?.length > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
      }
      render(t5) {
        return " " + Object.keys(t5).filter((s4) => t5[s4]).join(" ") + " ";
      }
      update(s4, [i7]) {
        if (void 0 === this.st) {
          this.st = /* @__PURE__ */ new Set(), void 0 !== s4.strings && (this.nt = new Set(s4.strings.join(" ").split(/\s/).filter((t5) => "" !== t5)));
          for (const t5 in i7) i7[t5] && !this.nt?.has(t5) && this.st.add(t5);
          return this.render(i7);
        }
        const r6 = s4.element.classList;
        for (const t5 of this.st) t5 in i7 || (r6.remove(t5), this.st.delete(t5));
        for (const t5 in i7) {
          const s5 = !!i7[t5];
          s5 === this.st.has(t5) || this.nt?.has(t5) || (s5 ? (r6.add(t5), this.st.add(t5)) : (r6.remove(t5), this.st.delete(t5)));
        }
        return E;
      }
    });
  }
});

// ../../node_modules/lit/directives/class-map.js
var init_class_map2 = __esm({
  "../../node_modules/lit/directives/class-map.js"() {
    init_class_map();
  }
});

// ../../node_modules/@universal-material/web/button/button.styles.js
var styles;
var init_button_styles = __esm({
  "../../node_modules/@universal-material/web/button/button.styles.js"() {
    init_lit();
    styles = i2`
  :host {
    --u-common-button-line-height: var(--u-label-large-line-height, 1.25rem);
    --u-common-button-font-size: var(--u-label-large-font-size, .875rem);
    --u-common-button-font-weight: var(--u-font-weight-medium, 500);
    --_common-button-padding: var(--u-common-button-padding, 16px);
    --_extra-small-font-size: var(--u-common-button-extra-small-font-size, .875rem);
    --_small-font-size: var(--u-common-button-small-font-size, .875rem);
    --_medium-font-size: var(--u-common-button-medium-font-size, 1rem);
    --_large-font-size: var(--u-common-button-large-font-size, 1.5rem);
    --_extra-large-font-size: var(--u-common-button-extra-large-font-size, 2rem);
    --_extra-small-font-weight: var(--u-common-button-extra-small-font-weight, var(--u-font-weight-medium, 500));
    --_small-font-weight: var(--u-common-button-small-font-weight, var(--u-font-weight-medium, 500));
    --_medium-font-weight: var(--u-common-button-medium-font-weight, var(--u-font-weight-medium, 500));
    --_large-font-weight: var(--u-common-button-large-font-weight, var(--u-font-weight-regular, 400));
    --_extra-large-font-weight: var(--u-common-button-extra-large-font-weight, var(--u-font-weight-regular, 400));
    --_extra-small-size: var(--u-common-button-extra-small-height, 32px);
    --_small-size: var(--u-common-button-small-height, 40px);
    --_medium-size: var(--u-common-button-medium-height, 56px);
    --_large-size: var(--u-common-button-large-height, 96px);
    --_extra-large-size: var(--u-common-button-extra-large-height, 136px);
    --_extra-small-icon-size: var(--u-icon-button-extra-small-icon-size, 1.25rem);
    --_small-icon-size: var(--u-icon-button-small-icon-size, 1.25rem);
    --_medium-icon-size: var(--u-icon-button-medium-icon-size, 1.5rem);
    --_large-icon-size: var(--u-icon-button-large-icon-size, 2rem);
    --_extra-large-icon-size: var(--u-icon-button-extra-large-icon-size, 2.5rem);
    --_extra-small-icon-margin: var(--u-icon-button-extra-small-icon-margin, 8px);
    --_small-icon-margin: var(--u-icon-button-small-icon-margin, 8px);
    --_medium-icon-margin: var(--u-icon-button-medium-icon-margin, 8px);
    --_large-icon-margin: var(--u-icon-button-large-icon-margin, 12px);
    --_extra-large-icon-margin: var(--u-icon-button-extra-large-icon-margin, 16px);
    --_extra-small-padding: var(--u-common-button-extra-small-padding, 12px);
    --_small-padding: var(--u-common-button-small-padding, 16px);
    --_medium-padding: var(--u-common-button-medium-padding, 24px);
    --_large-padding: var(--u-common-button-large-padding, 48px);
    --_extra-large-padding: var(--u-common-button-extra-large-padding, 64px);
    --_extra-small-square-shape-corner: var(--u-common-button-extra-small-square-shape-corner, 12px);
    --_small-square-shape-corner: var(--u-common-button-small-square-shape-corner, 12px);
    --_medium-square-shape-corner: var(--u-common-button-medium-square-shape-corner, 16px);
    --_large-square-shape-corner: var(--u-common-button-large-square-shape-corner, 28px);
    --_extra-large-square-shape-corner: var(--u-common-button-extra-large-square-shape-corner, 28px);
    --_extra-small-pressed-shape-corner: var(--u-common-button-extra-small-pressed-shape-corner, 8px);
    --_small-pressed-shape-corner: var(--u-common-button-small-pressed-shape-corner, 8px);
    --_medium-pressed-shape-corner: var(--u-common-button-medium-pressed-shape-corner, 12px);
    --_large-pressed-shape-corner: var(--u-common-button-large-pressed-shape-corner, 16px);
    --_extra-large-pressed-shape-corner: var(--u-common-button-extra-large-pressed-shape-corner, 16px);
    --_font-size: var(--_small-font-size);
    --_font-weight: var(--_small-font-weight);
    --_padding: var(--_small-padding);
    --_icon-margin: var(--_small-icon-margin);
    --_round-shape-corner: var(--u-common-button-round-shape-corner, calc(var(--_size) / 2));
  }

  .extra-small {
    --_font-size: var(--_extra-small-font-size);
    --_font-weight: var(--_extra-small-font-weight);
    --_padding: var(--_extra-small-padding);
    --_icon-margin: var(--_extra-small-icon-margin);
  }

  .medium {
    --_font-size: var(--_medium-font-size);
    --_font-weight: var(--_medium-font-weight);
    --_padding: var(--_medium-padding);
    --_icon-margin: var(--_medium-icon-margin);
  }

  .large {
    --_font-size: var(--_large-font-size);
    --_font-weight: var(--_large-font-weight);
    --_padding: var(--_large-padding);
    --_icon-margin: var(--_large-icon-margin);
  }

  .extra-large {
    --_font-size: var(--_extra-large-font-size);
    --_font-weight: var(--_extra-large-font-weight);
    --_padding: var(--_extra-large-padding);
    --_icon-margin: var(--_extra-large-icon-margin);
  }

  .container {
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    font-size: var(--_font-size);
    font-weight: var(--_font-weight);
    padding-inline: var(--_padding);
    box-sizing: border-box;
  }

  .filled.primary, .filled.primary.selected {
    background-color: var(--u-filled-button-primary-container-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-filled-button-primary-text-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }
  .filled.secondary, .filled.secondary.selected {
    background-color: var(--u-filled-button-secondary-container-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-filled-button-secondary-text-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }
  .filled.tertiary, .filled.tertiary.selected {
    background-color: var(--u-filled-button-tertiary-container-color, var(--u-color-tertiary, rgb(125, 82, 96)));
    color: var(--u-filled-button-tertiary-text-color, var(--u-color-on-tertiary, rgb(255, 255, 255)));
  }
  .filled.error, .filled.error.selected {
    background-color: var(--u-filled-button-error-container-color, var(--u-color-error, rgb(179, 38, 30)));
    color: var(--u-filled-button-error-text-color, var(--u-color-on-error, rgb(255, 255, 255)));
  }
  .filled.toggle {
    background-color: var(--u-filled-button-container-unselected-color, var(--u-color-surface-container, rgb(243, 237, 247)));
    color: var(--u-filled-button-unselected-text-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }

  .tonal {
    background-color: var(--u-tonal-button-container-color, var(--u-color-secondary-container, rgb(232, 222, 248)));
    color: var(--u-tonal-button-text-color, var(--u-color-on-secondary-container, rgb(29, 25, 43)));
  }
  .tonal.selected {
    background-color: var(--u-tonal-button-container-selected-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-tonal-button-text-selected-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }

  .elevated {
    background-color: var(--u-elevated-button-container-color, var(--u-color-surface-container-low, rgb(247, 242, 250)));
    color: var(--u-elevated-button-text-color, var(--u-color-primary, rgb(103, 80, 164)));
  }
  .elevated.selected {
    background-color: var(--u-elevated-button-container-selected-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-elevated-button-text-selected-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }

  @media (hover: hover) {
    .filled:hover:not(:focus-within):not(:active),
    .tonal:hover:not(:focus-within):not(:active) {
      --u-elevation-level: var(--u-filled-button-hover-elevation-level, 1);
    }
  }
  .text {
    color: var(--u-text-button-text-color, var(--_color-primary));
  }

  .outlined {
    color: var(--u-outlined-button-text-color, var(--u-text-button-text-color, var(--_color-primary)));
    border: 1px solid var(--u-outlined-button-outline-color, var(--u-color-outline, rgb(121, 116, 126)));
  }
  .outlined.selected {
    background-color: var(--u-outlined-button-container-selected-color, var(--u-color-inverse-surface, rgb(50, 47, 53)));
    color: var(--u-outlined-button-text-selected-color, var(--u-color-on-inverse-surface, rgb(245, 239, 247)));
  }
  .outlined.disabled {
    border-color: var(--u-outlined-button-disabled-border-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-outlined-button-disabled-border-opacity, 12%), transparent)) !important;
  }
  .outlined.disabled:not(.selected) {
    background-color: transparent !important;
  }

  .elevated {
    --u-elevation-level: var(--u-elevated-button-elevation-level, 1);
    color: var(--u-elevated-button-text-color, var(--_color-primary));
  }
  @media (hover: hover) {
    .elevated:hover {
      --u-elevation-level: var(--u-elevated-button-hover-elevation-level, 2);
    }
  }

  .container:not(.has-icon) .icon-container {
    display: none;
  }

  .content {
    gap: var(--_icon-margin);
  }

  .icon {
    font-size: var(--_icon-size);
  }

  .trailing-icon .content {
    flex-direction: row-reverse;
  }

  #label {
    display: inline-block;
  }

  .label {
    display: inline-block;
    inset-inline-start: 0;
    transition-duration: calc(var(--_morph-duration) * 0.7);
  }

  .label-container {
    position: relative;
  }
  .label-container.animate {
    transition: width var(--_morph-duration) linear;
  }

  .label-default {
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .label-selected {
    position: absolute;
    opacity: 0;
    transition-delay: 0ms;
  }

  .selected.has-selection-label .label-default {
    position: absolute;
    opacity: 0;
    transition-delay: 0ms;
  }
  .selected.has-selection-label .label-selected {
    position: static;
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }
`;
  }
});

// ../../node_modules/lit-html/directives/if-defined.js
var o6;
var init_if_defined = __esm({
  "../../node_modules/lit-html/directives/if-defined.js"() {
    init_lit_html();
    o6 = (o7) => o7 ?? A;
  }
});

// ../../node_modules/lit/directives/if-defined.js
var init_if_defined2 = __esm({
  "../../node_modules/lit/directives/if-defined.js"() {
    init_if_defined();
  }
});

// ../../node_modules/@universal-material/web/shared/base.styles.js
var styles2;
var init_base_styles = __esm({
  "../../node_modules/@universal-material/web/shared/base.styles.js"() {
    init_lit();
    styles2 = i2`
  :host,
  * {
    --_focus-ring-color: var(--u-focus-ring-color, var(--u-color-secondary, rgb(98, 91, 113)));
    --_focus-ring-outline-offset: var(--u-focus-ring-outline-offset, 2px);
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    box-sizing: border-box;
    outline: 0;
  }

  .force-focus-ring .focus-ring,
  :host(.force-focus-ring) .focus-ring,
  .focus-ring:focus-visible {
    animation: u-focus-pulse 500ms ease;
    animation-fill-mode: forwards;
    outline-offset: var(--_focus-ring-outline-offset);
  }

  @keyframes u-focus-pulse {
    0% {
      outline: 0 solid var(--_focus-ring-color);
    }
    50% {
      outline: 6px solid var(--_focus-ring-color);
    }
    100% {
      outline: 4px solid var(--_focus-ring-color);
    }
  }
`;
  }
});

// ../../node_modules/@universal-material/web/shared/button-wrapper.styles.js
var styles3;
var init_button_wrapper_styles = __esm({
  "../../node_modules/@universal-material/web/shared/button-wrapper.styles.js"() {
    init_lit();
    styles3 = i2`
  :host {
    --_color-primary: var(--u-color-primary, rgb(103, 80, 164));
    -webkit-tap-highlight-color: transparent;
    --u-elevation-level: 0;
    display: inline-block;
  }

  .container {
    position: relative;
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
    appearance: none !important;
  }

  .disabled {
    --u-elevation-level: 0 !important;
    background-color: var(--u-button-disabled-bg-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-button-disabled-background-opacity, 10%), transparent)) !important;
    color: var(--u-button-disabled-text-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-button-disabled-opacity, 38%), transparent)) !important;
  }
  .disabled .button {
    cursor: default;
  }

  * {
    color: inherit;
  }

  u-elevation {
    z-index: -1;
  }

  .button {
    cursor: pointer;
    position: absolute;
    inset-inline-start: 0;
    inset-block-start: 0;
    width: 100%;
    height: 100%;
    font-family: inherit;
    border-radius: inherit;
    color: inherit;
    border: none;
    margin: 0;
    padding: 0;
    text-align: center;
    white-space: nowrap;
    background: transparent;
    user-select: none;
    text-decoration: none;
    outline: 0;
    z-index: 0;
  }

  .content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: inherit;
    width: 100%;
    height: 100%;
  }
`;
  }
});

// ../../node_modules/@universal-material/web/shared/events/redispatch-event.js
var redispatchEvent;
var init_redispatch_event = __esm({
  "../../node_modules/@universal-material/web/shared/events/redispatch-event.js"() {
    redispatchEvent = (element, event, newType = null) => {
      if (event.bubbles && (!element.shadowRoot || event.composed)) {
        event.stopPropagation();
      }
      const copy = Reflect.construct(event.constructor, [newType ?? event.type, event]);
      const dispatched = element.dispatchEvent(copy);
      if (!dispatched) {
        event.preventDefault();
      }
      return dispatched;
    };
  }
});

// ../../node_modules/@universal-material/web/elevation/elevation.styles.js
var styles4;
var init_elevation_styles = __esm({
  "../../node_modules/@universal-material/web/elevation/elevation.styles.js"() {
    init_lit();
    styles4 = i2`
  :host {
    --_level: var(--u-elevation-level, 0);
    --_shadow-color: var(--u-color-shadow, rgb(0, 0, 0));
    -webkit-tap-highlight-color: transparent;
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }
  :host::before, :host::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transition: box-shadow 150ms ease-in-out;
  }
  :host::before {
    box-shadow: 0 calc(1px * (clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 3, 1) + 2 * clamp(0, var(--_level) - 4, 1))) calc(1px * (2 * clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 2, 1) + clamp(0, var(--_level) - 4, 1))) 0 var(--_shadow-color);
    opacity: 0.3;
  }
  :host::after {
    box-shadow: 0 calc(1px * (clamp(0, var(--_level), 1) + clamp(0, var(--_level) - 1, 1) + 2 * clamp(0, var(--_level) - 2, 3))) calc(1px * (3 * clamp(0, var(--_level), 2) + 2 * clamp(0, var(--_level) - 2, 3))) calc(1px * (clamp(0, var(--_level), 4) + 2 * clamp(0, var(--_level) - 4, 1))) var(--_shadow-color);
    opacity: 0.15;
  }
`;
  }
});

// ../../node_modules/@universal-material/web/elevation/elevation.js
var Elevation;
var init_elevation = __esm({
  "../../node_modules/@universal-material/web/elevation/elevation.js"() {
    init_tslib_es6();
    init_lit();
    init_decorators();
    init_elevation_styles();
    Elevation = class Elevation2 extends i5 {
      static {
        this.styles = styles4;
      }
      connectedCallback() {
        super.connectedCallback();
        this.ariaHidden = "true";
      }
    };
    Elevation = __decorate([
      t3("u-elevation")
    ], Elevation);
  }
});

// ../../node_modules/@universal-material/web/ripple/ripple.styles.js
var styles5;
var init_ripple_styles = __esm({
  "../../node_modules/@universal-material/web/ripple/ripple.styles.js"() {
    init_lit();
    styles5 = i2`
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
  }
});

// ../../node_modules/@universal-material/web/ripple/ripple.js
var Ripple_1, Ripple;
var init_ripple = __esm({
  "../../node_modules/@universal-material/web/ripple/ripple.js"() {
    init_tslib_es6();
    init_lit();
    init_decorators();
    init_ripple_styles();
    Ripple = class Ripple2 extends i5 {
      static {
        Ripple_1 = this;
      }
      static {
        this.styles = styles5;
      }
      constructor() {
        super();
        this.isTouching = false;
        this.disabled = false;
      }
      render() {
        return b3`<div class="ripple-container"></div><slot></slot>`;
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
      handleMouseDown(e8) {
        if (this.isTouching || !this.canCreateRipple()) {
          return;
        }
        this.createRipple(e8.clientX, e8.clientY, "mouseup");
      }
      handleTouchStart(e8) {
        if (!this.canCreateRipple()) {
          return;
        }
        this.isTouching = true;
        const dismiss = this.createRipple(e8.touches[0].clientX, e8.touches[0].clientY, "touchend");
        this.addEventListener("touchmove", dismiss);
      }
      canCreateRipple() {
        return !this.disabled;
      }
      createRipple(targetX = null, targetY = null, releaseEventName = null) {
        const preClientRect = this.rippleContainer.getBoundingClientRect();
        targetX ??= preClientRect.x + this.rippleContainer.clientWidth / 2;
        targetY ??= preClientRect.y + this.rippleContainer.clientHeight / 2;
        const ripple = document.createElement("DIV");
        ripple.classList.add("ripple");
        this.rippleContainer.appendChild(ripple);
        requestAnimationFrame(() => {
          const clientRect = this.getBoundingClientRect();
          const largestDimensionSize = Math.max(this.clientWidth, this.clientHeight);
          const rippleSize = largestDimensionSize * 2;
          Ripple_1._setElementSquareSizeAndCenter(ripple, rippleSize);
          ripple.style.setProperty("--_ripple-transition-duration", `${1080 * Math.pow(rippleSize, 0.3)}ms`);
          const x3 = targetX - clientRect.left + (rippleSize - this.rippleContainer.clientWidth) / 2;
          const y3 = targetY - clientRect.top + (rippleSize - this.rippleContainer.clientHeight) / 2;
          ripple.style.transformOrigin = `${x3}px ${y3}px`;
          ripple.classList.add(releaseEventName ? "show" : "show-forced");
        });
        const interval = setInterval(() => {
          if (!ripple.classList.contains("dismiss") && !ripple.classList.contains("show-forced")) {
            return;
          }
          const animations = ripple.getAnimations();
          if (animations.length) {
            return;
          }
          clearInterval(interval);
          ripple.remove();
        }, 1e3);
        if (!releaseEventName) {
          return null;
        }
        return this.createDismissEvent(ripple, releaseEventName);
      }
      createDismissEvent(ripple, releaseEventName) {
        const dismiss = () => {
          ripple.classList.add("dismiss");
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
  }
});

// ../../node_modules/@universal-material/web/shared/button-wrapper.js
var ButtonWrapper;
var init_button_wrapper = __esm({
  "../../node_modules/@universal-material/web/shared/button-wrapper.js"() {
    init_tslib_es6();
    init_lit();
    init_decorators();
    init_class_map2();
    init_if_defined2();
    init_base_styles();
    init_button_wrapper_styles();
    init_redispatch_event();
    init_elevation();
    init_ripple();
    ButtonWrapper = class extends i5 {
      constructor() {
        super(...arguments);
        this.disabled = false;
        this.renderRipple = true;
        this.innerRole = null;
      }
      static {
        this.styles = [styles2, styles3];
      }
      get pathname() {
        return this.buttonElement?.pathname;
      }
      render() {
        const contents = typeof this.href === "string" ? this.#renderLink() : this.#renderButton();
        const containerClasses = e7(this._getContainerClasses());
        return b3`<div class="container ${containerClasses}" part="container"> ${contents}</div>`;
      }
      _getContainerClasses() {
        return { disabled: this.disabled };
      }
      #renderButton() {
        return b3`
      <div class="content">${this._renderContent()}</div>
      <button
        id="button"
        class="button focus-ring"
        ?disabled=${this.disabled}
        aria-label=${this.getAriaLabel() || A}
        aria-labelledby="${this.getAriaLabel() ? A : "text"}"
        .role=${this.innerRole}
        type="button"
        @click=${this.#innerClickHandler}>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
        <u-elevation></u-elevation>
      </button>
    `;
      }
      #renderLink() {
        return b3`
      <div class="content">${this._renderContent()}</div>
      <a
        id="link"
        class="button"
        href=${this.disabled ? A : o6(this.href)}
        aria-disabled=${this.disabled || A}
        aria-label=${this.ariaLabel || A}
        aria-labelledby="${this.ariaLabel ? A : "text"}"
        .role=${this.innerRole}
        target=${this.target || A}
        @click=${this.#innerClickHandler}>
        <u-elevation></u-elevation>
        <u-ripple ?disabled=${this.disabled || !this.renderRipple}></u-ripple>
      </a>
    `;
      }
      connectedCallback() {
        super.connectedCallback();
        this.addEventListener("focus", this.#innerFocusHandler);
      }
      disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("focus", this.#innerFocusHandler);
      }
      focus() {
        this.buttonElement?.focus();
      }
      blur() {
        this.buttonElement?.blur();
      }
      getAriaLabel() {
        return this.ariaLabel;
      }
      #innerFocusHandler() {
        const tabIndexAttributeValue = this.getAttribute("tabindex");
        if (tabIndexAttributeValue !== "0") {
          return;
        }
        this.removeAttribute("tabindex");
        setTimeout(() => this.buttonElement?.focus());
      }
      #innerClickHandler(event) {
        if (this.disabled) {
          return;
        }
        const preventDefault = !redispatchEvent(this, event);
        if (preventDefault) {
          return;
        }
        if (!event.pointerType) {
          this._ripple.createRipple();
        }
        this._handleClick(event);
      }
      _handleClick(_2) {
      }
    };
    __decorate([
      n4({ type: Boolean, reflect: true })
    ], ButtonWrapper.prototype, "disabled", void 0);
    __decorate([
      r5()
    ], ButtonWrapper.prototype, "renderRipple", void 0);
    __decorate([
      n4()
    ], ButtonWrapper.prototype, "href", void 0);
    __decorate([
      n4()
    ], ButtonWrapper.prototype, "target", void 0);
    __decorate([
      n4()
    ], ButtonWrapper.prototype, "name", void 0);
    __decorate([
      e5(".button")
    ], ButtonWrapper.prototype, "buttonElement", void 0);
    __decorate([
      e5("u-ripple")
    ], ButtonWrapper.prototype, "_ripple", void 0);
  }
});

// ../../node_modules/@universal-material/web/button/button-base.styles.js
var styles6;
var init_button_base_styles = __esm({
  "../../node_modules/@universal-material/web/button/button-base.styles.js"() {
    init_lit();
    styles6 = i2`
  :host {
    --_morph-duration: var(--u-button-morph-duration, 125ms);
  }

  .container {
    transition: background-color var(--_morph-duration) linear, border-radius var(--_morph-duration) linear, color var(--_morph-duration) linear;
  }

  .icon {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1em;
    height: 1em;
    line-height: 1em;
  }

  ::slotted([slot=icon]) {
    display: inline-block;
  }
`;
  }
});

// ../../node_modules/@universal-material/web/button/button-base.js
var ButtonBase;
var init_button_base = __esm({
  "../../node_modules/@universal-material/web/button/button-base.js"() {
    init_tslib_es6();
    init_decorators();
    init_button_wrapper();
    init_button_base_styles();
    ButtonBase = class extends ButtonWrapper {
      static {
        this.formAssociated = true;
      }
      static {
        this.styles = [ButtonWrapper.styles, styles6];
      }
      get form() {
        return this.#elementInternals.form;
      }
      #elementInternals;
      constructor() {
        super();
        this.type = "submit";
        this.value = "";
        this.#elementInternals = this.attachInternals();
      }
      _handleClick(_2) {
        if (this.type === "button" || !!this.href) {
          return;
        }
        if (!this.form) {
          return;
        }
        this.#elementInternals.setFormValue(this.value);
        if (this.type === "reset") {
          this.form.reset();
          return;
        }
        this.form.addEventListener("submit", (submitEvent) => {
          Object.defineProperty(submitEvent, "submitter", {
            configurable: true,
            enumerable: true,
            get: () => this
          });
        }, { capture: true, once: true });
        this.form.requestSubmit();
      }
    };
    __decorate([
      n4()
    ], ButtonBase.prototype, "type", void 0);
    __decorate([
      n4({ reflect: true })
    ], ButtonBase.prototype, "value", void 0);
  }
});

// ../../node_modules/@universal-material/web/button/toggle-button.styles.js
var styles7;
var init_toggle_button_styles = __esm({
  "../../node_modules/@universal-material/web/button/toggle-button.styles.js"() {
    init_lit();
    styles7 = i2`
  :host {
    --_size: var(--_small-size);
    --_square-shape-corner: var(--_small-square-shape-corner);
    --_pressed-shape-corner: var(--_small-pressed-shape-corner);
    --_icon-size: var(--_small-icon-size);
  }

  .extra-small {
    --_size: var(--_extra-small-size);
    --_icon-size: var(--_extra-small-icon-size);
    --_square-shape-corner: var(--_extra-small-square-shape-corner);
    --_pressed-shape-corner: var(--_extra-small-pressed-shape-corner);
  }

  .medium {
    --_size: var(--_medium-size);
    --_icon-size: var(--_medium-icon-size);
    --_square-shape-corner: var(--_medium-square-shape-corner);
    --_pressed-shape-corner: var(--_medium-pressed-shape-corner);
  }

  .large {
    --_size: var(--_large-size);
    --_icon-size: var(--_large-icon-size);
    --_square-shape-corner: var(--_large-square-shape-corner);
    --_pressed-shape-corner: var(--_large-pressed-shape-corner);
  }

  .extra-large {
    --_size: var(--_extra-large-size);
    --_icon-size: var(--_extra-large-icon-size);
    --_square-shape-corner: var(--_extra-large-square-shape-corner);
    --_pressed-shape-corner: var(--_extra-large-pressed-shape-corner);
  }

  .container {
    height: var(--_size);
  }

  .round {
    border-radius: var(--_round-shape-corner);
  }

  .square {
    border-radius: var(--_square-shape-corner);
  }

  .selected.toggle-shape.round {
    border-radius: var(--_square-shape-corner);
  }
  .selected.toggle-shape.square {
    border-radius: var(--_round-shape-corner);
  }

  :host(:active) .toggle-shape:not(.disabled) {
    border-radius: var(--_pressed-shape-corner);
  }

  .icon-container {
    position: relative;
    width: var(--_icon-size);
    height: 1px;
  }

  .icon-default {
    opacity: 1;
  }

  .icon-selected {
    opacity: 0;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .selected.selection-icon .icon-default {
    opacity: 0;
    transition-delay: 0ms;
  }
  .selected.selection-icon .icon-selected {
    opacity: 1;
    transition-delay: calc(var(--_morph-duration) / 2);
  }

  .icon {
    position: absolute;
    top: 50%;
    left: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: var(--_icon-size);
    transform: translate3d(-50%, -50%, 0);
    transition: opacity var(--_morph-duration) linear;
  }
`;
  }
});

// ../../node_modules/@universal-material/web/button/toggle-button.js
var ToggleButton;
var init_toggle_button = __esm({
  "../../node_modules/@universal-material/web/button/toggle-button.js"() {
    init_tslib_es6();
    init_decorators();
    init_button_base();
    init_toggle_button_styles();
    ToggleButton = class extends ButtonBase {
      constructor() {
        super(...arguments);
        this.toggle = false;
        this.toggleShape = false;
        this.selected = false;
        this.shape = "round";
        this.size = "small";
        this.ariaLabelSelected = "";
        this._hasSelectionIcon = false;
      }
      static {
        this.styles = [ButtonBase.styles, styles7];
      }
      _getContainerClasses() {
        return {
          ...super._getContainerClasses(),
          [this.shape]: true,
          [this.size]: true,
          selected: this.selected,
          toggle: this.toggle,
          "toggle-shape": this.toggleShape,
          "selection-icon": this._hasSelectionIcon
        };
      }
      _handleClick(event) {
        super._handleClick(event);
        if (!this.toggle) {
          return;
        }
        this.selected = !this.selected;
        this.dispatchEvent(new Event("change", { bubbles: true }));
      }
      getAriaLabel() {
        return this.selected ? this.ariaLabelSelected || super.getAriaLabel() : super.getAriaLabel();
      }
      _handleSelectedIconSlotChange(e8) {
        this._hasSelectionIcon = e8.target.assignedElements({ flatten: true }).length > 0;
      }
    };
    __decorate([
      n4({ type: Boolean, reflect: true })
    ], ToggleButton.prototype, "toggle", void 0);
    __decorate([
      n4({ attribute: "toggle-shape", type: Boolean, reflect: true })
    ], ToggleButton.prototype, "toggleShape", void 0);
    __decorate([
      n4({ type: Boolean, reflect: true })
    ], ToggleButton.prototype, "selected", void 0);
    __decorate([
      n4({ reflect: true })
    ], ToggleButton.prototype, "shape", void 0);
    __decorate([
      n4({ reflect: true })
    ], ToggleButton.prototype, "size", void 0);
    __decorate([
      n4({ attribute: "aria-label-selected" })
    ], ToggleButton.prototype, "ariaLabelSelected", void 0);
    __decorate([
      r5()
    ], ToggleButton.prototype, "_hasSelectionIcon", void 0);
  }
});

// ../../node_modules/@universal-material/web/button/button.js
var Button;
var init_button = __esm({
  "../../node_modules/@universal-material/web/button/button.js"() {
    init_tslib_es6();
    init_lit();
    init_decorators();
    init_class_map2();
    init_button_styles();
    init_toggle_button();
    init_ripple();
    Button = class Button2 extends ToggleButton {
      constructor() {
        super(...arguments);
        this.variant = "filled";
        this.color = "primary";
        this.trailingIcon = false;
        this._hasIcon = false;
        this._hasSelectionLabel = false;
        this.animateTextChange = false;
      }
      static {
        this.styles = [ToggleButton.styles, styles];
      }
      #textSizeObserver;
      firstUpdated(changedProperties) {
        super.firstUpdated(changedProperties);
        this.#textSizeObserver = new ResizeObserver(() => this.#setTextWrapperWidth());
        this.#textSizeObserver.observe(this._text);
        this.#setTextWrapperWidth();
      }
      #setTextWrapperWidth() {
        const width = `${this._text.offsetWidth}px`;
        this._textWrapper.style.width = width;
        const animateTextChange = !!parseInt(width, 10);
        if (this.animateTextChange === animateTextChange) {
          return;
        }
        setTimeout(() => this.animateTextChange = animateTextChange);
      }
      _getContainerClasses() {
        return {
          ...super._getContainerClasses(),
          [this.color]: true,
          [this.variant]: true,
          "trailing-icon": this.trailingIcon,
          "has-icon": this._hasIcon,
          "has-selection-label": this._hasSelectionLabel
        };
      }
      _renderContent() {
        const labelContainerClasses = { animate: this.animateTextChange };
        return b3`
      <span class="icon-container" aria-hidden="true">
        <span class="icon icon-default">
          <slot name="icon" @slotchange="${this.#handleIconSlotChange}"></slot>
        </span>
        <span class="icon icon-selected">
          <slot name="icon-selected" @slotchange="${this._handleSelectedIconSlotChange}"></slot>
        </span>
      </span>

      <span class="label-container ${e7(labelContainerClasses)}">
        <span id="label">
          <span class="label label-default">
            <slot></slot>
          </span>
          <span class="label label-selected">
            <slot name="label-selected" @slotchange="${this.#handleSelectedLabelSlotChange}"></slot>
          </span>
        </span>
      </span>
    `;
      }
      #handleIconSlotChange(e8) {
        this._hasIcon = e8.target.assignedElements({ flatten: true }).length > 0;
      }
      #handleSelectedLabelSlotChange(e8) {
        this._hasSelectionLabel = e8.target.assignedElements({ flatten: true }).length > 0;
      }
    };
    __decorate([
      n4()
    ], Button.prototype, "variant", void 0);
    __decorate([
      n4()
    ], Button.prototype, "color", void 0);
    __decorate([
      n4({ type: Boolean, attribute: "trailing-icon", reflect: true })
    ], Button.prototype, "trailingIcon", void 0);
    __decorate([
      r5()
    ], Button.prototype, "_hasIcon", void 0);
    __decorate([
      r5()
    ], Button.prototype, "_hasSelectionLabel", void 0);
    __decorate([
      r5()
    ], Button.prototype, "animateTextChange", void 0);
    __decorate([
      e5(".label-container", true)
    ], Button.prototype, "_textWrapper", void 0);
    __decorate([
      e5("#label", true)
    ], Button.prototype, "_text", void 0);
    Button = __decorate([
      t3("u-button")
    ], Button);
  }
});

// ../../node_modules/@universal-material/web/button/icon-button.styles.js
var styles8;
var init_icon_button_styles = __esm({
  "../../node_modules/@universal-material/web/button/icon-button.styles.js"() {
    init_lit();
    styles8 = i2`
  :host {
    --_round-shape-corner: var(--u-icon-button-round-shape-corner, calc(var(--_size) / 2));
    --_square-shape-corner: var(--u-icon-button-square-shape-corner, 12px);
    --_extra-small-size: var(--u-icon-button-extra-small-size, 32px);
    --_small-size: var(--u-icon-button-small-size, 40px);
    --_medium-size: var(--u-icon-button-medium-size, 56px);
    --_large-size: var(--u-icon-button-large-size, 96px);
    --_extra-large-size: var(--u-icon-button-extra-large-size, 136px);
    --_extra-small-narrow-width: var(--u-icon-button-extra-small-narrow-width, 28px);
    --_small-narrow-width: var(--u-icon-button-small-narrow-width, 32px);
    --_medium-narrow-width: var(--u-icon-button-medium-narrow-width, 48px);
    --_large-narrow-width: var(--u-icon-button-large-narrow-width, 64px);
    --_extra-large-narrow-width: var(--u-icon-button-extra-large-narrow-width, 104px);
    --_extra-small-wide-width: var(--u-icon-button-extra-small-wide-width, 40px);
    --_small-wide-width: var(--u-icon-button-small-wide-width, 52px);
    --_medium-wide-width: var(--u-icon-button-medium-wide-width, 72px);
    --_large-wide-width: var(--u-icon-button-large-wide-width, 128px);
    --_extra-large-wide-width: var(--u-icon-button-extra-large-wide-width, 184px);
    --_extra-small-icon-size: var(--u-icon-button-extra-small-icon-size, 1.25rem);
    --_small-icon-size: var(--u-icon-button-small-icon-size, 1.5rem);
    --_medium-icon-size: var(--u-icon-button-medium-icon-size, 1.5rem);
    --_large-icon-size: var(--u-icon-button-large-icon-size, 2rem);
    --_extra-large-icon-size: var(--u-icon-button-extra-large-icon-size, 2.5rem);
    --_extra-small-square-shape-corner: var(--u-icon-button-extra-small-square-shape-corner, 12px);
    --_small-square-shape-corner: var(--u-icon-button-small-square-shape-corner, 12px);
    --_medium-square-shape-corner: var(--u-icon-button-medium-square-shape-corner, 16px);
    --_large-square-shape-corner: var(--u-icon-button-large-square-shape-corner, 28px);
    --_extra-large-square-shape-corner: var(--u-icon-button-extra-large-square-shape-corner, 28px);
    --_extra-small-pressed-shape-corner: var(--u-icon-button-extra-small-pressed-shape-corner, 8px);
    --_small-pressed-shape-corner: var(--u-icon-button-small-pressed-shape-corner, 8px);
    --_medium-pressed-shape-corner: var(--u-icon-button-medium-pressed-shape-corner, 12px);
    --_large-pressed-shape-corner: var(--u-icon-button-large-pressed-shape-corner, 16px);
    --_extra-large-pressed-shape-corner: var(--u-icon-button-extra-large-pressed-shape-corner, 16px);
    --_narrow-width: var(--_small-narrow-width);
    --_wide-width: var(--_small-wide-width);
  }

  .container {
    width: var(--_size);
    height: var(--_size);
    font-family: var(--u-font-family, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");
  }

  .extra-small {
    --_narrow-width: var(--_extra-small-narrow-width);
    --_wide-width: var(--_extra-small-wide-width);
  }

  .medium {
    --_narrow-width: var(--_medium-narrow-width);
    --_wide-width: var(--_medium-wide-width);
  }

  .large {
    --_narrow-width: var(--_large-narrow-width);
    --_wide-width: var(--_large-wide-width);
  }

  .extra-large {
    --_narrow-width: var(--_extra-large-narrow-width);
    --_wide-width: var(--_extra-large-wide-width);
  }

  .narrow {
    width: var(--_narrow-width);
  }

  .wide {
    width: var(--_wide-width);
  }

  .filled, .filled.selected {
    background-color: var(--u-filled-icon-button-container-color, var(--u-color-primary, rgb(103, 80, 164)));
    color: var(--u-filled-icon-button-text-color, var(--u-color-on-primary, rgb(255, 255, 255)));
  }
  .filled.toggle {
    background-color: var(--u-filled-icon-button-unselected-container-color, var(--u-color-surface-container, rgb(243, 237, 247)));
    color: var(--u-filled-icon-button-unselected-text-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }

  .tonal {
    background-color: var(--u-total-icon-button-unselected-container-color, var(--u-color-secondary-container, rgb(232, 222, 248)));
    color: var(--u-tonal-icon-button-unselected-text-color, var(--u-color-on-secondary-container, rgb(29, 25, 43)));
  }
  .tonal.selected {
    background-color: var(--u-tonal-icon-button-container-color, var(--u-color-secondary, rgb(98, 91, 113)));
    color: var(--u-tonal-icon-button-text-color, var(--u-color-on-secondary, rgb(255, 255, 255)));
  }

  .standard {
    color: var(--u-standard-icon-button-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }
  .standard.selected {
    color: var(--u-standard-icon-button-selected-text-color, var(--u-color-primary, rgb(103, 80, 164)));
    background-color: var(--u-standard-icon-button-selected-container-color, transparent);
  }

  .outlined {
    color: var(--u-outlined-icon-button-color, var(--u-color-on-surface-variant, rgb(73, 69, 79)));
  }
  .outlined, .outlined.selected.disabled {
    border: 1px solid var(--u-color-outline-variant, rgb(202, 196, 208));
  }
  .outlined.selected {
    border: none;
    background-color: var(--u-outlined-icon-button-selected-container-color, var(--u-color-inverse-surface, rgb(50, 47, 53)));
    color: var(--u-outlined-icon-button-selected-text-color, var(--u-color-on-inverse-surface, rgb(245, 239, 247)));
  }
  .outlined.disabled {
    color: var(--u-outlined-icon-button-disabled-icon-color, color-mix(in srgb, var(--u-color-on-surface, rgb(29, 27, 32)) var(--u-outlined-icon-button-disabled-border-opacity, 10%), transparent)) !important;
  }
`;
  }
});

// ../../node_modules/@universal-material/web/button/icon-button.js
var IconButton;
var init_icon_button = __esm({
  "../../node_modules/@universal-material/web/button/icon-button.js"() {
    init_tslib_es6();
    init_lit();
    init_decorators();
    init_icon_button_styles();
    init_toggle_button();
    IconButton = class IconButton2 extends ToggleButton {
      constructor() {
        super(...arguments);
        this.variant = "standard";
        this.width = "default";
      }
      static {
        this.styles = [ToggleButton.styles, styles8];
      }
      _getContainerClasses() {
        return {
          ...super._getContainerClasses(),
          [this.variant]: true,
          [this.width]: true
        };
      }
      _renderContent() {
        return b3`
      <span class="icon-container" aria-hidden="true">
        <span class="icon icon-default">
          <slot></slot>
        </span>
        <span class="icon icon-selected">
          <slot name="selected" @slotchange="${this._handleSelectedIconSlotChange}"></slot>
        </span>
      </span>
    `;
      }
    };
    __decorate([
      n4()
    ], IconButton.prototype, "variant", void 0);
    __decorate([
      n4()
    ], IconButton.prototype, "width", void 0);
    IconButton = __decorate([
      t3("u-icon-button")
    ], IconButton);
  }
});

// ../../node_modules/@material/material-color-utilities/utils/math_utils.js
function signum(num) {
  if (num < 0) {
    return -1;
  } else if (num === 0) {
    return 0;
  } else {
    return 1;
  }
}
function lerp(start, stop, amount) {
  return (1 - amount) * start + amount * stop;
}
function clampInt(min, max2, input) {
  if (input < min) {
    return min;
  } else if (input > max2) {
    return max2;
  }
  return input;
}
function clampDouble(min, max2, input) {
  if (input < min) {
    return min;
  } else if (input > max2) {
    return max2;
  }
  return input;
}
function sanitizeDegreesInt(degrees) {
  degrees = degrees % 360;
  if (degrees < 0) {
    degrees = degrees + 360;
  }
  return degrees;
}
function sanitizeDegreesDouble(degrees) {
  degrees = degrees % 360;
  if (degrees < 0) {
    degrees = degrees + 360;
  }
  return degrees;
}
function differenceDegrees(a3, b5) {
  return 180 - Math.abs(Math.abs(a3 - b5) - 180);
}
function matrixMultiply(row, matrix) {
  const a3 = row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2];
  const b5 = row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2];
  const c4 = row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2];
  return [a3, b5, c4];
}
var init_math_utils = __esm({
  "../../node_modules/@material/material-color-utilities/utils/math_utils.js"() {
  }
});

// ../../node_modules/@material/material-color-utilities/utils/color_utils.js
function argbFromRgb(red, green, blue) {
  return (255 << 24 | (red & 255) << 16 | (green & 255) << 8 | blue & 255) >>> 0;
}
function argbFromLinrgb(linrgb) {
  const r6 = delinearized(linrgb[0]);
  const g2 = delinearized(linrgb[1]);
  const b5 = delinearized(linrgb[2]);
  return argbFromRgb(r6, g2, b5);
}
function redFromArgb(argb) {
  return argb >> 16 & 255;
}
function greenFromArgb(argb) {
  return argb >> 8 & 255;
}
function blueFromArgb(argb) {
  return argb & 255;
}
function argbFromXyz(x3, y3, z2) {
  const matrix = XYZ_TO_SRGB;
  const linearR = matrix[0][0] * x3 + matrix[0][1] * y3 + matrix[0][2] * z2;
  const linearG = matrix[1][0] * x3 + matrix[1][1] * y3 + matrix[1][2] * z2;
  const linearB = matrix[2][0] * x3 + matrix[2][1] * y3 + matrix[2][2] * z2;
  const r6 = delinearized(linearR);
  const g2 = delinearized(linearG);
  const b5 = delinearized(linearB);
  return argbFromRgb(r6, g2, b5);
}
function xyzFromArgb(argb) {
  const r6 = linearized(redFromArgb(argb));
  const g2 = linearized(greenFromArgb(argb));
  const b5 = linearized(blueFromArgb(argb));
  return matrixMultiply([r6, g2, b5], SRGB_TO_XYZ);
}
function argbFromLstar(lstar) {
  const y3 = yFromLstar(lstar);
  const component = delinearized(y3);
  return argbFromRgb(component, component, component);
}
function lstarFromArgb(argb) {
  const y3 = xyzFromArgb(argb)[1];
  return 116 * labF(y3 / 100) - 16;
}
function yFromLstar(lstar) {
  return 100 * labInvf((lstar + 16) / 116);
}
function lstarFromY(y3) {
  return labF(y3 / 100) * 116 - 16;
}
function linearized(rgbComponent) {
  const normalized = rgbComponent / 255;
  if (normalized <= 0.040449936) {
    return normalized / 12.92 * 100;
  } else {
    return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100;
  }
}
function delinearized(rgbComponent) {
  const normalized = rgbComponent / 100;
  let delinearized2 = 0;
  if (normalized <= 31308e-7) {
    delinearized2 = normalized * 12.92;
  } else {
    delinearized2 = 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
  }
  return clampInt(0, 255, Math.round(delinearized2 * 255));
}
function whitePointD65() {
  return WHITE_POINT_D65;
}
function labF(t5) {
  const e8 = 216 / 24389;
  const kappa = 24389 / 27;
  if (t5 > e8) {
    return Math.pow(t5, 1 / 3);
  } else {
    return (kappa * t5 + 16) / 116;
  }
}
function labInvf(ft) {
  const e8 = 216 / 24389;
  const kappa = 24389 / 27;
  const ft3 = ft * ft * ft;
  if (ft3 > e8) {
    return ft3;
  } else {
    return (116 * ft - 16) / kappa;
  }
}
var SRGB_TO_XYZ, XYZ_TO_SRGB, WHITE_POINT_D65;
var init_color_utils = __esm({
  "../../node_modules/@material/material-color-utilities/utils/color_utils.js"() {
    init_math_utils();
    SRGB_TO_XYZ = [
      [0.41233895, 0.35762064, 0.18051042],
      [0.2126, 0.7152, 0.0722],
      [0.01932141, 0.11916382, 0.95034478]
    ];
    XYZ_TO_SRGB = [
      [
        3.2413774792388685,
        -1.5376652402851851,
        -0.49885366846268053
      ],
      [
        -0.9691452513005321,
        1.8758853451067872,
        0.04156585616912061
      ],
      [
        0.05562093689691305,
        -0.20395524564742123,
        1.0571799111220335
      ]
    ];
    WHITE_POINT_D65 = [95.047, 100, 108.883];
  }
});

// ../../node_modules/@material/material-color-utilities/hct/viewing_conditions.js
var ViewingConditions;
var init_viewing_conditions = __esm({
  "../../node_modules/@material/material-color-utilities/hct/viewing_conditions.js"() {
    init_color_utils();
    init_math_utils();
    ViewingConditions = class _ViewingConditions {
      /**
       * Create ViewingConditions from a simple, physically relevant, set of
       * parameters.
       *
       * @param whitePoint White point, measured in the XYZ color space.
       *     default = D65, or sunny day afternoon
       * @param adaptingLuminance The luminance of the adapting field. Informally,
       *     how bright it is in the room where the color is viewed. Can be
       *     calculated from lux by multiplying lux by 0.0586. default = 11.72,
       *     or 200 lux.
       * @param backgroundLstar The lightness of the area surrounding the color.
       *     measured by L* in L*a*b*. default = 50.0
       * @param surround A general description of the lighting surrounding the
       *     color. 0 is pitch dark, like watching a movie in a theater. 1.0 is a
       *     dimly light room, like watching TV at home at night. 2.0 means there
       *     is no difference between the lighting on the color and around it.
       *     default = 2.0
       * @param discountingIlluminant Whether the eye accounts for the tint of the
       *     ambient lighting, such as knowing an apple is still red in green light.
       *     default = false, the eye does not perform this process on
       *       self-luminous objects like displays.
       */
      static make(whitePoint = whitePointD65(), adaptingLuminance = 200 / Math.PI * yFromLstar(50) / 100, backgroundLstar = 50, surround = 2, discountingIlluminant = false) {
        const xyz = whitePoint;
        const rW = xyz[0] * 0.401288 + xyz[1] * 0.650173 + xyz[2] * -0.051461;
        const gW = xyz[0] * -0.250268 + xyz[1] * 1.204414 + xyz[2] * 0.045854;
        const bW = xyz[0] * -2079e-6 + xyz[1] * 0.048952 + xyz[2] * 0.953127;
        const f3 = 0.8 + surround / 10;
        const c4 = f3 >= 0.9 ? lerp(0.59, 0.69, (f3 - 0.9) * 10) : lerp(0.525, 0.59, (f3 - 0.8) * 10);
        let d3 = discountingIlluminant ? 1 : f3 * (1 - 1 / 3.6 * Math.exp((-adaptingLuminance - 42) / 92));
        d3 = d3 > 1 ? 1 : d3 < 0 ? 0 : d3;
        const nc = f3;
        const rgbD = [
          d3 * (100 / rW) + 1 - d3,
          d3 * (100 / gW) + 1 - d3,
          d3 * (100 / bW) + 1 - d3
        ];
        const k2 = 1 / (5 * adaptingLuminance + 1);
        const k4 = k2 * k2 * k2 * k2;
        const k4F = 1 - k4;
        const fl2 = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5 * adaptingLuminance);
        const n5 = yFromLstar(backgroundLstar) / whitePoint[1];
        const z2 = 1.48 + Math.sqrt(n5);
        const nbb = 0.725 / Math.pow(n5, 0.2);
        const ncb = nbb;
        const rgbAFactors = [
          Math.pow(fl2 * rgbD[0] * rW / 100, 0.42),
          Math.pow(fl2 * rgbD[1] * gW / 100, 0.42),
          Math.pow(fl2 * rgbD[2] * bW / 100, 0.42)
        ];
        const rgbA = [
          400 * rgbAFactors[0] / (rgbAFactors[0] + 27.13),
          400 * rgbAFactors[1] / (rgbAFactors[1] + 27.13),
          400 * rgbAFactors[2] / (rgbAFactors[2] + 27.13)
        ];
        const aw = (2 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;
        return new _ViewingConditions(n5, aw, nbb, ncb, c4, nc, rgbD, fl2, Math.pow(fl2, 0.25), z2);
      }
      /**
       * Parameters are intermediate values of the CAM16 conversion process. Their
       * names are shorthand for technical color science terminology, this class
       * would not benefit from documenting them individually. A brief overview
       * is available in the CAM16 specification, and a complete overview requires
       * a color science textbook, such as Fairchild's Color Appearance Models.
       */
      constructor(n5, aw, nbb, ncb, c4, nc, rgbD, fl2, fLRoot, z2) {
        this.n = n5;
        this.aw = aw;
        this.nbb = nbb;
        this.ncb = ncb;
        this.c = c4;
        this.nc = nc;
        this.rgbD = rgbD;
        this.fl = fl2;
        this.fLRoot = fLRoot;
        this.z = z2;
      }
    };
    ViewingConditions.DEFAULT = ViewingConditions.make();
  }
});

// ../../node_modules/@material/material-color-utilities/hct/cam16.js
var Cam16;
var init_cam16 = __esm({
  "../../node_modules/@material/material-color-utilities/hct/cam16.js"() {
    init_color_utils();
    init_math_utils();
    init_viewing_conditions();
    Cam16 = class _Cam16 {
      /**
       * All of the CAM16 dimensions can be calculated from 3 of the dimensions, in
       * the following combinations:
       *      -  {j or q} and {c, m, or s} and hue
       *      - jstar, astar, bstar
       * Prefer using a static method that constructs from 3 of those dimensions.
       * This constructor is intended for those methods to use to return all
       * possible dimensions.
       *
       * @param hue
       * @param chroma informally, colorfulness / color intensity. like saturation
       *     in HSL, except perceptually accurate.
       * @param j lightness
       * @param q brightness; ratio of lightness to white point's lightness
       * @param m colorfulness
       * @param s saturation; ratio of chroma to white point's chroma
       * @param jstar CAM16-UCS J coordinate
       * @param astar CAM16-UCS a coordinate
       * @param bstar CAM16-UCS b coordinate
       */
      constructor(hue, chroma, j, q, m2, s4, jstar, astar, bstar) {
        this.hue = hue;
        this.chroma = chroma;
        this.j = j;
        this.q = q;
        this.m = m2;
        this.s = s4;
        this.jstar = jstar;
        this.astar = astar;
        this.bstar = bstar;
      }
      /**
       * CAM16 instances also have coordinates in the CAM16-UCS space, called J*,
       * a*, b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
       * specification, and is used to measure distances between colors.
       */
      distance(other) {
        const dJ = this.jstar - other.jstar;
        const dA = this.astar - other.astar;
        const dB = this.bstar - other.bstar;
        const dEPrime = Math.sqrt(dJ * dJ + dA * dA + dB * dB);
        const dE = 1.41 * Math.pow(dEPrime, 0.63);
        return dE;
      }
      /**
       * @param argb ARGB representation of a color.
       * @return CAM16 color, assuming the color was viewed in default viewing
       *     conditions.
       */
      static fromInt(argb) {
        return _Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT);
      }
      /**
       * @param argb ARGB representation of a color.
       * @param viewingConditions Information about the environment where the color
       *     was observed.
       * @return CAM16 color.
       */
      static fromIntInViewingConditions(argb, viewingConditions) {
        const red = (argb & 16711680) >> 16;
        const green = (argb & 65280) >> 8;
        const blue = argb & 255;
        const redL = linearized(red);
        const greenL = linearized(green);
        const blueL = linearized(blue);
        const x3 = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL;
        const y3 = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL;
        const z2 = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL;
        const rC = 0.401288 * x3 + 0.650173 * y3 - 0.051461 * z2;
        const gC = -0.250268 * x3 + 1.204414 * y3 + 0.045854 * z2;
        const bC = -2079e-6 * x3 + 0.048952 * y3 + 0.953127 * z2;
        const rD = viewingConditions.rgbD[0] * rC;
        const gD = viewingConditions.rgbD[1] * gC;
        const bD = viewingConditions.rgbD[2] * bC;
        const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100, 0.42);
        const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100, 0.42);
        const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100, 0.42);
        const rA = signum(rD) * 400 * rAF / (rAF + 27.13);
        const gA = signum(gD) * 400 * gAF / (gAF + 27.13);
        const bA = signum(bD) * 400 * bAF / (bAF + 27.13);
        const a3 = (11 * rA + -12 * gA + bA) / 11;
        const b5 = (rA + gA - 2 * bA) / 9;
        const u3 = (20 * rA + 20 * gA + 21 * bA) / 20;
        const p22 = (40 * rA + 20 * gA + bA) / 20;
        const atan2 = Math.atan2(b5, a3);
        const atanDegrees = atan2 * 180 / Math.PI;
        const hue = atanDegrees < 0 ? atanDegrees + 360 : atanDegrees >= 360 ? atanDegrees - 360 : atanDegrees;
        const hueRadians = hue * Math.PI / 180;
        const ac = p22 * viewingConditions.nbb;
        const j = 100 * Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
        const q = 4 / viewingConditions.c * Math.sqrt(j / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
        const huePrime = hue < 20.14 ? hue + 360 : hue;
        const eHue = 0.25 * (Math.cos(huePrime * Math.PI / 180 + 2) + 3.8);
        const p1 = 5e4 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;
        const t5 = p1 * Math.sqrt(a3 * a3 + b5 * b5) / (u3 + 0.305);
        const alpha = Math.pow(t5, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        const c4 = alpha * Math.sqrt(j / 100);
        const m2 = c4 * viewingConditions.fLRoot;
        const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
        const jstar = (1 + 100 * 7e-3) * j / (1 + 7e-3 * j);
        const mstar = 1 / 0.0228 * Math.log(1 + 0.0228 * m2);
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new _Cam16(hue, c4, j, q, m2, s4, jstar, astar, bstar);
      }
      /**
       * @param j CAM16 lightness
       * @param c CAM16 chroma
       * @param h CAM16 hue
       */
      static fromJch(j, c4, h3) {
        return _Cam16.fromJchInViewingConditions(j, c4, h3, ViewingConditions.DEFAULT);
      }
      /**
       * @param j CAM16 lightness
       * @param c CAM16 chroma
       * @param h CAM16 hue
       * @param viewingConditions Information about the environment where the color
       *     was observed.
       */
      static fromJchInViewingConditions(j, c4, h3, viewingConditions) {
        const q = 4 / viewingConditions.c * Math.sqrt(j / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
        const m2 = c4 * viewingConditions.fLRoot;
        const alpha = c4 / Math.sqrt(j / 100);
        const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
        const hueRadians = h3 * Math.PI / 180;
        const jstar = (1 + 100 * 7e-3) * j / (1 + 7e-3 * j);
        const mstar = 1 / 0.0228 * Math.log(1 + 0.0228 * m2);
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new _Cam16(h3, c4, j, q, m2, s4, jstar, astar, bstar);
      }
      /**
       * @param jstar CAM16-UCS lightness.
       * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
       *     coordinate on the Y axis.
       * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
       *     coordinate on the X axis.
       */
      static fromUcs(jstar, astar, bstar) {
        return _Cam16.fromUcsInViewingConditions(jstar, astar, bstar, ViewingConditions.DEFAULT);
      }
      /**
       * @param jstar CAM16-UCS lightness.
       * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
       *     coordinate on the Y axis.
       * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
       *     coordinate on the X axis.
       * @param viewingConditions Information about the environment where the color
       *     was observed.
       */
      static fromUcsInViewingConditions(jstar, astar, bstar, viewingConditions) {
        const a3 = astar;
        const b5 = bstar;
        const m2 = Math.sqrt(a3 * a3 + b5 * b5);
        const M2 = (Math.exp(m2 * 0.0228) - 1) / 0.0228;
        const c4 = M2 / viewingConditions.fLRoot;
        let h3 = Math.atan2(b5, a3) * (180 / Math.PI);
        if (h3 < 0) {
          h3 += 360;
        }
        const j = jstar / (1 - (jstar - 100) * 7e-3);
        return _Cam16.fromJchInViewingConditions(j, c4, h3, viewingConditions);
      }
      /**
       *  @return ARGB representation of color, assuming the color was viewed in
       *     default viewing conditions, which are near-identical to the default
       *     viewing conditions for sRGB.
       */
      toInt() {
        return this.viewed(ViewingConditions.DEFAULT);
      }
      /**
       * @param viewingConditions Information about the environment where the color
       *     will be viewed.
       * @return ARGB representation of color
       */
      viewed(viewingConditions) {
        const alpha = this.chroma === 0 || this.j === 0 ? 0 : this.chroma / Math.sqrt(this.j / 100);
        const t5 = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1 / 0.9);
        const hRad = this.hue * Math.PI / 180;
        const eHue = 0.25 * (Math.cos(hRad + 2) + 3.8);
        const ac = viewingConditions.aw * Math.pow(this.j / 100, 1 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
        const p22 = ac / viewingConditions.nbb;
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);
        const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
        const a3 = gamma * hCos;
        const b5 = gamma * hSin;
        const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
        const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
        const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
        const rCBase = Math.max(0, 27.13 * Math.abs(rA) / (400 - Math.abs(rA)));
        const rC = signum(rA) * (100 / viewingConditions.fl) * Math.pow(rCBase, 1 / 0.42);
        const gCBase = Math.max(0, 27.13 * Math.abs(gA) / (400 - Math.abs(gA)));
        const gC = signum(gA) * (100 / viewingConditions.fl) * Math.pow(gCBase, 1 / 0.42);
        const bCBase = Math.max(0, 27.13 * Math.abs(bA) / (400 - Math.abs(bA)));
        const bC = signum(bA) * (100 / viewingConditions.fl) * Math.pow(bCBase, 1 / 0.42);
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];
        const x3 = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y3 = 0.38752654 * rF + 0.62144744 * gF - 897398e-8 * bF;
        const z2 = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
        const argb = argbFromXyz(x3, y3, z2);
        return argb;
      }
      /// Given color expressed in XYZ and viewed in [viewingConditions], convert to
      /// CAM16.
      static fromXyzInViewingConditions(x3, y3, z2, viewingConditions) {
        const rC = 0.401288 * x3 + 0.650173 * y3 - 0.051461 * z2;
        const gC = -0.250268 * x3 + 1.204414 * y3 + 0.045854 * z2;
        const bC = -2079e-6 * x3 + 0.048952 * y3 + 0.953127 * z2;
        const rD = viewingConditions.rgbD[0] * rC;
        const gD = viewingConditions.rgbD[1] * gC;
        const bD = viewingConditions.rgbD[2] * bC;
        const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100, 0.42);
        const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100, 0.42);
        const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100, 0.42);
        const rA = signum(rD) * 400 * rAF / (rAF + 27.13);
        const gA = signum(gD) * 400 * gAF / (gAF + 27.13);
        const bA = signum(bD) * 400 * bAF / (bAF + 27.13);
        const a3 = (11 * rA + -12 * gA + bA) / 11;
        const b5 = (rA + gA - 2 * bA) / 9;
        const u3 = (20 * rA + 20 * gA + 21 * bA) / 20;
        const p22 = (40 * rA + 20 * gA + bA) / 20;
        const atan2 = Math.atan2(b5, a3);
        const atanDegrees = atan2 * 180 / Math.PI;
        const hue = atanDegrees < 0 ? atanDegrees + 360 : atanDegrees >= 360 ? atanDegrees - 360 : atanDegrees;
        const hueRadians = hue * Math.PI / 180;
        const ac = p22 * viewingConditions.nbb;
        const J = 100 * Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);
        const Q = 4 / viewingConditions.c * Math.sqrt(J / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;
        const huePrime = hue < 20.14 ? hue + 360 : hue;
        const eHue = 1 / 4 * (Math.cos(huePrime * Math.PI / 180 + 2) + 3.8);
        const p1 = 5e4 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;
        const t5 = p1 * Math.sqrt(a3 * a3 + b5 * b5) / (u3 + 0.305);
        const alpha = Math.pow(t5, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        const C2 = alpha * Math.sqrt(J / 100);
        const M2 = C2 * viewingConditions.fLRoot;
        const s4 = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));
        const jstar = (1 + 100 * 7e-3) * J / (1 + 7e-3 * J);
        const mstar = Math.log(1 + 0.0228 * M2) / 0.0228;
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);
        return new _Cam16(hue, C2, J, Q, M2, s4, jstar, astar, bstar);
      }
      /// XYZ representation of CAM16 seen in [viewingConditions].
      xyzInViewingConditions(viewingConditions) {
        const alpha = this.chroma === 0 || this.j === 0 ? 0 : this.chroma / Math.sqrt(this.j / 100);
        const t5 = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73), 1 / 0.9);
        const hRad = this.hue * Math.PI / 180;
        const eHue = 0.25 * (Math.cos(hRad + 2) + 3.8);
        const ac = viewingConditions.aw * Math.pow(this.j / 100, 1 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
        const p22 = ac / viewingConditions.nbb;
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);
        const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
        const a3 = gamma * hCos;
        const b5 = gamma * hSin;
        const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
        const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
        const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
        const rCBase = Math.max(0, 27.13 * Math.abs(rA) / (400 - Math.abs(rA)));
        const rC = signum(rA) * (100 / viewingConditions.fl) * Math.pow(rCBase, 1 / 0.42);
        const gCBase = Math.max(0, 27.13 * Math.abs(gA) / (400 - Math.abs(gA)));
        const gC = signum(gA) * (100 / viewingConditions.fl) * Math.pow(gCBase, 1 / 0.42);
        const bCBase = Math.max(0, 27.13 * Math.abs(bA) / (400 - Math.abs(bA)));
        const bC = signum(bA) * (100 / viewingConditions.fl) * Math.pow(bCBase, 1 / 0.42);
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];
        const x3 = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y3 = 0.38752654 * rF + 0.62144744 * gF - 897398e-8 * bF;
        const z2 = -0.0158415 * rF - 0.03412294 * gF + 1.04996444 * bF;
        return [x3, y3, z2];
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/hct/hct_solver.js
var HctSolver;
var init_hct_solver = __esm({
  "../../node_modules/@material/material-color-utilities/hct/hct_solver.js"() {
    init_color_utils();
    init_math_utils();
    init_cam16();
    init_viewing_conditions();
    HctSolver = class _HctSolver {
      /**
       * Sanitizes a small enough angle in radians.
       *
       * @param angle An angle in radians; must not deviate too much
       * from 0.
       * @return A coterminal angle between 0 and 2pi.
       */
      static sanitizeRadians(angle) {
        return (angle + Math.PI * 8) % (Math.PI * 2);
      }
      /**
       * Delinearizes an RGB component, returning a floating-point
       * number.
       *
       * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
       * linear R/G/B channel
       * @return 0.0 <= output <= 255.0, color channel converted to
       * regular RGB space
       */
      static trueDelinearized(rgbComponent) {
        const normalized = rgbComponent / 100;
        let delinearized2 = 0;
        if (normalized <= 31308e-7) {
          delinearized2 = normalized * 12.92;
        } else {
          delinearized2 = 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
        }
        return delinearized2 * 255;
      }
      static chromaticAdaptation(component) {
        const af = Math.pow(Math.abs(component), 0.42);
        return signum(component) * 400 * af / (af + 27.13);
      }
      /**
       * Returns the hue of a linear RGB color in CAM16.
       *
       * @param linrgb The linear RGB coordinates of a color.
       * @return The hue of the color in CAM16, in radians.
       */
      static hueOf(linrgb) {
        const scaledDiscount = matrixMultiply(linrgb, _HctSolver.SCALED_DISCOUNT_FROM_LINRGB);
        const rA = _HctSolver.chromaticAdaptation(scaledDiscount[0]);
        const gA = _HctSolver.chromaticAdaptation(scaledDiscount[1]);
        const bA = _HctSolver.chromaticAdaptation(scaledDiscount[2]);
        const a3 = (11 * rA + -12 * gA + bA) / 11;
        const b5 = (rA + gA - 2 * bA) / 9;
        return Math.atan2(b5, a3);
      }
      static areInCyclicOrder(a3, b5, c4) {
        const deltaAB = _HctSolver.sanitizeRadians(b5 - a3);
        const deltaAC = _HctSolver.sanitizeRadians(c4 - a3);
        return deltaAB < deltaAC;
      }
      /**
       * Solves the lerp equation.
       *
       * @param source The starting number.
       * @param mid The number in the middle.
       * @param target The ending number.
       * @return A number t such that lerp(source, target, t) = mid.
       */
      static intercept(source, mid, target) {
        return (mid - source) / (target - source);
      }
      static lerpPoint(source, t5, target) {
        return [
          source[0] + (target[0] - source[0]) * t5,
          source[1] + (target[1] - source[1]) * t5,
          source[2] + (target[2] - source[2]) * t5
        ];
      }
      /**
       * Intersects a segment with a plane.
       *
       * @param source The coordinates of point A.
       * @param coordinate The R-, G-, or B-coordinate of the plane.
       * @param target The coordinates of point B.
       * @param axis The axis the plane is perpendicular with. (0: R, 1:
       * G, 2: B)
       * @return The intersection point of the segment AB with the plane
       * R=coordinate, G=coordinate, or B=coordinate
       */
      static setCoordinate(source, coordinate, target, axis) {
        const t5 = _HctSolver.intercept(source[axis], coordinate, target[axis]);
        return _HctSolver.lerpPoint(source, t5, target);
      }
      static isBounded(x3) {
        return 0 <= x3 && x3 <= 100;
      }
      /**
       * Returns the nth possible vertex of the polygonal intersection.
       *
       * @param y The Y value of the plane.
       * @param n The zero-based index of the point. 0 <= n <= 11.
       * @return The nth possible vertex of the polygonal intersection
       * of the y plane and the RGB cube, in linear RGB coordinates, if
       * it exists. If this possible vertex lies outside of the cube,
       * [-1.0, -1.0, -1.0] is returned.
       */
      static nthVertex(y3, n5) {
        const kR = _HctSolver.Y_FROM_LINRGB[0];
        const kG = _HctSolver.Y_FROM_LINRGB[1];
        const kB = _HctSolver.Y_FROM_LINRGB[2];
        const coordA = n5 % 4 <= 1 ? 0 : 100;
        const coordB = n5 % 2 === 0 ? 0 : 100;
        if (n5 < 4) {
          const g2 = coordA;
          const b5 = coordB;
          const r6 = (y3 - g2 * kG - b5 * kB) / kR;
          if (_HctSolver.isBounded(r6)) {
            return [r6, g2, b5];
          } else {
            return [-1, -1, -1];
          }
        } else if (n5 < 8) {
          const b5 = coordA;
          const r6 = coordB;
          const g2 = (y3 - r6 * kR - b5 * kB) / kG;
          if (_HctSolver.isBounded(g2)) {
            return [r6, g2, b5];
          } else {
            return [-1, -1, -1];
          }
        } else {
          const r6 = coordA;
          const g2 = coordB;
          const b5 = (y3 - r6 * kR - g2 * kG) / kB;
          if (_HctSolver.isBounded(b5)) {
            return [r6, g2, b5];
          } else {
            return [-1, -1, -1];
          }
        }
      }
      /**
       * Finds the segment containing the desired color.
       *
       * @param y The Y value of the color.
       * @param targetHue The hue of the color.
       * @return A list of two sets of linear RGB coordinates, each
       * corresponding to an endpoint of the segment containing the
       * desired color.
       */
      static bisectToSegment(y3, targetHue) {
        let left = [-1, -1, -1];
        let right = left;
        let leftHue = 0;
        let rightHue = 0;
        let initialized = false;
        let uncut = true;
        for (let n5 = 0; n5 < 12; n5++) {
          const mid = _HctSolver.nthVertex(y3, n5);
          if (mid[0] < 0) {
            continue;
          }
          const midHue = _HctSolver.hueOf(mid);
          if (!initialized) {
            left = mid;
            right = mid;
            leftHue = midHue;
            rightHue = midHue;
            initialized = true;
            continue;
          }
          if (uncut || _HctSolver.areInCyclicOrder(leftHue, midHue, rightHue)) {
            uncut = false;
            if (_HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
              right = mid;
              rightHue = midHue;
            } else {
              left = mid;
              leftHue = midHue;
            }
          }
        }
        return [left, right];
      }
      static midpoint(a3, b5) {
        return [
          (a3[0] + b5[0]) / 2,
          (a3[1] + b5[1]) / 2,
          (a3[2] + b5[2]) / 2
        ];
      }
      static criticalPlaneBelow(x3) {
        return Math.floor(x3 - 0.5);
      }
      static criticalPlaneAbove(x3) {
        return Math.ceil(x3 - 0.5);
      }
      /**
       * Finds a color with the given Y and hue on the boundary of the
       * cube.
       *
       * @param y The Y value of the color.
       * @param targetHue The hue of the color.
       * @return The desired color, in linear RGB coordinates.
       */
      static bisectToLimit(y3, targetHue) {
        const segment = _HctSolver.bisectToSegment(y3, targetHue);
        let left = segment[0];
        let leftHue = _HctSolver.hueOf(left);
        let right = segment[1];
        for (let axis = 0; axis < 3; axis++) {
          if (left[axis] !== right[axis]) {
            let lPlane = -1;
            let rPlane = 255;
            if (left[axis] < right[axis]) {
              lPlane = _HctSolver.criticalPlaneBelow(_HctSolver.trueDelinearized(left[axis]));
              rPlane = _HctSolver.criticalPlaneAbove(_HctSolver.trueDelinearized(right[axis]));
            } else {
              lPlane = _HctSolver.criticalPlaneAbove(_HctSolver.trueDelinearized(left[axis]));
              rPlane = _HctSolver.criticalPlaneBelow(_HctSolver.trueDelinearized(right[axis]));
            }
            for (let i7 = 0; i7 < 8; i7++) {
              if (Math.abs(rPlane - lPlane) <= 1) {
                break;
              } else {
                const mPlane = Math.floor((lPlane + rPlane) / 2);
                const midPlaneCoordinate = _HctSolver.CRITICAL_PLANES[mPlane];
                const mid = _HctSolver.setCoordinate(left, midPlaneCoordinate, right, axis);
                const midHue = _HctSolver.hueOf(mid);
                if (_HctSolver.areInCyclicOrder(leftHue, targetHue, midHue)) {
                  right = mid;
                  rPlane = mPlane;
                } else {
                  left = mid;
                  leftHue = midHue;
                  lPlane = mPlane;
                }
              }
            }
          }
        }
        return _HctSolver.midpoint(left, right);
      }
      static inverseChromaticAdaptation(adapted) {
        const adaptedAbs = Math.abs(adapted);
        const base = Math.max(0, 27.13 * adaptedAbs / (400 - adaptedAbs));
        return signum(adapted) * Math.pow(base, 1 / 0.42);
      }
      /**
       * Finds a color with the given hue, chroma, and Y.
       *
       * @param hueRadians The desired hue in radians.
       * @param chroma The desired chroma.
       * @param y The desired Y.
       * @return The desired color as a hexadecimal integer, if found; 0
       * otherwise.
       */
      static findResultByJ(hueRadians, chroma, y3) {
        let j = Math.sqrt(y3) * 11;
        const viewingConditions = ViewingConditions.DEFAULT;
        const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);
        const eHue = 0.25 * (Math.cos(hueRadians + 2) + 3.8);
        const p1 = eHue * (5e4 / 13) * viewingConditions.nc * viewingConditions.ncb;
        const hSin = Math.sin(hueRadians);
        const hCos = Math.cos(hueRadians);
        for (let iterationRound = 0; iterationRound < 5; iterationRound++) {
          const jNormalized = j / 100;
          const alpha = chroma === 0 || j === 0 ? 0 : chroma / Math.sqrt(jNormalized);
          const t5 = Math.pow(alpha * tInnerCoeff, 1 / 0.9);
          const ac = viewingConditions.aw * Math.pow(jNormalized, 1 / viewingConditions.c / viewingConditions.z);
          const p22 = ac / viewingConditions.nbb;
          const gamma = 23 * (p22 + 0.305) * t5 / (23 * p1 + 11 * t5 * hCos + 108 * t5 * hSin);
          const a3 = gamma * hCos;
          const b5 = gamma * hSin;
          const rA = (460 * p22 + 451 * a3 + 288 * b5) / 1403;
          const gA = (460 * p22 - 891 * a3 - 261 * b5) / 1403;
          const bA = (460 * p22 - 220 * a3 - 6300 * b5) / 1403;
          const rCScaled = _HctSolver.inverseChromaticAdaptation(rA);
          const gCScaled = _HctSolver.inverseChromaticAdaptation(gA);
          const bCScaled = _HctSolver.inverseChromaticAdaptation(bA);
          const linrgb = matrixMultiply([rCScaled, gCScaled, bCScaled], _HctSolver.LINRGB_FROM_SCALED_DISCOUNT);
          if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) {
            return 0;
          }
          const kR = _HctSolver.Y_FROM_LINRGB[0];
          const kG = _HctSolver.Y_FROM_LINRGB[1];
          const kB = _HctSolver.Y_FROM_LINRGB[2];
          const fnj = kR * linrgb[0] + kG * linrgb[1] + kB * linrgb[2];
          if (fnj <= 0) {
            return 0;
          }
          if (iterationRound === 4 || Math.abs(fnj - y3) < 2e-3) {
            if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) {
              return 0;
            }
            return argbFromLinrgb(linrgb);
          }
          j = j - (fnj - y3) * j / (2 * fnj);
        }
        return 0;
      }
      /**
       * Finds an sRGB color with the given hue, chroma, and L*, if
       * possible.
       *
       * @param hueDegrees The desired hue, in degrees.
       * @param chroma The desired chroma.
       * @param lstar The desired L*.
       * @return A hexadecimal representing the sRGB color. The color
       * has sufficiently close hue, chroma, and L* to the desired
       * values, if possible; otherwise, the hue and L* will be
       * sufficiently close, and chroma will be maximized.
       */
      static solveToInt(hueDegrees, chroma, lstar) {
        if (chroma < 1e-4 || lstar < 1e-4 || lstar > 99.9999) {
          return argbFromLstar(lstar);
        }
        hueDegrees = sanitizeDegreesDouble(hueDegrees);
        const hueRadians = hueDegrees / 180 * Math.PI;
        const y3 = yFromLstar(lstar);
        const exactAnswer = _HctSolver.findResultByJ(hueRadians, chroma, y3);
        if (exactAnswer !== 0) {
          return exactAnswer;
        }
        const linrgb = _HctSolver.bisectToLimit(y3, hueRadians);
        return argbFromLinrgb(linrgb);
      }
      /**
       * Finds an sRGB color with the given hue, chroma, and L*, if
       * possible.
       *
       * @param hueDegrees The desired hue, in degrees.
       * @param chroma The desired chroma.
       * @param lstar The desired L*.
       * @return An CAM16 object representing the sRGB color. The color
       * has sufficiently close hue, chroma, and L* to the desired
       * values, if possible; otherwise, the hue and L* will be
       * sufficiently close, and chroma will be maximized.
       */
      static solveToCam(hueDegrees, chroma, lstar) {
        return Cam16.fromInt(_HctSolver.solveToInt(hueDegrees, chroma, lstar));
      }
    };
    HctSolver.SCALED_DISCOUNT_FROM_LINRGB = [
      [
        0.001200833568784504,
        0.002389694492170889,
        2795742885861124e-19
      ],
      [
        5891086651375999e-19,
        0.0029785502573438758,
        3270666104008398e-19
      ],
      [
        10146692491640572e-20,
        5364214359186694e-19,
        0.0032979401770712076
      ]
    ];
    HctSolver.LINRGB_FROM_SCALED_DISCOUNT = [
      [
        1373.2198709594231,
        -1100.4251190754821,
        -7.278681089101213
      ],
      [
        -271.815969077903,
        559.6580465940733,
        -32.46047482791194
      ],
      [
        1.9622899599665666,
        -57.173814538844006,
        308.7233197812385
      ]
    ];
    HctSolver.Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];
    HctSolver.CRITICAL_PLANES = [
      0.015176349177441876,
      0.045529047532325624,
      0.07588174588720938,
      0.10623444424209313,
      0.13658714259697685,
      0.16693984095186062,
      0.19729253930674434,
      0.2276452376616281,
      0.2579979360165119,
      0.28835063437139563,
      0.3188300904430532,
      0.350925934958123,
      0.3848314933096426,
      0.42057480301049466,
      0.458183274052838,
      0.4976837250274023,
      0.5391024159806381,
      0.5824650784040898,
      0.6277969426914107,
      0.6751227633498623,
      0.7244668422128921,
      0.775853049866786,
      0.829304845476233,
      0.8848452951698498,
      0.942497089126609,
      1.0022825574869039,
      1.0642236851973577,
      1.1283421258858297,
      1.1946592148522128,
      1.2631959812511864,
      1.3339731595349034,
      1.407011200216447,
      1.4823302800086415,
      1.5599503113873272,
      1.6398909516233677,
      1.7221716113234105,
      1.8068114625156377,
      1.8938294463134073,
      1.9832442801866852,
      2.075074464868551,
      2.1693382909216234,
      2.2660538449872063,
      2.36523901573795,
      2.4669114995532007,
      2.5710888059345764,
      2.6777882626779785,
      2.7870270208169257,
      2.898822059350997,
      3.0131901897720907,
      3.1301480604002863,
      3.2497121605402226,
      3.3718988244681087,
      3.4967242352587946,
      3.624204428461639,
      3.754355295633311,
      3.887192587735158,
      4.022731918402185,
      4.160988767090289,
      4.301978482107941,
      4.445716283538092,
      4.592217266055746,
      4.741496401646282,
      4.893568542229298,
      5.048448422192488,
      5.20615066083972,
      5.3666897647573375,
      5.5300801301023865,
      5.696336044816294,
      5.865471690767354,
      6.037501145825082,
      6.212438385869475,
      6.390297286737924,
      6.571091626112461,
      6.7548350853498045,
      6.941541251256611,
      7.131223617812143,
      7.323895587840543,
      7.5195704746346665,
      7.7182615035334345,
      7.919981813454504,
      8.124744458384042,
      8.332562408825165,
      8.543448553206703,
      8.757415699253682,
      8.974476575321063,
      9.194643831691977,
      9.417930041841839,
      9.644347703669503,
      9.873909240696694,
      10.106627003236781,
      10.342513269534024,
      10.58158024687427,
      10.8238400726681,
      11.069304815507364,
      11.317986476196008,
      11.569896988756009,
      11.825048221409341,
      12.083451977536606,
      12.345119996613247,
      12.610063955123938,
      12.878295467455942,
      13.149826086772048,
      13.42466730586372,
      13.702830557985108,
      13.984327217668513,
      14.269168601521828,
      14.55736596900856,
      14.848930523210871,
      15.143873411576273,
      15.44220572664832,
      15.743938506781891,
      16.04908273684337,
      16.35764934889634,
      16.66964922287304,
      16.985093187232053,
      17.30399201960269,
      17.62635644741625,
      17.95219714852476,
      18.281524751807332,
      18.614349837764564,
      18.95068293910138,
      19.290534541298456,
      19.633915083172692,
      19.98083495742689,
      20.331304511189067,
      20.685334046541502,
      21.042933821039977,
      21.404114048223256,
      21.76888489811322,
      22.137256497705877,
      22.50923893145328,
      22.884842241736916,
      23.264076429332462,
      23.6469514538663,
      24.033477234264016,
      24.42366364919083,
      24.817520537484558,
      25.21505769858089,
      25.61628489293138,
      26.021211842414342,
      26.429848230738664,
      26.842203703840827,
      27.258287870275353,
      27.678110301598522,
      28.10168053274597,
      28.529008062403893,
      28.96010235337422,
      29.39497283293396,
      29.83362889318845,
      30.276079891419332,
      30.722335150426627,
      31.172403958865512,
      31.62629557157785,
      32.08401920991837,
      32.54558406207592,
      33.010999283389665,
      33.4802739966603,
      33.953417292456834,
      34.430438229418264,
      34.911345834551085,
      35.39614910352207,
      35.88485700094671,
      36.37747846067349,
      36.87402238606382,
      37.37449765026789,
      37.87891309649659,
      38.38727753828926,
      38.89959975977785,
      39.41588851594697,
      39.93615253289054,
      40.460400508064545,
      40.98864111053629,
      41.520882981230194,
      42.05713473317016,
      42.597404951718396,
      43.141702194811224,
      43.6900349931913,
      44.24241185063697,
      44.798841244188324,
      45.35933162437017,
      45.92389141541209,
      46.49252901546552,
      47.065252796817916,
      47.64207110610409,
      48.22299226451468,
      48.808024568002054,
      49.3971762874833,
      49.9904556690408,
      50.587870934119984,
      51.189430279724725,
      51.79514187861014,
      52.40501387947288,
      53.0190544071392,
      53.637271562750364,
      54.259673423945976,
      54.88626804504493,
      55.517063457223934,
      56.15206766869424,
      56.79128866487574,
      57.43473440856916,
      58.08241284012621,
      58.734331877617365,
      59.39049941699807,
      60.05092333227251,
      60.715611475655585,
      61.38457167773311,
      62.057811747619894,
      62.7353394731159,
      63.417162620860914,
      64.10328893648692,
      64.79372614476921,
      65.48848194977529,
      66.18756403501224,
      66.89098006357258,
      67.59873767827808,
      68.31084450182222,
      69.02730813691093,
      69.74813616640164,
      70.47333615344107,
      71.20291564160104,
      71.93688215501312,
      72.67524319850172,
      73.41800625771542,
      74.16517879925733,
      74.9167682708136,
      75.67278210128072,
      76.43322770089146,
      77.1981124613393,
      77.96744375590167,
      78.74122893956174,
      79.51947534912904,
      80.30219030335869,
      81.08938110306934,
      81.88105503125999,
      82.67721935322541,
      83.4778813166706,
      84.28304815182372,
      85.09272707154808,
      85.90692527145302,
      86.72564993000343,
      87.54890820862819,
      88.3767072518277,
      89.2090541872801,
      90.04595612594655,
      90.88742016217518,
      91.73345337380438,
      92.58406282226491,
      93.43925555268066,
      94.29903859396902,
      95.16341895893969,
      96.03240364439274,
      96.9059996312159,
      97.78421388448044,
      98.6670533535366,
      99.55452497210776
    ];
  }
});

// ../../node_modules/@material/material-color-utilities/hct/hct.js
var Hct;
var init_hct = __esm({
  "../../node_modules/@material/material-color-utilities/hct/hct.js"() {
    init_color_utils();
    init_cam16();
    init_hct_solver();
    init_viewing_conditions();
    Hct = class _Hct {
      static from(hue, chroma, tone) {
        return new _Hct(HctSolver.solveToInt(hue, chroma, tone));
      }
      /**
       * @param argb ARGB representation of a color.
       * @return HCT representation of a color in default viewing conditions
       */
      static fromInt(argb) {
        return new _Hct(argb);
      }
      toInt() {
        return this.argb;
      }
      /**
       * A number, in degrees, representing ex. red, orange, yellow, etc.
       * Ranges from 0 <= hue < 360.
       */
      get hue() {
        return this.internalHue;
      }
      /**
       * @param newHue 0 <= newHue < 360; invalid values are corrected.
       * Chroma may decrease because chroma has a different maximum for any given
       * hue and tone.
       */
      set hue(newHue) {
        this.setInternalState(HctSolver.solveToInt(newHue, this.internalChroma, this.internalTone));
      }
      get chroma() {
        return this.internalChroma;
      }
      /**
       * @param newChroma 0 <= newChroma < ?
       * Chroma may decrease because chroma has a different maximum for any given
       * hue and tone.
       */
      set chroma(newChroma) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, newChroma, this.internalTone));
      }
      /** Lightness. Ranges from 0 to 100. */
      get tone() {
        return this.internalTone;
      }
      /**
       * @param newTone 0 <= newTone <= 100; invalid valids are corrected.
       * Chroma may decrease because chroma has a different maximum for any given
       * hue and tone.
       */
      set tone(newTone) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, newTone));
      }
      constructor(argb) {
        this.argb = argb;
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = lstarFromArgb(argb);
        this.argb = argb;
      }
      setInternalState(argb) {
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = lstarFromArgb(argb);
        this.argb = argb;
      }
      /**
       * Translates a color into different [ViewingConditions].
       *
       * Colors change appearance. They look different with lights on versus off,
       * the same color, as in hex code, on white looks different when on black.
       * This is called color relativity, most famously explicated by Josef Albers
       * in Interaction of Color.
       *
       * In color science, color appearance models can account for this and
       * calculate the appearance of a color in different settings. HCT is based on
       * CAM16, a color appearance model, and uses it to make these calculations.
       *
       * See [ViewingConditions.make] for parameters affecting color appearance.
       */
      inViewingConditions(vc) {
        const cam = Cam16.fromInt(this.toInt());
        const viewedInVc = cam.xyzInViewingConditions(vc);
        const recastInVc = Cam16.fromXyzInViewingConditions(viewedInVc[0], viewedInVc[1], viewedInVc[2], ViewingConditions.make());
        const recastHct = _Hct.from(recastInVc.hue, recastInVc.chroma, lstarFromY(viewedInVc[1]));
        return recastHct;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/blend/blend.js
var init_blend = __esm({
  "../../node_modules/@material/material-color-utilities/blend/blend.js"() {
    init_cam16();
    init_hct();
    init_color_utils();
    init_math_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/contrast/contrast.js
var Contrast;
var init_contrast = __esm({
  "../../node_modules/@material/material-color-utilities/contrast/contrast.js"() {
    init_color_utils();
    init_math_utils();
    Contrast = class _Contrast {
      /**
       * Returns a contrast ratio, which ranges from 1 to 21.
       *
       * @param toneA Tone between 0 and 100. Values outside will be clamped.
       * @param toneB Tone between 0 and 100. Values outside will be clamped.
       */
      static ratioOfTones(toneA, toneB) {
        toneA = clampDouble(0, 100, toneA);
        toneB = clampDouble(0, 100, toneB);
        return _Contrast.ratioOfYs(yFromLstar(toneA), yFromLstar(toneB));
      }
      static ratioOfYs(y1, y22) {
        const lighter = y1 > y22 ? y1 : y22;
        const darker = lighter === y22 ? y1 : y22;
        return (lighter + 5) / (darker + 5);
      }
      /**
       * Returns a tone >= tone parameter that ensures ratio parameter.
       * Return value is between 0 and 100.
       * Returns -1 if ratio cannot be achieved with tone parameter.
       *
       * @param tone Tone return value must contrast with.
       * Range is 0 to 100. Invalid values will result in -1 being returned.
       * @param ratio Contrast ratio of return value and tone.
       * Range is 1 to 21, invalid values have undefined behavior.
       */
      static lighter(tone, ratio) {
        if (tone < 0 || tone > 100) {
          return -1;
        }
        const darkY = yFromLstar(tone);
        const lightY = ratio * (darkY + 5) - 5;
        const realContrast = _Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
          return -1;
        }
        const returnValue = lstarFromY(lightY) + 0.4;
        if (returnValue < 0 || returnValue > 100) {
          return -1;
        }
        return returnValue;
      }
      /**
       * Returns a tone <= tone parameter that ensures ratio parameter.
       * Return value is between 0 and 100.
       * Returns -1 if ratio cannot be achieved with tone parameter.
       *
       * @param tone Tone return value must contrast with.
       * Range is 0 to 100. Invalid values will result in -1 being returned.
       * @param ratio Contrast ratio of return value and tone.
       * Range is 1 to 21, invalid values have undefined behavior.
       */
      static darker(tone, ratio) {
        if (tone < 0 || tone > 100) {
          return -1;
        }
        const lightY = yFromLstar(tone);
        const darkY = (lightY + 5) / ratio - 5;
        const realContrast = _Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);
        if (realContrast < ratio && delta > 0.04) {
          return -1;
        }
        const returnValue = lstarFromY(darkY) - 0.4;
        if (returnValue < 0 || returnValue > 100) {
          return -1;
        }
        return returnValue;
      }
      /**
       * Returns a tone >= tone parameter that ensures ratio parameter.
       * Return value is between 0 and 100.
       * Returns 100 if ratio cannot be achieved with tone parameter.
       *
       * This method is unsafe because the returned value is guaranteed to be in
       * bounds for tone, i.e. between 0 and 100. However, that value may not reach
       * the ratio with tone. For example, there is no color lighter than T100.
       *
       * @param tone Tone return value must contrast with.
       * Range is 0 to 100. Invalid values will result in 100 being returned.
       * @param ratio Desired contrast ratio of return value and tone parameter.
       * Range is 1 to 21, invalid values have undefined behavior.
       */
      static lighterUnsafe(tone, ratio) {
        const lighterSafe = _Contrast.lighter(tone, ratio);
        return lighterSafe < 0 ? 100 : lighterSafe;
      }
      /**
       * Returns a tone >= tone parameter that ensures ratio parameter.
       * Return value is between 0 and 100.
       * Returns 100 if ratio cannot be achieved with tone parameter.
       *
       * This method is unsafe because the returned value is guaranteed to be in
       * bounds for tone, i.e. between 0 and 100. However, that value may not reach
       * the [ratio with [tone]. For example, there is no color darker than T0.
       *
       * @param tone Tone return value must contrast with.
       * Range is 0 to 100. Invalid values will result in 0 being returned.
       * @param ratio Desired contrast ratio of return value and tone parameter.
       * Range is 1 to 21, invalid values have undefined behavior.
       */
      static darkerUnsafe(tone, ratio) {
        const darkerSafe = _Contrast.darker(tone, ratio);
        return darkerSafe < 0 ? 0 : darkerSafe;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/dislike/dislike_analyzer.js
var DislikeAnalyzer;
var init_dislike_analyzer = __esm({
  "../../node_modules/@material/material-color-utilities/dislike/dislike_analyzer.js"() {
    init_hct();
    DislikeAnalyzer = class _DislikeAnalyzer {
      /**
       * Returns true if a color is disliked.
       *
       * @param hct A color to be judged.
       * @return Whether the color is disliked.
       *
       * Disliked is defined as a dark yellow-green that is not neutral.
       */
      static isDisliked(hct) {
        const huePasses = Math.round(hct.hue) >= 90 && Math.round(hct.hue) <= 111;
        const chromaPasses = Math.round(hct.chroma) > 16;
        const tonePasses = Math.round(hct.tone) < 65;
        return huePasses && chromaPasses && tonePasses;
      }
      /**
       * If a color is disliked, lighten it to make it likable.
       *
       * @param hct A color to be judged.
       * @return A new color if the original color is disliked, or the original
       *   color if it is acceptable.
       */
      static fixIfDisliked(hct) {
        if (_DislikeAnalyzer.isDisliked(hct)) {
          return Hct.from(hct.hue, hct.chroma, 70);
        }
        return hct;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_color.js
var DynamicColor;
var init_dynamic_color = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_color.js"() {
    init_contrast();
    init_math_utils();
    DynamicColor = class _DynamicColor {
      /**
       * Create a DynamicColor defined by a TonalPalette and HCT tone.
       *
       * @param args Functions with DynamicScheme as input. Must provide a palette
       * and tone. May provide a background DynamicColor and ToneDeltaConstraint.
       */
      static fromPalette(args) {
        return new _DynamicColor(args.name ?? "", args.palette, args.tone, args.isBackground ?? false, args.background, args.secondBackground, args.contrastCurve, args.toneDeltaPair);
      }
      /**
       * The base constructor for DynamicColor.
       *
       * _Strongly_ prefer using one of the convenience constructors. This class is
       * arguably too flexible to ensure it can support any scenario. Functional
       * arguments allow  overriding without risks that come with subclasses.
       *
       * For example, the default behavior of adjust tone at max contrast
       * to be at a 7.0 ratio with its background is principled and
       * matches accessibility guidance. That does not mean it's the desired
       * approach for _every_ design system, and every color pairing,
       * always, in every case.
       *
       * @param name The name of the dynamic color. Defaults to empty.
       * @param palette Function that provides a TonalPalette given
       * DynamicScheme. A TonalPalette is defined by a hue and chroma, so this
       * replaces the need to specify hue/chroma. By providing a tonal palette, when
       * contrast adjustments are made, intended chroma can be preserved.
       * @param tone Function that provides a tone, given a DynamicScheme.
       * @param isBackground Whether this dynamic color is a background, with
       * some other color as the foreground. Defaults to false.
       * @param background The background of the dynamic color (as a function of a
       *     `DynamicScheme`), if it exists.
       * @param secondBackground A second background of the dynamic color (as a
       *     function of a `DynamicScheme`), if it
       * exists.
       * @param contrastCurve A `ContrastCurve` object specifying how its contrast
       * against its background should behave in various contrast levels options.
       * @param toneDeltaPair A `ToneDeltaPair` object specifying a tone delta
       * constraint between two colors. One of them must be the color being
       * constructed.
       */
      constructor(name, palette, tone, isBackground, background, secondBackground, contrastCurve, toneDeltaPair) {
        this.name = name;
        this.palette = palette;
        this.tone = tone;
        this.isBackground = isBackground;
        this.background = background;
        this.secondBackground = secondBackground;
        this.contrastCurve = contrastCurve;
        this.toneDeltaPair = toneDeltaPair;
        this.hctCache = /* @__PURE__ */ new Map();
        if (!background && secondBackground) {
          throw new Error(`Color ${name} has secondBackgrounddefined, but background is not defined.`);
        }
        if (!background && contrastCurve) {
          throw new Error(`Color ${name} has contrastCurvedefined, but background is not defined.`);
        }
        if (background && !contrastCurve) {
          throw new Error(`Color ${name} has backgrounddefined, but contrastCurve is not defined.`);
        }
      }
      /**
       * Return a ARGB integer (i.e. a hex code).
       *
       * @param scheme Defines the conditions of the user interface, for example,
       * whether or not it is dark mode or light mode, and what the desired
       * contrast level is.
       */
      getArgb(scheme) {
        return this.getHct(scheme).toInt();
      }
      /**
       * Return a color, expressed in the HCT color space, that this
       * DynamicColor is under the conditions in scheme.
       *
       * @param scheme Defines the conditions of the user interface, for example,
       * whether or not it is dark mode or light mode, and what the desired
       * contrast level is.
       */
      getHct(scheme) {
        const cachedAnswer = this.hctCache.get(scheme);
        if (cachedAnswer != null) {
          return cachedAnswer;
        }
        const tone = this.getTone(scheme);
        const answer = this.palette(scheme).getHct(tone);
        if (this.hctCache.size > 4) {
          this.hctCache.clear();
        }
        this.hctCache.set(scheme, answer);
        return answer;
      }
      /**
       * Return a tone, T in the HCT color space, that this DynamicColor is under
       * the conditions in scheme.
       *
       * @param scheme Defines the conditions of the user interface, for example,
       * whether or not it is dark mode or light mode, and what the desired
       * contrast level is.
       */
      getTone(scheme) {
        const decreasingContrast = scheme.contrastLevel < 0;
        if (this.toneDeltaPair) {
          const toneDeltaPair = this.toneDeltaPair(scheme);
          const roleA = toneDeltaPair.roleA;
          const roleB = toneDeltaPair.roleB;
          const delta = toneDeltaPair.delta;
          const polarity = toneDeltaPair.polarity;
          const stayTogether = toneDeltaPair.stayTogether;
          const bg = this.background(scheme);
          const bgTone = bg.getTone(scheme);
          const aIsNearer = polarity === "nearer" || polarity === "lighter" && !scheme.isDark || polarity === "darker" && scheme.isDark;
          const nearer = aIsNearer ? roleA : roleB;
          const farther = aIsNearer ? roleB : roleA;
          const amNearer = this.name === nearer.name;
          const expansionDir = scheme.isDark ? 1 : -1;
          const nContrast = nearer.contrastCurve.get(scheme.contrastLevel);
          const fContrast = farther.contrastCurve.get(scheme.contrastLevel);
          const nInitialTone = nearer.tone(scheme);
          let nTone = Contrast.ratioOfTones(bgTone, nInitialTone) >= nContrast ? nInitialTone : _DynamicColor.foregroundTone(bgTone, nContrast);
          const fInitialTone = farther.tone(scheme);
          let fTone = Contrast.ratioOfTones(bgTone, fInitialTone) >= fContrast ? fInitialTone : _DynamicColor.foregroundTone(bgTone, fContrast);
          if (decreasingContrast) {
            nTone = _DynamicColor.foregroundTone(bgTone, nContrast);
            fTone = _DynamicColor.foregroundTone(bgTone, fContrast);
          }
          if ((fTone - nTone) * expansionDir >= delta) {
          } else {
            fTone = clampDouble(0, 100, nTone + delta * expansionDir);
            if ((fTone - nTone) * expansionDir >= delta) {
            } else {
              nTone = clampDouble(0, 100, fTone - delta * expansionDir);
            }
          }
          if (50 <= nTone && nTone < 60) {
            if (expansionDir > 0) {
              nTone = 60;
              fTone = Math.max(fTone, nTone + delta * expansionDir);
            } else {
              nTone = 49;
              fTone = Math.min(fTone, nTone + delta * expansionDir);
            }
          } else if (50 <= fTone && fTone < 60) {
            if (stayTogether) {
              if (expansionDir > 0) {
                nTone = 60;
                fTone = Math.max(fTone, nTone + delta * expansionDir);
              } else {
                nTone = 49;
                fTone = Math.min(fTone, nTone + delta * expansionDir);
              }
            } else {
              if (expansionDir > 0) {
                fTone = 60;
              } else {
                fTone = 49;
              }
            }
          }
          return amNearer ? nTone : fTone;
        } else {
          let answer = this.tone(scheme);
          if (this.background == null) {
            return answer;
          }
          const bgTone = this.background(scheme).getTone(scheme);
          const desiredRatio = this.contrastCurve.get(scheme.contrastLevel);
          if (Contrast.ratioOfTones(bgTone, answer) >= desiredRatio) {
          } else {
            answer = _DynamicColor.foregroundTone(bgTone, desiredRatio);
          }
          if (decreasingContrast) {
            answer = _DynamicColor.foregroundTone(bgTone, desiredRatio);
          }
          if (this.isBackground && 50 <= answer && answer < 60) {
            if (Contrast.ratioOfTones(49, bgTone) >= desiredRatio) {
              answer = 49;
            } else {
              answer = 60;
            }
          }
          if (this.secondBackground) {
            const [bg1, bg2] = [this.background, this.secondBackground];
            const [bgTone1, bgTone2] = [bg1(scheme).getTone(scheme), bg2(scheme).getTone(scheme)];
            const [upper, lower] = [Math.max(bgTone1, bgTone2), Math.min(bgTone1, bgTone2)];
            if (Contrast.ratioOfTones(upper, answer) >= desiredRatio && Contrast.ratioOfTones(lower, answer) >= desiredRatio) {
              return answer;
            }
            const lightOption = Contrast.lighter(upper, desiredRatio);
            const darkOption = Contrast.darker(lower, desiredRatio);
            const availables = [];
            if (lightOption !== -1)
              availables.push(lightOption);
            if (darkOption !== -1)
              availables.push(darkOption);
            const prefersLight = _DynamicColor.tonePrefersLightForeground(bgTone1) || _DynamicColor.tonePrefersLightForeground(bgTone2);
            if (prefersLight) {
              return lightOption < 0 ? 100 : lightOption;
            }
            if (availables.length === 1) {
              return availables[0];
            }
            return darkOption < 0 ? 0 : darkOption;
          }
          return answer;
        }
      }
      /**
       * Given a background tone, find a foreground tone, while ensuring they reach
       * a contrast ratio that is as close to [ratio] as possible.
       *
       * @param bgTone Tone in HCT. Range is 0 to 100, undefined behavior when it
       *     falls outside that range.
       * @param ratio The contrast ratio desired between bgTone and the return
       *     value.
       */
      static foregroundTone(bgTone, ratio) {
        const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
        const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);
        const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
        const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);
        const preferLighter = _DynamicColor.tonePrefersLightForeground(bgTone);
        if (preferLighter) {
          const negligibleDifference = Math.abs(lighterRatio - darkerRatio) < 0.1 && lighterRatio < ratio && darkerRatio < ratio;
          return lighterRatio >= ratio || lighterRatio >= darkerRatio || negligibleDifference ? lighterTone : darkerTone;
        } else {
          return darkerRatio >= ratio || darkerRatio >= lighterRatio ? darkerTone : lighterTone;
        }
      }
      /**
       * Returns whether [tone] prefers a light foreground.
       *
       * People prefer white foregrounds on ~T60-70. Observed over time, and also
       * by Andrew Somers during research for APCA.
       *
       * T60 used as to create the smallest discontinuity possible when skipping
       * down to T49 in order to ensure light foregrounds.
       * Since `tertiaryContainer` in dark monochrome scheme requires a tone of
       * 60, it should not be adjusted. Therefore, 60 is excluded here.
       */
      static tonePrefersLightForeground(tone) {
        return Math.round(tone) < 60;
      }
      /**
       * Returns whether [tone] can reach a contrast ratio of 4.5 with a lighter
       * color.
       */
      static toneAllowsLightForeground(tone) {
        return Math.round(tone) <= 49;
      }
      /**
       * Adjust a tone such that white has 4.5 contrast, if the tone is
       * reasonably close to supporting it.
       */
      static enableLightForeground(tone) {
        if (_DynamicColor.tonePrefersLightForeground(tone) && !_DynamicColor.toneAllowsLightForeground(tone)) {
          return 49;
        }
        return tone;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/palettes/tonal_palette.js
var TonalPalette, KeyColor;
var init_tonal_palette = __esm({
  "../../node_modules/@material/material-color-utilities/palettes/tonal_palette.js"() {
    init_hct();
    TonalPalette = class _TonalPalette {
      /**
       * @param argb ARGB representation of a color
       * @return Tones matching that color's hue and chroma.
       */
      static fromInt(argb) {
        const hct = Hct.fromInt(argb);
        return _TonalPalette.fromHct(hct);
      }
      /**
       * @param hct Hct
       * @return Tones matching that color's hue and chroma.
       */
      static fromHct(hct) {
        return new _TonalPalette(hct.hue, hct.chroma, hct);
      }
      /**
       * @param hue HCT hue
       * @param chroma HCT chroma
       * @return Tones matching hue and chroma.
       */
      static fromHueAndChroma(hue, chroma) {
        const keyColor = new KeyColor(hue, chroma).create();
        return new _TonalPalette(hue, chroma, keyColor);
      }
      constructor(hue, chroma, keyColor) {
        this.hue = hue;
        this.chroma = chroma;
        this.keyColor = keyColor;
        this.cache = /* @__PURE__ */ new Map();
      }
      /**
       * @param tone HCT tone, measured from 0 to 100.
       * @return ARGB representation of a color with that tone.
       */
      tone(tone) {
        let argb = this.cache.get(tone);
        if (argb === void 0) {
          argb = Hct.from(this.hue, this.chroma, tone).toInt();
          this.cache.set(tone, argb);
        }
        return argb;
      }
      /**
       * @param tone HCT tone.
       * @return HCT representation of a color with that tone.
       */
      getHct(tone) {
        return Hct.fromInt(this.tone(tone));
      }
    };
    KeyColor = class {
      constructor(hue, requestedChroma) {
        this.hue = hue;
        this.requestedChroma = requestedChroma;
        this.chromaCache = /* @__PURE__ */ new Map();
        this.maxChromaValue = 200;
      }
      /**
       * Creates a key color from a [hue] and a [chroma].
       * The key color is the first tone, starting from T50, matching the given hue
       * and chroma.
       *
       * @return Key color [Hct]
       */
      create() {
        const pivotTone = 50;
        const toneStepSize = 1;
        const epsilon = 0.01;
        let lowerTone = 0;
        let upperTone = 100;
        while (lowerTone < upperTone) {
          const midTone = Math.floor((lowerTone + upperTone) / 2);
          const isAscending = this.maxChroma(midTone) < this.maxChroma(midTone + toneStepSize);
          const sufficientChroma = this.maxChroma(midTone) >= this.requestedChroma - epsilon;
          if (sufficientChroma) {
            if (Math.abs(lowerTone - pivotTone) < Math.abs(upperTone - pivotTone)) {
              upperTone = midTone;
            } else {
              if (lowerTone === midTone) {
                return Hct.from(this.hue, this.requestedChroma, lowerTone);
              }
              lowerTone = midTone;
            }
          } else {
            if (isAscending) {
              lowerTone = midTone + toneStepSize;
            } else {
              upperTone = midTone;
            }
          }
        }
        return Hct.from(this.hue, this.requestedChroma, lowerTone);
      }
      // Find the maximum chroma for a given tone
      maxChroma(tone) {
        if (this.chromaCache.has(tone)) {
          return this.chromaCache.get(tone);
        }
        const chroma = Hct.from(this.hue, this.maxChromaValue, tone).chroma;
        this.chromaCache.set(tone, chroma);
        return chroma;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/contrast_curve.js
var ContrastCurve;
var init_contrast_curve = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/contrast_curve.js"() {
    init_math_utils();
    ContrastCurve = class {
      /**
       * Creates a `ContrastCurve` object.
       *
       * @param low Value for contrast level -1.0
       * @param normal Value for contrast level 0.0
       * @param medium Value for contrast level 0.5
       * @param high Value for contrast level 1.0
       */
      constructor(low, normal, medium, high) {
        this.low = low;
        this.normal = normal;
        this.medium = medium;
        this.high = high;
      }
      /**
       * Returns the value at a given contrast level.
       *
       * @param contrastLevel The contrast level. 0.0 is the default (normal); -1.0
       *     is the lowest; 1.0 is the highest.
       * @return The value. For contrast ratios, a number between 1.0 and 21.0.
       */
      get(contrastLevel) {
        if (contrastLevel <= -1) {
          return this.low;
        } else if (contrastLevel < 0) {
          return lerp(this.low, this.normal, (contrastLevel - -1) / 1);
        } else if (contrastLevel < 0.5) {
          return lerp(this.normal, this.medium, (contrastLevel - 0) / 0.5);
        } else if (contrastLevel < 1) {
          return lerp(this.medium, this.high, (contrastLevel - 0.5) / 0.5);
        } else {
          return this.high;
        }
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/tone_delta_pair.js
var ToneDeltaPair;
var init_tone_delta_pair = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/tone_delta_pair.js"() {
    ToneDeltaPair = class {
      /**
       * Documents a constraint in tone distance between two DynamicColors.
       *
       * The polarity is an adjective that describes "A", compared to "B".
       *
       * For instance, ToneDeltaPair(A, B, 15, 'darker', stayTogether) states that
       * A's tone should be at least 15 darker than B's.
       *
       * 'nearer' and 'farther' describes closeness to the surface roles. For
       * instance, ToneDeltaPair(A, B, 10, 'nearer', stayTogether) states that A
       * should be 10 lighter than B in light mode, and 10 darker than B in dark
       * mode.
       *
       * @param roleA The first role in a pair.
       * @param roleB The second role in a pair.
       * @param delta Required difference between tones. Absolute value, negative
       * values have undefined behavior.
       * @param polarity The relative relation between tones of roleA and roleB,
       * as described above.
       * @param stayTogether Whether these two roles should stay on the same side of
       * the "awkward zone" (T50-59). This is necessary for certain cases where
       * one role has two backgrounds.
       */
      constructor(roleA, roleB, delta, polarity, stayTogether) {
        this.roleA = roleA;
        this.roleB = roleB;
        this.delta = delta;
        this.polarity = polarity;
        this.stayTogether = stayTogether;
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/variant.js
var Variant;
var init_variant = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/variant.js"() {
    (function(Variant2) {
      Variant2[Variant2["MONOCHROME"] = 0] = "MONOCHROME";
      Variant2[Variant2["NEUTRAL"] = 1] = "NEUTRAL";
      Variant2[Variant2["TONAL_SPOT"] = 2] = "TONAL_SPOT";
      Variant2[Variant2["VIBRANT"] = 3] = "VIBRANT";
      Variant2[Variant2["EXPRESSIVE"] = 4] = "EXPRESSIVE";
      Variant2[Variant2["FIDELITY"] = 5] = "FIDELITY";
      Variant2[Variant2["CONTENT"] = 6] = "CONTENT";
      Variant2[Variant2["RAINBOW"] = 7] = "RAINBOW";
      Variant2[Variant2["FRUIT_SALAD"] = 8] = "FRUIT_SALAD";
    })(Variant || (Variant = {}));
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js
function isFidelity(scheme) {
  return scheme.variant === Variant.FIDELITY || scheme.variant === Variant.CONTENT;
}
function isMonochrome(scheme) {
  return scheme.variant === Variant.MONOCHROME;
}
function findDesiredChromaByTone(hue, chroma, tone, byDecreasingTone) {
  let answer = tone;
  let closestToChroma = Hct.from(hue, chroma, tone);
  if (closestToChroma.chroma < chroma) {
    let chromaPeak = closestToChroma.chroma;
    while (closestToChroma.chroma < chroma) {
      answer += byDecreasingTone ? -1 : 1;
      const potentialSolution = Hct.from(hue, chroma, answer);
      if (chromaPeak > potentialSolution.chroma) {
        break;
      }
      if (Math.abs(potentialSolution.chroma - chroma) < 0.4) {
        break;
      }
      const potentialDelta = Math.abs(potentialSolution.chroma - chroma);
      const currentDelta = Math.abs(closestToChroma.chroma - chroma);
      if (potentialDelta < currentDelta) {
        closestToChroma = potentialSolution;
      }
      chromaPeak = Math.max(chromaPeak, potentialSolution.chroma);
    }
  }
  return answer;
}
var MaterialDynamicColors;
var init_material_dynamic_colors = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js"() {
    init_dislike_analyzer();
    init_hct();
    init_contrast_curve();
    init_dynamic_color();
    init_tone_delta_pair();
    init_variant();
    MaterialDynamicColors = class _MaterialDynamicColors {
      static highestSurface(s4) {
        return s4.isDark ? _MaterialDynamicColors.surfaceBright : _MaterialDynamicColors.surfaceDim;
      }
    };
    MaterialDynamicColors.contentAccentToneDelta = 15;
    MaterialDynamicColors.primaryPaletteKeyColor = DynamicColor.fromPalette({
      name: "primary_palette_key_color",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => s4.primaryPalette.keyColor.tone
    });
    MaterialDynamicColors.secondaryPaletteKeyColor = DynamicColor.fromPalette({
      name: "secondary_palette_key_color",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => s4.secondaryPalette.keyColor.tone
    });
    MaterialDynamicColors.tertiaryPaletteKeyColor = DynamicColor.fromPalette({
      name: "tertiary_palette_key_color",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => s4.tertiaryPalette.keyColor.tone
    });
    MaterialDynamicColors.neutralPaletteKeyColor = DynamicColor.fromPalette({
      name: "neutral_palette_key_color",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.neutralPalette.keyColor.tone
    });
    MaterialDynamicColors.neutralVariantPaletteKeyColor = DynamicColor.fromPalette({
      name: "neutral_variant_palette_key_color",
      palette: (s4) => s4.neutralVariantPalette,
      tone: (s4) => s4.neutralVariantPalette.keyColor.tone
    });
    MaterialDynamicColors.background = DynamicColor.fromPalette({
      name: "background",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 6 : 98,
      isBackground: true
    });
    MaterialDynamicColors.onBackground = DynamicColor.fromPalette({
      name: "on_background",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 90 : 10,
      background: (s4) => MaterialDynamicColors.background,
      contrastCurve: new ContrastCurve(3, 3, 4.5, 7)
    });
    MaterialDynamicColors.surface = DynamicColor.fromPalette({
      name: "surface",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 6 : 98,
      isBackground: true
    });
    MaterialDynamicColors.surfaceDim = DynamicColor.fromPalette({
      name: "surface_dim",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 6 : new ContrastCurve(87, 87, 80, 75).get(s4.contrastLevel),
      isBackground: true
    });
    MaterialDynamicColors.surfaceBright = DynamicColor.fromPalette({
      name: "surface_bright",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(24, 24, 29, 34).get(s4.contrastLevel) : 98,
      isBackground: true
    });
    MaterialDynamicColors.surfaceContainerLowest = DynamicColor.fromPalette({
      name: "surface_container_lowest",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(4, 4, 2, 0).get(s4.contrastLevel) : 100,
      isBackground: true
    });
    MaterialDynamicColors.surfaceContainerLow = DynamicColor.fromPalette({
      name: "surface_container_low",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(10, 10, 11, 12).get(s4.contrastLevel) : new ContrastCurve(96, 96, 96, 95).get(s4.contrastLevel),
      isBackground: true
    });
    MaterialDynamicColors.surfaceContainer = DynamicColor.fromPalette({
      name: "surface_container",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(12, 12, 16, 20).get(s4.contrastLevel) : new ContrastCurve(94, 94, 92, 90).get(s4.contrastLevel),
      isBackground: true
    });
    MaterialDynamicColors.surfaceContainerHigh = DynamicColor.fromPalette({
      name: "surface_container_high",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(17, 17, 21, 25).get(s4.contrastLevel) : new ContrastCurve(92, 92, 88, 85).get(s4.contrastLevel),
      isBackground: true
    });
    MaterialDynamicColors.surfaceContainerHighest = DynamicColor.fromPalette({
      name: "surface_container_highest",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? new ContrastCurve(22, 22, 26, 30).get(s4.contrastLevel) : new ContrastCurve(90, 90, 84, 80).get(s4.contrastLevel),
      isBackground: true
    });
    MaterialDynamicColors.onSurface = DynamicColor.fromPalette({
      name: "on_surface",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 90 : 10,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.surfaceVariant = DynamicColor.fromPalette({
      name: "surface_variant",
      palette: (s4) => s4.neutralVariantPalette,
      tone: (s4) => s4.isDark ? 30 : 90,
      isBackground: true
    });
    MaterialDynamicColors.onSurfaceVariant = DynamicColor.fromPalette({
      name: "on_surface_variant",
      palette: (s4) => s4.neutralVariantPalette,
      tone: (s4) => s4.isDark ? 80 : 30,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.inverseSurface = DynamicColor.fromPalette({
      name: "inverse_surface",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 90 : 20
    });
    MaterialDynamicColors.inverseOnSurface = DynamicColor.fromPalette({
      name: "inverse_on_surface",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => s4.isDark ? 20 : 95,
      background: (s4) => MaterialDynamicColors.inverseSurface,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.outline = DynamicColor.fromPalette({
      name: "outline",
      palette: (s4) => s4.neutralVariantPalette,
      tone: (s4) => s4.isDark ? 60 : 50,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1.5, 3, 4.5, 7)
    });
    MaterialDynamicColors.outlineVariant = DynamicColor.fromPalette({
      name: "outline_variant",
      palette: (s4) => s4.neutralVariantPalette,
      tone: (s4) => s4.isDark ? 30 : 80,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5)
    });
    MaterialDynamicColors.shadow = DynamicColor.fromPalette({
      name: "shadow",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => 0
    });
    MaterialDynamicColors.scrim = DynamicColor.fromPalette({
      name: "scrim",
      palette: (s4) => s4.neutralPalette,
      tone: (s4) => 0
    });
    MaterialDynamicColors.surfaceTint = DynamicColor.fromPalette({
      name: "surface_tint",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => s4.isDark ? 80 : 40,
      isBackground: true
    });
    MaterialDynamicColors.primary = DynamicColor.fromPalette({
      name: "primary",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 100 : 0;
        }
        return s4.isDark ? 80 : 40;
      },
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryContainer, MaterialDynamicColors.primary, 10, "nearer", false)
    });
    MaterialDynamicColors.onPrimary = DynamicColor.fromPalette({
      name: "on_primary",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 10 : 90;
        }
        return s4.isDark ? 20 : 100;
      },
      background: (s4) => MaterialDynamicColors.primary,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.primaryContainer = DynamicColor.fromPalette({
      name: "primary_container",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => {
        if (isFidelity(s4)) {
          return s4.sourceColorHct.tone;
        }
        if (isMonochrome(s4)) {
          return s4.isDark ? 85 : 25;
        }
        return s4.isDark ? 30 : 90;
      },
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryContainer, MaterialDynamicColors.primary, 10, "nearer", false)
    });
    MaterialDynamicColors.onPrimaryContainer = DynamicColor.fromPalette({
      name: "on_primary_container",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => {
        if (isFidelity(s4)) {
          return DynamicColor.foregroundTone(MaterialDynamicColors.primaryContainer.tone(s4), 4.5);
        }
        if (isMonochrome(s4)) {
          return s4.isDark ? 0 : 100;
        }
        return s4.isDark ? 90 : 30;
      },
      background: (s4) => MaterialDynamicColors.primaryContainer,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.inversePrimary = DynamicColor.fromPalette({
      name: "inverse_primary",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => s4.isDark ? 40 : 80,
      background: (s4) => MaterialDynamicColors.inverseSurface,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 7)
    });
    MaterialDynamicColors.secondary = DynamicColor.fromPalette({
      name: "secondary",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => s4.isDark ? 80 : 40,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryContainer, MaterialDynamicColors.secondary, 10, "nearer", false)
    });
    MaterialDynamicColors.onSecondary = DynamicColor.fromPalette({
      name: "on_secondary",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 10 : 100;
        } else {
          return s4.isDark ? 20 : 100;
        }
      },
      background: (s4) => MaterialDynamicColors.secondary,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.secondaryContainer = DynamicColor.fromPalette({
      name: "secondary_container",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => {
        const initialTone = s4.isDark ? 30 : 90;
        if (isMonochrome(s4)) {
          return s4.isDark ? 30 : 85;
        }
        if (!isFidelity(s4)) {
          return initialTone;
        }
        return findDesiredChromaByTone(s4.secondaryPalette.hue, s4.secondaryPalette.chroma, initialTone, s4.isDark ? false : true);
      },
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryContainer, MaterialDynamicColors.secondary, 10, "nearer", false)
    });
    MaterialDynamicColors.onSecondaryContainer = DynamicColor.fromPalette({
      name: "on_secondary_container",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 90 : 10;
        }
        if (!isFidelity(s4)) {
          return s4.isDark ? 90 : 30;
        }
        return DynamicColor.foregroundTone(MaterialDynamicColors.secondaryContainer.tone(s4), 4.5);
      },
      background: (s4) => MaterialDynamicColors.secondaryContainer,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.tertiary = DynamicColor.fromPalette({
      name: "tertiary",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 90 : 25;
        }
        return s4.isDark ? 80 : 40;
      },
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryContainer, MaterialDynamicColors.tertiary, 10, "nearer", false)
    });
    MaterialDynamicColors.onTertiary = DynamicColor.fromPalette({
      name: "on_tertiary",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 10 : 90;
        }
        return s4.isDark ? 20 : 100;
      },
      background: (s4) => MaterialDynamicColors.tertiary,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.tertiaryContainer = DynamicColor.fromPalette({
      name: "tertiary_container",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 60 : 49;
        }
        if (!isFidelity(s4)) {
          return s4.isDark ? 30 : 90;
        }
        const proposedHct = s4.tertiaryPalette.getHct(s4.sourceColorHct.tone);
        return DislikeAnalyzer.fixIfDisliked(proposedHct).tone;
      },
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryContainer, MaterialDynamicColors.tertiary, 10, "nearer", false)
    });
    MaterialDynamicColors.onTertiaryContainer = DynamicColor.fromPalette({
      name: "on_tertiary_container",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 0 : 100;
        }
        if (!isFidelity(s4)) {
          return s4.isDark ? 90 : 30;
        }
        return DynamicColor.foregroundTone(MaterialDynamicColors.tertiaryContainer.tone(s4), 4.5);
      },
      background: (s4) => MaterialDynamicColors.tertiaryContainer,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.error = DynamicColor.fromPalette({
      name: "error",
      palette: (s4) => s4.errorPalette,
      tone: (s4) => s4.isDark ? 80 : 40,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.errorContainer, MaterialDynamicColors.error, 10, "nearer", false)
    });
    MaterialDynamicColors.onError = DynamicColor.fromPalette({
      name: "on_error",
      palette: (s4) => s4.errorPalette,
      tone: (s4) => s4.isDark ? 20 : 100,
      background: (s4) => MaterialDynamicColors.error,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.errorContainer = DynamicColor.fromPalette({
      name: "error_container",
      palette: (s4) => s4.errorPalette,
      tone: (s4) => s4.isDark ? 30 : 90,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.errorContainer, MaterialDynamicColors.error, 10, "nearer", false)
    });
    MaterialDynamicColors.onErrorContainer = DynamicColor.fromPalette({
      name: "on_error_container",
      palette: (s4) => s4.errorPalette,
      tone: (s4) => {
        if (isMonochrome(s4)) {
          return s4.isDark ? 90 : 10;
        }
        return s4.isDark ? 90 : 30;
      },
      background: (s4) => MaterialDynamicColors.errorContainer,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.primaryFixed = DynamicColor.fromPalette({
      name: "primary_fixed",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => isMonochrome(s4) ? 40 : 90,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryFixed, MaterialDynamicColors.primaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.primaryFixedDim = DynamicColor.fromPalette({
      name: "primary_fixed_dim",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => isMonochrome(s4) ? 30 : 80,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.primaryFixed, MaterialDynamicColors.primaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.onPrimaryFixed = DynamicColor.fromPalette({
      name: "on_primary_fixed",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => isMonochrome(s4) ? 100 : 10,
      background: (s4) => MaterialDynamicColors.primaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.primaryFixed,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.onPrimaryFixedVariant = DynamicColor.fromPalette({
      name: "on_primary_fixed_variant",
      palette: (s4) => s4.primaryPalette,
      tone: (s4) => isMonochrome(s4) ? 90 : 30,
      background: (s4) => MaterialDynamicColors.primaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.primaryFixed,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.secondaryFixed = DynamicColor.fromPalette({
      name: "secondary_fixed",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => isMonochrome(s4) ? 80 : 90,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryFixed, MaterialDynamicColors.secondaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.secondaryFixedDim = DynamicColor.fromPalette({
      name: "secondary_fixed_dim",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => isMonochrome(s4) ? 70 : 80,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.secondaryFixed, MaterialDynamicColors.secondaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.onSecondaryFixed = DynamicColor.fromPalette({
      name: "on_secondary_fixed",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => 10,
      background: (s4) => MaterialDynamicColors.secondaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.secondaryFixed,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.onSecondaryFixedVariant = DynamicColor.fromPalette({
      name: "on_secondary_fixed_variant",
      palette: (s4) => s4.secondaryPalette,
      tone: (s4) => isMonochrome(s4) ? 25 : 30,
      background: (s4) => MaterialDynamicColors.secondaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.secondaryFixed,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
    MaterialDynamicColors.tertiaryFixed = DynamicColor.fromPalette({
      name: "tertiary_fixed",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => isMonochrome(s4) ? 40 : 90,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryFixed, MaterialDynamicColors.tertiaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.tertiaryFixedDim = DynamicColor.fromPalette({
      name: "tertiary_fixed_dim",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => isMonochrome(s4) ? 30 : 80,
      isBackground: true,
      background: (s4) => MaterialDynamicColors.highestSurface(s4),
      contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
      toneDeltaPair: (s4) => new ToneDeltaPair(MaterialDynamicColors.tertiaryFixed, MaterialDynamicColors.tertiaryFixedDim, 10, "lighter", true)
    });
    MaterialDynamicColors.onTertiaryFixed = DynamicColor.fromPalette({
      name: "on_tertiary_fixed",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => isMonochrome(s4) ? 100 : 10,
      background: (s4) => MaterialDynamicColors.tertiaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.tertiaryFixed,
      contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });
    MaterialDynamicColors.onTertiaryFixedVariant = DynamicColor.fromPalette({
      name: "on_tertiary_fixed_variant",
      palette: (s4) => s4.tertiaryPalette,
      tone: (s4) => isMonochrome(s4) ? 90 : 30,
      background: (s4) => MaterialDynamicColors.tertiaryFixedDim,
      secondBackground: (s4) => MaterialDynamicColors.tertiaryFixed,
      contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
  }
});

// ../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_scheme.js
var DynamicScheme;
var init_dynamic_scheme = __esm({
  "../../node_modules/@material/material-color-utilities/dynamiccolor/dynamic_scheme.js"() {
    init_hct();
    init_tonal_palette();
    init_math_utils();
    init_material_dynamic_colors();
    DynamicScheme = class {
      constructor(args) {
        this.sourceColorArgb = args.sourceColorArgb;
        this.variant = args.variant;
        this.contrastLevel = args.contrastLevel;
        this.isDark = args.isDark;
        this.sourceColorHct = Hct.fromInt(args.sourceColorArgb);
        this.primaryPalette = args.primaryPalette;
        this.secondaryPalette = args.secondaryPalette;
        this.tertiaryPalette = args.tertiaryPalette;
        this.neutralPalette = args.neutralPalette;
        this.neutralVariantPalette = args.neutralVariantPalette;
        this.errorPalette = TonalPalette.fromHueAndChroma(25, 84);
      }
      /**
       * Support design spec'ing Dynamic Color by schemes that specify hue
       * rotations that should be applied at certain breakpoints.
       * @param sourceColor the source color of the theme, in HCT.
       * @param hues The "breakpoints", i.e. the hues at which a rotation should
       * be apply.
       * @param rotations The rotation that should be applied when source color's
       * hue is >= the same index in hues array, and <= the hue at the next index
       * in hues array.
       */
      static getRotatedHue(sourceColor, hues, rotations) {
        const sourceHue = sourceColor.hue;
        if (hues.length !== rotations.length) {
          throw new Error(`mismatch between hue length ${hues.length} & rotations ${rotations.length}`);
        }
        if (rotations.length === 1) {
          return sanitizeDegreesDouble(sourceColor.hue + rotations[0]);
        }
        const size = hues.length;
        for (let i7 = 0; i7 <= size - 2; i7++) {
          const thisHue = hues[i7];
          const nextHue = hues[i7 + 1];
          if (thisHue < sourceHue && sourceHue < nextHue) {
            return sanitizeDegreesDouble(sourceHue + rotations[i7]);
          }
        }
        return sourceHue;
      }
      getArgb(dynamicColor) {
        return dynamicColor.getArgb(this);
      }
      getHct(dynamicColor) {
        return dynamicColor.getHct(this);
      }
      get primaryPaletteKeyColor() {
        return this.getArgb(MaterialDynamicColors.primaryPaletteKeyColor);
      }
      get secondaryPaletteKeyColor() {
        return this.getArgb(MaterialDynamicColors.secondaryPaletteKeyColor);
      }
      get tertiaryPaletteKeyColor() {
        return this.getArgb(MaterialDynamicColors.tertiaryPaletteKeyColor);
      }
      get neutralPaletteKeyColor() {
        return this.getArgb(MaterialDynamicColors.neutralPaletteKeyColor);
      }
      get neutralVariantPaletteKeyColor() {
        return this.getArgb(MaterialDynamicColors.neutralVariantPaletteKeyColor);
      }
      get background() {
        return this.getArgb(MaterialDynamicColors.background);
      }
      get onBackground() {
        return this.getArgb(MaterialDynamicColors.onBackground);
      }
      get surface() {
        return this.getArgb(MaterialDynamicColors.surface);
      }
      get surfaceDim() {
        return this.getArgb(MaterialDynamicColors.surfaceDim);
      }
      get surfaceBright() {
        return this.getArgb(MaterialDynamicColors.surfaceBright);
      }
      get surfaceContainerLowest() {
        return this.getArgb(MaterialDynamicColors.surfaceContainerLowest);
      }
      get surfaceContainerLow() {
        return this.getArgb(MaterialDynamicColors.surfaceContainerLow);
      }
      get surfaceContainer() {
        return this.getArgb(MaterialDynamicColors.surfaceContainer);
      }
      get surfaceContainerHigh() {
        return this.getArgb(MaterialDynamicColors.surfaceContainerHigh);
      }
      get surfaceContainerHighest() {
        return this.getArgb(MaterialDynamicColors.surfaceContainerHighest);
      }
      get onSurface() {
        return this.getArgb(MaterialDynamicColors.onSurface);
      }
      get surfaceVariant() {
        return this.getArgb(MaterialDynamicColors.surfaceVariant);
      }
      get onSurfaceVariant() {
        return this.getArgb(MaterialDynamicColors.onSurfaceVariant);
      }
      get inverseSurface() {
        return this.getArgb(MaterialDynamicColors.inverseSurface);
      }
      get inverseOnSurface() {
        return this.getArgb(MaterialDynamicColors.inverseOnSurface);
      }
      get outline() {
        return this.getArgb(MaterialDynamicColors.outline);
      }
      get outlineVariant() {
        return this.getArgb(MaterialDynamicColors.outlineVariant);
      }
      get shadow() {
        return this.getArgb(MaterialDynamicColors.shadow);
      }
      get scrim() {
        return this.getArgb(MaterialDynamicColors.scrim);
      }
      get surfaceTint() {
        return this.getArgb(MaterialDynamicColors.surfaceTint);
      }
      get primary() {
        return this.getArgb(MaterialDynamicColors.primary);
      }
      get onPrimary() {
        return this.getArgb(MaterialDynamicColors.onPrimary);
      }
      get primaryContainer() {
        return this.getArgb(MaterialDynamicColors.primaryContainer);
      }
      get onPrimaryContainer() {
        return this.getArgb(MaterialDynamicColors.onPrimaryContainer);
      }
      get inversePrimary() {
        return this.getArgb(MaterialDynamicColors.inversePrimary);
      }
      get secondary() {
        return this.getArgb(MaterialDynamicColors.secondary);
      }
      get onSecondary() {
        return this.getArgb(MaterialDynamicColors.onSecondary);
      }
      get secondaryContainer() {
        return this.getArgb(MaterialDynamicColors.secondaryContainer);
      }
      get onSecondaryContainer() {
        return this.getArgb(MaterialDynamicColors.onSecondaryContainer);
      }
      get tertiary() {
        return this.getArgb(MaterialDynamicColors.tertiary);
      }
      get onTertiary() {
        return this.getArgb(MaterialDynamicColors.onTertiary);
      }
      get tertiaryContainer() {
        return this.getArgb(MaterialDynamicColors.tertiaryContainer);
      }
      get onTertiaryContainer() {
        return this.getArgb(MaterialDynamicColors.onTertiaryContainer);
      }
      get error() {
        return this.getArgb(MaterialDynamicColors.error);
      }
      get onError() {
        return this.getArgb(MaterialDynamicColors.onError);
      }
      get errorContainer() {
        return this.getArgb(MaterialDynamicColors.errorContainer);
      }
      get onErrorContainer() {
        return this.getArgb(MaterialDynamicColors.onErrorContainer);
      }
      get primaryFixed() {
        return this.getArgb(MaterialDynamicColors.primaryFixed);
      }
      get primaryFixedDim() {
        return this.getArgb(MaterialDynamicColors.primaryFixedDim);
      }
      get onPrimaryFixed() {
        return this.getArgb(MaterialDynamicColors.onPrimaryFixed);
      }
      get onPrimaryFixedVariant() {
        return this.getArgb(MaterialDynamicColors.onPrimaryFixedVariant);
      }
      get secondaryFixed() {
        return this.getArgb(MaterialDynamicColors.secondaryFixed);
      }
      get secondaryFixedDim() {
        return this.getArgb(MaterialDynamicColors.secondaryFixedDim);
      }
      get onSecondaryFixed() {
        return this.getArgb(MaterialDynamicColors.onSecondaryFixed);
      }
      get onSecondaryFixedVariant() {
        return this.getArgb(MaterialDynamicColors.onSecondaryFixedVariant);
      }
      get tertiaryFixed() {
        return this.getArgb(MaterialDynamicColors.tertiaryFixed);
      }
      get tertiaryFixedDim() {
        return this.getArgb(MaterialDynamicColors.tertiaryFixedDim);
      }
      get onTertiaryFixed() {
        return this.getArgb(MaterialDynamicColors.onTertiaryFixed);
      }
      get onTertiaryFixedVariant() {
        return this.getArgb(MaterialDynamicColors.onTertiaryFixedVariant);
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/palettes/core_palette.js
var CorePalette;
var init_core_palette = __esm({
  "../../node_modules/@material/material-color-utilities/palettes/core_palette.js"() {
    init_hct();
    init_tonal_palette();
    CorePalette = class _CorePalette {
      /**
       * @param argb ARGB representation of a color
       */
      static of(argb) {
        return new _CorePalette(argb, false);
      }
      /**
       * @param argb ARGB representation of a color
       */
      static contentOf(argb) {
        return new _CorePalette(argb, true);
      }
      /**
       * Create a [CorePalette] from a set of colors
       */
      static fromColors(colors) {
        return _CorePalette.createPaletteFromColors(false, colors);
      }
      /**
       * Create a content [CorePalette] from a set of colors
       */
      static contentFromColors(colors) {
        return _CorePalette.createPaletteFromColors(true, colors);
      }
      static createPaletteFromColors(content, colors) {
        const palette = new _CorePalette(colors.primary, content);
        if (colors.secondary) {
          const p3 = new _CorePalette(colors.secondary, content);
          palette.a2 = p3.a1;
        }
        if (colors.tertiary) {
          const p3 = new _CorePalette(colors.tertiary, content);
          palette.a3 = p3.a1;
        }
        if (colors.error) {
          const p3 = new _CorePalette(colors.error, content);
          palette.error = p3.a1;
        }
        if (colors.neutral) {
          const p3 = new _CorePalette(colors.neutral, content);
          palette.n1 = p3.n1;
        }
        if (colors.neutralVariant) {
          const p3 = new _CorePalette(colors.neutralVariant, content);
          palette.n2 = p3.n2;
        }
        return palette;
      }
      constructor(argb, isContent) {
        const hct = Hct.fromInt(argb);
        const hue = hct.hue;
        const chroma = hct.chroma;
        if (isContent) {
          this.a1 = TonalPalette.fromHueAndChroma(hue, chroma);
          this.a2 = TonalPalette.fromHueAndChroma(hue, chroma / 3);
          this.a3 = TonalPalette.fromHueAndChroma(hue + 60, chroma / 2);
          this.n1 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 12, 4));
          this.n2 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 6, 8));
        } else {
          this.a1 = TonalPalette.fromHueAndChroma(hue, Math.max(48, chroma));
          this.a2 = TonalPalette.fromHueAndChroma(hue, 16);
          this.a3 = TonalPalette.fromHueAndChroma(hue + 60, 24);
          this.n1 = TonalPalette.fromHueAndChroma(hue, 4);
          this.n2 = TonalPalette.fromHueAndChroma(hue, 8);
        }
        this.error = TonalPalette.fromHueAndChroma(25, 84);
      }
    };
  }
});

// ../../node_modules/@material/material-color-utilities/quantize/lab_point_provider.js
var init_lab_point_provider = __esm({
  "../../node_modules/@material/material-color-utilities/quantize/lab_point_provider.js"() {
    init_color_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/quantize/quantizer_wsmeans.js
var init_quantizer_wsmeans = __esm({
  "../../node_modules/@material/material-color-utilities/quantize/quantizer_wsmeans.js"() {
    init_lab_point_provider();
  }
});

// ../../node_modules/@material/material-color-utilities/quantize/quantizer_map.js
var init_quantizer_map = __esm({
  "../../node_modules/@material/material-color-utilities/quantize/quantizer_map.js"() {
    init_color_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/quantize/quantizer_wu.js
var init_quantizer_wu = __esm({
  "../../node_modules/@material/material-color-utilities/quantize/quantizer_wu.js"() {
    init_color_utils();
    init_quantizer_map();
  }
});

// ../../node_modules/@material/material-color-utilities/quantize/quantizer_celebi.js
var init_quantizer_celebi = __esm({
  "../../node_modules/@material/material-color-utilities/quantize/quantizer_celebi.js"() {
    init_quantizer_wsmeans();
    init_quantizer_wu();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme.js
var init_scheme = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme.js"() {
    init_core_palette();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_android.js
var init_scheme_android = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_android.js"() {
    init_core_palette();
  }
});

// ../../node_modules/@material/material-color-utilities/temperature/temperature_cache.js
var init_temperature_cache = __esm({
  "../../node_modules/@material/material-color-utilities/temperature/temperature_cache.js"() {
    init_hct();
    init_color_utils();
    init_math_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_content.js
var init_scheme_content = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_content.js"() {
    init_dislike_analyzer();
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_temperature_cache();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_expressive.js
var SchemeExpressive;
var init_scheme_expressive = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_expressive.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_math_utils();
    SchemeExpressive = class _SchemeExpressive extends DynamicScheme {
      constructor(sourceColorHct, isDark, contrastLevel) {
        super({
          sourceColorArgb: sourceColorHct.toInt(),
          variant: Variant.EXPRESSIVE,
          contrastLevel,
          isDark,
          primaryPalette: TonalPalette.fromHueAndChroma(sanitizeDegreesDouble(sourceColorHct.hue + 240), 40),
          secondaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeExpressive.hues, _SchemeExpressive.secondaryRotations), 24),
          tertiaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeExpressive.hues, _SchemeExpressive.tertiaryRotations), 32),
          neutralPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue + 15, 8),
          neutralVariantPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue + 15, 12)
        });
      }
    };
    SchemeExpressive.hues = [
      0,
      21,
      51,
      121,
      151,
      191,
      271,
      321,
      360
    ];
    SchemeExpressive.secondaryRotations = [
      45,
      95,
      45,
      20,
      45,
      90,
      45,
      45,
      45
    ];
    SchemeExpressive.tertiaryRotations = [
      120,
      120,
      20,
      45,
      20,
      15,
      20,
      120,
      120
    ];
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_fidelity.js
var init_scheme_fidelity = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_fidelity.js"() {
    init_dislike_analyzer();
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_temperature_cache();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_fruit_salad.js
var init_scheme_fruit_salad = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_fruit_salad.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_math_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_monochrome.js
var init_scheme_monochrome = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_monochrome.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_neutral.js
var init_scheme_neutral = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_neutral.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_rainbow.js
var init_scheme_rainbow = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_rainbow.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_math_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_tonal_spot.js
var init_scheme_tonal_spot = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_tonal_spot.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    init_math_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/scheme/scheme_vibrant.js
var SchemeVibrant;
var init_scheme_vibrant = __esm({
  "../../node_modules/@material/material-color-utilities/scheme/scheme_vibrant.js"() {
    init_dynamic_scheme();
    init_variant();
    init_tonal_palette();
    SchemeVibrant = class _SchemeVibrant extends DynamicScheme {
      constructor(sourceColorHct, isDark, contrastLevel) {
        super({
          sourceColorArgb: sourceColorHct.toInt(),
          variant: Variant.VIBRANT,
          contrastLevel,
          isDark,
          primaryPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 200),
          secondaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeVibrant.hues, _SchemeVibrant.secondaryRotations), 24),
          tertiaryPalette: TonalPalette.fromHueAndChroma(DynamicScheme.getRotatedHue(sourceColorHct, _SchemeVibrant.hues, _SchemeVibrant.tertiaryRotations), 32),
          neutralPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 10),
          neutralVariantPalette: TonalPalette.fromHueAndChroma(sourceColorHct.hue, 12)
        });
      }
    };
    SchemeVibrant.hues = [
      0,
      41,
      61,
      101,
      131,
      181,
      251,
      301,
      360
    ];
    SchemeVibrant.secondaryRotations = [
      18,
      15,
      10,
      12,
      15,
      18,
      15,
      12,
      12
    ];
    SchemeVibrant.tertiaryRotations = [
      35,
      30,
      20,
      25,
      30,
      35,
      30,
      25,
      25
    ];
  }
});

// ../../node_modules/@material/material-color-utilities/score/score.js
function compare(a3, b5) {
  if (a3.score > b5.score) {
    return -1;
  } else if (a3.score < b5.score) {
    return 1;
  }
  return 0;
}
var SCORE_OPTION_DEFAULTS, Score;
var init_score = __esm({
  "../../node_modules/@material/material-color-utilities/score/score.js"() {
    init_hct();
    init_math_utils();
    SCORE_OPTION_DEFAULTS = {
      desired: 4,
      fallbackColorARGB: 4282549748,
      filter: true
      // Avoid unsuitable colors.
    };
    Score = class _Score {
      constructor() {
      }
      /**
       * Given a map with keys of colors and values of how often the color appears,
       * rank the colors based on suitability for being used for a UI theme.
       *
       * @param colorsToPopulation map with keys of colors and values of how often
       *     the color appears, usually from a source image.
       * @param {ScoreOptions} options optional parameters.
       * @return Colors sorted by suitability for a UI theme. The most suitable
       *     color is the first item, the least suitable is the last. There will
       *     always be at least one color returned. If all the input colors
       *     were not suitable for a theme, a default fallback color will be
       *     provided, Google Blue.
       */
      static score(colorsToPopulation, options) {
        const { desired, fallbackColorARGB, filter } = { ...SCORE_OPTION_DEFAULTS, ...options };
        const colorsHct = [];
        const huePopulation = new Array(360).fill(0);
        let populationSum = 0;
        for (const [argb, population] of colorsToPopulation.entries()) {
          const hct = Hct.fromInt(argb);
          colorsHct.push(hct);
          const hue = Math.floor(hct.hue);
          huePopulation[hue] += population;
          populationSum += population;
        }
        const hueExcitedProportions = new Array(360).fill(0);
        for (let hue = 0; hue < 360; hue++) {
          const proportion = huePopulation[hue] / populationSum;
          for (let i7 = hue - 14; i7 < hue + 16; i7++) {
            const neighborHue = sanitizeDegreesInt(i7);
            hueExcitedProportions[neighborHue] += proportion;
          }
        }
        const scoredHct = new Array();
        for (const hct of colorsHct) {
          const hue = sanitizeDegreesInt(Math.round(hct.hue));
          const proportion = hueExcitedProportions[hue];
          if (filter && (hct.chroma < _Score.CUTOFF_CHROMA || proportion <= _Score.CUTOFF_EXCITED_PROPORTION)) {
            continue;
          }
          const proportionScore = proportion * 100 * _Score.WEIGHT_PROPORTION;
          const chromaWeight = hct.chroma < _Score.TARGET_CHROMA ? _Score.WEIGHT_CHROMA_BELOW : _Score.WEIGHT_CHROMA_ABOVE;
          const chromaScore = (hct.chroma - _Score.TARGET_CHROMA) * chromaWeight;
          const score = proportionScore + chromaScore;
          scoredHct.push({ hct, score });
        }
        scoredHct.sort(compare);
        const chosenColors = [];
        for (let differenceDegrees2 = 90; differenceDegrees2 >= 15; differenceDegrees2--) {
          chosenColors.length = 0;
          for (const { hct } of scoredHct) {
            const duplicateHue = chosenColors.find((chosenHct) => {
              return differenceDegrees(hct.hue, chosenHct.hue) < differenceDegrees2;
            });
            if (!duplicateHue) {
              chosenColors.push(hct);
            }
            if (chosenColors.length >= desired)
              break;
          }
          if (chosenColors.length >= desired)
            break;
        }
        const colors = [];
        if (chosenColors.length === 0) {
          colors.push(fallbackColorARGB);
        }
        for (const chosenHct of chosenColors) {
          colors.push(chosenHct.toInt());
        }
        return colors;
      }
    };
    Score.TARGET_CHROMA = 48;
    Score.WEIGHT_PROPORTION = 0.7;
    Score.WEIGHT_CHROMA_ABOVE = 0.3;
    Score.WEIGHT_CHROMA_BELOW = 0.1;
    Score.CUTOFF_CHROMA = 5;
    Score.CUTOFF_EXCITED_PROPORTION = 0.01;
  }
});

// ../../node_modules/@material/material-color-utilities/utils/string_utils.js
function hexFromArgb(argb) {
  const r6 = redFromArgb(argb);
  const g2 = greenFromArgb(argb);
  const b5 = blueFromArgb(argb);
  const outParts = [r6.toString(16), g2.toString(16), b5.toString(16)];
  for (const [i7, part] of outParts.entries()) {
    if (part.length === 1) {
      outParts[i7] = "0" + part;
    }
  }
  return "#" + outParts.join("");
}
function argbFromHex(hex) {
  hex = hex.replace("#", "");
  const isThree = hex.length === 3;
  const isSix = hex.length === 6;
  const isEight = hex.length === 8;
  if (!isThree && !isSix && !isEight) {
    throw new Error("unexpected hex " + hex);
  }
  let r6 = 0;
  let g2 = 0;
  let b5 = 0;
  if (isThree) {
    r6 = parseIntHex(hex.slice(0, 1).repeat(2));
    g2 = parseIntHex(hex.slice(1, 2).repeat(2));
    b5 = parseIntHex(hex.slice(2, 3).repeat(2));
  } else if (isSix) {
    r6 = parseIntHex(hex.slice(0, 2));
    g2 = parseIntHex(hex.slice(2, 4));
    b5 = parseIntHex(hex.slice(4, 6));
  } else if (isEight) {
    r6 = parseIntHex(hex.slice(2, 4));
    g2 = parseIntHex(hex.slice(4, 6));
    b5 = parseIntHex(hex.slice(6, 8));
  }
  return (255 << 24 | (r6 & 255) << 16 | (g2 & 255) << 8 | b5 & 255) >>> 0;
}
function parseIntHex(value) {
  return parseInt(value, 16);
}
var init_string_utils = __esm({
  "../../node_modules/@material/material-color-utilities/utils/string_utils.js"() {
    init_color_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/utils/image_utils.js
var init_image_utils = __esm({
  "../../node_modules/@material/material-color-utilities/utils/image_utils.js"() {
    init_quantizer_celebi();
    init_score();
    init_color_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/utils/theme_utils.js
var init_theme_utils = __esm({
  "../../node_modules/@material/material-color-utilities/utils/theme_utils.js"() {
    init_blend();
    init_core_palette();
    init_scheme();
    init_image_utils();
    init_string_utils();
  }
});

// ../../node_modules/@material/material-color-utilities/index.js
var init_material_color_utilities = __esm({
  "../../node_modules/@material/material-color-utilities/index.js"() {
    init_blend();
    init_contrast();
    init_dislike_analyzer();
    init_dynamic_color();
    init_dynamic_scheme();
    init_material_dynamic_colors();
    init_cam16();
    init_hct();
    init_viewing_conditions();
    init_core_palette();
    init_tonal_palette();
    init_quantizer_celebi();
    init_quantizer_map();
    init_quantizer_wsmeans();
    init_quantizer_wu();
    init_scheme();
    init_scheme_android();
    init_scheme_content();
    init_scheme_expressive();
    init_scheme_fidelity();
    init_scheme_fruit_salad();
    init_scheme_monochrome();
    init_scheme_neutral();
    init_scheme_rainbow();
    init_scheme_tonal_spot();
    init_scheme_vibrant();
    init_score();
    init_temperature_cache();
    init_color_utils();
    init_math_utils();
    init_string_utils();
    init_image_utils();
    init_theme_utils();
  }
});

// ../../node_modules/@universal-material/web/theme/css-var-builder.js
var CssVarBuilder;
var init_css_var_builder = __esm({
  "../../node_modules/@universal-material/web/theme/css-var-builder.js"() {
    init_material_color_utilities();
    CssVarBuilder = class _CssVarBuilder {
      constructor() {
        this.content = "";
      }
      static create() {
        return new _CssVarBuilder();
      }
      add(name, value) {
        const cssVar = `  ${name}: ${value};
`;
        this.content += cssVar;
        return this;
      }
      addFromArgb(name, argb) {
        this.add(`--u-color-${name}`, hexFromArgb(argb));
        return this;
      }
      addLightAndDarkFromArgb(name, lightArgb, darkArgb) {
        this.add(`--u-color-${name}`, `light-dark(${hexFromArgb(lightArgb)}, ${hexFromArgb(darkArgb)})`);
        return this;
      }
      build() {
        return this.content;
      }
    };
  }
});

// ../../node_modules/@universal-material/web/theme/neutral-colors.js
var neutralColors, neutralVariantColors;
var init_neutral_colors = __esm({
  "../../node_modules/@universal-material/web/theme/neutral-colors.js"() {
    neutralColors = [
      { name: "surface", lightTone: 98, darkTone: 6 },
      { name: "surface-bright", lightTone: 98, darkTone: 24 },
      { name: "surface-dim", lightTone: 87, darkTone: 6 },
      { name: "surface-container-lowest", lightTone: 100, darkTone: 4 },
      { name: "surface-container-low", lightTone: 96, darkTone: 10 },
      { name: "surface-container", lightTone: 94, darkTone: 12 },
      { name: "surface-container-high", lightTone: 92, darkTone: 17 },
      { name: "surface-container-highest", lightTone: 90, darkTone: 22 },
      { name: "on-surface", lightTone: 10, darkTone: 90 },
      { name: "light", fixedTone: 98 },
      { name: "on-light", fixedTone: 10 },
      { name: "dark", fixedTone: 6 },
      { name: "on-dark", fixedTone: 90 },
      { name: "scrim", fixedTone: 0 },
      { name: "shadow", fixedTone: 0 }
    ];
    neutralVariantColors = [
      { name: "surface-variant", lightTone: 90, darkTone: 30 },
      { name: "on-surface-variant", lightTone: 30, darkTone: 80 },
      { name: "outline", lightTone: 50, darkTone: 60 },
      { name: "outline-variant", lightTone: 80, darkTone: 30 }
    ];
  }
});

// ../../node_modules/@universal-material/web/theme/theme-builder.js
var getCss, ThemeBuilder;
var init_theme_builder = __esm({
  "../../node_modules/@universal-material/web/theme/theme-builder.js"() {
    init_material_color_utilities();
    init_css_var_builder();
    init_neutral_colors();
    getCss = (selector, content) => `${selector} {
${content}}`;
    ThemeBuilder = class _ThemeBuilder {
      #corePalette;
      constructor(primaryColorHex) {
        this.colors = [];
        this.partial = false;
        this.cssClass = null;
        this.#corePalette = CorePalette.of(argbFromHex(primaryColorHex));
        this.addColorFromPalette("primary", this.#corePalette.a1);
      }
      static create(primaryColorHex) {
        return new _ThemeBuilder(primaryColorHex);
      }
      static createPartial(primaryColorHex) {
        const themeBuilder = new _ThemeBuilder(primaryColorHex);
        themeBuilder.partial = true;
        return themeBuilder;
      }
      addColorFromHex(name, hex) {
        const palette = TonalPalette.fromInt(argbFromHex(hex));
        this.addColorFromPalette(name, palette);
        return this;
      }
      addColorFromPalette(name, palette) {
        this.colors.push({ name, lightTone: 40, darkTone: 80, tonalPalette: palette });
        this.colors.push({ name: `on-${name}`, lightTone: 100, darkTone: 20, tonalPalette: palette });
        this.colors.push({ name: `${name}-container`, lightTone: 90, darkTone: 30, tonalPalette: palette });
        this.colors.push({ name: `on-${name}-container`, lightTone: 10, darkTone: 90, tonalPalette: palette });
        this.colors.push({ name: `${name}-fixed`, fixedTone: 90, tonalPalette: palette });
        this.colors.push({ name: `${name}-fixed-dim`, fixedTone: 80, tonalPalette: palette });
        this.colors.push({ name: `on-${name}-fixed`, fixedTone: 10, tonalPalette: palette });
        this.colors.push({ name: `on-${name}-fixed-variant`, fixedTone: 30, tonalPalette: palette });
        return this;
      }
      addStaticColor(name, hex, tone = 80) {
        const palette = TonalPalette.fromInt(argbFromHex(hex));
        this.colors.push({ name, fixedTone: tone, tonalPalette: palette });
        this.colors.push({ name: `on-${name}`, fixedTone: 15, tonalPalette: palette });
        this.colors.push({ name: `${name}-container`, fixedTone: 90, tonalPalette: palette });
        this.colors.push({ name: `on-${name}-container`, fixedTone: 15, tonalPalette: palette });
        return this;
      }
      setCssClass(cssClass) {
        this.cssClass = cssClass;
        return this;
      }
      ensureCssClassStartsWithDot() {
        if (!this.cssClass || this.cssClass.startsWith(".")) {
          return;
        }
        this.cssClass = `.${this.cssClass}`;
      }
      ensureThemeColors() {
        if (!this.colors.find((c4) => c4.name === "secondary")) {
          this.addColorFromPalette("secondary", this.#corePalette.a2);
        }
        if (!this.colors.find((c4) => c4.name === "tertiary")) {
          this.addColorFromPalette("tertiary", this.#corePalette.a3);
        }
      }
      ensureStatusColors() {
        if (!this.colors.find((c4) => c4.name === "success")) {
          this.addStaticColor("success", "#198754", 60);
        }
        if (!this.colors.find((c4) => c4.name === "info")) {
          this.addStaticColor("info", "#0dcaf0");
        }
        if (!this.colors.find((c4) => c4.name === "warning")) {
          this.addStaticColor("warning", "#ffc107");
        }
        if (!this.colors.find((c4) => c4.name === "error")) {
          this.addColorFromHex("error", "#b3261e");
        }
      }
      getNeutralVariables() {
        const builder = CssVarBuilder.create();
        this.addColors(builder, neutralColors, this.#corePalette.n1);
        builder.add("--u-color-body", "var(--u-color-surface)").add("--u-color-inverse-body", "var(--u-color-inverse-surface)").add("--u-color-on-body", "var(--u-color-on-surface)").add("--u-color-on-inverse-body", "var(--u-color-on-inverse-surface)");
        return builder.build();
      }
      getNeutralVariantVariables() {
        const builder = CssVarBuilder.create();
        this.addColors(builder, neutralVariantColors, this.#corePalette.n2);
        return builder.build();
      }
      getColorVariables(color) {
        const builder = CssVarBuilder.create();
        this.addToneColor(builder, color, color.tonalPalette);
        return builder.build();
      }
      getColorsVariables() {
        let variables = "";
        for (const color of this.colors) {
          variables += this.getColorVariables(color);
        }
        variables += this.getNeutralVariables();
        variables += this.getNeutralVariantVariables();
        return variables;
      }
      addColors(builder, colors, palette) {
        for (const color of colors) {
          this.addToneColor(builder, color, palette);
        }
      }
      addToneColor(builder, color, palette) {
        if (color.fixedTone !== void 0) {
          builder.addFromArgb(color.name, palette.tone(color.fixedTone));
          return;
        }
        const inverseName = `inverse-${color.name}`.replace("inverse-on", "on-inverse");
        builder.addLightAndDarkFromArgb(color.name, palette.tone(color.lightTone), palette.tone(color.darkTone)).addLightAndDarkFromArgb(inverseName, palette.tone(color.darkTone), palette.tone(color.lightTone));
        if (color.name === "surface" || color.name === "on-surface") {
          const prefix = color.name.startsWith("on-") ? "on-" : "";
          builder.addFromArgb(`${prefix}light-surface`, palette.tone(color.lightTone));
          builder.addFromArgb(`${prefix}dark-surface`, palette.tone(color.darkTone));
        }
      }
      build() {
        this.ensureCssClassStartsWithDot();
        const selector = this.cssClass ?? ":root";
        this.ensureThemeColors();
        if (!this.partial) {
          this.ensureStatusColors();
        }
        const variables = `${getCss(selector, this.getColorsVariables())}
`;
        return variables;
      }
    };
  }
});

// ../../node_modules/@universal-material/web/theme/index.js
var init_theme = __esm({
  "../../node_modules/@universal-material/web/theme/index.js"() {
    init_theme_builder();
  }
});

// src/chrome-icons.ts
var ICON;
var init_chrome_icons = __esm({
  "src/chrome-icons.ts"() {
    "use strict";
    ICON = {
      "format_bold": `<path d="M335-200q-25 0-42.5-17.5T275-260v-440q0-25 17.5-42.5T335-760h168q66 0 114.5 42T666-612q0 38-21 70t-56 49v6q43 14 69.5 50t26.5 81q0 68-52.5 112T510-200H335Zm26-76h144q38 0 66-25t28-63q0-37-28-62t-66-25H361v175Zm0-247h136q35 0 60.5-23t25.5-58q0-35-25.5-58.5T497-686H361v163Z"/>`,
      "format_italic": `<path d="M264-199q-16.8 0-28.4-11.64-11.6-11.64-11.6-28.5t11.6-28.36Q247.2-279 264-279h94l139-409H378q-16.8 0-28.4-11.64-11.6-11.64-11.6-28.5t11.6-28.36Q361.2-768 378-768h300q16.8 0 28.4 11.64 11.6 11.64 11.6 28.5t-11.6 28.36Q694.8-688 678-688h-94L445-279h119q16.8 0 28.4 11.64 11.6 11.64 11.6 28.5t-11.6 28.36Q580.8-199 564-199H264Z"/>`,
      "format_underlined": `<path d="M230-140q-13 0-21.5-8.5T200-170q0-13 8.5-21.5T230-200h500q13 0 21.5 8.5T760-170q0 13-8.5 21.5T730-140H230Zm93.5-198.5Q267-397 267-497v-302q0-17 12.5-29t29.5-12q17 0 29 12t12 29v302q0 63 34 101t96 38q62 0 96-38t34-101v-302q0-17 12.5-29t29.5-12q17 0 29 12t12 29v302q0 100-56.5 158.5T480-280q-100 0-156.5-58.5Z"/>`,
      "format_align_left": `<path d="M150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h420q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h420q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z"/>`,
      "format_align_center": `<path d="M150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm160-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H310ZM150-450q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm160-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H310ZM150-780q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z"/>`,
      "format_align_right": `<path d="M150-780q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm240 165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h420q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H390ZM150-450q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm240 165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h420q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H390ZM150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z"/>`,
      "format_align_justify": `<path d="M150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z"/>`,
      "format_list_bulleted": `<path d="M407-198q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h403q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H407Zm0-252q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h403q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H407Zm0-253q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h403q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H407ZM189-161q-28.05 0-48.02-19Q121-199 121-227.5t19.5-48q19.5-19.5 48-19.5t47.5 19.98q19 19.97 19 48.02 0 27.23-19.39 46.61Q216.23-161 189-161Zm0-252q-28.05 0-48.02-19.5Q121-452 121-480t19.98-47.5Q160.95-547 189-547q27.23 0 46.61 19.5Q255-508 255-480t-19.39 47.5Q216.23-413 189-413Zm-48.5-272.5Q121-705 121-733t19.5-47.5Q160-800 188-800t47.5 19.5Q255-761 255-733t-19.5 47.5Q216-666 188-666t-47.5-19.5Z"/>`,
      "format_list_numbered": `<path d="M150-80q-13 0-21.5-8.5T120-110q0-13 8.5-21.5T150-140h70v-30h-30q-13 0-21.5-8.5T160-200q0-13 8.5-21.5T190-230h30v-30h-70q-13 0-21.5-8.5T120-290q0-13 8.5-21.5T150-320h90q17 0 28.5 11.5T280-280v40q0 17-11.5 28.5T240-200q17 0 28.5 11.5T280-160v40q0 17-11.5 28.5T240-80h-90Zm-7-280q-9 0-16-7t-7-16v-87q0-17 11.5-28.5T160-510h60v-30h-70q-13 0-21.5-8.5T120-570q0-13 8.5-21.5T150-600h90q17 0 28.5 11.5T280-560v70q0 17-11.5 28.5T240-450h-60v30h70q13 0 21.5 8.5T280-390q0 13-8.5 21.5T250-360H143Zm45.5-288.5Q180-657 180-670v-150h-30q-13 0-21.5-8.5T120-850q0-13 8.5-21.5T150-880h68q9 0 15.5 6.5T240-858v188q0 13-8.5 21.5T210-640q-13 0-21.5-8.5ZM399-209q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h411q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H399Zm0-243q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h411q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H399Zm0-243q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h411q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H399Z"/>`,
      "undo": `<path d="M289-200q-13 0-21.5-8.5T259-230q0-13 8.5-21.5T289-260h280q70 0 120.5-46.5T740-422q0-69-50.5-115.5T569-584H274l93 93q9 9 9 21t-9 21q-9 9-21 9t-21-9L181-593q-5-5-7-10t-2-11q0-6 2-11t7-10l144-144q9-9 21-9t21 9q9 9 9 21t-9 21l-93 93h294q95 0 163.5 64T800-422q0 94-68.5 158T568-200H289Z"/>`,
      "redo": `<path d="M686-584H391q-70 0-120.5 46.5T220-422q0 69 50.5 115.5T391-260h280q13 0 21.5 8.5T701-230q0 13-8.5 21.5T671-200H392q-95 0-163.5-64T160-422q0-94 68.5-158T392-644h294l-93-93q-9-9-9-21t9-21q9-9 21-9t21 9l144 144q5 5 7 10t2 11q0 6-2 11t-7 10L635-449q-9 9-21 9t-21-9q-9-9-9-21t9-21l93-93Z"/>`,
      "zoom_out": `<path d="M305-556q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h141q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H305Zm73 227q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z"/>`,
      "zoom_in": `<path d="M346-556h-52q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h52v-51q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v51h51q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-51v52q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-52Zm32 227q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z"/>`,
      "folder_open": `<path d="M140-160q-23 0-41.5-18.5T80-220v-520q0-23 18.5-41.5T140-800h256q12.44 0 23.72 5t19.37 13.09L481-740h369q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H455l-60-60H140v520l90-355q5-20 21.83-32.5Q268.65-620 289-620h574q29 0 47.5 23t10.5 52l-88 339q-6 24-22 35t-41 11H140Zm63-60h572l84-340H287l-84 340Zm-63-353v-167 167Zm63 353 84-340-84 340Z"/>`,
      "save": `<path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h478q12.44 0 23.72 5T701-822l121 121q8 8 13 19.28 5 11.28 5 23.72v478q0 24-18 42t-42 18H180Zm600-536L656-780H180v600h600v-476ZM553.5-275.26q30.5-30.27 30.5-73.5 0-43.24-30.26-73.74-30.27-30.5-73.5-30.5-43.24 0-73.74 30.26-30.5 30.27-30.5 73.5 0 43.24 30.26 73.74 30.27 30.5 73.5 30.5 43.24 0 73.74-30.26ZM263-584h298q12.75 0 21.38-8.63Q591-601.25 591-614v-83q0-12.75-8.62-21.38Q573.75-727 561-727H263q-12.75 0-21.37 8.62Q233-709.75 233-697v83q0 12.75 8.63 21.37Q250.25-584 263-584Zm-83-72v476-600 124Z"/>`,
      "picture_as_pdf": `<path d="M368-514h48q15.73 0 26.36-10.64Q453-535.28 453-551v-48q0-15.72-10.64-26.36Q431.73-636 416-636h-66q-7.6 0-13.3 5-5.7 5-5.7 13.41v168.18q0 8.41 5.5 13.41t13.5 5q8 0 13-5.7t5-13.3v-64Zm0-37v-48h48v48h-48Zm213 120q15 0 26-10.64 11-10.63 11-26.36v-131q0-15.72-11-26.36Q596-636 581-636h-65q-7.6 0-13.3 5-5.7 5-5.7 13.36v167.28q0 8.36 5.7 13.86T516-431h65Zm-47-37v-131h47v131h-47Zm170-46h32q8 0 13-5.5t5-13.5q0-8-5-13t-13-5h-32v-48h32q8 0 13-5.5t5-13.5q0-8-5-13t-13-5h-50q-7.6 0-13.3 5-5.7 5-5.7 13.41v168.18q0 8.41 5.5 13.41t13.5 5q8 0 13-5.7t5-13.3v-64ZM260-200q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h560q24 0 42 18t18 42v560q0 24-18 42t-42 18H260Zm0-60h560v-560H260v560ZM140-80q-24 0-42-18t-18-42v-590q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v590h590q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32Q742.75-80 730-80H140Zm120-740v560-560Z"/>`,
      "html": `<path d="M0-384v-192q0-10.4 7-17.2 7-6.8 17-6.8t17 6.8q7 6.8 7 17.2v65h108v-65q0-10.4 7-17.2 7-6.8 17-6.8t17 6.8q7 6.8 7 17.2v192q0 10.4-7 17.2-7 6.8-17 6.8t-17-6.8q-7-6.8-7-17.2v-79H48v79q0 10.4-7 17.2-7 6.8-17 6.8t-17-6.8q-7-6.8-7-17.2Zm316 0v-168h-46q-10.4 0-17.2-7-6.8-7-6.8-17t6.8-17q6.8-7 17.2-7h140q10.4 0 17.2 7 6.8 7 6.8 17t-6.8 17q-6.8 7-17.2 7h-46v168q0 10.4-7 17.2-7 6.8-17 6.8t-17-6.8q-7-6.8-7-17.2Zm160 0v-182q0-15 9.5-24.5T510-600h200q15 0 24.5 9.5T744-566v182q0 10.4-7 17.2-7 6.8-17 6.8t-17-6.8q-7-6.8-7-17.2v-168h-62v126q0 10.4-6.8 17.2-6.8 6.8-17.2 6.8-10.4 0-17.2-6.8-6.8-6.8-6.8-17.2v-126h-62v168q0 10.4-7 17.2-7 6.8-17 6.8t-17-6.8q-7-6.8-7-17.2Zm349 24q-9 0-16-6.5t-7-15.5v-194q0-10.4 7-17.2 7-6.8 17-6.8t17 6.8q7 6.8 7 17.2v168h86q10.4 0 17.2 7 6.8 7 6.8 17t-6.8 17q-6.8 7-17.2 7H825Z"/>`,
      "format_paragraph": `<path d="M398.5-168.63Q390-177.25 390-190v-230h-40q-78.85 0-134.43-55.61Q160-531.21 160-610.11q0-78.89 55.57-134.39Q271.15-800 350-800h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-80v550q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-550H450v550q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63Z"/>`,
      "article": `<path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm0-600v600-600Zm127 501h215q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H307q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Zm0-171h346q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H307q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Zm0-171h346q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H307q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5Z"/>`,
      "menu_book": `<path d="M248-300q53.57 0 104.28 12.5Q403-275 452-250v-427q-45-30-97.62-46.5Q301.76-740 248-740q-38 0-74.5 9.5T100-707v434q31-14 70.5-20.5T248-300Zm264 50q50-25 98-37.5T712-300q38 0 78.5 6t69.5 16v-429q-34-17-71.82-25-37.82-8-76.18-8-54 0-104.5 16.5T512-677v427Zm-44.5 77.5Q461-174 456-178q-47-29-99.85-45-52.84-16-108.15-16-36.54 0-71.77 9T106-208q-23.1 11-44.55-3Q40-225 40-251v-463q0-15 7-27.5T68-761q42-20 87.39-29.5 45.4-9.5 92.61-9.5 63 0 122.5 17T482-731q51-35 109.5-52T712-800q46.87 0 91.93 9.5Q849-781 891-761q14 7 21.5 19.5T920-714v463q0 27.89-22.5 42.45Q875-194 853-208q-34-14-69.23-22.5Q748.54-239 712-239q-54.27 0-106.14 16Q554-207 508-178q-5 4-11.5 5.5T482-171q-8 0-14.5-1.5ZM276-489Zm284-119q0-5.52 4.02-11.34 4.03-5.82 8.98-7.66 30-11 61.34-17 31.33-6 65.91-6 21.61 0 42.68 2.5T784-640q6 2 11 7.4 5 5.39 5 12.13 0 11.47-7.5 17.47-7.5 6-18.5 3-16.8-5-35.4-7.5Q720-610 700-610q-29 0-56 5.5T591-588q-14 5-22.5-.5T560-608Zm0 220q0-5.81 4.02-11.94 4.03-6.12 8.98-8.06 30-11 61.34-16.5 31.33-5.5 65.91-5.5 21.61 0 42.68 2.5T784-420q6 2 11 7.4 5 5.39 5 12.13 0 11.47-7.5 17.47-7.5 6-18.5 3-16.8-5-35.4-7.5Q720-390 700-390q-29 0-56 5t-53 16q-14 5-22.5 0t-8.5-19Zm0-110q0-5.52 4.02-11.34 4.03-5.82 8.98-7.66 30-11 61.34-17 31.33-6 65.91-6 21.61 0 42.68 2.5T784-530q6 2 11 7.4 5 5.39 5 12.13 0 11.47-7.5 17.47-7.5 6-18.5 3-16.8-5-35.4-7.5Q720-500 700-500q-29 0-56 5.5T591-478q-14 5-22.5-.5T560-498Z"/>`,
      "language": `<path d="M323-111.5Q250-143 196-197t-85-127.5Q80-398 80-482t31-156.5Q142-711 196-765t127-84.5Q396-880 480-880t157 30.5Q710-819 764-765t85 126.5Q880-566 880-482t-31 157.5Q818-251 764-197t-127 85.5Q564-80 480-80t-157-31.5ZM480-138q35-36 58.5-82.5T577-331H384q14 60 37.5 108t58.5 85Zm-85-12q-25-38-43-82t-30-99H172q38 71 88 111.5T395-150Zm171-1q72-23 129.5-69T788-331H639q-13 54-30.5 98T566-151ZM152-391h159q-3-27-3.5-48.5T307-482q0-25 1-44.5t4-43.5H152q-7 24-9.5 43t-2.5 45q0 26 2.5 46.5T152-391Zm221 0h215q4-31 5-50.5t1-40.5q0-20-1-38.5t-5-49.5H373q-4 31-5 49.5t-1 38.5q0 21 1 40.5t5 50.5Zm275 0h160q7-24 9.5-44.5T820-482q0-26-2.5-45t-9.5-43H649q3 35 4 53.5t1 34.5q0 22-1.5 41.5T648-391Zm-10-239h150q-33-69-90.5-115T565-810q25 37 42.5 80T638-630Zm-254 0h194q-11-53-37-102.5T480-820q-32 27-54 71t-42 119Zm-212 0h151q11-54 28-96.5t43-82.5q-75 19-131 64t-91 115Z"/>`,
      "note_add": `<path d="M450-363v99q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-99h100q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H510v-100q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v100H350q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h100ZM220-80q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h336q12.44 0 23.72 5T599-862l183 183q8 8 13 19.28 5 11.28 5 23.72v496q0 24-18 42t-42 18H220Zm331-584v-156H220v680h520v-494H581q-12.75 0-21.37-8.63Q551-651.25 551-664ZM220-820v186-186 680-680Z"/>`,
      "content_cut": `<path d="M481-415 364-298q11 17 13.5 33t2.5 35q0 64-43 107T230-80q-64 0-107-43T80-230q0-64 43-107t107-43q18 0 35.5 5t36.5 15l116-116-118-118q-17 8-34.5 11t-35.5 3q-64 0-107-43T80-730q0-64 43-107t107-43q64 0 107 43t43 107q0 19-2.5 36T367-662l468 468q23 23 10.5 51.5T801-114q-9 0-17.5-3.5T768-128L481-415Zm118-112-66-66 235-235q7-7 15.5-10.5T801-842q32 0 43.5 29T834-762L599-527ZM294-666q26-26 26-64t-26-64q-26-26-64-26t-64 26q-26 26-26 64t26 64q26 26 64 26t64-26Zm202.5 203.5Q502-468 502-476t-5.5-13.5Q491-495 483-495t-13.5 5.5Q464-484 464-476t5.5 13.5Q475-457 483-457t13.5-5.5ZM294-166q26-26 26-64t-26-64q-26-26-64-26t-64 26q-26 26-26 64t26 64q26 26 64 26t64-26Z"/>`,
      "content_copy": `<path d="M300-200q-24 0-42-18t-18-42v-560q0-24 18-42t42-18h440q24 0 42 18t18 42v560q0 24-18 42t-42 18H300Zm0-60h440v-560H300v560ZM180-80q-24 0-42-18t-18-42v-590q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v590h470q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32Q662.75-80 650-80H180Zm120-180v-560 560Z"/>`,
      "content_paste": `<path d="M180-120q-26 0-43-17t-17-43v-600q0-26 17-43t43-17h202q7-35 34.5-57.5T480-920q36 0 63.5 22.5T578-840h202q26 0 43 17t17 43v600q0 26-17 43t-43 17H180Zm0-60h600v-600h-60v60q0 12.75-8.62 21.37Q702.75-690 690-690H270q-12.75 0-21.37-8.63Q240-707.25 240-720v-60h-60v600Zm328.5-611.5Q520-803 520-820t-11.5-28.5Q497-860 480-860t-28.5 11.5Q440-837 440-820t11.5 28.5Q463-780 480-780t28.5-11.5Z"/>`,
      "format_paint": `<path d="M437-80q-24 0-42-17.63-18-17.62-18-42.37v-200H220q-24 0-42-18t-18-42v-303q0-55 39.66-96 39.65-41 95.34-41h475q12.75 0 21.38 8.62Q800-822.75 800-810v410q0 24-18 42t-42 18H583v200q0 24.75-18 42.37Q547-80 523-80h-86ZM220-554h520v-226h-56v141q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-141h-71v55q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-55H295q-32 0-53.5 23T220-703v149Zm0 154h520v-94H220v94Zm0 0v-94 94Z"/>`,
      "format_clear": `<path d="m507-524-77-76 24-56h-58q-26 0-38.5-16T345-708q0-20 13-36t39-16h353q21 0 35.5 14.5T800-710q0 21-14.5 35.5T750-660H565l-58 136ZM785-77 457-406l-75 176q-6 14-18.5 22t-27.5 8q-27 0-42-22.5t-4-47.5l90-212L77-785q-9-9-9-21t9-21q9-9 21-9t21 9l708 708q9 9 9 21t-9 21q-9 9-21 9t-21-9Z"/>`,
      "find_replace": `<path d="M440-740q-70 0-127 39t-80 103q-4 11-15 16.5t-22 2.5q-12-3-18.5-13.5T175-615q29-83 101.5-134T440-800q65 0 121.5 30t98.5 81v-81q0-13 8.5-21.5T690-800q13 0 21.5 8.5T720-770v168q0 13-8.5 21.5T690-572H522q-13 0-21.5-8.5T492-602q0-13 8.5-21.5T522-632h104q-32-48-80.5-78T440-740Zm0 499q-65 0-122.5-27T220-346v76q0 13-8.5 21.5T190-240q-13 0-21.5-8.5T160-270v-168q0-13 8.5-21.5T190-468h168q13 0 21.5 8.5T388-438q0 13-8.5 21.5T358-408H249q33 48 83 77.5T440-301q67 0 121-37.5t80-98.5q5-12 15.5-19.5T680-461q13 3 19.5 14t1.5 23q-8 21-19.5 40.5T656-347l163 163q9 9 9 21t-9 21q-9 9-21.5 9t-21.5-9L613-304q-37 31-81 47t-92 16Z"/>`,
      "image": `<path d="M180-120q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h600q24 0 42 18t18 42v600q0 24-18 42t-42 18H180Zm0-60h600v-600H180v600Zm0 0v-600 600Zm86-97h429q8.5 0 12.75-8t-.75-16L590-457q-5-6-12-6t-12 6L446-302l-81-111q-5-6-12-6t-12 6l-86 112q-6 8-1.75 16t12.75 8Z"/>`,
      "insert_page_break": `<path d="M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-140q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v140h520v-140q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v140q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm-60-740q0-24.75 17.63-42.38Q195.25-880 220-880h336q12.44 0 23.72 5T599-862l183 183q8 8 13 19.28 5 11.28 5 23.72v116q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-114H581q-12.75 0-21.37-8.63Q551-651.25 551-664v-156H220v300q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-300Zm220 450q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h200q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H380Zm320 0q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h190q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H700Zm-630 0q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32Q57.25-430 70-430h190q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H70Zm410-120Zm0 180Z"/>`,
      "add_comment": `<path d="M450-530v100q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-100h100q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5H510v-100q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v100H350q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h100ZM240-240 131-131q-14 14-32.5 6.34Q80-132.31 80-152v-668q0-24 18-42t42-18h680q24 0 42 18t18 42v520q0 24-18 42t-42 18H240Zm-26-60h606v-520H140v600l74-80Zm-74 0v-520 520Z"/>`,
      "toc": `<path d="M150-280q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h490q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-170q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h490q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-170q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h490q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm659.5 340q-12.5 0-21-8.63-8.5-8.62-8.5-21.37 0-12 8.63-21 8.62-9 21.37-9 12 0 21 9t9 21.5q0 12.5-9 21t-21.5 8.5Zm0-170q-12.5 0-21-8.63-8.5-8.62-8.5-21.37 0-12 8.63-21 8.62-9 21.37-9 12 0 21 9t9 21.5q0 12.5-9 21t-21.5 8.5Zm0-170q-12.5 0-21-8.63-8.5-8.62-8.5-21.37 0-12 8.63-21 8.62-9 21.37-9 12 0 21 9t9 21.5q0 12.5-9 21t-21.5 8.5Z"/>`,
      "format_strikethrough": `<path d="M110-410q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32Q97.25-470 110-470h740q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H110Zm320-120v-170H250q-20.83 0-35.42-14.62Q200-729.24 200-750.12q0-20.88 14.58-35.38Q229.17-800 250-800h460q20.83 0 35.42 14.62Q760-770.76 760-749.88q0 20.88-14.58 35.38Q730.83-700 710-700H530v170H430Zm0 180h100v140q0 20.83-14.62 35.42Q500.76-160 479.88-160q-20.88 0-35.38-14.58Q430-189.17 430-210v-140Z"/>`,
      "superscript": `<path d="M799-630q-12.75 0-21.37-8.63Q769-647.25 769-660v-40q0-12.75 8.63-21.38Q786.25-730 799-730h91v-40H784q-6 0-10.5-4.5T769-785q0-6 4.5-10.5T784-800h106q12.75 0 21.38 8.62Q920-782.75 920-770v40q0 12.75-8.62 21.37Q902.75-700 890-700h-91v40h106q6 0 10.5 4.5T920-645q0 6-4.5 10.5T905-630H799ZM300-160q-21.29 0-31.14-18.5Q259-197 270-215l150-236-136-213q-11-18-1.5-37t31.03-19q9.94 0 18.22 4.45T345-703l124 196 124-196q4.89-8.1 13.45-12.55 8.57-4.45 17.53-4.45 22.02 0 31.52 19t-1.5 37L518-451l150 236q11 18 .84 36.5-10.15 18.5-30.46 18.5-9.38 0-17.84-4.45Q612.08-168.9 607-177L469-394 331-177q-4.89 8.1-13.46 12.55Q308.97-160 300-160Z"/>`,
      "subscript": `<path d="M799-160q-12.75 0-21.37-8.63Q769-177.25 769-190v-40q0-12.75 8.63-21.38Q786.25-260 799-260h91v-40H784q-6 0-10.5-4.5T769-315q0-6 4.5-10.5T784-330h106q12.75 0 21.38 8.62Q920-312.75 920-300v40q0 12.75-8.62 21.37Q902.75-230 890-230h-91v40h106q6 0 10.5 4.5T920-175q0 6-4.5 10.5T905-160H799Zm-499-80q-21.29 0-31.14-18.5Q259-277 270-295l150-236-136-213q-11-18-1.5-37t31.03-19q9.94 0 18.22 4.45T345-783l124 196 124-196q4.89-8.1 13.45-12.55 8.57-4.45 17.53-4.45 22.02 0 31.52 19t-1.5 37L518-531l150 236q11 18 .84 36.5-10.15 18.5-30.46 18.5-9.38 0-17.84-4.45Q612.08-248.9 607-257L469-474 331-257q-4.89 8.1-13.46 12.55Q308.97-240 300-240Z"/>`,
      "format_color_text": `<path d="M110 0Q97 0 88.5-8.5T80-30v-100q0-13 8.5-21.5T110-160h740q13 0 21.5 8.5T880-130v100q0 13-8.5 21.5T850 0H110Zm161-280q-19 0-29-15.5t-3-32.5l192-488q5-11 14-17.5t20-6.5h30q11 0 20 6.5t14 17.5l192 489q7 17-3.5 32T689-280q-11 0-20-6t-13-17l-48-127H352l-49 128q-4 10-12.5 16t-19.5 6Zm105-214h208L482-765h-4L376-494Z"/>`,
      "format_ink_highlighter": `<path d="M140 0q-25 0-42.5-18T80-61q0-25 18-42.5t43-17.5h679q25 0 42.5 17.5T880-61q0 25-18 43T819 0H140Zm441-474L466-589 284-407l115 115 182-182Zm-72-158 115 115 186-186-115-115-186 186Zm-64-21 200 200-194 194q-19 19-52.5 19T346-259l-11-11-25 25q-8 8-19.5 13t-23.5 5h-94q-10 0-13.5-9.5T163-253l94-94-4-4q-22-22-21.5-55.5T254-462l191-191Zm0 0 210-210q17-17 43-17t43 17l112 112q17 17 16.5 45.5T852-660L645-453 445-653Z"/>`,
      "format_line_spacing": `<path d="m210-683-67 66q-9 8-21 8t-21-9q-9-9-9-21t9-21l118-118q5-5 10-7t11-2q6 0 11 2t10 7l118 118q9 9 9 21t-9 21q-9 9-21 8.5t-21-8.5l-67-65v408l67-66q9-8 21-8t21 9q9 9 9 21t-9 21L261-180q-5 5-10 7t-11 2q-6 0-11-2t-10-7L101-298q-9-9-9-21t9-21q9-9 21-8.5t21 8.5l67 65v-408Zm300 483q-13 0-21.5-8.5T480-230q0-13 8.5-21.5T510-260h340q13 0 21.5 8.5T880-230q0 13-8.5 21.5T850-200H510Zm0-250q-13 0-21.5-8.5T480-480q0-13 8.5-21.5T510-510h340q13 0 21.5 8.5T880-480q0 13-8.5 21.5T850-450H510Zm0-250q-13 0-21.5-8.5T480-730q0-13 8.5-21.5T510-760h340q13 0 21.5 8.5T880-730q0 13-8.5 21.5T850-700H510Z"/>`,
      "format_indent_increase": `<path d="M150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm320-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470ZM150-780q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm-5 412q-8 7-16.5 3.25T120-379v-205q0-9.92 9.5-13.46Q139-601 146-594l104 104q5 5 5 10.5t-5 10.5L145-368Z"/>`,
      "format_indent_decrease": `<path d="M150-120q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm320-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h340q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H470ZM150-780q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm85 412L131-472q-5-4.64-5-10.82 0-6.18 5-11.18l105-100q8-7 16.5-3.46T261-584v205q0 10.5-9.5 14.25T235-368Z"/>`
    };
  }
});

// src/chrome.ts
var chrome_exports = {};
__export(chrome_exports, {
  CHROME_CSS: () => CHROME_CSS,
  setupChrome: () => setupChrome
});
function ensureTheme() {
  if (themeStyle) return;
  themeStyle = document.createElement("style");
  themeStyle.id = "uw-theme";
  themeStyle.textContent = ThemeBuilder.create("#1A73E8").build();
  document.head.appendChild(themeStyle);
  if (!document.documentElement.style.colorScheme) {
    document.documentElement.style.colorScheme = "light dark";
  }
}
function download(data, name, type) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a3 = Object.assign(document.createElement("a"), { href: url, download: name });
  a3.click();
  URL.revokeObjectURL(url);
}
function buildToolbar(el, editor) {
  el.innerHTML = `<div class="uw-bar">
    ${iconBtn("new", "note_add", "New document")}
    ${iconBtn("open", "folder_open", "Open .docx")}
    ${iconBtn("save", "save", "Save .docx")}
    ${SEP}
    ${iconBtn("cut", "content_cut", "Cut")}
    ${iconBtn("copy", "content_copy", "Copy")}
    ${iconBtn("paste", "content_paste", "Paste")}
    ${iconBtn("painter", "format_paint", "Clone formatting")}
    ${iconBtn("clear", "format_clear", "Clear direct formatting")}
    ${SEP}
    ${iconBtn("undo", "undo", "Undo")}
    ${iconBtn("redo", "redo", "Redo")}
    ${SEP}
    ${iconBtn("find", "find_replace", "Find & replace")}
    ${SEP}
    ${iconBtn("image", "image", "Insert image")}
    ${iconBtn("pagebreak", "insert_page_break", "Insert page break")}
    ${iconBtn("comment", "add_comment", "Insert comment")}
    ${iconBtn("toc", "toc", "Update table of contents")}
    ${SEP}
    ${textBtn("marks", "&para;", "Formatting marks")}
    <input type="file" data-a="file-docx" accept=".docx,.odt" hidden />
    <input type="file" data-a="file-img" accept="image/*" hidden />
  </div>
  <div class="uw-bar">
    ${sel("style", "Paragraph style", STYLE_OPTS)}
    ${sel("font", "Font", FONT_OPTS)}
    ${textBtn("shrink", "A&minus;", "Decrease font size")}
    <input type="number" class="uw-size" data-a="size" min="1" max="400" title="Font size" />
    ${textBtn("grow", "A+", "Increase font size")}
    ${SEP}
    ${iconBtn("bold", "format_bold", "Bold")}
    ${iconBtn("italic", "format_italic", "Italic")}
    ${iconBtn("underline", "format_underlined", "Underline")}
    ${iconBtn("strike", "format_strikethrough", "Strikethrough")}
    ${iconBtn("sup", "superscript", "Superscript")}
    ${iconBtn("sub", "subscript", "Subscript")}
    ${SEP}
    <input type="color" class="uw-color" data-a="color" title="Font color" value="#000000" />
    ${sel("hl", "Highlight color", HL_OPTS)}
    ${SEP}
    ${iconBtn("align:left", "format_align_left", "Align left")}
    ${iconBtn("align:center", "format_align_center", "Align center")}
    ${iconBtn("align:right", "format_align_right", "Align right")}
    ${iconBtn("align:both", "format_align_justify", "Justify")}
    ${SEP}
    ${sel("spacing", "Line spacing", SPACING_OPTS)}
    ${iconBtn("list:bullet", "format_list_bulleted", "Bulleted list")}
    ${iconBtn("list:decimal", "format_list_numbered", "Numbered list")}
    ${iconBtn("outdent", "format_indent_decrease", "Decrease indent")}
    ${iconBtn("indent", "format_indent_increase", "Increase indent")}
  </div>`;
  const fileDocx = el.querySelector('[data-a="file-docx"]');
  const fileImg = el.querySelector('[data-a="file-img"]');
  const act = {
    new: () => editor.newDocument(),
    open: () => fileDocx.click(),
    save: () => void editor.save("docx").then((d3) => download(d3, "document.docx", DOCX_MIME)),
    cut: () => void editor.cut(),
    copy: () => void editor.copy(),
    paste: () => void editor.paste(),
    painter: () => editor.copyFormat(),
    clear: () => editor.clearFormatting(),
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    find: () => {
      const q = prompt("Find:");
      if (!q) return;
      const r6 = prompt("Replace with (blank = just find next):");
      if (r6) {
        const n5 = editor.replaceAll(q, r6);
        if (n5 === 0) alert("No matches");
      } else editor.findNext(q);
    },
    image: () => fileImg.click(),
    pagebreak: () => editor.insertPageBreak(),
    comment: () => {
      const t5 = prompt("Comment:");
      if (t5) editor.addComment(t5);
    },
    toc: () => editor.updateToc(),
    marks: () => editor.toggleMarks(),
    bold: () => editor.toggleRunProp("bold"),
    italic: () => editor.toggleRunProp("italic"),
    underline: () => editor.toggleRunProp("underline"),
    strike: () => editor.toggleRunProp("strike"),
    sup: () => editor.toggleVertAlign("superscript"),
    sub: () => editor.toggleVertAlign("subscript"),
    grow: () => editor.growFont(1),
    shrink: () => editor.growFont(-1),
    "align:left": () => editor.setAlignment("left"),
    "align:center": () => editor.setAlignment("center"),
    "align:right": () => editor.setAlignment("right"),
    "align:both": () => editor.setAlignment("both"),
    "list:bullet": () => editor.toggleList("bullet"),
    "list:decimal": () => editor.toggleList("decimal"),
    outdent: () => editor.indent(-1),
    indent: () => editor.indent(1)
  };
  el.querySelectorAll("u-icon-button[data-a], u-button[data-a]").forEach((b5) => {
    const key = b5.dataset["a"];
    b5.addEventListener("click", () => {
      act[key]?.();
      editor.focusEditor();
    });
  });
  fileDocx.addEventListener("change", async () => {
    const f3 = fileDocx.files?.[0];
    if (!f3) return;
    editor.load(new Uint8Array(await f3.arrayBuffer()), "auto", { protected: false });
    editor.focusEditor();
    fileDocx.value = "";
  });
  fileImg.addEventListener("change", async () => {
    const f3 = fileImg.files?.[0];
    if (!f3) return;
    const ext = f3.type.replace("image/", "") || "png";
    await editor.insertImage(new Uint8Array(await f3.arrayBuffer()), ext);
    editor.focusEditor();
    fileImg.value = "";
  });
  const styleSel = el.querySelector('[data-a="style"]');
  let styleSig = "";
  const syncStyleOptions = () => {
    const ds = editor.paragraphStyles();
    if (!ds.length) return;
    const sig = ds.map((s4) => s4.id).join("|");
    if (sig === styleSig) return;
    styleSig = sig;
    styleSel.replaceChildren();
    for (const s4 of ds) {
      const o7 = document.createElement("option");
      o7.value = s4.id;
      o7.textContent = s4.name;
      styleSel.appendChild(o7);
    }
  };
  const fontSel = el.querySelector('[data-a="font"]');
  const sizeInp = el.querySelector('[data-a="size"]');
  const colorInp = el.querySelector('[data-a="color"]');
  const hlSel = el.querySelector('[data-a="hl"]');
  const spacingSel = el.querySelector('[data-a="spacing"]');
  styleSel.addEventListener("change", () => {
    editor.applyStyle(styleSel.value || void 0);
    editor.focusEditor();
  });
  fontSel.addEventListener("change", () => {
    editor.setFontFamily(fontSel.value);
    editor.focusEditor();
  });
  sizeInp.addEventListener("change", () => {
    const v2 = Number(sizeInp.value);
    if (v2 > 0) editor.setFontSize(v2);
    editor.focusEditor();
  });
  colorInp.addEventListener("change", () => {
    editor.setColor(colorInp.value.slice(1).toUpperCase());
    editor.focusEditor();
  });
  hlSel.addEventListener("change", () => {
    editor.setHighlight(hlSel.value || void 0);
    editor.focusEditor();
  });
  spacingSel.addEventListener("change", () => {
    editor.setLineSpacing(Number(spacingSel.value));
    editor.focusEditor();
  });
  const setActive = (key, on) => {
    el.querySelector(`[data-a="${key}"]`)?.toggleAttribute("selected", on);
  };
  return () => {
    syncStyleOptions();
    const st = editor.getSelectionState();
    const run = st.run;
    const para = st.para;
    setActive("bold", !!run["bold"]);
    setActive("italic", !!run["italic"]);
    setActive("underline", !!run["underline"]);
    setActive("strike", !!run["strike"]);
    setActive("sup", run["vertAlign"] === "superscript");
    setActive("sub", run["vertAlign"] === "subscript");
    setActive("painter", editor.painterActive());
    setActive("marks", !!st.marks);
    const a3 = para["alignment"];
    setActive("align:left", a3 === "left" || a3 === void 0);
    setActive("align:center", a3 === "center");
    setActive("align:right", a3 === "right");
    setActive("align:both", a3 === "both");
    const list = para["numbering"]?.kind;
    setActive("list:bullet", list === "bullet");
    setActive("list:decimal", list === "decimal");
    const curStyle = para["styleId"] || "Normal";
    styleSel.value = curStyle;
    if (styleSel.value !== curStyle && styleSel.querySelector('option[value="Normal"]')) {
      styleSel.value = "Normal";
    }
    const font = run["fontAscii"] ?? "";
    fontSel.querySelector("option[data-dyn]")?.remove();
    if (font && font !== "Aptos" && font !== "Calibri") {
      const opt = document.createElement("option");
      opt.value = font;
      opt.textContent = font;
      opt.dataset["dyn"] = "1";
      fontSel.insertBefore(opt, fontSel.firstChild);
    }
    fontSel.value = font;
    const half = run["szHalfPt"];
    if (half) sizeInp.value = String(half / 2);
    const color = run["color"];
    if (color && /^[0-9a-fA-F]{6}$/.test(color)) colorInp.value = `#${color}`;
  };
}
function buildBottomBar(el, editor) {
  el.innerHTML = `<div class="uw-bar">
    <span class="uw-status" data-a="status"></span>
    <span class="uw-spacer"></span>
    <span class="uw-view">
      ${iconBtn("view:print", "article", "Print layout")}
      ${iconBtn("view:web", "language", "Web layout")}
      ${iconBtn("view:read", "menu_book", "Read mode")}
    </span>
    <span class="uw-sep"></span>
    ${iconBtn("zoomout", "zoom_out", "Zoom out")}
    <span class="uw-status" data-a="zoom" style="min-width:44px;text-align:center"></span>
    ${iconBtn("zoomin", "zoom_in", "Zoom in")}
  </div>`;
  const act = {
    "view:print": () => editor.setView("print"),
    "view:web": () => editor.setView("web"),
    "view:read": () => editor.setView("read"),
    zoomout: () => editor.setZoom(Math.max(0.2, editor.getZoom() - 0.1)),
    zoomin: () => editor.setZoom(Math.min(5, editor.getZoom() + 0.1))
  };
  el.querySelectorAll("[data-a]").forEach((b5) => {
    const key = b5.dataset["a"];
    if (act[key]) b5.addEventListener("click", () => {
      act[key]();
      editor.focusEditor();
    });
  });
  const statusEl = el.querySelector('[data-a="status"]');
  const zoomEl = el.querySelector('[data-a="zoom"]');
  return () => {
    const s4 = editor.stats();
    statusEl.textContent = `Page ${s4.page} of ${s4.pages} \xB7 ${s4.words} word${s4.words === 1 ? "" : "s"}`;
    zoomEl.textContent = `${Math.round(editor.getZoom() * 100)}%`;
    const view = editor.getView();
    for (const v2 of ["print", "web", "read"]) {
      el.querySelector(`[data-a="view:${v2}"]`)?.toggleAttribute("selected", view === v2);
    }
  };
}
function setupChrome(editor, topbarEl, bottombarEl, opts) {
  ensureTheme();
  const root = topbarEl.getRootNode();
  if (!root.querySelector("#uw-chrome-style")) {
    const s4 = document.createElement("style");
    s4.id = "uw-chrome-style";
    s4.textContent = CHROME_CSS;
    root.appendChild(s4);
  }
  const syncers = [];
  topbarEl.replaceChildren();
  if (opts.topbar) syncers.push(buildToolbar(topbarEl, editor));
  bottombarEl.replaceChildren();
  if (opts.bottombar) syncers.push(buildBottomBar(bottombarEl, editor));
  const sync = () => {
    for (const fn of syncers) fn();
  };
  sync();
  return { sync };
}
var svg, iconBtn, textBtn, sel, SEP, themeStyle, CHROME_CSS, DOCX_MIME, STYLE_OPTS, FONT_OPTS, HL_OPTS, SPACING_OPTS;
var init_chrome = __esm({
  "src/chrome.ts"() {
    "use strict";
    init_button();
    init_icon_button();
    init_theme();
    init_chrome_icons();
    svg = (name) => `<svg class="uw-ic" viewBox="0 -960 960 960" aria-hidden="true">${ICON[name] ?? ""}</svg>`;
    iconBtn = (id, name, title) => `<u-icon-button shape="square" variant="standard" data-a="${id}" title="${title}">${svg(name)}</u-icon-button>`;
    textBtn = (id, text, title) => `<u-icon-button shape="square" variant="standard" data-a="${id}" title="${title}"><span class="uw-glyph">${text}</span></u-icon-button>`;
    sel = (id, title, options, cls = "uw-sel") => `<select class="${cls}" data-a="${id}" title="${title}">${options}</select>`;
    SEP = '<span class="uw-sep"></span>';
    themeStyle = null;
    CHROME_CSS = /* css */
    `
.uw-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px 10px;
  font-family: system-ui, sans-serif; box-sizing: border-box; width: 100%; }
.uw-topbar .uw-bar { gap: 2px; padding: 4px 8px; }
.uw-topbar .uw-bar + .uw-bar { padding-top: 0; }
.uw-ic { width: 20px; height: 20px; display: inline-block; fill: currentColor; pointer-events: none; }
.uw-glyph { font-size: 17px; line-height: 1; pointer-events: none; }
.uw-sep { width: 1px; align-self: stretch; margin: 4px 4px; background: var(--u-color-outline-variant, #ccc); }
.uw-spacer { flex: 1 1 auto; }
.uw-topbar u-icon-button, .uw-topbar u-button, .uw-bottombar u-icon-button { vertical-align: middle; }
.uw-sel, .uw-size {
  font: inherit; font-size: 12.5px; height: 30px;
  border: 1px solid var(--u-color-outline-variant, #ccc); border-radius: 6px;
  background: var(--u-color-surface, #fff); color: var(--u-color-on-surface, #1b1b1f);
}
.uw-sel { padding: 0 4px; max-width: 132px; }
.uw-size { width: 46px; text-align: center; padding: 0 4px; }
.uw-color {
  width: 32px; height: 30px; padding: 2px; cursor: pointer;
  border: 1px solid var(--u-color-outline-variant, #ccc); border-radius: 6px;
  background: var(--u-color-surface, #fff);
}
.uw-status { font-size: 12.5px; color: var(--u-color-on-surface-variant, #555);
  font-variant-numeric: tabular-nums; padding: 0 4px; }
.uw-bottombar .uw-bar { padding: 4px 12px; }
.uw-view { display: inline-flex; gap: 2px; }
`;
    DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    STYLE_OPTS = `<option value="">Normal</option><option value="Heading1">Heading 1</option><option value="Heading2">Heading 2</option><option value="Heading3">Heading 3</option><option value="Title">Title</option>`;
    FONT_OPTS = `<option>Aptos</option><option>Calibri</option>`;
    HL_OPTS = `<option value="">No highlight</option><option value="yellow">Yellow</option><option value="green">Green</option><option value="cyan">Cyan</option><option value="magenta">Magenta</option>`;
    SPACING_OPTS = `<option value="240">1.0</option><option value="276">1.15</option><option value="360">1.5</option><option value="480">2.0</option>`;
  }
});

// ../../node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b5 = new u16(31);
  for (var i7 = 0; i7 < 31; ++i7) {
    b5[i7] = start += 1 << eb[i7 - 1];
  }
  var r6 = new i32(b5[30]);
  for (var i7 = 1; i7 < 30; ++i7) {
    for (var j = b5[i7]; j < b5[i7 + 1]; ++j) {
      r6[j] = j - b5[i7] << 5 | i7;
    }
  }
  return { b: b5, r: r6 };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r6) {
  var s4 = cd.length;
  var i7 = 0;
  var l3 = new u16(mb);
  for (; i7 < s4; ++i7) {
    if (cd[i7])
      ++l3[cd[i7] - 1];
  }
  var le = new u16(mb);
  for (i7 = 1; i7 < mb; ++i7) {
    le[i7] = le[i7 - 1] + l3[i7 - 1] << 1;
  }
  var co;
  if (r6) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i7 = 0; i7 < s4; ++i7) {
      if (cd[i7]) {
        var sv = i7 << 4 | cd[i7];
        var r_1 = mb - cd[i7];
        var v2 = le[cd[i7] - 1]++ << r_1;
        for (var m2 = v2 | (1 << r_1) - 1; v2 <= m2; ++v2) {
          co[rev[v2] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s4);
    for (i7 = 0; i7 < s4; ++i7) {
      if (cd[i7]) {
        co[i7] = rev[le[cd[i7] - 1]++] >> 15 - cd[i7];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a3) {
  var m2 = a3[0];
  for (var i7 = 1; i7 < a3.length; ++i7) {
    if (a3[i7] > m2)
      m2 = a3[i7];
  }
  return m2;
};
var bits = function(d3, p3, m2) {
  var o7 = p3 / 8 | 0;
  return (d3[o7] | d3[o7 + 1] << 8) >> (p3 & 7) & m2;
};
var bits16 = function(d3, p3) {
  var o7 = p3 / 8 | 0;
  return (d3[o7] | d3[o7 + 1] << 8 | d3[o7 + 2] << 16) >> (p3 & 7);
};
var shft = function(p3) {
  return (p3 + 7) / 8 | 0;
};
var slc = function(v2, s4, e8) {
  if (s4 == null || s4 < 0)
    s4 = 0;
  if (e8 == null || e8 > v2.length)
    e8 = v2.length;
  return new u8(v2.subarray(s4, e8));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e8 = new Error(msg || ec[ind]);
  e8.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e8, err);
  if (!nt)
    throw e8;
  return e8;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l4) {
    var bl = buf.length;
    if (l4 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l4));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s4 = shft(pos) + 4, l3 = dat[s4 - 4] | dat[s4 - 3] << 8, t5 = s4 + l3;
        if (t5 > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l3);
        buf.set(dat.subarray(s4, t5), bt);
        st.b = bt += l3, st.p = pos = t5 * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i7 = 0; i7 < hcLen; ++i7) {
          clt[clim[i7]] = bits(dat, pos + i7 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i7 = 0; i7 < tl; ) {
          var r6 = clm[bits(dat, pos, clbmsk)];
          pos += r6 & 15;
          var s4 = r6 >> 4;
          if (s4 < 16) {
            ldt[i7++] = s4;
          } else {
            var c4 = 0, n5 = 0;
            if (s4 == 16)
              n5 = 3 + bits(dat, pos, 3), pos += 2, c4 = ldt[i7 - 1];
            else if (s4 == 17)
              n5 = 3 + bits(dat, pos, 7), pos += 3;
            else if (s4 == 18)
              n5 = 11 + bits(dat, pos, 127), pos += 7;
            while (n5--)
              ldt[i7++] = c4;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c4 = lm[bits16(dat, pos) & lms], sym = c4 >> 4;
      pos += c4 & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c4)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i7 = sym - 257, b5 = fleb[i7];
          add = bits(dat, pos, (1 << b5) - 1) + fl[i7];
          pos += b5;
        }
        var d3 = dm[bits16(dat, pos) & dms], dsym = d3 >> 4;
        if (!d3)
          err(3);
        pos += d3 & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b5 = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b5) - 1, pos += b5;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var wbits = function(d3, p3, v2) {
  v2 <<= p3 & 7;
  var o7 = p3 / 8 | 0;
  d3[o7] |= v2;
  d3[o7 + 1] |= v2 >> 8;
};
var wbits16 = function(d3, p3, v2) {
  v2 <<= p3 & 7;
  var o7 = p3 / 8 | 0;
  d3[o7] |= v2;
  d3[o7 + 1] |= v2 >> 8;
  d3[o7 + 2] |= v2 >> 16;
};
var hTree = function(d3, mb) {
  var t5 = [];
  for (var i7 = 0; i7 < d3.length; ++i7) {
    if (d3[i7])
      t5.push({ s: i7, f: d3[i7] });
  }
  var s4 = t5.length;
  var t22 = t5.slice();
  if (!s4)
    return { t: et, l: 0 };
  if (s4 == 1) {
    var v2 = new u8(t5[0].s + 1);
    v2[t5[0].s] = 1;
    return { t: v2, l: 1 };
  }
  t5.sort(function(a3, b5) {
    return a3.f - b5.f;
  });
  t5.push({ s: -1, f: 25001 });
  var l3 = t5[0], r6 = t5[1], i0 = 0, i1 = 1, i22 = 2;
  t5[0] = { s: -1, f: l3.f + r6.f, l: l3, r: r6 };
  while (i1 != s4 - 1) {
    l3 = t5[t5[i0].f < t5[i22].f ? i0++ : i22++];
    r6 = t5[i0 != i1 && t5[i0].f < t5[i22].f ? i0++ : i22++];
    t5[i1++] = { s: -1, f: l3.f + r6.f, l: l3, r: r6 };
  }
  var maxSym = t22[0].s;
  for (var i7 = 1; i7 < s4; ++i7) {
    if (t22[i7].s > maxSym)
      maxSym = t22[i7].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t5[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i7 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t22.sort(function(a3, b5) {
      return tr[b5.s] - tr[a3.s] || a3.f - b5.f;
    });
    for (; i7 < s4; ++i7) {
      var i2_1 = t22[i7].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t22[i7].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i7;
    }
    for (; i7 >= 0 && dt; --i7) {
      var i2_3 = t22[i7].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n5, l3, d3) {
  return n5.s == -1 ? Math.max(ln(n5.l, l3, d3 + 1), ln(n5.r, l3, d3 + 1)) : l3[n5.s] = d3;
};
var lc = function(c4) {
  var s4 = c4.length;
  while (s4 && !c4[--s4])
    ;
  var cl = new u16(++s4);
  var cli = 0, cln = c4[0], cls = 1;
  var w2 = function(v2) {
    cl[cli++] = v2;
  };
  for (var i7 = 1; i7 <= s4; ++i7) {
    if (c4[i7] == cln && i7 != s4)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w2(32754);
        if (cls > 2) {
          w2(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w2(cln), --cls;
        for (; cls > 6; cls -= 6)
          w2(8304);
        if (cls > 2)
          w2(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w2(cln);
      cls = 1;
      cln = c4[i7];
    }
  }
  return { c: cl.subarray(0, cli), n: s4 };
};
var clen = function(cf, cl) {
  var l3 = 0;
  for (var i7 = 0; i7 < cl.length; ++i7)
    l3 += cf[i7] * cl[i7];
  return l3;
};
var wfblk = function(out, pos, dat) {
  var s4 = dat.length;
  var o7 = shft(pos + 2);
  out[o7] = s4 & 255;
  out[o7 + 1] = s4 >> 8;
  out[o7 + 2] = out[o7] ^ 255;
  out[o7 + 3] = out[o7 + 1] ^ 255;
  for (var i7 = 0; i7 < s4; ++i7)
    out[o7 + i7 + 4] = dat[i7];
  return (o7 + 4 + s4) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p3) {
  wbits(out, p3++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i7 = 0; i7 < lclt.length; ++i7)
    ++lcfreq[lclt[i7] & 31];
  for (var i7 = 0; i7 < lcdt.length; ++i7)
    ++lcfreq[lcdt[i7] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p3, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p3, 1 + (dtlen < ftlen)), p3 += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p3, nlc - 257);
    wbits(out, p3 + 5, ndc - 1);
    wbits(out, p3 + 10, nlcc - 4);
    p3 += 14;
    for (var i7 = 0; i7 < nlcc; ++i7)
      wbits(out, p3 + 3 * i7, lct[clim[i7]]);
    p3 += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i7 = 0; i7 < clct.length; ++i7) {
        var len = clct[i7] & 31;
        wbits(out, p3, llm[len]), p3 += lct[len];
        if (len > 15)
          wbits(out, p3, clct[i7] >> 5 & 127), p3 += clct[i7] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i7 = 0; i7 < li; ++i7) {
    var sym = syms[i7];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p3, lm[len + 257]), p3 += ll[len + 257];
      if (len > 7)
        wbits(out, p3, sym >> 23 & 31), p3 += fleb[len];
      var dst = sym & 31;
      wbits16(out, p3, dm[dst]), p3 += dl[dst];
      if (dst > 3)
        wbits16(out, p3, sym >> 5 & 8191), p3 += fdeb[dst];
    } else {
      wbits16(out, p3, lm[sym]), p3 += ll[sym];
    }
  }
  wbits16(out, p3, lm[256]);
  return p3 + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s4 = st.z || dat.length;
  var o7 = new u8(pre + s4 + 5 * (1 + Math.ceil(s4 / 7e3)) + post);
  var w2 = o7.subarray(pre, o7.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w2[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n5 = opt >> 13, c4 = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i8) {
      return (dat[i8] ^ dat[i8 + 1] << bs1_1 ^ dat[i8 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i7 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i7 + 2 < s4; ++i7) {
      var hv = hsh(i7);
      var imod = i7 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i7) {
        var rem = s4 - i7;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w2, 0, syms, lf, df, eb, li, bs, i7 - bs, pos);
          li = lc_1 = eb = 0, bs = i7;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l3 = 2, d3 = 0, ch_1 = c4, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i7 - dif)) {
          var maxn = Math.min(n5, rem) - 1;
          var maxd = Math.min(32767, i7);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i7 + l3] == dat[i7 + l3 - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i7 + nl] == dat[i7 + nl - dif]; ++nl)
                ;
              if (nl > l3) {
                l3 = nl, d3 = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i7 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d3) {
          syms[li++] = 268435456 | revfl[l3] << 18 | revfd[d3];
          var lin = revfl[l3] & 31, din = revfd[d3] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i7 + l3;
          ++lc_1;
        } else {
          syms[li++] = dat[i7];
          ++lf[dat[i7]];
        }
      }
    }
    for (i7 = Math.max(i7, wi); i7 < s4; ++i7) {
      syms[li++] = dat[i7];
      ++lf[dat[i7]];
    }
    pos = wblk(dat, w2, lst, syms, lf, df, eb, li, bs, i7 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w2[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i7, st.w = wi;
    }
  } else {
    for (var i7 = st.w || 0; i7 < s4 + lst; i7 += 65535) {
      var e8 = i7 + 65535;
      if (e8 >= s4) {
        w2[pos / 8 | 0] = lst;
        e8 = s4;
      }
      pos = wfblk(w2, pos + 1, dat.subarray(i7, e8));
    }
    st.i = s4;
  }
  return slc(o7, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t5 = new Int32Array(256);
  for (var i7 = 0; i7 < 256; ++i7) {
    var c4 = i7, k2 = 9;
    while (--k2)
      c4 = (c4 & 1 && -306674912) ^ c4 >>> 1;
    t5[i7] = c4;
  }
  return t5;
})();
var crc = function() {
  var c4 = -1;
  return {
    p: function(d3) {
      var cr = c4;
      for (var i7 = 0; i7 < d3.length; ++i7)
        cr = crct[cr & 255 ^ d3[i7]] ^ cr >>> 8;
      c4 = cr;
    },
    d: function() {
      return ~c4;
    }
  };
};
var adler = function() {
  var a3 = 1, b5 = 0;
  return {
    p: function(d3) {
      var n5 = a3, m2 = b5;
      var l3 = d3.length | 0;
      for (var i7 = 0; i7 != l3; ) {
        var e8 = Math.min(i7 + 2655, l3);
        for (; i7 < e8; ++i7)
          m2 += n5 += d3[i7];
        n5 = (n5 & 65535) + 15 * (n5 >> 16), m2 = (m2 & 65535) + 15 * (m2 >> 16);
      }
      a3 = n5, b5 = m2;
    },
    d: function() {
      a3 %= 65521, b5 %= 65521;
      return (a3 & 255) << 24 | (a3 & 65280) << 8 | (b5 & 255) << 8 | b5 >> 8;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a3, b5) {
  var o7 = {};
  for (var k2 in a3)
    o7[k2] = a3[k2];
  for (var k2 in b5)
    o7[k2] = b5[k2];
  return o7;
};
var b2 = function(d3, b5) {
  return d3[b5] | d3[b5 + 1] << 8;
};
var b4 = function(d3, b5) {
  return (d3[b5] | d3[b5 + 1] << 8 | d3[b5 + 2] << 16 | d3[b5 + 3] << 24) >>> 0;
};
var b8 = function(d3, b5) {
  return b4(d3, b5) + b4(d3, b5 + 4) * 4294967296;
};
var wbytes = function(d3, b5, v2) {
  for (; v2; ++b5)
    d3[b5] = v2, v2 >>>= 8;
};
var zlh = function(c4, o7) {
  var lv = o7.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c4[0] = 120, c4[1] = fl2 << 6 | (o7.dictionary && 32);
  c4[1] |= 31 - (c4[0] << 8 | c4[1]) % 31;
  if (o7.dictionary) {
    var h3 = adler();
    h3.p(o7.dictionary);
    wbytes(c4, 2, h3.d());
  }
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a3 = adler();
  a3.p(data);
  var d3 = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d3, opts), wbytes(d3, d3.length - 4, a3.d()), d3;
}
var fltn = function(d3, p3, t5, o7) {
  for (var k2 in d3) {
    var val = d3[k2], n5 = p3 + k2, op = o7;
    if (Array.isArray(val))
      op = mrg(o7, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t5[n5] = [val, op];
    else {
      t5[n5 += "/"] = [new u8(0), op];
      fltn(val, n5, t5, o7);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e8) {
}
var dutf8 = function(d3) {
  for (var r6 = "", i7 = 0; ; ) {
    var c4 = d3[i7++];
    var eb = (c4 > 127) + (c4 > 223) + (c4 > 239);
    if (i7 + eb > d3.length)
      return { s: r6, r: slc(d3, i7 - 1) };
    if (!eb)
      r6 += String.fromCharCode(c4);
    else if (eb == 3) {
      c4 = ((c4 & 15) << 18 | (d3[i7++] & 63) << 12 | (d3[i7++] & 63) << 6 | d3[i7++] & 63) - 65536, r6 += String.fromCharCode(55296 | c4 >> 10, 56320 | c4 & 1023);
    } else if (eb & 1)
      r6 += String.fromCharCode((c4 & 31) << 6 | d3[i7++] & 63);
    else
      r6 += String.fromCharCode((c4 & 15) << 12 | (d3[i7++] & 63) << 6 | d3[i7++] & 63);
  }
};
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i7 = 0; i7 < str.length; ++i7)
      ar_1[i7] = str.charCodeAt(i7);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l3 = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w2 = function(v2) {
    ar[ai++] = v2;
  };
  for (var i7 = 0; i7 < l3; ++i7) {
    if (ai + 5 > ar.length) {
      var n5 = new u8(ai + 8 + (l3 - i7 << 1));
      n5.set(ar);
      ar = n5;
    }
    var c4 = str.charCodeAt(i7);
    if (c4 < 128 || latin1)
      w2(c4);
    else if (c4 < 2048)
      w2(192 | c4 >> 6), w2(128 | c4 & 63);
    else if (c4 > 55295 && c4 < 57344)
      c4 = 65536 + (c4 & 1023 << 10) | str.charCodeAt(++i7) & 1023, w2(240 | c4 >> 18), w2(128 | c4 >> 12 & 63), w2(128 | c4 >> 6 & 63), w2(128 | c4 & 63);
    else
      w2(224 | c4 >> 12), w2(128 | c4 >> 6 & 63), w2(128 | c4 & 63);
  }
  return slc(ar, 0, ai);
}
function strFromU8(dat, latin1) {
  if (latin1) {
    var r6 = "";
    for (var i7 = 0; i7 < dat.length; i7 += 16384)
      r6 += String.fromCharCode.apply(null, dat.subarray(i7, i7 + 16384));
    return r6;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s4 = _a2.s, r6 = _a2.r;
    if (r6.length)
      err(8);
    return s4;
  }
}
var slzh = function(d3, b5) {
  return b5 + 30 + b2(d3, b5 + 26) + b2(d3, b5 + 28);
};
var zh = function(d3, b5, z2) {
  var fnl = b2(d3, b5 + 28), efl = b2(d3, b5 + 30), fn = strFromU8(d3.subarray(b5 + 46, b5 + 46 + fnl), !(b2(d3, b5 + 8) & 2048)), es = b5 + 46 + fnl;
  var _a2 = z64hs(d3, es, efl, z2, b4(d3, b5 + 20), b4(d3, b5 + 24), b4(d3, b5 + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d3, b5 + 10), sc, su, fn, es + efl + b2(d3, b5 + 32), off];
};
var z64hs = function(d3, b5, l3, z2, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e8 = b5 + l3;
  var nf = nsc + nsu + noff;
  if (z2 && nf) {
    for (; b5 + 4 < e8; b5 += 4 + b2(d3, b5 + 2)) {
      if (b2(d3, b5) == 1) {
        return [
          nsc ? b8(d3, b5 + 4 + 8 * nsu) : sc,
          nsu ? b8(d3, b5 + 4) : su,
          noff ? b8(d3, b5 + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z2 < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k2 in ex) {
      var l3 = ex[k2].length;
      if (l3 > 65535)
        err(9);
      le += l3 + 4;
    }
  }
  return le;
};
var wzh = function(d3, b5, f3, fn, u3, c4, ce, co) {
  var fl2 = fn.length, ex = f3.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d3, b5, ce != null ? 33639248 : 67324752), b5 += 4;
  if (ce != null)
    d3[b5++] = 20, d3[b5++] = f3.os;
  d3[b5] = 20, b5 += 2;
  d3[b5++] = f3.flag << 1 | (c4 < 0 && 8), d3[b5++] = u3 && 8;
  d3[b5++] = f3.compression & 255, d3[b5++] = f3.compression >> 8;
  var dt = new Date(f3.mtime == null ? Date.now() : f3.mtime), y3 = dt.getFullYear() - 1980;
  if (y3 < 0 || y3 > 119)
    err(10);
  wbytes(d3, b5, y3 << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b5 += 4;
  if (c4 != -1) {
    wbytes(d3, b5, f3.crc);
    wbytes(d3, b5 + 4, c4 < 0 ? -c4 - 2 : c4);
    wbytes(d3, b5 + 8, f3.size);
  }
  wbytes(d3, b5 + 12, fl2);
  wbytes(d3, b5 + 14, exl), b5 += 16;
  if (ce != null) {
    wbytes(d3, b5, col);
    wbytes(d3, b5 + 6, f3.attrs);
    wbytes(d3, b5 + 10, ce), b5 += 14;
  }
  d3.set(fn, b5);
  b5 += fl2;
  if (exl) {
    for (var k2 in ex) {
      var exf = ex[k2], l3 = exf.length;
      wbytes(d3, b5, +k2);
      wbytes(d3, b5 + 2, l3);
      d3.set(exf, b5 + 4), b5 += 4 + l3;
    }
  }
  if (col)
    d3.set(co, b5), b5 += col;
  return b5;
};
var wzf = function(o7, b5, c4, d3, e8) {
  wbytes(o7, b5, 101010256);
  wbytes(o7, b5 + 8, c4);
  wbytes(o7, b5 + 10, c4);
  wbytes(o7, b5 + 12, d3);
  wbytes(o7, b5 + 16, e8);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r6 = {};
  var files = [];
  fltn(data, "", r6, opts);
  var o7 = 0;
  var tot = 0;
  for (var fn in r6) {
    var _a2 = r6[fn], file = _a2[0], p3 = _a2[1];
    var compression = p3.level == 0 ? 0 : 8;
    var f3 = strToU8(fn), s4 = f3.length;
    var com = p3.comment, m2 = com && strToU8(com), ms = m2 && m2.length;
    var exl = exfl(p3.extra);
    if (s4 > 65535)
      err(11);
    var d3 = compression ? deflateSync(file, p3) : file, l3 = d3.length;
    var c4 = crc();
    c4.p(file);
    files.push(mrg(p3, {
      size: file.length,
      crc: c4.d(),
      c: d3,
      f: f3,
      m: m2,
      u: s4 != fn.length || m2 && com.length != ms,
      o: o7,
      compression
    }));
    o7 += 30 + s4 + exl + l3;
    tot += 76 + 2 * (s4 + exl) + (ms || 0) + l3;
  }
  var out = new u8(tot + 22), oe = o7, cdl = tot - o7;
  for (var i7 = 0; i7 < files.length; ++i7) {
    var f3 = files[i7];
    wzh(out, f3.o, f3, f3.f, f3.u, f3.c.length);
    var badd = 30 + f3.f.length + exfl(f3.extra);
    out.set(f3.c, f3.o + badd);
    wzh(out, o7, f3, f3.f, f3.u, f3.c.length, f3.o, f3.m), o7 += 16 + badd + (f3.m ? f3.m.length : 0);
  }
  wzf(out, o7, files.length, cdl, oe);
  return out;
}
function unzipSync(data, opts) {
  var files = {};
  var e8 = data.length - 22;
  for (; b4(data, e8) != 101010256; --e8) {
    if (!e8 || data.length - e8 > 65558)
      err(13);
  }
  ;
  var c4 = b2(data, e8 + 8);
  if (!c4)
    return {};
  var o7 = b4(data, e8 + 16);
  var z2 = b4(data, e8 - 20) == 117853008;
  if (z2) {
    var ze = b4(data, e8 - 12);
    z2 = b4(data, ze) == 101075792;
    if (z2) {
      c4 = b4(data, ze + 32);
      o7 = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i7 = 0; i7 < c4; ++i7) {
    var _a2 = zh(data, o7, z2), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b5 = slzh(data, off);
    o7 = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b5, b5 + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b5, b5 + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// ../docx-core/src/package.ts
var DocxPackage = class _DocxPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  /** Pacote OPC mínimo para documentos novos (writeDocument completa o resto). */
  static empty() {
    const enc2 = new TextEncoder();
    const parts = /* @__PURE__ */ new Map();
    parts.set("[Content_Types].xml", enc2.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ));
    parts.set("_rels/.rels", enc2.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    ));
    parts.set("word/document.xml", enc2.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'
    ));
    return new _DocxPackage(parts);
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote OOXML v\xE1lido (ZIP corrompido ou formato legado .doc)");
    }
    const pkg = new _DocxPackage(new Map(Object.entries(unzipped)));
    if (!pkg.getPart("word/document.xml")) {
      throw new Error("Pacote sem word/document.xml \u2014 n\xE3o \xE9 um documento .docx v\xE1lido");
    }
    return pkg;
  }
  save() {
    const zippable = {};
    for (const [path, data] of this.parts) zippable[path] = data;
    return zipSync(zippable, { level: 6 });
  }
  partNames() {
    return [...this.parts.keys()];
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  setPart(path, data) {
    this.parts.set(path, data);
  }
  setPartText(path, text) {
    this.parts.set(path, new TextEncoder().encode(text));
  }
  /** Conteúdo principal (word/document.xml). */
  documentXml() {
    const xml = this.getPartText("word/document.xml");
    if (xml === void 0) throw new Error("Pacote sem word/document.xml");
    return xml;
  }
};

// ../docx-core/src/xml.ts
var ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};
function decodeEntities(s4) {
  return s4.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (_2, e8) => {
    if (e8.startsWith("#x") || e8.startsWith("#X")) return String.fromCodePoint(parseInt(e8.slice(2), 16));
    if (e8.startsWith("#")) return String.fromCodePoint(parseInt(e8.slice(1), 10));
    return ENTITIES[e8] ?? `&${e8};`;
  });
}
function parseXml(xml) {
  let i7 = 0;
  const n5 = xml.length;
  function error(msg) {
    throw new Error(`XML inv\xE1lido @${i7}: ${msg}`);
  }
  function skipMisc() {
    for (; ; ) {
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml.startsWith("<?", i7)) {
        i7 = xml.indexOf("?>", i7);
        if (i7 < 0) error("?> n\xE3o fechado");
        i7 += 2;
      } else if (xml.startsWith("<!--", i7)) {
        i7 = xml.indexOf("-->", i7);
        if (i7 < 0) error("--> n\xE3o fechado");
        i7 += 3;
      } else if (xml.startsWith("<!", i7)) {
        i7 = xml.indexOf(">", i7);
        if (i7 < 0) error("<! n\xE3o fechado");
        i7 += 1;
      } else break;
    }
  }
  function parseElement() {
    if (xml[i7] !== "<") error("esperava <");
    i7++;
    const nameStart = i7;
    while (i7 < n5 && !/[\s/>]/.test(xml[i7])) i7++;
    const name = xml.slice(nameStart, i7);
    const attrs = {};
    for (; ; ) {
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml[i7] === "/") {
        if (xml[i7 + 1] !== ">") error("esperava />");
        i7 += 2;
        return { name, attrs, children: [] };
      }
      if (xml[i7] === ">") {
        i7++;
        break;
      }
      const aStart = i7;
      while (i7 < n5 && xml[i7] !== "=" && !/\s/.test(xml[i7])) i7++;
      const aName = xml.slice(aStart, i7);
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      if (xml[i7] !== "=") error(`atributo ${aName} sem =`);
      i7++;
      while (i7 < n5 && /\s/.test(xml[i7])) i7++;
      const q = xml[i7];
      if (q !== '"' && q !== "'") error("valor de atributo sem aspas");
      i7++;
      const vStart = i7;
      i7 = xml.indexOf(q, i7);
      if (i7 < 0) error("aspas n\xE3o fechadas");
      attrs[aName] = decodeEntities(xml.slice(vStart, i7));
      i7++;
    }
    const children = [];
    for (; ; ) {
      if (i7 >= n5) error(`</${name}> ausente`);
      if (xml.startsWith("</", i7)) {
        const close = xml.indexOf(">", i7);
        i7 = close + 1;
        return { name, attrs, children };
      }
      if (xml.startsWith("<!--", i7)) {
        i7 = xml.indexOf("-->", i7) + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", i7)) {
        const end = xml.indexOf("]]>", i7);
        children.push(xml.slice(i7 + 9, end));
        i7 = end + 3;
        continue;
      }
      if (xml[i7] === "<") {
        children.push(parseElement());
        continue;
      }
      const tStart = i7;
      while (i7 < n5 && xml[i7] !== "<") i7++;
      const text = decodeEntities(xml.slice(tStart, i7));
      if (text.length > 0) children.push(text);
    }
  }
  skipMisc();
  const root = parseElement();
  return root;
}
function childElements(el, name) {
  return el.children.filter(
    (c4) => typeof c4 !== "string" && (name === void 0 || c4.name === name)
  );
}
function firstChild(el, name) {
  return childElements(el, name)[0];
}

// ../docx-core/src/document.ts
var DEFAULT_RUN_PROPS = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  allCaps: false,
  smallCaps: false
};
var EMU_PER_TWIP = 635;
function readBorderEdge(el) {
  if (!el) return void 0;
  const style = el.attrs["w:val"];
  if (!style || style === "none" || style === "nil") return void 0;
  const color = el.attrs["w:color"];
  return {
    style,
    sizeEighthPt: parseInt(el.attrs["w:sz"] ?? "4", 10),
    color: color && color !== "auto" ? color : void 0,
    spacePt: parseInt(el.attrs["w:space"] ?? "0", 10)
  };
}
var onOff = (el) => {
  if (!el) return false;
  const v2 = el.attrs["w:val"];
  return v2 !== "0" && v2 !== "false" && v2 !== "none";
};
function readRunProps(rPr) {
  const p3 = { ...DEFAULT_RUN_PROPS };
  if (!rPr) return p3;
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:b":
        p3.bold = onOff(el);
        break;
      case "w:i":
        p3.italic = onOff(el);
        break;
      case "w:u":
        p3.underline = val !== void 0 && val !== "none";
        if (val === "double" || val === "dotted" || val === "dash" || val === "wave" || val === "thick") {
          p3.underlineStyle = val;
        }
        if (el.attrs["w:color"] && el.attrs["w:color"] !== "auto") p3.underlineColor = el.attrs["w:color"];
        break;
      case "w:strike":
        p3.strike = onOff(el);
        break;
      case "w:dstrike":
        p3.doubleStrike = onOff(el);
        break;
      case "w:caps":
        p3.allCaps = onOff(el);
        break;
      case "w:smallCaps":
        p3.smallCaps = onOff(el);
        break;
      case "w:vertAlign":
        if (val === "superscript" || val === "subscript") p3.vertAlign = val;
        break;
      case "w:sz":
        if (val) p3.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto") p3.color = val;
        break;
      case "w:highlight":
        if (val && val !== "none") p3.highlight = val;
        break;
      case "w:rFonts":
        p3.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:spacing":
        if (val) p3.charSpacingTwips = parseInt(val, 10);
        break;
    }
  }
  return p3;
}
function findDeep(el, name) {
  for (const c4 of childElements(el)) {
    if (c4.name === name) return c4;
    const found = findDeep(c4, name);
    if (found) return found;
  }
  return void 0;
}
function readDrawing(drawing, resolveImage) {
  const anchor = firstChild(drawing, "wp:anchor");
  const extent = findDeep(drawing, "wp:extent");
  const blip = findDeep(drawing, "a:blip");
  const rid = blip?.attrs["r:embed"];
  if (!extent || !rid) return void 0;
  const media = resolveImage(rid);
  if (!media) return void 0;
  const svgRid = findDeep(blip, "asvg:svgBlip")?.attrs["r:embed"];
  const svgMedia = svgRid ? resolveImage(svgRid) : void 0;
  const img = {
    data: media.data,
    ext: media.ext,
    ...svgMedia ? { svg: svgMedia.data } : {},
    widthTwips: parseInt(extent.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP,
    heightTwips: parseInt(extent.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP
  };
  if (anchor) {
    img.floating = true;
    const posH = firstChild(anchor, "wp:positionH");
    const posV = firstChild(anchor, "wp:positionV");
    const offH = posH && firstChild(posH, "wp:posOffset");
    const offV = posV && firstChild(posV, "wp:posOffset");
    if (offH) img.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV) img.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  return img;
}
function readTextbox(drawing, ctx) {
  const txbx = findDeep(drawing, "w:txbxContent");
  if (!txbx) return void 0;
  const paras = [];
  for (const p3 of childElements(txbx, "w:p")) paras.push(readParagraph(p3, ctx));
  if (!paras.length) return void 0;
  const extent = findDeep(drawing, "wp:extent");
  const tb = {
    paras,
    widthTwips: extent ? parseInt(extent.attrs["cx"] ?? "0", 10) / EMU_PER_TWIP : 0,
    heightTwips: extent ? parseInt(extent.attrs["cy"] ?? "0", 10) / EMU_PER_TWIP : 0
  };
  const anchor = firstChild(drawing, "wp:anchor");
  if (anchor) {
    tb.floating = true;
    const posH = firstChild(anchor, "wp:positionH");
    const posV = firstChild(anchor, "wp:positionV");
    const offH = posH && firstChild(posH, "wp:posOffset");
    const offV = posV && firstChild(posV, "wp:posOffset");
    if (offH) tb.offsetXTwips = parseInt(textContentOf(offH), 10) / EMU_PER_TWIP;
    if (offV) tb.offsetYTwips = parseInt(textContentOf(offV), 10) / EMU_PER_TWIP;
  }
  return tb;
}
function textContentOf(el) {
  let out = "";
  for (const c4 of el.children) out += typeof c4 === "string" ? c4 : textContentOf(c4);
  return out;
}
function readRunsInto(runs, container, ctx, inherit) {
  for (const child of childElements(container)) {
    if (child.name === "w:commentRangeStart") {
      ctx.activeComments?.add(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:commentRangeEnd") {
      ctx.activeComments?.delete(parseInt(child.attrs["w:id"] ?? "-1", 10));
    } else if (child.name === "w:bookmarkStart") {
      const name = child.attrs["w:name"];
      if (name) ctx.onBookmark?.(name);
    } else if (child.name === "w:r") {
      readSingleRun(runs, child, ctx, inherit);
    } else if (child.name === "w:hyperlink") {
      const rid = child.attrs["r:id"];
      const anchor = child.attrs["w:anchor"];
      const link = rid && ctx.resolveLink(rid) || (anchor ? `#${anchor}` : void 0);
      readRunsInto(runs, child, ctx, { ...inherit, link });
    } else if (child.name === "w:fldSimple") {
      const instr = child.attrs["w:instr"] ?? "";
      const before = runs.length;
      readRunsInto(runs, child, ctx, { ...inherit, field: instr });
      if (runs.length === before) {
        runs.push({ text: "", props: { ...DEFAULT_RUN_PROPS }, field: instr });
      }
    } else if (child.name === "m:oMath" || child.name === "m:oMathPara") {
      const text = collectMathText(child);
      if (text) {
        runs.push({
          text,
          props: { ...DEFAULT_RUN_PROPS, italic: true, isMath: true }
        });
      }
    } else if (child.name === "w:sdt") {
      const content = findDeep(child, "w:sdtContent");
      const sdtPr = firstChild(child, "w:sdtPr");
      const tag = sdtPr ? firstChild(sdtPr, "w:tag")?.attrs["w:val"] : void 0;
      const custom = parseCustomInlineTag(tag);
      if (content && custom) {
        const nested = [];
        readRunsInto(nested, content, ctx, inherit);
        const fallbackText = nested.map((run) => run.text).join("");
        runs.push({
          text: "\uFFFC",
          props: { ...nested[0]?.props ?? DEFAULT_RUN_PROPS },
          custom: { ...custom, fallbackText }
        });
      } else if (content) {
        readRunsInto(runs, content, ctx, inherit);
      }
    } else if (child.name === "w:smartTag" || child.name === "w:ins") {
      readRunsInto(runs, child, ctx, inherit);
    }
  }
}
var CUSTOM_INLINE_TAG_PREFIX = "wordnext:inline:";
function parseCustomInlineTag(tag) {
  if (!tag?.startsWith(CUSTOM_INLINE_TAG_PREFIX)) return void 0;
  const payload = tag.slice(CUSTOM_INLINE_TAG_PREFIX.length);
  const split = payload.indexOf(":");
  if (split <= 0) return void 0;
  const type = payload.slice(0, split);
  if (!/^[a-zA-Z0-9._-]+$/.test(type)) return void 0;
  try {
    return { type, data: JSON.parse(decodeURIComponent(payload.slice(split + 1))) };
  } catch {
    return void 0;
  }
}
function collectMathText(el) {
  let out = "";
  for (const c4 of el.children) {
    if (typeof c4 === "string") continue;
    if (c4.name === "m:t") out += textContentOf(c4);
    else out += collectMathText(c4);
  }
  return out;
}
function readSingleRun(runs, rEl, ctx, inherit) {
  const rProps = readRunProps(firstChild(rEl, "w:rPr"));
  if (inherit?.link) {
    rProps.link = inherit.link;
    rProps.underline = true;
    rProps.color ??= "0563C1";
  }
  const flush = (text2, extra) => {
    if (text2.length === 0 && !extra) return;
    const props = { ...rProps };
    if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
    runs.push({ text: text2, props, ...inherit?.field ? { field: inherit.field } : {}, ...extra });
  };
  let text = "";
  for (const child of childElements(rEl)) {
    if (child.name === "w:fldChar") {
      const type = child.attrs["w:fldCharType"];
      if (type === "begin") {
        if (text) {
          flush(text);
          text = "";
        }
        ctx.fieldState = { instr: "", phase: "instr", result: "" };
      } else if (type === "separate") {
        if (ctx.fieldState) ctx.fieldState.phase = "result";
      } else if (type === "end") {
        const fs = ctx.fieldState;
        ctx.fieldState = null;
        if (fs) {
          const instr = ` ${fs.instr.trim()} `;
          const props = { ...rProps };
          if (ctx.activeComments?.size) props.commentIds = [...ctx.activeComments];
          runs.push({ text: fs.result, props, field: instr });
        }
      }
      continue;
    }
    if (child.name === "w:instrText") {
      if (ctx.fieldState) ctx.fieldState.instr += textContentOf(child);
      continue;
    }
    if (ctx.fieldState) {
      if (child.name === "w:t" && ctx.fieldState.phase === "result") {
        ctx.fieldState.result += child.children.filter((c4) => typeof c4 === "string").join("");
      }
      continue;
    }
    if (child.name === "w:t") {
      text += child.children.filter((c4) => typeof c4 === "string").join("");
    } else if (child.name === "w:tab") text += "	";
    else if (child.name === "w:br" || child.name === "w:cr") {
      text += child.attrs["w:type"] === "page" ? "\f" : "\n";
    } else if (child.name === "w:sym") {
      if (text) {
        flush(text);
        text = "";
      }
      const hex = child.attrs["w:char"] ?? "F0B7";
      let code = parseInt(hex, 16);
      if (code <= 255) code |= 61440;
      runs.push({
        text: String.fromCharCode(code),
        props: { ...rProps, fontAscii: child.attrs["w:font"] ?? rProps.fontAscii }
      });
    } else if (child.name === "w:footnoteReference" || child.name === "w:endnoteReference") {
      if (text) {
        flush(text);
        text = "";
      }
      const id = parseInt(child.attrs["w:id"] ?? "0", 10);
      runs.push({
        text: "",
        props: { ...rProps, vertAlign: "superscript" },
        noteRef: { kind: child.name === "w:footnoteReference" ? "footnote" : "endnote", id }
      });
    } else if (child.name === "w:drawing") {
      if (text) {
        flush(text);
        text = "";
      }
      const image = readDrawing(child, ctx.resolveImage);
      if (image) runs.push({ text: "\uFFFC", props: { ...rProps }, image });
      else {
        const textbox = readTextbox(child, ctx);
        if (textbox) runs.push({ text: "\uFFFC", props: { ...rProps }, textbox });
      }
    } else if (child.name === "mc:AlternateContent") {
      const choice = firstChild(child, "mc:Choice") ?? child;
      const drawing = findDeep(choice, "w:drawing");
      if (drawing) {
        if (text) {
          flush(text);
          text = "";
        }
        const image = readDrawing(drawing, ctx.resolveImage);
        if (image) runs.push({ text: "\uFFFC", props: { ...rProps }, image });
        else {
          const textbox = readTextbox(drawing, ctx);
          if (textbox) runs.push({ text: "\uFFFC", props: { ...rProps }, textbox });
        }
      }
    }
  }
  if (text.length > 0) flush(text);
}
function readParagraph(pEl, ctx) {
  const props = {};
  const pPr = firstChild(pEl, "w:pPr");
  if (pPr) {
    const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
    if (jc === "center" || jc === "right" || jc === "both" || jc === "left") props.alignment = jc;
    props.styleId = firstChild(pPr, "w:pStyle")?.attrs["w:val"];
    const numPr = firstChild(pPr, "w:numPr");
    if (numPr) {
      const numId = parseInt(firstChild(numPr, "w:numId")?.attrs["w:val"] ?? "0", 10);
      props.numbering = {
        kind: numId === 1002 ? "decimal" : "bullet",
        ilvl: parseInt(firstChild(numPr, "w:ilvl")?.attrs["w:val"] ?? "0", 10)
      };
    }
    const ind = firstChild(pPr, "w:ind");
    if (ind) {
      if (ind.attrs["w:left"]) props.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
      if (ind.attrs["w:right"]) props.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
      if (ind.attrs["w:firstLine"]) props.indentFirstLineTwips = parseInt(ind.attrs["w:firstLine"], 10);
      if (ind.attrs["w:hanging"]) props.indentFirstLineTwips = -parseInt(ind.attrs["w:hanging"], 10);
    }
    const spacing = firstChild(pPr, "w:spacing");
    if (spacing) {
      if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
        props.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
      }
      if (spacing.attrs["w:after"]) props.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
      if (spacing.attrs["w:before"]) props.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
    }
    const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
    if (shd && shd !== "auto") props.shadingHex = shd;
    const tabs = firstChild(pPr, "w:tabs");
    if (tabs) {
      const stops = childElements(tabs, "w:tab").map((t5) => ({
        posTwips: parseInt(t5.attrs["w:pos"] ?? "0", 10),
        align: t5.attrs["w:val"] === "right" ? "right" : "left",
        leader: t5.attrs["w:leader"] === "dot" ? "dot" : void 0
      })).filter((t5) => t5.posTwips > 0);
      if (stops.length) props.tabStops = stops;
    }
    const pBdr = firstChild(pPr, "w:pBdr");
    if (pBdr) {
      props.boxBorder = true;
      const borders = {};
      for (const side of ["top", "left", "bottom", "right"]) {
        const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
        if (edge) borders[side] = edge;
      }
      if (Object.keys(borders).length > 0) props.borders = borders;
    }
    if (firstChild(pPr, "w:pageBreakBefore")) props.pageBreakBefore = true;
    const framePr = firstChild(pPr, "w:framePr");
    if (framePr?.attrs["w:dropCap"] && framePr.attrs["w:dropCap"] !== "none") props.dropCap = true;
  }
  const runs = [];
  readRunsInto(runs, pEl, ctx);
  const instr = collectInstrText(pEl);
  if (/\bTOC\b/.test(instr)) props.tocInstr = instr.trim();
  return { runs, props };
}
function collectInstrText(el) {
  let out = "";
  for (const c4 of el.children) {
    if (typeof c4 === "string") continue;
    if (c4.name === "w:instrText") out += textContentOf(c4);
    else out += collectInstrText(c4);
  }
  return out;
}
function buildReadContext(pkg, relsPath) {
  const relsXml = pkg.getPartText(relsPath);
  const relMap = /* @__PURE__ */ new Map();
  if (relsXml) {
    const rels = parseXml(relsXml);
    for (const rel of childElements(rels, "Relationship")) {
      const id = rel.attrs["Id"];
      const target = rel.attrs["Target"];
      if (id && target) {
        relMap.set(id, {
          target: target.replace(/^\.\//, ""),
          external: rel.attrs["TargetMode"] === "External"
        });
      }
    }
  }
  return {
    activeComments: /* @__PURE__ */ new Set(),
    fieldState: null,
    resolveImage: (rid) => {
      const rel = relMap.get(rid);
      if (!rel || rel.external) return void 0;
      const path = rel.target.startsWith("/") ? rel.target.slice(1) : `word/${rel.target}`;
      const data = pkg.getPart(path);
      if (!data) return void 0;
      const ext = path.split(".").pop()?.toLowerCase() ?? "png";
      return { data, ext };
    },
    resolveLink: (rid) => {
      const rel = relMap.get(rid);
      return rel?.external ? rel.target : void 0;
    }
  };
}
var tw = (el, attr, fallback) => {
  const v2 = el?.attrs[attr];
  return v2 === void 0 ? fallback : parseInt(v2, 10);
};
function readSectPr(sectEl) {
  const pgSz = sectEl && firstChild(sectEl, "w:pgSz");
  const pgMar = sectEl && firstChild(sectEl, "w:pgMar");
  const colsEl = sectEl && firstChild(sectEl, "w:cols");
  const sect = {
    pageWidthTwips: tw(pgSz, "w:w", 11906),
    pageHeightTwips: tw(pgSz, "w:h", 16838),
    marginLeftTwips: tw(pgMar, "w:left", 1701),
    marginRightTwips: tw(pgMar, "w:right", 1701),
    marginTopTwips: tw(pgMar, "w:top", 1417),
    marginBottomTwips: tw(pgMar, "w:bottom", 1417),
    headerDistanceTwips: tw(pgMar, "w:header", 720),
    footerDistanceTwips: tw(pgMar, "w:footer", 720)
  };
  const num = colsEl ? parseInt(colsEl.attrs["w:num"] ?? "1", 10) : 1;
  if (num > 1) {
    sect.cols = {
      count: num,
      spaceTwips: parseInt(colsEl.attrs["w:space"] ?? "720", 10),
      sep: colsEl.attrs["w:sep"] === "true" || colsEl.attrs["w:sep"] === "1"
    };
  }
  const titlePg = sectEl && firstChild(sectEl, "w:titlePg");
  if (titlePg && titlePg.attrs["w:val"] !== "0" && titlePg.attrs["w:val"] !== "false") {
    sect.titlePg = true;
  }
  return sect;
}

// ../docx-core/src/styles.ts
var onOff2 = (el) => {
  if (!el) return void 0;
  const v2 = el.attrs["w:val"];
  return v2 !== "0" && v2 !== "false" && v2 !== "none";
};
function readStyleRunProps(rPr) {
  const p3 = {};
  if (!rPr) return p3;
  for (const el of childElements(rPr)) {
    const val = el.attrs["w:val"];
    switch (el.name) {
      case "w:b":
        p3.bold = onOff2(el);
        break;
      case "w:i":
        p3.italic = onOff2(el);
        break;
      case "w:caps":
        p3.allCaps = onOff2(el);
        break;
      case "w:smallCaps":
        p3.smallCaps = onOff2(el);
        break;
      case "w:strike":
        p3.strike = onOff2(el);
        break;
      case "w:sz":
        if (val) p3.szHalfPt = parseInt(val, 10);
        break;
      case "w:color":
        if (val && val !== "auto") p3.color = val;
        break;
      case "w:rFonts":
        if (el.attrs["w:ascii"]) p3.fontAscii = el.attrs["w:ascii"];
        break;
      case "w:u":
        p3.underline = val !== "none";
        break;
    }
  }
  return p3;
}
function readStyleParaProps(pPr) {
  const p3 = {};
  if (!pPr) return p3;
  const jc = firstChild(pPr, "w:jc")?.attrs["w:val"];
  if (jc === "center" || jc === "right" || jc === "both" || jc === "left") p3.alignment = jc;
  const spacing = firstChild(pPr, "w:spacing");
  if (spacing) {
    if (spacing.attrs["w:line"] && spacing.attrs["w:lineRule"] === "auto") {
      p3.lineTwentieths = parseInt(spacing.attrs["w:line"], 10);
    }
    if (spacing.attrs["w:after"]) p3.spaceAfterTwips = parseInt(spacing.attrs["w:after"], 10);
    if (spacing.attrs["w:before"]) p3.spaceBeforeTwips = parseInt(spacing.attrs["w:before"], 10);
  }
  const ind = firstChild(pPr, "w:ind");
  if (ind?.attrs["w:left"]) p3.indentLeftTwips = parseInt(ind.attrs["w:left"], 10);
  if (ind?.attrs["w:right"]) p3.indentRightTwips = parseInt(ind.attrs["w:right"], 10);
  if (firstChild(pPr, "w:pageBreakBefore")) p3.pageBreakBefore = true;
  const pBdr = firstChild(pPr, "w:pBdr");
  if (pBdr) {
    const borders = {};
    for (const side of ["top", "left", "bottom", "right"]) {
      const edge = readBorderEdge(firstChild(pBdr, `w:${side}`));
      if (edge) borders[side] = edge;
    }
    if (Object.keys(borders).length > 0) p3.borders = borders;
  }
  const shd = firstChild(pPr, "w:shd")?.attrs["w:fill"];
  if (shd && shd !== "auto") p3.shadingHex = shd;
  return p3;
}
function readStyles(pkg) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText("word/styles.xml");
  if (!xml) return out;
  const root = parseXml(xml);
  const docDefaults = firstChild(root, "w:docDefaults");
  const defRun = readStyleRunProps(
    docDefaults && firstChild(firstChild(docDefaults, "w:rPrDefault") ?? docDefaults, "w:rPr")
  );
  const defPara = readStyleParaProps(
    docDefaults && firstChild(firstChild(docDefaults, "w:pPrDefault") ?? docDefaults, "w:pPr")
  );
  const raw = /* @__PURE__ */ new Map();
  for (const st of childElements(root, "w:style")) {
    if (st.attrs["w:type"] !== "paragraph" && st.attrs["w:type"] !== "character") continue;
    const id = st.attrs["w:styleId"];
    if (!id) continue;
    raw.set(id, {
      basedOn: firstChild(st, "w:basedOn")?.attrs["w:val"],
      name: firstChild(st, "w:name")?.attrs["w:val"],
      type: st.attrs["w:type"] === "character" ? "character" : "paragraph",
      para: readStyleParaProps(firstChild(st, "w:pPr")),
      run: readStyleRunProps(firstChild(st, "w:rPr"))
    });
  }
  const resolve = (id, seen) => {
    const cached = out.get(id);
    if (cached) return cached;
    const r6 = raw.get(id);
    if (!r6 || seen.has(id)) return { para: { ...defPara }, run: { ...defRun } };
    seen.add(id);
    const base = r6.basedOn ? resolve(r6.basedOn, seen) : { para: { ...defPara }, run: { ...defRun } };
    const resolved = {
      para: { ...base.para, ...r6.para },
      run: { ...base.run, ...r6.run },
      name: r6.name,
      type: r6.type
    };
    out.set(id, resolved);
    return resolved;
  };
  for (const id of raw.keys()) resolve(id, /* @__PURE__ */ new Set());
  out.set("docDefaults", { para: { ...defPara }, run: { ...defRun } });
  return out;
}

// ../docx-core/src/fulldoc.ts
function readBorderSet(el, inside) {
  if (!el) return void 0;
  const out = {};
  const sides = inside ? ["top", "left", "bottom", "right", "insideH", "insideV"] : ["top", "left", "bottom", "right"];
  let any = false;
  for (const side of sides) {
    const edge = readBorderEdge(firstChild(el, `w:${side}`));
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function readTable(tblEl, ctx) {
  const grid = firstChild(tblEl, "w:tblGrid");
  const gridColsTwips = grid ? childElements(grid, "w:gridCol").map((c4) => parseInt(c4.attrs["w:w"] ?? "0", 10)) : [];
  const tblPr = firstChild(tblEl, "w:tblPr");
  const tblBorders = readBorderSet(tblPr && firstChild(tblPr, "w:tblBorders"), true);
  const rows = [];
  for (const trEl of childElements(tblEl, "w:tr")) {
    const cells = [];
    for (const tcEl of childElements(trEl, "w:tc")) {
      const tcPr = firstChild(tcEl, "w:tcPr");
      const shd = tcPr && firstChild(tcPr, "w:shd")?.attrs["w:fill"];
      const tcW = tcPr && firstChild(tcPr, "w:tcW");
      const cellBorders2 = readBorderSet(tcPr && firstChild(tcPr, "w:tcBorders"), true);
      const gridSpan = tcPr ? parseInt(firstChild(tcPr, "w:gridSpan")?.attrs["w:val"] ?? "1", 10) : 1;
      const paragraphs = childElements(tcEl, "w:p").map((p3) => readParagraph(p3, ctx));
      const tables = childElements(tcEl, "w:tbl").map((t5) => readTable(t5, ctx));
      if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });
      cells.push({
        paragraphs,
        tables,
        gridSpan,
        widthTwips: tcW && tcW.attrs["w:type"] === "dxa" ? parseInt(tcW.attrs["w:w"] ?? "0", 10) : void 0,
        shadingHex: shd && shd !== "auto" ? shd : void 0,
        borders: cellBorders2
      });
    }
    if (cells.length > 0) rows.push({ cells });
  }
  return { type: "table", rows, gridColsTwips, borders: tblBorders };
}
function readHeaderFooterPart(pkg, path) {
  const xml = pkg.getPartText(path);
  if (!xml) return void 0;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  const paras = [];
  for (const child of childElements(root)) {
    if (child.name === "w:p") paras.push(readParagraph(child, ctx));
    else if (child.name === "w:tbl") {
      const t5 = readTable(child, ctx);
      for (const r6 of t5.rows) for (const c4 of r6.cells) paras.push(...c4.paragraphs);
    }
  }
  return paras;
}
function readNotesPart(pkg, path, elementName) {
  const out = /* @__PURE__ */ new Map();
  const xml = pkg.getPartText(path);
  if (!xml) return out;
  const root = parseXml(xml);
  const partName = path.split("/").pop();
  const ctx = buildReadContext(pkg, `word/_rels/${partName}.rels`);
  for (const note of childElements(root, elementName)) {
    const id = parseInt(note.attrs["w:id"] ?? "0", 10);
    const type = note.attrs["w:type"];
    if (type === "separator" || type === "continuationSeparator") continue;
    out.set(id, childElements(note, "w:p").map((p3) => readParagraph(p3, ctx)));
  }
  return out;
}
function readComments(pkg) {
  const xml = pkg.getPartText("word/comments.xml");
  if (!xml) return [];
  const root = parseXml(xml);
  const ctx = buildReadContext(pkg, "word/_rels/comments.xml.rels");
  return childElements(root, "w:comment").map((c4) => ({
    id: parseInt(c4.attrs["w:id"] ?? "0", 10),
    author: c4.attrs["w:author"],
    text: childElements(c4, "w:p").map((p3) => readParagraph(p3, ctx).runs.map((r6) => r6.text).join("")).join("\n")
  }));
}
function readFullDocument(pkg) {
  const root = parseXml(pkg.documentXml());
  const body = firstChild(root, "w:body");
  if (!body) throw new Error("w:document sem w:body");
  const ctx = buildReadContext(pkg, "word/_rels/document.xml.rels");
  const relsXml = pkg.getPartText("word/_rels/document.xml.rels");
  const relTargets = /* @__PURE__ */ new Map();
  if (relsXml) {
    for (const rel of childElements(parseXml(relsXml), "Relationship")) {
      if (rel.attrs["Id"] && rel.attrs["Target"]) {
        relTargets.set(rel.attrs["Id"], `word/${rel.attrs["Target"].replace(/^\.\//, "")}`);
      }
    }
  }
  const readHfSet = (sectEl, kind) => {
    const set = {};
    const refs = [];
    for (const ref of childElements(sectEl, `w:${kind}`)) {
      const rid = ref.attrs["r:id"];
      const type = ref.attrs["w:type"] ?? "default";
      const target = rid && relTargets.get(rid);
      if (target && rid) {
        const paras = readHeaderFooterPart(pkg, target);
        if (paras) {
          set[type] = paras;
          refs.push({ type, rid, path: target });
        }
      }
    }
    return { set, refs };
  };
  const blocks = [];
  const sections = [];
  const bookmarks = /* @__PURE__ */ new Map();
  ctx.onBookmark = (name) => {
    if (!bookmarks.has(name)) bookmarks.set(name, blocks.length);
  };
  let sectionStart = 0;
  const closeSection = (sectEl, endBlock) => {
    const h3 = readHfSet(sectEl, "headerReference");
    const f3 = readHfSet(sectEl, "footerReference");
    sections.push({
      sectPr: readSectPr(sectEl),
      blockStart: sectionStart,
      blockEnd: endBlock,
      headers: h3.set,
      footers: f3.set,
      headerRefs: h3.refs,
      footerRefs: f3.refs
    });
    sectionStart = endBlock + 1;
  };
  for (const child of childElements(body)) {
    if (child.name === "w:p") {
      const para = readParagraph(child, ctx);
      blocks.push({ type: "paragraph", paragraph: para });
      const pPr = firstChild(child, "w:pPr");
      const sectEl = pPr && firstChild(pPr, "w:sectPr");
      if (sectEl) closeSection(sectEl, blocks.length - 1);
    } else if (child.name === "w:tbl") {
      blocks.push(readTable(child, ctx));
    } else if (child.name === "w:sectPr") {
      closeSection(child, blocks.length - 1);
    } else if (child.name === "w:sdt") {
      const content = firstChild(child, "w:sdtContent");
      if (content) {
        for (const inner of childElements(content)) {
          if (inner.name === "w:p") blocks.push({ type: "paragraph", paragraph: readParagraph(inner, ctx) });
          else if (inner.name === "w:tbl") blocks.push(readTable(inner, ctx));
        }
      }
    }
  }
  if (sections.length === 0) {
    closeSection(firstChild(body, "w:sectPr") ?? { name: "w:sectPr", attrs: {}, children: [] }, blocks.length - 1);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  return {
    blocks,
    sections,
    footnotes: readNotesPart(pkg, "word/footnotes.xml", "w:footnote"),
    endnotes: readNotesPart(pkg, "word/endnotes.xml", "w:endnote"),
    comments: readComments(pkg),
    styles: readStyles(pkg),
    bookmarks
  };
}

// ../docx-core/src/model-ops.ts
var paraText = (p3) => p3.runs.map((r6) => r6.text).join("");
var paraLength = (p3) => p3.runs.reduce((s4, r6) => s4 + r6.text.length, 0);
function comparePos(a3, b5) {
  return a3.para !== b5.para ? a3.para - b5.para : a3.offset - b5.offset;
}
function normalizeRange(r6) {
  return comparePos(r6.start, r6.end) <= 0 ? r6 : { start: r6.end, end: r6.start };
}
var sameProps = (a3, b5) => a3.bold === b5.bold && a3.italic === b5.italic && a3.underline === b5.underline && a3.underlineStyle === b5.underlineStyle && a3.underlineColor === b5.underlineColor && a3.strike === b5.strike && a3.doubleStrike === b5.doubleStrike && a3.vertAlign === b5.vertAlign && a3.szHalfPt === b5.szHalfPt && a3.color === b5.color && a3.highlight === b5.highlight && a3.fontAscii === b5.fontAscii && a3.allCaps === b5.allCaps && a3.smallCaps === b5.smallCaps && sameComments(a3.commentIds, b5.commentIds);
var sameComments = (a3, b5) => {
  if (a3 === b5) return true;
  if (!a3 || !b5 || a3.length !== b5.length) return false;
  return a3.every((v2, i7) => v2 === b5[i7]);
};
var isSpecial = (r6) => !!(r6.image || r6.field || r6.noteRef || r6.custom);
function normalizeParagraph(p3) {
  const out = [];
  for (const run of p3.runs) {
    if (run.text.length === 0 && !isSpecial(run)) continue;
    const last = out[out.length - 1];
    if (last && !isSpecial(last) && !isSpecial(run) && sameProps(last.props, run.props)) {
      last.text += run.text;
    } else {
      out.push({ ...run, props: { ...run.props } });
    }
  }
  p3.runs = out;
}
function splitAt(p3, offset) {
  let acc = 0;
  for (let i7 = 0; i7 < p3.runs.length; i7++) {
    const run = p3.runs[i7];
    if (offset === acc) return i7;
    if (offset < acc + run.text.length) {
      const extras = run.field ? { field: run.field } : {};
      const head = { ...extras, text: run.text.slice(0, offset - acc), props: { ...run.props } };
      const tail = { ...extras, text: run.text.slice(offset - acc), props: { ...run.props } };
      p3.runs.splice(i7, 1, head, tail);
      return i7 + 1;
    }
    acc += run.text.length;
  }
  return p3.runs.length;
}
function propsAt(model, pos) {
  const p3 = model.paragraphs[pos.para];
  if (!p3 || p3.runs.length === 0) return { ...DEFAULT_RUN_PROPS };
  let acc = 0;
  for (const run of p3.runs) {
    if (pos.offset <= acc + run.text.length) return { ...run.props };
    acc += run.text.length;
  }
  return { ...p3.runs[p3.runs.length - 1].props };
}
function insertText(model, pos, text, props) {
  const p3 = model.paragraphs[pos.para];
  const effective = props ?? propsAt(model, pos);
  const idx = splitAt(p3, pos.offset);
  p3.runs.splice(idx, 0, { text, props: { ...effective } });
  normalizeParagraph(p3);
  return { para: pos.para, offset: pos.offset + text.length };
}
function insertRun(model, pos, run) {
  const p3 = model.paragraphs[pos.para];
  const idx = splitAt(p3, pos.offset);
  p3.runs.splice(idx, 0, { ...run, props: { ...run.props } });
  normalizeParagraph(p3);
  return { para: pos.para, offset: pos.offset + run.text.length };
}
function splitParagraph(model, pos) {
  const p3 = model.paragraphs[pos.para];
  const idx = splitAt(p3, pos.offset);
  const tailRuns = p3.runs.slice(idx);
  p3.runs = p3.runs.slice(0, idx);
  const tail = { runs: tailRuns, props: { ...p3.props } };
  model.paragraphs.splice(pos.para + 1, 0, tail);
  normalizeParagraph(p3);
  normalizeParagraph(tail);
  return { para: pos.para + 1, offset: 0 };
}
function deleteRange(model, range) {
  const { start, end } = normalizeRange(range);
  if (start.para === end.para) {
    const p3 = model.paragraphs[start.para];
    rebuildDelete(p3, start.offset, end.offset);
    normalizeParagraph(p3);
    return start;
  }
  const first = model.paragraphs[start.para];
  const last = model.paragraphs[end.para];
  rebuildDelete(first, start.offset, paraLength(first));
  rebuildDelete(last, 0, end.offset);
  first.runs = [...first.runs, ...last.runs];
  first.props = { ...last.props };
  model.paragraphs.splice(start.para + 1, end.para - start.para);
  normalizeParagraph(first);
  return start;
}
function rebuildDelete(p3, from, to) {
  const out = [];
  let acc = 0;
  for (const run of p3.runs) {
    const rs = acc;
    const re = acc + run.text.length;
    acc = re;
    const keepHead = run.text.slice(0, Math.max(0, Math.min(from, re) - rs));
    const keepTail = re > to ? run.text.slice(Math.max(0, to - rs)) : "";
    const text = keepHead + keepTail;
    if (text.length > 0) {
      const intact = text.length === run.text.length;
      out.push({
        text,
        props: run.props,
        ...run.field ? { field: run.field } : {},
        ...intact && run.image ? { image: run.image } : {},
        ...intact && run.noteRef ? { noteRef: run.noteRef } : {},
        ...intact && run.custom ? { custom: run.custom } : {}
      });
    }
  }
  p3.runs = out;
}
function mergeWithPrevious(model, para) {
  const prev = model.paragraphs[para - 1];
  const cur = model.paragraphs[para];
  const offset = paraLength(prev);
  prev.runs = [...prev.runs, ...cur.runs];
  prev.props = { ...cur.props };
  model.paragraphs.splice(para, 1);
  normalizeParagraph(prev);
  return { para: para - 1, offset };
}
function applyRunProps(model, range, patch) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    const p3 = model.paragraphs[pi];
    const from = pi === start.para ? start.offset : 0;
    const to = pi === end.para ? end.offset : paraLength(p3);
    if (to <= from) continue;
    splitAt(p3, to);
    const i1 = splitAt(p3, from);
    let acc = 0;
    for (let ri = 0; ri < p3.runs.length; ri++) {
      const rs = acc;
      acc += p3.runs[ri].text.length;
      if (ri < i1) continue;
      if (rs >= to) break;
      Object.assign(p3.runs[ri].props, patch);
    }
    normalizeParagraph(p3);
  }
}
function applyParaProps(model, range, patch) {
  const { start, end } = normalizeRange(range);
  for (let pi = start.para; pi <= end.para; pi++) {
    Object.assign(model.paragraphs[pi].props, patch);
  }
}

// ../docx-core/src/serialize.ts
var esc = (s4) => s4.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var escAttr = (s4) => esc(s4).replace(/"/g, "&quot;");
var mediaOut = [];
var drawingId = 0;
function drawingXml(run) {
  const img = run.image;
  const n5 = ++drawingId;
  const rid = `rIdWnImg${n5}`;
  mediaOut.push({ rid, path: `word/media/wnimage${n5}.${img.ext}`, data: img.data, ext: img.ext });
  const cx = Math.round(img.widthTwips * EMU_PER_TWIP);
  const cy = Math.round(img.heightTwips * EMU_PER_TWIP);
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n5}" name="Imagem ${n5}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n5}" name="Imagem ${n5}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}
function runXml(run) {
  if (run.custom) {
    const type = run.custom.type;
    if (!/^[a-zA-Z0-9._-]+$/.test(type)) {
      throw new Error(`tipo de inline customizado inv\xE1lido: ${type}`);
    }
    const json = JSON.stringify(run.custom.data);
    if (json === void 0) throw new Error(`dados do inline "${type}" n\xE3o s\xE3o serializ\xE1veis em JSON`);
    const tag = `wordnext:inline:${type}:${encodeURIComponent(json)}`;
    const fallbackRun = {
      text: run.custom.fallbackText,
      props: run.props
    };
    return `<w:sdt><w:sdtPr><w:alias w:val="${escAttr(run.custom.fallbackText)}"/><w:tag w:val="${escAttr(tag)}"/><w:lock w:val="sdtLocked"/></w:sdtPr><w:sdtContent>${runXml(fallbackRun)}</w:sdtContent></w:sdt>`;
  }
  if (run.image) {
    return `<w:r>${drawingXml(run)}</w:r>`;
  }
  if (run.textbox) return "";
  const p3 = run.props;
  const rpr = [];
  if (p3.fontAscii) {
    rpr.push(`<w:rFonts w:ascii="${escAttr(p3.fontAscii)}" w:hAnsi="${escAttr(p3.fontAscii)}" w:cs="${escAttr(p3.fontAscii)}"/>`);
  }
  if (p3.bold) rpr.push("<w:b/>");
  if (p3.italic) rpr.push("<w:i/>");
  if (p3.allCaps) rpr.push("<w:caps/>");
  if (p3.smallCaps) rpr.push("<w:smallCaps/>");
  if (p3.strike) rpr.push("<w:strike/>");
  if (p3.doubleStrike) rpr.push("<w:dstrike/>");
  if (p3.color) rpr.push(`<w:color w:val="${escAttr(p3.color)}"/>`);
  if (p3.charSpacingTwips !== void 0 && p3.charSpacingTwips !== 0) {
    rpr.push(`<w:spacing w:val="${p3.charSpacingTwips}"/>`);
  }
  if (p3.szHalfPt !== void 0) {
    rpr.push(`<w:sz w:val="${p3.szHalfPt}"/><w:szCs w:val="${p3.szHalfPt}"/>`);
  }
  if (p3.highlight) rpr.push(`<w:highlight w:val="${escAttr(p3.highlight)}"/>`);
  if (p3.underline) {
    const uColor = p3.underlineColor ? ` w:color="${escAttr(p3.underlineColor)}"` : "";
    rpr.push(`<w:u w:val="${p3.underlineStyle ?? "single"}"${uColor}/>`);
  }
  if (p3.vertAlign) rpr.push(`<w:vertAlign w:val="${p3.vertAlign}"/>`);
  const parts = [];
  if (rpr.length) parts.push(`<w:rPr>${rpr.join("")}</w:rPr>`);
  const segments = run.text.split(/(\t|\n|\f)/);
  for (const seg of segments) {
    if (seg === "	") parts.push("<w:tab/>");
    else if (seg === "\n") parts.push("<w:br/>");
    else if (seg === "\f") parts.push('<w:br w:type="page"/>');
    else if (seg.length > 0) {
      const space = seg !== seg.trim() ? ' xml:space="preserve"' : "";
      parts.push(`<w:t${space}>${esc(seg)}</w:t>`);
    }
  }
  return `<w:r>${parts.join("")}</w:r>`;
}
function paraXml(para) {
  const firstOf = /* @__PURE__ */ new Map();
  const lastOf = /* @__PURE__ */ new Map();
  para.runs.forEach((r6, i7) => {
    for (const id of r6.props.commentIds ?? []) {
      if (!firstOf.has(id)) firstOf.set(id, i7);
      lastOf.set(id, i7);
    }
  });
  const runParts = [];
  para.runs.forEach((r6, i7) => {
    for (const [id, fi] of firstOf) if (fi === i7) runParts.push(`<w:commentRangeStart w:id="${id}"/>`);
    if (r6.field) {
      runParts.push(`<w:fldSimple w:instr="${escAttr(r6.field)}">${runXml(r6)}</w:fldSimple>`);
    } else runParts.push(runXml(r6));
    for (const [id, li] of lastOf) {
      if (li === i7) {
        runParts.push(`<w:commentRangeEnd w:id="${id}"/>`);
        runParts.push(`<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`);
      }
    }
  });
  return paraXmlInner(para, runParts.join(""));
}
function paraXmlInner(para, runsXml) {
  const pp = para.props;
  const ppr = [];
  if (pp.styleId) ppr.push(`<w:pStyle w:val="${escAttr(pp.styleId)}"/>`);
  if (pp.sectionBreak) {
    const refs = [...pp.sectionBreak.headerRefs, ...pp.sectionBreak.footerRefs];
    ppr.push(`<w:sectPr>${sectPrInner(pp.sectionBreak.sectPr, refs)}</w:sectPr>`);
  }
  if (pp.pageBreakBefore) ppr.push("<w:pageBreakBefore/>");
  if (pp.tabStops?.length) {
    ppr.push("<w:tabs>" + pp.tabStops.map(
      (t5) => `<w:tab w:val="${t5.align}"${t5.leader ? ` w:leader="${t5.leader}"` : ""} w:pos="${t5.posTwips}"/>`
    ).join("") + "</w:tabs>");
  }
  if (pp.numbering) {
    const numId = pp.numbering.kind === "decimal" ? 1002 : 1001;
    ppr.push(`<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
  }
  if (pp.borders) {
    let inner2 = "";
    for (const side of ["top", "left", "bottom", "right"]) {
      const e8 = pp.borders[side];
      if (!e8) continue;
      inner2 += `<w:${side} w:val="${escAttr(e8.style)}" w:sz="${e8.sizeEighthPt}" w:space="${e8.spacePt}" w:color="${e8.color ? escAttr(e8.color) : "auto"}"/>`;
    }
    if (inner2) ppr.push(`<w:pBdr>${inner2}</w:pBdr>`);
  } else if (pp.boxBorder) {
    const b5 = '<w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>';
    ppr.push(
      "<w:pBdr>" + b5.replace("w:bottom", "w:top") + b5.replace("w:bottom", "w:left") + b5 + b5.replace("w:bottom", "w:right") + "</w:pBdr>"
    );
  }
  if (pp.shadingHex) {
    ppr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(pp.shadingHex)}"/>`);
  }
  if (pp.lineTwentieths !== void 0 || pp.spaceAfterTwips !== void 0 || pp.spaceBeforeTwips !== void 0) {
    const line = pp.lineTwentieths !== void 0 ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : "";
    const before = pp.spaceBeforeTwips !== void 0 ? ` w:before="${pp.spaceBeforeTwips}"` : "";
    const after = pp.spaceAfterTwips !== void 0 ? ` w:after="${pp.spaceAfterTwips}"` : "";
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips || pp.indentRightTwips || pp.indentFirstLineTwips) {
    let attrs = "";
    if (pp.indentLeftTwips) attrs += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips) attrs += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips) {
      attrs += pp.indentFirstLineTwips > 0 ? ` w:firstLine="${pp.indentFirstLineTwips}"` : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs}/>`);
  }
  if (pp.alignment && pp.alignment !== "left") ppr.push(`<w:jc w:val="${pp.alignment}"/>`);
  const inner = (ppr.length ? `<w:pPr>${ppr.join("")}</w:pPr>` : "") + runsXml;
  return `<w:p>${inner}</w:p>`;
}
var W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
function sectPrInner(s4, refs = []) {
  const refsXml = refs.map((h3) => `<w:${h3.kind}Reference w:type="${h3.type}" r:id="${h3.rid}"/>`).join("");
  const orient = s4.pageWidthTwips > s4.pageHeightTwips ? ' w:orient="landscape"' : "";
  const cols = s4.cols ? `<w:cols w:space="${s4.cols.spaceTwips}" w:num="${s4.cols.count}"${s4.cols.sep ? ' w:sep="true"' : ""} w:equalWidth="true"/>` : "";
  const titlePg = s4.titlePg ? "<w:titlePg/>" : "";
  return `${refsXml}<w:pgSz w:w="${s4.pageWidthTwips}" w:h="${s4.pageHeightTwips}"${orient}/><w:pgMar w:top="${s4.marginTopTwips}" w:right="${s4.marginRightTwips}" w:bottom="${s4.marginBottomTwips}" w:left="${s4.marginLeftTwips}" w:header="${s4.headerDistanceTwips ?? 720}" w:footer="${s4.footerDistanceTwips ?? 720}" w:gutter="0"/>${cols}${titlePg}`;
}
function borderXml(tag, e8) {
  return `<w:${tag} w:val="${escAttr(e8.style)}" w:sz="${e8.sizeEighthPt}" w:space="0" w:color="${e8.color ? escAttr(e8.color) : "auto"}"/>`;
}
function borderSetXml(wrap, b5, sides) {
  let inner = "";
  for (const side of sides) {
    const e8 = b5[side];
    if (e8) inner += borderXml(side, e8);
  }
  return inner ? `<w:${wrap}>${inner}</w:${wrap}>` : "";
}
var TBL_SIDES = ["top", "left", "bottom", "right", "insideH", "insideV"];
var CELL_SIDES = ["top", "left", "bottom", "right"];
function tableXml(t5) {
  const total = t5.gridColsTwips.reduce((a3, b5) => a3 + b5, 0) || void 0;
  const tblPr = "<w:tblPr>" + (total ? `<w:tblW w:w="${total}" w:type="dxa"/>` : "") + (t5.borders ? borderSetXml("tblBorders", t5.borders, TBL_SIDES) : "") + "</w:tblPr>";
  const grid = `<w:tblGrid>${t5.gridColsTwips.map((w2) => `<w:gridCol w:w="${w2}"/>`).join("")}</w:tblGrid>`;
  const rows = t5.rows.map((row) => {
    const cells = row.cells.map((cell) => {
      const tcPr = "<w:tcPr>" + (cell.widthTwips ? `<w:tcW w:w="${cell.widthTwips}" w:type="dxa"/>` : "") + (cell.gridSpan > 1 ? `<w:gridSpan w:val="${cell.gridSpan}"/>` : "") + (cell.borders ? borderSetXml("tcBorders", cell.borders, CELL_SIDES) : "") + (cell.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(cell.shadingHex)}"/>` : "") + "</w:tcPr>";
      const body = cell.paragraphs.length ? cell.paragraphs.map(paraXml).join("") + cell.tables.map(tableXml).join("") : "<w:p/>";
      return `<w:tc>${tcPr}${body}</w:tc>`;
    }).join("");
    return `<w:tr>${cells}</w:tr>`;
  }).join("");
  return `<w:tbl>${tblPr}${grid}${rows}</w:tbl>`;
}
function serializeBlocks(blocks, sectPr, hfRefs = []) {
  const bodyRefs = hfRefs.map((h3) => ({ kind: h3.kind, type: h3.type, rid: h3.rid }));
  const sect = `<w:sectPr>${sectPrInner(sectPr, bodyRefs)}</w:sectPr>`;
  const body = blocks.map((b5) => b5.type === "table" ? tableXml(b5) : paraXml(b5.paragraph)).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>${body}${sect}</w:body></w:document>`;
}
function serializeDocument(model, hfRefs = []) {
  const bodyRefs = hfRefs.map((h3) => ({ kind: h3.kind, type: h3.type, rid: h3.rid }));
  const sect = `<w:sectPr>${sectPrInner(model.sectPr, bodyRefs)}</w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W_NS}><w:body>` + model.paragraphs.map(paraXml).join("") + sect + "</w:body></w:document>";
}
function numberingXml() {
  const bulletLvls = Array.from(
    { length: 3 },
    (_2, i7) => `<w:lvl w:ilvl="${i7}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${["\uF0B7", "o", "\uF0A7"][i7]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i7 + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="${["Symbol", "Courier New", "Wingdings"][i7]}" w:hAnsi="${["Symbol", "Courier New", "Wingdings"][i7]}" w:hint="default"/></w:rPr></w:lvl>`
  ).join("");
  const decimalLvls = Array.from(
    { length: 3 },
    (_2, i7) => `<w:lvl w:ilvl="${i7}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${i7 + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i7 + 1)}" w:hanging="360"/></w:pPr></w:lvl>`
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering ${W_NS}><w:abstractNum w:abstractNumId="1001">${bulletLvls}</w:abstractNum><w:abstractNum w:abstractNumId="1002">${decimalLvls}</w:abstractNum><w:num w:numId="1001"><w:abstractNumId w:val="1001"/></w:num><w:num w:numId="1002"><w:abstractNumId w:val="1002"/></w:num></w:numbering>`;
}
var W_NS_HF = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
function serializeHfPart(kind, paragraphs) {
  const tag = kind === "header" ? "w:hdr" : "w:ftr";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><${tag} ${W_NS_HF}>` + paragraphs.map(paraXml).join("") + `</${tag}>`;
}
function writeDocument(pkg, model, hfParts = [], opts = {}) {
  mediaOut = [];
  drawingId = 0;
  if (opts.comments && opts.comments.length > 0) {
    const body = opts.comments.map(
      (c4) => `<w:comment w:id="${c4.id}" w:author="${escAttr(c4.author ?? "Write")}" w:initials="WN"><w:p><w:r><w:t xml:space="preserve">${esc(c4.text)}</w:t></w:r></w:p></w:comment>`
    ).join("");
    pkg.setPartText(
      "word/comments.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${W_NS_HF}>${body}</w:comments>`
    );
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels2.includes("comments.xml")) {
      rels2 = rels2.replace(
        "</Relationships>",
        '<Relationship Id="rIdWnComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>'
      );
      pkg.setPartText(relsPath2, rels2);
    }
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    if (ct2 && !ct2.includes("comments+xml")) {
      ct2 = ct2.replace(
        "</Types>",
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>'
      );
      pkg.setPartText("[Content_Types].xml", ct2);
    }
  }
  if (hfParts.length > 0) {
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    for (const hf of hfParts) {
      if (hf.dirty || !pkg.getPart(hf.path)) {
        pkg.setPartText(hf.path, serializeHfPart(hf.kind, hf.paragraphs));
      }
      const relTarget = hf.path.replace(/^word\//, "");
      if (!rels2.includes(`Id="${hf.rid}"`)) {
        rels2 = rels2.replace(
          "</Relationships>",
          `<Relationship Id="${hf.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${hf.kind}" Target="${relTarget}"/></Relationships>`
        );
      }
      const ctType = `application/vnd.openxmlformats-officedocument.wordprocessingml.${hf.kind}+xml`;
      if (ct2 && !ct2.includes(`PartName="/${hf.path}"`)) {
        ct2 = ct2.replace("</Types>", `<Override PartName="/${hf.path}" ContentType="${ctType}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath2, rels2);
    if (ct2) pkg.setPartText("[Content_Types].xml", ct2);
  }
  const bodyRefs = opts.bodySectRefs ? opts.bodySectRefs.map((r6) => ({
    kind: r6.kind,
    type: r6.type,
    rid: r6.rid,
    path: "",
    paragraphs: [],
    dirty: false
  })) : hfParts;
  pkg.setPartText(
    "word/document.xml",
    opts.blocks ? serializeBlocks(opts.blocks, model.sectPr, bodyRefs) : serializeDocument(model, bodyRefs)
  );
  if (mediaOut.length > 0) {
    const relsPath2 = "word/_rels/document.xml.rels";
    let rels2 = pkg.getPartText(relsPath2) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct2 = pkg.getPartText("[Content_Types].xml") ?? "";
    const sameBytes = (a3, b5) => {
      if (a3.length !== b5.length) return false;
      for (let i7 = 0; i7 < a3.length; i7 += 1009) if (a3[i7] !== b5[i7]) return false;
      return a3[a3.length - 1] === b5[b5.length - 1];
    };
    const existingMedia = pkg.partNames().filter((p3) => p3.startsWith("word/media/"));
    const exts = /* @__PURE__ */ new Set();
    for (const m2 of mediaOut) {
      let target = `media/${m2.path.split("/").pop()}`;
      const dup = existingMedia.find((p3) => sameBytes(pkg.getPart(p3), m2.data));
      if (dup) {
        target = dup.replace(/^word\//, "");
      } else {
        pkg.setPart(m2.path, m2.data);
      }
      if (!rels2.includes(`"${m2.rid}"`)) {
        rels2 = rels2.replace(
          "</Relationships>",
          `<Relationship Id="${m2.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/></Relationships>`
        );
      }
      exts.add(m2.ext);
    }
    for (const ext of exts) {
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      if (ct2 && !ct2.includes(`Extension="${ext}"`)) {
        ct2 = ct2.replace("</Types>", `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath2, rels2);
    if (ct2) pkg.setPartText("[Content_Types].xml", ct2);
  }
  const hasLists = model.paragraphs.some((p3) => p3.props.numbering);
  if (!hasLists) return;
  pkg.setPartText("word/numbering.xml", numberingXml());
  const relsPath = "word/_rels/document.xml.rels";
  let rels = pkg.getPartText(relsPath) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!rels.includes("numbering.xml")) {
    rels = rels.replace(
      "</Relationships>",
      '<Relationship Id="rIdWnNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>'
    );
    pkg.setPartText(relsPath, rels);
  }
  const ctPath = "[Content_Types].xml";
  let ct = pkg.getPartText(ctPath);
  if (ct && !ct.includes("numbering+xml")) {
    ct = ct.replace(
      "</Types>",
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>'
    );
    pkg.setPartText(ctPath, ct);
  }
}

// ../layout/src/font/gpos.ts
function parseGposKern(view, gposOffset) {
  const kern = /* @__PURE__ */ new Map();
  const u162 = (o7) => view.getUint16(o7);
  const i16 = (o7) => view.getInt16(o7);
  const scriptListOff = gposOffset + u162(gposOffset + 4);
  const featureListOff = gposOffset + u162(gposOffset + 6);
  const lookupListOff = gposOffset + u162(gposOffset + 8);
  const kernFeatures = /* @__PURE__ */ new Set();
  const featureCount = u162(featureListOff);
  for (let i7 = 0; i7 < featureCount; i7++) {
    const rec = featureListOff + 2 + i7 * 6;
    const tag = String.fromCharCode(
      view.getUint8(rec),
      view.getUint8(rec + 1),
      view.getUint8(rec + 2),
      view.getUint8(rec + 3)
    );
    if (tag === "kern") kernFeatures.add(i7);
  }
  if (kernFeatures.size === 0) return kern;
  void scriptListOff;
  const lookupIdx = /* @__PURE__ */ new Set();
  for (const fi of kernFeatures) {
    const featOff = featureListOff + u162(featureListOff + 2 + fi * 6 + 4);
    const n5 = u162(featOff + 2);
    for (let k2 = 0; k2 < n5; k2++) lookupIdx.add(u162(featOff + 4 + k2 * 2));
  }
  const lookupCount = u162(lookupListOff);
  for (const li of lookupIdx) {
    if (li >= lookupCount) continue;
    const lookupOff = lookupListOff + u162(lookupListOff + 2 + li * 2);
    let type = u162(lookupOff);
    const subCount = u162(lookupOff + 4);
    for (let s4 = 0; s4 < subCount; s4++) {
      let subOff = lookupOff + u162(lookupOff + 6 + s4 * 2);
      let t5 = type;
      if (t5 === 9) {
        t5 = u162(subOff + 2);
        subOff = subOff + view.getUint32(subOff + 4);
      }
      if (t5 !== 2) continue;
      parsePairPos(subOff);
    }
  }
  return kern;
  function readCoverage(off) {
    const fmt2 = u162(off);
    const out = [];
    if (fmt2 === 1) {
      const n5 = u162(off + 2);
      for (let i7 = 0; i7 < n5; i7++) out.push(u162(off + 4 + i7 * 2));
    } else if (fmt2 === 2) {
      const n5 = u162(off + 2);
      for (let r6 = 0; r6 < n5; r6++) {
        const start = u162(off + 4 + r6 * 6);
        const end = u162(off + 6 + r6 * 6);
        for (let g2 = start; g2 <= end; g2++) out.push(g2);
      }
    }
    return out;
  }
  function readClassDef(off) {
    const map = /* @__PURE__ */ new Map();
    const fmt2 = u162(off);
    if (fmt2 === 1) {
      const start = u162(off + 2);
      const n5 = u162(off + 4);
      for (let i7 = 0; i7 < n5; i7++) map.set(start + i7, u162(off + 6 + i7 * 2));
    } else if (fmt2 === 2) {
      const n5 = u162(off + 2);
      for (let r6 = 0; r6 < n5; r6++) {
        const s4 = u162(off + 4 + r6 * 6);
        const e8 = u162(off + 6 + r6 * 6);
        const c4 = u162(off + 8 + r6 * 6);
        for (let g2 = s4; g2 <= e8; g2++) map.set(g2, c4);
      }
    }
    return map;
  }
  function valueSize(format) {
    let n5 = 0;
    for (let b5 = 0; b5 < 16; b5++) if (format & 1 << b5) n5++;
    return n5 * 2;
  }
  function readXAdvance(off, format) {
    let p3 = off;
    if (format & 1) p3 += 2;
    if (format & 2) p3 += 2;
    if (format & 4) return i16(p3);
    return 0;
  }
  function parsePairPos(off) {
    const fmt2 = u162(off);
    const coverage = readCoverage(off + u162(off + 2));
    const vf1 = u162(off + 4);
    const vf2 = u162(off + 6);
    const size1 = valueSize(vf1);
    const size2 = valueSize(vf2);
    if (fmt2 === 1) {
      const pairSetCount = u162(off + 8);
      for (let i7 = 0; i7 < Math.min(pairSetCount, coverage.length); i7++) {
        const ps = off + u162(off + 10 + i7 * 2);
        const n5 = u162(ps);
        const recSize = 2 + size1 + size2;
        for (let r6 = 0; r6 < n5; r6++) {
          const rec = ps + 2 + r6 * recSize;
          const g2 = u162(rec);
          const adv = readXAdvance(rec + 2, vf1);
          if (adv !== 0) {
            const key = coverage[i7] << 16 | g2;
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    } else if (fmt2 === 2) {
      const cd1 = readClassDef(off + u162(off + 8));
      const cd2 = readClassDef(off + u162(off + 10));
      const c1n = u162(off + 12);
      const c2n = u162(off + 14);
      const recSize = size1 + size2;
      const classAdv = [];
      for (let c1 = 0; c1 < c1n; c1++) {
        classAdv.push([]);
        for (let c22 = 0; c22 < c2n; c22++) {
          const rec = off + 16 + (c1 * c2n + c22) * recSize;
          classAdv[c1].push(readXAdvance(rec, vf1));
        }
      }
      const class1 = /* @__PURE__ */ new Map();
      for (const g2 of coverage) class1.set(g2, cd1.get(g2) ?? 0);
      for (const [g1, c1] of class1) {
        for (const [g2, c22] of cd2) {
          const adv = classAdv[c1]?.[c22] ?? 0;
          if (adv !== 0) {
            const key = g1 << 16 | g2;
            if (!kern.has(key)) kern.set(key, adv);
          }
        }
      }
    }
  }
}

// ../layout/src/font/sfnt.ts
var SfntFont = class {
  view;
  tables = /* @__PURE__ */ new Map();
  metrics;
  numGlyphs;
  numberOfHMetrics;
  hmtxOffset;
  cmapRanges = [];
  advanceCache = /* @__PURE__ */ new Map();
  constructor(bytes) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const v2 = this.view;
    const numTables = v2.getUint16(4);
    for (let i7 = 0; i7 < numTables; i7++) {
      const p3 = 12 + i7 * 16;
      const tag = String.fromCharCode(v2.getUint8(p3), v2.getUint8(p3 + 1), v2.getUint8(p3 + 2), v2.getUint8(p3 + 3));
      this.tables.set(tag, { offset: v2.getUint32(p3 + 8), length: v2.getUint32(p3 + 12) });
    }
    const head = this.req("head");
    const hhea = this.req("hhea");
    const maxp = this.req("maxp");
    const os2 = this.req("OS/2");
    this.numGlyphs = v2.getUint16(maxp.offset + 4);
    this.numberOfHMetrics = v2.getUint16(hhea.offset + 34);
    this.hmtxOffset = this.req("hmtx").offset;
    this.metrics = {
      unitsPerEm: v2.getUint16(head.offset + 18),
      ascender: v2.getInt16(hhea.offset + 4),
      descender: v2.getInt16(hhea.offset + 6),
      lineGap: v2.getInt16(hhea.offset + 8),
      sTypoAscender: v2.getInt16(os2.offset + 68),
      sTypoDescender: v2.getInt16(os2.offset + 70),
      sTypoLineGap: v2.getInt16(os2.offset + 72),
      usWinAscent: v2.getUint16(os2.offset + 74),
      usWinDescent: v2.getUint16(os2.offset + 76)
    };
    this.parseCmap();
    const gpos = this.tables.get("GPOS");
    if (gpos) {
      try {
        this.kernMap = parseGposKern(this.view, gpos.offset);
      } catch {
        this.kernMap = /* @__PURE__ */ new Map();
      }
    } else this.kernMap = /* @__PURE__ */ new Map();
  }
  kernMap;
  /** Ajuste de kerning (par prev→cur) em TWIPS no em de dispositivo.
   *  O app de referência (DirectWrite) aplica a feature kern por padrão. */
  kernTwips(prevCodePoint, codePoint, sizePt) {
    const g1 = this.glyphId(prevCodePoint);
    const g2 = this.glyphId(codePoint);
    const units = this.kernMap.get(g1 << 16 | g2);
    if (!units) return 0;
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
  req(tag) {
    const t5 = this.tables.get(tag);
    if (!t5) throw new Error(`Tabela ${tag} ausente`);
    return t5;
  }
  parseCmap() {
    const v2 = this.view;
    const cmap = this.req("cmap");
    const n5 = v2.getUint16(cmap.offset + 2);
    let best = -1;
    let bestScore = -1;
    for (let i7 = 0; i7 < n5; i7++) {
      const p3 = cmap.offset + 4 + i7 * 8;
      const platform = v2.getUint16(p3);
      const encoding = v2.getUint16(p3 + 2);
      const offset = v2.getUint32(p3 + 4);
      const score = platform === 3 && encoding === 10 ? 3 : platform === 3 && encoding === 1 ? 2 : platform === 0 ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        best = cmap.offset + offset;
      }
    }
    if (best < 0) throw new Error("cmap sem subtabela utiliz\xE1vel");
    const format = v2.getUint16(best);
    if (format === 4) {
      const segCount = v2.getUint16(best + 6) / 2;
      const endP = best + 14;
      const startP = endP + segCount * 2 + 2;
      const deltaP = startP + segCount * 2;
      const rangeP = deltaP + segCount * 2;
      for (let s4 = 0; s4 < segCount; s4++) {
        const end = v2.getUint16(endP + s4 * 2);
        const start = v2.getUint16(startP + s4 * 2);
        const delta = v2.getInt16(deltaP + s4 * 2);
        const rangeOffset = v2.getUint16(rangeP + s4 * 2);
        const idP = rangeP + s4 * 2;
        this.cmapRanges.push({
          start,
          end,
          mapper: rangeOffset === 0 ? (c4) => c4 + delta & 65535 : (c4) => {
            const gp = idP + rangeOffset + (c4 - start) * 2;
            const g2 = v2.getUint16(gp);
            return g2 === 0 ? 0 : g2 + delta & 65535;
          }
        });
      }
    } else if (format === 12) {
      const nGroups = v2.getUint32(best + 12);
      for (let g2 = 0; g2 < nGroups; g2++) {
        const p3 = best + 16 + g2 * 12;
        const start = v2.getUint32(p3);
        const end = v2.getUint32(p3 + 4);
        const startGlyph = v2.getUint32(p3 + 8);
        this.cmapRanges.push({ start, end, mapper: (c4) => startGlyph + (c4 - start) });
      }
    } else {
      throw new Error(`cmap format ${format} n\xE3o suportado`);
    }
    this.cmapRanges.sort((a3, b5) => a3.start - b5.start);
  }
  glyphId(codePoint) {
    let lo = 0, hi = this.cmapRanges.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const r6 = this.cmapRanges[mid];
      if (codePoint < r6.start) hi = mid - 1;
      else if (codePoint > r6.end) lo = mid + 1;
      else return r6.mapper(codePoint);
    }
    return 0;
  }
  /** Advance width do glifo em unidades da fonte. */
  advanceWidth(glyphId) {
    const cached = this.advanceCache.get(glyphId);
    if (cached !== void 0) return cached;
    const i7 = Math.min(glyphId, this.numberOfHMetrics - 1);
    const w2 = this.view.getUint16(this.hmtxOffset + i7 * 4);
    this.advanceCache.set(glyphId, w2);
    return w2;
  }
  /** Tabela empírica de advances do app de referência (hinting/ClearType), por tamanho:
   *  { "11": { "a": twips, ... } } — extraída via word-lab/extract-advances.mjs.
   *  O hinting altera advances em até ±3% vs escala linear; sem a tabela o
   *  texto deriva ao longo da linha (visto no pixel-diff). */
  advanceTable = null;
  setAdvanceTable(table) {
    this.advanceTable = table;
  }
  /** Advance de um code point em TWIPS para um tamanho em pontos.
   *  1º tabela empírica do app de referência; fallback: escala linear com o em
   *  arredondado ao pixel de 600 DPI (11pt → 92/600" = 11.04pt). */
  advanceTwips(codePoint, sizePt) {
    if (this.advanceTable) {
      const t5 = this.advanceTable[String(sizePt)]?.[String.fromCodePoint(codePoint)];
      if (t5 !== void 0) return t5;
    }
    const units = this.advanceWidth(this.glyphId(codePoint));
    const deviceEmPt2 = Math.round(sizePt * 600 / 72) * 72 / 600;
    return units * deviceEmPt2 * 20 / this.metrics.unitsPerEm;
  }
};

// ../layout/src/lineheight.ts
function deviceEmPt(sizePt) {
  return Math.round(sizePt * 600 / 72) * 72 / 600;
}
function singleLineHeightPt(font, sizePt) {
  const m2 = font.metrics;
  const units = m2.ascender + Math.abs(m2.descender) + m2.lineGap;
  return units / m2.unitsPerEm * deviceEmPt(sizePt);
}
function lineHeightPt(font, sizePt, spacing) {
  const single = singleLineHeightPt(font, sizePt);
  switch (spacing.lineRule) {
    case "auto":
      return single * spacing.line / 240;
    case "exact":
      return spacing.line / 20;
    // twips
    case "atLeast":
      return Math.max(single, spacing.line / 20);
  }
}

// ../layout/src/units.ts
var TWIPS_PER_PT = 20;

// ../layout/src/richbreak.ts
function breakRich(spans, fonts, opts) {
  const tabLeaders = /* @__PURE__ */ new Map();
  const tabStop = opts.defaultTabStopTwips ?? 708;
  const chars = [];
  spans.forEach((span, si) => {
    const font = fonts.resolve(span.family, span.variant);
    const ls = span.letterSpacingTwips ?? 0;
    for (let i8 = 0; i8 < span.text.length; i8++) {
      const ch = span.text[i8];
      const isTab = ch === "	";
      let adv;
      if (span.imageWidthTwips !== void 0) adv = span.imageWidthTwips;
      else if (isTab || ch === "\n" || ch === "\f") adv = 0;
      else {
        adv = font.advanceTwips(ch.codePointAt(0), span.sizePt) + ls;
        const next = span.text[i8 + 1];
        if (next && next !== " " && next !== "	" && ch !== " ") {
          adv += font.kernTwips(ch.codePointAt(0), next.codePointAt(0), span.sizePt);
        }
      }
      chars.push({
        ch,
        spanIndex: si,
        offsetInSpan: i8,
        baseAdvance: adv,
        isGap: span.imageWidthTwips === void 0 && (ch === " " || isTab),
        isTab: span.imageWidthTwips === void 0 && isTab
      });
    }
  });
  const charAdvances = new Array(chars.length).fill(0);
  const availOf = (lineIdx2) => {
    let avail = lineIdx2 === 0 ? opts.firstLineAvailableTwips ?? opts.availableTwips : opts.availableTwips;
    if (opts.indentFirstKLines && lineIdx2 < opts.indentFirstKLines.k) {
      avail -= opts.indentFirstKLines.indentTwips;
    }
    return avail;
  };
  const tabOffsetOf = (lineIdx2) => lineIdx2 === 0 ? opts.firstLineTabOriginOffsetTwips ?? opts.tabOriginOffsetTwips ?? 0 : opts.tabOriginOffsetTwips ?? 0;
  const breaks = [];
  let lineStart = 0;
  let width = 0;
  let pendingGap = 0;
  let i7 = 0;
  const lineIdx = () => breaks.length;
  while (i7 < chars.length) {
    const c4 = chars[i7];
    if (c4.ch === "\n" || c4.ch === "\f") {
      charAdvances[i7] = 0;
      breaks.push({ start: lineStart, end: i7 + 1, widthTwips: width + pendingGap });
      lineStart = i7 + 1;
      width = 0;
      pendingGap = 0;
      i7++;
      continue;
    }
    if (c4.isGap) {
      const cursor = width + pendingGap;
      let adv;
      if (c4.isTab) {
        const fromMargin = tabOffsetOf(lineIdx()) + cursor;
        const custom = opts.tabStops?.find((t5) => t5.posTwips > fromMargin + 1);
        if (custom) {
          if (custom.align === "right") {
            let w2 = 0;
            for (let k2 = i7 + 1; k2 < chars.length; k2++) {
              const cc = chars[k2];
              if (cc.isTab || cc.ch === "\n" || cc.ch === "\f") break;
              w2 += cc.baseAdvance;
            }
            adv = Math.max(80, custom.posTwips - fromMargin - w2);
          } else {
            adv = custom.posTwips - fromMargin;
          }
          if (custom.leader) tabLeaders.set(i7, custom.leader);
        } else {
          const next = (Math.floor(fromMargin / tabStop + 1e-6) + 1) * tabStop;
          adv = next - fromMargin;
        }
      } else adv = c4.baseAdvance;
      charAdvances[i7] = adv;
      pendingGap += adv;
      i7++;
      continue;
    }
    const wordStart = i7;
    let wordWidth = 0;
    while (i7 < chars.length && !chars[i7].isGap && chars[i7].ch !== "\n" && chars[i7].ch !== "\f") {
      charAdvances[i7] = chars[i7].baseAdvance;
      wordWidth += chars[i7].baseAdvance;
      i7++;
    }
    const avail = availOf(lineIdx());
    if (wordStart > lineStart && width + pendingGap + wordWidth > avail) {
      breaks.push({ start: lineStart, end: wordStart, widthTwips: width });
      lineStart = wordStart;
      width = wordWidth;
      pendingGap = 0;
      width = emergency(chars, charAdvances, wordStart, i7, availOf, lineIdx, breaks, (s4) => {
        lineStart = s4;
      }, width);
    } else if (wordStart === lineStart && wordWidth > avail) {
      width = emergency(chars, charAdvances, wordStart, i7, availOf, lineIdx, breaks, (s4) => {
        lineStart = s4;
      }, wordWidth);
      pendingGap = 0;
    } else {
      width += pendingGap + wordWidth;
      pendingGap = 0;
    }
  }
  if (lineStart < chars.length || breaks.length === 0) {
    breaks.push({ start: lineStart, end: chars.length, widthTwips: width });
  }
  const lines = breaks.map((b5) => {
    const segments = [];
    let x3 = 0;
    let maxSizePt = 0;
    let maxAscTwips = 0;
    let segStart = b5.start;
    for (let k2 = b5.start; k2 <= b5.end; k2++) {
      const boundary = k2 === b5.end || chars[k2].spanIndex !== chars[segStart].spanIndex;
      if (boundary && k2 > segStart) {
        const first = chars[segStart];
        let w2 = 0;
        for (let m2 = segStart; m2 < k2; m2++) w2 += charAdvances[m2];
        segments.push({
          spanIndex: first.spanIndex,
          start: first.offsetInSpan,
          end: chars[k2 - 1].offsetInSpan + 1,
          xTwips: x3,
          widthTwips: w2
        });
        const span = spans[first.spanIndex];
        const font = fonts.resolve(span.family, span.variant);
        maxSizePt = Math.max(maxSizePt, span.sizePt);
        maxAscTwips = Math.max(
          maxAscTwips,
          span.imageHeightTwips ?? font.metrics.ascender / font.metrics.unitsPerEm * span.sizePt * 20
        );
        x3 += w2;
        segStart = k2;
      }
    }
    if (segments.length === 0 && spans.length > 0) {
      maxSizePt = spans[0].sizePt;
      const f3 = fonts.resolve(spans[0].family, spans[0].variant);
      maxAscTwips = f3.metrics.ascender / f3.metrics.unitsPerEm * maxSizePt * 20;
    }
    return { start: b5.start, end: b5.end, widthTwips: b5.widthTwips, segments, maxSizePt, maxAscTwips };
  });
  return { lines, charAdvances, tabLeaders };
}
function emergency(chars, charAdvances, wordStart, wordEnd, availOf, lineIdx, breaks, setLineStart, initialWidth) {
  if (initialWidth <= availOf(lineIdx())) return initialWidth;
  let start = wordStart;
  let w2 = 0;
  for (let k2 = wordStart; k2 < wordEnd; k2++) {
    const a3 = charAdvances[k2];
    if (w2 + a3 > availOf(lineIdx()) && k2 > start) {
      breaks.push({ start, end: k2, widthTwips: w2 });
      start = k2;
      w2 = a3;
    } else w2 += a3;
  }
  setLineStart(start);
  return w2;
}

// ../pdf/src/bytes.ts
var ByteBuilder = class {
  chunks = [];
  len = 0;
  /** Comprimento atual em bytes (offset corrente). */
  get length() {
    return this.len;
  }
  /** Anexa uma string como latin1 (1 byte por code unit; só use ASCII/latin1). */
  str(s4) {
    const n5 = s4.length;
    const out = new Uint8Array(n5);
    for (let i7 = 0; i7 < n5; i7++) out[i7] = s4.charCodeAt(i7) & 255;
    return this.bytes(out);
  }
  /** Anexa bytes crus. */
  bytes(b5) {
    this.chunks.push(b5);
    this.len += b5.length;
    return this;
  }
  /** Concatena tudo num único Uint8Array. */
  toUint8Array() {
    const out = new Uint8Array(this.len);
    let off = 0;
    for (const c4 of this.chunks) {
      out.set(c4, off);
      off += c4.length;
    }
    return out;
  }
};
function utf16beHex(s4) {
  let out = "";
  for (let i7 = 0; i7 < s4.length; i7++) {
    const c4 = s4.charCodeAt(i7);
    out += (c4 >> 8 & 255).toString(16).padStart(2, "0");
    out += (c4 & 255).toString(16).padStart(2, "0");
  }
  return out;
}

// ../pdf/src/writer.ts
var PdfWriter = class {
  /** Corpo serializado de cada objeto (índice 0 = objeto 1). null = ainda não definido. */
  bodies = [];
  compress;
  constructor(opts = {}) {
    this.compress = opts.compress ?? true;
  }
  /** Reserva um número de objeto (1-based) para referência antecipada. */
  alloc() {
    this.bodies.push(null);
    return this.bodies.length;
  }
  /** Define o corpo de um objeto já alocado (entre `obj`/`endobj`). */
  define(num, body) {
    this.bodies[num - 1] = typeof body === "string" ? new ByteBuilder().str(body).toUint8Array() : body;
  }
  /** Atalho: aloca e define um dicionário a partir de uma string `<< ... >>`. */
  addDict(dict) {
    const n5 = this.alloc();
    this.define(n5, dict);
    return n5;
  }
  /**
   * Aloca e define um objeto stream. `dict` são as entradas extras do dicionário
   * (sem `/Length`, sem `<<`/`>>`). Comprime com FlateDecode quando habilitado e
   * vantajoso. Retorna o número do objeto.
   */
  addStream(dict, data, opts = {}) {
    const n5 = this.alloc();
    this.defineStream(n5, dict, data, opts);
    return n5;
  }
  defineStream(num, dict, data, opts = {}) {
    let payload = data;
    let filter = "";
    if (this.compress && (opts.allowCompress ?? true) && data.length > 64) {
      const z2 = zlibSync(data);
      if (z2.length < data.length) {
        payload = z2;
        filter = " /Filter /FlateDecode";
      }
    }
    const head = `<< ${dict.trim()}${filter} /Length ${payload.length} >>
stream
`;
    const b5 = new ByteBuilder();
    b5.str(head).bytes(payload).str("\nendstream");
    this.define(num, b5.toUint8Array());
  }
  /** Monta o arquivo PDF completo, com xref clássico e trailer. `root` = obj do /Catalog. */
  build(root) {
    const out = new ByteBuilder();
    out.str("%PDF-1.7\n");
    out.bytes(new Uint8Array([37, 226, 227, 207, 211])).str("\n");
    const offsets = new Array(this.bodies.length).fill(0);
    for (let i7 = 0; i7 < this.bodies.length; i7++) {
      const body = this.bodies[i7];
      if (!body) throw new Error(`Objeto PDF ${i7 + 1} alocado mas n\xE3o definido`);
      offsets[i7] = out.length;
      out.str(`${i7 + 1} 0 obj
`).bytes(body).str("\nendobj\n");
    }
    const xrefOffset = out.length;
    const count = this.bodies.length + 1;
    out.str(`xref
0 ${count}
`);
    out.str("0000000000 65535 f \n");
    for (let i7 = 0; i7 < this.bodies.length; i7++) {
      out.str(`${String(offsets[i7]).padStart(10, "0")} 00000 n 
`);
    }
    out.str("trailer\n");
    out.str(`<< /Size ${count} /Root ${root} 0 R >>
`);
    out.str(`startxref
${xrefOffset}
%%EOF
`);
    return out.toUint8Array();
  }
};

// ../pdf/src/subset.ts
var KEEP = /* @__PURE__ */ new Set(["head", "hhea", "maxp", "hmtx", "cmap", "loca", "glyf", "OS/2", "post", "cvt ", "fpgm", "prep", "gasp", "name"]);
function subsetTrueType(bytes, usedGids) {
  try {
    return doSubset(bytes, usedGids);
  } catch {
    return bytes;
  }
}
function doSubset(bytes, usedGids) {
  const v2 = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const sfntVersion = v2.getUint32(0);
  const numTables = v2.getUint16(4);
  const dir = /* @__PURE__ */ new Map();
  for (let i7 = 0; i7 < numTables; i7++) {
    const p3 = 12 + i7 * 16;
    const tag = String.fromCharCode(bytes[p3], bytes[p3 + 1], bytes[p3 + 2], bytes[p3 + 3]);
    dir.set(tag, { tag, offset: v2.getUint32(p3 + 8), length: v2.getUint32(p3 + 12) });
  }
  const head = dir.get("head"), maxp = dir.get("maxp"), loca = dir.get("loca"), glyf = dir.get("glyf");
  if (!head || !maxp || !loca || !glyf) return bytes;
  const numGlyphs = v2.getUint16(maxp.offset + 4);
  const longLoca = v2.getUint16(head.offset + 50) === 1;
  const readLoca = (i7) => longLoca ? v2.getUint32(loca.offset + i7 * 4) : v2.getUint16(loca.offset + i7 * 2) * 2;
  const glyphOff = [];
  for (let i7 = 0; i7 <= numGlyphs; i7++) glyphOff.push(readLoca(i7));
  const keep = /* @__PURE__ */ new Set([0]);
  for (const g2 of usedGids) if (g2 >= 0 && g2 < numGlyphs) keep.add(g2);
  const work = [...keep];
  while (work.length) {
    const g2 = work.pop();
    const s4 = glyf.offset + glyphOff[g2], e8 = glyf.offset + glyphOff[g2 + 1];
    if (e8 <= s4) continue;
    if (v2.getInt16(s4) >= 0) continue;
    let p3 = s4 + 10;
    for (; ; ) {
      const flags = v2.getUint16(p3);
      const comp = v2.getUint16(p3 + 2);
      p3 += 4;
      if (!keep.has(comp)) {
        keep.add(comp);
        work.push(comp);
      }
      p3 += flags & 1 ? 4 : 2;
      if (flags & 8) p3 += 2;
      else if (flags & 64) p3 += 4;
      else if (flags & 128) p3 += 8;
      if (!(flags & 32)) break;
    }
  }
  const glyfParts = [];
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const locaView = new DataView(newLoca.buffer);
  let acc = 0;
  for (let g2 = 0; g2 < numGlyphs; g2++) {
    locaView.setUint32(g2 * 4, acc);
    if (keep.has(g2)) {
      const s4 = glyf.offset + glyphOff[g2], e8 = glyf.offset + glyphOff[g2 + 1];
      let len = e8 - s4;
      if (len > 0) {
        const padded = len + 1 & ~1;
        const part = new Uint8Array(padded);
        part.set(bytes.subarray(s4, e8));
        glyfParts.push(part);
        acc += padded;
      }
    }
  }
  locaView.setUint32(numGlyphs * 4, acc);
  const newGlyf = concat(glyfParts);
  const newHead = new Uint8Array(head.length);
  newHead.set(bytes.subarray(head.offset, head.offset + head.length));
  const headView = new DataView(newHead.buffer, newHead.byteOffset, newHead.byteLength);
  headView.setUint16(50, 1);
  headView.setUint32(8, 0);
  const out = [];
  for (const [tag, t5] of dir) {
    if (!KEEP.has(tag)) continue;
    if (tag === "glyf") out.push({ tag, data: newGlyf });
    else if (tag === "loca") out.push({ tag, data: newLoca });
    else if (tag === "head") out.push({ tag, data: newHead });
    else out.push({ tag, data: bytes.slice(t5.offset, t5.offset + t5.length) });
  }
  return buildSfnt(sfntVersion, out);
}
function concat(parts) {
  let n5 = 0;
  for (const p3 of parts) n5 += p3.length;
  const out = new Uint8Array(n5);
  let o7 = 0;
  for (const p3 of parts) {
    out.set(p3, o7);
    o7 += p3.length;
  }
  return out;
}
function checksum(buf, off, len) {
  const dv = new DataView(buf.buffer, buf.byteOffset);
  let sum = 0;
  const end = off + (len + 3 & ~3);
  for (let i7 = off; i7 < end; i7 += 4) sum = sum + dv.getUint32(i7) >>> 0;
  return sum >>> 0;
}
function buildSfnt(sfntVersion, tables) {
  tables.sort((a3, b5) => a3.tag < b5.tag ? -1 : 1);
  const num = tables.length;
  const headerSize = 12 + num * 16;
  let offset = headerSize;
  const layout = tables.map((t5) => {
    const o7 = offset;
    offset += t5.data.length + 3 & ~3;
    return { ...t5, offset: o7 };
  });
  const out = new Uint8Array(offset);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, sfntVersion);
  dv.setUint16(4, num);
  const maxPow = Math.floor(Math.log2(num));
  const searchRange = 2 ** maxPow * 16;
  dv.setUint16(6, searchRange);
  dv.setUint16(8, maxPow);
  dv.setUint16(10, num * 16 - searchRange);
  let p3 = 12;
  for (const t5 of layout) {
    out.set(t5.data, t5.offset);
    for (let i7 = 0; i7 < 4; i7++) out[p3 + i7] = t5.tag.charCodeAt(i7) || 32;
    dv.setUint32(p3 + 4, checksum(out, t5.offset, t5.data.length));
    dv.setUint32(p3 + 8, t5.offset);
    dv.setUint32(p3 + 12, t5.data.length);
    p3 += 16;
  }
  const headEntry = layout.find((t5) => t5.tag === "head");
  if (headEntry) {
    const fileCs = checksum(out, 0, out.length);
    dv.setUint32(headEntry.offset + 8, 2981146554 - fileCs >>> 0);
  }
  return out;
}

// ../pdf/src/font.ts
var EmbeddedFont = class {
  constructor(index, baseName, bytes, program) {
    this.index = index;
    this.baseName = baseName;
    this.bytes = bytes;
    this.program = program;
    this.resourceName = `F${index}`;
    this.scale = 1e3 / program.unitsPerEm;
  }
  index;
  baseName;
  bytes;
  program;
  /** Recurso usado no content stream (ex.: "F0"). */
  resourceName;
  used = /* @__PURE__ */ new Map();
  // gid -> codePoint (para ToUnicode)
  scale;
  /** Mapeia um code point para (gid, advance em unidades de fonte) e registra uso. */
  encode(codePoint) {
    const gid = this.program.glyphId(codePoint);
    if (!this.used.has(gid)) this.used.set(gid, codePoint);
    return { gid, advanceWidth: this.program.advanceWidth(gid) };
  }
  /** Largura em milésimos de em (espaço de texto do PDF) de um glifo. */
  widthThousandths(gid) {
    return Math.round(this.program.advanceWidth(gid) * this.scale);
  }
  psName() {
    return this.baseName.replace(/[^A-Za-z0-9+\-]/g, "");
  }
  /** Emite o grafo de objetos da fonte e retorna o número do objeto Type0. */
  write(w2) {
    const name = this.psName();
    const um = this.program.unitsPerEm;
    const asc = Math.round((this.program.ascender ?? um * 0.8) * this.scale);
    const desc = Math.round((this.program.descender ?? -um * 0.2) * this.scale);
    const bbox = this.program.fontBBox ? this.program.fontBBox.map((v2) => Math.round(v2 * this.scale)) : [-200, desc, 1200, asc];
    const italic = this.program.italicAngle ?? 0;
    const flags = 32 | (italic !== 0 ? 64 : 0);
    const gids = [...this.used.keys()].sort((a3, b5) => a3 - b5);
    const subset = subsetTrueType(this.bytes, gids);
    const fontFile = w2.addStream(`/Length1 ${subset.length}`, subset);
    const descriptor = w2.addDict(
      `<< /Type /FontDescriptor /FontName /${name} /Flags ${flags} /FontBBox [${bbox.join(" ")}] /ItalicAngle ${italic} /Ascent ${asc} /Descent ${desc} /CapHeight ${asc} /StemV 80 /FontFile2 ${fontFile} 0 R >>`
    );
    const wParts = [];
    for (const gid of gids) wParts.push(`${gid} [${this.widthThousandths(gid)}]`);
    const cidFont = w2.addDict(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap /Identity /DW 1000 /W [${wParts.join(" ")}] >>`
    );
    const toUnicode = w2.addStream("", this.buildToUnicode(gids));
    return w2.addDict(
      `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cidFont} 0 R] /ToUnicode ${toUnicode} 0 R >>`
    );
  }
  /** CMap ToUnicode: mapeia cada CID (=GID) usado ao seu code point Unicode. */
  buildToUnicode(gids) {
    const b5 = new ByteBuilder();
    b5.str(
      "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n"
    );
    for (let i7 = 0; i7 < gids.length; i7 += 100) {
      const chunk = gids.slice(i7, i7 + 100);
      b5.str(`${chunk.length} beginbfchar
`);
      for (const gid of chunk) {
        const cp = this.used.get(gid);
        b5.str(`<${gid.toString(16).padStart(4, "0")}> <${utf16beHex(String.fromCodePoint(cp))}>
`);
      }
      b5.str("endbfchar\n");
    }
    b5.str("endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n");
    return b5.toUint8Array();
  }
};

// ../pdf/src/document.ts
function rgb255(r6, g2, b5) {
  return [r6 / 255, g2 / 255, b5 / 255];
}
function hexColor(hex) {
  const h3 = hex.replace("#", "");
  return rgb255(parseInt(h3.slice(0, 2), 16), parseInt(h3.slice(2, 4), 16), parseInt(h3.slice(4, 6), 16));
}
var fmt = (n5) => {
  const r6 = Math.round(n5 * 1e3) / 1e3;
  return Object.is(r6, -0) ? "0" : String(r6);
};
var PdfPage = class {
  constructor(widthPt, heightPt) {
    this.widthPt = widthPt;
    this.heightPt = heightPt;
  }
  widthPt;
  heightPt;
  /** @internal */
  content = new ByteBuilder();
  fromTop(yTop) {
    return this.heightPt - yTop;
  }
  /** Retângulo preenchido (sombreado, realce). yTopPt = topo do retângulo. */
  fillRect(xPt, yTopPt, wPt, hPt, color) {
    const y3 = this.fromTop(yTopPt + hPt);
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg
${fmt(xPt)} ${fmt(y3)} ${fmt(wPt)} ${fmt(hPt)} re f
`
    );
  }
  /** Segmento de reta (bordas, sublinhado, divisores). Coords y a partir do topo. */
  line(x0, y0Top, x1, y1Top, color, widthPt, dash) {
    const d3 = dash && dash.length ? `[${dash.map(fmt).join(" ")}] 0 d
` : "[] 0 d\n";
    this.content.str(
      `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} RG
${fmt(widthPt)} w
${d3}${fmt(x0)} ${fmt(this.fromTop(y0Top))} m ${fmt(x1)} ${fmt(this.fromTop(y1Top))} l S
`
    );
  }
  /**
   * Desenha glifos já posicionados, todos na mesma fonte/tamanho/cor. Cada glifo
   * recebe sua própria matriz de texto (posição absoluta), reproduzindo
   * exatamente as posições calculadas pelo layout (inclusive o snap de 1/600").
   */
  glyphs(font, sizePt, color, glyphs) {
    if (!glyphs.length) return;
    const c4 = this.content;
    c4.str(
      `BT
/${font.resourceName} ${fmt(sizePt)} Tf
${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg
`
    );
    for (const g2 of glyphs) {
      const y3 = this.fromTop(g2.baselineFromTopPt);
      c4.str(`1 0 0 1 ${fmt(g2.xPt)} ${fmt(y3)} Tm <${g2.gid.toString(16).padStart(4, "0")}> Tj
`);
    }
    c4.str("ET\n");
  }
  /** Desenha uma imagem já embutida. (x,y) = canto superior esquerdo. */
  drawImage(img, xPt, yTopPt, wPt, hPt) {
    const y3 = this.fromTop(yTopPt + hPt);
    this.content.str(
      `q
${fmt(wPt)} 0 0 ${fmt(hPt)} ${fmt(xPt)} ${fmt(y3)} cm
/${img.resourceName} Do
Q
`
    );
  }
};
var PdfDocument = class {
  writer;
  fonts = [];
  images = [];
  pages = [];
  constructor(opts = {}) {
    this.writer = new PdfWriter({ compress: opts.compress });
  }
  /** Embute uma fonte TrueType (bytes crus + consultas de métrica). */
  embedFont(name, bytes, program) {
    const f3 = new EmbeddedFont(this.fonts.length, name, bytes, program);
    this.fonts.push(f3);
    return f3;
  }
  /** Embute um JPEG (baseline) diretamente via DCTDecode. */
  embedJpeg(bytes, widthPx, heightPx) {
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
      bytes,
      { allowCompress: false }
      // já comprimido
    );
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  /**
   * Embute pixels RGBA crus via DeviceRGB + FlateDecode. Quando o alpha não é
   * trivial (algum pixel < 255), o canal vira um /SMask DeviceGray — PNGs com
   * transparência preservam o recorte no PDF.
   */
  embedRgba(rgba, widthPx, heightPx) {
    const rgb2 = new Uint8Array(widthPx * heightPx * 3);
    const alpha = new Uint8Array(widthPx * heightPx);
    let hasAlpha = false;
    for (let i7 = 0, j = 0, k2 = 0; i7 < rgba.length; i7 += 4, j += 3, k2++) {
      rgb2[j] = rgba[i7];
      rgb2[j + 1] = rgba[i7 + 1];
      rgb2[j + 2] = rgba[i7 + 2];
      const a3 = rgba[i7 + 3];
      alpha[k2] = a3;
      if (a3 !== 255) hasAlpha = true;
    }
    let smask = "";
    if (hasAlpha) {
      const smaskNum = this.writer.addStream(
        `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceGray /BitsPerComponent 8`,
        alpha
      );
      smask = ` /SMask ${smaskNum} 0 R`;
    }
    const objNum = this.writer.addStream(
      `/Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`,
      rgb2
    );
    const handle = { resourceName: `Im${this.images.length}`, objNum };
    this.images.push({ handle, objNum });
    return handle;
  }
  addPage(widthPt, heightPt) {
    const p3 = new PdfPage(widthPt, heightPt);
    this.pages.push(p3);
    return p3;
  }
  /** Serializa o PDF completo. */
  build() {
    const w2 = this.writer;
    const fontRefs = this.fonts.map((f3) => ({ name: f3.resourceName, ref: f3.write(w2) }));
    const fontDict = fontRefs.length ? `/Font << ${fontRefs.map((f3) => `/${f3.name} ${f3.ref} 0 R`).join(" ")} >>` : "";
    const xobjDict = this.images.length ? `/XObject << ${this.images.map((i7) => `/${i7.handle.resourceName} ${i7.objNum} 0 R`).join(" ")} >>` : "";
    const resources = `<< ${fontDict} ${xobjDict} >>`;
    const catalog = w2.alloc();
    const pagesNode = w2.alloc();
    const pageRefs = [];
    for (const page of this.pages) {
      const contentNum = w2.addStream("", page.content.toUint8Array());
      const pageNum = w2.addDict(
        `<< /Type /Page /Parent ${pagesNode} 0 R /MediaBox [0 0 ${fmt(page.widthPt)} ${fmt(page.heightPt)}] /Resources ${resources} /Contents ${contentNum} 0 R >>`
      );
      pageRefs.push(pageNum);
    }
    w2.define(
      pagesNode,
      `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((r6) => `${r6} 0 R`).join(" ")}] >>`
    );
    w2.define(catalog, `<< /Type /Catalog /Pages ${pagesNode} 0 R >>`);
    return w2.build(catalog);
  }
};

// ../export/src/model.ts
function orderedBlocks(doc) {
  const out = [];
  const byPara = /* @__PURE__ */ new Map();
  for (const a3 of doc.tableAnchors ?? []) {
    const arr = byPara.get(a3.beforePara) ?? [];
    arr.push(a3.table);
    byPara.set(a3.beforePara, arr);
  }
  for (let i7 = 0; i7 < doc.paragraphs.length; i7++) {
    for (const t5 of byPara.get(i7) ?? []) out.push({ kind: "table", t: t5 });
    out.push({ kind: "para", p: doc.paragraphs[i7] });
  }
  for (const t5 of byPara.get(doc.paragraphs.length) ?? []) out.push({ kind: "table", t: t5 });
  return out;
}
function headingLevel(p3) {
  const id = p3.props.styleId ?? "";
  let m2 = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i);
  if (m2) return Math.min(6, parseInt(m2[1], 10));
  m2 = id.match(/^h([1-6])$/i);
  if (m2) return parseInt(m2[1], 10);
  if (/^(title|t[íi]tulo)$/i.test(id)) return 1;
  return 0;
}
function escapeHtml(s4) {
  return s4.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s4) {
  return escapeHtml(s4).replace(/"/g, "&quot;");
}
function imgMime(ext) {
  const e8 = ext.toLowerCase();
  if (e8 === "jpg" || e8 === "jpeg") return "image/jpeg";
  if (e8 === "png") return "image/png";
  if (e8 === "gif") return "image/gif";
  if (e8 === "bmp") return "image/bmp";
  if (e8 === "svg") return "image/svg+xml";
  if (e8 === "webp") return "image/webp";
  if (e8 === "tif" || e8 === "tiff") return "image/tiff";
  return `image/${e8}`;
}
function base64(bytes) {
  let bin = "";
  const chunk = 32768;
  for (let i7 = 0; i7 < bytes.length; i7 += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i7, i7 + chunk));
  }
  const g2 = globalThis;
  if (typeof g2.btoa === "function") return g2.btoa(bin);
  if (g2.Buffer) return g2.Buffer.from(bin, "binary").toString("base64");
  throw new Error("sem base64 (btoa/Buffer) no ambiente");
}
function dataUri(img) {
  return `data:${imgMime(img.ext)};base64,${base64(img.data)}`;
}
function resolveImageUri(img, cache) {
  const cached = cache?.get(img);
  return cached ?? dataUri(img);
}
var twipsToPx = (t5) => Math.round(t5 / 1440 * 96);
var twipsToPt2 = (t5) => +(t5 / 20).toFixed(2);
var halfPtToPt = (h3) => h3 / 2;

// ../export/src/html.ts
var HIGHLIGHTS = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
  white: "#ffffff"
};
function cssBorderStyle(s4) {
  if (s4 === "dashed" || s4 === "dotted" || s4 === "double") return s4;
  if (s4 === "none" || s4 === "nil") return "none";
  return "solid";
}
function edgeCss(e8) {
  const w2 = Math.max(0.5, e8.sizeEighthPt / 8);
  return `${w2}pt ${cssBorderStyle(e8.style)} ${e8.color ? "#" + e8.color : "#000"}`;
}
function runHtml(run, ctx) {
  if (run.image) {
    if (ctx.imagesMode === "omit") {
      return `<span class="uw-img-placeholder" aria-label="imagem" style="display:inline-block;padding:0 .35em;margin:0 .15em;background:rgba(0,0,0,.06);border-radius:4px;font-size:.9em;color:#777">\u{1F4F7}</span>`;
    }
    const w2 = twipsToPx(run.image.widthTwips);
    const h3 = twipsToPx(run.image.heightTwips);
    return `<img src="${resolveImageUri(run.image, ctx.imageDataUris)}" width="${w2}" height="${h3}" alt="" loading="lazy">`;
  }
  const p3 = run.props;
  if (run.noteRef) {
    const seq = ctx.notes.length + 1;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const noteHtml = paras?.map((np) => np.runs.map((r6) => escapeHtml(r6.text)).join("")).join(" ").trim() ?? "";
    ctx.notes.push({ kind: run.noteRef.kind, id: run.noteRef.id, html: escapeHtml(noteHtml) });
    return `<sup class="uw-note"><a id="noteref-${seq}" href="#note-${seq}">${seq}</a></sup>`;
  }
  let text = escapeHtml(run.text);
  if (!text) return "";
  const styles9 = [];
  if (p3.color) styles9.push(`color:#${p3.color}`);
  if (p3.szHalfPt) styles9.push(`font-size:${halfPtToPt(p3.szHalfPt)}pt`);
  if (p3.highlight) styles9.push(`background-color:${HIGHLIGHTS[p3.highlight] ?? p3.highlight}`);
  if (p3.fontAscii) styles9.push(`font-family:'${p3.fontAscii}',serif`);
  if (p3.allCaps) styles9.push("text-transform:uppercase");
  if (p3.smallCaps) styles9.push("font-variant:small-caps");
  if (p3.charSpacingTwips) styles9.push(`letter-spacing:${twipsToPt2(p3.charSpacingTwips)}pt`);
  let inner = text;
  if (p3.bold) inner = `<strong>${inner}</strong>`;
  if (p3.italic) inner = `<em>${inner}</em>`;
  if (p3.strike || p3.doubleStrike) inner = `<s>${inner}</s>`;
  if (p3.underline) inner = `<u>${inner}</u>`;
  if (p3.vertAlign === "superscript") inner = `<sup>${inner}</sup>`;
  else if (p3.vertAlign === "subscript") inner = `<sub>${inner}</sub>`;
  if (styles9.length) inner = `<span style="${styles9.join(";")}">${inner}</span>`;
  if (p3.link) inner = `<a href="${escapeAttr(p3.link)}">${inner}</a>`;
  if (p3.commentIds?.length) {
    for (const id of p3.commentIds) ctx.usedComments.add(id);
    const tips = p3.commentIds.map((id) => {
      const c4 = ctx.comments.get(id);
      return c4 ? `${c4.author ?? "An\xF4nimo"}: ${c4.text}` : "";
    }).filter(Boolean).join(" | ");
    inner = `<span class="uw-comment" data-comment="${p3.commentIds.join(",")}" title="${escapeAttr(tips)}">${inner}</span>`;
  }
  return inner;
}
function paraStyles(p3) {
  const s4 = [];
  const a3 = p3.props.alignment;
  if (a3 === "center") s4.push("text-align:center");
  else if (a3 === "right") s4.push("text-align:right");
  else if (a3 === "both") s4.push("text-align:justify");
  if (p3.props.indentLeftTwips) s4.push(`margin-left:${twipsToPt2(p3.props.indentLeftTwips)}pt`);
  if (p3.props.indentRightTwips) s4.push(`margin-right:${twipsToPt2(p3.props.indentRightTwips)}pt`);
  if (p3.props.indentFirstLineTwips) s4.push(`text-indent:${twipsToPt2(p3.props.indentFirstLineTwips)}pt`);
  if (p3.props.shadingHex) s4.push(`background-color:#${p3.props.shadingHex}`);
  const b5 = p3.props.borders;
  if (b5) {
    if (b5.top) s4.push(`border-top:${edgeCss(b5.top)}`);
    if (b5.bottom) s4.push(`border-bottom:${edgeCss(b5.bottom)}`);
    if (b5.left) s4.push(`border-left:${edgeCss(b5.left)}`);
    if (b5.right) s4.push(`border-right:${edgeCss(b5.right)}`);
  }
  return s4.join(";");
}
function paraInner(p3, ctx) {
  const html = p3.runs.map((r6) => runHtml(r6, ctx)).join("");
  return html || "<br>";
}
function paraHtml(p3, ctx) {
  const inner = paraInner(p3, ctx);
  const st = paraStyles(p3);
  const attr = st ? ` style="${st}"` : "";
  const lvl = headingLevel(p3);
  if (lvl) return `<h${lvl}${attr}>${inner}</h${lvl}>`;
  return `<p${attr}>${inner}</p>`;
}
function tableHtml(t5, ctx) {
  let html = "<table>";
  for (const row of t5.rows) {
    html += "<tr>";
    for (const cell of row.cells) {
      const span = cell.gridSpan > 1 ? ` colspan="${cell.gridSpan}"` : "";
      const style = cell.shadingHex ? ` style="background-color:#${cell.shadingHex}"` : "";
      let inner = cell.paragraphs.map((p3) => paraHtml(p3, ctx)).join("");
      for (const nt of cell.tables) inner += tableHtml(nt, ctx);
      html += `<td${span}${style}>${inner}</td>`;
    }
    html += "</tr>";
  }
  return html + "</table>";
}
function listHtml(items) {
  let i7 = 0;
  function build(level) {
    const tag = items[i7].kind === "decimal" ? "ol" : "ul";
    let html = `<${tag}>`;
    while (i7 < items.length && items[i7].ilvl >= level) {
      if (items[i7].ilvl > level) break;
      let li = `<li>${items[i7].inner}`;
      i7++;
      if (i7 < items.length && items[i7].ilvl > level) li += build(items[i7].ilvl);
      html += li + "</li>";
    }
    return html + `</${tag}>`;
  }
  return items.length ? build(items[0].ilvl) : "";
}
function bodyHtml(doc, ctx) {
  const blocks = orderedBlocks(doc);
  const parts = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      parts.push(listHtml(listBuf));
      listBuf = [];
    }
  };
  for (const b5 of blocks) {
    if (b5.kind === "para" && b5.p.props.numbering) {
      listBuf.push({
        ilvl: b5.p.props.numbering.ilvl,
        kind: b5.p.props.numbering.kind,
        inner: paraInner(b5.p, ctx)
      });
      continue;
    }
    flushList();
    if (b5.kind === "para") parts.push(paraHtml(b5.p, ctx));
    else parts.push(tableHtml(b5.t, ctx));
  }
  flushList();
  if (ctx.notes.length) {
    parts.push('<hr><section class="uw-notes"><ol>');
    ctx.notes.forEach((n5, idx) => {
      parts.push(`<li id="note-${idx + 1}">${n5.html} <a href="#noteref-${idx + 1}">\u21A9</a></li>`);
    });
    parts.push("</ol></section>");
  }
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    parts.push('<section class="uw-comments"><h2>Coment\xE1rios</h2><ol>');
    for (const id of used) {
      const c4 = ctx.comments.get(id);
      parts.push(`<li id="cmt-${id}"><span class="uw-author">${escapeHtml(c4.author ?? "An\xF4nimo")}</span>: ${escapeHtml(c4.text)}</li>`);
    }
    parts.push("</ol></section>");
  }
  return parts.join("\n");
}
var STYLE = `
:root { color-scheme: light; }
body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.55;
  max-width: 46rem; margin: 2.5rem auto; padding: 0 1.25rem; color: #1a1a1a;
  background: #ffffff; }
h1,h2,h3,h4,h5,h6 { font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.25; margin: 1.6em 0 .5em; }
h1 { font-size: 2rem; } h2 { font-size: 1.6rem; } h3 { font-size: 1.3rem; }
p { margin: 0 0 .75em; }
a { color: #1a73e8; }
img { max-width: 100%; height: auto; }
table { border-collapse: collapse; margin: 1em 0; width: 100%; }
td, th { border: 1px solid #bbb; padding: .4em .6em; vertical-align: top; }
ul, ol { margin: 0 0 .75em; padding-left: 1.6em; }
sup.uw-note a { text-decoration: none; }
.uw-comment { background: rgba(255,187,0,.28); border-bottom: 1px dotted #c79100; cursor: help; }
.uw-img-placeholder { display: inline-block; padding: 0 .35em; margin: 0 .15em; background: rgba(0,0,0,.06); border-radius: 4px; font-size: .9em; color: #777; }
.uw-comments { margin-top: 2.5rem; border-top: 1px solid #ccc; padding-top: 1rem; font-size: .9rem; color: #555; }
.uw-comments .uw-author { font-weight: 600; }
.uw-notes { font-size: .85rem; color: #555; }
hr { border: none; border-top: 1px solid #ccc; margin: 2rem 0 .5rem; }
`;
function toHtml(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c4) => [c4.id, c4])),
    usedComments: /* @__PURE__ */ new Set(),
    notes: [],
    footnotes: doc.footnotes ?? /* @__PURE__ */ new Map(),
    endnotes: doc.endnotes ?? /* @__PURE__ */ new Map(),
    imagesMode: opts.images ?? "data",
    imageDataUris: doc.imageDataUris
  };
  const body = bodyHtml(doc, ctx);
  if (opts.fullDocument === false) return body;
  const title = escapeHtml(opts.title ?? doc.title ?? "Documento");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ../export/src/markdown.ts
function escapeMd(s4) {
  return s4.replace(/([\\`*_{}\[\]<>|])/g, "\\$1");
}
function emphasize(t5, p3) {
  const lead = (t5.match(/^\s*/) ?? [""])[0];
  const trail = (t5.match(/\s*$/) ?? [""])[0];
  let core = t5.slice(lead.length, t5.length - trail.length);
  if (!core) return t5;
  if (p3.bold && p3.italic) core = `***${core}***`;
  else if (p3.bold) core = `**${core}**`;
  else if (p3.italic) core = `*${core}*`;
  if (p3.strike || p3.doubleStrike) core = `~~${core}~~`;
  if (p3.underline) core = `<u>${core}</u>`;
  if (p3.vertAlign === "superscript") core = `<sup>${core}</sup>`;
  else if (p3.vertAlign === "subscript") core = `<sub>${core}</sub>`;
  return lead + core + trail;
}
function runMd(run, ctx) {
  if (run.image) return ctx.imagesMode === "omit" ? "[imagem]" : `![](${resolveImageUri(run.image, ctx.imageDataUris)})`;
  if (run.noteRef) {
    const seq = ++ctx.noteSeq;
    const paras = (run.noteRef.kind === "footnote" ? ctx.footnotes : ctx.endnotes).get(run.noteRef.id);
    const txt = paras?.map((np) => np.runs.map((r6) => r6.text).join("")).join(" ").trim() ?? "";
    ctx.noteDefs.push(`[^n${seq}]: ${txt}`);
    return `[^n${seq}]`;
  }
  let t5 = emphasize(escapeMd(run.text), run.props);
  if (run.props.link) t5 = `[${t5}](${run.props.link})`;
  return t5;
}
function inlineRuns(runs, ctx) {
  let s4 = "";
  const ids = /* @__PURE__ */ new Set();
  for (const r6 of runs) {
    s4 += runMd(r6, ctx);
    for (const id of r6.props.commentIds ?? []) ids.add(id);
  }
  for (const id of ids) {
    if (ctx.comments.has(id)) {
      ctx.usedComments.add(id);
      s4 += `[^c${id}]`;
    }
  }
  return s4;
}
function cellText(cell, ctx) {
  const inner = cell.paragraphs.map((p3) => inlineRuns(p3.runs, ctx)).join("<br>");
  return inner.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
function tableMd(t5, ctx) {
  const rows = t5.rows.map((r6) => r6.cells.map((c4) => cellText(c4, ctx)));
  if (!rows.length) return "";
  const cols = Math.max(...rows.map((r6) => r6.length));
  const pad = (r6) => {
    while (r6.length < cols) r6.push("");
    return r6;
  };
  const header = pad(rows[0].slice());
  let md = `| ${header.join(" | ")} |
`;
  md += `| ${header.map(() => "---").join(" | ")} |
`;
  for (const r6 of rows.slice(1)) md += `| ${pad(r6.slice()).join(" | ")} |
`;
  return md;
}
function toMarkdown(doc, opts = {}) {
  const ctx = {
    comments: new Map((doc.comments ?? []).map((c4) => [c4.id, c4])),
    footnotes: doc.footnotes ?? /* @__PURE__ */ new Map(),
    endnotes: doc.endnotes ?? /* @__PURE__ */ new Map(),
    noteDefs: [],
    noteSeq: 0,
    usedComments: /* @__PURE__ */ new Set(),
    imagesMode: opts.images ?? "data",
    imageDataUris: doc.imageDataUris
  };
  const out = [];
  const title = opts.title ?? doc.title;
  if (title) out.push(`# ${title}
`);
  let inList = false;
  for (const b5 of orderedBlocks(doc)) {
    const isList = b5.kind === "para" && !!b5.p.props.numbering;
    if (inList && !isList) out.push("");
    inList = isList;
    if (b5.kind === "table") {
      out.push(tableMd(b5.t, ctx));
      continue;
    }
    const p3 = b5.p;
    const inner = inlineRuns(p3.runs, ctx);
    if (p3.props.numbering) {
      const indent = "  ".repeat(p3.props.numbering.ilvl);
      const marker = p3.props.numbering.kind === "decimal" ? "1." : "-";
      out.push(`${indent}${marker} ${inner}`);
      continue;
    }
    const lvl = headingLevel(p3);
    if (lvl) out.push(`${"#".repeat(lvl)} ${inner}
`);
    else if (inner.trim()) out.push(`${inner}
`);
    else out.push("");
  }
  if (ctx.noteDefs.length) out.push("", ...ctx.noteDefs);
  const used = [...ctx.usedComments].filter((id) => ctx.comments.has(id));
  if (used.length) {
    out.push("");
    for (const id of used) {
      const c4 = ctx.comments.get(id);
      out.push(`[^c${id}]: **${c4.author ?? "An\xF4nimo"}**: ${c4.text}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// ../odf/src/zip.ts
var OdfPackage = class _OdfPackage {
  /** Mapa caminho-no-zip → bytes, na ordem original do arquivo. */
  parts;
  constructor(parts) {
    this.parts = parts;
  }
  static load(bytes) {
    let unzipped;
    try {
      unzipped = unzipSync(bytes);
    } catch {
      throw new Error("Arquivo n\xE3o \xE9 um pacote ODF v\xE1lido (ZIP corrompido)");
    }
    return new _OdfPackage(new Map(Object.entries(unzipped)));
  }
  getPart(path) {
    return this.parts.get(path);
  }
  getPartText(path) {
    const data = this.parts.get(path);
    return data === void 0 ? void 0 : new TextDecoder().decode(data);
  }
  partNames() {
    return [...this.parts.keys()];
  }
};
function writeZip(files) {
  const zippable = {};
  for (const [path, data] of Object.entries(files)) {
    zippable[path] = path === "mimetype" ? [data, { level: 0 }] : data;
  }
  return zipSync(zippable, { level: 6 });
}

// ../odf/src/units.ts
var TWIPS_PER_UNIT = {
  in: 1440,
  cm: 567,
  mm: 56.7,
  pt: 20,
  pc: 240,
  px: 15
};
function lengthToTwips(value) {
  if (value === void 0) return void 0;
  const m2 = /^\s*(-?[0-9]*\.?[0-9]+)\s*(in|cm|mm|pt|pc|px)\s*$/.exec(value);
  if (!m2) return void 0;
  const num = parseFloat(m2[1]);
  const unit = m2[2];
  const factor = TWIPS_PER_UNIT[unit];
  if (factor === void 0 || Number.isNaN(num)) return void 0;
  return Math.round(num * factor);
}
function lengthToHalfPt(value) {
  const twips = lengthToTwips(value);
  if (twips === void 0) return void 0;
  return Math.round(twips / 10);
}

// ../odf/src/styles.ts
function readRawStyle(st) {
  return {
    family: st.attrs["style:family"],
    parent: st.attrs["style:parent-style-name"],
    listStyleName: st.attrs["style:list-style-name"],
    text: firstChild(st, "style:text-properties"),
    para: firstChild(st, "style:paragraph-properties"),
    column: firstChild(st, "style:table-column-properties"),
    cell: firstChild(st, "style:table-cell-properties")
  };
}
function readListStyle(ls) {
  const levels = /* @__PURE__ */ new Map();
  for (const lvl of childElements(ls)) {
    const level = parseInt(lvl.attrs["text:level"] ?? "1", 10);
    if (lvl.name === "text:list-level-style-bullet") {
      levels.set(level, "bullet");
    } else if (lvl.name === "text:list-level-style-number") {
      levels.set(level, "decimal");
    } else if (lvl.name === "text:list-level-style-image") {
      levels.set(level, "bullet");
    }
  }
  return levels;
}
function collectStyles(container, index) {
  if (!container) return;
  for (const el of childElements(container)) {
    if (el.name === "style:style") {
      const name = el.attrs["style:name"];
      if (name) index.styles.set(name, readRawStyle(el));
    } else if (el.name === "style:default-style") {
      const family = el.attrs["style:family"];
      if (family) index.defaults.set(family, readRawStyle(el));
    } else if (el.name === "text:list-style") {
      const name = el.attrs["style:name"];
      if (name) index.listStyles.set(name, readListStyle(el));
    }
  }
}
function buildStyleIndex(contentRoot, stylesRoot) {
  const index = {
    styles: /* @__PURE__ */ new Map(),
    listStyles: /* @__PURE__ */ new Map(),
    defaults: /* @__PURE__ */ new Map()
  };
  if (stylesRoot) {
    collectStyles(firstChild(stylesRoot, "office:styles"), index);
    collectStyles(firstChild(stylesRoot, "office:automatic-styles"), index);
  }
  collectStyles(firstChild(contentRoot, "office:automatic-styles"), index);
  return index;
}
var isTrue = (v2) => v2 === "bold" || v2 === "italic" || v2 === "true" || v2 === "700";
function readTextProps(el) {
  const p3 = {};
  if (!el) return p3;
  const a3 = el.attrs;
  if (a3["fo:font-weight"] !== void 0) p3.bold = isTrue(a3["fo:font-weight"]);
  if (a3["fo:font-style"] !== void 0) p3.italic = a3["fo:font-style"] === "italic" || a3["fo:font-style"] === "oblique";
  const uStyle = a3["style:text-underline-style"];
  if (uStyle !== void 0) p3.underline = uStyle !== "none";
  const lineThrough = a3["style:text-line-through-style"];
  if (lineThrough !== void 0) p3.strike = lineThrough !== "none";
  if (a3["fo:color"] !== void 0) p3.color = normHex(a3["fo:color"]);
  if (a3["fo:background-color"] !== void 0 && a3["fo:background-color"] !== "transparent") {
    p3.highlight = normHex(a3["fo:background-color"]);
  }
  const size = lengthToHalfPt(a3["fo:font-size"]);
  if (size !== void 0) p3.szHalfPt = size;
  const font = a3["style:font-name"] ?? a3["fo:font-family"];
  if (font) p3.fontAscii = stripQuotes(font);
  if (a3["fo:font-variant"] === "small-caps" || a3["style:font-variant"] === "small-caps") p3.smallCaps = true;
  if (a3["fo:text-transform"] === "uppercase") p3.allCaps = true;
  const pos = a3["style:text-position"];
  if (pos) {
    if (/^super\b/.test(pos) || /^[1-9]/.test(pos)) p3.vertAlign = "superscript";
    else if (/^sub\b/.test(pos) || /^-/.test(pos)) p3.vertAlign = "subscript";
  }
  return p3;
}
function readParaPropsStyle(el) {
  const p3 = {};
  if (!el) return p3;
  const a3 = el.attrs;
  switch (a3["fo:text-align"]) {
    case "start":
    case "left":
      p3.alignment = "left";
      break;
    case "end":
    case "right":
      p3.alignment = "right";
      break;
    case "center":
      p3.alignment = "center";
      break;
    case "justify":
      p3.alignment = "both";
      break;
    default:
      break;
  }
  const ml = lengthToTwips(a3["fo:margin-left"]);
  if (ml !== void 0) p3.indentLeftTwips = ml;
  const mr = lengthToTwips(a3["fo:margin-right"]);
  if (mr !== void 0) p3.indentRightTwips = mr;
  const ti = lengthToTwips(a3["fo:text-indent"]);
  if (ti !== void 0) p3.indentFirstLineTwips = ti;
  const mt = lengthToTwips(a3["fo:margin-top"]);
  if (mt !== void 0) p3.spaceBeforeTwips = mt;
  const mb = lengthToTwips(a3["fo:margin-bottom"]);
  if (mb !== void 0) p3.spaceAfterTwips = mb;
  if (a3["fo:background-color"] !== void 0 && a3["fo:background-color"] !== "transparent") {
    p3.shadingHex = normHex(a3["fo:background-color"]);
  }
  if (a3["fo:break-before"] === "page") p3.pageBreakBefore = true;
  return p3;
}
function normHex(v2) {
  return v2.replace(/^#/, "").toUpperCase();
}
function stripQuotes(v2) {
  return v2.replace(/^['"]|['"]$/g, "").split(",")[0].trim();
}
function resolveStyle(index, name, seen = /* @__PURE__ */ new Set()) {
  const empty = { run: {}, para: {} };
  if (!name || seen.has(name)) return empty;
  seen.add(name);
  const raw = index.styles.get(name);
  if (!raw) return empty;
  const familyDefault = raw.family ? index.defaults.get(raw.family) : void 0;
  const baseFromDefault = familyDefault ? { run: readTextProps(familyDefault.text), para: readParaPropsStyle(familyDefault.para) } : empty;
  const baseFromParent = raw.parent ? resolveStyle(index, raw.parent, seen) : empty;
  return {
    run: { ...baseFromDefault.run, ...baseFromParent.run, ...readTextProps(raw.text) },
    para: { ...baseFromDefault.para, ...baseFromParent.para, ...readParaPropsStyle(raw.para) },
    listStyleName: raw.listStyleName ?? baseFromParent.listStyleName
  };
}

// ../odf/src/write-odt.ts
var ENC = new TextEncoder();
var MIMETYPE = "application/vnd.oasis.opendocument.text";
function xmlEscape(s4) {
  return s4.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function twipsToPt3(t5) {
  return `${(t5 / 20).toFixed(2)}pt`;
}
function twipsToCm(t5) {
  return `${(t5 / 1440 * 2.54).toFixed(4)}cm`;
}
function halfPtToPt2(hp) {
  return `${(hp / 2).toFixed(2)}pt`;
}
function eighthPtToPt(ep) {
  return ep / 8;
}
function runStyleKey(p3) {
  return [
    p3.bold ? "B" : "",
    p3.italic ? "I" : "",
    p3.underline ? "U" : "",
    p3.underlineStyle ?? "",
    p3.underlineColor ?? "",
    p3.strike ? "S" : "",
    p3.doubleStrike ? "DS" : "",
    p3.vertAlign ?? "",
    p3.szHalfPt ?? "",
    p3.color ?? "",
    p3.highlight ?? "",
    p3.fontAscii ?? "",
    p3.allCaps ? "C" : "",
    p3.smallCaps ? "SC" : "",
    p3.charSpacingTwips ?? ""
  ].join("|");
}
function getRunStyle(ctx, p3) {
  const key = runStyleKey(p3);
  const cached = ctx.runStyles.get(key);
  if (cached) return cached;
  const name = `R${ctx.runStyleDefs.length + 1}`;
  ctx.runStyles.set(key, name);
  ctx.runStyleDefs.push({ name, xml: runStyleXml(name, p3) });
  return name;
}
function runStyleXml(name, p3) {
  const text = [];
  if (p3.bold) text.push(`fo:font-weight="bold"`);
  if (p3.italic) text.push(`fo:font-style="italic"`);
  if (p3.underline) {
    const u3 = p3.underlineStyle === "double" ? "double" : p3.underlineStyle === "dotted" ? "dotted" : p3.underlineStyle === "dash" ? "dash" : p3.underlineStyle === "wave" ? "wave" : "solid";
    text.push(`style:text-underline-style="${u3}"`, `style:text-underline-width="auto"`);
    if (p3.underlineColor) text.push(`style:text-underline-color="#${p3.underlineColor}"`);
    else text.push(`style:text-underline-color="font-color"`);
  }
  if (p3.strike || p3.doubleStrike) {
    text.push(`style:text-line-through-style="solid"`);
    if (p3.doubleStrike) text.push(`style:text-line-through-type="double"`);
  }
  if (p3.vertAlign === "superscript") text.push(`style:text-position="super 58%"`);
  else if (p3.vertAlign === "subscript") text.push(`style:text-position="sub 58%"`);
  if (p3.szHalfPt) text.push(`fo:font-size="${halfPtToPt2(p3.szHalfPt)}"`);
  if (p3.color) text.push(`fo:color="#${p3.color}"`);
  if (p3.highlight) text.push(`fo:background-color="${highlightToHex(p3.highlight)}"`);
  if (p3.fontAscii) text.push(`style:font-name="${xmlEscape(p3.fontAscii)}"`);
  if (p3.allCaps) text.push(`fo:text-transform="uppercase"`);
  if (p3.smallCaps) text.push(`fo:font-variant="small-caps"`);
  if (p3.charSpacingTwips) text.push(`fo:letter-spacing="${twipsToPt3(p3.charSpacingTwips)}"`);
  const attrs = text.length ? ` ${text.join(" ")}` : "";
  return `<style:style style:name="${name}" style:family="text"><style:text-properties${attrs}/></style:style>`;
}
var HIGHLIGHTS2 = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
  white: "#ffffff"
};
function highlightToHex(name) {
  return HIGHLIGHTS2[name] ?? (name.startsWith("#") ? name : `#${name}`);
}
function paraStyleKey(p3) {
  return [
    p3.alignment ?? "",
    p3.indentLeftTwips ?? "",
    p3.indentRightTwips ?? "",
    p3.indentFirstLineTwips ?? "",
    p3.spaceBeforeTwips ?? "",
    p3.spaceAfterTwips ?? "",
    p3.lineTwentieths ?? "",
    p3.shadingHex ?? "",
    p3.pageBreakBefore ? "PBB" : "",
    borderKey(p3.borders)
  ].join("|");
}
function borderKey(b5) {
  if (!b5) return "";
  const e8 = (x3) => x3 ? `${x3.style}-${x3.sizeEighthPt}-${x3.color ?? ""}` : "";
  return `${e8(b5.top)}/${e8(b5.right)}/${e8(b5.bottom)}/${e8(b5.left)}`;
}
function getParaStyle(ctx, p3, parentStyleName) {
  const key = (parentStyleName ?? "") + "||" + paraStyleKey(p3);
  const cached = ctx.paraStyles.get(key);
  if (cached) return cached;
  const name = `P${ctx.paraStyleDefs.length + 1}`;
  ctx.paraStyles.set(key, name);
  ctx.paraStyleDefs.push({ name, xml: paraStyleXml(name, p3, parentStyleName) });
  return name;
}
function paraStyleXml(name, p3, parentStyleName) {
  const para = [];
  if (p3.alignment === "center") para.push(`fo:text-align="center"`);
  else if (p3.alignment === "right") para.push(`fo:text-align="end"`);
  else if (p3.alignment === "both") para.push(`fo:text-align="justify"`);
  else if (p3.alignment === "left") para.push(`fo:text-align="start"`);
  if (p3.indentLeftTwips) para.push(`fo:margin-left="${twipsToPt3(p3.indentLeftTwips)}"`);
  if (p3.indentRightTwips) para.push(`fo:margin-right="${twipsToPt3(p3.indentRightTwips)}"`);
  if (p3.indentFirstLineTwips) para.push(`fo:text-indent="${twipsToPt3(p3.indentFirstLineTwips)}"`);
  if (p3.spaceBeforeTwips) para.push(`fo:margin-top="${twipsToPt3(p3.spaceBeforeTwips)}"`);
  if (p3.spaceAfterTwips) para.push(`fo:margin-bottom="${twipsToPt3(p3.spaceAfterTwips)}"`);
  if (p3.shadingHex) para.push(`fo:background-color="#${p3.shadingHex}"`);
  if (p3.pageBreakBefore) para.push(`fo:break-before="page"`);
  if (p3.borders) {
    const b5 = p3.borders;
    const edge = (e8) => `${eighthPtToPt(e8.sizeEighthPt).toFixed(2)}pt ${cssStyle(e8.style)} #${e8.color ?? "000000"}`;
    if (b5.top) para.push(`fo:border-top="${edge(b5.top)}"`);
    if (b5.bottom) para.push(`fo:border-bottom="${edge(b5.bottom)}"`);
    if (b5.left) para.push(`fo:border-left="${edge(b5.left)}"`);
    if (b5.right) para.push(`fo:border-right="${edge(b5.right)}"`);
  }
  const attrs = para.length ? ` ${para.join(" ")}` : "";
  const parent = parentStyleName ? ` style:parent-style-name="${xmlEscape(parentStyleName)}"` : "";
  return `<style:style style:name="${name}" style:family="paragraph"${parent}><style:paragraph-properties${attrs}/></style:style>`;
}
function cssStyle(s4) {
  if (s4 === "dashed" || s4 === "dotted" || s4 === "double") return s4;
  if (s4 === "none" || s4 === "nil") return "none";
  return "solid";
}
function annotationsForRun(run, ctx) {
  const ids = run.props.commentIds;
  if (!ids?.length) return "";
  let out = "";
  for (const id of ids) {
    if (ctx.emittedComments.has(id)) continue;
    const c4 = ctx.comments.get(id);
    if (!c4) continue;
    ctx.emittedComments.add(id);
    const author = c4.author ? `<dc:creator>${xmlEscape(c4.author)}</dc:creator>` : "";
    out += `<office:annotation>${author}<text:p>${escapeText(c4.text)}</text:p></office:annotation>`;
  }
  return out;
}
function runXml2(run, ctx) {
  if (run.image) {
    if (ctx.options.images === "omit") return "";
    return annotationsForRun(run, ctx) + imageXml(run.image, ctx);
  }
  const styleName = isAllDefault(run.props) ? null : getRunStyle(ctx, run.props);
  const text = escapeText(run.text);
  if (!text) return annotationsForRun(run, ctx);
  const ann = annotationsForRun(run, ctx);
  if (run.props.link) {
    const styleAttr = styleName ? ` text:style-name="${styleName}"` : "";
    return `${ann}<text:a xlink:type="simple" xlink:href="${xmlEscape(run.props.link)}"><text:span${styleAttr}>${text}</text:span></text:a>`;
  }
  if (!styleName) return ann + text;
  return `${ann}<text:span text:style-name="${styleName}">${text}</text:span>`;
}
function isAllDefault(p3) {
  return !p3.bold && !p3.italic && !p3.underline && !p3.strike && !p3.doubleStrike && !p3.vertAlign && p3.szHalfPt === void 0 && !p3.color && !p3.highlight && !p3.fontAscii && !p3.allCaps && !p3.smallCaps && !p3.charSpacingTwips;
}
function escapeText(s4) {
  let out = "";
  for (let i7 = 0; i7 < s4.length; i7++) {
    const ch = s4[i7];
    if (ch === "	") {
      out += "<text:tab/>";
      continue;
    }
    if (ch === "\n") {
      out += "<text:line-break/>";
      continue;
    }
    if (ch === " ") {
      let n5 = 1;
      while (i7 + n5 < s4.length && s4[i7 + n5] === " ") n5++;
      if (n5 === 1) {
        out += " ";
      } else {
        out += ` <text:s text:c="${n5 - 1}"/>`;
        i7 += n5 - 1;
      }
      continue;
    }
    if (ch === "&") {
      out += "&amp;";
      continue;
    }
    if (ch === "<") {
      out += "&lt;";
      continue;
    }
    if (ch === ">") {
      out += "&gt;";
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code === 12) {
      out += "<text:soft-page-break/>";
      continue;
    }
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue;
    out += ch;
  }
  return out;
}
function imageXml(img, ctx) {
  const idx = ctx.pictures.length + 1;
  const ext = img.ext.toLowerCase() === "jpg" ? "jpeg" : img.ext.toLowerCase();
  const path = `Pictures/img${idx}.${ext}`;
  ctx.pictures.push({ path, data: img.data, ext });
  return `<draw:frame draw:name="Image${idx}" text:anchor-type="as-char" svg:width="${twipsToCm(img.widthTwips)}" svg:height="${twipsToCm(img.heightTwips)}"><draw:image xlink:href="${path}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;
}
function paragraphXml(para, ctx, opts) {
  const styleName = getParaStyle(ctx, para.props, opts.parentStyleName);
  const inner = para.runs.map((r6) => runXml2(r6, ctx)).join("");
  if (opts.asHeading) {
    return `<text:h text:style-name="${styleName}" text:outline-level="${opts.asHeading}">${inner}</text:h>`;
  }
  return `<text:p text:style-name="${styleName}">${inner}</text:p>`;
}
function headingLevelOf(p3) {
  const id = p3.props.styleId ?? "";
  if (/^title$/i.test(id) || /^t[íi]tulo$/i.test(id)) return 1;
  if (/^subtitle$/i.test(id) || /^subt[íi]tulo$/i.test(id)) return 2;
  const m2 = id.match(/(?:heading|t[íi]tulo|titulo)\s*([1-9])/i) ?? id.match(/^h([1-6])$/i);
  if (m2) return Math.min(6, parseInt(m2[1], 10));
  return 0;
}
function emitParagraph(para, out, ctx) {
  const lvl = headingLevelOf(para);
  if (lvl) {
    out.push(paragraphXml(para, ctx, { parentStyleName: `Heading_20_${lvl}`, asHeading: lvl }));
  } else {
    out.push(paragraphXml(para, ctx, { parentStyleName: "Standard" }));
  }
}
function emitList(items, out, ctx) {
  if (!items.length) return;
  const root = [];
  const stack = [];
  for (const p3 of items) {
    const num = p3.props.numbering;
    const node = { paras: [p3], children: [], ilvl: num.ilvl, kind: num.kind };
    while (stack.length && stack[stack.length - 1].ilvl >= num.ilvl) stack.pop();
    if (stack.length === 0) root.push(node);
    else stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const styleNameFor = (kind) => kind === "bullet" ? "WNListBullet" : "WNListNumber";
  const render = (nodes) => {
    if (!nodes.length) return "";
    const kind = nodes[0].kind;
    let xml = `<text:list text:style-name="${styleNameFor(kind)}">`;
    for (const n5 of nodes) {
      xml += `<text:list-item>`;
      xml += paragraphXml(n5.paras[0], ctx, { parentStyleName: "Standard" });
      if (n5.children.length) xml += render(n5.children);
      xml += `</text:list-item>`;
    }
    return xml + `</text:list>`;
  };
  out.push(render(root));
}
function tableXml2(t5, ctx) {
  const tableName = `T${ctx.paraStyleDefs.length + ctx.runStyleDefs.length + 1}`;
  ctx.paraStyleDefs.push({
    name: tableName,
    xml: `<style:style style:name="${tableName}" style:family="table"><style:table-properties style:width="${twipsToPt3(t5.gridColsTwips.reduce((a3, b5) => a3 + b5, 0))}" table:align="left"/></style:style>`
  });
  let xml = `<table:table table:name="${tableName}" table:style-name="${tableName}">`;
  t5.gridColsTwips.forEach((w2, i7) => {
    const colName = `${tableName}.C${i7 + 1}`;
    ctx.paraStyleDefs.push({
      name: colName,
      xml: `<style:style style:name="${colName}" style:family="table-column"><style:table-column-properties style:column-width="${twipsToPt3(w2)}"/></style:style>`
    });
    xml += `<table:table-column table:style-name="${colName}"/>`;
  });
  t5.rows.forEach((row) => {
    xml += `<table:table-row>`;
    row.cells.forEach((cell) => {
      xml += tableCellXml(cell, ctx, tableName);
      for (let i7 = 1; i7 < cell.gridSpan; i7++) xml += `<table:covered-table-cell/>`;
    });
    xml += `</table:table-row>`;
  });
  return xml + `</table:table>`;
}
function tableCellXml(cell, ctx, tableName) {
  const cellName = `${tableName}.A${ctx.paraStyleDefs.length}`;
  const cellAttrs = [];
  if (cell.shadingHex) cellAttrs.push(`fo:background-color="#${cell.shadingHex}"`);
  if (cell.borders) {
    const b5 = cell.borders;
    const edge = (e8) => `${eighthPtToPt(e8.sizeEighthPt).toFixed(2)}pt ${cssStyle(e8.style)} #${e8.color ?? "000000"}`;
    if (b5.top) cellAttrs.push(`fo:border-top="${edge(b5.top)}"`);
    if (b5.bottom) cellAttrs.push(`fo:border-bottom="${edge(b5.bottom)}"`);
    if (b5.left) cellAttrs.push(`fo:border-left="${edge(b5.left)}"`);
    if (b5.right) cellAttrs.push(`fo:border-right="${edge(b5.right)}"`);
  }
  cellAttrs.push(`fo:padding="0.05cm"`);
  ctx.paraStyleDefs.push({
    name: cellName,
    xml: `<style:style style:name="${cellName}" style:family="table-cell"><style:table-cell-properties ${cellAttrs.join(" ")}/></style:style>`
  });
  let xml = `<table:table-cell table:style-name="${cellName}"` + (cell.gridSpan > 1 ? ` table:number-columns-spanned="${cell.gridSpan}"` : "") + `>`;
  const body = [];
  emitBlocks([
    ...cell.paragraphs.map((p3) => ({ type: "paragraph", paragraph: p3 })),
    ...cell.tables.map((t5) => t5)
  ], body, ctx);
  xml += body.join("");
  return xml + `</table:table-cell>`;
}
function emitBlocks(blocks, out, ctx) {
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      emitList(listBuf, out, ctx);
      listBuf = [];
    }
  };
  for (const b5 of blocks) {
    if (b5.type === "paragraph" && b5.paragraph.props.numbering) {
      listBuf.push(b5.paragraph);
      continue;
    }
    flushList();
    if (b5.type === "paragraph") emitParagraph(b5.paragraph, out, ctx);
    else out.push(tableXml2(b5, ctx));
  }
  flushList();
}
function styleStandardXml() {
  return `<style:style style:name="Standard" style:family="paragraph"><style:paragraph-properties/></style:style><style:style style:name="Heading_20_1" style:display-name="Heading 1" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="20pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_2" style:display-name="Heading 2" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="16pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_3" style:display-name="Heading 3" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="14pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_4" style:display-name="Heading 4" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="13pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_5" style:display-name="Heading 5" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="12pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><style:style style:name="Heading_20_6" style:display-name="Heading 6" style:family="paragraph" style:parent-style-name="Standard"><style:text-properties fo:font-size="11pt" fo:font-weight="bold" fo:color="#0F4761"/></style:style><text:list-style style:name="WNListBullet">` + [0, 1, 2, 3, 4].map(
    (lvl) => `<text:list-level-style-bullet text:level="${lvl + 1}" text:bullet-char="\u2022"><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/></style:list-level-properties></text:list-level-style-bullet>`
  ).join("") + `</text:list-style><text:list-style style:name="WNListNumber">` + [0, 1, 2, 3, 4].map(
    (lvl) => `<text:list-level-style-number text:level="${lvl + 1}" style:num-format="1" style:num-suffix="."><style:list-level-properties text:list-level-position-and-space-mode="label-alignment"><style:list-level-label-alignment text:label-followed-by="listtab" fo:margin-left="${(lvl + 1) * 0.5}cm" fo:text-indent="-0.5cm"/></style:list-level-properties></text:list-level-style-number>`
  ).join("") + `</text:list-style>`;
}
function pageLayoutXml(doc) {
  const sp = doc.sections[0]?.sectPr ?? {
    pageWidthTwips: 11906,
    pageHeightTwips: 16838,
    marginLeftTwips: 1417,
    marginRightTwips: 1417,
    marginTopTwips: 1417,
    marginBottomTwips: 1417
  };
  return `<style:page-layout style:name="WNPage"><style:page-layout-properties fo:page-width="${twipsToCm(sp.pageWidthTwips)}" fo:page-height="${twipsToCm(sp.pageHeightTwips)}" fo:margin-left="${twipsToCm(sp.marginLeftTwips)}" fo:margin-right="${twipsToCm(sp.marginRightTwips)}" fo:margin-top="${twipsToCm(sp.marginTopTwips)}" fo:margin-bottom="${twipsToCm(sp.marginBottomTwips)}"/></style:page-layout>`;
}
function masterStyleXml() {
  return `<style:master-page style:name="Standard" style:page-layout-name="WNPage"/>`;
}
var NS = [
  `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"`,
  `xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"`,
  `xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"`,
  `xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"`,
  `xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"`,
  `xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"`,
  `xmlns:xlink="http://www.w3.org/1999/xlink"`,
  `xmlns:dc="http://purl.org/dc/elements/1.1/"`,
  `xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"`,
  `xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"`
].join(" ");
function contentXml(doc, ctx) {
  const body = [];
  emitBlocks(doc.blocks, body, ctx);
  const autoStyles = [
    ...ctx.paraStyleDefs.map((s4) => s4.xml),
    ...ctx.runStyleDefs.map((s4) => s4.xml)
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS} office:version="1.3"><office:automatic-styles>${autoStyles}</office:automatic-styles><office:body><office:text>${body.join("")}</office:text></office:body></office:document-content>`;
}
function stylesXml(doc) {
  return `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS} office:version="1.3"><office:styles>${styleStandardXml()}</office:styles><office:automatic-styles>${pageLayoutXml(doc)}</office:automatic-styles><office:master-styles>${masterStyleXml()}</office:master-styles></office:document-styles>`;
}
function manifestXml(pictures) {
  const picEntries = pictures.map((p3) => {
    const mime = p3.ext === "jpeg" || p3.ext === "jpg" ? "image/jpeg" : p3.ext === "png" ? "image/png" : p3.ext === "gif" ? "image/gif" : `image/${p3.ext}`;
    return `<manifest:file-entry manifest:full-path="${p3.path}" manifest:media-type="${mime}"/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${MIMETYPE}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>` + picEntries + `</manifest:manifest>`;
}
function writeOdt(doc, options = {}) {
  const ctx = {
    paraStyles: /* @__PURE__ */ new Map(),
    runStyles: /* @__PURE__ */ new Map(),
    paraStyleDefs: [],
    runStyleDefs: [],
    pictures: [],
    options: { images: options.images ?? "embed" },
    comments: new Map(doc.comments.map((c4) => [c4.id, c4])),
    emittedComments: /* @__PURE__ */ new Set()
  };
  const contentBody = contentXml(doc, ctx);
  const styles9 = stylesXml(doc);
  const manifest = manifestXml(ctx.pictures);
  const parts = {
    "mimetype": ENC.encode(MIMETYPE),
    "content.xml": ENC.encode(contentBody),
    "styles.xml": ENC.encode(styles9),
    "META-INF/manifest.xml": ENC.encode(manifest)
  };
  for (const pic of ctx.pictures) parts[pic.path] = pic.data;
  return writeZip(parts);
}

// ../odf/src/index.ts
var DEFAULT_CONTENT_WIDTH_TWIPS = 9026;
var DEFAULT_SECTPR = {
  pageWidthTwips: 11906,
  pageHeightTwips: 16838,
  marginLeftTwips: 1417,
  marginRightTwips: 1417,
  marginTopTwips: 1417,
  marginBottomTwips: 1417
};
var HEADING_LOOKS = {
  1: { szHalfPt: 40, bold: true, color: "0F4761" },
  2: { szHalfPt: 32, bold: true, color: "0F4761" },
  3: { szHalfPt: 28, bold: true, color: "0F4761" },
  4: { szHalfPt: 26, bold: true, color: "0F4761" },
  5: { szHalfPt: 24, bold: true, color: "0F4761" },
  6: { szHalfPt: 22, bold: true, color: "0F4761" }
};
function readOdt(bytes) {
  const pkg = OdfPackage.load(bytes);
  const contentXml2 = pkg.getPartText("content.xml");
  if (contentXml2 === void 0) {
    throw new Error("Pacote ODF sem content.xml \u2014 n\xE3o \xE9 um documento OpenDocument");
  }
  const contentRoot = parseXml(contentXml2);
  const stylesXml2 = pkg.getPartText("styles.xml");
  const stylesRoot = stylesXml2 !== void 0 ? parseXml(stylesXml2) : void 0;
  const styleIndex = buildStyleIndex(contentRoot, stylesRoot);
  const body = firstChild(contentRoot, "office:body");
  const officeText = body && firstChild(body, "office:text");
  if (!officeText) {
    throw new Error("content.xml sem office:body/office:text");
  }
  const ctx = { pkg, styleIndex, comments: [], nextCommentId: 0 };
  const blocks = [];
  for (const child of childElements(officeText)) {
    readBodyChild(child, blocks, ctx, 0);
  }
  if (blocks.length === 0) blocks.push({ type: "paragraph", paragraph: { runs: [], props: {} } });
  const sectPr = readPageGeometry(stylesRoot, contentRoot);
  const sections = [{
    sectPr,
    blockStart: 0,
    blockEnd: blocks.length,
    headers: {},
    footers: {},
    headerRefs: [],
    footerRefs: []
  }];
  return {
    blocks,
    sections,
    footnotes: /* @__PURE__ */ new Map(),
    endnotes: /* @__PURE__ */ new Map(),
    comments: ctx.comments,
    styles: buildStylesMap(styleIndex),
    bookmarks: /* @__PURE__ */ new Map()
  };
}
function readBodyChild(el, blocks, ctx, listDepth) {
  switch (el.name) {
    case "text:p":
      blocks.push({ type: "paragraph", paragraph: readParagraph2(el, ctx, void 0) });
      break;
    case "text:h":
      blocks.push({ type: "paragraph", paragraph: readHeading(el, ctx) });
      break;
    case "text:list":
      readList(el, blocks, ctx, listDepth);
      break;
    case "table:table":
      blocks.push(readTable2(el, ctx));
      break;
    case "text:section":
      for (const c4 of childElements(el)) readBodyChild(c4, blocks, ctx, listDepth);
      break;
    case "text:soft-page-break":
    case "text:sequence-decls":
      break;
    default:
      break;
  }
}
function readParagraph2(pEl, ctx, list) {
  const styleName = pEl.attrs["text:style-name"];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  if (list) props.numbering = { kind: list.kind, ilvl: list.ilvl };
  applyParaBorders(ctx.styleIndex, styleName, props);
  const runs = [];
  collectRuns(pEl, runs, ctx, baseRunPropsFor(resolved), void 0);
  return { runs, props };
}
function readHeading(hEl, ctx) {
  const level = clampLevel(parseInt(hEl.attrs["text:outline-level"] ?? "1", 10));
  const styleName = hEl.attrs["text:style-name"];
  const resolved = resolveStyle(ctx.styleIndex, styleName);
  const props = paraPropsFromStyle(resolved, styleName);
  props.styleId = `Heading${level}`;
  applyParaBorders(ctx.styleIndex, styleName, props);
  const look = HEADING_LOOKS[level];
  const base = { ...baseRunPropsFor(resolved) };
  base.bold = base.bold || look.bold;
  base.szHalfPt = base.szHalfPt ?? look.szHalfPt;
  base.color = base.color ?? look.color;
  const runs = [];
  collectRuns(hEl, runs, ctx, base, void 0);
  return { runs, props };
}
function clampLevel(n5) {
  if (Number.isNaN(n5) || n5 < 1) return 1;
  return n5 > 6 ? 6 : n5;
}
function paraPropsFromStyle(resolved, styleId) {
  const p3 = {};
  const s4 = resolved.para;
  if (s4.alignment !== void 0) p3.alignment = s4.alignment;
  if (s4.indentLeftTwips !== void 0) p3.indentLeftTwips = s4.indentLeftTwips;
  if (s4.indentRightTwips !== void 0) p3.indentRightTwips = s4.indentRightTwips;
  if (s4.indentFirstLineTwips !== void 0) p3.indentFirstLineTwips = s4.indentFirstLineTwips;
  if (s4.spaceBeforeTwips !== void 0) p3.spaceBeforeTwips = s4.spaceBeforeTwips;
  if (s4.spaceAfterTwips !== void 0) p3.spaceAfterTwips = s4.spaceAfterTwips;
  if (s4.shadingHex !== void 0) p3.shadingHex = s4.shadingHex;
  if (s4.pageBreakBefore) p3.pageBreakBefore = true;
  if (styleId) p3.styleId = styleId;
  return p3;
}
function baseRunPropsFor(resolved) {
  return mergeRunProps({ ...DEFAULT_RUN_PROPS }, resolved.run);
}
function mergeRunProps(base, over) {
  const out = { ...base };
  for (const k2 of Object.keys(over)) {
    if (over[k2] !== void 0) {
      Object.assign(out, { [k2]: over[k2] });
    }
  }
  return out;
}
function collectRuns(container, runs, ctx, base, pendingLink) {
  let buffer = "";
  const flush = () => {
    if (buffer.length === 0) return;
    const props = { ...base };
    if (pendingLink) {
      props.link = pendingLink;
      props.underline = true;
      props.color ??= "0563C1";
    }
    runs.push({ text: buffer, props });
    buffer = "";
  };
  for (const child of container.children) {
    if (typeof child === "string") {
      buffer += child;
      continue;
    }
    switch (child.name) {
      case "text:span": {
        flush();
        const spanStyle = resolveStyle(ctx.styleIndex, child.attrs["text:style-name"]);
        const spanBase = mergeRunProps(base, spanStyle.run);
        collectRuns(child, runs, ctx, spanBase, pendingLink);
        break;
      }
      case "text:a": {
        flush();
        const href = child.attrs["xlink:href"];
        collectRuns(child, runs, ctx, base, href ?? pendingLink);
        break;
      }
      case "text:s": {
        const count = parseInt(child.attrs["text:c"] ?? "1", 10);
        buffer += " ".repeat(Number.isNaN(count) || count < 1 ? 1 : count);
        break;
      }
      case "text:tab":
        buffer += "	";
        break;
      case "text:line-break":
        buffer += "\n";
        break;
      case "draw:frame": {
        flush();
        const img = readImage(child, ctx);
        if (img) {
          runs.push({ text: "\uFFFC", props: { ...base }, image: img });
        } else {
          collectRuns(child, runs, ctx, base, pendingLink);
        }
        break;
      }
      case "office:annotation": {
        flush();
        readAnnotation(child, ctx);
        break;
      }
      case "text:note": {
        flush();
        const body = firstChild(child, "text:note-body");
        if (body) collectRuns(flattenNoteBody(body), runs, ctx, base, pendingLink);
        break;
      }
      case "text:bookmark":
      case "text:bookmark-start":
      case "text:bookmark-end":
      case "text:annotation-end":
      case "text:soft-page-break":
      case "office:annotation-end":
        break;
      default:
        collectRuns(child, runs, ctx, base, pendingLink);
        break;
    }
  }
  flush();
}
function flattenNoteBody(noteBody) {
  const children = [];
  for (const p3 of childElements(noteBody)) {
    for (const c4 of p3.children) children.push(c4);
    children.push(" ");
  }
  return { name: "span", attrs: {}, children };
}
function readAnnotation(el, ctx) {
  const author = firstChild(el, "dc:creator");
  const paras = childElements(el, "text:p");
  const text = paras.map((p3) => {
    const r6 = [];
    collectRuns(p3, r6, ctx, { ...DEFAULT_RUN_PROPS }, void 0);
    return r6.map((x3) => x3.text).join("");
  }).join("\n");
  const info = { id: ctx.nextCommentId++, text };
  if (author) info.author = textOf(author);
  ctx.comments.push(info);
}
function textOf(el) {
  let out = "";
  for (const c4 of el.children) out += typeof c4 === "string" ? c4 : textOf(c4);
  return out;
}
function readList(listEl, blocks, ctx, depth) {
  const ilvl = depth;
  const kind = resolveListKind(ctx, listEl, depth);
  for (const item of childElements(listEl, "text:list-item")) {
    readListItem(item, blocks, ctx, depth, ilvl, kind);
  }
  for (const header of childElements(listEl, "text:list-header")) {
    for (const c4 of childElements(header)) {
      if (c4.name === "text:p" || c4.name === "text:h") {
        blocks.push({ type: "paragraph", paragraph: readParagraph2(c4, ctx, void 0) });
      }
    }
  }
}
function readListItem(item, blocks, ctx, depth, ilvl, kind) {
  for (const c4 of childElements(item)) {
    if (c4.name === "text:p" || c4.name === "text:h") {
      blocks.push({ type: "paragraph", paragraph: readParagraph2(c4, ctx, { kind, ilvl }) });
    } else if (c4.name === "text:list") {
      readList(c4, blocks, ctx, depth + 1);
    }
  }
}
function resolveListKind(ctx, listEl, depth) {
  const level = depth + 1;
  const direct = listEl.attrs["text:style-name"];
  const fromDirect = lookupListKind(ctx, direct, level);
  if (fromDirect) return fromDirect;
  for (const item of childElements(listEl, "text:list-item")) {
    for (const c4 of childElements(item, "text:p")) {
      const resolved = resolveStyle(ctx.styleIndex, c4.attrs["text:style-name"]);
      const fromStyle = lookupListKind(ctx, resolved.listStyleName, level);
      if (fromStyle) return fromStyle;
    }
  }
  return "bullet";
}
function lookupListKind(ctx, listStyleName, level) {
  if (!listStyleName) return void 0;
  const levels = ctx.styleIndex.listStyles.get(listStyleName);
  if (!levels) return void 0;
  return levels.get(level) ?? levels.get(1);
}
function readTable2(tblEl, ctx) {
  const colWidths = readColumns(tblEl, ctx);
  const rows = [];
  for (const rowEl of collectRows(tblEl)) {
    const cells = [];
    for (const cellEl of childElements(rowEl)) {
      if (cellEl.name === "table:table-cell") {
        cells.push(readCell(cellEl, ctx));
      } else if (cellEl.name === "table:covered-table-cell") {
      }
    }
    if (cells.length > 0) rows.push({ cells });
  }
  const totalCols = rows.reduce(
    (max2, r6) => Math.max(max2, r6.cells.reduce((s4, c4) => s4 + c4.gridSpan, 0)),
    colWidths.length
  );
  const gridColsTwips = buildGridCols(colWidths, totalCols);
  return { type: "table", rows, gridColsTwips };
}
function collectRows(tblEl) {
  const out = [];
  for (const c4 of childElements(tblEl)) {
    if (c4.name === "table:table-row") out.push(c4);
    else if (c4.name === "table:table-header-rows" || c4.name === "table:table-row-group") {
      out.push(...childElements(c4, "table:table-row"));
    }
  }
  return out;
}
function readColumns(tblEl, ctx) {
  const widths = [];
  const visit = (el) => {
    for (const c4 of childElements(el)) {
      if (c4.name === "table:table-column") {
        const repeat = parseInt(c4.attrs["table:number-columns-repeated"] ?? "1", 10);
        const w2 = columnWidth(c4, ctx.styleIndex);
        for (let i7 = 0; i7 < (Number.isNaN(repeat) || repeat < 1 ? 1 : repeat); i7++) widths.push(w2);
      } else if (c4.name === "table:table-columns" || c4.name === "table:table-header-columns") {
        visit(c4);
      }
    }
  };
  visit(tblEl);
  return widths;
}
function columnWidth(colEl, index) {
  const styleName = colEl.attrs["table:style-name"];
  if (!styleName) return void 0;
  const raw = index.styles.get(styleName);
  const colProps = raw?.column;
  if (!colProps) return void 0;
  return lengthToTwips(colProps.attrs["style:column-width"]);
}
function buildGridCols(colWidths, totalCols) {
  const n5 = Math.max(totalCols, colWidths.length, 1);
  const known = colWidths.filter((w2) => w2 !== void 0);
  if (known.length === n5) return [...known];
  const each = Math.round(DEFAULT_CONTENT_WIDTH_TWIPS / n5);
  const out = [];
  for (let i7 = 0; i7 < n5; i7++) out.push(colWidths[i7] ?? each);
  return out;
}
function readCell(cellEl, ctx) {
  const gridSpan = parseInt(cellEl.attrs["table:number-columns-spanned"] ?? "1", 10);
  const paragraphs = [];
  const tables = [];
  const innerBlocks = [];
  for (const c4 of childElements(cellEl)) {
    readBodyChild(c4, innerBlocks, ctx, 0);
  }
  for (const b5 of innerBlocks) {
    if (b5.type === "paragraph") paragraphs.push(b5.paragraph);
    else tables.push(b5);
  }
  if (paragraphs.length === 0 && tables.length === 0) paragraphs.push({ runs: [], props: {} });
  const cell = {
    paragraphs,
    tables,
    gridSpan: Number.isNaN(gridSpan) || gridSpan < 1 ? 1 : gridSpan
  };
  const cellStyle = cellEl.attrs["table:style-name"];
  const shading = cellShading(ctx.styleIndex, cellStyle);
  if (shading) cell.shadingHex = shading;
  const borders = cellBorders(ctx.styleIndex, cellStyle);
  if (borders) cell.borders = borders;
  return cell;
}
function readImage(frame2, ctx) {
  const imageEl = firstChild(frame2, "draw:image");
  if (!imageEl) return void 0;
  let data;
  let ext = "png";
  const href = imageEl.attrs["xlink:href"];
  if (href) {
    const path = href.replace(/^\.\//, "");
    data = ctx.pkg.getPart(path);
    const e8 = path.split(".").pop();
    if (e8) ext = e8.toLowerCase();
  }
  if (!data) {
    const binary = firstChild(imageEl, "office:binary-data");
    if (binary) {
      const b64 = textOf(binary).replace(/\s+/g, "");
      data = decodeBase64(b64);
    }
  }
  if (!data) return void 0;
  const widthTwips = lengthToTwips(frame2.attrs["svg:width"]) ?? 0;
  const heightTwips = lengthToTwips(frame2.attrs["svg:height"]) ?? 0;
  return { data, ext, widthTwips, heightTwips };
}
function decodeBase64(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i7 = 0; i7 < bin.length; i7++) out[i7] = bin.charCodeAt(i7);
    return out;
  }
  const g2 = globalThis;
  if (g2.Buffer) return new Uint8Array(g2.Buffer.from(b64, "base64"));
  throw new Error("sem decodificador base64 (atob/Buffer) no ambiente");
}
function applyParaBorders(index, styleName, props) {
  const borders = bordersFromStyle(index, styleName);
  if (borders) props.borders = borders;
}
function bordersFromStyle(index, styleName) {
  if (!styleName) return void 0;
  const raw = index.styles.get(styleName);
  const paraEl = raw?.para;
  if (!paraEl) {
    const parent = raw?.parent;
    return parent ? bordersFromStyle(index, parent) : void 0;
  }
  const a3 = paraEl.attrs;
  const all = parseBorder(a3["fo:border"]);
  const out = {};
  let any = false;
  for (const [side, attr] of [
    ["top", "fo:border-top"],
    ["left", "fo:border-left"],
    ["bottom", "fo:border-bottom"],
    ["right", "fo:border-right"]
  ]) {
    const edge = parseBorder(a3[attr]) ?? all;
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  if (any) return out;
  return raw?.parent ? bordersFromStyle(index, raw.parent) : void 0;
}
function parseBorder(spec) {
  if (!spec || spec === "none") return void 0;
  const parts = spec.trim().split(/\s+/);
  let widthTwips;
  let style = "single";
  let color;
  for (const part of parts) {
    const w2 = lengthToTwips(part);
    if (w2 !== void 0) {
      widthTwips = w2;
      continue;
    }
    if (/^#?[0-9a-fA-F]{6}$/.test(part)) {
      color = part.replace(/^#/, "").toUpperCase();
      continue;
    }
    switch (part) {
      case "solid":
        style = "single";
        break;
      case "double":
        style = "double";
        break;
      case "dashed":
        style = "dashed";
        break;
      case "dotted":
        style = "dotted";
        break;
      case "none":
      case "hidden":
        return void 0;
      default:
        break;
    }
  }
  const pt = widthTwips !== void 0 ? widthTwips / 20 : 0.5;
  return {
    style,
    sizeEighthPt: Math.max(2, Math.round(pt * 8)),
    color,
    spacePt: 0
  };
}
function cellPropsEl(index, styleName, seen = /* @__PURE__ */ new Set()) {
  if (!styleName || seen.has(styleName)) return void 0;
  seen.add(styleName);
  const raw = index.styles.get(styleName);
  if (!raw) return void 0;
  return raw.cell ?? cellPropsEl(index, raw.parent, seen);
}
function cellShading(index, styleName) {
  const el = cellPropsEl(index, styleName);
  const bg = el?.attrs["fo:background-color"];
  if (bg && bg !== "transparent") return bg.replace(/^#/, "").toUpperCase();
  return void 0;
}
function cellBorders(index, styleName) {
  const el = cellPropsEl(index, styleName);
  if (!el) return void 0;
  const a3 = el.attrs;
  const all = parseBorder(a3["fo:border"]);
  const out = {};
  let any = false;
  for (const [side, attr] of [
    ["top", "fo:border-top"],
    ["left", "fo:border-left"],
    ["bottom", "fo:border-bottom"],
    ["right", "fo:border-right"]
  ]) {
    const edge = parseBorder(a3[attr]) ?? all;
    if (edge) {
      out[side] = edge;
      any = true;
    }
  }
  return any ? out : void 0;
}
function readPageGeometry(stylesRoot, contentRoot) {
  const layout = findPageLayout(stylesRoot) ?? findPageLayout(contentRoot);
  if (!layout) return { ...DEFAULT_SECTPR };
  const propsEl = firstChild(layout, "style:page-layout-properties");
  if (!propsEl) return { ...DEFAULT_SECTPR };
  const a3 = propsEl.attrs;
  return {
    pageWidthTwips: lengthToTwips(a3["fo:page-width"]) ?? DEFAULT_SECTPR.pageWidthTwips,
    pageHeightTwips: lengthToTwips(a3["fo:page-height"]) ?? DEFAULT_SECTPR.pageHeightTwips,
    marginLeftTwips: lengthToTwips(a3["fo:margin-left"]) ?? DEFAULT_SECTPR.marginLeftTwips,
    marginRightTwips: lengthToTwips(a3["fo:margin-right"]) ?? DEFAULT_SECTPR.marginRightTwips,
    marginTopTwips: lengthToTwips(a3["fo:margin-top"]) ?? DEFAULT_SECTPR.marginTopTwips,
    marginBottomTwips: lengthToTwips(a3["fo:margin-bottom"]) ?? DEFAULT_SECTPR.marginBottomTwips
  };
}
function findPageLayout(root) {
  if (!root) return void 0;
  const auto = firstChild(root, "office:automatic-styles");
  const found = auto && firstChild(auto, "style:page-layout");
  if (found) return found;
  const styles9 = firstChild(root, "office:styles");
  return styles9 ? firstChild(styles9, "style:page-layout") : void 0;
}
function buildStylesMap(index) {
  const out = /* @__PURE__ */ new Map();
  for (const [name, _raw] of index.styles) {
    const resolved = resolveStyle(index, name);
    const id = normalizeStyleId(name);
    const entry = {
      run: { ...resolved.run },
      para: { ...resolved.para }
    };
    out.set(id, entry);
    if (id !== name) out.set(name, entry);
  }
  for (let lvl = 1; lvl <= 6; lvl++) {
    const id = `Heading${lvl}`;
    if (!out.has(id)) {
      const look = HEADING_LOOKS[lvl];
      out.set(id, {
        run: { bold: look.bold, szHalfPt: look.szHalfPt, color: look.color },
        para: {}
      });
    }
  }
  return out;
}
function normalizeStyleId(name) {
  return name.replace(/\s+/g, "");
}

// src/xps.ts
var PT_TO_PX = 96 / 72;
var TWIP_TO_PX = 96 / 1440;
var ENC2 = new TextEncoder();
var enc = (s4) => ENC2.encode(s4);
function xmlEscape2(s4) {
  return s4.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function rgb(c4) {
  const f3 = (v2) => Math.round(Math.max(0, Math.min(1, v2)) * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#FF${f3(c4[0])}${f3(c4[1])}${f3(c4[2])}`;
}
function fontPartName(family, v2) {
  return `/Resources/Fonts/${family}-${v2}.ttf`;
}
function fixedDocSeq() {
  return `<?xml version="1.0" encoding="utf-8"?><FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06"><DocumentReference Source="/Documents/1/FixedDocument.fdoc"/></FixedDocumentSequence>`;
}
function fixedDoc(pageCount) {
  let inner = "";
  for (let i7 = 1; i7 <= pageCount; i7++) {
    inner += `<PageContent Source="/Documents/1/Pages/${i7}.fpage"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?><FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06">${inner}</FixedDocument>`;
}
function fixedPage(page, usedFonts) {
  const w2 = page.widthPt * PT_TO_PX;
  const h3 = page.heightPt * PT_TO_PX;
  let body = "";
  for (const r6 of page.fills) {
    const x3 = r6.xPt * PT_TO_PX, y3 = r6.yPt * PT_TO_PX;
    const ww = r6.wPt * PT_TO_PX, hh = r6.hPt * PT_TO_PX;
    body += `<Path Fill="${rgb(r6.colorRgb)}" Data="M ${x3} ${y3} L ${x3 + ww} ${y3} ${x3 + ww} ${y3 + hh} ${x3} ${y3 + hh} Z"/>`;
  }
  for (const ln2 of page.lines) {
    const ax = ln2.ax * PT_TO_PX, ay = ln2.ay * PT_TO_PX;
    const bx = ln2.bx * PT_TO_PX, by = ln2.by * PT_TO_PX;
    const w3 = ln2.widthPt * PT_TO_PX;
    body += `<Path Stroke="${rgb(ln2.colorRgb)}" StrokeThickness="${w3.toFixed(2)}" Data="M ${ax.toFixed(2)} ${ay.toFixed(2)} L ${bx.toFixed(2)} ${by.toFixed(2)}"/>`;
  }
  for (const g2 of page.glyphs) {
    if (!g2.text) continue;
    usedFonts.add(`${g2.fontFamily}-${g2.variant}`);
    const x3 = g2.xPt * PT_TO_PX;
    const y3 = g2.baselinePt * PT_TO_PX;
    const em = g2.sizePt * PT_TO_PX;
    const ital = g2.variant === "italic" || g2.variant === "boldItalic" ? ' StyleSimulations="ItalicSimulation"' : "";
    body += `<Glyphs OriginX="${x3.toFixed(2)}" OriginY="${y3.toFixed(2)}" FontRenderingEmSize="${em.toFixed(2)}" FontUri="${fontPartName(g2.fontFamily, g2.variant)}" Fill="${rgb(g2.colorRgb)}"${ital} UnicodeString="${xmlEscape2(g2.text)}"/>`;
  }
  return `<?xml version="1.0" encoding="utf-8"?><FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" Width="${w2.toFixed(2)}" Height="${h3.toFixed(2)}" xml:lang="pt-BR">${body}</FixedPage>`;
}
function relsPagesDir(usedFonts) {
  let rels = "";
  let id = 1;
  for (const key of usedFonts) {
    const [family, variant] = key.split("-");
    rels += `<Relationship Id="R${id++}" Type="http://schemas.microsoft.com/xps/2005/06/required-resource" Target="/Resources/Fonts/${family}-${variant}.ttf"/>`;
  }
  return rels;
}
function contentTypes(pageCount, usedFonts) {
  let overrides = `<Override PartName="/FixedDocumentSequence.fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Override PartName="/Documents/1/FixedDocument.fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/>`;
  for (let i7 = 1; i7 <= pageCount; i7++) {
    overrides += `<Override PartName="/Documents/1/Pages/${i7}.fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>`;
  }
  void usedFonts;
  return `<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/><Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/><Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/><Default Extension="ttf" ContentType="application/vnd.ms-opentype"/>${overrides}</Types>`;
}
function rootRels() {
  return `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" Target="/FixedDocumentSequence.fdseq"/></Relationships>`;
}
function buildXps(input) {
  const z2 = {};
  const usedFonts = /* @__PURE__ */ new Set();
  z2["FixedDocumentSequence.fdseq"] = enc(fixedDocSeq());
  z2["Documents/1/FixedDocument.fdoc"] = enc(fixedDoc(input.pages.length));
  for (let i7 = 0; i7 < input.pages.length; i7++) {
    z2[`Documents/1/Pages/${i7 + 1}.fpage`] = enc(fixedPage(input.pages[i7], usedFonts));
  }
  for (let i7 = 0; i7 < input.pages.length; i7++) {
    z2[`Documents/1/Pages/_rels/${i7 + 1}.fpage.rels`] = enc(
      `<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + relsPagesDir(usedFonts) + `</Relationships>`
    );
  }
  for (const key of usedFonts) {
    const [family, variant] = key.split("-");
    const bytes = input.fontBytes[family]?.[variant];
    if (!bytes) throw new Error(`fonte sem bytes para XPS: ${key}`);
    z2[`Resources/Fonts/${family}-${variant}.ttf`] = bytes;
  }
  z2["[Content_Types].xml"] = enc(contentTypes(input.pages.length, usedFonts));
  z2["_rels/.rels"] = enc(rootRels());
  return zipSync(z2, { level: 6 });
}

// src/universal-write.ts
var PX_PER_TWIP = 96 / 72 / TWIPS_PER_PT;
var STYLES = {
  "Ttulo1": { sizePt: 20, bold: false, color: "0F4761", spaceBeforeTwips: 360 },
  "Heading1": { sizePt: 20, bold: false, color: "0F4761", spaceBeforeTwips: 360 },
  "Ttulo2": { sizePt: 16, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Heading2": { sizePt: 16, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Ttulo3": { sizePt: 14, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Heading3": { sizePt: 14, bold: false, color: "0F4761", spaceBeforeTwips: 160 },
  "Ttulo": { sizePt: 28, bold: false, spaceBeforeTwips: 0 },
  "Title": { sizePt: 28, bold: false, spaceBeforeTwips: 0 }
};
var HIGHLIGHTS3 = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkYellow: "#808000",
  lightGray: "#c0c0c0"
};
var Registry = class {
  constructor(sets) {
    this.sets = sets;
  }
  sets;
  resolve(family, variant) {
    const requested = family ? this.sets[family.split(" ")[0]] : void 0;
    const aptos = this.sets["Aptos"];
    return requested?.[variant] ?? aptos[variant] ?? aptos.regular;
  }
};
var UniversalWriteElement = class extends HTMLElement {
  model = null;
  pkg = null;
  fullDoc = null;
  /** Tabelas ancoradas antes do parágrafo de índice beforePara. */
  tableAnchors = [];
  /** Seções: a partir de qual parágrafo cada uma vale. */
  sectionStarts = [];
  floatImages = [];
  tableLayouts = [];
  footnoteHits = [];
  pageDark = false;
  pageSections = [];
  // página → índice de seção
  fonts = null;
  /** bytes crus de cada fonte (família→variante) para embutir no PDF exportado. */
  fontBytes = {};
  container;
  input;
  topbarEl;
  bottombarEl;
  chromeSync = null;
  selection = {
    anchor: { para: 0, offset: 0 },
    focus: { para: 0, offset: 0 }
  };
  view = "print";
  readFirstPage = 0;
  // 1ª página do bloco visível no modo Leitura
  zoomBeforeRead = 1;
  // zoom a restaurar ao sair da Leitura
  readWheelLock = false;
  // 1 bloco por gesto de scroll
  zoom = 1;
  showMarks = false;
  layoutCache = [];
  pageCount = 1;
  canvases = [];
  caretVisible = true;
  caretTimer = 0;
  readResizeQueued = false;
  handleWindowResize = () => {
    if (this.view !== "read" || this.readResizeQueued) return;
    this.readResizeQueued = true;
    requestAnimationFrame(() => {
      this.readResizeQueued = false;
      if (!this.isConnected) return;
      this.fitReadZoom();
      this.refresh();
    });
  };
  undoStack = [];
  redoStack = [];
  pendingProps = null;
  // formatação aplicada antes de digitar
  plainPasteNext = false;
  // próximo paste (Ctrl+Shift+V) cola sem formatação
  // clipboard RICO interno (o sistema só guarda texto): casado por texto, usado
  // pelo "Colar" para preservar a formatação dos runs da ORIGEM.
  richClip = null;
  onSelectionChange = null;
  /** Fontes em memória usadas pela inicialização automática, sem fetch/backend. */
  fontAssets;
  /** Documento inicial em memória usado pela inicialização automática. */
  documentSource;
  initialization = null;
  initialized = false;
  plugins = /* @__PURE__ */ new Map();
  pluginCleanups = /* @__PURE__ */ new Map();
  inlineRenderers = /* @__PURE__ */ new Map();
  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display:block; background:#e8e8e8; overflow:auto; position:relative; outline:none; }
      /* p\xE1ginas lado a lado quando o zoom abre espa\xE7o (como no app de refer\xEAncia) */
      .pages {
        padding: 24px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-content: flex-start;
        gap: 24px;
      }
      :host(.view-web) .pages, :host(.view-draft) .pages { padding: 0; display: block; }
      /* borda sutil em vez de sombra (outline n\xE3o afeta o tamanho do canvas) */
      .page { background:white; outline:1px solid var(--md-outline-variant, rgba(0,0,0,.18)); outline-offset:-1px; display:block; cursor:text; flex: none; }
      :host(.view-web) .page, :host(.view-draft) .page { margin: 0 auto; }
      :host(.view-web) .page, :host(.view-draft) .page { outline:none; }
      /* Web/Rascunho s\xE3o CONT\xCDNUOS: sem "desk" cinza em volta \u2014 o fundo \xE9 a
         pr\xF3pria cor da p\xE1gina (a folha preenche a largura). */
      :host(.view-web), :host(.view-draft) { background: #ffffff; }
      :host(.view-web.page-dark), :host(.view-draft.page-dark) { background: #1e1e1e; }
      /* Leitura: fundo da COR DA P\xC1GINA; p\xE1ginas em RAIAS lado a lado, sem
         espa\xE7o entre elas \u2014 a borda sutil de cada p\xE1gina vira o divisor da raia.
         As p\xE1ginas fora do bloco vis\xEDvel ficam display:none. */
      :host(.view-read) { background:#ffffff; }
      :host(.view-read) .pages { flex-wrap: nowrap; align-items: center; justify-content: center; align-content: center; min-height: 100%; gap: 0; padding: 0; }
      /* sem moldura ao redor; o divisor aparece S\xD3 entre p\xE1ginas (borda esq.) */
      :host(.view-read) .page { cursor:default; outline: none; }
      :host(.view-read) .page.read-divider { border-left: 1px solid var(--md-outline-variant, rgba(0,0,0,.18)); }
      :host(.view-outline) .page { outline:none; }
      textarea.proxy { position:absolute; opacity:0; width:1px; height:1em; padding:0; border:0; resize:none; }
      /* barras opcionais (topbar/bottombar) \u2014 sticky para preservar o scroll do host */
      /* sticky nos DOIS eixos (left:0) \u2014 sen\xE3o a barra rola junto quando o
         documento gera scroll horizontal (ex.: zoom alto). A largura \xE9 a do
         viewport (o host de scroll), ent\xE3o cobre a faixa vis\xEDvel em qualquer
         posi\xE7\xE3o de scroll. */
      .uw-topbar, .uw-bottombar { position: sticky; left: 0; z-index: 30; flex: none;
        width: 100%; box-sizing: border-box;
        background: var(--u-color-surface-container, #eef0f2); color: var(--u-color-on-surface, #1b1b1f); }
      .uw-topbar { top: 0; border-bottom: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-bottombar { bottom: 0; border-top: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.14)); }
      .uw-topbar:empty, .uw-bottombar:empty { display: none; }
    `;
    this.container = document.createElement("div");
    this.container.className = "pages";
    this.topbarEl = document.createElement("div");
    this.topbarEl.className = "uw-topbar";
    this.bottombarEl = document.createElement("div");
    this.bottombarEl.className = "uw-bottombar";
    this.input = document.createElement("textarea");
    this.input.className = "proxy";
    this.input.setAttribute("aria-hidden", "true");
    root.append(style, this.topbarEl, this.container, this.bottombarEl, this.input);
    this.bindEvents();
  }
  // ─────────────────────── chrome (barras) ───────────────────────
  static get observedAttributes() {
    return ["topbar", "bottombar"];
  }
  attributeChangedCallback(name) {
    if ((name === "topbar" || name === "bottombar") && this.initialized) void this.updateChrome();
  }
  /** Barra de ferramentas superior (única). */
  get topbar() {
    return this.hasAttribute("topbar");
  }
  set topbar(v2) {
    if (v2) this.setAttribute("topbar", "");
    else this.removeAttribute("topbar");
  }
  /** Visibilidade da barra inferior (status). */
  get bottombar() {
    return this.hasAttribute("bottombar");
  }
  set bottombar(v2) {
    if (v2) this.setAttribute("bottombar", "");
    else this.removeAttribute("bottombar");
  }
  chromeReq = 0;
  chromeListenersBound = false;
  /** (Re)constrói as barras conforme os atributos topbar/bottombar. */
  async updateChrome() {
    const topbar = this.topbar;
    const bottombar = this.bottombar;
    if (!topbar && !bottombar) {
      this.topbarEl.replaceChildren();
      this.bottombarEl.replaceChildren();
      this.chromeSync = null;
      return;
    }
    const req = ++this.chromeReq;
    const { setupChrome: setupChrome2 } = await Promise.resolve().then(() => (init_chrome(), chrome_exports));
    if (req !== this.chromeReq) return;
    const handle = setupChrome2(this, this.topbarEl, this.bottombarEl, { topbar, bottombar });
    this.chromeSync = handle.sync;
    if (!this.chromeListenersBound) {
      const relay = () => this.chromeSync?.();
      this.addEventListener("uw-zoom", relay);
      this.addEventListener("uw-change", relay);
      this.chromeListenersBound = true;
    }
  }
  // ───────────────────────── carga ─────────────────────────
  async connectedCallback() {
    window.addEventListener("resize", this.handleWindowResize);
    if (this.initialized) this.startCaret();
    if (!this.hasAttribute("manual-init")) await this.initialize();
  }
  disconnectedCallback() {
    window.removeEventListener("resize", this.handleWindowResize);
    window.clearInterval(this.caretTimer);
    this.caretTimer = 0;
  }
  /**
   * Inicializa o componente. Com fonts + document em memória, não executa
   * nenhum fetch e funciona em apps estáticos, Electron e WebViews offline.
   */
  async initialize(options = {}) {
    if (this.initialized) return;
    if (!this.initialization) {
      this.initialization = this.initializeInternal(options).catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    await this.initialization;
  }
  async initializeInternal(options) {
    const suppliedFonts = options.fonts ?? this.fontAssets;
    const assets = suppliedFonts ?? await this.fetchDefaultFontAssets();
    await this.installFontAssets(assets);
    const source = options.document ?? this.documentSource;
    if (source) this.loadDocumentSource(source);
    else {
      const src = this.getAttribute("src");
      if (src) {
        const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
        this.loadDocx(bytes);
      } else this.newDocument();
    }
    this.initialized = true;
    if (this.isConnected) this.startCaret();
    if (this.topbar || this.bottombar) void this.updateChrome();
    this.dispatchEvent(new CustomEvent("uw-ready", {
      detail: { offline: suppliedFonts !== void 0, plugins: this.pluginIds() }
    }));
  }
  loadDocumentSource(source) {
    if ((source.format ?? "docx") === "odt") {
      this.loadOdt(source.bytes, { protected: source.protected });
    } else {
      this.loadDocx(source.bytes, { protected: source.protected });
    }
  }
  async installFontAssets(assets) {
    const sets = {};
    this.fontBytes = {};
    for (const asset of assets) {
      const bytes = asset.data instanceof Uint8Array ? asset.data : new Uint8Array(asset.data);
      const weight = asset.weight ?? (asset.variant === "bold" || asset.variant === "boldItalic" ? "700" : "400");
      const style = asset.style ?? (asset.variant === "italic" || asset.variant === "boldItalic" ? "italic" : "normal");
      const faceBytes = bytes.slice().buffer;
      const face = new FontFace(asset.family, faceBytes, { weight, style });
      document.fonts.add(await face.load());
      sets[asset.family] ??= {};
      const font = new SfntFont(bytes);
      if (asset.advances) font.setAdvanceTable(asset.advances);
      sets[asset.family][asset.variant] = font;
      (this.fontBytes[asset.family] ??= {})[asset.variant] = bytes;
    }
    const aptos = sets["Aptos"];
    if (!aptos?.regular || !aptos.bold || !aptos.italic || !aptos.boldItalic) {
      throw new Error("initialize(): provide the four Aptos font variants");
    }
    this.fonts = new Registry(sets);
  }
  async fetchDefaultFontAssets() {
    const fontsBase = this.getAttribute("fonts") ?? "";
    const files = [
      ["Aptos", "aptos-regular.ttf", "regular"],
      ["Aptos", "aptos-bold.ttf", "bold"],
      ["Aptos", "aptos-italic.ttf", "italic"],
      ["Aptos", "aptos-bolditalic.ttf", "boldItalic"],
      ["Calibri", "calibri.ttf", "regular"],
      ["Calibri", "calibrib.ttf", "bold"],
      ["Calibri", "calibrii.ttf", "italic"],
      ["Calibri", "calibriz.ttf", "boldItalic"]
    ];
    const tableName = (family, variant) => {
      const prefix = family.toLowerCase();
      const suffix = variant === "regular" ? "" : variant === "boldItalic" ? "-bolditalic" : `-${variant}`;
      return `${prefix}${suffix}-advances.json`;
    };
    return Promise.all(files.map(async ([family, file, variant]) => {
      const data = new Uint8Array(await (await fetch(`${fontsBase}/${file}`)).arrayBuffer());
      let advances;
      try {
        advances = await (await fetch(`${fontsBase}/${tableName(family, variant)}`)).json();
      } catch {
      }
      return { family, variant, data, advances };
    }));
  }
  /** Instala um plugin na instância (sem registro global e sem backend). */
  use(plugin) {
    if (!plugin.id.trim()) throw new Error("plugin.id is required");
    if (this.plugins.has(plugin.id)) throw new Error(`plugin already installed: ${plugin.id}`);
    for (const renderer of plugin.inlineRenderers ?? []) {
      if (!/^[a-zA-Z0-9._-]+$/.test(renderer.type)) {
        throw new Error(`invalid inline type: ${renderer.type}`);
      }
      const current = this.inlineRenderers.get(renderer.type);
      if (current) {
        throw new Error(`inline "${renderer.type}" already registered by ${current.owner}`);
      }
    }
    this.plugins.set(plugin.id, plugin);
    for (const renderer of plugin.inlineRenderers ?? []) {
      this.inlineRenderers.set(renderer.type, { owner: plugin.id, renderer });
    }
    try {
      const cleanup = plugin.setup?.({ editor: this });
      if (cleanup) this.pluginCleanups.set(plugin.id, cleanup);
    } catch (error) {
      this.plugins.delete(plugin.id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === plugin.id) this.inlineRenderers.delete(type);
      }
      throw error;
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent("uw-plugin-added", { detail: { id: plugin.id } }));
  }
  /** Remove o plugin e seus renderers; o conteúdo permanece com fallback textual. */
  unuse(id) {
    if (!this.plugins.has(id)) return false;
    try {
      this.pluginCleanups.get(id)?.();
    } finally {
      this.pluginCleanups.delete(id);
      this.plugins.delete(id);
      for (const [type, entry] of this.inlineRenderers) {
        if (entry.owner === id) this.inlineRenderers.delete(type);
      }
    }
    if (this.model) this.refresh();
    this.dispatchEvent(new CustomEvent("uw-plugin-removed", { detail: { id } }));
    return true;
  }
  pluginIds() {
    return [...this.plugins.keys()];
  }
  /** Insere um inline atômico na seleção atual. */
  insertCustomInline(type, data, options = {}) {
    if (!this.model || this.locked()) return;
    const renderer = this.inlineRenderers.get(type)?.renderer;
    const fallbackText = options.fallbackText ?? renderer?.toText?.(data) ?? String(data ?? "");
    this.snapshot();
    if (this.hasSelection()) {
      const deleted = this.deleteSelection();
      this.selection = { anchor: deleted, focus: deleted };
    }
    const props = { ...this.pendingProps ?? this.currentProps() };
    const pos = insertRun(this.model, this.selection.focus, {
      text: "\uFFFC",
      props,
      custom: { type, data, fallbackText }
    });
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent("uw-custom-inline-inserted", {
      detail: { type, data, fallbackText }
    }));
  }
  // ───────── Modo de Exibição Protegido (mecânica do app de referência) ─────────
  /** Arquivos abertos entram protegidos: leitura até "Habilitar Edição". */
  protectedMode = false;
  isProtected() {
    return this.protectedMode;
  }
  enableEditing() {
    if (!this.protectedMode) return;
    this.protectedMode = false;
    this.dispatchEvent(new CustomEvent("uw-protected", {
      detail: { active: false, hasFields: this.hasExternalFields() }
    }));
    this.refresh();
    this.focusEditor();
  }
  /** Campos que podem referenciar outros componentes (TOC/PAGE/DATE...). */
  hasExternalFields() {
    if (!this.model) return false;
    return this.model.paragraphs.some(
      (p3) => p3.props.tocInstr || p3.props.tocEntry || p3.runs.some((r6) => r6.field)
    );
  }
  /** Edição bloqueada? (modo protegido ou visão de leitura) */
  locked() {
    return this.protectedMode || this.view === "read";
  }
  /** Carrega um .docx (bytes). opts.protected = decisão pelo critério do
   *  app de referência: Mark-of-the-Web (Electron lê o Zone.Identifier real; browser usa
   *  Trusted Documents). Default: protegido (conservador). */
  /** Formato do documento carregado (usado por save('auto')). */
  loadedFormat = "docx";
  /**
   * Carrega um documento. Com format='auto' (padrão) detecta docx vs odt pelos
   * bytes. É a API única de carga (loadDocx/loadOdt são internos).
   */
  load(bytes, format = "auto", opts = {}) {
    const fmt2 = format === "auto" ? this.detectFormat(bytes) : format;
    if (fmt2 === "odt") this.loadOdt(bytes, opts);
    else this.loadDocx(bytes, opts);
  }
  /** Detecta o formato pelos bytes: docx e odt são ZIP; o odt guarda o mimetype
   *  "…opendocument.text" logo no início. */
  detectFormat(bytes) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 2e3)));
    return head.includes("opendocument.text") ? "odt" : "docx";
  }
  loadDocx(bytes, opts = {}) {
    this.protectedMode = opts.protected ?? true;
    this.pkg = DocxPackage.load(bytes);
    this.fullDoc = readFullDocument(this.pkg);
    this.loadedFormat = "docx";
    this.installFullDoc();
  }
  /**
   * Carrega um .odt (OpenDocument Text). Não há pacote OOXML original — ao
   * salvar como .docx o pkg é criado do zero (DocxPackage.empty()).
   */
  loadOdt(bytes, opts = {}) {
    this.protectedMode = opts.protected ?? false;
    this.pkg = null;
    this.fullDoc = readOdt(bytes);
    this.loadedFormat = "odt";
    this.installFullDoc();
  }
  /**
   * Salva/exporta o documento no formato pedido. Com format='auto' (padrão)
   * usa o formato originalmente carregado (docx ou odt). API única de saída —
   * retorna Uint8Array (docx/odt/pdf/xps) ou string (html/markdown).
   */
  async save(format = "auto", opts = {}) {
    const embed = opts.images !== false;
    const fmt2 = format === "auto" ? this.loadedFormat : format;
    switch (fmt2) {
      case "odt":
        return this.exportOdt({ images: embed ? "embed" : "omit" });
      case "pdf":
        return this.exportPdf();
      case "html":
        return this.exportHtml(opts.title, { images: embed ? "data" : "omit" });
      case "markdown":
        return this.exportMarkdown(opts.title, { images: embed ? "data" : "omit" });
      case "xps":
        return this.exportXps();
      case "docx":
      default:
        return this.saveDocx();
    }
  }
  /** Comum entre loadDocx e loadOdt — popula model/sections/floatImages a
   *  partir de this.fullDoc e dispara uw-protected. */
  installFullDoc() {
    if (!this.fullDoc) throw new Error("installFullDoc without fullDoc");
    const paragraphs = [];
    this.tableAnchors = [];
    for (const block of this.fullDoc.blocks) {
      if (block.type === "paragraph") paragraphs.push(block.paragraph);
      else this.tableAnchors.push({ beforePara: paragraphs.length, table: block });
    }
    if (paragraphs.length === 0) paragraphs.push({ runs: [], props: {} });
    this.sectionStarts = this.fullDoc.sections.map((section) => {
      let startPara = 0;
      for (let b5 = 0; b5 < section.blockStart; b5++) {
        if (this.fullDoc.blocks[b5].type === "paragraph") startPara++;
      }
      return { startPara, section };
    });
    const blockToPara = (blockIdx) => {
      let n5 = -1;
      for (let b5 = 0; b5 <= blockIdx && b5 < this.fullDoc.blocks.length; b5++) {
        if (this.fullDoc.blocks[b5].type === "paragraph") n5++;
      }
      return n5;
    };
    const refMap = (refs, kind) => refs.map((r6) => ({ kind, type: r6.type, rid: r6.rid }));
    for (let si = 0; si < this.fullDoc.sections.length - 1; si++) {
      const section = this.fullDoc.sections[si];
      const lastPara = blockToPara(section.blockEnd);
      const p3 = paragraphs[lastPara];
      if (p3) {
        p3.props.sectionBreak = {
          sectPr: section.sectPr,
          headerRefs: refMap(section.headerRefs, "header"),
          footerRefs: refMap(section.footerRefs, "footer")
        };
      }
    }
    this.floatImages = [];
    paragraphs.forEach((p3, pi) => {
      for (const run of p3.runs) {
        if (run.field && run.text === "") {
          if (/DATE/i.test(run.field)) {
            run.text = (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
          } else if (/PAGE/i.test(run.field)) {
            run.text = "1";
          }
        }
        if (run.noteRef && run.text === "") run.text = String(run.noteRef.id);
        if (run.image?.floating) this.floatImages.push({ para: pi, run });
      }
    });
    this.model = {
      paragraphs,
      sectPr: this.fullDoc.sections[0]?.sectPr ?? {
        pageWidthTwips: 11906,
        pageHeightTwips: 16838,
        marginLeftTwips: 1701,
        marginRightTwips: 1701,
        marginTopTwips: 1417,
        marginBottomTwips: 1417
      }
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-protected", {
      detail: { active: this.protectedMode, hasFields: this.hasExternalFields() }
    }));
  }
  newDocument() {
    this.protectedMode = false;
    this.loadedFormat = "docx";
    this.pkg = null;
    this.fullDoc = null;
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.model = {
      paragraphs: [{ runs: [], props: {} }],
      sectPr: {
        pageWidthTwips: 11906,
        pageHeightTwips: 16838,
        marginLeftTwips: 1701,
        marginRightTwips: 1701,
        marginTopTwips: 1417,
        marginBottomTwips: 1417
      }
    };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
  }
  setDarkPage(dark) {
    this.pageDark = dark;
    this.classList.toggle("page-dark", dark);
    this.refresh();
    this.paint();
  }
  /**
   * Cor "efetiva" para o canvas no tema escuro total: inverte a LUMINOSIDADE
   * (HSL: L = 100-L) preservando matiz e saturação. Preto vira branco, branco
   * vira preto, cinza claro vira cinza escuro, azul claro vira azul escuro etc.
   *
   * Não toca PDF/XPS/HTML/Markdown/ODT — esses são SAÍDA do documento e devem
   * manter as cores originais; o tema escuro é só renderização local no canvas.
   *
   * Aceita "RRGGBB" (sem #) ou "#RRGGBB". Retorna sempre "#RRGGBB" pronto p/
   * `ctx.fillStyle`/`strokeStyle`.
   */
  inkColor(hex, fallbackLight = "#000", fallbackDark = "#e8eaed") {
    if (!hex) return this.pageDark ? fallbackDark : fallbackLight;
    const h3 = hex.startsWith("#") ? hex.slice(1) : hex;
    if (!this.pageDark) return `#${h3}`;
    if (h3.length !== 6) return `#${h3}`;
    const r6 = parseInt(h3.slice(0, 2), 16) / 255;
    const g2 = parseInt(h3.slice(2, 4), 16) / 255;
    const b5 = parseInt(h3.slice(4, 6), 16) / 255;
    const max2 = Math.max(r6, g2, b5), min = Math.min(r6, g2, b5);
    const l3 = (max2 + min) / 2;
    const d3 = max2 - min;
    let hh = 0, s4 = 0;
    if (d3 !== 0) {
      s4 = l3 > 0.5 ? d3 / (2 - max2 - min) : d3 / (max2 + min);
      switch (max2) {
        case r6:
          hh = ((g2 - b5) / d3 + (g2 < b5 ? 6 : 0)) / 6;
          break;
        case g2:
          hh = ((b5 - r6) / d3 + 2) / 6;
          break;
        case b5:
          hh = ((r6 - g2) / d3 + 4) / 6;
          break;
      }
    }
    const lInv = 1 - l3;
    const c4 = (1 - Math.abs(2 * lInv - 1)) * s4;
    const x3 = c4 * (1 - Math.abs(hh * 6 % 2 - 1));
    const m2 = lInv - c4 / 2;
    let rr = 0, gg = 0, bb = 0;
    const seg = Math.floor(hh * 6);
    if (seg === 0) {
      rr = c4;
      gg = x3;
    } else if (seg === 1) {
      rr = x3;
      gg = c4;
    } else if (seg === 2) {
      gg = c4;
      bb = x3;
    } else if (seg === 3) {
      gg = x3;
      bb = c4;
    } else if (seg === 4) {
      rr = x3;
      bb = c4;
    } else {
      rr = c4;
      bb = x3;
    }
    const toHex = (v2) => Math.round((v2 + m2) * 255).toString(16).padStart(2, "0");
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
  }
  // ───────────────── edição de cabeçalho/rodapé ─────────────────
  hfEdit = null;
  dirtyHf = /* @__PURE__ */ new Set();
  savedBody = null;
  /** Página onde o HF está sendo editado (preserva a paginação do corpo). */
  hfActivePage = 0;
  editingHeaderFooter() {
    return this.hfEdit?.kind ?? null;
  }
  enterHeaderFooter(kind, activePage = 0) {
    if (!this.model || this.hfEdit || this.locked()) return;
    this.hfActivePage = Math.max(0, Math.min(activePage, this.pageCount - 1));
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [],
        sections: [{
          sectPr: this.model.sectPr,
          blockStart: 0,
          blockEnd: 0,
          headers: {},
          footers: {},
          headerRefs: [],
          footerRefs: []
        }],
        footnotes: /* @__PURE__ */ new Map(),
        endnotes: /* @__PURE__ */ new Map(),
        comments: [],
        styles: /* @__PURE__ */ new Map(),
        bookmarks: /* @__PURE__ */ new Map()
      };
    }
    const sIdx = this.pageSections[this.hfActivePage] ?? 0;
    const fd2 = this.fullDoc;
    const sec = this.sectionStarts[sIdx]?.section ?? fd2.sections[0];
    const set = kind === "header" ? sec.headers : sec.footers;
    const refs = kind === "header" ? sec.headerRefs : sec.footerRefs;
    const partType = this.hfActivePage === 0 && set.first ? "first" : "default";
    if (!set[partType]) set[partType] = [{ runs: [], props: {} }];
    const part = set[partType];
    for (const p3 of part) {
      for (const run of p3.runs) {
        if (run.field && !run.text.trim()) {
          run.text = /NUMPAGES/i.test(run.field) ? String(this.pageCount || 1) : /PAGE/i.test(run.field) ? String(this.hfActivePage + 1) : /DATE/i.test(run.field) ? (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") : run.field.trim();
        }
      }
    }
    let ref = refs.find((r6) => r6.type === partType);
    if (!ref) {
      ref = { type: partType, rid: `rIdWn${kind}${partType}`, path: `word/uw-${kind}-${partType}.xml` };
      refs.push(ref);
      this.dirtyHf.add(ref.path);
    }
    this.hfBodySnapshots = this.canvases.map((c4) => {
      const snap = document.createElement("canvas");
      snap.width = c4.width;
      snap.height = c4.height;
      if (c4.width > 1) snap.getContext("2d").drawImage(c4, 0, 0);
      return snap;
    });
    this.savedBody = {
      model: this.model,
      tableAnchors: this.tableAnchors,
      sectionStarts: this.sectionStarts,
      floatImages: this.floatImages,
      selection: this.selection,
      undoStack: this.undoStack,
      redoStack: this.redoStack,
      pageCount: this.pageCount,
      pageSections: [...this.pageSections]
    };
    this.model = { paragraphs: part, sectPr: this.savedBody.model.sectPr };
    this.tableAnchors = [];
    this.sectionStarts = [];
    this.floatImages = [];
    this.hfEdit = { kind, path: ref.path };
    this.selection = { anchor: { para: 0, offset: 0 }, focus: { para: 0, offset: 0 } };
    this.undoStack = [];
    this.redoStack = [];
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-hfmode", { detail: { active: true, kind } }));
  }
  exitHeaderFooter() {
    if (!this.hfEdit || !this.savedBody) return;
    this.hfBodySnapshots = [];
    this.model = this.savedBody.model;
    this.tableAnchors = this.savedBody.tableAnchors;
    this.sectionStarts = this.savedBody.sectionStarts;
    this.floatImages = this.savedBody.floatImages;
    this.selection = this.savedBody.selection;
    this.undoStack = this.savedBody.undoStack;
    this.redoStack = this.savedBody.redoStack;
    this.savedBody = null;
    this.hfEdit = null;
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-hfmode", { detail: { active: false } }));
  }
  /** Desloca âncoras de tabela/seção quando parágrafos entram/saem. */
  shiftAnchors(fromPara, delta) {
    for (const a3 of this.tableAnchors) if (a3.beforePara > fromPara) a3.beforePara += delta;
    for (const s4 of this.sectionStarts) if (s4.startPara > fromPara) s4.startPara += delta;
    for (const f3 of this.floatImages) if (f3.para > fromPara) f3.para += delta;
  }
  // ───────────────────────── API pública ─────────────────────────
  setView(v2) {
    const prev = this.view;
    const z0 = this.zoom;
    if (v2 === "read" && prev !== "read") this.zoomBeforeRead = this.zoom;
    this.view = v2;
    this.classList.remove("view-print", "view-web", "view-draft", "view-read", "view-outline");
    this.classList.add(`view-${v2}`);
    if (v2 === "read") {
      this.readFirstPage = 0;
      this.fitReadZoom();
    } else if (prev === "read") this.zoom = this.zoomBeforeRead;
    this.refresh();
    this.scrollTop = 0;
    if (this.zoom !== z0) this.dispatchEvent(new CustomEvent("uw-zoom", { detail: { zoom: this.zoom } }));
  }
  getView() {
    return this.view;
  }
  // ── Modo Leitura: páginas em RAIAS (N por largura), navegadas em blocos ───
  /** Zoom: N páginas cabem na LARGURA e cada uma na ALTURA (o menor dos dois). */
  fitReadZoom() {
    if (!this.model) return;
    const s4 = this.sect();
    const pageW1 = s4.pageWidthTwips * PX_PER_TWIP;
    const pageH1 = s4.pageHeightTwips * PX_PER_TWIP;
    const n5 = this.readPagesPerView();
    const availW = (this.clientWidth || 1200) - 8;
    const availH = (this.clientHeight || 800) - 8;
    this.zoom = Math.max(0.1, Math.min(5, availW / (n5 * pageW1), availH / pageH1));
  }
  /** Nº de raias (páginas lado a lado) — escala com a largura: ~2 em 1440p,
   *  3 em 2560px, 4 em 4K. (largura-alvo por página ≈ 880px) */
  readPagesPerView() {
    return Math.max(1, Math.round((this.clientWidth || 1200) / 880));
  }
  /** Exibe só o bloco de N páginas a partir de readFirstPage; oculta as demais. */
  applyReadSpread() {
    const n5 = this.readPagesPerView();
    const total = this.canvases.length;
    this.readFirstPage = Math.max(0, Math.min(this.readFirstPage, Math.max(0, total - 1)));
    const a3 = this.readFirstPage, b5 = a3 + n5;
    this.canvases.forEach((c4, i7) => {
      const shown = i7 >= a3 && i7 < b5;
      c4.style.display = shown ? "" : "none";
      c4.classList.toggle("read-divider", shown && i7 > a3);
    });
  }
  /** Navega ±1 bloco (N páginas) no modo Leitura. */
  nudgeRead(dir) {
    const n5 = this.readPagesPerView();
    const total = this.canvases.length;
    let next = this.readFirstPage + dir * n5;
    if (next >= total) return;
    next = Math.max(0, next);
    if (next === this.readFirstPage) return;
    this.readFirstPage = next;
    this.scrollTop = 0;
    this.applyReadSpread();
    this.ensureVisiblePainted();
  }
  /** Zoom 10%–500%. anchorY (px do viewport): ponto que deve ficar parado. */
  setZoom(z2, anchorY) {
    const clamped = Math.min(5, Math.max(0.1, z2));
    if (clamped === this.zoom) return;
    const old = this.zoom;
    const anchor = anchorY ?? this.clientHeight / 2;
    const docY = this.scrollTop + anchor;
    this.zoom = clamped;
    this.refresh();
    this.scrollTop = docY * clamped / old - anchor;
    this.dispatchEvent(new CustomEvent("uw-zoom", { detail: { zoom: clamped } }));
  }
  getZoom() {
    return this.zoom;
  }
  toggleMarks() {
    this.showMarks = !this.showMarks;
    this.refresh();
    return this.showMarks;
  }
  getSelectionState() {
    const run = { ...this.pendingProps ?? this.currentProps() };
    const p3 = this.model?.paragraphs[this.selection.focus.para];
    const st = p3 ? this.styleOf(p3) : void 0;
    const dd = this.docDefaults();
    const para = { ...p3?.props ?? {} };
    if (para.alignment === void 0) para.alignment = st?.alignment;
    if (run.fontAscii === void 0) run.fontAscii = st?.fontAscii ?? dd.run.fontAscii ?? "Aptos";
    if (run.szHalfPt === void 0) {
      run.szHalfPt = st?.sizePt !== void 0 ? Math.round(st.sizePt * 2) : dd.run.szHalfPt ?? 22;
    }
    return { run, para, view: this.view, marks: this.showMarks };
  }
  toggleRunProp(key) {
    const cur = this.pendingProps ?? this.currentProps();
    this.formatRuns({ [key]: !cur[key] });
  }
  toggleVertAlign(kind) {
    const cur = (this.pendingProps ?? this.currentProps()).vertAlign;
    this.formatRuns({ vertAlign: cur === kind ? void 0 : kind });
  }
  setFontSize(pt) {
    this.formatRuns({ szHalfPt: Math.round(pt * 2) });
  }
  growFont(delta) {
    const cur = (this.pendingProps ?? this.currentProps()).szHalfPt ?? 22;
    this.formatRuns({ szHalfPt: Math.max(2, cur + delta * 2) });
  }
  setFontFamily(name) {
    this.formatRuns({ fontAscii: name });
  }
  setColor(hex) {
    this.formatRuns({ color: hex });
  }
  setHighlight(name) {
    this.formatRuns({ highlight: name });
  }
  clearFormatting() {
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps(this.model, this.range(), { ...DEFAULT_RUN_PROPS, szHalfPt: void 0, color: void 0, highlight: void 0, fontAscii: void 0, vertAlign: void 0 });
      applyParaProps(this.model, this.range(), { styleId: void 0, alignment: void 0 });
    }
    this.refresh();
  }
  changeCase(mode) {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    this.snapshot();
    const { start, end } = normalizeRange(this.range());
    for (let pi = start.para; pi <= end.para; pi++) {
      const p3 = this.model.paragraphs[pi];
      let acc = 0;
      for (const run of p3.runs) {
        const rs = acc;
        const re = acc + run.text.length;
        acc = re;
        const from = pi === start.para ? Math.max(start.offset, rs) : rs;
        const to = pi === end.para ? Math.min(end.offset, re) : re;
        if (to <= from) continue;
        const seg = run.text.slice(from - rs, to - rs);
        const tx = mode === "upper" ? seg.toUpperCase() : seg.toLowerCase();
        run.text = run.text.slice(0, from - rs) + tx + run.text.slice(to - rs);
      }
    }
    this.refresh();
  }
  setAlignment(a3) {
    this.formatPara({ alignment: a3 });
  }
  /** Aplica hyperlink à seleção; sem seleção e com url, insere a url já linkada. */
  setLink(url) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      applyRunProps(this.model, this.range(), { link: url || void 0 });
    } else if (url) {
      const start = this.selection.focus;
      const pos = insertText(this.model, start, url);
      applyRunProps(this.model, { start, end: pos }, { link: url });
      this.selection = { anchor: pos, focus: pos };
    }
    this.refresh();
  }
  toggleList(kind) {
    const cur = this.model?.paragraphs[this.selection.focus.para]?.props.numbering;
    this.formatPara({
      numbering: cur?.kind === kind ? void 0 : { kind, ilvl: 0 },
      indentLeftTwips: cur?.kind === kind ? void 0 : 720
    });
  }
  indent(delta) {
    const p3 = this.model?.paragraphs[this.selection.focus.para];
    const cur = p3?.props.indentLeftTwips ?? 0;
    this.formatPara({ indentLeftTwips: Math.max(0, cur + delta * 720) || void 0 });
  }
  setLineSpacing(line) {
    this.formatPara({ lineTwentieths: line });
  }
  /** Aplica um estilo de parágrafo replicando o Word: além de setar o styleId,
   *  LIMPA a formatação direta que impediria o estilo de aparecer — props de
   *  parágrafo (numeração/bullet, alinhamento, espaçamento, recuos, bordas) e
   *  props de run UNIFORMES no parágrafo (tamanho/fonte/cor/negrito iguais em
   *  todos os runs). Formatação de run PARCIAL (ex.: uma palavra em negrito) é
   *  preservada — exatamente como o Word faz. */
  applyStyle(styleId) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    const r6 = this.range();
    const lo = Math.min(r6.start.para, r6.end.para);
    const hi = Math.max(r6.start.para, r6.end.para);
    const RUN_KEYS = [
      "szHalfPt",
      "fontAscii",
      "color",
      "bold",
      "italic",
      "underline",
      "underlineStyle",
      "underlineColor",
      "strike",
      "doubleStrike",
      "allCaps",
      "smallCaps",
      "vertAlign",
      "highlight",
      "charSpacingTwips"
    ];
    for (let pi = lo; pi <= hi; pi++) {
      const p3 = this.model.paragraphs[pi];
      if (!p3) continue;
      p3.props.styleId = styleId;
      p3.props.numbering = void 0;
      p3.props.alignment = void 0;
      p3.props.spaceBeforeTwips = void 0;
      p3.props.spaceAfterTwips = void 0;
      p3.props.lineTwentieths = void 0;
      p3.props.indentLeftTwips = void 0;
      p3.props.indentRightTwips = void 0;
      p3.props.indentFirstLineTwips = void 0;
      p3.props.borders = void 0;
      p3.props.shadingHex = void 0;
      const runs = p3.runs;
      if (runs.length) {
        for (const key of RUN_KEYS) {
          const first = runs[0].props[key];
          if (first === void 0) continue;
          if (runs.every((rn) => rn.props[key] === first)) {
            for (const rn of runs) delete rn.props[key];
          }
        }
      }
    }
    this.pendingProps = null;
    this.refresh();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  setShading(hex) {
    this.formatPara({ shadingHex: hex });
  }
  setCharSpacing(twips) {
    this.formatRuns({ charSpacingTwips: twips });
  }
  setSpecialIndent(kind) {
    this.formatPara({
      indentFirstLineTwips: kind === "none" ? void 0 : kind === "firstLine" ? 708 : -708
    });
  }
  setIndentRight(twips) {
    this.formatPara({ indentRightTwips: twips });
  }
  // pincel de formatação
  painterProps = null;
  copyFormat() {
    if (!this.model) return;
    this.painterProps = {
      run: this.currentProps(),
      para: { ...this.model.paragraphs[this.selection.focus.para].props }
    };
  }
  painterActive() {
    return this.painterProps !== null;
  }
  applyPainter() {
    if (!this.painterProps || !this.model) return;
    const { run, para } = this.painterProps;
    this.painterProps = null;
    this.snapshot();
    if (this.hasSelection()) applyRunProps(this.model, this.range(), run);
    applyParaProps(this.model, this.range(), para);
    this.refresh();
  }
  // localizar / substituir
  findNext(needle) {
    if (!this.model || !needle) return false;
    const lower = needle.toLowerCase();
    const startP = this.selection.focus.para;
    const startO = this.selection.focus.offset;
    const n5 = this.model.paragraphs.length;
    for (let k2 = 0; k2 <= n5; k2++) {
      const pi = (startP + k2) % n5;
      const text = paraText(this.model.paragraphs[pi]).toLowerCase();
      const from = k2 === 0 ? startO : 0;
      const idx = text.indexOf(lower, from);
      if (idx >= 0) {
        this.selection = {
          anchor: { para: pi, offset: idx },
          focus: { para: pi, offset: idx + needle.length }
        };
        this.refresh();
        this.scrollCaretIntoView();
        return true;
      }
    }
    return false;
  }
  replaceAll(needle, replacement) {
    if (!this.model || !needle) return 0;
    this.snapshot();
    let count = 0;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let from = 0;
      for (; ; ) {
        const text = paraText(this.model.paragraphs[pi]).toLowerCase();
        const idx = text.indexOf(needle.toLowerCase(), from);
        if (idx < 0) break;
        const pos = deleteRange(this.model, {
          start: { para: pi, offset: idx },
          end: { para: pi, offset: idx + needle.length }
        });
        insertText(this.model, pos, replacement);
        from = idx + replacement.length;
        count++;
      }
    }
    this.refresh();
    return count;
  }
  /** Texto plano da seleção (parágrafos separados por \n). */
  selectedText() {
    if (!this.model || !this.hasSelection()) return "";
    const { start, end } = normalizeRange(this.range());
    const parts = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const paragraph = this.model.paragraphs[pi];
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(paragraph);
      parts.push(this.plainTextSlice(paragraph, from, to));
    }
    return parts.join("\n");
  }
  plainTextSlice(paragraph, from, to) {
    let out = "";
    let acc = 0;
    for (const run of paragraph.runs) {
      const start = acc;
      const end = acc + run.text.length;
      acc = end;
      const sliceStart = Math.max(from, start);
      const sliceEnd = Math.min(to, end);
      if (sliceEnd <= sliceStart) continue;
      out += run.custom ? run.custom.fallbackText : run.text.slice(sliceStart - start, sliceEnd - start);
    }
    return out;
  }
  /** pos está dentro da seleção atual (range normalizado)? */
  posInSelection(pos) {
    if (!this.hasSelection()) return false;
    const { start, end } = normalizeRange(this.range());
    const after = pos.para > start.para || pos.para === start.para && pos.offset >= start.offset;
    const before = pos.para < end.para || pos.para === end.para && pos.offset <= end.offset;
    return after && before;
  }
  /** Extrai a seleção como parágrafos de runs (com props) — base do clipboard rico. */
  extractSelection() {
    if (!this.model || !this.hasSelection()) return null;
    const { start, end } = normalizeRange(this.range());
    const paras = [];
    for (let pi = start.para; pi <= end.para; pi++) {
      const p3 = this.model.paragraphs[pi];
      const from = pi === start.para ? start.offset : 0;
      const to = pi === end.para ? end.offset : paraLength(p3);
      const runs = [];
      let acc = 0;
      for (const run of p3.runs) {
        const rs = acc, re = acc + run.text.length;
        acc = re;
        const s4 = Math.max(from, rs), e8 = Math.min(to, re);
        if (e8 > s4) runs.push({
          text: run.custom ? run.custom.fallbackText : run.text.slice(s4 - rs, e8 - rs),
          props: { ...run.props }
        });
      }
      paras.push({ runs });
    }
    const text = paras.map((pp) => pp.runs.map((r6) => r6.text).join("")).join("\n");
    return { text, paras };
  }
  /** Copia a seleção: texto p/ o sistema + cópia RICA interna (preserva origem). */
  async copy() {
    const t5 = this.selectedText();
    if (!t5) return;
    this.richClip = this.extractSelection();
    try {
      await navigator.clipboard?.writeText(t5);
    } catch {
    }
  }
  /** Recorta a seleção. */
  async cut() {
    if (!this.model || !this.hasSelection() || this.locked()) return;
    await this.copy();
    this.snapshot();
    const pos = this.deleteSelection();
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Colar (Ctrl+V): respeita a formatação da ORIGEM (rico) quando o texto do
   * sistema ainda casa com a cópia interna; senão cola texto externo herdando o destino. */
  async paste() {
    if (this.locked()) return;
    try {
      const t5 = await navigator.clipboard?.readText();
      if (!t5) return;
      if (this.richClip && this.richClip.text === t5.replace(/\r\n?/g, "\n")) this.insertRich(this.richClip);
      else this.pasteText(t5);
      this.onSelectionChange?.();
      this.chromeSync?.();
    } catch {
    }
  }
  /** Colar sem formatação (Ctrl+Shift+V): sempre texto plano, herdando o DESTINO. */
  async pastePlain() {
    if (this.locked()) return;
    try {
      const t5 = await navigator.clipboard?.readText();
      if (t5) {
        this.pasteText(t5);
        this.onSelectionChange?.();
        this.chromeSync?.();
      }
    } catch {
    }
  }
  /** Insere os parágrafos/runs ricos preservando os props de cada run (origem). */
  insertRich(clip) {
    if (!this.model || this.view === "read") return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    let pos = this.selection.focus;
    clip.paras.forEach((cp, i7) => {
      if (i7 > 0) pos = splitParagraph(this.model, pos);
      for (const run of cp.runs) if (run.text) pos = insertText(this.model, pos, run.text, { ...run.props });
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  /** Cola texto plano (\n divide parágrafos) HERDANDO a formatação do destino (props do caret). */
  pasteText(text) {
    if (!this.model || this.view === "read" || !text) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const paras = text.replace(/\r\n?/g, "\n").split("\n");
    let pos = this.selection.focus;
    paras.forEach((part, i7) => {
      if (i7 > 0) pos = splitParagraph(this.model, pos);
      if (part) pos = insertText(this.model, pos, part);
    });
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  toggleBorder() {
    const p3 = this.model?.paragraphs[this.selection.focus.para]?.props;
    const has = !!(p3?.boxBorder || p3?.borders);
    const edge = { style: "single", sizeEighthPt: 4, spacePt: 1 };
    this.formatPara({
      boxBorder: void 0,
      borders: has ? void 0 : { top: { ...edge }, left: { ...edge }, bottom: { ...edge }, right: { ...edge } }
    });
  }
  setSpaceAfter(twips) {
    this.formatPara({ spaceAfterTwips: twips });
  }
  setSpaceBefore(twips) {
    this.formatPara({ spaceBeforeTwips: twips });
  }
  setPageSetup(opts) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    const targets = [this.model.sectPr, ...this.sectionStarts.map((ss) => ss.section.sectPr)];
    for (const s4 of targets) {
      if (opts.size) {
        const [w2, h3] = opts.size === "A4" ? [11906, 16838] : [12240, 15840];
        const landscape = s4.pageWidthTwips > s4.pageHeightTwips;
        s4.pageWidthTwips = landscape ? h3 : w2;
        s4.pageHeightTwips = landscape ? w2 : h3;
      }
      if (opts.orientation) {
        const [a3, b5] = [s4.pageWidthTwips, s4.pageHeightTwips];
        const isLandscape = a3 > b5;
        if (opts.orientation === "landscape" !== isLandscape) {
          s4.pageWidthTwips = b5;
          s4.pageHeightTwips = a3;
        }
      }
      if (opts.margins) {
        const m2 = { normal: [1417, 1701], narrow: [720, 720], wide: [1417, 2880] }[opts.margins];
        s4.marginTopTwips = s4.marginBottomTwips = m2[0];
        s4.marginLeftTwips = s4.marginRightTwips = m2[1];
      }
      if (opts.customMargins) {
        s4.marginTopTwips = opts.customMargins.top;
        s4.marginRightTwips = opts.customMargins.right;
        s4.marginBottomTwips = opts.customMargins.bottom;
        s4.marginLeftTwips = opts.customMargins.left;
      }
    }
    this.refresh();
  }
  undo() {
    this.popHistory(this.undoStack, this.redoStack);
  }
  redo() {
    this.popHistory(this.redoStack, this.undoStack);
  }
  /** Insere quebra de página no caret (Ctrl+Enter). */
  insertPageBreak() {
    this.type("\f");
  }
  /** Insere um CAMPO no caret (variáveis de cabeçalho/rodapé do app de referência).
   *  O texto é o token que o paint substitui por página; ao salvar vira
   *  fldSimple e o próprio app de referência passa a atualizá-lo. */
  insertField(kind) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const display = kind === "DATE" ? (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR") : kind;
    const instr = kind === "DATE" ? ' DATE \\@ "dd/MM/yyyy" ' : ` ${kind} `;
    const { para, offset } = this.selection.focus;
    const p3 = this.model.paragraphs[para];
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p3.runs.length; ri++) {
      const run = p3.runs[ri];
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p3.runs.length) {
        const fieldRun = {
          text: display,
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          field: instr
        };
        if (!run) p3.runs.push(fieldRun);
        else {
          const cut = offset - acc;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props }, ...run.field ? { field: run.field } : {} });
          parts.push(fieldRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props }, ...run.field ? { field: run.field } : {} });
          p3.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    const np = { para, offset: offset + display.length };
    this.selection = { anchor: np, focus: np };
    this.refresh();
  }
  // ───────────────── sumário (TOC) ─────────────────
  /** Gera/atualiza o sumário a partir dos títulos, com páginas do NOSSO
   *  layout e leader pontilhado — o equivalente do F9 do app de referência. */
  updateToc() {
    if (!this.model || this.locked()) return false;
    const tocIdx = this.model.paragraphs.findIndex((p3) => p3.props.tocInstr);
    if (tocIdx < 0) return false;
    this.quietChange = true;
    this.snapshot();
    this.quietChange = false;
    let end = tocIdx + 1;
    while (end < this.model.paragraphs.length && (this.model.paragraphs[end].props.tocEntry || end === tocIdx + 1 && paraLength(this.model.paragraphs[end]) === 0 && !this.model.paragraphs[end].props.styleId)) end++;
    const removed = end - (tocIdx + 1);
    this.model.paragraphs.splice(tocIdx + 1, removed);
    this.shiftAnchors(tocIdx, -removed);
    const instr = this.model.paragraphs[tocIdx].props.tocInstr;
    const range = instr.match(/\\o\s+"(\d)-(\d)"/);
    const minLvl = range ? parseInt(range[1], 10) : 1;
    const maxLvl = range ? parseInt(range[2], 10) : 3;
    const s4 = this.sect();
    const contentW = s4.pageWidthTwips - s4.marginLeftTwips - s4.marginRightTwips;
    const entries = [];
    this.model.paragraphs.forEach((p3, pi) => {
      const m2 = p3.props.styleId?.match(/^(?:Heading|Ttulo)(\d)$/);
      if (!m2) return;
      const lvl = parseInt(m2[1], 10);
      if (lvl < minLvl || lvl > maxLvl) return;
      const page = (this.layoutCache[pi]?.lines[0]?.page ?? 0) + 1;
      const text = paraText(p3).replace(/[\f\n]/g, "").trim();
      if (!text) return;
      entries.push({
        runs: [{
          text: `${text}	${page}`,
          props: { ...DEFAULT_RUN_PROPS, link: `#para:${pi}`, color: lvl === 1 ? void 0 : "444444" }
        }],
        props: {
          tocEntry: true,
          indentLeftTwips: (lvl - 1) * 220 || void 0,
          spaceAfterTwips: 40,
          tabStops: [{ posTwips: contentW, align: "right", leader: "dot" }]
        }
      });
    });
    this.model.paragraphs.splice(tocIdx + 1, 0, ...entries);
    this.shiftAnchors(tocIdx, entries.length);
    this.refresh();
    return true;
  }
  /** Navega para um destino interno: "#para:N" ou "#bookmark". */
  navigateTo(link) {
    if (!link.startsWith("#")) return false;
    let paraIdx = -1;
    const pm = link.match(/^#para:(\d+)$/);
    if (pm) paraIdx = parseInt(pm[1], 10);
    else {
      const blockIdx = this.fullDoc?.bookmarks.get(link.slice(1));
      if (blockIdx !== void 0 && this.fullDoc) {
        let count = 0;
        for (let b5 = 0; b5 < blockIdx && b5 < this.fullDoc.blocks.length; b5++) {
          if (this.fullDoc.blocks[b5].type === "paragraph") count++;
        }
        paraIdx = count;
      }
    }
    const line = this.layoutCache[paraIdx]?.lines[0];
    if (!line) return false;
    const canvas = this.canvases[line.page];
    if (!canvas) return false;
    this.animateScrollTo(Math.max(0, canvas.offsetTop + line.yTwips * PX_PER_TWIP * this.zoom - 60));
    return true;
  }
  // ───────────────── comentários (anotações) ─────────────────
  getComments() {
    return this.fullDoc?.comments ?? [];
  }
  /**
   * Posição CSS-pixel (top-left + altura) da PRIMEIRA linha que carrega este
   * comentário, no espaço de scroll do editor (somando canvas.offsetTop ao
   * y da linha). Permite à camada DOM posicionar cards "inline" alinhados ao
   * trecho anotado (gap do app de referência: comentários na margem como o Google Docs).
   */
  commentAnchorPx(id) {
    if (!this.model) return null;
    const scale = PX_PER_TWIP * this.zoom;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      const para = this.model.paragraphs[pi];
      const has = para.runs.some((r6) => r6.props.commentIds?.includes(id));
      if (!has) continue;
      const line = this.layoutCache[pi]?.lines[0];
      if (!line) return null;
      const canvas = this.canvases[line.page];
      if (!canvas) return null;
      return {
        topPx: canvas.offsetTop + line.yTwips * scale,
        heightPx: line.heightTwips * scale,
        page: line.page
      };
    }
    for (const tl of this.tableLayouts) {
      const hit = this.findCommentRowInTable(tl.table, id);
      if (!hit) continue;
      const canvas = this.canvases[tl.page];
      if (!canvas) return null;
      const cellTopRel = tl.rowYs[hit.row] ?? 0;
      const cellHeightTwips = (tl.rowYs[hit.row + 1] ?? tl.heightTwips) - cellTopRel;
      const cellTopAbs = tl.yTwips + cellTopRel;
      return {
        topPx: canvas.offsetTop + cellTopAbs * scale,
        heightPx: cellHeightTwips * scale,
        page: tl.page
      };
    }
    return null;
  }
  /** Acha a 1ª linha (e coluna, p/ debug) de uma tabela onde algum run carrega o commentId. */
  findCommentRowInTable(table, id) {
    for (let ri = 0; ri < table.rows.length; ri++) {
      const row = table.rows[ri];
      for (let ci = 0; ci < row.cells.length; ci++) {
        const cell = row.cells[ci];
        if (cell.paragraphs.some((p3) => p3.runs.some((r6) => r6.props.commentIds?.includes(id)))) {
          return { row: ri, col: ci };
        }
        for (const nt of cell.tables) {
          const nested = this.findCommentRowInTable(nt, id);
          if (nested) return { row: ri, col: ci };
        }
      }
    }
    return null;
  }
  /** Comenta a seleção atual. Retorna o id (ou null sem seleção). */
  addComment(text, author = "You") {
    if (!this.model || !this.hasSelection() || !text.trim() || this.locked()) return null;
    if (!this.fullDoc) {
      this.fullDoc = {
        blocks: [],
        sections: [],
        footnotes: /* @__PURE__ */ new Map(),
        endnotes: /* @__PURE__ */ new Map(),
        comments: [],
        styles: /* @__PURE__ */ new Map(),
        bookmarks: /* @__PURE__ */ new Map()
      };
    }
    this.snapshot();
    const id = this.fullDoc.comments.reduce((m2, c4) => Math.max(m2, c4.id), -1) + 1;
    applyRunProps(this.model, this.range(), { commentIds: [id] });
    this.fullDoc.comments.push({ id, author, text: text.trim() });
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-comments-changed"));
    return id;
  }
  removeComment(id) {
    if (!this.fullDoc || !this.model) return;
    this.snapshot();
    this.fullDoc.comments = this.fullDoc.comments.filter((c4) => c4.id !== id);
    for (const p3 of this.model.paragraphs) {
      for (const run of p3.runs) {
        if (run.props.commentIds) {
          run.props.commentIds = run.props.commentIds.filter((i7) => i7 !== id);
          if (run.props.commentIds.length === 0) delete run.props.commentIds;
        }
      }
    }
    this.refresh();
    this.dispatchEvent(new CustomEvent("uw-comments-changed"));
  }
  /** Seleciona e rola até o intervalo do comentário. */
  goToComment(id) {
    if (!this.model) return;
    for (let pi = 0; pi < this.model.paragraphs.length; pi++) {
      let acc = 0;
      for (const run of this.model.paragraphs[pi].runs) {
        if (run.props.commentIds?.includes(id)) {
          this.selection = {
            anchor: { para: pi, offset: acc },
            focus: { para: pi, offset: acc + run.text.length }
          };
          this.refresh();
          this.navigateTo(`#para:${pi}`);
          return;
        }
        acc += run.text.length;
      }
    }
  }
  selectAll() {
    if (!this.model) return;
    const lastP = this.model.paragraphs.length - 1;
    this.selection = {
      anchor: { para: 0, offset: 0 },
      focus: { para: lastP, offset: paraLength(this.model.paragraphs[lastP]) }
    };
    this.refresh();
  }
  // imagens
  bitmaps = /* @__PURE__ */ new WeakMap();
  bitmapFor(img) {
    const cached = this.bitmaps.get(img);
    if (cached === "loading") return null;
    if (cached) return cached;
    this.bitmaps.set(img, "loading");
    if (img.svg) {
      this.rasterizeSvg(img);
      return null;
    }
    const copy = new Uint8Array(img.data);
    void createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === "jpg" ? "jpeg" : img.ext}` })).then((bmp) => {
      this.bitmaps.set(img, bmp);
      this.paint();
    }).catch(() => this.bitmaps.set(img, void 0));
    return null;
  }
  /** Rasteriza um SVG (asvg:svgBlip) num bitmap com supersampling, para o
   *  desenho ficar nítido no zoom/DPI do editor — como o vetor do Word. */
  rasterizeSvg(img) {
    const text = new TextDecoder().decode(img.svg);
    const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
    const el = new Image();
    el.onload = () => {
      try {
        const SS = 3;
        const wPx = Math.min(4096, Math.max(1, Math.round((img.widthTwips ?? el.width) * PX_PER_TWIP * SS)));
        const hPx = Math.min(4096, Math.max(1, Math.round((img.heightTwips ?? el.height) * PX_PER_TWIP * SS)));
        const oc = document.createElement("canvas");
        oc.width = wPx;
        oc.height = hPx;
        const octx = oc.getContext("2d");
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = "high";
        octx.drawImage(el, 0, 0, wPx, hPx);
        void createImageBitmap(oc).then((bmp) => {
          this.bitmaps.set(img, bmp);
          this.paint();
        }).catch(() => this.bitmaps.set(img, void 0));
      } catch {
        this.bitmaps.set(img, void 0);
      }
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      this.bitmaps.set(img, void 0);
      URL.revokeObjectURL(url);
    };
    el.src = url;
  }
  /** Insere imagem no caret. Dimensões naturais a 96dpi, limitada à coluna. */
  async insertImage(data, ext) {
    if (!this.model || this.locked()) return;
    const copy = new Uint8Array(data);
    const bmp = await createImageBitmap(
      new Blob([copy.buffer], { type: `image/${ext === "jpg" ? "jpeg" : ext}` })
    );
    let w2 = bmp.width * 15;
    let h3 = bmp.height * 15;
    const maxW = this.contentWidthTwips();
    if (w2 > maxW) {
      h3 = h3 * maxW / w2;
      w2 = maxW;
    }
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    }
    const { para, offset } = this.selection.focus;
    const p3 = this.model.paragraphs[para];
    let acc = 0;
    let inserted = false;
    for (let ri = 0; ri <= p3.runs.length; ri++) {
      const run = p3.runs[ri];
      const rs = acc;
      const re = acc + (run?.text.length ?? 0);
      if (offset <= re || ri === p3.runs.length) {
        const imageRun = {
          text: "\uFFFC",
          props: run ? { ...run.props } : { ...DEFAULT_RUN_PROPS },
          image: { data: copy, ext, widthTwips: w2, heightTwips: h3 }
        };
        if (!run) {
          p3.runs.push(imageRun);
        } else {
          const cut = offset - rs;
          const parts = [];
          if (run.text.slice(0, cut)) parts.push({ text: run.text.slice(0, cut), props: { ...run.props } });
          parts.push(imageRun);
          if (run.text.slice(cut)) parts.push({ text: run.text.slice(cut), props: { ...run.props } });
          p3.runs.splice(ri, 1, ...parts);
        }
        inserted = true;
        break;
      }
      acc = re;
    }
    if (!inserted) return;
    this.selection = { anchor: { para, offset: offset + 1 }, focus: { para, offset: offset + 1 } };
    this.refresh();
  }
  saveDocx() {
    if (!this.model) throw new Error("no document");
    if (this.hfEdit) this.exitHeaderFooter();
    const pkg = this.pkg ?? DocxPackage.empty();
    const hfParts = [];
    const seenPath = /* @__PURE__ */ new Set();
    for (const section of this.fullDoc?.sections ?? []) {
      for (const [kind, refs, set] of [
        ["header", section.headerRefs, section.headers],
        ["footer", section.footerRefs, section.footers]
      ]) {
        for (const ref of refs) {
          if (seenPath.has(ref.path)) continue;
          const paragraphs = set[ref.type];
          if (!paragraphs) continue;
          seenPath.add(ref.path);
          hfParts.push({
            kind,
            type: ref.type,
            rid: ref.rid,
            path: ref.path,
            paragraphs,
            dirty: this.dirtyHf.has(ref.path)
          });
        }
      }
    }
    const lastSec = this.fullDoc?.sections[this.fullDoc.sections.length - 1];
    const bodyParts = lastSec ? hfParts.filter((h3) => [...lastSec.headerRefs, ...lastSec.footerRefs].some((r6) => r6.path === h3.path)) : hfParts;
    const blocks = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a3 of this.tableAnchors) {
        if (a3.beforePara === pi) blocks.push(a3.table);
      }
      blocks.push({ type: "paragraph", paragraph });
    });
    for (const a3 of this.tableAnchors) {
      if (a3.beforePara >= this.model.paragraphs.length) blocks.push(a3.table);
    }
    const saveModel = lastSec ? { paragraphs: this.model.paragraphs, sectPr: lastSec.sectPr } : this.model;
    writeDocument(pkg, saveModel, hfParts, {
      comments: this.fullDoc?.comments?.length ? this.fullDoc.comments : void 0,
      bodySectRefs: bodyParts.map((h3) => ({ kind: h3.kind, type: h3.type, rid: h3.rid })),
      blocks: this.tableAnchors.length ? blocks : void 0
    });
    return pkg.save();
  }
  /** Monta o documento de exportação a partir do estado VIVO do editor. */
  buildExportDoc(title, imageDataUris) {
    return {
      title,
      paragraphs: this.model?.paragraphs.map((paragraph) => this.withPluginFallback(paragraph)) ?? [],
      tableAnchors: this.tableAnchors,
      comments: this.fullDoc?.comments ?? [],
      footnotes: this.fullDoc?.footnotes,
      endnotes: this.fullDoc?.endnotes,
      sectPr: this.model?.sectPr,
      imageDataUris
    };
  }
  withPluginFallback(paragraph) {
    return {
      props: paragraph.props,
      runs: paragraph.runs.map((run) => run.custom ? {
        text: run.custom.fallbackText,
        props: run.props
      } : run)
    };
  }
  /**
   * Pré-comprime as imagens do documento para inclusão em HTML/Markdown:
   * decode → downsample (lado max ~1200px) → JPEG quality 0.78 → data URI.
   * Imagens muito pequenas (≤ MAX_DIMENSION CSS px) ficam só re-encodadas
   * sem resize; PNGs minúsculos (< 32KB) ficam intactos. O resultado é um
   * WeakMap consumido pelos exportadores via `resolveImageUri`.
   *
   * Sem isso, fotos do .docx (PNGs grandes) gerariam data URIs gigantescos
   * (catálogo: 72MB) que muitos viewers de Markdown não renderizam.
   */
  async compressImagesForExport() {
    const MAX_DIM = 1200;
    const QUALITY = 0.78;
    const PASSTHROUGH_KB = 32;
    const cache = /* @__PURE__ */ new WeakMap();
    const imgs = this.collectImages();
    const seen = /* @__PURE__ */ new Set();
    const tasks = imgs.map(async (img) => {
      if (seen.has(img)) return;
      seen.add(img);
      if (img.data.byteLength <= PASSTHROUGH_KB * 1024) {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
        return;
      }
      try {
        const mime = this.mimeFor(img.ext);
        const blob = new Blob([img.data.slice().buffer], { type: mime });
        const bmp = await createImageBitmap(blob);
        const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
        const w2 = Math.max(1, Math.round(bmp.width * scale));
        const h3 = Math.max(1, Math.round(bmp.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w2;
        canvas.height = h3;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w2, h3);
        ctx.drawImage(bmp, 0, 0, w2, h3);
        bmp.close?.();
        const dataUri2 = await new Promise((resolve, reject) => {
          canvas.toBlob((b5) => {
            if (!b5) {
              reject(new Error("toBlob retornou null"));
              return;
            }
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(b5);
          }, "image/jpeg", QUALITY);
        });
        cache.set(img, dataUri2);
      } catch {
        cache.set(img, `data:${this.mimeFor(img.ext)};base64,${this.toBase64(img.data)}`);
      }
    });
    await Promise.all(tasks);
    return cache;
  }
  mimeFor(ext) {
    const e8 = ext.toLowerCase();
    if (e8 === "jpg" || e8 === "jpeg") return "image/jpeg";
    if (e8 === "png") return "image/png";
    if (e8 === "gif") return "image/gif";
    if (e8 === "bmp") return "image/bmp";
    if (e8 === "webp") return "image/webp";
    return `image/${e8}`;
  }
  toBase64(bytes) {
    let bin = "";
    const chunk = 32768;
    for (let i7 = 0; i7 < bytes.length; i7 += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i7, i7 + chunk));
    }
    return btoa(bin);
  }
  /** Exporta HTML semântico e fluido (web-first; reflui, não pagina). */
  async exportHtml(title, opts = {}) {
    const cache = opts.images === "omit" ? void 0 : await this.compressImagesForExport();
    return toHtml(this.buildExportDoc(title, cache), { title, images: opts.images });
  }
  /** Exporta Markdown (GitHub Flavored). */
  async exportMarkdown(title, opts = {}) {
    const cache = opts.images === "omit" ? void 0 : await this.compressImagesForExport();
    return toMarkdown(this.buildExportDoc(title, cache), { title, images: opts.images });
  }
  /**
   * Exporta ODT (OpenDocument Text) p/ LibreOffice/OpenOffice. Reconstrói um
   * FullDocument leve a partir do estado VIVO do editor (model + tableAnchors)
   * — passa pelo writeOdt do @universal-office/odf.
   */
  exportOdt(opts = {}) {
    if (!this.model) throw new Error("document not loaded");
    const blocks = [];
    this.model.paragraphs.forEach((paragraph, pi) => {
      for (const a3 of this.tableAnchors) {
        if (a3.beforePara === pi) blocks.push(a3.table);
      }
      blocks.push({ type: "paragraph", paragraph: this.withPluginFallback(paragraph) });
    });
    for (const a3 of this.tableAnchors) {
      if (a3.beforePara >= this.model.paragraphs.length) blocks.push(a3.table);
    }
    const fd2 = {
      blocks,
      sections: [{
        sectPr: this.model.sectPr,
        blockStart: 0,
        blockEnd: blocks.length,
        headers: {},
        footers: {},
        headerRefs: [],
        footerRefs: []
      }],
      footnotes: this.fullDoc?.footnotes ?? /* @__PURE__ */ new Map(),
      endnotes: this.fullDoc?.endnotes ?? /* @__PURE__ */ new Map(),
      comments: this.fullDoc?.comments ?? [],
      styles: this.fullDoc?.styles ?? /* @__PURE__ */ new Map(),
      bookmarks: this.fullDoc?.bookmarks ?? /* @__PURE__ */ new Map()
    };
    return writeOdt(fd2, { images: opts.images });
  }
  focusEditor() {
    this.input.focus({ preventScroll: true });
  }
  /** True when a pointer event originated in the built-in top/bottom bars.
   *  They live inside the host shadow, so their events bubble up to the
   *  document-level pointer handlers — without this guard a click on a
   *  toolbar control would hit-test the canvas behind the (sticky) bar,
   *  collapse the selection, and steal focus (closing native dropdowns).
   *  composedPath() is required because the event target is retargeted to
   *  the host by the time it reaches these listeners. */
  eventInChrome(e8) {
    const path = e8.composedPath();
    return path.includes(this.topbarEl) || path.includes(this.bottombarEl);
  }
  /** Página atualmente visível (centro do viewport), 1-based. */
  currentPage() {
    const center = this.scrollTop + (this.clientHeight || 900) / 2;
    let best = 0;
    let bestDist = Infinity;
    this.canvases.forEach((c4, i7) => {
      const mid = c4.offsetTop + c4.offsetHeight / 2;
      const d3 = Math.abs(mid - center);
      if (d3 < bestDist) {
        bestDist = d3;
        best = i7;
      }
    });
    return Math.min(best + 1, this.pageCount);
  }
  /** Estatísticas para a barra de status (como a do app de referência). */
  stats() {
    let words = 0, chars = 0;
    if (this.model) {
      for (const p3 of this.model.paragraphs) {
        const t5 = this.plainTextSlice(p3, 0, paraLength(p3));
        chars += t5.length;
        words += (t5.match(/\S+/g) ?? []).length;
      }
    }
    return {
      pages: this.pageCount,
      page: this.currentPage(),
      words,
      chars,
      paragraph: this.selection.focus.para + 1
    };
  }
  /** Imprime: abre janela com as páginas como imagens (visão de impressão). */
  print() {
    const wasView = this.view;
    if (wasView !== "print") this.setView("print");
    const imgs = this.canvases.map((c4) => `<img src="${c4.toDataURL("image/png")}" style="width:100%;page-break-after:always"/>`);
    if (wasView !== "print") this.setView(wasView);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><title>Write \u2014 imprimir</title><body style="margin:0">${imgs.join("")}</body>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
  }
  // ───────────────────────── edição ─────────────────────────
  currentProps() {
    if (!this.model) return { ...DEFAULT_RUN_PROPS };
    return propsAt(this.model, this.selection.focus);
  }
  hasSelection() {
    return comparePos(this.selection.anchor, this.selection.focus) !== 0;
  }
  range() {
    return { start: this.selection.anchor, end: this.selection.focus };
  }
  formatRuns(patch) {
    if (!this.model || this.locked()) return;
    if (this.hasSelection()) {
      this.snapshot();
      applyRunProps(this.model, this.range(), patch);
      this.refresh();
    } else {
      this.pendingProps = { ...this.pendingProps ?? this.currentProps(), ...patch };
      this.onSelectionChange?.();
      this.chromeSync?.();
    }
  }
  formatPara(patch) {
    if (!this.model || this.locked()) return;
    this.snapshot();
    applyParaProps(this.model, this.range(), patch);
    this.refresh();
  }
  // imagens são imutáveis: o snapshot guarda só um índice no pool em vez
  // dos bytes (senão JSON.stringify estoura com docs de 50MB de mídia)
  imgPool = [];
  imgPoolIdx = /* @__PURE__ */ new WeakMap();
  stringifyState() {
    return JSON.stringify({
      m: this.model,
      s: this.selection,
      // sectPrs das seções (margens/orientação) — fora do model, mas undoáveis
      sect: this.sectionStarts.map((ss) => ({ ...ss.section.sectPr }))
    }, (key, value) => {
      if (value instanceof Uint8Array) {
        let idx = this.imgPoolIdx.get(value);
        if (idx === void 0) {
          idx = this.imgPool.length;
          this.imgPool.push(value);
          this.imgPoolIdx.set(value, idx);
        }
        return { __imgPool: idx };
      }
      return value;
    });
  }
  parseState(json) {
    return JSON.parse(
      json,
      (key, value) => value && typeof value === "object" && "__imgPool" in value ? this.imgPool[value.__imgPool] : value
    );
  }
  /** Mudanças de campo (Atualizar Campos) não contam como edição p/ autosave. */
  quietChange = false;
  snapshot() {
    if (!this.model) return;
    if (this.hfEdit) this.dirtyHf.add(this.hfEdit.path);
    this.undoStack.push(this.stringifyState());
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack.length = 0;
    if (!this.quietChange) {
      this.dispatchEvent(new CustomEvent("uw-change"));
    }
  }
  popHistory(from, to) {
    if (!this.model || from.length === 0) return;
    to.push(this.stringifyState());
    const state = this.parseState(from.pop());
    this.model = state.m;
    this.selection = state.s;
    if (state.sect) {
      state.sect.forEach((sp, i7) => {
        const target = this.sectionStarts[i7]?.section.sectPr;
        if (target) Object.assign(target, sp);
      });
    }
    this.refresh();
  }
  /** deleteRange com ajuste de âncoras de tabela/seção. */
  deleteSelection() {
    const { start, end } = normalizeRange(this.range());
    const delta = end.para - start.para;
    const pos = deleteRange(this.model, this.range());
    if (delta > 0) this.shiftAnchors(start.para, -delta);
    return pos;
  }
  type(text) {
    if (!this.model || this.locked()) return;
    const before = new CustomEvent("uw-before-input", {
      cancelable: true,
      detail: { text }
    });
    if (!this.dispatchEvent(before)) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const props = this.pendingProps ?? void 0;
    const pos = insertText(this.model, this.selection.focus, text, props);
    this.pendingProps = null;
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
    this.dispatchEvent(new CustomEvent("uw-input", { detail: { text } }));
  }
  pressEnter() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos2 = this.deleteSelection();
      this.selection = { anchor: pos2, focus: pos2 };
    }
    const at = this.selection.focus.para;
    const pos = splitParagraph(this.model, this.selection.focus);
    this.shiftAnchors(at, 1);
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
    this.scrollCaretIntoView();
  }
  pressBackspace() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      if (offset > 0) {
        const pos = deleteRange(this.model, {
          start: { para, offset: offset - 1 },
          end: { para, offset }
        });
        this.selection = { anchor: pos, focus: pos };
      } else if (para > 0) {
        const pos = mergeWithPrevious(this.model, para);
        this.shiftAnchors(para - 1, -1);
        this.selection = { anchor: pos, focus: pos };
      } else {
        this.undoStack.pop();
        return;
      }
    }
    this.refresh();
    this.scrollCaretIntoView();
  }
  pressDelete() {
    if (!this.model || this.locked()) return;
    this.snapshot();
    if (this.hasSelection()) {
      const pos = this.deleteSelection();
      this.selection = { anchor: pos, focus: pos };
    } else {
      const { para, offset } = this.selection.focus;
      const len = paraLength(this.model.paragraphs[para]);
      if (offset < len) {
        deleteRange(this.model, { start: { para, offset }, end: { para, offset: offset + 1 } });
      } else if (para < this.model.paragraphs.length - 1) {
        mergeWithPrevious(this.model, para + 1);
      } else {
        this.undoStack.pop();
        return;
      }
    }
    this.refresh();
  }
  /** Próxima fronteira de palavra a partir do caret. */
  moveWord(dir, extend) {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const text = paraText(this.model.paragraphs[para]);
    if (dir === 1) {
      if (offset >= text.length) {
        if (para < this.model.paragraphs.length - 1) {
          para++;
          offset = 0;
        }
      } else {
        while (offset < text.length && /\S/.test(text[offset])) offset++;
        while (offset < text.length && /\s/.test(text[offset])) offset++;
      }
    } else {
      if (offset === 0) {
        if (para > 0) {
          para--;
          offset = paraLength(this.model.paragraphs[para]);
        }
      } else {
        while (offset > 0 && /\s/.test(text[offset - 1])) offset--;
        while (offset > 0 && /\S/.test(text[offset - 1])) offset--;
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.refresh();
    this.scrollCaretIntoView();
  }
  deleteWord(dir) {
    if (!this.model || this.locked()) return;
    if (!this.hasSelection()) {
      const before = { ...this.selection.focus };
      this.moveWord(dir, false);
      const after = { ...this.selection.focus };
      if (comparePos(before, after) === 0) return;
      this.selection = { anchor: before, focus: after };
    }
    this.snapshot();
    const pos = deleteRange(this.model, this.range());
    this.selection = { anchor: pos, focus: pos };
    this.refresh();
  }
  moveCaret(dir, extend) {
    if (!this.model) return;
    let { para, offset } = this.selection.focus;
    const len = (i7) => paraLength(this.model.paragraphs[i7]);
    if (dir === "left") {
      if (offset > 0) offset--;
      else if (para > 0) {
        para--;
        offset = len(para);
      }
    } else if (dir === "right") {
      if (offset < len(para)) offset++;
      else if (para < this.model.paragraphs.length - 1) {
        para++;
        offset = 0;
      }
    } else if (dir === "home" || dir === "end") {
      const line = this.lineOf({ para, offset });
      if (line) offset = dir === "home" ? line.rich.start : line.rich.end;
    } else {
      const line = this.lineOf({ para, offset });
      if (line) {
        const x3 = this.caretX({ para, offset }, line);
        const all = this.allLines();
        const idx = all.indexOf(line);
        const target = all[idx + (dir === "down" ? 1 : -1)];
        if (target) {
          const hit = this.hitLineX(target, x3);
          para = target.para;
          offset = hit;
        }
      }
    }
    const focus = { para, offset };
    this.selection = extend ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
    this.pendingProps = null;
    this.refresh();
    this.scrollCaretIntoView();
  }
  // ───────────────────────── eventos ─────────────────────────
  bindEvents() {
    this.addEventListener("wheel", (e8) => {
      if (this.view === "read" && !e8.ctrlKey) {
        e8.preventDefault();
        if (Math.abs(e8.deltaY) < 4 || this.readWheelLock) return;
        this.readWheelLock = true;
        setTimeout(() => {
          this.readWheelLock = false;
        }, 450);
        this.nudgeRead(e8.deltaY > 0 ? 1 : -1);
        return;
      }
      if (!e8.ctrlKey) return;
      e8.preventDefault();
      const factor = e8.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.round(this.zoom * factor * 100) / 100;
      this.setZoom(next, e8.clientY - this.getBoundingClientRect().top);
    }, { passive: false });
    let touchY0 = 0, touchX0 = 0;
    this.addEventListener("touchstart", (e8) => {
      if (this.view !== "read") return;
      touchY0 = e8.touches[0].clientY;
      touchX0 = e8.touches[0].clientX;
    }, { passive: true });
    this.addEventListener("touchend", (e8) => {
      if (this.view !== "read") return;
      const dy = e8.changedTouches[0].clientY - touchY0;
      const dx = e8.changedTouches[0].clientX - touchX0;
      const horiz = Math.abs(dx) > Math.abs(dy);
      const d3 = horiz ? dx : dy;
      if (Math.abs(d3) < 40) return;
      this.nudgeRead(d3 < 0 ? 1 : -1);
    }, { passive: true });
    this.addEventListener("keydown", (e8) => {
      if (this.view !== "read") return;
      if (e8.key === "ArrowRight" || e8.key === "PageDown" || e8.key === " ") {
        e8.preventDefault();
        this.nudgeRead(1);
      } else if (e8.key === "ArrowLeft" || e8.key === "PageUp") {
        e8.preventDefault();
        this.nudgeRead(-1);
      }
    });
    this.addEventListener("scroll", () => {
      if (this.scrollPaintQueued) return;
      this.scrollPaintQueued = true;
      requestAnimationFrame(() => {
        this.scrollPaintQueued = false;
        this.ensureVisiblePainted();
      });
    });
    this.addEventListener("mousedown", (e8) => {
      if (this.eventInChrome(e8)) return;
      const hit = this.hitTest(e8);
      if (!hit) return;
      if (e8.button !== 0) {
        if (!this.posInSelection(hit)) {
          this.selection = { anchor: hit, focus: hit };
          this.pendingProps = null;
          this.refresh();
        }
        this.focusEditor();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (e8.ctrlKey && this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset <= end && run.props.link) {
            if (/^https?:/.test(run.props.link)) {
              window.open(run.props.link, "_blank", "noopener");
              return;
            }
            if (this.navigateTo(run.props.link)) return;
          }
          acc = end;
        }
      }
      if (this.model) {
        const para = this.model.paragraphs[hit.para];
        let acc = 0;
        for (const run of para?.runs ?? []) {
          const end = acc + run.text.length;
          if (hit.offset >= acc && hit.offset < end && run.props.commentIds?.length) {
            this.dispatchEvent(new CustomEvent("uw-comment-click", {
              detail: { ids: run.props.commentIds }
            }));
            break;
          }
          acc = end;
        }
      }
      this.focusEditor();
      e8.preventDefault();
      const extend = e8.shiftKey;
      this.selection = extend ? { anchor: this.selection.anchor, focus: hit } : { anchor: hit, focus: hit };
      this.pendingProps = null;
      this.refresh();
      const move = (ev) => {
        const h3 = this.hitTest(ev);
        if (h3) {
          this.selection.focus = h3;
          this.refresh();
        }
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        if (this.painterProps) this.applyPainter();
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      if (e8.detail === 3 && this.model) {
        const len = paraLength(this.model.paragraphs[hit.para]);
        this.selection = {
          anchor: { para: hit.para, offset: 0 },
          focus: { para: hit.para, offset: len }
        };
        this.refresh();
      }
    });
    this.input.addEventListener("paste", (e8) => {
      e8.preventDefault();
      const text = e8.clipboardData?.getData("text/plain") ?? "";
      const plain = this.plainPasteNext;
      this.plainPasteNext = false;
      if (!plain && this.richClip && this.richClip.text === text.replace(/\r\n?/g, "\n")) this.insertRich(this.richClip);
      else if (text) this.pasteText(text);
      this.onSelectionChange?.();
      this.chromeSync?.();
    });
    this.addEventListener("mousemove", (e8) => {
      if (this.view !== "print" || this.hfEdit || !this.model) return;
      const zone = this.hfZoneAt(e8);
      const kind = zone?.kind ?? null;
      const wantHint = kind !== null && !this.protectedMode;
      this.style.cursor = wantHint ? "pointer" : "";
      if (kind !== this.lastHoverHf) {
        this.lastHoverHf = kind;
        this.dispatchEvent(new CustomEvent("uw-hfhover", {
          detail: { kind: wantHint ? kind : null, x: e8.clientX, y: e8.clientY }
        }));
      }
    });
    this.addEventListener("mouseleave", () => {
      if (this.lastHoverHf !== null) {
        this.lastHoverHf = null;
        this.dispatchEvent(new CustomEvent("uw-hfhover", { detail: { kind: null } }));
      }
    });
    this.addEventListener("dblclick", (e8) => {
      if (this.eventInChrome(e8)) return;
      if (this.view === "print" && !this.hfEdit && this.model) {
        const zone = this.hfZoneAt(e8);
        if (zone) {
          if (this.protectedMode) {
            this.dispatchEvent(new CustomEvent("uw-blocked", { detail: { reason: "protected" } }));
            return;
          }
          this.enterHeaderFooter(zone.kind, zone.page);
          return;
        }
      }
      if (this.hfEdit && !this.hfClickInActiveBand(e8)) {
        this.exitHeaderFooter();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      const hit = this.hitTest(e8);
      if (!hit || !this.model) return;
      const text = this.model.paragraphs[hit.para].runs.map((r6) => r6.text).join("");
      let a3 = hit.offset, b5 = hit.offset;
      while (a3 > 0 && !/[\s]/.test(text[a3 - 1])) a3--;
      while (b5 < text.length && !/[\s]/.test(text[b5])) b5++;
      this.selection = { anchor: { para: hit.para, offset: a3 }, focus: { para: hit.para, offset: b5 } };
      this.refresh();
    });
    let composing = false;
    this.input.addEventListener("compositionstart", () => {
      composing = true;
    });
    this.input.addEventListener("compositionend", (e8) => {
      composing = false;
      this.input.value = "";
      if (e8.data) this.type(e8.data);
    });
    this.input.addEventListener("input", () => {
      if (composing) return;
      const v2 = this.input.value;
      if (v2) {
        this.type(v2);
        this.input.value = "";
      }
    });
    this.input.addEventListener("keydown", (e8) => {
      const ctrl = e8.ctrlKey || e8.metaKey;
      const k2 = e8.key;
      if (ctrl) {
        if (k2 === "ArrowLeft" || k2 === "ArrowRight") {
          e8.preventDefault();
          this.moveWord(k2 === "ArrowRight" ? 1 : -1, e8.shiftKey);
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
        if (k2 === "Backspace" || k2 === "Delete") {
          e8.preventDefault();
          this.deleteWord(k2 === "Delete" ? 1 : -1);
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
        if (k2.toLowerCase() === "c") {
          e8.preventDefault();
          void this.copy();
          return;
        }
        if (k2.toLowerCase() === "x") {
          e8.preventDefault();
          void this.cut();
          return;
        }
        if (k2.toLowerCase() === "v") {
          this.plainPasteNext = e8.shiftKey;
          return;
        }
        const map = {
          b: () => this.toggleRunProp("bold"),
          i: () => this.toggleRunProp("italic"),
          u: () => this.toggleRunProp("underline"),
          z: () => this.undo(),
          y: () => this.redo(),
          a: () => this.selectAll(),
          e: () => this.setAlignment("center"),
          l: () => this.setAlignment("left"),
          r: () => this.setAlignment("right"),
          j: () => this.setAlignment("both")
        };
        const fn2 = map[k2.toLowerCase()];
        if (fn2) {
          e8.preventDefault();
          fn2();
          this.onSelectionChange?.();
          this.chromeSync?.();
          return;
        }
      }
      if (k2 === "PageDown" || k2 === "PageUp") {
        e8.preventDefault();
        const step = this.clientHeight * 0.9 * (k2 === "PageDown" ? 1 : -1);
        this.scrollTop += step;
        for (let n5 = 0; n5 < 20; n5++) this.moveCaret(k2 === "PageDown" ? "down" : "up", e8.shiftKey);
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (ctrl && (k2 === "Home" || k2 === "End")) {
        e8.preventDefault();
        if (!this.model) return;
        const lastP = this.model.paragraphs.length - 1;
        const focus = k2 === "Home" ? { para: 0, offset: 0 } : { para: lastP, offset: paraLength(this.model.paragraphs[lastP]) };
        this.selection = e8.shiftKey ? { anchor: this.selection.anchor, focus } : { anchor: focus, focus };
        this.refresh();
        this.scrollCaretIntoView();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (k2 === "Tab") {
        e8.preventDefault();
        const para = this.model?.paragraphs[this.selection.focus.para];
        if (para?.props.numbering && this.selection.focus.offset === 0) {
          const lvl = Math.max(0, Math.min(2, para.props.numbering.ilvl + (e8.shiftKey ? -1 : 1)));
          this.formatPara({
            numbering: { ...para.props.numbering, ilvl: lvl },
            indentLeftTwips: 720 * (lvl + 1)
          });
        } else if (!e8.shiftKey) this.type("	");
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      if (k2 === "Escape" && this.hfEdit) {
        e8.preventDefault();
        this.exitHeaderFooter();
        this.onSelectionChange?.();
        this.chromeSync?.();
        return;
      }
      const nav = {
        ArrowLeft: () => this.moveCaret("left", e8.shiftKey),
        ArrowRight: () => this.moveCaret("right", e8.shiftKey),
        ArrowUp: () => this.moveCaret("up", e8.shiftKey),
        ArrowDown: () => this.moveCaret("down", e8.shiftKey),
        Home: () => this.moveCaret("home", e8.shiftKey),
        End: () => this.moveCaret("end", e8.shiftKey),
        // Ctrl+Enter = quebra de página (como no app de referência)
        Enter: () => ctrl ? this.type("\f") : this.pressEnter(),
        Backspace: () => this.pressBackspace(),
        Delete: () => this.pressDelete()
      };
      const fn = nav[k2];
      if (fn) {
        e8.preventDefault();
        fn();
        this.onSelectionChange?.();
        this.chromeSync?.();
      }
    });
  }
  startCaret() {
    window.clearInterval(this.caretTimer);
    this.caretTimer = window.setInterval(() => {
      this.caretVisible = !this.caretVisible;
      this.paint();
    }, 530);
  }
  // ───────────────────────── layout ─────────────────────────
  sect() {
    return this.model.sectPr;
  }
  contentWidthTwips() {
    const s4 = this.sect();
    if (this.view === "web") {
      return Math.max(2e3, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s4.pageWidthTwips - s4.marginLeftTwips - s4.marginRightTwips;
  }
  /** docDefaults do DOCUMENTO (fonte/tamanho/espaçamentos de quem não tem
   *  estilo). Sem documento carregado: defaults do nosso template. */
  docDefaults() {
    return this.fullDoc?.styles.get("docDefaults") ?? { para: {}, run: {} };
  }
  /** Há styles.xml? Então os defaults do WORD valem (after=0, line=240). */
  hasDocStyles() {
    return (this.fullDoc?.styles.size ?? 0) > 0;
  }
  /** Estilos de PARÁGRAFO do documento (id + nome de exibição), para a lista
   *  de estilos da barra. Vazio se não há styles.xml (documento novo). */
  paragraphStyles() {
    const styles9 = this.fullDoc?.styles;
    if (!styles9) return [];
    const out = [];
    styles9.forEach((v2, id) => {
      if (id === "docDefaults") return;
      if (v2.type && v2.type !== "paragraph") return;
      out.push({ id, name: v2.name ?? id });
    });
    out.sort((a3, b5) => a3.name.localeCompare(b5.name));
    return out;
  }
  styleOf(p3) {
    if (!p3.props.styleId) return void 0;
    const docStyle = this.fullDoc?.styles.get(p3.props.styleId);
    if (docStyle) {
      return {
        sizePt: docStyle.run.szHalfPt !== void 0 ? docStyle.run.szHalfPt / 2 : 11,
        bold: docStyle.run.bold ?? false,
        color: docStyle.run.color,
        spaceBeforeTwips: docStyle.para.spaceBeforeTwips ?? 0,
        italic: docStyle.run.italic ?? false,
        alignment: docStyle.para.alignment,
        spaceAfterTwips: docStyle.para.spaceAfterTwips,
        lineTwentieths: docStyle.para.lineTwentieths,
        fontAscii: docStyle.run.fontAscii,
        underline: docStyle.run.underline,
        strike: docStyle.run.strike,
        allCaps: docStyle.run.allCaps,
        smallCaps: docStyle.run.smallCaps,
        borders: docStyle.para.borders,
        shadingHex: docStyle.para.shadingHex,
        indentLeftTwips: docStyle.para.indentLeftTwips,
        indentRightTwips: docStyle.para.indentRightTwips
      };
    }
    return STYLES[p3.props.styleId];
  }
  buildSpans(p3, opts) {
    const st = this.styleOf(p3);
    const spans = p3.runs.map((r6) => {
      const dd = this.docDefaults();
      const base = r6.props.szHalfPt !== void 0 ? r6.props.szHalfPt / 2 : st?.sizePt ?? (dd.run.szHalfPt !== void 0 ? dd.run.szHalfPt / 2 : 11);
      const size = r6.props.vertAlign ? base * 0.65 : base;
      const bold = r6.props.bold || (st?.bold ?? false);
      const italic = r6.props.italic || (st?.italic ?? false);
      const variant = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
      const family = r6.props.fontAscii ?? st?.fontAscii ?? dd.run.fontAscii;
      if (r6.textbox) {
        return { text: "", family, variant, sizePt: size };
      }
      if (r6.image) {
        if (opts?.skipFloating && r6.image.floating) {
          return { text: "", family, variant, sizePt: size };
        }
        return {
          text: r6.text || "\uFFFC",
          family,
          variant,
          sizePt: size,
          imageWidthTwips: r6.image.widthTwips,
          imageHeightTwips: r6.image.heightTwips
        };
      }
      if (r6.custom) {
        const font = this.fonts.resolve(family, variant);
        const measureText = (text2) => {
          const chars = Array.from(text2);
          let width = 0;
          for (let i7 = 0; i7 < chars.length; i7++) {
            const cp = chars[i7].codePointAt(0);
            width += font.advanceTwips(cp, size);
            const next = chars[i7 + 1]?.codePointAt(0);
            if (next !== void 0) width += font.kernTwips(cp, next, size);
          }
          return width;
        };
        const renderer = this.inlineRenderers.get(r6.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(r6.custom.data) ?? r6.custom.fallbackText;
        const measured = renderer?.measure?.({
          data: r6.custom.data,
          fallbackText,
          props: r6.props,
          sizePt: size,
          measureText
        });
        return {
          text: "\uFFFC",
          family,
          variant,
          sizePt: size,
          imageWidthTwips: Math.max(1, measured?.widthTwips ?? measureText(fallbackText)),
          imageHeightTwips: measured?.heightTwips ?? size * TWIPS_PER_PT
        };
      }
      let text = r6.text;
      if (r6.props.allCaps || st?.allCaps || r6.props.smallCaps || st?.smallCaps) text = text.toUpperCase();
      return {
        text,
        family,
        variant,
        sizePt: size,
        letterSpacingTwips: r6.props.charSpacingTwips
      };
    });
    if (spans.length === 0) spans.push({ text: "", variant: "regular", sizePt: st?.sizePt ?? 11 });
    return spans;
  }
  /** Seção vigente para o parágrafo pi. */
  sectionIndexForPara(pi) {
    let idx = 0;
    for (let i7 = 0; i7 < this.sectionStarts.length; i7++) {
      if (pi >= this.sectionStarts[i7].startPara) idx = i7;
    }
    return idx;
  }
  sectPrAt(sectionIdx) {
    const s4 = this.sectionStarts[sectionIdx]?.section.sectPr;
    return s4 ?? this.model.sectPr;
  }
  /** Layout do modo de edição de HF: PRESERVA a paginação do corpo (mesmo
   *  nº de páginas/panes) e posiciona o HF apenas na banda da página ativa. */
  layoutHfEdit() {
    const sb = this.savedBody;
    this.pageCount = sb.pageCount;
    this.pageSections = sb.pageSections;
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    const sp = this.sectPrForSavedPage(this.hfActivePage);
    const marginL = sp.marginLeftTwips;
    const contentW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
    const topY = this.hfEdit.kind === "header" ? 720 : sp.pageHeightTwips - 720;
    this.hfRegionTopTwips = topY;
    const font = this.fonts.resolve(void 0, "regular");
    let y3 = topY;
    this.model.paragraphs.forEach((p3, pi) => {
      const spans = this.buildSpans(p3);
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts, {
        availableTwips: contentW,
        tabStops: p3.props.tabStops?.length ? p3.props.tabStops : [
          { posTwips: contentW / 2, align: "center" },
          { posTwips: contentW, align: "right" }
        ]
      });
      const spanCharStart = [];
      let acc = 0;
      for (const span of spans) {
        spanCharStart.push(acc);
        acc += span.text.length;
      }
      const laid = [];
      lines.forEach((rich) => {
        const sizeForHeight = Math.max(rich.maxSizePt, 1);
        const lh = lineHeightPt(font, sizeForHeight, { line: 259, lineRule: "auto" }) * TWIPS_PER_PT;
        const asc = font.metrics.ascender / font.metrics.unitsPerEm * deviceEmPt(sizeForHeight) * TWIPS_PER_PT;
        let x3 = marginL;
        let justifyExtra = 0;
        const align = p3.props.alignment;
        if (align === "center") x3 += (contentW - rich.widthTwips) / 2;
        else if (align === "right") x3 += contentW - rich.widthTwips;
        laid.push({
          para: pi,
          rich,
          page: this.hfActivePage,
          xTwips: x3,
          yTwips: y3,
          heightTwips: lh,
          baselineTwips: y3 + asc,
          justifyExtraPerSpace: justifyExtra
        });
        y3 += lh;
      });
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
  }
  /** sectPr da página i segundo a estrutura SALVA do corpo (modo HF edit). */
  sectPrForSavedPage(pageIdx) {
    const sb = this.savedBody;
    const sIdx = sb?.pageSections[pageIdx] ?? 0;
    return sb?.sectionStarts[sIdx]?.section.sectPr ?? this.sect();
  }
  layout() {
    if (!this.model || !this.fonts) return;
    if (this.hfEdit && this.view === "print" && this.savedBody) {
      this.layoutHfEdit();
      return;
    }
    const isPaged = this.view === "print" || this.view === "read";
    let sectIdx = 0;
    let s4 = isPaged && this.sectionStarts.length ? this.sectPrAt(0) : this.sect();
    let contentW = this.contentWidthForSect(s4);
    let marginL = isPaged ? s4.marginLeftTwips : 600;
    let marginT = isPaged ? s4.marginTopTwips : 600;
    let contentBottom = s4.pageHeightTwips - s4.marginBottomTwips;
    let nCols = 1, colSpace = 0, colW = contentW;
    let col = 0;
    const applyColGeom = () => {
      nCols = isPaged && s4.cols ? Math.max(1, s4.cols.count) : 1;
      colSpace = s4.cols?.spaceTwips ?? 0;
      colW = nCols > 1 ? (contentW - colSpace * (nCols - 1)) / nCols : contentW;
    };
    applyColGeom();
    const colX = () => marginL + col * (colW + colSpace);
    this.layoutCache = [];
    this.tableLayouts = [];
    this.dropCapFloats = [];
    this.pageSections = [0];
    let pendingDropCap = null;
    let page = 0;
    let y3 = marginT;
    const CONT_TILE_PX = 4e3;
    const tileTwips = isPaged ? Infinity : CONT_TILE_PX / (PX_PER_TWIP * this.zoom);
    const tileBottoms = [];
    const contTileBreak = (need) => {
      if (!isPaged && y3 > (page === 0 ? marginT : 0) && y3 + need > tileTwips) {
        page++;
        y3 = 0;
      }
    };
    const listCounters = [0, 0, 0];
    let prevWasList = false;
    const ROMANS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
    const ALPHA = "abcdefghijklmnopqrstuvwxyz";
    const FN_LINE = 260, FN_SEP = 120;
    let fnReserved = 0;
    let pageHadNotes = false;
    const newPage = () => {
      page++;
      y3 = marginT;
      col = 0;
      this.pageSections[page] = sectIdx;
      fnReserved = 0;
      pageHadNotes = false;
    };
    const breakColumn = () => {
      if (col < nCols - 1) {
        col++;
        y3 = marginT;
      } else newPage();
    };
    this.model.paragraphs.forEach((p3, pi) => {
      if (isPaged && this.sectionStarts.length > 0) {
        const si = this.sectionIndexForPara(pi);
        if (si !== sectIdx) {
          sectIdx = si;
          s4 = this.sectPrAt(si);
          contentW = this.contentWidthForSect(s4);
          marginL = s4.marginLeftTwips;
          marginT = s4.marginTopTwips;
          contentBottom = s4.pageHeightTwips - s4.marginBottomTwips;
          applyColGeom();
          newPage();
        }
      }
      for (const anchor of this.tableAnchors) {
        if (anchor.beforePara !== pi) continue;
        const tl = this.layoutTable(anchor.table, marginL, contentW);
        if (isPaged && y3 + tl.heightTwips > contentBottom && tl.heightTwips < contentBottom - marginT) {
          newPage();
        }
        contTileBreak(tl.heightTwips);
        tl.page = page;
        tl.yTwips = y3;
        this.tableLayouts.push(tl);
        y3 += tl.heightTwips + 160;
        tileBottoms[page] = y3;
      }
      const st = this.styleOf(p3);
      const outlineIndent = this.view === "outline" ? st ? 0 : 720 : 0;
      const indent = (p3.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0) + outlineIndent;
      const indentRight = p3.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
      const firstDelta = p3.props.indentFirstLineTwips ?? 0;
      const avail = Math.max(500, colW - indent - indentRight);
      const availFirst = Math.max(500, avail - firstDelta);
      if (p3.props.tocInstr && p3.runs.every((r6) => r6.text.trim() === "")) {
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      if (p3.props.dropCap && p3.runs.length > 0) {
        const run = p3.runs[0];
        const sizePt = (run.props.szHalfPt ?? 22) / 2;
        const letterFont = this.fonts.resolve(run.props.fontAscii, run.props.bold ? "bold" : "regular");
        pendingDropCap = {
          text: run.text,
          sizePt,
          bold: run.props.bold,
          italic: run.props.italic,
          color: run.props.color,
          widthTwips: [...run.text].reduce((w2, ch) => w2 + letterFont.advanceTwips(ch.codePointAt(0), sizePt), 0)
        };
        this.layoutCache.push({ spans: [], charAdvances: [], lines: [], spanCharStart: [] });
        return;
      }
      const dropCap = pendingDropCap;
      pendingDropCap = null;
      const dropIndent = dropCap ? dropCap.widthTwips + 120 : 0;
      const spans = this.buildSpans(p3);
      const lineRulePre = {
        line: p3.props.lineTwentieths ?? st?.lineTwentieths ?? 259,
        lineRule: "auto"
      };
      const pitchPre = Math.round(
        lineHeightPt(this.fonts.resolve(void 0, "regular"), spans[0]?.sizePt ?? 11, lineRulePre) * TWIPS_PER_PT / 2.4
      ) * 2.4;
      const dropK = dropCap ? Math.max(2, Math.round(deviceEmPt(dropCap.sizePt) * TWIPS_PER_PT / pitchPre)) : 0;
      const { lines, charAdvances, tabLeaders } = breakRich(spans, this.fonts, {
        availableTwips: avail,
        firstLineAvailableTwips: availFirst,
        tabOriginOffsetTwips: indent,
        firstLineTabOriginOffsetTwips: indent + firstDelta,
        tabStops: p3.props.tabStops,
        indentFirstKLines: dropCap ? { k: dropK, indentTwips: dropIndent } : void 0
      });
      const spanCharStart = [];
      let acc = 0;
      for (const sp of spans) {
        spanCharStart.push(acc);
        acc += sp.text.length;
      }
      let marker;
      if (p3.props.numbering) {
        const lvl = Math.min(p3.props.numbering.ilvl, 2);
        if (!prevWasList) listCounters.fill(0);
        if (p3.props.numbering.kind === "decimal") {
          listCounters[lvl] = (listCounters[lvl] ?? 0) + 1;
          for (let d3 = lvl + 1; d3 < 3; d3++) listCounters[d3] = 0;
          const n5 = listCounters[lvl];
          marker = lvl === 0 ? `${n5}.` : lvl === 1 ? `${ALPHA[(n5 - 1) % 26]}.` : `${ROMANS[(n5 - 1) % 10]}.`;
        } else {
          marker = ["\u2022", "o", "\u25AA"][lvl];
        }
        prevWasList = true;
      } else {
        prevWasList = false;
        listCounters.fill(0);
      }
      const dd = this.docDefaults();
      const hasStyles = this.hasDocStyles();
      const lineRule = {
        line: p3.props.lineTwentieths ?? st?.lineTwentieths ?? dd.para.lineTwentieths ?? (hasStyles ? 240 : 259),
        lineRule: "auto"
      };
      const qDev = (tw2) => Math.round(tw2 / 2.4) * 2.4;
      const spaceBefore = qDev(p3.props.spaceBeforeTwips ?? st?.spaceBeforeTwips ?? dd.para.spaceBeforeTwips ?? 0);
      const spaceAfter = qDev(p3.props.spaceAfterTwips ?? st?.spaceAfterTwips ?? dd.para.spaceAfterTwips ?? (hasStyles ? 0 : 160));
      if (isPaged && p3.props.pageBreakBefore && y3 > marginT) newPage();
      y3 += spaceBefore;
      let noteCount = 0;
      if (this.fullDoc) {
        for (const r6 of p3.runs) if (r6.noteRef?.kind === "footnote") noteCount++;
      }
      const laid = [];
      lines.forEach((rich, li) => {
        const font = this.fonts.resolve(void 0, "regular");
        const sizeForHeight = Math.max(rich.maxSizePt, 1);
        const descTwips = Math.abs(font.metrics.descender) / font.metrics.unitsPerEm * deviceEmPt(sizeForHeight) * TWIPS_PER_PT;
        const lh = qDev(Math.max(
          lineHeightPt(font, sizeForHeight, lineRule) * TWIPS_PER_PT,
          rich.maxAscTwips + descTwips
        ));
        const asc = qDev(Math.max(
          font.metrics.ascender / font.metrics.unitsPerEm * deviceEmPt(sizeForHeight) * TWIPS_PER_PT,
          rich.maxAscTwips
        ));
        if (li === 0 && noteCount > 0) {
          fnReserved += noteCount * FN_LINE + (pageHadNotes ? 0 : FN_SEP);
          pageHadNotes = true;
        }
        contTileBreak(lh);
        if (isPaged && y3 + lh > contentBottom - fnReserved) {
          breakColumn();
          const onNewPage = col === 0;
          if (onNewPage && li === 0 && noteCount > 0) {
            fnReserved = noteCount * FN_LINE + FN_SEP;
            pageHadNotes = true;
          }
          if (nCols === 1) {
            if (li === 1 && laid.length === 1) {
              const first = laid[0];
              const delta = y3 - first.yTwips;
              first.page = page;
              first.yTwips += delta;
              first.baselineTwips += delta;
              y3 += first.heightTwips;
            } else if (li === lines.length - 1 && laid.length >= 2) {
              const prev = laid[laid.length - 1];
              if (prev.page !== page) {
                const delta = y3 - prev.yTwips;
                prev.page = page;
                prev.yTwips += delta;
                prev.baselineTwips += delta;
                y3 += prev.heightTwips;
              }
            }
          }
        }
        const inDropZone = dropCap !== null && li < dropK;
        const lineIndentX = indent + (li === 0 ? firstDelta : 0) + (inDropZone ? dropIndent : 0);
        const lineAvail = (li === 0 ? availFirst : avail) - (inDropZone ? dropIndent : 0);
        let x3 = colX() + lineIndentX;
        if (dropCap && li === 0) {
          this.dropCapFloats.push({
            ...dropCap,
            page,
            xTwips: colX() + indent,
            yTopTwips: y3,
            kPitch: pitchPre * dropK
          });
        }
        let justifyExtra = 0;
        const align = p3.props.alignment ?? st?.alignment;
        if (align === "center") x3 += (lineAvail - rich.widthTwips) / 2;
        else if (align === "right") x3 += lineAvail - rich.widthTwips;
        else if (align === "both" && li < lines.length - 1) {
          const text = spans.map((sp) => sp.text).join("").slice(rich.start, rich.end).trimEnd();
          const spaces = (text.match(/ /g) ?? []).length;
          if (spaces > 0) justifyExtra = (lineAvail - rich.widthTwips) / spaces;
        }
        laid.push({
          para: pi,
          rich,
          page,
          xTwips: x3,
          yTwips: y3,
          heightTwips: lh,
          baselineTwips: y3 + asc,
          marker: li === 0 && marker !== void 0 ? { text: marker, xTwips: colX() + indent - 360, sizePt: 11 } : void 0,
          justifyExtraPerSpace: justifyExtra
        });
        y3 += lh;
        if (!isPaged) tileBottoms[page] = y3;
        const fullText = spans.map((sp) => sp.text).join("");
        if (isPaged && rich.end > 0 && fullText[rich.end - 1] === "\f") {
          newPage();
        }
      });
      y3 += spaceAfter;
      this.layoutCache.push({ spans, charAdvances, lines: laid, spanCharStart, tabLeaders });
    });
    for (const anchor of this.tableAnchors) {
      if (anchor.beforePara < this.model.paragraphs.length) continue;
      const tl = this.layoutTable(anchor.table, marginL, contentW);
      if (isPaged && y3 + tl.heightTwips > contentBottom) newPage();
      tl.page = page;
      tl.yTwips = y3;
      this.tableLayouts.push(tl);
      y3 += tl.heightTwips + 160;
    }
    this.footnoteHits = [];
    if (this.fullDoc) {
      this.layoutCache.forEach((pl, pi) => {
        const para = this.model.paragraphs[pi];
        for (const run of para.runs) {
          if (run.noteRef?.kind === "footnote") {
            const pg = pl.lines[0]?.page ?? 0;
            this.footnoteHits.push({ page: pg, id: run.noteRef.id });
          }
        }
      });
    }
    this.pageCount = isPaged ? page + 1 : 1;
    if (!isPaged) {
      this.continuousHeight = y3 + 600;
      tileBottoms[page] = y3;
      this.tileHeights = tileBottoms.map((b5, i7) => (b5 ?? 0) + (i7 === page ? 600 : 0));
    } else {
      this.tileHeights = [];
    }
  }
  /** Substitui PAGE/NUMPAGES no texto de header/footer. */
  substField(text, pageIdx) {
    return text.replace(/\bPAGE\b/g, String(pageIdx + 1)).replace(/\bNUMPAGES\b/g, String(this.pageCount));
  }
  /** Renderiza cabeçalho/rodapé com layout real: runs formatados, alinhamento
   *  do parágrafo, tabs centro/direita (default do app de referência) e campos por página. */
  paintHf(ctx, scale, paras, originXTwips, topYTwips, widthTwips, pageIdx, color) {
    if (!this.fonts) return;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    const stroke = (e8, ax, ay, bx, by) => {
      if (!e8) return;
      ctx.strokeStyle = this.inkColor(e8.color);
      ctx.lineWidth = Math.max(1, e8.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
      if (e8.style === "dashed") ctx.setLineDash([8, 5]);
      else if (e8.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
    };
    let y3 = topYTwips;
    for (const p3 of paras) {
      const runs = p3.runs.map(
        (r6) => r6.field ? { ...r6, text: /NUMPAGES/i.test(r6.field) ? String(this.pageCount) : /PAGE/i.test(r6.field) ? String(pageIdx + 1) : r6.text } : r6
      );
      const spans = this.buildSpans({ runs, props: p3.props }, { skipFloating: true });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p3.props.tabStops?.length ? p3.props.tabStops : defaultTabs
      });
      for (const r6 of runs) {
        if (r6.textbox) {
          const tb = r6.textbox;
          const tx = originXTwips + (tb.floating ? tb.offsetXTwips ?? 0 : 0);
          const ty = y3 + (tb.floating ? tb.offsetYTwips ?? 0 : 0);
          this.paintHf(ctx, scale, tb.paras, tx, ty, tb.widthTwips || widthTwips, pageIdx, color);
          continue;
        }
        if (!r6.image) continue;
        const bmp = this.bitmapFor(r6.image);
        if (!bmp) continue;
        const img = r6.image;
        const ix = originXTwips + (img.floating ? img.offsetXTwips ?? 0 : 0);
        const iy = y3 + (img.floating ? img.offsetYTwips ?? 0 : 0);
        ctx.drawImage(bmp, ix * scale, iy * scale, img.widthTwips * scale, img.heightTwips * scale);
      }
      const font = this.fonts.resolve(void 0, "regular");
      const fallback = p3.props.boxBorder && !p3.props.borders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
      const bd = p3.props.borders ?? (fallback ? { top: fallback, bottom: fallback, left: fallback, right: fallback } : void 0);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
        if (p3.props.shadingHex) {
          ctx.fillStyle = this.inkColor(p3.props.shadingHex);
          ctx.fillRect(originXTwips * scale, y3 * scale, widthTwips * scale, lh * scale);
        }
        let x3 = originXTwips;
        const align = p3.props.alignment;
        if (align === "center") x3 += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") x3 += widthTwips - line.widthTwips;
        const baseline = y3 + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          const run = runs[seg.spanIndex];
          const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
          const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          const fam = span.family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
          const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
          const v2 = span.variant;
          ctx.font = `${v2 === "italic" || v2 === "boldItalic" ? "italic " : ""}${v2 === "bold" || v2 === "boldItalic" ? "700" : "400"} ${fontPx}px ${fam}`;
          ctx.fillStyle = run?.props.color ? this.inkColor(run.props.color) : color;
          ctx.fillText(txt, (x3 + seg.xTwips) * scale, baseline * scale);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * TWIPS_PER_PT;
          const spR = (bd.right?.spacePt ?? 0) * TWIPS_PER_PT;
          const spT = (bd.top?.spacePt ?? 0) * TWIPS_PER_PT;
          const spB = (bd.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
          const x0 = (originXTwips - spL) * scale;
          const x1 = (originXTwips + widthTwips + spR) * scale;
          const y0 = (y3 - (isFirst ? spT : 0)) * scale;
          const y1 = (y3 + lh + (isLast ? spB : 0)) * scale;
          stroke(bd.left, x0, y0, x0, y1);
          stroke(bd.right, x1, y0, x1, y1);
          if (isFirst) stroke(bd.top, x0, y0, x1, y0);
          if (isLast) stroke(bd.bottom, x0, y1, x1, y1);
        }
        y3 += lh;
      }
    }
  }
  contentWidthForSect(s4) {
    if (this.view === "web") {
      return Math.max(2e3, (this.clientWidth - 48) / (PX_PER_TWIP * this.zoom) - 1200);
    }
    return s4.pageWidthTwips - s4.marginLeftTwips - s4.marginRightTwips;
  }
  /** Layout de tabela: colunas do tblGrid, linhas com altura do conteúdo. */
  layoutTable(table, xTwips, availW) {
    const PAD = 108;
    const font = this.fonts.resolve(void 0, "regular");
    let cols = table.gridColsTwips.length ? [...table.gridColsTwips] : [availW];
    const total = cols.reduce((a3, b5) => a3 + b5, 0);
    if (total > availW) cols = cols.map((c4) => c4 * availW / total);
    const colXs = [0];
    for (const c4 of cols) colXs.push(colXs[colXs.length - 1] + c4);
    const tl = {
      table,
      page: 0,
      xTwips,
      yTwips: 0,
      heightTwips: 0,
      colXs,
      rowYs: [0],
      cellLines: [],
      cellShades: [],
      cellRects: []
    };
    let yAcc = 0;
    const nRows = table.rows.length;
    table.rows.forEach((row, ri) => {
      let rowH = 240;
      let col = 0;
      const pending = [];
      for (const cell of row.cells) {
        const x0 = colXs[Math.min(col, colXs.length - 1)];
        const x1 = colXs[Math.min(col + cell.gridSpan, colXs.length - 1)];
        const cellW = Math.max(300, x1 - x0 - PAD * 2);
        let cy = PAD;
        const paras = [
          ...cell.paragraphs,
          ...cell.tables.flatMap((nt) => nt.rows.flatMap((r6) => r6.cells.flatMap((c4) => c4.paragraphs)))
        ];
        for (const p3 of paras) {
          const st = this.styleOf(p3);
          const spans = this.buildSpans(p3);
          const spanCharStart = [];
          let accSp = 0;
          for (const sp of spans) {
            spanCharStart.push(accSp);
            accSp += sp.text.length;
          }
          const { lines } = breakRich(spans, this.fonts, { availableTwips: cellW });
          const align = p3.props.alignment ?? st?.alignment;
          for (const line of lines) {
            const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
            const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * TWIPS_PER_PT;
            let startX = x0 + PAD;
            if (align === "center") startX += (cellW - line.widthTwips) / 2;
            else if (align === "right") startX += cellW - line.widthTwips;
            const baseY = cy + lh * 0.8;
            for (const seg of line.segments) {
              const span = spans[seg.spanIndex];
              const run = p3.runs[seg.spanIndex];
              const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
              const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
              if (!txt) continue;
              pending.push({
                row: ri,
                col,
                xTwips: startX + seg.xTwips,
                yTwips: baseY,
                text: txt,
                sizePt: span.sizePt,
                bold: span.variant === "bold" || span.variant === "boldItalic",
                italic: span.variant === "italic" || span.variant === "boldItalic",
                color: run?.props.color ?? st?.color,
                family: span.family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos",
                underline: run?.props.underline,
                strike: run?.props.strike
              });
            }
            cy += lh;
          }
        }
        rowH = Math.max(rowH, cy + PAD);
        if (cell.shadingHex) {
          tl.cellShades.push({ xTwips: x0, yTwips: yAcc, wTwips: x1 - x0, hTwips: 0, hex: cell.shadingHex });
        }
        const tb = table.borders;
        const isFirstRow = ri === 0;
        const isLastRow = ri === nRows - 1;
        const isFirstCol = col === 0;
        const isLastCol = col + cell.gridSpan >= cols.length;
        tl.cellRects.push({
          x0,
          y0: yAcc,
          x1,
          y1: -1,
          edges: {
            top: cell.borders?.top ?? (isFirstRow ? tb?.top : tb?.insideH),
            bottom: cell.borders?.bottom ?? (isLastRow ? tb?.bottom : tb?.insideH),
            left: cell.borders?.left ?? (isFirstCol ? tb?.left : tb?.insideV),
            right: cell.borders?.right ?? (isLastCol ? tb?.right : tb?.insideV)
          }
        });
        col += cell.gridSpan;
      }
      for (const sh of tl.cellShades) if (sh.yTwips === yAcc && sh.hTwips === 0) sh.hTwips = rowH;
      for (const cr of tl.cellRects) if (cr.y1 === -1) cr.y1 = yAcc + rowH;
      for (const cl of pending) tl.cellLines.push({ ...cl, yTwips: cl.yTwips + yAcc });
      yAcc += rowH;
      tl.rowYs.push(yAcc);
    });
    tl.heightTwips = yAcc;
    return tl;
  }
  continuousHeight = 0;
  /** Altura (twips) de cada tile no modo contínuo (Web/Rascunho). */
  tileHeights = [];
  dropCapFloats = [];
  /** topo (twips) da banda do HF em edição — usado p/ desenhar o rótulo/borda. */
  hfRegionTopTwips = 0;
  /** última zona de HF sob o mouse (p/ não repetir o evento de hover). */
  lastHoverHf = null;
  /** Em qual zona de HF (margem sup/inf) e PÁGINA o mouse caiu, se alguma. */
  hfZoneAt(e8) {
    for (let pg = 0; pg < this.canvases.length; pg++) {
      const rect = this.canvases[pg].getBoundingClientRect();
      if (e8.clientY < rect.top || e8.clientY > rect.bottom) continue;
      if (e8.clientX < rect.left || e8.clientX > rect.right) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const yT = (e8.clientY - rect.top) / scale;
      const sp = this.sectionStarts.length ? this.sectPrAt(this.pageSections[pg] ?? 0) : this.sect();
      if (yT < sp.marginTopTwips) return { kind: "header", page: pg };
      if (yT > sp.pageHeightTwips - sp.marginBottomTwips) return { kind: "footer", page: pg };
      return null;
    }
    return null;
  }
  /** true se o ponteiro está dentro da faixa ativa (header/footer) da página em edição. */
  hfClickInActiveBand(e8) {
    if (!this.hfEdit) return false;
    const cv = this.canvases[Math.min(this.hfActivePage, this.canvases.length - 1)];
    if (!cv) return false;
    const rect = cv.getBoundingClientRect();
    if (e8.clientY < rect.top || e8.clientY > rect.bottom) return false;
    if (e8.clientX < rect.left || e8.clientX > rect.right) return false;
    const scale = PX_PER_TWIP * this.zoom;
    const yT = (e8.clientY - rect.top) / scale;
    const bandTop = this.hfRegionTopTwips - 120;
    return yT >= bandTop && yT <= bandTop + 1100;
  }
  /** Geometria das colunas numa página + quais têm conteúdo (p/ o separador). */
  colContentOnPage(pg, sp) {
    if (!sp.cols || sp.cols.count < 2) return null;
    const n5 = sp.cols.count, gap = sp.cols.spaceTwips;
    const cw = (sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips - gap * (n5 - 1)) / n5;
    const origin = (c4) => sp.marginLeftTwips + c4 * (cw + gap);
    const hasContent = new Array(n5).fill(false);
    let maxBottom = sp.marginTopTwips;
    for (const pl of this.layoutCache) for (const ln2 of pl.lines) {
      if (ln2.page !== pg) continue;
      maxBottom = Math.max(maxBottom, ln2.yTwips + ln2.heightTwips);
      let best = 0;
      for (let c4 = 1; c4 < n5; c4++) {
        if (Math.abs(ln2.xTwips - origin(c4)) < Math.abs(ln2.xTwips - origin(best))) best = c4;
      }
      hasContent[best] = true;
    }
    maxBottom = Math.min(maxBottom, sp.pageHeightTwips - sp.marginBottomTwips);
    return { n: n5, gap, origin, hasContent, maxBottom };
  }
  /** snapshot do corpo (por página) p/ mostrar esmaecido durante a edição de HF. */
  hfBodySnapshots = [];
  allLines() {
    return this.layoutCache.flatMap((p3) => p3.lines);
  }
  lineOf(pos) {
    const pl = this.layoutCache[pos.para];
    if (!pl) return null;
    for (const l3 of pl.lines) {
      if (pos.offset >= l3.rich.start && pos.offset <= l3.rich.end) {
        if (pos.offset === l3.rich.end && l3 !== pl.lines[pl.lines.length - 1]) continue;
        return l3;
      }
    }
    return pl.lines[pl.lines.length - 1] ?? null;
  }
  caretX(pos, line) {
    const pl = this.layoutCache[pos.para];
    let x3 = line.xTwips;
    const text = pl.spans.map((s4) => s4.text).join("");
    for (let i7 = line.rich.start; i7 < pos.offset && i7 < pl.charAdvances.length; i7++) {
      x3 += pl.charAdvances[i7];
      if (line.justifyExtraPerSpace && text[i7] === " ") x3 += line.justifyExtraPerSpace;
    }
    return x3;
  }
  hitLineX(line, xTwips) {
    const pl = this.layoutCache[line.para];
    let x3 = line.xTwips;
    const text = pl.spans.map((s4) => s4.text).join("");
    for (let i7 = line.rich.start; i7 < line.rich.end; i7++) {
      let a3 = pl.charAdvances[i7];
      if (line.justifyExtraPerSpace && text[i7] === " ") a3 += line.justifyExtraPerSpace;
      if (xTwips < x3 + a3 / 2) return i7;
      x3 += a3;
    }
    return line.rich.end;
  }
  hitTest(e8) {
    if (!this.model) return null;
    let order = [...this.canvases.keys()];
    order.sort((a3, b5) => {
      const ra = this.canvases[a3].getBoundingClientRect();
      const rb = this.canvases[b5].getBoundingClientRect();
      const da = Math.max(0, ra.left - e8.clientX, e8.clientX - ra.right);
      const db = Math.max(0, rb.left - e8.clientX, e8.clientX - rb.right);
      return da - db;
    });
    for (const pg of order) {
      const canvas = this.canvases[pg];
      const rect = canvas.getBoundingClientRect();
      if (e8.clientY < rect.top || e8.clientY > rect.bottom) continue;
      const scale = PX_PER_TWIP * this.zoom;
      const xT = (e8.clientX - rect.left) / scale;
      const yT = (e8.clientY - rect.top) / scale;
      let best = null;
      for (const line of this.allLines()) {
        if (line.page !== pg) continue;
        if (yT >= line.yTwips && yT <= line.yTwips + line.heightTwips) {
          best = line;
          break;
        }
        if (!best || Math.abs(line.yTwips + line.heightTwips / 2 - yT) < Math.abs(best.yTwips + best.heightTwips / 2 - yT)) best = line;
      }
      if (!best) return { para: 0, offset: 0 };
      return { para: best.para, offset: this.hitLineX(best, xT) };
    }
    return null;
  }
  /** Rola até o caret APENAS se ele estiver fora da tela ou cortado.
   *  Animação suave, exceto se o SO pedir movimento reduzido. */
  scrollCaretIntoView() {
    const line = this.lineOf(this.selection.focus);
    if (!line) return;
    const canvas = this.canvases[line.page];
    if (!canvas) return;
    const scale = PX_PER_TWIP * this.zoom;
    const caretTop = canvas.offsetTop + line.yTwips * scale;
    const caretBottom = caretTop + line.heightTwips * scale;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop;
    const viewBottom = viewTop + viewH;
    const MARGIN = 8;
    if (caretTop >= viewTop + MARGIN && caretBottom <= viewBottom - MARGIN) return;
    const target = caretTop < viewTop + MARGIN ? caretTop - MARGIN - 32 : caretBottom - viewH + MARGIN + 32;
    this.animateScrollTo(Math.max(0, target));
  }
  /** Scroll animado próprio (rAF + easeOutCubic) — 'smooth' nativo é no-op em
   *  alguns Chromium; instantâneo quando o SO pede movimento reduzido. */
  scrollAnim = 0;
  animateScrollTo(target) {
    cancelAnimationFrame(this.scrollAnim);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.scrollTop = target;
      return;
    }
    const start = this.scrollTop;
    const dist = target - start;
    if (Math.abs(dist) < 2) {
      this.scrollTop = target;
      return;
    }
    const DURATION = 220;
    const t0 = performance.now();
    let started = false;
    const step = (now) => {
      started = true;
      const t5 = Math.min(1, (now - t0) / DURATION);
      const ease = 1 - Math.pow(1 - t5, 3);
      this.scrollTop = start + dist * ease;
      if (t5 < 1) this.scrollAnim = requestAnimationFrame(step);
    };
    this.scrollAnim = requestAnimationFrame(step);
    window.setTimeout(() => {
      if (!started) {
        cancelAnimationFrame(this.scrollAnim);
        this.scrollTop = target;
      }
    }, 80);
  }
  // ───────────────────────── pintura ─────────────────────────
  refresh() {
    this.layout();
    this.rebuildCanvases();
    if (this.view === "read") this.applyReadSpread();
    else for (const c4 of this.canvases) if (c4.style.display === "none") c4.style.display = "";
    this.ensureVisiblePainted();
    this.positionProxy();
    this.onSelectionChange?.();
    this.chromeSync?.();
  }
  /** Mantém a textarea-proxy JUNTO AO CARET: o browser rola o elemento
   *  focado para a vista ao digitar — se a proxy ficasse no fim do
   *  documento, digitar saltava a rolagem para o final. De quebra, o
   *  popup de IME aparece na posição certa. */
  positionProxy() {
    const line = this.lineOf(this.selection.focus);
    const canvas = line ? this.canvases[line.page] : void 0;
    if (!line || !canvas) {
      this.input.style.top = "0px";
      this.input.style.left = "0px";
      return;
    }
    const scale = PX_PER_TWIP * this.zoom;
    const x3 = canvas.offsetLeft + this.caretX(this.selection.focus, line) * scale;
    const y3 = canvas.offsetTop + line.yTwips * scale;
    this.input.style.left = `${Math.round(x3)}px`;
    this.input.style.top = `${Math.round(y3)}px`;
    this.input.style.height = `${Math.max(8, Math.round(line.heightTwips * scale))}px`;
  }
  rebuildCanvases() {
    if (!this.model) return;
    const s4 = this.sect();
    const dpr = window.devicePixelRatio || 1;
    const cssScale = PX_PER_TWIP * this.zoom;
    const isPaged = this.view === "print" || this.view === "read";
    const widthT = this.view === "web" ? this.contentWidthTwips() + 1200 : s4.pageWidthTwips;
    const heightT = isPaged ? s4.pageHeightTwips : Math.max(this.continuousHeight, 3e3);
    const count = isPaged ? this.pageCount : this.tileHeights.length;
    const cssOf = (i7) => {
      let w2 = widthT, h3 = heightT;
      if (!isPaged) {
        h3 = this.tileHeights[i7] ?? heightT;
      } else if (isPaged && this.hfEdit && this.savedBody) {
        const sp = this.sectPrForSavedPage(i7);
        w2 = sp.pageWidthTwips;
        h3 = sp.pageHeightTwips;
      } else if (isPaged && this.sectionStarts.length > 0) {
        const sp = this.sectPrAt(this.pageSections[i7] ?? 0);
        w2 = sp.pageWidthTwips;
        h3 = sp.pageHeightTwips;
      }
      return { wPx: `${Math.round(w2 * cssScale)}px`, hPx: `${Math.round(h3 * cssScale)}px` };
    };
    const sameCount = this.canvases.length === count;
    const sameSizes = sameCount && this.canvases.every((c4, i7) => {
      const { wPx, hPx } = cssOf(i7);
      return c4.style.width === wPx && c4.style.height === hPx;
    });
    if (sameCount && sameSizes) {
      this.allocatedPages.clear();
      for (const c4 of this.canvases) {
        c4.width = 1;
        c4.height = 1;
      }
      void dpr;
      return;
    }
    this.container.replaceChildren();
    this.canvases = [];
    this.allocatedPages.clear();
    for (let i7 = 0; i7 < count; i7++) {
      const { wPx, hPx } = cssOf(i7);
      const c4 = document.createElement("canvas");
      c4.className = "page";
      c4.width = 1;
      c4.height = 1;
      c4.style.width = wPx;
      c4.style.height = hPx;
      this.container.append(c4);
      this.canvases.push(c4);
    }
    void dpr;
  }
  /** Páginas com buffer alocado e pintado (virtualização para zoom alto). */
  allocatedPages = /* @__PURE__ */ new Set();
  scrollPaintQueued = false;
  /** Fator de buffer: dpr, limitado para o canvas não passar de 4096px. */
  bufferScaleFor(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = parseFloat(canvas.style.width) || 794;
    const cssH = parseFloat(canvas.style.height) || 1123;
    const MAX_DIM = 16384, MAX_AREA = 16384 * 16384;
    return Math.min(dpr, MAX_DIM / cssW, MAX_DIM / cssH, Math.sqrt(MAX_AREA / (cssW * cssH)));
  }
  /** Garante buffer+pintura das páginas visíveis (e vizinhas); libera longe. */
  ensureVisiblePainted() {
    if (this.canvases.length === 0) return;
    const viewH = this.clientHeight || 900;
    const viewTop = this.scrollTop - viewH;
    const viewBottom = this.scrollTop + viewH * 2;
    const need = /* @__PURE__ */ new Set();
    this.canvases.forEach((c4, i7) => {
      if (c4.style.display === "none") return;
      const top = c4.offsetTop;
      const bottom = top + c4.offsetHeight;
      if (bottom >= viewTop && top <= viewBottom) need.add(i7);
    });
    let dirty = false;
    for (const i7 of need) {
      if (!this.allocatedPages.has(i7)) {
        const c4 = this.canvases[i7];
        const bs = this.bufferScaleFor(c4);
        c4.width = Math.round(parseFloat(c4.style.width) * bs);
        c4.height = Math.round(parseFloat(c4.style.height) * bs);
        this.allocatedPages.add(i7);
        dirty = true;
      }
    }
    for (const i7 of [...this.allocatedPages]) {
      if (!need.has(i7)) {
        const c4 = this.canvases[i7];
        const top = c4.offsetTop;
        if (top > viewBottom + viewH * 3 || top + c4.offsetHeight < viewTop - viewH * 3) {
          c4.width = 1;
          c4.height = 1;
          this.allocatedPages.delete(i7);
        }
      }
    }
    if (dirty) this.paint(need);
  }
  paint(filter) {
    if (!this.model || this.canvases.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const active = filter ?? this.allocatedPages;
    if (active.size === 0) return;
    const sel2 = normalizeRange(this.range());
    const hasSel = this.hasSelection();
    const pageBg = this.pageDark ? "#1e1e1e" : "#ffffff";
    const scales = [];
    const ctxs = this.canvases.map((c4, i7) => {
      if (!active.has(i7) || c4.width <= 1) {
        scales.push(0);
        return null;
      }
      const bs = c4.width / (parseFloat(c4.style.width) || c4.width);
      scales.push(PX_PER_TWIP * this.zoom * bs);
      const ctx = c4.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, c4.width, c4.height);
      ctx.fillStyle = pageBg;
      ctx.fillRect(0, 0, c4.width, c4.height);
      if (this.hfEdit && (this.hfBodySnapshots[i7]?.width ?? 0) > 1) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.drawImage(this.hfBodySnapshots[i7], 0, 0);
        ctx.restore();
      }
      return ctx;
    });
    const pgOf = (p3) => Math.min(p3, ctxs.length - 1);
    if (this.hfEdit) {
      const ap = pgOf(this.hfActivePage);
      const ctxA = ctxs[ap];
      if (ctxA) {
        const scale = scales[ap];
        const sp = this.sectPrForSavedPage(this.hfActivePage);
        const bandTop = this.hfRegionTopTwips - 120;
        const bandH = 1100;
        ctxA.save();
        ctxA.fillStyle = this.pageDark ? "rgba(80,130,200,0.16)" : "rgba(43,87,154,0.07)";
        ctxA.fillRect(0, bandTop * scale, this.canvases[ap].width, bandH * scale);
        ctxA.strokeStyle = this.pageDark ? "#5b8def" : "#2b579a";
        ctxA.setLineDash([6, 4]);
        ctxA.lineWidth = Math.max(1, dpr);
        const gy = (this.hfEdit.kind === "header" ? bandTop + bandH : bandTop) * scale;
        ctxA.beginPath();
        ctxA.moveTo(sp.marginLeftTwips * scale, gy);
        ctxA.lineTo((sp.pageWidthTwips - sp.marginRightTwips) * scale, gy);
        ctxA.stroke();
        ctxA.setLineDash([]);
        ctxA.font = `600 ${9 * TWIPS_PER_PT * scale}px Aptos`;
        ctxA.fillStyle = this.pageDark ? "#9bc0ff" : "#2b579a";
        const label = this.hfEdit.kind === "header" ? "Header" : "Footer";
        ctxA.fillText(label, sp.marginLeftTwips * scale, (bandTop + 200) * scale);
        ctxA.restore();
      }
    }
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const pg = pgOf(line.page);
        const ctx = ctxs[pg];
        if (ctx) this.paintLine(ctx, pl, line, scales[pg], sel2, hasSel);
      }
    }
    const ink = this.pageDark ? "#e8eaed" : "#000";
    const gridColor = this.pageDark ? "#5f6368" : "#666";
    for (const tl of this.tableLayouts) {
      const tpg = pgOf(tl.page);
      const ctx = ctxs[tpg];
      if (!ctx) continue;
      const scale = scales[tpg];
      for (const sh of tl.cellShades) {
        ctx.fillStyle = this.inkColor(sh.hex);
        ctx.fillRect((tl.xTwips + sh.xTwips) * scale, (tl.yTwips + sh.yTwips) * scale, sh.wTwips * scale, sh.hTwips * scale);
      }
      const strokeEdge = (edge, ax, ay, bx, by) => {
        if (!edge) return;
        ctx.strokeStyle = edge.color ? this.inkColor(edge.color) : ink;
        ctx.lineWidth = Math.max(dpr * 0.75, edge.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
        if (edge.style === "dashed") ctx.setLineDash([6 * dpr, 4 * dpr]);
        else if (edge.style === "dotted") ctx.setLineDash([2 * dpr, 3 * dpr]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo((tl.xTwips + ax) * scale, (tl.yTwips + ay) * scale);
        ctx.lineTo((tl.xTwips + bx) * scale, (tl.yTwips + by) * scale);
        ctx.stroke();
        ctx.setLineDash([]);
      };
      for (const cr of tl.cellRects) {
        strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
        strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
        strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
        strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
      }
      void gridColor;
      for (const cl of tl.cellLines) {
        const fontPx = deviceEmPt(cl.sizePt) * TWIPS_PER_PT * scale;
        ctx.font = `${cl.italic ? "italic " : ""}${cl.bold ? "700" : "400"} ${fontPx}px ${cl.family ?? "Aptos"}`;
        ctx.fillStyle = cl.color ? this.inkColor(cl.color) : ink;
        const bx = (tl.xTwips + cl.xTwips) * scale;
        const by = (tl.yTwips + cl.yTwips) * scale;
        ctx.fillText(cl.text, bx, by);
        if (cl.underline || cl.strike) {
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = Math.max(1, fontPx / 16);
          const w2 = ctx.measureText(cl.text).width;
          const yo = cl.underline ? fontPx * 0.12 : -fontPx * 0.28;
          ctx.beginPath();
          ctx.moveTo(bx, by + yo);
          ctx.lineTo(bx + w2, by + yo);
          ctx.stroke();
        }
      }
    }
    for (const dc of this.dropCapFloats) {
      const dpg = pgOf(dc.page);
      const ctx = ctxs[dpg];
      if (!ctx) continue;
      const scale = scales[dpg];
      ctx.font = `${dc.italic ? "italic " : ""}${dc.bold ? "700" : "400"} ${deviceEmPt(dc.sizePt) * TWIPS_PER_PT * scale}px Aptos`;
      ctx.fillStyle = this.inkColor(dc.color);
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * TWIPS_PER_PT;
      ctx.fillText(dc.text, dc.xTwips * scale, baseline * scale);
    }
    for (const f3 of this.floatImages) {
      const pl = this.layoutCache[f3.para];
      const first = pl?.lines[0];
      if (!first || !f3.run.image) continue;
      const fpg = pgOf(first.page);
      const ctx = ctxs[fpg];
      if (!ctx) continue;
      const scale = scales[fpg];
      const img = f3.run.image;
      const bmp = this.bitmapFor(img);
      const x3 = (first.xTwips + (img.offsetXTwips ?? 0)) * scale;
      const yPx = (first.yTwips + (img.offsetYTwips ?? 0)) * scale;
      if (bmp) ctx.drawImage(bmp, x3, yPx, img.widthTwips * scale, img.heightTwips * scale);
    }
    if (this.view === "print" && this.fullDoc && !this.hfEdit) {
      for (let pg = 0; pg < ctxs.length; pg++) {
        const ctx = ctxs[pg];
        if (!ctx) continue;
        const scale = scales[pg];
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        const fontPx = 10 * TWIPS_PER_PT * scale;
        const grey = this.pageDark ? "#9aa0a6" : "#555";
        void fontPx;
        if (section) {
          const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
          const header2 = (pg === 0 && sp.titlePg ? section.headers.first : void 0) ?? section.headers.default;
          if (header2?.length) this.paintHf(ctx, scale, header2, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg, grey);
          const footer2 = (pg === 0 && sp.titlePg ? section.footers.first : void 0) ?? section.footers.default;
          if (footer2?.length) this.paintHf(ctx, scale, footer2, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg, grey);
        }
        if (sp.cols?.sep && sp.cols.count > 1) {
          const cc = this.colContentOnPage(pg, sp);
          if (cc) {
            ctx.strokeStyle = this.pageDark ? "#5f6368" : "#bdbdbd";
            ctx.lineWidth = Math.max(1, dpr * 0.75);
            for (let i7 = 0; i7 < cc.n - 1; i7++) {
              if (!cc.hasContent[i7 + 1]) continue;
              const xs = (cc.origin(i7 + 1) - cc.gap / 2) * scale;
              ctx.beginPath();
              ctx.moveTo(xs, sp.marginTopTwips * scale);
              ctx.lineTo(xs, cc.maxBottom * scale);
              ctx.stroke();
            }
          }
        }
        const hits = this.footnoteHits.filter((h3) => h3.page === pg);
        if (hits.length && this.fullDoc.footnotes.size) {
          let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
          ctx.strokeStyle = grey;
          ctx.lineWidth = Math.max(1, dpr);
          ctx.beginPath();
          ctx.moveTo(sp.marginLeftTwips * scale, fy * scale);
          ctx.lineTo((sp.marginLeftTwips + 2880) * scale, fy * scale);
          ctx.stroke();
          fy += 220;
          ctx.font = `400 ${9 * TWIPS_PER_PT * scale}px Aptos`;
          ctx.fillStyle = this.pageDark ? "#c0c4c9" : "#333";
          for (const h3 of hits) {
            const paras = this.fullDoc.footnotes.get(h3.id);
            const text = paras?.map((p3) => p3.runs.map((r6) => r6.text).join("")).join(" ").trim() ?? "";
            ctx.fillText(`${h3.id}. ${text}`.slice(0, 160), sp.marginLeftTwips * scale, fy * scale);
            fy += 240;
          }
        }
      }
    }
    if (this.caretVisible && this.view !== "read" && !hasSel) {
      const line = this.lineOf(this.selection.focus);
      if (line) {
        const cpg = pgOf(line.page);
        const ctx = ctxs[cpg];
        if (ctx) {
          const scale = scales[cpg];
          const x3 = this.caretX(this.selection.focus, line) * scale;
          ctx.fillStyle = this.pageDark ? "#e8eaed" : "#000";
          ctx.fillRect(x3, line.yTwips * scale, Math.max(1, dpr), line.heightTwips * scale);
        }
      }
    }
  }
  paintLine(ctx, pl, line, scale, sel2, hasSel) {
    const para = this.model.paragraphs[line.para];
    const st = this.styleOf(para);
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s4 = this.sect();
      const marginL = this.view === "print" || this.view === "read" ? s4.marginLeftTwips : 600;
      const colX = marginL + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      if (effShading) {
        const bd = effBorders;
        const isFirstL = line.rich.start === 0;
        const isLastL = line.rich.end === pl.charAdvances.length;
        const exL = (bd?.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const exR = (bd?.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const exT = isFirstL ? (bd?.top?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        const exB = isLastL ? (bd?.bottom?.spacePt ?? 0) * TWIPS_PER_PT : 0;
        ctx.fillStyle = this.inkColor(effShading);
        ctx.fillRect(
          (colX - exL) * scale,
          (line.yTwips - exT) * scale,
          (colW + exL + exR) * scale,
          (line.heightTwips + exT + exB) * scale
        );
      }
      if (effBorders || para.props.boxBorder) {
        const isFirst = line.rich.start === 0;
        const isLast = line.rich.end === pl.charAdvances.length;
        const fallback = para.props.boxBorder && !effBorders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
        const b5 = effBorders ?? {
          top: fallback,
          bottom: fallback,
          left: fallback,
          right: fallback
        };
        const stroke = (e8, ax, ay, bx, by) => {
          if (!e8) return;
          ctx.strokeStyle = e8.color ? `#${e8.color}` : this.pageDark ? "#e8eaed" : "#000";
          ctx.lineWidth = Math.max(1, e8.sizeEighthPt / 8 * TWIPS_PER_PT * scale);
          if (e8.style === "dashed") ctx.setLineDash([8, 5]);
          else if (e8.style === "dotted") ctx.setLineDash([2, 4]);
          else ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const spL = (b5.left?.spacePt ?? 0) * TWIPS_PER_PT;
        const spR = (b5.right?.spacePt ?? 0) * TWIPS_PER_PT;
        const spT = (b5.top?.spacePt ?? 0) * TWIPS_PER_PT;
        const spB = (b5.bottom?.spacePt ?? 0) * TWIPS_PER_PT;
        const x0 = (colX - spL) * scale;
        const x1 = (colX + colW + spR) * scale;
        const y0 = (line.yTwips - (isFirst ? spT : 0)) * scale;
        const y1 = (line.yTwips + line.heightTwips + (isLast ? spB : 0)) * scale;
        stroke(b5.left, x0, y0, x0, y1);
        stroke(b5.right, x1, y0, x1, y1);
        if (isFirst) stroke(b5.top, x0, y0, x1, y0);
        if (isLast) stroke(b5.bottom, x0, y1, x1, y1);
      }
    }
    if (hasSel && line.para >= sel2.start.para && line.para <= sel2.end.para) {
      const from = Math.max(line.rich.start, line.para === sel2.start.para ? sel2.start.offset : 0);
      const to = Math.min(line.rich.end, line.para === sel2.end.para ? sel2.end.offset : line.rich.end);
      if (to > from) {
        const x1 = this.caretX({ para: line.para, offset: from }, line);
        const x22 = this.caretX({ para: line.para, offset: to }, line);
        ctx.fillStyle = "rgba(58,114,196,0.35)";
        ctx.fillRect(x1 * scale, line.yTwips * scale, (x22 - x1) * scale, line.heightTwips * scale);
      }
    }
    if (line.marker) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px Aptos`;
      ctx.fillStyle = this.pageDark ? "#e8eaed" : "#000";
      ctx.fillText(line.marker.text, line.marker.xTwips * scale, line.baselineTwips * scale);
    }
    let x3 = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex];
      const run = para.runs[seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const family2 = span.family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
        const fontPx2 = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
        const variant2 = span.variant;
        ctx.font = `${variant2 === "italic" || variant2 === "boldItalic" ? "italic " : ""}${variant2 === "bold" || variant2 === "boldItalic" ? "700" : "400"} ${fontPx2}px ${family2}`;
        const ink = this.inkColor(props?.color ?? st?.color);
        ctx.fillStyle = ink;
        const globalStart2 = pl.spanCharStart[seg.spanIndex] + seg.start;
        let widthTwips = 0;
        for (let i7 = 0; i7 < seg.end - seg.start; i7++) {
          widthTwips += pl.charAdvances[globalStart2 + i7];
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        const font = this.fonts.resolve(span.family, variant2);
        const measureText = (text) => {
          const chars = Array.from(text);
          let width = 0;
          for (let i7 = 0; i7 < chars.length; i7++) {
            const cp = chars[i7].codePointAt(0);
            width += font.advanceTwips(cp, span.sizePt);
            const next = chars[i7 + 1]?.codePointAt(0);
            if (next !== void 0) width += font.kernTwips(cp, next, span.sizePt);
          }
          return width;
        };
        if (renderer?.draw) {
          const drawContext = {
            data: run.custom.data,
            fallbackText,
            props: run.props,
            sizePt: span.sizePt,
            measureText,
            ctx,
            xTwips: x3,
            yTwips: line.yTwips,
            baselineTwips: line.baselineTwips,
            widthTwips,
            heightTwips: line.heightTwips,
            scale,
            dark: this.pageDark,
            color: ink
          };
          renderer.draw(drawContext);
        } else {
          ctx.fillText(fallbackText, x3 * scale, line.baselineTwips * scale);
        }
        x3 += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        const bmp = this.bitmapFor(img);
        const wPx = img.widthTwips * scale;
        const hPx = img.heightTwips * scale;
        const yPx = (line.baselineTwips - img.heightTwips) * scale;
        if (bmp) ctx.drawImage(bmp, x3 * scale, yPx, wPx, hPx);
        else {
          ctx.strokeStyle = "#bbb";
          ctx.strokeRect(x3 * scale, yPx, wPx, hPx);
        }
        x3 += img.widthTwips;
        continue;
      }
      const family = span.family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
      const fontPx = deviceEmPt(span.sizePt) * TWIPS_PER_PT * scale;
      const variant = span.variant;
      ctx.font = `${variant === "italic" || variant === "boldItalic" ? "italic " : ""}${variant === "bold" || variant === "boldItalic" ? "700" : "400"} ${fontPx}px ${family}`;
      const color = props?.color ?? st?.color;
      ctx.fillStyle = this.inkColor(color);
      const baseShift = props?.vertAlign === "superscript" ? -span.sizePt * 0.35 * TWIPS_PER_PT : props?.vertAlign === "subscript" ? span.sizePt * 0.14 * TWIPS_PER_PT : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex] + seg.start;
      const segX0 = x3;
      for (let i7 = 0; i7 < seg.end - seg.start; i7++) {
        const gi = globalStart + i7;
        const ch = span.text[seg.start + i7];
        let a3 = pl.charAdvances[gi];
        if (line.justifyExtraPerSpace && ch === " ") a3 += line.justifyExtraPerSpace;
        if (props?.highlight) {
          ctx.save();
          const hl = HIGHLIGHTS3[props.highlight] ?? "#ffff00";
          ctx.fillStyle = this.inkColor(hl.slice(1));
          ctx.fillRect(x3 * scale, line.yTwips * scale, a3 * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (run?.field) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
          ctx.fillRect(x3 * scale, line.yTwips * scale, a3 * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (props?.commentIds?.length) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 187, 0, 0.28)";
          ctx.fillRect(x3 * scale, line.yTwips * scale, a3 * scale, line.heightTwips * scale);
          ctx.restore();
        }
        if (ch === "	" && pl.tabLeaders?.get(gi)) {
          ctx.save();
          ctx.fillStyle = this.pageDark ? "#9aa0a6" : "#666";
          const dotFont = `400 ${span.sizePt * TWIPS_PER_PT * scale}px Aptos`;
          ctx.font = dotFont;
          const step = 90;
          for (let dx = 60; dx < a3 - 40; dx += step) {
            ctx.fillText(".", (x3 + dx) * scale, (line.baselineTwips + baseShift) * scale);
          }
          ctx.restore();
        }
        if (ch !== " " || this.showMarks) {
          const shown = this.showMarks && ch === " " ? "\xB7" : ch;
          const rel = x3 - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          ctx.fillText(shown, xSnap * scale, (line.baselineTwips + baseShift) * scale);
        }
        x3 += a3;
      }
      const effUnderline = props?.underline || st?.underline;
      const effStrike = props?.strike || st?.strike;
      if (effUnderline || effStrike || props?.doubleStrike) {
        ctx.strokeStyle = ctx.fillStyle;
        const w2 = x3 - segX0;
        const baseW = Math.max(1, fontPx / 16);
        const drawLine = (yOff, lw, dash = []) => {
          ctx.lineWidth = lw;
          ctx.setLineDash(dash);
          ctx.beginPath();
          ctx.moveTo(segX0 * scale, (line.baselineTwips + yOff) * scale);
          ctx.lineTo((segX0 + w2) * scale, (line.baselineTwips + yOff) * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        };
        const drawWave = (yOff, lw) => {
          ctx.lineWidth = lw;
          ctx.beginPath();
          const amp = 0.6 * baseW;
          const period = Math.max(4, fontPx / 6);
          for (let px = 0; px <= w2 * scale; px += 1) {
            const yy = (line.baselineTwips + yOff) * scale + Math.sin(px / period * Math.PI * 2) * amp;
            if (px === 0) ctx.moveTo(segX0 * scale, yy);
            else ctx.lineTo(segX0 * scale + px, yy);
          }
          ctx.stroke();
        };
        if (effUnderline) {
          ctx.strokeStyle = props?.underlineColor ? this.inkColor(props.underlineColor) : ctx.fillStyle;
          const yU = 40;
          switch (props?.underlineStyle) {
            case "double":
              drawLine(yU, baseW);
              drawLine(yU + baseW * 2.4, baseW);
              break;
            case "thick":
              drawLine(yU + baseW, baseW * 2.2);
              break;
            case "dotted":
              drawLine(yU, baseW, [baseW, baseW * 1.6]);
              break;
            case "dash":
              drawLine(yU, baseW, [baseW * 4, baseW * 2.5]);
              break;
            case "wave":
              drawWave(yU, baseW);
              break;
            default:
              drawLine(yU, baseW);
          }
          ctx.strokeStyle = ctx.fillStyle;
        }
        if (effStrike) drawLine(-span.sizePt * 0.25 * TWIPS_PER_PT, baseW);
        if (props?.doubleStrike) {
          const yS = -span.sizePt * 0.25 * TWIPS_PER_PT;
          drawLine(yS - baseW * 1.3, baseW);
          drawLine(yS + baseW * 1.3, baseW);
        }
      }
    }
    if (this.showMarks && line.rich.end === pl.charAdvances.length) {
      ctx.font = `${11 * TWIPS_PER_PT * scale}px Aptos`;
      ctx.fillStyle = "#888";
      ctx.fillText("\xB6", (x3 + 20) * scale, line.baselineTwips * scale);
    }
  }
  // ───────────────────────── exportação para PDF ─────────────────────────
  pdfImgCache = /* @__PURE__ */ new WeakMap();
  pdfColor(hex) {
    return hex ? hexColor(hex) : [0, 0, 0];
  }
  /**
   * Gera um PDF do documento reaproveitando o MESMO layout do canvas
   * (layoutCache, tabelas, imagens). Cada glifo é posicionado exatamente onde o
   * editor o desenha — inclusive o snap de 1/600" e a baseline do app de referência — de modo
   * que o PDF reproduz a página glifo a glifo.
   */
  async exportPdf() {
    if (!this.model || !this.fonts) throw new Error("document not loaded");
    await this.ensureImagesDecoded();
    const T2 = TWIPS_PER_PT;
    const doc = new PdfDocument({ compress: true });
    this.pdfImgCache = /* @__PURE__ */ new WeakMap();
    const cache = /* @__PURE__ */ new Map();
    const emb = (family, variant) => {
      const sf = this.fonts.resolve(family, variant);
      let e8 = cache.get(sf);
      if (!e8) {
        const fam = family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
        const bytes = this.fontBytes[fam]?.[variant] ?? this.fontBytes["Aptos"]?.["regular"];
        if (!bytes) throw new Error("font has no bytes to embed in the PDF");
        e8 = doc.embedFont(`${fam}-${variant}`, bytes, {
          unitsPerEm: sf.metrics.unitsPerEm,
          ascender: sf.metrics.ascender,
          descender: sf.metrics.descender,
          glyphId: (cp) => sf.glyphId(cp),
          advanceWidth: (g2) => sf.advanceWidth(g2)
        });
        cache.set(sf, e8);
      }
      return e8;
    };
    const pages = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push(doc.addPage(sp.pageWidthTwips / T2, sp.pageHeightTwips / T2));
    }
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const page = pages[line.page];
        if (page) this.pdfPaintLine(doc, page, emb, pl, line);
      }
    }
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (page) this.pdfPaintTable(doc, page, emb, tl);
    }
    for (const dc of this.dropCapFloats) {
      const page = pages[dc.page];
      if (!page) continue;
      const variant = dc.bold && dc.italic ? "boldItalic" : dc.bold ? "bold" : dc.italic ? "italic" : "regular";
      const baseline = dc.yTopTwips + dc.kPitch - dc.sizePt * 0.25 * T2;
      this.pdfGlyphsAt(page, emb, "Aptos", variant, dc.sizePt, this.pdfColor(dc.color), dc.text, dc.xTwips, baseline);
    }
    for (const f3 of this.floatImages) {
      const pl = this.layoutCache[f3.para];
      const first = pl?.lines[0];
      if (!first || !f3.run.image) continue;
      const page = pages[first.page];
      if (!page) continue;
      const img = f3.run.image;
      this.pdfImage(
        doc,
        page,
        img,
        (first.xTwips + (img.offsetXTwips ?? 0)) / T2,
        (first.yTwips + (img.offsetYTwips ?? 0)) / T2,
        img.widthTwips / T2,
        img.heightTwips / T2
      );
    }
    if (this.view === "print" && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg];
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (section) {
          const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
          const header = (pg === 0 && sp.titlePg ? section.headers.first : void 0) ?? section.headers.default;
          if (header?.length) this.pdfPaintHf(page, emb, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg);
          const footer = (pg === 0 && sp.titlePg ? section.footers.first : void 0) ?? section.footers.default;
          if (footer?.length) this.pdfPaintHf(page, emb, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg);
        }
        if (sp.cols?.sep && sp.cols.count > 1) {
          const cc = this.colContentOnPage(pg, sp);
          if (cc) for (let i7 = 0; i7 < cc.n - 1; i7++) {
            if (!cc.hasContent[i7 + 1]) continue;
            const xs = (cc.origin(i7 + 1) - cc.gap / 2) / T2;
            page.line(xs, sp.marginTopTwips / T2, xs, cc.maxBottom / T2, [0.74, 0.74, 0.74], 0.6);
          }
        }
        const hits = this.footnoteHits.filter((h3) => h3.page === pg);
        if (hits.length && this.fullDoc.footnotes.size) {
          let fy = sp.pageHeightTwips - sp.marginBottomTwips - hits.length * 260 - 120;
          page.line(sp.marginLeftTwips / T2, fy / T2, (sp.marginLeftTwips + 2880) / T2, fy / T2, [0.33, 0.33, 0.33], 0.75);
          fy += 220;
          for (const h3 of hits) {
            const paras = this.fullDoc.footnotes.get(h3.id);
            const text = paras?.map((p3) => p3.runs.map((r6) => r6.text).join("")).join(" ").trim() ?? "";
            this.pdfGlyphsAt(page, emb, "Aptos", "regular", 9, [0.2, 0.2, 0.2], `${h3.id}. ${text}`.slice(0, 160), sp.marginLeftTwips, fy);
            fy += 240;
          }
        }
      }
    }
    return doc.build();
  }
  /**
   * Exporta XPS reaproveitando o layout. Texto vai como <Glyphs UnicodeString>
   * (o leitor shape via CMap da fonte). Bordas/sombreado de tabela e imagens
   * ficam para uma versão futura — o foco aqui é texto + paginação corretos.
   */
  exportXps() {
    if (!this.model || !this.fonts) throw new Error("document not loaded");
    const T2 = TWIPS_PER_PT;
    const pages = [];
    const total = Math.max(1, this.pageCount);
    for (let pg = 0; pg < total; pg++) {
      const sp = this.sectPrAt(this.pageSections[pg] ?? 0);
      pages.push({
        widthPt: sp.pageWidthTwips / T2,
        heightPt: sp.pageHeightTwips / T2,
        fills: [],
        lines: [],
        glyphs: []
      });
    }
    const famOf = (family) => family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
    const colorOf = (hex) => {
      if (!hex) return [0.13, 0.13, 0.13];
      const n5 = parseInt(hex, 16);
      return [(n5 >> 16 & 255) / 255, (n5 >> 8 & 255) / 255, (n5 & 255) / 255];
    };
    const emitParaLine = (page, pl, line, runs) => {
      const baselinePt = line.baselineTwips / T2;
      for (const seg of line.rich.segments) {
        const span = pl.spans[seg.spanIndex];
        const run = runs[seg.spanIndex];
        if (!span) continue;
        const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
        const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
        if (!txt.trim()) continue;
        page.glyphs.push({
          text: txt,
          xPt: (line.xTwips + seg.xTwips) / T2,
          baselinePt,
          fontFamily: famOf(span.family),
          variant: span.variant === "boldItalic" ? "boldItalic" : span.variant === "bold" ? "bold" : span.variant === "italic" ? "italic" : "regular",
          sizePt: span.sizePt,
          colorRgb: colorOf(run?.props.color)
        });
        if (run?.props.underline) {
          const w2 = Math.max(0.3, span.sizePt * 0.07);
          page.lines.push({
            ax: (line.xTwips + seg.xTwips) / T2,
            ay: baselinePt + span.sizePt * 0.13,
            bx: (line.xTwips + seg.xTwips + seg.widthTwips) / T2,
            by: baselinePt + span.sizePt * 0.13,
            widthPt: w2,
            colorRgb: colorOf(run.props.color)
          });
        }
      }
    };
    for (const pl of this.layoutCache) {
      for (const line of pl.lines) {
        const para = this.model.paragraphs[line.para];
        if (!para) continue;
        const page = pages[line.page];
        if (page) emitParaLine(page, pl, line, para.runs);
      }
    }
    for (const tl of this.tableLayouts) {
      const page = pages[tl.page];
      if (!page) continue;
      for (const sh of tl.cellShades) {
        page.fills.push({
          xPt: (tl.xTwips + sh.xTwips) / T2,
          yPt: (tl.yTwips + sh.yTwips) / T2,
          wPt: sh.wTwips / T2,
          hPt: sh.hTwips / T2,
          colorRgb: colorOf(sh.hex)
        });
      }
      for (const cr of tl.cellRects) {
        const x0 = (tl.xTwips + cr.x0) / T2;
        const y0 = (tl.yTwips + cr.y0) / T2;
        const x1 = (tl.xTwips + cr.x1) / T2;
        const y1 = (tl.yTwips + cr.y1) / T2;
        const e8 = (edge, ax, ay, bx, by) => {
          if (!edge) return;
          page.lines.push({
            ax,
            ay,
            bx,
            by,
            widthPt: Math.max(0.25, edge.sizeEighthPt / 8),
            colorRgb: colorOf(edge.color)
          });
        };
        e8(cr.edges.top, x0, y0, x1, y0);
        e8(cr.edges.bottom, x0, y1, x1, y1);
        e8(cr.edges.left, x0, y0, x0, y1);
        e8(cr.edges.right, x1, y0, x1, y1);
      }
      for (const cl of tl.cellLines) {
        const variant = cl.bold && cl.italic ? "boldItalic" : cl.bold ? "bold" : cl.italic ? "italic" : "regular";
        page.glyphs.push({
          text: cl.text,
          xPt: (tl.xTwips + cl.xTwips) / T2,
          baselinePt: (tl.yTwips + cl.yTwips) / T2,
          fontFamily: famOf(cl.family),
          variant,
          sizePt: cl.sizePt,
          colorRgb: colorOf(cl.color)
        });
        if (cl.underline) {
          const wEm = Math.max(0.3, cl.sizePt * 0.07);
          page.lines.push({
            ax: (tl.xTwips + cl.xTwips) / T2,
            ay: (tl.yTwips + cl.yTwips) / T2 + cl.sizePt * 0.13,
            bx: (tl.xTwips + cl.xTwips + cl.text.length * cl.sizePt * 0.5) / T2,
            by: (tl.yTwips + cl.yTwips) / T2 + cl.sizePt * 0.13,
            widthPt: wEm,
            colorRgb: colorOf(cl.color)
          });
        }
      }
    }
    if (this.view === "print" && this.fullDoc) {
      for (let pg = 0; pg < pages.length; pg++) {
        const page = pages[pg];
        const sIdx = this.pageSections[pg] ?? this.pageSections[this.pageSections.length - 1] ?? 0;
        const section = this.sectionStarts[sIdx]?.section ?? this.fullDoc.sections[0];
        const sp = this.sectPrAt(sIdx);
        if (!section) continue;
        const colW = sp.pageWidthTwips - sp.marginLeftTwips - sp.marginRightTwips;
        const header = (pg === 0 && sp.titlePg ? section.headers.first : void 0) ?? section.headers.default;
        if (header?.length) this.xpsPaintHf(page, header, sp.marginLeftTwips, sp.headerDistanceTwips ?? 720, colW, pg);
        const footer = (pg === 0 && sp.titlePg ? section.footers.first : void 0) ?? section.footers.default;
        if (footer?.length) this.xpsPaintHf(page, footer, sp.marginLeftTwips, sp.pageHeightTwips - (sp.footerDistanceTwips ?? 720), colW, pg);
      }
    }
    return buildXps({ pages, fontBytes: this.fontBytes });
  }
  xpsPaintHf(page, paras, originXTwips, topYTwips, widthTwips, pageIdx) {
    if (!this.fonts) return;
    const T2 = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    const famOf = (family) => family?.split(" ")[0] === "Calibri" ? "Calibri" : "Aptos";
    let y3 = topYTwips;
    for (const p3 of paras) {
      const runs = p3.runs.map((r6) => r6.field ? { ...r6, text: /NUMPAGES/i.test(r6.field) ? String(this.pageCount) : /PAGE/i.test(r6.field) ? String(pageIdx + 1) : r6.text } : r6);
      const spans = this.buildSpans({ runs, props: p3.props });
      const { lines } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p3.props.tabStops?.length ? p3.props.tabStops : defaultTabs
      });
      const font = this.fonts.resolve(void 0, "regular");
      for (const line of lines) {
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font, lineSize, { line: 240, lineRule: "auto" }) * T2;
        let lx = originXTwips;
        const align = p3.props.alignment;
        if (align === "center") lx += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") lx += widthTwips - line.widthTwips;
        const baselinePt = (y3 + lh * 0.8) / T2;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          if (!span) continue;
          const run = runs[seg.spanIndex];
          const renderer = run?.custom ? this.inlineRenderers.get(run.custom.type)?.renderer : void 0;
          const txt = run?.custom ? renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText : span.text.slice(seg.start, seg.end);
          if (!txt.trim()) continue;
          page.glyphs.push({
            text: txt,
            xPt: (lx + seg.xTwips) / T2,
            baselinePt,
            fontFamily: famOf(span.family),
            variant: span.variant === "boldItalic" ? "boldItalic" : span.variant === "bold" ? "bold" : span.variant === "italic" ? "italic" : "regular",
            sizePt: span.sizePt,
            colorRgb: [0.33, 0.33, 0.33]
          });
        }
        y3 += lh;
      }
    }
  }
  /** Coleta todas as imagens do documento (corpo, tabelas, cabeçalhos/rodapés). */
  collectImages() {
    const out = [];
    const fromParas = (paras) => {
      for (const p3 of paras) for (const r6 of p3.runs) if (r6.image) out.push(r6.image);
    };
    const fromTable = (t5) => {
      for (const row of t5.rows) for (const c4 of row.cells) {
        fromParas(c4.paragraphs);
        for (const nt of c4.tables) fromTable(nt);
      }
    };
    if (this.model) fromParas(this.model.paragraphs);
    for (const a3 of this.tableAnchors) fromTable(a3.table);
    if (this.fullDoc) for (const sec of this.fullDoc.sections) {
      for (const set of [sec.headers, sec.footers]) {
        for (const paras of Object.values(set)) if (Array.isArray(paras)) fromParas(paras);
      }
    }
    return out;
  }
  /** Garante que todas as imagens estejam decodificadas (createImageBitmap é async). */
  async ensureImagesDecoded() {
    await Promise.all(this.collectImages().map(async (img) => {
      const cached = this.bitmaps.get(img);
      if (cached && cached !== "loading") return;
      try {
        const copy = new Uint8Array(img.data);
        const bmp = await createImageBitmap(new Blob([copy.buffer], { type: `image/${img.ext === "jpg" ? "jpeg" : img.ext}` }));
        this.bitmaps.set(img, bmp);
      } catch {
      }
    }));
  }
  /** Coloca os glifos de `text` em sequência usando NOSSOS advances (snap-free). */
  pdfGlyphsAt(page, emb, family, variant, sizePt, color, text, xTwips, baselineTwips) {
    const T2 = TWIPS_PER_PT;
    const sf = this.fonts.resolve(family, variant);
    const font = emb(family, variant);
    let x3 = xTwips;
    const placed = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      const a3 = sf.advanceTwips(cp, sizePt);
      if (ch !== " " && ch !== "	") {
        const { gid } = font.encode(cp);
        placed.push({ gid, codePoint: cp, xPt: x3 / T2, baselineFromTopPt: baselineTwips / T2 });
      }
      x3 += a3;
    }
    page.glyphs(font, deviceEmPt(sizePt), color, placed);
  }
  /** Versão PDF do paintLine: texto + decorações de parágrafo/run. */
  pdfPaintLine(doc, page, emb, pl, line) {
    const T2 = TWIPS_PER_PT;
    const para = this.model.paragraphs[line.para];
    const st = this.styleOf(para);
    const effBorders = para.props.borders ?? st?.borders;
    const effShading = para.props.shadingHex ?? st?.shadingHex;
    const effIndentL = para.props.indentLeftTwips ?? st?.indentLeftTwips ?? 0;
    const effIndentR = para.props.indentRightTwips ?? st?.indentRightTwips ?? 0;
    if (effShading || para.props.boxBorder || effBorders) {
      const s4 = this.sect();
      const colX = s4.marginLeftTwips + effIndentL;
      const colW = this.contentWidthTwips() - effIndentL - effIndentR;
      const isFirst = line.rich.start === 0;
      const isLast = line.rich.end === pl.charAdvances.length;
      if (effShading) {
        const bd = effBorders;
        const exL = (bd?.left?.spacePt ?? 0) * T2;
        const exR = (bd?.right?.spacePt ?? 0) * T2;
        const exT = isFirst ? (bd?.top?.spacePt ?? 0) * T2 : 0;
        const exB = isLast ? (bd?.bottom?.spacePt ?? 0) * T2 : 0;
        page.fillRect(
          (colX - exL) / T2,
          (line.yTwips - exT) / T2,
          (colW + exL + exR) / T2,
          (line.heightTwips + exT + exB) / T2,
          hexColor(effShading)
        );
      }
      if (effBorders || para.props.boxBorder) {
        const fallback = para.props.boxBorder && !effBorders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
        const b5 = effBorders ?? { top: fallback, bottom: fallback, left: fallback, right: fallback };
        const spL = (b5.left?.spacePt ?? 0) * T2, spR = (b5.right?.spacePt ?? 0) * T2;
        const spT = (b5.top?.spacePt ?? 0) * T2, spB = (b5.bottom?.spacePt ?? 0) * T2;
        const x0 = colX - spL, x1 = colX + colW + spR;
        const y0 = line.yTwips - (isFirst ? spT : 0), y1 = line.yTwips + line.heightTwips + (isLast ? spB : 0);
        const edge = (e8, ax, ay, bx, by) => {
          if (!e8) return;
          const dash = e8.style === "dashed" ? [6, 3.75] : e8.style === "dotted" ? [1.5, 3] : void 0;
          page.line(ax / T2, ay / T2, bx / T2, by / T2, this.pdfColor(e8.color), Math.max(0.4, e8.sizeEighthPt / 8), dash);
        };
        edge(b5.left, x0, y0, x0, y1);
        edge(b5.right, x1, y0, x1, y1);
        if (isFirst) edge(b5.top, x0, y0, x1, y0);
        if (isLast) edge(b5.bottom, x0, y1, x1, y1);
      }
    }
    if (line.marker) {
      this.pdfGlyphsAt(page, emb, "Aptos", "regular", 11, [0, 0, 0], line.marker.text, line.marker.xTwips, line.baselineTwips);
    }
    let x3 = line.xTwips;
    for (const seg of line.rich.segments) {
      const span = pl.spans[seg.spanIndex];
      const run = para.runs[seg.spanIndex];
      const props = run?.props;
      if (run?.custom) {
        const globalStart2 = pl.spanCharStart[seg.spanIndex] + seg.start;
        let widthTwips = 0;
        for (let i7 = 0; i7 < seg.end - seg.start; i7++) {
          widthTwips += pl.charAdvances[globalStart2 + i7];
        }
        const renderer = this.inlineRenderers.get(run.custom.type)?.renderer;
        const fallbackText = renderer?.toText?.(run.custom.data) ?? run.custom.fallbackText;
        this.pdfGlyphsAt(
          page,
          emb,
          span.family,
          span.variant,
          span.sizePt,
          this.pdfColor(props?.color ?? st?.color),
          fallbackText,
          x3,
          line.baselineTwips
        );
        x3 += widthTwips;
        continue;
      }
      if (run?.image) {
        const img = run.image;
        this.pdfImage(doc, page, img, x3 / T2, (line.baselineTwips - img.heightTwips) / T2, img.widthTwips / T2, img.heightTwips / T2);
        x3 += img.widthTwips;
        continue;
      }
      const sf = this.fonts.resolve(span.family, span.variant);
      const font = emb(span.family, span.variant);
      const col = this.pdfColor(props?.color ?? st?.color);
      const baseShift = props?.vertAlign === "superscript" ? -span.sizePt * 0.35 * T2 : props?.vertAlign === "subscript" ? span.sizePt * 0.14 * T2 : 0;
      const globalStart = pl.spanCharStart[seg.spanIndex] + seg.start;
      const segX0 = x3;
      const placed = [];
      for (let i7 = 0; i7 < seg.end - seg.start; i7++) {
        const gi = globalStart + i7;
        const ch = span.text[seg.start + i7];
        let a3 = pl.charAdvances[gi];
        if (line.justifyExtraPerSpace && ch === " ") a3 += line.justifyExtraPerSpace;
        if (props?.highlight) {
          page.fillRect(x3 / T2, line.yTwips / T2, a3 / T2, line.heightTwips / T2, hexColor((HIGHLIGHTS3[props.highlight] ?? "#ffff00").replace("#", "")));
        }
        if (run?.field) page.fillRect(x3 / T2, line.yTwips / T2, a3 / T2, line.heightTwips / T2, [0.9, 0.9, 0.9]);
        if (props?.commentIds?.length) page.fillRect(x3 / T2, line.yTwips / T2, a3 / T2, line.heightTwips / T2, [1, 0.925, 0.72]);
        if (ch === "	" && pl.tabLeaders?.get(gi)) {
          for (let dx = 60; dx < a3 - 40; dx += 90) {
            const cp = ".".codePointAt(0);
            const { gid } = font.encode(cp);
            placed.push({ gid, codePoint: cp, xPt: (x3 + dx) / T2, baselineFromTopPt: (line.baselineTwips + baseShift) / T2 });
          }
        }
        if (ch !== " " && ch !== "	" && ch !== "\n" && ch !== "\f") {
          const rel = x3 - line.xTwips;
          const xSnap = line.xTwips + Math.round(rel / 2.4) * 2.4;
          const cp = ch.codePointAt(0);
          const { gid } = font.encode(cp);
          placed.push({ gid, codePoint: cp, xPt: xSnap / T2, baselineFromTopPt: (line.baselineTwips + baseShift) / T2 });
        }
        x3 += a3;
      }
      page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
      if (props?.underline || props?.strike || props?.doubleStrike) {
        const w2 = x3 - segX0;
        const baseW = Math.max(0.5, deviceEmPt(span.sizePt) / 16);
        const drawU = (yOffTwips, lwPt, c4, dash) => page.line(segX0 / T2, (line.baselineTwips + yOffTwips) / T2, (segX0 + w2) / T2, (line.baselineTwips + yOffTwips) / T2, c4, lwPt, dash);
        if (props.underline) {
          const uc = props.underlineColor ? hexColor(props.underlineColor) : col;
          const yU = 40;
          switch (props.underlineStyle) {
            case "double":
              drawU(yU, baseW, uc);
              drawU(yU + 12, baseW, uc);
              break;
            case "thick":
              drawU(yU + 12, baseW * 2.2, uc);
              break;
            case "dotted":
              drawU(yU, baseW, uc, [baseW, baseW * 1.6]);
              break;
            case "dash":
              drawU(yU, baseW, uc, [baseW * 4, baseW * 2.5]);
              break;
            default:
              drawU(yU, baseW, uc);
          }
        }
        if (props.strike) drawU(-span.sizePt * 0.25 * T2, baseW, col);
        if (props.doubleStrike) {
          const yS = -span.sizePt * 0.25 * T2;
          drawU(yS - 8, baseW, col);
          drawU(yS + 8, baseW, col);
        }
      }
    }
  }
  /** Versão PDF do desenho de tabela (sombreado + bordas + texto das células). */
  pdfPaintTable(doc, page, emb, tl) {
    const T2 = TWIPS_PER_PT;
    for (const sh of tl.cellShades) {
      page.fillRect((tl.xTwips + sh.xTwips) / T2, (tl.yTwips + sh.yTwips) / T2, sh.wTwips / T2, sh.hTwips / T2, hexColor(sh.hex));
    }
    const strokeEdge = (e8, ax, ay, bx, by) => {
      if (!e8) return;
      const dash = e8.style === "dashed" ? [6, 3.75] : e8.style === "dotted" ? [1.5, 3] : void 0;
      page.line(
        (tl.xTwips + ax) / T2,
        (tl.yTwips + ay) / T2,
        (tl.xTwips + bx) / T2,
        (tl.yTwips + by) / T2,
        this.pdfColor(e8.color),
        Math.max(0.4, e8.sizeEighthPt / 8),
        dash
      );
    };
    for (const cr of tl.cellRects) {
      strokeEdge(cr.edges.top, cr.x0, cr.y0, cr.x1, cr.y0);
      strokeEdge(cr.edges.bottom, cr.x0, cr.y1, cr.x1, cr.y1);
      strokeEdge(cr.edges.left, cr.x0, cr.y0, cr.x0, cr.y1);
      strokeEdge(cr.edges.right, cr.x1, cr.y0, cr.x1, cr.y1);
    }
    for (const cl of tl.cellLines) {
      const variant = cl.bold && cl.italic ? "boldItalic" : cl.bold ? "bold" : cl.italic ? "italic" : "regular";
      this.pdfGlyphsAt(page, emb, cl.family, variant, cl.sizePt, this.pdfColor(cl.color), cl.text, tl.xTwips + cl.xTwips, tl.yTwips + cl.yTwips);
    }
  }
  /** Versão PDF do paintHf (cabeçalho/rodapé) com glifos posicionados. */
  pdfPaintHf(page, emb, paras, originXTwips, topYTwips, widthTwips, pageIdx) {
    if (!this.fonts) return;
    const T2 = TWIPS_PER_PT;
    const defaultTabs = [
      { posTwips: widthTwips / 2, align: "center" },
      { posTwips: widthTwips, align: "right" }
    ];
    let y3 = topYTwips;
    for (const p3 of paras) {
      const runs = p3.runs.map((r6) => r6.field ? { ...r6, text: /NUMPAGES/i.test(r6.field) ? String(this.pageCount) : /PAGE/i.test(r6.field) ? String(pageIdx + 1) : r6.text } : r6);
      const spans = this.buildSpans({ runs, props: p3.props });
      const { lines, charAdvances } = breakRich(spans, this.fonts, {
        availableTwips: widthTwips,
        tabStops: p3.props.tabStops?.length ? p3.props.tabStops : defaultTabs
      });
      const spanStart = [];
      let acc = 0;
      for (const s4 of spans) {
        spanStart.push(acc);
        acc += s4.text.length;
      }
      const font0 = this.fonts.resolve(void 0, "regular");
      const fallback = p3.props.boxBorder && !p3.props.borders ? { style: "single", sizeEighthPt: 4, spacePt: 1 } : void 0;
      const bd = p3.props.borders ?? (fallback ? { top: fallback, bottom: fallback, left: fallback, right: fallback } : void 0);
      const strokeEdge = (e8, ax, ay, bx, by) => {
        if (!e8) return;
        const dash = e8.style === "dashed" ? [6, 3.75] : e8.style === "dotted" ? [1.5, 3] : void 0;
        page.line(ax / T2, ay / T2, bx / T2, by / T2, this.pdfColor(e8.color), Math.max(0.4, e8.sizeEighthPt / 8), dash);
      };
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const lineSize = Math.max(line.maxSizePt, spans[0]?.sizePt ?? 11);
        const lh = lineHeightPt(font0, lineSize, { line: 240, lineRule: "auto" }) * T2;
        if (p3.props.shadingHex) {
          page.fillRect(originXTwips / T2, y3 / T2, widthTwips / T2, lh / T2, hexColor(p3.props.shadingHex));
        }
        let lx = originXTwips;
        const align = p3.props.alignment;
        if (align === "center") lx += (widthTwips - line.widthTwips) / 2;
        else if (align === "right") lx += widthTwips - line.widthTwips;
        const baseline = y3 + lh * 0.8;
        for (const seg of line.segments) {
          const span = spans[seg.spanIndex];
          const run = runs[seg.spanIndex];
          const font = emb(span.family, span.variant);
          const col = run?.props.color ? hexColor(run.props.color) : [0.33, 0.33, 0.33];
          const gs = spanStart[seg.spanIndex] + seg.start;
          let cx = lx + seg.xTwips;
          const placed = [];
          for (let i7 = 0; i7 < seg.end - seg.start; i7++) {
            const ch = span.text[seg.start + i7];
            const a3 = charAdvances[gs + i7];
            if (ch !== " " && ch !== "	") {
              const cp = ch.codePointAt(0);
              const { gid } = font.encode(cp);
              placed.push({ gid, codePoint: cp, xPt: cx / T2, baselineFromTopPt: baseline / T2 });
            }
            cx += a3;
          }
          page.glyphs(font, deviceEmPt(span.sizePt), col, placed);
        }
        if (bd) {
          const isFirst = li === 0;
          const isLast = li === lines.length - 1;
          const spL = (bd.left?.spacePt ?? 0) * T2;
          const spR = (bd.right?.spacePt ?? 0) * T2;
          const spT = (bd.top?.spacePt ?? 0) * T2;
          const spB = (bd.bottom?.spacePt ?? 0) * T2;
          const x0 = originXTwips - spL;
          const x1 = originXTwips + widthTwips + spR;
          const y0 = y3 - (isFirst ? spT : 0);
          const y1 = y3 + lh + (isLast ? spB : 0);
          strokeEdge(bd.left, x0, y0, x0, y1);
          strokeEdge(bd.right, x1, y0, x1, y1);
          if (isFirst) strokeEdge(bd.top, x0, y0, x1, y0);
          if (isLast) strokeEdge(bd.bottom, x0, y1, x1, y1);
        }
        y3 += lh;
      }
    }
  }
  /**
   * Embute (cacheado) e desenha uma imagem. Reencoda como JPEG e reamostra ao
   * tamanho EXIBIDO (~150 DPI), como o app de referência faz — evita PDFs gigantes (RGBA cru
   * de fotos em 4K explodia para dezenas de MB). Alpha é achatado em branco.
   */
  pdfImage(doc, page, img, xPt, yTopPt, wPt, hPt) {
    const DPI = 150;
    let handle = this.pdfImgCache.get(img);
    if (handle === void 0) {
      const bmp = this.bitmapFor(img);
      if (!bmp) {
        handle = null;
      } else {
        const sw = Math.max(1, Math.min(Math.round(wPt * DPI / 72), bmp.width));
        const sh = Math.max(1, Math.min(Math.round(hPt * DPI / 72), bmp.height));
        const c4 = document.createElement("canvas");
        c4.width = sw;
        c4.height = sh;
        const cx = c4.getContext("2d");
        cx.fillStyle = "#fff";
        cx.fillRect(0, 0, sw, sh);
        cx.drawImage(bmp, 0, 0, sw, sh);
        handle = doc.embedJpeg(dataUrlToBytes(c4.toDataURL("image/jpeg", 0.82)), sw, sh);
      }
      this.pdfImgCache.set(img, handle);
    }
    if (handle) page.drawImage(handle, xPt, yTopPt, wPt, hPt);
    else page.fillRect(xPt, yTopPt, wPt, hPt, [0.93, 0.93, 0.93]);
  }
};
function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i7 = 0; i7 < bin.length; i7++) out[i7] = bin.charCodeAt(i7);
  return out;
}
customElements.define("universal-write", UniversalWriteElement);

// src/mention-plugin.ts
function createMentionPlugin(options = {}) {
  const prefix = options.prefix ?? "@";
  return {
    id: "universalwrite.mention",
    inlineRenderers: [{
      type: "mention",
      toText: (data) => `${prefix}${data.label}`,
      measure: ({ fallbackText, measureText }) => ({
        widthTwips: measureText(fallbackText) + 180
      }),
      draw: (context) => drawMention(context, options)
    }],
    setup: options.source ? ({ editor }) => setupMentionAutocomplete(editor, options, prefix) : void 0
  };
}
function setupMentionAutocomplete(editor, options, prefix) {
  const source = options.source;
  const maxSuggestions = Math.max(1, options.maxSuggestions ?? 8);
  const popup = document.createElement("div");
  popup.hidden = true;
  popup.className = "wordnext-mention-menu";
  popup.setAttribute("role", "listbox");
  popup.setAttribute("aria-label", "Mention suggestions");
  Object.assign(popup.style, {
    position: "fixed",
    zIndex: "2147483647",
    width: "280px",
    maxHeight: "260px",
    overflowY: "auto",
    padding: "6px",
    border: "1px solid rgba(127,127,127,.35)",
    borderRadius: "10px",
    background: "#fff",
    color: "#202124",
    boxShadow: "0 12px 32px rgba(0,0,0,.28)",
    font: "14px/1.35 system-ui, sans-serif"
  });
  document.body.append(popup);
  let active = false;
  let query = "";
  let items = [];
  let selected = 0;
  let request = 0;
  const position = () => {
    const rect = editor.getBoundingClientRect();
    const left = Math.max(12, Math.min(window.innerWidth - 304, rect.left + 48));
    const top = Math.max(12, Math.min(window.innerHeight - 284, rect.top + 88));
    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(top)}px`;
  };
  const choose = (item) => {
    close();
    editor.insertCustomInline("mention", item);
    editor.focusEditor();
  };
  const render = () => {
    popup.replaceChildren();
    popup.hidden = !active;
    if (!active) return;
    const heading = document.createElement("div");
    heading.textContent = query ? `${prefix}${query}` : "Escolha uma pessoa";
    Object.assign(heading.style, {
      padding: "6px 10px 8px",
      color: "#5f6368",
      fontSize: "12px",
      fontWeight: "600"
    });
    popup.append(heading);
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = options.emptyLabel ?? "No mentions found";
      Object.assign(empty.style, { padding: "10px", color: "#6b7280" });
      popup.append(empty);
      return;
    }
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `wordnext-mention-option-${index}`;
      button.dataset.index = String(index);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(index === selected));
      button.textContent = `${prefix}${item.label}`;
      Object.assign(button.style, {
        display: "block",
        width: "100%",
        padding: "9px 10px",
        border: "0",
        borderRadius: "7px",
        background: index === selected ? "#e8f0fe" : "transparent",
        color: index === selected ? "#174ea6" : "#202124",
        textAlign: "left",
        cursor: "pointer",
        font: "inherit"
      });
      button.addEventListener("mouseenter", () => {
        selected = index;
        render();
      });
      button.addEventListener("click", () => choose(item));
      popup.append(button);
    });
    popup.setAttribute("aria-activedescendant", `wordnext-mention-option-${selected}`);
  };
  const refresh = async () => {
    const current = ++request;
    let result;
    try {
      result = await source(query);
    } catch {
      result = [];
    }
    if (!active || current !== request) return;
    items = result.slice(0, maxSuggestions);
    selected = Math.min(selected, Math.max(0, items.length - 1));
    render();
  };
  function open() {
    active = true;
    query = "";
    items = [];
    selected = 0;
    position();
    render();
    void refresh();
  }
  function close() {
    active = false;
    query = "";
    items = [];
    request++;
    popup.hidden = true;
    popup.replaceChildren();
    popup.removeAttribute("aria-activedescendant");
  }
  const onBeforeInput = (raw) => {
    const event = raw;
    const text = event.detail?.text ?? "";
    if (!active) {
      if (text === prefix) {
        event.preventDefault();
        open();
      }
      return;
    }
    event.preventDefault();
    if (!text || /[\r\n\t ]/.test(text)) {
      close();
      return;
    }
    query += text;
    selected = 0;
    void refresh();
  };
  const onKeyDown = (event) => {
    if (!active) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (items.length) {
        selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        render();
      }
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = items[selected];
      if (item) choose(item);
      else close();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!query) close();
      else {
        query = query.slice(0, -1);
        selected = 0;
        void refresh();
      }
    }
  };
  const onPointerDown = (event) => {
    if (active && event.target !== editor && !popup.contains(event.target)) close();
  };
  const onLayout = () => {
    if (active) position();
  };
  editor.addEventListener("uw-before-input", onBeforeInput);
  editor.addEventListener("keydown", onKeyDown, true);
  popup.addEventListener("mousedown", (event) => event.preventDefault());
  window.addEventListener("mousedown", onPointerDown);
  window.addEventListener("resize", onLayout);
  editor.addEventListener("scroll", onLayout);
  return () => {
    editor.removeEventListener("uw-before-input", onBeforeInput);
    editor.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("mousedown", onPointerDown);
    window.removeEventListener("resize", onLayout);
    editor.removeEventListener("scroll", onLayout);
    popup.remove();
  };
}
function drawMention(context, options) {
  const { ctx, xTwips, yTwips, baselineTwips, widthTwips, heightTwips, scale } = context;
  const x3 = xTwips * scale;
  const y3 = (yTwips + 16) * scale;
  const width = widthTwips * scale;
  const height = Math.max(1, heightTwips - 32) * scale;
  const radius = Math.min(80 * scale, height / 2);
  ctx.save();
  ctx.fillStyle = options.background ?? (context.dark ? "#394b63" : "#dce8ff");
  ctx.beginPath();
  ctx.moveTo(x3 + radius, y3);
  ctx.lineTo(x3 + width - radius, y3);
  ctx.quadraticCurveTo(x3 + width, y3, x3 + width, y3 + radius);
  ctx.lineTo(x3 + width, y3 + height - radius);
  ctx.quadraticCurveTo(x3 + width, y3 + height, x3 + width - radius, y3 + height);
  ctx.lineTo(x3 + radius, y3 + height);
  ctx.quadraticCurveTo(x3, y3 + height, x3, y3 + height - radius);
  ctx.lineTo(x3, y3 + radius);
  ctx.quadraticCurveTo(x3, y3, x3 + radius, y3);
  ctx.fill();
  ctx.fillStyle = options.color ?? (context.dark ? "#d8e6ff" : "#174ea6");
  ctx.fillText(context.fallbackText, x3 + 90 * scale, baselineTwips * scale);
  ctx.restore();
}

// ../compare/src/myers.ts
function myersDiff(n5, m2, eq) {
  if (n5 === 0 && m2 === 0) return [];
  if (n5 === 0) {
    const out = [];
    for (let j = 0; j < m2; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m2 === 0) {
    const out = [];
    for (let i7 = 0; i7 < n5; i7++) {
      out.push({ op: "delete", aIndex: i7, bIndex: -1 });
    }
    return out;
  }
  const max2 = n5 + m2;
  const size = 2 * max2 + 1;
  const trace = [];
  const V2 = new Int32Array(size);
  outer: for (let d3 = 0; d3 <= max2; d3++) {
    trace.push(new Int32Array(V2));
    for (let k2 = -d3; k2 <= d3; k2 += 2) {
      const kIdx = k2 + max2;
      let x4;
      if (k2 === -d3) {
        x4 = V2[kIdx + 1] ?? 0;
      } else if (k2 === d3) {
        x4 = (V2[kIdx - 1] ?? 0) + 1;
      } else {
        const down = V2[kIdx + 1] ?? 0;
        const right = (V2[kIdx - 1] ?? 0) + 1;
        x4 = down > right ? down : right;
      }
      let y4 = x4 - k2;
      while (x4 < n5 && y4 < m2 && eq(x4, y4)) {
        x4++;
        y4++;
      }
      V2[kIdx] = x4;
      if (x4 >= n5 && y4 >= m2) {
        break outer;
      }
    }
  }
  const ops = [];
  let x3 = n5;
  let y3 = m2;
  for (let d3 = trace.length - 1; d3 >= 0; d3--) {
    const Vd = trace[d3];
    if (!Vd) break;
    const k2 = x3 - y3;
    const kIdx = k2 + max2;
    let prevK;
    if (k2 === -d3) {
      prevK = k2 + 1;
    } else if (k2 === d3) {
      prevK = k2 - 1;
    } else {
      const down = Vd[kIdx + 1] ?? 0;
      const right = Vd[kIdx - 1] ?? 0;
      prevK = down > right ? k2 + 1 : k2 - 1;
    }
    const prevX = Vd[prevK + max2] ?? 0;
    const prevY = prevX - prevK;
    while (x3 > prevX && y3 > prevY) {
      ops.push({ op: "equal", aIndex: x3 - 1, bIndex: y3 - 1 });
      x3--;
      y3--;
    }
    if (d3 > 0) {
      if (x3 === prevX) {
        ops.push({ op: "insert", aIndex: -1, bIndex: y3 - 1 });
      } else {
        ops.push({ op: "delete", aIndex: x3 - 1, bIndex: -1 });
      }
      x3 = prevX;
      y3 = prevY;
    }
  }
  ops.reverse();
  return ops;
}

// ../compare/src/histogram.ts
function histogramDiff(n5, m2, eq, getKeyA, getKeyB) {
  if (n5 === 0 && m2 === 0) return [];
  if (n5 === 0) {
    const out = [];
    for (let j = 0; j < m2; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return out;
  }
  if (m2 === 0) {
    const out = [];
    for (let i7 = 0; i7 < n5; i7++) {
      out.push({ op: "delete", aIndex: i7, bIndex: -1 });
    }
    return out;
  }
  const ops = [];
  recurse(0, n5, 0, m2, eq, getKeyA, getKeyB, ops);
  return ops;
}
function recurse(a0, a1, b0, b1, eq, getKeyA, getKeyB, out) {
  if (a0 >= a1 && b0 >= b1) return;
  if (a0 >= a1) {
    for (let j = b0; j < b1; j++) {
      out.push({ op: "insert", aIndex: -1, bIndex: j });
    }
    return;
  }
  if (b0 >= b1) {
    for (let i7 = a0; i7 < a1; i7++) {
      out.push({ op: "delete", aIndex: i7, bIndex: -1 });
    }
    return;
  }
  const histA = /* @__PURE__ */ new Map();
  for (let i7 = a0; i7 < a1; i7++) {
    const k2 = getKeyA(i7);
    const bucket = histA.get(k2);
    if (bucket) {
      bucket.push(i7);
    } else {
      histA.set(k2, [i7]);
    }
  }
  let bestCount = Number.POSITIVE_INFINITY;
  let bestSpan = -1;
  let bestShift = Number.POSITIVE_INFINITY;
  let bestAL = -1;
  let bestAR = -1;
  let bestBL = -1;
  for (let j = b0; j < b1; j++) {
    const k2 = getKeyB(j);
    const bucket = histA.get(k2);
    if (!bucket) continue;
    const count = bucket.length;
    for (const aIdx of bucket) {
      if (!eq(aIdx, j)) continue;
      let aL = aIdx;
      let bL = j;
      while (aL > a0 && bL > b0 && eq(aL - 1, bL - 1)) {
        aL--;
        bL--;
      }
      let aR = aIdx + 1;
      let bR = j + 1;
      while (aR < a1 && bR < b1 && eq(aR, bR)) {
        aR++;
        bR++;
      }
      const span = aR - aL;
      const shift = aL > bL ? aL - bL : bL - aL;
      let better = false;
      if (count < bestCount) {
        better = true;
      } else if (count === bestCount) {
        if (span > bestSpan) {
          better = true;
        } else if (span === bestSpan) {
          if (shift < bestShift) {
            better = true;
          } else if (shift === bestShift) {
            if (bL < bestBL) {
              better = true;
            } else if (bL === bestBL && aL < bestAL) {
              better = true;
            }
          }
        }
      }
      if (better) {
        bestCount = count;
        bestSpan = span;
        bestShift = shift;
        bestAL = aL;
        bestAR = aR;
        bestBL = bL;
      }
    }
  }
  if (bestAL === -1) {
    const subOps = myersDiff(a1 - a0, b1 - b0, (i7, j) => eq(a0 + i7, b0 + j));
    for (const op of subOps) {
      out.push({
        op: op.op,
        aIndex: op.aIndex >= 0 ? op.aIndex + a0 : -1,
        bIndex: op.bIndex >= 0 ? op.bIndex + b0 : -1
      });
    }
    return;
  }
  const bRight = bestBL + (bestAR - bestAL);
  recurse(a0, bestAL, b0, bestBL, eq, getKeyA, getKeyB, out);
  for (let off = 0; off < bestAR - bestAL; off++) {
    out.push({ op: "equal", aIndex: bestAL + off, bIndex: bestBL + off });
  }
  recurse(bestAR, a1, bRight, b1, eq, getKeyA, getKeyB, out);
}

// ../compare/src/tokens.ts
function fnv1a(bytes) {
  let h3 = 2166136261;
  for (let i7 = 0; i7 < bytes.length; i7++) {
    h3 ^= bytes[i7];
    h3 = Math.imul(h3, 16777619);
  }
  return (h3 >>> 0).toString(16);
}
function bytesEqual(a3, b5) {
  if (a3 === b5) return true;
  if (a3.byteLength !== b5.byteLength) return false;
  for (let i7 = 0; i7 < a3.byteLength; i7++) {
    if (a3[i7] !== b5[i7]) return false;
  }
  return true;
}
var SEP2 = "";
var sanitize = (s4) => s4.includes(SEP2) ? s4.split(SEP2).join("") : s4;
var imageContentMarker = (data) => `${SEP2}img:${data.byteLength}:${fnv1a(data)}${SEP2}`;
var frame = (tag, s4) => `${SEP2}${tag}${s4.length}${SEP2}${s4}`;
function runPropsSig(p3) {
  return [
    p3.bold ? "b" : "",
    p3.italic ? "i" : "",
    p3.underline ? `u${p3.underlineStyle ?? "single"}${p3.underlineColor ?? ""}` : "",
    p3.strike ? "s" : "",
    p3.doubleStrike ? "ds" : "",
    p3.vertAlign ?? "",
    p3.szHalfPt ?? "",
    p3.color ?? "",
    p3.highlight ?? "",
    p3.fontAscii ?? "",
    p3.allCaps ? "ac" : "",
    p3.smallCaps ? "sc" : "",
    p3.charSpacingTwips ?? "",
    p3.link ?? "",
    p3.isMath ? "m" : ""
  ].join("|");
}
function paraPropsSig(p3) {
  return [
    p3.alignment ?? "",
    p3.styleId ?? "",
    p3.numbering ? `${p3.numbering.kind}:${p3.numbering.ilvl}` : "",
    p3.indentLeftTwips ?? "",
    p3.indentRightTwips ?? "",
    p3.indentFirstLineTwips ?? "",
    p3.lineTwentieths ?? "",
    p3.spaceAfterTwips ?? "",
    p3.spaceBeforeTwips ?? "",
    p3.tocInstr ?? "",
    p3.tocEntry ? "t" : "",
    p3.tabStops ? JSON.stringify(p3.tabStops) : "",
    p3.shadingHex ?? "",
    p3.boxBorder ? "bb" : "",
    p3.borders ? JSON.stringify(p3.borders) : "",
    p3.pageBreakBefore ? "pb" : "",
    p3.dropCap ? "dc" : "",
    p3.sectionBreak ? JSON.stringify(p3.sectionBreak.sectPr) : ""
  ].join("|");
}
function paragraphContentKey(p3) {
  const segs = [];
  let prevField = null;
  for (const r6 of p3.runs) {
    if (r6.field !== void 0) {
      const instr = sanitize(r6.field.trim());
      if (prevField !== instr) segs.push(`${SEP2}fld:${instr}${SEP2}`);
      prevField = instr;
      continue;
    }
    prevField = null;
    if (r6.image) {
      segs.push(imageContentMarker(r6.image.data));
    } else if (r6.noteRef) {
      segs.push(`${SEP2}note:${r6.noteRef.kind}${SEP2}`);
    } else if (r6.custom) {
      const t5 = sanitize(r6.custom.type);
      segs.push(`${SEP2}custom:${t5.length}:${t5}:${sanitize(r6.custom.fallbackText)}${SEP2}`);
    } else {
      segs.push(sanitize(r6.text));
    }
  }
  return segs.join("");
}
function paragraphFormatKey(p3) {
  const segs = [];
  let curSig = "";
  let curLen = 0;
  let curImg = "";
  const flush = () => {
    if (curLen > 0 || curImg) segs.push(`${curLen}:${curSig}${curImg}`);
    curLen = 0;
    curImg = "";
  };
  for (const r6 of p3.runs) {
    const sig = runPropsSig(r6.props);
    const img = r6.image ? `img[${r6.image.widthTwips}x${r6.image.heightTwips}${r6.image.floating ? `@${r6.image.offsetXTwips ?? 0},${r6.image.offsetYTwips ?? 0}` : ""}]` : "";
    if (sig !== curSig || img) {
      flush();
      curSig = sig;
      curImg = img;
    }
    curLen += r6.text.length;
    if (img) flush();
  }
  flush();
  return `${paraPropsSig(p3.props)}${SEP2}${segs.join(SEP2)}`;
}
function collectParagraphImages(p3, out) {
  for (const r6 of p3.runs) {
    if (r6.image) out.push(r6.image.data);
  }
}
function cellContentKey(c4) {
  const parts = [
    ...c4.paragraphs.map((p3) => frame("P", paragraphContentKey(p3))),
    ...c4.tables.map((t5) => frame("T", tableContentKey(t5)))
  ];
  return `${parts.join("")}${SEP2}span${c4.gridSpan}`;
}
function tableContentKey(t5) {
  return t5.rows.map((row) => frame("R", row.cells.map((c4) => frame("C", cellContentKey(c4))).join(""))).join("");
}
function cellFormatKey(c4) {
  const parts = [
    ...c4.paragraphs.map((p3) => frame("P", paragraphFormatKey(p3))),
    ...c4.tables.map((t5) => frame("T", tableFormatKey(t5)))
  ];
  return [
    parts.join(""),
    c4.widthTwips ?? "",
    c4.shadingHex ?? "",
    c4.borders ? JSON.stringify(c4.borders) : ""
  ].join(SEP2);
}
function tableFormatKey(t5) {
  const rows = t5.rows.map((row) => frame("R", row.cells.map((c4) => frame("C", cellFormatKey(c4))).join(""))).join("");
  return [
    t5.gridColsTwips.join(","),
    t5.borders ? JSON.stringify(t5.borders) : "",
    rows
  ].join(SEP2);
}
function collectTableImages(t5, out) {
  for (const row of t5.rows) {
    for (const cell of row.cells) {
      for (const p3 of cell.paragraphs) collectParagraphImages(p3, out);
      for (const nested of cell.tables) collectTableImages(nested, out);
    }
  }
}
function tokenizeBlock(block) {
  if (block.type === "paragraph") {
    const images2 = [];
    collectParagraphImages(block.paragraph, images2);
    return {
      kind: "paragraph",
      block,
      contentKey: frame("p", paragraphContentKey(block.paragraph)),
      formatKey: paragraphFormatKey(block.paragraph),
      images: images2
    };
  }
  const images = [];
  collectTableImages(block, images);
  return {
    kind: "table",
    block,
    contentKey: frame("t", tableContentKey(block)),
    formatKey: tableFormatKey(block),
    images
  };
}
function tokenizeBlocks(blocks) {
  return blocks.map(tokenizeBlock);
}
function tokensEqual(a3, b5) {
  if (a3.contentKey !== b5.contentKey) return false;
  if (a3.images.length !== b5.images.length) return false;
  for (let i7 = 0; i7 < a3.images.length; i7++) {
    if (!bytesEqual(a3.images[i7], b5.images[i7])) return false;
  }
  return true;
}
var rowContentKey = (row) => row.cells.map((c4) => frame("C", cellContentKey(c4))).join("");
var rowFormatKey = (row) => row.cells.map((c4) => frame("C", cellFormatKey(c4))).join("");

// ../compare/src/diff.ts
var DEFAULT_DOC_DIFF_OPTIONS = {
  algorithm: "histogram",
  intraWord: true
};
function opsToRuns(ops, aTokens, bTokens) {
  const tagged = ops.map((o7) => {
    if (o7.op === "equal" && aTokens[o7.aIndex].formatKey !== bTokens[o7.bIndex].formatKey) {
      return { op: "format", aIndex: o7.aIndex, bIndex: o7.bIndex };
    }
    return o7;
  });
  const runs = [];
  let i7 = 0;
  let aPos = 0;
  let bPos = 0;
  while (i7 < tagged.length) {
    const op = tagged[i7];
    let j = i7 + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i7, j);
    const aIdxs = [];
    const bIdxs = [];
    for (const s4 of slice) {
      if (s4.aIndex >= 0) aIdxs.push(s4.aIndex);
      if (s4.bIndex >= 0) bIdxs.push(s4.bIndex);
    }
    runs.push({
      kind: op.op,
      aIdxs,
      bIdxs,
      aStart: aPos + 1,
      bStart: bPos + 1
    });
    aPos += aIdxs.length;
    bPos += bIdxs.length;
    i7 = j;
  }
  return runs;
}
function runsToEdits(runs) {
  const edits = [];
  let i7 = 0;
  while (i7 < runs.length) {
    const r6 = runs[i7];
    const next = runs[i7 + 1];
    if (r6.kind === "delete" && next && next.kind === "insert") {
      edits.push({
        kind: "change",
        a: { start: r6.aStart, end: r6.aStart + r6.aIdxs.length - 1 },
        b: { start: next.bStart, end: next.bStart + next.bIdxs.length - 1 },
        aBlocks: r6.aIdxs,
        bBlocks: next.bIdxs
      });
      i7 += 2;
      continue;
    }
    if (r6.kind === "insert" && next && next.kind === "delete") {
      edits.push({
        kind: "change",
        a: { start: next.aStart, end: next.aStart + next.aIdxs.length - 1 },
        b: { start: r6.bStart, end: r6.bStart + r6.bIdxs.length - 1 },
        aBlocks: next.aIdxs,
        bBlocks: r6.bIdxs
      });
      i7 += 2;
      continue;
    }
    if (r6.kind === "equal" || r6.kind === "format") {
      edits.push({
        kind: r6.kind === "format" ? "change" : "equal",
        a: { start: r6.aStart, end: r6.aStart + r6.aIdxs.length - 1 },
        b: { start: r6.bStart, end: r6.bStart + r6.bIdxs.length - 1 },
        aBlocks: r6.aIdxs,
        bBlocks: r6.bIdxs,
        ...r6.kind === "format" ? { formatOnly: true, importance: "minor" } : {}
      });
    } else if (r6.kind === "delete") {
      edits.push({
        kind: "delete",
        a: { start: r6.aStart, end: r6.aStart + r6.aIdxs.length - 1 },
        b: { start: r6.bStart, end: r6.bStart - 1 },
        aBlocks: r6.aIdxs,
        bBlocks: []
      });
    } else {
      edits.push({
        kind: "insert",
        a: { start: r6.aStart, end: r6.aStart - 1 },
        b: { start: r6.bStart, end: r6.bStart + r6.bIdxs.length - 1 },
        aBlocks: [],
        bBlocks: r6.bIdxs
      });
    }
    i7++;
  }
  return edits;
}
function wordTokens(text) {
  const out = [];
  const re = /\S+|\s+/g;
  let m2;
  while ((m2 = re.exec(text)) !== null) {
    out.push({ start: m2.index, end: m2.index + m2[0].length, text: m2[0] });
  }
  return out;
}
function intraWordMarks(aText, bText, pairOffset) {
  if (aText === bText) return [];
  const aToks = wordTokens(aText);
  const bToks = wordTokens(bText);
  const ops = myersDiff(
    aToks.length,
    bToks.length,
    (i7, j) => aToks[i7].text === bToks[j].text
  );
  const marks = [];
  let hasEqual = false;
  for (const op of ops) {
    if (op.op === "equal") {
      if (/\S/.test(aToks[op.aIndex].text)) hasEqual = true;
    } else if (op.op === "delete") {
      const t5 = aToks[op.aIndex];
      marks.push({ kind: "delete", side: "a", pairOffset, startCh: t5.start, endCh: t5.end });
    } else {
      const t5 = bToks[op.bIndex];
      marks.push({ kind: "insert", side: "b", pairOffset, startCh: t5.start, endCh: t5.end });
    }
  }
  if (!hasEqual) return [];
  const merged = [];
  for (const mk of marks) {
    const last = merged[merged.length - 1];
    if (last && last.side === mk.side && last.kind === mk.kind && last.endCh === mk.startCh) {
      last.endCh = mk.endCh;
    } else {
      merged.push(mk);
    }
  }
  return merged;
}
function tableRowDiff(a3, b5) {
  if (a3.type !== "table" || b5.type !== "table") return null;
  const aKeys = a3.rows.map(rowContentKey);
  const bKeys = b5.rows.map(rowContentKey);
  const ops = histogramDiff(
    a3.rows.length,
    b5.rows.length,
    (i8, j) => aKeys[i8] === bKeys[j],
    (i8) => aKeys[i8],
    (j) => bKeys[j]
  );
  const out = [];
  let i7 = 0;
  const tagged = ops.map((o7) => ({
    op: o7.op === "equal" && rowFormatKey(a3.rows[o7.aIndex]) !== rowFormatKey(b5.rows[o7.bIndex]) ? "format" : o7.op,
    aIndex: o7.aIndex,
    bIndex: o7.bIndex
  }));
  while (i7 < tagged.length) {
    const op = tagged[i7];
    let j = i7 + 1;
    while (j < tagged.length && tagged[j].op === op.op) j++;
    const slice = tagged.slice(i7, j);
    const aRows = slice.filter((s4) => s4.aIndex >= 0).map((s4) => s4.aIndex);
    const bRows = slice.filter((s4) => s4.bIndex >= 0).map((s4) => s4.bIndex);
    const last = out[out.length - 1];
    if (op.op === "insert" && last && last.kind === "delete" && last.bRows.length === 0) {
      last.kind = "change";
      last.bRows = bRows;
    } else if (op.op === "delete" && last && last.kind === "insert" && last.aRows.length === 0) {
      last.kind = "change";
      last.aRows = aRows;
    } else {
      out.push({
        kind: op.op === "format" ? "change" : op.op === "equal" ? "equal" : op.op,
        aRows,
        bRows,
        ...op.op === "format" ? { formatOnly: true } : {}
      });
    }
    i7 = j;
  }
  return out;
}
function diffBlocks(aBlocks, bBlocks, opts = {}) {
  const o7 = { ...DEFAULT_DOC_DIFF_OPTIONS, ...opts };
  const aTokens = tokenizeBlocks(aBlocks);
  const bTokens = tokenizeBlocks(bBlocks);
  const eq = (i7, j) => tokensEqual(aTokens[i7], bTokens[j]);
  const ops = o7.algorithm === "myers" ? myersDiff(aTokens.length, bTokens.length, eq) : histogramDiff(
    aTokens.length,
    bTokens.length,
    eq,
    (i7) => aTokens[i7].contentKey,
    (j) => bTokens[j].contentKey
  );
  const edits = runsToEdits(opsToRuns(ops, aTokens, bTokens));
  for (const e8 of edits) {
    if (e8.kind !== "change" || e8.formatOnly) continue;
    const pairs = Math.min(e8.aBlocks.length, e8.bBlocks.length);
    const intra = [];
    const tableRows = [];
    let anyTable = false;
    for (let p3 = 0; p3 < pairs; p3++) {
      const aB = aBlocks[e8.aBlocks[p3]];
      const bB = bBlocks[e8.bBlocks[p3]];
      if (aB.type === "paragraph" && bB.type === "paragraph") {
        if (o7.intraWord) {
          intra.push(...intraWordMarks(paraText(aB.paragraph), paraText(bB.paragraph), p3));
        }
        tableRows.push(null);
      } else {
        const rd = tableRowDiff(aB, bB);
        tableRows.push(rd);
        if (rd) anyTable = true;
      }
    }
    if (intra.length > 0) e8.intra = intra;
    if (anyTable) e8.tableRows = tableRows;
  }
  const stats = { inserted: 0, deleted: 0, changed: 0, formatOnly: 0, equal: 0 };
  for (const e8 of edits) {
    if (e8.kind === "equal") stats.equal += e8.aBlocks.length;
    else if (e8.kind === "insert") stats.inserted += e8.bBlocks.length;
    else if (e8.kind === "delete") stats.deleted += e8.aBlocks.length;
    else if (e8.formatOnly) stats.formatOnly += e8.aBlocks.length;
    else stats.changed += Math.max(e8.aBlocks.length, e8.bBlocks.length);
  }
  return { edits, stats };
}
function diffDocuments(a3, b5, opts = {}) {
  return diffBlocks(a3.blocks, b5.blocks, opts);
}

// ../compare/src/universal-write-diff.ts
var Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {
};
var HIGHLIGHT = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#00008b",
  darkCyan: "#008b8b",
  darkGreen: "#006400",
  darkMagenta: "#8b008b",
  darkRed: "#8b0000",
  darkYellow: "#808000",
  darkGray: "#a9a9a9",
  lightGray: "#d3d3d3",
  black: "#000000",
  white: "#ffffff"
};
var hex6 = (s4) => s4 && /^[0-9a-fA-F]{6}$/.test(s4) ? `#${s4}` : null;
var MIME = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  emf: "image/emf"
};
var STYLE2 = (
  /* css */
  `
:host {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: system-ui, sans-serif;
  /* Conven\xE7\xF5es de cor do OpenCompare (insert verde, delete vermelho,
     change vermelho no par, minor/formata\xE7\xE3o azul). */
  --uwd-insert-bg: light-dark(rgba(63,185,80,0.15), rgba(63,185,80,0.18));
  --uwd-insert-bg-intra: light-dark(rgba(63,185,80,0.40), rgba(63,185,80,0.45));
  --uwd-delete-bg: light-dark(rgba(248,81,73,0.15), rgba(248,81,73,0.18));
  --uwd-delete-bg-intra: light-dark(rgba(248,81,73,0.40), rgba(248,81,73,0.45));
  --uwd-minor-bg: light-dark(rgba(59,130,246,0.12), rgba(59,130,246,0.16));
  --uwd-stripe-insert: #3fb950;
  --uwd-stripe-delete: #f85149;
  --uwd-stripe-minor: #3b82f6;
  --uwd-border: light-dark(#d0d7de, #3d444d);
  --uwd-text: light-dark(#1f2328, #e6edf3);
  --uwd-text-2: light-dark(#59636e, #9198a1);
  --uwd-chrome: light-dark(#f6f8fa, #151b23);
  --uwd-page: light-dark(#ffffff, #0d1117);
  color: var(--uwd-text);
  background: var(--uwd-page);
}
.uwd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--uwd-border);
  background: var(--uwd-chrome);
  font-size: 13px;
  flex: none;
}
.uwd-header .uwd-stats { display: flex; gap: 10px; color: var(--uwd-text-2); }
.uwd-stat::before { content: "\u25CF"; margin-right: 4px; font-size: 10px; }
.uwd-stat--ins::before { color: var(--uwd-stripe-insert); }
.uwd-stat--del::before { color: var(--uwd-stripe-delete); }
.uwd-stat--chg::before { color: var(--uwd-stripe-delete); }
.uwd-stat--fmt::before { color: var(--uwd-stripe-minor); }
.uwd-header .uwd-spacer { flex: 1; }
.uwd-header button {
  border: 1px solid var(--uwd-border);
  background: transparent;
  color: var(--uwd-text);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.uwd-header button[data-on="1"] { background: var(--uwd-minor-bg); border-color: var(--uwd-stripe-minor); }
.uwd-header .uwd-close { border: none; font-size: 16px; line-height: 1; padding: 2px 8px; }
.uwd-body { flex: 1; overflow: auto; min-height: 0; }
.uwd-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
}
.uwd-pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  grid-column: span 2;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-bottom: 1px solid var(--uwd-border);
}
.uwd-gutter {
  padding: 4px 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--uwd-text-2);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell {
  position: relative;
  padding: 4px 12px 4px 14px;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--stripe, transparent);
}
.uwd-cell[data-kind="insert"] { --stripe: var(--uwd-stripe-insert); background: var(--uwd-insert-bg); }
.uwd-cell[data-kind="delete"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="change"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="format"] { --stripe: var(--uwd-stripe-minor); background: var(--uwd-minor-bg); }
.uwd-cell[data-kind="pad"] {
  background:
    repeating-linear-gradient(45deg, transparent, transparent 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 8px);
}
.uwd-intra--ins { background: var(--uwd-insert-bg-intra); border-radius: 2px; }
.uwd-intra--del { background: var(--uwd-delete-bg-intra); border-radius: 2px; }
.uwd-band {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-top: 1px solid var(--uwd-border);
  border-bottom: 1px solid var(--uwd-border);
  cursor: pointer;
  user-select: none;
}
.uwd-band:hover { background: var(--uwd-minor-bg); }
.uwd-para { margin: 0; min-height: 1.2em; }
.uwd-para img { max-width: 100%; height: auto; vertical-align: bottom; }
.uwd-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  background: var(--uwd-minor-bg);
  color: var(--uwd-text-2);
  vertical-align: middle;
}
table.uwd-table { border-collapse: collapse; margin: 2px 0; width: 100%; }
table.uwd-table td {
  border: 1px solid var(--uwd-border);
  padding: 2px 6px;
  vertical-align: top;
}
tr.uwd-row--insert { background: var(--uwd-insert-bg); }
tr.uwd-row--delete { background: var(--uwd-delete-bg); }
tr.uwd-row--change { background: var(--uwd-delete-bg); }
tr.uwd-row--format { background: var(--uwd-minor-bg); }
.uwd-empty { color: var(--uwd-text-2); font-style: italic; padding: 24px; text-align: center; }
`
);
var UniversalWriteDiffElement = class extends Base {
  static get observedAttributes() {
    return ["view", "left-label", "right-label"];
  }
  _shadow;
  _aDoc = null;
  _bDoc = null;
  _diff = null;
  _blobUrls = [];
  _expandedBands = /* @__PURE__ */ new Set();
  _renderScheduled = false;
  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: "open" });
  }
  attributeChangedCallback() {
    this._schedule();
  }
  connectedCallback() {
    if (this._diff) this._schedule();
  }
  disconnectedCallback() {
    this._revokeBlobs();
  }
  get view() {
    return this.getAttribute("view") === "diffs" ? "diffs" : "all";
  }
  set view(v2) {
    this.setAttribute("view", v2);
  }
  /** Carrega e compara dois .docx (bytes). */
  loadPair(aBytes, bBytes, opts = {}) {
    const aDoc = readFullDocument(DocxPackage.load(aBytes));
    const bDoc = readFullDocument(DocxPackage.load(bBytes));
    this.loadDocuments(aDoc, bDoc, opts);
  }
  /** Compara dois documentos já parseados. */
  loadDocuments(aDoc, bDoc, opts = {}) {
    this._aDoc = aDoc;
    this._bDoc = bDoc;
    if (opts.leftLabel !== void 0) this.setAttribute("left-label", opts.leftLabel);
    if (opts.rightLabel !== void 0) this.setAttribute("right-label", opts.rightLabel);
    this._diff = diffDocuments(aDoc, bDoc);
    this._expandedBands.clear();
    this._schedule();
    queueMicrotask(() => {
      this.dispatchEvent(new CustomEvent("ready", {
        detail: { stats: this._diff.stats },
        bubbles: true,
        composed: true
      }));
    });
  }
  get stats() {
    return this._diff?.stats ?? null;
  }
  _schedule() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      this._render();
    });
  }
  _revokeBlobs() {
    for (const u3 of this._blobUrls) URL.revokeObjectURL(u3);
    this._blobUrls = [];
  }
  // ───────────────────────── render ─────────────────────────
  _render() {
    if (!this.isConnected) return;
    this._revokeBlobs();
    const doc = this.ownerDocument;
    const root = doc.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;min-height:0;height:100%;";
    const style = doc.createElement("style");
    style.textContent = STYLE2;
    if (!this._diff || !this._aDoc || !this._bDoc) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.textContent = "No comparison loaded \u2014 call loadPair(aBytes, bBytes).";
      root.append(empty);
      this._shadow.replaceChildren(style, root);
      return;
    }
    root.append(this._renderHeader(doc));
    const body = doc.createElement("div");
    body.className = "uwd-body";
    const grid = doc.createElement("div");
    grid.className = "uwd-grid";
    const headA = doc.createElement("div");
    headA.className = "uwd-pane-header";
    headA.textContent = this.getAttribute("left-label") ?? "Original";
    const headB = doc.createElement("div");
    headB.className = "uwd-pane-header";
    headB.textContent = this.getAttribute("right-label") ?? "Modified";
    grid.append(headA, headB);
    const rows = this._buildRows();
    const showAll = this.view !== "diffs";
    let i7 = 0;
    while (i7 < rows.length) {
      const row = rows[i7];
      if (!showAll && row.kind === "equal" && !this._expandedBands.has(row.editIndex)) {
        let j = i7;
        while (j < rows.length && rows[j].kind === "equal" && rows[j].editIndex === row.editIndex) j++;
        grid.append(this._renderBand(doc, row.editIndex, j - i7));
        i7 = j;
        continue;
      }
      this._renderRow(doc, grid, row);
      i7++;
    }
    if (rows.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "uwd-empty";
      empty.style.gridColumn = "1 / -1";
      empty.textContent = "Empty documents.";
      grid.append(empty);
    }
    body.append(grid);
    root.append(body);
    this._shadow.replaceChildren(style, root);
  }
  _renderHeader(doc) {
    const stats = this._diff.stats;
    const header = doc.createElement("div");
    header.className = "uwd-header";
    const statsBox = doc.createElement("div");
    statsBox.className = "uwd-stats";
    const stat = (cls, label, n5) => {
      if (n5 === 0) return;
      const s4 = doc.createElement("span");
      s4.className = `uwd-stat uwd-stat--${cls}`;
      s4.textContent = `${n5} ${label}`;
      statsBox.append(s4);
    };
    stat("ins", "inserted", stats.inserted);
    stat("del", "deleted", stats.deleted);
    stat("chg", "changed", stats.changed);
    stat("fmt", "formatting", stats.formatOnly);
    if (statsBox.childElementCount === 0) {
      const s4 = doc.createElement("span");
      s4.textContent = "Identical documents";
      statsBox.append(s4);
    }
    header.append(statsBox);
    const spacer = doc.createElement("div");
    spacer.className = "uwd-spacer";
    header.append(spacer);
    const toggle = doc.createElement("button");
    toggle.textContent = "Only changes";
    toggle.dataset["on"] = this.view === "diffs" ? "1" : "0";
    toggle.addEventListener("click", () => {
      this.view = this.view === "diffs" ? "all" : "diffs";
    });
    header.append(toggle);
    const close = doc.createElement("button");
    close.className = "uwd-close";
    close.title = "Close comparison";
    close.textContent = "\u2715";
    close.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close-request", { bubbles: true, composed: true }));
    });
    header.append(close);
    return header;
  }
  _buildRows() {
    const rows = [];
    const edits = this._diff.edits;
    for (let e8 = 0; e8 < edits.length; e8++) {
      const edit = edits[e8];
      const kind = edit.kind === "change" && edit.formatOnly ? "format" : edit.kind;
      const n5 = Math.max(edit.aBlocks.length, edit.bBlocks.length);
      for (let p3 = 0; p3 < n5; p3++) {
        rows.push({
          kind,
          editIndex: e8,
          pairOffset: p3,
          aBlock: edit.aBlocks[p3] ?? null,
          bBlock: edit.bBlocks[p3] ?? null
        });
      }
    }
    return rows;
  }
  _renderBand(doc, editIndex, count) {
    const band = doc.createElement("div");
    band.className = "uwd-band";
    band.textContent = `\u2026 ${count} unchanged block${count === 1 ? "" : "s"} \u2026`;
    band.addEventListener("click", () => {
      this._expandedBands.add(editIndex);
      this._schedule();
    });
    return band;
  }
  _renderRow(doc, grid, row) {
    const edit = this._diff.edits[row.editIndex];
    grid.append(this._gutter(doc, row.aBlock));
    grid.append(this._cell(doc, "a", row, edit));
    grid.append(this._gutter(doc, row.bBlock));
    grid.append(this._cell(doc, "b", row, edit));
  }
  _gutter(doc, blockIdx) {
    const g2 = doc.createElement("div");
    g2.className = "uwd-gutter";
    g2.textContent = blockIdx === null ? "" : String(blockIdx + 1);
    return g2;
  }
  _cell(doc, side, row, edit) {
    const cell = doc.createElement("div");
    cell.className = "uwd-cell";
    const blockIdx = side === "a" ? row.aBlock : row.bBlock;
    const docModel = side === "a" ? this._aDoc : this._bDoc;
    if (blockIdx === null) {
      cell.dataset["kind"] = "pad";
      return cell;
    }
    if (row.kind !== "equal") cell.dataset["kind"] = row.kind;
    const block = docModel.blocks[blockIdx];
    const marks = row.kind === "change" ? (edit.intra ?? []).filter((m2) => m2.side === side && m2.pairOffset === row.pairOffset) : [];
    const rowDiff = row.kind === "change" ? edit.tableRows?.[row.pairOffset] ?? null : null;
    if (block.type === "paragraph") {
      cell.append(this._renderParagraph(doc, block.paragraph, marks));
      if (row.kind === "format") {
        const badge = doc.createElement("span");
        badge.className = "uwd-badge";
        badge.textContent = "formatting";
        cell.append(badge);
      }
    } else {
      cell.append(this._renderTable(doc, block, side, rowDiff));
    }
    cell.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("block-click", {
        detail: { editIndex: row.editIndex, side, blockIndex: blockIdx },
        bubbles: true,
        composed: true
      }));
    });
    return cell;
  }
  // ─────────────── blocos ───────────────
  _renderParagraph(doc, p3, marks) {
    const el = doc.createElement("div");
    el.className = "uwd-para";
    const pr = p3.props;
    if (pr.alignment && pr.alignment !== "left") {
      el.style.textAlign = pr.alignment === "both" ? "justify" : pr.alignment;
    }
    if (pr.indentLeftTwips) el.style.paddingLeft = `${pr.indentLeftTwips / 20}pt`;
    if (pr.indentRightTwips) el.style.paddingRight = `${pr.indentRightTwips / 20}pt`;
    if (pr.indentFirstLineTwips) el.style.textIndent = `${pr.indentFirstLineTwips / 20}pt`;
    if (pr.spaceBeforeTwips) el.style.marginTop = `${pr.spaceBeforeTwips / 20}pt`;
    if (pr.spaceAfterTwips) el.style.marginBottom = `${pr.spaceAfterTwips / 20}pt`;
    const shd = hex6(pr.shadingHex);
    if (shd) el.style.background = shd;
    if (pr.numbering) {
      const marker = doc.createElement("span");
      marker.textContent = pr.numbering.kind === "bullet" ? "\u2022 " : "# ";
      marker.style.paddingLeft = `${pr.numbering.ilvl * 18}pt`;
      el.append(marker);
    }
    let offset = 0;
    for (const r6 of p3.runs) {
      const len = r6.text.length;
      const runMarks = marks.filter((m2) => m2.startCh < offset + len && m2.endCh > offset).map((m2) => ({
        start: Math.max(0, m2.startCh - offset),
        end: Math.min(len, m2.endCh - offset),
        kind: m2.kind
      })).sort((x3, y3) => x3.start - y3.start);
      el.append(...this._renderRun(doc, r6, runMarks));
      offset += len;
    }
    return el;
  }
  _renderRun(doc, r6, marks) {
    if (r6.image) {
      const img = doc.createElement("img");
      const mime = MIME[r6.image.ext.toLowerCase()] ?? "application/octet-stream";
      const bytes = r6.image.data;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const url = URL.createObjectURL(new Blob([buf], { type: mime }));
      this._blobUrls.push(url);
      img.src = url;
      img.width = Math.round(r6.image.widthTwips / 15);
      img.height = Math.round(r6.image.heightTwips / 15);
      if (marks.length > 0) {
        const wrap = doc.createElement("span");
        wrap.className = marks[0].kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
        wrap.append(img);
        return [wrap];
      }
      return [img];
    }
    const base = this._styledSpan(doc, r6);
    const text = r6.text;
    if (marks.length === 0) {
      base.textContent = text;
      return [base];
    }
    let pos = 0;
    for (const m2 of marks) {
      if (m2.start > pos) base.append(doc.createTextNode(text.slice(pos, m2.start)));
      const mark = doc.createElement("span");
      mark.className = m2.kind === "insert" ? "uwd-intra--ins" : "uwd-intra--del";
      mark.textContent = text.slice(m2.start, m2.end);
      base.append(mark);
      pos = m2.end;
    }
    if (pos < text.length) base.append(doc.createTextNode(text.slice(pos)));
    return [base];
  }
  _styledSpan(doc, r6) {
    const s4 = doc.createElement("span");
    const p3 = r6.props;
    if (p3.bold) s4.style.fontWeight = "700";
    if (p3.italic || p3.isMath) s4.style.fontStyle = "italic";
    const deco = [];
    if (p3.underline) deco.push("underline");
    if (p3.strike || p3.doubleStrike) deco.push("line-through");
    if (deco.length) s4.style.textDecoration = deco.join(" ");
    const uc = hex6(p3.underlineColor);
    if (uc) s4.style.textDecorationColor = uc;
    if (p3.szHalfPt) s4.style.fontSize = `${p3.szHalfPt / 2}pt`;
    const fg = hex6(p3.color);
    if (fg) s4.style.color = fg;
    if (p3.highlight && HIGHLIGHT[p3.highlight]) s4.style.background = HIGHLIGHT[p3.highlight];
    if (p3.fontAscii) s4.style.fontFamily = `"${p3.fontAscii}", sans-serif`;
    if (p3.allCaps) s4.style.textTransform = "uppercase";
    if (p3.smallCaps) s4.style.fontVariant = "small-caps";
    if (p3.vertAlign === "superscript") {
      s4.style.verticalAlign = "super";
      s4.style.fontSize = "smaller";
    }
    if (p3.vertAlign === "subscript") {
      s4.style.verticalAlign = "sub";
      s4.style.fontSize = "smaller";
    }
    if (p3.link) {
      s4.style.color = "#0563c1";
      s4.style.textDecoration = "underline";
      s4.title = p3.link;
    }
    return s4;
  }
  _renderTable(doc, t5, side, rowDiff) {
    const rowKind = /* @__PURE__ */ new Map();
    if (rowDiff) {
      for (const rd of rowDiff) {
        const idxs = side === "a" ? rd.aRows : rd.bRows;
        const kind = rd.kind === "change" && rd.formatOnly ? "format" : rd.kind === "change" ? "change" : rd.kind;
        for (const idx of idxs) {
          if (kind !== "equal") rowKind.set(idx, kind);
        }
      }
    }
    const el = doc.createElement("table");
    el.className = "uwd-table";
    for (let ri = 0; ri < t5.rows.length; ri++) {
      const tr = doc.createElement("tr");
      const kind = rowKind.get(ri);
      if (kind && kind !== "equal") tr.className = `uwd-row--${kind}`;
      for (const c4 of t5.rows[ri].cells) {
        const td2 = doc.createElement("td");
        if (c4.gridSpan > 1) td2.colSpan = c4.gridSpan;
        const cellShd = hex6(c4.shadingHex);
        if (cellShd) td2.style.background = cellShd;
        for (const cp of c4.paragraphs) td2.append(this._renderParagraph(doc, cp, []));
        for (const nested of c4.tables) td2.append(this._renderTable(doc, nested, side, null));
        tr.append(td2);
      }
      el.append(tr);
    }
    return el;
  }
};
if (typeof customElements !== "undefined" && !customElements.get("universal-write-diff")) {
  customElements.define("universal-write-diff", UniversalWriteDiffElement);
}

// demo/site-live.ts
init_button();
init_icon_button();
init_theme();
var themeStyle2 = document.createElement("style");
themeStyle2.id = "u-theme";
themeStyle2.textContent = ThemeBuilder.create("#1A73E8").build();
document.head.appendChild(themeStyle2);
document.documentElement.style.colorScheme = "light dark";
globalThis.UniversalOffice = {
  createMentionPlugin,
  diffDocuments,
  DocxPackage,
  readFullDocument
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
lit-html/directive.js:
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

lit-html/directives/class-map.js:
lit-html/directives/if-defined.js:
  (**
   * @license
   * Copyright 2018 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@material/material-color-utilities/utils/math_utils.js:
@material/material-color-utilities/utils/color_utils.js:
@material/material-color-utilities/hct/viewing_conditions.js:
@material/material-color-utilities/hct/cam16.js:
@material/material-color-utilities/hct/hct_solver.js:
@material/material-color-utilities/hct/hct.js:
@material/material-color-utilities/blend/blend.js:
@material/material-color-utilities/palettes/tonal_palette.js:
@material/material-color-utilities/palettes/core_palette.js:
@material/material-color-utilities/quantize/lab_point_provider.js:
@material/material-color-utilities/quantize/quantizer_wsmeans.js:
@material/material-color-utilities/quantize/quantizer_map.js:
@material/material-color-utilities/quantize/quantizer_wu.js:
@material/material-color-utilities/quantize/quantizer_celebi.js:
@material/material-color-utilities/scheme/scheme.js:
@material/material-color-utilities/scheme/scheme_android.js:
@material/material-color-utilities/score/score.js:
@material/material-color-utilities/utils/string_utils.js:
@material/material-color-utilities/utils/image_utils.js:
@material/material-color-utilities/utils/theme_utils.js:
@material/material-color-utilities/index.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/contrast/contrast.js:
@material/material-color-utilities/dynamiccolor/dynamic_color.js:
@material/material-color-utilities/dynamiccolor/variant.js:
@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js:
@material/material-color-utilities/dynamiccolor/dynamic_scheme.js:
@material/material-color-utilities/scheme/scheme_expressive.js:
@material/material-color-utilities/scheme/scheme_fruit_salad.js:
@material/material-color-utilities/scheme/scheme_monochrome.js:
@material/material-color-utilities/scheme/scheme_neutral.js:
@material/material-color-utilities/scheme/scheme_rainbow.js:
@material/material-color-utilities/scheme/scheme_tonal_spot.js:
@material/material-color-utilities/scheme/scheme_vibrant.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dislike/dislike_analyzer.js:
@material/material-color-utilities/dynamiccolor/contrast_curve.js:
@material/material-color-utilities/dynamiccolor/tone_delta_pair.js:
@material/material-color-utilities/temperature/temperature_cache.js:
@material/material-color-utilities/scheme/scheme_content.js:
@material/material-color-utilities/scheme/scheme_fidelity.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
