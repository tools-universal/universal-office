/**
 * Interface em espanhol do <universal-document-viewer>: a tabela de textos tem
 * o espanhol com as mesmas chaves do inglês, e com lang="es" (qualquer região)
 * a barra de controles sai em espanhol. Elemento de verdade sobre o DOM falso.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { installFakeDom, type FakeDom, type FakeNode } from '../../../test-support/fake-dom.js';
import { labelsFor } from '../src/controls.js';
import type { UniversalDocumentViewerElement as Viewer } from '../src/universal-document-viewer.js';

let dom: FakeDom;
let Ctor: typeof Viewer;
const live: Viewer[] = [];

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  dom = installFakeDom();
  Ctor = (await import('../src/universal-document-viewer.js')).UniversalDocumentViewerElement;
}, 60_000);
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
afterEach(() => {
  for (const el of live.splice(0)) (el as unknown as FakeNode).remove();
  vi.clearAllTimers();
});

describe('textos em espanhol', () => {
  it('mesmas chaves do inglês, textos próprios', () => {
    const en = labelsFor('en'), es = labelsFor('es');
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(es.next).toBe('Página siguiente');
    expect(es.download).toBe('Descargar');
    expect(es.savePdf).toBe('Guardar como PDF');
    expect(es.pageOf(2, 9)).toBe('Página 2 de 9');
    expect(es.pagesOf(2, 3, 9)).toBe('Páginas 2 a 3 de 9');
  });

  it('lang="es-AR" no elemento: a barra de controles em espanhol', () => {
    const el = new Ctor();
    el.setAttribute('lang', 'es-AR');
    dom.document.body.appendChild(el as unknown as FakeNode);
    live.push(el);
    vi.advanceTimersByTime(50);
    const root = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot;
    const labels = [...root.querySelectorAll<HTMLElement>('*')].map((e) => e.getAttribute?.('aria-label')).filter(Boolean);
    expect(labels).toContain('Controles del documento');
    expect(labels).not.toContain('Document controls');
  });
});
