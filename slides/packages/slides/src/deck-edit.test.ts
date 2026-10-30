// Edição do pacote (.pptx) pelo editor: cada operação muda só o que precisa,
// o modelo relido reflete a edição, o pacote salvo reabre e nenhuma relação
// interna fica apontando para parte inexistente.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PptxPackage, readPresentation, readSlide, readSlideNotes, parseSlideTiming, parseXml } from '@universal-office/slides-core';
import * as deck from './deck-edit.js';
import { blankDeck } from './blank-deck.js';
import { findAllElements, findElements, childRanges, findElement, setAttrInTag, tagEnd } from './xml-edit.js';
import { EditHistory, changedSince, restore, snapshot } from './history.js';

const SAMPLES = join(__dirname, '../../../samples');
const showcase = (): PptxPackage => PptxPackage.load(new Uint8Array(readFileSync(join(SAMPLES, 'showcase_animado.pptx'))));
const blank = (): PptxPackage => PptxPackage.load(blankDeck());

/** Relações internas cujo alvo não existe no pacote. */
function danglingRels(pkg: PptxPackage): string[] {
  const out: string[] = [];
  for (const rels of pkg.partNames().filter((n) => n.endsWith('.rels'))) {
    const owner = rels === '_rels/.rels' ? '' : rels.replace(/_rels\/([^/]+)\.rels$/, '$1');
    for (const r of deck.readRelList(pkg, owner)) {
      if (r.external) continue;
      const abs = pkg.resolveRelTarget(owner, r.target);
      if (!pkg.getPart(abs)) out.push(`${rels} → ${r.target}`);
    }
  }
  return out;
}

/** Override do [Content_Types] para cada slide/notes do pacote, e nenhum órfão novo (`base`: os que o arquivo já tinha). */
function overridesConsistent(pkg: PptxPackage, base: readonly string[] = []): string[] {
  const ct = pkg.getPartText('[Content_Types].xml')!;
  const names = findElements(ct, 'Override').map((r) => (ct.slice(r.start, r.end).match(/PartName="\/([^"]+)"/) ?? [])[1]!);
  const bad = names.filter((n) => !pkg.getPart(n)).map((n) => `órfão: ${n}`).filter((m) => !base.includes(m));
  for (const p of pkg.partNames()) if (/^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(p) && !names.includes(p)) bad.push(`sem tipo: ${p}`);
  return bad;
}

const reload = (pkg: PptxPackage): PptxPackage => PptxPackage.load(pkg.save());
/** O showcase já traz Overrides de masters inexistentes (gerado por outra ferramenta). */
const SHOWCASE_ORPHANS = overridesConsistent(showcase());

describe('xml-edit', () => {
  it('acha elementos aninhados, filhos diretos e o fim da tag com > entre aspas', () => {
    const xml = '<a x="1>2"><b/><c><c>t</c></c><b>u</b></a>';
    expect(tagEnd(xml, 0)).toBe(11);
    expect(findElements(xml, 'c')).toHaveLength(1);
    expect(findAllElements(xml, 'c')).toHaveLength(2);
    const a = findElement(xml, 'a')!;
    expect(childRanges(xml, a).map((k) => k.name)).toEqual(['b', 'c', 'b']);
    expect(setAttrInTag('<p:ph type="body"/>', 'idx', '1')).toBe('<p:ph type="body" idx="1"/>');
    expect(setAttrInTag('<p:ph type="body" idx="1"/>', 'type', null)).toBe('<p:ph idx="1"/>');
  });
});

describe('apresentação em branco', () => {
  it('abre com um slide de título, seis layouts e master de anotações', () => {
    const pkg = blank();
    const pres = readPresentation(pkg);
    expect(pres.slideW).toBe(12192000);
    expect(pres.slides).toHaveLength(1);
    expect(deck.listLayouts(pkg).map((l) => l.type)).toEqual(['title', 'obj', 'secHead', 'twoObj', 'titleOnly', 'blank']);
    expect(deck.hasNotesMaster(pkg)).toBe(true);
    const s = readSlide(pkg, 'ppt/slides/slide1.xml');
    expect(s.shapes.filter((sh) => sh.phType).map((sh) => sh.phType)).toEqual(['ctrTitle', 'subTitle']);
    // a geometria vem do layout
    expect(s.shapes.every((sh) => sh.xfrm && sh.xfrm.cx > 0)).toBe(true);
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg)).toEqual([]);
  });

  it('4:3 tem a largura do slide padrão', () => {
    expect(readPresentation(PptxPackage.load(blankDeck({ aspect: '4:3' }))).slideW).toBe(9144000);
  });
});

