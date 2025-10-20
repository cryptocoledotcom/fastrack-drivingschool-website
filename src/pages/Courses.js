import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../Firebase';
import { collection, getDocs } from 'firebase/firestore';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const coursesCollection = await getDocs(collection(db, 'courses'));
      const fetchedCourses = coursesCollection.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Define the desired order of course titles
      const desiredOrder = [
        'Online Driving Course',
        'Behind the Wheel Driving Course',
        'Online & Behind the Wheel Driving Course'
      ];

      // Sort the courses based on the desired order
      fetchedCourses.sort((a, b) => {
        return desiredOrder.indexOf(a.title) - desiredOrder.indexOf(b.title);
      });

      setCourses(fetchedCourses);
    };
    fetchCourses();
  }, []);

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
              <p className="course-price">${course.price}</p>
              <Link to={`/courses/${course.id}`} className="btn btn-primary">Course Information</Link>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Courses;