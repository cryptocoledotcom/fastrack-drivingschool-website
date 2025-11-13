import { useEffect } from 'react';
import { addCourseAuditLog } from '../services/userProgressFirestoreService';

/**
 * A custom hook to handle the side effect of logging a course completion audit record.
 * @param {object} params - The parameters for the hook.
 */
export const useCourseCompletionAudit = ({
  courseCompleted,
  user,
  course,
  userOverallProgress,
}) => {
  useEffect(() => {
    if (courseCompleted && user && course) {
      let totalTimeSeconds = 0;
      if (userOverallProgress && userOverallProgress.lessons) {
        totalTimeSeconds = Object.values(userOverallProgress.lessons).reduce((acc, lesson) => acc + (lesson.timeSpentSeconds || 0), 0);
      }
      addCourseAuditLog(user.uid, course.id, totalTimeSeconds)
        .catch(err => console.error("Error generating audit log:", err));
    }
  }, [courseCompleted, user, course, userOverallProgress]);
};