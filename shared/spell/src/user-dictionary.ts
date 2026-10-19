/**
 * Dicionário do usuário ("Adicionar ao dicionário"): uma lista de palavras, a
 * mesma para todos os idiomas (como o CUSTOM.DIC do Word). Quem guarda é o
 * hospedeiro (o shell Electron grava em disco; a página, no localStorage).
 */
export interface UserDictionaryStore {
  load(): string[] | Promise<string[]>;
  save(words: string[]): void | Promise<void>;
}

/** Guarda no localStorage (padrão no navegador). Sem localStorage → só memória. */
export function localStorageStore(key = 'universal-office.spell.user-words'): UserDictionaryStore {
  const mem = memoryStore();
  const ls = (): Storage | undefined => {
    try { return globalThis.localStorage ?? undefined; } catch { return undefined; } // iframe sem permissão lança
  };
  return {
    load() {
      const s = ls();
      if (!s) return mem.load();
      try {
        const v = JSON.parse(s.getItem(key) ?? '[]');
        return Array.isArray(v) ? v.filter((w): w is string => typeof w === 'string') : [];
      } catch { return []; }
    },
    save(words) {
      const s = ls();
      if (!s) return mem.save(words);
      try { s.setItem(key, JSON.stringify(words)); } catch { /* cota cheia: fica na sessão */ }
    },
  };
}

/** Só na memória (testes, hospedeiro que não quer persistir). */
export function memoryStore(initial: string[] = []): UserDictionaryStore {
  let words = [...initial];
  return { load: () => [...words], save: (w) => { words = [...w]; } };
}
