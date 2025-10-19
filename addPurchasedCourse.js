const admin = require('firebase-admin');

// Replace with your service account key file and database URL
const serviceAccount = require('./fastrack-drivingschool-website-firebase-adminsdk-prc97-732953591a.json');
const databaseURL = 'https://fastrack-drivingschool-website.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();

const addCourse = async () => {
  try {
    const userId = 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52';
    const courseId = 'FOs7n1QzCe00cvSPDfuN';

    const courseRef = await db.collection('users').doc(userId).collection('courses').add({
      courseRef: db.collection('courses').doc(courseId)
    });

    await db.collection('users').doc(userId).collection('courses').doc(courseRef.id).collection('completed_modules').add({});

    console.log(`Added course to user ${userId}`);
  } catch (error) {
    console.error('Error adding course:', error);
  }
};

addCourse();