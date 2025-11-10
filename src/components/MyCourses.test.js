import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyCourses from './MyCourses';
import { useAuth } from '../pages/Auth/AuthContext';
import { getDocs, getDoc, collection, query, where } from 'firebase/firestore';

// Mock the useAuth hook
jest.mock('../pages/Auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the entire firebase/firestore module
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'), // Keep original functions
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

const mockUser = { uid: 'test-user-id' };

const mockCourses = {
  'fastrack-online': {
    title: 'Fastrack Online Driving Course',
    description: 'An online course.',
  },
  'fastrack-behind-the-wheel': {
    title: 'Behind the Wheel Training',
    description: 'In-car lessons.',
  },
};

describe('MyCourses Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
  });

  it('should show a loading state initially', () => {
    // Don't resolve the promises immediately
    getDocs.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <MyCourses />
      </MemoryRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show a message if the user has no courses', async () => {
    // Simulate no enrolled courses and no bookings
    getDocs.mockResolvedValue({ docs: [] });

    render(
      <MemoryRouter>
        <MyCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('You have not purchased any courses yet.')).toBeInTheDocument();
    });
  });

  it('should display an online course with a "Start Lessons" link', async () => {
    // Simulate enrollment in the online course
    const userCoursesSnapshot = {
      docs: [{ data: () => ({ courseId: 'fastrack-online' }) }],
    };
    const courseDocSnapshot = {
      exists: () => true,
      id: 'fastrack-online',
      data: () => mockCourses['fastrack-online'],
    };

    getDocs.mockResolvedValueOnce(userCoursesSnapshot); // For user's courses
    getDoc.mockResolvedValue(courseDocSnapshot); // For the actual course document
    getDocs.mockResolvedValueOnce({ docs: [] }); // For bookings

    render(
      <MemoryRouter>
        <MyCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Fastrack Online Driving Course')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /start lessons/i })).toHaveAttribute('href', '/course-player/fastrack-online');
    });
  });

  it('should display the Behind the Wheel course with a "Schedule Lesson" link if no booking exists', async () => {
    const userCoursesSnapshot = {
      docs: [{ data: () => ({ courseId: 'fastrack-behind-the-wheel' }) }],
    };
    const courseDocSnapshot = {
      exists: () => true,
      id: 'fastrack-behind-the-wheel',
      data: () => mockCourses['fastrack-behind-the-wheel'],
    };

    getDocs.mockResolvedValueOnce(userCoursesSnapshot); // User's courses
    getDoc.mockResolvedValue(courseDocSnapshot); // Course document
    getDocs.mockResolvedValueOnce({ docs: [] }); // No bookings

    render(
      <MemoryRouter>
        <MyCourses />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Behind the Wheel Training')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /schedule lesson/i })).toHaveAttribute('href', '/schedule-lesson');
    });
  });

  // You could add another test here to simulate an existing booking and check for the "Reschedule" button.
});