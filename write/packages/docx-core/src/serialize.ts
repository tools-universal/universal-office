import { DocxPackage } from './package.js';
import { parseXml, childElements } from './xml.js';
import { EMU_PER_TWIP, isMarkRun, type DocumentModel, type Paragraph, type Run, type SectPr, type BorderEdge } from './document.js';
import type { TableBlock, TableBorders, Block } from './fulldoc.js';
import { NOTE_REF_TEXT, notePropsXml, emptyNotesPart, ensureNoteParts, type NoteKind } from './notes.js';
import { runSig, type SourceStore, type StorySource, type StoryGroup, type ParaSource, type SegSource, type WrapSeg } from './source.js';
import { patchRPr, patchPPr, patchSectPr, pgNumTypeXml, pPrFromProps, rPrFromProps, splitElement, colsXml, DEFAULT_NUM_IDS, type GenNumIds } from './lossless.js';
import {
  patchTblPr, patchTblPrEx, patchTrPr, patchTcPr,
  tblPrXml as tblPrTyped, tblPrExXml as tblPrExTyped, trPrXml as trPrTyped, tcPrXml as tcPrTyped, pgBordersXml,
} from './table-xml.js';
import { beginRevisionIds, ensureRevisionNamespaces, markRevisionXml, revisionAttrs, takeUsedDateUtc, wrapRevision, writeTrackRevisions } from './rev-xml.js';

/**
 * Grava o modelo em word/document.xml (e cabeçalhos/rodapés, numbering,
 * comentários, mídia, rels).
 *
 * Duas formas:
 *  - SEM a fonte original (documento novo, .odt): tudo é gerado das props, na
 *    ordem canônica de elementos observada no word-lab (FINDINGS.md):
 *      rPr: rFonts → b → i → caps → smallCaps → strike → color → sz →
 *           highlight → u → vertAlign
 *      pPr: pStyle → numPr → spacing → ind → jc
 *  - COM a fonte (`WriteOptions.sources`, ver source.ts): o que não mudou sai
 *    byte a byte do arquivo original (parágrafos, tabelas, filhos de topo do
 *    corpo e dos parágrafos — indicadores, campos, hyperlinks, sdt, equações,
 *    formas…); o que mudou é regenerado aplicando só as diferenças sobre o
 *    w:rPr/w:pPr/w:sectPr original (lossless.ts).
 * Listas novas usam numId 1001 (marcador) / 1002 (decimal) — com a fonte, o
 * primeiro par livre do numbering.xml original —, acrescentados a ele.
 */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string): string => esc(s).replace(/"/g, '&quot;');

/** Coletadas durante a serialização; viram media parts + rels. */
interface MediaOut { rid: string; path: string; data: Uint8Array; ext: string; relType?: string; mime?: string }
let mediaOut: MediaOut[] = [];
let drawingId = 0;

/** Estado da gravação sem perdas (uma parte por vez). */
interface Lossless {
  store: SourceStore;
  pkg: DocxPackage;
  /** rels da parte em serialização (hyperlinks novos). */
  relsPath: string;
  /** ids de bloco já emitidos — a 1ª cópia de um parágrafo dividido é a dona. */
  claimed: Set<number>;
  /** algum numPr gerado aponta para as listas novas. */
  genNumbering: boolean;
  /** numIds das listas novas (livres no numbering.xml original). */
  numIds: GenNumIds;
  /** segmentos crus já emitidos ("parágrafo:segmento"). */
  claimedSegs: Set<string>;
  /** cópias ainda por emitir de cada parágrafo de origem (a última leva os marcadores). */
  remaining: Map<number, number>;
  /** runs do parágrafo em serialização (membros de um mesmo objeto). */
  paraRuns: Run[];
  /** objetos de origem já emitidos (uma cópia colada sai com ids novos). */
  emittedObj: Set<number>;
}
let active: Lossless | null = null;

function drawingXml(run: Run): string {
  const img = run.image!;
  const n = ++drawingId;
  const rid = `rIdWnImg${n}`;
  mediaOut.push({ rid, path: `word/media/wnimage${n}.${img.ext}`, data: img.data, ext: img.ext });
  const cx = Math.round(img.widthTwips * EMU_PER_TWIP);
  const cy = Math.round(img.heightTwips * EMU_PER_TWIP);
  return (
    `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${n}" name="Imagem ${n}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${n}" name="Imagem ${n}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

const REL_PACKAGE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package';
const OLE_MIME: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * Objeto OLE incorporado (Planilha do Excel…) como o Word grava: w:object com
 * a forma VML da prévia (v:imagedata) e o o:OLEObject apontando para o pacote
 * em word/embeddings. Namespaces VML declarados no próprio elemento.
 */
function oleObjectXml(run: Run): string {
  const img = run.image!, ole = img.ole!;
  const n = ++drawingId;
  const ridImg = `rIdWnImg${n}`, ridOle = `rIdWnOle${n}`;
  mediaOut.push({ rid: ridImg, path: `word/media/wnimage${n}.${img.ext}`, data: img.data, ext: img.ext });
  mediaOut.push({ rid: ridOle, path: `word/embeddings/wnobject${n}.${ole.ext}`, data: ole.data, ext: ole.ext, relType: REL_PACKAGE, mime: OLE_MIME[ole.ext] ?? 'application/octet-stream' });
  const w = Math.round(img.widthTwips / 2) / 10, h = Math.round(img.heightTwips / 2) / 10;
  const shape = `_x0000_i${1025 + n}`;
  const objId = `_${String(1800000000 + n * 7919).slice(0, 10)}`;
  return `<w:object xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" w:dxaOrig="${Math.round(img.widthTwips)}" w:dyaOrig="${Math.round(img.heightTwips)}">` +
    '<v:shapetype id="_x0000_t75" coordsize="21600,21600" o:spt="75" o:preferrelative="t" path="m@4@5l@4@11@9@11@9@5xe" filled="f" stroked="f">' +
    '<v:stroke joinstyle="miter"/><v:formulas><v:f eqn="if lineDrawn pixelLineWidth 0"/><v:f eqn="sum @0 1 0"/><v:f eqn="sum 0 0 @1"/>' +
    '<v:f eqn="prod @2 1 2"/><v:f eqn="prod @3 21600 pixelWidth"/><v:f eqn="prod @3 21600 pixelHeight"/><v:f eqn="sum @0 0 1"/>' +
    '<v:f eqn="prod @6 1 2"/><v:f eqn="prod @7 21600 pixelWidth"/><v:f eqn="sum @8 21600 0"/><v:f eqn="prod @7 21600 pixelHeight"/>' +
    '<v:f eqn="sum @10 21600 0"/></v:formulas><v:path o:extrusionok="f" gradientshapeok="t" o:connecttype="rect"/><o:lock v:ext="edit" aspectratio="t"/></v:shapetype>' +
    `<v:shape id="${shape}" type="#_x0000_t75" style="width:${w}pt;height:${h}pt" o:ole=""><v:imagedata r:id="${ridImg}" o:title=""/></v:shape>` +
    `<o:OLEObject Type="Embed" ProgID="${escAttr(ole.progId)}" ShapeID="${shape}" DrawAspect="Content" ObjectID="${objId}" r:id="${ridOle}"/>` +
    '</w:object>';
}

/** Atualiza a GEOMETRIA (tamanho/posição) do <w:drawing> cru a partir dos
 *  valores atuais do objeto — reflete mover/redimensionar feitos na UI mantendo
 *  o resto do shape intacto. Idempotente quando nada mudou. */
function patchDrawingGeometry(
  raw: string,
  obj: { widthTwips: number; heightTwips: number; offsetXTwips?: number; offsetYTwips?: number },
): string {
  const cx = Math.round(obj.widthTwips * EMU_PER_TWIP);
  const cy = Math.round(obj.heightTwips * EMU_PER_TWIP);
  let out = raw
    .replace(/<wp:extent\b[^>]*\/>/, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`))
    .replace(/<a:ext\b[^>]*\/>/g, (m) => m.replace(/cx="\d+"/, `cx="${cx}"`).replace(/cy="\d+"/, `cy="${cy}"`));
  if (obj.offsetXTwips !== undefined) {
    const ex = Math.round(obj.offsetXTwips * EMU_PER_TWIP);
    out = out.replace(/<wp:positionH\b[^>]*>[\s\S]*?<\/wp:positionH>/, (b) =>
      b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ex}$2`));
  }
  if (obj.offsetYTwips !== undefined) {
    const ey = Math.round(obj.offsetYTwips * EMU_PER_TWIP);
    out = out.replace(/<wp:positionV\b[^>]*>[\s\S]*?<\/wp:positionV>/, (b) =>
      b.replace(/(<wp:posOffset>)-?\d+(<\/wp:posOffset>)/, `$1${ey}$2`));
  }
  return out;
}

/** Reemite o <w:drawing> CRU trocando o conteúdo de CADA <w:txbxContent> pelos
 *  parágrafos (possivelmente editados). Preserva shape/âncora/fill do original;
 *  campos (PAGE/NUMPAGES) voltam como fldSimple via paraXml. */
function drawingWithParas(rawDrawingXml: string, paras: Paragraph[], blocks?: Block[]): string {
  const inner = blocks?.length ? blocks.map(blockXml).join('') : paras.map(paraXml).join('');
  return rawDrawingXml.replace(
    /<w:txbxContent\b[^>]*>[\s\S]*?<\/w:txbxContent>/g,
    (m) => `${/^<w:txbxContent\b[^>]*>/.exec(m)![0]}${inner}</w:txbxContent>`,
  );
}

const isObjectRun = (r: Run): boolean => !!(r.image || r.textbox || r.shape || r.group);

