import { useRef, useCallback, useEffect } from 'react';
import { addLessonTime } from '../services/userProgressFirestoreService';

/**
 * A custom hook to manage active time tracking for a lesson.
 * @param {object} user - The authenticated user object.
 * @param {object} currentLesson - The current lesson object.
 * @param {boolean} isTimeLimitReached - A boolean indicating if the daily time limit is reached.
 * @param {Set<string>} completedLessons - A set of completed lesson IDs.
 * @returns {object} An object containing handlePlay, handlePause, and saveOnExit functions.
 */
export const useTimeTracker = (user, currentLesson, isTimeLimitReached, completedLessons) => {
  const activeTimeSegmentStartRef = useRef(0);
  const isTrackingActiveTimeRef = useRef(false);

  // Function to save the currently accumulated active time segment.
  const saveCurrentActiveTime = useCallback(() => {
    if (user && currentLesson && !completedLessons.has(currentLesson.id) && activeTimeSegmentStartRef.current > 0) {
      const secondsToAccumulate = Math.floor((Date.now() - activeTimeSegmentStartRef.current) / 1000);
      if (secondsToAccumulate > 0) {
        addLessonTime(user.uid, currentLesson.id, secondsToAccumulate);
      }
    }
    // Reset the segment start time. If still tracking, start a new segment from now.
    activeTimeSegmentStartRef.current = isTrackingActiveTimeRef.current ? Date.now() : 0;
  }, [user, currentLesson, completedLessons]);

  // Effect for periodic time saving every 30 seconds.
  useEffect(() => {
    const SAVE_INTERVAL_MS = 30 * 1000;

    const periodicTimeSave = () => {
      if (isTrackingActiveTimeRef.current && !document.hidden) {
        saveCurrentActiveTime();
      }
    };

    const timeSaveIntervalId = setInterval(periodicTimeSave, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(timeSaveIntervalId);
    };
  }, [saveCurrentActiveTime]);

  // Handler to be called when the video starts playing.
  const handlePlay = useCallback(() => {
    if (!isTimeLimitReached && currentLesson && !completedLessons.has(currentLesson.id)) {
      isTrackingActiveTimeRef.current = true;
      activeTimeSegmentStartRef.current = Date.now();
    }
  }, [isTimeLimitReached, currentLesson, completedLessons]);

  // Handler to be called when the video is paused.
  const handlePause = useCallback(() => {
    saveCurrentActiveTime();
    isTrackingActiveTimeRef.current = false;
  }, [saveCurrentActiveTime]);

  // Handler to be called when the component is unmounting or the page is closing.
  const saveOnExit = useCallback(() => {
    // This function is a wrapper to be used in cleanup effects.
    // It ensures that even if the component unmounts while tracking, the time is saved.
    if (isTrackingActiveTimeRef.current) {
      saveCurrentActiveTime();
      isTrackingActiveTimeRef.current = false;
    }
  }, [saveCurrentActiveTime]);

  // Reset time tracking state when the lesson changes.
  useEffect(() => {
    activeTimeSegmentStartRef.current = 0;
    isTrackingActiveTimeRef.current = false;
  }, [currentLesson]);

  return { handlePlay, handlePause, saveOnExit };
};