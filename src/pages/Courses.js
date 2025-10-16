// src/pages/Courses.js
import React from 'react';
import './Courses.css';

// data for courses
const courses = [
  { id: 1, title: 'Behind the Wheel Driving Course', description: '8hr. hands on course. For students age 18-21, as well as drivers with a Non-Renewable, Non-Transferable (Limited) Term License.', price: 499 },
  { id: 2, title: '24hr. Online Driving Course', description: '24 hours of Online classroom course for new students in need of a permit.', price: 99 },
  { id: 3, title: 'Online & Behind the Wheel Driving Course', description: 'Both of our courses, 24hr. Online Driving Course and 8hr. Behind the Wheel Driving Course,bundled together at a discounted price.', price: 595 },
];

function Courses() {
  return (
    <>
      <div className="course-info-container">
        <h1>Course Information</h1>
        <h2>Currently, Fastrack Driving School only provides classes for 18-21 year old students and first time license seekers</h2>
        <h2>The Department of Public Safety in Ohio requires each student to attend driver's training. The mandate for driver training is 24 hours of Classroom Lessons and 8 hours of behind-the-wheel instruction.</h2>
      </div>
      <div className="course-list-container">
        <div className="course-list">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p className="course-price">${course.price}</p>
              <button className="btn btn-primary">Enroll Now</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Courses;