const admin = require('firebase-admin');

// Replace with your service account key file and database URL
const serviceAccount = require('./fastrack-drivingschool-website-firebase-adminsdk-prc97-732953591a.json');
const databaseURL = 'https://fastrack-drivingschool-website.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();

const addModules = async () => {
  try {
    const courseId = 'FOs7n1QzCe00cvSPDfuN'; // Replace with the actual ID of the course

    const modules = [
      {
        title: 'Module 1: Introduction to Driving',
        description: 'In this module, you will learn the basics of driving, including the parts of a car and how to start and stop the engine.',
        content: 'This is the content for Module 1.'
      },
      {
        title: 'Module 2: Traffic Rules and Regulations',
        description: 'In this module, you will learn about the rules of the road, including traffic signs, signals, and markings.',
        content: 'This is the content for Module 2.'
      },
      {
        title: 'Module 3: Basic Driving Maneuvers',
        description: 'In this module, you will learn how to perform basic driving maneuvers, such as turning, parking, and changing lanes.',
        content: 'This is the content for Module 3.'
      }
    ];

    for (const module of modules) {
      await db.collection('courses').doc(courseId).collection('modules').add(module);
      console.log(`Added module: ${module.title}`);
    }
  } catch (error) {
    console.error('Error adding modules:', error);
  }
};

addModules();
