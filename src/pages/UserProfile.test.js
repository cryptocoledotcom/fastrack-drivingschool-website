import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import { getDoc } from 'firebase/firestore';
import { setSecurityQuestions as saveSecurityQuestionsToFirestore } from '../services/userProgressFirestoreService';

// Mock dependencies
jest.mock('./Auth/AuthContext');
jest.mock('../components/Notification/NotificationContext');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  doc: (db, path, ...pathSegments) => ({
    path: [path, ...pathSegments].join('/'),
    id: pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : path,
  }),
}));
jest.mock('../services/userProgressFirestoreService');

// Mock child components to isolate UserProfile
jest.mock('../components/MyCourses', () => () => <div>MyCourses Component</div>);
jest.mock('./UserProgressDashboard', () => () => <div>UserProgressDashboard Component</div>);
jest.mock('../components/profile/ProfileDisplay', () => ({ profile, email, onEdit }) => (
  <div>
    <h1>Profile Display</h1>
    <span>{profile?.firstName} {profile?.lastName}</span>
    <span>{email}</span>
    <button onClick={onEdit}>Edit Profile</button>
  </div>
));
jest.mock('../components/profile/ProfileEditForm', () => ({ onSave, onCancel }) => (
  <form onSubmit={onSave}>
    <h1>Profile Edit Form</h1>
    <button type="submit">Save Profile</button>
    <button type="button" onClick={onCancel}>Cancel Profile Edit</button>
  </form>
));
jest.mock('../components/profile/SecurityQuestionsDisplay', () => ({ onEdit }) => (
  <div>
    <h1>Security Questions Display</h1>
    <button onClick={onEdit}>Edit Security Questions</button>
  </div>
));
jest.mock('../components/profile/SecurityQuestionsEditForm', () => ({ onSave, onCancel }) => (
   <form onSubmit={onSave}>
    <h1>Security Questions Edit Form</h1>
    <button type="submit">Save Security Questions</button>
    <button type="button" onClick={onCancel}>Cancel Security Edit</button>
  </form>
));

describe('UserProfile Component', () => {
  const mockShowNotification = jest.fn();
  const mockLogout = jest.fn();
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });
    useNotification.mockReturnValue({ showNotification: mockShowNotification });
    saveSecurityQuestionsToFirestore.mockResolvedValue();
  });

  it('should show loading state initially', () => {
    getDoc.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<UserProfile />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('should prompt user to log in if not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<UserProfile />);
    expect(screen.getByText('Please log in to view your profile.')).toBeInTheDocument();
  });

  it('should display user profile and security questions when data exists', async () => {
    const profileData = { firstName: 'John', lastName: 'Doe' };
    const securityData = { questions: [{ question: 'Pet name?', answerHash: 'hashed_answer' }] };

    getDoc.mockImplementation((docRef) => {
      if (docRef.path.includes('securityProfile')) {
        return Promise.resolve({ exists: () => true, data: () => securityData });
      }
      return Promise.resolve({ exists: () => true, data: () => profileData });
    });

    render(<UserProfile />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Security Questions Display')).toBeInTheDocument();
    });
  });

  it('should show the profile and security edit forms if no data exists', async () => {
    // This is the definitive fix. We explicitly mock the two-step fetch for a new user.
    getDoc.mockImplementation((docRef) => {
      // For this test, we simulate that BOTH documents do not exist.
      // This is a valid state that should not produce a console error.
      return Promise.resolve({ exists: () => false, data: () => undefined });
    });

    // Spy on console.error to ensure it is NOT called.
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<UserProfile />);

    // The hook will find no profile and no security questions, triggering edit modes.
    await waitFor(() => {
      expect(screen.getByText('Profile Edit Form')).toBeInTheDocument();
      expect(screen.getByText('Security Questions Edit Form')).toBeInTheDocument();
    });

    // Assert that our correct mock prevents any errors from being logged.
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should switch to profile edit mode when "Edit Profile" is clicked', async () => {
    const profileData = { firstName: 'John', lastName: 'Doe' };
    // We still need to mock both calls, even if we only care about the profile for this test.
    getDoc.mockImplementation((docRef) => {
      if (docRef.path.includes('securityProfile')) {
        return Promise.resolve({ exists: () => false, data: () => undefined });
      }
      return Promise.resolve({ exists: () => true, data: () => profileData });
    });

    render(<UserProfile />);
    await screen.findByText('Profile Display');

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await userEvent.click(editButton);

    expect(screen.getByText('Profile Edit Form')).toBeInTheDocument();
  });

  it('should call logout when the logout button is clicked', async () => {
    // Mock a basic state where the user has no profile data
    getDoc.mockResolvedValue({ exists: () => false });
    render(<UserProfile />);

    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    await userEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
