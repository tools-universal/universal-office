// Webcomponent <universal-write-diff> — exibição do diff de dois documentos .docx.
//
// Separado do <universal-write> de propósito: o requisito aqui é texto selecionável,
// copiável e pesquisável com marcação de mudanças — o renderer nativo do
// browser é a ferramenta certa (mesma decisão do viewer do OpenCompare).
// A formatação dos runs é aproximada em CSS; a fidelidade glifo-a-glifo fica
// com o editor.
//
// Layout: UMA grade CSS de 4 colunas (gutter A | conteúdo A | gutter B |
// conteúdo B). Cada par alinhado de blocos ocupa a mesma linha da grade, então
// o alinhamento vertical entre os lados é garantido pelo próprio grid — sem
// sincronização de scroll (um único scroll surface).
//
// API:
//   el.loadPair(aBytes, bBytes, { leftLabel?, rightLabel? })  — carrega .docx
//   el.loadDocuments(aDoc, bDoc, { leftLabel?, rightLabel? }) — já parseados
//   atributos: view="all" | "diffs", left-label, right-label
//   eventos: "ready" {stats}, "close-request", "block-click" {editIndex, side, blockIndex}

import {
  DocxPackage,
  readFullDocument,
  type FullDocument,
  type Paragraph,
  type Run,
  type TableBlock,
} from '@universal-office/docx-core';
import { diffDocuments, type DocDiff, type DocEdit, type DocIntraEdit, type TableRowEdit } from './diff.js';

// Em Node (testes da engine) não há DOM; uma base vazia mantém o módulo
// importável — o elemento só é registrado quando customElements existe.
const Base: typeof HTMLElement =
  typeof HTMLElement !== 'undefined'
    ? HTMLElement
    : (class {} as unknown as typeof HTMLElement);

// Cores de w:highlight (nomes do app de referência).
const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff',
  blue: '#0000ff', red: '#ff0000', darkBlue: '#00008b', darkCyan: '#008b8b',
  darkGreen: '#006400', darkMagenta: '#8b008b', darkRed: '#8b0000',
  darkYellow: '#808000', darkGray: '#a9a9a9', lightGray: '#d3d3d3',
  black: '#000000', white: '#ffffff',
};

// Valores de cor vêm VERBATIM do XML do documento — um .docx malicioso pode
// pôr `fff url(http://...)` num w:shd/@w:fill e o shorthand `background`
// aceitaria o url(). Só interpola o que é hex RRGGBB de verdade.
const hex6 = (s: string | undefined): string | null =>
  s && /^[0-9a-fA-F]{6}$/.test(s) ? `#${s}` : null;

const MIME: Record<string, string> = {
  png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif',
  bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml', emf: 'image/emf',
};