describe('slides', () => {
  it('novo slide a partir do layout: placeholders vazios, tipo e posição', () => {
    const pkg = blank();
    const layout = deck.listLayouts(pkg).find((l) => l.type === 'obj')!;
    const path = deck.addSlide(pkg, 1, layout.path, 'pt-BR');
    const pres = readPresentation(reload(pkg));
    expect(pres.slides.map((s) => s.target)).toEqual(['ppt/slides/slide1.xml', path]);
    const s = readSlide(pkg, path);
    expect(s.shapes.filter((sh) => !sh.inherited).map((sh) => `${sh.phType}:${sh.phIdx ?? ''}`)).toEqual(['title:', 'body:1']);
    expect(pkg.getPartText(path)).toContain('lang="pt-BR"');
    expect(deck.layoutOf(pkg, path)).toBe(layout.path);
    // no começo da lista
    const first = deck.addSlide(pkg, 0, layout.path);
    expect(readPresentation(pkg).slides[0]!.target).toBe(first);
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg)).toEqual([]);
  });

  it('duplicar copia o slide e as anotações (a cópia aponta para si)', () => {
    const pkg = showcase();
    const before = deck.slideEntries(pkg).length;
    const orig = deck.slideEntries(pkg)[1]!.path;
    const copy = deck.duplicateSlide(pkg, 1);
    const entries = deck.slideEntries(pkg);
    expect(entries).toHaveLength(before + 1);
    expect(entries[2]!.path).toBe(copy);
    expect(readSlide(pkg, copy).shapes.length).toBe(readSlide(pkg, orig).shapes.length);
    expect(readSlideNotes(pkg, copy)).toBe(readSlideNotes(pkg, orig));
    const notesOf = (p: string): string => pkg.resolveRelTarget(p, deck.readRelList(pkg, p).find((r) => r.type === deck.REL.notesSlide)!.target);
    expect(notesOf(copy)).not.toBe(notesOf(orig));
    const back = deck.readRelList(pkg, notesOf(copy)).find((r) => r.type === deck.REL.slide)!;
    expect(pkg.resolveRelTarget(notesOf(copy), back.target)).toBe(copy);
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg, SHOWCASE_ORPHANS)).toEqual([]);
    expect(readPresentation(reload(pkg)).slides).toHaveLength(before + 1);
  });

  it('duplicar copia o gráfico (cada slide com a própria parte)', () => {
    const pkg = showcase();
    const idx = deck.slideEntries(pkg).findIndex((e) => deck.readRelList(pkg, e.path).some((r) => r.type.endsWith('/chart')));
    expect(idx).toBeGreaterThanOrEqual(0);
    const orig = deck.slideEntries(pkg)[idx]!.path;
    const copy = deck.duplicateSlide(pkg, idx);
    const charts = (p: string): string[] => deck.readRelList(pkg, p).filter((r) => r.type.endsWith('/chart')).map((r) => pkg.resolveRelTarget(p, r.target));
    expect(charts(copy)).toHaveLength(charts(orig).length);
    for (const c of charts(copy)) expect(charts(orig)).not.toContain(c);
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg, SHOWCASE_ORPHANS)).toEqual([]);
  });

  it('excluir tira a parte, as anotações e o tipo', () => {
    const pkg = showcase();
    const e = deck.slideEntries(pkg)[0]!;
    const notes = pkg.resolveRelTarget(e.path, deck.readRelList(pkg, e.path).find((r) => r.type === deck.REL.notesSlide)!.target);
    deck.deleteSlide(pkg, 0);
    expect(deck.slideEntries(pkg).map((x) => x.path)).not.toContain(e.path);
    expect(pkg.getPart(e.path)).toBeUndefined();
    expect(pkg.getPart(notes)).toBeUndefined();
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg, SHOWCASE_ORPHANS)).toEqual([]);
    expect(readPresentation(reload(pkg)).slides).toHaveLength(11);
  });

  it('mover reordena a lista', () => {
    const pkg = showcase();
    const paths = deck.slideEntries(pkg).map((e) => e.path);
    deck.moveSlide(pkg, 0, 3);
    expect(deck.slideEntries(pkg).map((e) => e.path)).toEqual([paths[1], paths[2], paths[3], paths[0], ...paths.slice(4)]);
    deck.moveSlide(pkg, 3, 0);
    expect(deck.slideEntries(pkg).map((e) => e.path)).toEqual(paths);
  });

  it('ocultar, fundo, layout e transição', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    deck.setSlideHidden(pkg, p, true);
    expect(readSlide(pkg, p).timing?.hidden).toBe(true);
    deck.setSlideHidden(pkg, p, false);
    expect(readSlide(pkg, p).timing?.hidden).toBe(false);
    deck.setSlideBackground(pkg, p, '#123456');
    expect(readSlide(pkg, p).bg?.color?.toLowerCase()).toBe('#123456');
    deck.setSlideBackground(pkg, p, null);
    expect(pkg.getPartText(p)).not.toContain('<p:bg>');
    const blankLayout = deck.listLayouts(pkg).find((l) => l.type === 'blank')!;
    deck.setSlideLayout(pkg, p, blankLayout.path);
    expect(deck.layoutOf(pkg, p)).toBe(blankLayout.path);
    deck.setSlideTransition(pkg, p, { type: 'push', dir: 'u', speed: 'slow', advanceAfterMs: 3000 });
    const t = readSlide(pkg, p).timing!.transition!;
    expect(t.type).toBe('push');
    expect(t.attrs['dir']).toBe('u');
    expect(t.advTmMs).toBe(3000);
    // trocar: uma transição só
    deck.setSlideTransition(pkg, p, { type: 'fade' });
    expect(pkg.getPartText(p)!.match(/<p:transition/g)).toHaveLength(1);
    expect(readSlide(pkg, p).timing!.transition!.type).toBe('fade');
    deck.setSlideTransition(pkg, p, null);
    expect(pkg.getPartText(p)).not.toContain('<p:transition');
  });

  it('a transição fica antes do <p:timing> (ordem do esquema)', () => {
    const pkg = showcase();
    const p = deck.slideEntries(pkg)[0]!.path;
    deck.setSlideTransition(pkg, p, { type: 'wipe', dir: 'r' });
    const xml = pkg.getPartText(p)!;
    expect(xml.indexOf('<p:transition')).toBeLessThan(xml.indexOf('<p:timing'));
    expect(parseSlideTiming(parseXml(xml), () => 0).transition?.type).toBe('wipe');
  });
});

