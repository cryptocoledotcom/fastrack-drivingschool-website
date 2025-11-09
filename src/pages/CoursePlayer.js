import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { db } from "../Firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  limit,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";
import { getUserProgress, updateActivityProgress, saveLessonPlaybackTime, setLastViewedLesson, initializeLesson, clearLastViewedLesson, addCourseAuditLog, getTimeSpentToday } from "../services/userProgressFirestoreService";
import { useIdleTimer } from '../hooks/useIdleTimer';
import { useTimeTracker } from '../hooks/useTimeTracker';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import IdleModal from '../components/modals/IdleModal';
import VideoPlayer from '../components/VideoPlayer';
import CourseSidebar from '../components/CourseSidebar';
import TimeLimitModal from '../components/modals/TimeLimitModal';

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
  const [userOverallProgress, setUserOverallProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastPlaybackTimeRef = useRef(0);
  const [error, setError] = useState("");
  const [isTimeLimitReached, setIsTimeLimitReached] = useState(false);
  const [resumeTimeMessage, setResumeTimeMessage] = useState('');
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [allVideosWatched, setAllVideosWatched] = useState(false);
  const playerRef = useRef(null); // A single ref for the new VideoPlayer component

  // --- START: IDENTITY VERIFICATION HOOK ---
  const {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
  } = useIdentityVerification({
    user,
    currentLesson,
    completedLessons,
    onVerificationStart: () => playerRef.current?.pause(),
    onVerificationSuccess: () => playerRef.current?.play(),
    // onVerificationFail: () => logout(), // We can wire this up later
  });
  // --- END: IDENTITY VERIFICATION HOOK ---

  // --- START: TIME TRACKING & IDLE LOGIC ---
  const { handlePlay, handlePause, saveOnExit } = useTimeTracker(user, currentLesson, isTimeLimitReached, completedLessons, playerRef);
  const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);

  const handleIdle = useCallback(() => {
    // Prevent idle modal if verification modal is already open
    if (!isIdleModalOpen && !isTimeLimitReached && !isVerificationModalOpen) {
      playerRef.current?.pause();
      setIsIdleModalOpen(true);
    }
  }, [isIdleModalOpen, isTimeLimitReached, isVerificationModalOpen]);

  useIdleTimer(handleIdle, 5 * 60 * 1000);
  // --- END: TIME TRACKING & IDLE LOGIC ---

  useEffect(() => {
    const findUserCourse = async () => {
      if (!user || !courseId) return;
      const userCoursesRef = collection(db, "users", user.uid, "courses");
      const q = query(userCoursesRef, where("courseId", "==", courseId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserCourseId(querySnapshot.docs[0].id);
      } else {
        setError("You do not have access to this course.");
        setLoading(false);
      }
    };
    findUserCourse();
  }, [user, courseId]);

  const fetchProgress = useCallback(async () => {
    if (!user || !userCourseId) return;
    try {
      const progress = await getUserProgress(user.uid);
      setUserOverallProgress(progress);
      if (progress && progress.lessons) {
        const completedLessonIds = Object.keys(progress.lessons).filter(lessonId => progress.lessons[lessonId].completed);
        setCompletedLessons(new Set(completedLessonIds));
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
      setError("Failed to load your learning progress.");
    }
  }, [user, userCourseId]);

  useEffect(() => {
    if (!user || !userCourseId) return;
    const fetchCourseContent = async () => {
      setLoading(true);
      setError("");
      try {
        const courseRef = doc(db, "courses", courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) throw new Error("Course not found.");
        const courseData = courseSnap.data();
        setCourse({ id: courseSnap.id, ...courseData });

        const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', courseId));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedModules = modulesData.sort((a, b) => courseData.moduleOrder.indexOf(a.id) - courseData.moduleOrder.indexOf(b.id));
        setModules(sortedModules);

        const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', courseId));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonsData = {};
        lessonsSnapshot.docs.forEach(doc => {
          lessonsData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setLessons(lessonsData);
      } catch (err) {
        console.error("Error fetching course content:", err);
        setError("Failed to load course content.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourseContent();
  }, [courseId, user, userCourseId]);

  useEffect(() => {
    fetchProgress();

    // Add a 'focus' event listener to refetch data when the user returns to this tab.
    // This ensures that if they update their profile in another tab, the changes
    // are reflected here, fixing the stale data issue.
    const handleFocus = () => {
      fetchProgress();
    };

    window.addEventListener('focus', handleFocus);

    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchProgress]);

  // Effect to handle saving progress when the user closes the tab/browser
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This logic runs just before the page is unloaded. It must be synchronous.
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        saveOnExit(); // Save any pending active time
        const playbackTime = playerRef.current?.getCurrentTime();
        if (playbackTime) saveLessonPlaybackTime(user.uid, currentLesson.id, playbackTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit]);

  // Main logic effect to determine the current lesson
  useEffect(() => {
    if (loading || modules.length === 0 || Object.keys(lessons).length === 0 || !userOverallProgress) return;

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessonOrder.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    const lastViewedLessonId = userOverallProgress.lastViewedLesson?.[courseId];
    const nextLessonId = (lastViewedLessonId && lessons[lastViewedLessonId]) 
      ? lastViewedLessonId 
      : findFirstUncompletedLesson(modules, completedLessons) || modules[0]?.lessonOrder[0];
    
    if (nextLessonId && lessons[nextLessonId]) {
      setCurrentLesson({ ...lessons[nextLessonId] });
    } else {
      setCurrentLesson(null);
    }
  }, [modules, lessons, completedLessons, loading, user, userOverallProgress, courseId]);

  useEffect(() => {
    if (!user || !currentLesson || completedLessons.has(currentLesson.id)) {
      return;
    }
    const checkDailyTimeLimit = async () => {
      const totalTimeTodaySeconds = await getTimeSpentToday(user.uid);
      const FOUR_HOURS_IN_SECONDS = 4 * 60 * 60;
      if (totalTimeTodaySeconds >= FOUR_HOURS_IN_SECONDS) {
        setIsTimeLimitReached(true);
        const now = new Date();
        const nextLearningDay = new Date(now);
        if (now.getHours() >= 12) {
          nextLearningDay.setDate(now.getDate() + 1);
        }
        nextLearningDay.setHours(12, 0, 0, 0);
        setResumeTimeMessage(`You have completed the state maximum of 4 hours per 24-hour block. You may continue your next learning journey after ${nextLearningDay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${nextLearningDay.toLocaleDateString()}.`);
        
        // Pause both types of videos if the time limit is reached
        playerRef.current?.pause();
      } else {
        setIsTimeLimitReached(false);
        setResumeTimeMessage('');
      }
    };
    checkDailyTimeLimit();
    const interval = setInterval(checkDailyTimeLimit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, currentLesson, completedLessons]);

  useEffect(() => {
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson, completedLessons]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use lastPlaybackTimeRef for synchronous exit events as videoRef.current might be null
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        saveOnExit();
        saveLessonPlaybackTime(user.uid, currentLesson.id, lastPlaybackTimeRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit]);

  useEffect(() => {
    if (courseCompleted && user && course) {
      const fetchTotalTimeAndLog = async () => {
        try {
          const progress = await getUserProgress(user.uid);
          let totalTimeSeconds = 0;
          if (progress && progress.lessons) {
            for (const lessonId in progress.lessons) {
              if (progress.lessons[lessonId].timeSpentSeconds) {
                totalTimeSeconds += progress.lessons[lessonId].timeSpentSeconds;
              }
            }
          }
          await addCourseAuditLog(user.uid, course.id, totalTimeSeconds);
        } catch (err) {
          console.error("Error generating audit log:", err);
        }
      };
      fetchTotalTimeAndLog();
    }
  }, [courseCompleted, user, course]);

  const handleCompleteLesson = async () => {
    if (!user || !currentLesson) return;
    try {
      await updateActivityProgress(user.uid, 'lessons', currentLesson.id, { completed: true });
      await clearLastViewedLesson(user.uid, courseId);
      setUserOverallProgress(prev => {
        const newProgress = { ...prev };
        if (newProgress.lastViewedLesson) delete newProgress.lastViewedLesson[courseId];
        return newProgress;
      });
      setCompletedLessons(prev => new Set(prev).add(currentLesson.id));
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

  const handleIdleConfirm = () => {
    setIsIdleModalOpen(false);
    // Resume both types of videos
    playerRef.current?.play();
  };

  const handleTimeLimitClose = () => {
    setIsTimeLimitReached(false);
  };

  const handleLessonClick = (lessonId) => {
    const newLesson = lessons[lessonId];
    if (newLesson) {
      setCurrentLesson(newLesson);
      setAllVideosWatched(false); // Reset watch status for the new lesson
    }
  };

  return (
    <div className="course-player-container">
      <CourseSidebar
        course={course}
        modules={modules}
        lessons={lessons}
        completedLessons={completedLessons}
        currentLesson={currentLesson}
        onLessonClick={handleLessonClick}
      />

      <main className="main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : currentLesson ? (
          <div>
            <h2>{currentLesson.title}</h2>
            <VideoPlayer
              ref={playerRef}
              lesson={currentLesson}
              onPlay={handlePlay}
              onPause={handlePause}
              user={user}
              onAllVideosWatched={setAllVideosWatched}
              userOverallProgress={userOverallProgress}
              completedLessons={completedLessons}
            />
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
                    disabled={!allVideosWatched}
                    title={!allVideosWatched ? "You must finish all videos to continue." : ""}
                >
                  {allVideosWatched ? 'Mark as Complete' : 'Finish the video(s) to continue'}
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
      <IdleModal 
        isOpen={isIdleModalOpen}
        onConfirm={handleIdleConfirm}
      />
      <TimeLimitModal 
        isOpen={isTimeLimitReached}
        onClose={handleTimeLimitClose}
        message={resumeTimeMessage}
      />
      <IdentityVerificationModal
        isOpen={isVerificationModalOpen}
        question={verificationQuestion.question}
        onSubmit={handleVerificationSubmit}
        error={verificationError}
        attemptsLeft={verificationAttempts}
      />
    </div>
  );
}

export default CoursePlayer;
