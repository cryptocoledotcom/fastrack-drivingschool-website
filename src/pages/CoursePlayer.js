import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import YouTube from 'react-youtube';
import { db } from "../Firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  setDoc,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";

const findFirstUncompletedLesson = (modules, completedLessons) => {
  for (const module of modules) {
    for (const lessonId of module.lessonOrder) {
      if (!completedLessons.has(lessonId)) {
        return lessonId;
      }
    }
  }
  return null;
};

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [userCourseId, setUserCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const intervalRef = useRef(null);

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

        // 2. Fetch all modules for this course
        const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', courseId));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort modules based on the course's moduleOrder array
        const sortedModules = modulesData.sort((a, b) => {
            return courseSnap.data().moduleOrder.indexOf(a.id) - courseSnap.data().moduleOrder.indexOf(b.id);
        });
        setModules(sortedModules);

        // 3. Fetch all lessons for this course
        if (sortedModules.length > 0) {
            const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', courseId));
            const lessonsSnapshot = await getDocs(lessonsQuery);
            const lessonsData = {};
            lessonsSnapshot.docs.forEach(doc => {
                lessonsData[doc.id] = { id: doc.id, ...doc.data() };
            });
            setLessons(lessonsData);
        } else {
            setLessons({});
        }

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
    if (Object.keys(lessons).length === 0) return;

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessonOrder.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    const firstUncompletedId = findFirstUncompletedLesson(modules, completedLessons);
    
    setCourseCompleted(false); // Ensure it's false if course is not complete
    const nextLessonId = firstUncompletedId || modules[0]?.lessonOrder[0];
    const nextLesson = lessons[nextLessonId] || null;

    setCurrentLesson(nextLesson);

    // Reset video watched status when lesson changes
    if (nextLesson) {
        // If the new lesson has no video, it's considered "watched" immediately.
        if (!nextLesson.videoUrl) {
            setIsVideoWatched(true);
        } else {
            setIsVideoWatched(false);
        }
    }

    // Cleanup interval on lesson change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

  }, [modules, lessons, completedLessons]);

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

      // The onSnapshot listener will automatically update the completedLessons state,
      // so we don't need to set it manually here.
    } catch (err) {
      console.error("Error saving progress:", err);
      setError("Could not save your progress. Please try again.");
    }
  };

  const onPlayerStateChange = (event) => {
    const player = event.target;

    // Clear any existing interval when state changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (event.data === window.YT.PlayerState.PLAYING) {
      // If video is playing, start checking the time
      intervalRef.current = setInterval(() => {
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        if (duration > 0 && duration - currentTime <= 3) {
          setIsVideoWatched(true);
          clearInterval(intervalRef.current);
        }
      }, 1000);
    }

    if (event.data === window.YT.PlayerState.ENDED) {
      // If video ends, mark as watched and clear interval
      setIsVideoWatched(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
      <div className="sidebar">
        <h1>{course?.title}</h1>
        {modules.map(module => (
            <div key={module.id} className="module-section">
                <h3>{module.title}</h3>
                <ul>
                    {module.lessonOrder.map(lessonId => {
                        const lesson = lessons[lessonId];
                        if (!lesson) return null;
                        const isCompleted = completedLessons.has(lessonId);
                        const isActive = currentLesson?.id === lessonId;
                        return (
                            <li 
                                key={lesson.id} 
                                className={`${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => setCurrentLesson(lesson)}
                            >
                                <span className="lesson-status-icon">
                                    <span className="icon-box">☐</span>
                                    <span className="icon-check">✓</span>
                                </span>
                                <span className="lesson-title">{lesson.title}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        ))}
      </div>

      <main className="main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : currentLesson ? (
          <div>
            <h2>{currentLesson.title}</h2>
            <div className="video-player-wrapper">
              {currentLesson.videoUrl ? (
                <YouTube
                  videoId={currentLesson.videoUrl}
                  className="video-player" // Ensure this class makes it responsive
                  opts={{ 
                    width: '100%', 
                    height: '100%',
                  }}
                  onStateChange={onPlayerStateChange}
                  title={currentLesson.title}
                />
              ) : (
                <div className="video-placeholder">
                  No video for this lesson.
                </div>
              )}
            </div>
            <div className="lesson-description-box">
              <p>
                {currentLesson.content || "No description available."}
              </p>
            </div>
            <div className="lesson-actions">
              {!completedLessons.has(currentLesson.id) && (
                <button 
                    onClick={handleCompleteLesson} 
                    className="btn btn-primary" 
                    disabled={!isVideoWatched}
                    title={!isVideoWatched ? "You must finish the lesson before you can continue." : ""}
                >
                  {isVideoWatched ? 'Mark as Complete' : 'Finish the video to continue'}
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
}

export default CoursePlayer;