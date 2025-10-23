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
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}


const addModulesAndLessons = async () => {
  try {
    const courseId = 'FOs7n1QzCe00cvSPDfuN'; // Replace with the actual ID of the course
    const courseRef = db.collection('courses').doc(courseId);

    // --- DANGER: This will delete all existing modules and lessons for this course ---
    console.log('Deleting existing modules and lessons...');
    const modulesSnapshot = await courseRef.collection('modules').get();
    for (const moduleDoc of modulesSnapshot.docs) {
        const lessonsSnapshot = await moduleDoc.ref.collection('lessons').get();
        for (const lessonDoc of lessonsSnapshot.docs) {
            await lessonDoc.ref.delete();
        }
        await moduleDoc.ref.delete();
        console.log(`Deleted module: ${moduleDoc.id}`);
    }
    console.log('Deletion complete.');
    // --- End of danger zone ---


    const modules = [
      {
        title: 'Module 1: Introduction to Driving',
        description: 'In this module, you will learn the basics of driving, including the parts of a car and how to start and stop the engine.',
        order: 1,
        lessons: [
            {
                title: 'Welcome to Fastrack Online Driving Course',
                description: 'A warm welcome to the course! This video will walk you through the course structure, requirements, and how to succeed.',
                order: 1,
                videoUrl: 'dQw4w9WgXcQ' // Placeholder video
            },
            {
                title: 'Parts of a Car',
                description: 'Learn about the different parts of a car and their functions.',
                order: 2,
                videoUrl: 'placeholder_video_id_2'
            }
        ]
      },
      {
        title: 'Module 2: Traffic Rules and Regulations',
        description: 'In this module, you will learn about the rules of the road, including traffic signs, signals, and markings.',
        order: 2,
        lessons: [
            {
                title: 'Understanding Traffic Signs',
                description: 'A deep dive into the various traffic signs and what they mean.',
                order: 1,
                videoUrl: 'placeholder_video_id_3'
            }
        ]
      },
      {
        title: 'Module 3: Basic Driving Maneuvers',
        description: 'In this module, you will learn how to perform basic driving maneuvers, such as turning, parking, and changing lanes.',
        order: 3,
        lessons: [
            {
                title: 'How to Park',
                description: 'Learn the techniques for parallel and perpendicular parking.',
                order: 1,
                videoUrl: 'placeholder_video_id_4'
            }
        ]
      }
    ];

    for (const moduleData of modules) {
      const { lessons, ...moduleInfo } = moduleData;
      const moduleRef = await courseRef.collection('modules').add(moduleInfo);
      console.log(`Added module: ${moduleData.title}`);

      for (const lessonData of lessons) {
        await moduleRef.collection('lessons').add(lessonData);
        console.log(`  - Added lesson: ${lessonData.title}`);
      }
    }

  } catch (error) {
    console.error('Error adding modules and lessons:', error);
  }
};

addModulesAndLessons();