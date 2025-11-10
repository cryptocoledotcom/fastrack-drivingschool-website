import { useState, useEffect, useCallback, act } from 'react';
import { useIdleTimer } from './useIdleTimer';
import { getTimeSpentToday } from '../services/userProgressFirestoreService';

const FOUR_HOURS_IN_SECONDS = 4 * 60 * 60;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Manages the user's session state, including idleness and daily time limits.
 * @param {object} user - The authenticated user object.
 * @param {boolean} isCourseActive - Whether the course player is in an active state (e.g., lesson is playing).
 * @param {function} onIdle - Callback to execute when the user becomes idle (e.g., to pause video).
 * @returns {object} Session state and actions.
 */
export const useCourseSession = (user, isCourseActive, onIdle) => {
  const [isIdle, setIsIdle] = useState(false);
  const [isTimeLimitReached, setIsTimeLimitReached] = useState(false);
  const [resumeTimeMessage, setResumeTimeMessage] = useState('');

  // --- Idle Detection ---
  const handleIdle = useCallback(() => {
    if (isCourseActive) {
      onIdle?.();
      setIsIdle(true);
    }
  }, [isCourseActive, onIdle]);

  useIdleTimer(handleIdle, IDLE_TIMEOUT_MS);

  const confirmNotIdle = () => {
    setIsIdle(false);
  };

  // --- Daily Time Limit ---
  useEffect(() => {
    if (!user || !isCourseActive) {
      return; // Don't check time limit if user is not active in a course
    }

    const checkDailyTimeLimit = async () => {
      try {
        const totalTimeTodaySeconds = await getTimeSpentToday(user.uid);
        if (totalTimeTodaySeconds >= FOUR_HOURS_IN_SECONDS) {
          act(() => {
            setIsTimeLimitReached(true);
            const now = new Date();
            const nextLearningDay = new Date(now);
            if (now.getHours() >= 12) {
              nextLearningDay.setDate(now.getDate() + 1);
            }
            nextLearningDay.setHours(12, 0, 0, 0);
            setResumeTimeMessage(`You have completed the state maximum of 4 hours per 24-hour block. You may continue your next learning journey after ${nextLearningDay.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${nextLearningDay.toLocaleDateString()}.`);
          });
        } else {
          act(() => {
            setIsTimeLimitReached(false);
            setResumeTimeMessage('');
          });
        }
      } catch (error) {
        console.error("Failed to check daily time limit:", error);
      }
    };

    checkDailyTimeLimit(); // Check immediately
    const interval = setInterval(checkDailyTimeLimit, 5 * 60 * 1000); // And then every 5 minutes

    return () => clearInterval(interval);
  }, [user, isCourseActive]);

  return {
    isIdle,
    isTimeLimitReached,
    resumeTimeMessage,
    actions: {
      confirmNotIdle,
      closeTimeLimitModal: () => setIsTimeLimitReached(false),
    },
  };
};