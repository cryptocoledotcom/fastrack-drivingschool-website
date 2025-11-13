import { useEffect } from 'react';
import { saveLessonPlaybackTime } from '../services/userProgressFirestoreService';

/**
 * A custom hook to save user progress when the browser window is about to be unloaded.
 * @param {object} params - The parameters for the hook.
 */
export const useSaveOnExit = ({
  user,
  currentLesson,
  completedLessons,
  saveOnExit, // This is the function from useTimeTracker
  playerRef,
}) => {
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save progress if there's an active lesson that isn't completed
      if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
        saveOnExit(); // Save the accumulated time segment
        const playbackTime = playerRef.current?.getCurrentTime();
        if (playbackTime) {
          saveLessonPlaybackTime(user.uid, currentLesson.id, playbackTime);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentLesson, completedLessons, saveOnExit, playerRef]);
};