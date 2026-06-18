// Efeito ripple Material via @universal-material/web. Importar este módulo
// registra o custom element <u-ripple>; appendá-lo a um elemento clicável
// (que precisa ser position:relative — ver regra `:has(> u-ripple)` no CSS)
// sobrepõe a camada de estado (hover) + a onda de clique, usando currentColor.
import '@universal-material/web/ripple/ripple.js';

/** Adiciona um <u-ripple> ao elemento (idempotente). */
export function attachRipple(el: Element): void {
  if (el.querySelector(':scope > u-ripple')) return;
  el.appendChild(document.createElement('u-ripple'));
}

/** Aplica ripple a todos os clicáveis que casarem com o seletor. */
export function rippleAll(root: ParentNode, selector: string): void {
  root.querySelectorAll(selector).forEach(attachRipple);
}
