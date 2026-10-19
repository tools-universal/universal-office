import type { Slide, Shape } from '@universal-office/slides-core';
import { LiveRegion, SR_ONLY } from '@universal-office/viewer-controls';
import { pickLabels, type UiLang } from '@universal-office/i18n';

/**
 * Acessibilidade do <universal-presentation-viewer>: o slide é desenhado num
 * canvas, então o leitor de tela recebe uma versão em TEXTO do slide em cena
 * (visualmente oculta): o título como heading, os textos das formas na ordem
 * de leitura do PowerPoint (a ordem das formas), tabelas e o texto alternativo
 * das imagens/formas (cNvPr/@descr). O canvas se apresenta como "Slide N de M:
 * título" e cada troca de slide é anunciada (aria-live).
 */

const LABELS = {
  pt: {
    slide: (n: number, m: number) => `Slide ${n} de ${m}`, untitled: 'Sem título',
    presentation: 'Apresentação', content: 'Conteúdo do slide', roledesc: 'slide', image: 'Imagem',
  },
  en: {
    slide: (n: number, m: number) => `Slide ${n} of ${m}`, untitled: 'Untitled',
    presentation: 'Presentation', content: 'Slide content', roledesc: 'slide', image: 'Image',
  },
};
type Labels = typeof LABELS.en;

const TITLE_PH = new Set(['title', 'ctrTitle']);
/** Placeholders de rodapé (data, número do slide, rodapé): o leitor não precisa deles a cada slide. */
const SKIP_PH = new Set(['sldNum', 'dt', 'ftr', 'hdr']);

/** Texto alternativo que é só o nome do arquivo (geradores gravam isso): não descreve nada. */
const usefulAlt = (d: string | undefined): string | undefined =>
  d && !/^[\w .()-]+\.(png|jpe?g|gif|svg|emf|wmf|bmp|tiff?|webp)$/i.test(d.trim()) ? d.trim() : undefined;

const paraText = (p: { runs: { text: string }[] }): string => p.runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();

/** Título do slide: o placeholder de título; sem ele, a 1ª linha de texto. */
export function slideTitle(slide: Slide | undefined): string {
  if (!slide) return '';
  const own = slide.shapes.filter((s) => !s.inherited);
  const t = own.find((s) => s.phType && TITLE_PH.has(s.phType) && s.txBody);
  const text = t?.txBody?.paragraphs.map(paraText).filter(Boolean).join(' ');
  if (text) return text;
  for (const s of own) for (const p of s.txBody?.paragraphs ?? []) { const x = paraText(p); if (x) return x; }
  return '';
}

export class SlideA11y {
  /** conteúdo do slide em cena (oculto, na árvore de acessibilidade) */
  readonly content = document.createElement('div');
  readonly live = new LiveRegion();
  private labels: Labels = LABELS.en;
  private shown = -1;
  private skipText: string | null = null;
  private count = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly wrap: HTMLElement) {
    this.content.style.cssText = SR_ONLY;
    this.content.setAttribute('role', 'group');
    this.content.setAttribute('part', 'slide-text');
    canvas.setAttribute('role', 'img');
    wrap.setAttribute('role', 'region');
    wrap.append(this.content, this.live.el);
  }

  setLang(lang: UiLang): void {
    this.labels = pickLabels(lang, LABELS);
    this.canvas.setAttribute('aria-roledescription', this.labels.roledesc);
    this.shown = -1;
  }

  /** Nome da região do viewer (o arquivo, quando houver). */
  setName(fileName: string | null): void {
    this.wrap.setAttribute('aria-label', fileName ? `${this.labels.presentation}: ${fileName}` : this.labels.presentation);
  }

  /** Slide em cena mudou (ou o deck): refaz o texto e, se `announce`, anuncia. */
  show(slides: readonly Slide[], index: number, announce: boolean): void {
    if (index === this.shown && slides.length === this.count) return;
    const first = this.shown < 0;
    this.shown = index;
    this.count = slides.length;
    const L = this.labels;
    const slide = slides[index];
    if (!slide) {
      this.canvas.setAttribute('aria-label', L.presentation);
      this.content.textContent = '';
      return;
    }
    const title = slideTitle(slide);
    const where = L.slide(index + 1, slides.length);
    const label = `${where}: ${title || L.untitled}`;
    this.canvas.setAttribute('aria-label', label);
    this.content.setAttribute('aria-label', `${L.content} — ${where}`);
    this.content.textContent = '';
    const h = document.createElement('h2');
    h.textContent = label;
    this.content.appendChild(h);
    // título tirado da 1ª linha (sem placeholder de título): não repete como parágrafo
    this.skipText = slide.shapes.some((s) => !s.inherited && s.phType && TITLE_PH.has(s.phType) && s.txBody) ? null : title;
    for (const s of slide.shapes) this.appendShape(s);
    if (announce && !first) this.live.announce(label);
  }

  private appendShape(s: Shape): void {
    if (s.inherited || (s.phType && (SKIP_PH.has(s.phType) || TITLE_PH.has(s.phType)))) return;
    const alt = usefulAlt(s.descr);
    if (alt && (s.image || s.media || !s.txBody?.paragraphs.some((p) => paraText(p)))) {
      const img = document.createElement('div');
      img.setAttribute('role', 'img');
      img.setAttribute('aria-label', alt);
      this.content.appendChild(img);
    }
    for (const p of s.txBody?.paragraphs ?? []) {
      const t = paraText(p);
      if (!t) continue;
      if (t === this.skipText) { this.skipText = null; continue; }
      const el = document.createElement('p');
      el.textContent = t;
      this.content.appendChild(el);
    }
    if (s.table) {
      const table = document.createElement('table');
      for (const row of s.table.rows) {
        const tr = document.createElement('tr');
        for (const cell of row.cells) {
          if ((cell as { hMerge?: boolean }).hMerge || (cell as { vMerge?: boolean }).vMerge) continue;
          const td = document.createElement('td');
          td.textContent = (cell.txBody?.paragraphs ?? []).map(paraText).filter(Boolean).join(' ');
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      this.content.appendChild(table);
    }
  }
}
