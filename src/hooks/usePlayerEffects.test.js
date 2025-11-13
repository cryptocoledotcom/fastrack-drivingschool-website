import { renderHook } from '@testing-library/react';
import { usePlayerEffects } from './usePlayerEffects';

describe('usePlayerEffects', () => {
  let mockPlayerRef;

  beforeEach(() => {
    // Before each test, reset the mock player ref
    mockPlayerRef = {
      current: {
        pause: jest.fn(),
      },
    };
  });

  it('should not call pause if no pause conditions are met on initial render', () => {
    const initialProps = {
      playerRef: mockPlayerRef,
      isOnBreak: false,
      isTimeLimitReached: false,
      isVerificationModalOpen: false,
      isIdleModalOpen: false,
      isBreakModalOpen: false,
    };

    renderHook(usePlayerEffects, { initialProps });

    expect(mockPlayerRef.current.pause).not.toHaveBeenCalled();
  });

  // Create a parameterized test for each condition to keep the code DRY
  const testCases = [
    { prop: 'isOnBreak', label: 'isOnBreak becomes true' },
    { prop: 'isTimeLimitReached', label: 'isTimeLimitReached becomes true' },
    { prop: 'isVerificationModalOpen', label: 'isVerificationModalOpen becomes true' },
    { prop: 'isIdleModalOpen', label: 'isIdleModalOpen becomes true' },
    { prop: 'isBreakModalOpen', label: 'isBreakModalOpen becomes true' },
  ];

  testCases.forEach(({ prop, label }) => {
    it(`should call pause when ${label}`, () => {
      const initialProps = {
        playerRef: mockPlayerRef,
        isOnBreak: false,
        isTimeLimitReached: false,
        isVerificationModalOpen: false,
        isIdleModalOpen: false,
        isBreakModalOpen: false,
      };

      const { rerender } = renderHook(usePlayerEffects, { initialProps });

      // Initially, pause should not have been called
      expect(mockPlayerRef.current.pause).not.toHaveBeenCalled();

      // Rerender with the specific prop set to true
      rerender({ ...initialProps, [prop]: true });

      // Assert that pause was called
      expect(mockPlayerRef.current.pause).toHaveBeenCalledTimes(1);
    });
  });

  it('should not throw an error if the playerRef is not yet available', () => {
    const initialProps = {
      playerRef: { current: null }, // Simulate ref not being attached yet
      isOnBreak: false,
    };

    const { rerender } = renderHook(usePlayerEffects, { initialProps });

    // Expect no error to be thrown when we try to trigger the effect
    expect(() => {
      rerender({ ...initialProps, isOnBreak: true });
    }).not.toThrow();
  });

  it('should call pause again if a different condition becomes true', () => {
    const initialProps = {
      playerRef: mockPlayerRef,
      isOnBreak: false,
      isTimeLimitReached: false,
      isVerificationModalOpen: false,
      isIdleModalOpen: false,
      isBreakModalOpen: false,
    };

    const { rerender } = renderHook(usePlayerEffects, { initialProps });

    // First condition
    rerender({ ...initialProps, isOnBreak: true });
    expect(mockPlayerRef.current.pause).toHaveBeenCalledTimes(1);

    // Second condition
    rerender({ ...initialProps, isTimeLimitReached: true });
    expect(mockPlayerRef.current.pause).toHaveBeenCalledTimes(2);
  });
});