describe('texto das formas', () => {
  it('parágrafo igual fica como estava; o que mudou mantém pPr e o rPr do 1º run', () => {
    const pkg = showcase();
    const p = deck.slideEntries(pkg)[1]!.path;
    const before = deck.shapeParagraphs(pkg, p, '2');
    expect(before[0]).toBe('O que esta apresentação demonstra');
    deck.setShapeText(pkg, p, '2', 'Novo título\nSegunda linha');
    expect(deck.shapeParagraphs(pkg, p, '2')).toEqual(['Novo título', 'Segunda linha']);
    const sh = readSlide(pkg, p).shapes.find((s) => s.id === '2')!;
    expect(sh.txBody!.paragraphs[0]!.runs[0]!.sz).toBe(32);
    expect(sh.txBody!.paragraphs[0]!.runs[0]!.bold).toBe(true);
    expect(sh.txBody!.paragraphs[1]!.runs[0]!.font).toBe('Cambria');
    // o mesmo texto não muda nada
    const xml = pkg.getPartText(p);
    deck.setShapeText(pkg, p, '2', 'Novo título\nSegunda linha');
    expect(pkg.getPartText(p)).toBe(xml);
  });

  it('placeholder vazio ganha o texto; forma sem txBody também', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    deck.setShapeText(pkg, p, '2', 'Título & <companhia>');
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '2')!.txBody!.paragraphs[0]!.runs[0]!.text).toBe('Título & <companhia>');
    const id = deck.insertShape(pkg, p, 'rect', { x: 0, y: 0, cx: 100000, cy: 100000 });
    deck.setShapeText(pkg, p, id, 'dentro');
    expect(deck.shapeParagraphs(pkg, p, id)).toEqual(['dentro']);
  });

  it('formatação em todo o texto: negrito, itálico, sublinhado, tamanho, cor, fonte', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    deck.setShapeText(pkg, p, '3', 'um\ndois');
    deck.formatShapeText(pkg, p, '3', { bold: true, italic: true, underline: true, strike: true, size: 31, color: '#ff0000', font: 'Arial' });
    const runs = readSlide(pkg, p).shapes.find((s) => s.id === '3')!.txBody!.paragraphs.map((x) => x.runs[0]!);
    for (const r of runs) {
      expect(r.bold).toBe(true);
      expect(r.italic).toBe(true);
      expect(r.underline).toBe(true);
      expect(r.strike).toBe(true);
      expect(r.sz).toBe(31);
      expect(r.color?.toLowerCase()).toBe('#ff0000');
      expect(r.font).toBe('Arial');
    }
    // ordem do esquema dentro do rPr: preenchimento antes da fonte
    const xml = pkg.getPartText(p)!;
    const rpr = xml.slice(xml.indexOf('<a:rPr', xml.indexOf('um') - 400));
    expect(rpr.indexOf('<a:solidFill>')).toBeLessThan(rpr.indexOf('<a:latin'));
    deck.formatShapeText(pkg, p, '3', { bold: false });
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '3')!.txBody!.paragraphs[0]!.runs[0]!.bold).toBeFalsy();
    deck.clearShapeFormatting(pkg, p, '3');
    const r0 = readSlide(pkg, p).shapes.find((s) => s.id === '3')!.txBody!.paragraphs[0]!.runs[0]!;
    expect(r0.font).not.toBe('Arial');
    expect(r0.sz).not.toBe(31);
  });

  it('aumentar fonte por run, alinhar e marcadores', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    const id = deck.insertTextBox(pkg, p, { x: 0, y: 0, cx: 3000000, cy: 600000 }, 'a\nb');
    deck.scaleShapeText(pkg, p, id, (pt) => (pt ?? 18) + 2);
    expect(readSlide(pkg, p).shapes.find((s) => s.id === id)!.txBody!.paragraphs[0]!.runs[0]!.sz).toBe(20);
    deck.alignShapeText(pkg, p, id, 'ctr');
    expect(readSlide(pkg, p).shapes.find((s) => s.id === id)!.txBody!.paragraphs.every((x) => x.align === 'ctr')).toBe(true);
    deck.setShapeBullets(pkg, p, id, 'number');
    let paras = readSlide(pkg, p).shapes.find((s) => s.id === id)!.txBody!.paragraphs;
    expect(paras[0]!.bulletAutoNum).toBe('arabicPeriod');
    expect(paras[0]!.marL).toBeGreaterThan(0);
    deck.setShapeBullets(pkg, p, id, 'bullet');
    paras = readSlide(pkg, p).shapes.find((s) => s.id === id)!.txBody!.paragraphs;
    expect(paras[0]!.bulletChar).toBe('•');
    expect(paras[0]!.bulletAutoNum).toBeUndefined();
    deck.setShapeBullets(pkg, p, id, 'none');
    expect(readSlide(pkg, p).shapes.find((s) => s.id === id)!.txBody!.paragraphs[0]!.bullet).toBe(false);
  });

  it('hiperlink no texto e substituir', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    deck.setShapeText(pkg, p, '2', 'Banana banana');
    deck.setShapeLink(pkg, p, '2', 'https://example.com/?a=1&b=2');
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '2')!.txBody!.paragraphs[0]!.runs[0]!.hyperlink).toBe('https://example.com/?a=1&b=2');
    deck.setShapeLink(pkg, p, '2', null);
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '2')!.txBody!.paragraphs[0]!.runs[0]!.hyperlink).toBeUndefined();
    expect(deck.replaceInShape(pkg, p, '2', 'banana', 'maçã')).toBe(2);
    expect(deck.shapeParagraphs(pkg, p, '2')).toEqual(['maçã maçã']);
    expect(deck.replaceInShape(pkg, p, '2', 'MAÇÃ', 'x', true)).toBe(0);
  });
});

