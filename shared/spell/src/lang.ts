/**
 * Idioma → dicionário. O hospedeiro passa a etiqueta BCP 47 do texto (no Write,
 * o w:lang do run; "pt-BR", "en-US", "en-GB", "pt"…).
 *
 * Regra: casa a etiqueta exata (sem diferenciar maiúsculas, "_" = "-"); senão a
 * língua-base escolhe o dicionário da mesma língua (en-GB → en-US, pt-PT →
 * pt-BR) e `exact` sai false — o hospedeiro decide se revisa assim. Sem
 * dicionário da língua (ou "zxx"/"x-none": sem revisão) → undefined.
 */
import { PUBLISHED_DICTIONARIES } from './sources.js';

export interface ResolvedLanguage {
  /** id do dicionário ("pt-BR", "en-US" ou um registrado pelo hospedeiro) */
  id: string;
  /** a etiqueta casou o dicionário (false = mesma língua, outra variante) */
  exact: boolean;
}

const norm = (s: string) => s.trim().replace(/_/g, '-').toLowerCase();

export function resolveLanguage(lang: string | undefined | null, available: readonly string[] = PUBLISHED_DICTIONARIES): ResolvedLanguage | undefined {
  if (!lang) return undefined;
  const tag = norm(lang);
  if (!tag || tag === 'zxx' || tag === 'x-none' || tag === 'und') return undefined;
  const exact = available.find((id) => norm(id) === tag);
  if (exact) return { id: exact, exact: true };
  const base = tag.split('-')[0];
  // a variante "principal" da língua primeiro (ordem de `available`)
  const same = available.find((id) => norm(id).split('-')[0] === base);
  return same ? { id: same, exact: false } : undefined;
}
