import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../../src/typography/font/sfnt.js';
import { breakRich, type FontRegistry } from '../../src/typography/richbreak.js';

const aptos = join(__dirname, '../../../../tools/word-lab/fonts/aptos-regular.ttf');

describe('quebra de linha forçada (\\n e \\f)', () => {
  if (!existsSync(aptos)) { it.skip('fonte ausente', () => {}); return; }
  const font = new SfntFont(new Uint8Array(readFileSync(aptos)));
  const fonts: FontRegistry = { resolve: () => font };

  it('\\f (quebra de página) termina a linha', () => {
    const { lines } = breakRich(
      [{ text: 'Primeira.\fSegunda.', variant: 'regular', sizePt: 11 }],
      fonts,
      { availableTwips: 9000 },
    );
    expect(lines.length).toBe(2);
    expect(lines[0]!.end).toBe(10); // inclui o \f (índice 9 + 1)
    expect(lines[1]!.start).toBe(10);
  });

  it('\\n (quebra de linha manual) também divide', () => {
    const { lines } = breakRich(
      [{ text: 'a\nb\nc', variant: 'regular', sizePt: 11 }],
      fonts,
      { availableTwips: 9000 },
    );
    expect(lines.length).toBe(3);
  });
});