/**
 * Objeto lido (imagem, caixa de texto, forma, grupo, VML, mc:AlternateContent):
 * sai o elemento de origem inteiro, com o rPr do run. Um objeto que virou
 * vários runs (grupo VML com caixas de texto…) sai uma vez, pelo 1º run
 * presente, com o texto de CADA caixa no seu w:txbxContent; um membro apagado
 * não é representável no objeto e o resto do grupo continua. Cópia colada sai
 * com ids de desenho novos. undefined = sem objeto de origem (gerador antigo).
 */
function objectXml(run: Run): string | undefined {
  const lossless = active!;
  const sid = run.props.src;
  const src = sid !== undefined ? lossless.store.runs.get(sid) : undefined;
  const headSid = src?.obj !== undefined ? sid! : src?.objHead;
  const head = headSid !== undefined ? lossless.store.runs.get(headSid) : undefined;
  const rpr = rPrXml(run);
  if (!head?.obj) {
    if (run.image?.ole && !run.image.rawDrawingXml) return `<w:r>${rpr}${oleObjectXml(run)}</w:r>`;
    if (run.image?.rawDrawingXml) return `<w:r>${rpr}${patchDrawingGeometry(run.image.rawDrawingXml, run.image)}</w:r>`;
    if (run.image) return `<w:r>${drawingXml(run)}</w:r>`;
    if (run.textbox?.rawDrawingXml) {
      return `<w:r>${rpr}${drawingWithParas(patchDrawingGeometry(run.textbox.rawDrawingXml, run.textbox), run.textbox.paras, run.textbox.blocks)}</w:r>`;
    }
    return run.textbox ? '' : undefined;
  }
  // membros do objeto: o run que o leva e os seguintes do mesmo objeto, juntos.
  // Um membro logo depois do seu run-cabeça já saiu com ele; sem a cabeça
  // (apagada), o 1º membro da sequência emite o objeto. Uma cópia colada do
  // run-cabeça é outra ocorrência (sai com ids novos).
  const runs = lossless.paraRuns;
  const idx = runs.indexOf(run);
  const isMember = (r: Run): boolean => isObjectRun(r) && r.props.src !== undefined
    && lossless.store.runs.get(r.props.src)?.objHead === headSid;
  if (idx >= 0 && src?.objHead !== undefined) {
    let k = idx - 1;
    while (k >= 0 && isMember(runs[k]!)) k--;
    if (k >= 0 && runs[k]!.props.src === headSid && isObjectRun(runs[k]!)) return '';
    if (k !== idx - 1) return '';
  }
  const members = [run];
  for (let k = idx + 1; idx >= 0 && k < runs.length && isMember(runs[k]!); k++) members.push(runs[k]!);
  let xml = head.obj;
  // caixas de texto do objeto na ordem do XML: runs-caixa e itens de grupo
  const boxes = members.flatMap((r) => (r.textbox ? [r.textbox] : (r.group?.items ?? []).flatMap((it) => (it.run.textbox ? [it.run.textbox] : []))));
  if (boxes.length) {
    const inners = boxes.map((b) => (b.blocks?.length ? b.blocks.map(blockXml) : b.paras.map(paraXml)).join(''));
    const total = (xml.match(/<w:txbxContent\b/g) ?? []).length;
    // 1 caixa: todas as ocorrências (mc:Choice + VML de reserva); n caixas: na ordem
    // (e de novo na reserva); contagem que não fecha: o texto fica como estava
    const pick = boxes.length === 1 ? () => 0 : total === boxes.length || total === 2 * boxes.length ? (k: number) => k % boxes.length : null;
    if (pick) {
      let k = 0;
      xml = xml.replace(/<w:txbxContent\b[^>]*>[\s\S]*?<\/w:txbxContent>/g, (m) => `${/^<w:txbxContent\b[^>]*>/.exec(m)![0]}${inners[pick(k++)]}</w:txbxContent>`);
    }
  }
  const geo = members.length <= 1 ? run.image ?? run.textbox : undefined;
  if (geo) xml = patchDrawingGeometry(xml, geo);
  if (lossless.emittedObj.has(headSid!)) xml = freshDrawingIds(xml);
  lossless.emittedObj.add(headSid!);
  return `<w:r>${rpr}${xml}</w:r>`;
}

