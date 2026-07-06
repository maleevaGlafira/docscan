import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, serverTimestamp, 
  collection, query, orderBy, getDocs, onSnapshot, limit, Timestamp 
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let dbInstance: any = null;
let isConfigured = false;

export async function getFirebaseDB() {
  if (dbInstance) return dbInstance;

  try {
    // Dynamic import to allow compiling even if the user hasn't run set_up_firebase yet
    // @ts-ignore
    const config = await import('../../firebase-applet-config.json');
    const configData = config.default || config;
    
    if (configData && configData.apiKey) {
      const app = getApps().length === 0 ? initializeApp(configData) : getApp();
      dbInstance = getFirestore(app, configData.firestoreDatabaseId);
      isConfigured = true;
      return dbInstance;
    }
  } catch (error) {
    // Fallback: Firebase is not configured yet
    console.debug('Firebase config not found or invalid. Using local save mode.');
  }
  return null;
}

export function isFirebaseConfigured() {
  return isConfigured;
}

/**
 * Saves recognized text to Firebase Firestore.
 * If Firebase is not configured, it acts as a local fallback.
 */
export async function saveDocument(
  text: string, 
  status: 'Написано' | 'Отсканировано' | 'Исправлено' | 'Отослано' | 'Выполнено' = 'Отсканировано',
  fileModifiedAt?: Date | null,
  scannedAt?: Date | null
): Promise<{ id: string; savedToCloud: boolean; timestamp: Date }> {
  const id = 'doc_' + Math.random().toString(36).substring(2, 11);
  const timestamp = new Date();
  
  const db = await getFirebaseDB();
  if (db) {
    const path = `documents/${id}`;
    try {
      await setDoc(doc(db, 'documents', id), {
        text,
        status,
        createdAt: serverTimestamp(),
        statusUpdatedAt: serverTimestamp(),
        fileModifiedAt: fileModifiedAt || null,
        scannedAt: scannedAt || null
      });
      return { id, savedToCloud: true, timestamp };
    } catch (error) {
      console.error('Failed to save to Firestore, falling back to local storage:', error);
      // We don't throw; we fall back to local storage so the user doesn't lose their data
    }
  }

  // Fallback storage when Firebase is not active or failed
  try {
    const documents = JSON.parse(localStorage.getItem('saved_documents') || '[]');
    documents.push({ 
      id, 
      text, 
      status,
      createdAt: timestamp.toISOString(),
      statusUpdatedAt: timestamp.toISOString(),
      fileModifiedAt: fileModifiedAt ? fileModifiedAt.toISOString() : null,
      scannedAt: scannedAt ? scannedAt.toISOString() : null
    });
    localStorage.setItem('saved_documents', JSON.stringify(documents));
    window.dispatchEvent(new Event('local-documents-updated'));
  } catch (e) {
    console.error('Local storage failure:', e);
  }

  return { id, savedToCloud: false, timestamp };
}

/**
 * Updates a document's fields (text, status, etc.) in Firebase or local storage.
 */
