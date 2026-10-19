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
import type { TableBlock } from './fulldoc.js';

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
  rows: { open: string; trPr?: string; tblPrEx?: string; cells: { open: string; tcPr?: string }[] }[];
  sig?: number;
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
  /** Por caminho da parte (word/document.xml, word/header1.xml…). */
  readonly stories = new Map<string, StorySource>();
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

function tableSig(t: TableBlock): number {
  return sigHash(JSON.stringify(t, sigReplacer));
}
