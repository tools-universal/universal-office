import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PptxPackage, readPresentation, readSlide, type Slide } from '../src/index.js';

// decks do corpus de reprodução (gerados no PowerPoint via COM — tools/ppt-lab/playback);
// sem o corpus, os testes se pulam
const dir = join(__dirname, '..', '..', '..', 'samples', 'playback');
const deck = (name: string): Slide[] => {
  const pkg = PptxPackage.load(new Uint8Array(readFileSync(join(dir, name))));
  return readPresentation(pkg).slides.map((r) => readSlide(pkg, r.target!));
};
const has = (name: string): boolean => existsSync(join(dir, name));

describe('leitura de mídia/365 gravada pelo PowerPoint', () => {
  it.skipIf(!has('pb-365.pptx'))('ícone só com svgBlip e modelo 3D (mc:AlternateContent → Fallback)', () => {
    const [s1, s2] = deck('pb-365.pptx');
    expect(s1!.shapes.find((s) => s.image)?.image?.mime).toBe('image/svg+xml');
    const m = s2!.shapes.find((s) => s.name.startsWith('Modelo 3D'));
    expect(m?.image?.mime).toBe('image/png');
    expect(m?.id).toBe('3'); // mesmo id do Choice: as animações miram nele
  });

  it.skipIf(!has('pb-midia-2.pptx'))('corte, esmaecer, marcador, retroceder, loop, ocultar, tela cheia', () => {
    const s = deck('pb-midia-2.pptx');
    const vid = (i: number) => s[i]!.shapes.find((x) => x.media)!;
    expect(vid(0).media!.trim).toEqual({ startMs: 1000, endMs: 1000 });
    expect(vid(1).media!.fade).toEqual({ inMs: 1000, outMs: 1000 });
    expect(s[2]!.timing!.media![0]!.loop).toBe(true);
    expect(s[3]!.timing!.media![0]!.rewind).toBe(true);
    expect(s[4]!.timing!.media![0]!.showWhenStopped).toBe(false);
    expect(vid(5).media!.bookmarks).toEqual([{ name: 'marca', timeMs: 2000 }]);
    expect(s[5]!.timing!.bookmarkTriggers![0]).toMatchObject({ spid: vid(5).id, bookmark: 'marca', timeMs: 2000 });
    expect(s[7]!.timing!.media![0]!.fullScreen).toBe(true);
  });

  for (const ext of ['pptx', 'ppt']) {
    it.skipIf(!has(`pb-tempo-2.${ext}`))(`repetir até o fim / até o clique (${ext})`, () => {
      const s = deck(`pb-tempo-2.${ext}`);
      expect(s[0]!.timing!.steps[0]!.effects[0]!.durMs).toBe(Infinity);
      const fx = s[1]!.timing!.steps.flatMap((st) => st.effects);
      expect(fx.some((e) => e.endOnNext && e.durMs === Infinity)).toBe(true);
    });
  }
});
