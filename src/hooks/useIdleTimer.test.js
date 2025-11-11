import { renderHook, act } from '@testing-library/react';
import { useIdleTimer } from './useIdleTimer';

describe('useIdleTimer', () => {
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Enable fake timers to control setTimeout and clearTimeout
  beforeAll(() => {
    jest.useFakeTimers();
  });

  // Restore real timers after all tests in this file
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Clear any pending timers before each test
    jest.clearAllTimers();
  });

  it('should not call the onIdle callback before the timeout expires', () => {
    // Arrange
    const mockOnIdle = jest.fn();

    // Act
    renderHook(() => useIdleTimer(mockOnIdle, IDLE_TIMEOUT));

    // Advance the timer by less than the full timeout
    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT - 1);
    });

    // Assert
    expect(mockOnIdle).not.toHaveBeenCalled();
  });

  it('should call the onIdle callback exactly once after the timeout expires', () => {
    // Arrange
    const mockOnIdle = jest.fn();

    // Act
    renderHook(() => useIdleTimer(mockOnIdle, IDLE_TIMEOUT));

    // Advance the timer by the full timeout duration
    act(() => {
      jest.advanceTimersByTime(IDLE_TIMEOUT);
    });

    // Assert
    expect(mockOnIdle).toHaveBeenCalledTimes(1);
  });

  it('should clean up the timer when the hook unmounts', () => {
    // Arrange
    const mockOnIdle = jest.fn();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useIdleTimer(mockOnIdle, IDLE_TIMEOUT));

    // Act
    unmount();

    // Assert
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
