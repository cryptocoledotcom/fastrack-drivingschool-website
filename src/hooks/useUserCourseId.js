import { useState, useEffect } from 'react';
import { db } from '../Firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export const useUserCourseId = (user, courseId) => {
  const [userCourseId, setUserCourseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const findUserCourse = async () => {
      if (!user || !courseId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const userCoursesRef = collection(db, 'users', user.uid, 'courses');
        const q = query(userCoursesRef, where('courseId', '==', courseId), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUserCourseId(querySnapshot.docs[0].id);
        }
      } catch (err) {
        setError('Could not find user course enrollment.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    findUserCourse();
  }, [user, courseId]);

  return { userCourseId, loading, error };
};