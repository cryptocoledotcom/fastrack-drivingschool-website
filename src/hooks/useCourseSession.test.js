import { renderHook, act, waitFor } from '@testing-library/react';
import { useCourseSession } from './useCourseSession';
import { useIdleTimer } from './useIdleTimer';
import { getTimeSpentToday } from '../services/userProgressFirestoreService';

// Mock the dependencies
jest.mock('./useIdleTimer');
jest.mock('../services/userProgressFirestoreService');

const FOUR_HOURS_IN_SECONDS = 4 * 60 * 60;

describe('useCourseSession', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockOnIdle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for a user under the time limit
    getTimeSpentToday.mockResolvedValue(1000);
    // Mock useIdleTimer to give us control over the idle callback
    useIdleTimer.mockImplementation((onIdleCallback) => {
      // We can call this manually in tests to simulate idleness
      global.simulateIdle = onIdleCallback;
    });
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useCourseSession(mockUser, false, mockOnIdle));

    expect(result.current.isIdle).toBe(false);
    expect(result.current.isTimeLimitReached).toBe(false);
    expect(result.current.resumeTimeMessage).toBe('');
  });

  describe('Idle Timer Logic', () => {
    it('should not trigger onIdle when the course is not active', () => {
      renderHook(() => useCourseSession(mockUser, false, mockOnIdle));
      
      act(() => {
        global.simulateIdle();
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('should trigger onIdle and set isIdle to true when the course is active', () => {
      const { result } = renderHook(() => useCourseSession(mockUser, true, mockOnIdle));

      act(() => {
        global.simulateIdle();
      });

      expect(mockOnIdle).toHaveBeenCalledTimes(1);
      expect(result.current.isIdle).toBe(true);
    });

    it('should set isIdle to false when confirmNotIdle is called', () => {
      const { result } = renderHook(() => useCourseSession(mockUser, true, mockOnIdle));

      act(() => {
        global.simulateIdle();
      });

      expect(result.current.isIdle).toBe(true);

      act(() => {
        result.current.actions.confirmNotIdle();
      });

      expect(result.current.isIdle).toBe(false);
    });
  });

  describe('Time Limit Logic', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should not check time limit if the course is not active', () => {
      renderHook(() => useCourseSession(mockUser, false, mockOnIdle));
      expect(getTimeSpentToday).not.toHaveBeenCalled();
    });

    it('should set time limit reached if user has exceeded the daily limit', async () => {
      getTimeSpentToday.mockResolvedValue(FOUR_HOURS_IN_SECONDS + 1);
      const { result } = renderHook(() =>
        useCourseSession(mockUser, true, mockOnIdle)
      );

      // The async check runs on mount, so we wait for the state to update.
      await waitFor(() => expect(result.current.isTimeLimitReached).toBe(true));
    });

    it('should not set time limit reached if user is under the daily limit', async () => {
      const { result } = renderHook(() =>
        useCourseSession(mockUser, true, mockOnIdle)
      );

      // The waitFor wrapper handles the async nature of the initial effect
      await waitFor(() => expect(getTimeSpentToday).toHaveBeenCalled());
      expect(result.current.isTimeLimitReached).toBe(false);
    });

    it('should periodically re-check the time limit', async () => {
      getTimeSpentToday.mockResolvedValue(1000);
      const { result } = renderHook(() => useCourseSession(mockUser, true, mockOnIdle));

      await act(async () => {
        // Let the initial effect run
        await Promise.resolve();
      });

      await waitFor(() => expect(getTimeSpentToday).toHaveBeenCalledTimes(1));

      // Now, simulate time passing and the service returning a new value
      getTimeSpentToday.mockResolvedValue(FOUR_HOURS_IN_SECONDS + 1);

      // Advance timers past the 5-minute interval
      await act(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000);
        await Promise.resolve(); // Flush promises
      });

      await waitFor(() => expect(result.current.isTimeLimitReached).toBe(true));
      expect(getTimeSpentToday).toHaveBeenCalledTimes(2);
    });
  });
});