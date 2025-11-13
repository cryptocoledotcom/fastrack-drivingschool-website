import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import CoursePlayer from './CoursePlayer';
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
jest.mock('firebase/firestore', () => {
  const originalModule = jest.requireActual('firebase/firestore');
  return {
    ...originalModule,
    getDocs: jest.fn(),
  };
});
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
});