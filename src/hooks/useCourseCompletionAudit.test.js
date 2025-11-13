import { renderHook, act } from '@testing-library/react';
import { useCourseCompletionAudit } from './useCourseCompletionAudit';
import { addCourseAuditLog } from '../services/userProgressFirestoreService';

// Mock the service dependency
jest.mock('../services/userProgressFirestoreService', () => ({
  addCourseAuditLog: jest.fn(),
}));

describe('useCourseCompletionAudit', () => {
  const mockUser = { uid: 'test-user' };
  const mockCourse = { id: 'course-1' };
  const mockUserProgress = {
    lessons: {
      'l1': { timeSpentSeconds: 120 },
      'l2': { timeSpentSeconds: 180 },
    },
  };

  beforeEach(() => {
    // Clear mocks and setup a default resolved promise for the mock
    addCourseAuditLog.mockClear().mockResolvedValue();
  });

  it('should call addCourseAuditLog when courseCompleted becomes true', () => {
    const { rerender } = renderHook(
      ({ courseCompleted }) => useCourseCompletionAudit({
        courseCompleted,
        user: mockUser,
        course: mockCourse,
        userOverallProgress: mockUserProgress,
      }),
      { initialProps: { courseCompleted: false } }
    );

    expect(addCourseAuditLog).not.toHaveBeenCalled();

    // Rerender the hook with courseCompleted as true
    act(() => {
      rerender({ courseCompleted: true });
    });

    expect(addCourseAuditLog).toHaveBeenCalledTimes(1);
    // 120 + 180 = 300
    expect(addCourseAuditLog).toHaveBeenCalledWith(mockUser.uid, mockCourse.id, 300);
  });

  it('should not call addCourseAuditLog if courseCompleted is false', () => {
    renderHook(() => useCourseCompletionAudit({
      courseCompleted: false,
      user: mockUser,
      course: mockCourse,
      userOverallProgress: mockUserProgress,
    }));

    expect(addCourseAuditLog).not.toHaveBeenCalled();
  });

  it('should not call addCourseAuditLog if user or course is missing', () => {
    renderHook(() => useCourseCompletionAudit({
      courseCompleted: true,
      user: null, // No user
      course: mockCourse,
      userOverallProgress: mockUserProgress,
    }));

    expect(addCourseAuditLog).not.toHaveBeenCalled();
  });
});