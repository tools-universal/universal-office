/**
 * Fonte XML ORIGINAL do documento lido — base do salvamento sem perdas.
 *
 * O modelo de edição só representa parte do OOXML (RunProps/ParaProps). Para
 * não perder o resto ao salvar, o leitor guarda aqui as fatias cruas de cada
 * parágrafo (e de cada filho de topo dele: run, hyperlink, campo, indicador…),
 * de cada w:rPr/w:pPr, de cada tabela e dos filhos de topo de cada parte
 * (corpo, cabeçalhos/rodapés). O modelo só carrega ids numéricos (`props.src`
 * em parágrafos e runs, `src` em tabelas), que sobrevivem ao undo em JSON e às
 * cópias que as operações de edição fazem das props.
 *
 * Ao salvar (serialize.ts): o que está igual à linha de base (`baseline`,
 * tirada logo depois de o editor instalar o documento) sai byte a byte; o que
 * mudou é regenerado aplicando só as DIFERENÇAS sobre o rPr/pPr original (a
 * mesma regra de `directRPr`/`directPPr` do motor de layout).
 */
import type { Paragraph, Run } from './document.js';
import type { TableBlock, TableRow, TableCell } from './fulldoc.js';
import { splitElement } from './lossless.js';

/** Filho de topo de um w:p (run, hyperlink, campo inteiro, indicador…) e os
 *  runs do modelo que ele produziu. Sem runs = marcador (bookmark, comentário,
 *  proofErr, fim de campo que atravessa parágrafos…), mantido sempre. */
export interface SegSource {
  raw: string;
  sids: number[];
  /** Começa um campo que só fecha num parágrafo seguinte (sumário). */
  open?: boolean;
  /** Contêiner (sdt, hyperlink, revisão…): o envoltório para reembrulhar os
   *  runs quando o conteúdo muda. */
  wrapOpen?: string;
  wrapClose?: string;
  /** w:hyperlink: o alvo lido (o envoltório só vale enquanto ele não mudar). */
  link?: string;
}

export interface ParaSource {
  /** w:p inteiro. */
  raw: string;
  /** Tag de abertura do w:p (w14:paraId, rsids…). */
  open: string;
  /** Posição no XML da parte (para achar o filho de topo que o contém). */
  at?: number;
  /** w:pPr cru (ausente = parágrafo sem pPr). */
  pPr?: string;
  segs: SegSource[];
  /** Linha de base (ver SourceStore.baseline). */
  sig?: { props: number; sids: number[]; runs: number[] };
}

export interface RunSource {
  /** w:rPr cru do w:r de origem. */
  rPr?: string;
  /** Objeto de origem (w:drawing/w:pict/w:object/mc:AlternateContent) cru. */
  obj?: string;
  /** Run a mais do mesmo objeto (grupo VML com várias caixas…): o id do run
   *  que leva o objeto inteiro. */
  objHead?: number;
}

export interface TableSource {
  raw: string;
  open: string;
  at?: number;
  tblPr?: string;
  tblGrid?: string;
  sig?: number;
}

/** Pedaço cru em volta de uma linha/célula: marca solta entre elas (indicador,
 *  permissão…) ou a abertura/o fecho de um w:sdt/w:customXml que as envolve
 *  (`open`/`close` = id do envoltório, para conferir o aninhamento ao gravar). */
export interface WrapSeg {
  raw: string;
  open?: number;
  close?: number;
}

/** Linha de tabela lida (`TableRow.src`): a fonte acompanha a LINHA, não o
 *  índice — inserir/excluir linhas não troca o trPr de lugar. */
export interface RowSource {
  /** Tag de abertura do w:tr (w14:paraId, rsids…). */
  open: string;
  trPr?: string;
  tblPrEx?: string;
  /** o que vem antes/depois do w:tr no w:tbl (sdt de linha, indicadores) */
  pre?: WrapSeg[];
  post?: WrapSeg[];
}

/** Célula lida (`TableCell.src`). */
export interface CellSource {
  open: string;
  tcPr?: string;
  /** Filhos do conteúdo da célula como grupos (só quando há algo além de w:p/w:tbl:
   *  sdt/customXml de bloco, indicadores entre parágrafos…) — célula editada
   *  reembrulha como o corpo. */
  groups?: StoryGroup[];
  /** o que vem antes/depois do w:tc no w:tr (sdt de célula, indicadores) */
  pre?: WrapSeg[];
  post?: WrapSeg[];
}

