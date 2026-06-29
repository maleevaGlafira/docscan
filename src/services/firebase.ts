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
 * If Firebase is not configured, it acts as a local fallback and alerts the user.
 */
export async function saveDocument(text: string): Promise<{ id: string; savedToCloud: boolean; timestamp: Date }> {
  const id = 'doc_' + Math.random().toString(36).substring(2, 11);
  const timestamp = new Date();
  
  const db = await getFirebaseDB();
  if (db) {
    const path = `documents/${id}`;
    try {
      await setDoc(doc(db, 'documents', id), {
        text,
        createdAt: serverTimestamp()
      });
      return { id, savedToCloud: true, timestamp };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Fallback storage when Firebase is not active
  try {
    const documents = JSON.parse(localStorage.getItem('saved_documents') || '[]');
    documents.push({ id, text, createdAt: timestamp.toISOString() });
    localStorage.setItem('saved_documents', JSON.stringify(documents));
    window.dispatchEvent(new Event('local-documents-updated'));
  } catch (e) {
    console.error('Local storage failure:', e);
  }

  return { id, savedToCloud: false, timestamp };
}

export interface SavedDocument {
  id: string;
  text: string;
  createdAt: Date;
  savedToCloud: boolean;
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
              
              docs.push({
                id: docSnap.id,
                text: data.text || '',
                createdAt: createdAtDate,
                savedToCloud: true,
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
      const formatted: SavedDocument[] = localDocs.map((d: any) => ({
        id: d.id,
        text: d.text,
        createdAt: new Date(d.createdAt),
        savedToCloud: false,
      })).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
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
