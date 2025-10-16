const admin = require('firebase-admin');

// Replace with your service account key file and database URL
const serviceAccount = require('./fastrack-drivingschool-website-firebase-adminsdk-prc97-732953591a.json');
const databaseURL = 'https://fastrack-drivingschool-website.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();

const resetCompletedModules = async () => {
  try {
    const userId = 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52';
    const courseId = 'FOs7n1QzCe00cvSPDfuN';

    const purchasedCoursesCollection = db.collection('users').doc(userId).collection('purchased_courses');
    const purchasedCoursesSnapshot = await purchasedCoursesCollection.where('courseRef', '==', db.collection('courses').doc(courseId)).get();

    console.log('purchasedCoursesSnapshot.empty:', purchasedCoursesSnapshot.empty);

    if (purchasedCoursesSnapshot.empty) {
      console.log('No purchased course found for this user and course.');
      return;
    }

    const purchasedCourseId = purchasedCoursesSnapshot.docs[0].id;

    const completedModulesCollection = db.collection('users').doc(userId).collection('purchased_courses').doc(purchasedCourseId).collection('completed_modules');
    const completedModulesSnapshot = await completedModulesCollection.get();

    console.log('completedModulesSnapshot.empty:', completedModulesSnapshot.empty);

    const batch = db.batch();
    completedModulesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Reset completed modules for user ${userId} and purchased course ${purchasedCourseId}`);
  } catch (error) {
    console.error('Error resetting completed modules:', error);
  }
};

resetCompletedModules();
