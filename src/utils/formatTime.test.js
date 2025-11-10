import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('should return "0s" for 0 seconds', () => {
    expect(formatTime(0)).toBe('0s');
  });

  it('should format times less than a minute correctly', () => {
    expect(formatTime(45)).toBe('45s');
  });

  it('should format times in minutes and seconds', () => {
    expect(formatTime(150)).toBe('2m 30s');
  });

  it('should format times in hours and minutes', () => {
    expect(formatTime(3660)).toBe('1h 1m');
  });

  it('should format times with hours, minutes, and seconds', () => {
    expect(formatTime(3725)).toBe('1h 2m 5s');
  });

  it('should handle exact minute values', () => {
    expect(formatTime(120)).toBe('2m');
  });

  it('should return "0s" for negative or invalid input', () => {
    expect(formatTime(-100)).toBe('0s');
    expect(formatTime(null)).toBe('0s');
  });
});