let freshId = 0;
/** Cópia de um objeto: ids de desenho novos (docPr único) e sem âncoras/ids de forma repetidos. */
function freshDrawingIds(xml: string): string {
  return xml
    .replace(/(<wp:docPr\b[^>]*?\bid=")\d+"/g, (_m, a: string) => `${a}${900000 + ++freshId}"`)
    .replace(/\s(?:wp14:anchorId|wp14:editId|o:spid)="[^"]*"/g, '');
}

/** w:rPr do run: o cru de origem com as diferenças (sem perdas) ou gerado das props. */
function rPrXml(run: Run): string {
  const sid = run.props.src;
  const src = active && sid !== undefined ? active.store.runs.get(sid) : undefined;
  return src ? patchRPr(src.rPr, run) : rPrFromProps(run.props, active !== null);
}

/** Texto do run (excluído em revisão: w:delText). */
function textXml(text: string, deleted = false): string {
  const t = deleted ? 'w:delText' : 'w:t';
  const parts: string[] = [];
  for (const seg of text.split(/(\t|\n|\f|\u000B|\u2011|\u00AD|\u2028)/)) {
    if (seg === '\t') parts.push('<w:tab/>');
    else if (seg === '\n') parts.push('<w:br/>');
    else if (seg === '\f') parts.push('<w:br w:type="page"/>');
    else if (seg === '\u000B') parts.push('<w:br w:type="column"/>');
    else if (seg === '\u2011') parts.push('<w:noBreakHyphen/>');
    else if (seg === '\u00AD') parts.push('<w:softHyphen/>');
    else if (seg === '\u2028') parts.push('<w:br w:clear="all"/>');
    else if (seg.length > 0) {
      const space = seg !== seg.trim() ? ' xml:space="preserve"' : '';
      parts.push(`<${t}${space}>${esc(seg)}</${t}>`);
    }
  }
  return parts.join('');
}

/** w:fldChar num run (começo/separação/fim de campo complexo). */
const fldCharXml = (rpr: string, type: 'begin' | 'separate' | 'end'): string => `<w:r>${rpr}<w:fldChar w:fldCharType="${type}"/></w:r>`;

/** Marcas de largura zero do modelo do editor: indicador e começo/fim de campo
 *  que atravessa parágrafos (como o Word grava — oráculo refs-lab). */
function markXml(run: Run): string | undefined {
  if (run.bookmark) {
    const b = run.bookmark;
    return b.end ? `<w:bookmarkEnd w:id="${b.id}"/>` : `<w:bookmarkStart w:id="${b.id}" w:name="${escAttr(b.name)}"/>`;
  }
  if (run.fieldBegin !== undefined) {
    const rpr = rPrXml(run);
    return fldCharXml(rpr, 'begin') + `<w:r>${rpr}<w:instrText xml:space="preserve">${esc(run.fieldBegin)}</w:instrText></w:r>` + fldCharXml(rpr, 'separate');
  }
  if (run.fieldEnd) return fldCharXml(rPrXml(run), 'end');
  return undefined;
}

function runXml(run: Run): string {
  const mark = markXml(run);
  if (mark !== undefined) return mark;
  if (run.custom) {
    const type = run.custom.type;
    if (!/^[a-zA-Z0-9._-]+$/.test(type)) {
      throw new Error(`tipo de inline customizado inválido: ${type}`);
    }
    const json = JSON.stringify(run.custom.data);
    if (json === undefined) throw new Error(`dados do inline "${type}" não são serializáveis em JSON`);
    const tag = `wordnext:inline:${type}:${encodeURIComponent(json)}`;
    const fallbackRun: Run = {
      text: run.custom.fallbackText,
      props: run.props,
    };
    return (
      `<w:sdt><w:sdtPr>` +
      `<w:alias w:val="${escAttr(run.custom.fallbackText)}"/>` +
      `<w:tag w:val="${escAttr(tag)}"/>` +
      `<w:lock w:val="sdtLocked"/>` +
      `</w:sdtPr><w:sdtContent>${runXml(fallbackRun)}</w:sdtContent></w:sdt>`
    );
  }
  if (active && (run.image || run.textbox || run.shape || run.group)) {
    const x = objectXml(run);
    if (x !== undefined) return x;
  }
  if (run.image) {
    // imagem original: reemite o <w:drawing> CRU (preserva âncora/flutuante e
    // reusa a mídia/rels existentes), com a geometria atual (mover/redimensionar).
    // Só reconstrói para imagens NOVAS.
    if (run.image.rawDrawingXml) {
      return `<w:r>${patchDrawingGeometry(run.image.rawDrawingXml, run.image)}</w:r>`;
    }
    if (run.image.ole) return `<w:r>${oleObjectXml(run)}</w:r>`;
    return `<w:r>${drawingXml(run)}</w:r>`;
  }
  // caixa de texto: reemite o <w:drawing> CRU com a geometria atual, trocando só
  // o <w:txbxContent> pelos parágrafos (possivelmente editados). Sem o cru (caixa
  // criada por nós), emite nada — evitando XML de shape inválido.
  if (run.textbox) {
    if (run.textbox.rawDrawingXml) {
      const geo = patchDrawingGeometry(run.textbox.rawDrawingXml, run.textbox);
      return `<w:r>${drawingWithParas(geo, run.textbox.paras)}</w:r>`;
    }
    return '';
  }
  const rpr = rPrXml(run);
  if (run.noteRef) {
    // o texto do run é só o lugar da marca no editor (o número é do motor); a
    // marca personalizada é o texto do run seguinte
    const tag = run.noteRef.kind === 'footnote' ? 'w:footnoteReference' : 'w:endnoteReference';
    const r = rpr || '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>';
    return `<w:r>${r}<${tag}${run.noteRef.custom ? ' w:customMarkFollows="1"' : ''} w:id="${run.noteRef.id}"/></w:r>`;
  }
  if (run.field && (run.text === '' || run.text === NOTE_REF_TEXT) && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(run.field)) {
    return `<w:r>${rpr}<w:${run.field.includes('FOOTNOTE') ? 'footnoteRef' : 'endnoteRef'}/></w:r>`;
  }
  if (active && run.ptab) {
    const t = run.ptab;
    return `<w:r>${rpr}<w:ptab w:relativeTo="${escAttr(t.relativeTo)}" w:alignment="${escAttr(t.alignment)}"` +
      `${t.leader ? ` w:leader="${escAttr(t.leader)}"` : ''}/></w:r>`;
  }
  if (active && run.symFont && run.text.length === 1) {
    const code = run.text.charCodeAt(0);
    const hex = (code >= 0xf000 && code <= 0xf0ff ? code & 0xff : code).toString(16).toUpperCase().padStart(4, '0');
    return `<w:r>${rpr}<w:sym w:font="${escAttr(run.symFont)}" w:char="${hex}"/></w:r>`;
  }
  if (active && (run.math || run.props.isMath)) {
    return `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><m:r><m:t>${esc(run.text)}</m:t></m:r></m:oMath>`;
  }
  return `<w:r>${rpr}${textXml(run.text, !!run.props.del)}</w:r>`;
}

/** Campo: fldSimple com o resultado atual (o Word o atualiza sozinho). Dentro de
 *  uma revisão (w:ins/w:del só contêm runs) o campo sai na forma complexa. */
function fieldOrRunXml(r: Run): string {
  if (!r.field || (active && /^\s*(FOOTNOTE|ENDNOTE)REF_MARK\s*$/.test(r.field))) return runXml(r);
  if (!r.props.ins && !r.props.del) {
    if (/^\s*=/.test(r.field)) return formulaFieldXml(r);
    // o Word grava na forma complexa o campo com hiperlink (\h) e o resultado com
    // mais de uma formatação; o resto como w:fldSimple (oráculo refs-lab, xr-*)
    const result = fieldResultXml(r);
    if (/\\h\b/i.test(r.field) || (r.props.src === undefined && (r.fieldResult?.length ?? 0) > 1)) {
      const rpr = rPrXml(r);
      return fldCharXml(rpr, 'begin') + `<w:r>${rpr}<w:instrText xml:space="preserve">${esc(r.field)}</w:instrText></w:r>` +
        fldCharXml(rpr, 'separate') + result + fldCharXml(rpr, 'end');
    }
    return `<w:fldSimple w:instr="${escAttr(r.field)}">${result}</w:fldSimple>`;
  }
  const rpr = rPrXml(r);
  const ch = (type: string): string => `<w:r>${rpr}<w:fldChar w:fldCharType="${type}"/></w:r>`;
  const it = r.props.del ? 'w:delInstrText' : 'w:instrText';
  return ch('begin') + `<w:r>${rpr}<${it} xml:space="preserve">${esc(r.field)}</${it}></w:r>` + ch('separate') + runXml(r) + ch('end');
}

/** Resultado de um campo: o lido sai como o run achatado (com o rPr de origem); o
 *  criado no editor, pelos runs formatados do resultado (REF copia a formatação
 *  direta do trecho; PAGEREF/SEQ levam w:noProof — oráculo refs-lab). */
function fieldResultXml(r: Run): string {
  if (r.props.src !== undefined || !r.fieldResult?.length) return runXml(r);
  return r.fieldResult.map((x) => runXml(x)).join('');
}

const revKey = (r: unknown): string => JSON.stringify(r ?? null);

/** Runs nos envoltórios de revisão, pelas props: w:ins por fora, w:del por dentro
 *  (a inserção de outro autor excluída é <w:ins><w:del>…, como o Word grava). */
function revisionRuns(items: { run: Run; before: string; after: string }[]): string {
  const plain = (xs: typeof items): string => xs.map((it) => it.before + fieldOrRunXml(it.run) + it.after).join('');
  const dels = (xs: typeof items): string => {
    let out = '';
    for (let i = 0; i < xs.length;) {
      const d = xs[i]!.run.props.del;
      let j = i + 1;
      while (j < xs.length && revKey(xs[j]!.run.props.del) === revKey(d)) j++;
      out += d ? wrapRevision('del', d, plain(xs.slice(i, j))) : plain(xs.slice(i, j));
      i = j;
    }
    return out;
  };
  let out = '';
  for (let i = 0; i < items.length;) {
    const ins = items[i]!.run.props.ins;
    let j = i + 1;
    while (j < items.length && revKey(items[j]!.run.props.ins) === revKey(ins)) j++;
    out += ins ? wrapRevision('ins', ins, dels(items.slice(i, j))) : dels(items.slice(i, j));
    i = j;
  }
  return out;
}

/** Campo de fórmula (= …): campo complexo como o Word grava — o resultado leva w:noProof. */
function formulaFieldXml(r: Run): string {
  const rpr = rPrXml(r);
  const wrap = (inner: string, pr = rpr): string => `<w:r>${pr}${inner}</w:r>`;
  return wrap('<w:fldChar w:fldCharType="begin"/>') +
    wrap(`<w:instrText xml:space="preserve">${esc(r.field!)}</w:instrText>`) +
    wrap('<w:fldChar w:fldCharType="separate"/>') +
    wrap(textXml(r.text), withNoProof(rpr)) +
    wrap('<w:fldChar w:fldCharType="end"/>');
}

/** w:noProof no lugar do esquema dentro de um w:rPr (ou um w:rPr novo). */
function withNoProof(rpr: string): string {
  if (!rpr || rpr === '<w:rPr/>') return '<w:rPr><w:noProof/></w:rPr>';
  if (/<w:noProof\b/.test(rpr)) return rpr;
  const m = /<w:(snapToGrid|vanish|webHidden|color|spacing|w|kern|position|sz|szCs|highlight|u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath|rPrChange)\b/.exec(rpr);
  const at = m ? m.index : rpr.lastIndexOf('</w:rPr>');
  return rpr.slice(0, at) + '<w:noProof/>' + rpr.slice(at);
}

/** Rel de hyperlink externo na parte atual (reusa o existente com o mesmo alvo). */
function linkRelId(url: string): string | undefined {
  if (!active) return undefined;
  const { pkg, relsPath } = active;
  let rels = pkg.getPartText(relsPath) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (/TargetMode="External"/.test(tag) && /\/hyperlink"/.test(tag) && tag.includes(`Target="${escAttr(url)}"`)) {
      return /\bId="([^"]+)"/.exec(tag)?.[1];
    }
  }
  let n = 1;
  while (rels.includes(`Id="rIdWnLink${n}"`)) n++;
  const id = `rIdWnLink${n}`;
  rels = rels.replace('</Relationships>',
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escAttr(url)}" TargetMode="External"/></Relationships>`);
  pkg.setPartText(relsPath, rels);
  return id;
}

/** Runs gerados com marcadores de comentário em volta (before/after) e
 *  hyperlinks reagrupados (só na gravação sem perdas — o caminho antigo nunca
 *  emitiu w:hyperlink). */
function genRuns(items: { run: Run; before: string; after: string }[], inWrapper = false): string {
  const out: string[] = [];
  let i = 0;
  while (i < items.length) {
    const link = active && !inWrapper ? items[i]!.run.props.link : undefined;
    if (!link) {
      let j = i + 1;
      while (j < items.length && !(active && !inWrapper && items[j]!.run.props.link)) j++;
      out.push(revisionRuns(items.slice(i, j)));
      i = j;
      continue;
    }
    let j = i;
    // (uma marca de largura zero — indicador — no meio do hiperlink fica dentro dele)
    const sameLink = (k: number): boolean => {
      for (let m = k; m < items.length; m++) {
        if (items[m]!.run.props.link === link) return true;
        if (!isMarkRun(items[m]!.run)) return false;
      }
      return false;
    };
    while (j < items.length && sameLink(j)) j++;
    const inner = revisionRuns(items.slice(i, j));
    const tip = items[i]!.run.props.linkTip;
    const attr = link.startsWith('#') ? ` w:anchor="${escAttr(link.slice(1))}"` : (() => {
      const id = linkRelId(link);
      return id ? ` r:id="${id}"` : '';
    })();
    // w:tooltip (Dica de Tela) antes de w:history, como o Word grava (oráculo refs-lab, hl-*)
    out.push(attr ? `<w:hyperlink${attr}${tip ? ` w:tooltip="${escAttr(tip)}"` : ''} w:history="1">${inner}</w:hyperlink>` : inner);
    i = j;
  }
  return out.join('');
}

/** Marcadores de comentário: começo antes do 1º run com o id, fim + referência
 *  depois do último. `skip`: ids cujos marcadores já estão no XML cru. */
