// Desfazer/refazer do <universal-slides> por INSTANTÂNEO do pacote: cada passo
// guarda o mapa caminho → bytes antes e depois da edição. É raso — os
// Uint8Array são compartilhados (o pacote troca a parte inteira a cada
// edição, nunca altera bytes no lugar), então um passo custa um Map com uma
// referência por parte, não uma cópia do arquivo.
import type { PptxPackage } from '@universal-office/slides-core';

export type PartsSnapshot = Map<string, Uint8Array>;

/** Estado da interface junto do passo (slide atual e forma selecionada). */
export interface EditState { index: number; shapeId: string | null }

interface Step {
  label: string;
  before: PartsSnapshot;
  after: PartsSnapshot;
  stateBefore: EditState;
  stateAfter: EditState;
}

export function snapshot(pkg: PptxPackage): PartsSnapshot {
  const m: PartsSnapshot = new Map();
  for (const n of pkg.partNames()) m.set(n, pkg.getPart(n)!);
  return m;
}

/** O pacote mudou desde o instantâneo? */
export function changedSince(pkg: PptxPackage, snap: PartsSnapshot): boolean {
  const names = pkg.partNames();
  if (names.length !== snap.size) return true;
  for (const n of names) if (snap.get(n) !== pkg.getPart(n)) return true;
  return false;
}

/** Devolve o pacote ao instantâneo (só as partes que diferem). */
export function restore(pkg: PptxPackage, snap: PartsSnapshot): void {
  for (const n of pkg.partNames()) if (!snap.has(n)) pkg.removePart(n);
  for (const [n, bytes] of snap) if (pkg.getPart(n) !== bytes) pkg.setPart(n, bytes);
}

export class EditHistory {
  private steps: Step[] = [];
  /** quantos passos estão aplicados (o resto é o que dá para refazer) */
  private pos = 0;
  /** posição gravada no último salvar (null = o arquivo salvo saiu do histórico) */
  private savedPos: number | null = 0;

  constructor(private readonly limit = 100) {}

  push(label: string, before: PartsSnapshot, after: PartsSnapshot, stateBefore: EditState, stateAfter: EditState): void {
    this.steps.length = this.pos;
    if (this.savedPos !== null && this.savedPos > this.pos) this.savedPos = null;
    this.steps.push({ label, before, after, stateBefore, stateAfter });
    this.pos++;
    if (this.steps.length > this.limit) {
      this.steps.shift();
      this.pos--;
      if (this.savedPos !== null) this.savedPos = this.savedPos > 0 ? this.savedPos - 1 : null;
    }
  }

  canUndo(): boolean { return this.pos > 0; }
  canRedo(): boolean { return this.pos < this.steps.length; }
  undoLabel(): string | null { return this.pos > 0 ? this.steps[this.pos - 1]!.label : null; }
  redoLabel(): string | null { return this.pos < this.steps.length ? this.steps[this.pos]!.label : null; }

  /** Desfaz: devolve o instantâneo e o estado de antes do passo. */
  undo(): { snap: PartsSnapshot; state: EditState } | null {
    if (!this.canUndo()) return null;
    const s = this.steps[--this.pos]!;
    return { snap: s.before, state: s.stateBefore };
  }

  redo(): { snap: PartsSnapshot; state: EditState } | null {
    if (!this.canRedo()) return null;
    const s = this.steps[this.pos++]!;
    return { snap: s.after, state: s.stateAfter };
  }

  /** Zera (documento novo/aberto). */
  clear(): void { this.steps = []; this.pos = 0; this.savedPos = 0; }

  markSaved(): void { this.savedPos = this.pos; }

  get dirty(): boolean { return this.savedPos !== this.pos; }
}
