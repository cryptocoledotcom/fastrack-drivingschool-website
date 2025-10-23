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
    "module-intro": {
        "title": "Introduction and Program Administration",
        "durationMinutes": 30,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-intro-1"]
    },
    "module-1": {
        "title": "Unit 1 – The System and You",
        "durationMinutes": 60,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-1-1",
            "lesson-1-2",
            "lesson-1-3",
            "lesson-1-4"
        ]
    },
    "module-2": {
        "title": "Unit 2 – Vehicle Familiarization",
        "durationMinutes": 60,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-2-1",
            "lesson-2-2",
            "lesson-2-3",
            "lesson-2-4",
            "lesson-2-5",
            "lesson-2-6",
            "lesson-2-7"
        ]
    },
    "module-3": {
        "title": "Unit 3 – Basic Control Tasks",
        "durationMinutes": 210,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-3-1",
            "lesson-3-2",
            "lesson-3-3",
            "lesson-3-4",
            "lesson-3-5",
            "lesson-3-6",
            "lesson-3-7",
            "lesson-3-8",
            "lesson-3-9",
            "lesson-3-10",
            "lesson-3-11",
            "lesson-3-12"
        ]
    },
    "module-4": {
        "title": "Unit 4 – Traffic Control Devices and Laws",
        "durationMinutes": 120,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-4-1",
            "lesson-4-2",
            "lesson-4-3",
            "lesson-4-4",
            "lesson-4-5",
            "lesson-4-6",
            "lesson-4-7",
            "lesson-4-8",
            "lesson-4-9",
            "lesson-4-10",
            "lesson-4-11",
            "lesson-4-12"
        ]
    },
    "module-5": {
        "title": "Unit 5 – Perception and Driving Strategies for Different Environments",
        "durationMinutes": 240,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-5-1",
            "lesson-5-2",
            "lesson-5-3",
            "lesson-5-4",
            "lesson-5-5",
            "lesson-5-6"
        ]
    },
    "module-review-1-5": {
        "title": "Review Units 1-5",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-review-1-5"]
    },
    "module-6": {
        "title": "Unit 6 – Natural Laws Affecting Vehicle and Operator Performance",
        "durationMinutes": 75,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-6-1",
            "lesson-6-2",
            "lesson-6-3",
            "lesson-6-4",
            "lesson-6-5"
        ]
    },
    "module-7": {
        "title": "Unit 7 – Handling Vehicle/Driver Emergencies",
        "durationMinutes": 120,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-7-1",
            "lesson-7-2",
            "lesson-7-3",
            "lesson-7-4"
        ]
    },
    "module-8": {
        "title": "Unit 8 – Operating in Adverse Conditions",
        "durationMinutes": 90,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-8-1",
            "lesson-8-2",
            "lesson-8-3",
            "lesson-8-4",
            "lesson-8-5",
            "lesson-8-6"
        ]
    },
    "module-9": {
        "title": "Unit 9 – Driver Fitness",
        "durationMinutes": 240,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-9-1",
            "lesson-9-2",
            "lesson-9-3",
            "lesson-9-4",
            "lesson-9-5",
            "lesson-9-6",
            "lesson-9-7"
        ]
    },
    "module-10": {
        "title": "Unit 10 – Responsibilities of Owning and Maintaining a Vehicle",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": [
            "lesson-10-1",
            "lesson-10-2",
            "lesson-10-3",
            "lesson-10-4"
        ]
    },
    "module-updated-tech": {
        "title": "Updated Vehicle Technology",
        "durationMinutes": 45,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-updated-tech"]
    },
    "module-review-6-10": {
        "title": "Review Units 6 - 10",
        "durationMinutes": 30,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-review-6-10"]
    },
    "module-final-test": {
        "title": "Final Test",
        "durationMinutes": null,
        "courseId": "fastrack-online",
        "lessonOrder": ["lesson-final-test"]
    }
};

