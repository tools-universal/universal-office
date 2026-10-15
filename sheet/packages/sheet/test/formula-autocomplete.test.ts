import { describe, expect, it } from 'vitest';
import { callAt, functionTokenAt, matchFunctions } from '../src/formula-autocomplete.js';

describe('autocompletar de funções', () => {
  it('nome sendo digitado no cursor', () => {
    expect(functionTokenAt('=SO', 3)).toEqual({ start: 1, prefix: 'SO' });
    expect(functionTokenAt('=A1+pro', 7)).toEqual({ start: 4, prefix: 'pro' });
    expect(functionTokenAt('=SOMA(A1;se', 11)).toEqual({ start: 9, prefix: 'se' });
    expect(functionTokenAt('SO', 2)).toBeNull(); // não é fórmula
    expect(functionTokenAt('="SO', 4)).toBeNull(); // dentro de texto
    expect(functionTokenAt('=Plan1!A', 8)).toBeNull(); // referência de aba
    expect(functionTokenAt('=1E', 3)).toBeNull();
    expect(functionTokenAt('=SOMA', 3)).toBeNull(); // cursor no meio do nome
  });
  it('lista no idioma, sem diferenciar caixa nem acento', () => {
    expect(matchFunctions('som', 'pt-BR').slice(0, 2).map((f) => f.name)).toEqual(['SOMA', 'SOMAQUAD']);
    expect(matchFunctions('maxi', 'pt-BR').map((f) => f.name)).toContain('MÁXIMO');
    expect(matchFunctions('sum', 'en-US')[0]?.name).toBe('SUM');
    expect(matchFunctions('A1', 'pt-BR')).toEqual([]);
  });
  it('função cujos parênteses envolvem o cursor', () => {
    expect(callAt('=SOMA(A1;', 9)).toBe('SOMA');
    expect(callAt('=SE(A1>0;SOMA(B1);', 18)).toBe('SE');
    expect(callAt('=SE(A1>0;SOMA(B1', 16)).toBe('SOMA');
    expect(callAt('=(A1+', 5)).toBeNull();
    expect(callAt('=SOMA(")"', 9)).toBe('SOMA');
  });
});
