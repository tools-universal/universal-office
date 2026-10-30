// HTML colado → parágrafos (paste-html.ts): listas do Word (mso-list) viram
// listas sem o marcador que ele grava como texto, Título/Subtítulo/Título 7–9 do
// Word pela classe, e tags desconhecidas ficam com o texto (como o Word).
import { afterAll, describe, expect, it, vi } from 'vitest';
import { MiniDOMParser } from '../../../test-support/mini-html.js';
import { htmlToParas, looksOrdered, wordListFormats, wordListOf } from './paste-html.js';

// (no topo: os describe leem o HTML ao serem declarados)
vi.stubGlobal('DOMParser', MiniDOMParser);
afterAll(() => { vi.unstubAllGlobals(); });

const text = (p: { runs: { text: string }[] }): string => p.runs.map((r) => r.text).join('');

/** HTML como o Word põe na área de transferência (CF_HTML: <style> com @list e o fragmento). */
const WORD = `<html><head><style><!--
@list l0:level1 {mso-level-number-format:bullet;mso-level-text:·;}
@list l0:level2 {mso-level-number-format:bullet;mso-level-text:o;}
@list l1:level1 {mso-level-number-format:roman-upper;mso-level-text:"%1\\.";}
@list l2:level1 {mso-level-text:"%1\\.";}
--></style></head><body><!--StartFragment-->
<p class=MsoTitle>Política de Compras</p>
<p class=MsoSubtitle>Versão 2</p>
<h5>Detalhe</h5>
<p class=MsoHeading7>Nível sete</p>
<p class=MsoListParagraphCxSpFirst style='text-indent:-18.0pt;mso-list:l0 level1 lfo1'><![if !supportLists]><span style='font-family:Symbol'><span style='mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp; </span></span></span><![endif]>Primeiro</p>
<p class=MsoListParagraphCxSpLast style='margin-left:72.0pt;mso-list:l0 level2 lfo1'><![if !supportLists]><span style='font-family:"Courier New"'><span style='mso-list:Ignore'>o<span>&nbsp;&nbsp; </span></span></span><![endif]>Segundo</p>
<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'><![if !supportLists]><span><span style='mso-list:Ignore'>I.<span>&nbsp; </span></span></span><![endif]>Romano</p>
<p class=MsoListParagraph style='mso-list:l2 level1 lfo3'><![if !supportLists]><span><span style='mso-list:Ignore'>1.<span>&nbsp; </span></span></span><![endif]>Decimal</p>
<!--EndFragment--></body></html>`;

describe('htmlToParas: HTML do Word', () => {
  const ps = htmlToParas(WORD);

  it('Título e Subtítulo pela classe; h5 e MsoHeading7 como títulos', () => {
    expect(ps[0]).toMatchObject({ style: 'title' });
    expect(text(ps[0]!)).toBe('Política de Compras');
    expect(ps[1]).toMatchObject({ style: 'subtitle' });
    expect(ps[2]).toMatchObject({ heading: 5 });
    expect(ps[3]).toMatchObject({ heading: 7 });
  });

  it('itens mso-list viram listas (nível, instância lfo, marcador pela @list) sem o marcador como texto', () => {
    const items = ps.slice(4);
    expect(items.map(text)).toEqual(['Primeiro', 'Segundo', 'Romano', 'Decimal']);
    expect(items.map((p) => p.list)).toEqual([
      { ordered: false, level: 0, key: 100001 },
      { ordered: false, level: 1, key: 100001 },
      { ordered: true, level: 0, key: 100002 },
      { ordered: true, level: 0, key: 100003 },
    ]);
  });

  it('sem a definição @list (fragmento sem <style>): o marcador decide', () => {
    const frag = WORD.slice(WORD.indexOf('<!--StartFragment-->'));
    const items = htmlToParas(frag).filter((p) => p.list);
    expect(items.map((p) => p.list!.ordered)).toEqual([false, false, true, true]);
  });

  it('wordListOf / wordListFormats / looksOrdered', () => {
    expect(wordListOf("text-indent:-18pt;mso-list:l3 level2 lfo7")).toEqual({ list: 3, level: 2, lfo: 7 });
    expect(wordListOf('color:red')).toBeNull();
    expect([...wordListFormats(WORD)]).toEqual([['0:1', true], ['0:2', true], ['1:1', false], ['2:1', false]]);
    for (const m of ['1.', '12)', '(iv)', 'a)', 'IV.']) expect(looksOrdered(m), m).toBe(true);
    for (const m of ['·', 'o', '§', '•', '-']) expect(looksOrdered(m), m).toBe(false);
  });
});

describe('htmlToParas: o que não se conhece (regra do Word)', () => {
  it('tag desconhecida fica com o texto; mídia, iframe, controles e scripts saem', () => {
    const ps = htmlToParas('<p>Antes <x-tag data-id="7">marcado</x-tag> depois<video>sem vídeo</video><iframe>x</iframe><button>OK</button><script>alert(1)</script></p>');
    expect(ps.map(text)).toEqual(['Antes marcado depois']);
  });

  it('formatação em linha chega nos trechos (a política decide depois o que fica)', () => {
    const ps = htmlToParas('<p><span style="font-family:Arial;font-size:20pt;color:#ff0000;font-weight:bold">X</span><sup>2</sup></p>');
    expect(ps[0]!.runs[0]!.props).toMatchObject({ fontAscii: 'Arial', szHalfPt: 40, color: 'FF0000', bold: true });
    expect(ps[0]!.runs[1]!.props.vertAlign).toBe('superscript');
  });

  it('linha de tabela no meio do texto: as células numa linha, separadas por tabulação', () => {
    const ps = htmlToParas('<p>a</p><table><tr><td>1</td><td>2</td></tr></table>');
    expect(ps.map(text)).toEqual(['a', '1\t2']);
  });
});
