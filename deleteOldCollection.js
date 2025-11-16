// deleteOldCollection.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize the app with your service account credentials
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

/**
 * Deletes all documents in a collection in batches.
 * @param {FirebaseFirestore.CollectionReference} collectionRef The collection to delete.
 * @param {number} batchSize The number of documents to delete in each batch.
 */
async function deleteCollection(collectionRef, batchSize) {
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

/**
 * Recursively deletes documents found in a query batch.
 * @param {FirebaseFirestore.Query} query The query for documents to delete.
 * @param {Function} resolve The promise resolve function.
 */
async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done.
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function runDeletion() {
  const collectionToDelete = 'userProgress';
  console.log(`Starting deletion of all documents in the '${collectionToDelete}' collection...`);
  const collectionRef = db.collection(collectionToDelete);
  await deleteCollection(collectionRef, 500); // Using a batch size of 500
  console.log(`Successfully deleted all documents from '${collectionToDelete}'.`);
}

runDeletion().catch(console.error);