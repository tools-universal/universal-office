import {
  ACCENTS,
  appFor,
  applyTheme,
  bindHostFonts,
  hostOf,
  isDark,
  originStore
} from "./chunk-EVCFOTXG.js";
import {
  ASPECT_RATIOS,
  BEVEL_PRESETS,
  BRIGHT_CONTRAST_STEPS,
  CROP_SHAPES,
  GLOW_SIZES,
  GRADIENT_PRESETS,
  GRADIENT_VARIANTS,
  LINE_DASHES,
  LINE_WEIGHTS_PT,
  POSITION_PRESETS,
  PRESET_PATTERNS,
  RECOLOR_PRESETS,
  REFLECTION_PRESETS,
  ROTATION_PRESETS,
  SATURATION_PRESETS,
  SHADOW_PRESETS,
  SHAPE_STYLE_PRESETS,
  SHARPEN_PRESETS,
  SOFT_EDGE_PRESETS,
  TEMPERATURE_PRESETS,
  TOC_FORMATS,
  TRANSPARENCY_PRESETS,
  adjustBrightnessContrast,
  adjustSaturation,
  adjustSharpen,
  adjustTemperature,
  applyBlipFx,
  glowPreset,
  gradientGeometry,
  gradientTileRgba,
  paintPicture,
  patternRgba,
  patternRows,
  presetOutline,
  textboxTemplateSpec,
  tocFormatStyle
} from "./chunk-IL7QT2LH.js";
import {
  CommandRegistry,
  HIGHLIGHT_COLORS,
  OFFICE_COLORS,
  STANDARD_COLORS,
  closeDialogs,
  closeMenus,
  closePopover,
  colorGrid,
  createCompactBar,
  createRibbon,
  createRuler,
  dialogTabs,
  ensureBarStyles,
  isMenuOpen,
  openDialog,
  openMenu,
  openPane,
  paneOpen,
  parseThemePick,
  promptDialog,
  renderItem,
  ripple,
  showToast,
  symbol,
  themePaletteColors,
  tileGrid,
  toggleMenu
} from "./chunk-4FTRJ73Y.js";
import {
  FORMULA_FUNCTIONS,
  TABLE_STYLE_CONDS,
  WATERMARK_TEXTS,
  newTableStyleXml,
  oneColorGradientColor2,
  patchTableStyleXml,
  pickLabels,
  readStyleSheet,
  resolveColor2,
  retitleTableStyleXml,
  uiLang
} from "./chunk-NPDEUMTK.js";
import "./chunk-WSFCRVEQ.js";

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

// src/chrome-borders.ts
var tr = (lang, en, pt) => pickLabels(lang, { en, pt });
var BORDER_STYLES = [
  ["single", "Single", "Simples"],
  ["dotted", "Dotted", "Pontilhada"],
  ["dashSmallGap", "Dashed (small gap)", "Tracejada (intervalo curto)"],
  ["dashed", "Dashed", "Tracejada"],
  ["dotDash", "Dash dot", "Tra\xE7o e ponto"],
  ["dotDotDash", "Dash dot dot", "Tra\xE7o e dois pontos"],
  ["double", "Double", "Dupla"],
  ["triple", "Triple", "Tripla"],
  ["thinThickSmallGap", "Thin-thick (small gap)", "Fina-grossa (intervalo pequeno)"],
  ["thickThinSmallGap", "Thick-thin (small gap)", "Grossa-fina (intervalo pequeno)"],
  ["thinThickThinSmallGap", "Thin-thick-thin (small gap)", "Fina-grossa-fina (intervalo pequeno)"],
  ["thinThickMediumGap", "Thin-thick (medium gap)", "Fina-grossa (intervalo m\xE9dio)"],
  ["thickThinMediumGap", "Thick-thin (medium gap)", "Grossa-fina (intervalo m\xE9dio)"],
  ["thinThickThinMediumGap", "Thin-thick-thin (medium gap)", "Fina-grossa-fina (intervalo m\xE9dio)"],
  ["thinThickLargeGap", "Thin-thick (large gap)", "Fina-grossa (intervalo grande)"],
  ["thickThinLargeGap", "Thick-thin (large gap)", "Grossa-fina (intervalo grande)"],
  ["thinThickThinLargeGap", "Thin-thick-thin (large gap)", "Fina-grossa-fina (intervalo grande)"],
  ["wave", "Wave", "Ondulada"],
  ["doubleWave", "Double wave", "Ondulada dupla"],
  ["dashDotStroked", "Dash dot stroked", "Tra\xE7o e ponto inclinado"],
  ["threeDEmboss", "3-D emboss", "Relevo 3D"],
  ["threeDEngrave", "3-D engrave", "Baixo relevo 3D"],
  ["outset", "Outset", "Alto relevo"],
  ["inset", "Inset", "Baixo relevo"]
];
var BORDER_WIDTHS = [[2, "\xBC"], [4, "\xBD"], [6, "\xBE"], [8, "1"], [12, "1\xBD"], [18, "2\xBC"], [24, "3"], [36, "4\xBD"], [48, "6"]];
function borderSampleSvg(val, color = "currentColor", w2 = 120, h3 = 14) {
  const y3 = h3 / 2;
  const line2 = (yy, sw, dash = "", stroke = color) => `<line x1="2" y1="${yy}" x2="${w2 - 2}" y2="${yy}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
  const bands = (spec) => {
    const total = spec.reduce((a3, [t5, g2]) => a3 + t5 + g2, 0);
    let yy = y3 - total / 2;
    return spec.map(([t5, g2]) => {
      const s4 = line2(yy + t5 / 2, t5);
      yy += t5 + g2;
      return s4;
    }).join("");
  };
  let body;
  switch (val) {
    case "dotted":
      body = line2(y3, 1.5, "1.5 1.5");
      break;
    case "dashSmallGap":
      body = line2(y3, 1.5, "5 1.5");
      break;
    case "dashed":
      body = line2(y3, 1.5, "6 3");
      break;
    case "dotDash":
      body = line2(y3, 1.5, "6 2 1.5 2");
      break;
    case "dotDotDash":
      body = line2(y3, 1.5, "6 2 1.5 2 1.5 2");
      break;
    case "dashDotStroked":
      body = line2(y3, 2, "7 2 2 2");
      break;
    case "double":
      body = bands([[1, 2], [1, 0]]);
      break;
    case "triple":
      body = bands([[1, 1.5], [1, 1.5], [1, 0]]);
      break;
    case "thinThickSmallGap":
      body = bands([[1, 1], [2.5, 0]]);
      break;
    case "thickThinSmallGap":
      body = bands([[2.5, 1], [1, 0]]);
      break;
    case "thinThickThinSmallGap":
      body = bands([[1, 1], [2.5, 1], [1, 0]]);
      break;
    case "thinThickMediumGap":
      body = bands([[1, 2], [2.5, 0]]);
      break;
    case "thickThinMediumGap":
      body = bands([[2.5, 2], [1, 0]]);
      break;
    case "thinThickThinMediumGap":
      body = bands([[1, 2], [2.5, 2], [1, 0]]);
      break;
    case "thinThickLargeGap":
      body = bands([[1, 3.5], [2.5, 0]]);
      break;
    case "thickThinLargeGap":
      body = bands([[2.5, 3.5], [1, 0]]);
      break;
    case "thinThickThinLargeGap":
      body = bands([[1, 3], [2.5, 3], [1, 0]]);
      break;
    case "wave":
    case "doubleWave": {
      const wave = (yy) => {
        let d3 = `M2 ${yy}`;
        for (let x2 = 2; x2 < w2 - 2; x2 += 6) d3 += ` q1.5 -2.5 3 0 q1.5 2.5 3 0`;
        return `<path d="${d3}" fill="none" stroke="${color}" stroke-width="1"/>`;
      };
      body = val === "wave" ? wave(y3) : wave(y3 - 2) + wave(y3 + 2);
      break;
    }
    case "threeDEmboss":
      body = line2(y3 - 1.5, 1.5, "", "#c0c0c0") + line2(y3, 1.5, "", "#606060") + line2(y3 + 1.5, 1.5);
      break;
    case "threeDEngrave":
      body = line2(y3 - 1.5, 1.5) + line2(y3, 1.5, "", "#606060") + line2(y3 + 1.5, 1.5, "", "#c0c0c0");
      break;
    case "outset":
      body = line2(y3 - 1, 1, "", "#c0c0c0") + line2(y3 + 0.5, 2);
      break;
    case "inset":
      body = line2(y3 - 1, 2) + line2(y3 + 1, 1, "", "#c0c0c0");
      break;
    case "thick":
      body = line2(y3, 3);
      break;
    default:
      body = line2(y3, 1);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w2}" height="${h3}" viewBox="0 0 ${w2} ${h3}">${body}</svg>`;
}
var SHADING_PATTERNS = [
  ["clear", "Clear", "Limpar"],
  ["solid", "Solid (100%)", "S\xF3lido (100%)"],
  ...[5, 10, 12.5, 15, 20, 25, 30, 35, 37.5, 40, 45, 50, 55, 60, 62.5, 65, 70, 75, 80, 85, 87.5, 90, 95].map((n5) => [`pct${Math.floor(n5)}`, `${n5}%`, `${String(n5).replace(".", ",")}%`]),
  ["horzStripe", "Dark Horizontal", "Horizontal escuro"],
  ["vertStripe", "Dark Vertical", "Vertical escuro"],
  ["reverseDiagStripe", "Dark Down Diagonal", "Diagonal para baixo escura"],
  ["diagStripe", "Dark Up Diagonal", "Diagonal para cima escura"],
  ["horzCross", "Dark Grid", "Grade escura"],
  ["diagCross", "Dark Trellis", "Treli\xE7a escura"],
  ["thinHorzStripe", "Light Horizontal", "Horizontal claro"],
  ["thinVertStripe", "Light Vertical", "Vertical claro"],
  ["thinReverseDiagStripe", "Light Down Diagonal", "Diagonal para baixo clara"],
  ["thinDiagStripe", "Light Up Diagonal", "Diagonal para cima clara"],
  ["thinHorzCross", "Light Grid", "Grade clara"],
  ["thinDiagCross", "Light Trellis", "Treli\xE7a clara"]
];
var el = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var section = (title, ...kids) => el("div", { style: "display:flex;flex-direction:column;gap:8px" }, el("strong", {}, title), ...kids);
var sel = (name, opts, value) => {
  const s4 = el("select", { name });
  for (const [v2, t5] of opts) s4.append(el("option", { value: v2, selected: v2 === value }, t5));
  return s4;
};
function colorButton(env, value, autoLabel) {
  let cur = value;
  let changed = () => {
  };
  const swatch = el("span", { style: "display:inline-block;width:28px;height:14px;border:1px solid currentColor;border-radius:2px" });
  const text = el("span", {});
  const btn2 = el("button", { type: "button", className: "uo-pill", style: "display:inline-flex;align-items:center;gap:8px;min-width:150px" }, swatch, text, "\u25BE");
  const paint = () => {
    const auto = cur.hex === "auto";
    swatch.style.background = auto ? "transparent" : `#${cur.hex}`;
    text.textContent = auto ? autoLabel : `#${cur.hex}`;
  };
  paint();
  btn2.addEventListener("click", (e6) => {
    e6.stopPropagation();
    const r5 = btn2.getBoundingClientRect();
    const colors = env.ed.documentThemeColors();
    openMenu([
      { id: "clr:auto", label: autoLabel, icon: "format_color_reset", onClick: () => {
        cur = { hex: "auto" };
        paint();
        changed();
      } },
      "-",
      {
        content: (close) => colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            const p3 = parseThemePick(v2, colors);
            cur = p3 ? { hex: p3.hex, themeColor: p3.themeColor, tint: p3.tint, shade: p3.shade } : { hex: v2.replace(/^#/, "").toUpperCase() };
            paint();
            changed();
          }
        })
      }
    ], { x: r5.left, y: r5.bottom + 2 }, { lang: env.lang, layer: env.layer });
  });
  return { el: btn2, value: () => cur, onChange: (f3) => {
    changed = f3;
  } };
}
function styleList(lang, value) {
  let cur = value;
  let changed = () => {
  };
  const box = el("div", { style: "display:flex;flex-direction:column;max-height:180px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px", tabIndex: 0 });
  box.setAttribute("role", "listbox");
  const items = [];
  const all = [["none", tr(lang, "(none)", "(nenhuma)")], ...BORDER_STYLES.map(([v2, en, pt]) => [v2, tr(lang, en, pt)])];
  for (const [v2, label] of all) {
    const it = el("div", { title: label, style: "padding:3px 6px;border-radius:4px;cursor:pointer;display:flex;align-items:center;min-height:18px" });
    it.setAttribute("role", "option");
    it.dataset["v"] = v2;
    if (v2 === "none") it.textContent = label;
    else it.innerHTML = borderSampleSvg(v2);
    it.addEventListener("click", () => {
      cur = v2;
      sync();
      changed();
    });
    items.push(it);
    box.append(it);
  }
  const sync = () => {
    for (const it of items) {
      const on = it.dataset["v"] === cur;
      it.style.background = on ? "color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)" : "";
      it.setAttribute("aria-selected", String(on));
    }
  };
  box.addEventListener("keydown", (e6) => {
    const i5 = all.findIndex(([v2]) => v2 === cur);
    const d3 = e6.key === "ArrowDown" ? 1 : e6.key === "ArrowUp" ? -1 : 0;
    if (!d3) return;
    e6.preventDefault();
    cur = all[Math.max(0, Math.min(all.length - 1, i5 + d3))][0];
    sync();
    changed();
    items[all.findIndex(([v2]) => v2 === cur)].scrollIntoView({ block: "nearest" });
  });
  sync();
  queueMicrotask(() => items[all.findIndex(([v2]) => v2 === cur)]?.scrollIntoView({ block: "nearest" }));
  return { el: box, value: () => cur, onChange: (f3) => {
    changed = f3;
  } };
}
function preview(sides, state, onToggle) {
  const W = 180, H2 = 140, P2 = 22;
  const host = el("div", { style: `position:relative;width:${W}px;height:${H2}px;background:#fff;border-radius:6px;color:#000` });
  const svgBox = el("div", { style: "position:absolute;inset:0" });
  host.append(svgBox);
  const hit = (s4, css) => {
    const b3 = el("button", { type: "button", title: s4, style: `position:absolute;${css};background:transparent;border:0;cursor:pointer;padding:0` });
    b3.addEventListener("click", () => onToggle(s4));
    host.append(b3);
  };
  hit("top", `left:${P2}px;top:${P2 - 8}px;width:${W - 2 * P2}px;height:16px`);
  hit("bottom", `left:${P2}px;top:${H2 - P2 - 8}px;width:${W - 2 * P2}px;height:16px`);
  hit("left", `left:${P2 - 8}px;top:${P2}px;width:16px;height:${H2 - 2 * P2}px`);
  hit("right", `left:${W - P2 - 8}px;top:${P2}px;width:16px;height:${H2 - 2 * P2}px`);
  if (sides.includes("insideH")) hit("insideH", `left:${P2 + 10}px;top:${H2 / 2 - 8}px;width:${W - 2 * P2 - 20}px;height:16px`);
  if (sides.includes("insideV")) hit("insideV", `left:${W / 2 - 8}px;top:${P2 + 10}px;width:16px;height:${H2 - 2 * P2 - 20}px`);
  const paint = () => {
    const ln = (s4, x1, y1, x2, y22) => {
      const b3 = state.get(s4);
      if (!b3 || b3.val === "nil" || b3.val === "none") return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y22}" stroke="#bbb" stroke-dasharray="2 3"/>`;
      const c4 = b3.color && b3.color !== "auto" ? `#${b3.color}` : "#000";
      const sw = Math.max(1, (b3.sz ?? 4) / 8 * 1.333);
      const dash = /dot|dash/i.test(b3.val) ? ` stroke-dasharray="${sw * 2} ${sw * 1.5}"` : "";
      const dbl = /double|thin|thick|triple/i.test(b3.val) && b3.val !== "thick";
      if (!dbl) return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y22}" stroke="${c4}" stroke-width="${sw}"${dash}/>`;
      const dx = y1 === y22 ? 0 : 2, dy = y1 === y22 ? 2 : 0;
      return `<line x1="${x1 - dx}" y1="${y1 - dy}" x2="${x2 - dx}" y2="${y22 - dy}" stroke="${c4}"/><line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y22 + dy}" stroke="${c4}"/>`;
    };
    let txt = "";
    for (let yy = P2 + 12; yy < H2 - P2 - 6; yy += 8) txt += `<line x1="${P2 + 10}" y1="${yy}" x2="${W - P2 - 10}" y2="${yy}" stroke="#d8d8d8" stroke-width="3"/>`;
    svgBox.innerHTML = `<svg width="${W}" height="${H2}" xmlns="http://www.w3.org/2000/svg">${txt}` + ln("top", P2, P2, W - P2, P2) + ln("bottom", P2, H2 - P2, W - P2, H2 - P2) + ln("left", P2, P2, P2, H2 - P2) + ln("right", W - P2, P2, W - P2, H2 - P2) + (sides.includes("insideH") ? ln("insideH", P2, H2 / 2, W - P2, H2 / 2) : "") + (sides.includes("insideV") ? ln("insideV", W / 2, P2, W / 2, H2 - P2) : "") + "</svg>";
  };
  paint();
  return { el: host, paint };
}
function settings(lang, opts, value) {
  let cur = value;
  let changed = (_v) => {
  };
  const box = el("div", { style: "display:flex;flex-direction:column;gap:4px" });
  const btns = opts.map(([v2, en, pt, icon]) => {
    const b3 = el("button", { type: "button", className: "uo-btn uo-btn-lbl", style: "justify-content:flex-start;gap:8px;width:100%" });
    b3.innerHTML = symbol(icon);
    b3.append(tr(lang, en, pt));
    b3.addEventListener("click", () => {
      cur = v2;
      sync();
      changed(v2);
    });
    box.append(b3);
    return [v2, b3];
  });
  const sync = () => {
    for (const [v2, b3] of btns) b3.classList.toggle("uo-on", v2 === cur);
  };
  sync();
  return { el: box, value: () => cur, set: (v2) => {
    cur = v2;
    sync();
  }, onChange: (f3) => {
    changed = f3;
  } };
}
var BOX_ICON = "border_outer";
var ALL_ICON = "border_all";
var GRID_ICON = "border_inner";
var NONE_ICON = "border_clear";
var SHADOW_ICON = "filter_none";
var THREE_D_ICON = "view_in_ar";
var CUSTOM_ICON = "edit";
async function bordersShadingDialog(env, tab = "borders") {
  const lang = env.lang, ed = env.ed;
  const ts = ed.getTableState();
  const inTable = !!ts;
  const autoLbl = tr(lang, "Automatic", "Autom\xE1tico");
  const pen0 = ed.getBorderPen();
  const applyOpts = [
    ...inTable ? [["cell", tr(lang, "Cell", "C\xE9lula")], ["table", tr(lang, "Table", "Tabela")]] : [],
    ["paragraph", tr(lang, "Paragraph", "Par\xE1grafo")]
  ];
  const applyTo = sel("b-apply", applyOpts, inTable ? ts.cells ? "cell" : "table" : "paragraph");
  const bState = /* @__PURE__ */ new Map();
  const bStyle = styleList(lang, pen0.val ?? "single");
  const bColor = colorButton(env, { hex: pen0.color ?? "auto", themeColor: pen0.themeColor, tint: pen0.themeTint, shade: pen0.themeShade }, autoLbl);
  const bWidth = sel("b-width", BORDER_WIDTHS.map(([sz, t5]) => [String(sz), `${t5} pt`]), String(pen0.sz ?? 4));
  const pen = () => {
    const v2 = bStyle.value();
    if (v2 === "none") return null;
    const c4 = bColor.value();
    return { val: v2, sz: +bWidth.value, space: 0, color: c4.hex, ...c4.themeColor ? { themeColor: c4.themeColor } : {}, ...c4.tint ? { themeTint: c4.tint } : {}, ...c4.shade ? { themeShade: c4.shade } : {} };
  };
  const sidesFor = () => applyTo.value === "paragraph" ? ["top", "left", "bottom", "right"] : ["top", "left", "bottom", "right", "insideH", "insideV"];
  const touched = /* @__PURE__ */ new Set();
  const bPrev = () => preview(sidesFor(), bState, (s4) => {
    const cur = bState.get(s4);
    bState.set(s4, cur && cur.val !== "nil" ? null : pen());
    touched.add(s4);
    bSet.set("custom");
    bPv.paint();
  });
  let bPv = bPrev();
  const pvHost = el("div", {}, bPv.el);
  const tableSettings = [["none", "None", "Nenhuma", NONE_ICON], ["box", "Box", "Caixa", BOX_ICON], ["all", "All", "Todas", ALL_ICON], ["grid", "Grid", "Grade", GRID_ICON], ["custom", "Custom", "Personalizado", CUSTOM_ICON]];
  const paraSettings = [["none", "None", "Nenhuma", NONE_ICON], ["box", "Box", "Caixa", BOX_ICON], ["shadow", "Shadow", "Sombra", SHADOW_ICON], ["custom", "Custom", "Personalizado", CUSTOM_ICON]];
  const setHost = el("div", {});
  let bSet = settings(lang, inTable ? tableSettings : paraSettings, "custom");
  setHost.append(bSet.el);
  const applySetting = (v2) => {
    const p3 = pen();
    const all = sidesFor();
    for (const s4 of all) touched.add(s4);
    const thick = p3 ? { ...p3, sz: Math.max(p3.sz ?? 4, 12) } : null;
    for (const s4 of all) {
      const inner = s4 === "insideH" || s4 === "insideV";
      bState.set(s4, v2 === "none" ? null : v2 === "box" || v2 === "shadow" ? inner ? null : p3 && v2 === "shadow" ? { ...p3, shadow: true } : p3 : v2 === "all" ? p3 : v2 === "grid" ? inner ? p3 : thick : bState.get(s4) ?? null);
    }
    bPv.paint();
  };
  bSet.onChange(applySetting);
  const loadCurrent = () => {
    bState.clear();
    touched.clear();
    if (applyTo.value === "paragraph") {
      const pb = ed.getParagraphBorders();
      for (const s4 of ["top", "left", "bottom", "right"]) bState.set(s4, pb[s4] ?? null);
    } else {
      const tb = { ...ts.styleBorders ?? {}, ...ts.tblPr.tblBorders ?? {} };
      const b3 = applyTo.value === "table" ? tb : { ...tb, ...ts.tcPr.tcBorders ?? {} };
      for (const s4 of ["top", "left", "bottom", "right", "insideH", "insideV"]) bState.set(s4, b3[s4] ?? null);
    }
  };
  loadCurrent();
  applyTo.addEventListener("change", () => {
    loadCurrent();
    const ns = settings(lang, applyTo.value === "paragraph" ? paraSettings : tableSettings, "custom");
    ns.onChange(applySetting);
    setHost.replaceChildren(ns.el);
    bSet = ns;
    bPv = bPrev();
    pvHost.replaceChildren(bPv.el);
  });
  const bordersTab = el(
    "div",
    { style: "display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start" },
    section(tr(lang, "Setting:", "Defini\xE7\xE3o:"), setHost),
    section(
      tr(lang, "Style:", "Estilo:"),
      bStyle.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), bColor.el),
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Width:", "Largura:"), bWidth)
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      el(
        "div",
        { style: "font-size:12px;opacity:.8;max-width:180px" },
        tr(lang, "Click on the diagram to apply borders", "Clique no diagrama para aplicar bordas")
      ),
      pvHost,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), applyTo)
    )
  );
  const pb0 = ed.getPageBorders();
  const pgState = /* @__PURE__ */ new Map();
  for (const s4 of ["top", "left", "bottom", "right"]) pgState.set(s4, pb0?.[s4] ?? null);
  const firstSide = pb0 ? ["top", "left", "bottom", "right"].map((s4) => pb0[s4]).find(Boolean) : void 0;
  const pStyle = styleList(lang, firstSide?.val ?? "single");
  const pColor = colorButton(env, { hex: firstSide?.color ?? "auto", themeColor: firstSide?.themeColor }, autoLbl);
  const pWidth = sel("p-width", BORDER_WIDTHS.map(([sz, t5]) => [String(sz), `${t5} pt`]), String(firstSide?.sz ?? 4));
  const pPen = (shadow = false) => {
    const v2 = pStyle.value();
    if (v2 === "none") return null;
    const c4 = pColor.value();
    return { val: v2, sz: +pWidth.value, space: 24, color: c4.hex, ...c4.themeColor ? { themeColor: c4.themeColor } : {}, ...shadow ? { shadow: true } : {} };
  };
  const pPv = preview(["top", "left", "bottom", "right"], pgState, (s4) => {
    const cur = pgState.get(s4);
    pgState.set(s4, cur ? null : pPen());
    pSet.set("custom");
    pPv.paint();
  });
  const pSet = settings(lang, [
    ["none", "None", "Nenhuma", NONE_ICON],
    ["box", "Box", "Caixa", BOX_ICON],
    ["shadow", "Shadow", "Sombra", SHADOW_ICON],
    ["3d", "3-D", "3D", THREE_D_ICON],
    ["custom", "Custom", "Personalizado", CUSTOM_ICON]
  ], pb0 ? firstSide?.shadow ? "shadow" : "box" : "none");
  pSet.onChange((v2) => {
    for (const s4 of ["top", "left", "bottom", "right"]) {
      const p3 = v2 === "none" ? null : v2 === "3d" ? { ...pPen() ?? { val: "single", sz: 4 }, val: "threeDEmboss", sz: Math.max(+pWidth.value, 6), space: 24 } : pPen(v2 === "shadow");
      pgState.set(s4, p3);
    }
    pPv.paint();
  });
  const pApply = sel("p-apply", [["document", tr(lang, "Whole document", "Documento inteiro")], ["section", tr(lang, "This section", "Esta se\xE7\xE3o")]], "document");
  const pDisplay = sel("p-display", [["allPages", tr(lang, "All pages", "Todas as p\xE1ginas")], ["firstPage", tr(lang, "First page only", "Somente a primeira p\xE1gina")], ["notFirstPage", tr(lang, "All except first page", "Todas exceto a primeira p\xE1gina")]], pb0?.display ?? "allPages");
  const pFrom = sel("p-from", [["page", tr(lang, "Edge of page", "Borda da p\xE1gina")], ["text", tr(lang, "Text", "Texto")]], pb0?.offsetFrom ?? "page");
  const pTop = el("input", { type: "number", name: "p-top", min: "0", max: "31", value: String(pb0?.top?.space ?? 24), style: "width:64px" });
  const pBottom = el("input", { type: "number", name: "p-bottom", min: "0", max: "31", value: String(pb0?.bottom?.space ?? 24), style: "width:64px" });
  const pLeft = el("input", { type: "number", name: "p-left", min: "0", max: "31", value: String(pb0?.left?.space ?? 24), style: "width:64px" });
  const pRight = el("input", { type: "number", name: "p-right", min: "0", max: "31", value: String(pb0?.right?.space ?? 24), style: "width:64px" });
  pFrom.addEventListener("change", () => {
    const [tb, lr] = pFrom.value === "text" ? ["1", "4"] : ["24", "24"];
    pTop.value = pBottom.value = tb;
    pLeft.value = pRight.value = lr;
  });
  const pFront = el("input", { type: "checkbox", name: "p-front", checked: pb0?.zOrder !== "back" });
  const pageTab = el(
    "div",
    { style: "display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:start" },
    section(tr(lang, "Setting:", "Defini\xE7\xE3o:"), pSet.el),
    section(
      tr(lang, "Style:", "Estilo:"),
      pStyle.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), pColor.el),
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Width:", "Largura:"), pWidth)
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      pPv.el,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), pApply, pDisplay),
      section(
        tr(lang, "Margin (pt) measured from", "Margem (pt) medida a partir de"),
        pFrom,
        el(
          "div",
          { className: "uo-dialog-grid" },
          el("span", {}, tr(lang, "Top:", "Superior:")),
          pTop,
          el("span", {}, tr(lang, "Bottom:", "Inferior:")),
          pBottom,
          el("span", {}, tr(lang, "Left:", "Esquerda:")),
          pLeft,
          el("span", {}, tr(lang, "Right:", "Direita:")),
          pRight
        ),
        el("label", { className: "uo-check" }, pFront, tr(lang, "Always display in front", "Sempre exibir na frente"))
      )
    )
  );
  const shdState = ts?.tcPr.shd;
  const fill = colorButton(env, { hex: shdState?.fill && shdState.fill !== "auto" ? shdState.fill : "auto", themeColor: shdState?.themeFill }, tr(lang, "No Color", "Sem Cor"));
  const patStyle = sel("s-pattern", SHADING_PATTERNS.map(([v2, en, pt]) => [v2, tr(lang, en, pt)]), shdState?.val && shdState.val !== "nil" ? shdState.val : "clear");
  const patColor = colorButton(env, { hex: shdState?.color && shdState.color !== "auto" ? shdState.color : "auto" }, autoLbl);
  const sApply = sel("s-apply", applyOpts, inTable ? ts.cells ? "cell" : "table" : "paragraph");
  const swatch = el("div", { style: "width:180px;height:70px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 30%, transparent)" });
  const syncShd = () => {
    const para = sApply.value === "paragraph";
    patStyle.disabled = para;
    patColor.el.toggleAttribute("disabled", para);
    const f4 = fill.value().hex, pc2 = patColor.value().hex;
    const bg = f4 === "auto" ? "#ffffff" : `#${f4}`;
    const fg = pc2 === "auto" ? "#000000" : `#${pc2}`;
    const v2 = para ? "clear" : patStyle.value;
    const pct = v2 === "solid" ? 100 : /^pct(\d+)/.test(v2) ? +v2.slice(3) + (v2 === "pct12" || v2 === "pct37" || v2 === "pct62" || v2 === "pct87" ? 0.5 : 0) : 0;
    swatch.style.background = pct ? `color-mix(in srgb, ${fg} ${pct}%, ${bg})` : v2 === "clear" ? bg : `repeating-linear-gradient(${/vert/i.test(v2) ? 90 : /diag/i.test(v2) ? 45 : 0}deg, ${fg} 0 ${/thin/.test(v2) ? 1 : 2}px, ${bg} ${/thin/.test(v2) ? 1 : 2}px 4px)`;
  };
  for (const c4 of [fill, patColor]) c4.onChange(syncShd);
  patStyle.addEventListener("change", syncShd);
  sApply.addEventListener("change", syncShd);
  syncShd();
  const shadingTab = el(
    "div",
    { style: "display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start" },
    el(
      "div",
      { style: "display:flex;flex-direction:column;gap:12px" },
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Fill", "Preenchimento"), fill.el),
      section(
        tr(lang, "Patterns", "Padr\xF5es"),
        el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Style:", "Estilo:"), patStyle),
        el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Color:", "Cor:"), patColor.el)
      )
    ),
    section(
      tr(lang, "Preview", "Visualiza\xE7\xE3o"),
      swatch,
      el("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr(lang, "Apply to:", "Aplicar a:"), sApply)
    )
  );
  const tabs = dialogTabs([
    { id: "borders", label: tr(lang, "Borders", "Bordas"), body: bordersTab },
    { id: "page", label: tr(lang, "Page Border", "Borda da P\xE1gina"), body: pageTab },
    { id: "shading", label: tr(lang, "Shading", "Sombreamento"), body: shadingTab }
  ], tab);
  const h3 = openDialog({
    title: tr(lang, "Borders and Shading", "Bordas e Sombreamento"),
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 680,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  if (touched.size) {
    const sides = {};
    for (const s4 of touched) sides[s4] = bState.get(s4) ?? null;
    if (applyTo.value === "paragraph") {
      const { insideH: _h, insideV: _v, ...ps } = sides;
      ed.setParagraphBorders(ps);
    } else ed.setTableBorderSides(sides, applyTo.value);
  }
  const pgSides = ["top", "left", "bottom", "right"].map((s4) => [s4, pgState.get(s4)]).filter(([, b3]) => !!b3);
  const space = { top: +pTop.value, bottom: +pBottom.value, left: +pLeft.value, right: +pRight.value };
  const newPb = pgSides.length ? {
    ...pFront.checked ? {} : { zOrder: "back" },
    ...pDisplay.value !== "allPages" ? { display: pDisplay.value } : {},
    ...pFrom.value === "page" ? { offsetFrom: "page" } : {},
    ...Object.fromEntries(pgSides.map(([s4, b3]) => [s4, { ...b3, space: space[s4] }]))
  } : null;
  if (JSON.stringify(newPb) !== JSON.stringify(pb0 ?? null)) ed.setPageBorders(newPb, pApply.value);
  const f3 = fill.value(), pv = patStyle.value, pc = patColor.value();
  const shdChanged = f3.hex !== (shdState?.fill && shdState.fill !== "auto" ? shdState.fill : "auto") || pv !== (shdState?.val ?? "clear") || pc.hex !== (shdState?.color && shdState.color !== "auto" ? shdState.color : "auto");
  if (shdChanged) {
    if (sApply.value === "paragraph") ed.setShading(f3.hex === "auto" ? void 0 : f3.hex);
    else {
      const color = f3.hex === "auto" ? null : f3.themeColor ? { themeColor: f3.themeColor, tint: f3.tint, shade: f3.shade } : f3.hex;
      ed.setCellShading(color, pv === "clear" ? null : { val: pv, color: pc.hex }, sApply.value);
    }
  }
}

// src/chrome-table.ts
var L2 = (en, pt) => ({ en, pt });
function alignIcon(v2, h3) {
  const y0 = v2 === "top" ? -760 : v2 === "center" ? -560 : -360;
  const bars = [[0, 360], [80, 260], [160, 360]].map(([dy, w2]) => {
    const x2 = h3 === "left" ? 200 : h3 === "center" ? 480 - w2 / 2 : 760 - w2;
    return `M${x2} ${y0 + dy}h${w2}v40h-${w2}z`;
  }).join("");
  return `<path d="M120-120v-720h720v720H120Zm60-60h600v-600H180v600Z${bars}"/>`;
}
var ALIGN = [
  ["tl", "top", "left", "Align Top Left", "Alinhar em Cima \xE0 Esquerda"],
  ["tc", "top", "center", "Align Top Center", "Alinhar em Cima no Centro"],
  ["tr", "top", "right", "Align Top Right", "Alinhar em Cima \xE0 Direita"],
  ["cl", "center", "left", "Align Center Left", "Alinhar no Centro \xE0 Esquerda"],
  ["cc", "center", "center", "Align Center", "Alinhar no Centro"],
  ["cr", "center", "right", "Align Center Right", "Alinhar no Centro \xE0 Direita"],
  ["bl", "bottom", "left", "Align Bottom Left", "Alinhar Embaixo \xE0 Esquerda"],
  ["bc", "bottom", "center", "Align Bottom Center", "Alinhar Embaixo no Centro"],
  ["br", "bottom", "right", "Align Bottom Right", "Alinhar Embaixo \xE0 Direita"]
];
function registerTableCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const tbl = () => ctl.state().table;
  const inTable = () => canEdit3() && !!tbl();
  const t5 = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => inTable() && c4.isEnabled() : inTable });
  const cmds = [
    // ── Inserir ──
    { id: "table", label: L2("Table", "Tabela"), tip: L2("Insert table", "Inserir tabela"), icon: "table", supports: has("insertTable"), run: () => ctl.tableDialog("insert"), isEnabled: canEdit3 },
    { id: "table:insertDlg", label: L2("Insert Table\u2026", "Inserir Tabela\u2026"), icon: "table", supports: has("insertTable"), run: () => ctl.tableDialog("insert"), isEnabled: canEdit3 },
    {
      id: "table:excel",
      label: L2("Excel Spreadsheet", "Planilha do Excel"),
      icon: "table_view",
      supports: () => typeof ed.canEmbedSpreadsheet === "function" && ed.canEmbedSpreadsheet(),
      isEnabled: () => canEdit3() && !tbl(),
      run: () => {
        void ed.insertSpreadsheet().then(() => ctl.flash(""));
      }
    },
    { id: "table:fromText", label: L2("Convert Text to Table\u2026", "Converter Texto em Tabela\u2026"), icon: "table_convert", supports: has("convertTextToTable"), run: () => ctl.tableDialog("fromText"), isEnabled: () => canEdit3() && !tbl() },
    // ── Layout da Tabela: Tabela ──
    t5({ id: "table:select:cell", label: L2("Select Cell", "Selecionar C\xE9lula"), icon: "crop_square", supports: has("selectCell"), run: () => ed.selectCell() }),
    t5({ id: "table:select:column", label: L2("Select Column", "Selecionar Coluna"), icon: "view_column", supports: has("selectColumn"), run: () => ed.selectColumn() }),
    t5({ id: "table:select:row", label: L2("Select Row", "Selecionar Linha"), icon: "table_rows", supports: has("selectRow"), run: () => ed.selectRow() }),
    t5({ id: "table:select:table", label: L2("Select Table", "Selecionar Tabela"), icon: "select_all", supports: has("selectTable"), run: () => ed.selectTable() }),
    {
      id: "table:gridlines",
      label: L2("View Gridlines", "Exibir Linhas de Grade"),
      icon: "grid_on",
      supports: has("showTableGridlines"),
      run: () => {
        const on = !ed.tableGridlinesShown();
        ed.showTableGridlines(on);
        app.prefs.set("tableGridlines", on ? "1" : "");
      },
      isChecked: () => ed.tableGridlinesShown()
    },
    t5({ id: "table:properties", label: L2("Properties", "Propriedades"), tip: L2("Table Properties", "Propriedades da Tabela"), icon: "tune", supports: has("setTableProperties"), run: () => ctl.tableDialog("properties") }),
    t5({ id: "table:propertiesDlg", label: L2("Table Properties\u2026", "Propriedades da Tabela\u2026"), icon: "tune", supports: has("setTableProperties"), run: () => ctl.tableDialog("properties") }),
    // ── Linhas e Colunas ──
    t5({ id: "row:above", label: L2("Insert Above", "Inserir Acima"), icon: "add_row_above", supports: has("insertRowAbove"), run: () => ed.insertRowAbove() }),
    t5({ id: "row:below", label: L2("Insert Below", "Inserir Abaixo"), icon: "add_row_below", supports: has("insertRowBelow"), run: () => ed.insertRowBelow() }),
    t5({ id: "col:left", label: L2("Insert Left", "Inserir \xE0 Esquerda"), icon: "add_column_left", supports: has("insertColumnLeft"), run: () => ed.insertColumnLeft() }),
    t5({ id: "col:right", label: L2("Insert Right", "Inserir \xE0 Direita"), icon: "add_column_right", supports: has("insertColumnRight"), run: () => ed.insertColumnRight() }),
    t5({ id: "cells:insertDlg", label: L2("Insert Cells\u2026", "Inserir C\xE9lulas\u2026"), icon: "add_box", supports: has("insertCells"), run: () => ctl.tableDialog("insertCells") }),
    t5({ id: "cells:deleteDlg", label: L2("Delete Cells\u2026", "Excluir C\xE9lulas\u2026"), icon: "disabled_by_default", supports: has("deleteCells"), run: () => ctl.tableDialog("deleteCells") }),
    t5({ id: "col:delete", label: L2("Delete Columns", "Excluir Colunas"), icon: "delete", supports: has("deleteColumn"), run: () => ed.deleteColumn() }),
    t5({ id: "row:delete", label: L2("Delete Rows", "Excluir Linhas"), icon: "delete", supports: has("deleteRow"), run: () => ed.deleteRow() }),
    t5({ id: "table:delete", label: L2("Delete Table", "Excluir Tabela"), icon: "delete_forever", supports: has("deleteTable"), run: () => ed.deleteTable() }),
    // ── Mesclar ──
    t5({ id: "cells:merge", label: L2("Merge Cells", "Mesclar C\xE9lulas"), icon: "cell_merge", supports: has("mergeCells"), run: () => ed.mergeCells(), isEnabled: () => !!tbl()?.canMerge }),
    t5({ id: "cells:split", label: L2("Split Cells\u2026", "Dividir C\xE9lulas\u2026"), icon: "splitscreen_vertical_add", supports: has("splitCell"), run: () => ctl.tableDialog("split") }),
    t5({ id: "table:split", label: L2("Split Table", "Dividir Tabela"), icon: "splitscreen", supports: has("splitTable"), run: () => ed.splitTable() }),
    // ── Tamanho da Célula ──
    t5({ id: "table:autofit:content", label: L2("AutoFit Contents", "AutoAjuste de Conte\xFAdo"), icon: "fit_width", supports: has("autoFitTable"), run: () => ed.autoFitTable("content") }),
    t5({ id: "table:autofit:window", label: L2("AutoFit Window", "AutoAjuste de Janela"), icon: "expand_content", supports: has("autoFitTable"), run: () => ed.autoFitTable("window") }),
    t5({ id: "table:autofit:fixed", label: L2("Fixed Column Width", "Largura Fixa da Coluna"), icon: "width_normal", supports: has("autoFitTable"), run: () => ed.autoFitTable("fixed") }),
    t5({ id: "rows:distribute", label: L2("Distribute Rows", "Distribuir Linhas"), icon: "view_agenda", supports: has("distributeRows"), run: () => ed.distributeRows() }),
    t5({ id: "cols:distribute", label: L2("Distribute Columns", "Distribuir Colunas"), icon: "view_week", supports: has("distributeColumns"), run: () => ed.distributeColumns() }),
    // ── Alinhamento ──
    ...ALIGN.map(([id, v2, h3, en, pt]) => t5({
      id: `cell:align:${id}`,
      label: L2(en, pt),
      icon: alignIcon(v2, h3),
      supports: has("setCellAlignment"),
      run: () => ed.setCellAlignment(h3, v2),
      isChecked: () => {
        const s4 = tbl();
        const ph = ctl.state().para.alignment ?? "left";
        return !!s4 && s4.vAlign === v2 && ph === h3;
      }
    })),
    t5({ id: "cell:textdir", label: L2("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", supports: has("cycleTextDirection"), run: () => ed.cycleTextDirection() }),
    t5({ id: "cell:margins", label: L2("Cell Margins", "Margens da C\xE9lula"), icon: "padding", supports: has("setTableCellMargins"), run: () => ctl.tableDialog("margins") }),
    // ── Dados ──
    t5({ id: "table:headerRows", label: L2("Repeat Header Rows", "Repetir Linhas de Cabe\xE7alho"), icon: "view_headline", supports: has("toggleRepeatHeaderRows"), run: () => ed.toggleRepeatHeaderRows(), isChecked: () => !!tbl()?.headerRow }),
    t5({ id: "table:toText", label: L2("Convert to Text", "Converter em Texto"), icon: "text_snippet", supports: has("convertTableToText"), run: () => ctl.tableDialog("toText") }),
    { id: "sort", label: L2("Sort", "Classificar"), tip: L2("Sort (rows of the table or the selected paragraphs)", "Classificar (linhas da tabela ou os par\xE1grafos selecionados)"), icon: "sort_by_alpha", supports: has("sort"), isEnabled: canEdit3, run: () => ctl.tableDialog("sort") },
    t5({ id: "table:formula", label: L2("Formula", "F\xF3rmula"), tip: L2("Formula (F9 updates)", "F\xF3rmula (F9 atualiza)"), icon: "functions", supports: has("insertFormula"), run: () => ctl.tableDialog("formula"), isEnabled: () => !tbl()?.cells }),
    {
      id: "fields:update",
      label: L2("Update Fields", "Atualizar Campos"),
      icon: "autorenew",
      shortcut: "F9",
      supports: has("updateFields"),
      isEnabled: canEdit3,
      run: () => {
        if (!ed.updateFields()) ctl.flash(pickLabels(app.lang, L2("No fields to update", "Nenhum campo para atualizar")));
      }
    },
    // ── Design da Tabela: Opções de Estilo ──
    ...LOOK.map(([id, key, en, pt]) => t5({
      id: `table:look:${id}`,
      label: L2(en, pt),
      icon: "check_box_outline_blank",
      supports: has("setTableStyleOptions"),
      run: () => ed.setTableStyleOptions({ [key]: !lookOn(tbl()?.look, key) }),
      isChecked: () => lookOn(tbl()?.look, key)
    })),
    // ── Estilos de Tabela ──
    { id: "table:style:new", label: L2("New Table Style\u2026", "Novo Estilo de Tabela\u2026"), icon: "add", supports: has("saveTableStyle"), isEnabled: canEdit3, run: () => ctl.tableDialog("tableStyle:new") },
    t5({ id: "table:style:modify", label: L2("Modify Table Style\u2026", "Modificar Estilo de Tabela\u2026"), icon: "edit", supports: has("saveTableStyle"), run: () => ctl.tableDialog("tableStyle:modify") }),
    t5({ id: "table:style:clear", label: L2("Clear", "Limpar"), icon: "format_clear", supports: has("setTableStyle"), run: () => {
      void ed.setTableStyle(null);
    } }),
    t5({
      id: "table:shading",
      label: L2("Shading", "Sombreamento"),
      icon: "format_color_fill",
      supports: has("setCellShading"),
      run: () => ed.setCellShading(app.lastTableShading),
      color: () => app.lastTableShadingCss
    }),
    // ── Bordas ──
    ...BORDERS.map(([kind, en, pt, icon]) => t5({
      id: `table:border:${kind}`,
      label: L2(en, pt),
      icon,
      supports: has("setCellBorders"),
      run: () => {
        app.lastTableBorder = kind;
        ed.setCellBorders(kind);
      }
    })),
    t5({
      id: "table:borders",
      label: L2("Borders", "Bordas"),
      icon: "border_all",
      supports: has("setCellBorders"),
      run: () => ed.setCellBorders(app.lastTableBorder)
    }),
    {
      id: "table:painter",
      label: L2("Border Painter", "Pincel de Bordas"),
      tip: L2("Border Painter: click cell borders to apply the pen (Esc ends)", "Pincel de Bordas: clique nas bordas das c\xE9lulas para aplicar a caneta (Esc encerra)"),
      icon: "format_paint",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("painter"),
      isChecked: () => ed.getTableTool() === "painter"
    },
    {
      id: "table:draw",
      label: L2("Draw Table", "Desenhar Tabela"),
      tip: L2("Draw Table: drag inside a cell to split it, outside to create a table (Esc ends)", "Desenhar Tabela: arraste numa c\xE9lula para dividi-la, fora para criar uma tabela (Esc encerra)"),
      icon: "draw",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("draw"),
      isChecked: () => ed.getTableTool() === "draw"
    },
    {
      id: "table:eraser",
      label: L2("Eraser", "Borracha"),
      tip: L2("Eraser: click a border between cells to merge them (Esc ends)", "Borracha: clique numa divisa entre c\xE9lulas para mescl\xE1-las (Esc encerra)"),
      icon: "ink_eraser",
      supports: has("setTableTool"),
      isEnabled: canEdit3,
      run: () => ed.setTableTool("eraser"),
      isChecked: () => ed.getTableTool() === "eraser"
    },
    // Opções de colagem de células (depois de copiar células)
    ...[
      ["overwrite", "Overwrite Cells", "Substituir C\xE9lulas", "content_paste"],
      ["rows", "Insert as New Rows", "Inserir como Novas Linhas", "add_row_above"],
      ["nest", "Nest Table", "Aninhar Tabela", "table"],
      ["text", "Keep Text Only", "Manter Somente Texto", "text_snippet"]
    ].map(([mode, en, pt, icon]) => ({
      id: `paste:cells:${mode}`,
      label: L2(en, pt),
      icon,
      supports: has("pasteCells"),
      isEnabled: () => canEdit3() && ed.hasCellsClip() && (mode === "text" || mode === "overwrite" || !!tbl()),
      run: () => {
        ed.pasteCells(mode);
      }
    })),
    { id: "dlg:borders", label: L2("Borders and Shading\u2026", "Bordas e Sombreamento\u2026"), icon: "border_style", supports: has("setParagraphBorders"), isEnabled: canEdit3, run: () => ctl.tableDialog("borders") },
    { id: "dlg:pageBorders", label: L2("Page Borders", "Bordas de P\xE1gina"), tip: L2("Page Borders (Borders and Shading)", "Bordas de P\xE1gina (Bordas e Sombreamento)"), icon: "border_outer", supports: has("setPageBorders"), isEnabled: canEdit3, run: () => ctl.tableDialog("pageBorders") }
  ];
  reg.add(...cmds);
}
var LOOK = [
  ["header", "headerRow", "Header Row", "Linha de Cabe\xE7alho"],
  ["first", "firstColumn", "First Column", "Primeira Coluna"],
  ["total", "totalRow", "Total Row", "Linha de Total"],
  ["last", "lastColumn", "Last Column", "\xDAltima Coluna"],
  ["bandedRows", "bandedRows", "Banded Rows", "Linhas em Tiras"],
  ["bandedCols", "bandedColumns", "Banded Columns", "Colunas em Tiras"]
];
var lookOn = (look, k2) => {
  if (!look) return false;
  switch (k2) {
    case "headerRow":
      return !!look.firstRow;
    case "totalRow":
      return !!look.lastRow;
    case "firstColumn":
      return !!look.firstColumn;
    case "lastColumn":
      return !!look.lastColumn;
    case "bandedRows":
      return !look.noHBand;
    case "bandedColumns":
      return !look.noVBand;
  }
};
var BORDERS = [
  ["bottom", "Bottom Border", "Borda Inferior", "border_bottom"],
  ["top", "Top Border", "Borda Superior", "border_top"],
  ["left", "Left Border", "Borda Esquerda", "border_left"],
  ["right", "Right Border", "Borda Direita", "border_right"],
  ["none", "No Border", "Sem Borda", "border_clear"],
  ["all", "All Borders", "Todas as Bordas", "border_all"],
  ["outside", "Outside Borders", "Bordas Externas", "border_outer"],
  ["inside", "Inside Borders", "Bordas Internas", "border_inner"],
  ["insideH", "Inside Horizontal Border", "Borda Horizontal Interna", "border_horizontal"],
  ["insideV", "Inside Vertical Border", "Borda Vertical Interna", "border_vertical"],
  ["tl2br", "Diagonal Down Border", "Borda Diagonal Inferior", "south_east"],
  ["tr2bl", "Diagonal Up Border", "Borda Diagonal Superior", "rotate_90_degrees_ccw"]
];
var thumbQueue = [];
var thumbBusy = false;
function queueThumb(f3) {
  thumbQueue.push(f3);
  if (thumbBusy) return;
  thumbBusy = true;
  const step = () => {
    const batch = thumbQueue.splice(0, 8);
    if (!batch.length) {
      thumbBusy = false;
      return;
    }
    void Promise.all(batch.map((g2) => g2().catch(() => void 0))).then(() => requestAnimationFrame(step));
  };
  requestAnimationFrame(step);
}
var STYLE_SECTIONS = [
  { id: "custom", label: L2("Custom", "Personalizado") },
  { id: "plain", label: L2("Plain Tables", "Tabelas Simples") },
  { id: "grid", label: L2("Grid Tables", "Tabelas de Grade") },
  { id: "list", label: L2("List Tables", "Tabelas de Lista") }
];
function tableStyleGallery(env) {
  const W = 72, H2 = 52;
  const list = () => env.ed.tableStyleListNow() ?? [];
  const lookKey = () => JSON.stringify(env.ctl.state().table?.look ?? {});
  return {
    gallery: {
      id: "table:styles",
      label: L2("Table Styles", "Estilos de Tabela"),
      icon: "table_view",
      tile: { w: W, h: H2 },
      rows: 1,
      maxCols: 7,
      minCols: 3,
      expandCols: 7,
      sections: STYLE_SECTIONS,
      supports: () => typeof env.ed.tableStyleListNow === "function",
      isEnabled: () => !!env.ctl.state().table && !env.ed.isProtected(),
      items: () => list().map((s4) => ({ id: s4.name, label: s4.label, section: s4.group })),
      version: () => `${env.ed.stylesVersion()}|${lookKey()}|${list().length}`,
      selected: () => {
        const cur = env.ctl.state().table?.style;
        return cur ? list().find((s4) => s4.id === cur)?.name : void 0;
      },
      render: (tile, it) => {
        const dpr = window.devicePixelRatio || 1;
        const cv = document.createElement("canvas");
        cv.width = Math.round((W - 6) * dpr);
        cv.height = Math.round((H2 - 6) * dpr);
        cv.style.cssText = `width:${W - 6}px;height:${H2 - 6}px;display:block;margin:auto`;
        tile.replaceChildren(cv);
        const look = env.ctl.state().table?.look;
        queueThumb(() => cv.isConnected ? env.ed.renderTableStyleThumb(cv, it.id, look) : Promise.resolve());
      },
      onPick: (name) => {
        void env.ed.setTableStyle(name).then(() => env.app.ui?.sync());
      },
      footer: () => ["table:style:modify", "table:style:clear", "table:style:new"],
      context: (it) => [{
        id: "table:style:modifyItem",
        icon: "edit",
        label: L2("Modify Table Style\u2026", "Modificar Estilo de Tabela\u2026"),
        onClick: () => env.ctl.tableDialog("tableStyle:modify", it.id)
      }]
    }
  };
}
var tableShadingMenu = (env, ctx) => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const box = document.createElement("div");
    const theme = colorGrid({
      colors: themePaletteColors(colors),
      columns: 10,
      close,
      onPick: (v2) => {
        const p3 = parseThemePick(v2, colors);
        if (!p3) return;
        env.app.lastTableShading = { themeColor: p3.themeColor, tint: p3.tint, shade: p3.shade };
        env.app.lastTableShadingCss = `#${p3.hex}`;
        env.ed.setCellShading(env.app.lastTableShading);
        ctx.after();
      }
    });
    const std = colorGrid({
      colors: STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })),
      columns: 10,
      close,
      onPick: (h3) => {
        env.app.lastTableShading = h3;
        env.app.lastTableShadingCss = `#${h3}`;
        env.ed.setCellShading(h3);
        ctx.after();
      }
    });
    const cap2 = (en, pt) => {
      const d3 = document.createElement("div");
      d3.textContent = ctx.registry.text(L2(en, pt));
      d3.style.cssText = "font-size:12px;opacity:.8;margin:6px 0 4px";
      return d3;
    };
    box.append(cap2("Theme Colors", "Cores do Tema"), theme, cap2("Standard Colors", "Cores Padr\xE3o"), std);
    return box;
  }
}, "-", { id: "table:shading:none", label: L2("No Color", "Sem Cor"), icon: "format_color_reset", onClick: () => {
  env.ed.setCellShading(null);
  ctx.after();
} }];
var bordersMenu = () => [...BORDERS.map(([k2]) => `table:border:${k2}`), "-", "dlg:borders"];
var penStyleMenu = (env, ctx) => [{
  content: (close) => {
    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;max-height:min(420px,60vh);overflow:auto;min-width:150px";
    const cur = env.ed.getBorderPen().val;
    for (const [v2, en, pt] of BORDER_STYLES) {
      const b3 = document.createElement("button");
      b3.type = "button";
      b3.className = "uo-mi";
      b3.title = ctx.registry.text(L2(en, pt));
      b3.style.cssText = `display:flex;align-items:center;padding:6px 10px;border:0;background:${v2 === cur ? "color-mix(in srgb, var(--u-color-primary,#005bc0) 18%, transparent)" : "transparent"};color:inherit;cursor:pointer`;
      b3.innerHTML = borderSampleSvg(v2);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => {
        close();
        env.ed.setBorderPen({ val: v2 });
        ctx.after();
      });
      box.append(b3);
    }
    return box;
  }
}];
var penWidthMenu = (env, ctx) => BORDER_WIDTHS.map(([sz, t5]) => ({
  id: `penw:${sz}`,
  label: `${t5} pt`,
  checked: env.ed.getBorderPen().sz === sz,
  onClick: () => {
    env.ed.setBorderPen({ sz });
    ctx.after();
  }
}));
var penColorMenu = (env, ctx) => [{
  id: "pen:auto",
  label: L2("Automatic", "Autom\xE1tico"),
  icon: "format_color_text",
  onClick: () => {
    env.ed.setBorderPen({ color: "auto", themeColor: void 0, themeTint: void 0, themeShade: void 0 });
    ctx.after();
  }
}, "-", {
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    return colorGrid({
      colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
      columns: 10,
      close,
      onPick: (v2) => {
        const p3 = parseThemePick(v2, colors);
        env.ed.setBorderPen(p3 ? { color: p3.hex, themeColor: p3.themeColor, themeTint: p3.tint, themeShade: p3.shade } : { color: v2, themeColor: void 0, themeTint: void 0, themeShade: void 0 });
        ctx.after();
      }
    });
  }
}];
function tableDesignGroups(env, ctx) {
  const has = (m2) => () => typeof env.ed[m2] === "function";
  return [
    { id: "td-options", label: L2("Table Style Options", "Op\xE7\xF5es de Estilo de Tabela"), icon: "check_box", prio: 4, cells: [
      { rows: [[{ cmd: "table:look:header", label: true }], [{ cmd: "table:look:total", label: true }], [{ cmd: "table:look:bandedRows", label: true }]] },
      { rows: [[{ cmd: "table:look:first", label: true }], [{ cmd: "table:look:last", label: true }], [{ cmd: "table:look:bandedCols", label: true }]] }
    ] },
    { id: "td-styles", label: L2("Table Styles", "Estilos de Tabela"), icon: "table_view", prio: 6, cells: [
      tableStyleGallery(env),
      { split: "table:shading", menu: () => tableShadingMenu(env, ctx), size: "large" }
    ] },
    { id: "td-borders", label: L2("Borders", "Bordas"), icon: "border_all", prio: 5, cells: [
      { rows: [
        [{ menu: () => penStyleMenu(env, ctx), id: "pen:style", label: L2("Pen Style", "Estilo da Caneta"), icon: "line_style", showLabel: true, supports: has("setBorderPen") }],
        [{ menu: () => penWidthMenu(env, ctx), id: "pen:width", label: L2("Pen Weight", "Espessura da Caneta"), icon: "line_weight", showLabel: true, supports: has("setBorderPen") }],
        [{ menu: () => penColorMenu(env, ctx), id: "pen:color", label: L2("Pen Color", "Cor da Caneta"), icon: "border_color", showLabel: true, supports: has("setBorderPen") }]
      ] },
      { menu: () => borderStylesMenu(env, ctx), id: "table:borderStyles", label: L2("Border Styles", "Estilos de Borda"), icon: "style", size: "large", supports: has("setBorderPen") },
      { split: "table:borders", menu: bordersMenu, size: "large" },
      { cmd: "table:painter", size: "large" }
    ] }
  ];
}
var recentPens = [];
var BORDER_STYLE_ROWS = [["single", 4], ["single", 12], ["single", 18], ["double", 4], ["double", 12], ["thinThickSmallGap", 18], ["dotted", 4], ["dashed", 4]];
var borderStylesMenu = (env, ctx) => [{
  content: (close) => {
    const colors = env.ed.documentThemeColors();
    const slots = [["text1", colors["dk1"] ?? colors["text1"] ?? "000000"], ...[1, 2, 3, 4, 5, 6].map((i5) => [`accent${i5}`, colors[`accent${i5}`] ?? "808080"])];
    const box = document.createElement("div");
    box.style.cssText = "display:flex;flex-direction:column;gap:6px;padding:2px;max-height:min(460px,65vh);overflow:auto";
    const pick = (pen) => {
      close();
      env.ed.setBorderPen({ val: pen.val, sz: pen.sz, color: pen.color, themeColor: pen.themeColor, themeTint: void 0, themeShade: void 0 });
      const k2 = JSON.stringify(pen);
      const i5 = recentPens.findIndex((x2) => JSON.stringify(x2) === k2);
      if (i5 >= 0) recentPens.splice(i5, 1);
      recentPens.unshift(pen);
      recentPens.length = Math.min(recentPens.length, 7);
      if (env.ed.getTableTool() !== "painter") env.ed.setTableTool("painter");
      ctx.after();
    };
    const grid2 = (pens) => {
      const g2 = document.createElement("div");
      g2.style.cssText = "display:grid;grid-template-columns:repeat(7,64px);gap:3px";
      for (const pen of pens) {
        const b3 = document.createElement("button");
        b3.type = "button";
        b3.className = "uo-mi";
        b3.title = `${ctx.registry.text(L2(BORDER_STYLES.find(([v2]) => v2 === pen.val)?.[1] ?? pen.val, BORDER_STYLES.find(([v2]) => v2 === pen.val)?.[2] ?? pen.val))}, ${pen.sz / 8} pt`;
        b3.style.cssText = "height:26px;padding:2px;border:1px solid color-mix(in srgb, currentColor 20%, transparent);border-radius:4px;background:#fff;cursor:pointer;display:flex;align-items:center";
        b3.innerHTML = borderSampleSvg(pen.val, `#${pen.color}`, 58, 14);
        b3.addEventListener("mousedown", (e6) => e6.preventDefault());
        b3.addEventListener("click", () => pick(pen));
        g2.append(b3);
      }
      return g2;
    };
    const head = (t5) => {
      const h3 = document.createElement("div");
      h3.textContent = ctx.registry.text(t5);
      h3.style.cssText = "font-size:12px;font-weight:600;opacity:.8;margin:2px";
      return h3;
    };
    box.append(
      head(L2("Theme Borders", "Bordas do Tema")),
      grid2(BORDER_STYLE_ROWS.flatMap(([val, sz]) => slots.map(([slot, hex]) => ({ val, sz, color: hex, themeColor: slot }))))
    );
    if (recentPens.length) box.append(head(L2("Recently Used Borders", "Bordas Usadas Recentemente")), grid2(recentPens));
    return box;
  }
}];
var tableMenu = (env, ctx) => [{
  content: (close) => {
    const box = document.createElement("div");
    const cap2 = document.createElement("div");
    cap2.style.cssText = "font-size:12.5px;margin-bottom:6px";
    cap2.textContent = env.app.ui.L.rows(1, 1);
    const g2 = document.createElement("div");
    g2.style.cssText = "display:grid;grid-template-columns:repeat(10,18px);gap:3px";
    const cells = [];
    for (let r5 = 1; r5 <= 8; r5++) for (let c4 = 1; c4 <= 10; c4++) {
      const cell = document.createElement("div");
      cell.style.cssText = "width:18px;height:18px;border:1px solid currentColor;opacity:.35;border-radius:2px;cursor:pointer";
      cell.addEventListener("mouseenter", () => {
        cap2.textContent = env.app.ui.L.rows(r5, c4);
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
    box.append(cap2, g2);
    return box;
  }
}, "-", "table:insertDlg", "table:fromText", "table:excel", "-", {
  id: "table:quickMenu",
  label: L2("Quick Tables", "Tabelas R\xE1pidas"),
  icon: "table_view",
  hidden: typeof env.ed.insertQuickTable !== "function",
  submenu: () => env.ed.quickTables().map((q) => ({
    id: `table:quick:${q.id}`,
    label: q.label,
    icon: "table",
    onClick: () => {
      void env.ed.insertQuickTable(q.id).then(() => ctx.after());
    }
  }))
}];
var measureWidget = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L2("Table Row Height", "Altura da Linha da Tabela") : L2("Table Column Width", "Largura da Coluna da Tabela"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L2(".", ","));
    const cm = (tw2) => `${(Math.round(tw2 / 1440 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const tw = (s4) => {
      const n5 = parseFloat(s4.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n5) ? Math.round(n5 / 2.54 * 1440) : void 0;
    };
    const cur = () => {
      const s4 = env.ctl.state().table;
      return which === "height" ? s4?.rowHeight?.twips ?? 0 : s4?.colWidth ?? 0;
    };
    const set = (v2) => {
      if (which === "height") env.ed.setRowHeight(Math.max(0, v2), env.ctl.state().table?.rowHeight?.rule === "exact" ? "exact" : "atLeast");
      else env.ed.setColumnWidth(Math.max(57, v2));
      ctx.after();
    };
    const apply = () => {
      const v2 = tw(input.value);
      if (v2 !== void 0) set(v2);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        apply();
      }
    });
    const step = (d3) => set(cur() + d3 * 57);
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b3, d3, s4] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b3.type = "button";
      b3.className = "uo-btn";
      b3.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b3.innerHTML = symbol(s4);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => step(d3));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      sync: () => {
        const s4 = env.ctl.state().table;
        const off = !s4 || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s4 ? cm(cur()) : "";
      }
    };
  }
});
var selectMenu = () => ["table:select:cell", "table:select:column", "table:select:row", "table:select:table"];
var deleteMenu = () => ["cells:deleteDlg", "col:delete", "row:delete", "table:delete"];
var autofitMenu = () => ["table:autofit:content", "table:autofit:window", "table:autofit:fixed"];
function tableLayoutGroups(env) {
  const big = (cmd) => ({ cmd, size: "large" });
  const has = (m2) => () => typeof env.ed[m2] === "function";
  const alignGrid = { rows: [["cell:align:tl", "cell:align:tc", "cell:align:tr"], ["cell:align:cl", "cell:align:cc", "cell:align:cr"], ["cell:align:bl", "cell:align:bc", "cell:align:br"]] };
  return [
    { id: "tl-table", label: L2("Table", "Tabela"), icon: "table", prio: 3, cells: [
      { rows: [
        [{ menu: selectMenu, id: "table:select", label: L2("Select", "Selecionar"), icon: "select_all", showLabel: true, supports: has("selectTable") }],
        [{ cmd: "table:gridlines", label: true }],
        [{ cmd: "table:properties", label: true }]
      ] }
    ] },
    { id: "tl-draw", label: L2("Draw", "Desenhar"), icon: "draw", prio: 1, cells: [big("table:draw"), big("table:eraser")] },
    { id: "tl-rows", label: L2("Rows & Columns", "Linhas e Colunas"), icon: "table_rows", prio: 6, launcher: "cells:insertDlg", cells: [
      { menu: deleteMenu, id: "table:deleteMenu", label: L2("Delete", "Excluir"), icon: "delete", size: "large", supports: has("deleteRow") },
      big("row:above"),
      { rows: [[{ cmd: "row:below", label: true }], [{ cmd: "col:left", label: true }], [{ cmd: "col:right", label: true }]] }
    ] },
    { id: "tl-merge", label: L2("Merge", "Mesclar"), icon: "cell_merge", prio: 5, cells: [
      { rows: [[{ cmd: "cells:merge", label: true }], [{ cmd: "cells:split", label: true }], [{ cmd: "table:split", label: true }]] }
    ] },
    { id: "tl-size", label: L2("Cell Size", "Tamanho da C\xE9lula"), icon: "width", prio: 4, cells: [
      { menu: autofitMenu, id: "table:autofit", label: L2("AutoFit", "AutoAjuste"), icon: "fit_width", size: "large", supports: has("autoFitTable") },
      { rows: [[measureWidget(env, "height")], [measureWidget(env, "width")]] },
      { rows: [[{ cmd: "rows:distribute", label: true }], [{ cmd: "cols:distribute", label: true }]] }
    ] },
    { id: "tl-align", label: L2("Alignment", "Alinhamento"), icon: "vertical_align_center", prio: 5, cells: [
      alignGrid,
      big("cell:textdir"),
      big("cell:margins")
    ] },
    { id: "tl-data", label: L2("Data", "Dados"), icon: "functions", prio: 2, cells: [
      big("sort"),
      { rows: [[{ cmd: "table:headerRows", label: true }], [{ cmd: "table:toText", label: true }], [{ cmd: "table:formula", label: true }]] }
    ] }
  ];
}
var tableFormatMenu = () => ({
  id: "tableFmt",
  label: L2("Table", "Tabela"),
  icon: "table",
  submenu: () => [
    "row:above",
    "row:below",
    "col:left",
    "col:right",
    "cells:insertDlg",
    "-",
    "row:delete",
    "col:delete",
    "cells:deleteDlg",
    "table:delete",
    "-",
    "cells:merge",
    "cells:split",
    "table:split",
    "-",
    { id: "tableFmt:select", label: L2("Select", "Selecionar"), icon: "select_all", submenu: selectMenu },
    { id: "tableFmt:autofit", label: L2("AutoFit", "AutoAjuste"), icon: "fit_width", submenu: autofitMenu },
    "rows:distribute",
    "cols:distribute",
    "-",
    { id: "tableFmt:align", label: L2("Cell alignment", "Alinhamento da c\xE9lula"), icon: "vertical_align_center", submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
    "cell:textdir",
    "cell:margins",
    "-",
    "table:headerRows",
    "table:toText",
    "table:formula",
    "sort",
    "-",
    "table:gridlines",
    "table:propertiesDlg"
  ]
});
var tableContextItems = () => [
  { id: "ctxTablePaste", label: L2("Paste Options", "Op\xE7\xF5es de Colagem"), icon: "content_paste", submenu: () => ["paste:cells:overwrite", "paste:cells:rows", "paste:cells:nest", "paste:cells:text"] },
  { id: "ctxTableInsert", label: L2("Insert", "Inserir"), icon: "add", submenu: () => ["row:above", "row:below", "col:left", "col:right", "cells:insertDlg"] },
  { id: "ctxTableDelete", label: L2("Delete", "Excluir"), icon: "delete", submenu: deleteMenu },
  "cells:merge",
  "cells:split",
  "-",
  { id: "ctxTableAlign", label: L2("Cell alignment", "Alinhamento da c\xE9lula"), icon: "vertical_align_center", submenu: () => ALIGN.map(([id]) => `cell:align:${id}`) },
  "cell:textdir",
  { id: "ctxTableAutofit", label: L2("AutoFit", "AutoAjuste"), icon: "fit_width", submenu: autofitMenu },
  "rows:distribute",
  "cols:distribute",
  "-",
  "table:propertiesDlg"
];

// src/chrome-hf.ts
var L3 = (en, pt) => ({ en, pt });
var tr2 = (lang, en, pt) => pickLabels(lang, { en, pt });
function registerHfCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const opts = () => ed.getHeaderFooterOptions();
  const inHf = () => ed.editingHeaderFooter() !== null;
  const edit = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => canEdit3() && c4.isEnabled() : canEdit3 });
  const cmds = [
    edit({ id: "hf:editHeader", label: L3("Edit Header", "Editar Cabe\xE7alho"), icon: "edit", run: () => ed.goToHeaderFooter("header") }),
    edit({ id: "hf:editFooter", label: L3("Edit Footer", "Editar Rodap\xE9"), icon: "edit", run: () => ed.goToHeaderFooter("footer") }),
    edit({ id: "hf:removeHeader", label: L3("Remove Header", "Remover Cabe\xE7alho"), icon: "delete", supports: has("removeHeaderFooter"), run: () => ed.removeHeaderFooter("header") }),
    edit({ id: "hf:removeFooter", label: L3("Remove Footer", "Remover Rodap\xE9"), icon: "delete", supports: has("removeHeaderFooter"), run: () => ed.removeHeaderFooter("footer") }),
    edit({ id: "hf:removePageNumbers", label: L3("Remove Page Numbers", "Remover N\xFAmeros de P\xE1gina"), icon: "delete", supports: has("removePageNumbers"), run: () => ed.removePageNumbers() }),
    edit({ id: "dlg:pageNumberFormat", label: L3("Format Page Numbers\u2026", "Formatar N\xFAmeros de P\xE1gina\u2026"), icon: "format_list_numbered", supports: has("setPageNumberFormat"), run: () => ctl.hfDialog("pageNumbers") }),
    edit({ id: "dlg:dateTime", label: L3("Date & Time", "Data e Hora"), tip: L3("Insert the current date or time", "Insere a data ou a hora atual"), icon: "calendar_today", supports: has("insertDateTime"), run: () => ctl.hfDialog("dateTime") }),
    edit({ id: "dlg:alignTab", label: L3("Insert Alignment Tab", "Inserir Tabula\xE7\xE3o de Alinhamento"), tip: L3("Tab stop that aligns text to the margin or the indent", "Tabula\xE7\xE3o que alinha o texto \xE0 margem ou ao recuo"), icon: "keyboard_tab", supports: has("insertAlignmentTab"), run: () => ctl.hfDialog("alignTab") }),
    edit({ id: "dlg:hfOptions", label: L3("Header & footer options\u2026", "Op\xE7\xF5es de cabe\xE7alho e rodap\xE9\u2026"), icon: "tune", supports: has("setDifferentFirstPage"), run: () => ctl.hfDialog("options") }),
    ...[["author", "Author", "Autor", "person"], ["title", "Document Title", "T\xEDtulo do Documento", "title"], ["fileName", "File Name", "Nome do Arquivo", "draft"], ["filePath", "File Path", "Caminho do Arquivo", "folder"]].map(([k2, en, pt, icon]) => edit({ id: `docinfo:${k2}`, label: { en, pt }, icon, supports: has("insertDocumentInfo"), run: () => ed.insertDocumentInfo(k2, app.title ? app.title + "." + app.format : "") })),
    // navegação (guia contextual)
    edit({ id: "hf:gotoHeader", label: L3("Go to Header", "Ir para Cabe\xE7alho"), icon: "vertical_align_top", supports: has("goToHeaderFooter"), run: () => ed.goToHeaderFooter("header"), isEnabled: () => ed.editingHeaderFooter() === "footer" }),
    edit({ id: "hf:gotoFooter", label: L3("Go to Footer", "Ir para Rodap\xE9"), icon: "vertical_align_bottom", supports: has("goToHeaderFooter"), run: () => ed.goToHeaderFooter("footer"), isEnabled: () => ed.editingHeaderFooter() === "header" }),
    edit({ id: "hf:prev", label: L3("Previous", "Anterior"), tip: L3("Previous header or footer", "Cabe\xE7alho ou rodap\xE9 anterior"), icon: "navigate_before", supports: has("previousHeaderFooter"), run: () => ed.previousHeaderFooter(), isEnabled: inHf }),
    edit({ id: "hf:next", label: L3("Next", "Pr\xF3ximo"), tip: L3("Next header or footer", "Pr\xF3ximo cabe\xE7alho ou rodap\xE9"), icon: "navigate_next", supports: has("nextHeaderFooter"), run: () => ed.nextHeaderFooter(), isEnabled: inHf }),
    edit({
      id: "hf:link",
      label: L3("Link to Previous", "Vincular ao Anterior"),
      tip: L3("Use the same header or footer as the previous section", "Usa o mesmo cabe\xE7alho ou rodap\xE9 da se\xE7\xE3o anterior"),
      icon: "link",
      supports: has("setLinkToPrevious"),
      isEnabled: () => inHf() && (opts()?.section ?? 0) > 0,
      isChecked: () => !!opts()?.linkToPrevious,
      run: () => ed.setLinkToPrevious(!opts()?.linkToPrevious)
    }),
    // opções (caixas de seleção)
    edit({ id: "hf:firstPage", label: L3("Different First Page", "Primeira P\xE1gina Diferente"), icon: "filter_1", supports: has("setDifferentFirstPage"), isChecked: () => !!opts()?.differentFirstPage, run: () => ed.setDifferentFirstPage(!opts()?.differentFirstPage) }),
    edit({ id: "hf:oddEven", label: L3("Different Odd & Even Pages", "P\xE1ginas Pares e \xCDmpares Diferentes"), icon: "auto_stories", supports: has("setDifferentOddEven"), isChecked: () => !!opts()?.differentOddEven, run: () => ed.setDifferentOddEven(!opts()?.differentOddEven) }),
    { id: "hf:showText", label: L3("Show Document Text", "Mostrar Texto do Documento"), icon: "visibility", supports: has("showDocumentText"), isEnabled: inHf, isChecked: () => ed.documentTextShown(), run: () => ed.showDocumentText(!ed.documentTextShown()) }
  ];
  reg.add(...cmds);
}
function templateTiles(env, ctx, gallery, wide) {
  return {
    content: (close) => {
      const list = document.createElement("div");
      list.className = "uw-hf-gallery";
      list.style.cssText = `display:grid;grid-template-columns:${wide ? "1fr" : "repeat(3, auto)"};gap:6px;padding:6px;max-height:${wide ? 420 : 300}px;overflow:auto`;
      for (const t5 of env.ed.headerFooterTemplates(gallery)) {
        const b3 = document.createElement("button");
        b3.type = "button";
        b3.dataset["template"] = t5.id;
        b3.title = t5.name;
        b3.setAttribute("aria-label", t5.name);
        b3.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left";
        const cap2 = document.createElement("span");
        cap2.textContent = t5.name;
        cap2.style.cssText = "font-size:12px;opacity:.8";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        b3.append(cap2, cv);
        b3.addEventListener("mousedown", (e6) => e6.preventDefault());
        b3.addEventListener("click", () => {
          close();
          env.ed.insertHeaderFooterTemplate(gallery, t5.id);
          ctx.after();
        });
        list.append(b3);
        requestAnimationFrame(() => {
          env.ed.paintHeaderFooterTemplate(gallery, t5.id, cv, wide ? 300 : gallery === "pageMargin" ? 90 : 160);
        });
      }
      return list;
    }
  };
}
function hfGalleryMenu(env, ctx, kind) {
  return [
    templateTiles(env, ctx, kind, true),
    "-",
    kind === "header" ? "hf:editHeader" : "hf:editFooter",
    kind === "header" ? "hf:removeHeader" : "hf:removeFooter"
  ];
}
function pageNumberMenu(env, ctx) {
  const sub = (id, label, icon) => ({ id: `pgnum:${id}`, label, icon, submenu: () => [templateTiles(env, ctx, id, id !== "pageMargin" && id !== "pageCurrent")] });
  return [
    sub("pageTop", L3("Top of Page", "In\xEDcio da P\xE1gina"), "vertical_align_top"),
    sub("pageBottom", L3("Bottom of Page", "Fim da P\xE1gina"), "vertical_align_bottom"),
    sub("pageMargin", L3("Page Margins", "Margens da P\xE1gina"), "border_right"),
    sub("pageCurrent", L3("Current Position", "Posi\xE7\xE3o Atual"), "text_select_end"),
    "-",
    "dlg:pageNumberFormat",
    "hf:removePageNumbers"
  ];
}
var docInfoMenu = () => ["docinfo:author", "docinfo:title", "docinfo:fileName", "docinfo:filePath"];
function distanceWidget(env, which) {
  return {
    widget: (ctx) => {
      const lang = ctx.lang;
      const u3 = lang === "pt" ? { tw: 1440 / 2.54, name: "cm" } : { tw: 1440, name: '"' };
      const wrap = document.createElement("label");
      wrap.className = "uo-g-inline";
      wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;white-space:nowrap";
      const title = which === "header" ? tr2(lang, "Header from Top", "Cabe\xE7alho a Partir da Parte Superior") : tr2(lang, "Footer from Bottom", "Rodap\xE9 a Partir da Parte Inferior");
      wrap.title = title;
      wrap.innerHTML = symbol(which === "header" ? "vertical_align_top" : "vertical_align_bottom");
      const input = document.createElement("input");
      input.className = "uo-num";
      input.dataset["a"] = `hf:dist:${which}`;
      input.inputMode = "decimal";
      input.style.width = "64px";
      input.setAttribute("aria-label", title);
      const fmt = (tw) => `${(Math.round(tw / u3.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 })} ${u3.name}`;
      const apply = () => {
        const n5 = parseFloat(input.value.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
        if (Number.isFinite(n5) && n5 >= 0) env.ed.setHeaderFooterDistance({ [which]: Math.round(n5 * u3.tw) });
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
      wrap.append(input);
      return {
        el: wrap,
        sync: () => {
          const o6 = env.ed.getHeaderFooterOptions();
          if (o6 && env.root.activeElement !== input) input.value = fmt(which === "header" ? o6.headerDistance : o6.footerDistance);
          input.disabled = env.app.comparing || env.ed.isProtected();
        }
      };
    }
  };
}
function hfToolsGroups(env, ctx) {
  const large4 = (cmd) => ({ cmd, size: "large" });
  return [
    { id: "hf-hf", label: L3("Header & Footer", "Cabe\xE7alho e Rodap\xE9"), icon: "call_to_action", prio: 6, cells: [
      { menu: () => hfGalleryMenu(env, ctx, "header"), id: "hf:headerMenu", label: L3("Header", "Cabe\xE7alho"), icon: "vertical_align_top", size: "large" },
      { menu: () => hfGalleryMenu(env, ctx, "footer"), id: "hf:footerMenu", label: L3("Footer", "Rodap\xE9"), icon: "vertical_align_bottom", size: "large" },
      { menu: () => pageNumberMenu(env, ctx), id: "hf:pgnumMenu", label: L3("Page Number", "N\xFAmero de P\xE1gina"), icon: "numbers", size: "large" }
    ] },
    { id: "hf-insert", label: L3("Insert", "Inserir"), icon: "calendar_today", prio: 5, cells: [
      large4("dlg:dateTime"),
      { menu: docInfoMenu, id: "hf:docinfo", label: L3("Document Info", "Informa\xE7\xF5es do Documento"), icon: "info", size: "large" },
      large4("image")
    ] },
    { id: "hf-nav", label: L3("Navigation", "Navega\xE7\xE3o"), icon: "swap_vert", prio: 4, cells: [
      large4("hf:gotoHeader"),
      large4("hf:gotoFooter"),
      { rows: [[{ cmd: "hf:prev", label: true }], [{ cmd: "hf:next", label: true }], [{ cmd: "hf:link", label: true }]] }
    ] },
    { id: "hf-options", label: L3("Options", "Op\xE7\xF5es"), icon: "tune", prio: 4, cells: [
      { rows: [[{ cmd: "hf:firstPage", label: true }], [{ cmd: "hf:oddEven", label: true }], [{ cmd: "hf:showText", label: true }]] }
    ] },
    { id: "hf-position", label: L3("Position", "Posi\xE7\xE3o"), icon: "height", prio: 3, cells: [
      { rows: [[distanceWidget(env, "header")], [distanceWidget(env, "footer")], [{ cmd: "dlg:alignTab", label: true }]] }
    ] },
    { id: "hf-close", label: L3("Close", "Fechar"), icon: "close", prio: 9, cells: [large4("hf:close")] }
  ];
}
var el2 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var select = (name, opts, value) => {
  const s4 = el2("select", { name });
  for (const [v2, t5] of opts) s4.append(el2("option", { value: v2, textContent: t5 }));
  s4.value = value;
  return s4;
};
var radio = (name, value, label, on) => el2("label", { className: "uo-check" }, el2("input", { type: "radio", name, value, checked: on }), label);
var check = (name, label, on) => el2("label", { className: "uo-check" }, el2("input", { type: "checkbox", name, checked: on }), label);
async function pageNumberFormatDialog(env) {
  const lang = env.lang, ed = env.ed;
  const f3 = ed.getPageNumberFormat();
  if (!f3) return;
  const fmt = select("fmt", [
    ["decimal", "1, 2, 3, \u2026"],
    ["numberInDash", "- 1 -, - 2 -, - 3 -, \u2026"],
    ["lowerLetter", "a, b, c, \u2026"],
    ["upperLetter", "A, B, C, \u2026"],
    ["lowerRoman", "i, ii, iii, \u2026"],
    ["upperRoman", "I, II, III, \u2026"]
  ], f3.format);
  const chap = check("chap", tr2(lang, "Include chapter number", "Incluir n\xFAmero do cap\xEDtulo"), !!f3.chapter);
  const level = select("level", Array.from({ length: 9 }, (_2, i5) => [String(i5 + 1), tr2(lang, `Heading ${i5 + 1}`, `T\xEDtulo ${i5 + 1}`)]), String(f3.chapter?.level ?? 1));
  const sep = select("sep", [
    ["hyphen", tr2(lang, "- (hyphen)", "- (h\xEDfen)")],
    ["period", tr2(lang, ". (period)", ". (ponto)")],
    ["colon", tr2(lang, ": (colon)", ": (dois-pontos)")],
    ["emDash", tr2(lang, "\u2014 (em dash)", "\u2014 (travess\xE3o)")],
    ["enDash", tr2(lang, "\u2013 (en dash)", "\u2013 (tra\xE7o)")]
  ], f3.chapter?.separator ?? "hyphen");
  const cont = radio("num", "continue", tr2(lang, "Continue from previous section", "Continuar da se\xE7\xE3o anterior"), f3.start === null);
  const startR = radio("num", "start", tr2(lang, "Start at:", "Iniciar em:"), f3.start !== null);
  const start = el2("input", { type: "number", name: "start", min: "0", step: "1", value: String(f3.start ?? 1), style: "width:72px" });
  const chapIn = chap.querySelector("input");
  const sync = () => {
    level.disabled = sep.disabled = !chapIn.checked;
    start.disabled = !startR.querySelector("input").checked;
  };
  for (const x2 of [chapIn, cont.querySelector("input"), startR.querySelector("input")]) x2.addEventListener("change", sync);
  start.addEventListener("focus", () => {
    startR.querySelector("input").checked = true;
    sync();
  });
  sync();
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el2("div", { className: "uo-dialog-grid" }, el2("span", {}, tr2(lang, "Number format", "Formato do n\xFAmero")), fmt),
    chap,
    el2(
      "div",
      { className: "uo-dialog-grid", style: "padding-left:24px" },
      el2("span", {}, tr2(lang, "Chapter starts with style", "O cap\xEDtulo come\xE7a com o estilo")),
      level,
      el2("span", {}, tr2(lang, "Use separator", "Usar separador")),
      sep
    ),
    el2("strong", {}, tr2(lang, "Page numbering", "Numera\xE7\xE3o de p\xE1gina")),
    cont,
    el2("div", { style: "display:flex;gap:8px;align-items:center" }, startR, start)
  );
  const h3 = openDialog({
    title: tr2(lang, "Page Number Format", "Formatar N\xFAmeros de P\xE1gina"),
    icon: "format_list_numbered",
    body,
    layer: env.layer,
    lang,
    width: 440,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const n5 = Math.max(0, Math.round(Number(start.value) || 0));
  ed.setPageNumberFormat({
    format: fmt.value,
    chapter: chapIn.checked ? { level: Number(level.value), separator: sep.value } : null,
    start: startR.querySelector("input").checked ? n5 : null
  });
}
async function dateTimeDialog(env) {
  const lang = env.lang, ed = env.ed;
  let dl = lang;
  const list = el2("select", { name: "formats", size: 12, style: "width:100%;min-height:240px" });
  const fill = () => {
    list.replaceChildren(...ed.dateTimeFormats(dl).map((f3) => el2("option", { value: f3.pattern, textContent: f3.sample })));
    list.selectedIndex = 0;
  };
  fill();
  const language = select("lang", [["pt", "Portugu\xEAs (Brasil)"], ["en", tr2(lang, "English (United States)", "Ingl\xEAs (Estados Unidos)")]], dl);
  language.addEventListener("change", () => {
    dl = language.value;
    fill();
  });
  const update = check("update", tr2(lang, "Update automatically", "Atualizar automaticamente"), false);
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el2("span", {}, tr2(lang, "Available formats:", "Formatos dispon\xEDveis:")),
    list,
    el2("div", { className: "uo-dialog-grid" }, el2("span", {}, tr2(lang, "Language", "Idioma")), language),
    update
  );
  list.addEventListener("dblclick", () => h3.close("ok"));
  const h3 = openDialog({
    title: tr2(lang, "Date and Time", "Data e Hora"),
    icon: "calendar_today",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok" || !list.value) return;
  ed.insertDateTime(list.value, update.querySelector("input").checked, dl);
}
async function alignTabDialog(env) {
  const lang = env.lang;
  const al = el2(
    "div",
    { style: "display:flex;gap:12px" },
    radio("al", "left", tr2(lang, "Left", "Esquerda"), true),
    radio("al", "center", tr2(lang, "Center", "Centro"), false),
    radio("al", "right", tr2(lang, "Right", "Direita"), false)
  );
  const rel = el2(
    "div",
    { style: "display:flex;gap:12px" },
    radio("rel", "margin", tr2(lang, "Margin", "Margem"), true),
    radio("rel", "indent", tr2(lang, "Indent", "Recuo"), false)
  );
  const leader = select("leader", [["none", tr2(lang, "(none)", "(nenhum)")], ["dot", "......."], ["hyphen", "-------"], ["underscore", "_______"], ["middleDot", "\xB7\xB7\xB7\xB7\xB7\xB7\xB7"]], "none");
  const body = el2(
    "div",
    { className: "uo-dialog-grid" },
    el2("span", {}, tr2(lang, "Alignment", "Alinhamento")),
    al,
    el2("span", {}, tr2(lang, "Align relative to", "Alinhar em rela\xE7\xE3o a")),
    rel,
    el2("span", {}, tr2(lang, "Leader", "Preenchimento")),
    leader
  );
  const h3 = openDialog({
    title: tr2(lang, "Alignment Tab", "Tabula\xE7\xE3o de Alinhamento"),
    icon: "keyboard_tab",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const v2 = (n5) => body.querySelector(`input[name="${n5}"]:checked`)?.value ?? "";
  env.ed.insertAlignmentTab(v2("al"), v2("rel"), leader.value);
}
async function hfOptionsDialog(env) {
  const lang = env.lang, ed = env.ed;
  const o6 = ed.getHeaderFooterOptions();
  if (!o6) return;
  const u3 = lang === "pt" ? { tw: 1440 / 2.54, name: "cm" } : { tw: 1440, name: '"' };
  const fmt = (tw) => (Math.round(tw / u3.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 });
  const parse = (v2) => {
    const n5 = parseFloat(v2.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
    return Number.isFinite(n5) ? Math.round(n5 * u3.tw) : NaN;
  };
  const first = check("first", tr2(lang, "Different first page", "Primeira p\xE1gina diferente"), o6.differentFirstPage);
  const oddEven = check("oddEven", tr2(lang, "Different odd & even pages", "P\xE1ginas pares e \xEDmpares diferentes"), o6.differentOddEven);
  const hd = el2("input", { type: "text", name: "hd", value: fmt(o6.headerDistance), inputMode: "decimal", style: "width:80px" });
  const fd = el2("input", { type: "text", name: "fd", value: fmt(o6.footerDistance), inputMode: "decimal", style: "width:80px" });
  const unit = (i5) => el2("span", { style: "display:flex;gap:4px;align-items:center" }, i5, u3.name);
  const body = el2(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el2("strong", {}, o6.sectionCount > 1 ? tr2(lang, `Section ${o6.section + 1}`, `Se\xE7\xE3o ${o6.section + 1}`) : tr2(lang, "Document", "Documento")),
    first,
    oddEven,
    el2(
      "div",
      { className: "uo-dialog-grid" },
      el2("span", {}, tr2(lang, "Header from top", "Cabe\xE7alho a partir do topo")),
      unit(hd),
      el2("span", {}, tr2(lang, "Footer from bottom", "Rodap\xE9 a partir da base")),
      unit(fd)
    )
  );
  const h3 = openDialog({
    title: tr2(lang, "Header & footer options", "Op\xE7\xF5es de cabe\xE7alho e rodap\xE9"),
    icon: "tune",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: env.app.ui.L.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  const fi = first.querySelector("input").checked, oe = oddEven.querySelector("input").checked;
  if (fi !== o6.differentFirstPage) ed.setDifferentFirstPage(fi);
  if (oe !== o6.differentOddEven) ed.setDifferentOddEven(oe);
  const h22 = parse(hd.value), f22 = parse(fd.value);
  const d3 = {};
  if (Number.isFinite(h22) && h22 >= 0 && h22 !== o6.headerDistance) d3.header = h22;
  if (Number.isFinite(f22) && f22 >= 0 && f22 !== o6.footerDistance) d3.footer = f22;
  if (d3.header !== void 0 || d3.footer !== void 0) ed.setHeaderFooterDistance(d3);
}

// src/chrome-picture-adjust.ts
var L4 = (en, pt) => ({ en, pt });
var pctText = (v2) => `${v2 > 0 ? "+" : ""}${Math.round(v2 * 100)}%`;
function registerPictureAdjustCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const on = () => !app.comparing && !ed.isProtected() && typeof api["selectedImage"] === "function" && !!ed.selectedImage();
  const p3 = (c4) => ({ ...c4, isEnabled: on });
  reg.add(
    p3({ id: "pic:compress", label: L4("Compress Pictures", "Compactar Imagens"), icon: "compress", supports: has("compressImages"), run: () => ctl.pictureDialog("compress") }),
    p3({ id: "pic:change:file", label: L4("From a File\u2026", "De um Arquivo..."), icon: "upload_file", supports: has("changeImageFromFile"), run: () => ed.changeImageFromFile() }),
    p3({ id: "pic:change:clip", label: L4("From Clipboard", "Da \xC1rea de Transfer\xEAncia"), icon: "content_paste", supports: has("changeImageFromClipboard"), run: () => ed.changeImageFromClipboard() }),
    p3({ id: "pic:reset", label: L4("Reset Picture", "Redefinir Imagem"), icon: "restart_alt", supports: has("resetImage"), run: () => ed.resetImage(false) }),
    p3({ id: "pic:resetSize", label: L4("Reset Picture & Size", "Redefinir Imagem e Tamanho"), icon: "restart_alt", supports: has("resetImage"), run: () => ed.resetImage(true) }),
    p3({ id: "pic:transparentColor", label: L4("Set Transparent Color", "Definir Cor Transparente"), icon: "colorize", supports: has("startTransparentColorPick"), run: () => ed.startTransparentColorPick() })
  );
}
function docTheme(env) {
  return { major: { scripts: {} }, minor: { scripts: {} }, colors: env.ed.documentThemeColors() };
}
function previewTile(env, tile, fn) {
  const p3 = env.ed.selectedImagePreview(64, 52);
  const c4 = document.createElement("canvas");
  c4.style.cssText = "max-width:64px;max-height:52px;display:block;margin:auto";
  if (p3) {
    c4.width = p3.width;
    c4.height = p3.height;
    const d3 = new Uint8ClampedArray(p3.data);
    if (fn) fn(d3, p3.width, p3.height);
    c4.getContext("2d").putImageData(new ImageData(d3, p3.width, p3.height), 0, 0);
    let clear = false;
    for (let i5 = 3; i5 < d3.length && !clear; i5 += 4) clear = d3[i5] < 250;
    if (clear) c4.style.background = "repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px";
  }
  tile.replaceChildren(c4);
}
function grid(env, ctx, sections, fx, pick, selected, cols) {
  return (close) => tileGrid({
    sections,
    tile: { w: 72, h: 60 },
    cols,
    text: (l3) => ctx.registry.text(l3),
    close,
    ...selected ? { selected } : {},
    render: (tile, it) => previewTile(env, tile, fx(it.id)),
    onPick: (id) => {
      pick(id);
      ctx.after();
    }
  });
}
function correctionsMenu(env, ctx) {
  const ed = env.ed;
  const a3 = ed.selectedImage()?.format.blip.a14;
  const sel4 = a3?.sharpen ? `sh:${a3.sharpen / 1e5}` : `bc:${(a3?.bright ?? 0) / 1e5}:${(a3?.contrast ?? 0) / 1e5}`;
  const sharpLabel = (v2) => v2 === 0 ? L4("Sharpen: 0%", "Nitidez: 0%") : v2 < 0 ? L4(`Soften: ${-v2 / 1e3}%`, `Suavizar: ${-v2 / 1e3}%`) : L4(`Sharpen: ${v2 / 1e3}%`, `Nitidez: ${v2 / 1e3}%`);
  return [{
    content: grid(env, ctx, [
      { label: L4("Sharpen/Soften", "Nitidez/Suavizar"), items: SHARPEN_PRESETS.map((v2) => ({ id: `sh:${v2 / 1e5}`, label: sharpLabel(v2) })) },
      {
        label: L4("Brightness/Contrast", "Brilho/Contraste"),
        items: BRIGHT_CONTRAST_STEPS.flatMap((c4) => BRIGHT_CONTRAST_STEPS.map((b3) => ({
          id: `bc:${b3 / 1e5}:${c4 / 1e5}`,
          label: L4(`Brightness: ${pctText(b3 / 1e5)} Contrast: ${pctText(c4 / 1e5)}`, `Brilho: ${pctText(b3 / 1e5)} Contraste: ${pctText(c4 / 1e5)}`)
        })))
      }
    ], (id) => {
      const [k2, x2, y3] = id.split(":");
      if (k2 === "sh") return (d3, w2, h3) => adjustSharpen(d3, w2, h3, Number(x2));
      return (d3) => adjustBrightnessContrast(d3, Number(x2), Number(y3));
    }, (id) => {
      const [k2, x2, y3] = id.split(":");
      void (k2 === "sh" ? ed.setImageAdjust({ sharpen: Number(x2) }) : ed.setImageAdjust({ bright: Number(x2), contrast: Number(y3) })).then(() => ctx.after());
    }, sel4, 5)
  }, "-", { id: "pic:corrections:options", label: L4("Picture Corrections Options\u2026", "Op\xE7\xF5es de Corre\xE7\xF5es de Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }];
}
function colorMenu(env, ctx) {
  const ed = env.ed;
  const theme = docTheme(env);
  const a3 = ed.selectedImage()?.format.blip.a14;
  const blip = ed.selectedImage()?.format.blip;
  const recolorNow = RECOLOR_PRESETS.find((p3) => p3.id !== "none" && JSON.stringify(p3.fx) === JSON.stringify({ ...blip?.grayscl ? { grayscl: true } : {}, ...blip?.duotone ? { duotone: blip.duotone } : {}, ...blip?.lum ? { lum: blip.lum } : {}, ...blip?.biLevel !== void 0 ? { biLevel: blip.biLevel } : {} }));
  const sel4 = a3?.saturation !== void 0 ? `sat:${a3.saturation}` : a3?.colorTemp !== void 0 ? `temp:${a3.colorTemp}` : recolorNow ? `re:${recolorNow.id}` : "sat:100000";
  return [
    {
      content: grid(env, ctx, [
        { label: L4("Color Saturation", "Satura\xE7\xE3o da Cor"), items: SATURATION_PRESETS.map((v2) => ({ id: `sat:${v2}`, label: L4(`Saturation: ${v2 / 1e3}%`, `Satura\xE7\xE3o: ${v2 / 1e3}%`) })) },
        { label: L4("Color Tone", "Tom da Cor"), items: TEMPERATURE_PRESETS.map((v2) => ({ id: `temp:${v2}`, label: L4(`Temperature: ${v2} K`, `Temperatura: ${v2} K`) })) },
        { label: L4("Recolor", "Recolorir"), items: RECOLOR_PRESETS.map((p3) => ({ id: `re:${p3.id}`, label: p3.label })) }
      ], (id) => {
        const [k2, v2] = id.split(":");
        if (k2 === "sat") return (d3) => adjustSaturation(d3, Number(v2) / 1e5);
        if (k2 === "temp") return (d3) => adjustTemperature(d3, Number(v2));
        const fx = RECOLOR_PRESETS.find((x2) => x2.id === v2)?.fx;
        return fx ? (d3) => applyBlipFx(d3, fx, theme) : null;
      }, (id) => {
        const [k2, v2] = id.split(":");
        if (k2 === "sat") void ed.setImageAdjust({ saturation: Number(v2) / 1e5 }).then(() => ctx.after());
        else if (k2 === "temp") void ed.setImageAdjust({ temperature: Number(v2) }).then(() => ctx.after());
        else ed.setImageRecolor(v2);
      }, sel4, 7)
    },
    "-",
    {
      id: "pic:color:more",
      label: L4("More Variations", "Mais Varia\xE7\xF5es"),
      icon: "palette",
      submenu: () => [{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme.colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            ed.setImageRecolor(dmlFromPick(v2, theme.colors));
            ctx.after();
          }
        })
      }]
    },
    "pic:transparentColor",
    { id: "pic:color:options", label: L4("Picture Color Options\u2026", "Op\xE7\xF5es de Cor da Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }
  ];
}
function transparencyMenu(env, ctx) {
  const ed = env.ed;
  const theme = docTheme(env);
  const sel4 = `t:${Math.round(100 - (ed.selectedImage()?.format.blip.alphaModFix ?? 1e5) / 1e3)}`;
  return [{
    content: grid(env, ctx, [
      { items: TRANSPARENCY_PRESETS.map((v2) => ({ id: `t:${v2}`, label: L4(`Transparency: ${v2}%`, `Transpar\xEAncia: ${v2}%`) })) }
    ], (id) => (d3) => applyBlipFx(d3, { alphaModFix: (100 - Number(id.slice(2))) * 1e3 }, theme), (id) => ed.setImageTransparency(Number(id.slice(2))), sel4, 7)
  }, "-", { id: "pic:transparency:options", label: L4("Picture Transparency Options\u2026", "Op\xE7\xF5es de Transpar\xEAncia da Imagem..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:picture") }];
}
function adjustCells(env, ctx) {
  const api = env.ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const editable = () => !env.ed.isProtected();
  return [
    { menu: () => correctionsMenu(env, ctx), id: "pic:corrections", label: L4("Corrections", "Corre\xE7\xF5es"), icon: "tune", size: "large", supports: has("setImageAdjust"), isEnabled: editable },
    { menu: () => colorMenu(env, ctx), id: "pic:color", label: L4("Color", "Cor"), icon: "palette", size: "large", supports: has("setImageRecolor"), isEnabled: editable },
    { menu: () => transparencyMenu(env, ctx), id: "pic:transparency", label: L4("Transparency", "Transpar\xEAncia"), icon: "opacity", size: "large", supports: has("setImageTransparency"), isEnabled: editable },
    { rows: [
      [{ cmd: "pic:compress", label: true }],
      [{ menu: ["pic:change:file", "pic:change:clip"], id: "pic:change", label: L4("Change Picture", "Alterar Imagem"), icon: "swap_horiz", showLabel: true, supports: has("changeImage"), isEnabled: editable }],
      [{ split: "pic:reset", menu: ["pic:reset", "pic:resetSize"], label: true }]
    ] }
  ];
}

// src/chrome-picture.ts
var L5 = (en, pt) => ({ en, pt });
var WRAPS = [
  ["inline", "In Line with Text", "Alinhado ao Texto", "format_align_left"],
  ["square", "Square", "Quadrado", "wrap_text"],
  ["tight", "Tight", "Comprimido", "wrap_text"],
  ["through", "Through", "Atrav\xE9s", "wrap_text"],
  ["topAndBottom", "Top and Bottom", "Superior e Inferior", "vertical_align_center"],
  ["behind", "Behind Text", "Atr\xE1s do Texto", "flip_to_back"],
  ["front", "In Front of Text", "Na Frente do Texto", "flip_to_front"]
];
function positionIcon(v2, h3) {
  const x2 = h3 === "left" ? 240 : h3 === "center" ? 400 : 560, y3 = v2 === "top" ? -760 : v2 === "center" ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x2} ${y3}h160v120H${x2}z"/>`;
}
function registerPictureCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const pic = () => typeof api["selectedImage"] === "function" ? ed.selectedImage() : null;
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const on = () => canEdit3() && !!pic();
  const floating = () => on() && !pic().inline;
  const p3 = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => on() && c4.isEnabled() : on });
  const cmds = [
    // ── Organizar: Quebra de Texto Automática ──
    ...WRAPS.map(([k2, en, pt, icon]) => p3({
      id: `pic:wrap:${k2}`,
      label: L5(en, pt),
      icon,
      supports: has("setImageWrap"),
      run: () => ed.setImageWrap(k2),
      isChecked: () => pic()?.wrap === k2
    })),
    p3({
      id: "pic:wrap:editPoints",
      label: L5("Edit Wrap Points", "Editar pontos da disposi\xE7\xE3o do texto"),
      icon: "polyline",
      supports: has("startEditWrapPoints"),
      isEnabled: floating,
      isChecked: () => typeof api["editingWrapPoints"] === "function" && ed.editingWrapPoints(),
      run: () => ed.editingWrapPoints() ? ed.endEditWrapPoints() : ed.startEditWrapPoints()
    }),
    p3({
      id: "pic:wrap:moveWithText",
      label: L5("Move with Text", "Mover com o Texto"),
      supports: has("setImageMoveWithText"),
      isEnabled: floating,
      run: () => ed.setImageMoveWithText(true),
      isChecked: () => !!pic()?.moveWithText
    }),
    p3({
      id: "pic:wrap:fixOnPage",
      label: L5("Fix Position on Page", "Corrigir Posi\xE7\xE3o na P\xE1gina"),
      supports: has("setImageMoveWithText"),
      isEnabled: floating,
      run: () => ed.setImageMoveWithText(false),
      isChecked: () => !!pic() && !pic().inline && !pic().moveWithText
    }),
    p3({ id: "pic:wrap:more", label: L5("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:wrap") }),
    // ── Organizar: Posição ──
    p3({
      id: "pic:pos:inline",
      label: L5("In Line with Text", "Alinhado ao Texto"),
      icon: "format_align_left",
      supports: has("setImagePosition"),
      run: () => ed.setImagePosition("inline"),
      isChecked: () => !!pic()?.inline
    }),
    ...POSITION_PRESETS.map((q) => p3({
      id: `pic:pos:${q.id}`,
      label: q.label,
      icon: positionIcon(q.v, q.h),
      supports: has("setImagePosition"),
      run: () => ed.setImagePosition(q.id),
      isChecked: () => {
        const f3 = pic()?.format;
        const map = { top: "top", center: "center", bottom: "bottom" };
        return !!f3 && f3.wrap === "square" && f3.posH?.relativeFrom === "margin" && f3.posH.align === q.h && f3.posV?.relativeFrom === "margin" && f3.posV.align === map[q.v];
      }
    })),
    p3({ id: "pic:pos:more", label: L5("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:position") }),
    // ── Organizar: Avançar / Recuar ──
    p3({ id: "pic:forward", label: L5("Bring Forward", "Avan\xE7ar"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("forward") }),
    p3({ id: "pic:front", label: L5("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("front") }),
    p3({ id: "pic:frontOfText", label: L5("Bring in Front of Text", "Trazer para a Frente do Texto"), icon: "flip_to_front", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("frontOfText") }),
    p3({ id: "pic:backward", label: L5("Send Backward", "Recuar"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("backward") }),
    p3({ id: "pic:back", label: L5("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("back") }),
    p3({ id: "pic:behindText", label: L5("Send Behind Text", "Enviar para Tr\xE1s do Texto"), icon: "flip_to_back", supports: has("arrangeImage"), isEnabled: floating, run: () => ed.arrangeImage("behindText") }),
    // ── Organizar: Girar ──
    p3({ id: "pic:rotate:right", label: L5("Rotate Right 90\xB0", "Girar 90\xB0 para a Direita"), icon: "rotate_right", supports: has("rotateImage"), run: () => ed.rotateImage(90) }),
    p3({ id: "pic:rotate:left", label: L5("Rotate Left 90\xB0", "Girar 90\xB0 para a Esquerda"), icon: "rotate_left", supports: has("rotateImage"), run: () => ed.rotateImage(-90) }),
    p3({ id: "pic:flip:v", label: L5("Flip Vertical", "Inverter Verticalmente"), icon: "flip", supports: has("flipImage"), run: () => ed.flipImage("v") }),
    p3({ id: "pic:flip:h", label: L5("Flip Horizontal", "Inverter Horizontalmente"), icon: "flip", supports: has("flipImage"), run: () => ed.flipImage("h") }),
    p3({ id: "pic:rotate:more", label: L5("More Rotation Options\u2026", "Mais Op\xE7\xF5es de Rota\xE7\xE3o..."), icon: "tune", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Tamanho: Cortar ──
    p3({
      id: "pic:crop:mode",
      label: L5("Crop", "Cortar"),
      tip: L5("Crop: drag the black handles to remove unwanted areas", "Cortar: arraste as al\xE7as pretas para remover as \xE1reas indesejadas"),
      icon: "crop",
      supports: has("startImageCrop"),
      isChecked: () => typeof api["croppingImage"] === "function" && ed.croppingImage(),
      run: () => ed.croppingImage() ? ed.endImageCrop() : ed.startImageCrop()
    }),
    p3({ id: "pic:crop:fill", label: L5("Fill", "Preencher"), icon: "fit_screen", supports: has("cropImageFillFit"), run: () => ed.cropImageFillFit("fill") }),
    p3({ id: "pic:crop:fit", label: L5("Fit", "Ajustar"), icon: "crop_free", supports: has("cropImageFillFit"), run: () => ed.cropImageFillFit("fit") }),
    ...ASPECT_RATIOS.map((r5) => p3({ id: `pic:crop:ratio:${r5.id}`, label: r5.id, supports: has("cropImageToAspect"), run: () => ed.cropImageToAspect(r5.w, r5.h) })),
    p3({ id: "pic:layout", label: L5("Layout Options\u2026", "Layout..."), icon: "aspect_ratio", supports: has("setImageLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Organizar: Painel de Seleção e Alinhar ──
    { id: "pic:selectionPane", label: L5("Selection Pane", "Painel de Sele\xE7\xE3o"), icon: "select", supports: has("selectionPaneItems"), isEnabled: () => !app.comparing, isChecked: () => ctl.pictureDialogOpen("selection"), run: () => ctl.pictureDialog("selection") },
    ...ALIGNS.map(([k2, en, pt, icon]) => p3({ id: `pic:align:${k2}`, label: L5(en, pt), icon, supports: has("alignImage"), isEnabled: floating, run: () => ed.alignImage(k2) })),
    ...["page", "margin"].map((k2) => ({
      id: `pic:align:to:${k2}`,
      label: k2 === "page" ? L5("Align to Page", "Alinhar \xE0 P\xE1gina") : L5("Align to Margin", "Alinhar \xE0 Margem"),
      supports: has("alignImage"),
      isChecked: () => ed.imageAlignTo === k2,
      run: () => {
        ed.imageAlignTo = k2;
      }
    })),
    // ── Formatar Imagem (painel) ──
    { id: "pic:format", label: L5("Format Picture\u2026", "Formatar Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:line") },
    ...["line", "effects", "layout", "picture"].map((t5) => ({ id: `pic:format:${t5}`, label: L5("Format Picture\u2026", "Formatar Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog(`format:${t5}`) })),
    { id: "pic:fx:options", label: L5("Effect Options\u2026", "Op\xE7\xF5es de Efeitos..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:effects") },
    { id: "pic:adjust:options", label: L5("Picture Options\u2026", "Op\xE7\xF5es de Imagem..."), icon: "tune", supports: has("setImageFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:picture") },
    // ── Acessibilidade ──
    p3({ id: "pic:alt", label: L5("Alt Text", "Texto Alt"), tip: L5("Alt Text: describe the picture for people who use screen readers", "Texto Alt: descreva a imagem para quem usa leitor de tela"), icon: "accessibility_new", supports: has("setImageAltText"), run: () => ctl.pictureDialog("alt") })
  ];
  reg.add(...cmds);
}
var ALIGNS = [
  ["left", "Align Left", "Alinhar \xE0 Esquerda", "align_horizontal_left"],
  ["center", "Align Center", "Centralizar", "align_horizontal_center"],
  ["right", "Align Right", "Alinhar \xE0 Direita", "align_horizontal_right"],
  ["top", "Align Top", "Alinhar Acima", "align_vertical_top"],
  ["middle", "Align Middle", "Alinhar ao Meio", "align_vertical_center"],
  ["bottom", "Align Bottom", "Alinhar Parte Inferior", "align_vertical_bottom"]
];
var alignMenu = () => [...ALIGNS.slice(0, 3).map(([k2]) => `pic:align:${k2}`), "-", ...ALIGNS.slice(3).map(([k2]) => `pic:align:${k2}`), "-", "pic:align:to:page", "pic:align:to:margin"];
var wrapMenu = () => [
  ...WRAPS.map(([k2]) => `pic:wrap:${k2}`),
  "-",
  "pic:wrap:editPoints",
  "pic:wrap:moveWithText",
  "pic:wrap:fixOnPage",
  "-",
  "pic:wrap:more"
];
var positionMenu = () => [
  "pic:pos:inline",
  "-",
  ...POSITION_PRESETS.map((q) => `pic:pos:${q.id}`),
  "-",
  "pic:pos:more"
];
var rotateMenu = () => ["pic:rotate:right", "pic:rotate:left", "pic:flip:v", "pic:flip:h", "-", "pic:rotate:more"];
function shapeThumb(tile, prst) {
  const W = 26, H2 = 22, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c4 = document.createElement("canvas");
  c4.width = W * dpr;
  c4.height = H2 * dpr;
  c4.style.cssText = `width:${W}px;height:${H2}px;display:block;margin:auto`;
  const x2 = c4.getContext("2d");
  x2.scale(dpr, dpr);
  x2.translate(1.5, 1.5);
  const o6 = presetOutline(prst, W - 3, H2 - 3);
  o6.subs.forEach((sub, i5) => {
    const p3 = new Path2D();
    for (const g2 of sub) {
      if (g2.c === "M") p3.moveTo(g2.x, g2.y);
      else if (g2.c === "L") p3.lineTo(g2.x, g2.y);
      else if (g2.c === "C") p3.bezierCurveTo(g2.x1, g2.y1, g2.x2, g2.y2, g2.x, g2.y);
      else if (g2.c === "Q") p3.quadraticCurveTo(g2.x1, g2.y1, g2.x, g2.y);
      else if (g2.c === "E") p3.ellipse(g2.cx, g2.cy, Math.abs(g2.rx), Math.abs(g2.ry), 0, g2.a0, g2.a1, g2.ccw);
      else p3.closePath();
    }
    if (o6.fill[i5]) {
      x2.fillStyle = "rgba(68,114,196,.25)";
      x2.fill(p3);
    }
    if (o6.stroke[i5]) {
      x2.lineWidth = 1;
      x2.strokeStyle = getComputedStyle(tile).color || "#444";
      x2.stroke(p3);
    }
  });
  tile.replaceChildren(c4);
}
var cropMenu = (env, ctx) => () => [
  "pic:crop:mode",
  {
    id: "pic:crop:shape",
    label: L5("Crop to Shape", "Cortar para Forma"),
    icon: "shapes",
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g2) => ({ label: g2.label, items: g2.shapes.map(([prst, en, pt]) => ({ id: prst, label: L5(en, pt) })) })),
        tile: { w: 30, h: 26 },
        cols: 10,
        close,
        text: (l3) => ctx.registry.text(l3),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => {
          env.ed.cropImageToShape(id);
          ctx.after();
        }
      })
    }]
  },
  { id: "pic:crop:ratio", label: L5("Aspect Ratio", "Taxa de Propor\xE7\xE3o"), icon: "aspect_ratio", submenu: () => ASPECT_RATIOS.map((r5) => `pic:crop:ratio:${r5.id}`) },
  "-",
  "pic:crop:fill",
  "pic:crop:fit"
];
var measureWidget2 = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L5("Shape Height", "Altura da Forma") : L5("Shape Width", "Largura da Forma"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L5(".", ","));
    const cm = (pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const ptOf3 = (s4) => {
      const n5 = parseFloat(s4.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n5) ? n5 / 2.54 * 72 : void 0;
    };
    const cur = () => {
      const s4 = env.ed.selectedImage();
      return s4 ? which === "height" ? s4.heightPt : s4.widthPt : 0;
    };
    const set = (v2) => {
      env.ed.setImageSize(which === "height" ? { heightPt: Math.max(0.1, v2) } : { widthPt: Math.max(0.1, v2) });
      ctx.after();
    };
    const apply = () => {
      const v2 = ptOf3(input.value);
      if (v2 !== void 0) set(v2);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        apply();
      }
    });
    const step = (d3) => set(cur() + d3 * (72 / 25.4));
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b3, d3, s4] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b3.type = "button";
      b3.className = "uo-btn";
      b3.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b3.innerHTML = symbol(s4);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => step(d3));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof env.ed.selectedImage === "function",
      sync: () => {
        const s4 = env.ed.selectedImage();
        const off = !s4 || env.ed.isProtected();
        input.disabled = up.disabled = dn.disabled = off;
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s4 ? cm(which === "height" ? s4.heightPt : s4.widthPt) : "";
      }
    };
  }
});
var large = (cmd) => ({ cmd, size: "large" });
function pictureFormatGroups(env, ctx) {
  const has = (m2) => () => typeof env.ed[m2] === "function";
  return [
    { id: "pic-adjust", label: L5("Adjust", "Ajustar"), icon: "tune", prio: 4, cells: adjustCells(env, ctx) },
    { id: "pic-styles", label: L5("Picture Styles", "Estilos de Imagem"), icon: "photo_frame", prio: 5, launcher: "pic:format:effects", cells: [
      { rows: [
        [{ menu: () => borderMenu(env, ctx), id: "pic:border", label: L5("Picture Border", "Borda da Imagem"), icon: "border_color", showLabel: true, supports: has("setImageBorder") }],
        [{ menu: () => effectsMenu(env, ctx), id: "pic:effects", label: L5("Picture Effects", "Efeitos de Imagem"), icon: "auto_awesome", showLabel: true, supports: has("setImageEffect") }]
      ] }
    ] },
    { id: "pic-access", label: L5("Accessibility", "Acessibilidade"), icon: "accessibility_new", prio: 4, cells: [large("pic:alt")] },
    { id: "pic-arrange", label: L5("Arrange", "Organizar"), icon: "layers", prio: 6, cells: [
      { menu: positionMenu, id: "pic:position", label: L5("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", size: "large", supports: has("setImagePosition") },
      { menu: wrapMenu, id: "pic:wrap", label: L5("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", size: "large", supports: has("setImageWrap") },
      { rows: [
        [{ split: "pic:forward", menu: ["pic:forward", "pic:front", "pic:frontOfText"], label: true }],
        [{ split: "pic:backward", menu: ["pic:backward", "pic:back", "pic:behindText"], label: true }]
      ] },
      { rows: [
        [{ cmd: "pic:selectionPane", label: true }],
        [{ menu: alignMenu, id: "pic:align", label: L5("Align", "Alinhar"), icon: "align_horizontal_left", showLabel: true, supports: has("alignImage") }],
        [{ menu: rotateMenu, id: "pic:rotate", label: L5("Rotate", "Girar"), icon: "rotate_90_degrees_cw", showLabel: true, supports: has("rotateImage") }]
      ] }
    ] },
    { id: "pic-size", label: L5("Size", "Tamanho"), icon: "aspect_ratio", prio: 5, launcher: "pic:layout", cells: [
      { split: "pic:crop:mode", menu: cropMenu(env, ctx), size: "large" },
      { rows: [[measureWidget2(env, "height")], [measureWidget2(env, "width")]] }
    ] }
  ];
}
function adjustSubmenus(env, ctx) {
  return [
    { id: "pic:sub:corrections", label: L5("Corrections", "Corre\xE7\xF5es"), icon: "tune", submenu: () => correctionsMenu(env, ctx) },
    { id: "pic:sub:color", label: L5("Color", "Cor"), icon: "palette", submenu: () => colorMenu(env, ctx) },
    { id: "pic:sub:transparency", label: L5("Transparency", "Transpar\xEAncia"), icon: "opacity", submenu: () => transparencyMenu(env, ctx) },
    "-",
    "pic:compress",
    changeSubmenu,
    "pic:reset",
    "pic:resetSize"
  ];
}
var changeSubmenu = { id: "pic:sub:change", label: L5("Change Picture", "Alterar Imagem"), icon: "swap_horiz", submenu: ["pic:change:file", "pic:change:clip"] };
function styleSubmenus(env, ctx) {
  return [
    { id: "pic:sub:border", label: L5("Picture Border", "Borda da Imagem"), icon: "border_color", submenu: () => borderMenu(env, ctx) },
    { id: "pic:sub:effects", label: L5("Picture Effects", "Efeitos de Imagem"), icon: "auto_awesome", submenu: () => effectsMenu(env, ctx) }
  ];
}
function pictureCompactGroup(env, ctx) {
  const sel4 = () => typeof env.ed.selectedImage === "function" && !!env.ed.selectedImage();
  return {
    id: "picture",
    label: L5("Picture", "Imagem"),
    icon: "image",
    prio: 7,
    items: [
      { menu: wrapMenu, id: "pic:wrap", label: L5("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", supports: sel4 },
      { menu: positionMenu, id: "pic:position", label: L5("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", supports: sel4 },
      { menu: rotateMenu, id: "pic:rotate", label: L5("Rotate", "Girar"), icon: "rotate_90_degrees_cw", supports: sel4 },
      { menu: cropMenu(env, ctx), id: "pic:crop", label: L5("Crop", "Cortar"), icon: "crop", supports: sel4 },
      { menu: () => adjustSubmenus(env, ctx), id: "pic:adjust", label: L5("Adjust", "Ajustar"), icon: "tune", supports: sel4 },
      { menu: () => styleSubmenus(env, ctx), id: "pic:styles", label: L5("Picture Styles", "Estilos de Imagem"), icon: "photo_frame", supports: sel4 },
      { menu: () => ["pic:forward", "pic:front", "pic:frontOfText", "-", "pic:backward", "pic:back", "pic:behindText"], id: "pic:order", label: L5("Arrange", "Organizar"), icon: "layers", supports: sel4 },
      { cmd: "pic:alt" },
      { cmd: "pic:layout" }
    ]
  };
}
function pictureMenu(env, ctx) {
  return {
    id: "pic:menu",
    label: L5("Picture", "Imagem"),
    icon: "image",
    submenu: () => [
      { id: "pic:wrapSub", label: L5("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: wrapMenu },
      { id: "pic:posSub", label: L5("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", submenu: positionMenu },
      { id: "pic:rotSub", label: L5("Rotate", "Girar"), icon: "rotate_90_degrees_cw", submenu: rotateMenu },
      { id: "pic:cropSub", label: L5("Crop", "Cortar"), icon: "crop", submenu: cropMenu(env, ctx) },
      "-",
      ...adjustSubmenus(env, ctx),
      "-",
      ...styleSubmenus(env, ctx),
      "-",
      "pic:alt",
      "pic:layout",
      "-",
      "image:delete"
    ]
  };
}
function pictureContextItems() {
  return [
    "cut",
    "copy",
    "paste",
    "-",
    { id: "pic:ctx:front", label: L5("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", submenu: ["pic:front", "pic:forward", "pic:frontOfText"] },
    { id: "pic:ctx:back", label: L5("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", submenu: ["pic:back", "pic:backward", "pic:behindText"] },
    "-",
    changeSubmenu,
    "link",
    "caption",
    { id: "pic:ctx:wrap", label: L5("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: wrapMenu },
    "pic:alt",
    "pic:layout",
    "pic:format",
    "-",
    "image:delete"
  ];
}
function dmlFromPick(value, colors) {
  const p3 = parseThemePick(value, colors);
  if (!p3) return { kind: "srgbClr", val: value.toUpperCase() };
  const SCHEME = { background1: "bg1", text1: "tx1", background2: "bg2", text2: "tx2" };
  const val = SCHEME[p3.themeColor] ?? p3.themeColor;
  const snap = (x2) => Math.round(x2 * 20) / 20;
  const mods = [];
  if (p3.tint) {
    const k2 = snap(1 - parseInt(p3.tint, 16) / 255);
    mods.push(["lumMod", Math.round((1 - k2) * 1e5)], ["lumOff", Math.round(k2 * 1e5)]);
  }
  if (p3.shade) {
    const k2 = snap(1 - parseInt(p3.shade, 16) / 255);
    mods.push(["lumMod", Math.round((1 - k2) * 1e5)]);
  }
  return { kind: "schemeClr", val, ...mods.length ? { mods } : {} };
}
var SAMPLE = /* @__PURE__ */ new Map();
function sampleBitmap(hex) {
  let c4 = SAMPLE.get(hex);
  if (!c4) {
    c4 = document.createElement("canvas");
    c4.width = 32;
    c4.height = 24;
    const x2 = c4.getContext("2d");
    x2.fillStyle = `#${hex}`;
    x2.fillRect(0, 0, 32, 24);
    SAMPLE.set(hex, c4);
  }
  return c4;
}
var THUMB_IMG = { data: new Uint8Array(0), ext: "png", widthTwips: 0, heightTwips: 0 };
function effectThumb(tile, look, base) {
  const W = 56, H2 = 48;
  const c4 = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  c4.width = W * dpr;
  c4.height = H2 * dpr;
  c4.style.cssText = `width:${W}px;height:${H2}px;display:block;margin:auto`;
  const x2 = c4.getContext("2d");
  x2.fillStyle = "#ffffff";
  x2.fillRect(0, 0, c4.width, c4.height);
  x2.scale(dpr * 96 / 1440, dpr * 96 / 1440);
  const w2 = 30 * 20, h3 = 22 * 20;
  const it = { t: "image", x: (W * 15 - w2) / 2, y: (H2 * 15 - h3) / 2 - (look?.reflection ? 120 : 0), w: w2, h: h3, image: THUMB_IMG, ...look ? { pic: look } : {} };
  if (look) paintPicture(x2, it, sampleBitmap(base));
  else x2.drawImage(sampleBitmap(base), it.x, it.y, it.w, it.h);
  tile.replaceChildren(c4);
}
var accentOf = (env, n5 = 1) => (env.ed.documentThemeColors()[`accent${n5}`] ?? "4472C4").toUpperCase();
function borderMenu(env, ctx) {
  const ed = env.ed;
  const st = () => ed.selectedImage();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            ed.setImageBorder({ color: dmlFromPick(v2, colors) });
            ctx.after();
          }
        });
      }
    },
    { id: "pic:border:none", label: L5("No Outline", "Sem Contorno"), icon: "border_clear", checked: !st()?.format.line?.fill, onClick: () => {
      ed.setImageBorder({ color: null });
      ctx.after();
    } },
    {
      id: "pic:border:more",
      label: L5("More Outline Colors\u2026", "Mais Cores de Contorno..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setImageBorder({ color: { kind: "srgbClr", val: inp.value.slice(1).toUpperCase() } });
          ctx.after();
        });
        inp.click();
      }
    },
    "-",
    {
      id: "pic:border:weight",
      label: L5("Weight", "Espessura"),
      icon: "line_weight",
      submenu: () => LINE_WEIGHTS_PT.map((w2) => ({
        id: `pic:border:w:${w2}`,
        label: `${String(w2).replace(".", ctx.registry.text(L5(".", ",")))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st().format.line.w ?? 9525) / 12700 - w2) < 0.01,
        onClick: () => {
          ed.setImageBorder({ weightPt: w2 });
          ctx.after();
        }
      }))
    },
    {
      id: "pic:border:dash",
      label: L5("Dashes", "Tracejados"),
      icon: "line_style",
      submenu: () => LINE_DASHES.map((d3) => ({
        id: `pic:border:d:${d3.val}`,
        label: d3.label,
        checked: (st()?.format.line?.dash ?? "solid") === d3.val,
        onClick: () => {
          ed.setImageBorder({ dash: d3.val });
          ctx.after();
        }
      }))
    }
  ];
}
function effectsMenu(env, ctx, shape = false) {
  const ed = env.ed;
  const setFx = (kind, preset) => shape ? ed.setShapeEffect(kind, preset) : ed.setImageEffect(kind, preset);
  const t5 = (l3) => ctx.registry.text(l3);
  const base = accentOf(env);
  const fx = () => shape ? ed.selectedShape()?.format.effects : ed.selectedImage()?.format.effects;
  const grid2 = (sections, look, pick, selected, cols) => (close) => tileGrid({
    sections,
    tile: { w: 64, h: 56 },
    cols,
    text: t5,
    close,
    ...selected ? { selected } : {},
    render: (tile, it) => effectThumb(tile, look(it.id), base),
    onPick: (id) => {
      pick(id);
      ctx.after();
    }
  });
  const shadowLook = (id) => {
    const p3 = SHADOW_PRESETS.find((x2) => x2.id === id);
    if (!p3) return null;
    const s4 = p3.shadow, al = (s4.color.mods?.find((m2) => m2[0] === "alpha")?.[1] ?? 1e5) / 1e5;
    return {
      shadow: {
        kind: s4.kind === "inner" ? "inner" : "outer",
        color: "000000",
        alpha: al,
        blurPt: (s4.blurRad ?? 0) / 12700,
        distPt: (s4.dist ?? 0) / 12700,
        dirDeg: (s4.dir ?? 0) / 6e4,
        ...s4.sx !== void 0 ? { sx: s4.sx / 1e5 } : {},
        ...s4.sy !== void 0 ? { sy: s4.sy / 1e5 } : {},
        ...s4.kx ? { kxDeg: s4.kx / 6e4 } : {},
        ...s4.algn ? { algn: s4.algn } : {}
      }
    };
  };
  const none = (en, pt) => ({ id: "none", label: L5(en, pt) });
  const curShadow = () => {
    const s4 = fx()?.shadow;
    return s4 ? SHADOW_PRESETS.find((p3) => JSON.stringify(p3.shadow) === JSON.stringify(s4))?.id : "none";
  };
  const curRefl = () => {
    const r5 = fx()?.reflection;
    return r5 ? REFLECTION_PRESETS.find((p3) => JSON.stringify(p3.reflection) === JSON.stringify(r5))?.id : "none";
  };
  const items = [
    {
      id: "pic:fx:shadow",
      label: L5("Shadow", "Sombra"),
      icon: "filter_none",
      submenu: () => [{
        content: grid2([
          { label: L5("No Shadow", "Sem Sombra"), items: [none("No Shadow", "Sem Sombra")] },
          { label: L5("Outer", "Externa"), items: SHADOW_PRESETS.filter((p3) => p3.group === "outer").map((p3) => ({ id: p3.id, label: p3.label })) },
          { label: L5("Inner", "Interna"), items: SHADOW_PRESETS.filter((p3) => p3.group === "inner").map((p3) => ({ id: p3.id, label: p3.label })) },
          { label: L5("Perspective", "Perspectiva"), items: SHADOW_PRESETS.filter((p3) => p3.group === "persp").map((p3) => ({ id: p3.id, label: p3.label })) }
        ], shadowLook, (id) => setFx("shadow", id === "none" ? null : id), curShadow(), 3)
      }]
    },
    {
      id: "pic:fx:reflection",
      label: L5("Reflection", "Reflexo"),
      icon: "flip",
      submenu: () => [{
        content: grid2([
          { label: L5("No Reflection", "Sem Reflexo"), items: [none("No Reflection", "Sem Reflexo")] },
          { label: L5("Reflection Variations", "Varia\xE7\xF5es de Reflexo"), items: REFLECTION_PRESETS.map((p3) => ({ id: p3.id, label: p3.label })) }
        ], (id) => {
          const p3 = REFLECTION_PRESETS.find((x2) => x2.id === id);
          if (!p3) return null;
          const r5 = p3.reflection;
          return { reflection: { blurPt: (r5.blurRad ?? 0) / 12700, stA: (r5.stA ?? 1e5) / 1e5, stPos: 0, endA: (r5.endA ?? 0) / 1e5, endPos: (r5.endPos ?? 1e5) / 1e5, distPt: (r5.dist ?? 0) / 12700, dirDeg: 90, sy: -1 } };
        }, (id) => setFx("reflection", id === "none" ? null : id), curRefl(), 3)
      }]
    },
    {
      id: "pic:fx:glow",
      label: L5("Glow", "Brilho"),
      icon: "light",
      submenu: () => [{
        content: grid2([
          { label: L5("No Glow", "Sem Brilho"), items: [none("No Glow", "Sem Brilho")] },
          {
            label: L5("Glow Variations", "Varia\xE7\xF5es de Brilho"),
            items: GLOW_SIZES.flatMap((rad, si) => [1, 2, 3, 4, 5, 6].map((a3) => ({
              id: `glow-${si}-${a3}`,
              label: L5(`Glow: ${rad / 12700} point; Accent color ${a3}`, `Brilho: ${String(rad / 12700).replace(".", ",")} pt; Cor de \xEAnfase ${a3}`)
            })))
          }
        ], (id) => {
          const m2 = /^glow-(\d+)-(\d)$/.exec(id);
          return m2 ? { glow: { color: accentOf(env, Number(m2[2])), alpha: 0.4, radPt: GLOW_SIZES[Number(m2[1])] / 12700 / 1.6 } } : null;
        }, (id) => setFx("glow", id === "none" ? null : id), void 0, 6)
      }]
    },
    {
      id: "pic:fx:soft",
      label: L5("Soft Edges", "Bordas Suaves"),
      icon: "crop_free",
      submenu: () => [{
        content: grid2([
          { label: L5("No Soft Edges", "Sem Bordas Suaves"), items: [none("No Soft Edges", "Sem Bordas Suaves")] },
          { label: L5("Soft Edge Variations", "Varia\xE7\xF5es de Bordas Suaves"), items: SOFT_EDGE_PRESETS.map((v2) => ({ id: String(v2), label: L5(`${v2 / 12700} Point`, `${String(v2 / 12700).replace(".", ",")} Ponto`) })) }
        ], (id) => id === "none" ? null : { softEdgePt: Number(id) / 12700 / 2.5 }, (id) => setFx("softEdge", id === "none" ? null : id), fx()?.softEdge ? String(fx().softEdge) : "none", 3)
      }]
    },
    {
      id: "pic:fx:bevel",
      label: L5("Bevel", "Bisel"),
      icon: "crop_square",
      submenu: () => [{
        content: grid2([
          { label: L5("No Bevel", "Sem Bisel"), items: [none("No Bevel", "Sem Bisel")] },
          { label: L5("Bevel", "Bisel"), items: BEVEL_PRESETS.map((p3) => ({ id: p3.prst, label: p3.label })) }
        ], () => null, (id) => setFx("bevel", id === "none" ? null : id), void 0, 4)
      }]
    },
    {
      id: "pic:fx:rot3d",
      label: L5("3-D Rotation", "Rota\xE7\xE3o 3D"),
      icon: "view_in_ar",
      submenu: () => [{
        content: grid2([
          { label: L5("No Rotation", "Sem Rota\xE7\xE3o"), items: [none("No Rotation", "Sem Rota\xE7\xE3o")] },
          { label: L5("Parallel", "Paralelo"), items: ROTATION_PRESETS.filter((p3) => p3.group === "parallel").map((p3) => ({ id: p3.prst, label: p3.label })) },
          { label: L5("Perspective", "Perspectiva"), items: ROTATION_PRESETS.filter((p3) => p3.group === "perspective").map((p3) => ({ id: p3.prst, label: p3.label })) },
          { label: L5("Oblique", "Obl\xEDqua"), items: ROTATION_PRESETS.filter((p3) => p3.group === "oblique").map((p3) => ({ id: p3.prst, label: p3.label })) }
        ], () => null, (id) => setFx("rotation", id === "none" ? null : id), void 0, 4)
      }]
    }
  ];
  const OPT = {
    "pic:fx:shadow": ["Shadow Options\u2026", "Op\xE7\xF5es de Sombra..."],
    "pic:fx:reflection": ["Reflection Options\u2026", "Op\xE7\xF5es de Reflexo..."],
    "pic:fx:glow": ["Glow Options\u2026", "Op\xE7\xF5es de Brilho..."],
    "pic:fx:soft": ["Soft Edges Options\u2026", "Op\xE7\xF5es de Bordas Suaves..."],
    "pic:fx:bevel": ["3-D Options\u2026", "Op\xE7\xF5es 3D..."],
    "pic:fx:rot3d": ["3-D Rotation Options\u2026", "Op\xE7\xF5es de Rota\xE7\xE3o 3D..."]
  };
  return items.map((it) => {
    const o6 = it.id ? OPT[it.id] : void 0;
    const sub = it.submenu;
    if (!o6 || typeof sub !== "function") return it;
    return { ...it, submenu: () => [...sub(), "-", { id: `${it.id}:options`, label: L5(o6[0], o6[1]), icon: "tune", onClick: () => env.ctl.pictureDialog("format:effects") }] };
  });
}

// src/chrome-page.ts
var L6 = (en, pt) => ({ en, pt });
var tr3 = (lang, en, pt) => pickLabels(lang, { en, pt });
function registerPageCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const edit = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => canEdit3() && c4.isEnabled() : canEdit3 });
  reg.add(
    edit({ id: "page:noColor", label: L6("No Color", "Sem Cor"), icon: "format_color_reset", supports: has("setPageColor"), run: () => ed.setPageColor(null) }),
    edit({ id: "dlg:pageFill", label: L6("Fill Effects\u2026", "Efeitos de Preenchimento\u2026"), icon: "gradient", supports: has("setPageFill"), run: () => ctl.pageBgDialog("fill") }),
    edit({ id: "dlg:watermark", label: L6("Custom Watermark\u2026", "Personalizar Marca-d'\xC1gua\u2026"), icon: "branding_watermark", supports: has("setWatermark"), run: () => ctl.pageBgDialog("watermark") }),
    edit({ id: "watermark:remove", label: L6("Remove Watermark", "Remover Marca-d'\xC1gua"), icon: "delete", supports: has("removeWatermark"), isEnabled: () => !!ed.watermark(), run: () => ed.removeWatermark() }),
    edit({ id: "cover:remove", label: L6("Remove Current Cover Page", "Remover Folha de Rosto Atual"), icon: "delete", supports: has("removeCoverPage"), isEnabled: () => ed.hasCoverPage(), run: () => {
      ed.removeCoverPage();
    } }),
    edit({ id: "blankPage", label: L6("Blank Page", "P\xE1gina em Branco"), tip: L6("Insert a new blank page at the cursor", "Insere uma p\xE1gina em branco no cursor"), icon: "note_add", supports: has("insertBlankPage"), run: () => ed.insertBlankPage() })
  );
}
var cap = (ctx, en, pt) => {
  const d3 = document.createElement("div");
  d3.textContent = ctx.registry.text(L6(en, pt));
  d3.style.cssText = "font-size:12px;opacity:.8;margin:6px 0 4px";
  return d3;
};
function pageColorMenu(env, ctx) {
  const more = {
    id: "page:moreColors",
    icon: "palette",
    label: L6("More Colors\u2026", "Mais Cores\u2026"),
    onClick: () => {
      const input = document.createElement("input");
      input.type = "color";
      const cur = env.ed.pageBackground()?.color;
      if (cur) input.value = `#${cur.toLowerCase()}`;
      input.style.cssText = "position:fixed;left:-100px;top:0;opacity:0";
      ctx.layer.appendChild(input);
      input.addEventListener("change", () => {
        env.ed.setPageColor(input.value.slice(1).toUpperCase());
        input.remove();
        ctx.after();
      });
      input.addEventListener("blur", () => setTimeout(() => input.remove(), 1e3));
      input.click();
    }
  };
  return [{
    content: (close) => {
      const colors = env.ed.documentThemeColors();
      const box = document.createElement("div");
      box.className = "uw-page-color";
      const theme = colorGrid({
        colors: themePaletteColors(colors),
        columns: 10,
        close,
        onPick: (v2) => {
          const p3 = parseThemePick(v2, colors);
          if (!p3) return;
          const frac = (h3) => h3 ? Math.round((1 - parseInt(h3, 16) / 255) * 1e3) / 1e3 : void 0;
          const tint = frac(p3.tint), shade = frac(p3.shade);
          env.ed.setPageColor({ themeColor: p3.themeColor, ...tint !== void 0 ? { tint } : {}, ...shade !== void 0 ? { shade } : {} });
          ctx.after();
        }
      });
      const std = colorGrid({
        colors: STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })),
        columns: 10,
        close,
        onPick: (h3) => {
          env.ed.setPageColor(h3);
          ctx.after();
        }
      });
      box.append(cap(ctx, "Theme Colors", "Cores do Tema"), theme, cap(ctx, "Standard Colors", "Cores Padr\xE3o"), std);
      return box;
    }
  }, "-", "page:noColor", more, "dlg:pageFill"];
}
function watermarkMenu(env, ctx) {
  return [{
    content: (close) => {
      const box = document.createElement("div");
      box.className = "uw-wm-gallery";
      box.style.cssText = "padding:4px 6px;max-height:440px;overflow:auto";
      let cat = "";
      let grid2 = null;
      for (const g2 of env.ed.watermarkGallery()) {
        if (g2.categoryLabel !== cat) {
          cat = g2.categoryLabel;
          const h3 = document.createElement("div");
          h3.textContent = cat;
          h3.style.cssText = "font-size:12px;font-weight:600;opacity:.8;margin:8px 0 4px";
          grid2 = document.createElement("div");
          grid2.style.cssText = "display:grid;grid-template-columns:repeat(4, 88px);gap:6px";
          box.append(h3, grid2);
        }
        const b3 = document.createElement("button");
        b3.type = "button";
        b3.dataset["watermark"] = g2.id;
        b3.title = g2.label;
        b3.setAttribute("aria-label", g2.label);
        b3.style.cssText = "display:flex;flex-direction:column;gap:3px;align-items:center;padding:4px;border-radius:6px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        const t5 = document.createElement("span");
        t5.textContent = g2.label;
        t5.style.cssText = "font-size:10.5px;opacity:.8;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
        b3.append(cv, t5);
        b3.addEventListener("mousedown", (e6) => e6.preventDefault());
        b3.addEventListener("click", () => {
          close();
          env.ed.setWatermark(g2.id);
          ctx.after();
        });
        grid2.append(b3);
        requestAnimationFrame(() => {
          env.ed.paintWatermarkTemplate(g2.id, cv, 68);
        });
      }
      return box;
    }
  }, "-", "dlg:watermark", "watermark:remove"];
}
function coverPageMenu(env, ctx) {
  return [{
    content: (close) => {
      const grid2 = document.createElement("div");
      grid2.className = "uw-cover-gallery";
      grid2.style.cssText = "display:grid;grid-template-columns:repeat(4, 88px);gap:8px;padding:6px;max-height:460px;overflow:auto";
      for (const c4 of env.ed.coverPages()) {
        const b3 = document.createElement("button");
        b3.type = "button";
        b3.dataset["cover"] = c4.id;
        b3.title = c4.name;
        b3.setAttribute("aria-label", c4.name);
        b3.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:center;padding:6px 4px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        const t5 = document.createElement("span");
        t5.textContent = c4.name;
        t5.style.cssText = "font-size:12px;opacity:.85";
        b3.append(cv, t5);
        b3.addEventListener("mousedown", (e6) => e6.preventDefault());
        b3.addEventListener("click", () => {
          close();
          env.ed.insertCoverPage(c4.id);
          ctx.after();
        });
        grid2.append(b3);
        requestAnimationFrame(() => {
          env.ed.paintCoverTemplate(c4.id, cv, 74);
        });
      }
      return grid2;
    }
  }, "-", "cover:remove"];
}
var el3 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var radio2 = (name, value, label, on) => el3("label", { className: "uo-check" }, el3("input", { type: "radio", name, value, checked: on }), label);
var check2 = (name, label, on) => el3("label", { className: "uo-check" }, el3("input", { type: "checkbox", name, checked: on }), label);
var colorInput = (name, hex) => el3("input", { type: "color", name, value: `#${hex.toLowerCase()}`, style: "width:56px;height:28px;padding:0 2px" });
var hexOf = (i5) => i5.value.slice(1).toUpperCase();
function paintRgba(cv, rgba, w2, h3, cssW, cssH) {
  cv.width = w2;
  cv.height = h3;
  cv.style.width = `${cssW}px`;
  cv.style.height = `${cssH}px`;
  const x2 = cv.getContext("2d");
  const id = x2.createImageData(w2, h3);
  id.data.set(rgba);
  x2.putImageData(id, 0, 0);
}
var sniffExt = (d3) => d3[0] === 255 && d3[1] === 216 ? "jpeg" : d3[0] === 71 && d3[1] === 73 ? "gif" : d3[0] === 66 && d3[1] === 77 ? "bmp" : "png";
function pickImage(onPick) {
  const input = el3("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/bmp", style: "position:fixed;left:-100px;top:0;opacity:0" });
  document.body.append(input);
  input.addEventListener("change", async () => {
    const f3 = input.files?.[0];
    input.remove();
    if (!f3) return;
    const data = new Uint8Array(await f3.arrayBuffer());
    onPick({ data, ext: (f3.name.split(".").pop() ?? "png").toLowerCase(), name: f3.name });
  });
  input.click();
}
var STYLES = [
  ["horizontal", "Horizontal", "Horizontal"],
  ["vertical", "Vertical", "Vertical"],
  ["diagonalUp", "Diagonal up", "Diagonal para cima"],
  ["diagonalDown", "Diagonal down", "Diagonal para baixo"],
  ["fromCorner", "From corner", "Do canto"],
  ["fromCenter", "From center", "Do centro"]
];
async function pageFillDialog(env) {
  const lang = env.lang, ed = env.ed;
  const opts = ed.pageFillOptions();
  const cur = ed.pageBackground();
  const f3 = cur?.fill;
  const isGrad = f3?.type === "gradient" || f3?.type === "gradientRadial";
  const oneM = /^\s*fill(?:\s+(darken|lighten)\((\d+)\))?\s*$/i.exec(f3?.color2 ?? "");
  const cMode = isGrad && f3?.colors ? "preset" : isGrad && oneM ? "one" : "two";
  const color1 = f3?.color ?? cur?.color ?? "4472C4";
  const c1 = colorInput("c1", color1);
  const c22 = colorInput("c2", isGrad && !oneM && f3?.color2 ? resolveColor2(f3.color2, color1) : "FFFFFF");
  const deg0 = !oneM?.[1] ? 0.5 : oneM[1].toLowerCase() === "darken" ? Number(oneM[2]) / 510 : 1 - Number(oneM[2]) / 510;
  const degree = el3("input", { type: "range", name: "degree", min: "0", max: "1", step: "0.01", value: String(Math.round(deg0 * 100) / 100), style: "width:140px" });
  const preset = el3("select", { name: "preset" });
  for (const p3 of opts.presets) preset.append(el3("option", { value: p3.id, textContent: p3.name }));
  const curPreset = f3?.colors ? opts.presets.find((p3) => p3.stops.length === f3.colors.length && p3.stops.every((s4, i5) => s4.color.toUpperCase() === f3.colors[i5].color.toUpperCase())) : void 0;
  if (curPreset) preset.value = curPreset.id;
  let style0 = "horizontal", variant = 1;
  if (isGrad) {
    for (const [st] of STYLES) for (let v2 = 1; v2 <= GRADIENT_VARIANTS[st]; v2++) {
      const g2 = gradientGeometry(st, v2);
      const fp = (p3) => p3 ? p3.join(",") : "";
      if (g2.type === f3.type && (g2.angle ?? 0) === (f3.angle ?? 0) && (g2.focus ?? 0) === (f3.focus ?? 0) && !!g2.gradientCenter === !!f3.gradientCenter && fp(g2.focusPosition) === fp(f3.focusPosition)) {
        style0 = st;
        variant = v2;
      }
    }
  }
  const modes = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px" },
    radio2("cmode", "one", tr3(lang, "One color", "Uma cor"), cMode === "one"),
    radio2("cmode", "two", tr3(lang, "Two colors", "Duas cores"), cMode === "two"),
    radio2("cmode", "preset", tr3(lang, "Preset", "Predefini\xE7\xE3o"), cMode === "preset")
  );
  const colorsRow = el3(
    "div",
    { className: "uo-dialog-grid" },
    el3("span", {}, tr3(lang, "Color 1", "Cor 1")),
    c1,
    el3("span", {}, tr3(lang, "Color 2", "Cor 2")),
    c22,
    el3("span", {}, tr3(lang, "Dark \u2194 Light", "Escuro \u2194 Claro")),
    degree,
    el3("span", {}, tr3(lang, "Preset colors", "Cores predefinidas")),
    preset
  );
  const styles2 = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:4px" },
    ...STYLES.map(([v2, en, pt]) => radio2("gstyle", v2, tr3(lang, en, pt), v2 === style0))
  );
  const variants = el3("div", { style: "display:grid;grid-template-columns:repeat(2, auto);gap:6px" });
  const sample = el3("canvas", { style: "border:1px solid rgba(127,127,127,.4)" });
  const gStyle = () => styles2.querySelector("input:checked")?.value ?? "horizontal";
  const cmode = () => modes.querySelector("input:checked")?.value ?? "two";
  const paintOf = (style, v2) => {
    const geo = gradientGeometry(style, v2);
    const m2 = cmode();
    const pre = GRADIENT_PRESETS.find((p3) => p3.id === preset.value) ?? GRADIENT_PRESETS[0];
    const a3 = m2 === "preset" ? pre.stops[0].color : hexOf(c1);
    const b3 = m2 === "one" ? resolveColor2(oneColorGradientColor2(Number(degree.value)), a3) : m2 === "two" ? hexOf(c22) : pre.stops[pre.stops.length - 1].color;
    return { type: geo.type, c1: a3, c2: b3, angle: geo.angle ?? 0, focus: geo.focus ?? 0, ...geo.focusPosition ? { focusPosition: geo.focusPosition } : {}, ...geo.gradientCenter ? { gradientCenter: true } : {}, ...m2 === "preset" ? { stops: pre.stops } : {} };
  };
  const refreshGradient = () => {
    const m2 = cmode();
    c22.disabled = m2 !== "two";
    degree.disabled = m2 !== "one";
    preset.disabled = m2 !== "preset";
    c1.disabled = m2 === "preset";
    const style = gStyle();
    const n5 = GRADIENT_VARIANTS[style];
    if (variant > n5) variant = 1;
    variants.replaceChildren();
    for (let v2 = 1; v2 <= n5; v2++) {
      const cv = el3("canvas", { style: `cursor:pointer;border:2px solid ${v2 === variant ? "var(--u-color-primary,#005bc0)" : "transparent"}` });
      cv.title = `${tr3(lang, "Variant", "Variante")} ${v2}`;
      paintRgba(cv, gradientTileRgba(paintOf(style, v2), 64, 48), 64, 48, 64, 48);
      cv.addEventListener("click", () => {
        variant = v2;
        refreshGradient();
      });
      variants.append(cv);
    }
    paintRgba(sample, gradientTileRgba(paintOf(style, variant), 96, 72), 96, 72, 96, 72);
  };
  const gradBody = el3(
    "div",
    { style: "display:grid;grid-template-columns:auto auto;gap:14px 18px;align-items:start" },
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Colors", "Cores")), modes, colorsRow),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Sample", "Amostra")), sample),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Shading styles", "Estilos de sombreamento")), styles2),
    el3("div", { style: "display:flex;flex-direction:column;gap:8px" }, el3("strong", {}, tr3(lang, "Variants", "Varia\xE7\xF5es")), variants)
  );
  gradBody.addEventListener("change", refreshGradient);
  degree.addEventListener("input", refreshGradient);
  const isPat = f3?.type === "pattern";
  let pattern = (isPat ? opts.patterns.find((p3) => p3.name === f3.title?.trim())?.id : void 0) ?? opts.patterns[0].id;
  const fg = colorInput("fg", isPat && f3.color ? f3.color : "000000"), bg = colorInput("bg", isPat ? resolveColor2(f3.color2, f3.color ?? "000000") : "FFFFFF");
  const patGrid = el3("div", { style: "display:grid;grid-template-columns:repeat(8, auto);gap:4px" });
  const patSample = el3("canvas", { style: "border:1px solid rgba(127,127,127,.4);image-rendering:pixelated" });
  const patName = el3("span", { style: "font-size:12px;opacity:.85" });
  const patPaint = (prst) => ({ type: "pattern", c1: hexOf(fg), c2: hexOf(bg), angle: 0, focus: 0, pattern: patternRows(prst) ?? [] });
  const tileRgba = (rgba8, reps) => {
    const n5 = 8 * reps, out = new Uint8Array(n5 * n5 * 4);
    for (let y3 = 0; y3 < n5; y3++) for (let x2 = 0; x2 < n5; x2++) out.set(rgba8.subarray((y3 % 8 * 8 + x2 % 8) * 4, (y3 % 8 * 8 + x2 % 8) * 4 + 4), (y3 * n5 + x2) * 4);
    return out;
  };
  const refreshPattern = () => {
    patGrid.replaceChildren();
    for (const p3 of opts.patterns) {
      const cv = el3("canvas", { style: `cursor:pointer;image-rendering:pixelated;border:2px solid ${p3.id === pattern ? "var(--u-color-primary,#005bc0)" : "rgba(127,127,127,.3)"}` });
      cv.title = p3.name;
      paintRgba(cv, tileRgba(patternRgba(patPaint(p3.id)), 3), 24, 24, 24, 24);
      cv.addEventListener("click", () => {
        pattern = p3.id;
        refreshPattern();
      });
      patGrid.append(cv);
    }
    patName.textContent = opts.patterns.find((p3) => p3.id === pattern)?.name ?? "";
    paintRgba(patSample, tileRgba(patternRgba(patPaint(pattern)), 12), 96, 96, 96, 96);
  };
  const patBody = el3(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px" },
    el3("strong", {}, tr3(lang, "Pattern", "Padr\xE3o")),
    patGrid,
    patName,
    el3("div", { className: "uo-dialog-grid" }, el3("span", {}, tr3(lang, "Foreground", "Primeiro plano")), fg, el3("span", {}, tr3(lang, "Background", "Plano de fundo")), bg),
    el3("strong", {}, tr3(lang, "Sample", "Amostra")),
    patSample
  );
  fg.addEventListener("input", refreshPattern);
  bg.addEventListener("input", refreshPattern);
  const files = { texture: null, picture: null };
  const imgPane = (kind) => {
    const prev = el3("img", { alt: "", style: "max-width:280px;max-height:180px;border:1px solid rgba(127,127,127,.4);display:none" });
    const name = el3("span", { style: "font-size:12px;opacity:.85" });
    const btn2 = el3("button", { type: "button", className: "uo-pill", textContent: kind === "texture" ? tr3(lang, "Other Texture\u2026", "Outra Textura\u2026") : tr3(lang, "Select Picture\u2026", "Selecionar Imagem\u2026") });
    btn2.addEventListener("click", () => pickImage((file) => {
      files[kind] = file;
      name.textContent = file.name;
      prev.src = URL.createObjectURL(new Blob([file.data.slice().buffer]));
      prev.style.display = "block";
    }));
    const note = kind === "texture" ? tr3(lang, "The image repeats across the page at its natural size.", "A imagem se repete pela p\xE1gina no tamanho natural.") : tr3(lang, "The picture repeats across the page, as in the desktop app.", "A imagem se repete pela p\xE1gina, como no aplicativo de mesa.");
    return el3("div", { style: "display:flex;flex-direction:column;gap:10px;align-items:flex-start" }, btn2, name, prev, el3("span", { style: "font-size:12px;opacity:.7" }, note));
  };
  const tabs = dialogTabs([
    { id: "gradient", label: tr3(lang, "Gradient", "Gradiente"), body: gradBody },
    { id: "texture", label: tr3(lang, "Texture", "Textura"), body: imgPane("texture") },
    { id: "pattern", label: tr3(lang, "Pattern", "Padr\xE3o"), body: patBody },
    { id: "picture", label: tr3(lang, "Picture", "Imagem"), body: imgPane("picture") }
  ], cur?.fill?.type === "pattern" ? "pattern" : cur?.fill?.type === "tile" ? "texture" : cur?.fill?.type === "frame" ? "picture" : "gradient");
  const h3 = openDialog({
    title: tr3(lang, "Fill Effects", "Efeitos de Preenchimento"),
    icon: "gradient",
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 560,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  refreshGradient();
  refreshPattern();
  if (await h3.result !== "ok") return;
  let input = null;
  switch (tabs.current()) {
    case "gradient": {
      const m2 = cmode(), style = gStyle();
      input = m2 === "one" ? { type: "gradient", colors: "one", color: hexOf(c1), degree: Number(degree.value), style, variant } : m2 === "two" ? { type: "gradient", colors: "two", color: hexOf(c1), color2: hexOf(c22), style, variant } : { type: "gradient", colors: "preset", preset: preset.value, style, variant };
      break;
    }
    case "pattern":
      input = { type: "pattern", pattern, color: hexOf(fg), background: hexOf(bg) };
      break;
    case "texture":
      if (files.texture) input = { type: "texture", ...files.texture };
      break;
    case "picture":
      if (files.picture) input = { type: "picture", ...files.picture };
      break;
  }
  if (input) ed.setPageFill(input);
}
async function watermarkDialog(env) {
  const lang = env.lang, ed = env.ed;
  const cur = ed.watermark();
  const none = radio2("wmkind", "none", tr3(lang, "No watermark", "Sem marca-d'\xE1gua"), !cur);
  const pic = radio2("wmkind", "picture", tr3(lang, "Picture watermark", "Marca-d'\xE1gua de imagem"), cur?.kind === "picture");
  const txt = radio2("wmkind", "text", tr3(lang, "Text watermark", "Marca-d'\xE1gua de texto"), cur?.kind === "text");
  let image = cur?.kind === "picture" && cur.image ? { data: cur.image, ext: sniffExt(cur.image), name: cur.title } : null;
  const picName = el3("span", { style: "font-size:12px;opacity:.85", textContent: image?.name ?? "" });
  const picBtn = el3("button", { type: "button", className: "uo-pill", textContent: tr3(lang, "Select Picture\u2026", "Selecionar Imagem\u2026") });
  picBtn.addEventListener("click", () => pickImage((f3) => {
    image = f3;
    picName.textContent = f3.name;
    pic.querySelector("input").checked = true;
    sync();
  }));
  const scale = el3("select", { name: "scale" });
  for (const [v2, t5] of [["auto", tr3(lang, "Auto", "Autom\xE1tico")], ["500", "500%"], ["200", "200%"], ["150", "150%"], ["100", "100%"], ["50", "50%"]]) scale.append(el3("option", { value: v2, textContent: t5 }));
  const washout = check2("washout", tr3(lang, "Washout", "Desbotar"), cur?.kind === "picture" ? cur.washout : true);
  const langSel = el3("select", { name: "wmlang" });
  for (const [v2, t5] of [["pt", "Portugu\xEAs (Brasil)"], ["en", tr3(lang, "English (United States)", "Ingl\xEAs (Estados Unidos)")]]) langSel.append(el3("option", { value: v2, textContent: t5 }));
  langSel.value = cur?.kind === "text" && cur.lang ? cur.lang.toLowerCase().startsWith("pt") ? "pt" : "en" : lang;
  const list = el3("datalist", { id: "uw-wm-texts" });
  const text = el3("input", { type: "text", name: "wmtext", value: cur?.kind === "text" ? cur.text : WATERMARK_TEXTS[langSel.value][0] ?? "", style: "width:220px" });
  text.setAttribute("list", "uw-wm-texts");
  const fillTexts = () => list.replaceChildren(...WATERMARK_TEXTS[langSel.value].map((t5) => el3("option", { value: t5 })));
  fillTexts();
  langSel.addEventListener("change", fillTexts);
  const font = el3("select", { name: "wmfont", style: "width:220px" });
  const known = ed.knownFontFamilies();
  const want = cur?.kind === "text" ? cur.font : "Calibri";
  const font0 = known.find((k2) => k2.toLowerCase() === want.toLowerCase()) ?? want;
  for (const f3 of [.../* @__PURE__ */ new Set([font0, ...known])]) font.append(el3("option", { value: f3, textContent: f3 }));
  font.value = font0;
  const size = el3("select", { name: "wmsize" });
  for (const s4 of ["auto", "36", "40", "44", "48", "54", "60", "66", "72", "80", "90", "96", "105", "120", "144"]) size.append(el3("option", { value: s4, textContent: s4 === "auto" ? tr3(lang, "Auto", "Autom\xE1tico") : s4 }));
  size.value = cur?.kind === "text" && cur.sizePt ? String(cur.sizePt) : "auto";
  const color = colorInput("wmcolor", cur?.kind === "text" ? cur.color : "C0C0C0");
  const semi = check2("semi", tr3(lang, "Semitransparent", "Semitransparente"), cur?.kind === "text" ? cur.semitransparent : true);
  const diag = radio2("wmlayout", "diagonal", tr3(lang, "Diagonal", "Diagonal"), cur?.kind !== "text" || cur.layout === "diagonal");
  const horiz = radio2("wmlayout", "horizontal", tr3(lang, "Horizontal", "Horizontal"), cur?.kind === "text" && cur.layout === "horizontal");
  const picPane = el3(
    "div",
    { className: "uo-dialog-grid", style: "padding-left:24px" },
    el3("span", {}, ""),
    el3("div", { style: "display:flex;gap:8px;align-items:center" }, picBtn, picName),
    el3("span", {}, tr3(lang, "Scale", "Escala")),
    el3("div", { style: "display:flex;gap:12px;align-items:center" }, scale, washout)
  );
  const txtPane = el3(
    "div",
    { className: "uo-dialog-grid", style: "padding-left:24px" },
    el3("span", {}, tr3(lang, "Language", "Idioma")),
    langSel,
    el3("span", {}, tr3(lang, "Text", "Texto")),
    el3("div", {}, text, list),
    el3("span", {}, tr3(lang, "Font", "Fonte")),
    font,
    el3("span", {}, tr3(lang, "Size", "Tamanho")),
    size,
    el3("span", {}, tr3(lang, "Color", "Cor")),
    el3("div", { style: "display:flex;gap:12px;align-items:center" }, color, semi),
    el3("span", {}, tr3(lang, "Layout", "Layout")),
    el3("div", { style: "display:flex;gap:12px" }, diag, horiz)
  );
  const body = el3("div", { style: "display:flex;flex-direction:column;gap:10px" }, none, pic, picPane, txt, txtPane);
  const kind = () => body.querySelector('input[name="wmkind"]:checked')?.value ?? "none";
  const sync = () => {
    for (const x2 of picPane.querySelectorAll("input,select,button")) x2.disabled = kind() !== "picture";
    for (const x2 of txtPane.querySelectorAll("input,select")) x2.disabled = kind() !== "text";
  };
  body.addEventListener("change", sync);
  sync();
  const apply = () => {
    const k2 = kind();
    if (k2 === "none") {
      ed.removeWatermark();
      return;
    }
    if (k2 === "picture") {
      if (!image) return;
      ed.setWatermark({ kind: "picture", data: image.data, ext: image.ext, title: image.name.replace(/\.[^.]+$/, ""), washout: washout.querySelector("input").checked, ...scale.value !== "auto" ? { scale: Number(scale.value) } : {} });
      return;
    }
    if (!text.value.trim()) return;
    const spec = {
      kind: "text",
      text: text.value.trim(),
      font: font.value || "Calibri",
      color: hexOf(color),
      semitransparent: semi.querySelector("input").checked,
      layout: body.querySelector('input[name="wmlayout"]:checked')?.value ?? "diagonal",
      lang: langSel.value === "pt" ? "pt-BR" : "en-US",
      ...size.value !== "auto" ? { sizePt: Number(size.value) } : {}
    };
    ed.setWatermark(spec);
  };
  const h3 = openDialog({
    title: tr3(lang, "Printed Watermark", "Marca-d'\xE1gua Impressa"),
    icon: "branding_watermark",
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "apply", label: tr3(lang, "Apply", "Aplicar") }, { id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }],
    onAction: (id) => {
      if (id === "apply") {
        apply();
        return false;
      }
      return void 0;
    }
  });
  if (await h3.result !== "ok") return;
  apply();
}

// src/chrome-toc.ts
var L7 = (en, pt) => ({ en, pt });
function registerTocCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const edit = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => canEdit3() && c4.isEnabled() : canEdit3 });
  const hasToc = () => typeof api["hasTableOfContents"] === "function" && ed.hasTableOfContents();
  const cmds = [
    edit({ id: "toc", label: L7("Update Table", "Atualizar Sum\xE1rio"), tip: L7("Update the table of contents so all the entries refer to the correct page numbers", "Atualiza o sum\xE1rio para que todas as entradas indiquem os n\xFAmeros de p\xE1gina corretos"), icon: "autorenew", supports: has("updateToc"), isEnabled: hasToc, run: () => ctl.tocDialog("update") }),
    edit({ id: "toc:custom", label: L7("Custom Table of Contents\u2026", "Sum\xE1rio Personalizado\u2026"), icon: "tune", supports: has("insertTableOfContents"), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog("custom") }),
    edit({ id: "toc:remove", label: L7("Remove Table of Contents", "Remover Sum\xE1rio"), icon: "delete", supports: has("removeTableOfContents"), isEnabled: hasToc, run: () => {
      ed.removeTableOfContents();
    } }),
    edit({ id: "toc:mark", label: L7("Mark Table of Contents Entry\u2026", "Marcar Entrada de Sum\xE1rio\u2026"), icon: "bookmark_add", shortcut: "Alt+Shift+O", supports: has("markTocEntry"), isEnabled: () => ed.canInsertField(), run: () => ctl.tocDialog("mark") }),
    ...Array.from({ length: 10 }, (_2, lv) => edit({
      id: `toc:level${lv}`,
      label: lv ? L7(`Level ${lv}`, `N\xEDvel ${lv}`) : L7("Do Not Show in Table of Contents", "N\xE3o Mostrar no Sum\xE1rio"),
      supports: has("setTocLevel"),
      isChecked: () => ed.getTocLevel() === lv,
      run: () => ed.setTocLevel(lv)
    }))
  ];
  reg.add(...cmds);
}
function tocGalleryMenu(env, ctx) {
  const tiles = {
    content: (close) => {
      const list = document.createElement("div");
      list.className = "uw-toc-gallery";
      list.style.cssText = "display:grid;grid-template-columns:1fr;gap:6px;padding:6px;max-height:460px;overflow:auto";
      for (const t5 of env.ed.tocTemplates()) {
        const b3 = document.createElement("button");
        b3.type = "button";
        b3.dataset["template"] = t5.id;
        b3.title = t5.name;
        b3.setAttribute("aria-label", t5.name);
        b3.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:stretch;padding:6px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left";
        const cap2 = document.createElement("span");
        cap2.textContent = t5.name;
        cap2.style.cssText = "font-size:12px;opacity:.8";
        const cv = document.createElement("canvas");
        cv.style.cssText = "display:block;border:1px solid rgba(127,127,127,.25);background:#fff";
        b3.append(cap2, cv);
        b3.addEventListener("mousedown", (e6) => e6.preventDefault());
        b3.addEventListener("click", () => {
          close();
          env.ed.insertTocTemplate(t5.id);
          ctx.after();
        });
        list.append(b3);
        requestAnimationFrame(() => {
          env.ed.paintTocTemplate(t5.id, cv, 300);
        });
      }
      return list;
    }
  };
  return [tiles, "-", "toc:custom", "toc:remove"];
}
function addTextMenu(env) {
  const shown = Math.max(3, Math.min(9, env.ed.getTableOfContentsOptions()?.levels ?? 3));
  return [...Array.from({ length: shown + 1 }, (_2, i5) => `toc:level${i5}`), "-", "toc:mark"];
}
var el4 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var check3 = (label, on) => {
  const input = el4("input", { type: "checkbox", checked: on });
  return { box: el4("label", { className: "uo-check" }, input, label), input };
};
var select2 = (opts, value) => {
  const s4 = el4("select");
  for (const [v2, t5] of opts) s4.append(el4("option", { value: v2, textContent: t5 }));
  s4.value = value;
  return s4;
};
var button = (label) => el4("button", { type: "button", className: "uo-pill", textContent: label });
var T2 = (env) => (en, pt) => pickLabels(env.lang, { en, pt });
var LEADERS = (t5) => [
  ["none", t5("(none)", "(nenhum)")],
  ["dot", "......."],
  ["hyphen", "-------"],
  ["underscore", "_______"]
];
async function updateTocDialog(env, scope = "caret") {
  const t5 = T2(env), ed = env.ed;
  const name = `toc-upd-${Math.random().toString(36).slice(2)}`;
  const pages = el4("input", { type: "radio", name, checked: true });
  const all = el4("input", { type: "radio", name });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    el4("div", { style: "font-size:13px" }, t5("Choose how to update the table of contents:", "Selecione como atualizar o sum\xE1rio:")),
    el4("label", { className: "uo-check" }, pages, t5("Update page numbers only", "Atualizar somente os n\xFAmeros de p\xE1gina")),
    el4("label", { className: "uo-check" }, all, t5("Update entire table", "Atualizar o \xEDndice inteiro"))
  );
  const h3 = openDialog({
    title: t5("Update Table of Contents", "Atualizar Sum\xE1rio"),
    icon: "autorenew",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 420,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const mode = pages.checked ? "pages" : "all";
  if (scope === "selection") ed.updateFields("selection", mode);
  else ed.updateToc(mode);
}
async function replaceQuestion(env) {
  const t5 = T2(env);
  const h3 = openDialog({
    title: t5("Table of Contents", "Sum\xE1rio"),
    body: el4("div", { style: "min-width:300px;font-size:13px" }, t5("Do you want to replace the selected table of contents?", "Deseja substituir o sum\xE1rio selecionado?")),
    layer: env.layer,
    lang: env.lang,
    width: 400,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "no", label: t5("No", "N\xE3o") }, { id: "yes", label: t5("Yes", "Sim"), primary: true }]
  });
  const r5 = await h3.result;
  return r5 === "yes" || r5 === "no" ? r5 : null;
}
async function optionsDialog(env, cur) {
  const t5 = T2(env), ed = env.ed;
  const useStyles = check3(t5("Styles", "Estilos"), cur.useStyles !== false);
  const outline = check3(t5("Outline levels", "N\xEDveis de t\xF3picos"), cur.outlineLevels !== false);
  const fields = check3(t5("Table entry fields", "Campos de entrada de \xEDndice"), !!cur.fields);
  const levels = cur.levels ?? 3;
  const styles2 = ed.listStyles("document").filter((s4) => s4.kind !== "character");
  const isHeading = (raw) => {
    const m2 = /^heading ([1-9])$/i.exec(raw);
    return m2 ? +m2[1] : 0;
  };
  const initial = (raw, name) => {
    const hd = isHeading(raw);
    if (hd && cur.useStyles !== false && hd <= levels) return String(hd);
    const s4 = cur.styles?.find((x2) => x2.style.toLowerCase() === name.toLowerCase() || x2.style.toLowerCase() === raw.toLowerCase());
    return s4 ? String(s4.level) : "";
  };
  const rows = styles2.map((s4) => {
    const input = el4("input", { type: "text", value: initial(s4.rawName, s4.name), maxLength: 1, style: "width:34px;height:22px;padding:0 4px;box-sizing:border-box;text-align:center;font:inherit" });
    return { s: s4, input, row: el4("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:12px;padding:1px 4px;font-size:13px" }, el4("span", {}, s4.name), input) };
  });
  const list = el4("div", { style: "height:200px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px" }, ...rows.map((r5) => r5.row));
  const reset = button(t5("Reset", "Redefinir"));
  reset.addEventListener("click", () => {
    for (const r5 of rows) {
      const hd = isHeading(r5.s.rawName);
      r5.input.value = hd && hd <= 3 ? String(hd) : "";
    }
    useStyles.input.checked = true;
    outline.input.checked = true;
    fields.input.checked = false;
  });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px;min-width:360px" },
    el4("strong", { style: "font-size:13px" }, t5("Build table of contents from:", "Construir sum\xE1rio a partir de:")),
    useStyles.box,
    el4("div", { style: "display:flex;justify-content:space-between;font-size:12px;opacity:.75;padding:0 4px" }, el4("span", {}, t5("Available styles:", "Estilos dispon\xEDveis:")), el4("span", {}, t5("TOC level:", "N\xEDvel do sum\xE1rio:"))),
    list,
    outline.box,
    fields.box,
    el4("div", {}, reset)
  );
  const h3 = openDialog({
    title: t5("Table of Contents Options", "Op\xE7\xF5es do Sum\xE1rio"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 460,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return null;
  const map = rows.map((r5) => ({ s: r5.s, level: Math.min(9, Math.max(0, parseInt(r5.input.value, 10) || 0)) })).filter((x2) => x2.level > 0);
  let k2 = 0;
  while (k2 < 9 && map.some((x2) => isHeading(x2.s.rawName) === k2 + 1 && x2.level === k2 + 1)) k2++;
  const extra = map.filter((x2) => !(isHeading(x2.s.rawName) && isHeading(x2.s.rawName) <= k2 && x2.level === isHeading(x2.s.rawName)));
  return {
    ...cur,
    useStyles: useStyles.input.checked,
    outlineLevels: outline.input.checked,
    fields: fields.input.checked,
    levels: k2 || levels,
    styles: extra.map((x2) => ({ style: x2.s.name, level: x2.level }))
  };
}
async function modifyDialog(env) {
  const t5 = T2(env), ed = env.ed;
  const names = Array.from({ length: 9 }, (_2, i5) => [`toc ${i5 + 1}`, t5(`TOC ${i5 + 1}`, `Sum\xE1rio ${i5 + 1}`)]);
  const list = el4("select", { size: 9, style: "width:100%;font:inherit" });
  for (const [v2, txt] of names) list.append(el4("option", { value: v2, textContent: txt }));
  list.value = "toc 1";
  const mod = button(t5("Modify\u2026", "Modificar\u2026"));
  mod.addEventListener("click", () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  list.addEventListener("dblclick", () => env.modifyStyle?.(ed.ensureBuiltinStyle(list.value)));
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px;min-width:280px" },
    el4("span", { style: "font-size:13px" }, t5("Styles:", "Estilos:")),
    list,
    el4("div", {}, mod)
  );
  const h3 = openDialog({
    title: t5("Style", "Estilo"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 340,
    actions: [{ id: "ok", label: "OK", primary: true }]
  });
  await h3.result;
}
async function customTocDialog(env) {
  const t5 = T2(env), ed = env.ed;
  let cur = ed.getTableOfContentsOptions() ?? {};
  const pages = check3(t5("Show page numbers", "Mostrar n\xFAmeros de p\xE1gina"), cur.pageNumbers !== false);
  const right = check3(t5("Right align page numbers", "Alinhar n\xFAmeros de p\xE1gina \xE0 direita"), cur.rightAlign !== false);
  const leader = select2(LEADERS(t5), cur.leader ?? "dot");
  const links = check3(t5("Use hyperlinks instead of page numbers", "Usar hiperlinks em vez de n\xFAmeros de p\xE1gina"), cur.hyperlinks !== false);
  const format = select2(TOC_FORMATS.map((f3) => [f3.id, pickLabels(env.lang, f3.label)]), "template");
  let formatTouched = false;
  format.addEventListener("change", () => {
    formatTouched = true;
  });
  const levels = el4("input", { type: "number", min: "1", max: "9", value: String(cur.levels ?? 3), style: "width:56px" });
  const print = el4("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f" });
  const web = el4("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:96px;display:flex;flex-direction:column;gap:2px;background:#fff;color:#1f1f1f" });
  const paint = () => {
    const n5 = Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3));
    const lead = { none: " ", dot: ".", hyphen: "-", underscore: "_" }[leader.value] ?? ".";
    const f3 = format.value;
    const show = Math.min(n5, 3);
    print.replaceChildren(...Array.from({ length: show }, (_2, i5) => {
      const st = tocFormatStyle(f3, i5 + 1);
      const css = `padding-left:${/w:left="(\d+)"/.exec(st.pPr)?.[1] ? +/w:left="(\d+)"/.exec(st.pPr)[1] / 20 : 0}px;${/<w:b\/>/.test(st.rPr) ? "font-weight:700;" : ""}${/<w:i\/>/.test(st.rPr) ? "font-style:italic;" : ""}${/<w:caps\/>/.test(st.rPr) ? "text-transform:uppercase;" : ""}${/<w:smallCaps\/>/.test(st.rPr) ? "font-variant:small-caps;" : ""}${/w:jc w:val="center"/.test(st.pPr) ? "justify-content:center;" : ""}`;
      const row2 = el4("div", { style: `display:flex;gap:4px;white-space:nowrap;${css}` }, el4("span", {}, t5(`Heading ${i5 + 1}`, `T\xEDtulo ${i5 + 1}`)));
      if (pages.input.checked && right.input.checked) row2.append(el4("span", { style: "flex:1;overflow:hidden;opacity:.7", textContent: lead.repeat(200) }), el4("span", {}, String(i5 * 2 + 1)));
      else if (pages.input.checked) row2.append(el4("span", {}, String(i5 * 2 + 1)));
      return row2;
    }));
    web.replaceChildren(...Array.from({ length: show }, (_2, i5) => el4("div", { style: `padding-left:${i5 * 11}px;${links.input.checked ? "color:#0563c1;text-decoration:underline" : ""}` }, t5(`Heading ${i5 + 1}`, `T\xEDtulo ${i5 + 1}`))));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c4 of [pages.input, right.input, links.input]) c4.addEventListener("change", paint);
  for (const s4 of [leader, format]) s4.addEventListener("change", paint);
  levels.addEventListener("input", paint);
  paint();
  const optBtn = button(t5("Options\u2026", "Op\xE7\xF5es\u2026"));
  optBtn.addEventListener("click", () => {
    void optionsDialog(env, { ...cur, levels: parseInt(levels.value, 10) || 3 }).then((o6) => {
      if (!o6) return;
      cur = o6;
      levels.value = String(o6.levels ?? 3);
      paint();
    });
  });
  const modBtn = button(t5("Modify\u2026", "Modificar\u2026"));
  modBtn.addEventListener("click", () => {
    void modifyDialog(env);
  });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:520px" },
    el4(
      "div",
      { style: "display:grid;grid-template-columns:1fr 1fr;gap:12px" },
      el4(
        "div",
        { style: "display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden" },
        el4("strong", { style: "font-size:13px" }, t5("Print Preview", "Visualizar Impress\xE3o")),
        print,
        pages.box,
        right.box,
        el4("label", { className: "uo-field" }, el4("span", {}, t5("Tab leader:", "Preenchimento de tabula\xE7\xE3o:")), leader)
      ),
      el4("div", { style: "display:flex;flex-direction:column;gap:6px;min-width:0;overflow:hidden" }, el4("strong", { style: "font-size:13px" }, t5("Web Preview", "Visualizar da Web")), web, links.box)
    ),
    el4("strong", { style: "font-size:13px" }, t5("General", "Geral")),
    el4("div", { className: "uo-dialog-grid" }, el4("span", {}, t5("Formats:", "Formatos:")), format, el4("span", {}, t5("Show levels:", "Mostrar n\xEDveis:")), levels),
    el4("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, optBtn, modBtn)
  );
  const h3 = openDialog({
    title: t5("Table of Contents", "Sum\xE1rio"),
    icon: "toc",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 620,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const opts = {
    ...cur,
    pageNumbers: pages.input.checked,
    rightAlign: right.input.checked,
    leader: leader.value,
    hyperlinks: links.input.checked,
    levels: Math.max(1, Math.min(9, parseInt(levels.value, 10) || 3)),
    ...formatTouched ? { format: format.value } : {}
  };
  let replace;
  if (ed.hasTableOfContents()) {
    const r5 = await replaceQuestion(env);
    if (!r5) return;
    replace = r5 === "yes";
  }
  if (!ed.insertTableOfContents(opts, replace)) env.flash(t5("The table of contents could not be inserted here", "N\xE3o foi poss\xEDvel inserir o sum\xE1rio aqui"));
}
async function markTocDialog(env) {
  const t5 = T2(env), ed = env.ed;
  const entry = el4("input", { type: "text", value: ed.tocEntrySuggestion(), style: "min-width:260px" });
  const ids = select2("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c4) => [c4, c4]), "C");
  const level = el4("input", { type: "number", min: "1", max: "9", value: "1", style: "width:56px" });
  const body = el4(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:340px" },
    el4("label", { className: "uo-field" }, el4("span", {}, t5("Entry:", "Entrada:")), entry),
    el4("div", { className: "uo-dialog-grid" }, el4("span", {}, t5("Table identifier:", "Identificador do sum\xE1rio:")), ids, el4("span", {}, t5("Level:", "N\xEDvel:")), level)
  );
  const h3 = openDialog({
    title: t5("Mark Table of Contents Entry", "Marcar Entrada de Sum\xE1rio"),
    icon: "bookmark_add",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 440,
    modal: false,
    actions: [{ id: "cancel", label: t5("Close", "Fechar") }, { id: "mark", label: t5("Mark", "Marcar"), primary: true }],
    onAction: (id) => {
      if (id !== "mark") return true;
      const ok = ed.markTocEntry({ text: entry.value, identifier: ids.value, level: parseInt(level.value, 10) || 1 });
      if (!ok) env.flash(t5("Type the entry text", "Digite o texto da entrada"));
      return false;
    }
  });
  h3.el.style.cssText += ";position:fixed;inset:0;margin:auto;height:fit-content";
  queueMicrotask(() => entry.focus());
  await h3.result;
}
function tocDialog(env, kind, scope = "caret") {
  switch (kind) {
    case "custom":
      return customTocDialog(env);
    case "update":
      return updateTocDialog(env, scope);
    case "mark":
      return markTocDialog(env);
  }
}

// src/chrome-shape.ts
var L8 = (en, pt) => ({ en, pt });
var WRAPS2 = [
  ["inline", "In Line with Text", "Alinhado ao Texto", "format_align_left"],
  ["square", "Square", "Quadrado", "wrap_text"],
  ["tight", "Tight", "Comprimido", "wrap_text"],
  ["through", "Through", "Atrav\xE9s", "wrap_text"],
  ["topAndBottom", "Top and Bottom", "Superior e Inferior", "vertical_align_center"],
  ["behind", "Behind Text", "Atr\xE1s do Texto", "flip_to_back"],
  ["front", "In Front of Text", "Na Frente do Texto", "flip_to_front"]
];
var ALIGNS2 = [
  ["left", "Align Left", "Alinhar \xE0 Esquerda", "align_horizontal_left"],
  ["center", "Align Center", "Centralizar", "align_horizontal_center"],
  ["right", "Align Right", "Alinhar \xE0 Direita", "align_horizontal_right"],
  ["top", "Align Top", "Alinhar Acima", "align_vertical_top"],
  ["middle", "Align Middle", "Alinhar ao Meio", "align_vertical_center"],
  ["bottom", "Align Bottom", "Alinhar Parte Inferior", "align_vertical_bottom"]
];
var DIRS = [
  ["horz", "Horizontal", "Horizontal", "format_textdirection_l_to_r"],
  ["vert", "Rotate all text 90\xB0", "Girar todo o texto 90\xB0", "text_rotation_down"],
  ["vert270", "Rotate all text 270\xB0", "Girar todo o texto 270\xB0", "text_rotate_up"]
];
var ANCHORS = [
  ["t", "Top", "Superior", "vertical_align_top"],
  ["ctr", "Middle", "Meio", "vertical_align_center"],
  ["b", "Bottom", "Inferior", "vertical_align_bottom"]
];
function pickImage2(cb) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.addEventListener("change", () => {
    const f3 = inp.files?.[0];
    if (!f3) return;
    void f3.arrayBuffer().then((b3) => cb(new Uint8Array(b3), (f3.name.split(".").pop() || "png").toLowerCase()));
  });
  inp.click();
}
function registerShapeCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const shp = () => typeof api["selectedShape"] === "function" ? ed.selectedShape() : null;
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const on = () => canEdit3() && !!shp();
  const floating = () => on() && !shp().inline;
  const box = () => on() && !!shp().text;
  const s4 = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => on() && c4.isEnabled() : on });
  const cmds = [
    // ── Inserir › Caixa de Texto: desenhar ──
    {
      id: "textbox:draw",
      label: L8("Draw Text Box", "Desenhar Caixa de Texto"),
      icon: "draw",
      supports: has("drawTextbox"),
      isEnabled: canEdit3,
      isChecked: () => typeof api["drawingTextbox"] === "function" && ed.drawingTextbox(),
      run: () => ed.drawingTextbox() ? ed.cancelDrawTextbox() : ed.drawTextbox(false)
    },
    { id: "textbox:drawVertical", label: L8("Draw Vertical Text Box", "Desenhar Caixa de Texto Vertical"), icon: "text_rotate_vertical", supports: has("drawTextbox"), isEnabled: canEdit3, run: () => ed.drawTextbox(true) },
    // ── Organizar ──
    ...WRAPS2.map(([k2, en, pt, icon]) => s4({ id: `shp:wrap:${k2}`, label: L8(en, pt), icon, supports: has("setShapeWrap"), run: () => ed.setShapeWrap(k2), isChecked: () => shp()?.wrap === k2 })),
    s4({ id: "shp:wrap:moveWithText", label: L8("Move with Text", "Mover com o Texto"), supports: has("setShapeMoveWithText"), isEnabled: floating, run: () => ed.setShapeMoveWithText(true), isChecked: () => !!shp()?.moveWithText }),
    s4({ id: "shp:wrap:fixOnPage", label: L8("Fix Position on Page", "Corrigir Posi\xE7\xE3o na P\xE1gina"), supports: has("setShapeMoveWithText"), isEnabled: floating, run: () => ed.setShapeMoveWithText(false), isChecked: () => !!shp() && !shp().inline && !shp().moveWithText }),
    s4({ id: "shp:wrap:more", label: L8("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:wrap") }),
    s4({ id: "shp:pos:inline", label: L8("In Line with Text", "Alinhado ao Texto"), icon: "format_align_left", supports: has("setShapePosition"), run: () => ed.setShapePosition("inline"), isChecked: () => !!shp()?.inline }),
    ...POSITION_PRESETS.map((q) => s4({
      id: `shp:pos:${q.id}`,
      label: q.label,
      icon: positionIcon2(q.v, q.h),
      supports: has("setShapePosition"),
      run: () => ed.setShapePosition(q.id),
      isChecked: () => {
        const f3 = shp()?.format;
        return !!f3 && f3.wrap === "square" && f3.posH?.relativeFrom === "margin" && f3.posH.align === q.h && f3.posV?.relativeFrom === "margin" && f3.posV.align === q.v;
      }
    })),
    s4({ id: "shp:pos:more", label: L8("More Layout Options\u2026", "Mais Op\xE7\xF5es de Layout..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:position") }),
    s4({ id: "shp:forward", label: L8("Bring Forward", "Avan\xE7ar"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("forward") }),
    s4({ id: "shp:front", label: L8("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("front") }),
    s4({ id: "shp:frontOfText", label: L8("Bring in Front of Text", "Trazer para a Frente do Texto"), icon: "flip_to_front", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("frontOfText") }),
    s4({ id: "shp:backward", label: L8("Send Backward", "Recuar"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("backward") }),
    s4({ id: "shp:back", label: L8("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("back") }),
    s4({ id: "shp:behindText", label: L8("Send Behind Text", "Enviar para Tr\xE1s do Texto"), icon: "flip_to_back", supports: has("arrangeShape"), isEnabled: floating, run: () => ed.arrangeShape("behindText") }),
    s4({ id: "shp:rotate:right", label: L8("Rotate Right 90\xB0", "Girar 90\xB0 para a Direita"), icon: "rotate_right", supports: has("rotateShape"), run: () => ed.rotateShape(90) }),
    s4({ id: "shp:rotate:left", label: L8("Rotate Left 90\xB0", "Girar 90\xB0 para a Esquerda"), icon: "rotate_left", supports: has("rotateShape"), run: () => ed.rotateShape(-90) }),
    s4({ id: "shp:flip:v", label: L8("Flip Vertical", "Inverter Verticalmente"), icon: "flip", supports: has("flipShape"), run: () => ed.flipShape("v") }),
    s4({ id: "shp:flip:h", label: L8("Flip Horizontal", "Inverter Horizontalmente"), icon: "flip", supports: has("flipShape"), run: () => ed.flipShape("h") }),
    s4({ id: "shp:rotate:more", label: L8("More Rotation Options\u2026", "Mais Op\xE7\xF5es de Rota\xE7\xE3o..."), icon: "tune", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:size") }),
    ...ALIGNS2.map(([k2, en, pt, icon]) => s4({ id: `shp:align:${k2}`, label: L8(en, pt), icon, supports: has("alignShape"), isEnabled: floating, run: () => ed.alignShape(k2) })),
    s4({ id: "shp:layout", label: L8("Layout Options\u2026", "Layout..."), icon: "aspect_ratio", supports: has("setShapeLayout"), run: () => ctl.pictureDialog("layout:size") }),
    // ── Texto ──
    ...DIRS.map(([k2, en, pt, icon]) => s4({ id: `shp:dir:${k2}`, label: L8(en, pt), icon, supports: has("setTextboxOptions"), isEnabled: box, run: () => ed.setTextboxOptions({ direction: k2 }), isChecked: () => shp()?.text?.direction === k2 })),
    ...ANCHORS.map(([k2, en, pt, icon]) => s4({ id: `shp:anchor:${k2}`, label: L8(en, pt), icon, supports: has("setTextboxOptions"), isEnabled: box, run: () => ed.setTextboxOptions({ anchor: k2 }), isChecked: () => shp()?.text?.anchor === k2 })),
    s4({ id: "shp:textOptions", label: L8("Text Box Options\u2026", "Op\xE7\xF5es da Caixa de Texto..."), icon: "tune", supports: has("setTextboxOptions"), isEnabled: box, run: () => ctl.pictureDialog("format:layout") }),
    s4({
      id: "shp:link",
      label: L8("Create Link", "Criar V\xEDnculo"),
      tip: L8("Create Link: the text continues in the next text box you click (it must be empty)", "Criar V\xEDnculo: o texto continua na pr\xF3xima caixa de texto que voc\xEA clicar (ela precisa estar vazia)"),
      icon: "link",
      supports: has("createTextboxLink"),
      isEnabled: () => box() && !shp().link?.next,
      isChecked: () => typeof api["linkingTextbox"] === "function" && ed.linkingTextbox(),
      run: () => ed.linkingTextbox() ? ed.cancelTextboxLink() : ed.createTextboxLink()
    }),
    s4({ id: "shp:unlink", label: L8("Break Link", "Quebrar V\xEDnculo"), icon: "link_off", supports: has("breakTextboxLink"), isEnabled: () => box() && !!shp().link?.next, run: () => ed.breakTextboxLink() }),
    s4({ id: "shp:setDefault", label: L8("Set as Default Text Box", "Definir como Caixa de Texto Padr\xE3o"), icon: "check", supports: has("setAsDefaultTextbox"), isEnabled: box, run: () => ed.setAsDefaultTextbox() }),
    // ── Estilos de Forma ──
    s4({ id: "shp:fill:none", label: L8("No Fill", "Sem Preenchimento"), icon: "format_color_reset", supports: has("setShapeFill"), isEnabled: () => shp()?.kind !== "group", run: () => ed.setShapeFill(null), isChecked: () => shp()?.format && "fill" in shp().format ? shp().format.fill.kind === "none" : false }),
    s4({ id: "shp:outline:none", label: L8("No Outline", "Sem Contorno"), icon: "border_clear", supports: has("setShapeOutline"), isEnabled: () => shp()?.kind !== "group", run: () => ed.setShapeOutline({ color: null }), isChecked: () => shp()?.format.line?.fill === null }),
    { id: "shp:format", label: L8("Format Shape\u2026", "Formatar Forma..."), icon: "tune", supports: has("setShapeFormat"), isEnabled: on, run: () => ctl.pictureDialog("format:line") },
    s4({ id: "shp:editText", label: L8("Edit Text", "Editar Texto"), icon: "edit", supports: has("editSelectedTextbox"), isEnabled: () => box() && !shp().editingText, run: () => ed.editSelectedTextbox() }),
    s4({ id: "shp:delete", label: L8("Delete", "Excluir"), icon: "delete", supports: has("deleteSelectedShape"), run: () => ed.deleteSelectedShape() }),
    // ── Acessibilidade ──
    s4({ id: "shp:alt", label: L8("Alt Text", "Texto Alt"), tip: L8("Alt Text: describe the shape for people who use screen readers", "Texto Alt: descreva a forma para quem usa leitor de tela"), icon: "accessibility_new", supports: has("setShapeAltText"), run: () => ctl.pictureDialog("alt") })
  ];
  reg.add(...cmds);
}
function positionIcon2(v2, h3) {
  const x2 = h3 === "left" ? 240 : h3 === "center" ? 400 : 560, y3 = v2 === "top" ? -760 : v2 === "center" ? -560 : -360;
  return `<path d="M160-80v-800h640v800H160Zm60-60h520v-680H220v680Z"/><path d="M${x2} ${y3}h160v120H${x2}z"/>`;
}
var shapeWrapMenu = () => [...WRAPS2.map(([k2]) => `shp:wrap:${k2}`), "-", "shp:wrap:moveWithText", "shp:wrap:fixOnPage", "-", "shp:wrap:more"];
var shapePositionMenu = () => ["shp:pos:inline", "-", ...POSITION_PRESETS.map((q) => `shp:pos:${q.id}`), "-", "shp:pos:more"];
var shapeRotateMenu = () => ["shp:rotate:right", "shp:rotate:left", "shp:flip:v", "shp:flip:h", "-", "shp:rotate:more"];
var shapeAlignMenu = () => [...ALIGNS2.slice(0, 3).map(([k2]) => `shp:align:${k2}`), "-", ...ALIGNS2.slice(3).map(([k2]) => `shp:align:${k2}`), "-", "pic:align:to:page", "pic:align:to:margin"];
var dirMenu = () => [...DIRS.map(([k2]) => `shp:dir:${k2}`), "-", "shp:textOptions"];
var anchorMenu = () => [...ANCHORS.map(([k2]) => `shp:anchor:${k2}`), "-", "shp:textOptions"];
function colorIn(xml) {
  if (!xml) return null;
  const m2 = /<a:(schemeClr|srgbClr|prstClr|sysClr) val="([^"]+)"(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xml);
  if (!m2) return null;
  const mods = [...(m2[3] ?? "").matchAll(/<a:(\w+) val="(-?\d+)"\/>/g)].map((x2) => [x2[1], Number(x2[2])]);
  return { kind: m2[1], val: m2[2], ...mods.length ? { mods } : {} };
}
function styleLook(n5, hex) {
  const [sp, st] = SHAPE_STYLE_PRESETS[n5 - 1];
  const ref = (tag) => /<a:(\w+Ref) idx="(\w+)">([\s\S]*?)<\/a:\1>/g;
  const refs = /* @__PURE__ */ new Map();
  for (const m2 of st.matchAll(ref(""))) refs.set(m2[1], { idx: m2[2], color: colorIn(m2[3]) });
  const text = hex(refs.get("fontRef")?.color ?? { kind: "schemeClr", val: "dk1" }) ?? "000000";
  let fill = null, line2 = null, lw = 1;
  if (n5 <= 42) {
    const fr = refs.get("fillRef"), lr = refs.get("lnRef");
    const fc = fr?.color ? hex(fr.color) : void 0;
    if (fc && fr.idx !== "0") fill = fr.idx === "1" ? [fc] : [lighten(fc, fr.idx === "2" ? 0.35 : 0.2), fc];
    const lc = lr?.color ? hex(lr.color) : void 0;
    if (lc && lr.idx !== "0") {
      line2 = lc;
      lw = lr.idx === "3" ? 2 : 1;
    }
  } else {
    if (/^<a:solidFill>/.test(sp)) {
      const c4 = colorIn(sp);
      if (c4) fill = [hex(c4) ?? "FFFFFF"];
    } else if (/^<a:gradFill/.test(sp)) {
      const stops = [...sp.matchAll(/<a:gs pos="\d+">([\s\S]*?)<\/a:gs>/g)].map((g2) => colorIn(g2[1]));
      fill = stops.filter((c4) => !!c4).map((c4) => hex(c4) ?? "FFFFFF");
    }
    const ln = /<a:ln\b[^>]*?(?:w="(\d+)")?[^>]*>([\s\S]*?)<\/a:ln>/.exec(sp);
    if (ln && !/<a:noFill\/>/.test(ln[2])) {
      const c4 = colorIn(ln[2]);
      if (c4) {
        line2 = hex(c4) ?? null;
        lw = Math.max(1, Number(ln[1] ?? 12700) / 12700);
      }
    }
  }
  return { fill, line: line2, lw, text };
}
function lighten(hex, k2) {
  const n5 = parseInt(hex, 16);
  const ch = (s4) => Math.round((n5 >> s4 & 255) + (255 - (n5 >> s4 & 255)) * k2);
  return [16, 8, 0].map((s4) => ch(s4).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function styleThumb(tile, n5, hex) {
  const W = 56, H2 = 40, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c4 = document.createElement("canvas");
  c4.width = W * dpr;
  c4.height = H2 * dpr;
  c4.style.cssText = `width:${W}px;height:${H2}px;display:block;margin:auto`;
  const x2 = c4.getContext("2d");
  x2.scale(dpr, dpr);
  const lk = styleLook(n5, hex);
  const r5 = { x: 4, y: 4, w: W - 8, h: H2 - 8 };
  if (lk.fill?.length) {
    if (lk.fill.length > 1) {
      const g2 = x2.createLinearGradient(0, r5.y, 0, r5.y + r5.h);
      lk.fill.forEach((f3, i5) => g2.addColorStop(i5 / (lk.fill.length - 1), `#${f3}`));
      x2.fillStyle = g2;
    } else x2.fillStyle = `#${lk.fill[0]}`;
    x2.fillRect(r5.x, r5.y, r5.w, r5.h);
  }
  if (lk.line) {
    x2.strokeStyle = `#${lk.line}`;
    x2.lineWidth = lk.lw;
    x2.strokeRect(r5.x, r5.y, r5.w, r5.h);
  }
  x2.fillStyle = `#${lk.text}`;
  x2.font = "12px sans-serif";
  x2.textAlign = "center";
  x2.textBaseline = "middle";
  x2.fillText("Abc", W / 2, H2 / 2 + 1);
  tile.replaceChildren(c4);
}
function templateThumb(tile, id, ed, lang) {
  const W = 84, H2 = 108, dpr = Math.max(1, window.devicePixelRatio || 1);
  const c4 = document.createElement("canvas");
  c4.width = W * dpr;
  c4.height = H2 * dpr;
  c4.style.cssText = `width:${W}px;height:${H2}px;display:block;margin:auto`;
  const x2 = c4.getContext("2d");
  x2.scale(dpr, dpr);
  x2.fillStyle = "#ffffff";
  x2.fillRect(0, 0, W, H2);
  x2.strokeStyle = "#c8c8c8";
  x2.strokeRect(0.5, 0.5, W - 1, H2 - 1);
  const accent = ed.documentThemeColors()["accent1"] ?? "156082";
  const sp = textboxTemplateSpec(id, { accent, lang });
  if (sp) {
    const k2 = W / (8.5 * 914400);
    const mw = 6.5 * 914400 * k2, ml = 914400 * k2;
    let w2 = sp.sizeRelH ? sp.sizeRelH.pct / 1e5 * (sp.sizeRelH.relativeFrom === "page" ? W : mw) : sp.cx * k2;
    let h3 = sp.sizeRelV ? sp.sizeRelV.pct / 1e5 * H2 : Math.min(sp.cy * k2, H2 * 0.4);
    w2 = Math.min(w2, W);
    h3 = Math.min(h3, H2);
    const bx = sp.posH.relativeFrom === "page" ? sp.posH.align === "right" ? W - w2 : 0 : ml + (sp.posH.align === "right" ? mw - w2 : sp.posH.align === "center" ? (mw - w2) / 2 : 0);
    const by = sp.posV.relativeFrom === "page" ? 0 : 24;
    x2.fillStyle = "#d8d8d8";
    for (let ly = 14; ly < H2 - 10; ly += 7) {
      const inBox = ly >= by - 4 && ly <= by + h3 + 4;
      if (inBox && sp.wrap !== "none") {
        if (bx > ml + 8) x2.fillRect(ml, ly, bx - ml - 4, 2);
        if (bx + w2 < ml + mw - 8) x2.fillRect(bx + w2 + 4, ly, ml + mw - bx - w2 - 4, 2);
      } else x2.fillRect(ml, ly, mw, 2);
    }
    const hex = (cc) => ed.resolveDmlColor(cc);
    const f3 = sp.fill;
    x2.fillStyle = f3.kind === "solid" ? `#${hex(f3.color) ?? "ffffff"}` : "#ffffff";
    x2.fillRect(bx, by, w2, h3);
    if (sp.line) {
      x2.strokeStyle = `#${hex(sp.line.fill) ?? "000000"}`;
      x2.lineWidth = 1;
      x2.strokeRect(bx + 0.5, by + 0.5, w2 - 1, h3 - 1);
    }
    const dark = f3.kind === "solid" && /accent1"?$/.test(JSON.stringify(f3.color.val)) && !(f3.color.mods ?? []).length;
    x2.fillStyle = dark ? "rgba(255,255,255,.8)" : `#${accent}`;
    for (let ly = by + 6; ly < by + h3 - 4 && ly < by + 40; ly += 6) x2.fillRect(bx + 5, ly, Math.max(4, w2 - 10), 2);
  }
  tile.replaceChildren(c4);
}
function textboxMenu(env, ctx) {
  const ed = env.ed;
  const lang = ctx.lang === "pt" ? "pt" : "en";
  const all = ed.textboxTemplates();
  const mine = all.filter((t5) => t5.user);
  const isBox = () => typeof ed.selectedShape === "function" && ed.selectedShape()?.kind === "textbox" && !ed.isProtected();
  return [
    {
      content: (close) => tileGrid({
        sections: [
          { label: L8("Built-In", "Internos"), items: all.filter((t5) => !t5.user).map((t5) => ({ id: t5.id, label: t5.name })) },
          { label: L8("General", "Geral"), items: mine.map((t5) => ({ id: t5.id, label: t5.name })) }
        ],
        tile: { w: 92, h: 116 },
        cols: 3,
        close,
        text: (l3) => ctx.registry.text(l3),
        render: (tile, it) => it.id.startsWith("user:") ? userThumb(tile, it.label) : templateThumb(tile, it.id, ed, lang),
        onPick: (id) => {
          ed.insertTextbox(id);
          ctx.after();
        }
      })
    },
    "-",
    "textbox:draw",
    "textbox:drawVertical",
    {
      id: "textbox:save",
      label: L8("Save Selection to Text Box Gallery\u2026", "Salvar Sele\xE7\xE3o na Galeria de Caixas de Texto..."),
      icon: "save",
      disabled: !isBox(),
      onClick: () => {
        void promptDialog({ title: L8("Create New Building Block", "Criar Novo Bloco de Constru\xE7\xE3o"), label: L8("Name", "Nome"), value: ed.selectedShape()?.name ?? "", layer: env.root.querySelector(".uw-layer") ?? void 0, lang }).then((n5) => {
          if (n5 !== null) ed.saveSelectionToTextboxGallery(n5);
          ctx.after();
        });
      }
    },
    ...mine.length ? [{
      id: "textbox:remove",
      label: L8("Remove from Gallery", "Remover da Galeria"),
      icon: "delete",
      submenu: () => mine.map((t5) => ({ id: `textbox:rm:${t5.id}`, label: t5.name, onClick: () => {
        ed.removeTextboxGalleryItem(t5.id);
        ctx.after();
      } }))
    }] : []
  ];
}
function userThumb(tile, name) {
  tile.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:78px;height:96px;margin:auto;border:1px solid #c8c8c8;background:#fff;font-size:11px;color:#333;text-align:center;padding:4px;box-sizing:border-box;overflow:hidden">${name.replace(/[&<>"]/g, (c4) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c4])}</span>`;
}
function fillMenu(env, ctx) {
  const ed = env.ed;
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            ed.setShapeFill(dmlFromPick(v2, colors));
            ctx.after();
          }
        });
      }
    },
    "shp:fill:none",
    {
      id: "shp:fill:more",
      label: L8("More Fill Colors\u2026", "Mais Cores de Preenchimento..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setShapeFill({ kind: "srgbClr", val: inp.value.slice(1).toUpperCase() });
          ctx.after();
        });
        inp.click();
      }
    },
    { id: "shp:fill:picture", label: L8("Picture\u2026", "Imagem..."), icon: "image", onClick: () => pickImage2((d3, ext) => {
      void ed.setShapePictureFill(d3, ext, false).then(() => ctx.after());
    }) },
    {
      id: "shp:fill:gradient",
      label: L8("Gradient", "Gradiente"),
      icon: "format_color_fill",
      submenu: () => [{
        content: (close) => {
          const vars = ed.shapeGradientVariations();
          return tileGrid({
            sections: [
              { label: L8("Light Variations", "Varia\xE7\xF5es Claras"), items: vars.filter((v2) => !v2.dark).map((v2) => ({ id: v2.id, label: L8(v2.id, v2.id) })) },
              { label: L8("Dark Variations", "Varia\xE7\xF5es Escuras"), items: vars.filter((v2) => v2.dark).map((v2) => ({ id: v2.id, label: L8(v2.id, v2.id) })) }
            ],
            tile: { w: 40, h: 40 },
            cols: 4,
            close,
            text: (l3) => ctx.registry.text(l3),
            render: (tile, it) => {
              const v2 = vars.find((q) => q.id === it.id);
              const f3 = v2.fill;
              const cs = f3.stops.map((st) => `#${ed.resolveDmlColor(st.color) ?? "ffffff"}`);
              const deg = 90 + (f3.lin?.ang ?? 0) / 6e4;
              tile.innerHTML = `<span style="display:block;width:30px;height:30px;margin:auto;background:linear-gradient(${deg}deg,${cs.join(",")})"></span>`;
            },
            onPick: (id) => {
              const v2 = vars.find((q) => q.id === id);
              if (v2) ed.setShapeFill(v2.fill);
              ctx.after();
            }
          });
        }
      }, "-", { id: "shp:fill:gradOptions", label: L8("More Gradients\u2026", "Mais Gradientes..."), icon: "tune", onClick: () => env.ctl.pictureDialog("format:line") }]
    },
    { id: "shp:fill:texture", label: L8("Texture\u2026", "Textura..."), icon: "grid_on", onClick: () => pickImage2((d3, ext) => {
      void ed.setShapePictureFill(d3, ext, true).then(() => ctx.after());
    }) }
  ];
}
function outlineMenu(env, ctx) {
  const ed = env.ed;
  const st = () => ed.selectedShape();
  return [
    {
      content: (close) => {
        const colors = ed.documentThemeColors();
        return colorGrid({
          colors: [...themePaletteColors(colors), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            ed.setShapeOutline({ color: dmlFromPick(v2, colors) });
            ctx.after();
          }
        });
      }
    },
    "shp:outline:none",
    {
      id: "shp:outline:more",
      label: L8("More Outline Colors\u2026", "Mais Cores de Contorno..."),
      icon: "palette",
      onClick: () => {
        const inp = document.createElement("input");
        inp.type = "color";
        inp.addEventListener("change", () => {
          ed.setShapeOutline({ color: { kind: "srgbClr", val: inp.value.slice(1).toUpperCase() } });
          ctx.after();
        });
        inp.click();
      }
    },
    "-",
    {
      id: "shp:outline:weight",
      label: L8("Weight", "Espessura"),
      icon: "line_weight",
      submenu: () => LINE_WEIGHTS_PT.map((w2) => ({
        id: `shp:outline:w:${w2}`,
        label: `${String(w2).replace(".", ctx.registry.text(L8(".", ",")))} pt`,
        checked: !!st()?.format.line?.fill && Math.abs((st().format.line.w ?? 9525) / 12700 - w2) < 0.01,
        onClick: () => {
          ed.setShapeOutline({ weightPt: w2 });
          ctx.after();
        }
      }))
    },
    {
      id: "shp:outline:dash",
      label: L8("Dashes", "Tracejados"),
      icon: "line_style",
      submenu: () => LINE_DASHES.map((d3) => ({
        id: `shp:outline:d:${d3.val}`,
        label: d3.label,
        checked: (st()?.format.line?.dash ?? "solid") === d3.val,
        onClick: () => {
          ed.setShapeOutline({ dash: d3.val });
          ctx.after();
        }
      }))
    }
  ];
}
function changeShapeMenu(env, ctx) {
  return [{
    id: "shp:change",
    label: L8("Change Shape", "Alterar Forma"),
    icon: "shapes",
    submenu: () => [{
      content: (close) => tileGrid({
        sections: CROP_SHAPES.map((g2) => ({ label: g2.label, items: g2.shapes.map(([prst, en, pt]) => ({ id: prst, label: L8(en, pt) })) })),
        tile: { w: 30, h: 26 },
        cols: 10,
        close,
        text: (l3) => ctx.registry.text(l3),
        render: (tile, it) => shapeThumb(tile, it.id),
        onPick: (id) => {
          env.ed.changeShape(id);
          ctx.after();
        }
      })
    }]
  }];
}
function shapeStylesGallery(env) {
  const ed = env.ed;
  const items = () => SHAPE_STYLE_PRESETS.map((_2, i5) => ({ id: String(i5 + 1), label: L8(`Style ${i5 + 1}`, `Estilo ${i5 + 1}`), section: i5 < 42 ? "theme" : "presets" }));
  return {
    gallery: {
      id: "shp:styles",
      label: L8("Shape Styles", "Estilos de Forma"),
      icon: "style",
      tile: { w: 60, h: 44 },
      rows: 1,
      maxCols: 6,
      minCols: 3,
      expandCols: 7,
      sections: [{ id: "theme", label: L8("Theme Styles", "Estilos do Tema") }, { id: "presets", label: L8("Presets", "Predefini\xE7\xF5es") }],
      supports: () => typeof ed.setShapeStyle === "function",
      isEnabled: () => !ed.isProtected() && !!ed.selectedShape() && ed.selectedShape().kind !== "group",
      items,
      version: () => JSON.stringify(ed.documentThemeColors()),
      selected: () => {
        const n5 = ed.selectedShape()?.styleIndex;
        return n5 ? String(n5) : void 0;
      },
      render: (tile, it) => styleThumb(tile, Number(it.id), (c4) => ed.resolveDmlColor(c4)),
      onPick: (id) => ed.setShapeStyle(Number(id)),
      footer: () => ["shp:format"]
    }
  };
}
var measureWidget3 = (env, which) => ({
  widget: (ctx) => {
    const wrap = document.createElement("span");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px";
    const ic = document.createElement("span");
    ic.innerHTML = symbol(which);
    ic.style.cssText = "display:inline-flex;opacity:.8";
    const input = document.createElement("input");
    input.className = "uo-num";
    input.inputMode = "decimal";
    input.style.width = "64px";
    input.title = ctx.registry.text(which === "height" ? L8("Shape Height", "Altura da Forma") : L8("Shape Width", "Largura da Forma"));
    input.setAttribute("aria-label", input.title);
    const dec = ctx.registry.text(L8(".", ","));
    const cm = (pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", dec)} cm`;
    const ptOf3 = (v2) => {
      const n5 = parseFloat(v2.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n5) ? n5 / 2.54 * 72 : void 0;
    };
    const cur = () => {
      const s4 = env.ed.selectedShape();
      return s4 ? which === "height" ? s4.heightPt : s4.widthPt : 0;
    };
    const set = (v2) => {
      env.ed.setShapeSize(which === "height" ? { heightPt: Math.max(0.1, v2) } : { widthPt: Math.max(0.1, v2) });
      ctx.after();
    };
    const apply = () => {
      const v2 = ptOf3(input.value);
      if (v2 !== void 0) set(v2);
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        apply();
      }
    });
    const up = document.createElement("button"), dn = document.createElement("button");
    for (const [b3, d3, sy] of [[up, 1, "keyboard_arrow_up"], [dn, -1, "keyboard_arrow_down"]]) {
      b3.type = "button";
      b3.className = "uo-btn";
      b3.style.cssText = "width:18px;height:14px;min-width:0;padding:0";
      b3.innerHTML = symbol(sy);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => set(cur() + d3 * (72 / 25.4)));
    }
    const arrows = document.createElement("span");
    arrows.style.cssText = "display:inline-flex;flex-direction:column";
    arrows.append(up, dn);
    wrap.append(ic, input, arrows);
    return {
      el: wrap,
      visible: () => typeof env.ed.selectedShape === "function",
      sync: () => {
        const s4 = env.ed.selectedShape();
        input.disabled = up.disabled = dn.disabled = !s4 || env.ed.isProtected();
        if (document.activeElement !== input && env.ed.shadowRoot?.activeElement !== input) input.value = s4 ? cm(which === "height" ? s4.heightPt : s4.widthPt) : "";
      }
    };
  }
});
var large2 = (cmd) => ({ cmd, size: "large" });
function shapeFormatGroups(env, ctx) {
  const has = (m2) => () => typeof env.ed[m2] === "function";
  return [
    { id: "shp-insert", label: L8("Insert Shapes", "Inserir Formas"), icon: "shapes", prio: 4, cells: [
      { rows: [
        [{ menu: () => changeShapeMenu(env, ctx), id: "shp:edit", label: L8("Edit Shape", "Editar Forma"), icon: "format_shapes", showLabel: true, supports: has("changeShape") }],
        [{ split: "textbox:draw", menu: ["textbox:draw", "textbox:drawVertical"], label: true }]
      ] }
    ] },
    { id: "shp-styles", label: L8("Shape Styles", "Estilos de Forma"), icon: "style", prio: 6, launcher: "shp:format", cells: [
      shapeStylesGallery(env),
      { rows: [
        [{ menu: () => fillMenu(env, ctx), id: "shp:fill", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", showLabel: true, supports: has("setShapeFill") }],
        [{ menu: () => outlineMenu(env, ctx), id: "shp:outline", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", showLabel: true, supports: has("setShapeOutline") }],
        [{ menu: () => effectsMenu(env, ctx, true), id: "shp:effects", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", showLabel: true, supports: has("setShapeEffect") }]
      ] }
    ] },
    { id: "shp-text", label: L8("Text", "Texto"), icon: "text_fields", prio: 5, cells: [
      { rows: [
        [{ menu: dirMenu, id: "shp:dir", label: L8("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", showLabel: true, supports: has("setTextboxOptions") }],
        [{ menu: anchorMenu, id: "shp:anchor", label: L8("Align Text", "Alinhar Texto"), icon: "vertical_align_center", showLabel: true, supports: has("setTextboxOptions") }],
        [{ cmd: "shp:link", label: true }, { cmd: "shp:unlink" }]
      ] }
    ] },
    { id: "shp-access", label: L8("Accessibility", "Acessibilidade"), icon: "accessibility_new", prio: 3, cells: [large2("shp:alt")] },
    { id: "shp-arrange", label: L8("Arrange", "Organizar"), icon: "layers", prio: 6, cells: [
      { menu: shapePositionMenu, id: "shp:position", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", size: "large", supports: has("setShapePosition") },
      { menu: shapeWrapMenu, id: "shp:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", size: "large", supports: has("setShapeWrap") },
      { rows: [
        [{ split: "shp:forward", menu: ["shp:forward", "shp:front", "shp:frontOfText"], label: true }],
        [{ split: "shp:backward", menu: ["shp:backward", "shp:back", "shp:behindText"], label: true }]
      ] },
      { rows: [
        [{ cmd: "pic:selectionPane", label: true }],
        [{ menu: shapeAlignMenu, id: "shp:align", label: L8("Align", "Alinhar"), icon: "align_horizontal_left", showLabel: true, supports: has("alignShape") }],
        [{ menu: shapeRotateMenu, id: "shp:rotate", label: L8("Rotate", "Girar"), icon: "rotate_90_degrees_cw", showLabel: true, supports: has("rotateShape") }]
      ] }
    ] },
    { id: "shp-size", label: L8("Size", "Tamanho"), icon: "aspect_ratio", prio: 5, launcher: "shp:layout", cells: [
      { rows: [[measureWidget3(env, "height")], [measureWidget3(env, "width")]] }
    ] }
  ];
}
function shapeCompactGroup(env, ctx) {
  const sel4 = () => typeof env.ed.selectedShape === "function" && !!env.ed.selectedShape();
  return {
    id: "shape",
    label: L8("Shape", "Forma"),
    icon: "format_shapes",
    prio: 7,
    items: [
      { menu: () => fillMenu(env, ctx), id: "shp:fill", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", supports: sel4 },
      { menu: () => outlineMenu(env, ctx), id: "shp:outline", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", supports: sel4 },
      { menu: () => effectsMenu(env, ctx, true), id: "shp:effects", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", supports: sel4 },
      { menu: () => [...dirMenu(), "-", ...anchorMenu(), "-", "shp:link", "shp:unlink"], id: "shp:text", label: L8("Text", "Texto"), icon: "text_fields", supports: sel4 },
      { menu: shapeWrapMenu, id: "shp:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", supports: sel4 },
      { menu: shapePositionMenu, id: "shp:position", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", supports: sel4 },
      { menu: () => ["shp:forward", "shp:front", "shp:frontOfText", "-", "shp:backward", "shp:back", "shp:behindText"], id: "shp:order", label: L8("Arrange", "Organizar"), icon: "layers", supports: sel4 },
      { cmd: "shp:format" }
    ]
  };
}
function shapeMenu(env, ctx) {
  return {
    id: "shp:menu",
    label: L8("Shape", "Forma"),
    icon: "format_shapes",
    submenu: () => [
      { id: "shp:fillSub", label: L8("Shape Fill", "Preenchimento da Forma"), icon: "format_color_fill", submenu: () => fillMenu(env, ctx) },
      { id: "shp:outlineSub", label: L8("Shape Outline", "Contorno da Forma"), icon: "border_color", submenu: () => outlineMenu(env, ctx) },
      { id: "shp:effectsSub", label: L8("Shape Effects", "Efeitos de Forma"), icon: "auto_awesome", submenu: () => effectsMenu(env, ctx, true) },
      ...changeShapeMenu(env, ctx),
      "-",
      { id: "shp:dirSub", label: L8("Text Direction", "Dire\xE7\xE3o do Texto"), icon: "text_rotate_vertical", submenu: dirMenu },
      { id: "shp:anchorSub", label: L8("Align Text", "Alinhar Texto"), icon: "vertical_align_center", submenu: anchorMenu },
      "shp:link",
      "shp:unlink",
      "-",
      { id: "shp:wrapSub", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: shapeWrapMenu },
      { id: "shp:posSub", label: L8("Position", "Posi\xE7\xE3o"), icon: "picture_in_picture", submenu: shapePositionMenu },
      { id: "shp:rotSub", label: L8("Rotate", "Girar"), icon: "rotate_90_degrees_cw", submenu: shapeRotateMenu },
      "-",
      "shp:alt",
      "shp:layout",
      "shp:format",
      "-",
      "shp:delete"
    ]
  };
}
function shapeContextItems() {
  return [
    "cut",
    "copy",
    "paste",
    "-",
    "shp:editText",
    { id: "shp:ctx:front", label: L8("Bring to Front", "Trazer para a Frente"), icon: "flip_to_front", submenu: ["shp:front", "shp:forward", "shp:frontOfText"] },
    { id: "shp:ctx:back", label: L8("Send to Back", "Enviar para Tr\xE1s"), icon: "flip_to_back", submenu: ["shp:back", "shp:backward", "shp:behindText"] },
    "-",
    "shp:link",
    "shp:unlink",
    { id: "shp:ctx:wrap", label: L8("Wrap Text", "Quebra de Texto Autom\xE1tica"), icon: "wrap_text", submenu: shapeWrapMenu },
    "shp:alt",
    "shp:setDefault",
    "shp:layout",
    "shp:format",
    "-",
    "shp:delete"
  ];
}

// src/chrome-commands.ts
var ZOOMS = [50, 75, 90, 100, 125, 150, 200];
function registerWriteCommands(reg, ed, app, ctl) {
  const api = ed;
  const has = (m2) => () => typeof api[m2] === "function";
  const call = (m2, ...args) => api[m2].apply(ed, args);
  const canEdit3 = () => !app.comparing && !ed.isProtected();
  const notComparing = () => !app.comparing;
  const run = () => ctl.state().run;
  const para = () => ctl.state().para;
  const L11 = app.ui.L;
  const markup = () => typeof api["getMarkupOptions"] === "function" ? call("getMarkupOptions") : { insertionsDeletions: true, formatting: true, balloons: "mixed", authors: null };
  const hasRevisions = () => typeof api["getRevisions"] === "function" && call("getRevisions").length > 0;
  const resolved = (n5, accept) => {
    ctl.flash(accept ? L11.revAccepted(Number(n5) || 0) : L11.revRejected(Number(n5) || 0));
  };
  const edit = (c4) => ({ ...c4, isEnabled: c4.isEnabled ? () => canEdit3() && c4.isEnabled() : canEdit3 });
  const bodyOnly = () => ed.editingHeaderFooter() === null && !ed.editingTextbox() && !ed.editingTableCell();
  const section4 = () => typeof api["getSection"] === "function" ? call("getSection") : null;
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
    { id: "replace", label: { en: "Replace", pt: "Substituir" }, icon: "find_replace", shortcut: "Ctrl+H", run: () => ctl.find(true), isEnabled: canEdit3 },
    edit({ id: "painter", label: { en: "Format Painter", pt: "Pincel de Formata\xE7\xE3o" }, icon: "format_paint", run: () => ed.copyFormat(), isChecked: () => ed.painterActive() }),
    // ── Exibir ──
    ...["print", "web", "read", "outline", "draft"].map((v2) => ({
      id: `view:${v2}`,
      label: {
        print: { en: "Print Layout", pt: "Layout de Impress\xE3o" },
        web: { en: "Web Layout", pt: "Layout da Web" },
        read: { en: "Read Mode", pt: "Modo de Leitura" },
        outline: { en: "Outline", pt: "Estrutura de T\xF3picos" },
        draft: { en: "Draft", pt: "Rascunho" }
      }[v2],
      icon: { print: "article", web: "language", read: "menu_book", outline: "format_list_bulleted", draft: "notes" }[v2],
      run: () => ed.setView(v2),
      isChecked: () => ed.getView() === v2,
      isEnabled: notComparing
    })),
    // Mostrar (Exibir): Régua, Linhas de Grade e Painel de Navegação
    { id: "view:ruler", label: { en: "Ruler", pt: "R\xE9gua" }, tip: { en: "Show the rulers to measure and line up objects, indents and tabs", pt: "Mostra as r\xE9guas para medir e alinhar objetos, recuos e tabula\xE7\xF5es" }, icon: "straighten", supports: has("getRulerInfo"), run: () => ctl.ruler(), isChecked: () => ctl.rulerOn() },
    { id: "view:gridlines", label: { en: "Gridlines", pt: "Linhas de Grade" }, tip: { en: "Show the document grid on the page", pt: "Mostra a grade do documento na p\xE1gina" }, icon: "grid_4x4", supports: has("showGridlines"), run: () => ctl.gridlines(), isChecked: () => ed.gridlinesShown() },
    { id: "view:bookmarks", label: { en: "Bookmarks", pt: "Indicadores" }, tip: { en: "Show bookmarks (gray brackets on the screen)", pt: "Mostrar indicadores (colchetes cinza na tela)" }, icon: "bookmarks", supports: has("showBookmarks"), run: () => {
      ed.showBookmarks();
    }, isChecked: () => ed.bookmarksShown() },
    { id: "view:navpane", label: { en: "Navigation Pane", pt: "Painel de Navega\xE7\xE3o" }, tip: { en: "Headings, pages and search results of the document", pt: "T\xEDtulos, p\xE1ginas e resultados da pesquisa no documento" }, icon: "side_navigation", supports: has("getHeadings"), run: () => ctl.navPane(), isChecked: () => ctl.navPaneOpen() },
    { id: "focus", label: { en: "Focus", pt: "Foco" }, tip: { en: "Focus mode \u2014 full screen (Esc to exit)", pt: "Modo foco \u2014 tela inteira (Esc para sair)" }, icon: "center_focus_strong", run: () => ctl.focusMode(), isChecked: () => ctl.inFocusMode() },
    { id: "marks", label: { en: "Formatting marks", pt: "Mostrar tudo" }, tip: { en: "Show paragraph marks and other formatting symbols", pt: "Mostrar marcas de par\xE1grafo e outros s\xEDmbolos de formata\xE7\xE3o" }, icon: "format_paragraph", shortcut: "Ctrl+Shift+8", run: () => ed.toggleMarks(), isChecked: () => ctl.state().marks },
    { id: "comments", label: { en: "Show comments", pt: "Mostrar coment\xE1rios" }, icon: "comment", run: () => ctl.toggleComments(), isChecked: () => app.commentsVisible, supports: () => true },
    { id: "zoomin", label: { en: "Zoom in", pt: "Ampliar" }, icon: "zoom_in", run: () => ed.setZoom(Math.min(5, Math.round(ed.getZoom() * 110) / 100)) },
    { id: "zoomout", label: { en: "Zoom out", pt: "Reduzir" }, icon: "zoom_out", run: () => ed.setZoom(Math.max(0.1, Math.round(ed.getZoom() / 1.1 * 100) / 100)) },
    { id: "zoom100", label: { en: "100%", pt: "100%" }, tip: { en: "Zoom to 100%", pt: "Zoom em 100%" }, icon: "search", run: () => ed.setZoom(1) },
    { id: "toolbar:ribbon", label: { en: "Ribbon", pt: "Faixa de op\xE7\xF5es" }, icon: "view_compact_alt", run: () => ctl.setToolbarMode("ribbon"), isChecked: () => ctl.toolbarMode() === "ribbon" },
    { id: "toolbar:compact", label: { en: "Compact toolbar", pt: "Barra compacta" }, icon: "toolbar", run: () => ctl.setToolbarMode("compact"), isChecked: () => ctl.toolbarMode() === "compact" },
    { id: "statusbar", label: { en: "Status bar", pt: "Barra de status" }, icon: "call_to_action", run: () => {
      ed.bottombar = !ed.bottombar;
    }, isChecked: () => ed.bottombar },
    // ── Inserir ──
    edit({ id: "image", label: { en: "Image\u2026", pt: "Imagem\u2026" }, tip: { en: "Insert image", pt: "Inserir imagem" }, icon: "image", run: () => ctl.image() }),
    edit({ id: "link", label: { en: "Link\u2026", pt: "Link\u2026" }, tip: { en: "Insert link", pt: "Inserir link" }, icon: "link", shortcut: "Ctrl+K", run: () => ctl.link(), isChecked: () => !!run().link, isEnabled: () => ed.canInsertField() }),
    edit({ id: "comment", label: { en: "Comment", pt: "Coment\xE1rio" }, tip: { en: "New comment", pt: "Novo coment\xE1rio" }, icon: "add_comment", shortcut: "Ctrl+Alt+M", run: () => ctl.comment() }),
    edit({ id: "pagebreak", label: { en: "Page break", pt: "Quebra de p\xE1gina" }, icon: "insert_page_break", shortcut: "Ctrl+Enter", run: () => ed.insertPageBreak(), isEnabled: () => bodyOnly() }),
    edit({ id: "field:page", label: { en: "Page number", pt: "N\xFAmero da p\xE1gina" }, icon: "numbers", run: () => ed.insertField("PAGE") }),
    edit({ id: "field:numpages", label: { en: "Page count", pt: "N\xFAmero de p\xE1ginas" }, icon: "filter_none", run: () => ed.insertField("NUMPAGES") }),
    edit({ id: "field:date", label: { en: "Date", pt: "Data" }, tip: { en: "Insert date field", pt: "Inserir campo de data" }, icon: "calendar_today", run: () => ed.insertField("DATE") }),
    edit({ id: "header", label: { en: "Header", pt: "Cabe\xE7alho" }, icon: "vertical_align_top", run: () => ed.enterHeaderFooter("header") }),
    edit({ id: "footer", label: { en: "Footer", pt: "Rodap\xE9" }, icon: "vertical_align_bottom", run: () => ed.enterHeaderFooter("footer") }),
    { id: "hf:close", label: { en: "Close Header and Footer", pt: "Fechar Cabe\xE7alho e Rodap\xE9" }, icon: "close", run: () => ed.exitHeaderFooter(), isEnabled: () => ed.editingHeaderFooter() !== null },
    // frentes futuras: aparecem quando o método existir (tabela: chrome-table.ts)
    edit({ id: "footnote", label: { en: "Footnote", pt: "Nota de rodap\xE9" }, tip: { en: "Insert footnote", pt: "Inserir nota de rodap\xE9" }, icon: "notes", shortcut: "Ctrl+Alt+F", supports: has("insertFootnote"), isEnabled: () => ed.canInsertNote(), run: () => call("insertFootnote") }),
    edit({ id: "endnote", label: { en: "Endnote", pt: "Nota de fim" }, tip: { en: "Insert endnote", pt: "Inserir nota de fim" }, icon: "short_text", shortcut: "Ctrl+Alt+D", supports: has("insertEndnote"), isEnabled: () => ed.canInsertNote(), run: () => call("insertEndnote") }),
    // notas: navegar, mostrar, opções e converter
    { id: "note:next", label: { en: "Next Footnote", pt: "Pr\xF3xima Nota de Rodap\xE9" }, tip: { en: "Go to the next footnote", pt: "Ir para a pr\xF3xima nota de rodap\xE9" }, icon: "keyboard_arrow_down", supports: has("nextNote"), isEnabled: () => ed.noteCount("footnote") > 0, run: () => {
      ed.nextNote("footnote", 1);
    } },
    { id: "note:prev", label: { en: "Previous Footnote", pt: "Nota de Rodap\xE9 Anterior" }, icon: "keyboard_arrow_up", supports: has("nextNote"), isEnabled: () => ed.noteCount("footnote") > 0, run: () => {
      ed.nextNote("footnote", -1);
    } },
    { id: "note:nextEnd", label: { en: "Next Endnote", pt: "Pr\xF3xima Nota de Fim" }, icon: "keyboard_arrow_down", supports: has("nextNote"), isEnabled: () => ed.noteCount("endnote") > 0, run: () => {
      ed.nextNote("endnote", 1);
    } },
    { id: "note:prevEnd", label: { en: "Previous Endnote", pt: "Nota de Fim Anterior" }, icon: "keyboard_arrow_up", supports: has("nextNote"), isEnabled: () => ed.noteCount("endnote") > 0, run: () => {
      ed.nextNote("endnote", -1);
    } },
    { id: "note:show", label: { en: "Show Notes", pt: "Mostrar Notas" }, tip: { en: "Go from the reference to the note and back", pt: "Vai da refer\xEAncia \xE0 nota e volta" }, icon: "visibility", supports: has("showNotes"), isEnabled: () => ed.noteCount("footnote") + ed.noteCount("endnote") > 0, run: () => ctl.showNotes() },
    edit({ id: "dlg:notes", label: { en: "Footnote and Endnote\u2026", pt: "Notas de Rodap\xE9 e de Fim\u2026" }, tip: { en: "Location, number format and numbering of the notes", pt: "Local, formato e numera\xE7\xE3o das notas" }, icon: "notes", supports: has("setNoteOptions"), run: () => ctl.notesDialog() }),
    edit({ id: "note:convert", label: { en: "Convert Notes\u2026", pt: "Converter Notas\u2026" }, icon: "autorenew", supports: has("convertNotes"), isEnabled: () => ed.noteCount("footnote") + ed.noteCount("endnote") > 0, run: () => ctl.convertNotesDialog() }),
    { id: "note:goRef", label: { en: "Go to Reference", pt: "Ir para a Refer\xEAncia" }, icon: "keyboard_arrow_up", supports: () => !!ed.editingNote(), run: () => {
      const n5 = ed.editingNote();
      if (n5) ed.goToNoteRef(n5.kind, n5.id);
    } },
    edit({ id: "note:toEndnote", label: { en: "Convert to Endnote", pt: "Converter em Nota de Fim" }, icon: "autorenew", supports: () => ed.editingNote()?.kind === "footnote", run: () => {
      const n5 = ed.editingNote();
      if (n5) ed.convertNotes("toEndnotes", n5);
    } }),
    edit({ id: "note:toFootnote", label: { en: "Convert to Footnote", pt: "Converter em Nota de Rodap\xE9" }, icon: "autorenew", supports: () => ed.editingNote()?.kind === "endnote", run: () => {
      const n5 = ed.editingNote();
      if (n5) ed.convertNotes("toFootnotes", n5);
    } }),
    edit({ id: "bookmark", label: { en: "Bookmark", pt: "Indicador" }, tip: { en: "Add, delete or go to a bookmark", pt: "Adicionar, excluir ou ir para um indicador" }, icon: "bookmark", supports: has("insertBookmark"), run: () => ctl.refsDialog("bookmark") }),
    // links e referências: Referência Cruzada, Legenda, Índice de Ilustrações
    edit({ id: "crossref", label: { en: "Cross-reference", pt: "Refer\xEAncia Cruzada" }, tip: { en: "Refer to a heading, numbered item, bookmark, note or caption", pt: "Referir-se a t\xEDtulo, item numerado, indicador, nota ou legenda" }, icon: "arrow_outward", supports: has("insertCrossReference"), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog("crossref") }),
    edit({ id: "caption", label: { en: "Insert Caption", pt: "Inserir Legenda" }, tip: { en: "Add a numbered caption to a picture, table or equation", pt: "Adicionar uma legenda numerada a imagem, tabela ou equa\xE7\xE3o" }, icon: "subtitles", supports: has("insertCaption"), isEnabled: () => !!ed.captionTarget() || ed.canInsertField(), run: () => ctl.refsDialog("caption") }),
    edit({ id: "tof", label: { en: "Insert Table of Figures", pt: "Inserir \xCDndice de Ilustra\xE7\xF5es" }, tip: { en: "List of the captions of a label", pt: "Lista das legendas de um r\xF3tulo" }, icon: "list_alt", supports: has("insertTableOfFigures"), isEnabled: () => ed.canInsertField(), run: () => ctl.refsDialog("tof") }),
    edit({ id: "tof:update", label: { en: "Update Table", pt: "Atualizar Tabela" }, tip: { en: "Update the table of figures", pt: "Atualizar o \xEDndice de ilustra\xE7\xF5es" }, icon: "autorenew", supports: has("updateTableOfFigures"), run: () => {
      if (!ed.updateTableOfFigures()) ctl.flash(L11.noTof);
    } }),
    edit({ id: "textbox", label: { en: "Text box", pt: "Caixa de texto" }, icon: "text_fields", supports: has("insertTextbox"), run: () => call("insertTextbox") }),
    // quebras de seção/coluna: só no corpo (cabeçalho/rodapé, caixa e célula não)
    ...[
      ["sectionbreak", "nextPage", "Section break (next page)", "Quebra de se\xE7\xE3o (pr\xF3xima p\xE1gina)", "Start the new section on the next page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina", "insert_page_break"],
      ["sectionbreak:continuous", "continuous", "Section break (continuous)", "Quebra de se\xE7\xE3o (cont\xEDnua)", "Start the new section on the same page", "Come\xE7a a se\xE7\xE3o nova na mesma p\xE1gina", "horizontal_split"],
      ["sectionbreak:evenPage", "evenPage", "Section break (even page)", "Quebra de se\xE7\xE3o (p\xE1gina par)", "Start the new section on the next even-numbered page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina par", "looks_two"],
      ["sectionbreak:oddPage", "oddPage", "Section break (odd page)", "Quebra de se\xE7\xE3o (p\xE1gina \xEDmpar)", "Start the new section on the next odd-numbered page", "Come\xE7a a se\xE7\xE3o nova na pr\xF3xima p\xE1gina \xEDmpar", "looks_one"]
    ].map(([id, type, en, pt, ten, tpt, icon]) => edit({
      id,
      label: { en, pt },
      tip: { en: ten, pt: tpt },
      icon,
      supports: has("insertSectionBreak"),
      run: () => call("insertSectionBreak", type),
      isEnabled: bodyOnly
    })),
    edit({ id: "columnbreak", label: { en: "Column break", pt: "Quebra de coluna" }, tip: { en: "Text after the break starts in the next column", pt: "O texto depois da quebra come\xE7a na pr\xF3xima coluna" }, icon: "view_column", shortcut: "Ctrl+Shift+Enter", supports: has("insertColumnBreak"), run: () => call("insertColumnBreak"), isEnabled: bodyOnly }),
    // colunas (galeria do grupo Configurar Página)
    ...[
      ["one", "One", "Uma", "crop_portrait"],
      ["two", "Two", "Duas", "view_column_2"],
      ["three", "Three", "Tr\xEAs", "view_column"],
      ["left", "Left", "Esquerda", "splitscreen_left"],
      ["right", "Right", "Direita", "splitscreen_right"]
    ].map(([p3, en, pt, icon]) => edit({
      id: `columns:${p3}`,
      label: { en, pt },
      icon,
      supports: has("setColumns"),
      run: () => call("setColumns", p3),
      isChecked: () => section4()?.columns.preset === p3
    })),
    edit({ id: "dlg:columns", label: { en: "More Columns\u2026", pt: "Mais Colunas\u2026" }, tip: { en: "Number, width and spacing of the columns", pt: "N\xFAmero, largura e espa\xE7amento das colunas" }, icon: "view_week", supports: has("setColumns"), run: () => ctl.columnsDialog() }),
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
    edit({ id: "clear", label: { en: "Clear All Formatting", pt: "Limpar Toda a Formata\xE7\xE3o" }, icon: "format_clear", run: () => ed.clearFormatting() }),
    edit({ id: "dlg:font", label: { en: "Font\u2026", pt: "Fonte\u2026" }, tip: { en: "Font settings", pt: "Configura\xE7\xF5es de fonte" }, icon: "text_format", shortcut: "Ctrl+D", run: () => ctl.fontDialog() }),
    // ── Estilos (chrome-styles.ts) ──
    { id: "styles:pane", label: { en: "Styles pane", pt: "Painel de Estilos" }, tip: { en: "Styles (Ctrl+Alt+Shift+S)", pt: "Estilos (Ctrl+Alt+Shift+S)" }, icon: "view_sidebar", shortcut: "Ctrl+Alt+Shift+S", supports: has("listStyles"), run: () => ctl.stylesPane(), isChecked: () => ctl.stylesPaneOpen() },
    { id: "style:inspector", label: { en: "Style Inspector", pt: "Inspetor de Estilo" }, icon: "manage_search", supports: has("inspectStyle"), run: () => ctl.styleInspector(), isChecked: () => ctl.inspectorOpen() },
    edit({ id: "style:new", label: { en: "New style\u2026", pt: "Novo estilo\u2026" }, tip: { en: "Create a style from the formatting of the selection", pt: "Cria um estilo com a formata\xE7\xE3o da sele\xE7\xE3o" }, icon: "add", supports: has("createStyle"), run: () => ctl.newStyle() }),
    edit({ id: "style:modifyCurrent", label: { en: "Modify style\u2026", pt: "Modificar estilo\u2026" }, tip: { en: "Modify the style of the current paragraph", pt: "Modifica o estilo do par\xE1grafo atual" }, icon: "edit", supports: has("modifyStyle"), run: () => ctl.modifyStyle() }),
    edit({ id: "style:updateCurrent", label: { en: "Update style to match selection", pt: "Atualizar estilo para corresponder \xE0 sele\xE7\xE3o" }, icon: "refresh", supports: has("updateStyleFromSelection"), run: () => ed.updateStyleFromSelection() }),
    edit({ id: "style:normal", label: { en: "Normal style", pt: "Estilo Normal" }, icon: "format_paragraph", shortcut: "Ctrl+Shift+N", supports: has("applyStyle"), run: () => ed.applyStyle(void 0) }),
    ...[1, 2, 3].map((n5) => edit({
      id: `style:h${n5}`,
      label: { en: `Heading ${n5}`, pt: `T\xEDtulo ${n5}` },
      icon: `format_h${n5}`,
      shortcut: `Ctrl+Alt+${n5}`,
      supports: has("listStyles"),
      run: () => ed.applyStyle(ed.listStyles("all").find((s4) => s4.rawName.toLowerCase() === `heading ${n5}`)?.id)
    })),
    edit({ id: "style:clearChar", label: { en: "Clear character formatting", pt: "Limpar formata\xE7\xE3o de caractere" }, icon: "format_clear", shortcut: "Ctrl+Space", supports: has("clearCharacterFormatting"), run: () => ed.clearCharacterFormatting() }),
    edit({ id: "style:clearPara", label: { en: "Clear paragraph formatting", pt: "Limpar formata\xE7\xE3o de par\xE1grafo" }, icon: "format_clear", shortcut: "Ctrl+Q", supports: has("clearParagraphFormatting"), run: () => ed.clearParagraphFormatting() }),
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
    edit({ id: "dlg:tabs", label: { en: "Tabs\u2026", pt: "Tabula\xE7\xE3o\u2026" }, tip: { en: "Tab stops of the paragraph and the default tab stop", pt: "Tabula\xE7\xF5es do par\xE1grafo e a tabula\xE7\xE3o padr\xE3o" }, icon: "keyboard_tab", supports: has("setTabStops"), run: () => ctl.tabsDialog() }),
    edit({ id: "dlg:page", label: { en: "Page setup\u2026", pt: "Configurar p\xE1gina\u2026" }, icon: "settings", run: () => ctl.pageDialog() }),
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
    { id: "spelling", label: { en: "Spelling & grammar", pt: "Ortografia e gram\xE1tica" }, icon: "spellcheck", shortcut: "F7", supports: has("nextMisspelling"), run: () => ctl.spelling(), isEnabled: canEdit3 },
    { id: "spellAsYouType", label: { en: "Check spelling as you type", pt: "Verificar ortografia ao digitar" }, icon: "spellcheck", supports: has("toggleSpellCheck"), run: () => call("toggleSpellCheck"), isChecked: () => typeof api["spellCheckEnabled"] === "function" && !!call("spellCheckEnabled") },
    // controle de alterações (rótulos do Word 365 pt-BR, guia Revisão)
    edit({ id: "trackChanges", label: { en: "Track Changes", pt: "Controlar Altera\xE7\xF5es" }, icon: "track_changes", shortcut: "Ctrl+Shift+E", supports: has("toggleTrackChanges"), run: () => ctl.trackChanges(), isChecked: () => typeof api["isTrackingChanges"] === "function" && !!call("isTrackingChanges") }),
    ...[["simple", "Simple Markup", "Marca\xE7\xE3o Simples"], ["all", "All Markup", "Todas as Marca\xE7\xF5es"], ["none", "No Markup", "Sem Marca\xE7\xE3o"], ["original", "Original", "Original"]].map(([m2, en, pt]) => ({ id: `markup:${m2}`, label: { en, pt }, supports: has("setMarkupMode"), run: () => call("setMarkupMode", m2), isChecked: () => typeof api["getMarkupMode"] === "function" && call("getMarkupMode") === m2 })),
    ...[["insdel", "Insertions and Deletions", "Inser\xE7\xF5es e Exclus\xF5es", "insertionsDeletions"], ["formatting", "Formatting", "Formata\xE7\xE3o", "formatting"]].map(([k2, en, pt, opt]) => ({ id: `show:${k2}`, label: { en, pt }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { [opt]: !markup()[opt] }), isChecked: () => !!markup()[opt] })),
    ...[["revisions", "Show Revisions in Balloons", "Mostrar Revis\xF5es em Bal\xF5es"], ["inline", "Show All Revisions Inline", "Mostrar Todas as Revis\xF5es Embutidas"], ["mixed", "Show Only Comments and Formatting in Balloons", "Mostrar Somente Coment\xE1rios e Formata\xE7\xE3o em Bal\xF5es"]].map(([b3, en, pt]) => ({ id: `balloons:${b3}`, label: { en, pt }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { balloons: b3 }), isChecked: () => markup().balloons === b3 })),
    { id: "people:all", label: { en: "All Reviewers", pt: "Todos os Revisores" }, supports: has("setMarkupOptions"), run: () => call("setMarkupOptions", { authors: markup().authors ? null : [] }), isChecked: () => !markup().authors },
    { id: "reviewPane", label: { en: "Reviewing Pane", pt: "Painel de Revis\xE3o" }, icon: "view_column", supports: has("getRevisions"), run: () => ctl.reviewPane(), isChecked: () => !!ctl.reviewPaneOpen() },
    { id: "reviewPane:vertical", label: { en: "Reviewing Pane Vertical\u2026", pt: "Painel de Revis\xE3o Vertical..." }, supports: has("getRevisions"), run: () => ctl.reviewPane("vertical"), isChecked: () => ctl.reviewPaneOpen() === "vertical" },
    { id: "reviewPane:horizontal", label: { en: "Reviewing Pane Horizontal\u2026", pt: "Painel de Revis\xE3o Horizontal..." }, supports: has("getRevisions"), run: () => ctl.reviewPane("horizontal"), isChecked: () => ctl.reviewPaneOpen() === "horizontal" },
    edit({ id: "change:accept", label: { en: "Accept", pt: "Aceitar" }, tip: { en: "Accept and Move to Next", pt: "Aceitar e Mover para a Pr\xF3xima" }, icon: "check_circle", supports: has("acceptChange"), run: () => call("acceptChange"), isEnabled: hasRevisions }),
    edit({ id: "change:acceptNext", label: { en: "Accept and Move to Next", pt: "Aceitar e Mover para a Pr\xF3xima" }, icon: "check_circle", supports: has("acceptChange"), run: () => call("acceptChange"), isEnabled: hasRevisions }),
    edit({ id: "change:acceptOne", label: { en: "Accept This Change", pt: "Aceitar Esta Altera\xE7\xE3o" }, supports: has("acceptChange"), run: () => call("acceptChange", { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: "change:acceptShown", label: { en: "Accept All Changes Shown", pt: "Aceitar Todas as Altera\xE7\xF5es Mostradas" }, supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges", { shown: true }), true), isEnabled: hasRevisions }),
    edit({ id: "change:acceptAll", label: { en: "Accept All Changes", pt: "Aceitar Todas as Altera\xE7\xF5es" }, icon: "done_all", supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges"), true), isEnabled: hasRevisions }),
    edit({ id: "change:acceptAllStop", label: { en: "Accept All Changes and Stop Tracking", pt: "Aceitar Todas as Altera\xE7\xF5es e Parar o Controle" }, supports: has("acceptAllChanges"), run: () => resolved(call("acceptAllChanges", { stopTracking: true }), true) }),
    edit({ id: "change:reject", label: { en: "Reject", pt: "Rejeitar" }, tip: { en: "Reject and Move to Next", pt: "Rejeitar e Mover para a Pr\xF3xima" }, icon: "cancel", supports: has("rejectChange"), run: () => call("rejectChange"), isEnabled: hasRevisions }),
    edit({ id: "change:rejectNext", label: { en: "Reject and Move to Next", pt: "Rejeitar e Mover para a Pr\xF3xima" }, icon: "cancel", supports: has("rejectChange"), run: () => call("rejectChange"), isEnabled: hasRevisions }),
    edit({ id: "change:rejectOne", label: { en: "Reject Change", pt: "Rejeitar Altera\xE7\xE3o" }, supports: has("rejectChange"), run: () => call("rejectChange", { moveNext: false }), isEnabled: hasRevisions }),
    edit({ id: "change:rejectShown", label: { en: "Reject All Changes Shown", pt: "Rejeitar Todas as Altera\xE7\xF5es Mostradas" }, supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges", { shown: true }), false), isEnabled: hasRevisions }),
    edit({ id: "change:rejectAll", label: { en: "Reject All Changes", pt: "Rejeitar Todas as Altera\xE7\xF5es" }, icon: "remove_done", supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges"), false), isEnabled: hasRevisions }),
    edit({ id: "change:rejectAllStop", label: { en: "Reject All Changes and Stop Tracking", pt: "Rejeitar Todas as Altera\xE7\xF5es e Parar o Controle" }, supports: has("rejectAllChanges"), run: () => resolved(call("rejectAllChanges", { stopTracking: true }), false) }),
    { id: "change:prev", label: { en: "Previous", pt: "Anterior" }, tip: { en: "Previous Change", pt: "Altera\xE7\xE3o Anterior" }, icon: "navigate_before", supports: has("previousChange"), run: () => {
      if (!call("previousChange")) ctl.flash(L11.noMoreRevisions);
    }, isEnabled: hasRevisions },
    { id: "change:next", label: { en: "Next", pt: "Pr\xF3ximo" }, tip: { en: "Next Change", pt: "Pr\xF3xima Altera\xE7\xE3o" }, icon: "navigate_next", supports: has("nextChange"), run: () => {
      if (!call("nextChange")) ctl.flash(L11.noMoreRevisions);
    }, isEnabled: hasRevisions },
    edit({ id: "mailmerge", label: { en: "Start Mail Merge", pt: "Iniciar Mala Direta" }, icon: "mail", supports: has("startMailMerge"), run: () => call("startMailMerge") }),
    edit({ id: "mergefield", label: { en: "Insert Merge Field", pt: "Inserir Campo de Mesclagem" }, icon: "data_object", supports: has("insertMergeField"), run: () => call("insertMergeField") }),
    edit({ id: "image:delete", label: { en: "Delete image", pt: "Excluir imagem" }, icon: "delete", supports: has("deleteSelectedImage"), run: () => call("deleteSelectedImage") }),
    // ── Ferramentas / Ajuda ──
    { id: "fontAccess", label: { en: "Use installed fonts\u2026", pt: "Usar as fontes instaladas\u2026" }, icon: "font_download", run: () => ctl.requestFonts(), supports: () => !ed.hasHostSystemFonts() && typeof window.queryLocalFonts === "function" },
    { id: "shortcuts", label: { en: "Keyboard shortcuts", pt: "Atalhos de teclado" }, icon: "keyboard", shortcut: "Ctrl+/", run: () => ctl.shortcuts() },
    { id: "about", label: { en: "About Universal Write", pt: "Sobre o Universal Write" }, icon: "info", run: () => ctl.about() }
  ];
  reg.add(...cmds);
  registerTableCommands(reg, ed, app, ctl);
  registerHfCommands(reg, ed, app, ctl);
  registerPictureCommands(reg, ed, app, ctl);
  registerShapeCommands(reg, ed, app, ctl);
  registerPictureAdjustCommands(reg, ed, app, ctl);
  registerPageCommands(reg, ed, app, ctl);
  registerTocCommands(reg, ed, app, ctl);
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

// src/chrome-refs.ts
var el5 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var select3 = (opts, value) => {
  const s4 = el5("select");
  for (const [v2, t5] of opts) s4.append(el5("option", { value: v2, textContent: t5 }));
  s4.value = value;
  return s4;
};
var check4 = (label, on) => {
  const input = el5("input", { type: "checkbox", checked: on });
  return { box: el5("label", { className: "uo-check" }, input, label), input };
};
var field = (label, ...kids) => el5("label", { className: "uo-field" }, el5("span", {}, label), ...kids);
var button2 = (label) => el5("button", { type: "button", className: "uo-pill", textContent: label });
function listBox(height = 180) {
  const box = el5("div", { tabIndex: 0, style: `height:${height}px;overflow:auto;border:1px solid color-mix(in srgb, currentColor 30%, transparent);border-radius:6px;padding:2px;font-size:13px` });
  box.setAttribute("role", "listbox");
  let items = [];
  let cur;
  let changed = () => {
  }, activated = () => {
  };
  const rows = [];
  const sync = () => {
    rows.forEach((r5, i5) => {
      const on = items[i5].id === cur;
      r5.style.background = on ? "color-mix(in srgb, var(--u-color-primary, #005bc0) 22%, transparent)" : "";
      r5.setAttribute("aria-selected", String(on));
      if (on) r5.scrollIntoView({ block: "nearest" });
    });
  };
  box.addEventListener("keydown", (e6) => {
    const i5 = items.findIndex((x2) => x2.id === cur);
    const d3 = e6.key === "ArrowDown" ? 1 : e6.key === "ArrowUp" ? -1 : 0;
    if (e6.key === "Enter" && cur !== void 0) {
      e6.preventDefault();
      activated();
      return;
    }
    if (!d3 || !items.length) return;
    e6.preventDefault();
    cur = items[Math.max(0, Math.min(items.length - 1, i5 + d3))].id;
    sync();
    changed();
  });
  return {
    el: box,
    set(list, keep) {
      items = list;
      cur = keep === null ? void 0 : keep !== void 0 && list.some((x2) => x2.id === keep) ? keep : list[0]?.id;
      rows.length = 0;
      box.replaceChildren(...list.map((it) => {
        const head = it.id.startsWith("#");
        const r5 = el5("div", { textContent: it.text, title: it.text.trim(), style: `padding:3px 6px;border-radius:4px;white-space:pre;overflow:hidden;text-overflow:ellipsis;${head ? "font-weight:600;opacity:.8" : "cursor:pointer"}` });
        r5.setAttribute("role", head ? "presentation" : "option");
        if (!head) {
          r5.addEventListener("click", () => {
            cur = it.id;
            sync();
            changed();
          });
          r5.addEventListener("dblclick", () => {
            cur = it.id;
            sync();
            activated();
          });
        }
        rows.push(r5);
        return r5;
      }));
      sync();
    },
    value: () => cur,
    onChange: (f3) => {
      changed = f3;
    },
    onActivate: (f3) => {
      activated = f3;
    }
  };
}
var T3 = (env) => (en, pt) => pickLabels(env.lang, { en, pt });
async function bookmarkDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const name = el5("input", { type: "text", maxLength: 40, spellcheck: false });
  const list = listBox(170);
  const byName = el5("input", { type: "radio", name: "bmsort", checked: true });
  const byLoc = el5("input", { type: "radio", name: "bmsort" });
  const hidden = check4(t5("Hidden bookmarks", "Indicadores ocultos"), false);
  const show = check4(t5("Show bookmarks", "Mostrar indicadores"), ed.bookmarksShown());
  const fill = (keep) => {
    const bms = ed.getBookmarks({ hidden: hidden.input.checked, sort: byLoc.checked ? "location" : "name" });
    list.set(bms.map((b3) => ({ id: b3.name, text: b3.name })), keep ?? null);
    sync();
  };
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:340px" },
    field(t5("Bookmark name:", "Nome do indicador:"), name),
    list.el,
    el5(
      "div",
      { style: "display:flex;gap:14px;align-items:center;font-size:13px" },
      t5("Sort by:", "Classificar por:"),
      el5("label", { className: "uo-check" }, byName, t5("Name", "Nome")),
      el5("label", { className: "uo-check" }, byLoc, t5("Location", "Local"))
    ),
    hidden.box,
    show.box
  );
  const h3 = openDialog({
    title: t5("Bookmark", "Indicador"),
    icon: "bookmark",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 500,
    actions: [
      { id: "goto", label: t5("Go To", "Ir para") },
      { id: "delete", label: t5("Delete", "Excluir") },
      { id: "cancel", label: t5("Cancel", "Cancelar") },
      { id: "add", label: t5("Add", "Adicionar"), primary: true }
    ],
    onAction: (id) => {
      const n5 = name.value.trim();
      if (id === "goto") {
        if (n5) ed.goToBookmark(n5);
        return false;
      }
      if (id === "delete") {
        if (n5 && ed.deleteBookmark(n5)) {
          name.value = "";
          fill();
        }
        return false;
      }
      if (id === "add" && !ed.insertBookmark(n5)) return false;
      return true;
    }
  });
  const btn2 = (id) => h3.el.querySelector(`[data-action="${id}"]`);
  function sync() {
    const n5 = name.value.trim();
    const exists = !!n5 && ed.hasBookmark(n5);
    btn2("add").disabled = !ed.validBookmarkName(n5);
    btn2("goto").disabled = !exists;
    btn2("delete").disabled = !exists;
  }
  list.onChange(() => {
    name.value = list.value() ?? "";
    sync();
  });
  list.onActivate(() => {
    const n5 = list.value();
    if (n5) ed.goToBookmark(n5);
  });
  name.addEventListener("input", sync);
  for (const r5 of [byName, byLoc]) r5.addEventListener("change", () => fill(list.value()));
  hidden.input.addEventListener("change", () => fill(list.value()));
  show.input.addEventListener("change", () => ed.showBookmarks(show.input.checked));
  fill();
  name.value = "";
  sync();
  await h3.result;
}
var KIND_LABEL = (t5, type, k2) => {
  const what = type === "heading" ? t5("Heading", "t\xEDtulo") : type === "bookmark" ? t5("Bookmark", "indicador") : t5("Paragraph", "par\xE1grafo");
  switch (k2) {
    case "text":
      return type === "heading" ? t5("Heading text", "Texto do t\xEDtulo") : type === "bookmark" ? t5("Bookmark text", "Texto do indicador") : t5("Paragraph text", "Texto do par\xE1grafo");
    case "page":
      return t5("Page number", "N\xFAmero da p\xE1gina");
    case "number":
      return type === "heading" ? t5("Heading number", "N\xFAmero do t\xEDtulo") : t5("Paragraph number", "N\xFAmero do par\xE1grafo");
    case "numberNoContext":
      return `${type === "heading" ? t5("Heading number", "N\xFAmero do t\xEDtulo") : t5("Paragraph number", "N\xFAmero do par\xE1grafo")} ${t5("(no context)", "(sem contexto)")}`;
    case "numberFullContext":
      return `${type === "heading" ? t5("Heading number", "N\xFAmero do t\xEDtulo") : t5("Paragraph number", "N\xFAmero do par\xE1grafo")} ${t5("(full context)", "(contexto completo)")}`;
    case "position":
      return t5("Above/below", "Acima/abaixo");
    case "noteNumber":
      return type === "endnote" ? t5("Endnote number", "N\xFAmero da nota de fim") : t5("Footnote number", "N\xFAmero da nota de rodap\xE9");
    case "noteNumberFormatted":
      return `${type === "endnote" ? t5("Endnote number", "N\xFAmero da nota de fim") : t5("Footnote number", "N\xFAmero da nota de rodap\xE9")} ${t5("(formatted)", "(formatado)")}`;
    case "captionEntire":
      return t5("Entire caption", "Legenda inteira");
    case "captionLabel":
      return t5("Only label and number", "Apenas r\xF3tulo e n\xFAmero");
    case "captionText":
      return t5("Only caption text", "Apenas texto da legenda");
  }
  return what;
};
async function crossRefDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const labels = ed.getCaptionLabels().map((l3) => l3.name);
  const types = [
    ["numbered", t5("Numbered item", "Item numerado")],
    ["heading", t5("Heading", "T\xEDtulo")],
    ["bookmark", t5("Bookmark", "Indicador")],
    ["footnote", t5("Footnote", "Nota de rodap\xE9")],
    ["endnote", t5("Endnote", "Nota de fim")],
    ...labels.map((l3) => [`caption:${l3}`, l3])
  ];
  const type = select3(types, "heading");
  const kind = el5("select");
  const link = check4(t5("Insert as hyperlink", "Inserir como hiperlink"), true);
  const pos = check4(t5("Include above/below", "Incluir acima/abaixo"), false);
  const sep = el5("input", { type: "text", maxLength: 5, style: "width:60px" });
  const sepBox = check4(t5("Separate numbers with", "Separar n\xFAmeros com"), false);
  const list = listBox(200);
  const forWhich = el5("span");
  const cur = () => {
    const v2 = type.value;
    return v2.startsWith("caption:") ? { type: "caption", label: v2.slice(8) } : { type: v2 };
  };
  const forLabel = (c4) => {
    switch (c4.type) {
      case "numbered":
        return t5("For which numbered item:", "Para qual item numerado:");
      case "heading":
        return t5("For which heading:", "Para qual t\xEDtulo:");
      case "bookmark":
        return t5("For which bookmark:", "Para qual indicador:");
      case "footnote":
        return t5("For which footnote:", "Para qual nota de rodap\xE9:");
      case "endnote":
        return t5("For which endnote:", "Para qual nota de fim:");
      default:
        return t5("For which caption:", "Para qual legenda:");
    }
  };
  const refill = () => {
    const c4 = cur();
    const kinds = ed.crossReferenceKinds(c4.type);
    const keep = kinds.includes(kind.value) ? kind.value : kinds[0];
    kind.replaceChildren(...kinds.map((k2) => el5("option", { value: k2, textContent: KIND_LABEL(t5, c4.type, k2) })));
    kind.value = keep;
    forWhich.textContent = forLabel(c4);
    list.set(ed.getCrossReferenceItems(c4.type, c4.label));
    syncOpts();
  };
  const syncOpts = () => {
    const k2 = kind.value;
    pos.input.disabled = k2 === "position";
    const full = k2 === "numberFullContext";
    sepBox.input.disabled = !full;
    sep.disabled = !full || !sepBox.input.checked;
  };
  type.addEventListener("change", refill);
  kind.addEventListener("change", syncOpts);
  sepBox.input.addEventListener("change", syncOpts);
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:420px" },
    el5(
      "div",
      { style: "display:grid;grid-template-columns:1fr 1fr;gap:10px" },
      field(t5("Reference type:", "Tipo de refer\xEAncia:"), type),
      field(t5("Insert reference to:", "Inserir refer\xEAncia para:"), kind)
    ),
    el5("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:center" }, link.box, pos.box),
    el5("div", { style: "display:flex;gap:8px;align-items:center" }, sepBox.box, sep),
    el5("div", { style: "font-size:13px" }, forWhich),
    list.el
  );
  const insert = () => {
    const c4 = cur(), item = list.value();
    if (!item) return false;
    const ok = ed.insertCrossReference({
      type: c4.type,
      ...c4.label ? { label: c4.label } : {},
      item,
      kind: kind.value,
      hyperlink: link.input.checked,
      position: pos.input.checked && !pos.input.disabled,
      ...sepBox.input.checked && !sep.disabled ? { separator: sep.value } : {}
    });
    if (!ok) env.flash(t5("The reference could not be inserted here", "N\xE3o foi poss\xEDvel inserir a refer\xEAncia aqui"));
    return ok;
  };
  const h3 = openDialog({
    title: t5("Cross-reference", "Refer\xEAncia Cruzada"),
    icon: "arrow_outward",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 520,
    modal: false,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "insert", label: t5("Insert", "Inserir"), primary: true }],
    onAction: (id) => {
      if (id !== "insert") return true;
      if (insert()) h3.el.querySelector('[data-action="cancel"]').textContent = t5("Close", "Fechar");
      return false;
    }
  });
  h3.el.style.cssText += ";position:fixed;inset:0;margin:auto;height:fit-content";
  list.onActivate(() => {
    if (insert()) h3.el.querySelector('[data-action="cancel"]').textContent = t5("Close", "Fechar");
  });
  refill();
  await h3.result;
}
var FORMATS = [["ARABIC", "1, 2, 3, \u2026"], ["alphabetic", "a, b, c, \u2026"], ["ALPHABETIC", "A, B, C, \u2026"], ["roman", "i, ii, iii, \u2026"], ["ROMAN", "I, II, III, \u2026"]];
async function numberingDialog(env, label) {
  const t5 = T3(env), ed = env.ed;
  const cur = ed.getCaptionNumbering(label);
  const fmt = select3(FORMATS, cur.format);
  const chap = check4(t5("Include chapter number", "Incluir n\xFAmero do cap\xEDtulo"), !!cur.chapter);
  const levels = select3(Array.from({ length: 9 }, (_2, i5) => [String(i5 + 1), t5(`Heading ${i5 + 1}`, `T\xEDtulo ${i5 + 1}`)]), String(cur.chapter?.level ?? 1));
  const seps = select3([
    ["hyphen", t5("- (hyphen)", "- (h\xEDfen)")],
    ["period", t5(". (period)", ". (ponto)")],
    ["colon", t5(": (colon)", ": (dois-pontos)")],
    ["emDash", t5("\u2014 (em dash)", "\u2014 (travess\xE3o)")],
    ["enDash", t5("\u2013 (en dash)", "\u2013 (meia-risca)")]
  ], cur.chapter?.separator ?? "hyphen");
  const sync = () => {
    levels.disabled = !chap.input.checked;
    seps.disabled = !chap.input.checked;
  };
  chap.input.addEventListener("change", sync);
  sync();
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    field(t5("Format:", "Formato:"), fmt),
    chap.box,
    field(t5("Chapter starts with style:", "Cap\xEDtulo come\xE7a com estilo:"), levels),
    field(t5("Use separator:", "Usar separador:"), seps),
    el5("div", { style: "font-size:12px;opacity:.75" }, t5("Examples: 1-1, 1.A", "Exemplos: 1-1, 1.A"))
  );
  const h3 = openDialog({
    title: t5("Caption Numbering", "Numera\xE7\xE3o de Legenda"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 380,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const n5 = { format: fmt.value, ...chap.input.checked ? { chapter: { level: +levels.value, separator: seps.value } } : {} };
  ed.setCaptionNumbering(label, n5);
  env.saveCaptionSettings?.();
}
async function autoCaptionDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const cur = ed.getAutoCaption()?.table;
  const labels = ed.getCaptionLabels();
  const on = check4(t5("Table", "Tabela"), !!cur);
  const label = select3(labels.map((l3) => [l3.name, l3.name]), cur?.label ?? labels.find((l3) => l3.position === "above")?.name ?? labels[0].name);
  const pos = select3([["above", t5("Above item", "Acima do item")], ["below", t5("Below item", "Abaixo do item")]], cur?.position ?? "above");
  const sync = () => {
    label.disabled = !on.input.checked;
    pos.disabled = !on.input.checked;
  };
  on.input.addEventListener("change", sync);
  sync();
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:320px" },
    el5("div", { style: "font-size:13px" }, t5("Add caption when inserting:", "Adicionar legenda ao inserir:")),
    on.box,
    field(t5("Use label:", "Usar r\xF3tulo:"), label),
    field(t5("Position:", "Posi\xE7\xE3o:"), pos)
  );
  const h3 = openDialog({
    title: t5("AutoCaption", "AutoLegenda"),
    body,
    layer: env.layer,
    lang: env.lang,
    width: 380,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  ed.setAutoCaption(on.input.checked ? { table: { label: label.value, position: pos.value } } : void 0);
  env.saveCaptionSettings?.();
}
async function captionDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const target = ed.captionTarget();
  const labels = () => ed.getCaptionLabels();
  const labelSel = el5("select");
  const fillLabels = (keep) => {
    labelSel.replaceChildren(...labels().map((l3) => el5("option", { value: l3.name, textContent: l3.name })));
    labelSel.value = keep && labels().some((l3) => l3.name === keep) ? keep : (target === "table" ? labels().find((l3) => l3.position === "above")?.name : void 0) ?? labels()[0].name;
  };
  fillLabels();
  const pos = select3([["above", t5("Above selected item", "Acima do item selecionado")], ["below", t5("Below selected item", "Abaixo do item selecionado")]], "below");
  pos.disabled = !target;
  const excl = check4(t5("Exclude label from caption", "Excluir r\xF3tulo da legenda"), false);
  const caption = el5("input", { type: "text" });
  let prefix = "";
  const syncPrefix = () => {
    const l3 = labelSel.value;
    const text = caption.value.slice(prefix.length);
    prefix = `${excl.input.checked ? "" : `${l3} `}${ed.nextCaptionNumber(l3)}`;
    caption.value = prefix + text;
    const def = labels().find((x2) => x2.name === l3)?.position ?? "below";
    if (target) pos.value = def;
    delBtn.disabled = labels().find((x2) => x2.name === l3)?.builtIn !== false;
  };
  caption.addEventListener("input", () => {
    if (!caption.value.startsWith(prefix)) caption.value = prefix + caption.value.slice(Math.min(prefix.length, caption.value.length));
  });
  const newBtn = button2(t5("New Label\u2026", "Novo R\xF3tulo\u2026"));
  const delBtn = button2(t5("Delete Label", "Excluir R\xF3tulo"));
  const numBtn = button2(t5("Numbering\u2026", "Numera\xE7\xE3o\u2026"));
  const autoBtn = button2(t5("AutoCaption\u2026", "AutoLegenda\u2026"));
  labelSel.addEventListener("change", syncPrefix);
  excl.input.addEventListener("change", syncPrefix);
  newBtn.addEventListener("click", () => {
    void promptDialog({ title: t5("New Label", "Novo R\xF3tulo"), label: t5("Label:", "R\xF3tulo:"), layer: env.layer, lang: env.lang }).then((v2) => {
      const n5 = v2?.trim();
      if (!n5) return;
      ed.addCaptionLabel(n5);
      env.saveCaptionSettings?.();
      fillLabels(n5);
      syncPrefix();
    });
  });
  delBtn.addEventListener("click", () => {
    if (ed.deleteCaptionLabel(labelSel.value)) {
      env.saveCaptionSettings?.();
      fillLabels();
      syncPrefix();
    }
  });
  numBtn.addEventListener("click", () => {
    void numberingDialog(env, labelSel.value).then(syncPrefix);
  });
  autoBtn.addEventListener("click", () => {
    void autoCaptionDialog(env);
  });
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:400px" },
    field(t5("Caption:", "Legenda:"), caption),
    el5("strong", { style: "font-size:13px" }, t5("Options", "Op\xE7\xF5es")),
    el5("div", { className: "uo-dialog-grid" }, el5("span", {}, t5("Label:", "R\xF3tulo:")), labelSel, el5("span", {}, t5("Position:", "Posi\xE7\xE3o:")), pos),
    excl.box,
    el5("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, newBtn, delBtn, numBtn, autoBtn)
  );
  syncPrefix();
  const h3 = openDialog({
    title: t5("Caption", "Legenda"),
    icon: "subtitles",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 480,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  queueMicrotask(() => {
    caption.focus();
    caption.setSelectionRange(caption.value.length, caption.value.length);
  });
  if (await h3.result !== "ok") return;
  ed.insertCaption({ label: labelSel.value, title: caption.value.slice(prefix.length), excludeLabel: excl.input.checked, ...target ? { position: pos.value } : {} });
}
async function tofDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const cur = ed.getTableOfFiguresOptions();
  const labels = ed.getCaptionLabels();
  const pages = check4(t5("Show page numbers", "Mostrar n\xFAmeros de p\xE1gina"), cur?.pageNumbers ?? true);
  const right = check4(t5("Right align page numbers", "Alinhar n\xFAmeros de p\xE1gina \xE0 direita"), cur?.rightAlign ?? true);
  const leader = select3([["none", t5("(none)", "(nenhum)")], ["dot", "......."], ["hyphen", "-------"], ["underscore", "_______"]], cur?.leader ?? "dot");
  const links = check4(t5("Use hyperlinks instead of page numbers", "Usar hiperlinks em vez de n\xFAmeros de p\xE1gina"), cur?.hyperlinks ?? true);
  const format = select3([
    ["template", t5("From template", "Do modelo")],
    ["classic", t5("Classic", "Cl\xE1ssico")],
    ["distinctive", t5("Distinctive", "Elegante")],
    ["centered", t5("Centered", "Centralizado")],
    ["formal", t5("Formal", "Formal")],
    ["simple", t5("Simple", "Simples")]
  ], "template");
  const label = select3([...labels.map((l3) => [l3.name, l3.name])], cur?.label ?? labels[0].name);
  const incl = check4(t5("Include label and number", "Incluir r\xF3tulo e n\xFAmero"), cur?.includeLabel ?? true);
  const preview2 = el5("div", { style: "border:1px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:6px;padding:8px 10px;font-size:12px;min-height:70px;display:flex;flex-direction:column;gap:2px" });
  const paint = () => {
    const lab = label.value;
    const lead = { none: " ", dot: ".", hyphen: "-", underscore: "_" }[leader.value] ?? ".";
    preview2.replaceChildren(...[1, 2, 3, 4].map((n5) => {
      const txt = `${incl.input.checked ? `${lab} ${n5}: ` : ""}${t5("Text", "Texto")}`;
      const row2 = el5("div", { style: "display:flex;gap:4px;white-space:nowrap" }, el5("span", {}, txt));
      if (pages.input.checked && right.input.checked) row2.append(el5("span", { style: "flex:1;overflow:hidden;opacity:.7", textContent: lead.repeat(200) }), el5("span", {}, String(n5 * 2 - 1)));
      else if (pages.input.checked) row2.append(el5("span", {}, String(n5 * 2 - 1)));
      return row2;
    }));
    right.input.disabled = !pages.input.checked;
    leader.disabled = !pages.input.checked || !right.input.checked;
  };
  for (const c4 of [pages.input, right.input, incl.input, links.input]) c4.addEventListener("change", paint);
  for (const s4 of [leader, label, format]) s4.addEventListener("change", paint);
  paint();
  const modify = button2(t5("Modify\u2026", "Modificar\u2026"));
  modify.addEventListener("click", () => env.modifyStyle?.(ed.ensureBuiltinStyle("table of figures")));
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:440px" },
    el5("strong", { style: "font-size:13px" }, t5("Print Preview", "Visualizar Impress\xE3o")),
    preview2,
    pages.box,
    right.box,
    field(t5("Tab leader:", "Preenchimento de tabula\xE7\xE3o:"), leader),
    links.box,
    el5("strong", { style: "font-size:13px" }, t5("General", "Geral")),
    el5("div", { className: "uo-dialog-grid" }, el5("span", {}, t5("Formats:", "Formatos:")), format, el5("span", {}, t5("Caption label:", "Nome da legenda:")), label),
    incl.box,
    el5("div", {}, modify)
  );
  const h3 = openDialog({
    title: t5("Table of Figures", "\xCDndice de Ilustra\xE7\xF5es"),
    icon: "list_alt",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 520,
    actions: [{ id: "cancel", label: t5("Cancel", "Cancelar") }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const ok = ed.insertTableOfFigures({
    label: label.value,
    includeLabel: incl.input.checked,
    pageNumbers: pages.input.checked,
    rightAlign: right.input.checked,
    leader: leader.value,
    hyperlinks: links.input.checked,
    format: format.value
  });
  if (!ok) env.flash(t5("The table of figures could not be inserted here", "N\xE3o foi poss\xEDvel inserir o \xEDndice aqui"));
}
async function hyperlinkDialog(env) {
  const t5 = T3(env), ed = env.ed;
  const cur = ed.getLink();
  const sel4 = ed.selectedText();
  const display = el5("input", { type: "text", value: cur?.text ?? sel4 ?? "" });
  const tip = el5("input", { type: "text", value: cur?.tip ?? "" });
  const isMail = !!cur?.address?.startsWith("mailto:");
  const address = el5("input", { type: "text", value: cur?.address && !isMail ? cur.address : "https://", spellcheck: false });
  const mail = el5("input", { type: "text", value: isMail ? decodeURIComponent(cur.address.slice(7).split("?")[0]) : "", spellcheck: false });
  const subject = el5("input", { type: "text", value: isMail ? decodeURIComponent(/[?&]subject=([^&]*)/i.exec(cur.address)?.[1] ?? "") : "" });
  const targets = ed.getLinkTargets();
  const place = listBox(220);
  const items = [
    { id: "_top", text: t5("Top of the Document", "In\xEDcio do documento") },
    ...targets.headings.length ? [{ id: "", text: t5("Headings", "T\xEDtulos") }] : [],
    ...targets.headings.map((hd) => ({ id: hd.id, text: `${"  ".repeat(hd.level)}${hd.text}` })),
    ...targets.bookmarks.length ? [{ id: "", text: t5("Bookmarks", "Indicadores") }] : [],
    ...targets.bookmarks.map((b3) => ({ id: b3, text: `  ${b3}` }))
  ];
  place.set(items.map((x2, i5) => ({ id: x2.id || `#sec${i5}`, text: x2.text })), cur?.anchor && items.some((x2) => x2.id === cur.anchor) ? cur.anchor : "_top");
  const panes = {
    web: el5("div", { style: "display:flex;flex-direction:column;gap:10px" }, field(t5("Address:", "Endere\xE7o:"), address)),
    place: el5("div", { style: "display:flex;flex-direction:column;gap:6px" }, el5("span", { style: "font-size:13px" }, t5("Select a place in this document:", "Selecione um local neste documento:")), place.el),
    mail: el5("div", { style: "display:flex;flex-direction:column;gap:10px" }, field(t5("E-mail address:", "Endere\xE7o de email:"), mail), field(t5("Subject:", "Assunto:"), subject))
  };
  const tabs = dialogTabs([
    { id: "web", label: t5("Existing File or Web Page", "P\xE1gina da Web ou arquivo"), body: panes.web },
    { id: "place", label: t5("Place in This Document", "Colocar neste documento"), body: panes.place },
    { id: "mail", label: t5("E-mail Address", "Endere\xE7o de email"), body: panes.mail }
  ], cur?.anchor ? "place" : isMail ? "mail" : "web");
  const body = el5(
    "div",
    { style: "display:flex;flex-direction:column;gap:10px;min-width:460px" },
    field(t5("Text to display:", "Texto para exibi\xE7\xE3o:"), display),
    tabs.el,
    field(t5("ScreenTip:", "Dica de Tela:"), tip)
  );
  const h3 = openDialog({
    title: cur ? t5("Edit Hyperlink", "Editar Hiperlink") : t5("Insert Hyperlink", "Inserir Hiperlink"),
    icon: "link",
    body,
    layer: env.layer,
    lang: env.lang,
    width: 560,
    actions: [
      ...cur ? [{ id: "remove", label: t5("Remove Link", "Remover Link") }] : [],
      { id: "cancel", label: t5("Cancel", "Cancelar") },
      { id: "ok", label: "OK", primary: true }
    ]
  });
  const r5 = await h3.result;
  if (r5 === "remove") {
    ed.removeLink();
    return;
  }
  if (r5 !== "ok") return;
  const text = display.value;
  const opts = { tip: tip.value.trim() || void 0, ...text && text !== (cur?.text ?? sel4 ?? "") ? { text } : text && !sel4 && !cur ? { text } : {} };
  const tab = tabs.current();
  if (tab === "place") {
    const id = place.value();
    if (!id || id.startsWith("#sec")) return;
    ed.insertHyperlink({ anchor: id, ...opts });
  } else if (tab === "mail") {
    const a3 = mail.value.trim();
    if (!a3) return;
    ed.insertHyperlink({ address: `mailto:${a3.replace(/^mailto:/i, "")}${subject.value.trim() ? `?subject=${encodeURIComponent(subject.value.trim())}` : ""}`, ...opts });
  } else {
    const a3 = address.value.trim();
    if (!a3 || a3 === "https://") return;
    ed.insertHyperlink({ address: a3, ...opts });
  }
}
function refsDialog(env, kind) {
  switch (kind) {
    case "bookmark":
      return bookmarkDialog(env);
    case "crossref":
      return crossRefDialog(env);
    case "caption":
      return captionDialog(env);
    case "tof":
      return tofDialog(env);
    case "link":
      return hyperlinkDialog(env);
  }
}

// src/chrome-dialogs.ts
var el6 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var select4 = (name, opts, value) => {
  const s4 = el6("select", { name });
  for (const [v2, t5] of opts) s4.append(el6("option", { value: v2, textContent: t5 }));
  s4.value = value;
  return s4;
};
var check5 = (name, label, on) => {
  const i5 = el6("input", { type: "checkbox", name, checked: on });
  return el6("label", { className: "uo-check" }, i5, label);
};
var tr4 = (lang, en, pt) => pickLabels(lang, { en, pt });
async function authorDialog(env) {
  if (env.ed.hasAuthor()) return true;
  const L11 = env.app.ui.L;
  const name = await promptDialog({ title: L11.authorTitle, label: L11.authorText, ok: L11.authorOk, layer: env.layer, lang: env.lang });
  if (!name?.trim()) return false;
  env.ed.author = name.trim();
  originStore.set("uw-author", env.ed.author);
  return true;
}
async function commentDialog(env) {
  const L11 = env.app.ui.L;
  if (!env.ed.selectedText()) {
    env.app.ui.flash(L11.selectToComment);
    return;
  }
  if (!await authorDialog(env)) return;
  const text = await promptDialog({ title: L11.commentTitle, label: L11.commentText, multiline: true, ok: L11.commentAdd, layer: env.layer, lang: env.lang });
  if (!text?.trim()) return;
  env.app.ui.flash(env.ed.addComment(text.trim()) === null ? L11.selectToComment : L11.commentAdded);
}
async function fontDialog(env, families) {
  const L11 = env.app.ui.L, lang = env.lang;
  const r5 = env.state().run;
  const cur = r5.fontAscii ?? "";
  const fams = cur && !families.includes(cur) ? [cur, ...families] : families;
  const font = select4("font", fams.map((f3) => [f3, f3]), cur);
  const size = el6("input", { type: "number", name: "size", min: "1", max: "1638", step: "0.5", value: String((r5.szHalfPt ?? 22) / 2) });
  const color = el6("input", { type: "color", name: "color", value: `#${r5.color && /^[0-9a-f]{6}$/i.test(r5.color) ? r5.color : "000000"}` });
  color.style.cssText = "width:48px;height:32px;padding:2px;border-radius:8px";
  const spacing = select4("spacing", [
    ["0", "Normal"],
    ["20", tr4(lang, "Expanded 1 pt", "Expandido 1 pt")],
    ["40", tr4(lang, "Expanded 2 pt", "Expandido 2 pt")],
    ["-10", tr4(lang, "Condensed 0.5 pt", "Condensado 0,5 pt")],
    ["-20", tr4(lang, "Condensed 1 pt", "Condensado 1 pt")]
  ], String(r5.charSpacingTwips ?? 0));
  const flags = {
    bold: [tr4(lang, "Bold", "Negrito"), !!r5.bold],
    italic: [tr4(lang, "Italic", "It\xE1lico"), !!r5.italic],
    underline: [tr4(lang, "Underline", "Sublinhado"), !!r5.underline],
    strike: [tr4(lang, "Strikethrough", "Tachado"), !!r5.strike],
    sup: [tr4(lang, "Superscript", "Sobrescrito"), r5.vertAlign === "superscript"],
    sub: [tr4(lang, "Subscript", "Subscrito"), r5.vertAlign === "subscript"],
    allCaps: [tr4(lang, "All caps", "Todas em mai\xFAsculas"), !!r5.allCaps],
    smallCaps: [tr4(lang, "Small caps", "Versalete"), !!r5.smallCaps]
  };
  const grid2 = el6(
    "div",
    { className: "uo-dialog-grid" },
    el6("span", {}, L11.fontDlg),
    font,
    el6("span", {}, L11.size),
    size,
    el6("span", {}, L11.color),
    color,
    el6("span", {}, L11.charSpacing),
    spacing
  );
  const fx = el6("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px 16px" });
  for (const [k2, [label, on]] of Object.entries(flags)) fx.append(check5(k2, label, on));
  const body = el6("div", { style: "display:flex;flex-direction:column;gap:14px" }, grid2, el6("strong", {}, L11.effects), fx);
  const h3 = openDialog({
    title: L11.fontDlg,
    body,
    layer: env.layer,
    lang,
    width: 440,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.apply, primary: true }]
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
var unitOf = (lang) => lang === "pt" ? { tw: 1440 / 2.54, name: "cm", step: "0.01" } : { tw: 1440, name: '"', step: "0.01" };
var fmtUnit = (tw, u3, lang) => (Math.round(tw / u3.tw * 100) / 100).toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 2 });
var parseUnit = (v2, u3) => {
  const n5 = parseFloat(v2.replace(/\s|cm|"|pol|in/gi, "").replace(",", "."));
  return Number.isFinite(n5) ? Math.round(n5 * u3.tw) : NaN;
};
var unitInput = (name, tw, u3, lang, min) => el6("input", { type: "text", name, value: fmtUnit(tw, u3, lang), inputMode: "decimal", style: "width:96px", ...min !== void 0 ? { dataset: { min: String(min) } } : {} });
async function paragraphDialog(env) {
  const L11 = env.app.ui.L, lang = env.lang;
  const p3 = env.state().para;
  const u3 = unitOf(lang);
  const ind = env.ed.getParagraphIndents();
  const align = select4("align", [
    ["left", tr4(lang, "Left", "Esquerda")],
    ["center", tr4(lang, "Centered", "Centralizada")],
    ["right", tr4(lang, "Right", "Direita")],
    ["both", tr4(lang, "Justified", "Justificada")]
  ], p3.alignment ?? "left");
  const left = unitInput("left", ind.left, u3, lang);
  const right = unitInput("right", ind.right, u3, lang);
  const special = select4("special", [
    ["none", tr4(lang, "(none)", "(nenhum)")],
    ["firstLine", tr4(lang, "First line", "Primeira linha")],
    ["hanging", tr4(lang, "Hanging", "Deslocamento")]
  ], !ind.firstLine ? "none" : ind.firstLine > 0 ? "firstLine" : "hanging");
  const by = unitInput("by", Math.abs(ind.firstLine), u3, lang);
  const syncBy = () => {
    by.disabled = special.value === "none";
    if (special.value === "none") by.value = "";
    else if (!by.value || parseUnit(by.value, u3) === 0) by.value = fmtUnit(Math.round(u3.tw * (lang === "pt" ? 1.25 : 0.5)), u3, lang);
  };
  special.addEventListener("change", syncBy);
  if (special.value === "none") {
    by.value = "";
    by.disabled = true;
  }
  const pt = (tw) => String(Math.round((tw ?? 0) / 2) / 10);
  const before = el6("input", { type: "number", name: "before", min: "0", step: "6", value: pt(p3.spaceBeforeTwips) });
  const after = el6("input", { type: "number", name: "after", min: "0", step: "6", value: pt(p3.spaceAfterTwips) });
  const dec = tr4(lang, ".", ",");
  const line2 = select4(
    "line",
    [["240", `1${dec}0`], ["259", `1${dec}08`], ["276", `1${dec}15`], ["360", `1${dec}5`], ["480", `2${dec}0`]],
    String(p3.lineTwentieths ?? 259)
  );
  const withUnit = (i5) => el6("span", { style: "display:flex;gap:4px;align-items:center" }, i5, u3.name);
  const grid2 = el6(
    "div",
    { className: "uo-dialog-grid" },
    el6("span", {}, L11.alignment),
    align,
    el6("span", {}, tr4(lang, "Left indent", "Recuo \xE0 esquerda")),
    withUnit(left),
    el6("span", {}, tr4(lang, "Right indent", "Recuo \xE0 direita")),
    withUnit(right),
    el6("span", {}, L11.specialIndent),
    el6("span", { style: "display:flex;gap:6px;align-items:center" }, special, withUnit(by)),
    el6("span", {}, L11.before),
    before,
    el6("span", {}, L11.after),
    after,
    el6("span", {}, L11.lineSpacing),
    line2
  );
  const h3 = openDialog({
    title: L11.paraDlg,
    body: grid2,
    layer: env.layer,
    lang,
    width: 460,
    actions: [{ id: "tabs", label: tr4(lang, "Tabs\u2026", "Tabula\xE7\xE3o\u2026") }, { id: "cancel", label: L11.cancel }, { id: "ok", label: L11.apply, primary: true }]
  });
  const res = await h3.result;
  if (res !== "ok" && res !== "tabs") return;
  const ed = env.ed;
  ed.setAlignment(align.value);
  const nl = parseUnit(left.value, u3), nr = parseUnit(right.value, u3);
  const nb = special.value === "none" ? 0 : parseUnit(by.value, u3);
  const nf = special.value === "hanging" ? -Math.abs(nb) : Math.abs(nb);
  const patch = {};
  if (Number.isFinite(nl) && nl !== ind.left) patch.left = nl;
  if (Number.isFinite(nr) && nr !== ind.right) patch.right = nr;
  if (Number.isFinite(nf) && nf !== ind.firstLine) patch.firstLine = nf;
  if (Object.keys(patch).length) ed.setParagraphIndents(patch);
  ed.setSpaceBefore(Math.round(Number(before.value) * 20));
  ed.setSpaceAfter(Math.round(Number(after.value) * 20));
  ed.setLineSpacing(Number(line2.value));
  if (res === "tabs") await tabsDialog(env);
}
async function tabsDialog(env) {
  const lang = env.lang, ed = env.ed, L11 = env.app.ui.L;
  const u3 = unitOf(lang);
  const cur = ed.getTabStops();
  let tabs = cur.tabs.map((t5) => ({ ...t5 }));
  const cleared = [];
  const pos = el6("input", { type: "text", name: "pos", inputMode: "decimal", style: "width:100%" });
  pos.setAttribute("aria-label", tr4(lang, "Tab stop position", "Posi\xE7\xE3o da parada de tabula\xE7\xE3o"));
  const list = el6("select", { name: "list", size: 6, style: "width:100%;height:132px" });
  const def = unitInput("default", cur.defaultTabTwips, u3, lang);
  const clearedEl = el6("div", { style: "font-size:12px;min-height:16px;color:var(--u-color-on-surface-variant,#44474f)" });
  const radios2 = (name, opts, value) => {
    const box = el6("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:4px 12px" });
    for (const [v2, t5] of opts) {
      const i5 = el6("input", { type: "radio", name, value: v2, checked: v2 === value });
      box.append(el6("label", { className: "uo-check" }, i5, t5));
    }
    return box;
  };
  const alignBox = radios2("align", [
    ["left", tr4(lang, "Left", "Esquerdo")],
    ["center", tr4(lang, "Center", "Centralizado")],
    ["right", tr4(lang, "Right", "Direito")],
    ["decimal", tr4(lang, "Decimal", "Decimal")],
    ["bar", tr4(lang, "Bar", "Barra")]
  ], "left");
  const leaderBox = radios2("leader", [["", tr4(lang, "1 None", "1 Nenhum")], ["dot", "2 ......."], ["hyphen", "3 -------"], ["underscore", "4 _______"]], "");
  const val = (name) => alignBox.parentElement?.querySelector(`input[name="${name}"]:checked`)?.value ?? body.querySelector(`input[name="${name}"]:checked`)?.value ?? "";
  const setRadio = (name, v2) => {
    for (const i5 of body.querySelectorAll(`input[name="${name}"]`)) i5.checked = i5.value === v2;
  };
  const render = (keep) => {
    tabs.sort((a3, b3) => a3.pos - b3.pos);
    list.replaceChildren(...tabs.map((t5) => el6("option", { value: String(t5.pos), textContent: `${fmtUnit(t5.pos, u3, lang)} ${u3.name}` })));
    if (keep !== void 0) list.value = String(keep);
    clearedEl.textContent = cleared.length ? `${tr4(lang, "Tab stops to be cleared:", "Tabula\xE7\xF5es a serem limpas:")} ${cleared.map((x2) => `${fmtUnit(x2, u3, lang)} ${u3.name}`).join("; ")}` : "";
  };
  list.addEventListener("change", () => {
    const t5 = tabs.find((x2) => String(x2.pos) === list.value);
    if (!t5) return;
    pos.value = `${fmtUnit(t5.pos, u3, lang)}`;
    setRadio("align", t5.align);
    setRadio("leader", t5.leader === "dot" || t5.leader === "hyphen" || t5.leader === "underscore" ? t5.leader : "");
  });
  const setBtn = el6("button", { type: "button", className: "uo-pill", textContent: tr4(lang, "Set", "Definir") });
  const clrBtn = el6("button", { type: "button", className: "uo-pill", textContent: tr4(lang, "Clear", "Limpar") });
  const allBtn = el6("button", { type: "button", className: "uo-pill", textContent: tr4(lang, "Clear All", "Limpar Tudo") });
  const define = () => {
    const p3 = parseUnit(pos.value, u3);
    if (!Number.isFinite(p3)) return false;
    tabs = tabs.filter((t5) => t5.pos !== p3);
    const lead = val("leader");
    tabs.push({ pos: p3, align: val("align") || "left", ...lead ? { leader: lead } : {} });
    const ci = cleared.indexOf(p3);
    if (ci >= 0) cleared.splice(ci, 1);
    render(p3);
    return true;
  };
  setBtn.addEventListener("click", () => {
    define();
    pos.focus();
    pos.select();
  });
  clrBtn.addEventListener("click", () => {
    const p3 = list.value ? Number(list.value) : parseUnit(pos.value, u3);
    if (!Number.isFinite(p3) || !tabs.some((t5) => t5.pos === p3)) return;
    tabs = tabs.filter((t5) => t5.pos !== p3);
    cleared.push(p3);
    pos.value = "";
    render();
  });
  allBtn.addEventListener("click", () => {
    cleared.push(...tabs.map((t5) => t5.pos));
    tabs = [];
    pos.value = "";
    render();
  });
  pos.addEventListener("keydown", (e6) => {
    if (e6.key === "Enter") {
      e6.preventDefault();
      define();
    }
  });
  const left = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px;min-width:150px;flex:1 1 0" },
    el6("span", {}, tr4(lang, "Tab stop position:", "Posi\xE7\xE3o da parada de tabula\xE7\xE3o:")),
    pos,
    list
  );
  const right = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:6px;flex:1 1 0" },
    el6("span", {}, tr4(lang, "Default tab stops:", "Paradas de tabula\xE7\xE3o padr\xE3o:")),
    el6("span", { style: "display:flex;gap:4px;align-items:center" }, def, u3.name),
    clearedEl
  );
  const body = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el6("div", { style: "display:flex;gap:16px" }, left, right),
    el6("strong", {}, tr4(lang, "Alignment", "Alinhamento")),
    alignBox,
    el6("strong", {}, tr4(lang, "Leader", "Preenchimento")),
    leaderBox,
    el6("div", { style: "display:flex;gap:8px;justify-content:flex-end" }, setBtn, clrBtn, allBtn)
  );
  render();
  if (tabs[0]) {
    list.value = String(tabs[0].pos);
    list.dispatchEvent(new Event("change"));
  }
  const h3 = openDialog({
    title: tr4(lang, "Tabs", "Tabula\xE7\xE3o"),
    body,
    layer: env.layer,
    lang,
    width: 460,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.apply, primary: true }]
  });
  setTimeout(() => pos.focus(), 0);
  if (await h3.result !== "ok") return;
  if (pos.value && !tabs.some((t5) => t5.pos === parseUnit(pos.value, u3))) define();
  const d3 = parseUnit(def.value, u3);
  if (Number.isFinite(d3) && d3 > 0 && d3 !== cur.defaultTabTwips) ed.setDefaultTabStop(d3);
  const same = JSON.stringify(tabs) === JSON.stringify(cur.tabs.map((t5) => ({ ...t5 })).sort((a3, b3) => a3.pos - b3.pos));
  if (!same) ed.setTabStops(tabs);
}
var applyToSelect = (lang, hasSel, value) => select4("applyTo", [
  ["section", tr4(lang, "This section", "Esta se\xE7\xE3o")],
  ["forward", tr4(lang, "This point forward", "Deste ponto em diante")],
  ["document", tr4(lang, "Whole document", "No documento inteiro")],
  ...hasSel ? [["selection", tr4(lang, "Selected text", "Texto selecionado")]] : []
], value);
async function pageDialog(env) {
  const L11 = env.app.ui.L, lang = env.lang;
  const u3 = unitOf(lang);
  const orient = select4("orientation", [["portrait", tr4(lang, "Portrait", "Retrato")], ["landscape", tr4(lang, "Landscape", "Paisagem")]], "portrait");
  const size = select4("size", [["A4", "A4"], ["Letter", tr4(lang, "Letter", "Carta")]], "A4");
  const margins = select4("margins", [["normal", "Normal"], ["narrow", tr4(lang, "Narrow", "Estreita")], ["wide", tr4(lang, "Wide", "Larga")], ["custom", tr4(lang, "Custom", "Personalizadas")]], "normal");
  const s4 = env.ed.getSection();
  const cm = s4 ? { ...s4.margins } : { top: 1417, right: 1701, bottom: 1417, left: 1701 };
  if (s4) {
    orient.value = s4.orientation;
    size.value = Math.abs(Math.min(s4.pageWidthTwips, s4.pageHeightTwips) - 12240) < 60 ? "Letter" : "A4";
    const m2 = s4.orientation === "landscape" ? s4.margins.top : s4.margins.left;
    margins.value = m2 < 1e3 ? "narrow" : m2 > 2200 ? "wide" : "normal";
  }
  const mt = unitInput("mtop", cm.top, u3, lang), mb = unitInput("mbottom", cm.bottom, u3, lang);
  const ml = unitInput("mleft", cm.left, u3, lang), mr = unitInput("mright", cm.right, u3, lang);
  const marginInputs = [mt, mb, ml, mr];
  for (const i5 of marginInputs) i5.addEventListener("input", () => {
    margins.value = "custom";
  });
  const start = { orientation: orient.value, size: size.value, margins: margins.value };
  const applyTo = applyToSelect(lang, env.ed.selectedText().length > 0, "section");
  const withUnit = (i5) => el6("span", { style: "display:flex;gap:4px;align-items:center" }, i5, u3.name);
  const grid2 = el6(
    "div",
    { className: "uo-dialog-grid" },
    el6("span", {}, L11.orientation),
    orient,
    el6("span", {}, L11.paper),
    size,
    el6("span", {}, L11.margins),
    margins,
    el6("span", {}, tr4(lang, "Top", "Superior")),
    withUnit(mt),
    el6("span", {}, tr4(lang, "Bottom", "Inferior")),
    withUnit(mb),
    el6("span", {}, tr4(lang, "Left", "Esquerda")),
    withUnit(ml),
    el6("span", {}, tr4(lang, "Right", "Direita")),
    withUnit(mr),
    el6("span", {}, tr4(lang, "Apply to", "Aplicar a")),
    applyTo
  );
  const h3 = openDialog({
    title: L11.pageDlg,
    body: grid2,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  const all = applyTo.value !== "section";
  const custom = margins.value === "custom" ? { top: parseUnit(mt.value, u3), bottom: parseUnit(mb.value, u3), left: parseUnit(ml.value, u3), right: parseUnit(mr.value, u3) } : null;
  const customOk = !!custom && Object.values(custom).every((v2) => Number.isFinite(v2) && v2 >= 0);
  env.ed.setPageSetup({
    ...all || orient.value !== start.orientation ? { orientation: orient.value } : {},
    ...all || size.value !== start.size ? { size: size.value } : {},
    ...customOk ? { customMargins: custom } : all || margins.value !== start.margins ? { margins: margins.value } : {},
    applyTo: applyTo.value
  });
}
async function columnsDialog(env) {
  const lang = env.lang, ed = env.ed;
  const s4 = ed.getSection();
  if (!s4) return;
  const W = s4.columns.contentWidthTwips;
  const unit = lang === "pt" ? { tw: 1440 / 2.54, name: "cm", step: "0.01" } : { tw: 1440, name: '"', step: "0.01" };
  const fmt = (tw) => String(Math.round(tw / unit.tw * 100) / 100);
  const parse = (v2) => Math.round(parseFloat(v2.replace(",", ".")) * unit.tw);
  const MIN = 720;
  const st = {
    count: s4.columns.count,
    equal: s4.columns.equalWidth,
    sep: s4.columns.sep,
    widths: s4.columns.widths.map((w2) => ({ ...w2 })),
    space: s4.columns.count > 1 ? s4.columns.spaceTwips : 708
  };
  const equalize = () => {
    const n5 = st.count;
    if ((W - st.space * (n5 - 1)) / n5 < MIN) st.space = n5 > 1 ? Math.max(0, Math.floor((W - n5 * MIN) / (n5 - 1))) : st.space;
    const w2 = Math.round((W - st.space * (n5 - 1)) / n5);
    st.widths = Array.from({ length: n5 }, (_2, i5) => ({ widthTwips: w2, spaceTwips: i5 < n5 - 1 ? st.space : 0 }));
  };
  const presets = el6("div", { style: "display:flex;gap:8px;flex-wrap:wrap" });
  const PRESETS = [["one", "One", "Uma", 1], ["two", "Two", "Duas", 2], ["three", "Three", "Tr\xEAs", 3], ["left", "Left", "Esquerda", 2], ["right", "Right", "Direita", 2]];
  const presetBtns = PRESETS.map(([id, en, pt, n5]) => {
    const b3 = el6("button", { type: "button", textContent: tr4(lang, en, pt), style: "min-width:72px;padding:6px 10px;border-radius:8px;border:1px solid var(--uo-border, #c7c7c7);background:transparent;color:inherit;cursor:pointer;font:inherit" });
    b3.addEventListener("click", () => {
      st.count = n5;
      if (id === "left" || id === "right") {
        const narrow = Math.round((W - 2 * st.space) / 3), wide = W - narrow - st.space;
        const ws = id === "left" ? [narrow, wide] : [wide, narrow];
        st.equal = false;
        st.widths = ws.map((w2, i5) => ({ widthTwips: w2, spaceTwips: i5 === 0 ? st.space : 0 }));
      } else {
        st.equal = true;
        equalize();
      }
      render();
    });
    presets.append(b3);
    return [id, b3];
  });
  const count = el6("input", { type: "number", name: "count", min: "1", max: String(s4.columns.max), step: "1", value: String(st.count), style: "width:72px" });
  const sep = check5("sep", tr4(lang, "Line between", "Linha entre colunas"), st.sep);
  const equal = check5("equal", tr4(lang, "Equal column width", "Colunas de mesma largura"), st.equal);
  const rows = el6("div", { style: "display:grid;grid-template-columns:auto 1fr 1fr;gap:6px 10px;align-items:center" });
  const applyTo = applyToSelect(lang, ed.selectedText().length > 0, "section");
  const newCol = check5("newCol", tr4(lang, "Start new column", "Iniciar nova coluna"), false);
  const preview2 = el6("div", { style: "display:flex;height:84px;border:1px solid var(--uo-border, #c7c7c7);border-radius:6px;padding:8px;box-sizing:border-box;gap:0" });
  const box = (k2) => (k2 === "sep" ? sep : k2 === "equal" ? equal : newCol).querySelector("input");
  function render() {
    count.value = String(st.count);
    box("equal").checked = st.equal;
    box("equal").disabled = st.count < 2;
    box("sep").disabled = st.count < 2;
    box("newCol").disabled = applyTo.value !== "forward";
    if (box("newCol").disabled) box("newCol").checked = false;
    for (const [id, b3] of presetBtns) {
      const on = id === "one" ? st.count === 1 : id === "two" || id === "three" ? st.equal && st.count === (id === "two" ? 2 : 3) : !st.equal && st.count === 2 && Math.abs(st.widths[0].widthTwips - st.widths[1].widthTwips) > 40 && id === "left" === st.widths[0].widthTwips < st.widths[1].widthTwips;
      b3.style.background = on ? "var(--uo-accent-soft, rgba(26,115,232,.14))" : "transparent";
      b3.setAttribute("aria-pressed", String(on));
    }
    rows.replaceChildren(el6("strong", {}, "#"), el6("strong", {}, tr4(lang, "Width", "Largura")), el6("strong", {}, tr4(lang, "Spacing", "Espa\xE7amento")));
    st.widths.slice(0, Math.max(1, st.count)).forEach((c4, i5) => {
      const last = i5 === st.count - 1;
      const wIn = el6("input", { type: "number", step: unit.step, min: "0", value: fmt(c4.widthTwips), disabled: st.count < 2 || st.equal && i5 > 0, style: "width:96px" });
      const sIn = el6("input", { type: "number", step: unit.step, min: "0", value: last ? "" : fmt(c4.spaceTwips), disabled: last || st.count < 2 || st.equal && i5 > 0, style: "width:96px" });
      wIn.setAttribute("aria-label", `${tr4(lang, "Width", "Largura")} ${i5 + 1}`);
      sIn.setAttribute("aria-label", `${tr4(lang, "Spacing", "Espa\xE7amento")} ${i5 + 1}`);
      wIn.addEventListener("change", () => setWidth(i5, parse(wIn.value)));
      sIn.addEventListener("change", () => setSpace(i5, parse(sIn.value)));
      rows.append(el6("span", {}, `${i5 + 1}:`), el6("span", { style: "display:flex;gap:4px;align-items:center" }, wIn, unit.name), el6("span", { style: "display:flex;gap:4px;align-items:center" }, sIn, last ? "" : unit.name));
    });
    preview2.replaceChildren(...st.widths.slice(0, Math.max(1, st.count)).flatMap((c4, i5) => {
      const col = el6("div", { style: `flex:${c4.widthTwips} 0 0;background:repeating-linear-gradient(to bottom, currentColor 0 2px, transparent 2px 7px);opacity:.45` });
      if (i5 === st.count - 1) return [col];
      const gap = el6("div", { style: `flex:${Math.max(1, c4.spaceTwips)} 0 0;display:flex;justify-content:center` });
      if (box("sep").checked) gap.append(el6("div", { style: "width:1px;background:currentColor" }));
      return [col, gap];
    }));
  }
  function setWidth(i5, w2) {
    if (!(w2 > 0)) {
      render();
      return;
    }
    if (st.equal) {
      const n5 = st.count;
      const ww = Math.max(MIN, Math.min(w2, Math.floor(W / n5)));
      st.space = n5 > 1 ? Math.max(0, Math.floor((W - n5 * ww) / (n5 - 1))) : 0;
      st.widths = st.widths.map((c4, k2) => ({ widthTwips: ww, spaceTwips: k2 < n5 - 1 ? st.space : 0 }));
    } else {
      const j = i5 < st.count - 1 ? i5 + 1 : i5 - 1;
      const total = st.widths[i5].widthTwips + st.widths[j].widthTwips;
      const ww = Math.max(MIN, Math.min(w2, total - MIN));
      st.widths[i5].widthTwips = ww;
      st.widths[j].widthTwips = total - ww;
    }
    render();
  }
  function setSpace(i5, sp) {
    if (!(sp >= 0)) {
      render();
      return;
    }
    if (st.equal) {
      const n5 = st.count;
      st.space = Math.min(sp, Math.floor((W - n5 * MIN) / Math.max(1, n5 - 1)));
      equalize();
    } else {
      const j = i5 + 1;
      const total = st.widths[i5].spaceTwips + st.widths[j].widthTwips;
      const ss = Math.max(0, Math.min(sp, total - MIN));
      st.widths[i5].spaceTwips = ss;
      st.widths[j].widthTwips = total - ss;
    }
    render();
  }
  count.addEventListener("change", () => {
    const n5 = Math.max(1, Math.min(s4.columns.max, Math.round(Number(count.value) || 1)));
    st.count = n5;
    if (n5 < 2) st.equal = true;
    if (st.equal || st.widths.length !== n5) {
      st.equal = true;
      equalize();
    }
    render();
  });
  box("equal").addEventListener("change", () => {
    st.equal = box("equal").checked;
    if (st.equal) {
      st.space = st.widths[0]?.spaceTwips || st.space;
      equalize();
    }
    render();
  });
  box("sep").addEventListener("change", () => {
    st.sep = box("sep").checked;
    render();
  });
  applyTo.addEventListener("change", render);
  if (st.count < 2) {
    st.count = 1;
    equalize();
  }
  render();
  const body = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    el6("strong", {}, tr4(lang, "Presets", "Predefini\xE7\xF5es")),
    presets,
    el6(
      "div",
      { style: "display:flex;gap:16px;align-items:center;flex-wrap:wrap" },
      el6("label", { style: "display:flex;gap:8px;align-items:center" }, tr4(lang, "Number of columns", "N\xFAmero de colunas"), count),
      sep
    ),
    el6("strong", {}, tr4(lang, "Width and spacing", "Largura e espa\xE7amento")),
    rows,
    equal,
    el6("div", { className: "uo-dialog-grid" }, el6("span", {}, tr4(lang, "Apply to", "Aplicar a")), applyTo),
    newCol,
    el6("strong", {}, tr4(lang, "Preview", "Visualiza\xE7\xE3o")),
    preview2
  );
  const h3 = openDialog({
    title: tr4(lang, "Columns", "Colunas"),
    icon: "view_column_2",
    body,
    layer: env.layer,
    lang,
    width: 460,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: env.app.ui.L.apply, primary: true }]
  });
  if (await h3.result !== "ok") return;
  ed.setColumns({
    count: st.count,
    spaceTwips: st.space,
    ...st.equal || st.count < 2 ? {} : { widths: st.widths.slice(0, st.count) },
    sep: st.sep,
    applyTo: applyTo.value,
    startNewColumn: box("newCol").checked
  });
}
function wordCountDialog(env) {
  const L11 = env.app.ui.L;
  const s4 = env.ed.stats();
  const fmt = (n5) => n5.toLocaleString(tr4(env.lang, "en-US", "pt-BR"));
  const grid2 = el6(
    "div",
    { className: "uo-dialog-grid" },
    el6("span", {}, L11.pages),
    el6("strong", {}, fmt(s4.pages)),
    el6("span", {}, L11.words),
    el6("strong", {}, fmt(s4.words)),
    el6("span", {}, L11.chars),
    el6("strong", {}, fmt(s4.chars))
  );
  openDialog({ title: L11.wordCountTitle, body: grid2, layer: env.layer, lang: env.lang, width: 320 });
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
  ["Ctrl+Shift+Enter", "Column break", "Quebra de coluna"],
  ["Ctrl+D", "Font dialog", "Di\xE1logo Fonte"],
  ["Ctrl+Shift+8", "Formatting marks", "Marcas de formata\xE7\xE3o"],
  ["Ctrl+scroll", "Zoom", "Zoom"]
];
function shortcutsDialog(env) {
  const grid2 = el6("div", { className: "uo-dialog-grid" });
  grid2.style.gridTemplateColumns = "auto 1fr";
  for (const [k2, en, pt] of SHORTCUTS) {
    grid2.append(el6("kbd", { style: "font:inherit;font-size:12.5px;font-weight:600;white-space:nowrap" }, k2), el6("span", {}, tr4(env.lang, en, pt)));
  }
  openDialog({ title: env.app.ui.L.shortcutsTitle, body: grid2, layer: env.layer, lang: env.lang, width: 520 });
}
function aboutDialog(env) {
  const L11 = env.app.ui.L;
  openDialog({ title: L11.aboutTitle, icon: "info", body: L11.aboutText, layer: env.layer, lang: env.lang, width: 400 });
}
async function spellingDialog(env) {
  const lang = env.lang, ed = env.ed;
  const done = tr4(lang, "The spelling check is complete.", "A verifica\xE7\xE3o ortogr\xE1fica foi conclu\xEDda.");
  const skip = /* @__PURE__ */ new Set();
  const always = /* @__PURE__ */ new Map();
  let cur = await ed.nextMisspelling(skip);
  if (!cur) {
    env.app.ui.flash(done);
    return;
  }
  const word = el6("div", { style: "font-size:18px;font-weight:600;color:#e81123;margin-bottom:2px" });
  const info = el6("div", { style: "opacity:.7;font-size:12px;margin-bottom:10px" });
  const list = el6("select", { size: 6, style: "width:100%;box-sizing:border-box;height:auto;min-height:132px;padding:4px" });
  const show = async (m2) => {
    word.textContent = m2.word;
    info.textContent = tr4(lang, `Not in dictionary (${m2.lang})`, `N\xE3o consta no dicion\xE1rio (${m2.lang})`);
    const sug = await ed.spellingSuggestions(m2, 8);
    list.replaceChildren(...sug.length ? sug.map((x2) => el6("option", { value: x2, textContent: x2 })) : [el6("option", { value: "", disabled: true, textContent: tr4(lang, "(no suggestions)", "(sem sugest\xF5es)") })]);
    list.selectedIndex = sug.length ? 0 : -1;
  };
  await show(cur);
  const body = el6("div", {}, word, info, el6("div", { style: "font-size:12px;margin-bottom:4px" }, tr4(lang, "Suggestions", "Sugest\xF5es")), list);
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
    title: tr4(lang, "Spelling", "Ortografia"),
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
var radio3 = (name, value, label, on) => el6("label", { className: "uo-check" }, el6("input", { type: "radio", name, value, checked: on }), label);
async function notesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T5 = (en, pt) => tr4(lang, en, pt);
  let kind = ed.editingNote()?.kind ?? "footnote";
  const st = { footnote: ed.getNoteOptions("footnote"), endnote: ed.getNoteOptions("endnote") };
  const fnRadio = radio3("kind", "footnote", T5("Footnotes:", "Notas de rodap\xE9:"), kind === "footnote");
  const enRadio = radio3("kind", "endnote", T5("Endnotes:", "Notas de fim:"), kind === "endnote");
  const fnPos = select4("fnPos", [["pageBottom", T5("Bottom of page", "Fim da p\xE1gina")], ["beneathText", T5("Below text", "Abaixo do texto")]], st.footnote.position);
  const enPos = select4("enPos", [["docEnd", T5("End of document", "Fim do documento")], ["sectEnd", T5("End of section", "Fim da se\xE7\xE3o")]], st.endnote.position);
  const convert = el6("button", { type: "button", className: "uo-pill", textContent: T5("Convert\u2026", "Converter\u2026") });
  const columns = select4("columns", [["0", T5("Match section layout", "Coincidir layout de se\xE7\xE3o")], ["1", T5("1 column", "1 coluna")], ["2", T5("2 columns", "2 colunas")], ["3", T5("3 columns", "3 colunas")], ["4", T5("4 columns", "4 colunas")]], String(st.footnote.columns ?? 0));
  const format = select4("format", [
    ["decimal", "1, 2, 3, \u2026"],
    ["lowerLetter", "a, b, c, \u2026"],
    ["upperLetter", "A, B, C, \u2026"],
    ["lowerRoman", "i, ii, iii, \u2026"],
    ["upperRoman", "I, II, III, \u2026"],
    ["chicago", "*, \u2020, \u2021, \xA7, \u2026"]
  ], st[kind].numberFormat);
  const mark = el6("input", { type: "text", name: "mark", maxLength: 10, style: "width:72px" });
  mark.setAttribute("aria-label", T5("Custom mark", "Marca personalizada"));
  const symbols = el6("div", { style: "display:flex;gap:4px;flex-wrap:wrap" });
  for (const ch of ["*", "\u2020", "\u2021", "\xA7", "\xB6", "\u2016", "#", "\u203B", "\xB9", "\xB2", "\xB3"]) {
    const b3 = el6("button", { type: "button", className: "uo-btn", textContent: ch, title: ch, style: "min-width:28px;font:inherit" });
    b3.addEventListener("click", () => {
      mark.value += ch;
      mark.focus();
    });
    symbols.append(b3);
  }
  const startAt = el6("input", { type: "number", name: "startAt", min: "1", step: "1", value: String(st[kind].startAt), style: "width:72px" });
  const restart = select4("restart", [["continuous", T5("Continuous", "Cont\xEDnua")], ["eachSect", T5("Restart each section", "Reiniciar a cada se\xE7\xE3o")], ["eachPage", T5("Restart each page", "Reiniciar a cada p\xE1gina")]], st[kind].restart);
  const scope = select4("scope", [["document", T5("Whole document", "Todo o documento")], ["section", T5("This section", "Esta se\xE7\xE3o")]], "document");
  const show = () => {
    format.value = st[kind].numberFormat;
    startAt.value = String(st[kind].startAt);
    restart.value = st[kind].restart;
    restart.querySelector('option[value="eachPage"]').disabled = kind === "endnote";
    columns.disabled = kind !== "footnote";
    fnPos.disabled = kind !== "footnote";
    enPos.disabled = kind !== "endnote";
    startAt.disabled = restart.value !== "continuous";
  };
  const keep = () => {
    const o6 = st[kind];
    o6.numberFormat = format.value;
    o6.restart = restart.value;
    o6.startAt = o6.restart === "continuous" ? Math.max(1, Math.round(Number(startAt.value) || 1)) : 1;
    st.footnote.position = fnPos.value;
    st.footnote.columns = Number(columns.value);
    st.endnote.position = enPos.value;
  };
  for (const r5 of [fnRadio, enRadio]) r5.querySelector("input").addEventListener("change", (e6) => {
    keep();
    kind = e6.target.value;
    show();
  });
  restart.addEventListener("change", () => {
    if (restart.value !== "continuous") startAt.value = "1";
    startAt.disabled = restart.value !== "continuous";
  });
  show();
  const grid2 = (...rows) => el6("div", { className: "uo-dialog-grid" }, ...rows.flatMap(([label, ...kids]) => [el6("span", {}, label), el6("span", { style: "display:flex;gap:8px;align-items:center;flex-wrap:wrap" }, ...kids)]));
  const body = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    el6("strong", {}, T5("Location", "Local")),
    el6("div", { className: "uo-dialog-grid" }, fnRadio, fnPos, enRadio, enPos),
    el6("div", {}, convert),
    el6("strong", {}, T5("Footnote layout", "Layout de nota de rodap\xE9")),
    grid2([T5("Columns:", "Colunas:"), columns]),
    el6("strong", {}, T5("Format", "Formato")),
    grid2([T5("Number format:", "Formato do n\xFAmero:"), format], [T5("Custom mark:", "Marca personalizada:"), mark], [T5("Symbol:", "S\xEDmbolo:"), symbols], [T5("Start at:", "Iniciar em:"), startAt], [T5("Numbering:", "Numera\xE7\xE3o:"), restart]),
    el6("strong", {}, T5("Apply changes", "Aplicar altera\xE7\xF5es")),
    grid2([T5("Apply changes to:", "Aplicar altera\xE7\xF5es a:"), scope])
  );
  convert.addEventListener("click", () => {
    void convertNotesDialog(env);
  });
  const canInsert = ed.canInsertNote();
  const h3 = openDialog({
    title: T5("Footnote and Endnote", "Notas de Rodap\xE9 e de Fim"),
    icon: "notes",
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [
      ...canInsert ? [{ id: "insert", label: T5("Insert", "Inserir"), primary: true }] : [],
      { id: "cancel", label: env.app.ui.L.cancel },
      { id: "apply", label: env.app.ui.L.apply, primary: !canInsert }
    ]
  });
  const res = await h3.result;
  if (res !== "insert" && res !== "apply") return;
  keep();
  const sc = scope.value;
  ed.setNoteOptions("footnote", st.footnote, sc);
  ed.setNoteOptions("endnote", st.endnote, sc);
  if (res === "insert") {
    const m2 = mark.value.trim();
    if (kind === "footnote") ed.insertFootnote(m2 ? { mark: m2 } : {});
    else ed.insertEndnote(m2 ? { mark: m2 } : {});
  }
}
async function convertNotesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T5 = (en, pt) => tr4(lang, en, pt);
  const nf = ed.noteCount("footnote"), ne = ed.noteCount("endnote");
  const opts = [
    ["toEndnotes", T5("Convert all footnotes to endnotes", "Converter todas as notas de rodap\xE9 em notas de fim"), nf > 0],
    ["toFootnotes", T5("Convert all endnotes to footnotes", "Converter todas as notas de fim em notas de rodap\xE9"), ne > 0],
    ["swap", T5("Swap footnotes and endnotes", "Trocar notas de rodap\xE9 e notas de fim"), nf > 0 && ne > 0]
  ];
  const first = opts.find((o6) => o6[2])?.[0];
  const body = el6("div", { style: "display:flex;flex-direction:column;gap:8px" }, ...opts.map(([v3, label, on]) => {
    const r5 = radio3("convert", v3, label, v3 === first);
    r5.querySelector("input").disabled = !on;
    return r5;
  }));
  const h3 = openDialog({
    title: T5("Convert Notes", "Converter Notas"),
    icon: "autorenew",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok" || !first) return;
  const v2 = body.querySelector('input[name="convert"]:checked')?.value;
  if (v2) ed.convertNotes(v2);
}
async function showNotesDialog(env) {
  const lang = env.lang, ed = env.ed;
  const T5 = (en, pt) => tr4(lang, en, pt);
  if (ed.editingNote() || !ed.noteCount("footnote") || !ed.noteCount("endnote")) {
    ed.showNotes();
    return;
  }
  const body = el6(
    "div",
    { style: "display:flex;flex-direction:column;gap:8px" },
    el6("span", {}, T5("This document contains both footnotes and endnotes. Which do you want to view?", "Este documento cont\xE9m notas de rodap\xE9 e notas de fim. Qual \xE1rea voc\xEA deseja exibir?")),
    radio3("area", "footnote", T5("View footnote area", "Exibir \xE1rea de notas de rodap\xE9"), true),
    radio3("area", "endnote", T5("View endnote area", "Exibir \xE1rea de notas de fim"), false)
  );
  const h3 = openDialog({
    title: T5("Show Notes", "Mostrar Notas"),
    icon: "notes",
    body,
    layer: env.layer,
    lang,
    width: 420,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const v2 = body.querySelector('input[name="area"]:checked')?.value;
  ed.showNotes(v2 ?? "footnote");
}

// src/chrome-nav.ts
var LABELS = {
  en: {
    title: "Navigation",
    search: "Search document",
    options: "Search options",
    headings: "Headings",
    pages: "Pages",
    results: "Results",
    matchCase: "Match case",
    wholeWord: "Find whole words only",
    highlight: "Highlight all",
    incremental: "Incremental find",
    replace: "Replace\u2026",
    clear: "Clear search",
    result: (i5, n5) => `Result ${i5} of ${n5}`,
    results0: "No results",
    resultsN: (n5) => `${n5} results`,
    prev: "Previous result",
    next: "Next result",
    noHeadings: "Apply Heading styles to the titles in your document so they show up here.",
    noPages: "Thumbnails are available in Print Layout.",
    noSearch: "Type in the search box to find text in the document.",
    noMatch: "We couldn\u2019t find what you were looking for.",
    promote: "Promote",
    demote: "Demote",
    newBefore: "New Heading Before",
    newAfter: "New Heading After",
    newSub: "New Subheading",
    del: "Delete",
    select: "Select Heading and Content",
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    showLevels: "Show Heading Levels",
    all: "All",
    level: (n5) => `Show Heading ${n5}`,
    page: (n5) => `Page ${n5}`,
    collapse: "Collapse",
    expand: "Expand"
  },
  pt: {
    title: "Navega\xE7\xE3o",
    search: "Pesquisar documento",
    options: "Op\xE7\xF5es de pesquisa",
    headings: "T\xEDtulos",
    pages: "P\xE1ginas",
    results: "Resultados",
    matchCase: "Diferenciar mai\xFAsculas e min\xFAsculas",
    wholeWord: "Localizar apenas palavras inteiras",
    highlight: "Real\xE7ar tudo",
    incremental: "Pesquisa incremental",
    replace: "Substituir\u2026",
    clear: "Limpar pesquisa",
    result: (i5, n5) => `Resultado ${i5} de ${n5}`,
    results0: "Nenhum resultado",
    resultsN: (n5) => `${n5} resultados`,
    prev: "Resultado anterior",
    next: "Pr\xF3ximo resultado",
    noHeadings: "Aplique estilos de T\xEDtulo aos t\xEDtulos do documento para que apare\xE7am aqui.",
    noPages: "As miniaturas aparecem no Layout de Impress\xE3o.",
    noSearch: "Digite na caixa de pesquisa para localizar texto no documento.",
    noMatch: "N\xE3o encontramos o que voc\xEA procurava.",
    promote: "Promover",
    demote: "Rebaixar",
    newBefore: "Novo T\xEDtulo Antes",
    newAfter: "Novo T\xEDtulo Depois",
    newSub: "Novo Subt\xEDtulo",
    del: "Excluir",
    select: "Selecionar T\xEDtulo e Conte\xFAdo",
    expandAll: "Expandir Tudo",
    collapseAll: "Recolher Tudo",
    showLevels: "Mostrar N\xEDveis de T\xEDtulo",
    all: "Todos",
    level: (n5) => `Mostrar T\xEDtulo ${n5}`,
    page: (n5) => `P\xE1gina ${n5}`,
    collapse: "Recolher",
    expand: "Expandir"
  }
};
var el7 = (tag, cls, text) => {
  const e6 = document.createElement(tag);
  if (cls) e6.className = cls;
  if (text !== void 0) e6.textContent = text;
  return e6;
};
var NavPane = class {
  constructor(env) {
    this.env = env;
    this.L = pickLabels(env.lang, LABELS);
  }
  env;
  pane = null;
  L;
  tab = "headings";
  input;
  status;
  bodyEl;
  tabs = /* @__PURE__ */ new Map();
  heads = [];
  results = [];
  current = -1;
  query = "";
  opts = { matchCase: false, wholeWord: false, highlight: true, incremental: true };
  /** títulos recolhidos (nível + texto + ocorrência) */
  collapsed = /* @__PURE__ */ new Set();
  maxLevel = 9;
  raf = 0;
  searchTimer = 0;
  thumbs = /* @__PURE__ */ new Map();
  io = null;
  dirtyThumbs = true;
  dragFrom = -1;
  /** assinatura da árvore desenhada (redesenha só quando muda) */
  treeSig = "";
  get isOpen() {
    return !!this.pane;
  }
  open(focusSearch = false) {
    if (!this.pane) this.build();
    this.pane.place();
    this.refresh();
    if (focusSearch) {
      const sel4 = this.env.ed.selectedText();
      if (sel4 && !sel4.includes("\n") && sel4.length < 200) {
        this.input.value = sel4;
        this.runSearch(true);
      }
      this.input.focus();
      this.input.select();
    }
  }
  close() {
    this.pane?.close();
  }
  /** Desmonta sem mexer na preferência (troca de barra, desmontagem). */
  detach() {
    const p3 = this.pane;
    this.pane = null;
    this.io?.disconnect();
    this.io = null;
    this.thumbs.clear();
    p3?.close();
    this.env.ed.classList.remove("uw-nav-open");
  }
  toggle() {
    if (this.pane) this.close();
    else this.open();
  }
  place() {
    this.pane?.place();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.searchTimer);
    this.detach();
  }
  /** O documento mudou (edição, seleção, zoom): redesenha no próximo quadro. */
  schedule(docChanged = false) {
    if (!this.pane) return;
    if (docChanged) {
      this.dirtyThumbs = true;
      if (this.query) {
        clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => this.runSearch(false), 300);
      }
    }
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.refresh();
    });
  }
  build() {
    const L11 = this.L;
    const body = el7("div", "uw-nav");
    const box = el7("div", "uw-nav-search");
    const ic = el7("span", "uw-nav-search-ic");
    ic.innerHTML = symbol("search");
    this.input = el7("input", "uw-nav-input");
    this.input.type = "search";
    this.input.placeholder = L11.search;
    this.input.setAttribute("aria-label", L11.search);
    this.input.dataset["a"] = "nav:search";
    const optBtn = el7("button", "uo-btn uw-nav-opt");
    optBtn.type = "button";
    optBtn.title = L11.options;
    optBtn.setAttribute("aria-label", L11.options);
    optBtn.dataset["a"] = "nav:options";
    optBtn.innerHTML = symbol("arrow_drop_down");
    optBtn.addEventListener("click", () => this.optionsMenu(optBtn));
    box.append(ic, this.input, optBtn);
    this.input.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      if (this.opts.incremental || !this.input.value) this.searchTimer = window.setTimeout(() => this.runSearch(true), this.input.value ? 250 : 0);
    });
    this.input.addEventListener("keydown", (e6) => {
      if (e6.key === "Enter") {
        e6.preventDefault();
        if (this.input.value !== this.query) this.runSearch(true);
        else this.step(e6.shiftKey ? -1 : 1);
      } else if (e6.key === "Escape") {
        e6.preventDefault();
        if (this.input.value) {
          this.input.value = "";
          this.runSearch(true);
        } else this.env.ed.focusEditor();
      }
    });
    const st = el7("div", "uw-nav-status");
    this.status = el7("span", "uw-nav-count");
    const prev = el7("button", "uo-btn uw-nav-step");
    prev.type = "button";
    prev.title = L11.prev;
    prev.setAttribute("aria-label", L11.prev);
    prev.innerHTML = symbol("keyboard_arrow_up");
    prev.dataset["a"] = "nav:prev";
    prev.addEventListener("click", () => this.step(-1));
    const next = el7("button", "uo-btn uw-nav-step");
    next.type = "button";
    next.title = L11.next;
    next.setAttribute("aria-label", L11.next);
    next.innerHTML = symbol("keyboard_arrow_down");
    next.dataset["a"] = "nav:next";
    next.addEventListener("click", () => this.step(1));
    st.append(this.status, prev, next);
    const tabs = el7("div", "uw-nav-tabs");
    tabs.setAttribute("role", "tablist");
    for (const t5 of ["headings", "pages", "results"]) {
      const b3 = el7("button", "uw-nav-tab", L11[t5]);
      b3.type = "button";
      b3.setAttribute("role", "tab");
      b3.dataset["a"] = `nav:tab:${t5}`;
      b3.addEventListener("click", () => {
        this.tab = t5;
        this.refresh();
      });
      this.tabs.set(t5, b3);
      tabs.appendChild(b3);
    }
    this.bodyEl = el7("div", "uw-nav-body");
    body.append(box, st, tabs, this.bodyEl);
    const pane = openPane({
      id: "navigation",
      title: L11.title,
      lang: this.env.lang,
      layer: this.env.layer,
      frame: this.env.frame,
      dock: "left",
      width: 300,
      body,
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.io?.disconnect();
        this.io = null;
        this.thumbs.clear();
        this.env.ed.classList.remove("uw-nav-open");
        this.env.ed.clearSearch();
        this.results = [];
        this.query = "";
        this.env.app.prefs.set("navPane", "");
        this.env.after();
      }
    });
    pane.el.setAttribute("part", "pane navigation-pane");
    this.pane = pane;
    this.env.ed.classList.add("uw-nav-open");
    this.env.app.prefs.set("navPane", "1");
  }
  optionsMenu(anchor) {
    const L11 = this.L;
    const flag = (k2, label) => ({
      id: `nav:${k2}`,
      label,
      checked: this.opts[k2],
      onClick: () => {
        this.opts[k2] = !this.opts[k2];
        if (k2 !== "incremental") this.runSearch(false);
      }
    });
    openMenu([
      flag("matchCase", L11.matchCase),
      flag("wholeWord", L11.wholeWord),
      flag("highlight", L11.highlight),
      flag("incremental", L11.incremental),
      { sep: true },
      { id: "nav:replace", label: L11.replace, icon: "find_replace", onClick: () => this.env.replace(), disabled: this.env.ed.isProtected() },
      { id: "nav:clear", label: L11.clear, icon: "close", onClick: () => {
        this.input.value = "";
        this.runSearch(true);
      }, disabled: !this.query }
    ], { anchor, side: "below" }, { layer: this.env.layer, lang: this.env.lang });
  }
  runSearch(showResults) {
    const q = this.input.value;
    this.query = q;
    this.results = q ? this.env.ed.search(q, { matchCase: this.opts.matchCase, wholeWord: this.opts.wholeWord, highlight: this.opts.highlight }) : (this.env.ed.clearSearch(), []);
    this.current = -1;
    if (q && showResults && this.tab === "headings" && !this.heads.length) this.tab = "results";
    this.refresh();
  }
  step(dir) {
    const n5 = this.results.length;
    if (!n5) return;
    this.current = this.current < 0 ? dir > 0 ? 0 : n5 - 1 : (this.current + dir + n5) % n5;
    this.env.ed.goToSearchResult(this.current);
    this.refresh();
    this.input.focus();
  }
  refresh() {
    if (!this.pane) return;
    const L11 = this.L;
    const ed = this.env.ed;
    this.pane.place();
    this.heads = ed.getHeadings();
    for (const [t5, b3] of this.tabs) {
      b3.classList.toggle("uo-on", t5 === this.tab);
      b3.setAttribute("aria-selected", String(t5 === this.tab));
    }
    const n5 = this.results.length;
    this.status.parentElement.hidden = !this.query;
    this.status.textContent = !this.query ? "" : !n5 ? L11.results0 : this.current >= 0 ? L11.result(this.current + 1, n5) : L11.resultsN(n5);
    for (const b3 of this.status.parentElement.querySelectorAll("button")) b3.disabled = !n5;
    if (this.tab === "headings") this.renderHeadings();
    else if (this.tab === "pages") this.renderPages();
    else this.renderResults();
  }
  // ───── Títulos ─────
  keyOf(h3) {
    let k2 = 0;
    for (const x2 of this.heads) {
      if (x2.index >= h3.index) break;
      if (x2.level === h3.level && x2.text === h3.text) k2++;
    }
    return `${h3.level}|${h3.text}|${k2}`;
  }
  tree() {
    const roots = [];
    const stack = [];
    for (const h3 of this.heads) {
      const node = { h: h3, kids: [] };
      while (stack.length && stack[stack.length - 1].h.level >= h3.level) stack.pop();
      if (stack.length) stack[stack.length - 1].kids.push(node);
      else roots.push(node);
      stack.push(node);
    }
    return roots;
  }
  renderHeadings() {
    const L11 = this.L;
    const ed = this.env.ed;
    const list = el7("div", "uw-nav-tree");
    list.setAttribute("role", "tree");
    if (!this.heads.length) {
      this.treeSig = "";
      this.bodyEl.replaceChildren(el7("p", "uw-nav-empty", L11.noHeadings));
      return;
    }
    const cur = ed.currentHeading(this.heads);
    const hit = new Set(this.results.map((r5) => r5.heading));
    const editable = !ed.isProtected();
    const sig = [this.heads.map((h3) => `${h3.level}|${h3.text}`).join("\n"), [...this.collapsed].join("\n"), this.maxLevel, [...hit].join(","), editable].join("");
    const old = this.bodyEl.querySelector(".uw-nav-tree");
    if (old && this.treeSig === sig) {
      for (const r5 of old.querySelectorAll(".uw-nav-row")) r5.classList.toggle("uo-on", +r5.dataset["index"] === cur);
      old.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
      return;
    }
    this.treeSig = sig;
    const row2 = (node, depth) => {
      const h3 = node.h;
      if (h3.level > this.maxLevel) return;
      const kids = node.kids.filter((k2) => k2.h.level <= this.maxLevel);
      const key = this.keyOf(h3);
      const closed = this.collapsed.has(key);
      const r5 = el7("div", "uw-nav-row");
      r5.setAttribute("role", "treeitem");
      r5.dataset["index"] = String(h3.index);
      r5.style.paddingLeft = `${4 + depth * 14}px`;
      r5.classList.toggle("uo-on", h3.index === cur);
      r5.classList.toggle("uw-nav-hit", hit.has(h3.index));
      if (kids.length) r5.setAttribute("aria-expanded", String(!closed));
      const tw = el7("button", "uw-nav-twisty");
      tw.type = "button";
      tw.tabIndex = -1;
      if (kids.length) {
        tw.innerHTML = symbol(closed ? "chevron_right" : "expand_more");
        tw.title = closed ? L11.expand : L11.collapse;
        tw.addEventListener("click", (e6) => {
          e6.stopPropagation();
          if (closed) this.collapsed.delete(key);
          else this.collapsed.add(key);
          this.refresh();
        });
      } else tw.classList.add("uw-nav-leaf");
      const label = el7("span", "uw-nav-label", h3.text);
      label.title = h3.text;
      r5.append(tw, label);
      r5.addEventListener("click", () => {
        ed.goToHeading(h3.index);
        this.refresh();
      });
      r5.addEventListener("contextmenu", (e6) => {
        e6.preventDefault();
        this.headingMenu(h3, e6.clientX, e6.clientY);
      });
      if (editable) {
        r5.draggable = true;
        r5.addEventListener("dragstart", (e6) => {
          this.dragFrom = h3.index;
          e6.dataTransfer?.setData("text/plain", h3.text);
          if (e6.dataTransfer) e6.dataTransfer.effectAllowed = "move";
          r5.classList.add("uw-nav-dragging");
        });
        r5.addEventListener("dragend", () => {
          this.dragFrom = -1;
          r5.classList.remove("uw-nav-dragging");
          this.clearDrop();
        });
      }
      list.appendChild(r5);
      if (!closed) for (const k2 of kids) row2(k2, depth + 1);
    };
    for (const n5 of this.tree()) row2(n5, 0);
    list.addEventListener("dragover", (e6) => {
      if (this.dragFrom < 0) return;
      e6.preventDefault();
      if (e6.dataTransfer) e6.dataTransfer.dropEffect = "move";
      this.markDrop(list, e6.clientY);
    });
    list.addEventListener("dragleave", (e6) => {
      if (!list.contains(e6.relatedTarget)) this.clearDrop();
    });
    list.addEventListener("drop", (e6) => {
      if (this.dragFrom < 0) return;
      e6.preventDefault();
      const before = this.dropTarget(list, e6.clientY);
      const from = this.dragFrom;
      this.dragFrom = -1;
      this.clearDrop();
      if (ed.moveHeading(from, before)) this.env.after();
      this.refresh();
    });
    this.bodyEl.replaceChildren(list);
    list.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
  }
  /** Título antes do qual a seção arrastada entra (heads.length = fim). */
  dropTarget(list, y3) {
    const rows = [...list.querySelectorAll(".uw-nav-row")];
    for (const r5 of rows) {
      const b3 = r5.getBoundingClientRect();
      if (y3 < b3.top + b3.height / 2) return +r5.dataset["index"];
    }
    const last = rows[rows.length - 1];
    if (!last) return this.heads.length;
    const li = +last.dataset["index"];
    const lh = this.heads[li];
    const nxt = this.heads.find((h3) => h3.index > li && h3.level <= lh.level);
    return nxt ? nxt.index : this.heads.length;
  }
  markDrop(list, y3) {
    this.clearDrop();
    const before = this.dropTarget(list, y3);
    const r5 = list.querySelector(`.uw-nav-row[data-index="${before}"]`);
    if (r5) r5.classList.add("uw-nav-drop-before");
    else list.classList.add("uw-nav-drop-end");
  }
  clearDrop() {
    for (const r5 of this.bodyEl.querySelectorAll(".uw-nav-drop-before")) r5.classList.remove("uw-nav-drop-before");
    this.bodyEl.querySelector(".uw-nav-tree")?.classList.remove("uw-nav-drop-end");
  }
  headingMenu(h3, x2, y3) {
    const L11 = this.L;
    const ed = this.env.ed;
    const ro = ed.isProtected();
    const done = (ok) => {
      if (ok !== false) this.env.after();
      this.refresh();
    };
    const levels = () => [
      { id: "nav:levels:all", label: L11.all, checked: this.maxLevel === 9, onClick: () => {
        this.maxLevel = 9;
        this.refresh();
      } },
      ...[1, 2, 3, 4, 5, 6, 7, 8].map((n5) => ({ id: `nav:levels:${n5}`, label: L11.level(n5), checked: this.maxLevel === n5, onClick: () => {
        this.maxLevel = n5;
        this.refresh();
      } }))
    ];
    openMenu([
      { id: "nav:promote", label: L11.promote, icon: "arrow_back", disabled: ro || h3.level <= 1, onClick: () => done(ed.promoteHeading(h3.index)) },
      { id: "nav:demote", label: L11.demote, icon: "arrow_forward", disabled: ro || h3.level >= 9, onClick: () => done(ed.demoteHeading(h3.index)) },
      { sep: true },
      { id: "nav:newBefore", label: L11.newBefore, disabled: ro, onClick: () => done(ed.insertHeading(h3.index, "before")) },
      { id: "nav:newAfter", label: L11.newAfter, disabled: ro, onClick: () => done(ed.insertHeading(h3.index, "after")) },
      { id: "nav:newSub", label: L11.newSub, disabled: ro || h3.level >= 9, onClick: () => done(ed.insertHeading(h3.index, "sub")) },
      { id: "nav:delete", label: L11.del, icon: "delete", disabled: ro, onClick: () => done(ed.deleteHeading(h3.index)) },
      { sep: true },
      { id: "nav:select", label: L11.select, icon: "select_all", onClick: () => {
        ed.selectHeading(h3.index);
        this.env.after();
      } },
      { sep: true },
      { id: "nav:expandAll", label: L11.expandAll, icon: "unfold_more", onClick: () => {
        this.collapsed.clear();
        this.refresh();
      } },
      { id: "nav:collapseAll", label: L11.collapseAll, icon: "unfold_less", onClick: () => {
        for (const x3 of this.heads) this.collapsed.add(this.keyOf(x3));
        this.refresh();
      } },
      { id: "nav:levels", label: L11.showLevels, submenu: levels }
    ], { x: x2, y: y3 }, { layer: this.env.layer, lang: this.env.lang });
  }
  // ───── Páginas ─────
  renderPages() {
    const L11 = this.L;
    const ed = this.env.ed;
    const total = ed.layoutPageCount();
    if (!total) {
      this.bodyEl.replaceChildren(el7("p", "uw-nav-empty", L11.noPages));
      return;
    }
    const only = this.query ? new Set(this.results.map((r5) => r5.page).filter((p3) => p3 >= 0)) : null;
    if (only && !only.size) {
      this.bodyEl.replaceChildren(el7("p", "uw-nav-empty", L11.noMatch));
      return;
    }
    const cur = ed.currentPage() - 1;
    let grid2 = this.bodyEl.querySelector(".uw-nav-pages");
    const want = [...Array(total).keys()].filter((i5) => !only || only.has(i5));
    const sig = want.join(",");
    if (!grid2 || grid2.dataset["sig"] !== sig) {
      grid2 = el7("div", "uw-nav-pages");
      grid2.dataset["sig"] = sig;
      this.io?.disconnect();
      this.thumbs.clear();
      this.io = new IntersectionObserver((ents) => {
        for (const e6 of ents) if (e6.isIntersecting) this.paintThumb(+e6.target.dataset["page"]);
      }, { root: this.bodyEl, rootMargin: "200px" });
      for (const i5 of want) {
        const item = el7("button", "uw-nav-page");
        item.type = "button";
        item.dataset["page"] = String(i5);
        item.dataset["a"] = `nav:page:${i5 + 1}`;
        item.title = L11.page(i5 + 1);
        const c4 = el7("canvas", "uw-nav-thumb");
        const num2 = el7("span", "uw-nav-pnum", String(i5 + 1));
        item.append(c4, num2);
        item.addEventListener("click", () => {
          ed.goToPage(i5);
          this.refresh();
        });
        this.thumbs.set(i5, c4);
        grid2.appendChild(item);
        this.io.observe(item);
      }
      this.bodyEl.replaceChildren(grid2);
      this.dirtyThumbs = true;
    }
    for (const b3 of grid2.querySelectorAll(".uw-nav-page")) b3.classList.toggle("uo-on", +b3.dataset["page"] === cur);
    if (this.dirtyThumbs) {
      this.dirtyThumbs = false;
      for (const [i5, c4] of this.thumbs) if (c4.dataset["painted"]) this.paintThumb(i5);
    }
  }
  paintThumb(i5) {
    const c4 = this.thumbs.get(i5);
    if (!c4) return;
    if (this.env.ed.paintPageThumbnail(i5, c4, 150)) c4.dataset["painted"] = "1";
  }
  // ───── Resultados ─────
  renderResults() {
    const L11 = this.L;
    if (!this.query) {
      this.bodyEl.replaceChildren(el7("p", "uw-nav-empty", L11.noSearch));
      return;
    }
    if (!this.results.length) {
      this.bodyEl.replaceChildren(el7("p", "uw-nav-empty", L11.noMatch));
      return;
    }
    const list = el7("div", "uw-nav-results");
    list.setAttribute("role", "list");
    for (const r5 of this.results) {
      const b3 = el7("button", "uw-nav-result");
      b3.type = "button";
      b3.setAttribute("role", "listitem");
      b3.dataset["a"] = `nav:result:${r5.index + 1}`;
      b3.classList.toggle("uo-on", r5.index === this.current);
      b3.append(document.createTextNode(r5.before), el7("strong", void 0, r5.match), document.createTextNode(r5.after));
      b3.addEventListener("click", () => {
        this.current = r5.index;
        this.env.ed.goToSearchResult(r5.index);
        this.refresh();
      });
      list.appendChild(b3);
    }
    this.bodyEl.replaceChildren(list);
    list.querySelector(".uo-on")?.scrollIntoView({ block: "nearest" });
  }
};

// src/chrome-ruler.ts
var L9 = (en, pt) => ({ en, pt });
var TIPS = {
  firstLine: L9("First Line Indent", "Recuo da Primeira Linha"),
  hanging: L9("Hanging Indent", "Recuo Deslocado"),
  left: L9("Left Indent", "Recuo \xE0 Esquerda"),
  right: L9("Right Indent", "Recuo \xE0 Direita"),
  marginL: L9("Left Margin", "Margem Esquerda"),
  marginR: L9("Right Margin", "Margem Direita"),
  marginT: L9("Top Margin", "Margem Superior"),
  marginB: L9("Bottom Margin", "Margem Inferior"),
  column: L9("Move Column", "Mover Coluna"),
  cell: L9("Move Table Column", "Mover Coluna da Tabela"),
  row: L9("Adjust Table Row", "Ajustar Linha da Tabela"),
  tab: {
    left: L9("Left Tab", "Tabula\xE7\xE3o Esquerda"),
    center: L9("Center Tab", "Tabula\xE7\xE3o Centralizada"),
    right: L9("Right Tab", "Tabula\xE7\xE3o Direita"),
    decimal: L9("Decimal Tab", "Tabula\xE7\xE3o Decimal"),
    bar: L9("Bar Tab", "Barra de Tabula\xE7\xE3o")
  }
};
var MIN_TEXT = 720;
var RulerUI = class {
  constructor(env) {
    this.env = env;
    this.h = createRuler({
      orientation: "horizontal",
      lang: env.lang,
      onDrag: (m2, pos) => this.showGuide("h", m2, pos),
      onDrop: (m2, pos, removed) => this.drop(m2, pos, removed),
      onAddTab: (kind, pos) => this.addTab(kind, pos),
      onDblClick: (t5) => this.dblClick(t5)
    });
    this.h.el.classList.add("uw-hruler");
    this.v = createRuler({
      orientation: "vertical",
      lang: env.lang,
      selector: false,
      onDrag: (m2, pos) => this.showGuide("v", m2, pos),
      onDrop: (m2, pos, removed) => this.drop(m2, pos, removed),
      onDblClick: (t5) => this.dblClick(t5)
    });
    this.vbox = document.createElement("div");
    this.vbox.className = "uw-vruler";
    this.vbox.appendChild(this.v.el);
    this.guide = document.createElement("div");
    this.guide.className = "uw-ruler-guide";
    this.guide.hidden = true;
    for (const el13 of [this.h.el, this.vbox]) el13.addEventListener("mousedown", (e6) => e6.preventDefault());
  }
  env;
  h;
  v;
  vbox;
  guide;
  info = null;
  raf = 0;
  on = false;
  /** Liga/desliga (Exibir > Régua). */
  show(on) {
    this.on = on;
    if (on) {
      if (!this.h.el.isConnected) this.env.top.appendChild(this.h.el);
      if (!this.vbox.isConnected) this.env.layer.append(this.vbox, this.guide);
    } else {
      this.h.el.remove();
      this.vbox.remove();
      this.guide.remove();
      this.env.ed.classList.remove("uw-vruler-on");
    }
    this.schedule();
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.h.destroy();
    this.v.destroy();
    this.vbox.remove();
    this.guide.remove();
    this.env.ed.classList.remove("uw-vruler-on");
  }
  schedule() {
    if (!this.on || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  /** Canvas da página `pg` (layout de impressão) ou o 1º (visões contínuas). */
  pageCanvas(pg) {
    const cs = this.env.ed.shadowRoot?.querySelectorAll("canvas.page");
    if (!cs?.length) return null;
    return cs[pg] ?? cs[0] ?? null;
  }
  render() {
    if (!this.on) return;
    const ed = this.env.ed;
    const info = ed.getRulerInfo();
    this.info = info;
    const view = ed.getView();
    ed.classList.toggle("uw-vruler-on", !!info && view === "print");
    const canvas = info ? this.pageCanvas(view === "print" ? info.page : 0) : null;
    if (!info || !canvas) {
      this.h.update(null);
      this.v.update(null);
      this.vbox.hidden = true;
      ed.classList.remove("uw-vruler-on");
      return;
    }
    const unit = this.env.lang === "pt" ? "cm" : "in";
    const fr0 = this.env.frame();
    this.h.el.style.paddingLeft = `${Math.max(0, fr0.left - this.env.top.getBoundingClientRect().left)}px`;
    const pr = canvas.getBoundingClientRect();
    const hc = this.h.el.querySelector(".uo-ruler-canvas").getBoundingClientRect();
    const scale = ed.getZoom() * 96 / 1440;
    const { frame, margins, indents, tabs } = info;
    const W = view === "print" ? info.pageWidthTwips : Math.round(pr.width / scale);
    const markers = [];
    const inCell = info.where === "cell";
    const shaded = inCell || view !== "print" ? [[0, frame.x0], [frame.x1, W]] : [[0, margins.left], [W - margins.right, W]];
    if (!inCell && info.columns.length > 1) {
      info.columns.forEach((c4, i5) => {
        const n5 = info.columns[i5 + 1];
        if (!n5) return;
        shaded.push([c4.x + c4.w, n5.x]);
        markers.push({ id: `col-${i5}-r`, kind: "column", pos: c4.x + c4.w, tip: TIPS.column, min: c4.x + MIN_TEXT, max: n5.x });
        markers.push({ id: `col-${i5 + 1}-l`, kind: "column", pos: n5.x, tip: TIPS.column, min: c4.x + c4.w, max: n5.x + n5.w - MIN_TEXT });
      });
    }
    if (!inCell && view === "print") {
      markers.push({ id: "m-left", kind: "margin", pos: margins.left, tip: TIPS.marginL, min: 0, max: W - margins.right - MIN_TEXT });
      markers.push({ id: "m-right", kind: "margin", pos: W - margins.right, tip: TIPS.marginR, min: margins.left + MIN_TEXT, max: W });
    }
    if (info.table) {
      for (const c4 of info.table.cols) markers.push({ id: `cell-${c4.boundary}`, kind: "cell", pos: c4.x, tip: TIPS.cell });
      const cs = info.table.cols;
      cs.forEach((c4, i5) => {
        const m2 = markers.find((x2) => x2.id === `cell-${c4.boundary}`);
        m2.min = i5 > 0 ? cs[i5 - 1].x + 100 : -Infinity;
        m2.max = i5 < cs.length - 1 ? cs[i5 + 1].x - 100 : Infinity;
      });
    }
    const x0 = frame.x0, x1 = frame.x1;
    const left = x0 + indents.left;
    markers.push(
      { id: "first-line", kind: "first-line", pos: left + indents.firstLine, tip: TIPS.firstLine, min: 0, max: x1 - indents.right },
      { id: "hanging", kind: "hanging", pos: left, tip: TIPS.hanging, min: 0, max: x1 - indents.right, group: ["left-indent"] },
      { id: "left-indent", kind: "left-indent", pos: left, tip: TIPS.left, min: 0, max: x1 - indents.right, group: ["first-line", "hanging"] },
      { id: "right-indent", kind: "right-indent", pos: x1 - indents.right, tip: TIPS.right, min: Math.max(left, left + indents.firstLine), max: W }
    );
    let lastTab = Math.max(0, indents.left);
    for (const t5 of tabs) {
      markers.push({ id: `tab-${t5.pos}`, kind: `tab-${t5.align}`, pos: x0 + t5.pos, tip: TIPS.tab[t5.align], removable: true, min: x0, max: x1 });
      lastTab = Math.max(lastTab, t5.pos);
    }
    const dts = [];
    const dt = info.defaultTabTwips;
    if (dt > 0) for (let k2 = Math.floor(lastTab / dt) + 1, p3 = k2 * dt; x0 + p3 <= x1 && dts.length < 200; k2++, p3 = k2 * dt) dts.push(x0 + p3);
    const hm = {
      length: W,
      scale,
      offset: pr.left - hc.left,
      unit,
      zero: x0,
      shaded,
      textArea: [x0, x1],
      markers,
      defaultTabs: dts,
      readOnly: info.readOnly
    };
    this.h.update(hm);
    if (view !== "print") {
      this.v.update(null);
      this.vbox.hidden = true;
      return;
    }
    const fr = this.env.frame();
    this.vbox.hidden = false;
    this.vbox.style.left = `${fr.left}px`;
    this.vbox.style.top = `${fr.top}px`;
    this.vbox.style.height = `${Math.max(0, fr.height)}px`;
    const vc = this.v.el.querySelector(".uo-ruler-canvas").getBoundingClientRect();
    const H2 = info.pageHeightTwips;
    const vs = scale;
    const vmarkers = [
      { id: "m-top", kind: "margin", pos: margins.top, tip: TIPS.marginT, min: 0, max: H2 - margins.bottom - MIN_TEXT },
      { id: "m-bottom", kind: "margin", pos: H2 - margins.bottom, tip: TIPS.marginB, min: margins.top + MIN_TEXT, max: H2 }
    ];
    if (info.table) {
      for (const r5 of info.table.rows) vmarkers.push({ id: `row-${r5.row}`, kind: "row", pos: r5.bottom, tip: TIPS.row, min: r5.top + 100 });
    }
    this.v.update({
      length: H2,
      scale: vs,
      offset: pr.top - vc.top,
      unit,
      zero: margins.top,
      shaded: [[0, margins.top], [H2 - margins.bottom, H2]],
      markers: vmarkers,
      readOnly: info.readOnly
    });
  }
  /** Guia tracejada sobre o documento enquanto arrasta (como o Word). */
  showGuide(dir, m2, pos) {
    const info = this.info;
    const canvas = info ? this.pageCanvas(this.env.ed.getView() === "print" ? info.page : 0) : null;
    if (!m2 || !info || !canvas) {
      this.guide.hidden = true;
      return;
    }
    const pr = canvas.getBoundingClientRect();
    const fr = this.env.frame();
    this.guide.hidden = false;
    this.guide.classList.toggle("uw-ruler-guide-v", dir === "h");
    if (dir === "h") {
      const x2 = pr.left + pos * (this.env.ed.getZoom() * 96 / 1440);
      Object.assign(this.guide.style, { left: `${x2}px`, top: `${fr.top}px`, width: "0px", height: `${fr.height}px` });
    } else {
      const y3 = pr.top + pos * (this.env.ed.getZoom() * 96 / 1440);
      Object.assign(this.guide.style, { left: `${fr.left}px`, top: `${y3}px`, width: `${fr.width}px`, height: "0px" });
    }
  }
  drop(m2, pos, removed) {
    const info = this.info;
    const ed = this.env.ed;
    if (!info) return;
    const { frame, indents, margins } = info;
    const left = frame.x0 + indents.left;
    const id = m2.id;
    if (id.startsWith("tab-")) {
      const old = m2.pos - frame.x0;
      const t5 = info.tabs.find((x2) => x2.pos === Math.round(old));
      if (removed) ed.setTabStops([], { remove: [old] });
      else if (t5) ed.setTabStops([], { remove: [old], add: [{ ...t5, pos: Math.round(pos - frame.x0) }] });
    } else if (id === "first-line") ed.setParagraphIndents({ firstLine: Math.round(pos - left) });
    else if (id === "hanging") ed.setParagraphIndents({ left: Math.round(pos - frame.x0), firstLine: Math.round(left + indents.firstLine - pos) });
    else if (id === "left-indent") ed.setParagraphIndents({ left: Math.round(pos - frame.x0) });
    else if (id === "right-indent") ed.setParagraphIndents({ right: Math.round(frame.x1 - pos) });
    else if (id.startsWith("m-")) {
      const W = info.pageWidthTwips, H2 = info.pageHeightTwips;
      const mm = { ...margins };
      if (id === "m-left") mm.left = Math.round(pos);
      else if (id === "m-right") mm.right = Math.round(W - pos);
      else if (id === "m-top") mm.top = Math.round(pos);
      else if (id === "m-bottom") mm.bottom = Math.round(H2 - pos);
      ed.setPageSetup({ customMargins: mm, applyTo: "section" });
    } else if (id.startsWith("col-")) this.dropColumn(id, pos);
    else if (id.startsWith("cell-")) ed.resizeTableColumn(+id.slice(5), Math.round(pos - m2.pos));
    else if (id.startsWith("row-")) ed.resizeTableRow(+id.slice(4), Math.round(pos - m2.pos));
    this.render();
  }
  /** Borda do espaço entre colunas: colunas iguais mudam o espaço de todas;
   *  desiguais trocam largura com o espaço vizinho. */
  dropColumn(id, pos) {
    const info = this.info;
    const sec = this.env.ed.getSection();
    if (!sec) return;
    const m2 = /^col-(\d+)-(l|r)$/.exec(id);
    if (!m2) return;
    const i5 = +m2[1], side = m2[2];
    const cols = info.columns;
    const c4 = cols[i5];
    const edge = side === "r" ? c4.x + c4.w : c4.x;
    const d3 = Math.round(pos - edge);
    if (!d3) return;
    if (sec.columns.equalWidth) {
      const space = Math.max(0, sec.columns.spaceTwips - 2 * (side === "r" ? d3 : -d3));
      this.env.ed.setColumns({ count: sec.columns.count, spaceTwips: space, sep: sec.columns.sep, applyTo: "section" });
      return;
    }
    const widths = sec.columns.widths.map((w2) => ({ ...w2 }));
    if (side === "r" && widths[i5] && widths[i5 + 1] !== void 0) {
      widths[i5].widthTwips += d3;
      widths[i5].spaceTwips = Math.max(0, widths[i5].spaceTwips - d3);
    } else if (side === "l" && widths[i5] && widths[i5 - 1]) {
      widths[i5 - 1].spaceTwips = Math.max(0, widths[i5 - 1].spaceTwips + d3);
      widths[i5].widthTwips -= d3;
    }
    this.env.ed.setColumns({ count: sec.columns.count, widths, sep: sec.columns.sep, applyTo: "section" });
  }
  addTab(kind, pos) {
    const info = this.info;
    if (!info) return;
    this.env.ed.setTabStops([], { add: [{ pos: Math.round(pos - info.frame.x0), align: kind }] });
    this.render();
  }
  dblClick(t5) {
    if (t5 === "margin") {
      this.env.pageDialog();
      return;
    }
    if (t5 === "track") {
      this.env.tabsDialog();
      return;
    }
    if (t5.kind.startsWith("tab-")) this.env.tabsDialog();
    else if (t5.kind === "margin" || t5.kind === "column") this.env.pageDialog();
    else if (t5.kind === "first-line" || t5.kind === "hanging" || t5.kind === "left-indent" || t5.kind === "right-indent") this.env.paragraphDialog();
  }
};

// src/chrome-panels.ts
var FindPanel = class {
  constructor(ed, app, layer) {
    this.ed = ed;
    this.app = app;
    const L11 = app.ui.L;
    const el13 = document.createElement("div");
    el13.className = "uw-find";
    el13.setAttribute("role", "dialog");
    el13.setAttribute("aria-label", L11.findTitle);
    el13.setAttribute("part", "find");
    el13.hidden = true;
    el13.innerHTML = `
      <div class="uw-find-head"><strong></strong>
        <button type="button" class="uo-btn" data-a="find:close">${symbol("close")}</button></div>
      <input type="text" data-a="find:text" />
      <input type="text" data-a="find:replace" />
      <div class="uw-find-actions"><span class="uw-find-msg"></span>
        <button type="button" class="uo-pill" data-a="find:next"></button>
        <button type="button" class="uo-pill" data-a="find:one"></button>
        <button type="button" class="uo-pill uo-pill-primary" data-a="find:all"></button></div>`;
    el13.querySelector("strong").textContent = L11.findTitle;
    this.find = el13.querySelector('[data-a="find:text"]');
    this.repl = el13.querySelector('[data-a="find:replace"]');
    this.msg = el13.querySelector(".uw-find-msg");
    this.find.placeholder = L11.find;
    this.repl.placeholder = L11.replaceWith;
    const b3 = (id, label, fn) => {
      const x2 = el13.querySelector(`[data-a="find:${id}"]`);
      x2.textContent = label;
      x2.addEventListener("click", fn);
    };
    b3("next", L11.findNext, () => this.next());
    b3("one", L11.replace, () => this.replaceOne());
    b3("all", L11.replaceAll, () => this.replaceAll());
    el13.querySelector('[data-a="find:close"]').addEventListener("click", () => this.close());
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
    layer.appendChild(el13);
    this.el = el13;
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
    const sel4 = this.ed.selectedText();
    if (sel4 && !sel4.includes("\n") && sel4.length < 200) this.find.value = sel4;
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
    const el13 = document.createElement("div");
    el13.className = "uw-comments";
    el13.setAttribute("part", "comments");
    for (const t5 of ["mousedown", "dblclick", "contextmenu", "keydown", "wheel"]) {
      el13.addEventListener(t5, (e6) => {
        if (t5 !== "wheel") e6.stopPropagation();
      }, { passive: t5 === "wheel" });
    }
    root.appendChild(el13);
    this.el = el13;
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
    const print = this.ed.getView() === "print";
    const L11 = this.app.ui.L;
    const mode = this.ed.getMarkupMode();
    const mk = this.ed.getMarkupOptions();
    const revs = print && mode === "all" && mk.balloons !== "inline" ? this.ed.getRevisions() : [];
    const anchors = revs.length ? this.ed.revisionAnchors() : [];
    const balloons = anchors.filter((a3) => {
      const r5 = revs[a3.index];
      if (r5.kind === "format" || r5.kind === "paraFormat") return mk.formatting && (!mk.authors || mk.authors.includes(r5.author));
      return mk.balloons === "revisions" && r5.kind === "delete" && mk.insertionsDeletions && (!mk.authors || mk.authors.includes(r5.author));
    });
    const all = this.app.commentsVisible && mk.comments && print ? this.ed.getComments() : [];
    const pageW = Math.max(
      0,
      ...all.map((c4) => pages[this.ed.commentAnchorPx(c4.id)?.page ?? -1]?.offsetWidth ?? 0),
      ...balloons.map((a3) => pages[a3.page]?.offsetWidth ?? 0)
    );
    const room = this.ed.clientWidth >= pageW + 300 + 48;
    const comments = room ? all : [];
    const shown = room ? balloons : [];
    this.ed.classList.toggle("uw-has-comments", comments.length + shown.length > 0);
    const active = new Set(this.app.activeCommentIds);
    this.el.replaceChildren();
    if (!comments.length && !shown.length) return;
    const placed = [];
    for (const c4 of comments) {
      const a3 = this.ed.commentAnchorPx(c4.id);
      const page = a3 ? pages[a3.page] : void 0;
      if (!a3 || !page) continue;
      const card = document.createElement("div");
      card.className = `uw-card${active.has(c4.id) ? " active" : ""}`;
      card.dataset["commentId"] = String(c4.id);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span>
        <button type="button" class="uo-btn" data-a="comment:delete:${c4.id}" title="${L11.deleteComment}">${symbol("delete")}</button></div>
        <div class="txt"></div>`;
      card.querySelector(".who").textContent = c4.author ?? L11.anonymous;
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
    for (const a3 of shown) {
      const r5 = revs[a3.index];
      const page = pages[a3.page];
      if (!page) continue;
      const card = document.createElement("div");
      card.className = "uw-card uw-rev-card";
      card.style.setProperty("--uw-rev", `#${r5.color}`);
      card.innerHTML = `<div class="uw-card-head"><span class="who"></span><span class="when"></span>
        <button type="button" class="uo-btn" data-a="rev:accept" title="${L11.revAccept}">${symbol("check")}</button>
        <button type="button" class="uo-btn" data-a="rev:reject" title="${L11.revReject}">${symbol("close")}</button></div>
        <div class="txt"></div>`;
      card.querySelector(".who").textContent = r5.author;
      card.querySelector(".when").textContent = revisionTime(r5.date, uiLang(this.ed));
      const txt = card.querySelector(".txt");
      if (r5.description) {
        const [head, ...rest] = r5.description.split(": ");
        txt.append(Object.assign(document.createElement("b"), { textContent: `${head}: ` }), rest.join(": "));
      } else {
        txt.append(Object.assign(document.createElement("b"), { textContent: `${r5.mark ? L11.revParaDeleted : L11.revDeleted}: ` }), r5.text);
      }
      const [acc, rej] = card.querySelectorAll("button");
      acc.addEventListener("click", (e6) => {
        e6.stopPropagation();
        if (this.ed.acceptRevisionAt(a3.index)) this.after();
      });
      rej.addEventListener("click", (e6) => {
        e6.stopPropagation();
        if (this.ed.rejectRevisionAt(a3.index)) this.after();
      });
      card.addEventListener("click", () => {
        this.ed.selectRevision(a3.index);
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
function revisionTime(date, lang) {
  const m2 = date ? /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(date) : null;
  if (!m2) return "";
  const d3 = new Date(+m2[1], +m2[2] - 1, +m2[3], +m2[4], +m2[5]);
  return d3.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", { dateStyle: "short", timeStyle: "short" });
}
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

// src/chrome-review.ts
var ReviewPane = class {
  constructor(ed, app, env, after) {
    this.ed = ed;
    this.app = app;
    this.env = env;
    this.after = after;
  }
  ed;
  app;
  env;
  after;
  dir = null;
  pane = null;
  raf = 0;
  open(dir) {
    this.close();
    this.dir = dir;
    const body = document.createElement("div");
    body.className = "uw-review";
    const pane = openPane({
      id: "revisions",
      title: this.app.ui.L.revPane,
      lang: this.env.lang,
      layer: this.env.layer,
      frame: this.env.frame,
      dock: dir === "vertical" ? "left" : "bottom",
      width: 300,
      height: 220,
      body,
      // fechado pelo ×: o painel não volta na próxima abertura
      onClose: () => {
        if (this.pane !== pane) return;
        this.pane = null;
        this.dir = null;
        this.ed.classList.remove("uw-review-v", "uw-review-h");
        this.app.prefs.set("reviewPane", "");
        this.after();
      }
    });
    pane.el.setAttribute("part", "pane review-pane");
    this.pane = pane;
    this.ed.classList.toggle("uw-review-v", dir === "vertical");
    this.ed.classList.toggle("uw-review-h", dir === "horizontal");
    this.render();
  }
  close() {
    const pane = this.pane;
    this.pane = null;
    this.dir = null;
    pane?.close();
    this.ed.classList.remove("uw-review-v", "uw-review-h");
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.close();
  }
  schedule() {
    if (!this.dir || this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }
  /** Reposiciona (a área entre as barras mudou). */
  place() {
    this.pane?.place();
  }
  render() {
    const pane = this.pane;
    if (!pane) return;
    pane.place();
    const L11 = this.app.ui.L;
    const lang = uiLang(this.ed);
    const revs = this.ed.getRevisions();
    const comments = this.app.commentsVisible ? this.ed.getComments() : [];
    const n5 = { ins: 0, del: 0, move: 0, fmt: 0 };
    for (const r5 of revs) {
      if (r5.move) n5.move++;
      else if (r5.kind === "insert") n5.ins++;
      else if (r5.kind === "delete") n5.del++;
      else n5.fmt++;
    }
    pane.setTitle(`${L11.revPane}: ${L11.revCount(revs.length)}`);
    const sum = document.createElement("div");
    sum.className = "uw-review-sum";
    sum.textContent = [`${L11.revInsertions}: ${n5.ins}`, `${L11.revDeletions}: ${n5.del}`, `${L11.revMoves}: ${n5.move}`, `${L11.revFormatting}: ${n5.fmt}`, `${L11.revComments}: ${comments.length}`].join(" \xB7 ");
    const list = document.createElement("ul");
    list.className = "uw-review-list";
    revs.forEach((r5, i5) => {
      const li = document.createElement("li");
      li.className = "uw-rev";
      li.style.setProperty("--uw-rev", `#${r5.color}`);
      const what = r5.move ? r5.kind === "delete" ? L11.revMovedFrom : L11.revMovedTo : r5.kind === "insert" ? r5.mark ? L11.revParaInserted : L11.revInserted : r5.kind === "delete" ? r5.mark ? L11.revParaDeleted : L11.revDeleted : L11.revFormatted;
      li.innerHTML = `<div class="uw-rev-head"><span class="who"></span><span class="what"></span><span class="gap"></span>
        <button type="button" class="uo-btn" data-a="rev:accept">${symbol("check")}</button>
        <button type="button" class="uo-btn" data-a="rev:reject">${symbol("close")}</button></div><div class="when"></div><div class="txt"></div>`;
      li.querySelector(".who").textContent = r5.author;
      li.querySelector(".what").textContent = what;
      li.querySelector(".when").textContent = revisionTime(r5.date, lang);
      li.querySelector(".txt").textContent = r5.description ? r5.description.replace(/^[^:]*:\s*/, "") : r5.text;
      const [acc, rej] = li.querySelectorAll("button");
      acc.title = L11.revAccept;
      rej.title = L11.revReject;
      acc.addEventListener("click", (e6) => {
        e6.stopPropagation();
        if (this.ed.acceptRevisionAt(i5)) this.after();
      });
      rej.addEventListener("click", (e6) => {
        e6.stopPropagation();
        if (this.ed.rejectRevisionAt(i5)) this.after();
      });
      li.addEventListener("click", () => {
        this.ed.selectRevision(i5);
        this.after();
      });
      list.appendChild(li);
    });
    for (const c4 of comments) {
      const li = document.createElement("li");
      li.className = "uw-rev uw-rev-comment";
      li.innerHTML = '<div class="uw-rev-head"><span class="who"></span><span class="what"></span></div><div class="txt"></div>';
      li.querySelector(".who").textContent = c4.author ?? L11.anonymous;
      li.querySelector(".what").textContent = L11.revComments;
      li.querySelector(".txt").textContent = c4.text;
      li.addEventListener("click", () => {
        this.app.activeCommentIds = [c4.id];
        this.ed.goToComment(c4.id);
        this.after();
      });
      list.appendChild(li);
    }
    if (!revs.length && !comments.length) {
      const li = document.createElement("li");
      li.className = "uw-rev-empty";
      li.textContent = L11.revNone;
      list.appendChild(li);
    }
    pane.body.replaceChildren(sum, list);
  }
};

// src/chrome-table-style.ts
var tr5 = (lang, en, pt) => pickLabels(lang, { en, pt });
var el8 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var sel2 = (name, opts, value, style = "") => {
  const s4 = el8("select", { name, style });
  for (const [v2, t5] of opts) s4.append(el8("option", { value: v2, selected: v2 === value }, t5));
  return s4;
};
var COND_LABELS = {
  wholeTable: ["Whole table", "Tabela inteira"],
  firstRow: ["Header row", "Linha de cabe\xE7alho"],
  lastRow: ["Total row", "Linha de total"],
  firstCol: ["First column", "Primeira coluna"],
  lastCol: ["Last column", "\xDAltima coluna"],
  band1Horz: ["Odd banded rows", "Linhas em tiras \xEDmpares"],
  band2Horz: ["Even banded rows", "Linhas em tiras pares"],
  band1Vert: ["Odd banded columns", "Colunas em tiras \xEDmpares"],
  band2Vert: ["Even banded columns", "Colunas em tiras pares"],
  nwCell: ["Top left cell", "C\xE9lula superior esquerda"],
  neCell: ["Top right cell", "C\xE9lula superior direita"],
  swCell: ["Bottom left cell", "C\xE9lula inferior esquerda"],
  seCell: ["Bottom right cell", "C\xE9lula inferior direita"]
};
function condState(xml, cond) {
  const sheet = readStyleSheet('<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + xml + "</w:styles>");
  const st = Object.values(sheet.styles)[0];
  const part = cond === "wholeTable" ? st : st?.tblStylePr?.[cond];
  const rPr = part?.rPr, pPr = part?.pPr, tcPr = part?.tcPr;
  return {
    bold: !!rPr?.b,
    italic: !!rPr?.i,
    underline: !!rPr?.u && rPr.u.val !== "none",
    color: rPr?.color?.val && rPr.color.val !== "auto" ? rPr.color.val : void 0,
    sz: rPr?.sz,
    font: rPr?.rFonts?.ascii,
    fill: tcPr?.shd?.fill && tcPr.shd.fill !== "auto" ? tcPr.shd.fill : void 0,
    jc: pPr?.jc,
    vAlign: tcPr?.vAlign
  };
}
async function tableStyleDialog(env, mode, nameOrId) {
  const lang = env.lang, ed = env.ed;
  let draft;
  let basedOnName;
  const bases = ed.tableStyleBases();
  const normalId = bases.find((b3) => b3.name === "Normal Table")?.id ?? "TableNormal";
  if (mode === "modify") {
    const cur = await ed.tableStyleXml(nameOrId ?? ed.getTableState()?.style ?? "Table Grid");
    if (!cur) return;
    draft = cur.xml;
  } else {
    const name2 = tr5(lang, "Style1", "Estilo1");
    draft = newTableStyleXml({ id: ed.newTableStyleId(name2), name: name2, basedOn: normalId });
  }
  const headName = /<w:name w:val="([^"]*)"/.exec(draft)?.[1] ?? "";
  const headBase = /<w:basedOn w:val="([^"]*)"/.exec(draft)?.[1] ?? "";
  const name = el8("input", { type: "text", name: "ts-name", value: headName, style: "width:100%" });
  const base = sel2("ts-base", [["", tr5(lang, "(no style)", "(sem estilo)")], ...bases.map((b3) => [b3.id, b3.name])], headBase, "width:100%");
  const cond = sel2("ts-cond", TABLE_STYLE_CONDS.map((c5) => [c5, tr5(lang, ...COND_LABELS[c5])]), "wholeTable", "width:100%");
  const font = el8("input", { type: "text", name: "ts-font", placeholder: tr5(lang, "(theme font)", "(fonte do tema)"), style: "width:150px" });
  const size = sel2("ts-size", [["", "\u2014"], ...[8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24].map((n5) => [String(n5 * 2), String(n5).replace(".", tr5(lang, ".", ","))])], "", "width:70px");
  const tog = (label, title) => el8("button", { type: "button", className: "uo-pill", textContent: label, title, style: "min-width:36px;padding:4px 10px" });
  const bBtn = tog("B", tr5(lang, "Bold", "Negrito")), iBtn = tog("I", tr5(lang, "Italic", "It\xE1lico")), uBtn = tog("U", tr5(lang, "Underline", "Sublinhado"));
  bBtn.style.fontWeight = "700";
  iBtn.style.fontStyle = "italic";
  uBtn.style.textDecoration = "underline";
  const color = el8("input", { type: "color", name: "ts-color", value: "#000000", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const bStyle = sel2("ts-bstyle", BORDER_STYLES.map(([v2, en, pt]) => [v2, tr5(lang, en, pt)]), "single");
  const bWidth = sel2("ts-bwidth", BORDER_WIDTHS.map(([sz, t5]) => [String(sz), `${t5} pt`]), "4");
  const bColor = el8("input", { type: "color", name: "ts-bcolor", value: "#000000", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const sideBtns = [
    ["top", "Top", "Superior"],
    ["bottom", "Bottom", "Inferior"],
    ["left", "Left", "Esquerda"],
    ["right", "Right", "Direita"],
    ["insideH", "Inside H", "Interna H"],
    ["insideV", "Inside V", "Interna V"],
    ["none", "None", "Nenhuma"],
    ["all", "All", "Todas"]
  ].map(([s4, en, pt]) => {
    const b3 = el8("button", { type: "button", className: "uo-pill", textContent: tr5(lang, en, pt), style: "padding:3px 9px" });
    b3.dataset["side"] = s4;
    return b3;
  });
  const fillOn = el8("input", { type: "checkbox", name: "ts-fill-on" });
  const fill = el8("input", { type: "color", name: "ts-fill", value: "#ffffff", style: "width:40px;height:28px;padding:0;border:0;background:none" });
  const align = sel2("ts-align", [
    ["", "\u2014"],
    ["left|top", tr5(lang, "Top left", "Em cima, \xE0 esquerda")],
    ["center|top", tr5(lang, "Top center", "Em cima, centralizado")],
    ["right|top", tr5(lang, "Top right", "Em cima, \xE0 direita")],
    ["left|center", tr5(lang, "Center left", "No centro, \xE0 esquerda")],
    ["center|center", tr5(lang, "Center", "No centro")],
    ["right|center", tr5(lang, "Center right", "No centro, \xE0 direita")],
    ["left|bottom", tr5(lang, "Bottom left", "Embaixo, \xE0 esquerda")],
    ["center|bottom", tr5(lang, "Bottom center", "Embaixo, centralizado")],
    ["right|bottom", tr5(lang, "Bottom right", "Embaixo, \xE0 direita")]
  ], "");
  const dpr = window.devicePixelRatio || 1;
  const cv = el8("canvas", { width: Math.round(420 * dpr), height: Math.round(150 * dpr), style: "width:420px;height:150px;border-radius:6px;border:1px solid color-mix(in srgb, currentColor 25%, transparent);background:#fff" });
  const c4 = () => cond.value;
  const sync = () => {
    const st = condState(draft, c4());
    bBtn.classList.toggle("uo-on", st.bold);
    iBtn.classList.toggle("uo-on", st.italic);
    uBtn.classList.toggle("uo-on", st.underline);
    font.value = st.font ?? "";
    size.value = st.sz ? String(st.sz) : "";
    color.value = `#${(st.color ?? "000000").toLowerCase()}`;
    fillOn.checked = !!st.fill;
    fill.value = `#${(st.fill ?? "ffffff").toLowerCase()}`;
    align.value = st.jc || st.vAlign ? `${st.jc ?? "left"}|${st.vAlign ?? "top"}` : "";
    ed.renderTableStyleXmlThumb(cv, draft);
  };
  const apply = (f3) => {
    draft = patchTableStyleXml(draft, c4(), f3);
    sync();
  };
  const hex = (i5) => i5.value.replace("#", "").toUpperCase();
  bBtn.addEventListener("click", () => apply({ bold: !condState(draft, c4()).bold }));
  iBtn.addEventListener("click", () => apply({ italic: !condState(draft, c4()).italic }));
  uBtn.addEventListener("click", () => apply({ underline: !condState(draft, c4()).underline }));
  font.addEventListener("change", () => apply({ fontAscii: font.value.trim() || null }));
  size.addEventListener("change", () => apply({ szHalfPt: size.value ? +size.value : null }));
  color.addEventListener("change", () => apply({ color: hex(color) }));
  fillOn.addEventListener("change", () => apply({ fill: fillOn.checked ? hex(fill) : null }));
  fill.addEventListener("change", () => {
    fillOn.checked = true;
    apply({ fill: hex(fill) });
  });
  align.addEventListener("change", () => {
    if (!align.value) {
      apply({ alignment: null, vAlign: null });
      return;
    }
    const [h4, v2] = align.value.split("|");
    apply({ alignment: h4 === "left" ? null : h4, vAlign: v2 === "top" ? null : v2 });
  });
  for (const b3 of sideBtns) b3.addEventListener("click", () => {
    const s4 = b3.dataset["side"];
    const pen = { val: bStyle.value, sz: +bWidth.value, color: hex(bColor) };
    const sides = s4 === "all" || s4 === "none" ? ["top", "left", "bottom", "right", "insideH", "insideV"] : [s4];
    apply({ borders: Object.fromEntries(sides.map((x2) => [x2, s4 === "none" ? null : pen])) });
  });
  cond.addEventListener("change", sync);
  base.addEventListener("change", () => {
    draft = retitleTableStyleXml(draft, { basedOn: base.value || null });
    sync();
  });
  const row2 = (...kids) => el8("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
  const lbl = (t5, ctl) => el8("label", { style: "display:flex;flex-direction:column;gap:4px;flex:1;min-width:180px" }, t5, ctl);
  const body = el8(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    el8("strong", {}, tr5(lang, "Properties", "Propriedades")),
    row2(lbl(tr5(lang, "Name:", "Nome:"), name), lbl(tr5(lang, "Style type:", "Tipo de estilo:"), sel2("ts-type", [["table", tr5(lang, "Table", "Tabela")]], "table", "width:100%")), lbl(tr5(lang, "Style based on:", "Estilo baseado em:"), base)),
    el8("strong", {}, tr5(lang, "Formatting", "Formata\xE7\xE3o")),
    lbl(tr5(lang, "Apply formatting to:", "Aplicar formata\xE7\xE3o a:"), cond),
    row2(font, size, bBtn, iBtn, uBtn, el8("span", {}, tr5(lang, "Color", "Cor")), color),
    row2(bStyle, bWidth, bColor, ...sideBtns),
    row2(el8("label", { className: "uo-check" }, fillOn, tr5(lang, "Fill", "Preenchimento")), fill, el8("span", {}, tr5(lang, "Alignment", "Alinhamento")), align),
    cv,
    el8("label", { className: "uo-check" }, el8("input", { type: "radio", name: "ts-where", checked: true }), tr5(lang, "Only in this document", "Somente neste documento"))
  );
  sync();
  const h3 = openDialog({
    title: mode === "new" ? tr5(lang, "Create New Style from Formatting", "Criar Novo Estilo a partir da Formata\xE7\xE3o") : tr5(lang, "Modify Style", "Modificar Estilo"),
    body,
    layer: env.layer,
    lang,
    width: 640,
    actions: [{ id: "cancel", label: env.app.ui.L.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const nm = name.value.trim() || headName;
  draft = retitleTableStyleXml(draft, { name: nm });
  if (mode === "new") {
    const id = ed.newTableStyleId(nm);
    draft = draft.replace(/w:styleId="[^"]*"/, () => `w:styleId="${id.replace(/"/g, "")}"`);
  }
  const baseName = bases.find((b3) => b3.id === base.value)?.name;
  ed.saveTableStyle(draft, { apply: false, basedOnName: baseName });
}

// src/chrome-table-dialogs.ts
var NUMBER_FORMATS = ["#.##0", "#.##0,00", "R$ #.##0,00;(R$ #.##0,00)", "0", "0%", "0,00", "0,00%"];
var el9 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var tr6 = (lang, en, pt) => pickLabels(lang, { en, pt });
function radios(name, opts, value) {
  const box = el9("div", { style: "display:flex;flex-direction:column;gap:6px" });
  for (const [v2, t5] of opts) {
    const i5 = el9("input", { type: "radio", name, value: v2, checked: v2 === value });
    box.append(el9("label", { className: "uo-check" }, i5, t5));
  }
  return { el: box, value: () => box.querySelector(`input[name="${name}"]:checked`)?.value ?? value };
}
var num = (name, value, min = 1, max = 63) => el9("input", { type: "number", name, min: String(min), max: String(max), step: "1", value: String(value) });
var cmText = (lang, tw) => (Math.round(tw / 1440 * 254) / 100).toFixed(2).replace(".", tr6(lang, ".", ","));
var cmInput = (lang, name, tw) => el9("input", { type: "text", name, inputMode: "decimal", value: `${cmText(lang, tw)} cm`, style: "width:96px" });
var twOf = (s4) => {
  const n5 = parseFloat(s4.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n5) ? Math.round(n5 / 2.54 * 1440) : void 0;
};
var section2 = (title, ...kids) => el9("div", { style: "display:flex;flex-direction:column;gap:8px" }, el9("strong", {}, title), ...kids);
async function ask(env, title, body, width = 400) {
  const L11 = env.app.ui.L;
  const h3 = openDialog({
    title,
    body,
    layer: env.layer,
    lang: env.lang,
    width,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  return await h3.result === "ok";
}
function separatorPicker(lang, name, value, other, paraLabel) {
  const opts = [["paragraph", paraLabel], ["tab", tr6(lang, "Tabs", "Tabula\xE7\xF5es")], ["semicolon", tr6(lang, "Semicolons", "Ponto e v\xEDrgula")], ["other", tr6(lang, "Other:", "Outro:")]];
  const r5 = radios(name, opts, value);
  const otherIn = el9("input", { type: "text", name: `${name}-other`, maxLength: 1, value: other, style: "width:40px;margin-left:8px" });
  r5.el.lastElementChild.append(otherIn);
  otherIn.addEventListener("input", () => {
    r5.el.querySelector('input[value="other"]').checked = true;
  });
  const read = () => {
    const v2 = r5.value();
    return v2 === "other" ? { char: otherIn.value || "-" } : v2;
  };
  return { el: r5.el, read, radios: r5.el };
}
function autofitPicker(lang, value, colTw) {
  const r5 = radios("autofit", [
    ["fixed", tr6(lang, "Fixed column width:", "Largura fixa da coluna:")],
    ["content", tr6(lang, "AutoFit to contents", "AutoAjuste ao conte\xFAdo")],
    ["window", tr6(lang, "AutoFit to window", "AutoAjustar \xE0 janela")]
  ], value);
  const auto = tr6(lang, "Auto", "Autom\xE1tico");
  const w2 = el9("input", { type: "text", name: "colw", value: colTw ? `${cmText(lang, colTw)} cm` : auto, style: "width:120px;margin-left:8px" });
  r5.el.firstElementChild.append(w2);
  const read = () => {
    const a3 = r5.value();
    const tw = a3 === "fixed" && w2.value.trim() !== auto ? twOf(w2.value) : void 0;
    return { autofit: a3, ...tw && tw > 0 ? { colWidthTwips: tw } : {} };
  };
  return { el: r5.el, read };
}
async function tableDialog(env, kind, arg) {
  const lang = env.lang, ed = env.ed;
  switch (kind) {
    case "insert": {
      const mem = env.app.prefs.get("tableDims")?.split("x").map(Number);
      const cols = num("cols", mem?.[0] || 5), rows = num("rows", mem?.[1] || 2, 1, 32767);
      const af = autofitPicker(lang, "fixed");
      const remember = el9("input", { type: "checkbox", name: "remember", checked: !!mem });
      const body = el9(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr6(lang, "Table size", "Tamanho da tabela"), el9(
          "div",
          { className: "uo-dialog-grid" },
          el9("span", {}, tr6(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el9("span", {}, tr6(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rows
        )),
        section2(tr6(lang, "AutoFit behavior", "Comportamento de AutoAjuste"), af.el),
        el9("label", { className: "uo-check" }, remember, tr6(lang, "Remember dimensions for new tables", "Lembrar dimens\xF5es para novas tabelas"))
      );
      if (!await ask(env, tr6(lang, "Insert Table", "Inserir Tabela"), body, 420)) return;
      const c4 = Math.max(1, Math.min(63, parseInt(cols.value, 10) || 1)), r5 = Math.max(1, parseInt(rows.value, 10) || 1);
      env.app.prefs.set("tableDims", remember.checked ? `${c4}x${r5}` : "");
      ed.insertTable(r5, c4, af.read());
      return;
    }
    case "fromText": {
      const sep = separatorPicker(lang, "sep", "tab", "-", tr6(lang, "Paragraphs", "Par\xE1grafos"));
      const cols = num("cols", 2);
      const rowsOut = el9("input", { type: "number", name: "rows", readOnly: true, value: "1", style: "opacity:.7" });
      const af = autofitPicker(lang, "fixed");
      const guess = ed.textToTableGuess();
      if (guess) {
        sep.radios.querySelector(`input[value="${typeof guess.separator === "string" ? guess.separator : "other"}"]`).checked = true;
        cols.value = String(guess.cols);
        rowsOut.value = String(guess.rows);
      }
      const recount = () => {
        const g2 = ed.textToTableGuess(sep.read(), parseInt(cols.value, 10) || 1);
        if (g2) {
          if (document.activeElement !== cols) cols.value = String(g2.cols);
          rowsOut.value = String(g2.rows);
        }
      };
      sep.el.addEventListener("change", recount);
      cols.addEventListener("input", recount);
      const body = el9(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr6(lang, "Table size", "Tamanho da tabela"), el9(
          "div",
          { className: "uo-dialog-grid" },
          el9("span", {}, tr6(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el9("span", {}, tr6(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rowsOut
        )),
        section2(tr6(lang, "AutoFit behavior", "Comportamento de AutoAjuste"), af.el),
        section2(tr6(lang, "Separate text at", "Separar texto em"), sep.el)
      );
      if (!await ask(env, tr6(lang, "Convert Text to Table", "Converter Texto em Tabela"), body, 420)) return;
      ed.convertTextToTable({ separator: sep.read(), cols: parseInt(cols.value, 10) || 1, ...af.read() });
      return;
    }
    case "toText": {
      const sep = separatorPicker(lang, "sep", "tab", "-", tr6(lang, "Paragraph marks", "Marcas de par\xE1grafo"));
      const body = section2(tr6(lang, "Separate text with", "Separar texto com"), sep.el);
      if (!await ask(env, tr6(lang, "Convert Table To Text", "Converter Tabela em Texto"), body, 360)) return;
      ed.convertTableToText(sep.read());
      return;
    }
    case "insertCells": {
      const r5 = radios("shift", [
        ["right", tr6(lang, "Shift cells right", "Deslocar c\xE9lulas para a direita")],
        ["down", tr6(lang, "Shift cells down", "Deslocar c\xE9lulas para baixo")],
        ["row", tr6(lang, "Insert entire row", "Inserir linha inteira")],
        ["column", tr6(lang, "Insert entire column", "Inserir coluna inteira")]
      ], "down");
      if (!await ask(env, tr6(lang, "Insert Cells", "Inserir C\xE9lulas"), r5.el, 340)) return;
      ed.insertCells(r5.value());
      return;
    }
    case "deleteCells": {
      const r5 = radios("shift", [
        ["left", tr6(lang, "Shift cells left", "Deslocar c\xE9lulas para a esquerda")],
        ["up", tr6(lang, "Shift cells up", "Deslocar c\xE9lulas para cima")],
        ["row", tr6(lang, "Delete entire row", "Excluir linha inteira")],
        ["column", tr6(lang, "Delete entire column", "Excluir coluna inteira")]
      ], "left");
      if (!await ask(env, tr6(lang, "Delete Cells", "Excluir C\xE9lulas"), r5.el, 340)) return;
      ed.deleteCells(r5.value());
      return;
    }
    case "split": {
      const s4 = ed.getTableState();
      const cols = num("cols", 2), rows = num("rows", 1, 1, 32767);
      const merge = el9("input", { type: "checkbox", name: "merge", checked: true, disabled: !s4?.canMerge });
      const body = el9(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        el9(
          "div",
          { className: "uo-dialog-grid" },
          el9("span", {}, tr6(lang, "Number of columns:", "N\xFAmero de colunas:")),
          cols,
          el9("span", {}, tr6(lang, "Number of rows:", "N\xFAmero de linhas:")),
          rows
        ),
        el9("label", { className: "uo-check" }, merge, tr6(lang, "Merge cells before split", "Mesclar c\xE9lulas antes de dividir"))
      );
      if (!await ask(env, tr6(lang, "Split Cells", "Dividir C\xE9lulas"), body, 340)) return;
      ed.splitCell(parseInt(cols.value, 10) || 1, parseInt(rows.value, 10) || 1, merge.checked);
      return;
    }
    case "margins": {
      const s4 = ed.getTableState();
      const mar = s4?.tblPr.tblCellMar ?? {};
      const w2 = (v2, d3 = 0) => v2?.type === "dxa" ? v2.w : d3;
      const top = cmInput(lang, "top", w2(mar.top)), bottom = cmInput(lang, "bottom", w2(mar.bottom));
      const left = cmInput(lang, "left", w2(mar.left, 108)), right = cmInput(lang, "right", w2(mar.right, 108));
      const spTw = s4?.tblPr.tblCellSpacing?.type === "dxa" ? s4.tblPr.tblCellSpacing.w * 2 : 0;
      const allow = el9("input", { type: "checkbox", name: "allow", checked: spTw > 0 });
      const spacing = cmInput(lang, "spacing", spTw);
      const resize = el9("input", { type: "checkbox", name: "resize", checked: s4?.tblPr.tblLayout !== "fixed" });
      const body = el9(
        "div",
        { style: "display:flex;flex-direction:column;gap:14px" },
        section2(tr6(lang, "Default cell margins", "Margens padr\xE3o da c\xE9lula"), el9(
          "div",
          { className: "uo-dialog-grid" },
          el9("span", {}, tr6(lang, "Top:", "Superior:")),
          top,
          el9("span", {}, tr6(lang, "Left:", "Esquerda:")),
          left,
          el9("span", {}, tr6(lang, "Bottom:", "Inferior:")),
          bottom,
          el9("span", {}, tr6(lang, "Right:", "Direita:")),
          right
        )),
        section2(
          tr6(lang, "Default cell spacing", "Espa\xE7amento padr\xE3o entre c\xE9lulas"),
          el9("div", { style: "display:flex;align-items:center;gap:8px" }, el9("label", { className: "uo-check" }, allow, tr6(lang, "Allow spacing between cells", "Permitir espa\xE7amento entre c\xE9lulas")), spacing)
        ),
        section2(tr6(lang, "Options", "Op\xE7\xF5es"), el9("label", { className: "uo-check" }, resize, tr6(lang, "Automatically resize to fit contents", "Redimensionar automaticamente para ajustar conte\xFAdo")))
      );
      if (!await ask(env, tr6(lang, "Table Options", "Op\xE7\xF5es de Tabela"), body, 440)) return;
      ed.setTableCellMargins(
        { top: twOf(top.value), left: twOf(left.value), bottom: twOf(bottom.value), right: twOf(right.value) },
        allow.checked ? twOf(spacing.value) ?? 0 : 0,
        resize.checked
      );
      return;
    }
    case "sort":
      return sortDialog(env);
    case "borders":
      return bordersShadingDialog(env, "borders");
    case "pageBorders":
      return bordersShadingDialog(env, "page");
    case "shading":
      return bordersShadingDialog(env, "shading");
    case "tableStyle:new":
      return tableStyleDialog(env, "new");
    case "tableStyle:modify":
      return tableStyleDialog(env, "modify", arg);
    case "properties":
    case "properties:row":
    case "properties:column":
    case "properties:cell":
    case "properties:alt":
      return propertiesDialog(env, kind === "properties" ? "table" : kind.slice(11));
    case "formula": {
      const formula = el9("input", { type: "text", name: "formula", value: ed.suggestFormula(), style: "width:100%;box-sizing:border-box" });
      const fmt = el9("input", { type: "text", name: "format", value: "", style: "flex:1;min-width:0" });
      const fmtList = el9(
        "select",
        { name: "format-list", style: "width:28px" },
        el9("option", { value: "" }, ""),
        ...NUMBER_FORMATS.map((f3) => el9("option", { value: f3 }, f3))
      );
      fmtList.addEventListener("change", () => {
        fmt.value = fmtList.value;
        fmtList.value = "";
      });
      const fn = el9(
        "select",
        { name: "function" },
        el9("option", { value: "" }, tr6(lang, "Paste function", "Colar fun\xE7\xE3o")),
        ...FORMULA_FUNCTIONS.map((f3) => el9("option", { value: f3 }, f3))
      );
      fn.addEventListener("change", () => {
        if (!fn.value) return;
        const a3 = formula.selectionStart ?? formula.value.length, b3 = formula.selectionEnd ?? a3;
        const ins = `${fn.value}()`;
        formula.value = formula.value.slice(0, a3) + ins + formula.value.slice(b3);
        formula.focus();
        formula.setSelectionRange(a3 + ins.length - 1, a3 + ins.length - 1);
        fn.value = "";
      });
      const body = el9(
        "div",
        { style: "display:flex;flex-direction:column;gap:12px" },
        el9("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr6(lang, "Formula:", "F\xF3rmula:"), formula),
        el9(
          "label",
          { style: "display:flex;flex-direction:column;gap:4px" },
          tr6(lang, "Number format:", "Formato do n\xFAmero:"),
          el9("div", { style: "display:flex;gap:4px" }, fmt, fmtList)
        ),
        el9("div", { style: "display:flex;gap:8px;align-items:center" }, fn)
      );
      queueMicrotask(() => {
        formula.focus();
        formula.setSelectionRange(formula.value.length, formula.value.length);
      });
      if (!await ask(env, tr6(lang, "Formula", "F\xF3rmula"), body, 380)) return;
      ed.insertFormula(formula.value, fmt.value.trim() || void 0);
      return;
    }
  }
}
var sel3 = (name, opts, value) => {
  const s4 = el9("select", { name });
  for (const [v2, t5] of opts) s4.append(el9("option", { value: v2, selected: v2 === value }, t5));
  return s4;
};
var line = (...kids) => el9("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
var check6 = (name, on, label) => {
  const box = el9("input", { type: "checkbox", name, checked: on });
  return { el: el9("label", { className: "uo-check" }, box, label), box };
};
function radiosRow(name, opts, value) {
  const box = el9("div", { style: "display:flex;gap:14px;flex-wrap:wrap" });
  for (const [v2, t5] of opts) box.append(el9("label", { className: "uo-check" }, el9("input", { type: "radio", name, value: v2, checked: v2 === value }), t5));
  return { el: box, value: () => box.querySelector(`input[name="${name}"]:checked`)?.value ?? value };
}
function widthField(lang, name, w2, defTw) {
  const on = !!w2 && (w2.type === "dxa" || w2.type === "pct") && w2.w > 0;
  const c4 = check6(`${name}-on`, on, tr6(lang, "Preferred width:", "Largura preferencial:"));
  const unit = sel3(`${name}-unit`, [["dxa", tr6(lang, "Centimeters", "Cent\xEDmetros")], ["pct", tr6(lang, "Percent", "Porcentagem")]], w2?.type === "pct" ? "pct" : "dxa");
  const pctText2 = (v2) => `${Math.round(v2 / 50 * 10) / 10}%`.replace(".", tr6(lang, ".", ","));
  const val = el9("input", {
    type: "text",
    name,
    inputMode: "decimal",
    style: "width:96px",
    value: w2?.type === "pct" ? pctText2(w2.w) : `${cmText(lang, on && w2 ? w2.w : defTw)} cm`
  });
  unit.addEventListener("change", () => {
    val.value = unit.value === "pct" ? "100%" : `${cmText(lang, defTw)} cm`;
  });
  const sync = () => {
    val.disabled = unit.disabled = !c4.box.checked;
  };
  c4.box.addEventListener("change", sync);
  sync();
  const read = () => {
    if (!c4.box.checked) return null;
    if (unit.value === "pct") {
      const n5 = parseFloat(val.value.replace(",", ".").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n5) && n5 > 0 ? { w: Math.round(n5 * 50), type: "pct" } : null;
    }
    const tw = twOf(val.value);
    return tw && tw > 0 ? { w: tw, type: "dxa" } : null;
  };
  return { el: line(c4.el, val, el9("span", {}, tr6(lang, "Measure in:", "Medir em:")), unit), read };
}
async function propertiesDialog(env, tab) {
  const lang = env.lang, ed = env.ed;
  const s4 = ed.getTableState();
  if (!s4) return;
  const t5 = s4.tblPr, rp = s4.trPr, cp = s4.tcPr;
  const tWidth = widthField(lang, "tw", t5.tblW, s4.availTwips);
  const curAlign = t5.jc === "center" || t5.jc === "right" ? t5.jc : "left";
  const align = radiosRow("talign", [["left", tr6(lang, "Left", "Esquerda")], ["center", tr6(lang, "Center", "Centralizado")], ["right", tr6(lang, "Right", "Direita")]], curAlign);
  const indent = cmInput(lang, "tind", t5.tblInd?.type === "dxa" ? t5.tblInd.w : 0);
  const syncInd = () => {
    indent.disabled = align.value() !== "left";
  };
  align.el.addEventListener("change", syncInd);
  syncInd();
  const wrap = radiosRow("twrap", [["none", tr6(lang, "None", "Nenhuma")], ["around", tr6(lang, "Around", "Ao redor")]], t5.tblpPr ? "around" : "none");
  let position = t5.tblpPr ? { ...t5.tblpPr } : void 0;
  let overlap;
  const posBtn = el9("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Positioning\u2026", "Posicionamento\u2026") });
  const syncWrap = () => {
    posBtn.disabled = wrap.value() !== "around";
  };
  wrap.el.addEventListener("change", syncWrap);
  syncWrap();
  posBtn.addEventListener("click", () => {
    const p0 = position ?? { leftFromText: 141, rightFromText: 141, vertAnchor: "text", tblpY: 1 };
    void positioningDialog(env, p0, overlap ?? (!!t5.tblpPr && t5.tblOverlap !== "never")).then((r5) => {
      if (r5) {
        position = r5.pos;
        overlap = r5.overlap;
      }
    });
  });
  const optBtn = el9("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  optBtn.addEventListener("click", () => {
    void tableDialog(env, "margins");
  });
  const tableTab = el9(
    "div",
    {},
    section2(tr6(lang, "Size", "Tamanho"), tWidth.el),
    section2(tr6(lang, "Alignment", "Alinhamento"), line(align.el, el9("span", {}, tr6(lang, "Indent from left:", "Recuo \xE0 esquerda:")), indent)),
    section2(tr6(lang, "Text wrapping", "Quebra autom\xE1tica de texto"), line(wrap.el, posBtn)),
    el9("div", { style: "display:flex;justify-content:flex-end;gap:8px" }, optBtn)
  );
  const rowsLabel = s4.rect.r1 === s4.rect.r2 ? tr6(lang, `Row ${s4.rect.r1 + 1}:`, `Linha ${s4.rect.r1 + 1}:`) : tr6(lang, `Rows ${s4.rect.r1 + 1}-${s4.rect.r2 + 1}:`, `Linhas ${s4.rect.r1 + 1}-${s4.rect.r2 + 1}:`);
  const hOn = check6("rh-on", !!rp.trHeight, tr6(lang, "Specify height:", "Especificar altura:"));
  const hVal = cmInput(lang, "rh", rp.trHeight?.val ?? s4.rowHeight?.twips ?? 0);
  const hRule = sel3("rh-rule", [["atLeast", tr6(lang, "At least", "Pelo menos")], ["exact", tr6(lang, "Exactly", "Exatamente")]], rp.trHeight?.hRule === "exact" ? "exact" : "atLeast");
  const syncH = () => {
    hVal.disabled = hRule.disabled = !hOn.box.checked;
  };
  hOn.box.addEventListener("change", syncH);
  syncH();
  const brk = check6("r-break", !rp.cantSplit, tr6(lang, "Allow row to break across pages", "Permitir quebra de linha entre p\xE1ginas"));
  const hdr = check6("r-header", !!rp.tblHeader, tr6(lang, "Repeat as header row at the top of each page", "Repetir como linha de cabe\xE7alho na parte superior de cada p\xE1gina"));
  const rowTab = el9(
    "div",
    {},
    el9("strong", {}, rowsLabel),
    section2(tr6(lang, "Size", "Tamanho"), line(hOn.el, hVal, el9("span", {}, tr6(lang, "Row height is:", "A altura da linha \xE9:")), hRule)),
    section2(tr6(lang, "Options", "Op\xE7\xF5es"), brk.el, hdr.el)
  );
  const colsLabel = s4.rect.c1 === s4.rect.c2 ? tr6(lang, `Column ${s4.rect.c1 + 1}:`, `Coluna ${s4.rect.c1 + 1}:`) : tr6(lang, `Columns ${s4.rect.c1 + 1}-${s4.rect.c2 + 1}:`, `Colunas ${s4.rect.c1 + 1}-${s4.rect.c2 + 1}:`);
  const tcW = cp.tcW?.type === "dxa" || cp.tcW?.type === "pct" ? cp.tcW : void 0;
  const cWidth = widthField(lang, "cw", tcW, s4.colWidth);
  const colTab = el9("div", {}, el9("strong", {}, colsLabel), section2(tr6(lang, "Size", "Tamanho"), cWidth.el));
  const kWidth = widthField(lang, "kw", tcW, s4.colWidth);
  const curV = cp.vAlign === "center" || cp.vAlign === "bottom" ? cp.vAlign : "top";
  const vAlign = radiosRow("kva", [["top", tr6(lang, "Top", "Superior")], ["center", tr6(lang, "Center", "Centralizado")], ["bottom", tr6(lang, "Bottom", "Inferior")]], curV);
  let cellOpts;
  const cellBtn = el9("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  cellBtn.addEventListener("click", () => {
    void cellOptionsDialog(env, cp, t5).then((r5) => {
      if (r5) cellOpts = r5;
    });
  });
  const cellTab = el9(
    "div",
    {},
    section2(tr6(lang, "Size", "Tamanho"), kWidth.el),
    section2(tr6(lang, "Vertical alignment", "Alinhamento vertical"), vAlign.el),
    el9("div", { style: "display:flex;justify-content:flex-end" }, cellBtn)
  );
  const title = el9("input", { type: "text", name: "alt-title", value: t5.tblCaption ?? "", style: "width:100%" });
  const descr = el9("textarea", { name: "alt-descr", value: t5.tblDescription ?? "", rows: 5, style: "width:100%;resize:vertical;font:inherit" });
  const altTab = el9(
    "div",
    {},
    el9("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr6(lang, "Title", "T\xEDtulo"), title),
    el9("label", { style: "display:flex;flex-direction:column;gap:4px" }, tr6(lang, "Description", "Descri\xE7\xE3o"), descr)
  );
  const tabs = dialogTabs([
    { id: "table", label: tr6(lang, "Table", "Tabela"), body: tableTab },
    { id: "row", label: tr6(lang, "Row", "Linha"), body: rowTab },
    { id: "column", label: tr6(lang, "Column", "Coluna"), body: colTab },
    { id: "cell", label: tr6(lang, "Cell", "C\xE9lula"), body: cellTab },
    { id: "alt", label: tr6(lang, "Alt Text", "Texto Alt"), body: altTab }
  ], tab);
  if (!await ask(env, tr6(lang, "Table Properties", "Propriedades da Tabela"), tabs.el, 540)) return;
  const sameW = (a3, b3) => a3 === null ? !b3 || b3.type === "auto" || b3.type === "nil" || !b3.w : !!b3 && a3.type === b3.type && a3.w === b3.w;
  const out = {};
  const tb = {};
  const tw = tWidth.read();
  if (!sameW(tw, t5.tblW)) tb.width = tw;
  const al = align.value();
  if (al !== curAlign) tb.align = al;
  const ind = twOf(indent.value) ?? 0;
  if (al === "left" && ind !== (t5.tblInd?.type === "dxa" ? t5.tblInd.w : 0)) tb.indentTwips = ind;
  const wr = wrap.value();
  if (wr !== (t5.tblpPr ? "around" : "none")) tb.wrap = wr;
  if (wr === "around" && position && JSON.stringify(position) !== JSON.stringify(t5.tblpPr ?? null)) tb.position = position;
  if (wr === "around" && overlap !== void 0) tb.overlap = overlap;
  if (title.value !== (t5.tblCaption ?? "")) tb.title = title.value;
  if (descr.value !== (t5.tblDescription ?? "")) tb.description = descr.value;
  if (Object.keys(tb).length) out.table = tb;
  const rw = {};
  const hTw = twOf(hVal.value) ?? 0;
  const hNew = hOn.box.checked && hTw > 0 ? { twips: hTw, rule: hRule.value } : null;
  const hOld = rp.trHeight ? { twips: rp.trHeight.val, rule: rp.trHeight.hRule === "exact" ? "exact" : "atLeast" } : null;
  if (JSON.stringify(hNew) !== JSON.stringify(hOld)) rw.height = hNew;
  if (brk.box.checked !== !rp.cantSplit) rw.allowBreak = brk.box.checked;
  if (hdr.box.checked !== !!rp.tblHeader) rw.header = hdr.box.checked;
  if (Object.keys(rw).length) out.row = rw;
  const cw = cWidth.read();
  if (!sameW(cw, tcW)) out.column = { width: cw };
  const cl = {};
  const kw = kWidth.read();
  if (!out.column && !sameW(kw, tcW)) cl.width = kw;
  const va = vAlign.value();
  if (va !== curV) cl.vAlign = va;
  if (cellOpts) {
    cl.margins = cellOpts.margins;
    cl.wrap = cellOpts.wrap;
    cl.fitText = cellOpts.fitText;
  }
  if (Object.keys(cl).length) out.cell = cl;
  if (Object.keys(out).length) ed.setTableProperties(out);
}
async function positioningDialog(env, pos, overlap) {
  const lang = env.lang;
  const hSpecs = [
    ["left", tr6(lang, "Left", "Esquerda")],
    ["center", tr6(lang, "Center", "Centralizado")],
    ["right", tr6(lang, "Right", "Direita")],
    ["inside", tr6(lang, "Inside", "Interna")],
    ["outside", tr6(lang, "Outside", "Externa")]
  ];
  const vSpecs = [
    ["top", tr6(lang, "Top", "Superior")],
    ["center", tr6(lang, "Center", "Centralizado")],
    ["bottom", tr6(lang, "Bottom", "Inferior")],
    ["inside", tr6(lang, "Inside", "Interna")],
    ["outside", tr6(lang, "Outside", "Externa")]
  ];
  const combo = (name, specs, spec, tw) => {
    const input = el9("input", { type: "text", name, style: "width:120px", value: spec ? specs.find(([v3]) => v3 === spec)?.[1] ?? spec : `${cmText(lang, tw ?? 0)} cm` });
    const list = el9("select", { name: `${name}-list`, style: "width:28px" }, el9("option", { value: "" }, ""), ...specs.map(([v3, x2]) => el9("option", { value: v3 }, x2)));
    list.addEventListener("change", () => {
      if (list.value) input.value = specs.find(([v3]) => v3 === list.value)[1];
      list.value = "";
    });
    const read = () => {
      const hit = specs.find(([, x2]) => x2.toLowerCase() === input.value.trim().toLowerCase());
      return hit ? { spec: hit[0] } : { tw: twOf(input.value) ?? 0 };
    };
    return { el: el9("span", { style: "display:inline-flex;gap:4px" }, input, list), read };
  };
  const hPos = combo("hpos", hSpecs, pos.tblpXSpec, pos.tblpX);
  const hRel = sel3("hrel", [["text", tr6(lang, "Column", "Coluna")], ["margin", tr6(lang, "Margin", "Margem")], ["page", tr6(lang, "Page", "P\xE1gina")]], pos.horzAnchor ?? "text");
  const vPos = combo("vpos", vSpecs, pos.tblpYSpec, pos.tblpY);
  const vRel = sel3("vrel", [["margin", tr6(lang, "Margin", "Margem")], ["page", tr6(lang, "Page", "P\xE1gina")], ["text", tr6(lang, "Paragraph", "Par\xE1grafo")]], pos.vertAnchor ?? "text");
  const top = cmInput(lang, "dtop", pos.topFromText ?? 0), bottom = cmInput(lang, "dbottom", pos.bottomFromText ?? 0);
  const left = cmInput(lang, "dleft", pos.leftFromText ?? 0), right = cmInput(lang, "dright", pos.rightFromText ?? 0);
  const move = check6("move", (pos.vertAnchor ?? "text") === "text", tr6(lang, "Move with text", "Mover com texto"));
  move.box.addEventListener("change", () => {
    vRel.value = move.box.checked ? "text" : "margin";
  });
  vRel.addEventListener("change", () => {
    move.box.checked = vRel.value === "text";
  });
  const ov = check6("overlap", overlap, tr6(lang, "Allow overlap", "Permitir sobreposi\xE7\xE3o"));
  const grid2 = (...kids) => el9("div", { className: "uo-dialog-grid" }, ...kids);
  const body = el9(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    section2(tr6(lang, "Horizontal", "Horizontal"), grid2(el9("span", {}, tr6(lang, "Position:", "Posi\xE7\xE3o:")), hPos.el, el9("span", {}, tr6(lang, "Relative to:", "Em rela\xE7\xE3o a:")), hRel)),
    section2(tr6(lang, "Vertical", "Vertical"), grid2(el9("span", {}, tr6(lang, "Position:", "Posi\xE7\xE3o:")), vPos.el, el9("span", {}, tr6(lang, "Relative to:", "Em rela\xE7\xE3o a:")), vRel)),
    section2(tr6(lang, "Distance from surrounding text", "Dist\xE2ncia do texto ao redor"), grid2(
      el9("span", {}, tr6(lang, "Top:", "Superior:")),
      top,
      el9("span", {}, tr6(lang, "Left:", "Esquerda:")),
      left,
      el9("span", {}, tr6(lang, "Bottom:", "Inferior:")),
      bottom,
      el9("span", {}, tr6(lang, "Right:", "Direita:")),
      right
    )),
    section2(tr6(lang, "Options", "Op\xE7\xF5es"), move.el, ov.el)
  );
  if (!await ask(env, tr6(lang, "Table Positioning", "Posicionamento da Tabela"), body, 440)) return null;
  const h3 = hPos.read(), v2 = vPos.read();
  const nz = (x2) => x2 ? x2 : void 0;
  const out = {
    leftFromText: nz(twOf(left.value)),
    rightFromText: nz(twOf(right.value)),
    topFromText: nz(twOf(top.value)),
    bottomFromText: nz(twOf(bottom.value)),
    vertAnchor: vRel.value,
    horzAnchor: hRel.value === "text" ? void 0 : hRel.value,
    tblpXSpec: h3.spec,
    tblpX: h3.spec ? void 0 : nz(h3.tw),
    tblpYSpec: v2.spec,
    tblpY: v2.spec ? void 0 : nz(v2.tw)
  };
  for (const k2 of Object.keys(out)) if (out[k2] === void 0) delete out[k2];
  return { pos: out, overlap: ov.box.checked };
}
async function cellOptionsDialog(env, cp, t5) {
  const lang = env.lang;
  const tm = t5.tblCellMar ?? {};
  const w2 = (v2, d3 = 0) => v2?.type === "dxa" ? v2.w : d3;
  const own = !!cp.tcMar && Object.keys(cp.tcMar).length > 0;
  const same = check6("same", !own, tr6(lang, "Same as the whole table", "Igual \xE0 tabela inteira"));
  const m2 = cp.tcMar ?? {};
  const top = cmInput(lang, "top", w2(m2.top, w2(tm.top))), bottom = cmInput(lang, "bottom", w2(m2.bottom, w2(tm.bottom)));
  const left = cmInput(lang, "left", w2(m2.left, w2(tm.left, 108))), right = cmInput(lang, "right", w2(m2.right, w2(tm.right, 108)));
  const syncM = () => {
    for (const i5 of [top, bottom, left, right]) i5.disabled = same.box.checked;
  };
  same.box.addEventListener("change", syncM);
  syncM();
  const wrap = check6("wrap", !cp.noWrap, tr6(lang, "Wrap text", "Quebrar texto automaticamente"));
  const fit = check6("fit", !!cp.tcFitText, tr6(lang, "Fit text", "Ajustar texto"));
  const body = el9(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    section2(tr6(lang, "Cell margins", "Margens da c\xE9lula"), same.el, el9(
      "div",
      { className: "uo-dialog-grid" },
      el9("span", {}, tr6(lang, "Top:", "Superior:")),
      top,
      el9("span", {}, tr6(lang, "Left:", "Esquerda:")),
      left,
      el9("span", {}, tr6(lang, "Bottom:", "Inferior:")),
      bottom,
      el9("span", {}, tr6(lang, "Right:", "Direita:")),
      right
    )),
    section2(tr6(lang, "Options", "Op\xE7\xF5es"), wrap.el, fit.el)
  );
  if (!await ask(env, tr6(lang, "Cell Options", "Op\xE7\xF5es da C\xE9lula"), body, 400)) return null;
  return {
    margins: same.box.checked ? null : { top: twOf(top.value), left: twOf(left.value), bottom: twOf(bottom.value), right: twOf(right.value) },
    wrap: wrap.box.checked,
    fitText: fit.box.checked
  };
}
async function sortDialog(env) {
  const lang = env.lang, ed = env.ed;
  let separator = void 0;
  let caseSensitive = false;
  let info = ed.sortInfo();
  if (!info) return;
  if (info.mergeError) {
    const h3 = openDialog({
      title: tr6(lang, "Sort", "Classificar"),
      icon: "warning",
      layer: env.layer,
      lang,
      body: tr6(lang, "Cannot sort a table that contains merged cells.", "N\xE3o \xE9 poss\xEDvel classificar uma tabela que cont\xE9m c\xE9lulas mescladas.")
    });
    await h3.result;
    return;
  }
  const types = [["text", tr6(lang, "Text", "Texto")], ["number", tr6(lang, "Number", "N\xFAmero")], ["date", tr6(lang, "Date", "Data")]];
  const none = tr6(lang, "(none)", "(nenhum)");
  const header = radiosRow("hdr", [["yes", tr6(lang, "Header row", "Linha de cabe\xE7alho")], ["no", tr6(lang, "No header row", "Nenhuma linha de cabe\xE7alho")]], info.header ? "yes" : "no");
  const isHeader = () => header.value() === "yes";
  const labels = () => info.columns.map((c4, i5) => {
    if (info.kind === "paragraphs") return info.columns.length === 1 ? tr6(lang, "Paragraphs", "Par\xE1grafos") : tr6(lang, `Field ${i5 + 1}`, `Campo ${i5 + 1}`);
    return isHeader() && c4.text ? c4.text : tr6(lang, `Column ${i5 + 1}`, `Coluna ${i5 + 1}`);
  });
  const keyRow = (n5) => {
    const col = el9("select", { name: `k${n5}-col`, style: "min-width:160px" });
    const type = sel3(`k${n5}-type`, types, "text");
    const dir = radiosRow(`k${n5}-dir`, [["asc", tr6(lang, "Ascending", "Crescente")], ["desc", tr6(lang, "Descending", "Decrescente")]], "asc");
    const fill = () => {
      const cur = col.value;
      col.replaceChildren(...n5 > 0 ? [el9("option", { value: "" }, none)] : [], ...labels().map((l3, i5) => el9("option", { value: String(i5) }, l3)));
      col.value = cur && [...col.options].some((o6) => o6.value === cur) ? cur : n5 > 0 ? "" : "0";
    };
    const sync = () => {
      type.disabled = col.value === "";
      for (const i5 of dir.el.querySelectorAll("input")) i5.disabled = col.value === "";
    };
    const guess = () => {
      const c4 = info.columns[+col.value];
      if (col.value !== "" && c4) type.value = c4.guess;
    };
    fill();
    guess();
    sync();
    col.addEventListener("change", () => {
      guess();
      sync();
    });
    const title = n5 === 0 ? tr6(lang, "Sort by", "Classificar por") : tr6(lang, "Then by", "E depois por");
    return {
      el: section2(title, line(col, el9("span", {}, tr6(lang, "Type:", "Tipo:")), type), dir.el),
      fill: () => {
        fill();
        sync();
      },
      read: () => col.value === "" ? null : { column: +col.value, type: type.value, desc: dir.value() === "desc" }
    };
  };
  const keys = [keyRow(0), keyRow(1), keyRow(2)];
  header.el.addEventListener("change", () => keys.forEach((k2) => k2.fill()));
  const opts = el9("button", { type: "button", className: "uo-pill", textContent: tr6(lang, "Options\u2026", "Op\xE7\xF5es\u2026") });
  opts.addEventListener("click", () => {
    void sortOptionsDialog(env, info.kind === "paragraphs", separator, caseSensitive).then((r5) => {
      if (!r5) return;
      separator = r5.separator;
      caseSensitive = r5.caseSensitive;
      info = ed.sortInfo(separator) ?? info;
      keys.forEach((k2) => k2.fill());
    });
  });
  const body = el9(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    ...keys.map((k2) => k2.el),
    section2(tr6(lang, "My list has", "Minha lista tem"), header.el),
    el9("div", { style: "display:flex;justify-content:flex-end" }, opts)
  );
  if (!await ask(env, tr6(lang, "Sort", "Classificar"), body, 460)) return;
  const ks = keys.map((k2) => k2.read()).filter((k2) => !!k2);
  if (ks.length) ed.sort({ keys: ks, header: isHeader(), caseSensitive, separator });
}
async function sortOptionsDialog(env, paragraphs, sep, cs) {
  const lang = env.lang;
  const cur = sep === void 0 ? "tab" : typeof sep === "string" ? sep : "other";
  const r5 = radiosRow("ssep", [["tab", tr6(lang, "Tabs", "Tabula\xE7\xF5es")], ["comma", tr6(lang, "Commas", "V\xEDrgulas")], ["other", tr6(lang, "Other:", "Outro:")]], cur);
  const other = el9("input", { type: "text", name: "ssep-other", maxLength: 1, value: typeof sep === "object" ? sep.char : "", style: "width:40px" });
  other.addEventListener("input", () => {
    r5.el.querySelector('input[value="other"]').checked = true;
  });
  const use = check6("fields", sep !== void 0, tr6(lang, "Sort by fields", "Classificar por campos"));
  const csBox = check6("case", cs, tr6(lang, "Case sensitive", "Diferenciar mai\xFAsculas de min\xFAsculas"));
  const body = el9(
    "div",
    { style: "display:flex;flex-direction:column;gap:14px" },
    ...paragraphs ? [section2(tr6(lang, "Separate fields at", "Separar campos em"), use.el, line(r5.el, other))] : [],
    section2(tr6(lang, "Sort options", "Op\xE7\xF5es de classifica\xE7\xE3o"), csBox.el)
  );
  if (!await ask(env, tr6(lang, "Sort Options", "Op\xE7\xF5es de Classifica\xE7\xE3o"), body, 380)) return null;
  const v2 = r5.value();
  const separator = !paragraphs || !use.box.checked ? void 0 : v2 === "other" ? { char: other.value || "-" } : v2;
  return { separator, caseSensitive: csBox.box.checked };
}

// src/chrome-picture-pane.ts
var el10 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var EMU_PT = 12700;
var ANG = 6e4;
var alphaOf = (c4) => (c4?.mods?.find((m2) => m2[0] === "alpha")?.[1] ?? 1e5) / 1e3;
var withAlpha = (c4, pct) => ({ ...c4, mods: [...(c4.mods ?? []).filter((m2) => m2[0] !== "alpha"), ...pct < 100 ? [["alpha", Math.round(pct * 1e3)]] : []] });
var noAlpha = (c4) => ({ ...c4, mods: (c4.mods ?? []).filter((m2) => m2[0] !== "alpha") });
function toggleFormatPane(env, tab, onClose) {
  const { ed, lang } = env;
  const tr8 = (en, pt2) => pickLabels(lang, { en, pt: pt2 });
  const cur = paneOpen("pic-format");
  if (cur) {
    cur.close();
    return null;
  }
  const shape = !ed.selectedImage() && typeof ed.selectedShape === "function" && !!ed.selectedShape();
  const fmt = () => ed.selectedImage()?.format ?? null;
  const sfmt = () => ed.selectedShape()?.format ?? null;
  const anyFmt = () => shape ? sfmt() : fmt();
  const off = () => !(shape ? ed.selectedShape() : ed.selectedImage()) || ed.isProtected();
  const setFormat = (o6) => shape ? ed.setShapeFormat(o6) : ed.setImageFormat(o6);
  const setEffect = (k2, id) => shape ? ed.setShapeEffect(k2, id) : ed.setImageEffect(k2, id);
  const setAlt = (o6) => shape ? ed.setShapeAltText(o6) : ed.setImageAltText(o6);
  const syncers = [];
  const dec = tr8(".", ",");
  const num2 = (label, unit, get, set, o6 = {}) => {
    const input = el10("input", { type: "text", inputMode: "decimal", style: "width:76px" });
    input.setAttribute("aria-label", label);
    const digits = o6.digits ?? 1;
    const show2 = () => {
      const v2 = get();
      if (document.activeElement !== input && ed.shadowRoot?.activeElement !== input) input.value = v2 === void 0 ? "" : `${(Math.round(v2 * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, "").replace(".", dec)} ${unit}`.trim();
      input.disabled = off();
      up.disabled = dn.disabled = off();
    };
    const clamp = (v2) => Math.max(o6.min ?? -Infinity, Math.min(o6.max ?? Infinity, v2));
    const apply = () => {
      const n5 = parseFloat(input.value.replace(",", ".").replace(/[^0-9.\-]/g, ""));
      if (Number.isFinite(n5)) {
        set(clamp(n5));
        env.after();
      }
      sync();
    };
    input.addEventListener("change", apply);
    input.addEventListener("keydown", (e6) => {
      e6.stopPropagation();
      if (e6.key === "Enter") {
        e6.preventDefault();
        apply();
      }
    });
    const step = (d3) => {
      set(clamp((get() ?? 0) + d3 * (o6.step ?? 1)));
      env.after();
      sync();
    };
    const up = el10("button", { type: "button", className: "uo-btn", style: "width:18px;height:13px;min-width:0;padding:0" });
    const dn = el10("button", { type: "button", className: "uo-btn", style: "width:18px;height:13px;min-width:0;padding:0" });
    up.innerHTML = symbol("keyboard_arrow_up");
    dn.innerHTML = symbol("keyboard_arrow_down");
    for (const [b3, d3] of [[up, 1], [dn, -1]]) {
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => step(d3));
    }
    syncers.push(show2);
    return row2(label, el10("span", { style: "display:inline-flex;align-items:center;gap:2px" }, input, el10("span", { style: "display:inline-flex;flex-direction:column" }, up, dn)));
  };
  const choice = (label, opts, get, set) => {
    const s4 = el10("select", { style: "max-width:150px" });
    s4.setAttribute("aria-label", label);
    for (const [v2, t5] of opts) s4.append(el10("option", { value: v2, textContent: t5 }));
    s4.addEventListener("change", () => {
      set(s4.value);
      env.after();
      sync();
    });
    syncers.push(() => {
      const v2 = get();
      s4.value = v2 ?? "";
      s4.disabled = off();
    });
    return row2(label, s4);
  };
  const color = (label, get, set) => {
    const b3 = el10("button", { type: "button", className: "uo-btn", style: "min-width:0;padding:2px 6px;display:inline-flex;align-items:center;gap:4px" });
    b3.setAttribute("aria-label", label);
    const chip = el10("span", { style: "width:18px;height:14px;border:1px solid var(--uo-outline,#888);border-radius:3px;display:inline-block" });
    b3.append(chip);
    b3.insertAdjacentHTML("beforeend", symbol("arrow_drop_down"));
    b3.addEventListener("mousedown", (e6) => e6.preventDefault());
    b3.addEventListener("click", () => {
      const theme = ed.documentThemeColors();
      openMenu([{
        content: (close) => colorGrid({
          colors: [...themePaletteColors(theme), ...STANDARD_COLORS.map((h3) => ({ value: h3, css: `#${h3}` }))],
          columns: 10,
          close,
          onPick: (v2) => {
            set(dmlFromPick(v2, theme));
            env.after();
            sync();
          }
        })
      }], { anchor: b3 }, { layer: env.layer, lang });
    });
    syncers.push(() => {
      const c4 = get();
      const hex = c4 ? ed.resolveDmlColor(c4) : void 0;
      chip.style.background = hex ? `#${hex}` : "transparent";
      b3.disabled = off();
    });
    return row2(label, b3);
  };
  const row2 = (label, ctl) => el10("label", { style: "display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px" }, el10("span", { textContent: label }), ctl);
  const section4 = (title2, open, ...kids) => {
    const d3 = el10("details", { open, style: "border-bottom:1px solid var(--uo-outline-variant,#ddd);padding:4px 0" }, el10("summary", { textContent: title2, style: "font-weight:600;font-size:13px;cursor:pointer;padding:4px 0" }));
    d3.append(el10("div", { style: "display:flex;flex-direction:column;gap:6px;padding:4px 0 6px 12px" }, ...kids));
    return d3;
  };
  const presetRow = (label, items, set, noneLabel) => choice(label, [["", tr8("(choose)", "(escolher)")], ["none", noneLabel], ...items.map((i5) => [i5.id, i5.label])], () => "", (v2) => {
    if (v2) set(v2 === "none" ? null : v2);
  });
  const line2 = () => anyFmt()?.line ?? void 0;
  const setLine = (ch) => {
    const base = line2()?.fill ? { ...line2() } : { w: 9525, fill: { kind: "schemeClr", val: "tx1" } };
    setFormat({ line: { ...base, ...ch } });
  };
  const fill = () => sfmt()?.fill;
  const fillColor = () => {
    const f3 = fill();
    return f3?.kind === "solid" ? f3.color : f3?.kind === "pattern" ? f3.fg : void 0;
  };
  const grad = () => {
    const f3 = fill();
    return f3?.kind === "gradient" ? f3 : void 0;
  };
  const setGrad = (ch) => {
    const base = grad() ?? ed.shapeGradientVariations()[0].fill;
    ed.setShapeFill({ ...base, ...ch });
  };
  const patt = () => {
    const f3 = fill();
    return f3?.kind === "pattern" ? f3 : void 0;
  };
  const setPatt = (ch) => {
    const base = patt() ?? { kind: "pattern", prst: "pct5", fg: { kind: "schemeClr", val: "accent1" }, bg: { kind: "schemeClr", val: "bg1" } };
    ed.setShapeFill({ ...base, ...ch });
  };
  const pickPicture = (tile) => {
    const inp = el10("input", { type: "file", accept: "image/*" });
    inp.addEventListener("change", () => {
      const f3 = inp.files?.[0];
      if (f3) void f3.arrayBuffer().then((b3) => ed.setShapePictureFill(new Uint8Array(b3), (f3.name.split(".").pop() || "png").toLowerCase(), tile)).then(() => {
        env.after();
        sync();
      });
    });
    inp.click();
  };
  const fillSection = section4(
    tr8("Fill", "Preenchimento"),
    true,
    choice(
      tr8("Fill", "Preenchimento"),
      [["none", tr8("No fill", "Sem preenchimento")], ["solid", tr8("Solid fill", "Preenchimento s\xF3lido")], ["gradient", tr8("Gradient fill", "Preenchimento gradiente")], ["picture", tr8("Picture or texture fill", "Preenchimento com imagem ou textura")], ["pattern", tr8("Pattern fill", "Preenchimento de padr\xE3o")], ["style", tr8("Automatic", "Autom\xE1tico")]],
      () => {
        const k2 = fill()?.kind;
        return k2 === "raw" ? "picture" : k2;
      },
      (v2) => {
        if (v2 === "none") ed.setShapeFill(null);
        else if (v2 === "solid") ed.setShapeFill(fillColor() ?? { kind: "schemeClr", val: "accent1" });
        else if (v2 === "gradient") setGrad({});
        else if (v2 === "pattern") setPatt({});
        else if (v2 === "style") ed.setShapeFill({ kind: "style" });
        else pickPicture(false);
      }
    ),
    color(tr8("Color", "Cor"), () => fillColor(), (c4) => {
      const f3 = fill();
      if (f3?.kind === "pattern") setPatt({ fg: c4 });
      else ed.setShapeFill({ kind: "solid", color: withAlpha(c4, alphaOf(fillColor())) });
    }),
    num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => {
      const f3 = fill();
      return f3?.kind === "solid" ? 100 - alphaOf(f3.color) : void 0;
    }, (v2) => {
      const f3 = fill();
      if (f3?.kind === "solid") ed.setShapeFill({ kind: "solid", color: withAlpha(noAlpha(f3.color), 100 - v2) });
    }, { min: 0, max: 100 }),
    choice(tr8("Preset gradients", "Gradientes predefinidos"), [["", tr8("(choose)", "(escolher)")], ...ed.shapeGradientVariations().map((g2) => [g2.id, g2.id])], () => "", (v2) => {
      const g2 = ed.shapeGradientVariations().find((x2) => x2.id === v2);
      if (g2) ed.setShapeFill(g2.fill);
    }),
    choice(
      tr8("Gradient type", "Tipo de gradiente"),
      [["linear", tr8("Linear", "Linear")], ["circle", tr8("Radial", "Radial")], ["rect", tr8("Rectangular", "Retangular")], ["shape", tr8("Path", "Caminho")]],
      () => {
        const g2 = grad();
        return g2 ? g2.path ? g2.path.path : "linear" : void 0;
      },
      (v2) => {
        const g2 = grad();
        if (!g2) return;
        const { lin: _l, path: _p, ...rest } = g2;
        void _l;
        void _p;
        setGrad(v2 === "linear" ? { ...rest, lin: { ang: 54e5, scaled: true } } : { ...rest, path: { path: v2, fillToRect: { l: 5e4, t: 5e4, r: 5e4, b: 5e4 } } });
      }
    ),
    num2(tr8("Angle", "\xC2ngulo"), "\xB0", () => {
      const g2 = grad();
      return g2?.lin ? g2.lin.ang / ANG : void 0;
    }, (v2) => {
      const g2 = grad();
      if (g2?.lin) setGrad({ lin: { ...g2.lin, ang: Math.round((v2 % 360 + 360) % 360 * ANG) } });
    }, { min: 0, max: 359.9 }),
    choice(tr8("Pattern", "Padr\xE3o"), Object.keys(PRESET_PATTERNS).map((k2) => [k2, k2]), () => patt()?.prst, (v2) => setPatt({ prst: v2 })),
    color(tr8("Background", "Plano de fundo"), () => patt()?.bg, (c4) => setPatt({ bg: c4 })),
    row2(tr8("Picture source", "Fonte da imagem"), el10(
      "span",
      { style: "display:inline-flex;gap:4px" },
      (() => {
        const b3 = el10("button", { type: "button", className: "uo-btn", textContent: tr8("Insert\u2026", "Inserir...") });
        b3.addEventListener("click", () => pickPicture(false));
        return b3;
      })(),
      (() => {
        const b3 = el10("button", { type: "button", className: "uo-btn", textContent: tr8("Texture\u2026", "Textura...") });
        b3.addEventListener("click", () => pickPicture(true));
        return b3;
      })()
    ))
  );
  const lineTab = el10(
    "div",
    {},
    ...shape ? [fillSection] : [],
    section4(
      tr8("Line", "Linha"),
      true,
      choice(tr8("Line", "Linha"), [["none", tr8("No line", "Sem linha")], ["solid", tr8("Solid line", "Linha s\xF3lida")]], () => line2()?.fill ? "solid" : "none", (v2) => v2 === "none" ? setFormat({ line: shape ? null : { ...line2() ?? {}, fill: null } }) : setLine({})),
      color(tr8("Color", "Cor"), () => line2()?.fill ?? void 0, (c4) => setLine({ fill: withAlpha(c4, alphaOf(line2()?.fill ?? void 0)) })),
      num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => line2()?.fill ? 100 - alphaOf(line2().fill) : void 0, (v2) => line2()?.fill && setLine({ fill: withAlpha(line2().fill, 100 - v2) }), { min: 0, max: 100 }),
      num2(tr8("Width", "Largura"), "pt", () => line2()?.fill ? (line2().w ?? 9525) / EMU_PT : void 0, (v2) => setLine({ w: Math.round(v2 * EMU_PT) }), { min: 0, max: 1584, step: 0.25, digits: 2 }),
      choice(tr8("Compound type", "Tipo composto"), [["sng", tr8("Single", "Simples")], ["dbl", tr8("Double", "Duplo")], ["thickThin", tr8("Thick Thin", "Grosso Fino")], ["thinThick", tr8("Thin Thick", "Fino Grosso")], ["tri", tr8("Triple", "Triplo")]], () => line2()?.cmpd ?? "sng", (v2) => setLine({ cmpd: v2 })),
      choice(tr8("Dash type", "Tipo de tra\xE7o"), LINE_DASHES.map((d3) => [d3.val, pickLabels(lang, d3.label)]), () => line2()?.dash ?? "solid", (v2) => setLine({ dash: v2 === "solid" ? void 0 : v2 })),
      choice(tr8("Cap type", "Tipo de extremidade"), [["sq", tr8("Square", "Quadrado")], ["rnd", tr8("Round", "Arredondado")], ["flat", tr8("Flat", "Plano")]], () => line2()?.cap ?? "flat", (v2) => setLine({ cap: v2 })),
      choice(tr8("Join type", "Tipo de jun\xE7\xE3o"), [["round", tr8("Round", "Arredondada")], ["bevel", tr8("Bevel", "Chanfrada")], ["miter", tr8("Miter", "Malhete")]], () => line2()?.join ?? "round", (v2) => setLine({ join: v2 }))
    )
  );
  const fx = () => anyFmt()?.effects;
  const sh = () => fx()?.shadow;
  const setSh = (ch) => {
    const base = sh() ?? { kind: "outer", blurRad: 50800, dist: 38100, dir: 27e5, algn: "tl", rotWithShape: false, color: { kind: "prstClr", val: "black", mods: [["alpha", 4e4]] } };
    setFormat({ shadow: { ...base, ...ch } });
  };
  const rf = () => fx()?.reflection;
  const setRf = (ch) => {
    const base = rf() ?? { blurRad: 6350, stA: 5e4, endA: 300, endPos: 55e3, dir: 54e5, sy: -1e5, algn: "bl", rotWithShape: false };
    setFormat({ reflection: { ...base, ...ch } });
  };
  const gl = () => fx()?.glow;
  const setGl = (ch) => {
    const base = gl() ?? glowPreset(GLOW_SIZES[0], 1);
    setFormat({ glow: { ...base, ...ch } });
  };
  const td = () => anyFmt()?.threeD;
  const setTd = (ch) => {
    const base = td() ?? { camera: { prst: "orthographicFront" }, lightRig: { rig: "threePt", dir: "t" } };
    setFormat({ threeD: { ...base, ...ch } });
  };
  const bevelOpts = [["", tr8("No Bevel", "Sem Bisel")], ...BEVEL_PRESETS.map((b3) => [b3.prst, pickLabels(lang, b3.label)])];
  const bevel = (which, title2) => [
    choice(title2, bevelOpts, () => td()?.[which] ? td()[which].prst ?? "circle" : "", (v2) => setTd({ [which]: v2 ? { ...td()?.[which] ?? {}, prst: v2 === "circle" ? void 0 : v2 } : void 0 })),
    num2(tr8("Width", "Largura"), "pt", () => td()?.[which] ? (td()[which].w ?? 76200) / EMU_PT : void 0, (v2) => setTd({ [which]: { ...td()?.[which] ?? {}, w: Math.round(v2 * EMU_PT) } }), { min: 0, max: 1584, step: 1 }),
    num2(tr8("Height", "Altura"), "pt", () => td()?.[which] ? (td()[which].h ?? 76200) / EMU_PT : void 0, (v2) => setTd({ [which]: { ...td()?.[which] ?? {}, h: Math.round(v2 * EMU_PT) } }), { min: 0, max: 1584, step: 1 })
  ];
  const rot = () => td()?.camera?.rot ?? { lat: 0, lon: 0, rev: 0 };
  const setRot = (k2, deg) => {
    const cam = td()?.camera ?? { prst: "orthographicFront" };
    setTd({ camera: { ...cam, rot: { ...rot(), [k2]: Math.round((deg % 360 + 360) % 360 * ANG) } } });
  };
  const effectsTab = el10(
    "div",
    {},
    section4(
      tr8("Shadow", "Sombra"),
      true,
      presetRow(tr8("Presets", "Predefini\xE7\xF5es"), SHADOW_PRESETS.map((p3) => ({ id: p3.id, label: pickLabels(lang, p3.label) })), (id) => setEffect("shadow", id), tr8("No Shadow", "Sem Sombra")),
      color(tr8("Color", "Cor"), () => sh()?.color, (c4) => setSh({ color: withAlpha(c4, alphaOf(sh()?.color)) })),
      num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => sh() ? 100 - alphaOf(sh().color) : void 0, (v2) => sh() && setSh({ color: withAlpha(noAlpha(sh().color), 100 - v2) }), { min: 0, max: 100 }),
      num2(tr8("Size", "Tamanho"), "%", () => sh() ? (sh().sx ?? 1e5) / 1e3 : void 0, (v2) => setSh({ sx: Math.round(v2 * 1e3), sy: Math.round(v2 * 1e3) }), { min: 1, max: 200 }),
      num2(tr8("Blur", "Desfoque"), "pt", () => sh() ? (sh().blurRad ?? 0) / EMU_PT : void 0, (v2) => setSh({ blurRad: Math.round(v2 * EMU_PT) }), { min: 0, max: 100 }),
      num2(tr8("Angle", "\xC2ngulo"), "\xB0", () => sh() ? (sh().dir ?? 0) / ANG : void 0, (v2) => setSh({ dir: Math.round((v2 % 360 + 360) % 360 * ANG) }), { min: 0, max: 359.9 }),
      num2(tr8("Distance", "Dist\xE2ncia"), "pt", () => sh() ? (sh().dist ?? 0) / EMU_PT : void 0, (v2) => setSh({ dist: Math.round(v2 * EMU_PT) }), { min: 0, max: 200 })
    ),
    section4(
      tr8("Reflection", "Reflexo"),
      false,
      presetRow(tr8("Presets", "Predefini\xE7\xF5es"), REFLECTION_PRESETS.map((p3) => ({ id: p3.id, label: pickLabels(lang, p3.label) })), (id) => setEffect("reflection", id), tr8("No Reflection", "Sem Reflexo")),
      num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => rf() ? 100 - (rf().stA ?? 1e5) / 1e3 : void 0, (v2) => setRf({ stA: Math.round((100 - v2) * 1e3) }), { min: 0, max: 100 }),
      num2(tr8("Size", "Tamanho"), "%", () => rf() ? (rf().endPos ?? 1e5) / 1e3 : void 0, (v2) => setRf({ endPos: Math.round(v2 * 1e3) }), { min: 1, max: 100 }),
      num2(tr8("Blur", "Desfoque"), "pt", () => rf() ? (rf().blurRad ?? 0) / EMU_PT : void 0, (v2) => setRf({ blurRad: Math.round(v2 * EMU_PT) }), { min: 0, max: 100 }),
      num2(tr8("Distance", "Dist\xE2ncia"), "pt", () => rf() ? (rf().dist ?? 0) / EMU_PT : void 0, (v2) => setRf({ dist: Math.round(v2 * EMU_PT) }), { min: 0, max: 100 })
    ),
    section4(
      tr8("Glow", "Brilho"),
      false,
      presetRow(tr8("Presets", "Predefini\xE7\xF5es"), GLOW_SIZES.flatMap((r5, si) => [1, 2, 3, 4, 5, 6].map((a3) => ({ id: `glow-${si}-${a3}`, label: `${r5 / EMU_PT} pt, ${tr8("Accent color", "Cor de \xEAnfase")} ${a3}` }))), (id) => setEffect("glow", id), tr8("No Glow", "Sem Brilho")),
      color(tr8("Color", "Cor"), () => gl()?.color, (c4) => setGl({ color: withAlpha(c4, alphaOf(gl()?.color)) })),
      num2(tr8("Size", "Tamanho"), "pt", () => gl() ? gl().rad / EMU_PT : void 0, (v2) => setGl({ rad: Math.round(v2 * EMU_PT) }), { min: 0, max: 150 }),
      num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => gl() ? 100 - alphaOf(gl().color) : void 0, (v2) => gl() && setGl({ color: withAlpha(noAlpha(gl().color), 100 - v2) }), { min: 0, max: 100 })
    ),
    section4(
      tr8("Soft Edges", "Bordas Suaves"),
      false,
      num2(tr8("Size", "Tamanho"), "pt", () => fx()?.softEdge !== void 0 ? fx().softEdge / EMU_PT : 0, (v2) => setFormat({ softEdge: v2 > 0 ? Math.round(v2 * EMU_PT) : null }), { min: 0, max: 100 })
    ),
    section4(
      tr8("3-D Format", "Formato 3D"),
      false,
      ...bevel("bevelT", tr8("Top bevel", "Bisel superior")),
      ...bevel("bevelB", tr8("Bottom bevel", "Bisel inferior")),
      color(tr8("Depth color", "Cor da profundidade"), () => td()?.extrusionClr, (c4) => setTd({ extrusionClr: c4 })),
      num2(tr8("Depth size", "Tamanho da profundidade"), "pt", () => (td()?.extrusionH ?? 0) / EMU_PT, (v2) => setTd({ extrusionH: Math.round(v2 * EMU_PT) }), { min: 0, max: 1584 }),
      color(tr8("Contour color", "Cor do contorno"), () => td()?.contourClr, (c4) => setTd({ contourClr: c4 })),
      num2(tr8("Contour size", "Tamanho do contorno"), "pt", () => (td()?.contourW ?? 0) / EMU_PT, (v2) => setTd({ contourW: Math.round(v2 * EMU_PT) }), { min: 0, max: 1584 }),
      choice(tr8("Material", "Material"), [["warmMatte", tr8("Warm Matte", "Fosco Quente")], ["matte", tr8("Matte", "Fosco")], ["plastic", tr8("Plastic", "Pl\xE1stico")], ["metal", tr8("Metal", "Metal")], ["dkEdge", tr8("Dark Edge", "Borda Escura")], ["softEdge", tr8("Soft Edge", "Borda Suave")], ["flat", tr8("Flat", "Plano")], ["legacyWireframe", tr8("Wire Frame", "Estrutura de Arame")], ["powder", tr8("Powder", "P\xF3")], ["translucentPowder", tr8("Translucent Powder", "P\xF3 Transl\xFAcido")], ["clear", tr8("Clear", "Transparente")], ["softmetal", tr8("Soft Metal", "Metal Suave")]], () => td()?.prstMaterial ?? "warmMatte", (v2) => setTd({ prstMaterial: v2 })),
      choice(tr8("Lighting", "Ilumina\xE7\xE3o"), [["threePt", tr8("Three Point", "Tr\xEAs Pontos")], ["balanced", tr8("Balanced", "Balanceado")], ["soft", tr8("Soft", "Suave")], ["harsh", tr8("Harsh", "Forte")], ["flood", tr8("Flood", "Inunda\xE7\xE3o")], ["contrasting", tr8("Contrasting", "Contrastante")], ["morning", tr8("Morning", "Manh\xE3")], ["sunrise", tr8("Sunrise", "Nascer do Sol")], ["sunset", tr8("Sunset", "P\xF4r do Sol")], ["chilly", tr8("Chilly", "Frio")], ["freezing", tr8("Freezing", "Congelante")], ["flat", tr8("Flat", "Plano")], ["twoPt", tr8("Two Point", "Dois Pontos")], ["glow", tr8("Glow", "Brilho")], ["brightRoom", tr8("Bright Room", "Sala Iluminada")]], () => td()?.lightRig?.rig ?? "threePt", (v2) => setTd({ lightRig: { ...td()?.lightRig ?? { dir: "t" }, rig: v2 } }))
    ),
    section4(
      tr8("3-D Rotation", "Rota\xE7\xE3o 3D"),
      false,
      presetRow(tr8("Presets", "Predefini\xE7\xF5es"), ROTATION_PRESETS.map((p3) => ({ id: p3.prst, label: pickLabels(lang, p3.label) })), (id) => setEffect("rotation", id), tr8("No Rotation", "Sem Rota\xE7\xE3o")),
      num2(tr8("X Rotation", "Rota\xE7\xE3o X"), "\xB0", () => rot().lon / ANG, (v2) => setRot("lon", v2), { min: 0, max: 359.9 }),
      num2(tr8("Y Rotation", "Rota\xE7\xE3o Y"), "\xB0", () => rot().lat / ANG, (v2) => setRot("lat", v2), { min: 0, max: 359.9 }),
      num2(tr8("Z Rotation", "Rota\xE7\xE3o Z"), "\xB0", () => rot().rev / ANG, (v2) => setRot("rev", v2), { min: 0, max: 359.9 }),
      num2(tr8("Perspective", "Perspectiva"), "\xB0", () => (td()?.camera?.fov ?? 0) / ANG, (v2) => setTd({ camera: { ...td()?.camera ?? { prst: "perspectiveFront" }, fov: Math.round(v2 * ANG) } }), { min: 0, max: 120 })
    )
  );
  const title = el10("input", { type: "text", style: "width:100%;box-sizing:border-box" });
  const descr = el10("textarea", { rows: 4, style: "width:100%;box-sizing:border-box;resize:vertical" });
  title.addEventListener("change", () => {
    setAlt({ title: title.value });
    env.after();
  });
  descr.addEventListener("change", () => {
    setAlt({ text: descr.value });
    env.after();
  });
  for (const i5 of [title, descr]) i5.addEventListener("keydown", (e6) => e6.stopPropagation());
  syncers.push(() => {
    const st = shape ? ed.selectedShape() : ed.selectedImage();
    const focused = [title, descr].some((i5) => document.activeElement === i5 || ed.shadowRoot?.activeElement === i5);
    if (!focused) {
      title.value = st?.format.docPr.title ?? "";
      descr.value = st?.altText ?? "";
    }
    title.disabled = descr.disabled = off();
  });
  const tx = () => ed.selectedShape()?.text;
  const check8 = (label, get, set) => {
    const i5 = el10("input", { type: "checkbox" });
    i5.addEventListener("change", () => {
      set(i5.checked);
      env.after();
      sync();
    });
    syncers.push(() => {
      i5.checked = !!get();
      i5.disabled = off() || !tx();
    });
    return el10("label", { style: "display:flex;align-items:center;gap:6px;font-size:13px" }, i5, label);
  };
  const textSection = section4(
    tr8("Text Box", "Caixa de Texto"),
    true,
    choice(tr8("Vertical alignment", "Alinhamento vertical"), [["t", tr8("Top", "Superior")], ["ctr", tr8("Middle", "Meio")], ["b", tr8("Bottom", "Inferior")]], () => tx()?.anchor, (v2) => ed.setTextboxOptions({ anchor: v2 })),
    choice(tr8("Text direction", "Dire\xE7\xE3o do texto"), [["horz", tr8("Horizontal", "Horizontal")], ["vert", tr8("Rotate all text 90\xB0", "Girar todo o texto 90\xB0")], ["vert270", tr8("Rotate all text 270\xB0", "Girar todo o texto 270\xB0")], ["eaVert", tr8("Stacked (East Asian)", "Empilhado (Leste Asi\xE1tico)")], ["wordArtVert", tr8("Stacked", "Empilhado")]], () => tx()?.direction, (v2) => ed.setTextboxOptions({ direction: v2 })),
    check8(tr8("Do not rotate text", "N\xE3o girar o texto"), () => tx()?.upright, (v2) => ed.setTextboxOptions({ upright: v2 })),
    check8(tr8("Resize shape to fit text", "Redimensionar a forma para ajustar o texto"), () => tx()?.autofit === "shape", (v2) => ed.setTextboxOptions({ autofit: v2 ? "shape" : "none" })),
    num2(tr8("Left margin", "Margem esquerda"), "cm", () => tx() ? tx().marginsPt.l / 72 * 2.54 : void 0, (v2) => ed.setTextboxOptions({ marginsPt: { l: v2 / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num2(tr8("Right margin", "Margem direita"), "cm", () => tx() ? tx().marginsPt.r / 72 * 2.54 : void 0, (v2) => ed.setTextboxOptions({ marginsPt: { r: v2 / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num2(tr8("Top margin", "Margem superior"), "cm", () => tx() ? tx().marginsPt.t / 72 * 2.54 : void 0, (v2) => ed.setTextboxOptions({ marginsPt: { t: v2 / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    num2(tr8("Bottom margin", "Margem inferior"), "cm", () => tx() ? tx().marginsPt.b / 72 * 2.54 : void 0, (v2) => ed.setTextboxOptions({ marginsPt: { b: v2 / 2.54 * 72 } }), { min: 0, step: 0.1, digits: 2 }),
    check8(tr8("Wrap text in shape", "Quebrar texto na forma"), () => tx()?.wrap, (v2) => ed.setTextboxOptions({ wrap: v2 }))
  );
  const layoutTab = el10(
    "div",
    {},
    ...shape ? [textSection] : [],
    section4(
      tr8("Alt Text", "Texto Alt"),
      true,
      el10("label", { style: "display:flex;flex-direction:column;gap:4px;font-size:13px" }, tr8("Title", "T\xEDtulo"), title),
      el10("label", { style: "display:flex;flex-direction:column;gap:4px;font-size:13px" }, tr8("Description", "Descri\xE7\xE3o"), descr)
    )
  );
  const a14 = () => fmt()?.blip.a14;
  const cropRect = () => fmt()?.srcRect ?? { l: 0, t: 0, r: 0, b: 0 };
  const cm = (pt2) => pt2 / 72 * 2.54;
  const pt = (c4) => c4 / 2.54 * 72;
  const geo = () => {
    const st = ed.selectedImage();
    if (!st) return null;
    const s4 = cropRect();
    const vw = 1 - (s4.l + s4.r) / 1e5, vh = 1 - (s4.t + s4.b) / 1e5;
    const fw = st.widthPt / vw, fh = st.heightPt / vh;
    return { fw, fh, ox: (s4.r - s4.l) / 2e5 * fw, oy: (s4.b - s4.t) / 2e5 * fh, w: st.widthPt, h: st.heightPt, left: s4.l / 1e5 * fw, top: s4.t / 1e5 * fh };
  };
  const setCropFrom = (o6) => {
    const l3 = (o6.fw / 2 - o6.ox - o6.w / 2) / o6.fw, r5 = (o6.fw / 2 + o6.ox - o6.w / 2) / o6.fw;
    const t5 = (o6.fh / 2 - o6.oy - o6.h / 2) / o6.fh, b3 = (o6.fh / 2 + o6.oy - o6.h / 2) / o6.fh;
    ed.setImageCrop({ l: l3, t: t5, r: r5, b: b3 });
  };
  const pictureTab = el10(
    "div",
    {},
    section4(
      tr8("Picture Corrections", "Corre\xE7\xF5es de Imagem"),
      true,
      num2(tr8("Sharpness", "Nitidez"), "%", () => (a14()?.sharpen ?? 0) / 1e3, (v2) => void ed.setImageAdjust({ sharpen: v2 / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 }),
      num2(tr8("Brightness", "Brilho"), "%", () => (a14()?.bright ?? 0) / 1e3, (v2) => void ed.setImageAdjust({ bright: v2 / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 }),
      num2(tr8("Contrast", "Contraste"), "%", () => (a14()?.contrast ?? 0) / 1e3, (v2) => void ed.setImageAdjust({ contrast: v2 / 100 }).then(() => {
        env.after();
        sync();
      }), { min: -100, max: 100 })
    ),
    section4(
      tr8("Picture Color", "Cor da Imagem"),
      false,
      num2(tr8("Saturation", "Satura\xE7\xE3o"), "%", () => (a14()?.saturation ?? 1e5) / 1e3, (v2) => void ed.setImageAdjust({ saturation: v2 / 100 }).then(() => {
        env.after();
        sync();
      }), { min: 0, max: 400 }),
      num2(tr8("Temperature", "Temperatura"), "K", () => a14()?.colorTemp ?? 6500, (v2) => void ed.setImageAdjust({ temperature: v2 }).then(() => {
        env.after();
        sync();
      }), { min: 1500, max: 11500, step: 100, digits: 0 })
    ),
    section4(
      tr8("Picture Transparency", "Transpar\xEAncia da Imagem"),
      false,
      num2(tr8("Transparency", "Transpar\xEAncia"), "%", () => 100 - (fmt()?.blip.alphaModFix ?? 1e5) / 1e3, (v2) => ed.setImageTransparency(v2), { min: 0, max: 100 })
    ),
    section4(
      tr8("Crop", "Cortar"),
      false,
      el10("div", { textContent: tr8("Picture position", "Posi\xE7\xE3o da imagem"), style: "font-size:12px;opacity:.75" }),
      num2(tr8("Width", "Largura"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.fw) : void 0;
      }, (v2) => {
        const g2 = geo();
        if (g2) setCropFrom({ ...g2, fw: pt(v2), fh: g2.fh * (pt(v2) / g2.fw) });
      }, { min: 0.01, step: 0.1, digits: 2 }),
      num2(tr8("Height", "Altura"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.fh) : void 0;
      }, (v2) => {
        const g2 = geo();
        if (g2) setCropFrom({ ...g2, fh: pt(v2), fw: g2.fw * (pt(v2) / g2.fh) });
      }, { min: 0.01, step: 0.1, digits: 2 }),
      num2(tr8("Offset X", "Deslocamento X"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.ox) : void 0;
      }, (v2) => {
        const g2 = geo();
        if (g2) setCropFrom({ ...g2, ox: pt(v2) });
      }, { step: 0.1, digits: 2 }),
      num2(tr8("Offset Y", "Deslocamento Y"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.oy) : void 0;
      }, (v2) => {
        const g2 = geo();
        if (g2) setCropFrom({ ...g2, oy: pt(v2) });
      }, { step: 0.1, digits: 2 }),
      el10("div", { textContent: tr8("Crop position", "Posi\xE7\xE3o do corte"), style: "font-size:12px;opacity:.75" }),
      num2(tr8("Width", "Largura"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.w) : void 0;
      }, (v2) => ed.setImageSize({ widthPt: pt(v2), heightPt: ed.selectedImage().heightPt }), { min: 0.01, step: 0.1, digits: 2 }),
      num2(tr8("Height", "Altura"), "cm", () => {
        const g2 = geo();
        return g2 ? cm(g2.h) : void 0;
      }, (v2) => ed.setImageSize({ heightPt: pt(v2), widthPt: ed.selectedImage().widthPt }), { min: 0.01, step: 0.1, digits: 2 })
    )
  );
  const tabs = [
    ["line", tr8("Fill & Line", "Preenchimento e Linha"), "format_color_fill", lineTab],
    ["effects", tr8("Effects", "Efeitos"), "auto_awesome", effectsTab],
    ["layout", tr8("Layout & Properties", "Layout e Propriedades"), "aspect_ratio", layoutTab],
    ...shape ? [] : [["picture", tr8("Picture", "Imagem"), "image", pictureTab]]
  ];
  const head = el10("div", { style: "display:flex;gap:4px;border-bottom:1px solid var(--uo-outline-variant,#ddd);padding-bottom:6px" });
  head.setAttribute("role", "tablist");
  const btns = tabs.map(([id, label, icon, panel]) => {
    const b3 = el10("button", { type: "button", className: "uo-btn", title: label, style: "min-width:0;padding:4px 8px" });
    b3.innerHTML = symbol(icon);
    b3.setAttribute("role", "tab");
    b3.setAttribute("aria-label", label);
    b3.dataset["a"] = `pic:format:${id}`;
    b3.addEventListener("mousedown", (e6) => e6.preventDefault());
    b3.addEventListener("click", () => show(id));
    panel.setAttribute("role", "tabpanel");
    return b3;
  });
  const empty = el10("p", { textContent: shape ? tr8("Select a shape to format it.", "Selecione uma forma para format\xE1-la.") : tr8("Select a picture to format it.", "Selecione uma imagem para format\xE1-la."), style: "margin:0;font-size:13px;opacity:.75" });
  const body = el10("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, head, empty, ...tabs.map((t5) => t5[3]));
  head.append(...btns);
  const show = (id) => {
    tabs.forEach(([tid, , , panel], i5) => {
      panel.hidden = tid !== id;
      btns[i5].classList.toggle("uo-on", tid === id);
      btns[i5].setAttribute("aria-selected", String(tid === id));
    });
  };
  const sync = () => {
    empty.hidden = !!(shape ? ed.selectedShape() : ed.selectedImage());
    for (const s4 of syncers) s4();
  };
  show(shape && tab === "picture" ? "line" : tab);
  openPane({ id: "pic-format", title: shape ? { en: "Format Shape", pt: "Formatar Forma" } : { en: "Format Picture", pt: "Formatar Imagem" }, lang, layer: env.layer, frame: env.frame, width: 320, body, onClose });
  ed.classList.add("uw-has-pane");
  sync();
  return { sync, show };
}

// src/chrome-picture-dialogs.ts
var el11 = (tag, props = {}, ...kids) => {
  const { style, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (style) e6.style.cssText = style;
  e6.append(...kids);
  return e6;
};
var tr7 = (lang, en, pt) => pickLabels(lang, { en, pt });
var select5 = (name, opts, value) => {
  const s4 = el11("select", { name });
  for (const [v2, t5] of opts) s4.append(el11("option", { value: v2, textContent: t5 }));
  s4.value = opts.some(([v2]) => v2 === value) ? value : opts[0]?.[0] ?? "";
  return s4;
};
var check7 = (name, label, on) => {
  const input = el11("input", { type: "checkbox", name, checked: on });
  return { el: el11("label", { className: "uo-check" }, input, label), input };
};
var cmText2 = (lang, pt) => `${(Math.round(pt / 72 * 254) / 100).toFixed(2).replace(".", tr7(lang, ".", ","))} cm`;
var ptOf = (s4) => {
  const n5 = parseFloat(s4.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n5) ? n5 / 2.54 * 72 : void 0;
};
var numOf = (s4) => {
  const n5 = parseFloat(s4.replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n5) ? n5 : void 0;
};
var cmInput2 = (lang, name, pt) => el11("input", { type: "text", name, inputMode: "decimal", value: cmText2(lang, pt), style: "width:92px" });
var row = (...kids) => el11("div", { style: "display:flex;align-items:center;gap:8px;flex-wrap:wrap" }, ...kids);
var section3 = (title, ...kids) => el11("fieldset", { style: "display:flex;flex-direction:column;gap:8px;border:1px solid var(--uo-outline-variant,#ccc);border-radius:8px;padding:8px 12px" }, el11("legend", { textContent: title }), ...kids);
var radio4 = (name, value, label, on) => {
  const input = el11("input", { type: "radio", name, value, checked: on });
  return { el: el11("label", { className: "uo-check" }, input, label), input };
};
var H_REFS = (lang) => [
  ["margin", tr7(lang, "Margin", "Margem")],
  ["page", tr7(lang, "Page", "P\xE1gina")],
  ["column", tr7(lang, "Column", "Coluna")],
  ["character", tr7(lang, "Character", "Caractere")],
  ["leftMargin", tr7(lang, "Left Margin", "Margem Esquerda")],
  ["rightMargin", tr7(lang, "Right Margin", "Margem Direita")],
  ["insideMargin", tr7(lang, "Inside Margin", "Margem Interna")],
  ["outsideMargin", tr7(lang, "Outside Margin", "Margem Externa")]
];
var V_REFS = (lang) => [
  ["margin", tr7(lang, "Margin", "Margem")],
  ["page", tr7(lang, "Page", "P\xE1gina")],
  ["paragraph", tr7(lang, "Paragraph", "Par\xE1grafo")],
  ["line", tr7(lang, "Line", "Linha")],
  ["topMargin", tr7(lang, "Top Margin", "Margem Superior")],
  ["bottomMargin", tr7(lang, "Bottom Margin", "Margem Inferior")],
  ["insideMargin", tr7(lang, "Inside Margin", "Margem Interna")],
  ["outsideMargin", tr7(lang, "Outside Margin", "Margem Externa")]
];
var WRAP_STYLES = (lang) => [
  ["inline", tr7(lang, "In line with text", "Alinhado ao texto")],
  ["square", tr7(lang, "Square", "Quadrado")],
  ["tight", tr7(lang, "Tight", "Comprimido")],
  ["through", tr7(lang, "Through", "Atrav\xE9s")],
  ["topAndBottom", tr7(lang, "Top and bottom", "Superior e inferior")],
  ["behind", tr7(lang, "Behind text", "Atr\xE1s do texto")],
  ["front", tr7(lang, "In front of text", "Na frente do texto")]
];
async function pictureLayoutDialog(env, tab) {
  const { ed, lang } = env;
  const st = ed.selectedImage() ?? ed.selectedShape();
  if (!st) return;
  const f3 = st.format;
  const pt = (emu) => emu / 12700;
  const anchored = !f3.inline;
  const ph = f3.posH, pv = f3.posV;
  const hMode = !ph ? "abs" : ph.align === "inside" || ph.align === "outside" ? "book" : ph.align !== void 0 ? "align" : ph.pct !== void 0 ? "rel" : "abs";
  const vMode = !pv ? "abs" : pv.align !== void 0 ? "align" : pv.pct !== void 0 ? "rel" : "abs";
  const hAlign = select5("hAlign", [["left", tr7(lang, "Left", "Esquerda")], ["center", tr7(lang, "Centered", "Centralizado")], ["right", tr7(lang, "Right", "Direita")]], ph?.align ?? "left");
  const hAlignRef = select5("hAlignRef", H_REFS(lang), ph?.relativeFrom ?? "column");
  const hBook = select5("hBook", [["inside", tr7(lang, "Inside", "Interna")], ["outside", tr7(lang, "Outside", "Externa")]], ph?.align ?? "inside");
  const hBookRef = select5("hBookRef", [["margin", tr7(lang, "Margin", "Margem")], ["page", tr7(lang, "Page", "P\xE1gina")]], ph?.relativeFrom ?? "margin");
  const hAbs = cmInput2(lang, "hAbs", pt(ph?.offset ?? 0));
  const hAbsRef = select5("hAbsRef", H_REFS(lang), ph?.relativeFrom ?? "column");
  const hRel = el11("input", { type: "text", name: "hRel", value: `${(ph?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const hRelRef = select5("hRelRef", H_REFS(lang).filter(([k2]) => k2 !== "column" && k2 !== "character"), ph?.relativeFrom ?? "margin");
  const vAlign = select5("vAlign", [["top", tr7(lang, "Top", "Superior")], ["center", tr7(lang, "Centered", "Centralizado")], ["bottom", tr7(lang, "Bottom", "Inferior")], ["inside", tr7(lang, "Inside", "Interna")], ["outside", tr7(lang, "Outside", "Externa")]], pv?.align ?? "top");
  const vAlignRef = select5("vAlignRef", V_REFS(lang).filter(([k2]) => k2 !== "paragraph"), pv?.relativeFrom ?? "margin");
  const vAbs = cmInput2(lang, "vAbs", pt(pv?.offset ?? 0));
  const vAbsRef = select5("vAbsRef", V_REFS(lang), pv?.relativeFrom ?? "paragraph");
  const vRel = el11("input", { type: "text", name: "vRel", value: `${(pv?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const vRelRef = select5("vRelRef", V_REFS(lang).filter(([k2]) => k2 !== "paragraph" && k2 !== "line"), pv?.relativeFrom ?? "margin");
  const hR = { align: radio4("h", "align", tr7(lang, "Alignment", "Alinhamento"), hMode === "align"), book: radio4("h", "book", tr7(lang, "Book layout", "Layout do livro"), hMode === "book"), abs: radio4("h", "abs", tr7(lang, "Absolute position", "Posi\xE7\xE3o absoluta"), hMode === "abs"), rel: radio4("h", "rel", tr7(lang, "Relative position", "Posi\xE7\xE3o relativa"), hMode === "rel") };
  const vR = { align: radio4("v", "align", tr7(lang, "Alignment", "Alinhamento"), vMode === "align"), abs: radio4("v", "abs", tr7(lang, "Absolute position", "Posi\xE7\xE3o absoluta"), vMode === "abs"), rel: radio4("v", "rel", tr7(lang, "Relative position", "Posi\xE7\xE3o relativa"), vMode === "rel") };
  const moveWith = check7("moveWith", tr7(lang, "Move object with text", "Mover objeto com texto"), st.moveWithText);
  const lockAnchor = check7("lockAnchor", tr7(lang, "Lock anchor", "Bloquear \xE2ncora"), f3.locked);
  const overlap = check7("overlap", tr7(lang, "Allow overlap", "Permitir sobreposi\xE7\xE3o"), f3.allowOverlap);
  const inCell = check7("inCell", tr7(lang, "Layout in table cell", "Layout na c\xE9lula da tabela"), f3.layoutInCell);
  const rel = tr7(lang, "relative to", "relativo a");
  const posBody = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(
      tr7(lang, "Horizontal", "Horizontal"),
      row(hR.align.el, hAlign, rel, hAlignRef),
      row(hR.book.el, hBook, tr7(lang, "of", "de"), hBookRef),
      row(hR.abs.el, hAbs, tr7(lang, "to the right of", "\xE0 direita de"), hAbsRef),
      row(hR.rel.el, hRel, rel, hRelRef)
    ),
    section3(
      tr7(lang, "Vertical", "Vertical"),
      row(vR.align.el, vAlign, rel, vAlignRef),
      row(vR.abs.el, vAbs, tr7(lang, "below", "abaixo de"), vAbsRef),
      row(vR.rel.el, vRel, rel, vRelRef)
    ),
    section3(tr7(lang, "Options", "Op\xE7\xF5es"), row(moveWith.el, overlap.el), row(lockAnchor.el, inCell.el))
  );
  for (const i5 of posBody.querySelectorAll("input,select")) i5.disabled = !anchored;
  const wrapR = WRAP_STYLES(lang).map(([k2, t5]) => ({ k: k2, ...radio4("wrap", k2, t5, f3.wrap === k2) }));
  const sides = [["bothSides", tr7(lang, "Both sides", "Ambos os lados")], ["left", tr7(lang, "Left only", "Somente \xE0 esquerda")], ["right", tr7(lang, "Right only", "Somente \xE0 direita")], ["largest", tr7(lang, "Largest only", "Somente no maior")]].map(([k2, t5]) => ({ k: k2, ...radio4("side", k2, t5, f3.wrapText === k2) }));
  const dT = cmInput2(lang, "dT", pt(f3.dist.t)), dB = cmInput2(lang, "dB", pt(f3.dist.b)), dL = cmInput2(lang, "dL", pt(f3.dist.l)), dR = cmInput2(lang, "dR", pt(f3.dist.r));
  const syncWrap = () => {
    const w2 = wrapR.find((r5) => r5.input.checked)?.k ?? f3.wrap;
    const sideOk = w2 === "square" || w2 === "tight" || w2 === "through";
    for (const s4 of sides) s4.input.disabled = !sideOk;
    dT.disabled = dB.disabled = !(w2 === "square" || w2 === "topAndBottom");
    dL.disabled = dR.disabled = !sideOk;
  };
  for (const r5 of wrapR) r5.input.addEventListener("change", syncWrap);
  syncWrap();
  const wrapBody = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr7(lang, "Wrapping style", "Estilo de quebra autom\xE1tica"), el11("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:6px" }, ...wrapR.map((r5) => r5.el))),
    section3(tr7(lang, "Wrap text", "Quebra autom\xE1tica de texto"), row(...sides.map((s4) => s4.el))),
    section3(
      tr7(lang, "Distance from text", "Dist\xE2ncia do texto"),
      row(tr7(lang, "Top", "Superior"), dT, tr7(lang, "Left", "Esquerda"), dL),
      row(tr7(lang, "Bottom", "Inferior"), dB, tr7(lang, "Right", "Direita"), dR)
    )
  );
  const nat = st.naturalPt;
  const hAbsSz = cmInput2(lang, "hAbsSz", st.heightPt), wAbsSz = cmInput2(lang, "wAbsSz", st.widthPt);
  const relV = f3.sizeRelV?.pct ? f3.sizeRelV : null, relH = f3.sizeRelH?.pct ? f3.sizeRelH : null;
  const hRelSz = el11("input", { type: "text", name: "hRelSz", value: `${(relV?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const wRelSz = el11("input", { type: "text", name: "wRelSz", value: `${(relH?.pct ?? 0) / 1e3}%`, style: "width:72px" });
  const sizeRefsV = [["margin", tr7(lang, "Margin", "Margem")], ["page", tr7(lang, "Page", "P\xE1gina")], ["topMargin", tr7(lang, "Top Margin", "Margem Superior")], ["bottomMargin", tr7(lang, "Bottom Margin", "Margem Inferior")], ["insideMargin", tr7(lang, "Inside Margin", "Margem Interna")], ["outsideMargin", tr7(lang, "Outside Margin", "Margem Externa")]];
  const sizeRefsH = [["margin", tr7(lang, "Margin", "Margem")], ["page", tr7(lang, "Page", "P\xE1gina")], ["leftMargin", tr7(lang, "Left Margin", "Margem Esquerda")], ["rightMargin", tr7(lang, "Right Margin", "Margem Direita")], ["insideMargin", tr7(lang, "Inside Margin", "Margem Interna")], ["outsideMargin", tr7(lang, "Outside Margin", "Margem Externa")]];
  const hRelRefSz = select5("hRelRefSz", sizeRefsV, relV?.relativeFrom ?? "margin");
  const wRelRefSz = select5("wRelRefSz", sizeRefsH, relH?.relativeFrom ?? "margin");
  const szH = { abs: radio4("szh", "abs", tr7(lang, "Absolute", "Absoluta"), !relV), rel: radio4("szh", "rel", tr7(lang, "Relative", "Relativa"), !!relV) };
  const szW = { abs: radio4("szw", "abs", tr7(lang, "Absolute", "Absoluta"), !relH), rel: radio4("szw", "rel", tr7(lang, "Relative", "Relativa"), !!relH) };
  const rotIn = el11("input", { type: "number", name: "rot", min: "-3600", max: "3600", step: "1", value: String(Math.round(st.rotation * 10) / 10), style: "width:80px" });
  const relOrig = check7("relOrig", tr7(lang, "Relative to original picture size", "Relativo ao tamanho original da imagem"), !!nat);
  const lockAsp = check7("lockAsp", tr7(lang, "Lock aspect ratio", "Bloquear propor\xE7\xE3o"), st.lockAspect);
  const base = () => relOrig.input.checked && nat ? nat : { w: st.widthPt, h: st.heightPt };
  const scH = el11("input", { type: "text", name: "scH", value: "", style: "width:72px" });
  const scW = el11("input", { type: "text", name: "scW", value: "", style: "width:72px" });
  const showScale = () => {
    const b3 = base();
    const h4 = ptOf(hAbsSz.value) ?? st.heightPt, w2 = ptOf(wAbsSz.value) ?? st.widthPt;
    scH.value = `${Math.round(h4 / b3.h * 100)}%`;
    scW.value = `${Math.round(w2 / b3.w * 100)}%`;
  };
  showScale();
  relOrig.input.addEventListener("change", showScale);
  hAbsSz.addEventListener("change", () => {
    const h4 = ptOf(hAbsSz.value);
    if (h4 !== void 0 && lockAsp.input.checked && st.heightPt) wAbsSz.value = cmText2(lang, st.widthPt * h4 / st.heightPt);
    showScale();
  });
  wAbsSz.addEventListener("change", () => {
    const w2 = ptOf(wAbsSz.value);
    if (w2 !== void 0 && lockAsp.input.checked && st.widthPt) hAbsSz.value = cmText2(lang, st.heightPt * w2 / st.widthPt);
    showScale();
  });
  const fromScale = (which) => {
    const b3 = base();
    const p3 = numOf((which === "h" ? scH : scW).value);
    if (p3 === void 0) return;
    if (which === "h" || lockAsp.input.checked) hAbsSz.value = cmText2(lang, b3.h * p3 / 100);
    if (which === "w" || lockAsp.input.checked) wAbsSz.value = cmText2(lang, b3.w * p3 / 100);
    showScale();
  };
  scH.addEventListener("change", () => fromScale("h"));
  scW.addEventListener("change", () => fromScale("w"));
  const reset = el11("button", { type: "button", className: "uo-btn", textContent: tr7(lang, "Reset", "Redefinir"), disabled: !nat });
  reset.addEventListener("click", () => {
    if (!nat) return;
    hAbsSz.value = cmText2(lang, nat.h);
    wAbsSz.value = cmText2(lang, nat.w);
    rotIn.value = "0";
    szH.abs.input.checked = szW.abs.input.checked = true;
    showScale();
  });
  for (const i5 of [hRelSz, hRelRefSz, wRelSz, wRelRefSz, szH.rel.input, szW.rel.input]) i5.disabled = !anchored;
  const sizeBody = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr7(lang, "Height", "Altura"), row(szH.abs.el, hAbsSz), row(szH.rel.el, hRelSz, rel, hRelRefSz)),
    section3(tr7(lang, "Width", "Largura"), row(szW.abs.el, wAbsSz), row(szW.rel.el, wRelSz, rel, wRelRefSz)),
    section3(tr7(lang, "Rotate", "Girar"), row(tr7(lang, "Rotation:", "Rota\xE7\xE3o:"), rotIn, "\xB0")),
    section3(tr7(lang, "Scale", "Escala"), row(tr7(lang, "Height:", "Altura:"), scH, tr7(lang, "Width:", "Largura:"), scW), lockAsp.el, relOrig.el),
    section3(tr7(lang, "Original size", "Tamanho original"), row(
      el11("span", { textContent: `${tr7(lang, "Height:", "Altura:")} ${nat ? cmText2(lang, nat.h) : "\u2014"}` }),
      el11("span", { textContent: `${tr7(lang, "Width:", "Largura:")} ${nat ? cmText2(lang, nat.w) : "\u2014"}` }),
      reset
    ))
  );
  const tabs = dialogTabs([
    { id: "position", label: tr7(lang, "Position", "Posi\xE7\xE3o"), body: posBody },
    { id: "wrap", label: tr7(lang, "Text Wrapping", "Quebra Autom\xE1tica de Texto"), body: wrapBody },
    { id: "size", label: tr7(lang, "Size", "Tamanho"), body: sizeBody }
  ], tab);
  const L11 = env.app.ui.L;
  const h3 = openDialog({
    title: tr7(lang, "Layout", "Layout"),
    body: tabs.el,
    layer: env.layer,
    lang,
    width: 560,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const o6 = {};
  const wrap = wrapR.find((r5) => r5.input.checked)?.k;
  if (wrap && wrap !== f3.wrap) o6.wrap = wrap;
  const willFloat = (wrap ?? f3.wrap) !== "inline";
  if (willFloat) {
    const side = sides.find((s4) => s4.input.checked)?.k;
    if (side && side !== f3.wrapText) o6.wrapText = side;
    const dist = {};
    for (const [k2, inp, cur] of [["t", dT, f3.dist.t], ["b", dB, f3.dist.b], ["l", dL, f3.dist.l], ["r", dR, f3.dist.r]]) {
      const v2 = ptOf(inp.value);
      if (v2 !== void 0 && Math.abs(v2 - cur / 12700) > 0.01) dist[k2] = v2;
    }
    if (Object.keys(dist).length) o6.distPt = dist;
  }
  if (anchored) {
    const hm = Object.entries(hR).find(([, r5]) => r5.input.checked)?.[0];
    if (hm === "align") o6.posH = { relativeFrom: hAlignRef.value, align: hAlign.value };
    else if (hm === "book") o6.posH = { relativeFrom: hBookRef.value, align: hBook.value };
    else if (hm === "rel") o6.posH = { relativeFrom: hRelRef.value, pct: numOf(hRel.value) ?? 0 };
    else o6.posH = { relativeFrom: hAbsRef.value, offsetPt: ptOf(hAbs.value) ?? 0 };
    const vm = Object.entries(vR).find(([, r5]) => r5.input.checked)?.[0];
    if (vm === "align") o6.posV = { relativeFrom: vAlignRef.value, align: vAlign.value };
    else if (vm === "rel") o6.posV = { relativeFrom: vRelRef.value, pct: numOf(vRel.value) ?? 0 };
    else o6.posV = { relativeFrom: vAbsRef.value, offsetPt: ptOf(vAbs.value) ?? 0 };
    o6.lockAnchor = lockAnchor.input.checked;
    o6.allowOverlap = overlap.input.checked;
    o6.layoutInCell = inCell.input.checked;
    if (moveWith.input.checked !== st.moveWithText && vm === "abs") o6.posV = { relativeFrom: moveWith.input.checked ? "paragraph" : "page", offsetPt: ptOf(vAbs.value) ?? 0 };
    o6.relHeight = szH.rel.input.checked ? { relativeFrom: hRelRefSz.value, pct: numOf(hRelSz.value) ?? 0 } : relV ? null : void 0;
    o6.relWidth = szW.rel.input.checked ? { relativeFrom: wRelRefSz.value, pct: numOf(wRelSz.value) ?? 0 } : relH ? null : void 0;
    if (o6.relHeight === void 0) delete o6.relHeight;
    if (o6.relWidth === void 0) delete o6.relWidth;
  }
  const hh = ptOf(hAbsSz.value), ww = ptOf(wAbsSz.value);
  if (hh !== void 0 && Math.abs(hh - st.heightPt) > 0.01) o6.heightPt = hh;
  if (ww !== void 0 && Math.abs(ww - st.widthPt) > 0.01) o6.widthPt = ww;
  if (lockAsp.input.checked !== st.lockAspect) o6.lockAspect = lockAsp.input.checked;
  const rot = numOf(rotIn.value);
  if (rot !== void 0 && Math.abs(rot - st.rotation) > 0.01) o6.rotation = rot;
  if (ed.selectedImage()) ed.setImageLayout(o6);
  else ed.setShapeLayout(o6);
}
async function pictureCompressDialog(env) {
  const { ed, lang } = env;
  if (!ed.selectedImage()) return;
  const only = check7("only", tr7(lang, "Apply only to this picture", "Aplicar somente a esta imagem"), true);
  const crop = check7("crop", tr7(lang, "Delete cropped areas of pictures", "Excluir \xE1reas cortadas de imagens"), true);
  const RES = [
    ["hifi", Infinity, "High fidelity: preserves quality of the original picture", "Alta fidelidade: preserva a qualidade da imagem original"],
    ["hd", 330, "HD (330 ppi): good quality for high-definition (HD) displays", "HD (330 ppi): boa qualidade para monitores de alta defini\xE7\xE3o (HD)"],
    ["print", 220, "Print (220 ppi): excellent quality on most printers and screens", "Impress\xE3o (220 ppi): excelente qualidade na maioria das impressoras e telas"],
    ["web", 150, "Web (150 ppi): good for web pages and projectors", "Web (150 ppi): bom para p\xE1ginas da Web e projetores"],
    ["email", 96, "E-mail (96 ppi): minimize document size for sharing", "Email (96 ppi): minimizar o tamanho do documento para compartilhamento"],
    ["default", 220, "Use default resolution", "Usar a resolu\xE7\xE3o padr\xE3o"]
  ];
  const res = RES.map(([k2, ppi2, en, pt]) => ({ ppi: ppi2, ...radio4("res", k2, tr7(lang, en, pt), k2 === "default") }));
  const body = el11(
    "div",
    { style: "display:flex;flex-direction:column;gap:12px" },
    section3(tr7(lang, "Compression options:", "Op\xE7\xF5es de compacta\xE7\xE3o:"), only.el, crop.el),
    section3(tr7(lang, "Resolution:", "Resolu\xE7\xE3o:"), ...res.map((r5) => r5.el))
  );
  const L11 = env.app.ui.L;
  const h3 = openDialog({
    title: tr7(lang, "Compress Pictures", "Compactar Imagens"),
    body,
    layer: env.layer,
    lang,
    width: 480,
    actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: "OK", primary: true }]
  });
  if (await h3.result !== "ok") return;
  const ppi = res.find((r5) => r5.input.checked)?.ppi ?? 220;
  await ed.compressImages({ ppi, deleteCropped: crop.input.checked, all: !only.input.checked });
}
var PictureUI = class {
  constructor(env) {
    this.env = env;
  }
  env;
  alt = null;
  sel = null;
  fmt = null;
  fmtTab = "line";
  get altOpen() {
    return !!this.alt;
  }
  get selectionOpen() {
    return !!this.sel;
  }
  get formatOpen() {
    return !!this.fmt;
  }
  sync() {
    this.alt?.sync();
    this.sel?.sync();
    this.fmt?.sync();
  }
  /** Painel Formatar Imagem na guia pedida (aberto em outra guia: troca de guia). */
  toggleFormat(tab) {
    if (this.fmt && this.fmtTab !== tab) {
      this.fmtTab = tab;
      this.fmt.show(tab);
      return;
    }
    this.fmtTab = tab;
    this.fmt = toggleFormatPane(this.env, tab, () => {
      this.fmt = null;
      this.env.ed.classList.remove("uw-has-pane");
      this.env.after();
    });
  }
  /** Painel de Seleção: as imagens flutuantes da frente para trás — clicar seleciona,
   *  duplo clique renomeia, o olho mostra/oculta; Mostrar/Ocultar Tudo e as setas
   *  de ordem (Avançar/Recuar) no topo. */
  toggleSelection() {
    const { ed, lang } = this.env;
    const cur = paneOpen("pic-sel");
    if (cur) {
      cur.close();
      return;
    }
    const btn2 = (label, icon, run) => {
      const b3 = el11("button", { type: "button", className: "uo-btn", title: label, style: "min-width:0;padding:2px 6px;display:inline-flex;align-items:center;gap:4px" });
      b3.innerHTML = symbol(icon) + (icon === "keyboard_arrow_up" || icon === "keyboard_arrow_down" ? "" : `<span>${label}</span>`);
      b3.setAttribute("aria-label", label);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => {
        run();
        this.env.after();
        sync();
      });
      return b3;
    };
    const showAll = btn2(tr7(lang, "Show All", "Mostrar Tudo"), "visibility", () => ed.setPaneItemHidden(null, false));
    const hideAll = btn2(tr7(lang, "Hide All", "Ocultar Tudo"), "visibility_off", () => ed.setPaneItemHidden(null, true));
    const up = btn2(tr7(lang, "Bring Forward", "Avan\xE7ar"), "keyboard_arrow_up", () => ed.arrangeImage("forward"));
    const down = btn2(tr7(lang, "Send Backward", "Recuar"), "keyboard_arrow_down", () => ed.arrangeImage("backward"));
    const bar = el11("div", { style: "display:flex;gap:4px;align-items:center;flex-wrap:wrap" }, showAll, hideAll, el11("span", { style: "flex:1" }), up, down);
    const list = el11("div", { style: "display:flex;flex-direction:column;gap:1px" });
    list.setAttribute("role", "listbox");
    const empty = el11("p", { textContent: tr7(lang, "There are no floating objects in this document.", "N\xE3o h\xE1 objetos flutuantes neste documento."), style: "margin:0;font-size:13px;opacity:.75" });
    const body = el11("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, bar, list, empty);
    let editing = false;
    const sync = () => {
      if (editing) return;
      const items = ed.selectionPaneItems();
      empty.hidden = items.length > 0;
      const off = ed.isProtected();
      showAll.disabled = hideAll.disabled = off || !items.length;
      const sel4 = items.find((i5) => i5.selected);
      up.disabled = down.disabled = off || !sel4;
      list.replaceChildren(...items.map((it) => {
        const row2 = el11("div", { className: "uo-sel-row", style: `display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:6px;cursor:default;${it.selected ? "background:var(--uo-secondary-container,#d3e3fd);" : ""}${it.hidden ? "opacity:.55;" : ""}` });
        row2.setAttribute("role", "option");
        row2.setAttribute("aria-selected", String(it.selected));
        row2.dataset["key"] = it.key;
        const name = el11("span", { textContent: it.name || "\u2014", style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px" });
        const eye = el11("button", { type: "button", className: "uo-btn", title: it.hidden ? tr7(lang, "Show", "Mostrar") : tr7(lang, "Hide", "Ocultar"), style: "min-width:0;padding:2px" });
        eye.innerHTML = symbol(it.hidden ? "visibility_off" : "visibility");
        eye.disabled = off;
        eye.addEventListener("mousedown", (e6) => e6.preventDefault());
        eye.addEventListener("click", (e6) => {
          e6.stopPropagation();
          ed.setPaneItemHidden(it.key, !it.hidden);
          this.env.after();
          sync();
        });
        row2.addEventListener("mousedown", (e6) => e6.preventDefault());
        row2.addEventListener("click", () => {
          ed.selectPaneItem(it.key);
          this.env.after();
          sync();
        });
        row2.addEventListener("dblclick", () => {
          if (off) return;
          editing = true;
          const input = el11("input", { type: "text", value: it.name, style: "flex:1;font-size:13px;min-width:0" });
          const done = (ok) => {
            if (!editing) return;
            editing = false;
            if (ok) ed.renamePaneItem(it.key, input.value);
            this.env.after();
            sync();
          };
          input.addEventListener("keydown", (e6) => {
            e6.stopPropagation();
            if (e6.key === "Enter") done(true);
            if (e6.key === "Escape") done(false);
          });
          input.addEventListener("blur", () => done(true));
          name.replaceWith(input);
          input.focus();
          input.select();
        });
        row2.append(name, eye);
        return row2;
      }));
    };
    openPane({
      id: "pic-sel",
      title: { en: "Selection", pt: "Sele\xE7\xE3o" },
      lang,
      layer: this.env.layer,
      frame: this.env.frame,
      width: 280,
      body,
      onClose: () => {
        this.sel = null;
        ed.classList.remove("uw-has-pane");
        this.env.after();
      }
    });
    ed.classList.add("uw-has-pane");
    this.sel = { sync };
    sync();
  }
  /** Painel Texto Alt: descrição + "Marcar como decorativa". */
  toggleAlt() {
    const { ed, lang } = this.env;
    const cur = paneOpen("pic-alt");
    if (cur) {
      cur.close();
      return;
    }
    const intro = el11("p", { textContent: tr7(lang, "How would you describe this object and its context to someone who is blind or has low vision?", "Como voc\xEA descreveria este objeto e seu contexto para algu\xE9m que \xE9 cego ou tem baixa vis\xE3o?"), style: "margin:0 0 8px;font-size:13px" });
    const text = el11("textarea", { rows: 6, style: "width:100%;box-sizing:border-box;resize:vertical" });
    text.dataset["a"] = "pic:alt:text";
    const deco = check7("decorative", tr7(lang, "Mark as decorative", "Marcar como decorativa"), false);
    const note = el11("p", { textContent: tr7(lang, "Decorative objects add visual interest but aren\u2019t informative (e.g., stylistic borders). People using screen readers won\u2019t hear these.", "Objetos decorativos acrescentam interesse visual, mas n\xE3o s\xE3o informativos (por exemplo, bordas estil\xEDsticas). Quem usa leitor de tela n\xE3o os ouvir\xE1."), style: "margin:4px 0 0;font-size:12px;opacity:.75" });
    const empty = el11("p", { textContent: tr7(lang, "Select a picture or shape to add alt text.", "Selecione uma imagem ou forma para adicionar o texto alt."), style: "margin:0;font-size:13px;opacity:.75" });
    const body = el11("div", { style: "display:flex;flex-direction:column;gap:8px;padding:4px" }, intro, text, deco.el, note, empty);
    let last = null;
    const sync = () => {
      const st = ed.selectedImage() ?? ed.selectedShape();
      empty.hidden = !!st;
      intro.hidden = text.hidden = deco.el.hidden = note.hidden = !st;
      const off = !st || ed.isProtected();
      deco.input.disabled = off;
      const key = st?.format ?? null;
      const focused = document.activeElement === text || ed.shadowRoot?.activeElement === text;
      if (key !== last && !focused) {
        last = key;
        text.value = st?.altText ?? "";
        deco.input.checked = !!st?.decorative;
      }
      text.disabled = off || deco.input.checked;
    };
    const setAlt = (o6) => {
      if (ed.selectedImage()) ed.setImageAltText(o6);
      else ed.setShapeAltText(o6);
    };
    text.addEventListener("change", () => {
      setAlt({ text: text.value });
    });
    deco.input.addEventListener("change", () => {
      setAlt({ decorative: deco.input.checked });
      sync();
    });
    openPane({
      id: "pic-alt",
      title: { en: "Alt Text", pt: "Texto Alt" },
      lang,
      layer: this.env.layer,
      frame: this.env.frame,
      width: 300,
      body,
      onClose: () => {
        this.alt = null;
        ed.classList.remove("uw-has-pane");
        this.env.after();
      }
    });
    ed.classList.add("uw-has-pane");
    this.alt = { sync };
    sync();
  }
};

// src/chrome-labels.ts
var LABELS2 = {
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
    noTof: "The document has no table of figures",
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
    aboutText: "Universal Write \u2014 a .docx editor web component with high-fidelity canvas rendering.",
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
    rows: (r5, c4) => `${c4} \xD7 ${r5} table`,
    authorTitle: "Your name",
    authorText: "Name shown on your changes and comments",
    authorOk: "OK",
    trackOn: "Track Changes on",
    trackOff: "Track Changes off",
    revPane: "Revisions",
    revCount: (n5) => `${n5} revision${n5 === 1 ? "" : "s"}`,
    revNone: "No revisions",
    revInserted: "Inserted",
    revDeleted: "Deleted",
    revFormatted: "Formatted",
    revMovedFrom: "Moved (from)",
    revMovedTo: "Moved (to)",
    revParaInserted: "Inserted paragraph",
    revParaDeleted: "Deleted paragraph",
    revInsertions: "Insertions",
    revDeletions: "Deletions",
    revMoves: "Moves",
    revFormatting: "Formatting",
    revComments: "Comments",
    revAccept: "Accept",
    revReject: "Reject",
    acceptAt: (k2) => `Accept ${k2}`,
    rejectAt: (k2) => `Reject ${k2}`,
    kInsertion: "Insertion",
    kDeletion: "Deletion",
    kFormat: "Formatting Change",
    kMove: "Move",
    revAccepted: (n5) => `${n5} change${n5 === 1 ? "" : "s"} accepted`,
    revRejected: (n5) => `${n5} change${n5 === 1 ? "" : "s"} rejected`,
    noMoreRevisions: "The document contains no revisions"
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
    noTof: "O documento n\xE3o tem \xEDndice de ilustra\xE7\xF5es",
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
    aboutText: "Universal Write \u2014 web component de edi\xE7\xE3o de .docx com renderiza\xE7\xE3o em canvas de alta fidelidade.",
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
    rows: (r5, c4) => `Tabela ${c4} \xD7 ${r5}`,
    authorTitle: "Seu nome",
    authorText: "Nome que aparece nas suas altera\xE7\xF5es e coment\xE1rios",
    authorOk: "OK",
    trackOn: "Controle de Altera\xE7\xF5es ativado",
    trackOff: "Controle de Altera\xE7\xF5es desativado",
    revPane: "Revis\xF5es",
    revCount: (n5) => `${n5} ${n5 === 1 ? "revis\xE3o" : "revis\xF5es"}`,
    revNone: "Nenhuma revis\xE3o",
    revInserted: "Inserido",
    revDeleted: "Exclu\xEDdo",
    revFormatted: "Formatado",
    revMovedFrom: "Movido (de)",
    revMovedTo: "Movido (para)",
    revParaInserted: "Par\xE1grafo inserido",
    revParaDeleted: "Par\xE1grafo exclu\xEDdo",
    revInsertions: "Inser\xE7\xF5es",
    revDeletions: "Exclus\xF5es",
    revMoves: "Movimenta\xE7\xF5es",
    revFormatting: "Formata\xE7\xE3o",
    revComments: "Coment\xE1rios",
    revAccept: "Aceitar",
    revReject: "Rejeitar",
    acceptAt: (k2) => `Aceitar ${k2}`,
    rejectAt: (k2) => `Rejeitar ${k2}`,
    kInsertion: "Inser\xE7\xE3o",
    kDeletion: "Exclus\xE3o",
    kFormat: "Altera\xE7\xE3o de Formata\xE7\xE3o",
    kMove: "Movimenta\xE7\xE3o",
    revAccepted: (n5) => `${n5} ${n5 === 1 ? "altera\xE7\xE3o aceita" : "altera\xE7\xF5es aceitas"}`,
    revRejected: (n5) => `${n5} ${n5 === 1 ? "altera\xE7\xE3o rejeitada" : "altera\xE7\xF5es rejeitadas"}`,
    noMoreRevisions: "O documento n\xE3o cont\xE9m revis\xF5es"
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
        for (const el13 of wrap.querySelectorAll("input,button")) el13.disabled = !ok;
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
var colorMenu2 = (env, ctx) => {
  const L11 = env.app.ui.L;
  const pick = (hex) => {
    env.app.lastColor = hex;
    env.ed.setColor(hex);
    ctx.after();
  };
  return [
    { id: "color:auto", label: L11.automatic, swatch: "#000000", onClick: () => {
      env.ed.setColor(void 0);
      ctx.after();
    } },
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })), selected: env.ctl.state().run.color, onPick: pick, close }) },
    moreColors(ctx, L11.moreColors, pick)
  ];
};
var highlightMenu = (env, ctx) => {
  const L11 = env.app.ui.L;
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
    { id: "highlight:none", label: L11.noColor, swatch: "", onClick: () => {
      env.ed.setHighlight(void 0);
      ctx.after();
    } }
  ];
};
var shadingMenu = (env, ctx) => {
  const L11 = env.app.ui.L;
  const pick = (hex) => {
    env.app.lastShading = hex;
    env.ed.setShading(hex);
    ctx.after();
  };
  return [
    { content: (close) => colorGrid({ colors: OFFICE_COLORS.map((h3) => ({ value: h3, css: `#${h3}` })), selected: env.ctl.state().para.shadingHex, onPick: pick, close }) },
    { id: "shading:none", label: L11.noColor, swatch: "", onClick: () => {
      env.ed.setShading(void 0);
      ctx.after();
    } },
    moreColors(ctx, L11.moreColors, pick)
  ];
};
var lineSpacingMenu = (env, ctx) => {
  const p3 = env.ctl.state().para;
  const dec = ctx.registry.text({ en: ".", pt: "," });
  const line2 = p3.lineTwentieths;
  const sb = p3.spaceBeforeTwips, sa = p3.spaceAfterTwips;
  const ok = canEdit(env);
  return [
    ...[[240, "1.0"], [259, "1.08"], [276, "1.15"], [360, "1.5"], [480, "2.0"]].map(([v2, txt]) => ({
      id: `spacing:${v2}`,
      label: txt.replace(".", dec),
      checked: line2 === v2,
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
  const preset = (id, en, pt, before, after, line2) => ({
    id: `pspacing:${id}`,
    label: { en, pt },
    disabled: !ok,
    onClick: () => {
      env.ed.setSpaceBefore(before);
      env.ed.setSpaceAfter(after);
      env.ed.setLineSpacing(line2);
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
var fieldsMenu = () => ["field:page", "field:numpages", "field:date", "-", "fields:update"];
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
    [10, "10 min", "10 min"],
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
    // Sumário: a galeria, Adicionar Texto (com Marcar Entrada) e Atualizar
    toc: sub({ en: "Table of contents", pt: "Sum\xE1rio" }, "toc", () => [
      ...tocGalleryMenu(env, ctx),
      "-",
      sub({ en: "Add text", pt: "Adicionar texto" }, "playlist_add", () => addTextMenu(env), "toc:addText"),
      "toc"
    ], "toc:sub"),
    symbols: sub({ en: "Special characters", pt: "Caracteres especiais" }, "special_character", () => symbolMenu(env, ctx), "symbols"),
    breaks: sub({ en: "Break", pt: "Quebra" }, "insert_page_break", breaksMenu, "breaks"),
    columns: sub({ en: "Columns", pt: "Colunas" }, "view_column_2", columnsMenu, "columns"),
    cover: { ...sub({ en: "Cover page", pt: "Folha de rosto" }, "auto_stories", () => coverPageMenu(env, ctx), "cover:menu"), hidden: typeof env.ed.insertCoverPage !== "function" },
    // Plano de Fundo da Página (guia Design da ribbon)
    background: { ...sub({ en: "Page background", pt: "Plano de fundo da p\xE1gina" }, "format_color_fill", () => [
      sub({ en: "Watermark", pt: "Marca-d'\xE1gua" }, "branding_watermark", () => watermarkMenu(env, ctx), "watermark:menu"),
      sub({ en: "Page color", pt: "Cor da p\xE1gina" }, "format_color_fill", () => pageColorMenu(env, ctx), "pageColor:menu"),
      "dlg:pageBorders"
    ], "background"), hidden: typeof env.ed.setPageColor !== "function" },
    // Cabeçalho, Rodapé e Número de Página com as galerias de modelos; opções e vínculo no diálogo
    hf: sub({ en: "Headers & footers", pt: "Cabe\xE7alhos e rodap\xE9s" }, "call_to_action", () => [
      sub({ en: "Header", pt: "Cabe\xE7alho" }, "vertical_align_top", () => hfGalleryMenu(env, ctx, "header"), "hf:headerMenu"),
      sub({ en: "Footer", pt: "Rodap\xE9" }, "vertical_align_bottom", () => hfGalleryMenu(env, ctx, "footer"), "hf:footerMenu"),
      sub({ en: "Page number", pt: "N\xFAmero de p\xE1gina" }, "numbers", () => pageNumberMenu(env, ctx), "hf:pgnumMenu"),
      "-",
      "dlg:dateTime",
      sub({ en: "Document info", pt: "Informa\xE7\xF5es do documento" }, "info", docInfoMenu, "hf:docinfo"),
      "dlg:alignTab",
      "-",
      "dlg:hfOptions",
      "hf:link",
      "hf:prev",
      "hf:next",
      "hf:showText",
      "-",
      "hf:close"
    ], "hf"),
    text: sub({ en: "Text", pt: "Texto" }, "format_bold", () => ["bold", "italic", "underline", "strike", "sup", "sub", "-", "grow", "shrink", "-", "allCaps", "smallCaps", "case:upper", "case:lower"], "text"),
    color: sub({ en: "Font color", pt: "Cor da fonte" }, "format_color_text", () => colorMenu2(env, ctx), "color"),
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
    styleTools: sub({ en: "Styles", pt: "Estilos" }, "view_sidebar", () => ["styles:pane", "style:inspector", "-", "style:new", "style:modifyCurrent", "style:updateCurrent", "-", "style:normal", "style:h1", "style:h2", "style:h3"], "styleTools"),
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
      sub({ en: "Margins", pt: "Margens" }, "margin", () => marginsMenu(env, ctx), "margins"),
      "-",
      "dlg:pageBorders"
    ], "page"),
    trackChanges: sub({ en: "Track Changes", pt: "Controlar Altera\xE7\xF5es" }, "track_changes", () => [
      "trackChanges",
      "-",
      sub({ en: "Display for Review", pt: "Exibir para Revis\xE3o" }, "visibility", markupModes, "markupMode"),
      sub({ en: "Show Markup", pt: "Mostrar Marca\xE7\xE3o" }, "notes", () => showMarkup(env, ctx), "showMarkup"),
      "reviewPane",
      "-",
      "change:prev",
      "change:next",
      "-",
      sub({ en: "Accept", pt: "Aceitar" }, "check_circle", acceptItems, "acceptMenu"),
      sub({ en: "Reject", pt: "Rejeitar" }, "cancel", rejectItems, "rejectMenu")
    ], "tracking"),
    comments: sub({ en: "Comments", pt: "Coment\xE1rios" }, "comment", () => ["comment", "comment:prev", "comment:next", "comment:delete", "comment:deleteAll", "-", "comments"], "commentsMenu"),
    table: { ...sub({ en: "Table", pt: "Tabela" }, "table", () => tableMenu(env, ctx), "tableMenu"), hidden: typeof env.ed.insertTable !== "function" },
    notes: sub({ en: "Notes", pt: "Notas" }, "notes", () => [...noteNavMenu(), "-", "note:show", "note:convert", "dlg:notes"], "notesMenu")
  };
}
var breaksMenu = () => ["pagebreak", "columnbreak", "-", "sectionbreak", "sectionbreak:continuous", "sectionbreak:evenPage", "sectionbreak:oddPage"];
var noteNavMenu = () => ["note:next", "note:prev", "note:nextEnd", "note:prevEnd"];
var columnsMenu = () => ["columns:one", "columns:two", "columns:three", "columns:left", "columns:right", "-", "dlg:columns"];
var markupModes = () => ["markup:simple", "markup:all", "markup:none", "markup:original"];
var acceptItems = () => ["change:acceptNext", "change:acceptOne", "change:acceptShown", "change:acceptAll", "change:acceptAllStop"];
var rejectItems = () => ["change:rejectNext", "change:rejectOne", "change:rejectShown", "change:rejectAll", "change:rejectAllStop"];
var MODE_LABELS = {
  simple: { en: "Simple Markup", pt: "Marca\xE7\xE3o Simples" },
  all: { en: "All Markup", pt: "Todas as Marca\xE7\xF5es" },
  none: { en: "No Markup", pt: "Sem Marca\xE7\xE3o" },
  original: { en: "Original", pt: "Original" }
};
function showMarkup(env, ctx) {
  const ed = env.ed;
  const people = () => {
    const all = ed.revisionAuthors();
    const sel4 = ed.getMarkupOptions().authors;
    return ["people:all", "-", ...all.map((a3) => ({
      id: `people:${a3}`,
      label: a3,
      swatch: `#${ed.authorColor(a3)}`,
      checked: !sel4 || sel4.includes(a3),
      onClick: () => {
        const cur = ed.getMarkupOptions().authors ?? all;
        const next = cur.includes(a3) ? cur.filter((x2) => x2 !== a3) : [...cur, a3];
        ed.setMarkupOptions({ authors: all.every((x2) => next.includes(x2)) ? null : next });
        ctx.after();
      }
    }))];
  };
  return [
    "comments",
    "show:insdel",
    "show:formatting",
    "-",
    { id: "balloons", label: { en: "Balloons", pt: "Bal\xF5es" }, submenu: () => ["balloons:revisions", "balloons:inline", "balloons:mixed"] },
    { id: "people", label: { en: "Specific People", pt: "Pessoas Espec\xEDficas" }, submenu: people }
  ];
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
      { id: "view", label: { en: "View", pt: "Ver" }, items: () => ["view:print", "view:web", "view:read", "view:outline", "view:draft", "focus", "-", "view:ruler", "view:gridlines", "view:navpane", "view:bookmarks", "-", "marks", "comments", "-", m2.zoom, "-", m2.theme, m2.accent, m2.toolbar] },
      { id: "insert", label: { en: "Insert", pt: "Inserir" }, items: () => ["image", m2.table, "link", "comment", "-", m2.cover, "blankPage", m2.breaks, m2.hf, m2.fields, m2.toc, "-", "footnote", "endnote", m2.notes, "bookmark", "crossref", "caption", "tof", "tof:update", { id: "textbox:sub", label: { en: "Text box", pt: "Caixa de texto" }, icon: "text_fields", submenu: () => textboxMenu(env, ctx) }, m2.symbols] },
      { id: "format", label: { en: "Format", pt: "Formatar" }, items: () => [m2.text, m2.color, m2.highlight, m2.styles, m2.styleTools, "-", m2.align, m2.spacing, m2.lists, m2.shading, "borders", "dlg:borders", m2.charSpacing, "-", tableFormatMenu(), pictureMenu(env, ctx), shapeMenu(env, ctx), "-", m2.page, m2.background, m2.columns, "-", "dlg:font", "dlg:paragraph", "dlg:tabs", "-", "clear", "style:clearChar", "style:clearPara"] },
      { id: "tools", label: { en: "Tools", pt: "Ferramentas" }, items: () => ["spelling", "spellAsYouType", "wordCount", "sort", "-", m2.trackChanges, m2.comments, "-", "compare", "mailmerge", "-", "fontAccess", "hyphenation", "-", "enableEditing"] },
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
        { split: "color", menu: () => colorMenu2(env, ctx) },
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
      pictureCompactGroup(env, ctx),
      shapeCompactGroup(env, ctx),
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
var L10 = (en, pt) => ({ en, pt });
var large3 = (cmd) => ({ cmd, size: "large" });
function ribbonLayout(env, ctx) {
  const m2 = menus(env, ctx);
  const has = (meth) => () => typeof env.ed[meth] === "function";
  return {
    qat: ["save", "undo", "redo"],
    title: titleWidget(env),
    tabs: [
      { id: "file", label: L10("File", "Arquivo"), groups: [], menu: () => fileMenu(m2) },
      {
        id: "home",
        label: L10("Home", "P\xE1gina Inicial"),
        groups: [
          { id: "clipboard", label: L10("Clipboard", "\xC1rea de Transfer\xEAncia"), icon: "content_paste", prio: 3, cells: [
            { split: "paste", size: "large", menu: ["paste", "pastePlain"] },
            { rows: [["cut"], ["copy"], ["painter"]] }
          ] },
          { id: "font", label: L10("Font", "Fonte"), icon: "text_format", prio: 8, launcher: "dlg:font", cells: [
            { rows: [
              [fontWidget(env, 140), sizeWidget(env, "dropdown"), "grow", "shrink", { menu: caseMenu, id: "case", label: L10("Change case", "Mai\xFAsculas e min\xFAsculas"), icon: "match_case" }, "clear"],
              ["bold", "italic", "underline", "strike", "sub", "sup", { split: "color", menu: () => colorMenu2(env, ctx) }, { split: "highlight", menu: () => highlightMenu(env, ctx) }]
            ] }
          ] },
          { id: "paragraph", label: L10("Paragraph", "Par\xE1grafo"), icon: "format_align_left", prio: 7, launcher: "dlg:paragraph", cells: [
            { rows: [
              ["list:bullet", "list:decimal", "outdent", "indent", "sort", "marks"],
              [
                "align:left",
                "align:center",
                "align:right",
                "align:both",
                { menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: L10("Line & paragraph spacing", "Espa\xE7amento entre linhas e par\xE1grafos"), icon: "format_line_spacing" },
                { split: "shading", menu: () => shadingMenu(env, ctx) },
                "borders"
              ]
            ] }
          ] },
          // galeria com miniaturas (widget de galeria do framework; elástica) + ↘ Painel de Estilos
          { id: "styles", label: L10("Styles", "Estilos"), icon: "style", prio: 5, launcher: "styles:pane", cells: env.styles ? [env.styles.galleryItem()] : [{ rows: [[styleWidget(env, 150)]] }] },
          { id: "editing", label: L10("Editing", "Edi\xE7\xE3o"), icon: "search", prio: 4, cells: [
            { rows: [[{ cmd: "find", label: true }], [{ cmd: "replace", label: true }], [{ cmd: "selectAll", label: true }]] }
          ] }
        ]
      },
      {
        id: "insert",
        label: L10("Insert", "Inserir"),
        groups: [
          { id: "pages", label: L10("Pages", "P\xE1ginas"), icon: "insert_page_break", prio: 4, cells: [
            { menu: () => coverPageMenu(env, ctx), id: "cover:menu", label: L10("Cover Page", "Folha de Rosto"), icon: "auto_stories", size: "large", supports: has("insertCoverPage") },
            large3("blankPage"),
            large3("pagebreak"),
            { menu: breaksMenu, id: "breaks", label: L10("Breaks", "Quebras"), icon: "insert_page_break", size: "large", supports: has("insertSectionBreak") }
          ] },
          { id: "objects", label: L10("Illustrations", "Ilustra\xE7\xF5es"), icon: "image", prio: 6, cells: [
            { menu: () => tableMenu(env, ctx), id: "table:menu", label: L10("Table", "Tabela"), icon: "table", size: "large", supports: has("insertTable") },
            large3("image")
          ] },
          // Links (Link, Indicador, Referência Cruzada) e Comentários, como no Word
          { id: "links", label: L10("Links", "Links"), icon: "link", prio: 5, cells: [large3("link"), large3("bookmark"), large3("crossref")] },
          { id: "comments", label: L10("Comments", "Coment\xE1rios"), icon: "add_comment", prio: 4, cells: [large3("comment")] },
          { id: "hf", label: L10("Header & Footer", "Cabe\xE7alho e Rodap\xE9"), icon: "call_to_action", prio: 4, cells: [
            { menu: () => hfGalleryMenu(env, ctx, "header"), id: "hf:headerMenu", label: L10("Header", "Cabe\xE7alho"), icon: "vertical_align_top", size: "large" },
            { menu: () => hfGalleryMenu(env, ctx, "footer"), id: "hf:footerMenu", label: L10("Footer", "Rodap\xE9"), icon: "vertical_align_bottom", size: "large" },
            { menu: () => pageNumberMenu(env, ctx), id: "hf:pgnumMenu", label: L10("Page Number", "N\xFAmero de P\xE1gina"), icon: "numbers", size: "large" }
          ] },
          { id: "text", label: L10("Text", "Texto"), icon: "text_fields", prio: 3, cells: [
            { menu: () => textboxMenu(env, ctx), id: "textbox:menu", label: L10("Text Box", "Caixa de Texto"), icon: "text_fields", size: "large", supports: has("insertTextbox") },
            { rows: [[{ cmd: "dlg:dateTime", label: true }], [{ menu: () => symbolMenu(env, ctx), id: "symbols", label: L10("Symbol", "S\xEDmbolo"), icon: "special_character", showLabel: true }]] }
          ] }
        ]
      },
      {
        // guia Design (como no Word): por ora só o Plano de Fundo da Página; Formatação do
        // Documento (temas, conjuntos de estilos) entra quando chegar
        id: "design",
        label: L10("Design", "Design"),
        groups: [
          { id: "background", label: L10("Page Background", "Plano de Fundo da P\xE1gina"), icon: "format_color_fill", prio: 4, cells: [
            { menu: () => watermarkMenu(env, ctx), id: "watermark:menu", label: L10("Watermark", "Marca-d'\xC1gua"), icon: "branding_watermark", size: "large", supports: has("setWatermark") },
            { menu: () => pageColorMenu(env, ctx), id: "pageColor:menu", label: L10("Page Color", "Cor da P\xE1gina"), icon: "format_color_fill", size: "large", supports: has("setPageColor") },
            { cmd: "dlg:pageBorders", size: "large" }
          ] }
        ]
      },
      {
        id: "layout",
        label: L10("Layout", "Layout"),
        groups: [
          { id: "pagesetup", label: L10("Page Setup", "Configurar P\xE1gina"), icon: "description", prio: 6, launcher: "dlg:page", cells: [
            { menu: () => marginsMenu(env, ctx), id: "margins", label: L10("Margins", "Margens"), icon: "margin", size: "large" },
            { menu: () => orientationMenu(env, ctx), id: "orientation", label: L10("Orientation", "Orienta\xE7\xE3o"), icon: "crop_rotate", size: "large" },
            { menu: () => sizeMenu(env, ctx), id: "pageSize", label: L10("Size", "Tamanho"), icon: "aspect_ratio", size: "large" },
            { menu: columnsMenu, id: "columns", label: L10("Columns", "Colunas"), icon: "view_column_2", size: "large", supports: has("setColumns") },
            { rows: [[{ menu: breaksMenu, id: "breaks", label: L10("Breaks", "Quebras"), icon: "insert_page_break", showLabel: true }], ["hyphenation"]] }
          ] },
          { id: "paragraph", label: L10("Paragraph", "Par\xE1grafo"), icon: "format_indent_increase", prio: 5, launcher: "dlg:paragraph", cells: [
            { menu: () => paragraphSpacingMenu(env, ctx), id: "pspacing", label: L10("Paragraph Spacing", "Espa\xE7amento entre Par\xE1grafos"), icon: "format_line_spacing", size: "large" },
            { rows: [
              [{ cmd: "outdent", label: true }, { cmd: "indent", label: true }],
              [{ menu: () => specialIndentMenu(env, ctx), id: "specialIndent", label: L10("Special indent", "Recuo especial"), icon: "format_indent_increase", showLabel: true }],
              [{ menu: () => lineSpacingMenu(env, ctx), id: "spacing", label: L10("Spacing", "Espa\xE7amento"), icon: "format_line_spacing", showLabel: true }]
            ] }
          ] }
        ]
      },
      {
        // guia Referências (como no Word): Sumário e Notas de Rodapé; Links, Citações e
        // Índice entram aqui quando chegarem
        id: "references",
        label: L10("References", "Refer\xEAncias"),
        groups: [
          // Sumário (como no Word): a galeria com Personalizado/Remover, Adicionar Texto e Atualizar
          { id: "toc", label: L10("Table of Contents", "Sum\xE1rio"), icon: "toc", prio: 4, cells: [
            { menu: () => tocGalleryMenu(env, ctx), id: "toc:menu", label: L10("Table of Contents", "Sum\xE1rio"), icon: "toc", size: "large", supports: has("insertTocTemplate") },
            { rows: [
              [{ menu: () => addTextMenu(env), id: "toc:addText", label: L10("Add Text", "Adicionar Texto"), icon: "playlist_add", showLabel: true, supports: has("setTocLevel") }],
              [{ cmd: "toc", label: true }]
            ] }
          ] },
          { id: "footnotes", label: L10("Footnotes", "Notas de Rodap\xE9"), icon: "notes", prio: 6, launcher: "dlg:notes", cells: [
            large3("footnote"),
            { rows: [
              [{ cmd: "endnote", label: true }],
              [{ menu: noteNavMenu, id: "note:nav", label: L10("Next Footnote", "Pr\xF3xima Nota de Rodap\xE9"), icon: "keyboard_arrow_down", showLabel: true, supports: has("nextNote") }],
              [{ cmd: "note:show", label: true }]
            ] }
          ] },
          { id: "captions", label: L10("Captions", "Legendas"), icon: "subtitles", prio: 5, cells: [
            large3("caption"),
            { rows: [[{ cmd: "tof", label: true }], [{ cmd: "tof:update", label: true }], [{ cmd: "crossref", label: true }]] }
          ] }
        ]
      },
      {
        id: "mailings",
        label: L10("Mailings", "Correspond\xEAncias"),
        groups: [
          { id: "merge", label: L10("Mail Merge", "Mala Direta"), icon: "mail", prio: 5, cells: [large3("mailmerge"), large3("mergefield")] }
        ]
      },
      {
        id: "review",
        label: L10("Review", "Revis\xE3o"),
        groups: [
          { id: "proofing", label: L10("Proofing", "Revis\xE3o de Texto"), icon: "spellcheck", prio: 5, cells: [large3("spelling"), { rows: [[{ cmd: "spellAsYouType", label: true }], [{ cmd: "wordCount", label: true }]] }] },
          { id: "comments", label: L10("Comments", "Coment\xE1rios"), icon: "comment", prio: 6, cells: [
            large3("comment"),
            { rows: [[{ cmd: "comment:delete", label: true }], [{ cmd: "comment:prev", label: true }], [{ cmd: "comment:next", label: true }]] },
            { cmd: "comments", size: "large" }
          ] },
          { id: "tracking", label: L10("Tracking", "Controle"), icon: "track_changes", prio: 4, cells: [
            large3("trackChanges"),
            { rows: [
              [{ menu: markupModes, id: "markupMode", label: L10("Display for Review", "Exibir para Revis\xE3o"), icon: "visibility", text: () => MODE_LABELS[env.ed.getMarkupMode()][ctx.lang], supports: () => typeof env.ed.setMarkupMode === "function" }],
              [{ menu: () => showMarkup(env, ctx), id: "showMarkup", label: L10("Show Markup", "Mostrar Marca\xE7\xE3o"), icon: "notes", showLabel: true, supports: () => typeof env.ed.setMarkupOptions === "function" }],
              [{ cmd: "reviewPane", label: true }, { menu: () => ["reviewPane:vertical", "reviewPane:horizontal"], id: "reviewPaneDir", label: { en: "Reviewing Pane", pt: "Painel de Revis\xE3o" }, icon: "arrow_drop_down", supports: () => typeof env.ed.getRevisions === "function" }]
            ] }
          ] },
          { id: "changes", label: L10("Changes", "Altera\xE7\xF5es"), icon: "check_circle", prio: 4, cells: [
            { split: "change:accept", menu: acceptItems, size: "large" },
            { split: "change:reject", menu: rejectItems, size: "large" },
            { rows: [[{ cmd: "change:prev", label: true }], [{ cmd: "change:next", label: true }]] }
          ] },
          { id: "document", label: L10("Compare & Protect", "Comparar e Proteger"), icon: "compare", prio: 3, cells: [large3("compare"), large3("enableEditing")] }
        ]
      },
      {
        id: "view",
        label: L10("View", "Exibir"),
        groups: [
          { id: "views", label: L10("Views", "Modos de Exibi\xE7\xE3o"), icon: "article", prio: 6, cells: [
            large3("view:read"),
            large3("view:print"),
            large3("view:web"),
            { rows: [[{ cmd: "view:outline", label: true }], [{ cmd: "view:draft", label: true }]] },
            large3("focus")
          ] },
          { id: "show", label: L10("Show", "Mostrar"), icon: "visibility", prio: 4, cells: [
            { rows: [[{ cmd: "view:ruler", label: true }], [{ cmd: "view:gridlines", label: true }], [{ cmd: "view:navpane", label: true }]] },
            { rows: [[{ cmd: "marks", label: true }], [{ cmd: "comments", label: true }], [{ cmd: "statusbar", label: true }]] },
            { rows: [[{ cmd: "view:bookmarks", label: true }]] }
          ] },
          { id: "zoom", label: L10("Zoom", "Zoom"), icon: "zoom_in", prio: 5, cells: [
            { menu: m2.zoomItems, id: "zoom", label: L10("Zoom", "Zoom"), icon: "zoom_in", size: "large" },
            large3("zoom100"),
            { rows: [["zoomin"], ["zoomout"]] }
          ] },
          { id: "appearance", label: L10("Appearance", "Apar\xEAncia"), icon: "palette", prio: 2, cells: [
            { menu: () => themeMenu(env, ctx), id: "theme", label: L10("Theme", "Tema"), icon: "contrast", size: "large" },
            { menu: () => accentMenu(env, ctx), id: "accent", label: L10("Accent", "Destaque"), icon: "palette", size: "large" },
            { menu: () => ["toolbar:compact", "toolbar:ribbon"], id: "toolbarMode", label: L10("Toolbar", "Barra"), icon: "toolbar", size: "large" }
          ] }
        ]
      },
      {
        id: "hf-tools",
        label: L10("Header & Footer", "Cabe\xE7alho e Rodap\xE9"),
        contextual: () => env.ed.editingHeaderFooter() !== null,
        groups: hfToolsGroups(env, ctx)
      },
      {
        id: "table-design",
        label: L10("Table Design", "Design da Tabela"),
        contextual: () => env.ed.editingTableCell(),
        groups: tableDesignGroups(env, ctx)
      },
      {
        id: "table-layout",
        label: L10("Table Layout", "Layout da Tabela"),
        contextual: () => env.ed.editingTableCell(),
        groups: tableLayoutGroups(env)
      },
      {
        id: "image-tools",
        label: L10("Picture Format", "Formato da Imagem"),
        contextual: () => {
          const f3 = env.ed.selectedImage;
          return typeof f3 === "function" && !!f3.call(env.ed);
        },
        groups: pictureFormatGroups(env, ctx)
      },
      {
        id: "shape-tools",
        label: L10("Shape Format", "Formato da Forma"),
        contextual: () => {
          const f3 = env.ed.selectedShape;
          return typeof f3 === "function" && !!f3.call(env.ed);
        },
        groups: shapeFormatGroups(env, ctx)
      }
    ]
  };
}

// src/chrome-styles.ts
var T4 = {
  en: {
    gallery: "Styles",
    pane: "Styles",
    inspector: "Style Inspector",
    createStyle: "Create a Style",
    newStyle: "New Style",
    newStyleTitle: "Create New Style from Formatting",
    modifyTitle: "Modify Style",
    name: "Name",
    type: "Style type",
    basedOn: "Style based on",
    next: "Style for following paragraph",
    properties: "Properties",
    formatting: "Formatting",
    linked: "Linked (paragraph and character)",
    paragraph: "Paragraph",
    character: "Character",
    addToGallery: "Add to the Styles gallery",
    autoUpdate: "Automatically update",
    modify: "Modify\u2026",
    format: "Format",
    fontDots: "Font\u2026",
    paraDots: "Paragraph\u2026",
    ok: "OK",
    cancel: "Cancel",
    update: (n5) => `Update ${n5} to Match Selection`,
    modifyDots: "Modify\u2026",
    rename: "Rename\u2026",
    renameTitle: "Rename Style",
    removeFromGallery: "Remove from Style Gallery",
    addGallery: "Add to Style Gallery",
    del: (n5) => `Delete "${n5}"\u2026`,
    delConfirm: (n5) => `Delete all instances of the style "${n5}" from the document? Its text will be formatted as Normal.`,
    delete: "Delete",
    clearAll: "Clear All",
    show: "Show",
    recommended: "Recommended",
    inUse: "In use",
    inDoc: "In current document",
    all: "All styles",
    sort: "Sort",
    asRecommended: "As Recommended",
    alphabetical: "Alphabetical",
    preview: "Show Preview",
    paraFmt: "Paragraph formatting",
    textFmt: "Text level formatting",
    plus: "Plus:",
    noDirect: "<none>",
    resetPara: "Reset to Normal Paragraph Style",
    clearParaFmt: "Clear Paragraph Formatting",
    clearCharStyle: "Clear Character Style",
    clearCharFmt: "Clear Character Formatting",
    nameTaken: "There is already a style with this name",
    empty: "Type a name for the style",
    kind: { paragraph: "Paragraph style", character: "Character style", linked: "Linked style" },
    sample: "Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text Sample Text",
    prevPara: "Previous Paragraph Previous Paragraph Previous Paragraph Previous Paragraph",
    font: "Font",
    size: "Size",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    caps: "All caps",
    smallCaps: "Small caps",
    color: "Font color",
    auto: "Automatic",
    charSpacing: "Character spacing",
    left: "Left",
    center: "Centered",
    right: "Right",
    justify: "Justified",
    lineSpacing: "Line spacing",
    before: "Space before (pt)",
    after: "Space after (pt)",
    indentLeft: "Left indent (cm)",
    indentRight: "Right indent (cm)",
    special: "Special indent",
    firstLine: "First line",
    hanging: "Hanging",
    none: "(none)",
    by: "By (cm)",
    lines: { 240: "Single", 259: "1.08", 276: "1.15", 360: "1.5 lines", 480: "Double" },
    d: {
      font: (v2) => `Font: ${v2}`,
      pt: (v2) => `${v2} pt`,
      bold: "Bold",
      italic: "Italic",
      underline: "Underline",
      strike: "Strikethrough",
      caps: "All caps",
      smallCaps: "Small caps",
      color: (v2) => `Font color: ${v2}`,
      align: (v2) => v2,
      before: (v2) => `Space Before: ${v2} pt`,
      after: (v2) => `After: ${v2} pt`,
      line: (v2) => `Line spacing: ${v2}`,
      indent: (v2) => `Indent: Left ${v2}`,
      gallery: "Show in the Styles gallery",
      basedOn: (v2) => `Based on: ${v2}`,
      next: (v2) => `Following Style: ${v2}`,
      priority: (v2) => `Priority: ${v2}`,
      style: (v2) => `Style: ${v2}`,
      highlight: "Highlight",
      sup: "Superscript",
      sub: "Subscript",
      numbering: "Numbered or bulleted",
      borders: "Borders",
      shading: "Shading",
      tabs: "Tab stops",
      pageBreak: "Page break before",
      spacing: (v2) => `Spacing: ${v2}`
    }
  },
  pt: {
    gallery: "Estilos",
    pane: "Estilos",
    inspector: "Inspetor de Estilo",
    createStyle: "Criar um Estilo",
    newStyle: "Novo Estilo",
    newStyleTitle: "Criar Novo Estilo a Partir da Formata\xE7\xE3o",
    modifyTitle: "Modificar Estilo",
    name: "Nome",
    type: "Tipo de estilo",
    basedOn: "Estilo baseado em",
    next: "Estilo do par\xE1grafo seguinte",
    properties: "Propriedades",
    formatting: "Formata\xE7\xE3o",
    linked: "Vinculado (par\xE1grafo e caractere)",
    paragraph: "Par\xE1grafo",
    character: "Caractere",
    addToGallery: "Adicionar \xE0 galeria de Estilos",
    autoUpdate: "Atualizar automaticamente",
    modify: "Modificar\u2026",
    format: "Formatar",
    fontDots: "Fonte\u2026",
    paraDots: "Par\xE1grafo\u2026",
    ok: "OK",
    cancel: "Cancelar",
    update: (n5) => `Atualizar ${n5} para Corresponder \xE0 Sele\xE7\xE3o`,
    modifyDots: "Modificar\u2026",
    rename: "Renomear\u2026",
    renameTitle: "Renomear Estilo",
    removeFromGallery: "Remover da Galeria de Estilos",
    addGallery: "Adicionar \xE0 Galeria de Estilos",
    del: (n5) => `Excluir "${n5}"\u2026`,
    delConfirm: (n5) => `Excluir todas as ocorr\xEAncias do estilo "${n5}" do documento? O texto ficar\xE1 com o estilo Normal.`,
    delete: "Excluir",
    clearAll: "Limpar Tudo",
    show: "Mostrar",
    recommended: "Recomendados",
    inUse: "Em uso",
    inDoc: "No documento atual",
    all: "Todos os estilos",
    sort: "Ordenar",
    asRecommended: "Como recomendado",
    alphabetical: "Alfab\xE9tica",
    preview: "Mostrar Visualiza\xE7\xE3o",
    paraFmt: "Formata\xE7\xE3o de par\xE1grafo",
    textFmt: "Formata\xE7\xE3o de n\xEDvel de texto",
    plus: "Mais:",
    noDirect: "<nenhuma>",
    resetPara: "Redefinir para o Estilo de Par\xE1grafo Normal",
    clearParaFmt: "Limpar Formata\xE7\xE3o de Par\xE1grafo",
    clearCharStyle: "Limpar Estilo de Caractere",
    clearCharFmt: "Limpar Formata\xE7\xE3o de Caractere",
    nameTaken: "J\xE1 existe um estilo com esse nome",
    empty: "Digite um nome para o estilo",
    kind: { paragraph: "Estilo de par\xE1grafo", character: "Estilo de caractere", linked: "Estilo vinculado" },
    sample: "Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo Texto de Exemplo",
    prevPara: "Par\xE1grafo Anterior Par\xE1grafo Anterior Par\xE1grafo Anterior Par\xE1grafo Anterior",
    font: "Fonte",
    size: "Tamanho",
    bold: "Negrito",
    italic: "It\xE1lico",
    underline: "Sublinhado",
    strike: "Tachado",
    caps: "Todas em mai\xFAsculas",
    smallCaps: "Versalete",
    color: "Cor da fonte",
    auto: "Autom\xE1tica",
    charSpacing: "Espa\xE7amento entre caracteres",
    left: "Esquerda",
    center: "Centralizado",
    right: "Direita",
    justify: "Justificado",
    lineSpacing: "Espa\xE7amento entre linhas",
    before: "Espa\xE7o antes (pt)",
    after: "Espa\xE7o depois (pt)",
    indentLeft: "Recuo \xE0 esquerda (cm)",
    indentRight: "Recuo \xE0 direita (cm)",
    special: "Recuo especial",
    firstLine: "Primeira linha",
    hanging: "Deslocamento",
    none: "(nenhum)",
    by: "Em (cm)",
    lines: { 240: "Simples", 259: "1,08", 276: "1,15", 360: "1,5 linha", 480: "Duplo" },
    d: {
      font: (v2) => `Fonte: ${v2}`,
      pt: (v2) => `${String(v2).replace(".", ",")} pt`,
      bold: "Negrito",
      italic: "It\xE1lico",
      underline: "Sublinhado",
      strike: "Tachado",
      caps: "Todas em mai\xFAsculas",
      smallCaps: "Versalete",
      color: (v2) => `Cor da fonte: ${v2}`,
      align: (v2) => v2,
      before: (v2) => `Espa\xE7o Antes: ${String(v2).replace(".", ",")} pt`,
      after: (v2) => `Depois de: ${String(v2).replace(".", ",")} pt`,
      line: (v2) => `Espa\xE7amento entre linhas: ${v2}`,
      indent: (v2) => `Recuo: \xC0 esquerda ${v2}`,
      gallery: "Mostrar na galeria de Estilos",
      basedOn: (v2) => `Baseado em: ${v2}`,
      next: (v2) => `Pr\xF3ximo Estilo: ${v2}`,
      priority: (v2) => `Prioridade: ${v2}`,
      style: (v2) => `Estilo: ${v2}`,
      highlight: "Realce",
      sup: "Sobrescrito",
      sub: "Subscrito",
      numbering: "Numera\xE7\xE3o ou marcadores",
      borders: "Bordas",
      shading: "Sombreamento",
      tabs: "Paradas de tabula\xE7\xE3o",
      pageBreak: "Quebra de p\xE1gina antes",
      spacing: (v2) => `Espa\xE7amento: ${v2}`
    }
  }
};
var SAMPLE2 = "AaBbCcDd";
var canEdit2 = (env) => !env.app.comparing && !env.ed.isProtected();
var ptOf2 = (tw) => Math.round(tw / 2) / 10;
var cmOf = (tw, dec) => (Math.round(tw / 567 * 100) / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", dec);
function drawSample(canvas, ed, look, o6) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.round(o6.w * dpr);
  canvas.height = Math.round(o6.h * dpr);
  canvas.style.width = `${o6.w}px`;
  canvas.style.height = `${o6.h}px`;
  const c4 = canvas.getContext("2d");
  if (!c4) return;
  c4.setTransform(dpr, 0, 0, dpr, 0, 0);
  c4.clearRect(0, 0, o6.w, o6.h);
  if (o6.paper) {
    c4.fillStyle = "#ffffff";
    c4.fillRect(0, 0, o6.w, o6.h);
  }
  if (look.shadingHex) {
    c4.fillStyle = `#${look.shadingHex}`;
    c4.fillRect(2, 3, o6.w - 4, o6.h - 6);
  }
  const f3 = ed.canvasFont(look.fontFamily, look.bold, look.italic);
  const px = Math.max(o6.minPx ?? 8, Math.min(o6.maxPx, look.sizePt * 96 / 72));
  c4.font = `${f3.italic ? "italic " : ""}${f3.weight} ${px}px ${f3.family}`;
  c4.fillStyle = look.color ? `#${look.color}` : o6.autoColor ?? "#000000";
  c4.textBaseline = "alphabetic";
  let text = look.allCaps ? o6.text.toUpperCase() : o6.text;
  if (look.smallCaps && !look.allCaps) text = text.toUpperCase();
  const tw = c4.measureText(text).width;
  const x2 = o6.align && look.alignment === "center" ? Math.max(4, (o6.w - tw) / 2) : o6.align && look.alignment === "right" ? Math.max(4, o6.w - tw - 4) : 4;
  const y3 = Math.round(o6.h / 2 + px * 0.33);
  if (look.borderTop || look.borderBottom) {
    c4.strokeStyle = (look.borderTop ?? look.borderBottom ?? "").split(" ").pop() ?? "#000";
    c4.lineWidth = 1;
    if (look.borderTop) {
      c4.beginPath();
      c4.moveTo(3, 3.5);
      c4.lineTo(o6.w - 3, 3.5);
      c4.stroke();
    }
    if (look.borderBottom) {
      c4.beginPath();
      c4.moveTo(3, o6.h - 3.5);
      c4.lineTo(o6.w - 3, o6.h - 3.5);
      c4.stroke();
    }
  }
  c4.fillText(text, x2, y3);
  if (look.underline || look.strike) {
    c4.fillRect(x2, look.strike ? y3 - px * 0.3 : y3 + Math.max(1, px * 0.08), Math.min(tw, o6.w - x2), Math.max(1, px / 16));
  }
}
function renderTile(env, tile, s4, W, H2) {
  const look = env.ed.styleFormatting(s4.id);
  tile.replaceChildren();
  const cv = document.createElement("canvas");
  cv.className = "uw-style-sample";
  const cap2 = document.createElement("span");
  cap2.className = "uw-style-cap";
  cap2.textContent = s4.name;
  if (look) drawSample(cv, env.ed, look, { text: SAMPLE2, w: W - 4, h: H2 - 22, maxPx: 22, paper: true, align: false });
  tile.append(cv, cap2);
}
function styleGalleryItem(env, ui) {
  const W = 84, H2 = 64;
  let cache = null;
  const get = () => {
    const key = env.ed.stylesKey();
    if (!cache || cache.key !== key) {
      const list2 = env.ed.listStyles("gallery");
      const names = styleNames(env);
      cache = { key, list: list2, items: list2.map((s4) => ({ id: s4.id, label: s4.name, tip: describeStyle(env, s4, void 0, names) })) };
    }
    return cache;
  };
  const list = () => get().list;
  return {
    gallery: {
      id: "styles",
      label: { en: "Styles", pt: "Estilos" },
      icon: "style",
      tile: { w: W, h: H2 },
      rows: 1,
      maxCols: 7,
      minCols: 3,
      expandCols: 7,
      supports: () => typeof env.ed.listStyles === "function",
      isEnabled: () => canEdit2(env),
      items: () => get().items,
      version: () => `${env.ed.stylesVersion()}|${env.ed.knownFontFamilies().length}|${env.lang}`,
      selected: () => {
        const cur = env.ed.currentStyles();
        return list().some((s4) => s4.id === cur.character) ? cur.character : cur.paragraph;
      },
      render: (tile, it) => {
        const s4 = list().find((x2) => x2.id === it.id) ?? env.ed.listStyles("all").find((x2) => x2.id === it.id);
        if (s4) renderTile(env, tile, s4, W, H2);
      },
      onPick: (id) => env.ed.applyStyle(id),
      context: (it) => galleryMenu(env, ui, list().find((x2) => x2.id === it.id)),
      footer: () => [
        { id: "style:create", icon: "add", label: { en: "Create a Style", pt: "Criar um Estilo" }, onClick: () => {
          void ui.quickCreate();
        } },
        "clear",
        { id: "styles:paneFoot", icon: "view_sidebar", label: { en: "Styles pane", pt: "Painel de estilos" }, shortcut: "Ctrl+Alt+Shift+S", onClick: () => ui.togglePane() }
      ]
    }
  };
}
function styleNames(env) {
  return new Map(env.ed.listStyles("all").map((s4) => [s4.id, s4.name]));
}
function galleryMenu(env, ui, s4) {
  const L11 = pickLabels(env.lang, T4);
  const ok = canEdit2(env);
  const out = [
    { id: "style:update", icon: "refresh", label: L11.update(s4.name), disabled: !ok || s4.kind === "character", onClick: () => {
      env.ed.updateStyleFromSelection(s4.id);
      env.after();
    } },
    { id: "style:modify", icon: "edit", label: L11.modifyDots, disabled: !ok, onClick: () => {
      void ui.styleDialog("modify", s4.id);
    } },
    { id: "style:rename", icon: "drive_file_rename_outline", label: L11.rename, disabled: !ok, onClick: () => {
      void ui.rename(s4);
    } },
    s4.quick ? { id: "style:ungallery", icon: "bookmark_remove", label: L11.removeFromGallery, disabled: !ok, onClick: () => {
      env.ed.setStyleInGallery(s4.id, false);
      env.after();
    } } : { id: "style:togallery", icon: "bookmark_add", label: L11.addGallery, disabled: !ok, onClick: () => {
      env.ed.setStyleInGallery(s4.id, true);
      env.after();
    } }
  ];
  if (!s4.builtIn) {
    out.push("-", { id: "style:delete", icon: "delete", label: L11.del(s4.name), disabled: !ok, onClick: () => {
      void ui.remove(s4);
    } });
  }
  return out;
}
var colorName = (hex, L11) => hex ? `#${hex}` : L11.auto;
function describeStyle(env, s4, look = env.ed.styleFormatting(s4.id), names) {
  const L11 = pickLabels(env.lang, T4);
  if (!look) return s4.name;
  const parts = [];
  const d3 = L11.d;
  parts.push(`${d3.font(look.fontFamily)}, ${d3.pt(look.sizePt)}`);
  if (look.bold) parts.push(d3.bold);
  if (look.italic) parts.push(d3.italic);
  if (look.underline) parts.push(d3.underline);
  if (look.strike) parts.push(d3.strike);
  if (look.allCaps) parts.push(d3.caps);
  if (look.smallCaps) parts.push(d3.smallCaps);
  if (look.color) parts.push(d3.color(colorName(look.color, L11)));
  if (s4.kind !== "character") {
    if (look.alignment !== "left") parts.push({ center: L11.center, right: L11.right, both: L11.justify }[look.alignment]);
    if (look.lineTwentieths !== void 0) parts.push(d3.line(L11.lines[look.lineTwentieths] ?? `${(look.lineTwentieths / 240).toFixed(2)}`));
    if (look.spaceBeforeTwips) parts.push(d3.before(ptOf2(look.spaceBeforeTwips)));
    if (look.spaceAfterTwips || look.spaceBeforeTwips) parts.push(d3.after(ptOf2(look.spaceAfterTwips)));
    if (look.indentLeftTwips) parts.push(d3.indent(`${cmOf(look.indentLeftTwips, env.lang === "pt" ? "," : ".")} cm`));
  }
  parts.push(d3.style(L11.kind[s4.kind]));
  if (s4.quick) parts.push(d3.gallery);
  parts.push(d3.priority(s4.priority + 1));
  const nm = names ?? styleNames(env);
  const name = (id) => id ? nm.get(id) ?? id : void 0;
  if (s4.basedOn) parts.push(d3.basedOn(name(s4.basedOn)));
  if (s4.kind !== "character") parts.push(d3.next(name(s4.next) ?? s4.name));
  return `${s4.name}
${parts.join(", ")}`;
}
function describeDirect(env, run, para) {
  const L11 = pickLabels(env.lang, T4);
  const d3 = L11.d;
  const parts = [];
  if (para) {
    const a3 = para["alignment"];
    if (a3) parts.push({ left: L11.left, center: L11.center, right: L11.right, both: L11.justify }[a3] ?? a3);
    if (para["lineTwentieths"] !== void 0) parts.push(d3.line(L11.lines[para["lineTwentieths"]] ?? String(para["lineTwentieths"])));
    if (para["spaceBeforeTwips"] !== void 0) parts.push(d3.before(ptOf2(para["spaceBeforeTwips"])));
    if (para["spaceAfterTwips"] !== void 0) parts.push(d3.after(ptOf2(para["spaceAfterTwips"])));
    if (para["indentLeftTwips"] !== void 0) parts.push(d3.indent(`${cmOf(para["indentLeftTwips"], env.lang === "pt" ? "," : ".")} cm`));
    if (para["numbering"]) parts.push(d3.numbering);
    if (para["borders"]) parts.push(d3.borders);
    if (para["shadingHex"]) parts.push(d3.shading);
    if (para["tabStops"]) parts.push(d3.tabs);
    if (para["pageBreakBefore"]) parts.push(d3.pageBreak);
  } else {
    if (run["fontAscii"]) parts.push(d3.font(run["fontAscii"]));
    if (run["szHalfPt"] !== void 0) parts.push(d3.pt(run["szHalfPt"] / 2));
    if (run["bold"]) parts.push(d3.bold);
    if (run["italic"]) parts.push(d3.italic);
    if (run["underline"]) parts.push(d3.underline);
    if (run["strike"] || run["doubleStrike"]) parts.push(d3.strike);
    if (run["allCaps"]) parts.push(d3.caps);
    if (run["smallCaps"]) parts.push(d3.smallCaps);
    if (run["color"]) parts.push(d3.color(colorName(run["color"], L11)));
    if (run["highlight"]) parts.push(d3.highlight);
    if (run["vertAlign"]) parts.push(run["vertAlign"] === "superscript" ? d3.sup : d3.sub);
    if (run["charSpacingTwips"]) parts.push(d3.spacing(d3.pt(ptOf2(run["charSpacingTwips"]))));
  }
  return parts.length ? parts.join(", ") : L11.noDirect;
}
var el12 = (tag, props = {}, ...kids) => {
  const { cls, ...rest } = props;
  const e6 = Object.assign(document.createElement(tag), rest);
  if (cls) e6.className = cls;
  e6.append(...kids);
  return e6;
};
var draftOf = (l3) => ({
  fontAscii: l3.fontFamily,
  szHalfPt: Math.round(l3.sizePt * 2),
  bold: l3.bold,
  italic: l3.italic,
  underline: l3.underline,
  strike: l3.strike,
  allCaps: l3.allCaps,
  smallCaps: l3.smallCaps,
  color: l3.color,
  charSpacingTwips: l3.charSpacingTwips,
  alignment: l3.alignment,
  spaceBeforeTwips: l3.spaceBeforeTwips,
  spaceAfterTwips: l3.spaceAfterTwips,
  lineTwentieths: l3.lineTwentieths,
  indentLeftTwips: l3.indentLeftTwips,
  indentRightTwips: l3.indentRightTwips,
  indentFirstLineTwips: l3.indentFirstLineTwips
});
var lookOfDraft = (d3, base) => ({ ...base, ...d3, fontFamily: d3.fontAscii, sizePt: d3.szHalfPt / 2 });
function diff(a3, b3, para) {
  const f3 = {};
  const keys = [
    "fontAscii",
    "szHalfPt",
    "bold",
    "italic",
    "underline",
    "strike",
    "allCaps",
    "smallCaps",
    "color",
    "charSpacingTwips",
    ...para ? ["alignment", "spaceBeforeTwips", "spaceAfterTwips", "lineTwentieths", "indentLeftTwips", "indentRightTwips", "indentFirstLineTwips"] : []
  ];
  for (const k2 of keys) {
    if (a3[k2] === b3[k2]) continue;
    f3[k2] = b3[k2] === void 0 ? null : b3[k2];
  }
  return f3;
}
var StylesUI = class {
  constructor(env) {
    this.env = env;
    this.filter = env.app.prefs.get("stylesFilter") ?? "recommended";
    this.alpha = env.app.prefs.get("stylesSort") === "alpha";
    this.preview = env.app.prefs.get("stylesPreview") === "1";
  }
  env;
  pane = null;
  inspector = null;
  filter = "recommended";
  alpha = false;
  preview = false;
  listEl = null;
  lastKey = "";
  inspRows = null;
  get L() {
    return pickLabels(this.env.lang, T4);
  }
  /** Galeria da ribbon (Página Inicial › Estilos). */
  galleryItem() {
    return styleGalleryItem(this.env, this);
  }
  get paneOpen() {
    return !!this.pane?.open;
  }
  get inspectorOpen() {
    return !!this.inspector?.open;
  }
  // ── painel de estilos ──
  togglePane() {
    if (this.pane?.open) {
      this.pane.close();
      return;
    }
    const { env } = this;
    const L11 = this.L;
    const body = el12("div", { cls: "uw-styles" });
    const sel4 = (name, opts2, v2, on) => {
      const s4 = el12("select", { name });
      for (const [k2, t5] of opts2) s4.append(el12("option", { value: k2, textContent: t5 }));
      s4.value = v2;
      s4.addEventListener("change", () => {
        on(s4.value);
        this.lastKey = "";
        this.renderList();
      });
      return s4;
    };
    const opts = el12(
      "div",
      { cls: "uw-styles-opts" },
      sel4(
        "filter",
        [["recommended", L11.recommended], ["inUse", L11.inUse], ["document", L11.inDoc], ["all", L11.all]],
        this.filter,
        (v2) => {
          this.filter = v2;
          env.app.prefs.set("stylesFilter", v2);
        }
      ),
      sel4(
        "sort",
        [["prio", L11.asRecommended], ["alpha", L11.alphabetical]],
        this.alpha ? "alpha" : "prio",
        (v2) => {
          this.alpha = v2 === "alpha";
          env.app.prefs.set("stylesSort", v2 === "alpha" ? "alpha" : "");
        }
      )
    );
    const prev = el12("input", { type: "checkbox", checked: this.preview });
    prev.addEventListener("change", () => {
      this.preview = prev.checked;
      env.app.prefs.set("stylesPreview", prev.checked ? "1" : "");
      this.lastKey = "";
      this.renderList();
    });
    this.listEl = el12("div", { cls: "uw-styles-list" });
    this.listEl.setAttribute("role", "listbox");
    body.append(opts, this.listEl, el12("label", { cls: "uo-check uw-styles-prev" }, prev, L11.preview));
    const foot = el12("div");
    const btn2 = (icon, label, a3, fn) => {
      const b3 = el12("button", { type: "button", cls: "uo-btn", title: label });
      b3.dataset["a"] = a3;
      b3.setAttribute("aria-label", label);
      b3.innerHTML = symbol(icon);
      b3.addEventListener("click", fn);
      return b3;
    };
    foot.append(
      btn2("add", L11.newStyle, "styles:new", () => {
        void this.styleDialog("new");
      }),
      btn2("manage_search", L11.inspector, "styles:inspector", () => this.toggleInspector())
    );
    this.pane = openPane({
      id: "styles",
      title: L11.pane,
      lang: env.lang,
      layer: env.layer,
      width: 280,
      body,
      footer: foot,
      frame: env.frame,
      onClose: () => {
        this.pane = null;
        this.listEl = null;
        env.ed.classList.remove("uw-has-pane");
        this.placeInspector();
        env.after();
      }
    });
    env.ed.classList.add("uw-has-pane");
    this.lastKey = "";
    this.renderList();
    this.placeInspector();
  }
  renderList() {
    const box = this.listEl;
    if (!box) return;
    const { env } = this;
    const cur = env.ed.currentStyles();
    const key = `${env.ed.stylesKey()}|${this.filter}|${this.alpha}|${this.preview}|${cur.paragraph}|${cur.character}|${env.ed.knownFontFamilies().length}|${canEdit2(env)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    let list = env.ed.listStyles(this.filter);
    if (this.alpha) list = [...list].sort((a3, b3) => a3.name.localeCompare(b3.name, env.lang === "pt" ? "pt-BR" : "en"));
    const ok = canEdit2(env);
    const names = styleNames(env);
    box.replaceChildren(...list.map((s4) => {
      const row2 = el12("div", { cls: "uw-style-row" });
      row2.dataset["id"] = s4.id;
      row2.setAttribute("role", "option");
      row2.title = describeStyle(env, s4, void 0, names);
      const on = s4.id === cur.character || s4.id === cur.paragraph && !list.some((x2) => x2.id === cur.character);
      row2.classList.toggle("uo-on", on);
      row2.setAttribute("aria-selected", String(on));
      const name = el12("span", { cls: "uw-style-name" });
      if (this.preview) {
        const look = env.ed.styleFormatting(s4.id);
        const cv = document.createElement("canvas");
        if (look) drawSample(cv, env.ed, look, { text: s4.name, w: 190, h: 24, maxPx: 18, minPx: 9, autoColor: getComputedStyle(box).color });
        name.append(cv);
      } else name.textContent = s4.name;
      const mark = el12("span", { cls: "uw-style-kind", textContent: { paragraph: "\xB6", character: "a", linked: "\xB6a" }[s4.kind] });
      const more = el12("button", { type: "button", cls: "uo-btn uw-style-more", title: this.L.modifyDots });
      more.innerHTML = symbol("arrow_drop_down");
      more.addEventListener("mousedown", (e6) => e6.preventDefault());
      more.addEventListener("click", (e6) => {
        e6.stopPropagation();
        const r5 = more.getBoundingClientRect();
        openMenu(galleryMenu(env, this, s4), { x: r5.left, y: r5.bottom }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      row2.append(name, mark, more);
      row2.addEventListener("mousedown", (e6) => e6.preventDefault());
      row2.addEventListener("click", () => {
        if (ok) {
          env.ed.applyStyle(s4.id);
          env.after();
        }
      });
      row2.addEventListener("contextmenu", (e6) => {
        e6.preventDefault();
        openMenu(galleryMenu(env, this, s4), { x: e6.clientX, y: e6.clientY }, { lang: env.lang, layer: env.layer, onClose: () => env.after() });
      });
      return row2;
    }));
  }
  // ── inspetor ──
  toggleInspector() {
    if (this.inspector?.open) {
      this.inspector.close();
      return;
    }
    const { env } = this;
    const L11 = this.L;
    const body = el12("div", { cls: "uw-insp" });
    const row2 = (value, icon, tip, a3, fn) => {
      const b3 = el12("button", { type: "button", cls: "uo-btn", title: tip });
      b3.dataset["a"] = a3;
      b3.setAttribute("aria-label", tip);
      b3.innerHTML = symbol(icon);
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", () => {
        fn();
        env.after();
      });
      return el12("div", { cls: "uw-insp-row" }, value, b3);
    };
    const box = () => el12("div", { cls: "uw-insp-val" });
    const r5 = { pStyle: box(), pDirect: box(), tStyle: box(), tDirect: box() };
    body.append(
      el12("div", { cls: "uw-insp-h", textContent: L11.paraFmt }),
      row2(r5.pStyle, "format_clear", L11.resetPara, "insp:resetPara", () => env.ed.clearParagraphStyle()),
      row2(r5.pDirect, "format_clear", L11.clearParaFmt, "insp:clearPara", () => env.ed.clearParagraphFormatting()),
      el12("div", { cls: "uw-insp-h", textContent: L11.textFmt }),
      row2(r5.tStyle, "format_clear", L11.clearCharStyle, "insp:clearCharStyle", () => env.ed.clearCharacterStyle()),
      row2(r5.tDirect, "format_clear", L11.clearCharFmt, "insp:clearChar", () => env.ed.clearCharacterFormatting())
    );
    this.inspRows = r5;
    const foot = el12("div");
    const pill = (label, a3, fn) => {
      const b3 = el12("button", { type: "button", cls: "uo-pill", textContent: label });
      b3.dataset["a"] = a3;
      b3.addEventListener("mousedown", (e6) => e6.preventDefault());
      b3.addEventListener("click", fn);
      return b3;
    };
    foot.append(
      pill(L11.newStyle, "insp:new", () => {
        void this.styleDialog("new");
      }),
      pill(L11.clearAll, "insp:clearAll", () => {
        env.ed.clearFormatting();
        env.after();
      })
    );
    this.inspector = openPane({
      id: "styleInspector",
      title: L11.inspector,
      lang: env.lang,
      layer: env.layer,
      width: 300,
      body,
      footer: foot,
      frame: () => this.inspectorFrame(),
      onClose: () => {
        this.inspector = null;
        this.inspRows = null;
        env.after();
      }
    });
    this.inspector.el.classList.add("uw-insp-pane");
    this.syncInspector();
  }
  inspectorFrame() {
    const f3 = this.env.frame();
    const right = this.pane?.open ? f3.right - 290 : f3.right - 12;
    return new DOMRect(right - 300, f3.top + 12, 300, Math.min(330, f3.height - 24));
  }
  placeInspector() {
    this.inspector?.place();
  }
  syncInspector() {
    const r5 = this.inspRows;
    if (!r5) return;
    const i5 = this.env.ed.inspectStyle();
    r5.pStyle.textContent = i5.paragraph.name;
    r5.pDirect.textContent = `${this.L.plus} ${describeDirect(this.env, {}, i5.paragraph.direct)}`;
    r5.tStyle.textContent = i5.text.name;
    r5.tDirect.textContent = `${this.L.plus} ${describeDirect(this.env, i5.text.direct, null)}`;
  }
  /** Chamado a cada sync da barra. */
  sync() {
    if (this.pane?.open) {
      this.pane.place();
      this.renderList();
    }
    if (this.inspector?.open) {
      this.inspector.place();
      this.syncInspector();
    }
  }
  close() {
    this.pane?.close();
    this.inspector?.close();
  }
  // ── diálogos ──
  /** "Criar um Estilo" (galeria): nome + visualização; Modificar… abre o completo. */
  async quickCreate() {
    const { env } = this;
    const L11 = this.L;
    if (!canEdit2(env)) return;
    const input = el12("input", { type: "text", value: this.freeName() });
    const look = this.selectionLook();
    const cv = document.createElement("canvas");
    if (look) drawSample(cv, env.ed, look, { text: SAMPLE2, w: 360, h: 56, maxPx: 30, paper: true, align: true });
    const msg = el12("div", { cls: "uw-style-msg" });
    const body = el12("div", { cls: "uw-style-quick" }, el12("label", { cls: "uo-field" }, el12("span", { textContent: L11.name }), input), cv, msg);
    let action = null;
    const h3 = openDialog({
      title: L11.newStyleTitle,
      body,
      layer: env.layer,
      lang: env.lang,
      width: 420,
      actions: [{ id: "modify", label: L11.modify }, { id: "cancel", label: L11.cancel }, { id: "ok", label: L11.ok, primary: true }],
      onAction: (id) => {
        if (id === "cancel") return true;
        const name = input.value.trim();
        if (!name) {
          msg.textContent = L11.empty;
          return false;
        }
        if (env.ed.listStyles("all").some((s4) => s4.name.toLowerCase() === name.toLowerCase())) {
          msg.textContent = L11.nameTaken;
          return false;
        }
        return true;
      }
    });
    action = await h3.result;
    if (action === "ok") {
      env.ed.createStyle({ name: input.value.trim() });
      env.after();
    } else if (action === "modify") await this.styleDialog("new", void 0, input.value.trim());
  }
  freeName() {
    const names = new Set(this.env.ed.listStyles("all").map((s4) => s4.name.toLowerCase()));
    const base = this.env.lang === "pt" ? "Estilo" : "Style";
    for (let i5 = 1; ; i5++) if (!names.has(`${base}${i5}`.toLowerCase())) return `${base}${i5}`;
  }
  /** Formatação efetiva no cursor: o estilo do parágrafo + o direto da seleção. */
  selectionLook() {
    const ed = this.env.ed;
    const base = ed.styleFormatting(ed.currentStyles().paragraph);
    if (!base) return null;
    const f3 = ed.selectionStyleFormat();
    const out = { ...base };
    for (const [k2, v2] of Object.entries(f3)) if (v2 !== null && v2 !== void 0) out[k2 === "fontAscii" ? "fontFamily" : k2 === "szHalfPt" ? "sizePt" : k2] = k2 === "szHalfPt" ? v2 / 2 : v2;
    return out;
  }
  /** Criar Novo Estilo / Modificar Estilo (diálogo completo). */
  async styleDialog(mode, id, presetName) {
    const { env } = this;
    const ed = env.ed;
    const L11 = this.L;
    if (!canEdit2(env)) return;
    const all = ed.listStyles("all");
    const info = id ? all.find((s4) => s4.id === id) : void 0;
    if (mode === "modify" && !info) return;
    const dec = env.lang === "pt" ? "," : ".";
    let kind = info?.kind ?? "linked";
    const cur = ed.currentStyles().paragraph;
    const startLook = mode === "modify" ? ed.styleFormatting(id) : this.selectionLook();
    if (!startLook) return;
    const start = draftOf(startLook);
    const draft = { ...start };
    const nameIn = el12("input", { type: "text", value: info?.name ?? presetName ?? this.freeName() });
    const typeSel = el12("select", { name: "type" });
    for (const [k2, t5] of [["linked", L11.linked], ["paragraph", L11.paragraph], ["character", L11.character]]) typeSel.append(el12("option", { value: k2, textContent: t5 }));
    typeSel.value = kind;
    typeSel.disabled = mode === "modify";
    const baseSel = el12("select", { name: "basedOn" });
    const nextSel = el12("select", { name: "next" });
    const fillBases = () => {
      baseSel.replaceChildren();
      nextSel.replaceChildren();
      const paraStyles = all.filter((s4) => s4.kind !== "character" && s4.id !== id);
      const charStyles = all.filter((s4) => s4.kind !== "paragraph" && s4.id !== id);
      const opts = kind === "character" ? charStyles : paraStyles;
      if (kind === "character") baseSel.append(el12("option", { value: "", textContent: L11.none }));
      for (const s4 of opts) baseSel.append(el12("option", { value: s4.id, textContent: s4.name }));
      baseSel.value = info?.basedOn ?? (kind === "character" ? "" : cur);
      if (kind !== "character") {
        nextSel.append(el12("option", { value: "", textContent: nameIn.value.trim() || L11.none }));
        for (const s4 of paraStyles) nextSel.append(el12("option", { value: s4.id, textContent: s4.name }));
        nextSel.value = info?.next && info.next !== id ? info.next : "";
      }
      nextSel.disabled = kind === "character";
    };
    fillBases();
    typeSel.addEventListener("change", () => {
      kind = typeSel.value;
      fillBases();
      refresh();
    });
    const families = await ed.listAvailableFonts();
    const fontSel = el12("select", { name: "font" });
    for (const f3 of draft.fontAscii && !families.includes(draft.fontAscii) ? [draft.fontAscii, ...families] : families) fontSel.append(el12("option", { value: f3, textContent: f3 }));
    fontSel.value = draft.fontAscii;
    const sizeIn = el12("input", { type: "number", name: "size", min: "1", max: "1638", step: "0.5", value: String(draft.szHalfPt / 2) });
    sizeIn.style.width = "64px";
    const tog = (k2, icon, tip) => {
      const b3 = el12("button", { type: "button", cls: "uo-btn", title: tip });
      b3.dataset["a"] = `dlg:${k2}`;
      b3.innerHTML = symbol(icon);
      const upd = () => {
        b3.classList.toggle("uo-on", draft[k2]);
        b3.setAttribute("aria-pressed", String(draft[k2]));
      };
      b3.addEventListener("click", () => {
        draft[k2] = !draft[k2];
        upd();
        refresh();
      });
      upd();
      return b3;
    };
    const colorIn2 = el12("input", { type: "color", name: "color", value: `#${draft.color ?? "000000"}` });
    colorIn2.style.cssText = "width:40px;height:30px;padding:2px;border-radius:8px";
    const alignBtns = ["left", "center", "right", "both"].map((a3) => {
      const b3 = el12("button", { type: "button", cls: "uo-btn", title: { left: L11.left, center: L11.center, right: L11.right, both: L11.justify }[a3] });
      b3.dataset["a"] = `dlg:align:${a3}`;
      b3.innerHTML = symbol(a3 === "both" ? "format_align_justify" : `format_align_${a3}`);
      b3.addEventListener("click", () => {
        draft.alignment = a3;
        syncAlign();
        refresh();
      });
      return b3;
    });
    const syncAlign = () => alignBtns.forEach((b3, i5) => b3.classList.toggle("uo-on", ["left", "center", "right", "both"][i5] === draft.alignment));
    syncAlign();
    const lineSel = el12("select", { name: "line" });
    for (const v2 of [240, 259, 276, 360, 480]) lineSel.append(el12("option", { value: String(v2), textContent: L11.lines[v2] }));
    if (draft.lineTwentieths !== void 0 && ![240, 259, 276, 360, 480].includes(draft.lineTwentieths)) {
      lineSel.append(el12("option", { value: String(draft.lineTwentieths), textContent: (draft.lineTwentieths / 240).toFixed(2).replace(".", dec) }));
    }
    lineSel.value = String(draft.lineTwentieths ?? 240);
    const num2 = (v2, step, name2) => {
      const i5 = el12("input", { type: "number", name: name2, min: "0", step, value: String(v2) });
      i5.style.width = "72px";
      return i5;
    };
    const beforeIn = num2(ptOf2(draft.spaceBeforeTwips), "6", "before");
    const afterIn = num2(ptOf2(draft.spaceAfterTwips), "6", "after");
    const indentIn = num2(Math.round(draft.indentLeftTwips / 567 * 100) / 100, "0.25", "indentLeft");
    const read = () => {
      draft.fontAscii = fontSel.value;
      const sz = parseFloat(sizeIn.value.replace(",", "."));
      if (sz > 0) draft.szHalfPt = Math.round(sz * 2);
      const hex = colorIn2.value.slice(1).toUpperCase();
      if (hex !== (start.color ?? "000000") || draft.color !== start.color) draft.color = hex === "000000" && !start.color ? void 0 : hex;
      draft.lineTwentieths = Number(lineSel.value);
      draft.spaceBeforeTwips = Math.round(Number(beforeIn.value.replace(",", ".")) * 20) || 0;
      draft.spaceAfterTwips = Math.round(Number(afterIn.value.replace(",", ".")) * 20) || 0;
      draft.indentLeftTwips = Math.round(Number(indentIn.value.replace(",", ".")) * 567) || 0;
    };
    for (const i5 of [fontSel, sizeIn, colorIn2, lineSel, beforeIn, afterIn, indentIn]) i5.addEventListener("change", () => {
      read();
      refresh();
    });
    const formatBtn = el12("button", { type: "button", cls: "uo-pill", textContent: `${L11.format} \u25BE` });
    formatBtn.dataset["a"] = "dlg:format";
    formatBtn.addEventListener("click", (e6) => {
      e6.stopPropagation();
      const r5 = formatBtn.getBoundingClientRect();
      openMenu([
        { id: "dlg:format:font", icon: "text_format", label: L11.fontDots, onClick: () => {
          void this.fontSub(draft).then(refresh);
        } },
        { id: "dlg:format:para", icon: "format_textdirection_l_to_r", label: L11.paraDots, disabled: kind === "character", onClick: () => {
          void this.paraSub(draft).then(() => {
            syncAlign();
            beforeIn.value = String(ptOf2(draft.spaceBeforeTwips));
            afterIn.value = String(ptOf2(draft.spaceAfterTwips));
            indentIn.value = String(Math.round(draft.indentLeftTwips / 567 * 100) / 100);
            lineSel.value = String(draft.lineTwentieths ?? 240);
            refresh();
          });
        } }
      ], { x: r5.left, y: r5.top - 4 }, { lang: env.lang, layer: env.layer });
    });
    const cv = document.createElement("canvas");
    cv.className = "uw-style-prev";
    const desc = el12("div", { cls: "uw-style-desc" });
    const quick = el12("input", { type: "checkbox", checked: info?.quick ?? true });
    const auto = el12("input", { type: "checkbox", checked: info?.autoUpdate ?? false });
    const msg = el12("div", { cls: "uw-style-msg" });
    const refresh = () => {
      const look = lookOfDraft(draft, startLook);
      drawPreview(cv, ed, look, L11, kind);
      const fake = {
        id: id ?? "",
        name: nameIn.value.trim() || "\u2026",
        rawName: "",
        kind,
        builtIn: !!info?.builtIn,
        defined: true,
        quick: quick.checked,
        hidden: false,
        priority: info?.priority ?? 0,
        inUse: false,
        isDefault: false,
        basedOn: baseSel.value || void 0,
        next: nextSel.value || void 0,
        autoUpdate: auto.checked
      };
      desc.textContent = describeStyle(env, fake, look).split("\n")[1] ?? "";
      for (const b3 of alignBtns) b3.disabled = kind === "character";
      for (const i5 of [lineSel, beforeIn, afterIn, indentIn]) i5.disabled = kind === "character";
    };
    nameIn.addEventListener("input", () => {
      fillBases();
      refresh();
    });
    for (const i5 of [baseSel, nextSel, quick, auto]) i5.addEventListener("change", refresh);
    const grid2 = el12(
      "div",
      { cls: "uo-dialog-grid" },
      el12("span", { textContent: L11.name }),
      nameIn,
      el12("span", { textContent: L11.type }),
      typeSel,
      el12("span", { textContent: L11.basedOn }),
      baseSel,
      el12("span", { textContent: L11.next }),
      nextSel
    );
    const fmtRow1 = el12(
      "div",
      { cls: "uw-style-fmt" },
      fontSel,
      sizeIn,
      tog("bold", "format_bold", L11.bold),
      tog("italic", "format_italic", L11.italic),
      tog("underline", "format_underlined", L11.underline),
      colorIn2
    );
    const fmtRow2 = el12("div", { cls: "uw-style-fmt" }, ...alignBtns, el12("span", { textContent: L11.lineSpacing }), lineSel);
    const fmtRow3 = el12(
      "div",
      { cls: "uw-style-fmt" },
      el12("span", { textContent: L11.before }),
      beforeIn,
      el12("span", { textContent: L11.after }),
      afterIn,
      el12("span", { textContent: L11.indentLeft }),
      indentIn
    );
    const checks = el12(
      "div",
      { cls: "uw-style-checks" },
      el12("label", { cls: "uo-check" }, quick, L11.addToGallery),
      el12("label", { cls: "uo-check" }, auto, L11.autoUpdate)
    );
    const body = el12(
      "div",
      { cls: "uw-style-dlg" },
      el12("strong", { textContent: L11.properties }),
      grid2,
      el12("strong", { textContent: L11.formatting }),
      fmtRow1,
      fmtRow2,
      fmtRow3,
      cv,
      desc,
      checks,
      el12("div", {}, formatBtn),
      msg
    );
    refresh();
    const h3 = openDialog({
      title: mode === "new" ? L11.newStyleTitle : L11.modifyTitle,
      body,
      layer: env.layer,
      lang: env.lang,
      width: 560,
      actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.ok, primary: true }],
      onAction: (a3) => {
        if (a3 !== "ok") return true;
        read();
        const name2 = nameIn.value.trim();
        if (!name2) {
          msg.textContent = L11.empty;
          return false;
        }
        if (all.some((s4) => s4.id !== id && s4.name.toLowerCase() === name2.toLowerCase())) {
          msg.textContent = L11.nameTaken;
          return false;
        }
        return true;
      }
    });
    if (await h3.result !== "ok") return;
    const name = nameIn.value.trim();
    if (mode === "new") {
      const baseLook = baseSel.value ? ed.styleFormatting(baseSel.value) : ed.styleFormatting(ed.currentStyles().paragraph);
      const format = baseLook ? diff(draftOf(baseLook), draft, kind !== "character") : {};
      for (const k2 of Object.keys(format)) if (format[k2] === null) delete format[k2];
      ed.createStyle({ name, type: kind, basedOn: baseSel.value || void 0, next: nextSel.value || void 0, quick: quick.checked, autoUpdate: auto.checked, format, fromSelection: false });
    } else {
      ed.modifyStyle(id, {
        name: name !== info.name ? name : void 0,
        basedOn: baseSel.value && baseSel.value !== info.basedOn ? baseSel.value : void 0,
        next: kind === "character" ? void 0 : (nextSel.value || null) !== (info.next && info.next !== id ? info.next : null) ? nextSel.value || null : void 0,
        quick: quick.checked !== info.quick ? quick.checked : void 0,
        autoUpdate: auto.checked !== info.autoUpdate ? auto.checked : void 0,
        format: diff(start, draft, kind !== "character")
      });
    }
    env.after();
  }
  /** Formatar › Fonte… (rascunho do estilo). */
  async fontSub(d3) {
    const L11 = this.L;
    const box = (k2, label) => {
      const i5 = el12("input", { type: "checkbox", checked: !!d3[k2] });
      i5.name = k2;
      return el12("label", { cls: "uo-check" }, i5, label);
    };
    const spacing = el12("input", { type: "number", name: "charSpacing", step: "0.5", value: String(ptOf2(d3.charSpacingTwips)) });
    const body = el12(
      "div",
      { cls: "uw-style-sub" },
      el12(
        "div",
        { cls: "uw-style-fx" },
        box("bold", L11.bold),
        box("italic", L11.italic),
        box("underline", L11.underline),
        box("strike", L11.strike),
        box("allCaps", L11.caps),
        box("smallCaps", L11.smallCaps)
      ),
      el12("label", { cls: "uo-field" }, el12("span", { textContent: `${L11.charSpacing} (pt)` }), spacing)
    );
    const h3 = openDialog({ title: L11.font, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.ok, primary: true }] });
    if (await h3.result !== "ok") return;
    for (const k2 of ["bold", "italic", "underline", "strike", "allCaps", "smallCaps"]) d3[k2] = body.querySelector(`input[name="${k2}"]`).checked;
    d3.charSpacingTwips = Math.round(Number(spacing.value.replace(",", ".")) * 20) || 0;
  }
  /** Formatar › Parágrafo… (recuos à direita e especial). */
  async paraSub(d3) {
    const L11 = this.L;
    const right = el12("input", { type: "number", name: "indentRight", min: "0", step: "0.25", value: String(Math.round(d3.indentRightTwips / 567 * 100) / 100) });
    const special = el12("select", { name: "special" });
    for (const [k2, t5] of [["none", L11.none], ["firstLine", L11.firstLine], ["hanging", L11.hanging]]) special.append(el12("option", { value: k2, textContent: t5 }));
    special.value = !d3.indentFirstLineTwips ? "none" : d3.indentFirstLineTwips > 0 ? "firstLine" : "hanging";
    const by = el12("input", { type: "number", name: "by", min: "0", step: "0.25", value: String(Math.round(Math.abs(d3.indentFirstLineTwips) / 567 * 100) / 100 || 1.25) });
    const body = el12(
      "div",
      { cls: "uo-dialog-grid" },
      el12("span", { textContent: L11.indentRight }),
      right,
      el12("span", { textContent: L11.special }),
      special,
      el12("span", { textContent: L11.by }),
      by
    );
    const h3 = openDialog({ title: L11.paragraph, body, layer: this.env.layer, lang: this.env.lang, width: 380, actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.ok, primary: true }] });
    if (await h3.result !== "ok") return;
    d3.indentRightTwips = Math.round(Number(right.value.replace(",", ".")) * 567) || 0;
    const v2 = Math.round(Number(by.value.replace(",", ".")) * 567) || 0;
    d3.indentFirstLineTwips = special.value === "none" ? 0 : special.value === "firstLine" ? v2 : -v2;
  }
  async rename(s4) {
    const L11 = this.L;
    const v2 = await promptDialog({ title: L11.renameTitle, label: L11.name, value: s4.name, layer: this.env.layer, lang: this.env.lang });
    if (v2 === null || !v2.trim() || v2.trim() === s4.name) return;
    if (!this.env.ed.renameStyle(s4.id, v2.trim())) this.env.app.ui?.flash(L11.nameTaken);
    this.env.after();
  }
  async remove(s4) {
    const L11 = this.L;
    const h3 = openDialog({
      title: L11.del(s4.name).replace(/…$/, ""),
      body: L11.delConfirm(s4.name),
      layer: this.env.layer,
      lang: this.env.lang,
      icon: "delete",
      actions: [{ id: "cancel", label: L11.cancel }, { id: "ok", label: L11.delete, primary: true }]
    });
    if (await h3.result === "ok") this.env.ed.deleteStyle(s4.id);
    this.env.after();
  }
};
function drawPreview(cv, ed, look, L11, kind) {
  const W = 508, H2 = 96;
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  cv.width = W * dpr;
  cv.height = H2 * dpr;
  cv.style.width = `${W}px`;
  cv.style.height = `${H2}px`;
  const c4 = cv.getContext("2d");
  if (!c4) return;
  c4.setTransform(dpr, 0, 0, dpr, 0, 0);
  c4.fillStyle = "#ffffff";
  c4.fillRect(0, 0, W, H2);
  c4.fillStyle = "#a0a0a0";
  c4.font = "9px sans-serif";
  c4.fillText(L11.prevPara, 8, 14);
  const inner = document.createElement("canvas");
  drawSample(inner, ed, look, { text: kind === "character" ? L11.sample.split(" ").slice(0, 4).join(" ") : L11.sample, w: W - 16, h: 46, maxPx: 28, minPx: 8, align: kind !== "character" });
  c4.drawImage(inner, 8, 22, W - 16, 46);
  c4.fillStyle = "#a0a0a0";
  c4.font = "9px sans-serif";
  c4.fillText(L11.prevPara, 8, 84);
}

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

/* estilos: miniaturas da galeria, painel de estilos, inspetor, di\xE1logo */
:host(.uw-has-pane) .pages { padding-right: 304px; }
:host(.uw-has-pane.uw-has-comments) .pages { padding-right: 604px; }
.uo-gal-tile { display: flex; flex-direction: column; align-items: stretch; }
.uw-style-sample { display: block; margin: 2px 2px 0; border-radius: 4px; flex: none; }
.uw-style-cap {
  display: block; padding: 2px 5px 0; font-size: 11px; line-height: 15px; color: var(--u-color-on-surface-variant, #44474f);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
}
.uw-styles { display: flex; flex-direction: column; gap: 6px; }
.uw-styles-opts { display: flex; gap: 6px; }
.uw-styles-opts select, .uw-style-dlg select, .uw-style-dlg input[type="text"], .uw-style-dlg input[type="number"], .uw-style-sub input[type="number"] {
  height: 30px; border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; padding: 0 6px;
  background: transparent; color: inherit; font: inherit; font-size: 13px; min-width: 0;
}
.uw-styles-opts select { flex: 1 1 0; }
.uw-styles-list { display: flex; flex-direction: column; gap: 1px; }
.uw-style-row {
  display: flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 2px 0 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
}
.uw-style-row:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-style-row.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-style-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uw-style-name canvas { display: block; }
.uw-style-kind { flex: none; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); min-width: 18px; text-align: center; }
.uw-style-more { height: 26px; min-width: 22px; padding: 0; visibility: hidden; }
.uw-style-row:hover .uw-style-more, .uw-style-row.uo-on .uw-style-more { visibility: visible; }
.uw-styles-prev { margin-top: 4px; font-size: 13px; }
.uw-insp { display: flex; flex-direction: column; gap: 4px; }
.uw-insp-h { font-size: 12px; font-weight: 600; color: var(--u-color-on-surface-variant, #44474f); margin-top: 6px; }
.uw-insp-row { display: flex; align-items: center; gap: 4px; }
.uw-insp-val {
  flex: 1 1 auto; min-width: 0; min-height: 30px; padding: 5px 8px; border: 1px solid var(--u-color-outline-variant, #c4c6d0);
  border-radius: 8px; font-size: 12.5px; line-height: 1.35; overflow-wrap: anywhere;
}
.uw-insp-pane { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 16px; }
.uw-style-dlg { display: flex; flex-direction: column; gap: 10px; }
.uw-style-dlg .uo-dialog-grid select, .uw-style-dlg .uo-dialog-grid input { width: 100%; }
.uw-style-fmt { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12.5px; }
.uw-style-fmt select[name="font"] { width: 180px; }
.uw-style-prev { display: block; border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; max-width: 100%; }
.uw-style-desc { font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); line-height: 1.4; }
.uw-style-checks { display: flex; gap: 18px; flex-wrap: wrap; }
.uw-style-msg { color: var(--u-color-error, #ba1a1a); font-size: 12.5px; min-height: 16px; }
.uw-style-quick { display: flex; flex-direction: column; gap: 10px; }
.uw-style-quick canvas { border: 1px solid var(--u-color-outline-variant, #c4c6d0); border-radius: 8px; }
.uw-style-sub { display: flex; flex-direction: column; gap: 12px; }
.uw-style-fx { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }

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

/* bal\xF5es de revis\xE3o: o cart\xE3o dos coment\xE1rios, na cor do autor */
.uw-rev-card::before { background: var(--uw-rev); }
.uw-rev-card.anchored::after { border-top-color: var(--uw-rev); }
.uw-card .when { flex: 1 1 auto; margin-left: 6px; font-size: 11px; opacity: .7; white-space: nowrap; }
.uw-rev-card .txt b { font-weight: 600; }

/* Painel de Revis\xE3o (painel das barras: vertical \xE0 esquerda; horizontal acima da barra de status) */
:host(.uw-review-v) .pages { padding-left: 304px; justify-content: safe center; }
:host(.uw-review-h) .pages { padding-bottom: 224px; }

/* pain\xE9is da esquerda: Navega\xE7\xE3o na borda, Revis\xE3o vertical ao lado, r\xE9gua vertical depois */
:host(.uw-nav-open) .pages { padding-left: 304px; justify-content: safe center; }
:host(.uw-nav-open.uw-review-v) .pages { padding-left: 604px; }
:host(.uw-vruler-on) .pages { padding-left: 48px; justify-content: safe center; }
:host(.uw-vruler-on.uw-nav-open) .pages, :host(.uw-vruler-on.uw-review-v) .pages { padding-left: 326px; }
:host(.uw-vruler-on.uw-nav-open.uw-review-v) .pages { padding-left: 626px; }

/* r\xE9gua (Exibir > R\xE9gua): a horizontal dentro da barra; a vertical na borda do documento */
.uw-hruler { border-top: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.12)); background: var(--uo-bar-bg, var(--u-color-surface, #fdfbff)); }
:host(.view-read) .uw-hruler, :host(.view-outline) .uw-hruler { display: none !important; }
.uw-vruler { position: fixed; z-index: 35; width: 22px; background: var(--uo-bar-bg, var(--u-color-surface, #fdfbff)); border-right: 1px solid var(--u-color-outline-variant, rgba(0,0,0,.12)); }
.uw-vruler[hidden] { display: none; }
.uw-ruler-guide { position: fixed; z-index: 36; pointer-events: none; border: 0 dashed var(--u-color-on-surface-variant, #44474f); border-top-width: 1px; }
.uw-ruler-guide.uw-ruler-guide-v { border-top-width: 0; border-left-width: 1px; }
.uw-ruler-guide[hidden] { display: none; }

/* Painel de Navega\xE7\xE3o */
.uw-nav.uo-pane-body { display: flex; flex-direction: column; padding: 0; overflow: hidden; font-size: 13px; }
.uw-nav-search { display: flex; align-items: center; gap: 2px; margin: 2px 12px 6px; height: 34px; padding: 0 2px 0 8px;
  border: 1px solid var(--u-color-outline, #74777f); border-radius: 8px; background: var(--u-color-surface-container-lowest, #fff); }
.uw-nav-search:focus-within { outline: 2px solid var(--u-color-primary, #005bc0); outline-offset: -1px; }
.uw-nav-search-ic { display: flex; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-search-ic .uo-ic { width: 18px; height: 18px; }
.uw-nav-input { flex: 1 1 auto; min-width: 0; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 13.5px; height: 30px; }
.uw-nav-input::-webkit-search-cancel-button { cursor: pointer; }
.uw-nav-opt { height: 28px; min-width: 28px; padding: 0; }
.uw-nav-status { display: flex; align-items: center; gap: 2px; padding: 0 8px 4px 14px; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-status[hidden] { display: none; }
.uw-nav-count { flex: 1 1 auto; }
.uw-nav-step { height: 26px; min-width: 26px; padding: 0; }
.uw-nav-tabs { display: flex; gap: 2px; padding: 0 10px; border-bottom: 1px solid var(--u-color-outline-variant, #c4c6d0); flex: none; }
.uw-nav-tab { position: relative; border: 0; background: transparent; color: var(--u-color-on-surface-variant, #44474f); font: inherit; font-size: 13px; padding: 7px 8px 8px; cursor: pointer; border-radius: 6px 6px 0 0; }
.uw-nav-tab:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-tab.uo-on { color: var(--u-color-primary, #005bc0); font-weight: 600; }
.uw-nav-tab.uo-on::after { content: ''; position: absolute; left: 6px; right: 6px; bottom: -1px; height: 3px; border-radius: 3px 3px 0 0; background: var(--u-color-primary, #005bc0); }
.uw-nav-body { flex: 1 1 auto; overflow: auto; min-height: 0; padding: 6px 6px 10px; }
.uw-nav-empty { margin: 10px 8px; color: var(--u-color-on-surface-variant, #44474f); line-height: 1.45; }
.uw-nav-tree { display: flex; flex-direction: column; gap: 1px; }
.uw-nav-tree.uw-nav-drop-end { box-shadow: inset 0 -2px 0 var(--u-color-primary, #005bc0); }
.uw-nav-row { display: flex; align-items: center; gap: 2px; min-height: 28px; padding-right: 6px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.uw-nav-row:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-row.uo-on { background: color-mix(in srgb, var(--u-color-primary, #005bc0) 14%, transparent); }
.uw-nav-row.uw-nav-hit .uw-nav-label { background: color-mix(in srgb, #ffd600 55%, transparent); border-radius: 3px; }
.uw-nav-row.uw-nav-dragging { opacity: .45; }
.uw-nav-row.uw-nav-drop-before { box-shadow: inset 0 2px 0 var(--u-color-primary, #005bc0); }
.uw-nav-twisty { flex: none; width: 22px; height: 22px; padding: 0; border: 0; background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; }
.uw-nav-twisty .uo-ic { width: 18px; height: 18px; }
.uw-nav-twisty.uw-nav-leaf { visibility: hidden; cursor: default; }
.uw-nav-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.uw-nav-pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 6px 0; }
.uw-nav-page { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; border: 2px solid transparent; border-radius: 8px; background: transparent; cursor: pointer; color: inherit; font: inherit; }
.uw-nav-page:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-page.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-nav-thumb { display: block; width: 150px; min-height: 60px; background: #fff; outline: 1px solid var(--u-color-outline-variant, #c4c6d0); }
.uw-nav-pnum { font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); }
.uw-nav-results { display: flex; flex-direction: column; gap: 2px; }
.uw-nav-result { text-align: left; border: 1px solid transparent; border-radius: 8px; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.4; padding: 6px 8px; cursor: pointer; }
.uw-nav-result:hover { background: var(--u-color-surface-container-highest, #e3e2e6); }
.uw-nav-result.uo-on { border-color: var(--u-color-primary, #005bc0); }
.uw-nav-result strong { font-weight: 700; background: color-mix(in srgb, #ffd600 45%, transparent); border-radius: 2px; }
.uw-review.uo-pane-body { display: flex; flex-direction: column; padding: 0; overflow: hidden; font-size: 13px; }
.uw-review-sum { flex: none; padding: 0 16px 8px; font-size: 12px; color: var(--u-color-on-surface-variant, #44474f); border-bottom: 1px solid var(--u-color-outline-variant, #c4c6d0); }
.uw-review-list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; flex: 1 1 auto; min-height: 0; }
.uw-rev { padding: 6px 8px 6px 12px; cursor: pointer; border-left: 3px solid var(--uw-rev, rgba(255,187,0,.6)); margin: 2px 6px; border-radius: 4px; }
.uw-rev:hover { background: var(--u-color-surface-container-high, #e9e7ec); }
.uw-rev-head { display: flex; align-items: center; gap: 6px; }
.uw-rev-head .who { font-weight: 600; font-size: 12px; }
.uw-rev-head .what { font-size: 12px; color: var(--uw-rev, inherit); }
.uw-rev-head .gap { flex: 1 1 auto; }
.uw-rev .when { font-size: 11px; opacity: .7; }
.uw-rev-head .uo-btn { height: 22px; min-width: 22px; visibility: hidden; }
.uw-rev:hover .uo-btn { visibility: visible; }
.uw-rev .uo-ic { width: 16px; height: 16px; }
.uw-rev .txt { white-space: pre-wrap; word-break: break-word; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.uw-rev-empty { padding: 12px; color: var(--u-color-on-surface-variant, #44474f); }

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
var EDITOR_KEYS = /* @__PURE__ */ new Set(["Ctrl+C", "Ctrl+X", "Ctrl+V", "Ctrl+Shift+V", "Ctrl+Z", "Ctrl+Y", "Ctrl+A", "Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+E", "Ctrl+L", "Ctrl+R", "Ctrl+J", "Ctrl+Enter", "Ctrl+Alt+F", "Ctrl+Alt+D"]);
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
    this.L = pickLabels(opts.lang, LABELS2);
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
    this.styles = new StylesUI({ ed, app, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
    this.pictures = new PictureUI({ ed, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), after: () => this.after() });
    registerWriteCommands(this.reg, ed, app, this.ctl());
    const env = { ed, app, ctl: this.ctl(), root: this.root, styles: this.styles };
    topEl.replaceChildren();
    bottomEl.replaceChildren();
    if (opts.topbar) {
      this.bar = this.mode() === "ribbon" ? createRibbon(topEl, ribbonLayout(env, this.ctx), this.ctx) : createCompactBar(topEl, compactLayout(env, this.ctx), this.ctx);
      this.protbar = this.makeProtectedBar();
      topEl.appendChild(this.protbar);
      this.cards = new CommentCards(ed, app, this.root, () => this.after());
      this.nav = new NavPane({ ed, app, lang: opts.lang, layer: this.layer, frame: () => this.docFrame(), replace: () => this.openFind(true), after: () => this.after() });
      this.review = new ReviewPane(ed, app, { layer: this.layer, frame: () => this.leftFrame("review"), lang: opts.lang }, () => this.after());
      const pane = app.prefs.get("reviewPane");
      if (pane === "vertical" || pane === "horizontal") this.review.open(pane);
      if (app.prefs.get("navPane") === "1") this.nav.open();
      const d3 = () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
      this.ruler = new RulerUI({
        ed,
        lang: opts.lang,
        top: topEl,
        layer: this.layer,
        frame: () => this.leftFrame("ruler"),
        pageDialog: () => {
          void pageDialog(d3()).then(() => this.after());
        },
        paragraphDialog: () => {
          void paragraphDialog(d3()).then(() => this.after());
        },
        tabsDialog: () => {
          void tabsDialog(d3()).then(() => this.after());
        }
      });
      if (app.prefs.get("ruler") === "1") this.ruler.show(true);
      if (app.prefs.get("gridlines") === "1") ed.showGridlines(true);
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
    try {
      const cs = originStore.get("uw-captions");
      if (cs) ed.captionSettings = JSON.parse(cs);
    } catch {
    }
    if (!ed.hasAuthor()) {
      void Promise.resolve(hostOf(ed)?.userName?.()).then((n5) => {
        if (ed.hasAuthor()) return;
        const name = n5 || originStore.get("uw-author");
        if (name) ed.author = name;
      }, () => {
      });
    }
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
  review = null;
  nav = null;
  ruler = null;
  find = null;
  styles = null;
  pictures = null;
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
  /** Ambiente dos diálogos de Links e referências (estilo e legendas pela barra). */
  refsEnv() {
    return {
      ed: this.ed,
      app: this.app,
      layer: this.layer,
      lang: this.lang,
      flash: (m2) => this.flash(m2),
      modifyStyle: (id) => {
        void this.styles?.styleDialog("modify", id);
      },
      // rótulos/numeração/AutoLegenda: por máquina, como o Word no Normal
      saveCaptionSettings: () => originStore.set("uw-captions", JSON.stringify(this.ed.captionSettings))
    };
  }
  /** Ambiente dos diálogos do Sumário (Modificar estilo pela barra). */
  tocEnv() {
    return { ed: this.ed, layer: this.layer, lang: this.lang, flash: (m2) => this.flash(m2), modifyStyle: (id) => {
      void this.styles?.styleDialog("modify", id);
    } };
  }
  ctl() {
    const d3 = () => ({ ed: this.ed, app: this.app, layer: this.layer, lang: this.lang, state: () => this.state() });
    return {
      state: () => this.state(),
      // Localizar abre a busca do Painel de Navegação (Ctrl+F, como no Word); Substituir, a caixa flutuante
      find: (replace) => {
        if (!replace && this.nav) this.nav.open(true);
        else this.openFind(replace);
      },
      navPane: () => {
        this.nav?.toggle();
        this.review?.place();
        this.ruler?.schedule();
      },
      navPaneOpen: () => !!this.nav?.isOpen,
      ruler: () => {
        const r5 = this.ruler;
        if (!r5) return;
        r5.show(!r5.on);
        this.app.prefs.set("ruler", r5.on ? "1" : "");
      },
      rulerOn: () => !!this.ruler?.on,
      gridlines: () => {
        const on = !this.ed.gridlinesShown();
        this.ed.showGridlines(on);
        this.app.prefs.set("gridlines", on ? "1" : "");
      },
      tabsDialog: () => {
        void tabsDialog(d3()).then(() => this.after());
      },
      comment: () => {
        void commentDialog(d3()).then(() => this.after());
      },
      link: () => {
        void hyperlinkDialog(this.refsEnv()).then(() => this.after());
      },
      refsDialog: (kind) => {
        void refsDialog(this.refsEnv(), kind).then(() => this.after());
      },
      tocDialog: (kind, scope) => {
        void tocDialog(this.tocEnv(), kind, scope).then(() => this.after());
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
      columnsDialog: () => {
        void columnsDialog(d3()).then(() => this.after());
      },
      notesDialog: () => {
        void notesDialog(d3()).then(() => this.after());
      },
      convertNotesDialog: () => {
        void convertNotesDialog(d3()).then(() => this.after());
      },
      showNotes: () => {
        void showNotesDialog(d3()).then(() => this.after());
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
      trackChanges: () => {
        void (async () => {
          if (!this.ed.isTrackingChanges() && !await authorDialog(d3())) return;
          this.ed.toggleTrackChanges();
          this.flash(this.ed.isTrackingChanges() ? this.L.trackOn : this.L.trackOff);
          this.after();
        })();
      },
      reviewPane: (dir) => {
        const r5 = this.review;
        if (!r5) return;
        if (!dir && r5.dir) r5.close();
        else {
          r5.close();
          r5.open(dir ?? "vertical");
        }
        this.app.prefs.set("reviewPane", r5.dir ?? "");
        this.cards?.schedule();
      },
      reviewPaneOpen: () => this.review?.dir ?? false,
      toggleComments: () => {
        this.app.commentsVisible = !this.app.commentsVisible;
        this.app.prefs.set("comments", this.app.commentsVisible ? "1" : "0");
        this.cards?.render();
        this.review?.schedule();
      },
      requestFonts: () => this.requestFonts(),
      flash: (m2) => this.flash(m2),
      applyTheme: () => this.applyTheme(),
      stylesPane: () => this.styles?.togglePane(),
      stylesPaneOpen: () => !!this.styles?.paneOpen,
      styleInspector: () => this.styles?.toggleInspector(),
      inspectorOpen: () => !!this.styles?.inspectorOpen,
      newStyle: () => {
        void this.styles?.styleDialog("new");
      },
      modifyStyle: () => {
        const c4 = this.ed.currentStyles();
        void this.styles?.styleDialog("modify", c4.character ?? c4.paragraph);
      },
      tableDialog: (kind, arg) => {
        void tableDialog(d3(), kind, arg).then(() => this.after());
      },
      hfDialog: (kind) => {
        const dlg = { pageNumbers: pageNumberFormatDialog, dateTime: dateTimeDialog, alignTab: alignTabDialog, options: hfOptionsDialog }[kind];
        void dlg(d3()).then(() => this.after());
      },
      pageBgDialog: (kind) => {
        void (kind === "fill" ? pageFillDialog : watermarkDialog)(d3()).then(() => this.after());
      },
      pictureDialogOpen: (kind) => kind === "selection" ? !!this.pictures?.selectionOpen : kind === "alt" ? !!this.pictures?.altOpen : kind.startsWith("format:") ? !!this.pictures?.formatOpen : false,
      pictureDialog: (kind) => {
        if (kind === "alt") this.pictures?.toggleAlt();
        else if (kind === "selection") this.pictures?.toggleSelection();
        else if (kind.startsWith("format:")) this.pictures?.toggleFormat(kind.slice(7));
        else if (kind === "compress") void pictureCompressDialog(d3()).then(() => this.after());
        else void pictureLayoutDialog(d3(), kind.slice(7)).then(() => this.after());
      }
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
    this.styles?.sync();
    this.pictures?.sync();
    this.review?.place();
    this.nav?.schedule();
    this.ruler?.schedule();
  }
  /** Área do documento entre as barras (os painéis acoplam nela — Estilos à direita, sem
   *  cobrir a rolagem; Revisão à esquerda ou embaixo). */
  /** Área do documento sem os painéis da esquerda que vêm antes: a Revisão
   *  vertical fica à direita da Navegação; a régua vertical, depois das duas. */
  leftFrame(kind) {
    const r5 = this.docFrame();
    let x2 = r5.left;
    if (this.nav?.isOpen) x2 += 300;
    if (kind === "ruler" && this.review?.dir === "vertical") x2 += 300;
    return new DOMRect(x2, r5.top, Math.max(0, r5.right - x2), r5.height);
  }
  docFrame() {
    const r5 = this.ed.getBoundingClientRect();
    const top = this.topEl.getBoundingClientRect(), bot = this.bottomEl.getBoundingClientRect();
    const t5 = top.height ? top.bottom : r5.top;
    const b3 = bot.height ? bot.top : r5.bottom;
    const right = r5.left + this.ed.clientLeft + this.ed.clientWidth;
    return new DOMRect(r5.left, t5, right - r5.left, b3 - t5);
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
    this.styles?.close();
    this.bar?.destroy();
    this.cards?.destroy();
    this.review?.destroy();
    this.nav?.destroy();
    this.ruler?.destroy();
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
    const el13 = document.createElement("div");
    el13.className = "uw-protbar";
    el13.setAttribute("part", "protected-bar");
    el13.setAttribute("role", "alert");
    el13.innerHTML = `<svg class="uo-ic" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-81q-7 0-13-1t-12-3q-135-45-215-166.5T160-516v-189q0-25 14.5-45t37.5-29l240-90q14-5 28-5t28 5l240 90q23 9 37.5 29t14.5 45v189q0 143-80 264.5T505-85q-6 2-12 3t-13 1Z"/></svg>
      <span><b></b> \u2014 </span><button type="button" class="uo-pill" data-a="enableEditing"></button>`;
    el13.querySelector("b").textContent = this.L.protectedTitle;
    el13.querySelector("span").append(this.L.protectedText);
    const b3 = el13.querySelector("button");
    b3.textContent = this.L.enableEditing;
    b3.addEventListener("click", () => {
      this.app.enableEditing();
      this.after();
    });
    el13.hidden = true;
    return el13;
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
    await import("./src-O6MI43LO.js");
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
    for (const t5 of ["uw-hfmode", "uw-cellmode", "uw-tbmode", "uw-protected", "uw-ready", "uw-styles-change"]) {
      ed.addEventListener(t5, resync, { signal });
    }
    let tick = false;
    ed.addEventListener("scroll", () => {
      this.ruler?.schedule();
    }, { signal, passive: true });
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
      for (const t5 of ["uw-comments-changed", "uw-change", "uw-zoom", "uw-ready", "uw-protected", "uw-markup", "uw-revisions-changed"]) ed.addEventListener(t5, () => cards.schedule(), { signal });
      const review = this.review;
      if (review) for (const t5 of ["uw-comments-changed", "uw-change", "uw-ready", "uw-protected", "uw-markup", "uw-revisions-changed", "uw-track-changes"]) ed.addEventListener(t5, () => review.schedule(), { signal });
      const nav = this.nav;
      if (nav) for (const t5 of ["uw-change", "uw-ready", "uw-protected", "uw-styles-change", "uw-markup"]) ed.addEventListener(t5, () => nav.schedule(true), { signal });
      const cro = new ResizeObserver(() => cards.schedule());
      cro.observe(ed);
      signal.addEventListener("abort", () => cro.disconnect());
      ed.addEventListener("uw-comment-click", ((e6) => {
        this.app.activeCommentIds = e6.detail.ids;
        cards.render();
        this.sync();
      }), { signal });
    }
    const pro = new ResizeObserver(() => {
      this.review?.place();
      this.styles?.sync();
      this.nav?.place();
      this.ruler?.schedule();
    });
    for (const t5 of [this.topEl, this.bottomEl, ed]) pro.observe(t5);
    signal.addEventListener("abort", () => pro.disconnect());
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
    ed.addEventListener("uw-toc-update", ((e6) => {
      e6.preventDefault();
      void tocDialog(this.tocEnv(), "update", e6.detail.scope).then(() => this.after());
    }), { signal });
    ed.addEventListener("uw-toc-menu", ((e6) => {
      const env = { ed, app: this.app, ctl: this.ctl(), root: this.root, ...this.styles ? { styles: this.styles } : {} };
      openMenu(tocGalleryMenu(env, this.ctx), { x: e6.detail.x, y: e6.detail.y }, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
    }), { signal });
    ed.addEventListener("contextmenu", (e6) => {
      if (e6.composedPath().some((n5) => n5 === this.topEl || n5 === this.bottomEl || n5 === this.layer)) return;
      if (this.app.comparing) return;
      e6.preventDefault();
      const at = { x: e6.clientX, y: e6.clientY };
      if (typeof ed.selectedImage === "function" && ed.selectedImage()) {
        openMenu(pictureContextItems(), at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
        return;
      }
      const shp = typeof ed.selectedShape === "function" ? ed.selectedShape() : null;
      if (shp && !shp.editingText) {
        openMenu(shapeContextItems(), at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
        return;
      }
      const items = [
        "cut",
        "copy",
        "paste",
        "pastePlain",
        "-",
        ...ed.getTableState() ? tableContextItems() : [],
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
      const noteItems = ed.editingNote() ? ["note:goRef", "note:toEndnote", "note:toFootnote", "dlg:notes", "-"] : [];
      const open = (pre) => {
        openMenu([...pre, ...noteItems, ...items], at, { lang: this.lang, registry: this.reg, layer: this.layer, onClose: () => this.after() });
      };
      const rv = typeof ed.revisionAtCaret === "function" ? ed.revisionAtCaret() : null;
      const revItems = rv ? (() => {
        const k2 = rv.move ? this.L.kMove : rv.kind === "insert" ? this.L.kInsertion : rv.kind === "delete" ? this.L.kDeletion : this.L.kFormat;
        return [
          { icon: "check_circle", label: this.L.acceptAt(k2), onClick: () => {
            ed.acceptRevisionAt(rv.index);
            this.after();
          } },
          { icon: "cancel", label: this.L.rejectAt(k2), onClick: () => {
            ed.rejectRevisionAt(rv.index);
            this.after();
          } },
          "-"
        ];
      })() : [];
      const m2 = ed.spellingAtCaret();
      if (!m2) {
        open(revItems);
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
          "-",
          ...revItems
        ]);
      }, () => open(revItems));
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
