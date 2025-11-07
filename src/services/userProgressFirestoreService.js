import { doc, getDoc, setDoc, serverTimestamp, updateDoc, deleteDoc, increment, deleteField, addDoc, collection } from 'firebase/firestore';
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

export const initializeLesson = async (userId, lessonId) => {
  if (!userId || !lessonId) return;

  const lessonRef = doc(db, USER_PROGRESS_COLLECTION, userId);
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
 * Atomically increments the total time spent on a lesson.
 * @param {string} userId The ID of the user.
 * @param {string} lessonId The unique ID of the lesson.
 * @param {number} secondsToAdd The number of seconds to add to the total time spent.
 */
export const addLessonTime = async (userId, lessonId, secondsToAdd) => {
  if (!userId || !lessonId || !secondsToAdd || secondsToAdd <= 0) {
    return;
  }
  try {
    const lessonRef = doc(db, USER_PROGRESS_COLLECTION, userId);
    await updateDoc(lessonRef, {
      [`lessons.${lessonId}.timeSpentSeconds`]: increment(secondsToAdd),
      [`lessons.${lessonId}.lastAccessed`]: serverTimestamp(),
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
    const lessonRef = doc(db, USER_PROGRESS_COLLECTION, userId);
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

  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);
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

  const userProgressRef = doc(db, USER_PROGRESS_COLLECTION, userId);
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
