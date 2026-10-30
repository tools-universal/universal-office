// Ctrl+clique num hiperlink do documento: só http, https e mailto saem do
// editor, numa aba nova sem `window.opener` (tabnabbing) nem Referer (a URL da
// página do hospedeiro não vaza para o destino).

/** Esquemas que o Ctrl+clique abre fora do editor. */
export const EXTERNAL_LINK = /^(https?|mailto):/;

/** Recursos da janela nova: sem opener e sem Referer. */
export const EXTERNAL_LINK_FEATURES = 'noopener,noreferrer';

/** Abre o destino externo; falso (sem abrir) para qualquer outro esquema ou âncora interna. */
export function openExternalLink(
  url: string,
  open: (url: string, target: string, features: string) => unknown = (u, t, f) => window.open(u, t, f),
): boolean {
  if (!EXTERNAL_LINK.test(url)) return false;
  open(url, '_blank', EXTERNAL_LINK_FEATURES);
  return true;
}
