import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TimeLimitModal from './TimeLimitModal';

describe('TimeLimitModal', () => {
  const mockMessage = 'You have reached the daily time limit.';

  it('should not render when isOpen is false', () => {
    render(<TimeLimitModal isOpen={false} onClose={() => {}} message={mockMessage} />);
    expect(screen.queryByText('Time Limit Reached')).not.toBeInTheDocument();
  });

  it('should render with the correct title and message when isOpen is true', () => {
    render(<TimeLimitModal isOpen={true} onClose={() => {}} message={mockMessage} />);

    expect(screen.getByText('Time Limit Reached')).toBeInTheDocument();
    expect(screen.getByText(mockMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('should call onClose when the "OK" button is clicked', () => {
    // Create a mock function for the onClose prop
    const mockOnClose = jest.fn();

    render(<TimeLimitModal isOpen={true} onClose={mockOnClose} message={mockMessage} />);

    // Find the button and simulate a click
    const okButton = screen.getByRole('button', { name: 'OK' });
    fireEvent.click(okButton);

    // Assert that the mock function was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});