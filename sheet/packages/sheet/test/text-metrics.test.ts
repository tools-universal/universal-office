import { describe, expect, it } from 'vitest';
import { rowDescentPx } from '../src/text-metrics.js';

describe('descent da base compartilhada da linha (altura automática)', () => {
  it('GDI nas fontes do sistema; Aptos/Segoe UI pelos valores medidos no Excel', () => {
    expect(rowDescentPx('Calibri', 11, false)).toBe(4);
    expect(rowDescentPx('Arial', 10, false)).toBe(3);
    expect(rowDescentPx('Calibri', 14, false)).toBe(5);
    expect(rowDescentPx('Times New Roman', 12, false)).toBe(4);
    // o GDI não vê a Aptos (fonte de nuvem): medido no Excel (lab e27/e28)
    expect(rowDescentPx('Aptos Narrow', 11, false)).toBe(4);
    expect(rowDescentPx('Segoe UI', 10, false)).toBe(4);
    // família desconhecida: como a Arial (mapeamento do Excel)
    expect(rowDescentPx('Fonte Inexistente', 10, false)).toBe(3);
    // altura medida no Excel, mas sem a fonte no GDI daqui (CJK): desconhecido
    expect(rowDescentPx('돋움', 10, false)).toBeUndefined();
  });
});
