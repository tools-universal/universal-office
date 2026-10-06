/**
 * Modelo binário (ppt-reader) → pacote PresentationML (.pptx) em memória.
 *
 * Gera um pacote mínimo porém válido: [Content_Types].xml, _rels/.rels,
 * ppt/presentation.xml (+rels), um slideMaster + layout(s) "em branco" + tema
 * por mestre do .ppt efetivamente usado, ppt/slides/slideN.xml (+rels) e
 * ppt/media/* para as imagens.
 *
 * Princípios:
 *  - tudo EXPLÍCITO na forma (posição, preenchimento, contorno, texto com
 *    tamanho/cor/fonte/marcador): a herança do .ppt (estilos-mestre, esquema
 *    de cores) é resolvida aqui, não delegada à cascata do leitor;
 *  - ids das formas = spid do .ppt (as animações do PPT10 apontam para eles);
 *  - mestre → `<p:sldMaster>` com as decorações (formas sem placeholder), o
 *    fundo e os txStyles; slides que escondem os objetos do mestre usam um
 *    layout com showMasterSp="0".
 *
 * Geometria: mestre-unidades (576/pol) × 1587,5 = EMU. Grupos mantêm o espaço
 * filho do .ppt (FSPGR) escalado pelo mesmo fator (chOff/chExt).
 */
import { zipSync, strToU8 } from 'fflate';
import type { PptDocument, PptSlide } from './ppt-reader.js';
import { levelsXml, emu, resolveLevel, type TextConvCtx } from './textconv.js';
import { buildTimingXml } from './anim.js';
import { roundTripThemeXml } from './roundtrip.js';
import { shapeXml, backgroundXml, backgroundColor, placeholderType } from './shapeconv.js';
import { transitionXml } from './transition.js';
import { notesFor, notesSlideXml, notesMasterXml } from './notes.js';
import { PartRels, DEFAULT_SCHEME, newPartCtx, type ConvCtx, type ConvertOptions, type PartCtx } from './context.js';
import { el, XML_DECL, NS } from './xmlw.js';

export type { ConvertOptions } from './context.js';
export { transitionXml } from './transition.js';

const SPTREE_HEAD = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

const NS_ATTRS = { 'xmlns:a': NS.a, 'xmlns:r': NS.r, 'xmlns:p': NS.p };

const SLD_SZ_TYPE: Record<number, string> = { 0: 'screen4x3', 1: 'letter', 2: 'A4', 3: '35mm', 4: 'overhead', 5: 'banner' };

/**
 * Tema gerado do esquema de cores do .ppt (8 cores: fundo, texto, sombra,
 * título, preenchimento, ênfase, hiperlink, hiperlink seguido) e das fontes
 * dos estilos-mestre de título/corpo.
 */
function themeXml(name: string, scheme: string[], major: string, minor: string): string {
  const c = (i: number): string => scheme[i] ?? DEFAULT_SCHEME[i]!;
  const clr = (tag: string, v: string): string => el(`a:${tag}`, {}, el('a:srgbClr', { val: v }));
  const fonts = (f: string): string => el('a:latin', { typeface: f }) + '<a:ea typeface=""/><a:cs typeface=""/>';
  const phSolid = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  return XML_DECL + el('a:theme', { 'xmlns:a': NS.a, name },
    el('a:themeElements', {},
      el('a:clrScheme', { name },
        clr('dk1', c(1)) + clr('lt1', c(0)) + clr('dk2', c(3)) + clr('lt2', c(2)) +
        clr('accent1', c(4)) + clr('accent2', c(5)) + clr('accent3', c(6)) + clr('accent4', c(7)) +
        clr('accent5', c(4)) + clr('accent6', c(5)) + clr('hlink', c(6)) + clr('folHlink', c(7))) +
      el('a:fontScheme', { name }, el('a:majorFont', {}, fonts(major)) + el('a:minorFont', {}, fonts(minor))) +
      el('a:fmtScheme', { name },
        el('a:fillStyleLst', {}, phSolid + phSolid + phSolid) +
        el('a:lnStyleLst', {}, [6350, 12700, 19050].map((w) => el('a:ln', { w, cap: 'flat', cmpd: 'sng', algn: 'ctr' }, phSolid + '<a:prstDash val="solid"/><a:miter lim="800000"/>')).join('')) +
        el('a:effectStyleLst', {}, '<a:effectStyle><a:effectLst/></a:effectStyle>'.repeat(3)) +
        el('a:bgFillStyleLst', {}, phSolid + phSolid + phSolid))) +
    '<a:objectDefaults/><a:extraClrSchemeLst/>');
}

