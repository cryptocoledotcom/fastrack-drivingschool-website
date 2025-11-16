import { useState, useEffect, useRef, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getRandomSecurityQuestion, lockUserAccount } from '../services/userProgressFirestoreService';

/**
 * A custom hook to manage periodic identity verification.
 * @param {object} options - The options for the hook.
 * @param {object} options.user - The authenticated user object.
 * @param {boolean} options.isCourseActive - Whether the course is currently active.
 * @param {object} options.currentLesson - The currently active lesson.
 * @param {function} options.onVerificationStart - Callback to run when verification starts (e.g., to pause video).
 * @param {function} options.onVerificationSuccess - Callback to run on success (e.g., to play video).
 * @param {function} options.onVerificationFail - Callback to run on final failure (e.g., to log out).
 * @returns {object} The state and handlers for the identity verification modal.
 */
export const useIdentityVerification = ({ user, isCourseActive, currentLesson, onVerificationStart, onVerificationSuccess, onVerificationFail }) => {
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationQuestion, setVerificationQuestion] = useState(null); 
  const [verificationError, setVerificationError] = useState('');
  const [verificationAttempts, setVerificationAttempts] = useState(3); // Default attempts
  const verificationIntervalRef = useRef(null);
  const callbackRef = useRef({});

  // Keep the ref updated with the latest callbacks to prevent stale closures
  useEffect(() => {
    callbackRef.current = { onVerificationStart, onVerificationSuccess, onVerificationFail };
  }, [onVerificationStart, onVerificationSuccess, onVerificationFail]);

  // Function to initiate verification, wrapped in useCallback for stable dependency
  const triggerVerification = useCallback(async () => {
    if (!user) return;
    callbackRef.current.onVerificationStart?.();
    try {
      const question = await getRandomSecurityQuestion(user.uid);
      if (question && question.answerHash) { // Ensure a valid question with an answer is returned
        setVerificationQuestion(question);
        setIsVerificationModalOpen(true);
        setVerificationError('');
      } else {
        // Successful path for 'no questions found' scenario (Line 186 fix)
        console.warn("No security questions found for user, skipping verification.");
        callbackRef.current.onVerificationSuccess?.();
        // Resetting attempts here ensures that if verification is skipped, 
        // the user gets a fresh count for when questions become available.
        setVerificationAttempts(3); 
      }
    } catch (err) {
      console.error("Failed to trigger verification check:", err);
    }
  }, [user]);


  // --- Timer Setup and Cleanup (Fixed Timer Logic - Line 75 fix) ---
  useEffect(() => {
    // If course is active and user is logged in
    if (user && isCourseActive) {
      // Use a consistent value for testing purposes, but maintain the random logic for production.
      // 30 minutes in milliseconds (30 * 60 * 1000)
      const intervalMs = (Math.random() * (40 - 20) + 20) * 60 * 1000; 
      
      // Clear existing interval before starting a new one (important for dependency changes)
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
      }
      
      // Start new interval
      verificationIntervalRef.current = setInterval(triggerVerification, intervalMs);
    } else {
      // Clear interval if course is inactive or user logs out
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
        verificationIntervalRef.current = null;
      }
    }

    // FINAL CLEANUP FUNCTION (Fixed the 0-call error by ensuring cleanup runs on unmount)
    return () => {
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
        verificationIntervalRef.current = null; 
      }
    };
  }, [user, isCourseActive, triggerVerification]);

  // --- Trigger verification when a test starts ---
  useEffect(() => {
    if (currentLesson?.type === 'test') {
      triggerVerification();
    }
  }, [currentLesson, triggerVerification]);


  // --- Core Verification Submission Logic (Fixed Attempts Logic - Lines 137, 160 fix) ---
  const handleVerificationSubmit = useCallback(
    async userAnswer => {
      if (verificationAttempts <= 0) {
        setVerificationError('Your account is locked. Please contact support.');
        return;
      }

      const functions = getFunctions();
      const verifyFunction = httpsCallable(functions, 'verifySecurityQuestionAndLog');

      try {
        const result = await verifyFunction({
          question: verificationQuestion.question,
          answer: userAnswer.trim()
        });

        if (result.data.success) {
          // SUCCESS PATH
          setIsVerificationModalOpen(false);
          setVerificationError('');
          setVerificationAttempts(3); // Reset attempts on success
          callbackRef.current.onVerificationSuccess?.();
        } else {
          // FAILURE PATH
          const newAttemptsLeft = verificationAttempts - 1;
          setVerificationAttempts(newAttemptsLeft);

          if (newAttemptsLeft <= 0) {
            setVerificationError('You have failed identity verification and your account has been locked.');
            await lockUserAccount(user.uid);
            callbackRef.current.onVerificationFail?.();
          } else {
            setVerificationError(`Incorrect answer. You have ${newAttemptsLeft} attempt(s) remaining.`);
          }
        }
      } catch (error) {
        console.error('Error calling verifySecurityQuestionAndLog function:', error);
        setVerificationError('An error occurred while verifying your answer. Please try again.');
      }
    },
    [user, verificationQuestion, verificationAttempts]
  );


  return {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
    actions: {
      triggerVerificationNow: triggerVerification
    }
  };
};