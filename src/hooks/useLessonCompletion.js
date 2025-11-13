import { useState, useCallback, useEffect } from 'react';
import { useNotification } from '../components/Notification/NotificationContext';

/**
 * Manages the logic for completing a lesson, including video watch status.
 * @param {object} user - The authenticated user.
 * @param {object} currentLesson - The current lesson object.
 * @param {string} courseId - The ID of the current course.
 * @param {object} progressActions - The actions object from useUserCourseProgress.
 * @returns {object} An object containing completion status and actions.
 */
export const useLessonCompletion = ({ user, currentLesson, courseId, progressActions }) => {
  const { showNotification } = useNotification();
  const [allVideosWatched, setAllVideosWatched] = useState(false);

  const isCompletable = currentLesson?.type !== 'activity' ? allVideosWatched : true;

  // When the lesson changes, reset the video watched status.
  useEffect(() => {
    setAllVideosWatched(false);
  }, [currentLesson]);

  const handleCompleteLesson = useCallback(async () => {
    if (!user || !currentLesson) return;

    try {
      await progressActions.completeLesson(currentLesson.id, courseId);
      // After completing, reset for the next lesson
      setAllVideosWatched(false);
    } catch (err) {
      console.error("Error saving progress:", err);
      showNotification("Could not save your progress. Please try again.", "error");
    }
  }, [user, currentLesson, courseId, progressActions, showNotification]);

  return {
    isCompletable,
    handleCompleteLesson,
    // Expose the setter to be used by the VideoPlayer component
    onAllVideosWatched: setAllVideosWatched,
  };
};