function commentMarks(runs: Run[], skip?: ReadonlySet<number>): { before: string[]; after: string[] } {
  const firstOf = new Map<number, number>();
  const lastOf = new Map<number, number>();
  runs.forEach((r, i) => {
    for (const id of r.props.commentIds ?? []) {
      if (skip?.has(id)) continue;
      if (!firstOf.has(id)) firstOf.set(id, i);
      lastOf.set(id, i);
    }
  });
  const before = runs.map(() => '');
  const after = runs.map(() => '');
  for (const [id, i] of firstOf) before[i] += `<w:commentRangeStart w:id="${id}"/>`;
  for (const [id, i] of lastOf) {
    after[i] += `<w:commentRangeEnd w:id="${id}"/>` +
      `<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
  }
  return { before, after };
}

/** Objetos sem gerador próprio: se mudaram, o XML cru de origem ainda é a melhor saída. */
const isAtomic = (r: Run): boolean => !!(r.shape || r.group || r.math || r.props.isMath || r.formField || (r.image && !r.image.rawDrawingXml));

/** Runs de um parágrafo com fonte original: segmentos intactos saem crus,
 *  marcadores (indicadores, comentários, proofErr…) ficam na posição relativa,
 *  o resto é gerado. Um parágrafo dividido tem várias cópias com a mesma fonte:
 *  cada segmento sai uma vez só (`claimedSegs`), e os marcadores que nenhuma
 *  cópia alcançou saem na última (`last`). */
function runsLossless(para: Paragraph, src: ParaSource, pid: number, last: boolean): string {
  const lossless = active!;
  const store = lossless.store;
  const segs = src.segs;
  const cur = para.runs;
  const where = new Map<number, [number, number]>();
  segs.forEach((g, gi) => g.sids.forEach((sid, k) => where.set(sid, [gi, k])));
  const base = new Map<number, number>();
  src.sig?.sids.forEach((sid, i) => base.set(sid, src.sig!.runs[i]!));
  // o run ORIGINAL de cada id é o 1º igual à linha de base (texto digitado ao
  // lado herda as props — e o id — do vizinho, mas é outro run)
  const orig = new Map<number, Run>();
  for (const r of cur) {
    const sid = r.props.src;
    if (sid !== undefined && !orig.has(sid) && base.get(sid) === runSig(r)) orig.set(sid, r);
  }
  const intact = (r: Run): boolean => r.props.src !== undefined && orig.get(r.props.src) === r;
  const segKey = (gi: number): string => `${pid}:${gi}`;
  const taken = (gi: number): boolean => lossless.claimedSegs.has(segKey(gi));
  const take = (gi: number): void => { lossless.claimedSegs.add(segKey(gi)); };
  const marks = commentMarks(cur, store.commentIds);
  let out = '';
  let pending: { run: Run; before: string; after: string }[] = [];
  const flushGen = (): void => { if (pending.length) { out += genRuns(pending); pending = []; } };
  let zp = 0;
  const flushZero = (upTo: number): void => {
    for (; zp < upTo; zp++) {
      const g = segs[zp]!;
      if (g.sids.length === 0 && !taken(zp)) { take(zp); flushGen(); out += g.raw; }
    }
  };
  // 1º run atômico de cada id (equação, forma…): é ele que leva o cru de volta
  const firstAtomic = new Map<number, Run>();
  for (const r of cur) if (r.props.src !== undefined && isAtomic(r) && !firstAtomic.has(r.props.src)) firstAtomic.set(r.props.src, r);
  const markObjects = (g: SegSource): void => {
    for (const sid of g.sids) if (store.runs.get(sid)?.obj !== undefined) lossless.emittedObj.add(sid);
  };
  for (let i = 0; i < cur.length;) {
    const r = cur[i]!;
    const loc = r.props.src !== undefined ? where.get(r.props.src) : undefined;
    if (loc && segs[loc[0]]!.open) {
      // campo que só fecha num parágrafo seguinte (sumário): o fim dele está cru
      // lá, então o começo sai cru aqui — uma vez — e os pedaços editados ficam de
      // fora (o Word refaz o resultado ao atualizar o campo)
      if (!taken(loc[0])) {
        flushZero(loc[0]);
        flushGen();
        out += marks.before[i]! + segs[loc[0]]!.raw;
        take(loc[0]);
        zp = Math.max(zp, loc[0] + 1);
      }
      i++;
      continue;
    }
    if (loc && loc[0] >= zp && !taken(loc[0])) {
      const g = segs[loc[0]]!;
      let ok = loc[1] === 0 && i + g.sids.length <= cur.length;
      for (let k = 0; ok && k < g.sids.length; k++) ok = cur[i + k]!.props.src === g.sids[k] && intact(cur[i + k]!);
      // objeto sem gerador (equação, forma, campo de formulário): o cru, mesmo mudado
      // (objeto com o XML de origem guardado é refeito por objectXml, com o texto atual)
      const fallback = !ok && g.sids.length === 1 && isAtomic(r) && firstAtomic.get(r.props.src!) === r
        && !(isObjectRun(r) && store.runs.get(r.props.src!)?.obj !== undefined);
      if (ok || fallback) {
        flushZero(loc[0]);
        flushGen();
        const n = g.sids.length;
        out += marks.before[i]! + g.raw + marks.after[i + n - 1]!;
        markObjects(g);
        take(loc[0]);
        zp = loc[0] + 1;
        i += n;
        continue;
      }
      flushZero(loc[0]);
      const sameWrap = (x: Run): boolean => g.link === undefined || (x.props.link === g.link && (x.props.linkTip ?? '') === (g.tip ?? ''));
      if (g.wrapOpen !== undefined && sameWrap(r)) {
        // contêiner (sdt, hyperlink, revisão…) com conteúdo mudado: reembrulha os
        // runs dele que seguem juntos
        const own = new Set(g.sids);
        let j = i;
        while (j < cur.length && cur[j]!.props.src !== undefined && own.has(cur[j]!.props.src!)
          && sameWrap(cur[j]!)) j++;
        flushGen();
        out += g.wrapOpen + genRuns(cur.slice(i, j).map((run, k) => ({ run, before: marks.before[i + k]!, after: marks.after[i + k]! })), true) + g.wrapClose;
        take(loc[0]);
        zp = loc[0] + 1;
        i = j;
        continue;
      }
    }
    pending.push({ run: r, before: marks.before[i]!, after: marks.after[i]! });
    i++;
  }
  flushGen();
  if (last) flushZero(segs.length);
  return out;
}

/** w:sectPr que um parágrafo deve levar (null = nenhum; undefined = o do cru). */
function paraSectPr(para: Paragraph, rawPPr: string | undefined): string | null | undefined {
  const rawSect = rawPPr ? splitElement(rawPPr).kids.find((k) => k.name === 'w:sectPr')?.raw : undefined;
  const sb = para.props.sectionBreak;
  if (!sb) return rawSect ? null : undefined;
  return sectionBreakXml(sb, rawSect);
}

/** w:sectPr de uma quebra de seção: o cru do parágrafo (ou o da seção de onde a
 *  quebra nova foi copiada — sb.raw) com as diferenças; sem cru, gerado. */
function sectionBreakXml(sb: NonNullable<Paragraph['props']['sectionBreak']>, rawSect?: string): string {
  const refs = [...sb.headerRefs, ...sb.footerRefs];
  const base = rawSect ?? sb.raw;
  return base ? patchSectPr(base, sb.sectPr, refs) : `<w:sectPr>${sectPrInner(sb.sectPr, refs)}</w:sectPr>`;
}

function paraXml(para: Paragraph): string {
  if (!active) return paraXmlRuns(para);
  const prev = active.paraRuns;
  active.paraRuns = para.runs;
  try { return paraXmlRuns(para); } finally { active.paraRuns = prev; }
}

function paraXmlRuns(para: Paragraph): string {
  const src = active && para.props.src !== undefined ? active.store.paras.get(para.props.src) : undefined;
  if (!active || !src) {
    const marks = commentMarks(para.runs, active?.store.commentIds);
    const items = para.runs.map((run, i) => ({ run, before: marks.before[i]!, after: marks.after[i]! }));
    if (!active) return paraXmlInner(para, revisionRuns(items));
    // formatação copiada de um parágrafo lido: o w:pPr cru dele com as diferenças
    const fmt = para.props.fmtSrc !== undefined ? active.store.paras.get(para.props.fmtSrc) : undefined;
    if (fmt) {
      const ppr = patchPPr(fmt.pPr, para, paraSectPr(para, fmt.pPr), active.numIds);
      if (ppr.genNumbering) active.genNumbering = true;
      return `<w:p>${ppr.xml}${genRuns(items)}</w:p>`;
    }
    const ppr = pPrFromProps(para.props, para.props.sectionBreak ? sectionBreakXml(para.props.sectionBreak) : '', active.numIds);
    if (ppr.genNumbering) active.genNumbering = true;
    return `<w:p>${ppr.xml}${genRuns(items)}</w:p>`;
  }
  const id = para.props.src!;
  const first = !active.claimed.has(id);
  active.claimed.add(id);
  const left = (active.remaining.get(id) ?? 1) - 1;
  active.remaining.set(id, left);
  const last = left <= 0;
  if (first && last && active.store.pristine(para)) return src.raw;
  const ppr = patchPPr(src.pPr, para, paraSectPr(para, src.pPr), active.numIds);
  if (ppr.genNumbering) active.genNumbering = true;
  // a 1ª cópia de um parágrafo dividido leva a abertura original (w14:paraId é único)
  return `${first ? src.open : '<w:p>'}${ppr.xml}${runsLossless(para, src, id, last)}</w:p>`;
}

function paraXmlInner(para: Paragraph, runsXml: string): string {
  const pp = para.props;
  const ppr: string[] = [];
  if (pp.styleId) ppr.push(`<w:pStyle w:val="${escAttr(pp.styleId)}"/>`);
  if (pp.keepNext) ppr.push('<w:keepNext/>');
  // quebra de seção: sectPr DENTRO do pPr (encerra a seção neste parágrafo)
  if (pp.sectionBreak) {
    const refs = [...pp.sectionBreak.headerRefs, ...pp.sectionBreak.footerRefs];
    ppr.push(`<w:sectPr>${sectPrInner(pp.sectionBreak.sectPr, refs)}</w:sectPr>`);
  }
  if (pp.pageBreakBefore) ppr.push('<w:pageBreakBefore/>');
  if (pp.tabStops?.length) {
    ppr.push('<w:tabs>' + pp.tabStops.map((t) =>
      `<w:tab w:val="${t.align}"${t.leader ? ` w:leader="${t.leader}"` : ''} w:pos="${t.posTwips}"/>`,
    ).join('') + '</w:tabs>');
  }
  if (pp.numbering) {
    const numId = pp.numbering.kind === 'decimal' ? 1002 : 1001;
    ppr.push(`<w:numPr><w:ilvl w:val="${pp.numbering.ilvl}"/><w:numId w:val="${numId}"/></w:numPr>`);
  }
  if (pp.borders) {
    let inner = '';
    for (const side of ['top', 'left', 'bottom', 'right'] as const) {
      const e = pp.borders[side];
      if (!e) continue;
      inner += `<w:${side} w:val="${escAttr(e.style)}" w:sz="${e.sizeEighthPt}" ` +
        `w:space="${e.spacePt}" w:color="${e.color ? escAttr(e.color) : 'auto'}"/>`;
    }
    if (inner) ppr.push(`<w:pBdr>${inner}</w:pBdr>`);
  } else if (pp.boxBorder) {
    const b = '<w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>';
    ppr.push(
      '<w:pBdr>' +
      b.replace('w:bottom', 'w:top') + b.replace('w:bottom', 'w:left') +
      b + b.replace('w:bottom', 'w:right') +
      '</w:pBdr>',
    );
  }
  if (pp.shadingHex) {
    ppr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(pp.shadingHex)}"/>`);
  }
  if (pp.lineTwentieths !== undefined || pp.spaceAfterTwips !== undefined || pp.spaceBeforeTwips !== undefined) {
    const line = pp.lineTwentieths !== undefined
      ? ` w:line="${pp.lineTwentieths}" w:lineRule="auto"` : '';
    const before = pp.spaceBeforeTwips !== undefined ? ` w:before="${pp.spaceBeforeTwips}"` : '';
    const after = pp.spaceAfterTwips !== undefined ? ` w:after="${pp.spaceAfterTwips}"` : '';
    ppr.push(`<w:spacing${before}${after}${line}/>`);
  }
  if (pp.indentLeftTwips !== undefined || pp.indentRightTwips !== undefined || pp.indentFirstLineTwips !== undefined) {
    let attrs = '';
    if (pp.indentLeftTwips !== undefined) attrs += ` w:left="${pp.indentLeftTwips}"`;
    if (pp.indentRightTwips !== undefined) attrs += ` w:right="${pp.indentRightTwips}"`;
    if (pp.indentFirstLineTwips !== undefined) {
      attrs += pp.indentFirstLineTwips >= 0
        ? ` w:firstLine="${pp.indentFirstLineTwips}"`
        : ` w:hanging="${-pp.indentFirstLineTwips}"`;
    }
    ppr.push(`<w:ind${attrs}/>`);
  }
  if (pp.alignment && pp.alignment !== 'left') ppr.push(`<w:jc w:val="${pp.alignment}"/>`);
  // revisões: marca de parágrafo (w:rPr) e formatação controlada (w:pPrChange, a última)
  const mark = (pp.markIns ? markRevisionXml('ins', pp.markIns) : '') + (pp.markDel ? markRevisionXml('del', pp.markDel) : '');
  if (mark) ppr.push(`<w:rPr>${mark}</w:rPr>`);
  if (pp.pfmt) {
    const old = paraXmlInner({ runs: [], props: pp.pfmt.old }, '');
    const inner = /^<w:p><w:pPr>([\s\S]*)<\/w:pPr><\/w:p>$/.exec(old)?.[1] ?? '';
    ppr.push(`<w:pPrChange${revisionAttrs(pp.pfmt)}>${inner ? `<w:pPr>${inner}</w:pPr>` : '<w:pPr/>'}</w:pPrChange>`);
  }

  const inner =
    (ppr.length ? `<w:pPr>${ppr.join('')}</w:pPr>` : '') +
    runsXml;
  return `<w:p>${inner}</w:p>`;
}

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
const W15_NS = ' xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"';