describe('formas', () => {
  it('inserir caixa de texto, forma, linha e imagem', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    const f = { x: 914400, y: 914400, cx: 1828800, cy: 914400 };
    const tb = deck.insertTextBox(pkg, p, f, 'Olá');
    const sp = deck.insertShape(pkg, p, 'ellipse', f);
    const ln = deck.insertShape(pkg, p, 'line', { ...f, cy: 0 });
    const img = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0x1f, 0x15, 0xc4, 0x89]);
    const pic = deck.insertImage(pkg, p, img, 'image/png', f);
    const shapes = readSlide(pkg, p).shapes;
    const byId = (id: string) => shapes.find((s) => s.id === id)!;
    expect(byId(tb).isTextBox).toBe(true);
    expect(byId(tb).xfrm).toMatchObject({ x: 914400, y: 914400, cx: 1828800 });
    expect(byId(sp).geom).toBe('ellipse');
    expect(byId(sp).fill?.color).toBeTruthy(); // estilo do tema (accent1)
    expect(byId(ln).geom).toBe('line');
    expect(byId(pic.id).image?.part).toBe(pic.part);
    expect(new Set([tb, sp, ln, pic.id]).size).toBe(4);
    expect(pkg.getPartText('[Content_Types].xml')).toContain('Extension="png"');
    expect(danglingRels(pkg)).toEqual([]);
    expect(readSlide(reload(pkg), p).shapes.length).toBe(shapes.length);
  });

  it('posição/tamanho (inclusive placeholder que herdava a geometria), preenchimento e contorno', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    const f = { x: 100000, y: 200000, cx: 3000000, cy: 400000 };
    deck.setShapeFrame(pkg, p, '2', f);
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '2')!.xfrm).toMatchObject(f);
    deck.setShapeFrame(pkg, p, '2', { ...f, x: 500000 });
    expect(readSlide(pkg, p).shapes.find((s) => s.id === '2')!.xfrm!.x).toBe(500000);
    expect(pkg.getPartText(p)!.match(/<a:xfrm/g)!.length).toBe(2); // grupo raiz + a forma
    const id = deck.insertShape(pkg, p, 'rect', f);
    deck.setShapeFill(pkg, p, id, '#00ff00');
    deck.setShapeOutline(pkg, p, id, '#0000ff');
    let sh = readSlide(pkg, p).shapes.find((s) => s.id === id)!;
    expect(sh.fill?.color?.toLowerCase()).toBe('#00ff00');
    expect(sh.lineColor?.toLowerCase()).toBe('#0000ff');
    deck.setShapeFill(pkg, p, id, null);
    deck.setShapeOutline(pkg, p, id, null);
    sh = readSlide(pkg, p).shapes.find((s) => s.id === id)!;
    expect(sh.fill?.type ?? 'none').toBe('none');
    expect(sh.lineNone).toBe(true);
  });

  it('ordem: trazer para a frente e enviar para trás', () => {
    const pkg = blank();
    const p = 'ppt/slides/slide1.xml';
    const ids = () => readSlide(pkg, p).shapes.filter((s) => !s.inherited).map((s) => s.id);
    expect(ids()).toEqual(['2', '3']);
    deck.arrangeShape(pkg, p, '2', 'front');
    expect(ids()).toEqual(['3', '2']);
    deck.arrangeShape(pkg, p, '2', 'backward');
    expect(ids()).toEqual(['2', '3']);
    deck.arrangeShape(pkg, p, '3', 'back');
    expect(ids()).toEqual(['3', '2']);
    expect(deck.arrangeShape(pkg, p, '3', 'back')).toBe(false);
  });

  it('excluir a forma tira as animações dela (e o <p:timing> quando não sobra efeito)', () => {
    const pkg = showcase();
    const p = deck.slideEntries(pkg)[0]!.path;
    const targets = (): string[] => [...(pkg.getPartText(p)!.matchAll(/<p:spTgt\b[^>]*spid="(\d+)"/g))].map((m) => m[1]!);
    const ids = [...new Set(targets())];
    expect(ids.length).toBeGreaterThan(1);
    deck.deleteShape(pkg, p, ids[0]!);
    expect(targets()).not.toContain(ids[0]);
    expect(readSlide(pkg, p).shapes.some((s) => s.id === ids[0])).toBe(false);
    // a árvore de tempo continua válida e os alvos existem
    const timing = parseSlideTiming(parseXml(pkg.getPartText(p)!), () => 0);
    const shapeIds = new Set(readSlide(pkg, p).shapes.map((s) => s.id));
    for (const st of timing.steps) for (const e of st.effects) if (e.target) expect(shapeIds.has(e.target.spid)).toBe(true);
    for (const id of ids.slice(1)) deck.deleteShape(pkg, p, id);
    expect(pkg.getPartText(p)).not.toContain('<p:timing');
    expect(readSlide(reload(pkg), p).shapes.length).toBeGreaterThanOrEqual(0);
  });
});

