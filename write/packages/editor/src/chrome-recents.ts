// Arquivos recentes via File System Access: os FileSystemFileHandle vão para o
// IndexedDB (o localStorage não guarda handles); reabrir pede de novo a
// permissão de leitura ao navegador. Sem a API (Firefox, Safari) a lista fica vazia.

export interface RecentFile { name: string; handle: FileSystemFileHandle; time: number }

const DB = 'universal-write', STORE = 'recents', MAX = 8;

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'name' }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { d.close(); resolve(req.result); };
    t.onerror = () => { d.close(); reject(t.error); };
  }));
}

export const recentsSupported = (): boolean =>
  typeof indexedDB !== 'undefined' && typeof window !== 'undefined' && 'showOpenFilePicker' in window;

export async function listRecents(): Promise<RecentFile[]> {
  if (!recentsSupported()) return [];
  try {
    const all = await tx<RecentFile[]>('readonly', (s) => s.getAll() as IDBRequest<RecentFile[]>);
    return all.sort((a, b) => b.time - a.time).slice(0, MAX);
  } catch { return []; }
}

export async function rememberRecent(handle: FileSystemFileHandle): Promise<RecentFile[]> {
  if (!recentsSupported()) return [];
  try {
    await tx('readwrite', (s) => s.put({ name: handle.name, handle, time: Date.now() }));
    const all = await listRecents();
    // poda o que passou do limite
    const keep = new Set(all.map((r) => r.name));
    const every = await tx<RecentFile[]>('readonly', (s) => s.getAll() as IDBRequest<RecentFile[]>);
    for (const r of every) if (!keep.has(r.name)) await tx('readwrite', (s) => s.delete(r.name));
    return all;
  } catch { return []; }
}

export async function forgetRecent(name: string): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(name)); } catch { /* sem IDB */ }
}

/** Permissão de leitura (pede ao usuário se preciso — exige gesto). */
export async function ensureReadable(h: FileSystemFileHandle): Promise<boolean> {
  const p = h as FileSystemFileHandle & {
    queryPermission?: (o: object) => Promise<PermissionState>;
    requestPermission?: (o: object) => Promise<PermissionState>;
  };
  if (!p.queryPermission) return true;
  if ((await p.queryPermission({ mode: 'read' })) === 'granted') return true;
  return (await p.requestPermission?.({ mode: 'read' })) === 'granted';
}
