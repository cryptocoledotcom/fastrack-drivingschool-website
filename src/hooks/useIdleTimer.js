import { useEffect, useRef } from 'react';

/**
 * A custom hook to detect user inactivity.
 * @param {function} onIdle - The function to call when the user is idle.
 * @param {number} timeout - The idle timeout in milliseconds.
 */
export const useIdleTimer = (onIdle, timeout) => {
  const timeoutIdRef = useRef(null);
  const onIdleRef = useRef(onIdle);

  // Keep the onIdle callback reference up-to-date without re-triggering the effect
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    const events = ['mousemove', 'keypress', 'touchstart', 'scroll'];

    const startTimer = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      timeoutIdRef.current = setTimeout(() => {
        onIdleRef.current();
      }, timeout);
    };

    // Add event listeners that reset the timer on any activity
    events.forEach(event => {
      window.addEventListener(event, startTimer);
    });

    // Set the initial timer
    startTimer();

    // Cleanup function to remove listeners and clear the timer
    return () => {
      clearTimeout(timeoutIdRef.current);
      events.forEach(event => {
        window.removeEventListener(event, startTimer);
      });
    };
  }, [timeout]); // Only re-run the effect if the timeout duration changes
};