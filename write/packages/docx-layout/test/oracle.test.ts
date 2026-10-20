/**
 * Regressão motor × Word: cada caso em test/oracle/<grupo>/<caso>.docx foi
 * exportado para PDF pelo Word real (tools/layout-oracle) e as linhas medidas
 * estão em <caso>.word.json. O motor tem de reproduzir a paginação, o texto de
 * cada linha (quebras) e a baseline (±0,3 pt).
 *
 * Usa as fontes INSTALADAS (Arial, Calibri, Aptos…) lidas da máquina — nunca
 * versionadas (CLAUDE.md). Sem elas (CI), os casos são pulados.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DocxPackage, readFullDocument, readEmbeddedFonts } from '@universal-office/docx-core';
import { layoutDocument, withEmbeddedFonts } from '../src/index.js';
import { loadHyphenation, HYPHENATION_PATTERN_IDS, SfntFont } from '../src/typography/index.js';
import { engineLines, compareLines, type OracleDoc } from './oracle-compare.js';

const oracleDir = join(__dirname, 'oracle');
// @ts-expect-error módulo JS das ferramentas do lab (sem tipos)
const { createNodeFontProvider } = await import('../../../tools/corpus-lab/node-fonts.mjs');
const provider = await createNodeFontProvider();
const hasFonts = ['Arial', 'Calibri', 'Times New Roman'].every((f) => provider.face(f, false, false));
// padrões de hifenização (w:autoHyphenation — grupos hyph*): o layout é síncrono
await loadHyphenation(HYPHENATION_PATTERN_IDS);

/** Varreduras de limiar (justify2/4/5): a fronteira exata pode errar 1 passo de 2-4 twips. */
const SWEEPS = new Set(['justify2', 'justify3', 'justify4', 'justify5', 'justify8', 'jsweep']);
/** Tolerância de baseline por grupo: o Word quantiza o deslocamento de
 *  sobrescrito em passos de ~0,5 pt que dependem da fonte (resíduo conhecido);
 *  nas equações (omath), as posições em pixels de 600 dpi deixam ~0,05 pt por
 *  linha de equação no corpo 11 (sem modelo). */
const DY_TOL: Record<string, number> = { vertalign: 0.6, notes: 0.65, fnsep: 0.65, fnrefsup: 0.65, omath: 0.4 };
/** Grupos em que o motor também não pode ter linhas A MAIS (texto que o Word
 *  não grava no PDF: fora da página, sem preenchimento, curvas…). */
const STRICT = new Set(['hidetext', 'emfrop', 'txbxscale']);
/** Grupos em que a posição horizontal é o que se mede (x da 1ª letra, ±pt). */
const DX_TOL: Record<string, number> = { tblpct: 0.6, tblw: 0.6, formtext: 0.6, spacerun: 0.6, numtabind: 0.6, tallwrap: 0.6, numstyind: 0.6, tblsp: 0.6, nowrap: 0.6, tblvert: 0.6, tblnum: 0.6, fejust: 0.6, tblpctmin: 0.6, tblindctr: 0.6, txbxctr: 0.6, txbxln: 0.6, tbinset: 0.3, ftcellmar: 0.3, omath: 0.6, tblbdmin: 0.6, sckmix: 0.6, rowjc: 0.6, wmftext: 0.6, cellwrap: 0.3, txrect: 0.3, tblmincol: 0.6, felead: 0.6, feknown: 0.6, fehangcomp: 0.6, glyphfb: 0.6, anctrail: 0.3, cellout: 0.3, brfirst: 0.6 };

/** Grupos em que a contagem de pontos do preenchimento de tab é comparada exata. */
const EXACT_LEADERS = new Set(['tdhalfpx', 'tdend']);

/** Grupos medidos caractere a caractere em teste próprio (supraise.test.ts). */
const CHAR_ONLY = new Set(['supraise']);

