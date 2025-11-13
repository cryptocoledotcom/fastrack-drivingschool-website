import { useEffect } from 'react';

/**
 * A custom hook to manage side effects on the video player, like pausing it
 * when modals or breaks are active.
 * @param {object} params - The parameters for the hook.
 */
export const usePlayerEffects = ({
  playerRef,
  isOnBreak,
  isTimeLimitReached,
  isVerificationModalOpen,
  isIdleModalOpen,
  isBreakModalOpen,
}) => {
  useEffect(() => {
    // Pause the player if any modal is open or a break/time limit is active.
    const shouldPause =
      isOnBreak ||
      isTimeLimitReached ||
      isVerificationModalOpen ||
      isIdleModalOpen ||
      isBreakModalOpen;

    if (shouldPause) {
      playerRef.current?.pause();
    }
  }, [
    isOnBreak, isTimeLimitReached, isVerificationModalOpen,
    isIdleModalOpen, isBreakModalOpen, playerRef
  ]);
};