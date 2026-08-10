import { Character } from '@/types/game';

const DB_NAME = 'gdd_offline_db';
const DB_VERSION = 1;

export interface PendingSyncItem {
  charId: string;
  updates: Partial<Character>;
  timestamp: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste ambiente.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'charId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalCharacter(character: Character): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readwrite');
      const store = tx.objectStore('characters');
      const req = store.put(character);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao salvar personagem no IndexedDB:', err);
    return false;
  }
}

export async function getLocalCharacter(id: string): Promise<Character | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readonly');
      const store = tx.objectStore('characters');
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as Character) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao buscar personagem no IndexedDB:', err);
    return null;
  }
}

export async function getAllLocalCharacters(): Promise<Character[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('characters', 'readonly');
      const store = tx.objectStore('characters');
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Character[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao listar personagens locais no IndexedDB:', err);
    return [];
  }
}

export async function queuePendingSync(charId: string, updates: Partial<Character>): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const syncItem: PendingSyncItem = {
        charId,
        updates,
        timestamp: Date.now(),
      };
      const req = store.put(syncItem);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao enfileirar sincronização no IndexedDB:', err);
    return false;
  }
}

export async function getPendingSyncs(): Promise<PendingSyncItem[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PendingSyncItem[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao buscar fila de sincronização no IndexedDB:', err);
    return [];
  }
}

export async function clearPendingSync(charId: string): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.delete(charId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Erro ao limpar sincronização pendente no IndexedDB:', err);
    return false;
  }
}