describe('área de transferência das formas', () => {
  it('copiar e colar no mesmo slide: id novo, deslocada, mesma imagem compartilhada', () => {
    const pkg = showcase();
    const p = deck.slideEntries(pkg)[1]!.path;
    const pic = readSlide(pkg, p).shapes.find((s) => s.image && !s.inherited)!;
    const clip = deck.extractShape(pkg, p, pic.id)!;
    expect(clip.rels.some((r) => r.type === deck.REL.image && r.bytes?.length)).toBe(true);
    const parts = pkg.partNames().length;
    const id = deck.pasteShape(pkg, p, clip, 12700, 12700)!;
    const pasted = readSlide(pkg, p).shapes.find((s) => s.id === id)!;
    expect(id).not.toBe(pic.id);
    expect(pasted.xfrm!.x).toBe(pic.xfrm!.x + 12700);
    expect(pasted.image!.part).toBe(pic.image!.part); // mesma parte, sem cópia
    expect(pkg.partNames().length).toBe(parts);
    expect(danglingRels(pkg)).toEqual([]);
  });

  it('colar em OUTRA apresentação leva os bytes da imagem; forma de texto vai inteira', () => {
    const src = showcase();
    const p = deck.slideEntries(src)[1]!.path;
    const pic = readSlide(src, p).shapes.find((s) => s.image && !s.inherited)!;
    const title = readSlide(src, p).shapes.find((s) => s.id === '2')!;
    const dst = blank();
    const d = 'ppt/slides/slide1.xml';
    const picId = deck.pasteShape(dst, d, deck.extractShape(src, p, pic.id)!)!;
    const txtId = deck.pasteShape(dst, d, deck.extractShape(src, p, title.id)!)!;
    const shapes = readSlide(dst, d).shapes;
    const img = shapes.find((s) => s.id === picId)!.image!;
    expect(img.part.startsWith('ppt/media/')).toBe(true);
    expect(dst.getPart(img.part)!.length).toBe(src.getPart(pic.image!.part)!.length);
    expect(shapes.find((s) => s.id === txtId)!.txBody!.paragraphs[0]!.runs[0]!.text).toBe('O que esta apresentação demonstra');
    expect(danglingRels(dst)).toEqual([]);
    expect(readSlide(reload(dst), d).shapes.length).toBe(shapes.length);
  });

  it('forma dentro de grupo não se copia (as coordenadas são do grupo)', () => {
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(join(SAMPLES, 'gaps-smoke.pptx'))));
    expect(deck.extractShape(pkg, 'ppt/slides/slide1.xml', '6')).toBeNull();
    expect(deck.extractShape(pkg, 'ppt/slides/slide1.xml', '4')).not.toBeNull();
  });
});

