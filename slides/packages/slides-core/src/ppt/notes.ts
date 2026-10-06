/**
 * Notas do apresentador (NotesContainer) → `ppt/notesSlides/notesSlideN.xml`
 * + um `notesMaster` mínimo. O viewer não desenha notas; quem as consome é o
 * exportador (Markdown/HTML lê o texto do placeholder `body` da notesSlide).
 *
 * No .ppt a página de notas tem os placeholders "imagem do slide" (sldImg) e
 * "corpo" (body, texto tipo 2 = notas) — muitas vezes com âncora indefinida
 * (0x80000001 em todos os campos: herdar do mestre das notas). Por isso as
 * formas saem com `<p:spPr/>` (herança do notesMaster) e o texto com
 * propriedades explícitas, como nos slides.
 */
import type { PptDocument, PptSlide } from './ppt-reader.js';
import type { OAShape } from './officeart.js';
import { readClientTextbox } from './text.js';
import { paragraphsXml, emu, type TextConvCtx } from './textconv.js';
import { placeholderType } from './shapeconv.js';
import { el, XML_DECL, NS } from './xmlw.js';

const NS_ATTRS = { 'xmlns:a': NS.a, 'xmlns:r': NS.r, 'xmlns:p': NS.p };
const SPTREE_HEAD = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

/** Âncora "indefinida" do binário (herda do mestre das notas). */
const UNDEF = -2147483647; // 0x80000001 como i32

function validAnchor(sh: OAShape): boolean {
  const a = sh.anchor;
  return !!a && a.l !== UNDEF && a.t !== UNDEF && a.r > a.l && a.b > a.t;
}

/** Formas (achatando grupos) de um desenho. */
function flatShapes(s: PptSlide | undefined): OAShape[] {
  const out: OAShape[] = [];
  const walk = (sh: OAShape): void => { if (sh.children) sh.children.forEach(walk); else out.push(sh); };
  (s?.drawing.root?.children ?? []).forEach(walk);
  return out;
}

/** Notas de um slide (NotesAtom.slideIdRef = slideId do slide). */
export function notesFor(doc: PptDocument, slide: PptSlide): PptSlide | undefined {
  return doc.notes.find((n) => n.slideIdRef === slide.slideId);
}

/** `<p:notes>` com o texto do corpo; undefined quando não há texto. */
export function notesSlideXml(notes: PptSlide, ctx: TextConvCtx): string | undefined {
  let body = '';
  for (const sh of flatShapes(notes)) {
    if (placeholderType(sh) !== 'body' || !sh.clientTextbox) continue;
    const ct = readClientTextbox(sh.clientTextbox);
    const block = ct.block ?? (ct.outlineRef !== undefined ? notes.outline[ct.outlineRef] : undefined);
    if (block && block.text.trim()) body += paragraphsXml(block, ctx);
  }
  if (!body) return undefined;
  const ph = (id: number, name: string, type: string, idx?: number, txBody = ''): string =>
    el('p:sp', {}, el('p:nvSpPr', {}, el('p:cNvPr', { id, name }) + '<p:cNvSpPr/>' + el('p:nvPr', {}, el('p:ph', { type, idx }))) + '<p:spPr/>' + txBody);
  const tree = ph(2, 'Imagem do Slide', 'sldImg') +
    ph(3, 'Anotações', 'body', 1, el('p:txBody', {}, '<a:bodyPr/><a:lstStyle/>' + body));
  return XML_DECL + el('p:notes', NS_ATTRS,
    el('p:cSld', {}, el('p:spTree', {}, SPTREE_HEAD + tree)) + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>');
}

/**
 * `<p:notesMaster>` com os placeholders sldImg/body nas posições do mestre de
 * notas do .ppt (ou no layout padrão do PowerPoint: imagem na metade de cima,
 * corpo embaixo).
 */
export function notesMasterXml(doc: PptDocument): string {
  const W = doc.notesW, H = doc.notesH;
  const rect = (type: string, dflt: [number, number, number, number]): [number, number, number, number] => {
    const sh = flatShapes(doc.notesMaster).find((s) => placeholderType(s) === type && validAnchor(s));
    const a = sh?.anchor;
    return a ? [a.l, a.t, a.r - a.l, a.b - a.t] : dflt;
  };
  const img = rect('sldImg', [W * 0.15, H * 0.08, W * 0.7, H * 0.39]);
  const body = rect('body', [W * 0.1, H * 0.5, W * 0.8, H * 0.39]);
  const sp = (id: number, name: string, type: string, r: [number, number, number, number], idx?: number, txt = false): string =>
    el('p:sp', {},
      el('p:nvSpPr', {}, el('p:cNvPr', { id, name }) + '<p:cNvSpPr/>' + el('p:nvPr', {}, el('p:ph', { type, idx }))) +
      el('p:spPr', {}, el('a:xfrm', {}, el('a:off', { x: emu(r[0]), y: emu(r[1]) }) + el('a:ext', { cx: emu(r[2]), cy: emu(r[3]) })) +
        '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>') +
      (txt ? '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="pt-BR"/></a:p></p:txBody>' : ''));
  return XML_DECL + el('p:notesMaster', NS_ATTRS,
    el('p:cSld', {}, el('p:spTree', {}, SPTREE_HEAD + sp(2, 'Imagem do Slide', 'sldImg', img) + sp(3, 'Anotações', 'body', body, 1, true))) +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>');
}
