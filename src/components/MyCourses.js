import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../pages/Auth/AuthContext";
import { db } from "../Firebase";
import { collection, getDocs, getDoc, query, where, doc } from "firebase/firestore";

const MyCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (user) {
        try {
          const coursesCollection = collection(db, "users", user.uid, "courses");
          const coursesSnapshot = await getDocs(coursesCollection);
          const coursesData = [];
          const courseIds = new Set();
          for (const courseDoc of coursesSnapshot.docs) {
            const courseId = courseDoc.data().courseId;
            const courseRef = doc(db, 'courses', courseId);
            const fetchedCourseDoc = await getDoc(courseRef);

            if (fetchedCourseDoc.exists()) {
              const courseData = fetchedCourseDoc.data();
              if (courseData.bundledCourses) {
                for (const bundledCoursePath of courseData.bundledCourses) {
                  const bundledCourseId = bundledCoursePath.split('/').pop().trim();
                  if (!courseIds.has(bundledCourseId)) {
                    const bundledCourseRef = doc(db, 'courses', bundledCourseId);
                    const bundledCourseDoc = await getDoc(bundledCourseRef);
                    if (bundledCourseDoc.exists()) {
                      coursesData.push({ ...bundledCourseDoc.data(), id: bundledCourseDoc.id });
                      courseIds.add(bundledCourseId);
                    }
                  }
                }
              } else {
                if (!courseIds.has(courseId)) {
                  coursesData.push({ ...courseData, id: fetchedCourseDoc.id });
                  courseIds.add(courseId);
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

  const behindTheWheelBooking = bookings.find(booking => booking.courseId === 'fastrack-behind-the-wheel');

  return (
    <div className="my-courses-section">
      <h3>My Courses</h3>
      {courses.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {courses.map(course => (
            <li key={course.id}>
              <h4>{course.title}</h4>
              <p>{course.description}</p>
              {course.id === 'fastrack-behind-the-wheel' ? (
                behindTheWheelBooking ? (
                  <div>
                    <p><strong>Upcoming Lesson:</strong></p>
                    <p>{new Date(behindTheWheelBooking.date + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at {behindTheWheelBooking.time}</p>
                    <Link
                      to="/schedule-lesson"
                      state={{ bookingIdToReschedule: behindTheWheelBooking.id }}
                      className="btn btn-secondary"
                    >
                      Reschedule
                    </Link>
                  </div>
                ) : (
                  <Link to="/schedule-lesson" className="btn btn-primary">Schedule Driving Lessons</Link>
                )
              ) : (
                <Link to={`/course-player/${course.id}`} className="btn btn-primary">Start Lessons</Link>
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