import { useState, useEffect, useMemo } from 'react';
import { BreakTimer } from '../utils/breakTimer'; // This path is now correct from the hooks directory

/**
 * A custom React hook to manage the course timer and mandatory breaks.
 *
 * @param {Object} options - The options for the break timer.
 * @param {function} options.showBreakModal - A callback function to show the break modal.
 * @param {function} options.hideBreakModal - A callback function to hide the break modal.
 * @returns {Object} An object containing the timer's state.
 * @property {number} instructionalTime - The total accumulated instructional time in seconds.
 * @property {boolean} isOnBreak - A boolean indicating if the timer is currently in a break period.
 */
export const useBreakTimer = ({ showBreakModal, hideBreakModal }) => {
  const [instructionalTime, setInstructionalTime] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);

  // useMemo ensures the BreakTimer instance is created only once.
  const breakTimer = useMemo(() => {
    return new BreakTimer({
      showBreakModal: () => {
        setIsOnBreak(true);
        showBreakModal();
      },
      hideBreakModal: () => {
        setIsOnBreak(false);
        hideBreakModal();
      },
      // This callback connects the class's internal state to our React state.
      onTick: (newTime) => {
        setInstructionalTime(newTime);
      },
    });
  }, [showBreakModal, hideBreakModal]);

  // useEffect handles the lifecycle of the timer (start/stop).
  useEffect(() => {
    // Start the timer when the component mounts.
    breakTimer.start();

    // Return a cleanup function to stop the timer when the component unmounts.
    // This is crucial to prevent memory leaks.
    return () => {
      breakTimer.stop();
    };
  }, [breakTimer]); // The effect depends on the breakTimer instance.

  return {
    instructionalTime,
    isOnBreak,
  };
};