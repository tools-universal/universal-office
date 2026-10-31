// Nomes em espanhol dos estilos internos (interface do Write com lang="es"):
// todo estilo de parágrafo/caractere e todo estilo de tabela interno tem nome
// em espanhol — um estilo novo na tabela do oráculo sem espanhol falha aqui.
import { describe, expect, it } from 'vitest';
import { builtinDisplayName, builtinStyles, loadBuiltinTableStyles, tableStyleNameEs, WATERMARK_GALLERY, WATERMARK_TEXTS } from '../src/index.js';
import { BUILTIN_STYLE_NAMES_ES } from '../src/style-names-es.js';

describe('estilos internos em espanhol', () => {
  it('todo estilo de parágrafo/caractere interno tem nome em espanhol', () => {
    const missing = builtinStyles().map((b) => b.name).filter((n) => !BUILTIN_STYLE_NAMES_ES[n.toLowerCase()]);
    expect(missing).toEqual([]);
    expect(builtinDisplayName('heading 1', 'es')).toBe('Título 1');
    expect(builtinDisplayName('No Spacing', 'es')).toBe('Sin espaciado');
    expect(builtinDisplayName('toc 2', 'es')).toBe('TDC 2');
    expect(builtinDisplayName('Normal Table', 'es')).toBe('Tabla normal');
    expect(builtinDisplayName('meu estilo', 'es')).toBeUndefined();
  });

  it('todo estilo de tabela interno tem nome em espanhol', async () => {
    const all = await loadBuiltinTableStyles();
    expect(all.filter((s) => !tableStyleNameEs(s.name)).map((s) => s.name)).toEqual([]);
    expect(tableStyleNameEs('Grid Table 4 Accent 1')).toBe('Tabla de cuadrícula 4 - Énfasis 1');
    expect(tableStyleNameEs('Grid Table 1 Light')).toBe('Tabla de cuadrícula 1 clara');
    expect(tableStyleNameEs('List Table 6 Colorful Accent 2')).toBe('Tabla de lista 6 con colores - Énfasis 2');
    expect(tableStyleNameEs('Table Grid')).toBe('Tabla con cuadrícula');
    expect(tableStyleNameEs('Medium Shading 1 Accent 3')).toBe('Sombreado medio 1 - Énfasis 3');
  });

  it('marcas-d\'água: textos e galeria em espanhol', () => {
    expect(WATERMARK_TEXTS.es).toContain('BORRADOR');
    for (const g of WATERMARK_GALLERY) {
      expect(g.text.es).toBeTruthy();
      expect(g.box.es[0]).toBeGreaterThan(0);
    }
    // mesmo número de letras do pt-BR: a caixa medida do próprio bloco
    const urgent = WATERMARK_GALLERY.find((g) => g.id === 'urgent1')!;
    expect(urgent.box.es).toEqual(urgent.box.pt);
  });
});
