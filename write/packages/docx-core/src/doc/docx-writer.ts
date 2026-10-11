/**
 * DocReader → pacote .docx (WordprocessingML). Gera document.xml, styles.xml,
 * numbering.xml, fontTable.xml, settings.xml, cabeçalhos/rodapés, notas,
 * comentários e mídia. O texto de cada história (principal, cabeçalhos,
 * notas, caixas de texto) passa pelo mesmo renderizador de parágrafos/tabelas.
 */
import { zipSync, type Zippable } from 'fflate';
import { DocReader, type Comment, type Fspa, type Note } from './reader.js';
import { runIndexFrom } from './fkp.js';
import { pieceAt } from './text.js';
import { prls, sgcOf, type Prl } from './sprm.js';
import {
  applyChp, applyPap, applyTap, brcNone, finishTap, newTap, pruneNoneBorders,
  type Chp, type ChpKey, type Pap, type PapKey, type Sep, type Tap, type Tc, type Brc,
} from './props.js';
import { brcXml, hex, numFmtOf, pPrInner, rPrInner, shdXml, type PropCtx } from './ooxml-props.js';
import { CONTENT_NS, NS, XML_DECL, attrs, el, escText } from './xmlw.js';
import { buildNumbering } from './numbering.js';
import { buildSettings } from './settings.js';
import { buildStyles, styleIdMap } from './styles-xml.js';
import { picFxOf, readInlinePicture, shapeBlip, type PicFx, type PicInfo } from './pictures.js';
import { ffDataXml } from './formfields.js';
import { presetFor, isConnectorType, isWordArtType, type RawAdjust } from './preset-map.js';
import { FSP, type Blip, type OAShape } from './officeart.js';

export interface ConvertOptions {
  /** Inclui docProps/app.xml e core.xml mínimos. Padrão: true. */
  docProps?: boolean;
}

const EMU_PER_TWIP = 635;

/** Parágrafo coletado de uma história. */
export interface PInfo {
  cpStart: number;
  /** Exclusivo; a marca está em cpEnd - 1. */
  cpEnd: number;
  mark: number;
  pap: Pap;
  touched: Set<PapKey>;
  /** grpprls diretos (PAPX + Prm). */
  grpprls: Uint8Array[];
  /** Prls de tabela (sgc 5) efetivos, em ordem — a TAP da linha (marca TTP). */
  tapPrls: Prl[];
  depth: number;
  cellEnd: boolean;
  rowEnd: boolean;
}

interface Segment {
  cpStart: number;
  cpEnd: number;
  grpprls: Uint8Array[];
}

/** Relações de uma parte (document.xml, header1.xml...). */
class PartRels {
  private readonly items: string[] = [];
  private n = 0;
  private readonly byKey = new Map<string, string>();
  add(type: string, target: string, external = false): string {
    const key = `${type}|${target}|${external}`;
    const hit = this.byKey.get(key);
    if (hit) return hit;
    const id = `rId${++this.n}`;
    this.items.push(el('Relationship', { Id: id, Type: `${NS.relType}/${type}`, Target: target, TargetMode: external ? 'External' : undefined }));
    this.byKey.set(key, id);
    return id;
  }
  get size(): number { return this.items.length; }
  xml(): string {
    return `${XML_DECL}<Relationships xmlns="${NS.rel}">${this.items.join('')}</Relationships>`;
  }
}

/** Estado de renderização de uma parte (rels + tipo de história). */
interface StoryCtx {
  rels: PartRels;
  kind: 'main' | 'hdr' | 'ftn' | 'edn' | 'atn' | 'txbx';
  /** Cabeçalho: desenhos vêm do PlcSpaHdr. */
  hdr: boolean;
}

const MIME: Record<string, string> = {
  png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp',
  tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', pict: 'image/pict',
};

export class DocxWriter {
  readonly r: DocReader;
  private readonly files = new Map<string, Uint8Array | string>();
  private readonly overrides: [string, string][] = [];
  private readonly mediaExt = new Set<string>();
  private readonly media = new Map<string, string>();
  private mediaN = 0;
  private hdrN = 0;
  private ftrN = 0;
  private docPrId = 0;
  readonly propCtx: PropCtx;
  private readonly styleIds: Map<number, string>;
  private readonly chpCache = new Map<string, { chp: Chp; touched: Set<ChpKey> }>();
  private readonly footnoteIds = new Map<number, number>();
  private readonly endnoteIds = new Map<number, number>();
  private readonly commentByRef = new Map<number, number>();
  private readonly commentStarts = new Map<number, number[]>();
  private readonly commentEnds = new Map<number, number[]>();
  private readonly bkStarts = new Map<number, { id: number; name: string }[]>();
  private readonly bkEnds = new Map<number, number[]>();
  private fspaMain = new Map<number, Fspa>();
  private fspaHdr = new Map<number, Fspa>();
  private txbxMain = new Map<number, [number, number]>();
  private txbxHdr = new Map<number, [number, number]>();
  private readonly revAuthors: string[];
  /** Ids das marcas de revisão (w:ins/w:del) — únicos no documento. */
  private readonly revIds = { next: 1 };
  private readonly numIdOf: (ilfo: number) => number;
  /** Faixas de CP descartadas (ex.: _PictureBullets). */
  private readonly skipRanges: [number, number][] = [];
  /** Campos abertos (atravessam parágrafos). */
  private fieldStack: { instr: boolean }[] = [];

  constructor(reader: DocReader) {
    this.r = reader;
    this.styleIds = styleIdMap(reader.stsh.styles);
    this.propCtx = {
      fonts: reader.fonts,
      styleId: (istd: number) => this.styleIds.get(istd),
    };
    this.revAuthors = reader.revisionAuthors();
    const lfoCount = reader.lists.lfos.length;
    this.numIdOf = (ilfo: number) => (ilfo >= 1 && ilfo <= lfoCount ? ilfo : 0);
  }

  // ───────────────────────────── pacote ─────────────────────────────

  build(opts: ConvertOptions = {}): Uint8Array {
    const r = this.r;
    for (const f of r.fspas(false)) this.fspaMain.set(f.cp, f);
    for (const f of r.fspas(true)) this.fspaHdr.set(f.cp, f);
    for (const t of r.textboxes(false)) this.txbxMain.set(t.spid, [t.cpStart, t.cpEnd]);
    for (const t of r.textboxes(true)) this.txbxHdr.set(t.spid, [t.cpStart, t.cpEnd]);
    let bkId = 0;
    for (const b of r.bookmarks()) {
      // _PictureBullets: imagens de marcadores guardadas como texto oculto — o Word
      // as move para a numeração e descarta o trecho ao salvar como .docx
      if (b.name === '_PictureBullets') { this.skipRanges.push([b.cpStart, b.cpEnd]); continue; }
      const id = bkId++;
      push(this.bkStarts, b.cpStart, { id, name: b.name });
      push(this.bkEnds, b.cpEnd, id);
    }

    const docRels = new PartRels();
    docRels.add('styles', 'styles.xml');
    docRels.add('settings', 'settings.xml');
    docRels.add('fontTable', 'fontTable.xml');
    this.overrides.push(['/word/styles.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml']);
    this.overrides.push(['/word/settings.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml']);
    this.overrides.push(['/word/fontTable.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml']);

    // notas e comentários (ids antes do corpo, que os referencia)
    const footnotes = r.notes('ftn');
    const endnotes = r.notes('edn');
    footnotes.forEach((n, i) => this.footnoteIds.set(n.refCp, i + 1));
    endnotes.forEach((n, i) => this.endnoteIds.set(n.refCp, i + 1));
    const comments = r.comments();
    comments.forEach((c, i) => {
      this.commentByRef.set(c.refCp, i);
      if (c.rangeStart !== undefined && c.rangeEnd !== undefined && c.rangeEnd >= c.rangeStart) {
        push(this.commentStarts, c.rangeStart, i);
        push(this.commentEnds, c.rangeEnd, i);
      }
    });

    // corpo
    const body = this.renderMain(docRels);
    this.files.set('word/document.xml', `${XML_DECL}<w:document${CONTENT_NS}>${backgroundXml(r.backgroundShape())}<w:body>${body}</w:body></w:document>`);
    this.overrides.push(['/word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml']);

    if (footnotes.length) {
      docRels.add('footnotes', 'footnotes.xml');
      this.files.set('word/footnotes.xml', this.renderNotes(footnotes, 'ftn'));
      this.overrides.push(['/word/footnotes.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml']);
    }
    if (endnotes.length) {
      docRels.add('endnotes', 'endnotes.xml');
      this.files.set('word/endnotes.xml', this.renderNotes(endnotes, 'edn'));
      this.overrides.push(['/word/endnotes.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml']);
    }
    if (comments.length) {
      docRels.add('comments', 'comments.xml');
      this.files.set('word/comments.xml', this.renderComments(comments));
      this.overrides.push(['/word/comments.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml']);
    }

    // estilos, numeração, fontes, configurações
    this.files.set('word/styles.xml', buildStyles(r, this.propCtx, this.styleIds, this.numIdOf));
    const numbering = buildNumbering(r, this.propCtx);
    if (numbering) {
      docRels.add('numbering', 'numbering.xml');
      this.files.set('word/numbering.xml', numbering);
      this.overrides.push(['/word/numbering.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml']);
    }
    this.files.set('word/fontTable.xml', this.fontTable());
    this.files.set('word/settings.xml', buildSettings(r, { footnotes: footnotes.length > 0, endnotes: endnotes.length > 0 }));
    this.files.set('word/_rels/document.xml.rels', docRels.xml());

    if (opts.docProps !== false) {
      this.files.set('docProps/app.xml', `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Universal Office (conversão de .doc)</Application></Properties>`);
      this.overrides.push(['/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml']);
    }
    const rootRels = new PartRels();
    rootRels.add('officeDocument', 'word/document.xml');
    if (opts.docProps !== false) rootRels.add('extended-properties', 'docProps/app.xml');
    this.files.set('_rels/.rels', rootRels.xml());

    let ct = `${XML_DECL}<Types xmlns="${NS.ct}">`;
    ct += el('Default', { Extension: 'rels', ContentType: 'application/vnd.openxmlformats-package.relationships+xml' });
    ct += el('Default', { Extension: 'xml', ContentType: 'application/xml' });
    for (const ext of this.mediaExt) ct += el('Default', { Extension: ext, ContentType: MIME[ext] ?? 'application/octet-stream' });
    for (const [part, type] of this.overrides) ct += el('Override', { PartName: part, ContentType: type });
    ct += '</Types>';

    const zip: Zippable = {};
    zip['[Content_Types].xml'] = new TextEncoder().encode(ct);
    const enc = new TextEncoder();
    for (const [path, data] of this.files) zip[path] = typeof data === 'string' ? enc.encode(data) : data;
    return zipSync(zip, { level: 6 });
  }

