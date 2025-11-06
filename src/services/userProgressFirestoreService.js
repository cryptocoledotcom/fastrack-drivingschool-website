import { doc, getDoc, setDoc, serverTimestamp, updateDoc, deleteDoc, increment, deleteField } from 'firebase/firestore';
import { db } from '../Firebase'; // Corrected path to your Firebase config

const USER_PROGRESS_COLLECTION = 'userProgress';

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
  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);
  try {
    const docSnap = await getDoc(userProgressRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log(`No progress found for user: ${userId}. Initializing new progress.`);
      // Create an empty document to prevent future errors on update.
      const initialProgress = { quizzes: {}, tests: {}, lessons: {} };
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

  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);

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
  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);
  try {
    await deleteDoc(userProgressRef);
    console.log(`Progress document for user ${userId} has been deleted.`);
  } catch (error) {
    console.error("Error deleting user progress document:", error);
    throw error;
  }
};

/**
 * Records the start time of a lesson session for a user.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const startLessonSession = async (userId, lessonId) => {
  if (!userId || !lessonId) {
    console.error("startLessonSession: userId and lessonId are required.");
    return;
  }

  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);

  try {
    // Use setDoc with merge: true to create the document/fields if they don't exist.
    // We set currentSessionStartTime to serverTimestamp() and ensure cumulativeTimeSpentSeconds exists.
    await setDoc(
      userProgressRef,
      {
        lessons: { [lessonId]: { timeSpentSeconds: increment(0), lastAccessed: serverTimestamp(), currentSessionStartTime: serverTimestamp() } }
      },
      { merge: true }
    );
    console.log(`User ${userId} started session for lesson ${lessonId}`);
  } catch (error) {
    console.error(`Error starting lesson session for ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Records the end time of a lesson session, calculates duration, and adds it to cumulative time spent.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @param {number} sessionStartTimeMs The client-side timestamp (milliseconds) when the session started.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const endLessonSession = async (userId, lessonId, sessionStartTimeMs) => {
  if (!userId || !lessonId || !sessionStartTimeMs) {
    console.error("endLessonSession: userId, lessonId, and sessionStartTimeMs are required.");
    return;
  }

  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);

  try {
    // Fetch the document to get the server's current time for accurate duration calculation
    // and to ensure we only update if currentSessionStartTime matches.
    const docSnap = await getDoc(userProgressRef);
    if (docSnap.exists()) {
      const progressData = docSnap.data();
      const lessonProgress = progressData.lessons?.[lessonId];

      if (lessonProgress && lessonProgress.currentSessionStartTime) {
        const durationSeconds = Math.floor((Date.now() - sessionStartTimeMs) / 1000);
        await updateDoc(userProgressRef, {
          [`lessons.${lessonId}.timeSpentSeconds`]: increment(durationSeconds),
          [`lessons.${lessonId}.currentSessionStartTime`]: deleteField(), // Remove the start time
        });
        console.log(`User ${userId} ended session for lesson ${lessonId}. Added ${durationSeconds} seconds.`);
      }
    }
  } catch (error) {
    console.error(`Error ending lesson session for ${lessonId}:`, error);
    throw error;
  }
};

/**
 * Atomically increments the time spent on a lesson for a user.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @param {number} secondsToAdd The number of seconds to add to the total time spent.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export const incrementTimeOnLesson = async (userId, lessonId, secondsToAdd) => {
  if (!userId || !lessonId || typeof secondsToAdd !== 'number' || secondsToAdd <= 0) {
    return;
  }

  try {
    // Use setDoc with merge to safely increment the time and update the timestamp.
    // This will create the lesson entry if it doesn't exist. `timeStart` is only set on the first increment.
    const lessonRef = doc(db, USER_PROGRESS_COLLECTION, userId);
    const docSnap = await getDoc(lessonRef);
    const lessonData = docSnap.data()?.lessons?.[lessonId];

    const updateData = {
      [`lessons.${lessonId}.timeSpentSeconds`]: increment(secondsToAdd),
      [`lessons.${lessonId}.lastAccessed`]: serverTimestamp() // Keep this to track recent activity
    };

    if (!lessonData?.timeStart) {
      updateData[`lessons.${lessonId}.timeStart`] = serverTimestamp();
    }

    await updateDoc(lessonRef, updateData);
  } catch (error) {
    console.error(`Error incrementing time for lesson ${lessonId}:`, error);
  }
};
