// migrateUserProgress.js

// 1. Import the Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// 2. Initialize the app with your service account credentials
// Make sure to replace 'path/to/your/serviceAccountKey.json' with the actual path
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrateUserProgress() {
  console.log('Starting user progress migration...');

  // 3. Get all documents from the original 'userProgress' collection
  const userProgressCollection = db.collection('userProgress');
  const snapshot = await userProgressCollection.get();

  if (snapshot.empty) {
    console.log('No documents found in userProgress collection. Nothing to migrate.');
    return;
  }

  // 4. Use a batched write to efficiently move documents
  let batch = db.batch();
  let writeCount = 0;
  const totalDocs = snapshot.docs.length;

  console.log(`Found ${totalDocs} documents to migrate.`);

  for (let i = 0; i < totalDocs; i++) {
    const doc = snapshot.docs[i];
    const userId = doc.id;
    const progressData = doc.data();

    // 5. Define the new location for the progress document
    const newProgressRef = db.collection('users').doc(userId).collection('userProgress').doc('progress');

    // 6. Add the write operation to the batch
    batch.set(newProgressRef, progressData);
    writeCount++;

    // Firestore batches have a 500-operation limit.
    // Commit the batch and start a new one when the limit is reached.
    if (writeCount === 499 || i === totalDocs - 1) {
      console.log(`Committing batch of ${writeCount} documents...`);
      await batch.commit();
      console.log('Batch committed successfully.');
      
      // Start a new batch for the next set of documents
      batch = db.batch();
      writeCount = 0;
    }
  }

  console.log('Migration completed successfully!');
}

migrateUserProgress().catch(console.error);
