const { BreakTimer } = require('./breakTimer');

describe('Mandatory Break Enforcement', () => {
  let breakTimer;
  let mockShowBreakModal;
  let mockHideBreakModal;
  let mockOnTick;

  beforeEach(() => {
    // Use Jest's fake timers to control time-based functions like setInterval and setTimeout
    jest.useFakeTimers();

    // Create mock functions to simulate UI interactions
    mockShowBreakModal = jest.fn();
    mockHideBreakModal = jest.fn();
    mockOnTick = jest.fn();

    // Initialize the course timer before each test
    breakTimer = new BreakTimer({
      showBreakModal: mockShowBreakModal,
      hideBreakModal: mockHideBreakModal,
      onTick: mockOnTick,
    });
    breakTimer.start();
  });

  afterEach(() => {
    // Stop the timer and restore real timers after each test
    breakTimer.stop();
    jest.useRealTimers();
  });

  test('should not trigger a break before 120 minutes', () => {
    // Advance time by 119 minutes
    jest.advanceTimersByTime(119 * 60 * 1000);
    expect(mockShowBreakModal).not.toHaveBeenCalled();
    expect(breakTimer.getInstructionalTime()).toBe(119 * 60);
  });

  test('should trigger a 10-minute break at 120 minutes of instructional time', () => {
    // Advance time to exactly 120 minutes
    jest.advanceTimersByTime(120 * 60 * 1000);
    expect(breakTimer.getInstructionalTime()).toBe(120 * 60);
    expect(mockShowBreakModal).toHaveBeenCalledTimes(1);
    expect(breakTimer.isOnBreak()).toBe(true);
  });

  test('should stop crediting instructional time during the break', () => {
    // Trigger the break at 120 minutes
    jest.advanceTimersByTime(120 * 60 * 1000);
    expect(mockShowBreakModal).toHaveBeenCalledTimes(1);
    expect(breakTimer.getInstructionalTime()).toBe(120 * 60);

    // Advance time by 5 minutes into the break
    jest.advanceTimersByTime(5 * 60 * 1000);
    // Instructional time should NOT have increased
    expect(breakTimer.getInstructionalTime()).toBe(120 * 60);
  });

  test('should end the break and call hideBreakModal when endBreak() is called', () => {
    // Trigger the break
    jest.advanceTimersByTime(120 * 60 * 1000);
    expect(breakTimer.isOnBreak()).toBe(true);
    expect(mockHideBreakModal).not.toHaveBeenCalled();

    // Manually end the break
    breakTimer.endBreak();

    expect(mockHideBreakModal).toHaveBeenCalledTimes(1);
    expect(breakTimer.isOnBreak()).toBe(false);
  });
});