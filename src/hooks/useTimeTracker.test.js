import { renderHook, act } from '@testing-library/react';
import { useTimeTracker } from './useTimeTracker';
import { addLessonTime, saveLessonPlaybackTime } from '../services/userProgressFirestoreService';

// Mock the service dependencies
jest.mock('../services/userProgressFirestoreService');

describe('useTimeTracker', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockLesson = { id: 'lesson-1' };
  const mockPlayerRef = { current: { getCurrentTime: () => 60 } }; // Mock player ref

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should track and save time when video plays and then pauses', () => {
    // Arrange
    const { result } = renderHook(() => 
      useTimeTracker(mockUser, mockLesson, false, new Set(), mockPlayerRef)
    );

    // Act: Simulate playing the video
    act(() => {
      result.current.handlePlay();
    });

    // Simulate 10 seconds of playback
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Act: Simulate pausing the video
    act(() => {
      result.current.handlePause();
    });

    // Assert
    expect(addLessonTime).toHaveBeenCalledTimes(1);
    expect(addLessonTime).toHaveBeenCalledWith(mockUser.uid, mockLesson.id, 10);
    expect(saveLessonPlaybackTime).toHaveBeenCalledWith(mockUser.uid, mockLesson.id, 60);
  });

  it('should not track time if the lesson is already completed', () => {
    // Arrange: Initialize the hook with the current lesson marked as complete
    const completedLessons = new Set([mockLesson.id]);
    const { result } = renderHook(() => 
      useTimeTracker(mockUser, mockLesson, false, completedLessons, mockPlayerRef)
    );

    // Act: Simulate playing the video
    act(() => {
      result.current.handlePlay();
    });

    // Simulate 10 seconds of playback
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Assert: No time tracking functions should have been called
    expect(addLessonTime).not.toHaveBeenCalled();
    expect(saveLessonPlaybackTime).not.toHaveBeenCalled();
  });

  it('should not track time if the daily time limit is reached', () => {
    // Arrange: Initialize the hook with the time limit reached flag set to true
    const { result } = renderHook(() => 
      useTimeTracker(mockUser, mockLesson, true, new Set(), mockPlayerRef)
    );

    // Act: Simulate playing the video
    act(() => {
      result.current.handlePlay();
    });

    // Simulate 10 seconds of playback
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Act: Simulate pausing the video
    act(() => {
      result.current.handlePause();
    });

    // Assert: No time tracking functions should have been called
    expect(addLessonTime).not.toHaveBeenCalled();
  });
});
