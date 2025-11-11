import { renderHook, waitFor, act } from '@testing-library/react';
import { useProgressStats } from './useProgressStats';
import { useAuth } from '../pages/Auth/AuthContext';
import { getUserProgress } from '../services/userProgressFirestoreService';
import { getDocs } from 'firebase/firestore';
import { calculateProgressStats } from '../utils/statsCalculator';

// Mock all dependencies
jest.mock('../pages/Auth/AuthContext');
jest.mock('../services/userProgressFirestoreService');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDocs: jest.fn(),
  collection: jest.fn((db, path) => ({ path })),
  query: jest.fn((collection) => ({ collection })),
}));
jest.mock('../utils/statsCalculator');

describe('useProgressStats', () => {
  const mockUser = { uid: 'test-user-123' };

  // Centralize console spy to keep tests DRY
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should fetch all data, calculate stats, and set the final state', async () => {
    // Arrange
    useAuth.mockReturnValue({ user: mockUser });

    const mockUserProgress = { lessons: { 'lesson-1': { completed: true } } };
    const mockModulesSnapshot = { docs: [{ id: 'mod-1', data: () => ({}) }] };
    const mockLessonsSnapshot = { docs: [{ id: 'les-1', data: () => ({}) }] };
    const mockQuizzesSnapshot = { docs: [{ id: 'quiz-1', data: () => ({}) }] };
    const mockTestsSnapshot = { docs: [{ id: 'test-1', data: () => ({}) }] };
    
    const mockCalculatedStats = { courseCompletionPercentage: 50, completedLessons: 1 };

    getUserProgress.mockResolvedValue(mockUserProgress);
    getDocs
      .mockResolvedValueOnce(mockModulesSnapshot) // Corresponds to the first getDocs call in Promise.all
      .mockResolvedValueOnce(mockLessonsSnapshot) // Second call
      .mockResolvedValueOnce(mockQuizzesSnapshot) // Third call
      .mockResolvedValueOnce(mockTestsSnapshot);  // Fourth call
    
    calculateProgressStats.mockReturnValue(mockCalculatedStats);

    // Act
    const { result } = renderHook(() => useProgressStats());

    // Assert - Wait for the loading to complete.
    // This ensures all async operations in the useEffect have finished.
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify that all data fetching and calculations were performed
    expect(getUserProgress).toHaveBeenCalledWith(mockUser.uid);
    expect(getDocs).toHaveBeenCalledTimes(4);
    expect(calculateProgressStats).toHaveBeenCalledWith(
      mockUserProgress,
      expect.any(Array), // modules
      mockLessonsSnapshot.docs.length,
      mockQuizzesSnapshot.docs.length,
      mockTestsSnapshot.docs.length
    );

    // Verify the final state
    expect(result.current.stats).toEqual(mockCalculatedStats);
    expect(result.current.error).toBe('');
  });

  it('should not fetch data if there is no user', () => {
    // Arrange: Simulate no authenticated user
    useAuth.mockReturnValue({ user: null });

    // Act
    const { result } = renderHook(() => useProgressStats());

    // Assert
    expect(result.current.loading).toBe(false);
    expect(getUserProgress).not.toHaveBeenCalled();
    expect(getDocs).not.toHaveBeenCalled();
    expect(result.current.error).toBe('');
  });

  it('should set an error state if fetching user progress fails', async () => {
    // Arrange
    useAuth.mockReturnValue({ user: mockUser });
    const errorMessage = 'Permission denied';
    getUserProgress.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useProgressStats());

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Could not load your progress data.');
    expect(getDocs).not.toHaveBeenCalled();
    expect(calculateProgressStats).not.toHaveBeenCalled();
  });

  it('should handle the case where a user has no progress document', async () => {
    // Arrange: This simulates a new user for whom a progress doc doesn't exist yet.
    useAuth.mockReturnValue({ user: mockUser });
    getUserProgress.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useProgressStats());

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The hook should have attempted to get progress, but then exited gracefully.
    expect(getUserProgress).toHaveBeenCalledWith(mockUser.uid);
    expect(getDocs).not.toHaveBeenCalled(); // Should not proceed to fetch other data
    expect(calculateProgressStats).not.toHaveBeenCalled(); // Should not proceed to calculate

    // The state should remain at its initial values
    expect(result.current.stats.courseCompletionPercentage).toBe(0);
    expect(result.current.error).toBe('');
  });

  it('should set an error state if fetching collection data fails', async () => {
    // Arrange
    useAuth.mockReturnValue({ user: mockUser });
    const mockUserProgress = { lessons: { 'lesson-1': { completed: true } } };
    const errorMessage = 'Permission denied on lessons collection';
    getUserProgress.mockResolvedValue(mockUserProgress);
    getDocs.mockRejectedValue(new Error(errorMessage)); // Simulate a failure in one of the getDocs calls

    // Act
    const { result } = renderHook(() => useProgressStats());

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Could not load your progress data.');
    expect(calculateProgressStats).not.toHaveBeenCalled();
  });
});