export interface HfPartInfo {
  kind: 'header' | 'footer';
  type: 'default' | 'first' | 'even';
  rid: string;
  path: string;
  paragraphs: Paragraph[];
  /** Conteúdo como blocos (tabelas incluídas) — gravação sem perdas. */
  blocks?: Block[];
  /** Só partes sujas são reescritas (preserva imagens/campos não suportados). */
  dirty: boolean;
}

/** Referência de header/footer para emitir no sectPr (type + rId). */
export interface HfRefXml { kind: 'header' | 'footer'; type: string; rid: string }

/** Corpo de um <w:sectPr> (sem a tag) com refs + geometria + orientação. */
export function sectPrInner(s: SectPr, refs: HfRefXml[] = []): string {
  const refsXml = refs
    .map((h) => `<w:${h.kind}Reference w:type="${h.type}" r:id="${h.rid}"/>`)
    .join('');
  const orient = s.pageWidthTwips > s.pageHeightTwips ? ' w:orient="landscape"' : '';
  // ordem do CT_SectPr: type, pgSz, pgMar, pgNumType, cols, titlePg
  const type = s.type && s.type !== 'nextPage' ? `<w:type w:val="${s.type}"/>` : '';
  const cols = s.cols ? colsXml(s.cols) : '';
  const titlePg = s.titlePg ? '<w:titlePg/>' : '';
  const pgNumType = pgNumTypeXml(s) ?? '';
  const pgBorders = pgBordersXml(s.pgBorders) ?? '';
  // notas: propriedades antes do w:type; as colunas da área de notas no fim (Word)
  const notes = notePropsXml('footnote', s.footnotePr) + notePropsXml('endnote', s.endnotePr);
  const fnCols = s.footnoteColumns ? `<w15:footnoteColumns w:val="${s.footnoteColumns}"/>` : '';
  return (
    `${refsXml}${notes}${type}<w:pgSz w:w="${s.pageWidthTwips}" w:h="${s.pageHeightTwips}"${orient}/>` +
    `<w:pgMar w:top="${s.marginTopTwips}" w:right="${s.marginRightTwips}" ` +
    `w:bottom="${s.marginBottomTwips}" w:left="${s.marginLeftTwips}" ` +
    `w:header="${s.headerDistanceTwips ?? 720}" w:footer="${s.footerDistanceTwips ?? 720}" w:gutter="0"/>${pgBorders}${pgNumType}${cols}${titlePg}${fnCols}`
  );
}

function borderXml(tag: string, e: BorderEdge): string {
  return `<w:${tag} w:val="${escAttr(e.style)}" w:sz="${e.sizeEighthPt}" ` +
    `w:space="0" w:color="${e.color ? escAttr(e.color) : 'auto'}"/>`;
}

function borderSetXml(wrap: string, b: TableBorders, sides: readonly string[]): string {
  let inner = '';
  for (const side of sides) {
    const e = (b as Record<string, BorderEdge | undefined>)[side];
    if (e) inner += borderXml(side, e);
  }
  return inner ? `<w:${wrap}>${inner}</w:${wrap}>` : '';
}

const TBL_SIDES = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
const CELL_SIDES = ['top', 'left', 'bottom', 'right'] as const;

/** Conteúdo de uma célula na ordem (blocos) ou, sem eles, parágrafos + tabelas. */
function cellBodyXml(cell: TableBlock['rows'][number]['cells'][number]): string {
  if (cell.blocks?.length) return cell.blocks.map(blockXml).join('');
  return cell.paragraphs.length
    ? cell.paragraphs.map(paraXml).join('') + cell.tables.map(tableXml).join('')
    : '<w:p/>';
}

export function tableXml(t: TableBlock): string {
  const src = active && t.src !== undefined ? active.store.tables.get(t.src) : undefined;
  if (active && src) {
    const owner = !active.claimed.has(t.src!);
    active.claimed.add(t.src!);
    if (owner && active.store.tablePristine(t)) return src.raw;
    // mudou: o cru de cada parte (tabela, linha, célula — pelo id, não pelo
    // índice) com só as diferenças das props tipadas aplicadas
    const sameGrid = src.tblGrid !== undefined && gridOf(src.tblGrid) === t.gridColsTwips.join(',');
    const tblPr = src.tblPr !== undefined ? patchTblPr(src.tblPr, t.tblPr) : legacyOrTypedTblPr(t);
    return `${owner ? src.open : '<w:tbl>'}${tblPr}${sameGrid ? src.tblGrid : gridXml(t)}${rowsXml(t)}</w:tbl>`;
  }
  return `<w:tbl>${legacyOrTypedTblPr(t)}${gridXml(t)}${rowsXml(t)}</w:tbl>`;
}

/** Linhas/células com o cru em volta (WrapSeg) — os envoltórios só se o aninhamento
 *  continua certo depois da edição (linha excluída, movida…); as marcas soltas sempre. */
function wrappedXml(items: { pre?: WrapSeg[]; post?: WrapSeg[]; xml: string }[]): string {
  const stack: number[] = [];
  let ok = true;
  for (const it of items) {
    for (const s of [...(it.pre ?? []), ...(it.post ?? [])]) {
      if (s.open !== undefined) stack.push(s.open);
      else if (s.close !== undefined && stack.pop() !== s.close) ok = false;
    }
  }
  if (stack.length) ok = false;
  const segs = (ss?: WrapSeg[]): string => (ss ?? []).filter((s) => ok || (s.open === undefined && s.close === undefined)).map((s) => s.raw).join('');
  return items.map((it) => segs(it.pre) + it.xml + segs(it.post)).join('');
}

