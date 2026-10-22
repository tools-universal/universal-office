// Diálogos e painéis de IMAGEM das barras do Write: Layout (Posição, Quebra
// Automática de Texto, Tamanho) e o painel Texto Alt. Sobre o openDialog /
// openPane de @universal-office/ui; textos { en, pt } (inglês por padrão);
// medidas em cm, como o Word pt-BR.
import { dialogTabs, openDialog, openPane, paneOpen, pickLabels, type UiLang } from '@universal-office/ui';
import type { PicWrapKind } from '@universal-office/docx-core';
import type { ImageLayoutInput, UniversalWriteElement } from './universal-write.js';
import type { DialogEnv } from './chrome-dialogs.js';

type Props<K extends keyof HTMLElementTagNameMap> = Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { style?: string };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Props<K> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const { style, ...rest } = props;
  const e = Object.assign(document.createElement(tag), rest);
  if (style) e.style.cssText = style;
  e.append(...kids);
  return e;
};
const tr = (lang: UiLang, en: string, pt: string): string => pickLabels(lang, { en, pt });
const select = (name: string, opts: readonly (readonly [string, string])[], value: string): HTMLSelectElement => {
  const s = el('select', { name });
  for (const [v, t] of opts) s.append(el('option', { value: v, textContent: t }));
  s.value = opts.some(([v]) => v === value) ? value : opts[0]?.[0] ?? '';
  return s;
};
const check = (name: string, label: string, on: boolean): { el: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'checkbox', name, checked: on });
  return { el: el('label', { className: 'uo-check' }, input, label), input };
};
/** cm ↔ pontos (2 casas, vírgula no português). */
const cmText = (lang: UiLang, pt: number): string => `${(Math.round((pt / 72) * 254) / 100).toFixed(2).replace('.', tr(lang, '.', ','))} cm`;
const ptOf = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? (n / 2.54) * 72 : undefined;
};
const numOf = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};
const cmInput = (lang: UiLang, name: string, pt: number): HTMLInputElement => el('input', { type: 'text', name, inputMode: 'decimal', value: cmText(lang, pt), style: 'width:92px' });
const row = (...kids: (Node | string)[]): HTMLElement => el('div', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' }, ...kids);
const section = (title: string, ...kids: Node[]): HTMLElement => el('fieldset', { style: 'display:flex;flex-direction:column;gap:8px;border:1px solid var(--uo-outline-variant,#ccc);border-radius:8px;padding:8px 12px' }, el('legend', { textContent: title }), ...kids);
const radio = (name: string, value: string, label: string, on: boolean): { el: HTMLLabelElement; input: HTMLInputElement } => {
  const input = el('input', { type: 'radio', name, value, checked: on });
  return { el: el('label', { className: 'uo-check' }, input, label), input };
};

const H_REFS = (lang: UiLang): [string, string][] => [
  ['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')], ['column', tr(lang, 'Column', 'Coluna')], ['character', tr(lang, 'Character', 'Caractere')],
  ['leftMargin', tr(lang, 'Left Margin', 'Margem Esquerda')], ['rightMargin', tr(lang, 'Right Margin', 'Margem Direita')],
  ['insideMargin', tr(lang, 'Inside Margin', 'Margem Interna')], ['outsideMargin', tr(lang, 'Outside Margin', 'Margem Externa')],
];
const V_REFS = (lang: UiLang): [string, string][] => [
  ['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')], ['paragraph', tr(lang, 'Paragraph', 'Parágrafo')], ['line', tr(lang, 'Line', 'Linha')],
  ['topMargin', tr(lang, 'Top Margin', 'Margem Superior')], ['bottomMargin', tr(lang, 'Bottom Margin', 'Margem Inferior')],
  ['insideMargin', tr(lang, 'Inside Margin', 'Margem Interna')], ['outsideMargin', tr(lang, 'Outside Margin', 'Margem Externa')],
];
const WRAP_STYLES = (lang: UiLang): [PicWrapKind, string][] => [
  ['inline', tr(lang, 'In line with text', 'Alinhado ao texto')], ['square', tr(lang, 'Square', 'Quadrado')], ['tight', tr(lang, 'Tight', 'Comprimido')],
  ['through', tr(lang, 'Through', 'Através')], ['topAndBottom', tr(lang, 'Top and bottom', 'Superior e inferior')],
  ['behind', tr(lang, 'Behind text', 'Atrás do texto')], ['front', tr(lang, 'In front of text', 'Na frente do texto')],
];

