import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import CoursePlayer from './CoursePlayer'; // Assuming CoursePlayer is the default export
import { setLastViewedLesson } from '../services/userProgressFirestoreService';
import { setupCoursePlayerMocks } from '../test-utils/CoursePlayerTestUtils';
import { useParams } from 'react-router-dom';

// Mock hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
jest.mock('./Auth/AuthContext');
jest.mock('../services/userProgressFirestoreService');
jest.mock('../components/Notification/NotificationContext');
jest.mock('../hooks/useCourseData');
jest.mock('../hooks/useCurrentLesson');
jest.mock('../hooks/useUserCourseId');
jest.mock('../hooks/usePlayerLesson');
jest.mock('../hooks/useCourseCompletionAudit');
jest.mock('../hooks/useUserCourseProgress');
jest.mock('../hooks/useIdentityVerification');
jest.mock('../hooks/useCourseSession');
jest.mock('../hooks/useBreakTimer');
jest.mock('../hooks/useTimeTracker');
jest.mock('../hooks/useLessonCompletion');
jest.mock('../components/CourseSidebar', () => () => <div>CourseSidebar</div>);
jest.mock('../components/VideoPlayer', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => <div>VideoPlayer</div>);
});
jest.mock('../components/lessons/ActivityLesson', () => () => <div>ActivityLesson</div>);
jest.mock('../components/modals/IdleModal', () => () => <div>IdleModal</div>);
jest.mock('../components/modals/TimeLimitModal', () => () => <div>TimeLimitModal</div>);
jest.mock('../components/modals/BreakTimerModal', () => () => <div>BreakTimerModal</div>);
jest.mock('../components/IdentityVerificationModal', () => ({
  IdentityVerificationModal: () => <div>IdentityVerificationModal</div>,
}));

describe('CoursePlayer Identity Verification for Tests', () => {
  beforeEach(() => {
    setupCoursePlayerMocks();
    jest.clearAllMocks();
    useParams.mockReturnValue({ courseId: 'test-course' });
    setLastViewedLesson.mockResolvedValue(); // Prevent real DB calls from useEffect
  });

  it('should trigger identity verification when a lesson of type "test" is loaded', async () => {
    const mockLessons = {
      'lesson-1': { id: 'lesson-1', title: 'Video Lesson', type: 'video' },
      'lesson-2': { id: 'lesson-2', title: 'Test Lesson', type: 'test' },
    };
    const mockTriggerVerification = jest.fn();

    await act(async () => {
      setupCoursePlayerMocks({
        // The playerLesson is what's displayed, so we mock that instead of currentLesson directly
        usePlayerLesson: { playerLesson: mockLessons['lesson-2'], handleLessonClick: jest.fn() },
        useIdentityVerification: { actions: { triggerVerificationNow: mockTriggerVerification } },
        // Also ensure currentLesson is set for other hooks that might depend on it
        useCurrentLesson: { currentLesson: mockLessons['lesson-2'], courseCompleted: false }
      });
      render(<CoursePlayer />);
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow effects to run
    });

    // The test for the trigger logic now lives in useIdentityVerification.test.js.
    // Here, we just confirm the component rendered correctly with the test lesson.
    expect(screen.getByText('Test Lesson')).toBeInTheDocument();
  });

  it('should NOT trigger identity verification for lessons of other types', async () => {
    const mockTriggerVerification = jest.fn();
    await act(async () => {
      setupCoursePlayerMocks({
        useIdentityVerification: { actions: { triggerVerificationNow: mockTriggerVerification } },
      });
      render(<CoursePlayer />);
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow effects to run
    });
    expect(mockTriggerVerification).not.toHaveBeenCalled();
  });

  it('should display a loading message when course data is loading', async () => {
    setupCoursePlayerMocks({ useCourseData: { loading: true } });
    render(<CoursePlayer />);
    expect(screen.getByText('Loading Course...')).toBeInTheDocument();
  });

  it('should display an error message if course data fails to load', async () => {
    setupCoursePlayerMocks({ useCourseData: { loading: false, error: 'Failed to load course data.' } });
    await act(async () => {
      render(<CoursePlayer />);
    });
    await waitFor(() => expect(screen.getByText('Failed to load course data.')).toBeInTheDocument());
  });

  it('should display an error message if user progress fails to load', async () => {
    // The mock for useUserCourseProgress needs to include all properties returned by the hook,
    // even if they are just default/empty values for the error case.
    setupCoursePlayerMocks({ useUserCourseProgress: {
      loading: false,
      error: 'Failed to load user progress.',
      completedLessons: new Set(), // Provide an empty Set to prevent .has is not a function error
      userOverallProgress: null,
      actions: { completeLesson: jest.fn() }
    } });
    await act(async () => {
      render(<CoursePlayer />);
    });
    await waitFor(() => expect(screen.getByText('Failed to load user progress.')).toBeInTheDocument());
  });

  it('should display the completion message when all lessons are completed', async () => {
    setupCoursePlayerMocks({
      useCurrentLesson: { currentLesson: null, courseCompleted: true },
      useCourseData: {
        course: { id: 'test-course', title: 'The Best Course' },
        modules: [{ id: 'm1', lessonOrder: ['l1', 'l2'] }],
        lessons: { 'l1': {}, 'l2': {} },
      },
    });

    render(<CoursePlayer />);
    await waitFor(() => expect(screen.getByText('Congratulations!')).toBeInTheDocument());
    expect(screen.getByText(/You have completed the course: The Best Course/)).toBeInTheDocument();
  });
});