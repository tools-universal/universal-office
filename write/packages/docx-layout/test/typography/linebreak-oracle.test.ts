import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SfntFont } from '../../src/typography/font/sfnt.js';
import { breakParagraph } from '../../src/typography/linebreak.js';
import { singleLineHeightPt, lineHeightPt } from '../../src/typography/lineheight.js';

/**
 * Valida o layout contra o ground truth do app de referência:
 *  - quebras de linha: oracle.json (Information(10) por caractere)
 *  - fonte: Aptos completa extraída do próprio app de referência (extract-fonts.ps1)
 *  - altura de linha: pitch medido no XPS exportado pelo app de referência
 */
const labDir = join(__dirname, '../../../../tools/word-lab');
const oraclePath = join(labDir, 'results/line-oracle/oracle.json');
const aptosPath = join(labDir, 'fonts/aptos-regular.ttf');

describe('layout vs oráculo de referência', () => {
  if (!existsSync(oraclePath) || !existsSync(aptosPath)) {
    it.skip('oráculo/fonte ausentes — rode generate-line-oracle.ps1 e extract-fonts.ps1', () => {});
    return;
  }

  const oracle = JSON.parse(readFileSync(oraclePath, 'utf8')) as {
    text: string;
    font: { name: string; sizePt: number };
    pageSetupPt: { width: number; left: number; right: number };
    charLines: number[];
  };
  const font = new SfntFont(new Uint8Array(readFileSync(aptosPath)));

  it('o doc padrão do app de referência usa Aptos (não Calibri)', () => {
    expect(oracle.font.name).toBe('Aptos');
  });

  it('métricas da Aptos', () => {
    expect(font.metrics.unitsPerEm).toBe(2048);
    expect(font.metrics.ascender).toBe(1923);
    expect(font.metrics.descender).toBe(-577);
  });

  it('quebras de linha idênticas às do app de referência', () => {
    const wordBreaks: number[] = [0];
    for (let i = 1; i < oracle.charLines.length; i++) {
      if (oracle.charLines[i] !== oracle.charLines[i - 1]) wordBreaks.push(i);
    }
    const availableTwips =
      (oracle.pageSetupPt.width - oracle.pageSetupPt.left - oracle.pageSetupPt.right) * 20;
    const lines = breakParagraph(oracle.text, {
      font,
      sizePt: oracle.font.sizePt,
      availableTwips,
    });
    expect(lines.map((l) => l.start)).toEqual(wordBreaks);
  });

  it('altura de linha do Normal (259/240) bate com o pitch do XPS', () => {
    // pitch medido no XPS do oráculo: 95.664 - 81.12 = 14.544pt
    const pitch = lineHeightPt(font, 11, { line: 259, lineRule: 'auto' });
    expect(pitch).toBeCloseTo(14.544, 2);
    expect(singleLineHeightPt(font, 11)).toBeCloseTo(13.4766, 3);
  });
});
