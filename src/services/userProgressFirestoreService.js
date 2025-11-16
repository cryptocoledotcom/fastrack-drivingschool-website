import { doc, getDoc, setDoc, serverTimestamp, updateDoc, deleteDoc, increment, deleteField, addDoc, collection } from 'firebase/firestore';
import { db, functions } from '../Firebase'; // Import functions
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable

/**
 * Calls the backend Firebase Function to log a session event.
 * @param {'login' | 'logout'} eventType The type of event to log.
 * @param {string} [userId] The user ID, required for logout events.
 */
export const logSessionEvent = async (eventType, userId) => {
  try {
    const logEventFunction = httpsCallable(functions, 'logSessionEvent');
    await logEventFunction({ eventType, userId });
  } catch (error) {
    // Log the error to the console for debugging, but don't re-throw it.
    // We don't want a logging failure to prevent the user from logging in or out.
    console.error(`Failed to log session event '${eventType}':`, error);
  }
};

/**
 * Retrieves the progress for a specific user.
 * If no progress document exists, it creates one and returns an empty progress object.
 * @param {string} userId The ID of the user.
 * @returns {Promise<object>} A promise that resolves to the user's progress object.
 */
export const getUserProgress = async (userId) => {
  if (!userId) {
    console.error("getUserProgress: userId is required.");
    return {};
  }
  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
  try {
    const docSnap = await getDoc(userProgressRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log(`No progress found for user: ${userId}. Initializing new progress.`);
      // Create an empty document to prevent future errors on update.
      const initialProgress = { quizzes: {}, tests: {}, lessons: {}, dailyTimeSpent: {} }; // Added dailyTimeSpent
      await setDoc(userProgressRef, initialProgress);
      return initialProgress;
    }
  } catch (error) {
    console.error("Error getting user progress:", error);
    throw error; // Re-throw the error to be handled by the calling component
  }
};

/**
 * Updates a specific activity's progress for a user.
 * If the user's progress document doesn't exist, this will create it.
 * @param {string} userId The ID of the user.
 * @param {string} activityType The type of activity (e.g., 'quizzes', 'tests', 'lessons').
 * @param {string} activityId The unique ID of the activity (e.g., 'quiz1', 'lesson-intro-1').
 * @param {object} progressData An object containing the progress details (e.g., { completed: true, score: 90 }).
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const updateActivityProgress = async (userId, activityType, activityId, progressData) => {
  if (!userId || !activityType || !activityId || !progressData) {
    const errorMessage = "updateActivityProgress: All parameters (userId, activityType, activityId, progressData) are required.";
    console.error(errorMessage);
    throw new Error(errorMessage); // Throw an error so the calling code knows the operation failed.
  }

  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');

  try {
    // Use setDoc with { merge: true } to create the document if it doesn't exist,
    // or to update the specific nested object without overwriting the entire document.
    await setDoc(userProgressRef, { [activityType]: { [activityId]: { ...progressData, timeEnd: serverTimestamp() } } }, { merge: true });
    console.log(`User ${userId} progress updated for ${activityType} ${activityId}`);
  } catch (error) {
    console.error("Error updating activity progress:", error);
    throw error;
  }
};

/**
 * Deletes the entire progress document for a user. For testing purposes.
 * @param {string} userId The ID of the user whose progress should be deleted.
 * @returns {Promise<void>}
 */
export const deleteUserProgress = async (userId) => {
  if (!userId) {
    console.error("deleteUserProgress: userId is required.");
    return;
  }
  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
  try {
    await deleteDoc(userProgressRef);
    console.log(`Progress document for user ${userId} has been deleted.`);
  } catch (error) {
    console.error("Error deleting user progress document:", error);
    throw error;
  }
};

export const initializeLesson = async (userId, lessonId) => {
  if (!userId || !lessonId) return;

  const lessonRef = doc(db, 'users', userId, 'userProgress', 'progress');
  const docSnap = await getDoc(lessonRef);

  // Only set timeStart if the lesson progress doesn't exist or lacks a timeStart field.
  if (!docSnap.exists() || !docSnap.data().lessons?.[lessonId]?.timeStart) {
    try {
      await setDoc(lessonRef, {
        lessons: { [lessonId]: { timeStart: serverTimestamp() } }
      }, { merge: true });
    } catch (error) {
      console.error(`Error initializing lesson ${lessonId}:`, error);
    }
  }
};

/**
 * Helper to get the current "learning day" key (YYYY-MM-DD) based on a 12 PM local time reset.
 * @param {Date} date The date to get the key for.
 * @returns {string} The formatted date string (YYYY-MM-DD).
 */
