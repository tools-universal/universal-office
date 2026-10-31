/**
 * Base compartilhada pelos exportadores de slides: carregamento do deck
 * (bytes .pptx → Presentation + Slide[] com a cascata de estilos JÁ resolvida
 * pelo `readSlide` da spec 03), notas do apresentador (parte notesSlide),
 * título por slide e helpers de texto/base64.
 *
 * Este módulo é PURO: sem fs/path/DOM. Entrada Uint8Array, saída dados.
 */
import {
  PptxPackage, readPresentation, readSlide, parseXml, childElements, firstChild, descend, textContent,
  type Presentation, type Slide, type Shape, type TextBody, type Paragraph, type ImageRef, type XmlElement,
} from '@universal-office/slides-processing';

/** Slide carregado + notas do apresentador (parágrafos; vazio quando não há). */
export interface DeckSlide {
  slide: Slide;
  notes: string[];
}

/** Deck inteiro carregado (uma leitura, vários exportadores). */
export interface Deck {
  pkg: PptxPackage;
  pres: Presentation;
  slides: DeckSlide[];
}

/** Carrega o deck a partir dos bytes .pptx. Slides ilegíveis viram vazios. */
export function loadDeck(bytes: Uint8Array): Deck {
  const pkg = PptxPackage.load(bytes);
  const pres = readPresentation(pkg);
  const slides: DeckSlide[] = [];
  for (const ref of pres.slides) {
    if (!ref.target) continue;
    let slide: Slide;
    try { slide = readSlide(pkg, ref.target); }
    catch { slide = { shapes: [] }; }
    slides.push({ slide, notes: readNotes(pkg, ref.target) });
  }
  return { pkg, pres, slides };
}

/** Caminho do .rels de uma parte (ex.: ppt/slides/slide1.xml → ppt/slides/_rels/slide1.xml.rels). */
function relsPathFor(part: string): string {
  const slash = part.lastIndexOf('/');
  return `${part.slice(0, slash)}/_rels/${part.slice(slash + 1)}.rels`;
}

/**
 * Notas do apresentador de um slide: resolve o relacionamento `notesSlide` do
 * slide e extrai o texto do placeholder `body` da parte de notas. Devolve um
 * parágrafo por `<a:p>` não-vazio (vazio quando não há notas).
 */
export function readNotes(pkg: PptxPackage, slidePath: string): string[] {
  const relsXml = pkg.getPartText(relsPathFor(slidePath));
  if (relsXml === undefined) return [];
  let notesPath: string | undefined;
  for (const rel of childElements(parseXml(relsXml), 'Relationship')) {
    if ((rel.attrs['Type'] ?? '').endsWith('/notesSlide')) {
      notesPath = pkg.resolveRelTarget(slidePath, rel.attrs['Target'] ?? '');
      break;
    }
  }
  if (!notesPath) return [];
  const xml = pkg.getPartText(notesPath);
  if (xml === undefined) return [];
  const tree = descend(parseXml(xml), 'p:spTree');
  if (!tree) return [];
  const out: string[] = [];
  for (const sp of childElements(tree, 'p:sp')) {
    // só o placeholder de corpo carrega as notas (os demais são nº do slide etc.)
    const ph = descend(sp, 'p:ph');
    if (ph?.attrs['type'] !== 'body') continue;
    const txBody = firstChild(sp, 'p:txBody');
    if (!txBody) continue;
    for (const p of childElements(txBody, 'a:p')) {
      const text = paraXmlText(p);
      if (text.trim() !== '') out.push(text);
    }
  }
  return out;
}

/** Texto cru de um `<a:p>` (runs + breaks) direto do XML. */
function paraXmlText(p: XmlElement): string {
  let out = '';
  for (const c of childElements(p)) {
    if (c.name === 'a:r' || c.name === 'a:fld') {
      const t = firstChild(c, 'a:t');
      if (t) out += textContent(t);
    } else if (c.name === 'a:br') out += '\n';
  }
  return out;
}

// ──────────────────────── Texto / título ────────────────────────

/** Texto de um parágrafo do modelo (runs concatenados). */
export function paragraphText(p: Paragraph): string {
  return p.runs.map((r) => r.text).join('');
}

/** Texto completo de um txBody (parágrafos unidos por \n). */
export function bodyText(tb: TextBody): string {
  return tb.paragraphs.map(paragraphText).join('\n');
}

/** True quando a shape é o placeholder de título do slide. */
export function isTitleShape(sh: Shape): boolean {
  return sh.phType === 'title' || sh.phType === 'ctrTitle';
}

/**
 * Título do slide: placeholder title/ctrTitle com texto; senão a primeira
 * shape com texto não-vazio. `undefined` quando o slide não tem texto algum.
 */
export function slideTitle(slide: Slide): { text: string; shape: Shape } | undefined {
  for (const sh of slide.shapes) {
    if (isTitleShape(sh) && sh.txBody && bodyText(sh.txBody).trim() !== '') {
      return { text: bodyText(sh.txBody).replace(/\s+/g, ' ').trim(), shape: sh };
    }
  }
  for (const sh of slide.shapes) {
    if (sh.txBody && bodyText(sh.txBody).trim() !== '') {
      return { text: bodyText(sh.txBody).replace(/\s+/g, ' ').trim(), shape: sh };
    }
  }
  return undefined;
}

// ──────────────────────── base64 / data URI ────────────────────────

/** base64 de bytes — funciona no browser (btoa) e no Node (Buffer). */
export function base64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000; // evita stack overflow do apply em imagens grandes
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const g = globalThis as { btoa?: (s: string) => string; Buffer?: { from(s: string, e: string): { toString(e: string): string } } };
  if (typeof g.btoa === 'function') return g.btoa(bin);
  if (g.Buffer) return g.Buffer.from(bin, 'binary').toString('base64');
  throw new Error('sem base64 (btoa/Buffer) no ambiente');
}

/** data URI de uma ImageRef (MIME já inferido no read). */
export function dataUri(img: ImageRef): string {
  return `data:${img.mime};base64,${base64(img.bytes)}`;
}
