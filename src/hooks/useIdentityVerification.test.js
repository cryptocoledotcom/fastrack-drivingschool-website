import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdentityVerification } from './useIdentityVerification';
import { getRandomSecurityQuestion, hashText, lockUserAccount, logIdentityVerificationAttempt } from '../services/userProgressFirestoreService';

// Mock the service dependencies
jest.mock('../services/userProgressFirestoreService');

describe('useIdentityVerification', () => {
  const mockUser = { uid: 'test-user-456' };
  const mockOnVerificationStart = jest.fn();
  const mockOnVerificationSuccess = jest.fn();
  const mockOnVerificationFail = jest.fn();

  const mockQuestion = {
    question: 'What is your favorite color?',
    answerHash: 'hashed-blue',
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Default mocks for a successful path
    getRandomSecurityQuestion.mockResolvedValue(mockQuestion);
    // Mock Math.random to ensure a predictable interval for the timer
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    jest.spyOn(global, 'setInterval');
    jest.spyOn(global, 'clearInterval');
    hashText.mockImplementation(async (text) => `hashed-${text}`);
    lockUserAccount.mockResolvedValue(undefined);
    logIdentityVerificationAttempt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default states', () => {
    const { result } = renderHook(() => useIdentityVerification({ user: mockUser, isCourseActive: false }));
    expect(result.current.isVerificationModalOpen).toBe(false);
    expect(result.current.verificationError).toBe('');
    expect(result.current.verificationAttempts).toBe(3);
  });

  describe('Timer Logic', () => {
    it('should not start the verification timer if the course is not active', () => {
      renderHook(() => useIdentityVerification({ user: mockUser, isCourseActive: false }));
      expect(setInterval).not.toHaveBeenCalled();
    });

    it('should start the verification timer when the course becomes active', () => {
      const { rerender } = renderHook(({ isCourseActive }) => useIdentityVerification({ user: mockUser, isCourseActive }), {
        initialProps: { isCourseActive: false },
      });
      expect(setInterval).not.toHaveBeenCalled();

      act(() => {
        rerender({ isCourseActive: true });
      });
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
    });

    it('should clear the timer on unmount', () => {
      const { rerender, unmount } = renderHook(({ isCourseActive }) => useIdentityVerification({ user: mockUser, isCourseActive }), {
        initialProps: { isCourseActive: false },
      });
      act(() => {
        rerender({ isCourseActive: true });
      });
      expect(setInterval).toHaveBeenCalledTimes(1);
      unmount();
      expect(clearInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe('Verification Flow', () => {
    it('should trigger verification, open modal, and fetch a question', async () => {
      const { result } = renderHook(() => useIdentityVerification({
        user: mockUser,
        isCourseActive: true,
        onVerificationStart: mockOnVerificationStart,
      }));

      // Manually trigger the verification process within act
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000); // Advance by 30 mins
        await Promise.resolve(); // Flush promises
      });

      expect(result.current.isVerificationModalOpen).toBe(true);
      expect(mockOnVerificationStart).toHaveBeenCalledTimes(1);
      expect(getRandomSecurityQuestion).toHaveBeenCalledWith(mockUser.uid);
      expect(result.current.verificationQuestion).toEqual(mockQuestion);
      expect(result.current.verificationAttempts).toBe(3);
      expect(result.current.verificationError).toBe('');
    });

    it('should handle successful verification', async () => {
      const { result } = renderHook(() => useIdentityVerification({
        user: mockUser,
        isCourseActive: true,
        onVerificationSuccess: mockOnVerificationSuccess,
      }));

      // Trigger and open modal
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000);
        await Promise.resolve(); // Flush promises to let state updates from the timer complete
      });

      await act(async () => {
        await result.current.handleVerificationSubmit('blue');
      });

      expect(hashText).toHaveBeenCalledWith('blue');
      expect(result.current.isVerificationModalOpen).toBe(false);
      expect(result.current.verificationError).toBe('');
      expect(mockOnVerificationSuccess).toHaveBeenCalledTimes(1);
      expect(logIdentityVerificationAttempt).toHaveBeenCalledWith(mockUser.uid, {
        question: mockQuestion.question,
        userResponse: 'blue',
        result: 'Pass',
        action: 'Successful Validation',
      });
    });

    it('should handle incorrect answers and decrement attempts', async () => {
      const { result } = renderHook(() => useIdentityVerification({ user: mockUser, isCourseActive: true }));

      // Trigger and open modal
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000);
        await Promise.resolve(); // Flush promises
      });

      // Wait for the modal to open, which confirms the state has updated.
      await waitFor(() => expect(result.current.isVerificationModalOpen).toBe(true));

      await act(async () => {
        await result.current.handleVerificationSubmit('red');
      });

      expect(result.current.verificationAttempts).toBe(2);
      expect(result.current.verificationError).toBe('Incorrect answer. You have 2 attempt(s) remaining.');
      expect(result.current.isVerificationModalOpen).toBe(true); // Modal stays open
      expect(lockUserAccount).not.toHaveBeenCalled();
      expect(logIdentityVerificationAttempt).toHaveBeenCalledWith(mockUser.uid, {
        question: mockQuestion.question,
        userResponse: 'red',
        result: 'Fail',
        action: 'Attempt Failed (2/3 remaining)',
      });
    });

    it('should lock account after 3 failed attempts', async () => {
      const { result } = renderHook(() => useIdentityVerification({
        user: mockUser,
        isCourseActive: true,
        onVerificationFail: mockOnVerificationFail,
      }));

      // Trigger and open modal
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000);
        await Promise.resolve(); // Flush promises
      });

      // Make 3 failed attempts
      await act(async () => { await result.current.handleVerificationSubmit('wrong'); });
      await act(async () => { await result.current.handleVerificationSubmit('wrong'); });
      await act(async () => { await result.current.handleVerificationSubmit('wrong'); });

      expect(result.current.verificationAttempts).toBe(0);
      expect(result.current.verificationError).toContain('your account has been locked');
      expect(lockUserAccount).toHaveBeenCalledWith(mockUser.uid);
      expect(logIdentityVerificationAttempt).toHaveBeenCalledWith(mockUser.uid, {
        question: mockQuestion.question,
        userResponse: 'wrong',
        result: 'Fail',
        action: 'Account Locked',
      });
      expect(mockOnVerificationFail).toHaveBeenCalledTimes(1);
    });

    it('should allow user to continue if no security questions are found', async () => {
      getRandomSecurityQuestion.mockResolvedValue(null); // Mock no questions found
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useIdentityVerification({
        user: mockUser,
        isCourseActive: true,
        onVerificationSuccess: mockOnVerificationSuccess,
      }));

      // Trigger verification
      await act(async () => {
        jest.advanceTimersByTime(30 * 60 * 1000);
        await Promise.resolve();
      });

      expect(mockOnVerificationSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.isVerificationModalOpen).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith("No security questions found for user, skipping verification.");
      consoleWarnSpy.mockRestore();
    });
  });
});