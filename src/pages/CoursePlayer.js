import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "./Auth/AuthContext";
import "./CoursePlayer.css";
import { setLastViewedLesson } from "../services/userProgressFirestoreService";
import { useTimeTracker } from '../hooks/useTimeTracker';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useCourseData } from '../hooks/useCourseData'; // Import the new hook
import { useBreakTimer } from '../hooks/useBreakTimer'; // Import the break timer hook
import { useUserCourseId } from '../hooks/useUserCourseId'; // Import the new hook
import { useUserCourseProgress } from '../hooks/useUserCourseProgress'; // Import the new progress hook
import { useCurrentLesson } from '../hooks/useCurrentLesson'; // Import the new hook
import { IdentityVerificationModal } from '../components/IdentityVerificationModal';
import { useCourseCompletionAudit } from '../hooks/useCourseCompletionAudit';
import { usePlayerLesson } from '../hooks/usePlayerLesson';
import { useLessonCompletion } from '../hooks/useLessonCompletion';
import VideoPlayer from '../components/VideoPlayer';
import CourseSidebar from '../components/CourseSidebar';
import ActivityLesson from '../components/lessons/ActivityLesson'; // Import the new component
import IdleModal from '../components/modals/IdleModal';
import TimeLimitModal from '../components/modals/TimeLimitModal';
import BreakTimerModal from '../components/modals/BreakTimerModal'; // Import the renamed break modal
import { useCourseSession } from '../hooks/useCourseSession'; // Import the new session hook
import { usePlayerEffects } from '../hooks/usePlayerEffects';

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user, logout } = useAuth();
  const { course, modules, lessons, loading: courseLoading, error: courseError } = useCourseData(courseId); 
  const { loading: userCourseIdLoading, error: userCourseIdError } = useUserCourseId(user, courseId);
  const { userOverallProgress, completedLessons, loading: progressLoading, error: progressError, actions } = useUserCourseProgress(user);
  const { currentLesson, courseCompleted } = useCurrentLesson({
    courseLoading, progressLoading, modules, lessons,
    userOverallProgress, completedLessons, courseId
  });
  const { playerLesson, handleLessonClick } = usePlayerLesson(currentLesson, lessons);
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
  const { handlePlay, handlePause } = useTimeTracker(user, currentLesson, isTimeLimitReached, completedLessons, playerRef);

  // --- Course Completion Audit Hook ---
  useCourseCompletionAudit({
    courseCompleted,
    user,
    course,
    userOverallProgress,
  });

  // --- Player Effects Hook ---
  usePlayerEffects({
    playerRef,
    isOnBreak,
    isTimeLimitReached,
    isVerificationModalOpen,
    isIdleModalOpen: isIdle,
    isBreakModalOpen,
  });

  useEffect(() => {
    if (user && courseId && currentLesson && !completedLessons.has(currentLesson.id)) {
      setLastViewedLesson(user.uid, courseId, currentLesson.id);
    }
  }, [user, courseId, currentLesson, completedLessons]);

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

  return (
    <div className="course-player-container">
      <CourseSidebar
        course={course}
        modules={modules}
        lessons={lessons}
        completedLessons={completedLessons}
        currentLesson={playerLesson}
        onLessonClick={handleLessonClick}
      />

      <main className="main-content">
        {courseCompleted ? (
          <div className="no-lesson-selected">
            <h2>Congratulations!</h2>
            <p>You have completed the course: {course?.title}</p>
          </div>
        ) : playerLesson ? (
          <div>
            <h2>{playerLesson.title}</h2>
            {playerLesson.type === 'activity' ? (
              <ActivityLesson 
                lesson={currentLesson}
                user={user}
                onComplete={handleCompleteLesson}
              />
            ) : (
              <>
                <VideoPlayer
                  ref={playerRef}
                  lesson={playerLesson}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  user={user}
                  onAllVideosWatched={onAllVideosWatched}
                  userOverallProgress={userOverallProgress}
                  completedLessons={completedLessons}
                />
                <div className="lesson-description-box">
                  <p>{playerLesson.content || "No description available."}</p>
                </div>
                <div className="lesson-actions">
                  {!completedLessons.has(playerLesson.id) && (
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
