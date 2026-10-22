import { describe, expect, it } from 'vitest';
import { caseMapped } from './text-case.js';

// Maiúsculas e Minúsculas como o Word (oráculo home-lab exp-font.ps1, memória word-home-font-facts)
const T = 'o rio de janeiro. a cidade MARAVILHOSA tem praias! E o Sol? ja nasceu; 3o lugar. fim';

describe('Maiúsculas e Minúsculas (Range.Case do Word)', () => {
  it('Primeira letra da frase: depois de . ! ? (não de ;), o resto minúsculo', () => {
    expect(caseMapped(T, 'sentence')).toBe('O rio de janeiro. A cidade maravilhosa tem praias! E o sol? Ja nasceu; 3o lugar. Fim');
  });
  it('Colocar Cada Palavra em Maiúscula: dígito no começo fica', () => {
    expect(caseMapped(T, 'title')).toBe('O Rio De Janeiro. A Cidade Maravilhosa Tem Praias! E O Sol? Ja Nasceu; 3o Lugar. Fim');
  });
  it('aLTERNAR', () => {
    expect(caseMapped(T, 'toggle')).toBe('O RIO DE JANEIRO. A CIDADE maravilhosa TEM PRAIAS! e O sOL? JA NASCEU; 3O LUGAR. FIM');
  });
  it('o comprimento não muda (ß fica)', () => {
    expect(caseMapped('straße', 'upper')).toBe('STRAßE');
  });
});
