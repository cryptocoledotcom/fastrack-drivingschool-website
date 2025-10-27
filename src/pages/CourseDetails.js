import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../Firebase';
import { doc, getDoc } from 'firebase/firestore';
import './CourseDetails.css';

const CourseDetails = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      const docRef = doc(db, "courses", courseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setCourse({ ...docSnap.data(), id: docSnap.id });
      } else {
        console.error('No such course found!');
      }
      setLoading(false);
    };

    fetchCourse();
  }, [courseId]);

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (!course) {
    return <div className="container"><h1>Course Not Found</h1><p>The course you are looking for does not exist.</p></div>;
  }

  return (
    <>
      <div className="course-detail-header">
        <h1>{course.title}</h1>
        <p className="course-detail-price">${course.price}</p>
      </div>
      <div className="course-detail-body">
        {course.id === 'fastrack-online' ? (
          <OnlineCourseDescription />
        ) : course.id === 'fastrack-behind-the-wheel' ? (
          <BehindTheWheelCourseDescription />
        ) : course.id === 'fastrack-complete' ? (
          <OnlineAndBehindTheWheelCourseDescription />
        ) : (
          <p className="course-detail-description">{course.description}</p>
        )}
        {/* You can add more detailed course material here in the future */}
      </div>
    </>
  );
};

const OnlineCourseDescription = () => (
  <div className="online-course-description">
    <h2>Become a Safe, Confident Ohio Driver with Our State-Approved Online Course</h2>
    <p>Get on the road to earning your driver's permit with our comprehensive online classroom course, fully approved by the Ohio Bureau of Motor Vehicles (BMV). This 24-hour program is specifically designed to provide new drivers with the foundational knowledge and skills required to be a safe and competent driver in Ohio.</p>
    <div className="detail-card">
      <h3>How Our Course Works:</h3>
      <ul>
        <li>
          <strong>Structured Learning Path:</strong> The 24-hour curriculum is broken down into easy-to-follow modules, each focusing on essential driving topics. This step-by-step approach ensures you learn everything you need without feeling overwhelmed.
        </li>
        <li>
          <strong>Mastery-Based Progression:</strong> At the end of each module, you will take a short test. A score of 80% or higher is required to unlock the next section. This confirms you have a solid understanding of the material before moving on, building a strong foundation for your driving future.
        </li>
        <li>
          <strong>Learn at Your Own Pace:</strong> Our online format allows you to complete the lessons on your schedule, whenever and wherever it's convenient for you.
        </li>
      </ul>
    </div>
    <div className="detail-card">
      <h3>What You Can Expect:</h3>
      <ul>
        <li>A comprehensive curriculum covering all fundamental aspects of safe driving.</li>
        <li>Engaging lessons designed for clear comprehension and retention.</li>
        <li>The confidence that you are meeting all state requirements for your permit.</li>
      </ul>
    </div>
    <p><strong>Enroll today and take the first step towards becoming a responsible and skilled driver on Ohio's roads!</strong></p>
    <div className="enroll-button-container">
      <Link to="/purchase/fastrack-online" className="btn btn-primary">Enroll Now</Link>
    </div>
  </div>
);

const BehindTheWheelCourseDescription = () => (
  <div className="online-course-description">
    <h2>Master the Road: Expert Behind-the-Wheel Driving Instruction</h2>
    <p>Transition from theory to practice with our comprehensive 8-hour behind-the-wheel driving course. Designed for aspiring Ohio drivers, this program provides essential hands-on experience in the driver's seat under the guidance of our professional, state-certified instructors. Our goal is to build your confidence and shape you into a safe, skilled, and responsible driver.</p>
    <div className="detail-card">
      <h3>Your In-Car Learning Experience Includes:</h3>
      <ul>
        <li>
          <strong>One-on-One Expert Instruction:</strong> You will receive 8 hours of personalized, in-car coaching from our patient and responsible instructors. They are trained to create a calm and supportive environment, perfect for new drivers.
        </li>
        <li>
          <strong>Essential Driving Skills:</strong> We cover everything you need to know for Ohio roads, including vehicle control, lane changes, defensive driving techniques, parallel parking, three-point turns, and highway navigation.
        </li>
      </ul>
    </div>
    <div className="detail-card">
      <h3>Seamless Scheduling, Built for Your Busy Life</h3>
      <p>At Fastrack, we know that life can be hectic. That’s why we’ve built a modern scheduling system with your convenience in mind.</p>
      <ul>
        <li>
          <strong>Manage Everything Online:</strong> Schedule your driving lessons directly from your user profile. Our system provides real-time availability, so you can book slots that work for you.
        </li>
        <li>
          <strong>Stay on Track:</strong> Receive automatic updates and reminders for your upcoming lessons, helping you stay organized.
        </li>
        <li>
          <strong>Flexible Rescheduling:</strong> If a conflict arises, you can easily reschedule your lesson through your profile. We make it simple to adapt to life's unexpected changes.
        </li>
      </ul>
    </div>
    <div className="detail-card">
      <h3>Personalized Feedback for Continuous Improvement</h3>
      <p>At the conclusion of your training, you will receive a detailed final report. This evaluation provides a clear summary of your progress, highlighting your strengths and offering constructive suggestions based on our instructor's observations. This feedback is an invaluable tool for your continued growth as a driver.</p>
    </div>
    <p><strong>Enroll today and take the first step towards becoming a responsible and skilled driver on Ohio's roads!</strong></p>
    <div className="enroll-button-container">
      <Link to="/purchase/fastrack-behind-the-wheel" className="btn btn-primary">Enroll Now</Link>
    </div>
  </div>
);

const OnlineAndBehindTheWheelCourseDescription = () => (
  <div className="online-course-description">
    <h2>The Complete Driver's Package: Your All-in-One Path to Driving Freedom</h2>
    <p>Get the most comprehensive and convenient driver's education experience with the Fastrack Complete Package. This bundle combines our 24-hour, state-approved online classroom with our 8-hour, hands-on behind-the-wheel training program.</p>
    <p>By choosing this all-in-one solution, you not only receive a special discount but also benefit from a seamless, integrated learning journey from start to finish.</p>
    <div className="detail-card">
      <h3>Why the Fastrack Bundle is the Smartest Choice:</h3>
      <ul>
        <li>
          <strong>Significant Savings:</strong> Enjoy our best value by bundling both required courses together. It’s the most cost-effective way to meet all of Ohio's driver's education requirements.
        </li>
        <li>
          <strong>Ultimate Convenience:</strong> Forget juggling different schools and websites. With Fastrack, you manage everything from a single user profile. Track your online progress and schedule your in-car lessons all in one place.
        </li>
        <li>
          <strong>A Cohesive Learning Experience:</strong> Our program is designed for a smooth transition from theory to practice. The fundamental concepts you master in our online classroom are directly reinforced by our professional instructors during your behind-the-wheel lessons, creating a more effective and less stressful learning environment.
        </li>
        <li>
          <strong>One Trusted Partner:</strong> From your first online module to your final driving report, you'll be working with one dedicated team committed to helping you become a safe, confident, and responsible driver.
        </li>
      </ul>
    </div>
    <p><strong>Choose the complete package for the easiest, most efficient, and most affordable path to getting your Ohio driver's license.</strong></p>
    <div className="enroll-button-container">
      <Link to="/purchase/fastrack-complete" className="btn btn-primary">Enroll Now</Link>
    </div>
  </div>
);

export default CourseDetails;