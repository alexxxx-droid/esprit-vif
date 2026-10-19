import { deleteDB, openDB, type DBSchema } from 'idb';

/**
 * Petite couche d'abstraction au-dessus du stockage local : le reste de l'appli
 * ne parle qu'à cette interface, qu'elle soit servie par IndexedDB ou par la mémoire.
 */
export type Collection = 'plays' | 'tests';

export interface StoredData {
  plays: unknown[];
  tests: unknown[];
  kv: Record<string, unknown>;
}

export interface Storage {
  /** Vrai si les données survivent à la fermeture de l'appli. */
  readonly persistent: boolean;
  readAll(): Promise<StoredData>;
  put(collection: Collection, value: { id: string }): Promise<void>;
  remove(collection: Collection, id: string): Promise<void>;
  setKv(key: string, value: unknown): Promise<void>;
  /** Remplace tout le contenu (import d'une sauvegarde, remise à zéro). */
  replaceAll(data: StoredData): Promise<void>;
}

interface EspritVifDB extends DBSchema {
  plays: { key: string; value: { id: string } };
  tests: { key: string; value: { id: string } };
  kv: { key: string; value: unknown };
}

const DB_NAME = 'esprit-vif';
const DB_VERSION = 1;

export async function openIndexedDbStorage(name = DB_NAME): Promise<Storage> {
  const db = await openDB<EspritVifDB>(name, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('plays', { keyPath: 'id' });
      database.createObjectStore('tests', { keyPath: 'id' });
      database.createObjectStore('kv');
    },
  });

  return {
    persistent: true,
    async readAll() {
      const tx = db.transaction(['plays', 'tests', 'kv'], 'readonly');
      const kvStore = tx.objectStore('kv');
      const [plays, tests, keys, values] = await Promise.all([
        tx.objectStore('plays').getAll(),
        tx.objectStore('tests').getAll(),
        kvStore.getAllKeys(),
        kvStore.getAll(),
      ]);
      await tx.done;
      return { plays, tests, kv: Object.fromEntries(keys.map((k, i) => [k, values[i]])) };
    },
    async put(collection, value) {
      await db.put(collection, value);
    },
    async remove(collection, id) {
      await db.delete(collection, id);
    },
    async setKv(key, value) {
      await db.put('kv', value, key);
    },
    async replaceAll(data) {
      const tx = db.transaction(['plays', 'tests', 'kv'], 'readwrite');
      const plays = tx.objectStore('plays');
      const tests = tx.objectStore('tests');
      const kv = tx.objectStore('kv');
      await Promise.all([plays.clear(), tests.clear(), kv.clear()]);
      await Promise.all([
        ...data.plays.map((p) => plays.put(p as { id: string })),
        ...data.tests.map((t) => tests.put(t as { id: string })),
        ...Object.entries(data.kv).map(([k, v]) => kv.put(v, k)),
      ]);
      await tx.done;
    },
  };
}

/** Supprime une base IndexedDB (profil effacé). */
export async function deleteIndexedDb(name: string): Promise<void> {
  await deleteDB(name);
}

/** Stockage volatil : pour les tests, ou en secours si IndexedDB est indisponible. */
export function createMemoryStorage(initial?: StoredData): Storage {
  const plays = new Map<string, unknown>();
  const tests = new Map<string, unknown>();
  const kv = new Map<string, unknown>();
  const collections = { plays, tests };

  const load = (data: StoredData) => {
    plays.clear();
    tests.clear();
    kv.clear();
    for (const p of data.plays) plays.set((p as { id: string }).id, structuredClone(p));
    for (const t of data.tests) tests.set((t as { id: string }).id, structuredClone(t));
    for (const [k, v] of Object.entries(data.kv)) kv.set(k, structuredClone(v));
  };
  if (initial) load(initial);

  return {
    persistent: false,
    async readAll() {
      return structuredClone({
        plays: [...plays.values()],
        tests: [...tests.values()],
        kv: Object.fromEntries(kv),
      });
    },
    async put(collection, value) {
      collections[collection].set(value.id, structuredClone(value));
    },
    async remove(collection, id) {
      collections[collection].delete(id);
    },
    async setKv(key, value) {
      kv.set(key, structuredClone(value));
    },
    async replaceAll(data) {
      load(data);
    },
  };
}
