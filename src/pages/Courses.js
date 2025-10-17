import React, { useState, useEffect } from 'react';
import { db } from '../Firebase';
import { collection, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchCourses = async () => {
      const coursesCollection = await getDocs(collection(db, 'courses'));
      setCourses(coursesCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId) => {
    if (!user) {
      showNotification('You must be logged in to enroll in a course.', 'error');
      return;
    }
    try {
      const purchasedCourseRef = await addDoc(collection(db, 'users', user.uid, 'purchased_courses'), {
        courseRef: doc(db, 'courses', courseId)
      });
      showNotification('You have successfully enrolled in the course!', 'success');
    } catch (error) {
      showNotification('Error enrolling in the course. Please try again.', 'error');
      console.error('Error enrolling in course: ', error);
    }
  };

  return (
    <>
      <div className="course-info-container">
        <h1>Course Information</h1>
        <h2>Currently, Fastrack Driving School only provides classes for 16-21 year old students and first time license seekers</h2>
        <h2>The Department of Public Safety in Ohio requires each student to attend driver's training. The mandate for driver training is 24 hours of Classroom Lessons and 8 hours of behind-the-wheel instruction.</h2>
      </div>
      <div className="course-list-container">
        <div className="course-list">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p className="course-price">${course.price}</p>
              <button className="btn btn-primary" onClick={() => handleEnroll(course.id)}>Enroll Now</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Courses;