  private fontTable(): string {
    const fams = ['auto', 'roman', 'swiss', 'modern', 'script', 'decorative', 'auto', 'auto'];
    const pitch = ['default', 'fixed', 'variable', 'default'];
    const seen = new Set<string>();
    let x = '';
    for (const f of this.r.fonts) {
      if (seen.has(f.name)) continue;
      seen.add(f.name);
      let c = '';
      if (f.altName) c += el('w:altName', { 'w:val': f.altName });
      if (f.panose.some((b) => b !== 0)) c += el('w:panose1', { 'w:val': [...f.panose].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join('') });
      c += el('w:charset', { 'w:val': f.charset.toString(16).toUpperCase().padStart(2, '0') });
      c += el('w:family', { 'w:val': fams[f.ff] ?? 'auto' });
      if (!f.trueType) c += '<w:notTrueType/>';
      c += el('w:pitch', { 'w:val': pitch[f.prq] ?? 'default' });
      const h = (v: number): string => (v >>> 0).toString(16).toUpperCase().padStart(8, '0');
      c += el('w:sig', { 'w:usb0': h(f.sig[0]!), 'w:usb1': h(f.sig[1]!), 'w:usb2': h(f.sig[2]!), 'w:usb3': h(f.sig[3]!), 'w:csb0': h(f.sig[4]!), 'w:csb1': h(f.sig[5]!) });
      x += el('w:font', { 'w:name': f.name }, c);
    }
    return `${XML_DECL}<w:fonts xmlns:w="${NS.w}" xmlns:r="${NS.r}">${x}</w:fonts>`;
  }

  // ───────────────────────────── histórias ─────────────────────────────

  private renderMain(rels: PartRels): string {
    const r = this.r;
    const ctx: StoryCtx = { rels, kind: 'main', hdr: false };
    const [s, e] = r.sub.main;
    const paras = this.collectParas(s, e);
    // marca o fim de cada seção (menos a última, que vai no w:body)
    const sectEnds = new Map<number, number>();
    r.sections.forEach((sec, i) => { if (i < r.sections.length - 1) sectEnds.set(sec.cpEnd, i); });
    const hdrStories = r.headerStories();
    const sectPrs = r.sections.map((sec, i) => this.sectPrXml(sec.sep, i, hdrStories, rels));
    this.fieldStack = [];
    const body = this.renderBlocks(paras, 0, paras.length, 0, ctx, (p) => {
      const si = sectEnds.get(p.cpEnd);
      return si !== undefined ? sectPrs[si] : undefined;
    });
    return body + (sectPrs[sectPrs.length - 1] ?? '');
  }

  private sectPrXml(sep: Sep, index: number, stories: ([number, number] | undefined)[], docRels: PartRels): string {
    let refs = '';
    // ordem das histórias por seção: header par, header ímpar, footer par, footer ímpar, header 1ª, footer 1ª
    const kinds: [number, 'header' | 'footer', string][] = [
      [0, 'header', 'even'], [1, 'header', 'default'], [4, 'header', 'first'],
      [2, 'footer', 'even'], [3, 'footer', 'default'], [5, 'footer', 'first'],
    ];
    const hdrRefs: string[] = [];
    const ftrRefs: string[] = [];
    for (const [k, kind, type] of kinds) {
      const st = stories[6 + index * 6 + k];
      if (!st) continue;
      const rid = this.renderHeaderPart(st, kind, docRels);
      if (!rid) continue;
      const x = el(kind === 'header' ? 'w:headerReference' : 'w:footerReference', { 'w:type': type, 'r:id': rid });
      (kind === 'header' ? hdrRefs : ftrRefs).push(x);
    }
    refs = hdrRefs.join('') + ftrRefs.join('');
    let x = refs;
    const ftnPr = notePr(sep.fpc !== undefined ? ['pageBottom', 'pageBottom', 'beneathText', 'sectEnd'][sep.fpc] : undefined, sep.nfcFtnRef, sep.nFtn, sep.rncFtn, false);
    if (ftnPr) x += `<w:footnotePr>${ftnPr}</w:footnotePr>`;
    const ednPr = notePr(undefined, sep.nfcEdnRef, sep.nEdn, sep.rncEdn, true);
    if (ednPr) x += `<w:endnotePr>${ednPr}</w:endnotePr>`;
    const bkc = ['continuous', 'nextColumn', 'nextPage', 'evenPage', 'oddPage'][sep.bkc] ?? 'nextPage';
    if (bkc !== 'nextPage') x += el('w:type', { 'w:val': bkc });
    x += el('w:pgSz', { 'w:w': sep.xaPage, 'w:h': sep.yaPage, 'w:orient': sep.orientation === 2 ? 'landscape' : undefined, 'w:code': sep.dmPaperReq || undefined });
    x += el('w:pgMar', {
      'w:top': sep.dyaTop, 'w:right': sep.dxaRight, 'w:bottom': sep.dyaBottom, 'w:left': sep.dxaLeft,
      'w:header': sep.dyaHdrTop, 'w:footer': sep.dyaHdrBottom, 'w:gutter': sep.dzaGutter,
    });
    if (sep.dmBinFirst || sep.dmBinOther) x += el('w:paperSrc', { 'w:first': sep.dmBinFirst || undefined, 'w:other': sep.dmBinOther || undefined });
    if (sep.brcTop || sep.brcLeft || sep.brcBottom || sep.brcRight) {
      const pgb = sep.pgbProp;
      const applyTo = pgb & 7;
      const a = {
        'w:display': applyTo === 1 ? 'firstPage' : applyTo === 2 ? 'notFirstPage' : undefined,
        'w:zOrder': pgb & 0x8 ? 'back' : undefined,
        'w:offsetFrom': ((pgb >> 5) & 7) === 1 ? 'page' : undefined,
      };
      let b = '';
      if (sep.brcTop) b += brcXml('w:top', sep.brcTop);
      if (sep.brcLeft) b += brcXml('w:left', sep.brcLeft);
      if (sep.brcBottom) b += brcXml('w:bottom', sep.brcBottom);
      if (sep.brcRight) b += brcXml('w:right', sep.brcRight);
      x += el('w:pgBorders', a, b);
    }
    if (sep.lnnMod) {
      x += el('w:lnNumType', {
        'w:countBy': sep.lnnMod, 'w:start': sep.lnnMin || undefined, 'w:distance': sep.dxaLnn || undefined,
        'w:restart': ['newPage', 'newSection', 'continuous'][sep.lnc] ?? 'newPage',
      });
    }
    const nfc = numFmtOf(sep.nfcPgn);
    if ((sep.nfcPgn && nfc) || sep.pgnRestart || sep.headingPgn) {
      x += el('w:pgNumType', {
        'w:fmt': sep.nfcPgn ? nfc : undefined,
        'w:start': sep.pgnRestart ? sep.pgnStart : undefined,
        'w:chapStyle': sep.headingPgn || undefined,
        'w:chapSep': sep.headingPgn ? (['hyphen', 'period', 'colon', 'emDash', 'enDash'][sep.cnsPgn ?? 0] ?? 'hyphen') : undefined,
      });
    }
    const cols = sep.ccolM1 + 1;
    if (cols > 1 && !sep.evenlySpaced) {
      let c = '';
      for (let i = 0; i < cols; i++) c += el('w:col', { 'w:w': sep.colWidths[i] ?? 0, 'w:space': i < cols - 1 ? sep.colSpacings[i] ?? 0 : undefined });
      x += el('w:cols', { 'w:num': cols, 'w:space': sep.dxaColumns, 'w:equalWidth': '0', 'w:sep': sep.lBetween || undefined }, c);
    } else {
      x += el('w:cols', { 'w:num': cols > 1 ? cols : undefined, 'w:space': sep.dxaColumns, 'w:sep': sep.lBetween || undefined });
    }
    if (sep.protectedSec) x += '<w:formProt w:val="0"/>';
    if (sep.vjc) x += el('w:vAlign', { 'w:val': ['top', 'center', 'both', 'bottom'][sep.vjc] ?? 'top' });
    if (!sep.fEndnote) x += '<w:noEndnote/>';
    if (sep.titlePage) x += '<w:titlePg/>';
    if (sep.textFlow) x += el('w:textDirection', { 'w:val': ['lrTb', 'tbRl', 'btLr', 'lrTbV', 'tbRlV', 'tbLrV'][sep.textFlow] ?? 'lrTb' });
    if (sep.bidi) x += '<w:bidi/>';
    if (sep.rtlGutter) x += '<w:rtlGutter/>';
    // SClmOperand: 0 padrão, 1 linhas e caracteres, 2 só linhas, 3 ajustar aos caracteres
    const gridType = ['default', 'linesAndChars', 'lines', 'snapToChars'][sep.clm] ?? 'default';
    x += el('w:docGrid', {
      'w:type': sep.clm ? gridType : undefined,
      'w:linePitch': sep.dyaLinePitch,
      'w:charSpace': sep.dxtCharSpace || undefined,
    });
    return `<w:sectPr>${x}</w:sectPr>`;
  }

  /** Cabeçalho/rodapé → parte própria. Devolve o rId (no document.xml.rels). */
  private renderHeaderPart(story: [number, number], kind: 'header' | 'footer', docRels: PartRels): string | undefined {
    const rels = new PartRels();
    const ctx: StoryCtx = { rels, kind: 'hdr', hdr: true };
    let paras = this.collectParas(story[0], story[1]);
    // cada história termina com um parágrafo "guarda" que não é exibido
    if (paras.length > 1 && paras[paras.length - 1]!.cpEnd - paras[paras.length - 1]!.cpStart === 1) paras = paras.slice(0, -1);
    const saved = this.fieldStack;
    this.fieldStack = [];
    let body = this.renderBlocks(paras, 0, paras.length, 0, ctx);
    this.fieldStack = saved;
    if (!body) body = '<w:p/>';
    const n = kind === 'header' ? ++this.hdrN : ++this.ftrN;
    const name = `${kind}${n}.xml`;
    const tag = kind === 'header' ? 'w:hdr' : 'w:ftr';
    this.files.set(`word/${name}`, `${XML_DECL}<${tag}${CONTENT_NS}>${body}</${tag}>`);
    if (rels.size) this.files.set(`word/_rels/${name}.rels`, rels.xml());
    this.overrides.push([`/word/${name}`, `application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml`]);
    return docRels.add(kind, name);
  }

  private renderNotes(notes: Note[], kind: 'ftn' | 'edn'): string {
    const tag = kind === 'ftn' ? 'w:footnote' : 'w:endnote';
    const rels = new PartRels();
    const ctx: StoryCtx = { rels, kind, hdr: false };
    let x = `<${tag} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></${tag}>`;
    x += `<${tag} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></${tag}>`;
    notes.forEach((n, i) => {
      const paras = this.collectParas(n.cpStart, n.cpEnd);
      this.fieldStack = [];
      const body = this.renderBlocks(paras, 0, paras.length, 0, ctx) || '<w:p/>';
      x += `<${tag} w:id="${i + 1}">${body}</${tag}>`;
    });
    const root = kind === 'ftn' ? 'w:footnotes' : 'w:endnotes';
    const name = kind === 'ftn' ? 'footnotes.xml' : 'endnotes.xml';
    if (rels.size) this.files.set(`word/_rels/${name}.rels`, rels.xml());
    return `${XML_DECL}<${root}${CONTENT_NS}>${x}</${root}>`;
  }

