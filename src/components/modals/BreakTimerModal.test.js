import React from 'react';
import { render, screen, act } from '@testing-library/react';
import BreakTimerModal from './BreakTimerModal';

// Mock the formatTime utility to return a predictable value
jest.mock('../../utils/formatTime', () => ({
  formatTime: (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
}));

describe('BreakTimerModal', () => {
  beforeAll(() => {
    // Use fake timers to control setInterval
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Restore real timers
    jest.useRealTimers();
  });

  it('should not render when isOpen is false', () => {
    render(<BreakTimerModal isOpen={false} />);
    expect(screen.queryByText('Mandatory Break')).not.toBeInTheDocument();
  });

  it('should render with the correct content and initial countdown when isOpen is true', () => {
    render(<BreakTimerModal isOpen={true} />);

    expect(screen.getByText('Mandatory Break')).toBeInTheDocument();
    expect(screen.getByText(/Please take a mandatory 10-minute break/i)).toBeInTheDocument();
    // Initial time should be 10 minutes (600 seconds)
    expect(screen.getByText(/Time Remaining:/i)).toHaveTextContent('10m 0s');
  });

  it('should update the countdown timer every second', () => {
    render(<BreakTimerModal isOpen={true} />);

    // Check initial time
    expect(screen.getByText(/Time Remaining:/i)).toHaveTextContent('10m 0s');

    // Advance time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Check that the time has updated correctly
    // 600 - 5 = 595 seconds => 9m 55s
    expect(screen.getByText(/Time Remaining:/i)).toHaveTextContent('9m 55s');
  });
});