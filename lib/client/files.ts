'use client';

/** Local file vault (IndexedDB) so documents can be re-packed into a ZIP later. */

const DB_NAME = 'mra-files';
const STORE = 'docs';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function putFile(id: string, blob: Blob): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

export async function getFile(id: string): Promise<Blob | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => resolve(null);
  });
}

export async function removeFile(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
