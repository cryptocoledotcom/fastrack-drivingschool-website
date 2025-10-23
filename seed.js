const admin = require('firebase-admin');

// Replace with your service account key file and database URL
const serviceAccount = require('./fastrack-drivingschool-website-firebase-adminsdk-prc97-732953591a.json');
const databaseURL = 'https://fastrack-drivingschool-website.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();

async function deleteCollection(db, collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

const modulesData = {
    "intro-admin": {
        "title": "Introduction and Program Administration",
        "durationMinutes": 30,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-intro-admin"]
    },
    "unit-1": {
        "title": "Unit 1 – The System and You",
        "durationMinutes": 60,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-1-lesson-a",
            "unit-1-lesson-b",
            "unit-1-lesson-c",
            "unit-1-lesson-d"
        ]
    },
    "unit-2": {
        "title": "Unit 2 – Vehicle Familiarization",
        "durationMinutes": 60,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-2-lesson-a",
            "unit-2-lesson-b",
            "unit-2-lesson-c",
            "unit-2-lesson-d",
            "unit-2-lesson-e",
            "unit-2-lesson-f",
            "unit-2-lesson-g"
        ]
    },
    "unit-3": {
        "title": "Unit 3 – Basic Control Tasks",
        "durationMinutes": 210,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-3-lesson-a",
            "unit-3-lesson-b",
            "unit-3-lesson-c",
            "unit-3-lesson-d",
            "unit-3-lesson-e",
            "unit-3-lesson-f",
            "unit-3-lesson-g",
            "unit-3-lesson-h",
            "unit-3-lesson-i",
            "unit-3-lesson-j",
            "unit-3-lesson-k",
            "unit-3-lesson-l"
        ]
    },
    "unit-4": {
        "title": "Unit 4 – Traffic Control Devices and Laws",
        "durationMinutes": 120,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-4-lesson-a",
            "unit-4-lesson-b",
            "unit-4-lesson-c",
            "unit-4-lesson-d",
            "unit-4-lesson-e",
            "unit-4-lesson-f",
            "unit-4-lesson-g",
            "unit-4-lesson-h",
            "unit-4-lesson-i",
            "unit-4-lesson-j",
            "unit-4-lesson-k",
            "unit-4-lesson-l"
        ]
    },
    "unit-5": {
        "title": "Unit 5 – Perception and Driving Strategies for Different Environments",
        "durationMinutes": 240,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-5-lesson-a",
            "unit-5-lesson-b",
            "unit-5-lesson-c",
            "unit-5-lesson-d",
            "unit-5-lesson-e",
            "unit-5-lesson-f"
        ]
    },
    "review-1-5": {
        "title": "Review Units 1-5",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-review-1-5"]
    },
    "unit-6": {
        "title": "Unit 6 – Natural Laws Affecting Vehicle and Operator Performance",
        "durationMinutes": 75,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-6-lesson-a",
            "unit-6-lesson-b",
            "unit-6-lesson-c",
            "unit-6-lesson-d",
            "unit-6-lesson-e"
        ]
    },
    "unit-7": {
        "title": "Unit 7 – Handling Vehicle/Driver Emergencies",
        "durationMinutes": 120,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-7-lesson-a",
            "unit-7-lesson-b",
            "unit-7-lesson-c",
            "unit-7-lesson-d"
        ]
    },
    "unit-8": {
        "title": "Unit 8 – Operating in Adverse Conditions",
        "durationMinutes": 90,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-8-lesson-a",
            "unit-8-lesson-b",
            "unit-8-lesson-c",
            "unit-8-lesson-d",
            "unit-8-lesson-e",
            "unit-8-lesson-f"
        ]
    },
    "unit-9": {
        "title": "Unit 9 – Driver Fitness",
        "durationMinutes": 240,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-9-lesson-a",
            "unit-9-lesson-b",
            "unit-9-lesson-c",
            "unit-9-lesson-d",
            "unit-9-lesson-e",
            "unit-9-lesson-f",
            "unit-9-lesson-g"
        ]
    },
    "unit-10": {
        "title": "Unit 10 – Responsibilities of Owning and Maintaining a Vehicle",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "unit-10-lesson-a",
            "unit-10-lesson-b",
            "unit-10-lesson-c",
            "unit-10-lesson-d"
        ]
    },
    "updated-tech": {
        "title": "Updated Vehicle Technology",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-updated-tech"]
    },
    "review-6-10": {
        "title": "Review Units 6 - 10",
        "durationMinutes": 30,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-review-6-10"]
    },
    "final-test": {
        "title": "Final Test",
        "durationMinutes": null,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-final-test"]
    }
};

const seedCollection = async (collectionName, data) => {
    console.log(`Seeding ${collectionName}...`);
    // --- DANGER: This will delete all existing documents in the collection ---
    console.log(`Deleting existing documents in ${collectionName}...`);
    await deleteCollection(db, collectionName, 50);
    console.log('Deletion complete.');
    // --- End of danger zone ---

    for (const [docId, docData] of Object.entries(data)) {
        await db.collection(collectionName).doc(docId).set(docData);
        console.log(`Added document: ${docId}`);
    }
    console.log(`${collectionName} seeding complete.`);
};

const seedDatabase = async () => {
    try {
        await seedCollection('modules', modulesData);
        // Add more collections to seed here in the future
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

seedDatabase();
