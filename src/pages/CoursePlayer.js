import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";
import { saveLessonPlaybackTime, setLastViewedLesson, addCourseAuditLog } from "../services/userProgressFirestoreService";
import { useTimeTracker } from '../hooks/useTimeTracker';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useNotification } from '../components/Notification/NotificationContext'; // Import useNotification
import { useCourseData } from '../hooks/useCourseData'; // Import the new hook
import { useBreakTimer } from '../hooks/useBreakTimer'; // Import the break timer hook
import { useUserCourseId } from '../hooks/useUserCourseId'; // Import the new hook
import { useUserCourseProgress } from '../hooks/useUserCourseProgress'; // Import the new progress hook
import { useCurrentLesson } from '../hooks/useCurrentLesson'; // Import the new hook
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import IdleModal from '../components/modals/IdleModal';
import { useLessonCompletion } from '../hooks/useLessonCompletion';
import VideoPlayer from '../components/VideoPlayer';
import CourseSidebar from '../components/CourseSidebar';
import ActivityLesson from '../components/lessons/ActivityLesson'; // Import the new component
import TimeLimitModal from '../components/modals/TimeLimitModal';
import BreakTimerModal from '../components/modals/BreakTimerModal'; // Import the renamed break modal
import { useCourseSession } from '../hooks/useCourseSession'; // Import the new session hook

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user, logout } = useAuth();
  const { showNotification } = useNotification(); // Get showNotification
  const { course, modules, lessons, loading: courseLoading, error: courseError } = useCourseData(courseId); 
  const { userCourseId, loading: userCourseIdLoading, error: userCourseIdError } = useUserCourseId(user, courseId);
  const { userOverallProgress, completedLessons, loading: progressLoading, error: progressError, actions } = useUserCourseProgress(user);
  const { currentLesson, courseCompleted } = useCurrentLesson({
    courseLoading, progressLoading, modules, lessons,
    userOverallProgress, completedLessons, courseId
  });
  // Local state for the player itself
  const [localCurrentLesson, setLocalCurrentLesson] = useState(null);
  const {
    isCompletable,
    handleCompleteLesson,
    onAllVideosWatched,
  } = useLessonCompletion({ user, currentLesson, courseId, progressActions: actions });
  
  const playerRef = useRef(null); // A single ref for the new VideoPlayer component
  const isCourseActive = currentLesson && !completedLessons.has(currentLesson.id);

  // --- START: MANDATORY BREAK HOOK ---
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const { isOnBreak } = useBreakTimer({
    showBreakModal: () => setIsBreakModalOpen(true),
    hideBreakModal: () => {
      setIsBreakModalOpen(false);
      playerRef.current?.play(); // Automatically resume video playback
    },
  });
  // --- END: MANDATORY BREAK HOOK ---


  // --- Identity Verification Hook ---
  const {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
    actions: verificationActions,
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

  // Effect to sync the current lesson from the hook to local state
  useEffect(() => {
    setLocalCurrentLesson(currentLesson);
  }, [currentLesson]);

  useEffect(() => {
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson, completedLessons]);

  // Trigger identity verification when a test starts
  useEffect(() => {
    // Effect to pause the video if the time limit is reached by the session hook
    if (isTimeLimitReached) {
      playerRef.current?.pause();
    }
  }, [isTimeLimitReached]);

  useEffect(() => {
    if (currentLesson?.type === 'test') {
      verificationActions.triggerVerificationNow();
    }
  }, [currentLesson, verificationActions]);

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

  if (courseLoading || progressLoading || userCourseIdLoading) {
    return <div className="loading-container">Loading Course...</div>;
  }

  if (courseError) {
    return <div className="error-container">{courseError}</div>;
  }

  if (progressError) {
    return <div className="error-container">{progressError}</div>;
  }

  if (userCourseIdError) {
    return <div className="error-container">{userCourseIdError}</div>;
  }

  const handleIdleConfirm = () => {
    sessionActions.confirmNotIdle();
    playerRef.current?.play();
  };

  const handleLessonClick = (lessonId) => {
    const newLesson = lessons[lessonId];
    if (newLesson) {
      setLocalCurrentLesson(newLesson);
    }
  };

  return (
    <div className="course-player-container">
      <CourseSidebar
        course={course}
        modules={modules}
        lessons={lessons}
        completedLessons={completedLessons}
        currentLesson={localCurrentLesson}
        onLessonClick={handleLessonClick}
      />

      <main className="main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : localCurrentLesson ? (
          <div>
            <h2>{localCurrentLesson.title}</h2>
            {localCurrentLesson.type === 'activity' ? (
              <ActivityLesson 
                lesson={currentLesson}
                user={user}
                onComplete={handleCompleteLesson}
              />
            ) : (
              <>
                <VideoPlayer
                  ref={playerRef}
                  lesson={localCurrentLesson}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  user={user}
                  onAllVideosWatched={onAllVideosWatched}
                  userOverallProgress={userOverallProgress}
                  completedLessons={completedLessons}
                />
                <div className="lesson-description-box">
                  <p>{localCurrentLesson.content || "No description available."}</p>
                </div>
                <div className="lesson-actions">
                  {!completedLessons.has(localCurrentLesson.id) && (
                    <button 
                        onClick={handleCompleteLesson} 
                        className="btn btn-primary"
                        disabled={!isCompletable}
                        title={!isCompletable ? "You must finish all videos to continue." : ""}
                    >
                      {isCompletable ? 'Mark as Complete' : 'Finish the video(s) to continue'}
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
        onResume={sessionActions.hideBreakModal}
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