function rowsXml(t: TableBlock): string {
  const store = active?.store;
  return wrappedXml(t.rows.map((row) => {
    const rs = store && row.src !== undefined ? store.trs.get(row.src) : undefined;
    // a 1ª cópia de uma linha leva a abertura original (w14:paraId é único)
    const rowOwner = rs !== undefined && !active!.claimed.has(row.src!);
    if (rs) active!.claimed.add(row.src!);
    const ex = rs?.tblPrEx !== undefined ? patchTblPrEx(rs.tblPrEx, row.tblPrEx) : (row.tblPrEx ? tblPrExTyped(row.tblPrEx) : '');
    const trPr = rs?.trPr !== undefined ? patchTrPr(rs.trPr, row.trPr) : (row.trPr ? trPrTyped(row.trPr) : '');
    const cells = wrappedXml(row.cells.map((cell) => {
      const cs = store && cell.src !== undefined ? store.tcs.get(cell.src) : undefined;
      const cellOwner = cs !== undefined && !active!.claimed.has(cell.src!);
      if (cs) active!.claimed.add(cell.src!);
      const tcPr = cs?.tcPr !== undefined ? patchTcPr(cs.tcPr, cell.tcPr)
        : cell.tcPr ? tcPrTyped(cell.tcPr) : cs ? '' : tcPrXml(cell);
      // célula com grupos (sdt de bloco, marcas): só a 1ª cópia (a outra é colada)
      const body = cellOwner && cs!.groups && cell.blocks?.length ? groupsXml(cs!.groups, cell.blocks, store!) : cellBodyXml(cell);
      const xml = `${cellOwner ? cs!.open : '<w:tc>'}${tcPr}${body}</w:tc>`;
      return cellOwner ? { pre: cs!.pre, post: cs!.post, xml } : { xml };
    }));
    const xml = `${rowOwner ? rs!.open : '<w:tr>'}${ex}${trPr}${cells}</w:tr>`;
    return rowOwner ? { pre: rs!.pre, post: rs!.post, xml } : { xml };
  }));
}

/** Tabela sem w:tblPr de origem: das props tipadas (tabela criada pelo
 *  editor) ou dos campos simples (tabela montada por outro caminho). */
const legacyOrTypedTblPr = (t: TableBlock): string => (t.tblPr ? tblPrTyped(t.tblPr) : tblPrXml(t));

const gridOf = (raw: string): string => [...raw.matchAll(/<w:gridCol\b[^>]*w:w="(\d+)"/g)].map((m) => m[1]).join(',');

function tblPrXml(t: TableBlock): string {
  const total = t.gridColsTwips.reduce((a, b) => a + b, 0) || undefined;
  return '<w:tblPr>' +
    (total ? `<w:tblW w:w="${total}" w:type="dxa"/>` : '') +
    (t.borders ? borderSetXml('tblBorders', t.borders, TBL_SIDES) : '') +
    '</w:tblPr>';
}

const gridXml = (t: TableBlock): string =>
  `<w:tblGrid>${t.gridColsTwips.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;

function tcPrXml(cell: TableBlock['rows'][number]['cells'][number]): string {
  return '<w:tcPr>' +
    (cell.widthTwips ? `<w:tcW w:w="${cell.widthTwips}" w:type="dxa"/>` : '') +
    (cell.gridSpan > 1 ? `<w:gridSpan w:val="${cell.gridSpan}"/>` : '') +
    (cell.borders ? borderSetXml('tcBorders', cell.borders, CELL_SIDES) : '') +
    (cell.shadingHex ? `<w:shd w:val="clear" w:color="auto" w:fill="${escAttr(cell.shadingHex)}"/>` : '') +
    '</w:tcPr>';
}

const blockXml = (b: Block): string => (b.type === 'table' ? tableXml(b) : paraXml(b.paragraph));
const blockId = (b: Block): number | undefined => (b.type === 'table' ? b.src : b.paragraph.props.src);

/**
 * Blocos de uma parte com a fonte original: cada filho de topo intacto (todos
 * os seus blocos presentes, em ordem e sem mudança) sai cru; os filhos sem
 * blocos (indicadores entre parágrafos…) ficam na posição relativa; sdt com
 * blocos editados é reembrulhado.
 */
function storyBlocksXml(story: StorySource, blocks: Block[], store: SourceStore): string {
  countCopies(blocks, active!.remaining);
  return groupsXml(story.groups, blocks, store);
}

/** A história tem exatamente os blocos lidos, todos iguais à linha de base. */
function storyPristine(story: StorySource, blocks: Block[], store: SourceStore): boolean {
  const ids = story.groups.flatMap((g) => g.blocks);
  if (ids.length !== blocks.length) return false;
  return blocks.every((b, i) => blockId(b) === ids[i] && (b.type === 'table' ? store.tablePristine(b) : store.pristine(b.paragraph)));
}

/** Nota nova (ou de parte sem fonte): o elemento inteiro gerado dos blocos. */
const noteXml = (kind: NoteKind, id: number, blocks: Block[]): string =>
  `<w:${kind} w:id="${id}">${blocks.length ? blocks.map(blockXml).join('') : '<w:p/>'}</w:${kind}>`;

/**
 * footnotes.xml / endnotes.xml: separadores e notas intocadas saem crus; nota
 * editada é regravada pela história dela; nota cuja referência sumiu sai (a órfã
 * que já veio no arquivo fica); nota nova entra no fim. Sem mudança, a parte
 * fica byte a byte.
 */
function writeNotesPart(pkg: DocxPackage, kind: NoteKind, notes: NotesOut, store: SourceStore | undefined, gone: ReadonlySet<number>): void {
  const path = `word/${kind}s.xml`;
  const xml0 = pkg.getPartText(path);
  const used = new Set(notes.used);
  if (!xml0 && !used.size) return;
  let part = store?.noteParts.get(path);
  if (!part) {
    // parte criada nesta sessão (ou documento sem fontes): elementos crus, sem história
    const xml = xml0 ?? emptyNotesPart(kind);
    const root = parseXml(xml, { positions: true });
    part = {
      open: xml.slice(0, root.cs), close: xml.slice(root.ce), refsAtLoad: new Set(),
      items: childElements(root, `w:${kind}`).map((e) => ({
        id: parseInt(e.attrs['w:id'] ?? '0', 10), raw: xml.slice(e.s, e.e),
        separator: !!e.attrs['w:type'] && e.attrs['w:type'] !== 'normal',
      })),
    };
  }
  const relsPath = active?.relsPath;
  if (active) active.relsPath = `word/_rels/${kind}s.xml.rels`;
  try {
    takeUsedDateUtc();
    const seen = new Set<number>();
    let body = '';
    for (const it of part.items) {
      if (it.separator) { body += it.raw; continue; }
      seen.add(it.id);
      if (!used.has(it.id)) { if (!part.refsAtLoad.has(it.id)) body += it.raw; continue; }
      const blocks = notes.blocks.get(it.id);
      if (!blocks) body += it.raw;
      else if (it.story && active && store) {
        body += storyPristine(it.story, blocks, store) ? it.raw : it.story.open + storyBlocksXml(it.story, blocks, store) + it.story.close;
      } else body += noteXml(kind, it.id, blocks);
    }
    for (const id of notes.used) {
      const blocks = notes.blocks.get(id);
      if (!seen.has(id) && blocks) body += noteXml(kind, id, blocks);
    }
    // nota inserida com o controle de alterações: w:ins com w16du:dateUtc (como o corpo)
    const out = dropCommentMarks(revRoot(part.open, `w:${kind}s`) + body + part.close, gone);
    if (out !== xml0) pkg.setPartText(path, out);
  } finally {
    if (active && relsPath !== undefined) active.relsPath = relsPath;
  }
}

function groupsXml(groups: StoryGroup[], blocks: Block[], store: SourceStore): string {
  const groupOf = new Map<number, number>();
  groups.forEach((g, gi) => g.blocks.forEach((id) => { if (id) groupOf.set(id, gi); }));
  const seen = new Set<number>();
  const dup = new Set<number>();
  for (const b of blocks) {
    const id = blockId(b);
    if (id === undefined) continue;
    if (seen.has(id)) dup.add(id); else seen.add(id);
  }
  const pristine = (b: Block): boolean => {
    const id = blockId(b);
    if (id === undefined || dup.has(id)) return false;
    return b.type === 'table' ? store.tablePristine(b) : store.pristine(b.paragraph);
  };
  let out = '';
  let zp = 0;
  const flushZero = (upTo: number): void => {
    for (; zp < upTo; zp++) if (groups[zp]!.blocks.length === 0) out += groups[zp]!.raw;
  };
  for (let i = 0; i < blocks.length;) {
    const b = blocks[i]!;
    const id = blockId(b);
    const gi = id !== undefined ? groupOf.get(id) : undefined;
    if (gi !== undefined && gi >= zp) {
      const g = groups[gi]!;
      let ok = g.blocks[0] === id && i + g.blocks.length <= blocks.length;
      for (let k = 0; ok && k < g.blocks.length; k++) ok = blockId(blocks[i + k]!) === g.blocks[k] && pristine(blocks[i + k]!);
      flushZero(gi);
      if (ok) {
        for (const bid of g.blocks) active!.claimed.add(bid);
        out += g.raw;
        zp = gi + 1;
        i += g.blocks.length;
        continue;
      }
      if (g.wrapOpen !== undefined && g.blocks[0] === id) {
        // sdt/customXml com blocos editados: reembrulha os blocos que seguem do
        // grupo, com os filhos de dentro (sdt aninhado…) tratados do mesmo jeito
        let j = i;
        while (j < blocks.length && (() => { const x = blockId(blocks[j]!); return x !== undefined && groupOf.get(x) === gi; })()) j++;
        const inner = blocks.slice(i, j);
        out += g.wrapOpen + (g.inner ? groupsXml(g.inner, inner, store) : inner.map(blockXml).join('')) + g.wrapClose;
        zp = gi + 1;
        i = j;
        continue;
      }
    }
    out += blockXml(b);
    i++;
  }
  flushZero(groups.length);
  return out;
}

/** Quantas cópias de cada parágrafo de origem há na parte (incl. células e caixas de texto). */
function countCopies(blocks: Block[], out: Map<number, number>): void {
  const para = (p: Paragraph): void => {
    if (p.props.src !== undefined) out.set(p.props.src, (out.get(p.props.src) ?? 0) + 1);
    for (const r of p.runs) {
      for (const tb of r.textbox ? [r.textbox] : (r.group?.items ?? []).map((it) => it.run.textbox)) {
        if (!tb) continue;
        if (tb.blocks?.length) countCopies(tb.blocks, out);
        else tb.paras.forEach(para);
      }
    }
  };
  for (const b of blocks) {
    if (b.type === 'paragraph') para(b.paragraph);
    else for (const row of b.rows) for (const c of row.cells) {
      if (c.blocks?.length) countCopies(c.blocks, out); else c.paragraphs.forEach(para);
    }
  }
}

/** Serializa o corpo a partir de uma lista de blocos (parágrafos E tabelas). */
export function serializeBlocks(blocks: Block[], sectPr: SectPr, hfRefs: HfPartInfo[] = []): string {
  const bodyRefs: HfRefXml[] = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(sectPr, bodyRefs)}</w:sectPr>`;
  const body = blocks.map(blockXml).join('') + sect;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    revRoot(`<w:document ${W_NS}${body.includes('<w15:') ? W15_NS : ''}>`, 'w:document') + `<w:body>${body}</w:body></w:document>`
  );
}