/** Diálogo Layout: Posição, Quebra Automática de Texto e Tamanho. */
export async function pictureLayoutDialog(env: DialogEnv, tab: 'position' | 'wrap' | 'size'): Promise<void> {
  const { ed, lang } = env;
  const st = ed.selectedImage();
  if (!st) return;
  const f = st.format;
  const pt = (emu: number): number => emu / 12700;
  const anchored = !f.inline;

  // ── Posição ──
  const ph = f.posH, pv = f.posV;
  const hMode = !ph ? 'abs' : ph.align === 'inside' || ph.align === 'outside' ? 'book' : ph.align !== undefined ? 'align' : ph.pct !== undefined ? 'rel' : 'abs';
  const vMode = !pv ? 'abs' : pv.align !== undefined ? 'align' : pv.pct !== undefined ? 'rel' : 'abs';
  const hAlign = select('hAlign', [['left', tr(lang, 'Left', 'Esquerda')], ['center', tr(lang, 'Centered', 'Centralizado')], ['right', tr(lang, 'Right', 'Direita')]], ph?.align ?? 'left');
  const hAlignRef = select('hAlignRef', H_REFS(lang), ph?.relativeFrom ?? 'column');
  const hBook = select('hBook', [['inside', tr(lang, 'Inside', 'Interna')], ['outside', tr(lang, 'Outside', 'Externa')]], ph?.align ?? 'inside');
  const hBookRef = select('hBookRef', [['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')]], ph?.relativeFrom ?? 'margin');
  const hAbs = cmInput(lang, 'hAbs', pt(ph?.offset ?? 0));
  const hAbsRef = select('hAbsRef', H_REFS(lang), ph?.relativeFrom ?? 'column');
  const hRel = el('input', { type: 'text', name: 'hRel', value: `${(ph?.pct ?? 0) / 1000}%`, style: 'width:72px' });
  const hRelRef = select('hRelRef', H_REFS(lang).filter(([k]) => k !== 'column' && k !== 'character'), ph?.relativeFrom ?? 'margin');
  const vAlign = select('vAlign', [['top', tr(lang, 'Top', 'Superior')], ['center', tr(lang, 'Centered', 'Centralizado')], ['bottom', tr(lang, 'Bottom', 'Inferior')], ['inside', tr(lang, 'Inside', 'Interna')], ['outside', tr(lang, 'Outside', 'Externa')]], pv?.align ?? 'top');
  const vAlignRef = select('vAlignRef', V_REFS(lang).filter(([k]) => k !== 'paragraph'), pv?.relativeFrom ?? 'margin');
  const vAbs = cmInput(lang, 'vAbs', pt(pv?.offset ?? 0));
  const vAbsRef = select('vAbsRef', V_REFS(lang), pv?.relativeFrom ?? 'paragraph');
  const vRel = el('input', { type: 'text', name: 'vRel', value: `${(pv?.pct ?? 0) / 1000}%`, style: 'width:72px' });
  const vRelRef = select('vRelRef', V_REFS(lang).filter(([k]) => k !== 'paragraph' && k !== 'line'), pv?.relativeFrom ?? 'margin');
  const hR = { align: radio('h', 'align', tr(lang, 'Alignment', 'Alinhamento'), hMode === 'align'), book: radio('h', 'book', tr(lang, 'Book layout', 'Layout do livro'), hMode === 'book'), abs: radio('h', 'abs', tr(lang, 'Absolute position', 'Posição absoluta'), hMode === 'abs'), rel: radio('h', 'rel', tr(lang, 'Relative position', 'Posição relativa'), hMode === 'rel') };
  const vR = { align: radio('v', 'align', tr(lang, 'Alignment', 'Alinhamento'), vMode === 'align'), abs: radio('v', 'abs', tr(lang, 'Absolute position', 'Posição absoluta'), vMode === 'abs'), rel: radio('v', 'rel', tr(lang, 'Relative position', 'Posição relativa'), vMode === 'rel') };
  const moveWith = check('moveWith', tr(lang, 'Move object with text', 'Mover objeto com texto'), st.moveWithText);
  const lockAnchor = check('lockAnchor', tr(lang, 'Lock anchor', 'Bloquear âncora'), f.locked);
  const overlap = check('overlap', tr(lang, 'Allow overlap', 'Permitir sobreposição'), f.allowOverlap);
  const inCell = check('inCell', tr(lang, 'Layout in table cell', 'Layout na célula da tabela'), f.layoutInCell);
  const rel = tr(lang, 'relative to', 'relativo a');
  const posBody = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    section(tr(lang, 'Horizontal', 'Horizontal'),
      row(hR.align.el, hAlign, rel, hAlignRef),
      row(hR.book.el, hBook, tr(lang, 'of', 'de'), hBookRef),
      row(hR.abs.el, hAbs, tr(lang, 'to the right of', 'à direita de'), hAbsRef),
      row(hR.rel.el, hRel, rel, hRelRef)),
    section(tr(lang, 'Vertical', 'Vertical'),
      row(vR.align.el, vAlign, rel, vAlignRef),
      row(vR.abs.el, vAbs, tr(lang, 'below', 'abaixo de'), vAbsRef),
      row(vR.rel.el, vRel, rel, vRelRef)),
    section(tr(lang, 'Options', 'Opções'), row(moveWith.el, overlap.el), row(lockAnchor.el, inCell.el)));
  // posição só vale para flutuante (como no Word, o resto fica desabilitado)
  for (const i of posBody.querySelectorAll('input,select')) (i as HTMLInputElement).disabled = !anchored;

  // ── Quebra Automática de Texto ──
  const wrapR = WRAP_STYLES(lang).map(([k, t]) => ({ k, ...radio('wrap', k, t, f.wrap === k) }));
  const sides = ([['bothSides', tr(lang, 'Both sides', 'Ambos os lados')], ['left', tr(lang, 'Left only', 'Somente à esquerda')], ['right', tr(lang, 'Right only', 'Somente à direita')], ['largest', tr(lang, 'Largest only', 'Somente no maior')]] as const)
    .map(([k, t]) => ({ k, ...radio('side', k, t, f.wrapText === k) }));
  const dT = cmInput(lang, 'dT', pt(f.dist.t)), dB = cmInput(lang, 'dB', pt(f.dist.b)), dL = cmInput(lang, 'dL', pt(f.dist.l)), dR = cmInput(lang, 'dR', pt(f.dist.r));
  const syncWrap = (): void => {
    const w = wrapR.find((r) => r.input.checked)?.k ?? f.wrap;
    const sideOk = w === 'square' || w === 'tight' || w === 'through';
    for (const s of sides) s.input.disabled = !sideOk;
    dT.disabled = dB.disabled = !(w === 'square' || w === 'topAndBottom');
    dL.disabled = dR.disabled = !sideOk;
  };
  for (const r of wrapR) r.input.addEventListener('change', syncWrap);
  syncWrap();
  const wrapBody = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    section(tr(lang, 'Wrapping style', 'Estilo de quebra automática'), el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px' }, ...wrapR.map((r) => r.el))),
    section(tr(lang, 'Wrap text', 'Quebra automática de texto'), row(...sides.map((s) => s.el))),
    section(tr(lang, 'Distance from text', 'Distância do texto'),
      row(tr(lang, 'Top', 'Superior'), dT, tr(lang, 'Left', 'Esquerda'), dL),
      row(tr(lang, 'Bottom', 'Inferior'), dB, tr(lang, 'Right', 'Direita'), dR)));

  // ── Tamanho ──
  const nat = st.naturalPt;
  const hAbsSz = cmInput(lang, 'hAbsSz', st.heightPt), wAbsSz = cmInput(lang, 'wAbsSz', st.widthPt);
  const relV = f.sizeRelV?.pct ? f.sizeRelV : null, relH = f.sizeRelH?.pct ? f.sizeRelH : null;
  const hRelSz = el('input', { type: 'text', name: 'hRelSz', value: `${(relV?.pct ?? 0) / 1000}%`, style: 'width:72px' });
  const wRelSz = el('input', { type: 'text', name: 'wRelSz', value: `${(relH?.pct ?? 0) / 1000}%`, style: 'width:72px' });
  const sizeRefsV: [string, string][] = [['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')], ['topMargin', tr(lang, 'Top Margin', 'Margem Superior')], ['bottomMargin', tr(lang, 'Bottom Margin', 'Margem Inferior')], ['insideMargin', tr(lang, 'Inside Margin', 'Margem Interna')], ['outsideMargin', tr(lang, 'Outside Margin', 'Margem Externa')]];
  const sizeRefsH: [string, string][] = [['margin', tr(lang, 'Margin', 'Margem')], ['page', tr(lang, 'Page', 'Página')], ['leftMargin', tr(lang, 'Left Margin', 'Margem Esquerda')], ['rightMargin', tr(lang, 'Right Margin', 'Margem Direita')], ['insideMargin', tr(lang, 'Inside Margin', 'Margem Interna')], ['outsideMargin', tr(lang, 'Outside Margin', 'Margem Externa')]];
  const hRelRefSz = select('hRelRefSz', sizeRefsV, relV?.relativeFrom ?? 'margin');
  const wRelRefSz = select('wRelRefSz', sizeRefsH, relH?.relativeFrom ?? 'margin');
  const szH = { abs: radio('szh', 'abs', tr(lang, 'Absolute', 'Absoluta'), !relV), rel: radio('szh', 'rel', tr(lang, 'Relative', 'Relativa'), !!relV) };
  const szW = { abs: radio('szw', 'abs', tr(lang, 'Absolute', 'Absoluta'), !relH), rel: radio('szw', 'rel', tr(lang, 'Relative', 'Relativa'), !!relH) };
  const rotIn = el('input', { type: 'number', name: 'rot', min: '-3600', max: '3600', step: '1', value: String(Math.round(st.rotation * 10) / 10), style: 'width:80px' });
  const relOrig = check('relOrig', tr(lang, 'Relative to original picture size', 'Relativo ao tamanho original da imagem'), !!nat);
  const lockAsp = check('lockAsp', tr(lang, 'Lock aspect ratio', 'Bloquear proporção'), st.lockAspect);
  const base = (): { w: number; h: number } => (relOrig.input.checked && nat ? nat : { w: st.widthPt, h: st.heightPt });
  const scH = el('input', { type: 'text', name: 'scH', value: '', style: 'width:72px' });
  const scW = el('input', { type: 'text', name: 'scW', value: '', style: 'width:72px' });
  const showScale = (): void => {
    const b = base();
    const h = ptOf(hAbsSz.value) ?? st.heightPt, w = ptOf(wAbsSz.value) ?? st.widthPt;
    scH.value = `${Math.round((h / b.h) * 100)}%`;
    scW.value = `${Math.round((w / b.w) * 100)}%`;
  };
  showScale();
  relOrig.input.addEventListener('change', showScale);
  // proporção travada: mexer numa medida acompanha a outra
  hAbsSz.addEventListener('change', () => {
    const h = ptOf(hAbsSz.value);
    if (h !== undefined && lockAsp.input.checked && st.heightPt) wAbsSz.value = cmText(lang, (st.widthPt * h) / st.heightPt);
    showScale();
  });
  wAbsSz.addEventListener('change', () => {
    const w = ptOf(wAbsSz.value);
    if (w !== undefined && lockAsp.input.checked && st.widthPt) hAbsSz.value = cmText(lang, (st.heightPt * w) / st.widthPt);
    showScale();
  });
  const fromScale = (which: 'h' | 'w'): void => {
    const b = base();
    const p = numOf((which === 'h' ? scH : scW).value);
    if (p === undefined) return;
    if (which === 'h' || lockAsp.input.checked) hAbsSz.value = cmText(lang, (b.h * p) / 100);
    if (which === 'w' || lockAsp.input.checked) wAbsSz.value = cmText(lang, (b.w * p) / 100);
    showScale();
  };
  scH.addEventListener('change', () => fromScale('h'));
  scW.addEventListener('change', () => fromScale('w'));
  const reset = el('button', { type: 'button', className: 'uo-btn', textContent: tr(lang, 'Reset', 'Redefinir'), disabled: !nat });
  reset.addEventListener('click', () => {
    if (!nat) return;
    hAbsSz.value = cmText(lang, nat.h); wAbsSz.value = cmText(lang, nat.w); rotIn.value = '0';
    szH.abs.input.checked = szW.abs.input.checked = true;
    showScale();
  });
  for (const i of [hRelSz, hRelRefSz, wRelSz, wRelRefSz, szH.rel.input, szW.rel.input]) (i as HTMLInputElement).disabled = !anchored;
  const sizeBody = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    section(tr(lang, 'Height', 'Altura'), row(szH.abs.el, hAbsSz), row(szH.rel.el, hRelSz, rel, hRelRefSz)),
    section(tr(lang, 'Width', 'Largura'), row(szW.abs.el, wAbsSz), row(szW.rel.el, wRelSz, rel, wRelRefSz)),
    section(tr(lang, 'Rotate', 'Girar'), row(tr(lang, 'Rotation:', 'Rotação:'), rotIn, '°')),
    section(tr(lang, 'Scale', 'Escala'), row(tr(lang, 'Height:', 'Altura:'), scH, tr(lang, 'Width:', 'Largura:'), scW), lockAsp.el, relOrig.el),
    section(tr(lang, 'Original size', 'Tamanho original'), row(
      el('span', { textContent: `${tr(lang, 'Height:', 'Altura:')} ${nat ? cmText(lang, nat.h) : '—'}` }),
      el('span', { textContent: `${tr(lang, 'Width:', 'Largura:')} ${nat ? cmText(lang, nat.w) : '—'}` }), reset)));

  const tabs = dialogTabs([
    { id: 'position', label: tr(lang, 'Position', 'Posição'), body: posBody },
    { id: 'wrap', label: tr(lang, 'Text Wrapping', 'Quebra Automática de Texto'), body: wrapBody },
    { id: 'size', label: tr(lang, 'Size', 'Tamanho'), body: sizeBody },
  ], tab);
  const L = env.app.ui!.L;
  const h = openDialog({ title: tr(lang, 'Layout', 'Layout'), body: tabs.el, layer: env.layer, lang, width: 560,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;

  const o: ImageLayoutInput = {};
  const wrap = wrapR.find((r) => r.input.checked)?.k;
  if (wrap && wrap !== f.wrap) o.wrap = wrap;
  const willFloat = (wrap ?? f.wrap) !== 'inline';
  if (willFloat) {
    const side = sides.find((s) => s.input.checked)?.k;
    if (side && side !== f.wrapText) o.wrapText = side;
    const dist: NonNullable<ImageLayoutInput['distPt']> = {};
    for (const [k, inp, cur] of [['t', dT, f.dist.t], ['b', dB, f.dist.b], ['l', dL, f.dist.l], ['r', dR, f.dist.r]] as const) {
      const v = ptOf(inp.value);
      if (v !== undefined && Math.abs(v - cur / 12700) > 0.01) dist[k] = v;
    }
    if (Object.keys(dist).length) o.distPt = dist;
  }
  if (anchored) {
    const hm = Object.entries(hR).find(([, r]) => r.input.checked)?.[0];
    if (hm === 'align') o.posH = { relativeFrom: hAlignRef.value, align: hAlign.value };
    else if (hm === 'book') o.posH = { relativeFrom: hBookRef.value, align: hBook.value };
    else if (hm === 'rel') o.posH = { relativeFrom: hRelRef.value, pct: numOf(hRel.value) ?? 0 };
    else o.posH = { relativeFrom: hAbsRef.value, offsetPt: ptOf(hAbs.value) ?? 0 };
    const vm = Object.entries(vR).find(([, r]) => r.input.checked)?.[0];
    if (vm === 'align') o.posV = { relativeFrom: vAlignRef.value, align: vAlign.value };
    else if (vm === 'rel') o.posV = { relativeFrom: vRelRef.value, pct: numOf(vRel.value) ?? 0 };
    else o.posV = { relativeFrom: vAbsRef.value, offsetPt: ptOf(vAbs.value) ?? 0 };
    o.lockAnchor = lockAnchor.input.checked;
    o.allowOverlap = overlap.input.checked;
    o.layoutInCell = inCell.input.checked;
    if (moveWith.input.checked !== st.moveWithText && vm === 'abs') o.posV = { relativeFrom: moveWith.input.checked ? 'paragraph' : 'page', offsetPt: ptOf(vAbs.value) ?? 0 };
    o.relHeight = szH.rel.input.checked ? { relativeFrom: hRelRefSz.value, pct: numOf(hRelSz.value) ?? 0 } : relV ? null : undefined;
    o.relWidth = szW.rel.input.checked ? { relativeFrom: wRelRefSz.value, pct: numOf(wRelSz.value) ?? 0 } : relH ? null : undefined;
    if (o.relHeight === undefined) delete o.relHeight;
    if (o.relWidth === undefined) delete o.relWidth;
  }
  const hh = ptOf(hAbsSz.value), ww = ptOf(wAbsSz.value);
  if (hh !== undefined && Math.abs(hh - st.heightPt) > 0.01) o.heightPt = hh;
  if (ww !== undefined && Math.abs(ww - st.widthPt) > 0.01) o.widthPt = ww;
  if (lockAsp.input.checked !== st.lockAspect) o.lockAspect = lockAsp.input.checked;
  const rot = numOf(rotIn.value);
  if (rot !== undefined && Math.abs(rot - st.rotation) > 0.01) o.rotation = rot;
  ed.setImageLayout(o);
}

/** Compactar Imagens: opções e resolução (a "padrão" do documento é 220 ppi;
 *  Alta fidelidade não reamostra — só exclui o que está cortado). */
export async function pictureCompressDialog(env: DialogEnv): Promise<void> {
  const { ed, lang } = env;
  if (!ed.selectedImage()) return;
  const only = check('only', tr(lang, 'Apply only to this picture', 'Aplicar somente a esta imagem'), true);
  const crop = check('crop', tr(lang, 'Delete cropped areas of pictures', 'Excluir áreas cortadas de imagens'), true);
  const RES: [string, number, string, string][] = [
    ['hifi', Infinity, 'High fidelity: preserves quality of the original picture', 'Alta fidelidade: preserva a qualidade da imagem original'],
    ['hd', 330, 'HD (330 ppi): good quality for high-definition (HD) displays', 'HD (330 ppi): boa qualidade para monitores de alta definição (HD)'],
    ['print', 220, 'Print (220 ppi): excellent quality on most printers and screens', 'Impressão (220 ppi): excelente qualidade na maioria das impressoras e telas'],
    ['web', 150, 'Web (150 ppi): good for web pages and projectors', 'Web (150 ppi): bom para páginas da Web e projetores'],
    ['email', 96, 'E-mail (96 ppi): minimize document size for sharing', 'Email (96 ppi): minimizar o tamanho do documento para compartilhamento'],
    ['default', 220, 'Use default resolution', 'Usar a resolução padrão'],
  ];
  const res = RES.map(([k, ppi, en, pt]) => ({ ppi, ...radio('res', k, tr(lang, en, pt), k === 'default') }));
  const body = el('div', { style: 'display:flex;flex-direction:column;gap:12px' },
    section(tr(lang, 'Compression options:', 'Opções de compactação:'), only.el, crop.el),
    section(tr(lang, 'Resolution:', 'Resolução:'), ...res.map((r) => r.el)));
  const L = env.app.ui!.L;
  const h = openDialog({ title: tr(lang, 'Compress Pictures', 'Compactar Imagens'), body, layer: env.layer, lang, width: 480,
    actions: [{ id: 'cancel', label: L.cancel }, { id: 'ok', label: 'OK', primary: true }] });
  if ((await h.result) !== 'ok') return;
  const ppi = res.find((r) => r.input.checked)?.ppi ?? 220;
  await ed.compressImages({ ppi, deleteCropped: crop.input.checked, all: !only.input.checked });
}

export interface PictureUIEnv { ed: UniversalWriteElement; lang: UiLang; layer: HTMLElement; frame: () => DOMRect; after: () => void }

/** Painéis da imagem (Texto Alt; acompanham a imagem selecionada pelo sync da barra). */
export class PictureUI {
  private alt: { sync(): void } | null = null;
  constructor(private readonly env: PictureUIEnv) {}

  get altOpen(): boolean { return !!this.alt; }

  sync(): void { this.alt?.sync(); }

  /** Painel Texto Alt: descrição + "Marcar como decorativa". */
  toggleAlt(): void {
    const { ed, lang } = this.env;
    const cur = paneOpen('pic-alt');
    if (cur) { cur.close(); return; }
    const intro = el('p', { textContent: tr(lang, 'How would you describe this object and its context to someone who is blind or has low vision?', 'Como você descreveria este objeto e seu contexto para alguém que é cego ou tem baixa visão?'), style: 'margin:0 0 8px;font-size:13px' });
    const text = el('textarea', { rows: 6, style: 'width:100%;box-sizing:border-box;resize:vertical' });
    text.dataset['a'] = 'pic:alt:text';
    const deco = check('decorative', tr(lang, 'Mark as decorative', 'Marcar como decorativa'), false);
    const note = el('p', { textContent: tr(lang, 'Decorative objects add visual interest but aren’t informative (e.g., stylistic borders). People using screen readers won’t hear these.', 'Objetos decorativos acrescentam interesse visual, mas não são informativos (por exemplo, bordas estilísticas). Quem usa leitor de tela não os ouvirá.'), style: 'margin:4px 0 0;font-size:12px;opacity:.75' });
    const empty = el('p', { textContent: tr(lang, 'Select a picture to add alt text.', 'Selecione uma imagem para adicionar o texto alt.'), style: 'margin:0;font-size:13px;opacity:.75' });
    const body = el('div', { style: 'display:flex;flex-direction:column;gap:8px;padding:4px' }, intro, text, deco.el, note, empty);
    let last: object | null = null;
    const sync = (): void => {
      const st = ed.selectedImage();
      empty.hidden = !!st;
      intro.hidden = text.hidden = deco.el.hidden = note.hidden = !st;
      const off = !st || ed.isProtected();
      deco.input.disabled = off;
      const key = st?.format ?? null;
      const focused = document.activeElement === text || ed.shadowRoot?.activeElement === text;
      if (key !== last && !focused) {
        last = key;
        text.value = st?.altText ?? '';
        deco.input.checked = !!st?.decorative;
      }
      text.disabled = off || deco.input.checked;
    };
    text.addEventListener('change', () => { ed.setImageAltText({ text: text.value }); });
    deco.input.addEventListener('change', () => { ed.setImageAltText({ decorative: deco.input.checked }); sync(); });
    openPane({
      id: 'pic-alt', title: { en: 'Alt Text', pt: 'Texto Alt' }, lang, layer: this.env.layer, frame: this.env.frame, width: 300, body,
      onClose: () => { this.alt = null; ed.classList.remove('uw-has-pane'); this.env.after(); },
    });
    ed.classList.add('uw-has-pane');
    this.alt = { sync };
    sync();
  }
}