/** Filho de topo de uma parte (corpo, cabeçalho…) e os blocos que produziu. */
export interface StoryGroup {
  raw: string;
  /** ids (props.src do parágrafo / src da tabela), na ordem. */
  blocks: number[];
  /** w:sdt / w:customXml: o envoltório, para reembrulhar blocos editados. */
  wrapOpen?: string;
  wrapClose?: string;
  /** Filhos de topo do conteúdo do envoltório (sdt dentro de sdt…). */
  inner?: StoryGroup[];
}

export interface StorySource {
  /** Tudo antes do conteúdo do container (declaração, raiz, w:background, <w:body>). */
  open: string;
  /** Tudo depois do conteúdo (</w:body></w:document>). */
  close: string;
  groups: StoryGroup[];
  /** w:sectPr final do corpo. */
  sectPr?: string;
}

/** footnotes.xml / endnotes.xml: a raiz e cada w:footnote (separadores crus;
 *  cada nota com a sua história, para regravar só as notas editadas). */
export interface NotesPartSource {
  open: string;
  close: string;
  items: { id: number; raw: string; separator?: boolean; story?: StorySource }[];
  /** ids referenciados no corpo ao abrir: só estes saem quando a referência some
   *  (nota órfã do arquivo fica como está) */
  refsAtLoad: Set<number>;
}

/** Assinatura de um run (texto, props, extras) — hash do JSON; bytes de imagem
 *  entram pelo tamanho. A linha de base guarda só o hash (não uma cópia do modelo). */
export function runSig(run: Run): number {
  return sigHash(JSON.stringify(run, sigReplacer));
}

export function propsSig(p: Paragraph): number {
  return sigHash(JSON.stringify(p.props, sigReplacer));
}

