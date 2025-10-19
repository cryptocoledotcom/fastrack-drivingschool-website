import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../pages/Auth/AuthContext";
import { db } from "../Firebase";
import { collection, getDocs, getDoc, query, where, writeBatch, doc } from "firebase/firestore";
import { useNotification } from "./Notification/NotificationContext";

const MyCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchCourses = async () => {
      if (user) {
        try {
          const coursesCollection = collection(db, "users", user.uid, "courses");
          const coursesSnapshot = await getDocs(coursesCollection);
          const coursesData = [];
          const courseIds = new Set();
          for (const doc of coursesSnapshot.docs) {
            const courseRef = doc.data().courseRef;
            const courseDoc = await getDoc(courseRef);

            if (courseDoc.exists()) {
              const courseData = courseDoc.data();
              if (courseData.bundledCourses) {
                for (const bundledCourseRef of courseData.bundledCourses) {
                  if (!courseIds.has(bundledCourseRef.id)) {
                    const bundledCourseDoc = await getDoc(bundledCourseRef);
                    if (bundledCourseDoc.exists()) {
                      coursesData.push({ id: bundledCourseDoc.id, ...bundledCourseDoc.data() });
                      courseIds.add(bundledCourseRef.id);
                    }
                  }
                }
              } else {
                if (!courseIds.has(courseRef.id)) {
                  coursesData.push({ id: courseDoc.id, ...courseData });
                  courseIds.add(courseRef.id);
                }
              }
            }
          }
          setCourses(coursesData);
        } catch (error) {
          console.error("Error fetching courses:", error);
        }
      }
    };

    const fetchBookings = async () => {
      if (user) {
        try {
          const bookingsCollection = collection(db, "bookings");
          const q = query(bookingsCollection, where("userId", "==", user.uid));
          const bookingsSnapshot = await getDocs(q);
          const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBookings(bookingsData);
        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
      }
    };

    const fetchData = async () => {
      await fetchCourses();
      await fetchBookings();
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const behindTheWheelBooking = bookings.find(booking => booking.courseId === 'behind-the-wheel');

  return (
    <div className="my-courses-section">
      <h3>My Courses</h3>
      {courses.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {courses.map(course => (
            <li key={course.id}>
              <h4>{course.title}</h4>
              <p>{course.description}</p>
              {course.title === 'Behind the Wheel Driving Course' ? (
                behindTheWheelBooking ? (
                  <div>
                    <p><strong>Upcoming Lesson:</strong></p>
                    <p>{new Date(behindTheWheelBooking.date + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {behindTheWheelBooking.time}</p>
                    <Link
                      to="/calendar"
                      state={{ bookingIdToReschedule: behindTheWheelBooking.id }}
                      className="btn btn-secondary"
                    >
                      Reschedule
                    </Link>
                  </div>
                ) : (
                  <Link to="/calendar" className="btn btn-primary">Schedule Driving Lessons</Link>
                )
              ) : (
                <Link to={`/course/${course.id}`} className="btn btn-primary">Start Lessons</Link>
              )}
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
