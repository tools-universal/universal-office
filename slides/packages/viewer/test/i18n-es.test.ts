// Interface em espanhol do <universal-slides-viewer>: com lang="es"
// (qualquer região) a barra de controles e os textos acessíveis saem em
// espanhol. Elemento de verdade sobre o DOM falso do Write.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../../write/test-support/fake-dom.js';

let dom: FakeDom;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  await import('../src/universal-slides-viewer.js');
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const ariaLabels = (el: HTMLElement): string[] =>
  [...(el as unknown as { shadowRoot: ShadowRoot }).shadowRoot.querySelectorAll<HTMLElement>('*')].map((e) => e.getAttribute?.('aria-label') ?? '').filter(Boolean);

describe('lang="es"', () => {
  it('barra de controles em espanhol; lang="en" volta ao inglês', () => {
    const Ctor = dom.customElements.get('universal-slides-viewer')!;
    const el = new Ctor() as HTMLElement;
    el.setAttribute('lang', 'es-MX');
    dom.document.body.appendChild(el as unknown as FakeNode);
    vi.advanceTimersByTime(50);
    expect(ariaLabels(el)).toContain('Controles de la presentación');
    el.setAttribute('lang', 'en');
    vi.advanceTimersByTime(50);
    expect(ariaLabels(el)).toContain('Presentation controls');
    (el as unknown as FakeNode).remove();
  });
});
