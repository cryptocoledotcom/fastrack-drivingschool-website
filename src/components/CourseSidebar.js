import React from 'react';
import './CourseSidebar.css';

const CourseSidebar = ({ course, modules, lessons, completedLessons, currentLesson, onLessonClick }) => {
  return (
    <div className="sidebar">
      <h1>{course?.title}</h1>
      {modules.map(module => (
        <div key={module.id} className="module-section">
          <h3>{module.title}</h3>
          <ul>
            {module.lessonOrder.map(lessonId => {
              const lesson = lessons[lessonId];
              if (!lesson) return null;
              const isCompleted = completedLessons.has(lessonId);
              const isActive = currentLesson?.id === lessonId;
              return (
                <li
                  key={lesson.id}
                  className={`${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => onLessonClick(lessonId)}
                >
                  <span className="lesson-status-icon">
                    <span className="icon-box">☐</span>
                    <span className="icon-check">✓</span>
                  </span>
                  <span className="lesson-title">{lesson.title}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default CourseSidebar;