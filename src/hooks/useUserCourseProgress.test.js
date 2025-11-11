// src/hooks/useUserCourseProgress.test.js

import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserCourseProgress } from './useUserCourseProgress';
import { getUserProgress, updateActivityProgress, clearLastViewedLesson } from '../services/userProgressFirestoreService';

// Mock the service
jest.mock('../services/userProgressFirestoreService');

describe('useUserCourseProgress', () => {
  const mockUser = { uid: 'test-user-123' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch progress and set completed lessons on initial load', async () => {
    // Arrange: Mock the data that will be returned from Firestore
    const mockProgress = {
      lessons: {
        'lesson-1': { completed: true },
        'lesson-2': { completed: false },
        'lesson-3': { completed: true },
      },
    };
    getUserProgress.mockResolvedValue(mockProgress);

    // Act: Render the hook
    const { result } = renderHook(() => useUserCourseProgress(mockUser));

    // Assert: Wait for loading to finish and then check the state
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getUserProgress).toHaveBeenCalledWith(mockUser.uid);
    expect(result.current.userOverallProgress).toEqual(mockProgress);
    expect(result.current.completedLessons).toEqual(new Set(['lesson-1', 'lesson-3']));
    expect(result.current.error).toBe('');
  });

  it('should set an error state if fetching progress fails', async () => {
    // Arrange: Mock the service to reject the promise
    const errorMessage = 'Firestore connection error';
    getUserProgress.mockRejectedValue(new Error(errorMessage));

    // Suppress the expected console.error from appearing in the test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act: Render the hook
    const { result } = renderHook(() => useUserCourseProgress(mockUser));

    // Assert: Wait for loading to finish and then check the error state
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getUserProgress).toHaveBeenCalledWith(mockUser.uid);
    expect(result.current.error).toBe('Failed to load your learning progress.');
    expect(result.current.userOverallProgress).toBeNull(); // Progress should not be set
    expect(result.current.completedLessons.size).toBe(0); // Completed lessons should be empty
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user progress:", expect.any(Error));

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

  it('should set an error state if the user account is locked', async () => {
    // Arrange: Mock the data to simulate a locked account
    const mockProgress = {
      lessons: {
        'lesson-1': { completed: true },
      },
      isLocked: true, // The key condition for this test
    };
    getUserProgress.mockResolvedValue(mockProgress);

    // Act: Render the hook
    const { result } = renderHook(() => useUserCourseProgress(mockUser));

    // Assert: Wait for loading to finish and then check the error state
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getUserProgress).toHaveBeenCalledWith(mockUser.uid);
    expect(result.current.error).toBe('Your account is locked due to failed identity verification. Please contact support.');
    expect(result.current.completedLessons.size).toBe(0); // The hook should return early, so lessons are not processed.
    expect(result.current.userOverallProgress).toEqual(mockProgress); // The overall progress is set before the lock check.
  });

  describe('completeLesson action', () => {
    it('should update firestore and local state when a lesson is completed', async () => {
      // Arrange
      const initialProgress = {
        lessons: {
          'lesson-1': { completed: true },
          'lesson-2': { completed: false },
        },
        lastViewedLesson: { 'course-1': 'lesson-2' }
      };
      getUserProgress.mockResolvedValue(initialProgress);

      const { result } = renderHook(() => useUserCourseProgress(mockUser));

      // Wait for initial load
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.completedLessons).toEqual(new Set(['lesson-1']));

      // Act: Complete 'lesson-2' for 'course-1'
      await act(async () => {
        await result.current.actions.completeLesson('lesson-2', 'course-1');
      });

      // Assert Firestore calls
      expect(updateActivityProgress).toHaveBeenCalledWith(mockUser.uid, 'lessons', 'lesson-2', { completed: true });
      expect(clearLastViewedLesson).toHaveBeenCalledWith(mockUser.uid, 'course-1');

      // Assert optimistic local state updates
      expect(result.current.completedLessons).toEqual(new Set(['lesson-1', 'lesson-2']));
      expect(result.current.userOverallProgress.lessons['lesson-2'].completed).toBe(true);
      expect(result.current.userOverallProgress.lastViewedLesson).toBeUndefined();
    });
  });
});
