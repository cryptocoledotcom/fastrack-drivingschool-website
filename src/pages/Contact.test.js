import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Contact from './Contact';
import { useNotification } from '../components/Notification/NotificationContext';
import { addDoc, collection } from 'firebase/firestore';

// Mock the NotificationContext to spy on the showNotification function
jest.mock('../components/Notification/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

// Mock the firebase/firestore module to prevent actual database writes
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'), // Import and retain default exports
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

describe('Contact Component', () => {
  const mockShowNotification = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Provide a fresh mock implementation for useNotification for each test
    useNotification.mockReturnValue({ showNotification: mockShowNotification });
  });

  it('should render the contact form correctly', () => {
    render(<Contact />);
    expect(screen.getByRole('heading', { name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('should allow the user to fill out the form', async () => {
    render(<Contact />);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageTextarea = screen.getByLabelText(/message/i);

    await userEvent.type(nameInput, 'John Doe');
    await userEvent.type(emailInput, 'john.doe@example.com');
    await userEvent.type(messageTextarea, 'This is a test message.');

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john.doe@example.com');
    expect(messageTextarea.value).toBe('This is a test message.');
  });

  it('should submit the form, show a success notification, and clear the fields', async () => {
    // Mock a successful Firestore write
    addDoc.mockResolvedValue({ id: 'mock-doc-id' });

    render(<Contact />);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageTextarea = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });

    await userEvent.type(nameInput, 'Jane Doe');
    await userEvent.type(emailInput, 'jane.doe@example.com');
    await userEvent.type(messageTextarea, 'Another test message.');
    await userEvent.click(submitButton);

    // Wait for the async operations to complete
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledTimes(1);
      expect(mockShowNotification).toHaveBeenCalledWith('Message sent successfully!', 'success');
      expect(nameInput.value).toBe('');
      expect(emailInput.value).toBe('');
      expect(messageTextarea.value).toBe('');
    });
  });

  it('should show an error notification if the form submission fails', async () => {
    // Temporarily mock console.error to suppress the expected error message in the test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock a failed Firestore write
    addDoc.mockRejectedValue(new Error('Firestore write failed'));

    render(<Contact />);

    await userEvent.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane.doe@example.com');
    await userEvent.type(screen.getByLabelText(/message/i), 'A failing message.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith('Failed to send message. Please try again later.', 'error');
    });

    // Restore the original console.error
    consoleErrorSpy.mockRestore();
  });
});