describe('anotações, propriedades e configurar apresentação', () => {
  it('anotações: grava na existente e cria a página quando falta', () => {
    const pkg = showcase();
    const p = deck.slideEntries(pkg)[0]!.path;
    expect(deck.setSlideNotes(pkg, p, 'Primeira\nSegunda')).toBe(true);
    expect(readSlideNotes(pkg, p)).toBe('Primeira\nSegunda');
    const b = blank();
    expect(readSlideNotes(b, 'ppt/slides/slide1.xml')).toBe('');
    expect(deck.setSlideNotes(b, 'ppt/slides/slide1.xml', 'Nota nova')).toBe(true);
    expect(readSlideNotes(b, 'ppt/slides/slide1.xml')).toBe('Nota nova');
    expect(danglingRels(b)).toEqual([]);
    expect(overridesConsistent(b)).toEqual([]);
  });

  it('sem master de anotações, a primeira anotação cria o master (como o PowerPoint)', () => {
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(join(SAMPLES, 'gaps-smoke.pptx'))));
    expect(deck.hasNotesMaster(pkg)).toBe(false);
    expect(deck.setSlideNotes(pkg, 'ppt/slides/slide1.xml', 'Primeira nota')).toBe(true);
    expect(deck.hasNotesMaster(pkg)).toBe(true);
    expect(readSlideNotes(pkg, 'ppt/slides/slide1.xml')).toBe('Primeira nota');
    expect(danglingRels(pkg)).toEqual([]);
    expect(overridesConsistent(pkg)).toEqual([]);
    const pres = pkg.presentationXml();
    expect(pres).toMatch(/<p:notesMasterIdLst><p:notesMasterId r:id="rId\d+"\/><\/p:notesMasterIdLst>/);
    expect(pres.indexOf('<p:notesMasterIdLst>')).toBeLessThan(pres.indexOf('<p:sldIdLst'));
    expect(pres).toContain('<p:notesSz');
    // um segundo slide reaproveita o mesmo master
    const master = deck.ensureNotesMaster(pkg);
    expect(deck.ensureNotesMaster(pkg)).toBe(master);
    const reopened = PptxPackage.load(pkg.save());
    expect(readSlideNotes(reopened, 'ppt/slides/slide1.xml')).toBe('Primeira nota');
  });

  it('propriedades do documento', () => {
    const pkg = blank();
    deck.writeProperties(pkg, { title: 'Relatório <Q3>', author: 'Ana', subject: '' });
    expect(deck.readProperties(pkg)).toMatchObject({ title: 'Relatório <Q3>', author: 'Ana' });
    expect(deck.readProperties(pkg).subject).toBeUndefined();
    const g = PptxPackage.load(new Uint8Array(readFileSync(join(SAMPLES, 'gaps-smoke.pptx'))));
    deck.writeProperties(g, { title: 'Criado' });
    expect(deck.readProperties(g).title).toBe('Criado');
    expect(danglingRels(g)).toEqual([]);
  });

  it('configurar apresentação (showPr)', () => {
    const pkg = blank();
    deck.writeShowSettings(pkg, { loop: true, useTimings: false, showAnimation: false, kiosk: true });
    expect(readPresentation(pkg).show).toMatchObject({ loop: true, useTimings: false, showAnimation: false, kiosk: true });
    deck.writeShowSettings(pkg, { loop: false, useTimings: true, showAnimation: true, kiosk: false });
    const s = readPresentation(pkg).show!;
    expect(s.loop).toBeFalsy();
    expect(s.kiosk).toBeFalsy();
  });
});

