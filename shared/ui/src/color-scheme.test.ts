import { describe, expect, it } from 'vitest';
import { schemeFromColorScheme, schemeFromProbeColor, themeMode } from './color-scheme.js';

describe('schemeFromProbeColor (sonda light-dark(rgb(0,0,1), rgb(0,0,2)))', () => {
  it('lê o azul 1 como claro e 2 como escuro, com ou sem espaços / rgba', () => {
    expect(schemeFromProbeColor('rgb(0, 0, 1)')).toBe('light');
    expect(schemeFromProbeColor('rgb(0, 0, 2)')).toBe('dark');
    expect(schemeFromProbeColor('rgba(0,0,2,1)')).toBe('dark');
  });

  it('meio de transição vai para o lado mais perto; outra cor = sem suporte (null)', () => {
    expect(schemeFromProbeColor('rgb(0, 0, 1.2)')).toBe('light');
    expect(schemeFromProbeColor('rgb(0, 0, 1.8)')).toBe('dark');
    expect(schemeFromProbeColor('rgb(0, 0, 0)')).toBeNull();
    expect(schemeFromProbeColor('rgb(27, 27, 31)')).toBeNull();
    expect(schemeFromProbeColor('')).toBeNull();
    expect(schemeFromProbeColor(undefined)).toBeNull();
  });
});

describe('schemeFromColorScheme (recuo pelo color-scheme computado)', () => {
  it('normal/vazio/light = claro; dark = escuro; light dark = o SO', () => {
    expect(schemeFromColorScheme('normal', true)).toBe('light');
    expect(schemeFromColorScheme('', true)).toBe('light');
    expect(schemeFromColorScheme('light', true)).toBe('light');
    expect(schemeFromColorScheme('dark', false)).toBe('dark');
    expect(schemeFromColorScheme('only dark', false)).toBe('dark');
    expect(schemeFromColorScheme('light dark', false)).toBe('light');
    expect(schemeFromColorScheme('light dark', true)).toBe('dark');
    expect(schemeFromColorScheme('dark light', true)).toBe('dark');
  });
});

describe('themeMode (atributo theme)', () => {
  it('light/dark forçam; o resto (ausente, auto, desconhecido) herda', () => {
    expect(themeMode('light')).toBe('light');
    expect(themeMode('dark')).toBe('dark');
    expect(themeMode('auto')).toBe('auto');
    expect(themeMode(null)).toBe('auto');
    expect(themeMode('sepia')).toBe('auto');
  });
});
