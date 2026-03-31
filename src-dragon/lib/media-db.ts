/**
 * IndexedDB storage for media files.
 * Stores the raw File/Blob data so blob URLs can be recreated after reload.
 * No size limit — IndexedDB can handle multi-GB files.
 * Uses a simple key-value store: mediaItemId -> File blob.
 */

const DB_NAME = 'dragon-editor-media';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store a file blob in IndexedDB, keyed by media item ID */
export async function storeMediaFile(id: string, file: File | Blob, fileName: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Store as { blob, name, type } so we can reconstruct
    store.put({ blob: file, name: fileName, type: file.type }, id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // IndexedDB not available — silently fail
  }
}

/** Retrieve a file blob from IndexedDB and create a blob URL */
export async function getMediaFile(id: string): Promise<{ url: string; blob: Blob; name: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        db.close();
        const data = request.result;
        if (!data || !data.blob) { resolve(null); return; }
        const url = URL.createObjectURL(data.blob);
        resolve({ url, blob: data.blob, name: data.name });
      };
      request.onerror = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

/** Get all stored media IDs */
export async function getAllMediaIds(): Promise<string[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    return new Promise((resolve) => {
      request.onsuccess = () => { db.close(); resolve(request.result as string[]); };
      request.onerror = () => { db.close(); resolve([]); };
    });
  } catch {
    return [];
  }
}

/** Remove a file from IndexedDB */
export async function removeMediaFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    // silently fail
  }
}

/** Clear all stored media files */
export async function clearAllMediaFiles(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return new Promise((resolve) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch {
    // silently fail
  }
}
