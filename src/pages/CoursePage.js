import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../Firebase.js"; // Corrected import path
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext.js"; // Corrected import path
import "./CoursePage.css"; // Corrected import path

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCourseContent = async () => {
      if (!user) return;
      setLoading(true);
      setError('');
      
      try {
        // 1. Fetch the main course document
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
          throw new Error("Course not found.");
        }
        setCourse({ id: courseSnap.id, ...courseSnap.data() });

        // 2. Fetch the modules and their lessons
        const modulesRef = collection(db, "courses", courseId, "modules");
        const qModules = query(modulesRef, orderBy("order"));
        const modulesSnapshot = await getDocs(qModules);

        const modulesList = await Promise.all(modulesSnapshot.docs.map(async (moduleDoc) => {
            const lessonsRef = collection(moduleDoc.ref, 'lessons');
            const qLessons = query(lessonsRef, orderBy('order'));
            const lessonsSnapshot = await getDocs(qLessons);
            const lessonsList = lessonsSnapshot.docs.map(lessonDoc => ({
                id: lessonDoc.id,
                ...lessonDoc.data()
            }));
            return { id: moduleDoc.id, ...moduleDoc.data(), lessons: lessonsList };
        }));

        setModules(modulesList);

        // 3. Set the first lesson as the current lesson by default
        if (modulesList.length > 0 && modulesList[0].lessons.length > 0) {
            setCurrentLesson(modulesList[0].lessons[0]);
        }

      } catch (err) {
        console.error("Error fetching course content:", err);
        setError("Failed to load course content. Please check the course ID and your Firestore structure.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseContent();
  }, [courseId, user]);

  if (loading) {
    return <div className="loading-container">Loading Course...</div>;
  }

  if (error) {
      return <div className="error-container">{error}</div>;
  }

  return (
    <div className="course-player-container">
        {/* Sidebar */}
        <aside className="course-sidebar">
            <div className="sidebar-header">
                <h2 className="course-title">{course?.title}</h2>
            </div>
            <nav className="module-nav">
                <ul>
                    {modules.map((module) => (
                        <li key={module.id} className="module-item">
                            <div className="module-title">{module.title}</div>
                            <ul className="lesson-list">
                                {module.lessons.map(lesson => (
                                    <li 
                                        key={lesson.id}
                                        onClick={() => setCurrentLesson(lesson)}
                                        className={`lesson-item ${currentLesson?.id === lesson.id ? 'active' : ''}`}
                                    >
                                        {lesson.title}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>

        {/* Main Content */}
        <main className="course-main-content">
            {currentLesson ? (
                <div>
                    <h1 className="lesson-title-main">{currentLesson.title}</h1>
                    <div className="video-player-wrapper">
                       {/* A real implementation would use a video player like ReactPlayer */}
                       {currentLesson.videoUrl ? (
                            <iframe 
                                className="video-player"
                                src={`https://www.youtube.com/embed/${currentLesson.videoUrl}`} // Example for YouTube
                                title={currentLesson.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen>
                            </iframe>
                       ) : (
                            <div className="video-placeholder">
                                No video for this lesson.
                            </div>
                       )}
                    </div>
                    <div className="lesson-description-box">
                        <h3 className="lesson-description-title">Lesson Details</h3>
                        <p className="lesson-description-text">
                            {currentLesson.description || "No description available."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="no-lesson-selected">
                    <p>Select a lesson to begin.</p>
                </div>
            )}
        </main>
    </div>
  );
};

export default CoursePage;
