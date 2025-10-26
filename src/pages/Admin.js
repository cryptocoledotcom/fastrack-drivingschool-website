import React, { useState, useEffect } from 'react';
import { db, storage } from '../Firebase';
import { collection, getDocs, doc, updateDoc, query } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useNotification } from '../components/Notification/NotificationContext';
import ManageTimeSlots from '../components/Admin/ManageTimeSlots';
import ManageUserCourses from '../components/Admin/ManageUserCourses';
import { useAuth } from './Auth/AuthContext';
import './Admin.css';

const Admin = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const modulesQuery = query(collection(db, 'modules'));
        const modulesSnapshot = await getDocs(modulesQuery);
        const modulesData = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setModules(modulesData);

        // Fetch all lessons
        const lessonsSnapshot = await getDocs(collection(db, 'lessons'));
        const lessonsData = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLessons(lessonsData);

      } catch (error) {
        console.error("Error fetching course data: ", error);
        showNotification('Failed to load course data for uploader.', 'error');
      }
    };

    fetchCourseData();
  }, [showNotification]);

  const handleFileChange = (e) => {
    setVideoFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedLesson || !videoFile) {
      showNotification('Please select a lesson and a video file.', 'error');
      return;
    }

    const lessonData = lessons.find(l => l.id === selectedLesson);
    if (!lessonData) {
        showNotification('Selected lesson could not be found.', 'error');
        return;
    }

    setUploading(true);
    setProgress(0);

    // Create a storage reference
    const storageRef = ref(storage, `course_videos/${lessonData.courseId}/${selectedLesson}/${videoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, videoFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        showNotification(`Upload failed: ${error.message}`, 'error');
        setUploading(false);
      },
      async () => {
        // Upload completed successfully, now get the download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Update the lesson document in Firestore
          const lessonDocRef = doc(db, 'lessons', selectedLesson);
          await updateDoc(lessonDocRef, {
            videoUrl: downloadURL
          });

          showNotification('Video uploaded and linked successfully!', 'success');
        } catch (error) {
          console.error("Failed to get download URL or update Firestore:", error);
          showNotification('Upload succeeded, but failed to link video.', 'error');
        } finally {
          setUploading(false);
          setVideoFile(null);
          setSelectedLesson('');
          document.getElementById('video-upload-input').value = '';
        }
      }
    );
  };

  // TODO: Replace hardcoded UID with a role-based system.
  // This could involve checking a 'role' field on the user object
  // which is fetched from Firestore after login.
  // For example: const isAdmin = user && user.role === 'admin';
  const isAdmin = user && user.uid === 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52'; // This is the user's UID, not a secret key.

  if (!isAdmin) {
    return (
      <div className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>
      <div className="admin-section">
        <ManageTimeSlots />
      </div>
      <div className="admin-section">
        <ManageUserCourses />
      </div>

      {/* New Course Content Management Section */}
      <div className="admin-section">
        <h3>Course Content Management</h3>
        <form onSubmit={handleUpload} className="content-upload-form">
          <div className="form-group">
            <label htmlFor="lesson-select">Select Lesson</label>
            <select
              id="lesson-select"
              value={selectedLesson}
              onChange={(e) => setSelectedLesson(e.target.value)}
              required
            >
              <option value="" disabled>-- Please choose a lesson --</option>
              {modules.map(module => (
                <optgroup label={module.title} key={module.id}>
                  {module.lessonOrder.map(lessonId => {
                    const lesson = lessons.find(l => l.id === lessonId);
                    return lesson ? <option key={lesson.id} value={lesson.id}>{lesson.title}</option> : null;
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="video-upload-input">Upload Video</label>
            <input
              type="file"
              id="video-upload-input"
              onChange={handleFileChange}
              accept="video/*"
              required
            />
          </div>

          {uploading && (
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload and Link Video'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Admin;