export async function updateDocument(
  id: string,
  fields: Partial<{
    text: string;
    status: 'Написано' | 'Отсканировано' | 'Исправлено' | 'Отослано' | 'Выполнено';
    fileModifiedAt?: Date | null;
    scannedAt?: Date | null;
  }>
): Promise<boolean> {
  const db = await getFirebaseDB();
  const timestamp = new Date();

  if (db) {
    const path = `documents/${id}`;
    try {
      await setDoc(doc(db, 'documents', id), {
        ...fields,
        statusUpdatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Failed to update document in Firestore, falling back to local storage:', error);
      // Fall through to local storage
    }
  }

  // Fallback storage when Firebase is not active or failed
  try {
    const documents = JSON.parse(localStorage.getItem('saved_documents') || '[]');
    const index = documents.findIndex((d: any) => d.id === id);
    if (index !== -1) {
      const localFields: any = { ...fields };
      if (fields.fileModifiedAt) {
        localFields.fileModifiedAt = fields.fileModifiedAt.toISOString();
      }
      if (fields.scannedAt) {
        localFields.scannedAt = fields.scannedAt.toISOString();
      }
      documents[index] = {
        ...documents[index],
        ...localFields,
        statusUpdatedAt: timestamp.toISOString()
      };
      localStorage.setItem('saved_documents', JSON.stringify(documents));
      window.dispatchEvent(new Event('local-documents-updated'));
      return true;
    }
  } catch (e) {
    console.error('Local storage update failure:', e);
  }
  return false;
}

/**
 * Deletes a document from Firebase or local storage.
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const db = await getFirebaseDB();
  if (db) {
    const path = `documents/${id}`;
    try {
      // Dynamic import to avoid build errors if firebase/firestore is tree-shaken differently
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'documents', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Fallback storage when Firebase is not active
  try {
    const documents = JSON.parse(localStorage.getItem('saved_documents') || '[]');
    const filtered = documents.filter((d: any) => d.id !== id);
    localStorage.setItem('saved_documents', JSON.stringify(filtered));
    window.dispatchEvent(new Event('local-documents-updated'));
    return true;
  } catch (e) {
    console.error('Local storage delete failure:', e);
  }
  return false;
}

export interface SavedDocument {
  id: string;
  text: string;
  status: 'Написано' | 'Отсканировано' | 'Исправлено' | 'Отослано' | 'Выполнено';
  statusUpdatedAt: Date;
  createdAt: Date;
  savedToCloud: boolean;
  fileModifiedAt?: Date | null;
  scannedAt?: Date | null;
}

/**
 * Subscribes to the list of saved documents from Firestore (or falls back to localStorage).
 */
export function subscribeToSavedDocuments(
  callback: (docs: SavedDocument[]) => void,
  limitCount: number = 30
): () => void {
  let unsubscribeSnap = () => {};
  let isUnsubscribed = false;
  let localUnsubscribe = () => {};

  getFirebaseDB().then((db) => {
    if (isUnsubscribed) return;

    if (db) {
      const path = 'documents';
      try {
        const q = query(
          collection(db, 'documents'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        unsubscribeSnap = onSnapshot(
          q,
          (snapshot) => {
            const docs: SavedDocument[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              
              let createdAtDate = new Date();
              if (data.createdAt instanceof Timestamp) {
                createdAtDate = data.createdAt.toDate();
              } else if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                createdAtDate = data.createdAt.toDate();
              } else if (data.createdAt) {
                createdAtDate = new Date(data.createdAt);
              }

              let statusUpdatedAtDate = createdAtDate;
              if (data.statusUpdatedAt instanceof Timestamp) {
                statusUpdatedAtDate = data.statusUpdatedAt.toDate();
              } else if (data.statusUpdatedAt && typeof data.statusUpdatedAt.toDate === 'function') {
                statusUpdatedAtDate = data.statusUpdatedAt.toDate();
              } else if (data.statusUpdatedAt) {
                statusUpdatedAtDate = new Date(data.statusUpdatedAt);
              }

              let fileModifiedAtDate: Date | null = null;
              if (data.fileModifiedAt) {
                if (data.fileModifiedAt instanceof Timestamp) {
                  fileModifiedAtDate = data.fileModifiedAt.toDate();
                } else if (typeof data.fileModifiedAt.toDate === 'function') {
                  fileModifiedAtDate = data.fileModifiedAt.toDate();
                } else {
                  fileModifiedAtDate = new Date(data.fileModifiedAt);
                }
              }

              let scannedAtDate: Date | null = null;
              if (data.scannedAt) {
                if (data.scannedAt instanceof Timestamp) {
                  scannedAtDate = data.scannedAt.toDate();
                } else if (typeof data.scannedAt.toDate === 'function') {
                  scannedAtDate = data.scannedAt.toDate();
                } else {
                  scannedAtDate = new Date(data.scannedAt);
                }
              }
              
              docs.push({
                id: docSnap.id,
                text: data.text || '',
                status: data.status || 'Отсканировано',
                statusUpdatedAt: statusUpdatedAtDate,
                createdAt: createdAtDate,
                savedToCloud: true,
                fileModifiedAt: fileModifiedAtDate,
                scannedAt: scannedAtDate,
              });
            });
            callback(docs);
          },
          (error) => {
            console.error('onSnapshot failed, using fallback:', error);
            // Fallback immediately if rules check fails or other issue happens
            localUnsubscribe = fallbackLocalSubscription(callback);
          }
        );
      } catch (err) {
        console.error('Failed to set up Firestore sub, falling back to local storage:', err);
        localUnsubscribe = fallbackLocalSubscription(callback);
      }
    } else {
      localUnsubscribe = fallbackLocalSubscription(callback);
    }
  });

  return () => {
    isUnsubscribed = true;
    unsubscribeSnap();
    localUnsubscribe();
  };
}

function fallbackLocalSubscription(callback: (docs: SavedDocument[]) => void): () => void {
  try {
    const readLocal = () => {
      const localDocs = JSON.parse(localStorage.getItem('saved_documents') || '[]');
      const formatted: SavedDocument[] = localDocs.map((d: any) => {
        const createdAt = new Date(d.createdAt || d.timestamp || new Date());
        return {
          id: d.id,
          text: d.text,
          status: d.status || 'Отсканировано',
          statusUpdatedAt: d.statusUpdatedAt ? new Date(d.statusUpdatedAt) : createdAt,
          createdAt,
          savedToCloud: false,
          fileModifiedAt: d.fileModifiedAt ? new Date(d.fileModifiedAt) : null,
          scannedAt: d.scannedAt ? new Date(d.scannedAt) : null
        };
      }).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(formatted);
    };
    
    readLocal();
    window.addEventListener('storage', readLocal);
    window.addEventListener('local-documents-updated', readLocal);
    
    return () => {
      window.removeEventListener('storage', readLocal);
      window.removeEventListener('local-documents-updated', readLocal);
    };
  } catch (e) {
    console.error('Error reading local storage:', e);
    callback([]);
    return () => {};
  }
}