  private renderComments(comments: Comment[]): string {
    const rels = new PartRels();
    const ctx: StoryCtx = { rels, kind: 'atn', hdr: false };
    let x = '';
    comments.forEach((c, i) => {
      const paras = this.collectParas(c.cpStart, c.cpEnd);
      this.fieldStack = [];
      let body = this.renderBlocks(paras, 0, paras.length, 0, ctx);
      if (!body) body = '<w:p/>';
      x += el('w:comment', { 'w:id': i, 'w:author': c.author || 'Autor desconhecido', 'w:initials': c.initials || undefined }, body);
    });
    if (rels.size) this.files.set('word/_rels/comments.xml.rels', rels.xml());
    return `${XML_DECL}<w:comments${CONTENT_NS}>${x}</w:comments>`;
  }

  // ───────────────────────────── parágrafos ─────────────────────────────

  /** Parágrafos de uma faixa de CPs. */
  collectParas(cpStart: number, cpEnd: number): PInfo[] {
    const r = this.r;
    const out: PInfo[] = [];
    let cp = cpStart;
    let guard = 0;
    while (cp < cpEnd && guard++ < 2_000_000) {
      const { end, run } = r.paragraphAt(cp, cpEnd);
      const pEnd = Math.max(cp + 1, Math.min(end, cpEnd));
      const markCp = pEnd - 1;
      const grpprls: Uint8Array[] = [];
      if (run && run.grpprl.length) grpprls.push(run.grpprl);
      const pi = pieceAt(r.pieces, markCp);
      const prm = pi >= 0 ? r.prmGrpprl(r.pieces[pi]!) : undefined;
      if (prm) grpprls.push(prm);
      const istd = run?.istd ?? 0;
      const base = r.styles.resolve(this.validParaStyle(istd));
      const pap: Pap = { ...base.pap, istd: this.validParaStyle(istd), inTable: undefined, ttp: undefined, itap: undefined, innerTableCell: undefined, innerTtp: undefined, tabsCleared: [] };
      const touched = new Set<PapKey>();
      // sprmPIlfo (positivo) aplica o recuo do nível da lista por cima do recuo
      // definido ANTES dele; só recuos gravados depois sobrevivem como diretos
      let seq = 0;
      let ilfoSeq = -1;
      const lastIndent: Partial<Record<PapKey, number>> = {};
      const apply = (p: Prl): void => {
        seq++;
        const k = INDENT_SPRMS[p.sprm];
        if (k) lastIndent[k] = seq;
        if (p.sprm === 0x460b) { const v = p.r.i16(p.op); ilfoSeq = v > 0 ? seq : -1; }
        applyPap(pap, p, touched);
      };
      const tapPrls: Prl[] = [];
      for (const g of grpprls) {
        for (const p of prls(g)) {
          const sgc = sgcOf(p.sprm);
          if (sgc === 5) { tapPrls.push(p); continue; }
          if (sgc !== 1) continue;
          if ((p.sprm === 0x646b || p.sprm === 0x6646) && r.data) {
            // sprmPTableProps/sprmPHugePapx: PrcData no Data stream. Quem o processa
            // NÃO processa os Prl seguintes do mesmo grpprl (versões para leitores antigos)
            const extra = this.prcData(p.r.u32(p.op));
            if (extra.length) {
              for (const q of prls(extra)) {
                const s2 = sgcOf(q.sprm);
                if (s2 === 5) tapPrls.push(q);
                else if (s2 === 1) apply(q);
              }
              break;
            }
            continue;
          }
          apply(p);
        }
      }
      pruneNoneBorders(pap, base.pap, touched);
      if (ilfoSeq > 0) {
        for (const k of ['dxaLeft', 'dxaLeft1', 'dxcLeft', 'dxcLeft1'] as PapKey[]) {
          if (touched.has(k) && (lastIndent[k] ?? 0) < ilfoSeq) {
            touched.delete(k);
            (pap as unknown as Record<string, unknown>)[k] = (base.pap as unknown as Record<string, unknown>)[k];
          }
        }
      }
      if (pap.istd !== istd) pap.istd = this.validParaStyle(pap.istd);
      const mark = r.text.charCodeAt(markCp);
      let depth = pap.itap ?? 0;
      if (pap.inTable && depth < 1) depth = 1;
      if (!pap.inTable && pap.itap === undefined) depth = 0;
      let cellEnd = false;
      let rowEnd = false;
      if (depth === 1) {
        if (mark === 0x07) { if (pap.ttp) rowEnd = true; else cellEnd = true; }
      } else if (depth > 1) {
        if (pap.innerTtp) rowEnd = true;
        else if (pap.innerTableCell) cellEnd = true;
        else if (mark === 0x07) cellEnd = true;
      }
      out.push({ cpStart: cp, cpEnd: pEnd, mark, pap, touched, grpprls, tapPrls, depth, cellEnd, rowEnd });
      cp = pEnd;
    }
    return out;
  }

  private validParaStyle(istd: number): number {
    const st = this.r.stsh.styles[istd];
    return st && (st.stk === 1 || st.stk === undefined) ? istd : 0;
  }

  private prcData(off: number): Uint8Array {
    const d = this.r.data;
    if (!d || off + 2 > d.length) return new Uint8Array(0);
    const cb = d[off]! | (d[off + 1]! << 8);
    return d.subarray(off + 2, Math.min(d.length, off + 2 + cb));
  }

  /** Blocos (parágrafos e tabelas) de paras[from, to) na profundidade `depth`. */
  private renderBlocks(paras: PInfo[], from: number, to: number, depth: number, ctx: StoryCtx, sectPrOf?: (p: PInfo) => string | undefined): string {
    let x = '';
    let i = from;
    while (i < to) {
      const p = paras[i]!;
      if (p.depth > depth) {
        let j = i;
        while (j < to && paras[j]!.depth > depth) j++;
        x += this.renderTable(paras, i, j, depth + 1, ctx);
        i = j;
        continue;
      }
      x += this.renderParagraph(p, ctx, sectPrOf?.(p));
      i++;
    }
    return x;
  }

