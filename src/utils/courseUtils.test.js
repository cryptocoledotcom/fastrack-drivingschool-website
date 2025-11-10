import { findFirstUncompletedLesson } from './courseUtils';

describe('findFirstUncompletedLesson', () => {
  const mockModules = [
    { id: 'm1', lessonOrder: ['l1', 'l2'] },
    { id: 'm2', lessonOrder: ['l3', 'l4'] },
    { id: 'm3', lessonOrder: ['l5'] },
  ];

  it('should return the very first lesson if no lessons are completed', () => {
    const completedLessons = new Set();
    const result = findFirstUncompletedLesson(mockModules, completedLessons);
    expect(result).toBe('l1');
  });

  it('should return the next uncompleted lesson when some are completed', () => {
    const completedLessons = new Set(['l1', 'l2']);
    const result = findFirstUncompletedLesson(mockModules, completedLessons);
    expect(result).toBe('l3');
  });

  it('should skip over completed modules to find the next uncompleted lesson', () => {
    const completedLessons = new Set(['l1', 'l2', 'l3', 'l4']);
    const result = findFirstUncompletedLesson(mockModules, completedLessons);
    expect(result).toBe('l5');
  });

  it('should return null if all lessons are completed', () => {
    const completedLessons = new Set(['l1', 'l2', 'l3', 'l4', 'l5']);
    const result = findFirstUncompletedLesson(mockModules, completedLessons);
    expect(result).toBeNull();
  });

  it('should return null if the modules array is empty or null', () => {
    const completedLessons = new Set();
    expect(findFirstUncompletedLesson([], completedLessons)).toBeNull();
    expect(findFirstUncompletedLesson(null, completedLessons)).toBeNull();
  });

  it('should handle modules that have no lessons or an invalid lessonOrder', () => {
    const modulesWithEmpty = [
      { id: 'm1', lessonOrder: [] },
      { id: 'm2' }, // No lessonOrder property
      { id: 'm3', lessonOrder: ['l1'] },
    ];
    const completedLessons = new Set();
    const result = findFirstUncompletedLesson(modulesWithEmpty, completedLessons);
    expect(result).toBe('l1');
  });
});