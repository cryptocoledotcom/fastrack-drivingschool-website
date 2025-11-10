import { useState, useEffect } from 'react';
import { db } from '../Firebase';
import { collection, getDocs, doc, query, where, getDoc } from 'firebase/firestore';

/**
 * A custom hook to fetch all necessary data for a course, including modules and lessons.
 * @param {string} courseId - The ID of the course to fetch.
 * @returns {object} An object containing the course data, loading state, and any errors.
 */
export const useCourseData = (courseId) => {
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      setError("No course ID provided.");
      return;
    }

    const fetchCourseContent = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Fetch the main course document
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        if (!courseSnap.exists()) {
          throw new Error('Course not found.');
        }
        const courseData = { id: courseSnap.id, ...courseSnap.data() };
        setCourse(courseData);

        // 2. Fetch all modules for this course
        const modulesQuery = query(collection(db, 'modules'), where('courseId', '==', courseId));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedModules = modulesData.sort((a, b) => courseData.moduleOrder.indexOf(a.id) - courseData.moduleOrder.indexOf(b.id));
        setModules(sortedModules);

        // 3. Fetch all lessons for this course
        const lessonsQuery = query(collection(db, 'lessons'), where('courseId', '==', courseId));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonsData = {};
        lessonsSnapshot.docs.forEach(doc => {
          lessonsData[doc.id] = { id: doc.id, ...doc.data() };
        });
        setLessons(lessonsData);
      } catch (err) {
        console.error("Error fetching course content:", err);
        setError("Failed to load course content.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseContent();
  }, [courseId]);

  return { course, modules, lessons, loading, error };
};