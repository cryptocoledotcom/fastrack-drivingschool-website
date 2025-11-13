// This is a manual mock for the userProgressFirestoreService.
// Jest will automatically use this file whenever jest.mock('../services/userProgressFirestoreService') is called in a test.

export const addCourseAuditLog = jest.fn(() => Promise.resolve());
export const setLastViewedLesson = jest.fn(() => Promise.resolve());
export const saveLessonPlaybackTime = jest.fn(() => Promise.resolve());
export const getUserProgress = jest.fn(() => Promise.resolve({}));
export const updateActivityProgress = jest.fn(() => Promise.resolve());
export const clearLastViewedLesson = jest.fn(() => Promise.resolve());
export const deleteUserProgress = jest.fn(() => Promise.resolve());
export const logSessionEvent = jest.fn(() => Promise.resolve());
export const addLessonTime = jest.fn(() => Promise.resolve());
export const getTimeSpentToday = jest.fn(() => Promise.resolve(0));
export const hashText = jest.fn(text => Promise.resolve(`hashed-${text}`));
export const setSecurityQuestions = jest.fn(() => Promise.resolve());
export const getSecurityQuestions = jest.fn(() => Promise.resolve([]));
export const logIdentityVerificationAttempt = jest.fn(() => Promise.resolve());
export const getRandomSecurityQuestion = jest.fn(() => Promise.resolve(null));
export const lockUserAccount = jest.fn(() => Promise.resolve());