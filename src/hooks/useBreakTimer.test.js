import { renderHook, act } from '@testing-library/react';
import { useBreakTimer } from './useBreakTimer';
import { BreakTimer } from '../utils/breakTimer';

// Mock the BreakTimer utility so we can control its behavior and spy on its methods.
jest.mock('../utils/breakTimer');

describe('useBreakTimer', () => {
  let mockShowBreakModal;
  let mockHideBreakModal;
  let mockBreakTimerInstance;

  beforeEach(() => {
    // Clear all previous mock data before each test
    jest.clearAllMocks();

    // Mock callback functions that would be passed from a component
    mockShowBreakModal = jest.fn();
    mockHideBreakModal = jest.fn();

    // Spy on the BreakTimer constructor and its methods
    mockBreakTimerInstance = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    // When `new BreakTimer()` is called in the hook, return our mock instance
    BreakTimer.mockImplementation(() => mockBreakTimerInstance);
  });

  it('should initialize with default state and create a BreakTimer instance', () => {
    // Act: Render the hook
    const { result } = renderHook(() =>
      useBreakTimer({
        showBreakModal: mockShowBreakModal,
        hideBreakModal: mockHideBreakModal,
      })
    );

    // Assert: Check initial state
    expect(result.current.instructionalTime).toBe(0);
    expect(result.current.isOnBreak).toBe(false);

    // Assert: Check that the BreakTimer class was instantiated
    expect(BreakTimer).toHaveBeenCalledTimes(1);
  });

  it('should start the timer on mount and stop it on unmount', () => {
    // Act: Render the hook
    const { unmount } = renderHook(() =>
      useBreakTimer({
        showBreakModal: mockShowBreakModal,
        hideBreakModal: mockHideBreakModal,
      })
    );

    // Assert: The start method should be called once after the hook mounts
    expect(mockBreakTimerInstance.start).toHaveBeenCalledTimes(1);

    // Act: Unmount the component
    unmount();

    // Assert: The stop method should be called once on cleanup
    expect(mockBreakTimerInstance.stop).toHaveBeenCalledTimes(1);
  });

  it('should update instructionalTime when the onTick callback is fired', () => {
    // Act: Render the hook
    const { result } = renderHook(() =>
      useBreakTimer({
        showBreakModal: mockShowBreakModal,
        hideBreakModal: mockHideBreakModal,
      })
    );

    // Get the `onTick` function that the hook passed to the BreakTimer constructor
    const onTickCallback = BreakTimer.mock.calls[0][0].onTick;

    // Act: Simulate the timer ticking
    act(() => {
      onTickCallback(120); // Simulate 120 seconds have passed
    });

    // Assert: The hook's state should be updated
    expect(result.current.instructionalTime).toBe(120);
  });

  it('should set isOnBreak to true and call showBreakModal when the break starts', () => {
    const { result } = renderHook(() =>
      useBreakTimer({
        showBreakModal: mockShowBreakModal,
        hideBreakModal: mockHideBreakModal,
      })
    );

    const showBreakModalCallback = BreakTimer.mock.calls[0][0].showBreakModal;

    act(() => {
      showBreakModalCallback();
    });

    expect(result.current.isOnBreak).toBe(true);
    expect(mockShowBreakModal).toHaveBeenCalledTimes(1);
  });

  it('should set isOnBreak to false and call hideBreakModal when the break ends', () => {
    const { result } = renderHook(() =>
      useBreakTimer({
        showBreakModal: mockShowBreakModal,
        hideBreakModal: mockHideBreakModal,
      })
    );

    // First, simulate the break starting to set the initial state
    act(() => {
      BreakTimer.mock.calls[0][0].showBreakModal();
    });
    expect(result.current.isOnBreak).toBe(true);

    // Now, get the hideBreakModal callback that the hook passed to the constructor
    const hideBreakModalCallback = BreakTimer.mock.calls[0][0].hideBreakModal;

    act(() => {
      hideBreakModalCallback();
    });

    expect(result.current.isOnBreak).toBe(false);
    expect(mockHideBreakModal).toHaveBeenCalledTimes(1);
  });
});