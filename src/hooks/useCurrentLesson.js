import { useState, useEffect } from 'react';
import { findFirstUncompletedLesson } from '../utils/courseUtils';

/**
 * A custom hook to determine the current lesson to be displayed in the course player.
 * @param {object} params - The parameters for the hook.
 * @returns {{currentLesson: object|null, courseCompleted: boolean}}
 */
export const useCurrentLesson = ({
  courseLoading,
  progressLoading,
  modules,
  lessons,
  userOverallProgress,
  completedLessons,
  courseId,
}) => {
  const [currentLesson, setCurrentLesson] = useState(null);
  const [courseCompleted, setCourseCompleted] = useState(false);

  useEffect(() => {
    if (courseLoading || progressLoading || modules.length === 0 || Object.keys(lessons).length === 0 || !userOverallProgress) {
      return;
    }

    const allLessonsCount = modules.reduce((acc, m) => acc + m.lessonOrder.length, 0);
    if (allLessonsCount > 0 && completedLessons.size === allLessonsCount) {
      setCourseCompleted(true);
      setCurrentLesson(null);
      return;
    }

    // If we get here, the course is not completed, so reset the flag.
    setCourseCompleted(false);

    const lastViewedLessonId = userOverallProgress.lastViewedLesson?.[courseId];
    const nextLessonId = (lastViewedLessonId && lessons[lastViewedLessonId])
      ? lastViewedLessonId
      : findFirstUncompletedLesson(modules, completedLessons) || modules[0]?.lessonOrder[0];

    if (nextLessonId && lessons[nextLessonId]) {
      setCurrentLesson({ ...lessons[nextLessonId] });
    } else {
      setCurrentLesson(null);
    }
  }, [modules, lessons, completedLessons, courseLoading, progressLoading, userOverallProgress, courseId]);

  return { currentLesson, courseCompleted };
};