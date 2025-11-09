import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../Firebase';
import { hashText } from '../services/userProgressFirestoreService'; // Import the SAME hashing function

/**
 * A custom hook to manage periodic identity verification.
 * @param {object} options - The options for the hook.
 * @param {object} options.user - The authenticated user object.
 * @param {object} options.currentLesson - The currently active lesson.
 * @param {Set<string>} options.completedLessons - A set of completed lesson IDs.
 * @param {function} options.onVerificationStart - Callback to run when verification starts (e.g., to pause video).
 * @param {function} options.onVerificationSuccess - Callback to run on success (e.g., to play video).
 * @param {function} options.onVerificationFail - Callback to run on final failure (e.g., to log out).
 * @returns {object} The state and handlers for the identity verification modal.
 */
export const useIdentityVerification = ({ user, currentLesson, completedLessons, onVerificationStart, onVerificationSuccess, onVerificationFail }) => {
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationQuestion, setVerificationQuestion] = useState({ question: '', answer: '' });
  const [verificationError, setVerificationError] = useState('');
  const [verificationAttempts, setVerificationAttempts] = useState(3);
  const verificationIntervalRef = useRef(null);

  const triggerVerification = useCallback(async () => {
    if (!user || isVerificationModalOpen) return;

    onVerificationStart?.();

    try {
      const securityDocRef = doc(db, `users/${user.uid}/securityProfile`, 'questions');
      // Force a fetch from the server to bypass any stale cache. This is the key fix.
      const securityDoc = await getDoc(securityDocRef, {
        source: 'server'
      });

      if (securityDoc.exists()) {
        const questions = securityDoc.data().questions;
        if (questions && questions.length > 0) {
          // This is the key fix. The data is an array of objects.
          // We need to select a random object from the array.
          const randomIndex = Math.floor(Math.random() * questions.length);
          const selectedQuestionObject = questions[randomIndex];

          // Set the state with the selected question object.
          setVerificationQuestion(selectedQuestionObject);
          setVerificationAttempts(3);
          setVerificationError('');
          setIsVerificationModalOpen(true);
        }
      }
    } catch (err) {
      console.error("Failed to trigger verification check:", err);
    }
  }, [user, isVerificationModalOpen, onVerificationStart]);

  useEffect(() => {
    const startVerificationTimer = () => {
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
      }
      // --- FOR PRODUCTION: Set a random interval between 20 and 40 minutes ---
      const randomInterval = (Math.random() * (40 - 20) + 20) * 60 * 1000;

      verificationIntervalRef.current = setInterval(triggerVerification, randomInterval);
    };

    if (user && currentLesson && !completedLessons.has(currentLesson.id)) {
      startVerificationTimer();
    }

    return () => {
      if (verificationIntervalRef.current) {
        clearInterval(verificationIntervalRef.current);
      }
    };
  }, [user, currentLesson, completedLessons, triggerVerification]);

  const handleVerificationSubmit = async (userAnswer) => {
    // This is the definitive fix. The field in the database is `answerHash`.
    const storedAnswer = verificationQuestion.answerHash;

    if (!storedAnswer) {
      setVerificationError('An error occurred. Please try again.');
      return;
    }
    
    // Hash the user's input to compare it with the stored hash.
    const userAnswerHash = await hashText(userAnswer.trim());
    
    // Compare the generated hash with the stored hash.
    if (userAnswerHash === storedAnswer) {
      setIsVerificationModalOpen(false);
      setVerificationError('');
      onVerificationSuccess?.();
    } else {
      // Decrement attempts if the answer is wrong
      const newAttemptsLeft = verificationAttempts - 1;
      setVerificationAttempts(newAttemptsLeft);

      if (newAttemptsLeft > 0) {
        setVerificationError(`Incorrect answer. You have ${newAttemptsLeft} attempt(s) remaining.`);
      } else {
        // Final failure: Set locked out state and trigger side-effects
        setVerificationError('You have failed identity verification and your account has been locked.');
        try {
          // Write a record to the 'lockouts' collection for backend processing (e.g., email trigger)
          const lockoutRef = doc(collection(db, "lockouts"));
          await setDoc(lockoutRef, { userId: user.uid, userEmail: user.email, timestamp: serverTimestamp() });
          // Set the lock status on the user's main profile
          await setDoc(doc(db, 'users', user.uid), { isLocked: true }, { merge: true });
        } catch (err) {
          console.error("Error writing lockout record:", err);
        }
        onVerificationFail?.();
      }
    }
  };

  return {
    isVerificationModalOpen,
    verificationQuestion,
    verificationError,
    verificationAttempts,
    handleVerificationSubmit,
  };
};