import { renderHook } from '@testing-library/react';
import { useCurrentLesson } from './useCurrentLesson';
import { findFirstUncompletedLesson } from '../utils/courseUtils';

// Mock the utility function
jest.mock('../utils/courseUtils', () => ({
  findFirstUncompletedLesson: jest.fn(),
}));

describe('useCurrentLesson', () => {
  const mockCourseId = 'course-1';
  const mockModules = [
    { id: 'm1', lessonOrder: ['l1', 'l2'] },
    { id: 'm2', lessonOrder: ['l3'] },
  ];
  const mockLessons = {
    'l1': { id: 'l1', title: 'Lesson 1' },
    'l2': { id: 'l2', title: 'Lesson 2' },
    'l3': { id: 'l3', title: 'Lesson 3' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when data is loading', () => {
    const modules = [];
    const lessons = {};
    const completedLessons = new Set();
    const { result } = renderHook(() => useCurrentLesson({
      courseLoading: true,
      progressLoading: false,
      modules,
      lessons,
      userOverallProgress: null,
      completedLessons,
      courseId: mockCourseId,
    }));

    expect(result.current.currentLesson).toBeNull();
    expect(result.current.courseCompleted).toBe(false);
  });

  it('should set courseCompleted to true if all lessons are completed', () => {
    const completedLessons = new Set(['l1', 'l2', 'l3']);
    const userOverallProgress = { lessons: {} };
    const { result } = renderHook(() => useCurrentLesson({
      courseLoading: false,
      progressLoading: false,
      modules: mockModules,
      lessons: mockLessons,
      userOverallProgress,
      completedLessons,
      courseId: mockCourseId,
    }));

    expect(result.current.courseCompleted).toBe(true);
    expect(result.current.currentLesson).toBeNull();
  });

  it('should return the last viewed lesson if it exists', () => {
    const userOverallProgress = {
      lastViewedLesson: { [mockCourseId]: 'l2' },
    };
    const completedLessons = new Set(['l1']);
    const { result } = renderHook(() => useCurrentLesson({
      courseLoading: false,
      progressLoading: false,
      modules: mockModules,
      lessons: mockLessons,
      userOverallProgress,
      completedLessons,
      courseId: mockCourseId,
    }));

    expect(result.current.currentLesson).toEqual(mockLessons['l2']);
    expect(findFirstUncompletedLesson).not.toHaveBeenCalled();
  });

  it('should find the first uncompleted lesson if no last viewed lesson exists', () => {
    findFirstUncompletedLesson.mockReturnValue('l2');
    const userOverallProgress = { lastViewedLesson: {} };
    const completedLessons = new Set(['l1']);

    const { result } = renderHook(() => useCurrentLesson({
      courseLoading: false,
      progressLoading: false,
      modules: mockModules,
      lessons: mockLessons,
      userOverallProgress,
      completedLessons,
      courseId: mockCourseId,
    }));

    expect(findFirstUncompletedLesson).toHaveBeenCalledWith(mockModules, completedLessons);
    expect(result.current.currentLesson).toEqual(mockLessons['l2']);
  });

  it('should fall back to the very first lesson if no other logic applies', () => {
    findFirstUncompletedLesson.mockReturnValue(null); // Simulate no uncompleted lesson found
    const userOverallProgress = { lastViewedLesson: {} };
    const completedLessons = new Set();

    const { result } = renderHook(() => useCurrentLesson({
      courseLoading: false,
      progressLoading: false,
      modules: mockModules,
      lessons: mockLessons,
      userOverallProgress,
      completedLessons,
      courseId: mockCourseId,
    }));

    expect(result.current.currentLesson).toEqual(mockLessons['l1']);
  });
});