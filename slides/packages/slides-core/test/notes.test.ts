import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PptxPackage, readPresentation, readSlideNotes } from '../src/index.js';

const file = join(__dirname, '..', '..', '..', 'samples', 'showcase_animado.pptx');

describe('anotações do orador (readSlideNotes)', () => {
  it.skipIf(!existsSync(file))('texto do placeholder body do notesSlide, um parágrafo por linha', () => {
    const pkg = PptxPackage.load(new Uint8Array(readFileSync(file)));
    const paths = readPresentation(pkg).slides.map((r) => r.target!);
    expect(readSlideNotes(pkg, paths[1]!)).toMatch(/^Agenda em cards\./);
    // número do slide/cabeçalho do notesSlide (outros placeholders) não entram
    for (const p of paths) expect(readSlideNotes(pkg, p)).not.toMatch(/^\d+$/);
  });

  it('slide sem notesSlide → vazio', () => {
    expect(readSlideNotes({ getPartText: () => undefined, resolveRelTarget: (_: string, t: string) => t } as unknown as PptxPackage, 'ppt/slides/slide1.xml')).toBe('');
  });
});
