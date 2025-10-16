const admin = require('firebase-admin');

// Replace with your service account key file and database URL
const serviceAccount = require('./fastrack-drivingschool-website-firebase-adminsdk-prc97-732953591a.json'); 
const databaseURL = 'https://fastrack-drivingschool-website-default-rtdb.firebaseio.com/:null';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();

const courses = [
  {
    title: 'Beginner Driving Course',
    description: 'This course is for absolute beginners. You will learn the basics of driving, including traffic rules, road signs, and vehicle control.',
    price: 299.99
  },
  {
    title: 'Advanced Driving Course',
    description: 'This course is for experienced drivers who want to improve their skills. You will learn advanced driving techniques, such as defensive driving and skid control.',
    price: 499.99
  },
  {
    title: 'Defensive Driving Course',
    description: 'This course will teach you how to anticipate and react to potential hazards on the road. You will learn how to avoid accidents and become a safer driver.',
    price: 199.99
  }
];

const addCourses = async () => {
  try {
    for (const course of courses) {
      await db.collection('courses').add(course);
      console.log(`Added course: ${course.title}`);
    }
  } catch (error) {
    console.error('Error adding courses:', error);
  }
};

addCourses();