const STYLE = /* css */ `
:host {
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-family: system-ui, sans-serif;
  /* Convenções de cor do OpenCompare (insert verde, delete vermelho,
     change vermelho no par, minor/formatação azul). */
  --uwd-insert-bg: light-dark(rgba(63,185,80,0.15), rgba(63,185,80,0.18));
  --uwd-insert-bg-intra: light-dark(rgba(63,185,80,0.40), rgba(63,185,80,0.45));
  --uwd-delete-bg: light-dark(rgba(248,81,73,0.15), rgba(248,81,73,0.18));
  --uwd-delete-bg-intra: light-dark(rgba(248,81,73,0.40), rgba(248,81,73,0.45));
  --uwd-minor-bg: light-dark(rgba(59,130,246,0.12), rgba(59,130,246,0.16));
  --uwd-stripe-insert: #3fb950;
  --uwd-stripe-delete: #f85149;
  --uwd-stripe-minor: #3b82f6;
  --uwd-border: light-dark(#d0d7de, #3d444d);
  --uwd-text: light-dark(#1f2328, #e6edf3);
  --uwd-text-2: light-dark(#59636e, #9198a1);
  --uwd-chrome: light-dark(#f6f8fa, #151b23);
  --uwd-page: light-dark(#ffffff, #0d1117);
  color: var(--uwd-text);
  background: var(--uwd-page);
}
.uwd-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--uwd-border);
  background: var(--uwd-chrome);
  font-size: 13px;
  flex: none;
}
.uwd-header .uwd-stats { display: flex; gap: 10px; color: var(--uwd-text-2); }
.uwd-stat::before { content: "●"; margin-right: 4px; font-size: 10px; }
.uwd-stat--ins::before { color: var(--uwd-stripe-insert); }
.uwd-stat--del::before { color: var(--uwd-stripe-delete); }
.uwd-stat--chg::before { color: var(--uwd-stripe-delete); }
.uwd-stat--fmt::before { color: var(--uwd-stripe-minor); }
.uwd-header .uwd-spacer { flex: 1; }
.uwd-header button {
  border: 1px solid var(--uwd-border);
  background: transparent;
  color: var(--uwd-text);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}
.uwd-header button[data-on="1"] { background: var(--uwd-minor-bg); border-color: var(--uwd-stripe-minor); }
.uwd-header .uwd-close { border: none; font-size: 16px; line-height: 1; padding: 2px 8px; }
.uwd-body { flex: 1; overflow: auto; min-height: 0; }
.uwd-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
}
.uwd-pane-header {
  position: sticky;
  top: 0;
  z-index: 1;
  grid-column: span 2;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-bottom: 1px solid var(--uwd-border);
}
.uwd-gutter {
  padding: 4px 8px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--uwd-text-2);
  text-align: right;
  user-select: none;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell {
  position: relative;
  padding: 4px 12px 4px 14px;
  overflow-wrap: anywhere;
  border-right: 1px solid var(--uwd-border);
}
.uwd-cell::before {
  content: "";
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--stripe, transparent);
}
.uwd-cell[data-kind="insert"] { --stripe: var(--uwd-stripe-insert); background: var(--uwd-insert-bg); }
.uwd-cell[data-kind="delete"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="change"] { --stripe: var(--uwd-stripe-delete); background: var(--uwd-delete-bg); }
.uwd-cell[data-kind="format"] { --stripe: var(--uwd-stripe-minor); background: var(--uwd-minor-bg); }
.uwd-cell[data-kind="pad"] {
  background:
    repeating-linear-gradient(45deg, transparent, transparent 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 6px,
      light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.05)) 8px);
}
.uwd-intra--ins { background: var(--uwd-insert-bg-intra); border-radius: 2px; }
.uwd-intra--del { background: var(--uwd-delete-bg-intra); border-radius: 2px; }
.uwd-band {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4px;
  font-size: 12px;
  color: var(--uwd-text-2);
  background: var(--uwd-chrome);
  border-top: 1px solid var(--uwd-border);
  border-bottom: 1px solid var(--uwd-border);
  cursor: pointer;
  user-select: none;
}
.uwd-band:hover { background: var(--uwd-minor-bg); }
.uwd-para { margin: 0; min-height: 1.2em; }
.uwd-para img { max-width: 100%; height: auto; vertical-align: bottom; }
.uwd-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 8px;
  font-size: 10px;
  background: var(--uwd-minor-bg);
  color: var(--uwd-text-2);
  vertical-align: middle;
}
table.uwd-table { border-collapse: collapse; margin: 2px 0; width: 100%; }
table.uwd-table td {
  border: 1px solid var(--uwd-border);
  padding: 2px 6px;
  vertical-align: top;
}
tr.uwd-row--insert { background: var(--uwd-insert-bg); }
tr.uwd-row--delete { background: var(--uwd-delete-bg); }
tr.uwd-row--change { background: var(--uwd-delete-bg); }
tr.uwd-row--format { background: var(--uwd-minor-bg); }
.uwd-empty { color: var(--uwd-text-2); font-style: italic; padding: 24px; text-align: center; }
`;

interface RowSpec {
  kind: 'equal' | 'insert' | 'delete' | 'change' | 'format';
  editIndex: number;
  pairOffset: number;
  aBlock: number | null; // índice em aDoc.blocks
  bBlock: number | null;
}

interface LoadOpts {
  leftLabel?: string;
  rightLabel?: string;
}

export class UniversalWriteDiffElement extends Base {
  static get observedAttributes(): string[] {
    return ['view', 'left-label', 'right-label'];
  }