/** cyrb53 — hash de 53 bits (colisão desprezível para comparar com a linha de base). */
export function sigHash(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function sigReplacer(_k: string, v: unknown): unknown {
  return v instanceof Uint8Array ? `#bytes:${v.length}` : v;
}

export class SourceStore {
  private next = 1;
  readonly paras = new Map<number, ParaSource>();
  readonly runs = new Map<number, RunSource>();
  readonly tables = new Map<number, TableSource>();
  readonly trs = new Map<number, RowSource>();
  readonly tcs = new Map<number, CellSource>();
  /** Por caminho da parte (word/document.xml, word/header1.xml…). */
  readonly stories = new Map<string, StorySource>();
  /** Por caminho da parte de notas (word/footnotes.xml, word/endnotes.xml). */
  readonly noteParts = new Map<string, NotesPartSource>();
  /** ids dos comentários existentes ao abrir (os marcadores deles ficam crus). */
  readonly commentIds = new Set<number>();
  /** comments.xml original, para regravar só se a lista mudar. */
  commentsSig?: string;
  /** numIds livres escolhidos (no 1º salvar) para as listas que o editor cria. */
  genNumIds?: { bullet: number; decimal: number };
  /** Parágrafos e tabelas lidos — a linha de base é tirada deles. */
  private paraRefs: Paragraph[] = [];
  private tableRefs: TableBlock[] = [];

  /** Resultado de pristine/tablePristine por objeto durante UM salvamento. */
  private memo = new WeakMap<object, boolean>();

  id(): number { return this.next++; }

  /** Começo de um salvamento: o modelo pode ter mudado desde o anterior. */
  beginSave(): void { this.memo = new WeakMap(); }

  /** Posição de origem de um bloco (parágrafo ou tabela) pelo id. */
  atOf(id: number): number | undefined {
    return this.paras.get(id)?.at ?? this.tables.get(id)?.at;
  }

  addPara(p: Paragraph, src: ParaSource): number {
    const id = this.id();
    this.paras.set(id, src);
    p.props.src = id;
    this.paraRefs.push(p);
    return id;
  }

  addTable(t: TableBlock, src: TableSource): number {
    const id = this.id();
    this.tables.set(id, src);
    t.src = id;
    this.tableRefs.push(t);
    return id;
  }

  addRow(row: TableRow, src: RowSource): number {
    const id = this.id();
    this.trs.set(id, src);
    row.src = id;
    return id;
  }

  addCell(cell: TableCell, src: CellSource): number {
    const id = this.id();
    this.tcs.set(id, src);
    cell.src = id;
    return id;
  }

  /** Linha de base: chamada pelo hospedeiro DEPOIS de instalar o documento
   *  (o editor ajusta runs ao instalar — texto de campos, quebras de seção). */
  baseline(): void {
    for (const p of this.paraRefs) {
      const id = p.props.src;
      const src = id !== undefined ? this.paras.get(id) : undefined;
      if (!src) continue;
      src.sig = { props: propsSig(p), sids: p.runs.map((r) => r.props.src ?? 0), runs: p.runs.map(runSig) };
    }
    for (const t of this.tableRefs) {
      const src = t.src !== undefined ? this.tables.get(t.src) : undefined;
      if (src) src.sig = tableSig(t);
    }
    this.paraRefs = [];
    this.tableRefs = [];
  }

  /**
   * w:sectPr cru de uma seção: o do parágrafo que a encerra (a quebra nova
   * copiada leva o dela em sectionBreak.raw; senão o do pPr de origem) ou, sem
   * parágrafo, o do corpo (última seção). Base da cópia que uma quebra de seção
   * nova grava — o Word copia o sectPr inteiro (oráculo tools/sections-lab).
   */
  sectPrRaw(closing?: Paragraph): string | undefined {
    if (!closing) return this.stories.get('word/document.xml')?.sectPr;
    if (closing.props.sectionBreak?.raw) return closing.props.sectionBreak.raw;
    const pPr = closing.props.src !== undefined ? this.paras.get(closing.props.src)?.pPr : undefined;
    return pPr ? splitElement(pPr).kids.find((k) => k.name === 'w:sectPr')?.raw : undefined;
  }

  /**
   * O parágrafo — ou os runs em volta do cursor — está num controle de conteúdo
   * de TEXTO SEM FORMATAÇÃO (w:sdt com w:text, w:date, w:comboBox ou
   * w:dropDownList), de bloco ou inline? O Word recusa notas ali e um
   * w:footnoteReference dentro dele deixa o arquivo "corrompido" (oráculo
   * notes-lab, cc-*; rich text aceita).
   */
  inPlainTextControl(p: Paragraph, around: readonly (Run | undefined)[]): boolean {
    const id = p.props.src;
    if (id === undefined) return false;
    const inGroups = (groups: readonly StoryGroup[] | undefined): boolean => {
      for (const g of groups ?? []) {
        if (!g.blocks.includes(id)) continue;
        if (plainTextSdt(g.wrapOpen) || inGroups(g.inner)) return true;
      }
      return false;
    };
    for (const s of this.stories.values()) if (inGroups(s.groups)) return true;
    for (const c of this.tcs.values()) if (inGroups(c.groups)) return true;
    const sids = new Set(around.map((r) => r?.props.src).filter((x): x is number => x !== undefined));
    return !!sids.size && !!this.paras.get(id)?.segs.some((s) => plainTextSdt(s.wrapOpen) && s.sids.some((x) => sids.has(x)));
  }

  /** Parágrafo igual à linha de base (mesmos runs, mesmas props). */
  pristine(p: Paragraph): boolean {
    let v = this.memo.get(p);
    if (v === undefined) this.memo.set(p, (v = this.computePristine(p)));
    return v;
  }

  private computePristine(p: Paragraph): boolean {
    const id = p.props.src;
    const s = id !== undefined ? this.paras.get(id)?.sig : undefined;
    if (!s || p.runs.length !== s.sids.length) return false;
    for (let i = 0; i < p.runs.length; i++) {
      const r = p.runs[i]!;
      if (r.props.src !== s.sids[i] || runSig(r) !== s.runs[i]) return false;
    }
    return propsSig(p) === s.props;
  }

  tablePristine(t: TableBlock): boolean {
    let v = this.memo.get(t);
    if (v === undefined) {
      const s = t.src !== undefined ? this.tables.get(t.src)?.sig : undefined;
      this.memo.set(t, (v = s !== undefined && tableSig(t) === s));
    }
    return v;
  }
}

/** Abertura de um w:sdt que o Word trata como texto sem formatação: texto, data,
 *  caixa de combinação e lista suspensa (oráculo notes-lab, cc-*). */
function plainTextSdt(open: string | undefined): boolean {
  if (!open || !/^<w:sdt[\s>]/.test(open)) return false;
  const end = open.indexOf('</w:sdtPr>');
  return /<w:(?:text|date|comboBox|dropDownList)\b/.test(end < 0 ? open : open.slice(0, end));
}

function tableSig(t: TableBlock): number {
  return sigHash(JSON.stringify(t, sigReplacer));
}
