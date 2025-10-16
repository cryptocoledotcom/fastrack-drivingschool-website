import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../pages/Auth/AuthContext";
import { db } from "../Firebase";
import { collection, getDocs, getDoc } from "firebase/firestore";

const MyCourses = () => {
  const { user } = useAuth();
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchasedCourses = async () => {
      if (user) {
        try {
          const purchasedCoursesCollection = collection(db, "users", user.uid, "purchased_courses");
          const purchasedCoursesSnapshot = await getDocs(purchasedCoursesCollection);
          const courses = [];
          const courseIds = new Set();
          for (const doc of purchasedCoursesSnapshot.docs) {
            const courseRef = doc.data().courseRef;
            if (!courseIds.has(courseRef.id)) {
              const courseDoc = await getDoc(courseRef);
              if (courseDoc.exists()) {
                courses.push({ id: courseDoc.id, ...courseDoc.data() });
                courseIds.add(courseRef.id);
              }
            }
          }
          setPurchasedCourses(courses);
        } catch (error) {
          console.error("Error fetching purchased courses:", error);
        }
      }
      setLoading(false);
    };

    fetchPurchasedCourses();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="my-courses-section">
      <h3>My Courses</h3>
      {purchasedCourses.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {purchasedCourses.map(course => (
            <li key={course.id}>
              <h4>{course.title}</h4>
              <p>{course.description}</p>
              <Link to={`/course/${course.id}`} className="btn btn-primary">Start Lessons</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have not purchased any courses yet.</p>
      )}
    </div>
  );
};

export default MyCourses;