  private _shadow: ShadowRoot;
  private _aDoc: FullDocument | null = null;
  private _bDoc: FullDocument | null = null;
  private _diff: DocDiff | null = null;
  private _blobUrls: string[] = [];
  private _expandedBands = new Set<number>();
  private _renderScheduled = false;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(): void {
    this._schedule();
  }

  connectedCallback(): void {
    // Reanexado: os blob URLs foram revogados no disconnect — re-renderiza
    // para regenerá-los (e cobre loadPair chamado com o elemento fora do DOM).
    if (this._diff) this._schedule();
  }

  disconnectedCallback(): void {
    this._revokeBlobs();
  }

  get view(): 'all' | 'diffs' {
    return this.getAttribute('view') === 'diffs' ? 'diffs' : 'all';
  }
  set view(v: 'all' | 'diffs') {
    this.setAttribute('view', v);
  }

  /** Carrega e compara dois .docx (bytes). */
  loadPair(aBytes: Uint8Array, bBytes: Uint8Array, opts: LoadOpts = {}): void {
    const aDoc = readFullDocument(DocxPackage.load(aBytes));
    const bDoc = readFullDocument(DocxPackage.load(bBytes));
    this.loadDocuments(aDoc, bDoc, opts);
  }

  /** Compara dois documentos já parseados. */
  loadDocuments(aDoc: FullDocument, bDoc: FullDocument, opts: LoadOpts = {}): void {
    this._aDoc = aDoc;
    this._bDoc = bDoc;
    if (opts.leftLabel !== undefined) this.setAttribute('left-label', opts.leftLabel);
    if (opts.rightLabel !== undefined) this.setAttribute('right-label', opts.rightLabel);
    this._diff = diffDocuments(aDoc, bDoc);
    this._expandedBands.clear();
    this._schedule();
    queueMicrotask(() => {
      this.dispatchEvent(new CustomEvent('ready', {
        detail: { stats: this._diff!.stats },
        bubbles: true,
        composed: true,
      }));
    });
  }

  get stats(): DocDiff['stats'] | null {
    return this._diff?.stats ?? null;
  }

