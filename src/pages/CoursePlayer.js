import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { db } from "../Firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";
import { saveLessonPlaybackTime, setLastViewedLesson, addCourseAuditLog } from "../services/userProgressFirestoreService";
import { useTimeTracker } from '../hooks/useTimeTracker';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useNotification } from '../components/Notification/NotificationContext'; // Import useNotification
import { useCourseData } from '../hooks/useCourseData'; // Import the new hook
import { useBreakTimer } from '../hooks/useBreakTimer'; // Import the break timer hook
import { useUserCourseProgress } from '../hooks/useUserCourseProgress'; // Import the new progress hook
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import IdleModal from '../components/modals/IdleModal';
import VideoPlayer from '../components/VideoPlayer';
import CourseSidebar from '../components/CourseSidebar';
import ActivityLesson from '../components/lessons/ActivityLesson'; // Import the new component
import TimeLimitModal from '../components/modals/TimeLimitModal';
import BreakTimerModal from '../components/modals/BreakTimerModal'; // Import the renamed break modal
import { useCourseSession } from '../hooks/useCourseSession'; // Import the new session hook
import { findFirstUncompletedLesson } from '../utils/courseUtils';

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user, logout } = useAuth();
  const { showNotification } = useNotification(); // Get showNotification
  const { course, modules, lessons, loading: courseLoading, error: courseError } = useCourseData(courseId); 
  const { userOverallProgress, completedLessons, loading: progressLoading, error: progressError, actions } = useUserCourseProgress(user);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [userCourseId, setUserCourseId] = useState(null);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [allVideosWatched, setAllVideosWatched] = useState(false);
  const playerRef = useRef(null); // A single ref for the new VideoPlayer component
  const isCourseActive = currentLesson && !completedLessons.has(currentLesson.id);

  // --- START: MANDATORY BREAK HOOK ---
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const { isOnBreak } = useBreakTimer({
    showBreakModal: () => setIsBreakModalOpen(true),
    hideBreakModal: () => setIsBreakModalOpen(false),
  });
  // --- END: MANDATORY BREAK HOOK ---


  // --- Identity Verification Hook ---
  const {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
  } = useIdentityVerification({
    user,
    isCourseActive,
    onVerificationStart: () => playerRef.current?.pause(),
    onVerificationSuccess: () => playerRef.current?.play(),
    onVerificationFail: () => {}, // The modal now handles the logout action
  });
  // --- END: IDENTITY VERIFICATION HOOK ---

  // --- Session Management Hook (Idle & Time Limit) ---
  const { isIdle, isTimeLimitReached, resumeTimeMessage, actions: sessionActions } = useCourseSession(
    user,
    isCourseActive,
    () => {
      // Prevent idle modal if verification modal is already open
      if (!isVerificationModalOpen && !isBreakModalOpen) {
        playerRef.current?.pause();
      }
    }
  );
  // --- END: SESSION MANAGEMENT HOOK ---

  // --- Time Tracking Hook ---
  const { handlePlay, handlePause, saveOnExit } = useTimeTracker(user, currentLesson, isTimeLimitReached, completedLessons, playerRef);

  // Effect to pause the video when a break starts
  useEffect(() => {
    if (isOnBreak) {
      playerRef.current?.pause();
    } else {
      // Optional: auto-play when break ends, if it was playing before.
    }
  }, [isOnBreak]);

  useEffect(() => {
    const findUserCourse = async () => {
      if (!user || !courseId) return;
      const userCoursesRef = collection(db, "users", user.uid, "courses");
      const q = query(userCoursesRef, where("courseId", "==", courseId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserCourseId(querySnapshot.docs[0].id);
      } else {
        // Error will be handled by the main error state
      }
    };
    findUserCourse();
  }, [user, courseId]);

  // Main logic effect to determine the current lesson
  useEffect(() => {
    if (courseLoading || progressLoading || modules.length === 0 || Object.keys(lessons).length === 0 || !userOverallProgress) return;

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
  }, [modules, lessons, completedLessons, courseLoading, progressLoading, user, userOverallProgress, courseId]);

  useEffect(() => {
    // Effect to pause the video if the time limit is reached by the session hook
    if (isTimeLimitReached) {
      playerRef.current?.pause();
    }
  }, [isTimeLimitReached]);

  useEffect(() => {
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson, completedLessons]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        saveOnExit();
        const playbackTime = playerRef.current?.getCurrentTime();
        if (playbackTime) saveLessonPlaybackTime(user.uid, currentLesson.id, playbackTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit]);

  useEffect(() => {
    if (courseCompleted && user && course) {
      // The userOverallProgress is already available from our hook
      let totalTimeSeconds = 0;
      if (userOverallProgress && userOverallProgress.lessons) {
        totalTimeSeconds = Object.values(userOverallProgress.lessons).reduce((acc, lesson) => acc + (lesson.timeSpentSeconds || 0), 0);
      }
      addCourseAuditLog(user.uid, course.id, totalTimeSeconds)
        .catch(err => console.error("Error generating audit log:", err));
    }
  }, [courseCompleted, user, course, userOverallProgress]);

  const handleCompleteLesson = async () => {
    if (!user || !currentLesson) return;
    try {
      // Call the single, clean action from the hook
      await actions.completeLesson(currentLesson.id, courseId);
    } catch (err) {
      console.error("Error saving progress:", err);
      showNotification("Could not save your progress. Please try again.", "error"); // Use showNotification
    }
  };

  if (courseLoading || progressLoading || !userCourseId) {
    return <div className="loading-container">Loading Course...</div>;
  }

  if (courseError) {
    return <div className="error-container">{courseError}</div>;
  }

  if (progressError) {
    return <div className="error-container">{progressError}</div>;
  }

  const handleIdleConfirm = () => {
    sessionActions.confirmNotIdle();
    playerRef.current?.play();
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
            {currentLesson.type === 'activity' ? (
              <ActivityLesson 
                lesson={currentLesson}
                user={user}
                onComplete={handleCompleteLesson}
              />
            ) : (
              <>
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
                  <p>{currentLesson.content || "No description available."}</p>
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
              </>
            )}
          </div>
        ) : (
          <div className="no-lesson-selected">
            <p>Loading lesson...</p>
          </div>
        )}
      </main>
      <IdleModal 
        isOpen={isIdle}
        onConfirm={handleIdleConfirm}
      />
      <TimeLimitModal 
        isOpen={isTimeLimitReached}
        onClose={sessionActions.closeTimeLimitModal}
        message={resumeTimeMessage}
      />
      <BreakTimerModal
        isOpen={isBreakModalOpen}
      />
      <IdentityVerificationModal
        isOpen={isVerificationModalOpen}
        question={verificationQuestion?.question || ''}
        onSubmit={handleVerificationSubmit}
        error={verificationError}
        attemptsLeft={verificationAttempts}
        onAcknowledgeLogout={logout}
      />
    </div>
  );
}

export default CoursePlayer;