export function serializeDocument(model: DocumentModel, hfRefs: HfPartInfo[] = []): string {
  const bodyRefs: HfRefXml[] = hfRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
  const sect = `<w:sectPr>${sectPrInner(model.sectPr, bodyRefs)}</w:sectPr>`;
  const body = model.paragraphs.map(paraXml).join('') + sect;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    revRoot(`<w:document ${W_NS}${body.includes('<w15:') ? W15_NS : ''}>`, 'w:document') + `<w:body>${body}</w:body></w:document>`
  );
}

/** Raiz da parte com o namespace w16du se alguma revisão gerada o usou. */
function revRoot(open: string, rootName: string): string {
  return takeUsedDateUtc() ? ensureRevisionNamespaces(open, rootName) : open;
}

/** Garante na tag raiz as declarações que o XML gerado usa (w, r, wp). */
function withNamespaces(open: string, rootName: string, content = ''): string {
  const at = open.indexOf(`<${rootName}`);
  if (at < 0) return open;
  const end = open.indexOf('>', at);
  let tag = open.slice(at, end);
  const need: [string, string][] = [
    ['w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'],
    ['r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'],
    ['wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'],
    // w15:footnoteColumns no sectPr (colunas da área de notas)
    ...(content.includes('<w15:') ? [['w15', 'http://schemas.microsoft.com/office/word/2012/wordml'] as [string, string]] : []),
  ];
  for (const [pfx, uri] of need) if (!new RegExp(`\\sxmlns:${pfx}=`).test(tag)) tag += ` xmlns:${pfx}="${uri}"`;
  return open.slice(0, at) + tag + open.slice(end);
}

/** Comentários apagados: tira os marcadores crus que ficaram órfãos. */
function dropCommentMarks(xml: string, gone: ReadonlySet<number>): string {
  if (gone.size === 0) return xml;
  const ids = [...gone].join('|');
  return xml
    .replace(new RegExp(`<w:commentRange(?:Start|End)\\b[^>]*\\bw:id="(?:${ids})"[^>]*/>`, 'g'), '')
    .replace(new RegExp(`<w:r\\b[^>]*>(?:(?!</w:r>)[\\s\\S])*?<w:commentReference\\b[^>]*\\bw:id="(?:${ids})"[^>]*/>(?:(?!</w:r>)[\\s\\S])*?</w:r>`, 'g'), '');
}

function numberingXml(ids: GenNumIds): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<w:numbering ${W_NS}>${numberingAbstracts(ids)}${numberingNums(ids)}</w:numbering>`
  );
}

/** Primeiro par de numIds/abstractNumIds (a partir de 1001) que o numbering.xml não usa. */
function freeNumIds(xml: string | undefined): GenNumIds {
  const used = new Set([...(xml ?? '').matchAll(/w:(?:abstractNumId|numId)(?: w:val)?="(\d+)"/g)].map((m) => Number(m[1])));
  let n = 1001;
  while (used.has(n) || used.has(n + 1)) n += 2;
  return { bullet: n, decimal: n + 1 };
}

function numberingAbstracts(ids: GenNumIds): string {
  const bulletLvls = Array.from({ length: 3 }, (_, i) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/>` +
    `<w:lvlText w:val="${['', 'o', ''][i]}"/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr>` +
    `<w:rPr><w:rFonts w:ascii="${['Symbol', 'Courier New', 'Wingdings'][i]}" w:hAnsi="${['Symbol', 'Courier New', 'Wingdings'][i]}" w:hint="default"/></w:rPr></w:lvl>`,
  ).join('');
  const decimalLvls = Array.from({ length: 3 }, (_, i) =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="decimal"/>` +
    `<w:lvlText w:val="%${i + 1}."/><w:lvlJc w:val="left"/>` +
    `<w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
  ).join('');
  return `<w:abstractNum w:abstractNumId="${ids.bullet}">${bulletLvls}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="${ids.decimal}">${decimalLvls}</w:abstractNum>`;
}

const numberingNums = (ids: GenNumIds): string =>
  `<w:num w:numId="${ids.bullet}"><w:abstractNumId w:val="${ids.bullet}"/></w:num>` +
  `<w:num w:numId="${ids.decimal}"><w:abstractNumId w:val="${ids.decimal}"/></w:num>`;

/** Acrescenta as listas novas ao numbering.xml existente (todo w:abstractNum
 *  vem antes dos w:num no schema); idempotente entre salvamentos. */
function mergeNumbering(xml: string, ids: GenNumIds): string {
  if (new RegExp(`<w:num w:numId="${ids.bullet}">`).test(xml)) return xml;
  const firstNum = xml.search(/<w:num\b/);
  const withAbs = firstNum >= 0
    ? xml.slice(0, firstNum) + numberingAbstracts(ids) + xml.slice(firstNum)
    : xml.replace(/<\/w:numbering>\s*$/, `${numberingAbstracts(ids)}</w:numbering>`);
  const tail = withAbs.search(/<w:numIdMacAtCleanup\b|<\/w:numbering>\s*$/);
  return withAbs.slice(0, tail) + numberingNums(ids) + withAbs.slice(tail);
}

const W_NS_HF =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/** Serializa uma parte de cabeçalho/rodapé (w:hdr / w:ftr). */
export function serializeHfPart(kind: 'header' | 'footer', paragraphs: Paragraph[]): string {
  const tag = kind === 'header' ? 'w:hdr' : 'w:ftr';
  takeUsedDateUtc();
  const body = paragraphs.map(paraXml).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    revRoot(`<${tag} ${W_NS_HF}>`, tag) + body + `</${tag}>`
  );
}

/** Grava o modelo no pacote (document.xml + numbering/media/rels/content-types).
 *  hfParts: cabeçalhos/rodapés a referenciar no sectPr; os sujos são reescritos
 *  (criando parte + rel + content-type quando novos). */
export interface CommentOut {
  id: number;
  author?: string;
  text: string;
}

export interface WriteOptions {
  comments?: CommentOut[];
  /** refs de header/footer da ÚLTIMA seção (body sectPr); demais vão nos
   *  sectionBreak dos parágrafos. Se ausente, usa todos os hfParts. */
  bodySectRefs?: { kind: 'header' | 'footer'; type: string; rid: string }[];
  /** corpo como blocos (parágrafos E tabelas) — preserva tabelas no save. */
  blocks?: Block[];
  /** XML original lido (readFullDocument com `sources`) — gravação sem perdas. */
  sources?: SourceStore;
  /** controle de alterações ligado/desligado (w:settings/w:trackRevisions); ausente = não mexe */
  trackRevisions?: boolean;
  /** notas: conteúdo de cada uma e os ids referenciados no corpo (ordem do documento) */
  notes?: Partial<Record<NoteKind, NotesOut>>;
}

export interface NotesOut {
  blocks: ReadonlyMap<number, Block[]>;
  used: number[];
}

const commentXml = (c: CommentOut): string =>
  `<w:comment w:id="${c.id}" w:author="${escAttr(c.author ?? 'Write')}" w:initials="WN">` +
  `<w:p><w:r><w:t xml:space="preserve">${esc(c.text)}</w:t></w:r></w:p></w:comment>`;

/** comments.xml existente: tira os apagados, acrescenta os novos (o resto —
 *  respostas, formatação, paraIds — fica como está). Limpa as partes
 *  commentsExtended/Ids/Extensible dos apagados. */
function patchComments(pkg: DocxPackage, comments: CommentOut[]): void {
  const xml = pkg.getPartText('word/comments.xml')!;
  const want = new Map(comments.map((c) => [c.id, c]));
  const have = new Set<number>();
  const goneParaIds: string[] = [];
  let out = xml.replace(/<w:comment\b[^>]*?\bw:id="(-?\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/w:comment>)/g, (m, id: string) => {
    const n = parseInt(id, 10);
    if (want.has(n)) { have.add(n); return m; }
    for (const p of m.matchAll(/w14:paraId="([0-9A-Fa-f]+)"/g)) goneParaIds.push(p[1]!);
    return '';
  });
  const added = comments.filter((c) => !have.has(c.id)).map(commentXml).join('');
  if (added) out = out.replace(/<\/w:comments>\s*$/, `${added}</w:comments>`);
  if (out !== xml) pkg.setPartText('word/comments.xml', out);
  if (!goneParaIds.length) return;
  const ids = goneParaIds.join('|');
  const durable: string[] = [];
  const cids = pkg.getPartText('word/commentsIds.xml');
  if (cids) {
    pkg.setPartText('word/commentsIds.xml', cids.replace(new RegExp(`<w16cid:commentId\\b[^>]*w16cid:paraId="(?:${ids})"[^>]*/>`, 'g'), (m) => {
      const d = /w16cid:durableId="([^"]+)"/.exec(m)?.[1];
      if (d) durable.push(d);
      return '';
    }));
  }
  const ext = pkg.getPartText('word/commentsExtended.xml');
  if (ext) pkg.setPartText('word/commentsExtended.xml', ext.replace(new RegExp(`<w15:commentEx\\b[^>]*w15:paraId="(?:${ids})"[^>]*/>`, 'g'), ''));
  const exb = pkg.getPartText('word/commentsExtensible.xml');
  if (exb && durable.length) {
    pkg.setPartText('word/commentsExtensible.xml', exb.replace(
      new RegExp(`<w16cex:commentExtensible\\b[^>]*w16cex:durableId="(?:${durable.join('|')})"[^>]*?(?:/>|>[\\s\\S]*?</w16cex:commentExtensible>)`, 'g'), ''));
  }
}

