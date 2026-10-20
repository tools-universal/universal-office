// Preferências das barras. As de INTERFACE (barra compacta × ribbon, tema,
// destaque, comentários, salvamento automático) são POR INSTÂNCIA: só gravam
// quando o elemento tem `storage-key` (ou `id`) — sem chave, valem só na
// sessão, para uma página não impor a escolha a outra da mesma origem. Os
// Documentos Confiáveis são da origem por natureza (como no Word, por máquina).

const ls = {
  get: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* privado */ } },
};

export const originStore = ls;

export interface InstanceStore {
  get(name: string): string | null;
  set(name: string, v: string): void;
}

export function instanceStore(el: Element): InstanceStore {
  const key = (): string | null => el.getAttribute('storage-key') || el.id || null;
  return {
    get: (name) => { const k = key(); return k ? ls.get(`uw:${k}:${name}`) : null; },
    set: (name, v) => { const k = key(); if (k) ls.set(`uw:${k}:${name}`, v); },
  };
}
