// Faixa de aviso das barras (compacta e ribbon): entre a linha de título/menus e
// as ferramentas, como os avisos de armazenamento do Google Docs/Drive.
import type { BarNoticeTone } from './types.js';

/** Faixa de aviso das barras (ver {@link BarHandle.setNotice}): oculta até receber conteúdo. */
export function createNoticeRegion(): { el: HTMLElement; set: (content: HTMLElement | null, tone?: BarNoticeTone) => void } {
  const el = document.createElement('div');
  el.className = 'uo-notice';
  el.setAttribute('part', 'notice');
  el.setAttribute('role', 'status');
  el.hidden = true;
  return {
    el,
    set: (content, tone = 'info') => {
      if (content) el.replaceChildren(content);
      else el.replaceChildren();
      el.dataset['tone'] = tone;
      el.hidden = !content;
    },
  };
}
