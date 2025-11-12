import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IdleModal from './IdleModal';

describe('IdleModal', () => {
  it('should not render when isOpen is false', () => {
    render(<IdleModal isOpen={false} onConfirm={() => {}} />);
    // Use queryByText because it returns null if not found, preventing an error.
    expect(screen.queryByText('Are you still there?')).not.toBeInTheDocument();
  });

  it('should render with the correct content when isOpen is true', () => {
    render(<IdleModal isOpen={true} onConfirm={() => {}} />);

    expect(screen.getByText('Are you still there?')).toBeInTheDocument();
    expect(screen.getByText(/Inactivity for another 5 minutes will result in a logout./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i'm still here/i })).toBeInTheDocument();
  });

  it('should call onConfirm when the button is clicked', () => {
    // Create a mock function to pass as the onConfirm prop
    const mockOnConfirm = jest.fn();

    render(<IdleModal isOpen={true} onConfirm={mockOnConfirm} />);

    // Find the button and simulate a click
    const confirmButton = screen.getByRole('button', { name: /i'm still here/i });
    fireEvent.click(confirmButton);

    // Assert that our mock function was called exactly once
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });
});