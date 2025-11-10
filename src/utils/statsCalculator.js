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

  // --- Calculations ---
  const completedLessonIds = new Set(
    userProgress.lessons ? Object.keys(userProgress.lessons).filter(id => userProgress.lessons[id].completed) : []
  );

  const completedModules = modulesData.reduce((count, module) => {
    const allLessonsInModuleComplete = module.lessonOrder?.every(lessonId => completedLessonIds.has(lessonId));
    return allLessonsInModuleComplete ? count + 1 : count;
  }, 0);

  const completedLessons = completedLessonIds.size;
  const completedQuizzes = userProgress.quizzes ? Object.values(userProgress.quizzes).filter(q => q.completed).length : 0;
  const completedTests = userProgress.tests ? Object.values(userProgress.tests).filter(t => t.completed).length : 0;

  const totalTimeSpentSeconds = userProgress.lessons ? Object.values(userProgress.lessons).reduce((total, lesson) => total + (lesson.timeSpentSeconds || 0), 0) : 0;

  const allGradedItems = [
    ...(userProgress.quizzes ? Object.values(userProgress.quizzes) : []),
    ...(userProgress.tests ? Object.values(userProgress.tests) : [])
  ];
  const completedGradedItems = allGradedItems.filter(item => item.completed && typeof item.score === 'number');
  const cumulativeGrade = completedGradedItems.length > 0
    ? (completedGradedItems.reduce((sum, item) => sum + item.score, 0) / completedGradedItems.length).toFixed(1) + '%'
    : 'N/A';

  const totalCompletableItems = totalLessons + totalQuizzes + totalTests;
  const totalCompletedItems = completedLessons + completedQuizzes + completedTests;
  const courseCompletionPercentage = totalCompletableItems > 0
    ? Math.round((totalCompletedItems / totalCompletableItems) * 100)
    : 0;

  return {
    completedModules, totalModules: modulesData.length,
    completedLessons, totalLessons,
    completedQuizzes, totalQuizzes,
    completedTests, totalTests,
    totalTimeSpentSeconds, cumulativeGrade, courseCompletionPercentage,
  };
};