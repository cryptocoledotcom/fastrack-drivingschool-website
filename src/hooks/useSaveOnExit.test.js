import { renderHook } from '@testing-library/react';
import { useSaveOnExit } from './useSaveOnExit';
import { saveLessonPlaybackTime } from '../services/userProgressFirestoreService';

// Mock the service dependency
jest.mock('../services/userProgressFirestoreService', () => ({
  saveLessonPlaybackTime: jest.fn(),
}));

describe('useSaveOnExit', () => {
  const mockUser = { uid: 'test-user' };
  const mockLesson = { id: 'lesson-1' };
  const mockCompletedLessons = new Set();
  const mockSaveOnExit = jest.fn();
  const mockPlayerRef = { current: { getCurrentTime: () => 120 } };

  // Spy on window event listeners
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add and remove the beforeunload event listener', () => {
    const { unmount } = renderHook(() => useSaveOnExit({
      user: mockUser,
      currentLesson: mockLesson,
      completedLessons: mockCompletedLessons,
      saveOnExit: mockSaveOnExit,
      playerRef: mockPlayerRef,
    }));

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should call save functions when the event fires and conditions are met', () => {
    renderHook(() => useSaveOnExit({
      user: mockUser,
      currentLesson: mockLesson,
      completedLessons: mockCompletedLessons,
      saveOnExit: mockSaveOnExit,
      playerRef: mockPlayerRef,
    }));

    // Manually trigger the event handler that was added
    const eventHandler = addEventListenerSpy.mock.calls[0][1];
    eventHandler();

    expect(mockSaveOnExit).toHaveBeenCalledTimes(1);
    expect(saveLessonPlaybackTime).toHaveBeenCalledWith(mockUser.uid, mockLesson.id, 120);
  });

  it('should NOT call save functions if there is no user', () => {
    renderHook(() => useSaveOnExit({
      user: null, // No user
      currentLesson: mockLesson,
      completedLessons: mockCompletedLessons,
      saveOnExit: mockSaveOnExit,
      playerRef: mockPlayerRef,
    }));

    const eventHandler = addEventListenerSpy.mock.calls[0][1];
    eventHandler();

    expect(mockSaveOnExit).not.toHaveBeenCalled();
    expect(saveLessonPlaybackTime).not.toHaveBeenCalled();
  });
});