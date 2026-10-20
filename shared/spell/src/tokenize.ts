/**
 * Tokenização do texto em palavras a revisar (pt/en), com as opções do Word e
 * os mesmos padrões dele ligados: ignorar palavras em MAIÚSCULAS, palavras com
 * números e endereços de Internet/arquivo. Números puros nunca são palavras.
 *
 * Palavra = letras (com marcas combinantes) unidas por hífen ou apóstrofo
 * INTERNOS: "guarda-chuva", "dar-lhe", "don't", "d'água". O apóstrofo tipográfico
 * (’) sai normalizado para ' e os hífens Unicode (U+2010; U+2011, que é o
 * w:noBreakHyphen do Word) para - em `word` (os .aff do LibreOffice usam ' e -); hífen e
 * apóstrofo nas pontas ficam de fora ('aspas', -traço). Hífen de sílaba
 * (U+00AD) e caracteres de largura zero dentro da palavra são removidos de `word`,
 * mas `start`/`end` apontam para o texto original.
 */

export interface WordToken {
  /** palavra normalizada, pronta para `check`/`suggest` */
  word: string;
  /** posição no texto original (UTF-16, fim exclusivo) — para o sublinhado */
  start: number;
  end: number;
}

export interface TokenizeOptions {
  /** ignora palavras só com maiúsculas, como "ABNT" (padrão: true, como no Word) */
  ignoreUppercase?: boolean;
  /** ignora palavras com dígitos, como "mp3" ou "A4" (padrão: true) */
  ignoreWithNumbers?: boolean;
  /** ignora URLs, e-mails e caminhos de arquivo (padrão: true) */
  ignoreInternet?: boolean;
}

const LETTER = String.raw`\p{L}\p{M}\p{N}\u00AD\u200B-\u200D\u2060`;
const JOIN = String.raw`'’\-\u2010\u2011`;
const WORD_RE = new RegExp(`[${LETTER}]+(?:[${JOIN}][${LETTER}]+)*`, 'gu');
const INVISIBLE_RE = /[\u00AD\u200B-\u200D\u2060]/g;

const TLD = 'com|org|net|gov|edu|mil|int|info|biz|io|dev|app|ai|co|me|tv|br|pt|us|uk|de|fr|es|it|eu';
const INTERNET_RE = new RegExp(
  [
    String.raw`\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"]+`, // http://…, ftp://…, file://…
    String.raw`\b(?:mailto|tel|urn):[^\s<>"]+`,
    String.raw`\bwww\.[^\s<>"]+`,
    String.raw`[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+`, // e-mail
    String.raw`\b[a-z]:\\[^\s<>"]*`, // C:\pasta\arquivo
    String.raw`\\\\[^\s<>"]+`, // \\servidor\pasta
    String.raw`(?:^|(?<=\s))(?:~|\.{1,2})?\/[^\s<>"]*\/[^\s<>"]*`, // /usr/bin, ./a/b
    String.raw`\b[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:${TLD})\b(?:\/[^\s<>"]*)?`, // exemplo.com.br/x
  ].join('|'),
  'giu',
);

/** Trechos [start, end) do texto que são endereços (URL, e-mail, caminho). */
export function internetRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(INTERNET_RE)) {
    let end = m.index + m[0].length;
    // pontuação final não faz parte do endereço ("veja www.x.com.")
    while (end > m.index && /[.,;:!?)\]}'"”’]/.test(text[end - 1]!)) end--;
    if (end > m.index) out.push([m.index, end]);
  }
  return out;
}

export function tokenize(text: string, opts: TokenizeOptions = {}): WordToken[] {
  const { ignoreUppercase = true, ignoreWithNumbers = true, ignoreInternet = true } = opts;
  const skip = ignoreInternet ? internetRanges(text) : [];
  const out: WordToken[] = [];
  let si = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    while (si < skip.length && skip[si]![1] <= start) si++;
    if (si < skip.length && skip[si]![0] < end) continue; // dentro de um endereço
    const word = m[0].replace(INVISIBLE_RE, '').replace(/’/g, "'").replace(/[\u2010\u2011]/g, '-');
    if (!word || !/\p{L}/u.test(word)) continue; // número puro
    if (ignoreWithNumbers && /\p{N}/u.test(word)) continue;
    if (ignoreUppercase && word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase()) continue;
    out.push({ word, start, end });
  }
  return out;
}
