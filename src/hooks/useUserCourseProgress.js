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
      setUserOverallProgress(progress);
      if (progress && progress.lessons) {
        if (progress.isLocked) {
          setError("Your account is locked due to failed identity verification. Please contact support.");
          return;
        }
        const completedLessonIds = Object.keys(progress.lessons).filter(lessonId => progress.lessons[lessonId].completed);
        setCompletedLessons(new Set(completedLessonIds));
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
      if (newProgress.lastViewedLesson) delete newProgress.lastViewedLesson[courseId];
      if (newProgress.lessons?.[lessonId]) newProgress.lessons[lessonId].completed = true;
      return newProgress;
    });
    setCompletedLessons(prev => new Set(prev).add(lessonId));

  }, [user]);

  // Return state and well-defined action functions
  return { userOverallProgress, completedLessons, loading, error, fetchProgress, actions: { completeLesson } };
};