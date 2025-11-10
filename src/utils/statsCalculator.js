/**
 * Calculates user progress statistics based on fetched data.
 * @param {object} userProgress - The user's progress data from Firestore.
 * @param {Array<object>} modulesData - An array of all module documents.
 * @param {number} totalLessons - The total number of lessons in the course.
 * @param {number} totalQuizzes - The total number of quizzes in the course.
 * @param {number} totalTests - The total number of tests in the course.
 * @returns {object} An object containing all the calculated statistics.
 */
export const calculateProgressStats = (userProgress, modulesData, totalLessons, totalQuizzes, totalTests) => {
  if (!userProgress) {
    return {
      completedModules: 0,
      totalModules: modulesData.length,
      completedLessons: 0,
      totalLessons,
      completedQuizzes: 0,
      totalQuizzes,
      completedTests: 0,
      totalTests,
      totalTimeSpentSeconds: 0,
      cumulativeGrade: 'N/A',
      courseCompletionPercentage: 0,
    };
  }

  // Helper function to safely get completed items from a progress object
  const getCompletedActivityItems = (activityProgress) => {
    if (!activityProgress) {
      return [];
    }
    return Object.values(activityProgress).filter(item => item.completed);
  };

  // Helper function to safely get completed graded items
  const getCompletedGradedItems = (activityProgress) => {
    if (!activityProgress) {
      return [];
    }
    return Object.values(activityProgress).filter(item => item.completed && typeof item.score === 'number');
  };

  // 1. Determine completed lessons
  const completedLessonIds = new Set(
    userProgress.lessons
      ? Object.keys(userProgress.lessons).filter(id => userProgress.lessons[id].completed)
      : []
  );

  // 2. Count completed modules
  const completedModulesCount = modulesData.reduce((count, module) => {
    const allLessonsInModuleComplete = module.lessonOrder?.every(lessonId => completedLessonIds.has(lessonId));
    return allLessonsInModuleComplete ? count + 1 : count;
  }, 0);

  // 3. Count completed lessons, quizzes, and tests
  const completedLessonsCount = completedLessonIds.size;
  const completedQuizzesCount = getCompletedActivityItems(userProgress.quizzes).length;
  const completedTestsCount = getCompletedActivityItems(userProgress.tests).length;

  // 4. Calculate total time spent
  const totalTimeSpentSeconds = userProgress.lessons
    ? Object.values(userProgress.lessons).reduce((total, lesson) => total + (lesson.timeSpentSeconds || 0), 0)
    : 0;

  // 5. Calculate cumulative grade
  const calculateCumulativeGrade = (userProgress) => {
    const completedQuizzes = getCompletedGradedItems(userProgress.quizzes);
    const completedTests = getCompletedGradedItems(userProgress.tests);

    const allCompletedGradedItems = [...completedQuizzes, ...completedTests];

    if (allCompletedGradedItems.length === 0) {
      return 'N/A';
    }

    const sumScores = allCompletedGradedItems.reduce((sum, item) => sum + item.score, 0);
    return (sumScores / allCompletedGradedItems.length).toFixed(1) + '%';
  };
  const cumulativeGrade = calculateCumulativeGrade(userProgress);

  // 6. Calculate course completion percentage
  const calculateCourseCompletionPercentage = (completedItems, totalItems) => {
    if (totalItems === 0) {
      return 0;
    }
    return Math.round((completedItems / totalItems) * 100);
  };
  const totalCompletableItems = totalLessons + totalQuizzes + totalTests;
  const totalCompletedItems = completedLessonsCount + completedQuizzesCount + completedTestsCount;
  const courseCompletionPercentage = calculateCourseCompletionPercentage(totalCompletedItems, totalCompletableItems);

  // --- Return final stats ---
  return {
    completedModules: completedModulesCount,
    totalModules: modulesData.length,
    completedLessons: completedLessonsCount,
    totalLessons,
    completedQuizzes: completedQuizzesCount,
    totalQuizzes,
    completedTests: completedTestsCount,
    totalTests,
    totalTimeSpentSeconds,
    cumulativeGrade,
    courseCompletionPercentage,
  };
};