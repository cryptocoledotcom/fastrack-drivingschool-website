import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../Firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePage.css";

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          setCourse(courseDoc.data());
        }
      } catch (error) {
        console.error("Error fetching course:", error);
      }
    };

    const fetchModules = async () => {
      try {
        const modulesCollection = collection(db, "courses", courseId, "modules");
        const modulesSnapshot = await getDocs(modulesCollection);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setModules(modulesData);
      } catch (error) {
        console.error("Error fetching modules:", error);
      }
    };

    const fetchData = async () => {
      await fetchCourse();
      await fetchModules();
      setLoading(false);
    };

    fetchData();
  }, [courseId, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="course-page-container">
      <div className="course-info-section">
        <h2>{course?.title}</h2>
        <p>{course?.description}</p>
        {course?.title === 'Behind the Wheel Driving Course' ? (
          <Link to="/schedule-lesson" className="btn btn-primary">Schedule Driving Lessons</Link>
        ) : null}
      </div>
      {course?.title !== 'Behind the Wheel Driving Course' && (
        <div className="modules-section">
          <h3>Modules</h3>
          <ul style={{ listStyleType: "none", padding: 0 }}>
            {modules.map((module, index) => (
              <li key={module.id}>
                <h4>{module.title}</h4>
                <p>{module.description}</p>
                <button 
                  style={{ 
                    backgroundColor: index === 0 ? "#40E0D0" : "red", 
                    color: "white", 
                    border: "none", 
                    padding: "0.5rem 1rem", 
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                  disabled={index !== 0}
                  title={index !== 0 ? "Complete the previous module with a score of 80% or better to unlock this module." : ""}
                >
                  Start Module
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CoursePage;