  private _schedule(): void {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      this._render();
    });
  }

  private _revokeBlobs(): void {
    for (const u of this._blobUrls) URL.revokeObjectURL(u);
    this._blobUrls = [];
  }

  // ───────────────────────── render ─────────────────────────

  private _render(): void {
    // Fora do DOM não cria blob URLs (vazariam sem um disconnect futuro);
    // connectedCallback re-agenda quando o elemento voltar.
    if (!this.isConnected) return;
    this._revokeBlobs();
    const doc = this.ownerDocument;
    const root = doc.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;min-height:0;height:100%;';

    const style = doc.createElement('style');
    style.textContent = STYLE;

    if (!this._diff || !this._aDoc || !this._bDoc) {
      const empty = doc.createElement('div');
      empty.className = 'uwd-empty';
      empty.textContent = 'No comparison loaded — call loadPair(aBytes, bBytes).';
      root.append(empty);
      this._shadow.replaceChildren(style, root);
      return;
    }

    root.append(this._renderHeader(doc));

    const body = doc.createElement('div');
    body.className = 'uwd-body';
    const grid = doc.createElement('div');
    grid.className = 'uwd-grid';

    // Cabeçalhos das panes (sticky).
    const headA = doc.createElement('div');
    headA.className = 'uwd-pane-header';
    headA.textContent = this.getAttribute('left-label') ?? 'Original';
    const headB = doc.createElement('div');
    headB.className = 'uwd-pane-header';
    headB.textContent = this.getAttribute('right-label') ?? 'Modified';
    grid.append(headA, headB);

    const rows = this._buildRows();
    const showAll = this.view !== 'diffs';

    let i = 0;
    while (i < rows.length) {
      const row = rows[i]!;
      if (!showAll && row.kind === 'equal' && !this._expandedBands.has(row.editIndex)) {
        // Colapsa o run de equals deste edit numa band clicável.
        let j = i;
        while (j < rows.length && rows[j]!.kind === 'equal' && rows[j]!.editIndex === row.editIndex) j++;
        grid.append(this._renderBand(doc, row.editIndex, j - i));
        i = j;
        continue;
      }
      this._renderRow(doc, grid, row);
      i++;
    }

    if (rows.length === 0) {
      const empty = doc.createElement('div');
      empty.className = 'uwd-empty';
      empty.style.gridColumn = '1 / -1';
      empty.textContent = 'Empty documents.';
      grid.append(empty);
    }

    body.append(grid);
    root.append(body);
    this._shadow.replaceChildren(style, root);
  }

  private _renderHeader(doc: Document): HTMLElement {
    const stats = this._diff!.stats;
    const header = doc.createElement('div');
    header.className = 'uwd-header';

    const statsBox = doc.createElement('div');
    statsBox.className = 'uwd-stats';
    const stat = (cls: string, label: string, n: number) => {
      if (n === 0) return;
      const s = doc.createElement('span');
      s.className = `uwd-stat uwd-stat--${cls}`;
      s.textContent = `${n} ${label}`;
      statsBox.append(s);
    };
    stat('ins', 'inserted', stats.inserted);
    stat('del', 'deleted', stats.deleted);
    stat('chg', 'changed', stats.changed);
    stat('fmt', 'formatting', stats.formatOnly);
    if (statsBox.childElementCount === 0) {
      const s = doc.createElement('span');
      s.textContent = 'Identical documents';
      statsBox.append(s);
    }
    header.append(statsBox);

    const spacer = doc.createElement('div');
    spacer.className = 'uwd-spacer';
    header.append(spacer);

    const toggle = doc.createElement('button');
    toggle.textContent = 'Only changes';
    toggle.dataset['on'] = this.view === 'diffs' ? '1' : '0';
    toggle.addEventListener('click', () => {
      this.view = this.view === 'diffs' ? 'all' : 'diffs';
    });
    header.append(toggle);

    const close = doc.createElement('button');
    close.className = 'uwd-close';
    close.title = 'Close comparison';
    close.textContent = '✕';
    close.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('close-request', { bubbles: true, composed: true }));
    });
    header.append(close);
    return header;
  }

  private _buildRows(): RowSpec[] {
    const rows: RowSpec[] = [];
    const edits = this._diff!.edits;
    for (let e = 0; e < edits.length; e++) {
      const edit = edits[e]!;
      const kind: RowSpec['kind'] =
        edit.kind === 'change' && edit.formatOnly ? 'format' : edit.kind;
      const n = Math.max(edit.aBlocks.length, edit.bBlocks.length);
      for (let p = 0; p < n; p++) {
        rows.push({
          kind,
          editIndex: e,
          pairOffset: p,
          aBlock: edit.aBlocks[p] ?? null,
          bBlock: edit.bBlocks[p] ?? null,
        });
      }
    }
    return rows;
  }

  private _renderBand(doc: Document, editIndex: number, count: number): HTMLElement {
    const band = doc.createElement('div');
    band.className = 'uwd-band';
    band.textContent = `… ${count} unchanged block${count === 1 ? '' : 's'} …`;
    band.addEventListener('click', () => {
      this._expandedBands.add(editIndex);
      this._schedule();
    });
    return band;
  }

  private _renderRow(doc: Document, grid: HTMLElement, row: RowSpec): void {
    const edit = this._diff!.edits[row.editIndex]!;
    // Lado A.
    grid.append(this._gutter(doc, row.aBlock));
    grid.append(this._cell(doc, 'a', row, edit));
    // Lado B.
    grid.append(this._gutter(doc, row.bBlock));
    grid.append(this._cell(doc, 'b', row, edit));
  }

  private _gutter(doc: Document, blockIdx: number | null): HTMLElement {
    const g = doc.createElement('div');
    g.className = 'uwd-gutter';
    g.textContent = blockIdx === null ? '' : String(blockIdx + 1);
    return g;
  }

  private _cell(doc: Document, side: 'a' | 'b', row: RowSpec, edit: DocEdit): HTMLElement {
    const cell = doc.createElement('div');
    cell.className = 'uwd-cell';
    const blockIdx = side === 'a' ? row.aBlock : row.bBlock;
    const docModel = side === 'a' ? this._aDoc! : this._bDoc!;

    if (blockIdx === null) {
      cell.dataset['kind'] = 'pad';
      return cell;
    }

    // Tinta da célula: no par 'change' ambos os lados marcam; em insert só o
    // lado B tem conteúdo, em delete só o A (o outro é pad).
    if (row.kind !== 'equal') cell.dataset['kind'] = row.kind;

    const block = docModel.blocks[blockIdx]!;
    const marks =
      row.kind === 'change'
        ? (edit.intra ?? []).filter((m) => m.side === side && m.pairOffset === row.pairOffset)
        : [];
    const rowDiff = row.kind === 'change' ? edit.tableRows?.[row.pairOffset] ?? null : null;

    if (block.type === 'paragraph') {
      cell.append(this._renderParagraph(doc, block.paragraph, marks));
      if (row.kind === 'format') {
        const badge = doc.createElement('span');
        badge.className = 'uwd-badge';
        badge.textContent = 'formatting';
        cell.append(badge);
      }
    } else {
      cell.append(this._renderTable(doc, block, side, rowDiff));
    }

    cell.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('block-click', {
        detail: { editIndex: row.editIndex, side, blockIndex: blockIdx },
        bubbles: true,
        composed: true,
      }));
    });
    return cell;
  }

  // ─────────────── blocos ───────────────

  private _renderParagraph(doc: Document, p: Paragraph, marks: DocIntraEdit[]): HTMLElement {
    const el = doc.createElement('div');
    el.className = 'uwd-para';
    const pr = p.props;
    if (pr.alignment && pr.alignment !== 'left') {
      el.style.textAlign = pr.alignment === 'both' ? 'justify' : pr.alignment;
    }
    if (pr.indentLeftTwips) el.style.paddingLeft = `${pr.indentLeftTwips / 20}pt`;
    if (pr.indentRightTwips) el.style.paddingRight = `${pr.indentRightTwips / 20}pt`;
    if (pr.indentFirstLineTwips) el.style.textIndent = `${pr.indentFirstLineTwips / 20}pt`;
    if (pr.spaceBeforeTwips) el.style.marginTop = `${pr.spaceBeforeTwips / 20}pt`;
    if (pr.spaceAfterTwips) el.style.marginBottom = `${pr.spaceAfterTwips / 20}pt`;
    const shd = hex6(pr.shadingHex);
    if (shd) el.style.background = shd;
    if (pr.numbering) {
      const marker = doc.createElement('span');
      marker.textContent = pr.numbering.kind === 'bullet' ? '• ' : '# ';
      marker.style.paddingLeft = `${pr.numbering.ilvl * 18}pt`;
      el.append(marker);
    }

    // Offsets das marcas intra são no texto concatenado dos runs (paraText).
    let offset = 0;
    for (const r of p.runs) {
      const len = r.text.length;
      const runMarks = marks
        .filter((m) => m.startCh < offset + len && m.endCh > offset)
        .map((m) => ({
          start: Math.max(0, m.startCh - offset),
          end: Math.min(len, m.endCh - offset),
          kind: m.kind,
        }))
        .sort((x, y) => x.start - y.start);
      el.append(...this._renderRun(doc, r, runMarks));
      offset += len;
    }
    return el;
  }

  private _renderRun(
    doc: Document,
    r: Run,
    marks: { start: number; end: number; kind: 'insert' | 'delete' }[],
  ): Node[] {
    if (r.image) {
      const img = doc.createElement('img');
      const mime = MIME[r.image.ext.toLowerCase()] ?? 'application/octet-stream';
      // Uint8Array pode ser view parcial de um buffer maior — recorta.
      const bytes = r.image.data;
      const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buf], { type: mime }));
      this._blobUrls.push(url);
      img.src = url;
      // twips → px CSS (1 twip = 1/20 pt; 1 pt = 96/72 px ⇒ px = twips/15).
      img.width = Math.round(r.image.widthTwips / 15);
      img.height = Math.round(r.image.heightTwips / 15);
      if (marks.length > 0) {
        const wrap = doc.createElement('span');
        wrap.className = marks[0]!.kind === 'insert' ? 'uwd-intra--ins' : 'uwd-intra--del';
        wrap.append(img);
        return [wrap];
      }
      return [img];
    }

    const base = this._styledSpan(doc, r);
    const text = r.text;
    if (marks.length === 0) {
      base.textContent = text;
      return [base];
    }
    // Divide o texto do run nos limites das marcas.
    let pos = 0;
    for (const m of marks) {
      if (m.start > pos) base.append(doc.createTextNode(text.slice(pos, m.start)));
      const mark = doc.createElement('span');
      mark.className = m.kind === 'insert' ? 'uwd-intra--ins' : 'uwd-intra--del';
      mark.textContent = text.slice(m.start, m.end);
      base.append(mark);
      pos = m.end;
    }
    if (pos < text.length) base.append(doc.createTextNode(text.slice(pos)));
    return [base];
  }

  private _styledSpan(doc: Document, r: Run): HTMLElement {
    const s = doc.createElement('span');
    const p = r.props;
    if (p.bold) s.style.fontWeight = '700';
    if (p.italic || p.isMath) s.style.fontStyle = 'italic';
    const deco: string[] = [];
    if (p.underline) deco.push('underline');
    if (p.strike || p.doubleStrike) deco.push('line-through');
    if (deco.length) s.style.textDecoration = deco.join(' ');
    const uc = hex6(p.underlineColor);
    if (uc) s.style.textDecorationColor = uc;
    if (p.szHalfPt) s.style.fontSize = `${p.szHalfPt / 2}pt`;
    const fg = hex6(p.color);
    if (fg) s.style.color = fg;
    if (p.highlight && HIGHLIGHT[p.highlight]) s.style.background = HIGHLIGHT[p.highlight]!;
    if (p.fontAscii) s.style.fontFamily = `"${p.fontAscii}", sans-serif`;
    if (p.allCaps) s.style.textTransform = 'uppercase';
    if (p.smallCaps) s.style.fontVariant = 'small-caps';
    if (p.vertAlign === 'superscript') { s.style.verticalAlign = 'super'; s.style.fontSize = 'smaller'; }
    if (p.vertAlign === 'subscript') { s.style.verticalAlign = 'sub'; s.style.fontSize = 'smaller'; }
    if (p.link) { s.style.color = '#0563c1'; s.style.textDecoration = 'underline'; s.title = p.link; }
    return s;
  }

  private _renderTable(
    doc: Document,
    t: TableBlock,
    side: 'a' | 'b',
    rowDiff: TableRowEdit[] | null,
  ): HTMLElement {
    // Mapa: índice da linha → kind, a partir do diff aninhado.
    const rowKind = new Map<number, string>();
    if (rowDiff) {
      for (const rd of rowDiff) {
        const idxs = side === 'a' ? rd.aRows : rd.bRows;
        const kind = rd.kind === 'change' && rd.formatOnly ? 'format'
          : rd.kind === 'change' ? 'change'
          : rd.kind;
        for (const idx of idxs) {
          if (kind !== 'equal') rowKind.set(idx, kind);
        }
      }
    }
    const el = doc.createElement('table');
    el.className = 'uwd-table';
    for (let ri = 0; ri < t.rows.length; ri++) {
      const tr = doc.createElement('tr');
      const kind = rowKind.get(ri);
      if (kind && kind !== 'equal') tr.className = `uwd-row--${kind}`;
      for (const c of t.rows[ri]!.cells) {
        const td = doc.createElement('td');
        if (c.gridSpan > 1) td.colSpan = c.gridSpan;
        const cellShd = hex6(c.shadingHex);
        if (cellShd) td.style.background = cellShd;
        for (const cp of c.paragraphs) td.append(this._renderParagraph(doc, cp, []));
        for (const nested of c.tables) td.append(this._renderTable(doc, nested, side, null));
        tr.append(td);
      }
      el.append(tr);
    }
    return el;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('universal-write-diff')) {
  customElements.define('universal-write-diff', UniversalWriteDiffElement);
}
