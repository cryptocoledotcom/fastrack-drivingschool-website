import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../Firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const coursesRef = collection(db, 'courses');
      const q = query(coursesRef, orderBy('order'));
      const coursesCollection = await getDocs(q);
      const fetchedCourses = coursesCollection.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCourses(fetchedCourses);
    };
    fetchCourses();
  }, []);

  return (
    <>
      <div className="course-info-container">
        <h1>Ohio Driver's Training Made Simple:</h1>
        <h2>Fastrack Driving School offers state-approved driver's education for new drivers aged 16-21. Our program provides everything you need to meet the Ohio Department of Public Safety requirements and confidently prepare for your licensing exam.</h2>
        <h1>Complete State-Approved Program:</h1> 
        <h2>We provide the full 24 hours of classroom lessons and 8 hours of behind-the-wheel instruction required by the state of Ohio.</h2>
        <h1>Convenient Online Scheduling:</h1> 
        <h2>Manage your in-car lessons with ease. Your online student profile allows you to book driving times, receive real-time updates, and get automated reminders for upcoming appointments.</h2>
        <h1>Full Exam Preparation:</h1> 
        <h2>We guide you through every step of the process, ensuring you have the knowledge, skill, and confidence needed to succeed on your exam and become a safe driver.</h2>
      </div>
      <div className="course-list-container">
        <h1 className="courses-title">Our Courses</h1>
        <div className="course-list">
          {courses.map(course => (
            <div key={course.id} className="course-card">
              <h2>{course.title}</h2>
              <p>{course.description}</p>
              <p className="course-price">${course.price}</p>
              <Link to={`/courses/${course.id}`} className="btn btn-primary">Course Information</Link>
            </div>
          ))}
        </div>
      </div>
      <div className="features-container">
        <h1 className="features-title">Our Features</h1>
        <div className="feature-list">
          <div className="feature-card">
            <h2>Easy to Use</h2>
            <p>Our website is designed to be easy to use. You can easily find the course you are looking for and sign up in minutes.</p>
          </div>
          <div className="feature-card">
            <h2>24/7 Access</h2>
            <p>Our online courses are available 24/7, so you can learn at your own pace and on your own schedule.</p>
          </div>
          <div className="feature-card">
            <h2>Expert Instructors</h2>
            <p>Our instructors are experts in their field and are dedicated to helping you succeed.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Courses;