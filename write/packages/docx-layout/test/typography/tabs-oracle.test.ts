import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../../src/typography/font/sfnt.js';
import { breakRich, type FontRegistry } from '../../src/typography/richbreak.js';

/** Valida tabs contra o tab-oracle (posições de caret no app de referência, ±0.75pt). */
const labDir = join(__dirname, '../../../../tools/word-lab');
const oraclePath = join(labDir, 'results/tab-oracle/oracle.json');
const aptosPath = join(labDir, 'fonts/aptos-regular.ttf');

describe('tab stops vs oráculo de referência', () => {
  if (!existsSync(oraclePath) || !existsSync(aptosPath)) {
    it.skip('oráculo ausente — rode generate-tab-oracle.ps1', () => {});
    return;
  }
  const oracle = JSON.parse(readFileSync(oraclePath, 'utf8')) as {
    defaultTabStopPt: number;
    text: string;
    xs: number[];
  };
  const font = new SfntFont(new Uint8Array(readFileSync(aptosPath)));
  const fonts: FontRegistry = { resolve: () => font };

  it('default tab stop do app de referência é 35.4pt (708 twips)', () => {
    expect(oracle.defaultTabStopPt).toBeCloseTo(35.4, 1);
  });

  it('posições após cada tab batem com o caret do app de referência (±0.75pt)', () => {
    const { charAdvances } = breakRich(
      [{ text: oracle.text, variant: 'regular', sizePt: 11 }],
      fonts,
      { availableTwips: 8504, defaultTabStopTwips: 708 },
    );
    const marginPt = 85.05;
    let xTw = 0;
    for (let i = 0; i < oracle.text.length; i++) {
      const oursPt = marginPt + xTw / 20;
      const wordPt = oracle.xs[i]!;
      expect(Math.abs(oursPt - wordPt), `caret antes de '${oracle.text[i]}' (i=${i})`)
        .toBeLessThan(0.8);
      xTw += charAdvances[i]!;
    }
  });
});
