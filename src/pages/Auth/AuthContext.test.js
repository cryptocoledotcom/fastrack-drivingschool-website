import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { logSessionEvent } from '../../services/userProgressFirestoreService';

// Mock the entire firebase/auth module
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // Immediately invoke callback with null to simulate initial logged-out state
    callback(null);
    // Return a mock unsubscribe function
    return jest.fn();
  }),
}));

// Mock the entire firebase/firestore module
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: jest.fn(),
  doc: jest.fn(),
}));

// Mock our session logging service
jest.mock('../../services/userProgressFirestoreService', () => ({
  logSessionEvent: jest.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  // Wrapper component to provide the context to our hook
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  describe('login function', () => {
    it('should call logSessionEvent("login") on successful login', async () => {
      // Arrange: Mock a successful login and a non-locked user account
      const mockUserCredential = { user: { uid: 'test-user-123' } };
      signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ isLocked: false }) });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act: Call the login function
      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      // Assert: Check that the session event was logged
      expect(logSessionEvent).toHaveBeenCalledWith('login');
      expect(logSessionEvent).toHaveBeenCalledTimes(1);
    });

    it('should NOT call logSessionEvent if the account is locked', async () => {
      // Arrange: Mock a locked user account
      const mockUserCredential = { user: { uid: 'test-user-123' } };
      signInWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ isLocked: true }) });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act & Assert: Expect the login to throw an error
      await expect(act(async () => {
        await result.current.login('test@example.com', 'password');
      })).rejects.toThrow('ACCOUNT_LOCKED');

      // Assert: Check that the session event was NOT logged
      expect(logSessionEvent).not.toHaveBeenCalled();
    });
  });

  describe('logout function', () => {
    it('should call logSessionEvent("logout") before signing out', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Act: Call the logout function
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(logSessionEvent).toHaveBeenCalledWith('logout');
      expect(logSessionEvent).toHaveBeenCalledTimes(1);
      expect(signOut).toHaveBeenCalledTimes(1);

      // This is a more advanced check to ensure the order of operations is correct
      const logOrder = logSessionEvent.mock.invocationCallOrder[0];
      const signOutOrder = signOut.mock.invocationCallOrder[0];
      expect(logOrder).toBeLessThan(signOutOrder);
    });
  });
});