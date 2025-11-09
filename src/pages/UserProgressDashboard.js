import React from 'react';
import { useProgressStats } from '../hooks/useProgressStats';
import './UserProgressDashboard.css';

const UserProgressDashboard = () => {
  const { stats, loading, error } = useProgressStats();

  if (loading) {
    return <div className="progress-dashboard"><h3>Learning Progress</h3><p>Loading...</p></div>;
  }

  if (error) {
    return <div className="progress-dashboard"><h3>Learning Progress</h3><p style={{ color: 'red' }}>{error}</p></div>;
  }

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
          <div className="progress-bar" style={{ width: `${stats.courseCompletionPercentage}%` }}></div>
        </div>
        <span className="progress-percentage">{stats.courseCompletionPercentage}% Complete</span>
      </div>
      <div className="progress-stats">
        <p><strong>Cumulative Grade:</strong> {stats.cumulativeGrade}</p>        
        <p><strong>Modules Completed:</strong> {stats.completedModules} of {stats.totalModules}</p>
        <p><strong>Lessons Completed:</strong> {stats.completedLessons} of {stats.totalLessons}</p>
        <p><strong>Quizzes Completed:</strong> {stats.completedQuizzes} of {stats.totalQuizzes}</p>
        <p><strong>Tests Completed:</strong> {stats.completedTests} of {stats.totalTests}</p>
        <p><strong>Total Time Spent:</strong> {formatTime(stats.totalTimeSpentSeconds)}</p>
      </div>
    </div>
  );
};

export default UserProgressDashboard;