const lessonsData = {
    // Module: intro-admin
    "lesson-intro-1": {
        "title": "Introduction and Program Administration",
        "content": "Welcome to the Fastrack Online Driving Course! This initial lesson will guide you through the program's structure, what to expect, and how to successfully complete your driver education.",
        "videoUrl": "boXMHM8LJD8",
        "moduleId": "module-intro",
        "courseId": "fastrack-online"
    },

    // Module: unit-1
    "lesson-1-1": {
        "title": "A. The Highway Transportation System",
        "content": "Learn about the complex system of roadways, vehicles, and people that make up our highway transportation system.",
        "videoUrl": "pB-2T7y3xI4",
        "moduleId": "module-1",
        "courseId": "fastrack-online"
    },
    "lesson-1-2": {
        "title": "B. Getting Your Driver’s License",
        "content": "Understand the steps, requirements, and regulations involved in obtaining your driver's license in Ohio.",
        "moduleId": "module-1",
        "courseId": "fastrack-online"
    },
    "lesson-1-3": {
        "title": "C. Driver Education Value",
        "content": "Discover the importance and benefits of a comprehensive driver education program for creating safe and responsible drivers.",
        "moduleId": "module-1",
        "courseId": "fastrack-online"
    },
    "lesson-1-4": {
        "title": "D. Anatomical Gifts",
        "content": "Learn about the anatomical gift act and how you can make a decision about organ and tissue donation.",
        "moduleId": "module-1",
        "courseId": "fastrack-online"
    },

    // Module: unit-2
    "lesson-2-1": {
        "title": "A. Safety Systems",
        "content": "An overview of the active and passive safety systems in modern vehicles designed to protect you and your passengers.",
        "videoUrl": "K3c2AbI6v7E",
        "moduleId": "module-2",
        "courseId": "fastrack-online"
    },
    "lesson-2-2": { "title": "B. Vehicle Systems", "content": "...", "moduleId": "module-2", "courseId": "fastrack-online" },
    "lesson-2-3": { "title": "C. Vehicle Controls", "content": "...", "moduleId": "module-2", "courseId": "fastrack-online" },
    "lesson-2-4": { "title": "D. Instrument Panel", "content": "...", "moduleId": "module-2", "courseId": "fastrack-online" },
    "lesson-2-5": { "title": "E. Getting Ready to Drive", "content": "...", "moduleId": "module-2", "courseId": "fastrack-online" },
    "lesson-2-6": {
        "title": "F. Pre-Drive Checks",
        "content": "A step-by-step guide to the essential checks you should perform before you even start the engine.",
        "moduleId": "module-2",
        "courseId": "fastrack-online"
    },
    "lesson-2-7": {
        "title": "G. Fitting the Vehicle to You",
        "content": "Learn how to properly adjust your seat, mirrors, and steering wheel for optimal control and safety.",
        "moduleId": "module-2", "courseId": "fastrack-online"
    },

    // Module: unit-3
    "lesson-3-1": { "title": "A. Demonstrate the Ready to Drive Position", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-2": { "title": "B. Starting the Vehicle", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-3": { "title": "C. Moving the Vehicle", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-4": { "title": "D. Steering", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-5": { "title": "E. Speed Control", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-6": { "title": "F. Stopping", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-7": { "title": "G. Backing", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-8": { "title": "H. Turning", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-9": { "title": "I. Changing Lanes", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-10": { "title": "J. Turnabouts", "content": "...", "moduleId": "module-3", "courseId": "fastrack-online" },
    "lesson-3-11": {
        "title": "K. Parking",
        "content": "This lesson covers all types of parking: angled, perpendicular, parallel...",
        "videoUrl": "l4LhLNB8Q2Q",
        "moduleId": "module-3",
        "courseId": "fastrack-online"
    },
    "lesson-3-12": {
        "title": "L. Securing and Leaving the Vehicle",
        "content": "The final steps to ensure your vehicle is safe and secure after you've parked.",
        "videoUrl": "T5p-wQYgI9Y",
        "moduleId": "module-3",
        "courseId": "fastrack-online"
    },

    // Module: unit-4
    "lesson-4-1": { "title": "A. Pavement/Roadway Markings", "content": "...", "videoUrl": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-2": { "title": "B. Traffic Signs", "content": "...", "videoUrl": "Ffd9SgSWbbE", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-3": { "title": "C. Traffic Signals", "content": "Learn to interpret traffic lights, including solid, flashing, and arrow signals.", "videoUrl": "j9c4pTf4w9c", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-3": { "title": "C. Traffic Signals", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-4": { "title": "D. Right-of-Way", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-5": { "title": "E. Speed Limits", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-6": { "title": "F. Following and Stopping Distances", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-7": { "title": "G. Passing and Being Passed", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-8": { "title": "H. Lane Usage", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-9": { "title": "I. Parking Laws", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-10": { "title": "J. Pedestrians and Bicyclists", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-11": { "title": "K. School Buses", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },
    "lesson-4-12": { "title": "L. Violations and the Ohio Point System", "content": "...", "moduleId": "module-4", "courseId": "fastrack-online" },

    // Module: unit-5
    "lesson-5-1": { "title": "A. Space Management Systems", "content": "This lesson covers S.E.E., S.I.P.D.E., and Smith5Keys...", "moduleId": "module-5", "courseId": "fastrack-online" },
    "lesson-5-2": { "title": "B. Searching", "content": "...", "moduleId": "module-5", "courseId": "fastrack-online" },
    "lesson-5-3": { "title": "C. City Driving", "content": "...", "moduleId": "module-5", "courseId": "fastrack-online" },
    "lesson-5-4": { "title": "D. Highway Driving", "content": "...", "moduleId": "module-5", "courseId": "fastrack-online" },
    "lesson-5-5": { "title": "E. Rural Driving", "content": "...", "moduleId": "module-5", "courseId": "fastrack-online" },
    "lesson-5-6": { "title": "F. Sharing the Road", "content": "...", "moduleId": "module-5", "courseId": "fastrack-online" },

    // Module: review-1-5
    "lesson-review-1-5": {
        "title": "Review Units 1-5",
        "content": "A review or quiz covering all content from units 1-5...",
        "moduleId": "module-review-1-5",
        "courseId": "fastrack-online"
    },

    // Module: unit-6
    "lesson-6-1": { "title": "A. Gravity", "content": "...", "moduleId": "module-6", "courseId": "fastrack-online" },
    "lesson-6-2": { "title": "B. Energy of Motion", "content": "...", "moduleId": "module-6", "courseId": "fastrack-online" },
    "lesson-6-3": { "title": "C. Friction and Traction", "content": "...", "moduleId": "module-6", "courseId": "fastrack-online" },
    "lesson-6-4": { "title": "D. Centrifugal and Centripetal Force", "content": "...", "moduleId": "module-6", "courseId": "fastrack-online" },
    "lesson-6-5": { "title": "E. Force of Impact", "content": "...", "moduleId": "module-6", "courseId": "fastrack-online" },

    // Module: unit-7
    "lesson-7-1": { "title": "A. Vehicle Emergencies", "content": "...", "moduleId": "module-7", "courseId": "fastrack-online" },
    "lesson-7-2": { "title": "B. Driver Emergencies", "content": "...", "moduleId": "module-7", "courseId": "fastrack-online" },
    "lesson-7-3": { "title": "C. Collision Reporting", "content": "...", "moduleId": "module-7", "courseId": "fastrack-online" },
    "lesson-7-4": { "title": "D. Post-Collision Responsibilities", "content": "...", "moduleId": "module-7", "courseId": "fastrack-online" },

    // Module: unit-8
    "lesson-8-1": { "title": "A. Low Light and Night Conditions", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },
    "lesson-8-2": { "title": "B. Glare", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },
    "lesson-8-3": { "title": "C. Adverse Weather", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },
    "lesson-8-4": { "title": "D. Reduced Visibility", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },
    "lesson-8-5": { "title": "E. Extreme Temperatures", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },
    "lesson-8-6": { "title": "F. Vehicle and Driver Preparation", "content": "...", "moduleId": "module-8", "courseId": "fastrack-online" },

    // Module: unit-9
    "lesson-9-1": { "title": "A. Your Senses and Driving", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-2": { "title": "B. Emotions", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-3": { "title": "C. Fatigue", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-4": { "title": "D. Illness and Injury", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-5": { "title": "E. Carbon Monoxide", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-6": { "title": "F. Alcohol and Other Drugs", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },
    "lesson-9-7": { "title": "G. Distracted Driving", "content": "...", "moduleId": "module-9", "courseId": "fastrack-online" },

    // Module: unit-10
    "lesson-10-1": { "title": "A. Buying a Vehicle", "content": "...", "moduleId": "module-10", "courseId": "fastrack-online" },
    "lesson-10-2": { "title": "B. Insuring a Vehicle", "content": "...", "moduleId": "module-10", "courseId": "fastrack-online" },
    "lesson-10-3": { "title": "C. Maintaining a Vehicle", "content": "...", "moduleId": "module-10", "courseId": "fastrack-online" },
    "lesson-10-4": { "title": "D. Trip Planning", "content": "...", "moduleId": "module-10", "courseId": "fastrack-online" },

    // Module: updated-tech
    "lesson-updated-tech": {
        "title": "Updated Vehicle Technology",
        "content": "An overview of the latest advancements in vehicle technology, including ADAS (Advanced Driver-Assistance Systems) and infotainment.",
        "moduleId": "module-updated-tech",
        "courseId": "fastrack-online"
    },

    // Module: review-6-10
    "lesson-review-6-10": {
        "title": "Review Units 6 - 10",
        "content": "A review or quiz covering all content from units 6-10...",
        "moduleId": "module-review-6-10",
        "courseId": "fastrack-online"
    },

    // Module: final-test
    "lesson-final-test": {
        "title": "Final Test",
        "content": "This is the final test for the course. You must pass this test to receive your certificate of completion.",
        "moduleId": "module-final-test",
        "courseId": "fastrack-online"
    }
};

const coursesData = {
    "fastrack-online": {
        "title": "Fastrack Online Driving Course",
        "description": "Get Your Ohio Driver's Permit Online! Our 24-hour online classroom course is fully certified by the Ohio Bureau of Motor Vehicles (BMV) and is the perfect starting point for new drivers. We've designed our program to ensure you don't just complete the hours—you truly learn the material. Ready to get behind the wheel? Enroll now and start your journey with a solid foundation!",
        "courseType": "online",
        "price": 99,
        "order": 1,
        "thumbnailUrl": "",
        "moduleOrder": [
            "module-intro",
            "module-1",
            "module-2",
            "module-3",
            "module-4",
            "module-5",
            "module-review-1-5",
            "module-6",
            "module-7",
            "module-8",
            "module-9",
            "module-10",
            "module-updated-tech",
            "module-review-6-10",
            "module-final-test"
        ]
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

const seedCollectionNonDestructive = async (collectionName, data) => {
    console.log(`Non-destructively seeding ${collectionName}...`);
    const collectionRef = db.collection(collectionName);
    for (const [docId, docData] of Object.entries(data)) {
        // Use { merge: true } to only update specified fields and not overwrite the whole doc.
        // This will create the document if it doesn't exist, or update it if it does.
        await collectionRef.doc(docId).set(docData, { merge: true });
        console.log(`Upserted document: ${docId}`);
    }
    console.log(`${collectionName} non-destructive seeding complete.`);
};

const seedDatabase = async () => {
    try {
        await seedCollection('modules', modulesData);
        await seedCollection('lessons', lessonsData);
        await seedCollectionNonDestructive('courses', coursesData);
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

seedDatabase();
