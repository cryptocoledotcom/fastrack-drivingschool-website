import { useState, useEffect } from 'react';
import { useAuth } from '../pages/Auth/AuthContext';
import { getUserProgress } from '../services/userProgressFirestoreService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../Firebase';
import { calculateProgressStats } from '../utils/statsCalculator';

export const useProgressStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    completedModules: 0,
    totalModules: 0,
    completedLessons: 0,
    totalLessons: 0,
    completedQuizzes: 0,
    totalQuizzes: 0,
    completedTests: 0,
    totalTests: 0,
    totalTimeSpentSeconds: 0,
    cumulativeGrade: 'N/A',
    courseCompletionPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAndCalculateStats = async () => {
      try {
        setLoading(true);

        const [userProgress, modulesSnapshot, lessonsSnapshot, quizzesSnapshot, testsSnapshot] = await Promise.all([
          getUserProgress(user.uid),
          getDocs(query(collection(db, 'modules'))),
          getDocs(query(collection(db, 'lessons'))),
          getDocs(query(collection(db, 'quizzes'))),
          getDocs(query(collection(db, 'tests'))),
        ]);

        if (!userProgress) {
          setLoading(false);
          return;
        }

        const calculatedStats = calculateProgressStats(
          userProgress,
          modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          lessonsSnapshot.docs.length,
          quizzesSnapshot.docs.length,
          testsSnapshot.docs.length
        );
        setStats(calculatedStats);

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError('Could not load your progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndCalculateStats();
  }, [user]);

  return { stats, loading, error };
};