const getLearningDayKey = (date) => {
  const localDate = new Date(date); // Use local time
  // If current time is before 12 PM, the "learning day" is the previous calendar day.
  if (localDate.getHours() < 12) {
    localDate.setDate(localDate.getDate() - 1);
  }
  return localDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

/**
 * Retrieves the total time spent by a user for the current "learning day".
 * A "learning day" starts at 12 PM local time and ends at 11:59:59 AM the next day.
 * @param {string} userId The ID of the user.
 * @returns {Promise<number>} The total seconds spent today, or 0 if no data.
 */
export const getTimeSpentToday = async (userId) => {
  if (!userId) return 0;

  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
  try {
    const docSnap = await getDoc(userProgressRef);
    if (docSnap.exists()) {
      const dailyTimeSpent = docSnap.data().dailyTimeSpent || {};
      const todayKey = getLearningDayKey(new Date());
      return dailyTimeSpent[todayKey] || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error getting time spent today:", error);
    throw error;
  }
};

/**
 * Atomically increments the total time spent on a lesson.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @param {number} secondsToAdd The number of seconds to add to the total time spent.
 */
export const addLessonTime = async (userId, lessonId, secondsToAdd) => { // Renamed from addLessonTime to track daily
  if (!userId || !lessonId || !secondsToAdd || secondsToAdd <= 0) {
    return;
  }
  try {
    const lessonRef = doc(db, 'users', userId, 'userProgress', 'progress');
    const todayKey = getLearningDayKey(new Date()); // Get the current learning day key

    await updateDoc(lessonRef, {
      [`lessons.${lessonId}.timeSpentSeconds`]: increment(secondsToAdd),
      [`lessons.${lessonId}.lastAccessed`]: serverTimestamp(),
      [`dailyTimeSpent.${todayKey}`]: increment(secondsToAdd), // New: Increment daily time spent
    });
  } catch (error) {
    console.error(`Error incrementing time for lesson ${lessonId}:`, error);
  }
};

/**
 * Saves the last known video playback time for a specific lesson.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @param {number} playbackTime The current time of the video in seconds.
 */
export const saveLessonPlaybackTime = async (userId, lessonId, playbackTime) => {
  if (!userId || !lessonId || typeof playbackTime !== 'number') {
    return;
  }
  try {
    const lessonRef = doc(db, 'users', userId, 'userProgress', 'progress');
    await updateDoc(lessonRef, {
      [`lessons.${lessonId}.playbackTime`]: playbackTime,
      [`lessons.${lessonId}.lastAccessed`]: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error saving playback time for lesson ${lessonId}:`, error);
  }
};

/**
 * Sets the last viewed lesson for a specific course for a user.
 * @param {string} userId The ID of the user.
 * @param {string} courseId The ID of the course.
 * @param {string} lessonId The ID of the lesson being viewed.
 * @returns {Promise<void>}
 */
export const setLastViewedLesson = async (userId, courseId, lessonId) => {
  if (!userId || !courseId || !lessonId) {
    return; // Don't proceed if essential info is missing
  }

  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
  try {
    // Use merge:true to update/create the lastViewedLesson field without overwriting other progress
    await setDoc(userProgressRef, { lastViewedLesson: { [courseId]: lessonId } }, { merge: true });
  } catch (error) {
    console.error(`Error setting last viewed lesson for course ${courseId}:`, error);
  }
};

/**
 * Clears the last viewed lesson for a specific course for a user.
 * @param {string} userId The ID of the user.
 * @param {string} courseId The ID of the course.
 * @returns {Promise<void>}
 */
export const clearLastViewedLesson = async (userId, courseId) => {
  if (!userId || !courseId) {
    return;
  }

  const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
  try {
    await updateDoc(userProgressRef, { [`lastViewedLesson.${courseId}`]: deleteField() });
  } catch (error) {
    console.error(`Error clearing last viewed lesson for course ${courseId}:`, error);
  }
};

/**
 * Adds an audit log entry for course completion.
 * @param {string} userId The ID of the user.
 * @param {string} courseId The ID of the completed course.
 * @param {number} totalTimeSeconds The total active time spent on the course.
 * @returns {Promise<void>} A promise that resolves when the audit log is added.
 */
export const addCourseAuditLog = async (userId, courseId, totalTimeSeconds) => {
  if (!userId || !courseId || typeof totalTimeSeconds !== 'number') {
    console.error("addCourseAuditLog: userId, courseId, and totalTimeSeconds are required.");
    return;
  }
  try {
    await addDoc(collection(db, 'timeAudits'), { // New 'timeAudits' collection
      userId,
      courseId,
      totalTimeSeconds,
      completionDate: serverTimestamp(),
    });
    console.log(`Course audit log added for user ${userId}, course ${courseId}.`);
  } catch (error) {
    console.error("Error adding course audit log:", error);
    throw error;
  }
};

/**
 * Hashes a string using SHA-256.
 * @param {string} text The string to hash.
 * @returns {Promise<string>} The hexadecimal representation of the hash.
 */
export const hashText = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Saves the user's security questions and hashed answers.
 * @param {string} userId The ID of the user.
 * @param {Array<Object>} questions An array of question/answer objects.
 * @returns {Promise<void>}
 */
export const setSecurityQuestions = async (userId, questions) => {
  if (!userId || !questions || questions.length === 0) {
    console.error("setSecurityQuestions: userId and questions are required.");
    return;
  }

  const securityProfileRef = doc(db, `users/${userId}/securityProfile`, 'questions');

  try {
    const hashedQuestions = await Promise.all(questions.map(async (q) => ({
      question: q.question,
      answerHash: await hashText(q.answer.trim()),
    })));

    await setDoc(securityProfileRef, { questions: hashedQuestions });
  } catch (error) {
    console.error("Error setting security questions:", error);
    throw error;
  }
};

/**
 * Retrieves the user's saved security questions.
 * @param {string} userId The ID of the user.
 * @returns {Promise<Array<Object>|null>} An array of question objects or null if not found.
 */
export const getSecurityQuestions = async (userId) => {
  if (!userId) return null;
  const securityProfileRef = doc(db, `users/${userId}/securityProfile`, 'questions');
  try {
    const docSnap = await getDoc(securityProfileRef);
    if (docSnap.exists()) {
      return docSnap.data().questions;
    }
    return null;
  } catch (error) {
    console.error("Error getting security questions:", error);
    throw error;
  }
};

/**
 * Logs a detailed, immutable record of an identity verification attempt to a dedicated audit collection.
 * @param {string} userId The ID of the user.
 * @param {object} logData The detailed data for the audit log.
 * @param {string} logData.question The question that was asked.
 * @param {string} logData.userResponse The exact response from the user.
 * @param {string} logData.result The outcome of the attempt ('Pass' or 'Fail').
 * @param {string} logData.action The action taken by the system (e.g., 'Successful Validation', 'Account Locked').
 * @returns {Promise<void>}
 */
export const logIdentityVerificationAttempt = async (userId, logData) => {
  if (!userId || !logData) return;
  try {
    // Use a top-level collection for easier auditing and stricter security rules.
    const auditLogRef = collection(db, 'identity_verification_audits');
    await addDoc(auditLogRef, {
      userId,
      ...logData,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging identity verification attempt:", error);
    throw error;
  }
};

/**
 * Fetches a single random security question for the user.
 * @param {string} userId The ID of the user.
 * @returns {Promise<object|null>} A promise that resolves to a single question object or null.
 */
export const getRandomSecurityQuestion = async (userId) => {
  if (!userId) return null;
  const securityDocRef = doc(db, `users/${userId}/securityProfile`, 'questions');
  try {
    const securityDoc = await getDoc(securityDocRef, { source: 'server' });
    if (securityDoc.exists()) {
      const questions = securityDoc.data().questions;
      if (Array.isArray(questions) && questions.length > 0) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        return questions[randomIndex];
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch random security question:", error);
    throw error;
  }
};

/**
 * Sets the user's account to locked in Firestore.
 * @param {string} userId The ID of the user to lock.
 */
export const lockUserAccount = async (userId) => {
  if (!userId) return;
  await setDoc(doc(db, 'users', userId), { isLocked: true }, { merge: true });
};


  /**
   * Adds a user's answer to their verification answers in userProgress.
   * This logs the question and answer to the userAnswers array for tracking purposes.
   * @param {string} userId The ID of the user.
   * @param {string} question The security question that was asked.
   * @param {string} userAnswer The answer provided by the user.
   * @returns {Promise<void>}
   */
  export const addUserVerificationAnswer = async (userId, question, userAnswer) => {
    if (!userId || !question || !userAnswer) {
      console.error("addUserVerificationAnswer: userId, question, and userAnswer are required.");
      return;
    }

    const userProgressRef = doc(db, 'users', userId, 'userProgress', 'progress');
    
    try {
      // Get current progress to check if userAnswers array exists
      const docSnap = await getDoc(userProgressRef);
      let currentAnswers = [];
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentAnswers = data.userAnswers || [];
      }
      
      // Add the new answer to the array
      const newAnswer = {
        question,
        answer: userAnswer,
        timestamp: serverTimestamp()
      };
      
      currentAnswers.push(newAnswer);
      
      // Update the document with the new answers array
      await updateDoc(userProgressRef, {
        userAnswers: currentAnswers
      });
      
      console.log(`User ${userId} verification answer logged successfully.`);
    } catch (error) {
      console.error("Error adding user verification answer:", error);
      throw error;
    }
  };
