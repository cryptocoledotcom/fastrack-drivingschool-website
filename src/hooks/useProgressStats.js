import { useState, useEffect } from 'react';
import { useAuth } from '../pages/Auth/AuthContext';
import { getUserProgress } from '../services/userProgressFirestoreService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../Firebase';

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

        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalLessons = lessonsSnapshot.docs.length;
        const totalQuizzes = quizzesSnapshot.docs.length;
        const totalTests = testsSnapshot.docs.length;

        // --- Calculations ---
        const completedLessonIds = new Set(
          userProgress.lessons ? Object.keys(userProgress.lessons).filter(id => userProgress.lessons[id].completed) : []
        );

        const completedModules = modulesData.reduce((count, module) => {
          const allLessonsInModuleComplete = module.lessonOrder?.every(lessonId => completedLessonIds.has(lessonId));
          return allLessonsInModuleComplete ? count + 1 : count;
        }, 0);

        const completedLessons = completedLessonIds.size;
        const completedQuizzes = userProgress.quizzes ? Object.values(userProgress.quizzes).filter(q => q.completed).length : 0;
        const completedTests = userProgress.tests ? Object.values(userProgress.tests).filter(t => t.completed).length : 0;

        const totalTimeSpentSeconds = userProgress.lessons ? Object.values(userProgress.lessons).reduce((total, lesson) => total + (lesson.timeSpentSeconds || 0), 0) : 0;

        const allGradedItems = [
          ...(userProgress.quizzes ? Object.values(userProgress.quizzes) : []),
          ...(userProgress.tests ? Object.values(userProgress.tests) : [])
        ];
        const completedGradedItems = allGradedItems.filter(item => item.completed && typeof item.score === 'number');
        const cumulativeGrade = completedGradedItems.length > 0
          ? (completedGradedItems.reduce((sum, item) => sum + item.score, 0) / completedGradedItems.length).toFixed(1) + '%'
          : 'N/A';

        const totalCompletableItems = totalLessons + totalQuizzes + totalTests;
        const totalCompletedItems = completedLessons + completedQuizzes + completedTests;
        const courseCompletionPercentage = totalCompletableItems > 0
          ? Math.round((totalCompletedItems / totalCompletableItems) * 100)
          : 0;

        setStats({
          completedModules, totalModules: modulesData.length,
          completedLessons, totalLessons,
          completedQuizzes, totalQuizzes,
          completedTests, totalTests,
          totalTimeSpentSeconds, cumulativeGrade, courseCompletionPercentage,
        });

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