/**
 * Finds the ID of the first lesson that is not in the completed set.
 * It iterates through modules and their lesson orders to find the next logical lesson.
 * @param {Array<object>} modules - An array of module objects, each with a `lessonOrder` array.
 * @param {Set<string>} completedLessons - A Set containing the IDs of completed lessons.
 * @returns {string|null} The ID of the first uncompleted lesson, or null if all are complete.
 */
export const findFirstUncompletedLesson = (modules, completedLessons) => {
  if (!modules || modules.length === 0) {
    return null;
  }
  for (const module of modules) {
    // Ensure lessonOrder exists and is an array before iterating
    if (module.lessonOrder && Array.isArray(module.lessonOrder)) {
      for (const lessonId of module.lessonOrder) {
        if (!completedLessons.has(lessonId)) {
          return lessonId;
        }
      }
    }
  }
  return null;
};