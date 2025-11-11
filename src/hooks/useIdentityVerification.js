import { useState, useEffect, useRef, useCallback } from 'react';
import { hashText, getRandomSecurityQuestion, lockUserAccount, logVerificationAttempt } from '../services/userProgressFirestoreService';

/**
 * A custom hook to manage periodic identity verification.
 * @param {object} options - The options for the hook.
 * @param {object} options.user - The authenticated user object.
 * @param {boolean} options.isCourseActive - Whether the course is currently active.
 * @param {function} options.onVerificationStart - Callback to run when verification starts (e.g., to pause video).
 * @param {function} options.onVerificationSuccess - Callback to run on success (e.g., to play video).
 * @param {function} options.onVerificationFail - Callback to run on final failure (e.g., to log out).
 * @returns {object} The state and handlers for the identity verification modal.
 */
export const useIdentityVerification = ({ user, isCourseActive, onVerificationStart, onVerificationSuccess, onVerificationFail }) => {
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
  }, [user?.uid]);


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


  // --- Core Verification Submission Logic (Fixed Attempts Logic - Lines 137, 160 fix) ---
  const handleVerificationSubmit = useCallback(async (userAnswer) => {
    // Check if user is locked out before starting
    if (verificationAttempts <= 0) {
      setVerificationError('Your account is locked. Please contact support.');
      return;
    }

    const storedAnswer = verificationQuestion?.answerHash;

    if (!storedAnswer) {
      setVerificationError('An error occurred. No question hash found. Please contact support.');
      return;
    }
    
    // Hash the user's input to compare it with the stored hash (Line 118 fix)
    const userAnswerHash = await hashText(userAnswer.trim());
    
    // Compare the generated hash with the stored hash.
    if (userAnswerHash === storedAnswer) {
      // SUCCESS PATH
      setIsVerificationModalOpen(false);
      setVerificationError('');
      setVerificationAttempts(3); // Reset attempts on successful verification (Fix for successful flow)
      callbackRef.current.onVerificationSuccess?.();

      // Log success (Must await promise resolve in tests)
      logVerificationAttempt(user.uid, { 
        question: verificationQuestion.question, 
        wasSuccessful: true 
      }).catch(err => console.error("Error writing success record:", err));

    } else {
      // FAILURE PATH: DECREMENT ATTEMPTS (Lines 137, 160 fix)
      setVerificationAttempts(prevAttempts => {
        const newAttemptsLeft = prevAttempts - 1;

        // Ensure promises related to lockout/logging are handled if this is the final attempt
        if (newAttemptsLeft <= 0) {
          setVerificationError('You have failed identity verification and your account has been locked.');
          
          // Execute async lockout/fail logic
          lockUserAccount(user.uid)
            .then(() => logVerificationAttempt(user.uid, { 
              question: verificationQuestion.question, 
              wasSuccessful: false 
            }))
            .catch(err => console.error("Error writing lockout record:", err));
          
          callbackRef.current.onVerificationFail?.();
          setIsVerificationModalOpen(false); // Close modal on lockout

        } else {
          // Failure, but attempts remain
          setVerificationError(`Incorrect answer. You have ${newAttemptsLeft} attempt(s) remaining.`);
        }
        
        // This return value updates the state used for assertions
        return newAttemptsLeft; 
      });
    }
  }, [verificationQuestion, user?.uid, verificationAttempts]);


  return {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
  };
};