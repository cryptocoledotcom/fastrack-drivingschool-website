import { renderHook, act } from '@testing-library/react';
import { useLessonCompletion } from './useLessonCompletion';
import { useNotification } from '../components/Notification/NotificationContext';

// Mock dependencies
jest.mock('../components/Notification/NotificationContext');

describe('useLessonCompletion', () => {
  const mockShowNotification = jest.fn();
  const mockCompleteLessonAction = jest.fn();

  const mockUser = { uid: 'test-user' };
  const mockCourseId = 'course-1';

  beforeEach(() => {
    jest.clearAllMocks();
    useNotification.mockReturnValue({ showNotification: mockShowNotification });
  });

  it('should be completable by default for non-video lessons', () => {
    const lesson = { id: 'l1', type: 'activity' };
    const { result } = renderHook(() => useLessonCompletion({
      user: mockUser,
      currentLesson: lesson,
      courseId: mockCourseId,
      progressActions: { completeLesson: mockCompleteLessonAction },
    }));

    expect(result.current.isCompletable).toBe(true);
  });

  it('should NOT be completable by default for video lessons', () => {
    const lesson = { id: 'l2', type: 'video' };
    const { result } = renderHook(() => useLessonCompletion({
      user: mockUser,
      currentLesson: lesson,
      courseId: mockCourseId,
      progressActions: { completeLesson: mockCompleteLessonAction },
    }));

    expect(result.current.isCompletable).toBe(false);
  });

  it('should become completable for video lessons after onAllVideosWatched is called', () => {
    const lesson = { id: 'l2', type: 'video' };
    const { result } = renderHook(() => useLessonCompletion({
      user: mockUser,
      currentLesson: lesson,
      courseId: mockCourseId,
      progressActions: { completeLesson: mockCompleteLessonAction },
    }));

    act(() => {
      result.current.onAllVideosWatched(true);
    });

    expect(result.current.isCompletable).toBe(true);
  });

  it('should call the completeLesson action and reset state on success', async () => {
    mockCompleteLessonAction.mockResolvedValue();
    const lesson = { id: 'l2', type: 'video' };
    const { result } = renderHook(() => useLessonCompletion({
      user: mockUser,
      currentLesson: lesson,
      courseId: mockCourseId,
      progressActions: { completeLesson: mockCompleteLessonAction },
    }));

    // Start in a completable state for the video lesson
    act(() => {
      result.current.onAllVideosWatched(true);
    });
    expect(result.current.isCompletable).toBe(true);

    await act(async () => {
      await result.current.handleCompleteLesson();
    });

    expect(mockCompleteLessonAction).toHaveBeenCalledWith('l2', 'course-1');
    // For a video lesson, it should reset the watched state for the next lesson
    expect(result.current.isCompletable).toBe(false);
  });

  it('should show a notification on failure', async () => {
    mockCompleteLessonAction.mockRejectedValue(new Error('DB Error'));
    // Suppress the expected console.error from appearing in the test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const lesson = { id: 'l1', type: 'activity' };
    const { result } = renderHook(() => useLessonCompletion({ user: mockUser, currentLesson: lesson, courseId: mockCourseId, progressActions: { completeLesson: mockCompleteLessonAction } }));

    await act(async () => {
      await result.current.handleCompleteLesson();
    });

    expect(mockShowNotification).toHaveBeenCalledWith('Could not save your progress. Please try again.', 'error');

    // Restore the original console.error
    consoleErrorSpy.mockRestore();
  });
});