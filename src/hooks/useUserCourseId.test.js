import { renderHook, waitFor } from '@testing-library/react';
import { useUserCourseId } from './useUserCourseId';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock the Firebase db object
jest.mock('../Firebase', () => ({
  db: {},
}));

describe('useUserCourseId', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockCourseId = 'course-abc';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should return loading true initially, then the userCourseId on success', async () => {
    // Arrange
    const mockSnapshot = {
      empty: false,
      docs: [{ id: 'user-course-doc-id' }],
    };
    getDocs.mockResolvedValue(mockSnapshot);

    // Act
    const { result } = renderHook(() => useUserCourseId(mockUser, mockCourseId));

    // Assert initial state
    expect(result.current.loading).toBe(true);

    // Assert final state
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userCourseId).toBe('user-course-doc-id');
    expect(result.current.error).toBeNull();
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('should return null if the user is not provided', async () => {
    // Act
    const { result } = renderHook(() => useUserCourseId(null, mockCourseId));

    // Assert
    expect(result.current.loading).toBe(false);
    expect(result.current.userCourseId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('should return null if the course enrollment document is not found', async () => {
    // Arrange
    const mockSnapshot = {
      empty: true,
      docs: [],
    };
    getDocs.mockResolvedValue(mockSnapshot);

    // Act
    const { result } = renderHook(() => useUserCourseId(mockUser, mockCourseId));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userCourseId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should set an error state if the firestore call fails', async () => {
    // Arrange
    const errorMessage = 'Permission denied';
    getDocs.mockRejectedValue(new Error(errorMessage));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    const { result } = renderHook(() => useUserCourseId(mockUser, mockCourseId));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Could not find user course enrollment.');
    expect(result.current.userCourseId).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});