import { renderHook, act } from '@testing-library/react';
import { usePlayerLesson } from './usePlayerLesson';

describe('usePlayerLesson', () => {
  const mockLessons = {
    'l1': { id: 'l1', title: 'Lesson 1' },
    'l2': { id: 'l2', title: 'Lesson 2' },
  };
  const initialLesson = mockLessons['l1'];

  it('should initialize with the provided initial lesson', () => {
    const { result } = renderHook(() => usePlayerLesson(initialLesson, mockLessons));

    expect(result.current.playerLesson).toEqual(initialLesson);
  });

  it('should update the playerLesson when the initial lesson prop changes', () => {
    const { result, rerender } = renderHook(
      ({ lesson }) => usePlayerLesson(lesson, mockLessons),
      { initialProps: { lesson: initialLesson } }
    );

    expect(result.current.playerLesson).toEqual(initialLesson);

    // Simulate the parent component providing a new initial lesson
    rerender({ lesson: mockLessons['l2'] });

    expect(result.current.playerLesson).toEqual(mockLessons['l2']);
  });

  it('should update the playerLesson when handleLessonClick is called', () => {
    const { result } = renderHook(() => usePlayerLesson(initialLesson, mockLessons));

    act(() => {
      result.current.handleLessonClick('l2');
    });

    expect(result.current.playerLesson).toEqual(mockLessons['l2']);
  });

  it('should not update the playerLesson if an invalid lessonId is provided', () => {
    const { result } = renderHook(() => usePlayerLesson(initialLesson, mockLessons));

    act(() => {
      result.current.handleLessonClick('invalid-id');
    });

    // The lesson should remain unchanged
    expect(result.current.playerLesson).toEqual(initialLesson);
  });
});