export function writeDocument(
  pkg: DocxPackage,
  model: DocumentModel,
  hfParts: HfPartInfo[] = [],
  opts: WriteOptions = {},
): void {
  mediaOut = [];
  drawingId = 0;
  const store = opts.sources;
  if (store) {
    store.beginSave();
    store.genNumIds ??= freeNumIds(pkg.getPartText('word/numbering.xml'));
  }
  // ids das revisões novas: acima dos que o pacote já usa
  beginRevisionIds(...pkg.partNames().filter((p) => /^word\/(?:document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(p)).map((p) => pkg.getPartText(p)));
  active = store ? { store, pkg, relsPath: 'word/_rels/document.xml.rels', claimed: new Set(), genNumbering: false, claimedSegs: new Set(), remaining: new Map(), paraRuns: [], emittedObj: new Set(), numIds: store.genNumIds! } : null;
  try {
    writeParts(pkg, model, hfParts, opts, store);
    if (opts.trackRevisions !== undefined) writeTrackRevisions(pkg, opts.trackRevisions);
  } finally {
    active = null;
  }
}

function writeParts(
  pkg: DocxPackage,
  model: DocumentModel,
  hfParts: HfPartInfo[],
  opts: WriteOptions,
  store: SourceStore | undefined,
): void {
  // comentários apagados desde a abertura: marcadores crus a retirar
  const gone = new Set<number>();
  if (store) {
    const now = new Set((opts.comments ?? []).map((c) => c.id));
    for (const id of store.commentIds) if (!now.has(id)) gone.add(id);
  }

  // comentários: regrava word/comments.xml + rel + content-type
  const commentsUnchanged = store !== undefined && store.commentsSig === JSON.stringify(opts.comments ?? []);
  if (store && !commentsUnchanged && pkg.getPart('word/comments.xml')) {
    patchComments(pkg, opts.comments ?? []);
  } else if (!commentsUnchanged && opts.comments && opts.comments.length > 0) {
    const body = opts.comments.map(commentXml).join('');
    pkg.setPartText('word/comments.xml',
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<w:comments ${W_NS_HF}>${body}</w:comments>`);
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    if (!rels.includes('comments.xml')) {
      rels = rels.replace('</Relationships>',
        '<Relationship Id="rIdWnComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>');
      pkg.setPartText(relsPath, rels);
    }
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    if (ct && !ct.includes('comments+xml')) {
      ct = ct.replace('</Types>',
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>');
      pkg.setPartText('[Content_Types].xml', ct);
    }
  }

  // cabeçalhos/rodapés: cria/reescreve as partes antes do document.xml
  if (hfParts.length > 0) {
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    for (const hf of hfParts) {
      if (hf.dirty || !pkg.getPart(hf.path)) {
        const story = store?.stories.get(hf.path);
        if (active && story) {
          active.relsPath = `word/_rels/${hf.path.split('/').pop()}.rels`;
          const blocks = hf.blocks ?? hf.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
          const root = hf.kind === 'header' ? 'w:hdr' : 'w:ftr';
          takeUsedDateUtc();
          const body = storyBlocksXml(story, blocks, store!);
          const xml = revRoot(withNamespaces(story.open, root), root) + body + story.close;
          pkg.setPartText(hf.path, dropCommentMarks(xml, gone));
          active.relsPath = relsPath;
        } else {
          pkg.setPartText(hf.path, serializeHfPart(hf.kind, hf.paragraphs));
        }
      }
      const relTarget = hf.path.replace(/^word\//, '');
      if (!rels.includes(`Id="${hf.rid}"`)) {
        rels = rels.replace(
          '</Relationships>',
          `<Relationship Id="${hf.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${hf.kind}" Target="${relTarget}"/></Relationships>`,
        );
      }
      const ctType = `application/vnd.openxmlformats-officedocument.wordprocessingml.${hf.kind}+xml`;
      if (ct && !ct.includes(`PartName="/${hf.path}"`)) {
        ct = ct.replace('</Types>', `<Override PartName="/${hf.path}" ContentType="${ctType}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText('[Content_Types].xml', ct);
  }

  // notas de rodapé/fim (antes do corpo, como os cabeçalhos)
  if (opts.notes) {
    if ((opts.notes.footnote?.used.length || opts.notes.endnote?.used.length) && !pkg.getPart('word/footnotes.xml')) ensureNoteParts(pkg);
    for (const kind of ['footnote', 'endnote'] as const) {
      const n = opts.notes[kind];
      if (n) writeNotesPart(pkg, kind, n, store, gone);
    }
  }

  // refs do body sectPr: explícitas (multi-seção) OU todos os hfParts (1 seção)
  const bodyRefs: HfPartInfo[] = opts.bodySectRefs
    ? opts.bodySectRefs.map((r) => ({
        kind: r.kind, type: r.type as HfPartInfo['type'], rid: r.rid,
        path: '', paragraphs: [], dirty: false,
      }))
    : hfParts;
  const story = store?.stories.get('word/document.xml');
  if (active && story) {
    active.relsPath = 'word/_rels/document.xml.rels';
    const blocks = opts.blocks ?? model.paragraphs.map((paragraph) => ({ type: 'paragraph' as const, paragraph }));
    const refs: HfRefXml[] = bodyRefs.map((h) => ({ kind: h.kind, type: h.type, rid: h.rid }));
    const sect = story.sectPr
      ? patchSectPr(story.sectPr, model.sectPr, refs)
      : `<w:sectPr>${sectPrInner(model.sectPr, refs)}</w:sectPr>`;
    takeUsedDateUtc();
    const body = storyBlocksXml(story, blocks, store!) + sect;
    const xml = revRoot(withNamespaces(story.open, 'w:document', body), 'w:document') + body + story.close;
    pkg.setPartText('word/document.xml', dropCommentMarks(xml, gone));
  } else {
    pkg.setPartText('word/document.xml',
      opts.blocks
        ? serializeBlocks(opts.blocks, model.sectPr, bodyRefs)
        : serializeDocument(model, bodyRefs));
  }

  // comentários apagados: os marcadores também saem dos cabeçalhos/rodapés que não
  // foram regravados e das notas
  if (gone.size) {
    for (const part of pkg.partNames()) {
      if (!/^word\/(?:header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(part)) continue;
      const x = pkg.getPartText(part)!;
      const y = dropCommentMarks(x, gone);
      if (y !== x) pkg.setPartText(part, y);
    }
  }

  if (mediaOut.length > 0) {
    const relsPath = 'word/_rels/document.xml.rels';
    let rels = pkg.getPartText(relsPath) ??
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    let ct = pkg.getPartText('[Content_Types].xml') ?? '';
    // dedupe: se os MESMOS bytes já existem em word/media, reusa a parte
    const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i += 1009) if (a[i] !== b[i]) return false;
      return a[a.length - 1] === b[b.length - 1];
    };
    const existingMedia = pkg.partNames().filter((p) => p.startsWith('word/media/'));
    const exts = new Set<string>();
    const mimes = new Map<string, string>();
    for (const m of mediaOut) {
      let target = m.path.replace(/^word\//, '');
      const dup = m.relType ? undefined : existingMedia.find((p) => sameBytes(pkg.getPart(p)!, m.data));
      if (dup) {
        target = dup.replace(/^word\//, '');
      } else {
        pkg.setPart(m.path, m.data);
      }
      if (!rels.includes(`"${m.rid}"`)) {
        rels = rels.replace(
          '</Relationships>',
          `<Relationship Id="${m.rid}" Type="${m.relType ?? 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'}" Target="${target}"/></Relationships>`,
        );
      }
      exts.add(m.ext);
      if (m.mime) mimes.set(m.ext, m.mime);
    }
    for (const ext of exts) {
      const mime = mimes.get(ext) ?? (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'emf' ? 'image/x-emf' : `image/${ext}`);
      if (ct && !ct.includes(`Extension="${ext}"`)) {
        ct = ct.replace('</Types>', `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
      }
    }
    pkg.setPartText(relsPath, rels);
    if (ct) pkg.setPartText('[Content_Types].xml', ct);
  }

  const hasLists = active ? active.genNumbering : model.paragraphs.some((p) => p.props.numbering);
  if (!hasLists) return;

  const existing = pkg.getPartText('word/numbering.xml');
  const ids = active?.numIds ?? DEFAULT_NUM_IDS;
  pkg.setPartText('word/numbering.xml', existing ? mergeNumbering(existing, ids) : numberingXml(ids));

  const relsPath = 'word/_rels/document.xml.rels';
  let rels = pkg.getPartText(relsPath) ??
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  if (!rels.includes('numbering.xml')) {
    rels = rels.replace(
      '</Relationships>',
      '<Relationship Id="rIdWnNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>',
    );
    pkg.setPartText(relsPath, rels);
  }

  const ctPath = '[Content_Types].xml';
  let ct = pkg.getPartText(ctPath);
  if (ct && !ct.includes('numbering+xml')) {
    ct = ct.replace(
      '</Types>',
      '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>',
    );
    pkg.setPartText(ctPath, ct);
  }
}
