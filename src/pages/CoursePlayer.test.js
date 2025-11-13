import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import CoursePlayer from './CoursePlayer'; // Assuming CoursePlayer is the default export
import { useParams } from 'react-router-dom';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import { useCourseData } from '../hooks/useCourseData';
import { useCurrentLesson } from '../hooks/useCurrentLesson';
import { useUserCourseId } from '../hooks/useUserCourseId';
import { usePlayerLesson } from '../hooks/usePlayerLesson';
import { useCourseCompletionAudit } from '../hooks/useCourseCompletionAudit';
import { useSaveOnExit as useSaveOnExitHook } from '../hooks/useSaveOnExit';
import { addCourseAuditLog } from '../services/userProgressFirestoreService';
import { useUserCourseProgress } from '../hooks/useUserCourseProgress';
import { useIdentityVerification } from '../hooks/useIdentityVerification';
import { useCourseSession } from '../hooks/useCourseSession';
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
jest.mock('../hooks/useCurrentLesson');
jest.mock('../hooks/useUserCourseId');
jest.mock('../hooks/useCourseCompletionAudit');
jest.mock('../hooks/useSaveOnExit');
jest.mock('../hooks/usePlayerLesson');
jest.mock('../hooks/useUserCourseProgress');
jest.mock('../hooks/useIdentityVerification');
jest.mock('../hooks/useCourseSession');
jest.mock('../hooks/useBreakTimer');
jest.mock('../hooks/useTimeTracker');
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
    useUserCourseId.mockReturnValue({ userCourseId: 'mock-user-course-id', loading: false, error: null });
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });

    const mockLessons = {
      'lesson-1': { id: 'lesson-1', title: 'Video Lesson', type: 'video' },
      'lesson-2': { id: 'lesson-2', title: 'Test Lesson', type: 'test' },
    };

    usePlayerLesson.mockReturnValue({
      playerLesson: mockLessons[currentLessonType === 'test' ? 'lesson-2' : 'lesson-1'],
      handleLessonClick: jest.fn(),
    });

    useCurrentLesson.mockReturnValue({
      currentLesson: mockLessons[currentLessonType === 'test' ? 'lesson-2' : 'lesson-1'],
      courseCompleted: false,
    });

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
    useSaveOnExitHook.mockReturnValue(); // This hook has no return value
    useCourseCompletionAudit.mockReturnValue(); // This hook has no return value
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
    useSaveOnExitHook.mockReturnValue();
    useCourseCompletionAudit.mockReturnValue();

    usePlayerLesson.mockReturnValue({ playerLesson: null, handleLessonClick: jest.fn() });
    useCurrentLesson.mockReturnValue({ currentLesson: null, courseCompleted: false });
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
    useUserCourseId.mockReturnValue({ userCourseId: null, loading: true, error: null });
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
    useSaveOnExitHook.mockReturnValue();
    useCourseCompletionAudit.mockReturnValue();

    usePlayerLesson.mockReturnValue({ playerLesson: null, handleLessonClick: jest.fn() });
    useCurrentLesson.mockReturnValue({ currentLesson: null, courseCompleted: false });
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
    useUserCourseId.mockReturnValue({ userCourseId: 'mock-user-course-id', loading: false, error: null });
    await act(async () => {
      render(<CoursePlayer />);
    });
    await waitFor(() => expect(screen.getByText('Failed to load course data.')).toBeInTheDocument());
  });

  it('should display an error message if user progress fails to load', async () => {
    // Mock hooks to simulate an error state from user progress
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });
    useIdentityVerification.mockReturnValue({ actions: { triggerVerificationNow: jest.fn() } });
    useCourseSession.mockReturnValue({ isIdle: false, isTimeLimitReached: false, actions: {} });
    useBreakTimer.mockReturnValue({ isOnBreak: false });
    useTimeTracker.mockReturnValue({ handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() });
    useSaveOnExitHook.mockReturnValue();
    useCourseCompletionAudit.mockReturnValue();

    usePlayerLesson.mockReturnValue({ playerLesson: null, handleLessonClick: jest.fn() });
    useCurrentLesson.mockReturnValue({ currentLesson: null, courseCompleted: false });
    // Mock successful course data
    useCourseData.mockReturnValue({
      course: { id: 'test-course', title: 'Test Course' },
      modules: [],
      lessons: {},
      loading: false,
      error: null,
    });
    // Mock user progress error
    useUserCourseProgress.mockReturnValue({
      completedLessons: new Set(),
      loading: false,
      error: 'Failed to load user progress.',
      userOverallProgress: null,
      actions: { completeLesson: jest.fn() },
    });
    useUserCourseId.mockReturnValue({ userCourseId: 'mock-user-course-id', loading: false, error: null });
    await act(async () => {
      render(<CoursePlayer />);
    });
    await waitFor(() => expect(screen.getByText('Failed to load user progress.')).toBeInTheDocument());
  });

  it('should display the completion message when all lessons are completed', async () => {
    // Explicitly mock addCourseAuditLog for this test to ensure it returns a promise
    addCourseAuditLog.mockResolvedValue();

    // Mock hooks to simulate a completed course state
    useParams.mockReturnValue({ courseId: 'test-course' });
    useAuth.mockReturnValue({ user: { uid: 'test-user' } });
    useNotification.mockReturnValue({ showNotification: jest.fn() });
    useIdentityVerification.mockReturnValue({ actions: { triggerVerificationNow: jest.fn() } });
    useCourseSession.mockReturnValue({ isIdle: false, isTimeLimitReached: false, actions: {} });
    useBreakTimer.mockReturnValue({ isOnBreak: false });
    useTimeTracker.mockReturnValue({ handlePlay: jest.fn(), handlePause: jest.fn(), saveOnExit: jest.fn() });
    useSaveOnExitHook.mockReturnValue();
    useCourseCompletionAudit.mockReturnValue();

    const mockLessons = {
      'l1': { id: 'l1', title: 'Lesson 1' },
      'l2': { id: 'l2', title: 'Lesson 2' },
    };

    usePlayerLesson.mockReturnValue({
      playerLesson: null,
      handleLessonClick: jest.fn(),
    });

    useCurrentLesson.mockReturnValue({
      currentLesson: null,
      courseCompleted: true,
    });

    useCourseData.mockReturnValue({
      course: { id: 'test-course', title: 'The Best Course' },
      modules: [{ id: 'm1', lessonOrder: ['l1', 'l2'] }],
      lessons: mockLessons,
      loading: false,
      error: null,
    });

    // Simulate all lessons being completed
    useUserCourseProgress.mockReturnValue({
      completedLessons: new Set(['l1', 'l2']),
      loading: false,
      error: null,
      userOverallProgress: { lessons: {} }, // Needs to be a valid object
      actions: { completeLesson: jest.fn() },
    });

    useUserCourseId.mockReturnValue({ userCourseId: 'mock-user-course-id', loading: false, error: null });

    render(<CoursePlayer />);
    await waitFor(() => expect(screen.getByText('Congratulations!')).toBeInTheDocument());
    expect(screen.getByText(/You have completed the course: The Best Course/)).toBeInTheDocument();
  });
});