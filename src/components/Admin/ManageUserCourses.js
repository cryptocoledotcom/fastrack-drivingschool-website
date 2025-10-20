import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { useNotification } from '../Notification/NotificationContext';

const ManageUserCourses = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchUsersAndCourses = async () => {
      const usersCollection = await getDocs(collection(db, 'users'));
      setUsers(usersCollection.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const coursesCollection = await getDocs(collection(db, 'courses'));
      const coursesData = coursesCollection.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id };
      });
      setCourses(coursesData);
    };
    fetchUsersAndCourses();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const fetchPurchasedCourses = async () => {
        const purchasedCoursesCollection = await getDocs(collection(db, 'users', selectedUser.id, 'courses'));
        const purchasedCoursesData = await Promise.all(purchasedCoursesCollection.docs.map(async (doc) => {
          const courseData = doc.data();
          const courseDoc = await getDoc(courseData.courseRef);
          return { ...courseDoc.data(), id: doc.id };
        }));
        setPurchasedCourses(purchasedCoursesData);
      };
      fetchPurchasedCourses();
    }
  }, [selectedUser]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setSelectedUser(null);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchTerm(user.email);
  };

  const handleAddCourse = async () => {
    if (!selectedUser || !selectedCourse) {
      showNotification('Please select a user and a course.', 'error');
      return;
    }

    try {
      const batch = writeBatch(db);
      const purchasedCourseRef = doc(collection(db, 'users', selectedUser.id, 'courses'));

      batch.set(purchasedCourseRef, {
        courseRef: doc(db, 'courses', selectedCourse)
      });

      const completedModulesRef = doc(collection(purchasedCourseRef, 'completed_modules'));
      batch.set(completedModulesRef, {});

      await batch.commit();

      showNotification('Course added successfully!', 'success');
      setSelectedCourse('');
      // Refresh purchased courses
      const fetchPurchasedCourses = async () => {
        const purchasedCoursesCollection = await getDocs(collection(db, 'users', selectedUser.id, 'courses'));
        const purchasedCoursesData = await Promise.all(purchasedCoursesCollection.docs.map(async (doc) => {
          const courseData = doc.data();
          const courseDoc = await getDoc(courseData.courseRef);
          return { ...courseDoc.data(), id: doc.id };
        }));
        setPurchasedCourses(purchasedCoursesData);
      };
      fetchPurchasedCourses();
    } catch (error) {
      showNotification('Error adding course. Please try again.', 'error');
      console.error('Error adding course: ', error);
    }
  };

  const handleRemoveCourse = async (courseId) => {
    if (!selectedUser) return;

    try {
      const batch = writeBatch(db);
      const courseRef = doc(db, 'users', selectedUser.id, 'courses', courseId);

      // Delete subcollections
      const completedModulesCollection = await getDocs(collection(courseRef, 'completed_modules'));
      completedModulesCollection.docs.forEach(doc => batch.delete(doc.ref));

      batch.delete(courseRef);

      await batch.commit();

      showNotification('Course removed successfully!', 'success');
      setPurchasedCourses(purchasedCourses.filter(course => course.id !== courseId));
    } catch (error) {
      showNotification('Error removing course. Please try again.', 'error');
      console.error('Error removing course: ', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTermLower = searchTerm.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    return user.email.toLowerCase().includes(searchTermLower) || fullName.includes(searchTermLower);
  });

  return (
    <div>
      <h3>Manage User Courses</h3>
      <div className="user-search">
        <input
          type="text"
          placeholder="Search for a user by name or email"
          value={searchTerm}
          onChange={handleSearch}
        />
        {searchTerm && (
          <ul>
            {filteredUsers.map(user => (
              <li key={user.id} onClick={() => handleSelectUser(user)}>
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedUser && (
        <div>
          <h4>Courses for {selectedUser.email}</h4>
          <div className="add-course">
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <button onClick={handleAddCourse}>Add Course</button>
          </div>
          <div className="purchased-courses">
            <h5>Purchased Courses</h5>
            <ul>
              {purchasedCourses.map(course => (
                <li key={course.id}>
                  {course.title}
                  <button onClick={() => handleRemoveCourse(course.id)}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUserCourses;