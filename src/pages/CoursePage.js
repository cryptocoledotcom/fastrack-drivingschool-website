import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../Firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  where,
  setDoc,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePage.css";

const findNextLesson = (modules, currentLessonId) => {
  let foundCurrent = false;
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (foundCurrent) {
        return lesson;
      }
      if (lesson.id === currentLessonId) {
        foundCurrent = true;
      }
    }
  }
  return null;
};

const findFirstUncompletedLesson = (modules, completedLessons) => {
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (!completedLessons.has(lesson.id)) {
        return lesson;
      }
    }
  }
  return null;
};

const CoursePage = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [userCourseId, setUserCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseCompleted, setCourseCompleted] = useState(false);

  // Find the specific "courses" document for this user and course
  useEffect(() => {
    const findUserCourse = async () => {
      if (!user || !courseId) return;

      const userCoursesRef = collection(db, "users", user.uid, "courses");
      // Query using the courseId string instead of a document reference
      const q = query(userCoursesRef, where("courseId", "==", courseId), limit(1));

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userCourseDoc = querySnapshot.docs[0];
        setUserCourseId(userCourseDoc.id);
      } else {
        setError("You do not have access to this course.");
        setLoading(false);
      }
    };
    findUserCourse();
  }, [user, courseId]);

  // Fetch all course content
  useEffect(() => {
    if (!user || !userCourseId) return;

    const fetchCourseContent = async () => {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch the main course document
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) throw new Error("Course not found.");
        setCourse({ id: courseSnap.id, ...courseSnap.data() });

        // 2. Fetch modules and their lessons
        const modulesRef = collection(db, "courses", courseId, "modules");
        const qModules = query(modulesRef, orderBy("order"));
        const modulesSnapshot = await getDocs(qModules);

        const modulesList = await Promise.all(
          modulesSnapshot.docs.map(async (moduleDoc) => {
            const lessonsRef = collection(moduleDoc.ref, "lessons");
            const qLessons = query(lessonsRef, orderBy("order"));
            const lessonsSnapshot = await getDocs(qLessons);
            const lessonsList = lessonsSnapshot.docs.map((lessonDoc) => ({
              id: lessonDoc.id,
              ...lessonDoc.data(),
            }));
            return { id: moduleDoc.id, ...moduleDoc.data(), lessons: lessonsList };
          })
        );
        setModules(modulesList);
      } catch (err) {
        console.error("Error fetching course content:", err);
        setError(
          "Failed to load course content. Please check the course ID and your Firestore structure."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourseContent();
  }, [courseId, user, userCourseId]);

  // Listen for completed lessons changes
  useEffect(() => {
    if (!user || !userCourseId) return;

    const progressRef = collection(
      db,
      "users",
      user.uid,
      "courses",
      userCourseId,
      "completed_lessons"
    );
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const completedIds = new Set(snapshot.docs.map((doc) => doc.id));
      setCompletedLessons(completedIds);
    });

    return () => {
      unsubscribe();
    };
  }, [user, userCourseId]);

  // Set the current lesson or show completion message
  useEffect(() => {
    if (modules.length === 0) return;

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    const firstUncompleted = findFirstUncompletedLesson(
      modules,
      completedLessons
    );
    
    setCourseCompleted(false); // Ensure it's false if course is not complete
    setCurrentLesson(
      firstUncompleted ||
        (modules.length > 0 && modules[0].lessons.length > 0
          ? modules[0].lessons[0]
          : null)
    );
  }, [modules, completedLessons]);

  const handleCompleteLesson = async () => {
    if (!user || !userCourseId || !currentLesson) return;

    try {
      const progressDocRef = doc(
        db,
        "users",
        user.uid,
        "courses",
        userCourseId,
        "completed_lessons",
        currentLesson.id
      );
      await setDoc(progressDocRef, { completedAt: new Date() });

      const newCompleted = new Set(completedLessons).add(currentLesson.id);
      setCompletedLessons(newCompleted);

      // Auto-advance to the next lesson
      const nextLesson = findNextLesson(modules, currentLesson.id);

      if (nextLesson) {
        setCurrentLesson(nextLesson);
      } else {
        setCourseCompleted(true);
        setCurrentLesson(null);
      }
    } catch (err) {
      console.error("Error saving progress:", err);
      setError("Could not save your progress. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading-container">Loading Course...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="course-player-container">
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
                  {module.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      onClick={() => setCurrentLesson(lesson)}
                      className={`lesson-item ${ 
                        currentLesson?.id === lesson.id ? "active" : ""
                      } ${completedLessons.has(lesson.id) ? "completed" : ""}`}
                    >
                      <span className="lesson-status-icon">
                        {completedLessons.has(lesson.id) ? "✓" : "●"}
                      </span>
                      {lesson.title}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="course-main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : currentLesson ? (
          <div>
            <h1 className="lesson-title-main">{currentLesson.title}</h1>
            <div className="video-player-wrapper">
              {currentLesson.videoUrl ? (
                <iframe
                  className="video-player"
                  src={`https://www.youtube.com/embed/${currentLesson.videoUrl}`}
                  title={currentLesson.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
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
            <div className="lesson-actions">
              {!completedLessons.has(currentLesson.id) && (
                <button
                  onClick={handleCompleteLesson}
                  className="complete-lesson-btn"
                >
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="no-lesson-selected">
            <p>Loading lesson...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursePage;
