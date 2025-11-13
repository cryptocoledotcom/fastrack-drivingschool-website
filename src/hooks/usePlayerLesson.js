import { useState, useEffect } from 'react';

/**
 * Manages the currently displayed lesson in the player, allowing for user navigation.
 * @param {object | null} initialLesson - The lesson determined by the main logic (e.g., useCurrentLesson).
 * @param {object} allLessons - The map of all available lessons.
 * @returns {{playerLesson: object|null, handleLessonClick: function}}
 */
export const usePlayerLesson = (initialLesson, allLessons) => {
  const [playerLesson, setPlayerLesson] = useState(initialLesson);

  // Effect to sync the displayed lesson when the initial lesson from props changes.
  useEffect(() => {
    setPlayerLesson(initialLesson);
  }, [initialLesson]);

  const handleLessonClick = (lessonId) => {
    const newLesson = allLessons[lessonId];
    if (newLesson) {
      setPlayerLesson(newLesson);
    }
  };

  return {
    playerLesson,
    handleLessonClick,
  };
};