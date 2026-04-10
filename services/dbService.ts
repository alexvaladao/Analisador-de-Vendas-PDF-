import { AnalysisRecord, AnalysisResult } from "../types";

const DB_NAME = 'SalesAnalyzerDB';
const DB_VERSION = 1;
const STORE_NAME = 'analyses';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const saveAnalysis = async (fileName: string, fileSize: number, data: AnalysisResult): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const record: AnalysisRecord = {
      timestamp: Date.now(),
      fileName,
      fileSize,
      data
    };

    const request = store.add(record);

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result as number);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};

export const getHistory = async (): Promise<AnalysisRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Most recent first

    const results: AnalysisRecord[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};

export const findExistingAnalysis = async (fileName: string, fileSize: number): Promise<AnalysisRecord | undefined> => {
  // Como o IndexedDB não tem consultas complexas nativas fáceis sem índices compostos,
  // e o histórico tende a ser pequeno, pegamos o histórico e filtramos.
  try {
    const allRecords = await getHistory();
    // Procura por nome exato e tamanho exato (ou se o tamanho for undefined no registro antigo, ignora checagem de tamanho)
    return allRecords.find(r => 
      r.fileName === fileName && (r.fileSize === undefined || r.fileSize === fileSize)
    );
  } catch (e) {
    console.error("Erro ao buscar duplicatas", e);
    return undefined;
  }
};

export const deleteAnalysis = async (id: number): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
};