import React, { useState, useEffect } from 'react';
import { useAuth } from '../pages/Auth/AuthContext';
import { getUserProgress } from '../services/userProgressFirestoreService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../Firebase';
import './UserProgressDashboard.css';

const UserProgressDashboard = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [tests, setTests] = useState([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Fetch all necessary data in parallel
        const userProgress = await getUserProgress(user.uid);
        setProgress(userProgress);

        const modulesQuery = query(collection(db, 'modules'));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setModules(modulesData);

        const lessonsQuery = query(collection(db, 'lessons'));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonsData = {};
        lessonsSnapshot.docs.forEach(doc => {
          lessonsData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setLessons(lessonsData);

        const quizzesQuery = query(collection(db, 'quizzes'));
        const quizzesSnapshot = await getDocs(quizzesQuery);
        setQuizzes(quizzesSnapshot.docs);

        const testsQuery = query(collection(db, 'tests'));
        const testsSnapshot = await getDocs(testsQuery);
        setTests(testsSnapshot.docs);

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError('Could not load your progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  if (loading) {
    return <div className="progress-dashboard"><h3>Learning Progress</h3><p>Loading...</p></div>;
  }

  if (error) {
    return <div className="progress-dashboard"><h3>Learning Progress</h3><p style={{ color: 'red' }}>{error}</p></div>;
  }

  if (!progress) {
    return null; // Don't show anything if there's no user or progress yet
  }

  // Calculate stats from the progress object
  const completedLessonIds = new Set(
    progress.lessons ? Object.keys(progress.lessons).filter(id => progress.lessons[id].completed) : []
  );

  const completedModules = modules.reduce((count, module) => {
    const allLessonsInModuleComplete = module.lessonOrder?.every(lessonId => completedLessonIds.has(lessonId));
    return allLessonsInModuleComplete ? count + 1 : count;
  }, 0);

  const completedLessons = progress.lessons ? Object.values(progress.lessons).filter(l => l.completed).length : 0;
  const completedQuizzes = progress.quizzes ? Object.values(progress.quizzes).filter(q => q.completed).length : 0;
  const completedTests = progress.tests ? Object.values(progress.tests).filter(t => t.completed).length : 0;

  const totalTimeSpentSeconds = progress.lessons ? Object.values(progress.lessons).reduce((total, lesson) => total + (lesson.timeSpentSeconds || 0), 0) : 0;

  // --- New Cumulative Grade Calculation ---
  const allGradedItems = [
    ...(progress.quizzes ? Object.values(progress.quizzes) : []),
    ...(progress.tests ? Object.values(progress.tests) : [])
  ];
  const completedGradedItems = allGradedItems.filter(item => item.completed && typeof item.score === 'number');
  const cumulativeGrade = completedGradedItems.length > 0
    ? (completedGradedItems.reduce((sum, item) => sum + item.score, 0) / completedGradedItems.length).toFixed(1) + '%'
    : 'N/A';
  // --- End New Calculation ---

  // --- Total Course Progress Percentage ---
  const totalLessons = Object.keys(lessons).length;
  const totalQuizzes = quizzes.length;
  const totalTests = tests.length;
  const totalCompletableItems = totalLessons + totalQuizzes + totalTests;
  const totalCompletedItems = completedLessons + completedQuizzes + completedTests;

  const courseCompletionPercentage = totalCompletableItems > 0
    ? Math.round((totalCompletedItems / totalCompletableItems) * 100)
    : 0;
  // --- End Total Course Progress ---

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    let timeString = '';
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (hours === 0 && seconds > 0) timeString += `${seconds}s`;

    return timeString.trim() || '0s';
  };

  return (
    <div className="progress-dashboard">
      <h3>Learning Progress</h3>
      <div className="total-progress-section">
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${courseCompletionPercentage}%` }}></div>
        </div>
        <span className="progress-percentage">{courseCompletionPercentage}% Complete</span>
      </div>
      <div className="progress-stats">
        <p><strong>Cumulative Grade:</strong> {cumulativeGrade}</p>        
        <p><strong>Modules Completed:</strong> {completedModules} of {modules.length}</p>
        <p><strong>Lessons Completed:</strong> {completedLessons} of {Object.keys(lessons).length}</p>
        <p><strong>Quizzes Completed:</strong> {completedQuizzes} of {quizzes.length}</p>
        <p><strong>Tests Completed:</strong> {completedTests} of {tests.length}</p>
        <p><strong>Total Time Spent:</strong> {formatTime(totalTimeSpentSeconds)}</p>
      </div>
    </div>
  );
};

export default UserProgressDashboard;