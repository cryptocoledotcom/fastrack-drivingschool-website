import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import CoursePlayer from './CoursePlayer'; // Assuming CoursePlayer is the default export
import { useParams } from 'react-router-dom';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import { useCourseData } from '../hooks/useCourseData';
import { useUserCourseProgress } from '../hooks/useUserCourseProgress';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useCourseSession } from '../hooks/useCourseSession';
import { getDocs } from 'firebase/firestore';
import { useBreakTimer } from '../hooks/useBreakTimer';
import { useTimeTracker } from '../hooks/useTimeTracker';

// Mock hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));
jest.mock('./Auth/AuthContext');
jest.mock('../components/Notification/NotificationContext');
jest.mock('../hooks/useCourseData');
jest.mock('../hooks/useUserCourseProgress');
jest.mock('../hooks/useIdentityVerification');
jest.mock('../hooks/useCourseSession');
jest.mock('../hooks/useBreakTimer');
jest.mock('../hooks/useTimeTracker');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  // getDocs is mocked in setupMocks/individual tests
  getDocs: jest.fn(),
}));
jest.mock('../services/userProgressFirestoreService');

// Mock child components
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
  const mockTriggerVerificationNow = jest.fn();

  const setupMocks = (currentLessonType) => {
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'mock-user-course-id' }],
    });
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });

    const mockLessons = {
      'lesson-1': { id: 'lesson-1', title: 'Video Lesson', type: 'video' },
      'lesson-2': { id: 'lesson-2', title: 'Test Lesson', type: 'test' },
    };

    useCourseData.mockReturnValue({
      course: { id: 'test-course', title: 'Test Course' },
      modules: [{ id: 'module-1', title: 'Module 1', lessonOrder: ['lesson-1', 'lesson-2'] }],
      lessons: mockLessons,
      loading: false,
      error: null,
    });

    useUserCourseProgress.mockReturnValue({
      completedLessons: new Set(),
      loading: false,
      error: null,
      userOverallProgress: { lastViewedLesson: { 'test-course': currentLessonType === 'test' ? 'lesson-2' : 'lesson-1' } },
      actions: { completeLesson: jest.fn() },
    });

    useIdentityVerification.mockReturnValue({
      isVerificationModalOpen: false,
      verificationQuestion: null,
      verificationError: null,
      verificationAttempts: 3,
      handleVerificationSubmit: jest.fn(),
      actions: { triggerVerificationNow: mockTriggerVerificationNow },
    });

    useCourseSession.mockReturnValue({ isIdle: false, isTimeLimitReached: false, actions: {} });
    useBreakTimer.mockReturnValue({ isOnBreak: false });
    useTimeTracker.mockReturnValue({ handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger identity verification when a lesson of type "test" is loaded', async () => {
    await act(async () => {
      setupMocks('test');
      render(<CoursePlayer />);
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow effects to run
    });
    await waitFor(() =>
      expect(mockTriggerVerificationNow).toHaveBeenCalledTimes(1)
    );
  });

  it('should NOT trigger identity verification for lessons of other types', async () => {
    await act(async () => {
      setupMocks('video');
      render(<CoursePlayer />);
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow effects to run
    });
    expect(mockTriggerVerificationNow).not.toHaveBeenCalled();
  });

  it('should display a loading message when course data or user progress is loading', async () => {
    // Mock hooks to simulate loading state
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });
    useIdentityVerification.mockReturnValue({ actions: { triggerVerificationNow: jest.fn() } });
    useCourseSession.mockReturnValue({ isIdle: false, isTimeLimitReached: false, actions: {} });
    useBreakTimer.mockReturnValue({ isOnBreak: false });
    useTimeTracker.mockReturnValue({ handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() });

    useCourseData.mockReturnValue({
      course: null,
      modules: [],
      lessons: {},
      loading: true, // Simulate course data loading
      error: null,
    });
    useUserCourseProgress.mockReturnValue({
      completedLessons: new Set(),
      loading: true, // Simulate user progress loading
      error: null,
      userOverallProgress: null,
      actions: { completeLesson: jest.fn() },
    });
    getDocs.mockReturnValue(new Promise(() => {})); // Simulate userCourseId not yet available
    render(<CoursePlayer />);
    expect(screen.getByText('Loading Course...')).toBeInTheDocument();
  });

  it('should display an error message if course data fails to load', async () => {
    // Mock hooks to simulate an error state
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });
    useIdentityVerification.mockReturnValue({ actions: { triggerVerificationNow: jest.fn() } });
    useCourseSession.mockReturnValue({ isIdle: false, isTimeLimitReached: false, actions: {} });
    useBreakTimer.mockReturnValue({ isOnBreak: false });
    useTimeTracker.mockReturnValue({ handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() });

    useCourseData.mockReturnValue({
      course: null,
      modules: [],
      lessons: {},
      loading: false,
      error: 'Failed to load course data.', // Simulate course data error
    });
    useUserCourseProgress.mockReturnValue({
      completedLessons: new Set(),
      loading: false,
      error: null,
      userOverallProgress: null,
      actions: { completeLesson: jest.fn() },
    });
    getDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: 'mock-user-course-id' }],
    });
    await act(async () => {
      render(<CoursePlayer />);
    });
    await waitFor(() => expect(screen.getByText('Failed to load course data.')).toBeInTheDocument());
  });
});