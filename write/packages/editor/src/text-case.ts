// Maiúsculas e Minúsculas como o Word (oráculo write/tools/home-lab exp-font.ps1;
// memória word-home-font-facts): regras puras, sem DOM.

/** Troca de caixa de um texto, letra a letra (o comprimento não muda: 'ß' fica). */
export function caseMapped(text: string, mode: 'upper' | 'lower' | 'sentence' | 'title' | 'toggle'): string {
  const up = (c: string): string => { const u = c.toUpperCase(); return u.length === c.length ? u : c; };
  const low = (c: string): string => { const l = c.toLowerCase(); return l.length === c.length ? l : c; };
  const chars = [...text];
  const out: string[] = [];
  // frase: começa no início, depois de quebra de parágrafo ou de . ! ? (+ brancos)
  let sentence = true;
  let wordStart = true;
  for (const c of chars) {
    const letter = c.toLowerCase() !== c.toUpperCase();
    switch (mode) {
      case 'upper': out.push(up(c)); break;
      case 'lower': out.push(low(c)); break;
      case 'toggle': out.push(c === c.toUpperCase() ? low(c) : up(c)); break;
      case 'title': out.push(wordStart && letter ? up(c) : low(c)); break;
      case 'sentence': out.push(sentence && letter ? up(c) : low(c)); break;
    }
    if (mode === 'sentence') {
      if (c === '.' || c === '!' || c === '?' || c === '\n') sentence = true;
      else if (letter || /\d/.test(c)) sentence = false;
    }
    wordStart = /\s/.test(c);
  }
  return out.join('');
}