/**
 * O tema do round-trip só é usado se as cores-base (dk1, lt1, dk2, lt2,
 * accent1, accent2) coincidem com o esquema do mestre — senão o .ppt foi
 * editado depois por uma versão antiga e o esquema binário vale.
 */
function themeMatchesScheme(xml: string, scheme: string[]): boolean {
  const pick = (tag: string): string | undefined => {
    const m = new RegExp(`<a:${tag}>\\s*<a:(?:srgbClr val|sysClr[^>]*lastClr)="([0-9A-Fa-f]{6})"`).exec(xml);
    return m?.[1]?.toUpperCase();
  };
  const want: [string, number][] = [['dk1', 1], ['lt1', 0], ['dk2', 3], ['lt2', 2], ['accent1', 4], ['accent2', 5]];
  return want.every(([tag, i]) => pick(tag) === scheme[i]?.toUpperCase());
}

/** Mestre (principal ou de título) pelo slideId que masterIdRef referencia. */
function masterById(doc: PptDocument, id: number): PptSlide | undefined {
  return doc.masters.find((m) => m.slideId === id);
}

/** Mestre principal (para estilos de texto) de um mestre qualquer. */
function mainMasterOf(doc: PptDocument, m: PptSlide | undefined): PptSlide | undefined {
  if (!m) return doc.masters.find((x) => x.kind === 'mainMaster');
  if (m.kind === 'mainMaster') return m;
  return masterById(doc, m.masterIdRef) ?? doc.masters.find((x) => x.kind === 'mainMaster');
}

/**
 * Cabeçalho/rodapé do modelo 97-2003: os slides não têm formas próprias de
 * data/nº/rodapé — os placeholders do MESTRE aparecem conforme o
 * HeadersFootersContainer (do slide ou, na falta, do documento), exceto em
 * slides de título com fOmitTitlePlace. Arquivos 2007+ já trazem as formas no
 * slide: só injeta o que o slide não tem. Texto: meta-chars → nº/data/rodapé.
 */
function headerFooterShapes(doc: PptDocument, s: PptSlide, m: PptSlide | undefined, pc: PartCtx): string {
  const hf = s.headersFooters ?? doc.slideHeadersFooters;
  if (!hf || !m) return '';
  const want = new Set<string>();
  if (hf.hasDate) want.add('dt');
  if (hf.hasSlideNumber) want.add('sldNum');
  if (hf.hasFooter) want.add('ftr');
  if (!want.size) return '';
  if (doc.omitTitlePlace && s.geom === 0) return ''; // SL_TitleSlide
  const own = new Set<string>();
  for (const c of s.drawing.root?.children ?? []) { const t = placeholderType(c); if (t) own.add(t); }
  const hfText: NonNullable<TextConvCtx['hf']> = {};
  if (hf.footer) hfText.footer = hf.footer;
  if (hf.header) hfText.header = hf.header;
  if (hf.hasUserDate && hf.userDate) hfText.userDate = hf.userDate;
  pc.text.hf = hfText;
  let xml = '';
  for (const c of m.drawing.root?.children ?? []) {
    const t = placeholderType(c);
    if (t && want.has(t) && !own.has(t)) xml += shapeXml(c, pc);
  }
  return xml;
}

