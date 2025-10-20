import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../Firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './CourseDetail.css';

const CourseDetail = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      const q = query(collection(db, "courses"), where("id", "==", parseInt(courseId)));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const courseDoc = querySnapshot.docs[0];
        setCourse({ id: courseDoc.id, ...courseDoc.data() });
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
    <div className="course-detail-container container">
      <h1>{course.title}</h1>
      <p className="course-detail-price">${course.price}</p>
      <p className="course-detail-description">{course.description}</p>
      {/* You can add more detailed course material here in the future */}
    </div>
  );
};

export default CourseDetail;