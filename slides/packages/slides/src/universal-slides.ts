import { UniversalPresentationViewerElement } from '@universal/presentation-viewer';
import type { Paragraph, Run } from '@universal/slides-core';

/**
 * <universal-slides> — webcomponent EDITOR de apresentações. Herda toda a
 * visualização do `<universal-presentation-viewer>` (paint, navegação,
 * miniaturas, animações, transições, hyperlinks) e acrescenta a edição
 * inline de texto: double-click numa shape com txBody abre um
 * `<div contenteditable>` sobre o `xfrm`; Enter/Esc/blur commitam/cancelam.
 *
 * O commit escreve de volta em `txBody.paragraphs` e dispara `us-shape-edit`.
 */
export class UniversalSlidesElement extends UniversalPresentationViewerElement {
  /** Editor inline da shape de texto (criado em `beginEditShape`). */
  private editor: HTMLDivElement | null = null;
  private editingShape: { slide: number; shapeIdx: number } | null = null;

  constructor() {
    super();
    // Double-click sobre uma shape de texto entra em modo edição. Single click
    // só dá foco (NUNCA avança o slide — o usuário tem teclado/chrome p/ isso).
    this.canvas.addEventListener('dblclick', this.onDblClick);
  }

  protected override isEditing(): boolean { return this.editingShape !== null; }

  protected override suppressTextIdx(): number | undefined {
    return this.editingShape && this.editingShape.slide === this.index
      ? this.editingShape.shapeIdx
      : undefined;
  }

  override selectSlide(i: number): void {
    if (this.editingShape) this.commitEditShape();
    super.selectSlide(i);
  }

  private onDblClick = (e: MouseEvent): void => {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // hit-test: ULTIMA shape com txBody que contem o ponto (z-order: a mais ao topo).
    for (let i = slide.shapes.length - 1; i >= 0; i--) {
      const sh = slide.shapes[i]!;
      if (!sh.txBody || !sh.xfrm) continue;
      const sx = fit.ox + sh.xfrm.x * fit.scale;
      const sy = fit.oy + sh.xfrm.y * fit.scale;
      const sw = sh.xfrm.cx * fit.scale;
      const sh2 = sh.xfrm.cy * fit.scale;
      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh2) {
        this.beginEditShape(i);
        e.preventDefault();
        return;
      }
    }
  };

  // ───────────────────────── EDIÇÃO DE TEXTO ─────────────────────────

  /**
   * Entra em modo edição numa shape de texto. Cria um `<div contenteditable>`
   * sobre o `xfrm` da shape. Enter (sem Shift) e Esc commitam; blur commita.
   * **Limitação v1:** ao commitar, descarta runs e mantém um único run com o
   * texto editado no PRIMEIRO parágrafo. Preservação de runs/formato vem em
   * iterações futuras (precisa de diff + reaplicação por offset).
   */
  beginEditShape(shapeIdx: number): void {
    const slide = this.slides[this.index];
    const fit = this.fit();
    if (!slide || !fit) return;
    const sh = slide.shapes[shapeIdx];
    if (!sh || !sh.xfrm || !sh.txBody) return;
    if (this.editor) this.commitEditShape();
    this.editingShape = { slide: this.index, shapeIdx };

    // texto inicial: concat de runs (\n entre paragrafos)
    const initialText = sh.txBody.paragraphs
      .map((p) => p.runs.map((r) => r.text).join(''))
      .join('\n');

    const left = fit.ox + sh.xfrm.x * fit.scale;
    const top = fit.oy + sh.xfrm.y * fit.scale;
    const w = sh.xfrm.cx * fit.scale;
    const h = sh.xfrm.cy * fit.scale;
    // estimativa de tamanho de fonte = sz do primeiro run (default 18pt)
    const firstRun = sh.txBody.paragraphs[0]?.runs[0];
    const pt = firstRun?.sz ?? (sh.phType === 'title' || sh.phType === 'ctrTitle' ? 40 : 18);
    const px = pt * 12700 * fit.scale / 12700; // pt -> px (12700 EMU/pt, escala 1:1)
    const color = firstRun?.color ?? '#000000';
    const font = firstRun?.font ?? 'Calibri';
    const align = sh.txBody.paragraphs[0]?.align;

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.spellcheck = false;
    div.textContent = initialText;
    div.style.cssText =
      `position:absolute;left:${left}px;top:${top}px;width:${w}px;min-height:${h}px;` +
      `padding:4px;border:2px dashed #ff7043;outline:none;background:rgba(255,255,255,.92);` +
      `color:${color};font:${px}px ${this.fontStackFor(font)};` +
      `text-align:${align === 'ctr' ? 'center' : align === 'r' ? 'right' : 'left'};` +
      `white-space:pre-wrap;z-index:5;`;
    this.wrap.appendChild(div);
    this.editor = div;
    div.focus();
    // seleciona todo o texto (Excel/PowerPoint convention: F2/dbl-click selects)
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }

    let suppressBlur = false;
    div.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        suppressBlur = true;
        this.commitEditShape();
        this.canvas.focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        suppressBlur = true;
        this.cancelEditShape();
        this.canvas.focus();
      }
    });
    div.addEventListener('blur', () => {
      if (suppressBlur || !this.editingShape) return;
      this.commitEditShape();
    });
  }

  /** Commita a edição → atualiza shape.txBody.paragraphs com o texto editado. */
  commitEditShape(): void {
    if (!this.editor || !this.editingShape) return;
    const text = this.editor.innerText.replace(/\r\n/g, '\n');
    const { slide: slideIdx, shapeIdx } = this.editingShape;
    const slide = this.slides[slideIdx];
    const sh = slide?.shapes[shapeIdx];
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    if (!sh || !sh.txBody) { this.paint(); return; }
    // v1: 1 paragrafo por linha, 1 run por paragrafo. Preserva sz/cor/fonte do
    // PRIMEIRO run quando possivel (default razoavel).
    const firstRun: Run | undefined = sh.txBody.paragraphs[0]?.runs[0];
    const firstPara: Paragraph | undefined = sh.txBody.paragraphs[0];
    sh.txBody.paragraphs = text.split('\n').map((line): Paragraph => {
      const run: Run = { text: line };
      if (firstRun?.sz !== undefined) run.sz = firstRun.sz;
      if (firstRun?.bold) run.bold = true;
      if (firstRun?.italic) run.italic = true;
      if (firstRun?.underline) run.underline = true;
      if (firstRun?.color) run.color = firstRun.color;
      if (firstRun?.font) run.font = firstRun.font;
      const para: Paragraph = { runs: [run] };
      if (firstPara?.align) para.align = firstPara.align;
      if (firstPara?.bullet) para.bullet = firstPara.bullet;
      return para;
    });
    this.dispatchEvent(new CustomEvent('us-shape-edit', {
      detail: { slide: slideIdx, shapeIdx, text },
    }));
    this.paint();
  }

  /** Descarta a edição em curso (texto original mantido). */
  cancelEditShape(): void {
    if (!this.editor) return;
    this.editor.remove();
    this.editor = null;
    this.editingShape = null;
    this.paint();
  }
}

customElements.define('universal-slides', UniversalSlidesElement);
