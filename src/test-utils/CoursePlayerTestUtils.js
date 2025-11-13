import { useAuth } from '../pages/Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import { useCourseData } from '../hooks/useCourseData';
import { useCurrentLesson } from '../hooks/useCurrentLesson';
import { useUserCourseId } from '../hooks/useUserCourseId';
import { usePlayerLesson } from '../hooks/usePlayerLesson';
import { useCourseCompletionAudit } from '../hooks/useCourseCompletionAudit';
import { useUserCourseProgress } from '../hooks/useUserCourseProgress';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useCourseSession } from '../hooks/useCourseSession';
import { useBreakTimer } from '../hooks/useBreakTimer';
import { useTimeTracker } from '../hooks/useTimeTracker';
import { useLessonCompletion } from '../hooks/useLessonCompletion';

/**
 * A utility function to set up all the default mocks for the CoursePlayer component.
 * @param {object} options - An object to override default mock return values.
 */
export const setupCoursePlayerMocks = (options = {}) => {
  // Default Mocks
  const defaultMocks = {
    useAuth: { user: { uid: 'test-user' }, logout: jest.fn() },
    useNotification: { showNotification: jest.fn() },
    useCourseData: { course: { id: 'test-course', title: 'Test Course' }, modules: [], lessons: {}, loading: false, error: null },
    useUserCourseId: { userCourseId: 'mock-user-course-id', loading: false, error: null },
    useUserCourseProgress: { completedLessons: new Set(), loading: false, error: null, userOverallProgress: {}, actions: { completeLesson: jest.fn() } },
    useCurrentLesson: { currentLesson: { id: 'l1', title: 'Lesson 1', type: 'video' }, courseCompleted: false },
    // The playerLesson should also default to the currentLesson for consistency
    usePlayerLesson: {
      playerLesson: options.useCurrentLesson?.currentLesson || { id: 'l1', title: 'Lesson 1', type: 'video' },
      handleLessonClick: jest.fn()
    },
    useLessonCompletion: { isCompletable: false, handleCompleteLesson: jest.fn(), onAllVideosWatched: jest.fn() },
    useBreakTimer: { isOnBreak: false },
    useIdentityVerification: { isVerificationModalOpen: false, actions: { triggerVerificationNow: jest.fn() } },
    useCourseSession: { isIdle: false, isTimeLimitReached: false, resumeTimeMessage: '', actions: { confirmNotIdle: jest.fn(), closeTimeLimitModal: jest.fn() } },
    useTimeTracker: { handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() },
    useCourseCompletionAudit: undefined, // This hook has no return value
  };

  // Apply mocks
  useAuth.mockReturnValue(options.useAuth || defaultMocks.useAuth);
  useNotification.mockReturnValue(options.useNotification || defaultMocks.useNotification);
  useCourseData.mockReturnValue(options.useCourseData || defaultMocks.useCourseData);
  useUserCourseId.mockReturnValue(options.useUserCourseId || defaultMocks.useUserCourseId);
  useUserCourseProgress.mockReturnValue(options.useUserCourseProgress || defaultMocks.useUserCourseProgress);
  useCurrentLesson.mockReturnValue(options.useCurrentLesson || defaultMocks.useCurrentLesson);
  usePlayerLesson.mockReturnValue(options.usePlayerLesson || defaultMocks.usePlayerLesson);
  useLessonCompletion.mockReturnValue(options.useLessonCompletion || defaultMocks.useLessonCompletion);
  useBreakTimer.mockReturnValue(options.useBreakTimer || defaultMocks.useBreakTimer);
  useIdentityVerification.mockReturnValue(options.useIdentityVerification || defaultMocks.useIdentityVerification);
  useCourseSession.mockReturnValue(options.useCourseSession || defaultMocks.useCourseSession);
  useTimeTracker.mockReturnValue(options.useTimeTracker || defaultMocks.useTimeTracker);
  useCourseCompletionAudit.mockReturnValue(options.useCourseCompletionAudit || defaultMocks.useCourseCompletionAudit);
};