describe('desfazer por instantâneo', () => {
  it('restaura exatamente as partes de antes e de depois', () => {
    const pkg = showcase();
    const h = new EditHistory(10);
    const before = snapshot(pkg);
    deck.deleteSlide(pkg, 0);
    expect(changedSince(pkg, before)).toBe(true);
    const after = snapshot(pkg);
    h.push('del', before, after, { index: 0, shapeId: null }, { index: 0, shapeId: null });
    expect(h.dirty).toBe(true);
    restore(pkg, h.undo()!.snap);
    expect(deck.slideEntries(pkg)).toHaveLength(12);
    expect(changedSince(pkg, before)).toBe(false);
    expect(h.dirty).toBe(false);
    restore(pkg, h.redo()!.snap);
    expect(deck.slideEntries(pkg)).toHaveLength(11);
    h.markSaved();
    expect(h.dirty).toBe(false);
    h.undo();
    expect(h.dirty).toBe(true);
  });

  it('limite: o passo mais antigo sai', () => {
    const h = new EditHistory(2);
    const s = new Map<string, Uint8Array>();
    for (let i = 0; i < 3; i++) h.push(`p${i}`, s, s, { index: 0, shapeId: null }, { index: 0, shapeId: null });
    expect(h.undoLabel()).toBe('p2');
    h.undo(); h.undo();
    expect(h.canUndo()).toBe(false);
  });
});