function relsPath(part: string): string {
  const i = part.lastIndexOf('/');
  return `${part.slice(0, i)}/_rels/${part.slice(i + 1)}.rels`;
}

interface PartOut { path: string; xml: string; rels: PartRels }

/** Converte o modelo binário em partes OPC (caminho → bytes), na ordem de escrita. */
export function pptToPptxParts(doc: PptDocument, opts: ConvertOptions = {}): Map<string, Uint8Array> {
  const conv: ConvCtx = { doc, media: new Map(), parts: new Map(), mediaExts: new Set(), useRoundTrip: opts.useRoundTrip !== false };
  const out = new Map<string, Uint8Array>();
  const put = (path: string, xml: string): void => { out.set(path, strToU8(xml)); };
  const fontOf = (idx: number | undefined): string | undefined => idx === undefined ? undefined : doc.fonts[idx]?.name;

  // mestres efetivamente usados (na ordem do documento)
  const used = new Set(doc.slides.map((s) => s.masterIdRef));
  let masters = doc.masters.filter((m) => used.has(m.slideId));
  if (!masters.length && doc.masters[0]) masters = [doc.masters[0]];
  const masterIndex = new Map<number, number>();
  masters.forEach((m, i) => masterIndex.set(m.slideId, i + 1));
  const needsNoMasterLayout = new Set<number>();
  for (const s of doc.slides) if (!(s.flags & 1)) needsNoMasterLayout.add(masterIndex.get(s.masterIdRef) ?? 1);

  // ── mestres, layouts, temas
  let layoutCounter = 0;
  let layoutIdSeed = 2147483648 + masters.length + 1;
  const layoutFor = new Map<string, number>(); // `${mestre}:${m|n}` → nº do layout (n = sem objetos do mestre)
  const masterXmls: PartOut[] = [];
  const layoutXmls: PartOut[] = [];
  const themeXmls: { path: string; xml: string }[] = [];
  masters.forEach((m, mi) => {
    const k = mi + 1;
    const main = mainMasterOf(doc, m);
    const scheme = m.colorScheme ?? main?.colorScheme ?? DEFAULT_SCHEME;
    const mrels = new PartRels();
    const pc = newPartCtx(conv, scheme, main?.masterStyles, m.outline, undefined, mrels);
    pc.bgColor = backgroundColor(m.drawing.background ?? main?.drawing.background, pc);
    const ctx = pc.text;
    // decorações do mestre principal sob um mestre de título com fMasterObjects
    let tree = '';
    if (m.kind === 'titleMaster' && (m.flags & 1) && main && main !== m) {
      for (const c of main.drawing.root?.children ?? []) tree += shapeXml(c, pc, { skipPlaceholders: true });
    }
    for (const c of m.drawing.root?.children ?? []) tree += shapeXml(c, pc);
    const bg = backgroundXml(m.drawing.background ?? main?.drawing.background, pc);
    // layouts deste mestre
    const lids: { id: number; n: number }[] = [];
    const mkLayout = (noMaster: boolean): void => {
      layoutCounter++;
      const lrels = new PartRels();
      lrels.add('slideMaster', `../slideMasters/slideMaster${k}.xml`);
      const lxml = XML_DECL + el('p:sldLayout', { ...NS_ATTRS, type: 'blank', preserve: 1, showMasterSp: noMaster ? 0 : undefined },
        el('p:cSld', { name: noMaster ? 'Em branco (sem objetos do mestre)' : 'Em branco' }, el('p:spTree', {}, SPTREE_HEAD)) +
        '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>');
      layoutXmls.push({ path: `ppt/slideLayouts/slideLayout${layoutCounter}.xml`, xml: lxml, rels: lrels });
      layoutFor.set(`${k}:${noMaster ? 'n' : 'm'}`, layoutCounter);
      lids.push({ id: layoutIdSeed++, n: layoutCounter });
    };
    mkLayout(false);
    if (needsNoMasterLayout.has(k)) mkLayout(true);
    const lidXml = lids.map((l) => el('p:sldLayoutId', { id: l.id, 'r:id': mrels.add('slideLayout', `../slideLayouts/slideLayout${l.n}.xml`) })).join('');
    mrels.add('theme', `../theme/theme${k}.xml`);
    const txStyles = el('p:txStyles', {},
      levelsXml('p:titleStyle', ctx, 0) + levelsXml('p:bodyStyle', ctx, 1) + levelsXml('p:otherStyle', ctx, 4));
    const mxml = XML_DECL + el('p:sldMaster', NS_ATTRS,
      el('p:cSld', { name: m.name }, bg + el('p:spTree', {}, SPTREE_HEAD + tree)) +
      '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
      el('p:sldLayoutIdLst', {}, lidXml) + txStyles);
    masterXmls.push({ path: `ppt/slideMasters/slideMaster${k}.xml`, xml: mxml, rels: mrels });
    const major = fontOf(resolveLevel(ctx, 0, 0).cf.font) ?? 'Calibri';
    const minor = fontOf(resolveLevel(ctx, 1, 0).cf.font) ?? 'Calibri';
    // tema original do round-trip (PowerPoint 2007+) quando as cores-base batem com o esquema
    const rt = conv.useRoundTrip ? roundTripThemeXml(m.roundTripTheme ?? main?.roundTripTheme) : undefined;
    themeXmls.push({ path: `ppt/theme/theme${k}.xml`, xml: rt && themeMatchesScheme(rt, scheme) ? rt : themeXml(m.name ?? `Tema ${k}`, scheme, major, minor) });
  });

  // ── slides (+ notas)
  const slideXmls: (PartOut & { id: number })[] = [];
  const notesXmls: PartOut[] = [];
  const usedSldIds = new Set<number>();
  doc.slides.forEach((s, si) => {
    const m = masterById(doc, s.masterIdRef) ?? masters[0];
    const main = mainMasterOf(doc, m);
    const k = (m && masterIndex.get(m.slideId)) ?? 1;
    // fMasterScheme (bit 1): esquema do mestre; senão o do próprio slide
    const scheme = (s.flags & 2) ? (m?.colorScheme ?? main?.colorScheme ?? s.colorScheme ?? DEFAULT_SCHEME)
      : (s.colorScheme ?? m?.colorScheme ?? DEFAULT_SCHEME);
    const pc = newPartCtx(conv, scheme, main?.masterStyles, s.outline, doc.firstSlideNumber + si);
    pc.slideId = s.slideId;
    // fMasterObjects (bit 0) desligado → layout que esconde as decorações do mestre
    const layoutN = layoutFor.get(`${k}:${s.flags & 1 ? 'm' : 'n'}`) ?? layoutFor.get(`${k}:m`) ?? 1;
    pc.rels.add('slideLayout', `../slideLayouts/slideLayout${layoutN}.xml`);
    // fMasterBackground (bit 2) desligado → fundo próprio
    const ownBg = !(s.flags & 4) ? s.drawing.background : undefined;
    pc.bgColor = backgroundColor(ownBg ?? m?.drawing.background, pc);
    let tree = '';
    for (const c of s.drawing.root?.children ?? []) tree += shapeXml(c, pc);
    tree = headerFooterShapes(doc, s, m, pc) + tree;
    const bg = ownBg ? backgroundXml(ownBg, pc) : '';
    const timing = buildTimingXml(s, { textOf: (id) => pc.texts.get(id), hasShape: (id) => pc.spids.has(id), scheme });
    const xml = XML_DECL + el('p:sld', { ...NS_ATTRS, show: s.transition?.hidden ? 0 : undefined, showMasterSp: s.flags & 1 ? undefined : 0 },
      el('p:cSld', {}, bg + el('p:spTree', {}, SPTREE_HEAD + tree)) +
      '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
      transitionXml(s.transition) + timing);
    let id = s.slideId >= 256 && s.slideId < 2147483648 ? s.slideId : 256 + si;
    while (usedSldIds.has(id)) id++;
    usedSldIds.add(id);
    // notas do apresentador (texto do corpo, estilo "notas" do mestre principal)
    const nt = notesFor(doc, s);
    const notesCtx: TextConvCtx = { doc, scheme: nt?.colorScheme ?? scheme, slideNumber: doc.firstSlideNumber + si };
    if (main?.masterStyles) notesCtx.styles = main.masterStyles;
    const nxml = nt ? notesSlideXml(nt, notesCtx) : undefined;
    if (nxml) {
      const nn = notesXmls.length + 1;
      const nrels = new PartRels();
      nrels.add('notesMaster', '../notesMasters/notesMaster1.xml');
      nrels.add('slide', `../slides/slide${si + 1}.xml`);
      notesXmls.push({ path: `ppt/notesSlides/notesSlide${nn}.xml`, xml: nxml, rels: nrels });
      pc.rels.add('notesSlide', `../notesSlides/notesSlide${nn}.xml`);
    }
    slideXmls.push({ path: `ppt/slides/slide${si + 1}.xml`, xml, rels: pc.rels, id });
  });
  // mestre das notas (com tema próprio, cópia do primeiro) só se houver notas
  const notesMaster: PartOut | undefined = notesXmls.length ? (() => {
    const themeN = themeXmls.length + 1;
    themeXmls.push({ path: `ppt/theme/theme${themeN}.xml`, xml: themeXmls[0]?.xml ?? themeXml('Notas', DEFAULT_SCHEME, 'Calibri', 'Calibri') });
    const rels = new PartRels();
    rels.add('theme', `../theme/theme${themeN}.xml`);
    return { path: 'ppt/notesMasters/notesMaster1.xml', xml: notesMasterXml(doc), rels };
  })() : undefined;

  // ── presentation.xml + rels
  const prels = new PartRels();
  const mIds = masterXmls.map((mx, i) => el('p:sldMasterId', { id: 2147483648 + i, 'r:id': prels.add('slideMaster', mx.path.replace('ppt/', '')) })).join('');
  const nmIds = notesMaster ? el('p:notesMasterIdLst', {}, el('p:notesMasterId', { 'r:id': prels.add('notesMaster', notesMaster.path.replace('ppt/', '')) })) : '';
  const sIds = slideXmls.map((sx) => el('p:sldId', { id: sx.id, 'r:id': prels.add('slide', sx.path.replace('ppt/', '')) })).join('');
  prels.add('presProps', 'presProps.xml');
  prels.add('viewProps', 'viewProps.xml');
  prels.add('theme', 'theme/theme1.xml');
  prels.add('tableStyles', 'tableStyles.xml');
  const firstMain = mainMasterOf(doc, masters[0]);
  const defCtx: TextConvCtx = { doc, scheme: masters[0]?.colorScheme ?? firstMain?.colorScheme ?? DEFAULT_SCHEME };
  const presXml = XML_DECL + el('p:presentation', { ...NS_ATTRS, saveSubsetFonts: 1, firstSlideNum: doc.firstSlideNumber !== 1 ? doc.firstSlideNumber : undefined },
    el('p:sldMasterIdLst', {}, mIds) + nmIds +
    (sIds ? el('p:sldIdLst', {}, sIds) : '') +
    el('p:sldSz', { cx: emu(doc.slideW), cy: emu(doc.slideH), type: SLD_SZ_TYPE[doc.slideSizeType] }) +
    el('p:notesSz', { cx: emu(doc.notesW), cy: emu(doc.notesH) }) +
    levelsXml('p:defaultTextStyle', defCtx, 4));

  // ── montagem (ordem: content types, rels, docProps, presentation, …)
  const overrides: [string, string][] = [
    ['/ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'],
    ...masterXmls.map((x): [string, string] => ['/' + x.path, 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml']),
    ...slideXmls.map((x): [string, string] => ['/' + x.path, 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml']),
    ...layoutXmls.map((x): [string, string] => ['/' + x.path, 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml']),
    ...themeXmls.map((x): [string, string] => ['/' + x.path, 'application/vnd.openxmlformats-officedocument.theme+xml']),
    ...(notesMaster ? [[`/${notesMaster.path}`, 'application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml'] as [string, string]] : []),
    ...notesXmls.map((x): [string, string] => ['/' + x.path, 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml']),
    ['/ppt/presProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml'],
    ['/ppt/viewProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml'],
    ['/ppt/tableStyles.xml', 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml'],
    ['/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml'],
    ['/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml'],
  ];
  const MIME: Record<string, string> = {
    png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
    tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', pict: 'image/pict',
  };
  const defaults = ['rels', 'xml', ...conv.mediaExts].map((ext) => el('Default', {
    Extension: ext,
    ContentType: ext === 'rels' ? 'application/vnd.openxmlformats-package.relationships+xml' : ext === 'xml' ? 'application/xml' : MIME[ext] ?? 'application/octet-stream',
  })).join('');
  put('[Content_Types].xml', XML_DECL + el('Types', { xmlns: NS.ct }, defaults + overrides.map(([p, t]) => el('Override', { PartName: p, ContentType: t })).join('')));
  const rootRels = new PartRels();
  rootRels.add('officeDocument', 'ppt/presentation.xml');
  rootRels.add('http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml');
  rootRels.add('extended-properties', 'docProps/app.xml');
  put('_rels/.rels', rootRels.xml());
  put('docProps/core.xml', XML_DECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Apresentação convertida de .ppt</dc:title></cp:coreProperties>');
  put('docProps/app.xml', XML_DECL + el('Properties', { xmlns: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties' },
    `<Application>Universal Slides (conversão .ppt)</Application><Slides>${slideXmls.length}</Slides>`));
  put('ppt/presentation.xml', presXml);
  put('ppt/_rels/presentation.xml.rels', prels.xml());
  for (const x of [...masterXmls, ...layoutXmls, ...slideXmls, ...(notesMaster ? [notesMaster] : []), ...notesXmls]) {
    put(x.path, x.xml);
    put(relsPath(x.path), x.rels.xml());
  }
  for (const x of themeXmls) put(x.path, x.xml);
  put('ppt/presProps.xml', XML_DECL + el('p:presentationPr', NS_ATTRS));
  put('ppt/viewProps.xml', XML_DECL + el('p:viewPr', NS_ATTRS, '<p:normalViewPr/><p:slideViewPr><p:cSldViewPr><p:cViewPr><p:scale><a:sx n="1" d="1"/><a:sy n="1" d="1"/></p:scale><p:origin x="0" y="0"/></p:cViewPr><p:guideLst/></p:cSldViewPr></p:slideViewPr><p:gridSpacing cx="72008" cy="72008"/>'));
  put('ppt/tableStyles.xml', XML_DECL + el('a:tblStyleLst', { 'xmlns:a': NS.a, def: '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}' }));
  for (const [path, bytes] of conv.parts) out.set(path, bytes);
  return out;
}

/** Converte o modelo binário em bytes .pptx (ZIP). */
export function pptDocumentToPptx(doc: PptDocument, opts: ConvertOptions = {}): Uint8Array {
  const parts = pptToPptxParts(doc, opts);
  const zippable: Record<string, Uint8Array> = {};
  for (const [p, b] of parts) zippable[p] = b;
  // data FIXA nas entradas do ZIP: o fflate usaria "agora" e recusa anos fora de
  // 1980–2099 (relógio virtual/zerado derrubava a conversão); saída determinística
  return zipSync(zippable, { level: 6, mtime: new Date(2000, 0, 1) });
}
