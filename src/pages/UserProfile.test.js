import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserProfile from './UserProfile';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';
import { getDoc, setDoc } from 'firebase/firestore';
import { setSecurityQuestions as saveSecurityQuestionsToFirestore } from '../services/userProgressFirestoreService';

// Mock dependencies
jest.mock('./Auth/AuthContext');
jest.mock('../components/Notification/NotificationContext');
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'), // Import and retain default exports
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('../services/userProgressFirestoreService');

// Mock child components to isolate UserProfile
jest.mock('../components/MyCourses', () => () => <div>MyCourses Component</div>);
jest.mock('./UserProgressDashboard', () => () => <div>UserProgressDashboard Component</div>);
jest.mock('../components/profile/ProfileDisplay', () => ({ profile, email, onEdit }) => (
  <div>
    <span>{profile?.firstName} {profile?.lastName}</span>
    <span>{email}</span>
    <button onClick={onEdit}>Edit Profile</button>
  </div>
));
jest.mock('../components/profile/ProfileEditForm', () => ({ onSave, onCancel }) => (
  <form onSubmit={onSave}>
    <p>Profile Edit Form</p>
    <button type="submit">Save Profile</button>
    <button type="button" onClick={onCancel}>Cancel Profile Edit</button>
  </form>
));
jest.mock('../components/profile/SecurityQuestionsDisplay', () => ({ onEdit }) => (
  <div>
    <p>Security Questions Display</p>
    <button onClick={onEdit}>Edit Security Questions</button>
  </div>
));
jest.mock('../components/profile/SecurityQuestionsEditForm', () => ({ onSave, onCancel }) => (
   <form onSubmit={onSave}>
    <p>Security Questions Edit Form</p>
    <button type="submit">Save Security Questions</button>
    <button type="button" onClick={onCancel}>Cancel Security Edit</button>
  </form>
));


describe('UserProfile Component', () => {
  const mockShowNotification = jest.fn();
  const mockLogout = jest.fn();
  const mockUser = { uid: 'test-user-123', email: 'test@example.com' };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    useAuth.mockReturnValue({ user: mockUser, logout: mockLogout });
    useNotification.mockReturnValue({ showNotification: mockShowNotification });
    saveSecurityQuestionsToFirestore.mockResolvedValue();
  });

  it('should show loading state initially', () => {
    getDoc.mockReturnValue(new Promise(() => {})); // Promise that never resolves
    render(<UserProfile />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('should prompt user to log in if not authenticated', () => {
    useAuth.mockReturnValue({ user: null }); // Simulate logged-out state
    render(<UserProfile />);
    expect(screen.getByText('Please log in to view your profile.')).toBeInTheDocument();
  });

  it('should display user profile and security questions when data exists', async () => {
    // Mock Firestore responses
    const profileData = { firstName: 'John', lastName: 'Doe' };
    const securityData = { questions: [{ question: 'Pet name?', answer: 'hashed_answer' }] };

    getDoc.mockImplementation((docRef) => {
      if (docRef.path.includes('securityProfile')) {
        return Promise.resolve({ exists: () => true, data: () => securityData });
      }
      return Promise.resolve({ exists: () => true, data: () => profileData });
    });

    render(<UserProfile />);

    // Wait for the profile data to be displayed
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Check that the security questions display component is rendered
    expect(screen.getByText('Security Questions Display')).toBeInTheDocument();
  });

  it('should show the profile edit form if no profile exists', async () => {
    // Simulate no profile document
    getDoc.mockResolvedValue({ exists: () => false });

    render(<UserProfile />);

    // The component should automatically go into editing mode
    await waitFor(() => {
      expect(screen.getByText('Profile Edit Form')).toBeInTheDocument();
    });
  });

  it('should switch to edit mode when "Edit Profile" is clicked', async () => {
    const profileData = { firstName: 'John', lastName: 'Doe' };
    getDoc.mockResolvedValue({ exists: () => true, data: () => profileData });

    render(<UserProfile />);

    // Wait for display mode to render
    await screen.findByText('John Doe');

    // Click the edit button
    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await userEvent.click(editButton);

    // Assert that the edit form is now visible
    expect(screen.getByText('Profile Edit Form')).toBeInTheDocument();
  });

  it('should call logout when the logout button is clicked', async () => {
    getDoc.mockResolvedValue({ exists: () => false }); // Render any state
    render(<UserProfile />);

    const logoutButton = await screen.findByRole('button', { name: /logout/i });
    await userEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});