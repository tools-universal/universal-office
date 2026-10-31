// Interface em espanhol do <universal-write-diff>: com lang="es" (qualquer
// região) os textos do componente saem em espanhol. Elemento de verdade sobre o
// DOM falso do Write.
import { beforeAll, describe, expect, it } from 'vitest';
import { blankDocxPackage } from '@universal-office/docx-core';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';

let dom: FakeDom;
let Ctor: CustomElementConstructor;

beforeAll(async () => {
  dom = installFakeDom();
  await import('../src/universal-write-diff.js');
  Ctor = dom.customElements.get('universal-write-diff')!;
}, 60_000);

const settle = async (): Promise<void> => { for (let i = 0; i < 3; i++) await Promise.resolve(); };
const shadowText = (el: HTMLElement): string => (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot.textContent ?? '';

describe('lang="es"', () => {
  it('sem comparação: o aviso em espanhol', async () => {
    const el = new Ctor() as HTMLElement;
    el.setAttribute('lang', 'es-419');
    dom.document.body.appendChild(el as unknown as FakeNode);
    await settle();
    expect(shadowText(el)).toContain('No hay ninguna comparación cargada');
    (el as unknown as FakeNode).remove();
  });

  it('documentos iguais: cabeçalhos e estado em espanhol', async () => {
    const el = new Ctor() as HTMLElement & { loadPair(a: Uint8Array, b: Uint8Array): void };
    el.setAttribute('lang', 'es');
    dom.document.body.appendChild(el as unknown as FakeNode);
    const bytes = blankDocxPackage().save();
    el.loadPair(bytes, bytes);
    await settle();
    const t = shadowText(el);
    expect(t).toContain('Revisado');
    expect(t).toContain('Documentos idénticos');
    expect(t).toContain('Solo los cambios');
    (el as unknown as FakeNode).remove();
  });
});