const groups = existsSync(oracleDir) ? readdirSync(oracleDir).filter((g) => !CHAR_ONLY.has(g)) : [];
for (const g of groups) {
  describe.skipIf(!hasFonts)(`oráculo Word: ${g}`, () => {
    const dir = join(oracleDir, g);
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.docx')).sort()) {
      const exp = join(dir, f.replace(/\.docx$/, '.word.json'));
      if (!existsSync(exp)) continue;
      it(f.replace(/\.docx$/, ''), () => {
        const word = JSON.parse(readFileSync(exp, 'utf8')) as OracleDoc;
        const pkg = DocxPackage.load(new Uint8Array(readFileSync(join(dir, f))));
        const full = readFullDocument(pkg);
        // fontes embutidas no documento (oráculo emwidth: fonte aberta renomeada) — como o app
        const res = layoutDocument(full, withEmbeddedFonts(provider, readEmbeddedFonts(pkg), (b) => new SfntFont(b)));
        const r = compareLines(word, engineLines(res), EXACT_LEADERS.has(g));
        if (SWEEPS.has(g) || g === 'vertalign') {
          // vertalign: o deslocamento do sobrescrito muda o agrupamento em linhas da extração
          expect(r.matched / r.linesW, r.firstDiff).toBeGreaterThanOrEqual(g === 'vertalign' ? 0.9 : 0.98);
        } else {
          expect(r.pagesO, 'páginas').toBe(r.pagesW);
          expect(r.matched, `linhas casadas (1ª diferença: ${r.firstDiff})`).toBe(r.linesW);
          expect(r.samePage, 'linhas na mesma página').toBe(r.matched);
          expect(r.maxDy, 'Δbaseline máx (pt)').toBeLessThanOrEqual(DY_TOL[g] ?? 0.3);
          if (DX_TOL[g] !== undefined) expect(r.maxDx, 'Δx máx (pt)').toBeLessThanOrEqual(DX_TOL[g]!);
          if (STRICT.has(g)) expect(r.extraO, `linhas só nossas (1ª: ${r.firstExtra})`).toBe(0);
        }
        if (g === 'fontsub') {
          // a fonte substituta certa dá a mesma largura de linha (fim da linha ±2 pt;
          // o x1 do Word é a caixa do último glifo, o nosso é o avanço)
          const wl = word.pages.flatMap((p) => p.lines);
          const ol = res.pages.flatMap((p) => p.lines);
          wl.forEach((w, k) => {
            const o = ol[k]!;
            expect(Math.abs((o.x + o.width) / 20 - w.x1), `largura de "${w.text}"`).toBeLessThan(2);
          });
        }
        if (g === 'tblshd') {
          // tabelas sem bordas: cada preenchimento do Word é um caminho (o PDF do
          // Word grava 2 por célula); as faixas verticais pintadas têm de ser as mesmas
          const band = (y0: number, y1: number) => `${Math.round(y0)}-${Math.round(y1)}`;
          const objs = (word.pages[0] as { objs?: { t: string; y0: number; y1: number }[] }).objs ?? [];
          const wb = [...new Set(objs.filter((o) => o.t === 'path').map((o) => band(o.y0, o.y1)))].sort();
          const ob = [...new Set(res.pages[0]!.items.filter((it) => it.t === 'rect').map((it) => band(it.y / 20, (it.y + it.h) / 20)))].sort();
          expect(ob, 'faixas preenchidas (pt)').toEqual(wb);
        }
        if (g === 'hfgroup') {
          // ordem de pintura: a caixa (caminho preenchido) sai depois da imagem da
          // faixa no Word (objs na ordem do PDF)? A nossa tem de ser a mesma
          const objs = (word.pages[0] as { objs?: { t: string; y0: number; y1: number }[] }).objs ?? [];
          const wImg = objs.findIndex((o) => o.t === 'image' && o.y0 < 0.5 && o.y1 > 93);
          const wBox = objs.findIndex((o) => o.t === 'path');
          if (wImg >= 0 && wBox >= 0) {
            const items = res.pages[0]!.items;
            const oImg = items.findIndex((it) => it.t === 'image' && it.y < 10 && it.h > 1870);
            const oBox = items.findIndex((it) => it.t === 'shape');
            expect(oBox > oImg, 'caixa na frente da faixa').toBe(wBox > wImg);
          }
        }
        if (g === 'kern') {
          // linhas aos pares (com kern, sem kern): a soma dos ajustes de cada
          // linha = x1(sem) − x1(com) tem de bater com a do Word (±0,15 pt ou 0,6%:
          // o Word posiciona em unidades de dispositivo)
          const wl = word.pages.flatMap((p) => p.lines);
          const ol = res.pages.flatMap((p) => p.lines);
          for (let k = 0; k + 1 < wl.length && k + 1 < ol.length; k++) {
            if (wl[k]!.text !== wl[k + 1]!.text) continue; // linha quebrada: sem par
            const wk = wl[k + 1]!.x1 - wl[k]!.x1;
            const ok = (ol[k + 1]!.x + ol[k + 1]!.width - ol[k]!.x - ol[k]!.width) / 20;
            expect(Math.abs(ok - wk), `kerning da linha "${wl[k]!.text}" (Word ${wk.toFixed(2)}, motor ${ok.toFixed(2)})`).toBeLessThan(Math.max(0.15, 0.006 * Math.abs(wk)));
            k++;
          }
        }
      });
    }
  });
}