  private renderParagraph(p: PInfo, ctx: StoryCtx, sectPr?: string): string {
    const r = this.r;
    const styleRes = r.styles.resolve(p.pap.istd);
    const markChp = this.chpFor(p, p.cpEnd - 1);
    const markRPr = this.revisionMark(markChp.chp) + rPrInner(markChp.chp, markChp.touched, this.propCtx);
    const pPr = pPrInner(p.pap, p.touched, this.propCtx, {
      baseTabs: styleRes.pap.tabs, numId: this.numIdOf, rPr: markRPr || undefined, sectPr,
    });
    const runs = this.renderRuns(p, ctx);
    return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${runs}</w:p>`;
  }

  private revisionMark(chp: Chp): string {
    if (chp.rmarkIns) return el('w:ins', { 'w:id': this.revIds.next++, 'w:author': this.revAuthors[chp.ibstRMark ?? 0] ?? 'Autor desconhecido', 'w:date': dttmIso(chp.dttmRMark) });
    if (chp.rmarkDel) return el('w:del', { 'w:id': this.revIds.next++, 'w:author': this.revAuthors[chp.ibstRMarkDel ?? 0] ?? 'Autor desconhecido', 'w:date': dttmIso(chp.dttmRMarkDel) });
    return '';
  }

  /** CHP + tocados do caractere em `cp` (dentro do parágrafo p). */
  private chpFor(p: PInfo, cp: number): { chp: Chp; touched: Set<ChpKey> } {
    const seg = this.segmentAt(cp);
    return this.chpOf(p, seg.grpprls);
  }

  private chpOf(p: PInfo, grpprls: Uint8Array[]): { chp: Chp; touched: Set<ChpKey> } {
    const r = this.r;
    const key = `${p.pap.istd}|${grpprls.map((g) => keyOf(g)).join('/')}`;
    const hit = this.chpCache.get(key);
    if (hit) return hit;
    const paraChp = r.styles.resolve(p.pap.istd).chp;
    const chp: Chp = { ...paraChp };
    const touched = new Set<ChpKey>();
    const ctx = {
      base: { ...paraChp },
      applyCharStyle: (istd: number) => r.styles.applyCharStyle(istd, paraChp),
      paraStyle: paraChp,
    };
    for (const g of grpprls) for (const q of prls(g)) if (sgcOf(q.sprm) === 2) applyChp(chp, q, ctx, touched);
    const res = { chp, touched };
    this.chpCache.set(key, res);
    return res;
  }

  private segmentAt(cp: number): Segment {
    for (const s of this.segments(cp, cp + 1)) return s;
    return { cpStart: cp, cpEnd: cp + 1, grpprls: [] };
  }

  /** Faixas de CHPX (por peça) em [s, e). */
  *segments(s: number, e: number): Generator<Segment> {
    const r = this.r;
    let cp = s;
    while (cp < e) {
      const i = pieceAt(r.pieces, cp);
      if (i < 0) { yield { cpStart: cp, cpEnd: e, grpprls: [] }; return; }
      const p = r.pieces[i]!;
      const cs = p.compressed ? 1 : 2;
      const fc = p.fc + (cp - p.cpStart) * cs;
      const pieceEnd = Math.min(p.cpEnd, e);
      let segEnd = pieceEnd;
      const grpprls: Uint8Array[] = [];
      const idx = runIndexFrom(r.chpx, fc);
      const run = r.chpx[idx];
      if (run && run.fcStart <= fc) {
        segEnd = Math.min(pieceEnd, p.cpStart + Math.ceil((run.fcEnd - p.fc) / cs));
        if (run.grpprl.length) grpprls.push(run.grpprl);
      } else if (run) {
        segEnd = Math.min(pieceEnd, Math.max(cp + 1, p.cpStart + Math.ceil((run.fcStart - p.fc) / cs)));
      }
      const prm = r.prmGrpprl(p);
      if (prm) grpprls.push(prm);
      if (segEnd <= cp) segEnd = cp + 1;
      yield { cpStart: cp, cpEnd: segEnd, grpprls };
      cp = segEnd;
    }
  }

  // ───────────────────────────── runs ─────────────────────────────

  private renderRuns(p: PInfo, ctx: StoryCtx): string {
    const r = this.r;
    const text = r.text;
    const out = new RunBuf(this.revIds);
    const markCp = p.cpEnd - 1;
    // HYPERLINK simples (dentro do parágrafo) vira w:hyperlink, como o Word grava
    const links = this.scanHyperlinks(p, ctx);
    let link: HyperlinkField | undefined;
    for (const seg of this.segments(p.cpStart, p.cpEnd)) {
      const { chp, touched } = this.chpOf(p, seg.grpprls);
      const rPr = rPrInner(chp, touched, this.propCtx);
      const wrap = this.wrapKey(chp);
      for (let cp = seg.cpStart; cp < seg.cpEnd; cp++) {
        this.emitMarkers(cp, out, ctx);
        if (cp === markCp) continue; // marca de parágrafo/célula
        if (this.skipRanges.length && this.skipRanges.some(([a, b]) => cp >= a && cp < b)) continue;
        const c = text.charCodeAt(cp);
        // resultado de campo aninhado DENTRO da instrução de outro continua sendo
        // instrução (o Word grava w:instrText): vale qualquer campo aberto em instrução
        const inInstr = this.fieldStack.some((f) => f.instr);
        if (link) {
          if (cp <= link.sep) continue; // código do campo + separador
          if (cp === link.end) { if (!link.unwrap) out.raw('</w:hyperlink>'); link = undefined; continue; }
        } else if (c === 0x13 && links.has(cp)) {
          link = links.get(cp)!;
          if (!link.unwrap) out.raw(`<w:hyperlink${attrs({ 'r:id': link.rid, 'w:anchor': link.anchor, 'w:tooltip': link.tooltip, 'w:tgtFrame': link.target, 'w:history': '1' })}>`);
          continue;
        }
        if (c === 0x13) {
          this.fieldStack.push({ instr: true });
          const ff = this.formFieldData(p, cp);
          out.special(rPr, wrap, ff ? `<w:fldChar w:fldCharType="begin">${ff}</w:fldChar>` : '<w:fldChar w:fldCharType="begin"/>');
          continue;
        }
        if (c === 0x14) {
          const top = this.fieldStack[this.fieldStack.length - 1];
          if (top) top.instr = false;
          out.special(rPr, wrap, '<w:fldChar w:fldCharType="separate"/>');
          continue;
        }
        if (c === 0x15) {
          if (this.fieldStack.length) this.fieldStack.pop();
          out.special(rPr, wrap, '<w:fldChar w:fldCharType="end"/>');
          continue;
        }
        if (inInstr) {
          if (c >= 0x20 || c === 0x09) out.instr(rPr, wrap, String.fromCharCode(c), !!chp.rmarkDel);
          continue;
        }
        // nota com marca personalizada: o 1º caractere da marca carrega a referência
        if (ctx.kind === 'main' && !chp.fSpec && c >= 0x20 && (this.footnoteIds.has(cp) || this.endnoteIds.has(cp))) {
          const f = this.footnoteIds.get(cp);
          const ref = f !== undefined
            ? el('w:footnoteReference', { 'w:customMarkFollows': '1', 'w:id': f })
            : el('w:endnoteReference', { 'w:customMarkFollows': '1', 'w:id': this.endnoteIds.get(cp) });
          out.special(rPr, wrap, ref + `<w:t>${escText(String.fromCharCode(c))}</w:t>`);
          continue;
        }
        if (chp.fSpec || c < 0x20) {
          const x = this.specialChar(c, cp, chp, ctx);
          if (x !== undefined) {
            if (x) out.special(rPr, wrap, x);
            continue;
          }
        }
        if (chp.symbol && (chp.fSpec || c === 0x28)) {
          const font = r.fonts[chp.symbol.ftc]?.name;
          out.special(rPr, wrap, el('w:sym', { 'w:font': font, 'w:char': chp.symbol.xchar.toString(16).toUpperCase().padStart(4, '0') }));
          continue;
        }
        if (c < 0x20) continue;
        out.text(rPr, wrap, String.fromCharCode(c), !!chp.rmarkDel);
      }
    }
    if (link && !link.unwrap) out.raw('</w:hyperlink>');
    this.emitMarkers(p.cpEnd, out, ctx, true);
    return out.close();
  }

  /** FFData do campo de formulário que começa em `begin` (0x01 com sprmCFData na instrução). */
  private formFieldData(p: PInfo, begin: number): string | undefined {
    const text = this.r.text;
    let depth = 0;
    let instr = '';
    for (let cp = begin + 1; cp < p.cpEnd - 1; cp++) {
      const c = text.charCodeAt(cp);
      if (c === 0x13) depth++;
      else if (c === 0x15) { if (depth === 0) return undefined; depth--; }
      else if (c === 0x14 && depth === 0) return undefined;
      else if (c === 0x01 && depth === 0) {
        // só campos de formulário: outros campos também carregam dados binários (0x01 + fData)
        if (!/^\s*FORM(TEXT|CHECKBOX|DROPDOWN)\b/i.test(instr)) return undefined;
        const { chp } = this.chpFor(p, cp);
        if (chp.fData && chp.picLocation !== undefined) return ffDataXml(this.r.data, chp.picLocation);
      } else if (depth === 0 && c >= 0x20) instr += String.fromCharCode(c);
    }
    return undefined;
  }

  /**
   * Campos HYPERLINK de nível superior inteiramente dentro do parágrafo, sem
   * campos aninhados na instrução: begin (CP) → separador, fim, destino.
   */
  private scanHyperlinks(p: PInfo, ctx: StoryCtx): Map<number, HyperlinkField> {
    const out = new Map<number, HyperlinkField>();
    const text = this.r.text;
    if (text.indexOf('\x13', p.cpStart) < 0 || text.indexOf('\x13', p.cpStart) >= p.cpEnd) return out;
    // só no nível de fora dos campos já abertos (que atravessam parágrafos)
    if (this.fieldStack.length) return out;
    const stack: { begin: number; sep?: number; nested: boolean }[] = [];
    for (let cp = p.cpStart; cp < p.cpEnd - 1; cp++) {
      const c = text.charCodeAt(cp);
      if (c === 0x13) {
        if (stack.length) stack[stack.length - 1]!.nested = stack[stack.length - 1]!.sep === undefined || stack[stack.length - 1]!.nested;
        stack.push({ begin: cp, nested: false });
      } else if (c === 0x14 && stack.length) {
        const top = stack[stack.length - 1]!;
        if (top.sep === undefined) top.sep = cp;
      } else if (c === 0x15 && stack.length) {
        const f = stack.pop()!;
        if (stack.length || f.sep === undefined || f.nested) continue;
        const instr = text.slice(f.begin + 1, f.sep);
        // SHAPE (tela de desenho/forma em linha): o Word descarta o campo e mantém o desenho
        if (/^\s*SHAPE\b/i.test(instr)) { out.set(f.begin, { sep: f.sep, end: cp, unwrap: true }); continue; }
        const m = /^\s*HYPERLINK\s+(.*)$/i.exec(instr);
        if (!m) continue;
        const args = parseFieldArgs(m[1]!);
        let url: string | undefined;
        let anchor: string | undefined, tooltip: string | undefined, target: string | undefined;
        for (let i = 0; i < args.length; i++) {
          const a = args[i]!;
          if (a === '\\l') anchor = args[++i];
          else if (a === '\\o') tooltip = args[++i];
          else if (a === '\\t') target = args[++i];
          else if (a.startsWith('\\')) { if (a === '\\m' || a === '\\n') continue; }
          else if (url === undefined) url = a;
        }
        if (!url && !anchor) continue;
        const rid = url ? ctx.rels.add('hyperlink', url, true) : undefined;
        out.set(f.begin, { sep: f.sep, end: cp, rid, anchor, tooltip, target });
      }
    }
    return out;
  }

  /** Bookmarks/comentários que começam/terminam neste CP. */
  private emitMarkers(cp: number, out: RunBuf, ctx: StoryCtx, endOnly = false): void {
    // bookmarks: CPs absolutos (valem em qualquer história); comentários só no corpo
    const ends = this.bkEnds.get(cp);
    if (ends) { for (const id of ends) out.raw(el('w:bookmarkEnd', { 'w:id': id })); this.bkEnds.delete(cp); }
    const cEnds = ctx.kind === 'main' ? this.commentEnds.get(cp) : undefined;
    if (cEnds) { for (const id of cEnds) out.raw(el('w:commentRangeEnd', { 'w:id': id })); this.commentEnds.delete(cp); }
    if (endOnly) return;
    const starts = this.bkStarts.get(cp);
    if (starts) { for (const b of starts) out.raw(el('w:bookmarkStart', { 'w:id': b.id, 'w:name': b.name })); this.bkStarts.delete(cp); }
    const cStarts = ctx.kind === 'main' ? this.commentStarts.get(cp) : undefined;
    if (cStarts) { for (const id of cStarts) out.raw(el('w:commentRangeStart', { 'w:id': id })); this.commentStarts.delete(cp); }
  }

  private wrapKey(chp: Chp): string {
    if (chp.rmarkIns) return `ins|${this.revAuthors[chp.ibstRMark ?? 0] ?? 'Autor desconhecido'}|${dttmIso(chp.dttmRMark) ?? ''}`;
    if (chp.rmarkDel) return `del|${this.revAuthors[chp.ibstRMarkDel ?? 0] ?? 'Autor desconhecido'}|${dttmIso(chp.dttmRMarkDel) ?? ''}`;
    return '';
  }

  /**
   * Caractere especial → XML do conteúdo do run ('' = descartar), ou
   * undefined se for texto comum.
   */
  private specialChar(c: number, cp: number, chp: Chp, ctx: StoryCtx): string | undefined {
    switch (c) {
      case 0x09: return '<w:tab/>';
      case 0x0b: return '<w:br/>';
      case 0x0c: return '<w:br w:type="page"/>';
      case 0x0e: return '<w:br w:type="column"/>';
      case 0x1e: return '<w:noBreakHyphen/>';
      case 0x1f: return '<w:softHyphen/>';
      case 0x0d: return '<w:cr/>'; // 0x0D que não é marca de parágrafo (o Word grava w:cr)
      case 0x07: return ''; // marca de célula solta
    }
    if (!chp.fSpec) return c < 0x20 ? '' : undefined;
    switch (c) {
      case 0x01: {
        if (chp.fData || chp.picLocation === undefined) return '';
        if (chp.fOle2) return '';
        const pic = readInlinePicture(this.r, chp.picLocation);
        if (!pic) return '';
        if (!pic.blip && pic.hr) return hrVml(pic);
        return this.inlineDrawing(pic, ctx);
      }
      case 0x02: {
        if (ctx.kind === 'ftn') return '<w:footnoteRef/>';
        if (ctx.kind === 'edn') return '<w:endnoteRef/>';
        const f = this.footnoteIds.get(cp);
        if (f !== undefined) return el('w:footnoteReference', { 'w:id': f });
        const e = this.endnoteIds.get(cp);
        if (e !== undefined) return el('w:endnoteReference', { 'w:id': e });
        return '';
      }
      case 0x05: {
        if (ctx.kind === 'atn') return '<w:annotationRef/>';
        const i = this.commentByRef.get(cp);
        return i !== undefined ? el('w:commentReference', { 'w:id': i }) : '';
      }
      case 0x08: {
        const f = (ctx.hdr ? this.fspaHdr : this.fspaMain).get(cp);
        return f ? this.anchorDrawing(f, ctx) : '';
      }
      case 0x03: return ctx.kind === 'ftn' || ctx.kind === 'edn' ? '<w:separator/>' : '';
      case 0x04: return ctx.kind === 'ftn' || ctx.kind === 'edn' ? '<w:continuationSeparator/>' : '';
    }
    return c < 0x20 ? '' : undefined;
  }

  // ───────────────────────────── imagens/desenhos ─────────────────────────────

  private mediaTarget(blip: Blip): string {
    const key = `${blip.ext}:${blip.bytes.length}:${hash(blip.bytes)}`;
    const hit = this.media.get(key);
    if (hit) return hit;
    const ext = blip.ext === 'jpeg' ? 'jpeg' : blip.ext;
    const name = `media/image${++this.mediaN}.${ext}`;
    this.files.set(`word/${name}`, blip.bytes);
    this.mediaExt.add(ext);
    this.media.set(key, name);
    return name;
  }

  private inlineDrawing(pic: PicInfo, ctx: StoryCtx): string {
    if (!pic.blip) return '';
    const rid = ctx.rels.add('image', this.mediaTarget(pic.blip));
    const id = ++this.docPrId;
    const cx = Math.max(1, Math.round(pic.cx));
    const cy = Math.max(1, Math.round(pic.cy));
    const name = pic.name ?? `Imagem ${id}`;
    return '<w:drawing>' +
      el('wp:inline', { distT: 0, distB: 0, distL: 0, distR: 0 },
        el('wp:extent', { cx, cy }) +
        el('wp:effectExtent', { l: 0, t: 0, r: 0, b: 0 }) +
        el('wp:docPr', { id, name }) +
        '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        picGraphic(id, name, rid, cx, cy, pic)) +
      '</w:drawing>';
  }

  private anchorDrawing(f: Fspa, ctx: StoryCtx): string {
    const r = this.r;
    const shape = r.shape(f.spid, ctx.hdr);
    // forma-mestre (hspMaster de outra): o Word não a desenha nem a grava no .docx
    if (!shape || r.masters.has(shape.spid)) return '';
    const pv = (id: number): number | undefined => shape.props.get(id)?.value;
    const cx = Math.max(1, (f.xaRight - f.xaLeft) * EMU_PER_TWIP);
    const cy = Math.max(1, (f.yaBottom - f.yaTop) * EMU_PER_TWIP);
    // posição: propriedades posh/posrelh/posv/posrelv (tertiary FOPT) ou FSPA bx/by
    const relH = ['margin', 'page', 'column'][f.bx] ?? 'column';
    const relV = ['margin', 'page', 'paragraph'][f.by] ?? 'paragraph';
    const posrelh = pv(0x390), posrelv = pv(0x392), posh = pv(0x38f), posv = pv(0x391);
    // MSOPRH/MSOPRV (0 margem, 1 página, 2 texto, 3 caractere/linha...) — conferido contra o VML do Word
    const relHName = posrelh !== undefined ? (['margin', 'page', 'column', 'character', 'leftMargin', 'rightMargin', 'insideMargin', 'outsideMargin'][posrelh] ?? relH) : relH;
    const relVName = posrelv !== undefined ? (['margin', 'page', 'paragraph', 'line', 'topMargin', 'bottomMargin', 'insideMargin', 'outsideMargin'][posrelv] ?? relV) : relV;
    const hAlign = posh ? ['', 'left', 'center', 'right', 'inside', 'outside'][posh] : '';
    const vAlign = posv ? ['', 'top', 'center', 'bottom', 'inside', 'outside'][posv] : '';
    const positionH = `<wp:positionH relativeFrom="${relHName}">${hAlign ? `<wp:align>${hAlign}</wp:align>` : `<wp:posOffset>${f.xaLeft * EMU_PER_TWIP}</wp:posOffset>`}</wp:positionH>`;
    const positionV = `<wp:positionV relativeFrom="${relVName}">${vAlign ? `<wp:align>${vAlign}</wp:align>` : `<wp:posOffset>${f.yaTop * EMU_PER_TWIP}</wp:posOffset>`}</wp:positionV>`;
    const wrapText = ['bothSides', 'left', 'right', 'largest'][f.wrk] ?? 'bothSides';
    let wrap: string;
    switch (f.wr) {
      case 1: wrap = '<wp:wrapTopAndBottom/>'; break;
      case 2: case 0: wrap = `<wp:wrapSquare wrapText="${wrapText}"/>`; break;
      case 4: wrap = `<wp:wrapTight wrapText="${wrapText}"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapTight>`; break;
      case 5: wrap = `<wp:wrapThrough wrapText="${wrapText}"><wp:wrapPolygon edited="0"><wp:start x="0" y="0"/><wp:lineTo x="0" y="21600"/><wp:lineTo x="21600" y="21600"/><wp:lineTo x="21600" y="0"/><wp:lineTo x="0" y="0"/></wp:wrapPolygon></wp:wrapThrough>`; break;
      default: wrap = '<wp:wrapNone/>';
    }
    const dist = (id: number, def: number): number => pv(id) ?? def;
    const id = ++this.docPrId;
    const name = `Forma ${id}`;
    const graphic = this.shapeGraphic(shape, f, ctx, id, name, cx, cy);
    if (!graphic) return '';
    // forma "em linha com o texto" (Word 2000+ grava como âncora no caractere/linha,
    // deslocamento 0): o Word a converte em objeto em linha
    if (posrelh === 3 && posrelv === 3 && !posh && !posv && f.xaLeft === 0 && f.yaTop === 0) {
      return '<w:drawing>' + el('wp:inline', { distT: 0, distB: 0, distL: 0, distR: 0 },
        el('wp:extent', { cx, cy }) + el('wp:effectExtent', { l: 0, t: 0, r: 0, b: 0 }) +
        el('wp:docPr', { id, name }) + '<wp:cNvGraphicFramePr/>' + graphic) + '</w:drawing>';
    }
    // GroupShapeBooleanProperties (0x3BF): fBehindDocument (5), fLayoutInCell (15),
    // fAllowOverlap (9), fHidden (1) — o FSPA.fBelowText só vale sem a propriedade
    // (Word 97); conferido contra o VML do Word (z-index negativo,
    // o:allowincell, o:allowoverlap)
    const g = pv(0x3bf);
    const behind = oaFlag(g, 5) ?? (f.wr === 3 && f.belowText);
    const a = {
      distT: dist(0x385, 0), distB: dist(0x387, 0), distL: dist(0x384, 114300), distR: dist(0x386, 114300),
      // ordem Z = ordem das formas no desenho (DgContainer), como o z-index do VML do Word
      simplePos: 0, relativeHeight: 251658240 + (shape.z ?? id) * 1024, behindDoc: behind ? 1 : 0,
      locked: f.anchorLock ? 1 : 0, layoutInCell: oaFlag(g, 15) ?? true ? 1 : 0, allowOverlap: oaFlag(g, 9) ?? true ? 1 : 0,
    };
    return '<w:drawing>' + el('wp:anchor', a,
      '<wp:simplePos x="0" y="0"/>' + positionH + positionV +
      el('wp:extent', { cx, cy }) + el('wp:effectExtent', { l: 0, t: 0, r: 0, b: 0 }) + wrap +
      el('wp:docPr', { id, name, hidden: oaFlag(g, 1) ? 1 : undefined }) + '<wp:cNvGraphicFramePr/>' + graphic) + '</w:drawing>';
  }

  /** a:graphic para uma forma flutuante: imagem, forma/caixa de texto ou grupo. */
  private shapeGraphic(shape: OAShape, f: Fspa, ctx: StoryCtx, id: number, name: string, cx: number, cy: number): string {
    if (shape.children && (shape.flags & FSP.group)) {
      const g = shape.groupRect ?? { l: 0, t: 0, r: cx, b: cy };
      const xfrm = xfrmXml('a:xfrm', { x: 0, y: 0, cx, cy }, shape, { x: g.l, y: g.t, cx: g.r - g.l, cy: g.b - g.t });
      const kids = shape.children.map((c) => this.childShapeXml(c, ctx)).join('');
      return '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">' +
        `<wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr>${xfrm}</wpg:grpSpPr>${kids}</wpg:wgp></a:graphicData></a:graphic>`;
    }
    const blip = shapeBlip(this.r, shape);
    const stories = ctx.hdr ? this.txbxHdr : this.txbxMain;
    const story = stories.get(shape.spid) ?? stories.get(f.spid);
    if (blip && !story) {
      const rid = ctx.rels.add('image', this.mediaTarget(blip));
      return picGraphic(id, name, rid, cx, cy, { cx, cy, blip, crop: cropOf(shape), fx: picFxOf(shape) });
    }
    return '<a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">' +
      this.wspXml(shape, ctx, { x: 0, y: 0, cx, cy }, story, false) + '</a:graphicData></a:graphic>';
  }

  /** Forma dentro de grupo (coordenadas no espaço filho do grupo). */
  private childShapeXml(shape: OAShape, ctx: StoryCtx): string {
    const a = shape.childAnchor ?? { l: 0, t: 0, r: 0, b: 0 };
    const box = { x: a.l, y: a.t, cx: Math.max(0, a.r - a.l), cy: Math.max(0, a.b - a.t) };
    if (shape.children && (shape.flags & FSP.group)) {
      const g = shape.groupRect ?? { l: a.l, t: a.t, r: a.r, b: a.b };
      const xfrm = xfrmXml('a:xfrm', box, shape, { x: g.l, y: g.t, cx: g.r - g.l, cy: g.b - g.t });
      const kids = shape.children.map((c) => this.childShapeXml(c, ctx)).join('');
      return `<wpg:grpSp><wpg:cNvGrpSpPr/><wpg:grpSpPr>${xfrm}</wpg:grpSpPr>${kids}</wpg:grpSp>`;
    }
    const id = ++this.docPrId;
    const blip = shapeBlip(this.r, shape);
    const story = (ctx.hdr ? this.txbxHdr : this.txbxMain).get(shape.spid);
    if (blip && !story) {
      const rid = ctx.rels.add('image', this.mediaTarget(blip));
      return `<pic:pic><pic:nvPicPr>${el('pic:cNvPr', { id, name: `Imagem ${id}` })}<pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill>${el('a:blip', { 'r:embed': rid })}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr>${xfrmXml('a:xfrm', box, shape)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`;
    }
    return this.wspXml(shape, ctx, box, story, true, id);
  }

  /** wps:wsp: geometria predefinida, preenchimento, linha e (opcional) caixa de texto. */
  private wspXml(shape: OAShape, ctx: StoryCtx, box: { x: number; y: number; cx: number; cy: number }, story: [number, number] | undefined, child: boolean, id?: number): string {
    const pv = (k: number): number | undefined => shape.props.get(k)?.value;
    if (isWordArtType(shape.type) && !story) {
      const art = wordArtXml(shape, box, child, id);
      if (art) return art;
    }
    const adjust: RawAdjust = [];
    for (let i = 0; i < 10; i++) { const v = pv(0x147 + i); adjust.push(v === undefined ? undefined : v | 0); }
    const geo = presetFor(shape.type, adjust, box.cx || 1, box.cy || 1) ?? { prst: 'rect', av: [] };
    const isLine = shape.type === 20 || isConnectorType(shape.type);
    // booleanos de preenchimento (0x1BF: fFilled, bit 4) e linha (0x1FF: fLine, bit 3);
    // sem o fUse* correspondente vale o padrão (linhas e conectores sem preenchimento)
    const filled = oaFlag(pv(0x1bf), 4) ?? !isLine;
    const lined = oaFlag(pv(0x1ff), 3) ?? true;
    const lineWidth = pv(0x1cb) ?? 9525;
    const av = geo.av.map((g) => el('a:gd', { name: g.name, fmla: `val ${g.val}` })).join('');
    let spPr = xfrmXml('a:xfrm', box, shape, undefined, !!geo.flipV) + `<a:prstGeom prst="${geo.prst}">${av ? `<a:avLst>${av}</a:avLst>` : '<a:avLst/>'}</a:prstGeom>`;
    if (!isLine) spPr += filled ? `<a:solidFill><a:srgbClr val="${oaColor(pv(0x181), 0xffffff)}"/></a:solidFill>` : '<a:noFill/>';
    if (lined) {
      const dash = ['solid', 'sysDash', 'sysDot', 'sysDashDot', 'sysDashDotDot', 'dot', 'dash', 'lgDash', 'dashDot', 'lgDashDot', 'lgDashDotDot'][pv(0x1ce) ?? 0] ?? 'solid';
      const arrow = (v: number | undefined): string | undefined => (v ? ['none', 'triangle', 'stealth', 'diamond', 'oval', 'arrow'][v] ?? 'triangle' : undefined);
      const head = arrow(pv(0x1d0)), tail = arrow(pv(0x1d1));
      spPr += `<a:ln w="${lineWidth}"><a:solidFill><a:srgbClr val="${oaColor(pv(0x1c0), 0x000000)}"/></a:solidFill>` +
        (dash !== 'solid' ? `<a:prstDash val="${dash}"/>` : '') +
        (head ? `<a:headEnd type="${head}"/>` : '') + (tail ? `<a:tailEnd type="${tail}"/>` : '') + '</a:ln>';
    } else spPr += '<a:ln><a:noFill/></a:ln>';
    let txbx = '';
    if (story) {
      const paras = this.collectParas(story[0], story[1]);
      // a história da caixa termina com um parágrafo guarda vazio
      const last = paras[paras.length - 1];
      const list = paras.length > 1 && last && last.cpEnd - last.cpStart === 1 ? paras.slice(0, -1) : paras;
      const saved = this.fieldStack;
      this.fieldStack = [];
      const inner = this.renderBlocks(list, 0, list.length, 0, { ...ctx, kind: 'txbx' });
      this.fieldStack = saved;
      txbx = `<wps:txbx><w:txbxContent>${inner || '<w:p/>'}</w:txbxContent></wps:txbx>`;
    }
    const l = pv(0x81) ?? 91440, t = pv(0x82) ?? 45720, rr = pv(0x83) ?? 91440, b = pv(0x84) ?? 45720;
    const anchor = ['t', 'ctr', 'b', 't', 'ctr', 'b'][pv(0x87) ?? 0] ?? 't';
    // booleanos de texto (0xBF): fFitShapeToText (bit 1) com fUsefFitShapeToText (bit 17)
    const textBits = pv(0xbf) ?? 0;
    const autofit = textBits & (1 << 17) ? (textBits & 2) !== 0 : false;
    const bodyPr = el('wps:bodyPr', { rot: 0, vert: 'horz', wrap: 'square', lIns: l, tIns: t, rIns: rr, bIns: b, anchor, anchorCtr: 0 }, autofit ? '<a:spAutoFit/>' : '<a:noAutofit/>');
    const nv = child && id !== undefined ? el('wps:cNvPr', { id, name: `Forma ${id}` }) : '';
    const cNv = isLine ? '<wps:cNvCnPr/>' : `<wps:cNvSpPr${story ? ' txBox="1"' : ''}/>`;
    return `<wps:wsp>${nv}${cNv}<wps:spPr>${spPr}</wps:spPr>${txbx}${bodyPr}</wps:wsp>`;
  }

  // ───────────────────────────── tabelas ─────────────────────────────

  private tapOf(row: PInfo): Tap {
    const tap = newTap();
    // estilo de tabela: TAPX do estilo primeiro (sem a estrutura de células)
    for (const p of row.tapPrls) if (p.sprm === 0x563a) {
      const st = this.r.stsh.styles[p.r.u16(p.op)];
      if (st?.tapx) for (const q of prls(st.tapx)) if (sgcOf(q.sprm) === 5 && q.sprm !== 0x563a) applyTap(tap, q);
    }
    for (const p of row.tapPrls) applyTap(tap, p);
    finishTap(tap);
    return tap;
  }

  private renderTable(paras: PInfo[], from: number, to: number, depth: number, ctx: StoryCtx): string {
    interface Row { cells: [number, number][]; tap: Tap; ttp?: PInfo; centers?: number[] }
    const rows: Row[] = [];
    let cells: [number, number][] = [];
    let cellStart = from;
    for (let k = from; k < to; k++) {
      const p = paras[k]!;
      if (p.depth !== depth) continue;
      if (p.rowEnd) {
        if (k > cellStart && !cells.length) cells.push([cellStart, k]);
        rows.push({ cells, tap: this.tapOf(p), ttp: p });
        cells = [];
        cellStart = k + 1;
      } else if (p.cellEnd) {
        cells.push([cellStart, k + 1]);
        cellStart = k + 1;
      }
    }
    if (cells.length || cellStart < to) {
      if (cellStart < to) cells.push([cellStart, to]);
      rows.push({ cells, tap: rows.length ? rows[rows.length - 1]!.tap : newTap() });
    }
    if (!rows.length) return '';
    // grade: todas as fronteiras de célula (larguras preferidas em dxa valem mais
    // que o rgdxaCenter — o Word monta a grade por elas)
    for (const row of rows) row.centers = layoutCenters(row.tap, row.cells.length);
    const bounds = new Set<number>();
    for (const row of rows) {
      const c = row.centers!;
      for (let i = 0; i < c.length && i <= row.cells.length; i++) bounds.add(c[i]!);
    }
    const grid = [...bounds].sort((a, b) => a - b);
    const first = rows[0]!.tap;
    let x = '<w:tbl>';
    x += `<w:tblPr>${this.tblPrXml(first)}</w:tblPr>`;
    x += '<w:tblGrid>';
    for (let i = 0; i + 1 < grid.length; i++) x += el('w:gridCol', { 'w:w': grid[i + 1]! - grid[i]! });
    if (grid.length < 2) x += el('w:gridCol', { 'w:w': 0 });
    x += '</w:tblGrid>';
    const gridIdx = (pos: number): number => {
      let best = 0, bestD = Infinity;
      grid.forEach((g, i) => { const d = Math.abs(g - pos); if (d < bestD) { bestD = d; best = i; } });
      return best;
    };
    for (const row of rows) {
      const tap = row.tap;
      // tabela posicionada (tblpPr): as molduras dos parágrafos das células são a
      // posição da TABELA — o Word não as repete nos parágrafos (medido no Word)
      if (isPositioned(tap)) {
        for (const [cs, ce] of row.cells) for (let k = cs; k < ce; k++) if (paras[k]!.depth === depth) for (const key of FRAME_KEYS) paras[k]!.touched.delete(key);
      }
      const c = row.centers!;
      let trPr = '';
      const startIdx = c.length ? gridIdx(c[0]!) : 0;
      const endIdx = c.length ? gridIdx(c[Math.min(row.cells.length, c.length - 1)]!) : 0;
      if (startIdx > 0) trPr += el('w:gridBefore', { 'w:val': startIdx });
      if (endIdx < grid.length - 1 && c.length) trPr += el('w:gridAfter', { 'w:val': grid.length - 1 - endIdx });
      if (startIdx > 0) trPr += el('w:wBefore', { 'w:w': grid[startIdx]! - grid[0]!, 'w:type': 'dxa' });
      if (endIdx < grid.length - 1 && c.length) trPr += el('w:wAfter', { 'w:w': grid[grid.length - 1]! - grid[endIdx]!, 'w:type': 'dxa' });
      if (tap.cantSplit) trPr += '<w:cantSplit/>';
      if (tap.rowHeight) trPr += el('w:trHeight', { 'w:val': Math.abs(tap.rowHeight), 'w:hRule': tap.rowHeight < 0 ? 'exact' : undefined });
      if (tap.header) trPr += '<w:tblHeader/>';
      if (tap.jc) trPr += el('w:jc', { 'w:val': ['left', 'center', 'right'][tap.jc] ?? 'left' });
      // marca de fim de linha oculta (vanish) = linha oculta
      if (row.ttp && this.chpFor(row.ttp, row.ttp.cpEnd - 1).chp.vanish) trPr += '<w:hidden/>';
      x += '<w:tr>';
      const ex = this.tblPrExXml(tap, first);
      if (ex) x += `<w:tblPrEx>${ex}</w:tblPrEx>`;
      if (trPr) x += `<w:trPr>${trPr}</w:trPr>`;
      let ci = 0;
      while (ci < row.cells.length) {
        const tc: Tc | undefined = tap.tcs[ci];
        const [cs, ce] = row.cells[ci]!;
        let span = 1;
        // células mescladas horizontalmente (fMerged) somem dentro da primeira
        if (tc && tc.horzMerge >= 2) {
          while (ci + span < row.cells.length && tap.tcs[ci + span] && tap.tcs[ci + span]!.horzMerge === 1) span++;
        }
        const left = c[ci] ?? 0;
        const right = c[Math.min(ci + span, c.length - 1)] ?? left;
        const gs = Math.max(1, gridIdx(right) - gridIdx(left));
        x += `<w:tc><w:tcPr>${this.tcPrXml(tap, ci, gs, right - left)}</w:tcPr>`;
        const inner = this.renderBlocks(paras, cs, ce, depth, ctx);
        x += inner || '<w:p/>';
        // conteúdo das células mescladas (normalmente vazio) entra na primeira
        for (let k = 1; k < span; k++) {
          const [ms, me] = row.cells[ci + k]!;
          const extra = paras.slice(ms, me).some((pp) => pp.cpEnd - pp.cpStart > 1) ? this.renderBlocks(paras, ms, me, depth, ctx) : '';
          x += extra;
        }
        x += '</w:tc>';
        ci += span;
      }
      x += '</w:tr>';
    }
    x += '</w:tbl>';
    return x;
  }

  private tblPrXml(tap: Tap): string {
    let x = '';
    if (tap.istd !== undefined) {
      const id = this.styleIds.get(tap.istd);
      if (id && tap.istd !== 11) x += el('w:tblStyle', { 'w:val': id });
    }
    if (isPositioned(tap)) {
      const pc = tap.pc ?? 0;
      const pcVert = (pc >> 4) & 3, pcHorz = (pc >> 6) & 3;
      const a: Record<string, string | number | undefined> = {
        'w:leftFromText': tap.dxaFromText, 'w:rightFromText': tap.dxaFromTextRight,
        'w:topFromText': tap.dyaFromText, 'w:bottomFromText': tap.dyaFromTextBottom,
        'w:vertAnchor': ['margin', 'page', 'text'][pcVert] ?? 'text',
        'w:horzAnchor': ['text', 'margin', 'page'][pcHorz] ?? 'text',
      };
      const xa = tap.dxaAbs ?? 0, ya = tap.dyaAbs ?? 0;
      const xAl: Record<number, string> = { [-4]: 'center', [-8]: 'right', [-12]: 'inside', [-16]: 'outside' };
      const yAl: Record<number, string> = { [-4]: 'top', [-8]: 'center', [-12]: 'bottom', [-16]: 'inside', [-20]: 'outside' };
      if (xAl[xa]) a['w:tblpXSpec'] = xAl[xa]; else if (xa) a['w:tblpX'] = xa;
      if (yAl[ya]) a['w:tblpYSpec'] = yAl[ya]; else if (ya) a['w:tblpY'] = ya;
      x += el('w:tblpPr', a);
      if (tap.noAllowOverlap) x += '<w:tblOverlap w:val="never"/>';
    }
    if (tap.bidi) x += '<w:bidiVisual/>';
    x += widthXml('w:tblW', tap.tableWidth) || el('w:tblW', { 'w:w': 0, 'w:type': 'auto' });
    if (tap.jc) x += el('w:jc', { 'w:val': ['left', 'center', 'right'][tap.jc] ?? 'left' });
    if (tap.spacing) x += el('w:tblCellSpacing', { 'w:w': tap.spacing, 'w:type': 'dxa' });
    // sprmTWidthIndent é o w:tblInd que o Word grava; sem ele, calcula pela 1ª célula
    const ind = tap.widthIndent && tap.widthIndent.fts === 3 ? tap.widthIndent.w : tableIndent(tap);
    if (ind !== undefined && ind !== 0 && !tap.jc) x += el('w:tblInd', { 'w:w': ind, 'w:type': 'dxa' });
    if (tap.bordersSet && !allNone(tap.borders)) x += `<w:tblBorders>${bordersXml(tap.borders, true)}</w:tblBorders>`;
    if (tap.shdTable) x += shdXml(tap.shdTable);
    if (tap.autofit === false || tap.autofit === undefined) x += '<w:tblLayout w:type="fixed"/>';
    const mar = cellMargins(tap);
    if (mar) x += `<w:tblCellMar>${mar}</w:tblCellMar>`;
    // TLP.grfatl: bits 0x20..0x400 = primeira/última linha/coluna, sem faixas (mesmos bits do w:tblLook)
    const look = (tap.tlp?.grfatl ?? 0) & 0x07e0;
    x += el('w:tblLook', {
      'w:val': look.toString(16).toUpperCase().padStart(4, '0'),
      'w:firstRow': look & 0x20 ? 1 : 0, 'w:lastRow': look & 0x40 ? 1 : 0,
      'w:firstColumn': look & 0x80 ? 1 : 0, 'w:lastColumn': look & 0x100 ? 1 : 0,
      'w:noHBand': look & 0x200 ? 1 : 0, 'w:noVBand': look & 0x400 ? 1 : 0,
    });
    return x;
  }

  /** Propriedades da linha que diferem da 1ª linha (tblPrEx). */
  private tblPrExXml(tap: Tap, first: Tap): string {
    let x = '';
    if (tap === first) return '';
    if (tap.bordersSet && JSON.stringify(tap.borders) !== JSON.stringify(first.borders)) x += `<w:tblBorders>${bordersXml(tap.borders, true)}</w:tblBorders>`;
    const mar = cellMargins(tap);
    if (mar && mar !== cellMargins(first)) x += `<w:tblCellMar>${mar}</w:tblCellMar>`;
    return x;
  }

  private tcPrXml(tap: Tap, i: number, gridSpan: number, width: number): string {
    const tc = tap.tcs[i];
    let x = '';
    if (tc && tc.ftsWidth === 1) x += el('w:tcW', { 'w:w': 0, 'w:type': 'auto' });
    else if (tc && tc.ftsWidth) x += widthXml('w:tcW', { fts: tc.ftsWidth, w: tc.wWidth });
    else x += el('w:tcW', { 'w:w': Math.max(0, width), 'w:type': 'dxa' });
    if (gridSpan > 1) x += el('w:gridSpan', { 'w:val': gridSpan });
    if (tc?.vertMerge) x += tc.vertMerge === 3 || tc.vertMerge === 2 ? '<w:vMerge w:val="restart"/>' : '<w:vMerge/>';
    if (tc) {
      const sides: [string, Brc | undefined, boolean][] = [
        ['w:top', tc.brcTop, tc.brcSet.top], ['w:left', tc.brcLeft, tc.brcSet.left],
        ['w:bottom', tc.brcBottom, tc.brcSet.bottom], ['w:right', tc.brcRight, tc.brcSet.right],
      ];
      const b = sides.filter(([, , set]) => set).map(([n, brc]) => brcXml(n, brc)).join('');
      if (b) x += `<w:tcBorders>${b}</w:tcBorders>`;
    }
    const shd = cellShd(tap, i);
    if (shd) x += shdXml(shd);
    if (tc?.noWrap) x += '<w:noWrap/>';
    if (tc && (tc.mar.top !== undefined || tc.mar.left !== undefined || tc.mar.bottom !== undefined || tc.mar.right !== undefined)) {
      let m = '';
      if (tc.mar.top !== undefined) m += el('w:top', { 'w:w': tc.mar.top, 'w:type': 'dxa' });
      if (tc.mar.left !== undefined) m += el('w:left', { 'w:w': tc.mar.left, 'w:type': 'dxa' });
      if (tc.mar.bottom !== undefined) m += el('w:bottom', { 'w:w': tc.mar.bottom, 'w:type': 'dxa' });
      if (tc.mar.right !== undefined) m += el('w:right', { 'w:w': tc.mar.right, 'w:type': 'dxa' });
      x += `<w:tcMar>${m}</w:tcMar>`;
    }
    if (tc?.textFlow) x += el('w:textDirection', { 'w:val': ['lrTb', 'tbRl', 'btLr', 'lrTbV', 'tbRlV', 'tbLrV'][tc.textFlow] ?? 'lrTb' });
    if (tc?.fitText) x += '<w:tcFitText/>';
    if (tc?.vertAlign) x += el('w:vAlign', { 'w:val': ['top', 'center', 'bottom'][tc.vertAlign] ?? 'top' });
    if (tc?.hideMark) x += '<w:hideMark/>';
    return x;
  }
}

// ───────────────────────────── auxiliares ─────────────────────────────

interface HyperlinkField { sep: number; end: number; rid?: string; anchor?: string; tooltip?: string; target?: string; unwrap?: boolean }

/** Argumentos de um código de campo: "entre aspas" ou palavras; \\x são chaves. */
function parseFieldArgs(s: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : m[2]!);
  return out;
}

const FRAME_KEYS: PapKey[] = ['dxaAbs', 'dyaAbs', 'dxaWidth', 'pc', 'wr', 'wHeightAbs', 'dyaFromText', 'dxaFromText', 'frameLocked'];

/** sprms de recuo esquerdo/1ª linha (sobrepostos pelo nível da lista em sprmPIlfo). */
const INDENT_SPRMS: Record<number, PapKey> = {
  0x840f: 'dxaLeft', 0x845e: 'dxaLeft', 0x4610: 'dxaLeft', 0x465f: 'dxaLeft',
  0x8411: 'dxaLeft1', 0x8460: 'dxaLeft1', 0x4456: 'dxcLeft', 0x4457: 'dxcLeft1',
};

function push<K, V>(m: Map<K, V[]>, k: K, v: V): void {
  const a = m.get(k);
  if (a) a.push(v); else m.set(k, [v]);
}

const keyIds = new WeakMap<Uint8Array, number>();
let keySeq = 0;
function keyOf(g: Uint8Array): number {
  let k = keyIds.get(g);
  if (k === undefined) { k = ++keySeq; keyIds.set(g, k); }
  return k;
}

function hash(b: Uint8Array): number {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(b.length / 4096));
  for (let i = 0; i < b.length; i += step) h = Math.imul(h ^ b[i]!, 16777619);
  return h >>> 0;
}

/** DTTM → ISO 8601. */
export function dttmIso(v: number | undefined): string | undefined {
  if (!v) return undefined;
  const mint = v & 0x3f, hr = (v >> 6) & 0x1f, dom = (v >> 11) & 0x1f, mon = (v >> 16) & 0xf, yr = ((v >>> 20) & 0x1ff) + 1900;
  if (!dom || !mon) return undefined;
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${yr}-${p(mon)}-${p(dom)}T${p(hr)}:${p(mint)}:00Z`;
}

function notePr(pos: string | undefined, nfc: number | undefined, start: number | undefined, rnc: number | undefined, endnote: boolean): string {
  let x = '';
  if (pos && pos !== 'pageBottom') x += el('w:pos', { 'w:val': pos });
  if (nfc !== undefined && nfc !== (endnote ? 2 : 0)) x += el('w:numFmt', { 'w:val': numFmtOf(nfc) });
  if (start !== undefined && start > 1) x += el('w:numStart', { 'w:val': start });
  if (rnc) x += el('w:numRestart', { 'w:val': ['continuous', 'eachSect', 'eachPage'][rnc] ?? 'continuous' });
  return x;
}

function widthXml(name: string, w: { fts: number; w: number } | undefined): string {
  if (!w || !w.fts) return '';
  const type = ['nil', 'auto', 'pct', 'dxa'][w.fts & 3] ?? 'dxa';
  return el(name, { 'w:w': w.fts === 1 ? 0 : w.w, 'w:type': type });
}

function bordersXml(b: Tap['borders'], inside: boolean): string {
  const sides = inside ? (['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const) : (['top', 'left', 'bottom', 'right'] as const);
  return sides.map((s) => brcXml(`w:${s}`, b[s])).join('');
}

/** Fronteiras das células da linha (rgdxaCenter). */
function layoutCenters(tap: Tap, n: number): number[] {
  const c = tap.centers;
  if (!c.length || n <= 0) return c;
  // Medido no Word: montar a grade pelas larguras preferidas (TC80.wWidth) piora
  // (tabelas com linhas irregulares); o Word usa o rgdxaCenter, salvo ~20 twips
  // de diferença em tabelas raras. Fica o rgdxaCenter.
  return c;
}

function isPositioned(tap: Tap): boolean {
  return tap.dxaAbs !== undefined || tap.dyaAbs !== undefined || tap.pc !== undefined;
}

function allNone(b: Tap['borders']): boolean {
  return (['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const).every((s) => brcNone(b[s]));
}

function cellMargins(tap: Tap): string {
  const p = tap.padding;
  let left = p.left, right = p.right;
  // Word 97: sem sprmTCellPaddingDefault, a margem é o dxaGapHalf
  if (left === undefined && right === undefined && tap.dxaGapHalf !== undefined) { left = tap.dxaGapHalf; right = tap.dxaGapHalf; }
  let m = '';
  if (p.top !== undefined) m += el('w:top', { 'w:w': p.top, 'w:type': 'dxa' });
  if (left !== undefined) m += el('w:left', { 'w:w': left, 'w:type': 'dxa' });
  if (p.bottom !== undefined) m += el('w:bottom', { 'w:w': p.bottom, 'w:type': 'dxa' });
  if (right !== undefined) m += el('w:right', { 'w:w': right, 'w:type': 'dxa' });
  return m;
}

/** Recuo da tabela (modo de compatibilidade 11: até o texto da 1ª célula). */
function tableIndent(tap: Tap): number | undefined {
  if (!tap.centers.length) return undefined;
  const left = tap.tcs[0]?.mar.left ?? tap.padding.left ?? tap.dxaGapHalf ?? 0;
  return tap.centers[0]! + left;
}

function cellShd(tap: Tap, i: number): import('./props.js').Shd | undefined {
  const tc = tap.tcs[i];
  if (tc?.shd) return tc.shd;
  const pick = (arr?: (import('./props.js').Shd | undefined)[]): import('./props.js').Shd | undefined => {
    const s = arr?.[i];
    if (!s) return undefined;
    // ShdAuto (tudo automático, padrão clear) = sem sombreamento
    if (s.pat === 0 && s.back === -1 && s.fore === -1) return undefined;
    if (s.pat === 0xffff) return undefined;
    return s;
  };
  return pick(tap.shdRaw) ?? pick(tap.shdDef) ?? pick(tap.shd80);
}

/** Cadeia UTF-16LE terminada em nulo de uma propriedade complexa. */
function oaString(shape: OAShape, id: number): string | undefined {
  const c = shape.props.get(id)?.complex;
  if (!c || c.length < 2) return undefined;
  let s = '';
  for (let i = 0; i + 1 < c.length; i += 2) {
    const ch = c[i]! | (c[i + 1]! << 8);
    if (!ch) break;
    s += String.fromCharCode(ch);
  }
  return s;
}

/**
 * WordArt clássico (msosptTextPlainText… — geoText): o texto (gtextUNICODE,
 * fonte gtextFont, tamanho gtextSize) é desenhado com o preenchimento da forma;
 * a caixa não tem fundo nem borda. Vira caixa de texto WordArt do DrawingML
 * (bodyPr fromWordArt + prstTxWarp textPlain) com o texto na cor do
 * preenchimento — é a marca-d'água típica (o Word grava v:textpath no VML).
 */
function wordArtXml(shape: OAShape, box: { x: number; y: number; cx: number; cy: number }, child: boolean, id?: number): string | undefined {
  const text = oaString(shape, 0xc0);
  if (!text) return undefined;
  const pv = (k: number): number | undefined => shape.props.get(k)?.value;
  const font = oaString(shape, 0xc5);
  const sizeRaw = pv(0xc3);
  const size = sizeRaw !== undefined ? Math.max(1, Math.round((sizeRaw / 65536) * 2)) : 72;
  const filled = oaFlag(pv(0x1bf), 4) ?? true;
  const rPr = (font ? el('w:rFonts', { 'w:ascii': font, 'w:hAnsi': font, 'w:cs': font }) : '') +
    (filled ? el('w:color', { 'w:val': oaColor(pv(0x181), 0xffffff) }) : '') +
    el('w:sz', { 'w:val': size }) + el('w:szCs', { 'w:val': size });
  const paras = text.split(/\r\n|\r|\n/).map((line) =>
    '<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' +
    `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${escText(line)}</w:t></w:r></w:p>`).join('');
  const spPr = xfrmXml('a:xfrm', box, shape) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln>';
  const bodyPr = el('wps:bodyPr', { rot: 0, vert: 'horz', wrap: 'none', lIns: 0, tIns: 0, rIns: 0, bIns: 0, fromWordArt: 1, anchor: 'ctr', anchorCtr: 0 },
    '<a:prstTxWarp prst="textPlain"><a:avLst/></a:prstTxWarp><a:noAutofit/>');
  const nv = child && id !== undefined ? el('wps:cNvPr', { id, name: `WordArt ${id}` }) : '';
  return `<wps:wsp>${nv}<wps:cNvSpPr txBox="1"/><wps:spPr>${spPr}</wps:spPr><wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx>${bodyPr}</wps:wsp>`;
}

/**
 * Booleano OfficeArt (conjuntos 0x?3F/0x?7F/0x?BF/0x?FF): bit `bit` vale só se o
 * fUse* correspondente (bit + 16) estiver ligado; senão undefined (= padrão).
 */
function oaFlag(v: number | undefined, bit: number): boolean | undefined {
  if (v === undefined || !((v >>> (bit + 16)) & 1)) return undefined;
  return ((v >>> bit) & 1) === 1;
}

function oaColor(v: number | undefined, def: number): string {
  if (v === undefined || (v >>> 24) !== 0) return hex(def);
  return hex(((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff));
}

/**
 * Fundo da página: forma de fundo do desenho principal com preenchimento sólido
 * (fillType 0x180 = 0, fFilled em 0x1BF) → w:background com a cor (0x181).
 */
function backgroundXml(shape: OAShape | undefined): string {
  if (!shape) return '';
  const pv = (k: number): number | undefined => shape.props.get(k)?.value;
  if ((pv(0x180) ?? 0) !== 0 || oaFlag(pv(0x1bf), 4) === false) return '';
  const c = pv(0x181);
  if (c === undefined || (c >>> 24) !== 0) return '';
  const color = oaColor(c, 0xffffff);
  return color === 'FFFFFF' ? '' : el('w:background', { 'w:color': color });
}

/** Linha horizontal em linha (o:hr) — o DrawingML não tem equivalente; o Word grava VML. */
function hrVml(pic: PicInfo): string {
  const hr = pic.hr!;
  const pt = (emu: number): string => String(Math.round((emu / 12700) * 10) / 10);
  const a = {
    style: `width:${pt(pic.cx)}pt;height:${pt(pic.cy)}pt`,
    'o:hrpct': hr.pct, 'o:hralign': hr.align, 'o:hrstd': 't', 'o:hrnoshade': hr.noshade ? 't' : undefined, 'o:hr': 't',
    fillcolor: hr.fill !== undefined ? `#${hex(hr.fill)}` : undefined, stroked: 'f',
  };
  return `<w:pict>${el('v:rect', a)}</w:pict>`;
}

/** a:xfrm com rotação/espelhamento da forma (e o espaço filho, para grupos). */
function xfrmXml(name: string, b: { x: number; y: number; cx: number; cy: number }, shape: OAShape, ch?: { x: number; y: number; cx: number; cy: number }, extraFlipV = false): string {
  const rotRaw = shape.props.get(0x0004)?.value ?? 0;
  const rot = Math.round(((rotRaw | 0) / 65536) * 60000);
  const a = {
    rot: rot ? ((rot % 21600000) + 21600000) % 21600000 : undefined,
    flipH: shape.flags & FSP.flipH ? 1 : undefined,
    // a preset pode ser o espelho vertical da geometria binária (preset-map)
    flipV: !!(shape.flags & FSP.flipV) !== extraFlipV ? 1 : undefined,
  };
  const n = (v: number): number => Math.round(v);
  let c = `<a:off x="${n(b.x)}" y="${n(b.y)}"/><a:ext cx="${Math.max(0, n(b.cx))}" cy="${Math.max(0, n(b.cy))}"/>`;
  if (ch) c += `<a:chOff x="${n(ch.x)}" y="${n(ch.y)}"/><a:chExt cx="${Math.max(0, n(ch.cx))}" cy="${Math.max(0, n(ch.cy))}"/>`;
  return el(name, a, c);
}

function cropOf(shape: OAShape): PicInfo['crop'] {
  const f = (id: number): number => {
    const v = shape.props.get(id)?.value ?? 0;
    return (v | 0) / 65536;
  };
  const c = { t: f(0x100), b: f(0x101), l: f(0x102), r: f(0x103) };
  return c.t || c.b || c.l || c.r ? c : undefined;
}

function picGraphic(id: number, name: string, rid: string, cx: number, cy: number, pic: Pick<PicInfo, 'crop'> & { cx?: number; cy?: number; blip?: Blip; fx?: PicFx | undefined }): string {
  // ajustes de cor da imagem (marca-d'água "desbotada" etc.) dentro do a:blip
  const fx = pic.fx;
  const blipKids = !fx ? '' : (fx.gray ? '<a:grayscl/>' : '') + (fx.biLevel ? '<a:biLevel thresh="50000"/>' : '')
    + (fx.bright || fx.contrast ? el('a:lum', { bright: fx.bright || undefined, contrast: fx.contrast || undefined }) : '');
  let src = '';
  if (pic.crop) {
    const k = (v: number): number => Math.round(v * 100000);
    src = el('a:srcRect', { l: k(pic.crop.l) || undefined, t: k(pic.crop.t) || undefined, r: k(pic.crop.r) || undefined, b: k(pic.crop.b) || undefined });
  }
  return '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:pic><pic:nvPicPr>${el('pic:cNvPr', { id: 0, name })}<pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill>${el('a:blip', { 'r:embed': rid }, blipKids || undefined)}${src}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
    '</a:graphicData></a:graphic>' + (id < 0 ? '' : '');
}

/**
 * Acumulador de runs: junta caracteres seguidos com o mesmo rPr (e o mesmo
 * invólucro de revisão) num único w:r.
 */
class RunBuf {
  private readonly parts: string[] = [];
  private curRPr: string | undefined;
  private openWrap = '';
  private content = '';
  private textBuf = '';
  private textKind: 't' | 'instr' | 'del' | 'delInstr' = 't';

  private flushText(): void {
    if (!this.textBuf) return;
    const tag = { t: 'w:t', instr: 'w:instrText', del: 'w:delText', delInstr: 'w:delInstrText' }[this.textKind];
    const sp = /^\s|\s$/.test(this.textBuf) ? ' xml:space="preserve"' : '';
    this.content += `<${tag}${sp}>${escText(this.textBuf)}</${tag}>`;
    this.textBuf = '';
  }

  private flushRun(): void {
    this.flushText();
    if (this.curRPr !== undefined && this.content) {
      this.parts.push(`<w:r>${this.curRPr ? `<w:rPr>${this.curRPr}</w:rPr>` : ''}${this.content}</w:r>`);
    }
    this.content = '';
    this.curRPr = undefined;
  }

  private setWrap(wrap: string): void {
    if (wrap === this.openWrap) return;
    this.flushRun();
    if (this.openWrap) this.parts.push(this.openWrap.startsWith('ins|') ? '</w:ins>' : '</w:del>');
    this.openWrap = wrap;
    if (wrap) {
      const [kind, author, date] = wrap.split('|');
      this.parts.push(`<w:${kind}${attrs({ 'w:id': this.ids.next++, 'w:author': author, 'w:date': date || undefined })}>`);
    }
  }

  constructor(private readonly ids: { next: number }) {}

  private begin(rPr: string, wrap: string): void {
    this.setWrap(wrap);
    if (this.curRPr !== rPr) { this.flushRun(); this.curRPr = rPr; }
  }

  text(rPr: string, wrap: string, s: string, deleted: boolean): void {
    this.begin(rPr, wrap);
    const kind = deleted ? 'del' : 't';
    if (this.textKind !== kind) { this.flushText(); this.textKind = kind; }
    this.textBuf += s;
  }

  instr(rPr: string, wrap: string, s: string, deleted: boolean): void {
    this.begin(rPr, wrap);
    const kind = deleted ? 'delInstr' : 'instr';
    if (this.textKind !== kind) { this.flushText(); this.textKind = kind; }
    this.textBuf += s;
  }

  special(rPr: string, wrap: string, xml: string): void {
    this.begin(rPr, wrap);
    this.flushText();
    // fldChar sempre em run próprio (o Word exige)
    if (xml.startsWith('<w:fldChar')) {
      this.flushRun();
      this.curRPr = rPr;
      this.content = xml;
      this.flushRun();
      return;
    }
    this.content += xml;
    if (xml.startsWith('<w:drawing') || xml.startsWith('<w:footnoteReference') || xml.startsWith('<w:endnoteReference') || xml.startsWith('<w:commentReference')) {
      this.flushRun();
    }
  }

  raw(xml: string): void {
    this.flushRun();
    this.parts.push(xml);
  }

  close(): string {
    this.setWrap('');
    this.flushRun();
    return this.parts.join('');
  }
}

