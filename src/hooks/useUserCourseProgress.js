import { useState, useEffect, useCallback } from 'react';
import { getUserProgress, updateActivityProgress, clearLastViewedLesson } from '../services/userProgressFirestoreService';

/**
 * A custom hook to fetch and manage a user's progress for all courses.
 * @param {object} user - The authenticated user object from useAuth.
 * @returns {object} An object containing the user's progress data, loading state, error, and a refetch function.
 */
export const useUserCourseProgress = (user) => {
  const [userOverallProgress, setUserOverallProgress] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProgress = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const progress = await getUserProgress(user.uid);

      // Set the overall progress regardless of lock status so other UI can use it
      setUserOverallProgress(progress);

      // Handle locked state first as a guard clause
      if (progress?.isLocked) {
        setError("Your account is locked due to failed identity verification. Please contact support.");
      } else if (progress?.lessons) {
        // If not locked and lessons exist, process them
        const completedIds = Object.keys(progress.lessons).filter(id => progress.lessons[id].completed);
        setCompletedLessons(new Set(completedIds));
      }
    } catch (err) {
      console.error("Error fetching user progress:", err);
      setError("Failed to load your learning progress.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProgress();

    window.addEventListener('focus', fetchProgress);
    return () => window.removeEventListener('focus', fetchProgress);
  }, [fetchProgress]);

  /**
   * Marks a lesson as complete, updating both Firestore and local state.
   * @param {string} lessonId The ID of the lesson to complete.
   * @param {string} courseId The ID of the course the lesson belongs to.
   */
  const completeLesson = useCallback(async (lessonId, courseId) => {
    if (!user?.uid || !lessonId || !courseId) {
      throw new Error("User, lessonId, and courseId are required to complete a lesson.");
    }

    // 1. Update Firestore
    await updateActivityProgress(user.uid, 'lessons', lessonId, { completed: true });
    await clearLastViewedLesson(user.uid, courseId);

    // 2. Update local state optimistically for immediate UI feedback
    setUserOverallProgress(prev => {
      const newProgress = { ...prev };
      if (newProgress.lastViewedLesson) {
        delete newProgress.lastViewedLesson[courseId];
        // If the lastViewedLesson object is now empty, remove it entirely.
        if (Object.keys(newProgress.lastViewedLesson).length === 0) {
          delete newProgress.lastViewedLesson;
        }
      }
      if (newProgress.lessons?.[lessonId]) newProgress.lessons[lessonId].completed = true;
      return newProgress;
    });
    setCompletedLessons(prev => new Set(prev).add(lessonId));

  }, [user]);

  // Return state and well-defined action functions
  return { userOverallProgress, completedLessons, loading, error, fetchProgress, actions: { completeLesson } };
};