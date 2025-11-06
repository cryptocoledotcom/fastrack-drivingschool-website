import React, { useState, useEffect } from 'react';
import { useAuth } from '../pages/Auth/AuthContext';
import { getUserProgress } from '../services/userProgressFirestoreService';
import './UserProgressDashboard.css';

const UserProgressDashboard = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const userProgress = await getUserProgress(user.uid);
        setProgress(userProgress);
      } catch (err) {
        console.error("Failed to load user progress:", err);
        setError('Could not load your progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
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
  const completedLessons = progress.lessons ? Object.values(progress.lessons).filter(l => l.completed).length : 0;
  const totalTimeSpentSeconds = progress.lessons ? Object.values(progress.lessons).reduce((total, lesson) => total + (lesson.timeSpentSeconds || 0), 0) : 0;
  const completedQuizzes = progress.quizzes ? Object.values(progress.quizzes).filter(q => q.completed).length : 0;

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
      <div className="progress-stats">
        <p><strong>Lessons Completed:</strong> {completedLessons}</p>
        <p><strong>Total Time Spent:</strong> {formatTime(totalTimeSpentSeconds)}</p>
        <p><strong>Quizzes Completed:</strong> {completedQuizzes}</p>
      </div>
    </div>
  );
};

export default UserProgressDashboard;