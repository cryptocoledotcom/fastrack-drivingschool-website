import { calculateProgressStats } from './statsCalculator';

// The 'describe' block groups together related tests for our function.
describe('calculateProgressStats', () => {

  // Test Case 1: A brand new user with no progress data.
  // The 'it' block describes what this specific test is checking.
  it('should return initial stats for a new user (null progress)', () => {
    // --- Setup ---
    // We create mock data that simulates the inputs for a new user.
    const userProgress = null;
    const modulesData = [{ id: 'm1' }, { id: 'm2' }]; // 2 total modules
    const totalLessons = 10;
    const totalQuizzes = 5;
    const totalTests = 2;

    // --- Execute ---
    // We call the function with our mock data.
    const stats = calculateProgressStats(userProgress, modulesData, totalLessons, totalQuizzes, totalTests);

    // --- Assert ---
    // We use 'expect' to check if the output is exactly what we want.
    expect(stats).toEqual({
      completedModules: 0,
      totalModules: 2,
      completedLessons: 0,
      totalLessons: 10,
      completedQuizzes: 0,
      totalQuizzes: 5,
      completedTests: 0,
      totalTests: 2,
      totalTimeSpentSeconds: 0,
      cumulativeGrade: 'N/A',
      courseCompletionPercentage: 0,
    });
  });

  // Test Case 2: A user with some progress.
  it('should correctly calculate stats for a user with partial progress', () => {
    // --- Setup ---
    // More complex mock data to simulate a user in the middle of the course.
    const modulesData = [
      { id: 'm1', lessonOrder: ['l1', 'l2'] }, // Module 1 has 2 lessons
      { id: 'm2', lessonOrder: ['l3'] },       // Module 2 has 1 lesson
    ];
    const userProgress = {
      lessons: {
        'l1': { completed: true, timeSpentSeconds: 300 }, // Completed
        'l2': { completed: true, timeSpentSeconds: 500 }, // Completed
        'l3': { completed: false, timeSpentSeconds: 100 },// Not completed
      },
      quizzes: {
        'q1': { completed: true, score: 80 }, // Completed quiz
        'q2': { completed: false },
      },
      tests: {
        't1': { completed: true, score: 90 }, // Completed test
      },
    };
    const totalLessons = 3;
    const totalQuizzes = 2;
    const totalTests = 1;

    // --- Execute ---
    const stats = calculateProgressStats(userProgress, modulesData, totalLessons, totalQuizzes, totalTests);

    // --- Assert ---
    // We can check each property individually.
    expect(stats.completedModules).toBe(1); // Module 'm1' is complete
    expect(stats.totalModules).toBe(2);

    expect(stats.completedLessons).toBe(2);
    expect(stats.totalLessons).toBe(3);

    expect(stats.completedQuizzes).toBe(1);
    expect(stats.totalQuizzes).toBe(2);

    expect(stats.completedTests).toBe(1);
    expect(stats.totalTests).toBe(1);

    expect(stats.totalTimeSpentSeconds).toBe(900); // 300 + 500 + 100

    // Cumulative grade is the average of completed quiz and test scores (80 + 90) / 2 = 85
    expect(stats.cumulativeGrade).toBe('85.0%');

    // Course completion is (completed items / total items) * 100
    // (2 lessons + 1 quiz + 1 test) / (3 lessons + 2 quizzes + 1 test) = 4 / 6
    // (4 / 6) * 100 = 66.66..., which rounds to 67
    expect(stats.courseCompletionPercentage).toBe(67);
  });

  // Test Case 3: Edge case with no completable items.
  it('should handle division by zero and return 0% completion if there are no items', () => {
    const stats = calculateProgressStats({}, [], 0, 0, 0);
    expect(stats.courseCompletionPercentage).toBe(0);
  });

});
