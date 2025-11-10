import { useState, useEffect, useCallback } from 'react';
import { getUserProgress } from '../services/userProgressFirestoreService';

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

  return { userOverallProgress, completedLessons, loading, error, fetchProgress, setCompletedLessons, setUserOverallProgress };
};