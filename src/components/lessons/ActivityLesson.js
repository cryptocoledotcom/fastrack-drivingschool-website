import React, { useState } from 'react';
import { storage, db } from '../../Firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ActivityLesson = ({ lesson, user, onComplete }) => {
  const [submissionMode, setSubmissionMode] = useState('upload'); // 'upload' or 'write'
  const [file, setFile] = useState(null);
  const [writtenResponse, setWrittenResponse] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
      setError('File is too large. Please upload a file smaller than 5MB.');
      setFile(null);
    } else {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleWrittenResponseChange = (e) => {
    setWrittenResponse(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionMode === 'upload' && !file) {
      setError('Please select a file to upload or switch to the written response option.');
      return;
    }
    if (submissionMode === 'write' && writtenResponse.trim().length < 20) {
      setError('Please provide a more detailed description of the activity you performed (minimum 20 characters).');
      return;
    }

    setUploading(true);
    setError('');

    let submissionData = {};

    try {
      if (submissionMode === 'upload') {
        // 1. Create a unique path for the file in Firebase Storage
        const filePath = `activity_submissions/${user.uid}/${lesson.id}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);

        // 2. Upload the file
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        submissionData = { fileURL: downloadURL, filePath: filePath, submissionType: 'file' };
      } else {
        // Handle written submission
        submissionData = { writtenResponse: writtenResponse.trim(), submissionType: 'text' };
      }

      // 3. Create an audit record in Firestore
      const submissionRef = doc(db, `users/${user.uid}/activity_submissions`, lesson.id);
      await setDoc(submissionRef, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        submittedAt: serverTimestamp(),
        ...submissionData,
      });

      // 4. Call the onComplete function passed from CoursePlayer
      onComplete();

    } catch (err) {
      console.error("Error submitting activity:", err);
      setError('There was an error submitting your activity. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="activity-lesson-container">
      <div className="lesson-description-box">
        <h3>Activity Instructions</h3>
        <p>{lesson.activityDescription}</p>
      </div>
      <form className="activity-submission-box" onSubmit={handleSubmit}>
        <h4>Submit Your Proof</h4>
        {submissionMode === 'upload' ? (
          <>
            <p>Upload a photo or short video (max 5MB) to complete this lesson.</p>
            <input type="file" onChange={handleFileChange} accept="image/*,video/*" />
            <p className="form-alternative-link" onClick={() => setSubmissionMode('write')}>
              Can't upload a file? Use the written response option instead.
            </p>
          </>
        ) : (
          <>
            <p>Describe the activity you performed in the text box below.</p>
            <textarea
              rows="4"
              placeholder="Example: I walked around the car and confirmed all four tires were properly inflated and that all headlights, taillights, and turn signals were working."
              value={writtenResponse}
              onChange={handleWrittenResponseChange}
            />
            <p className="form-alternative-link" onClick={() => setSubmissionMode('upload')}>
              Want to upload a file instead?
            </p>
          </>
        )}
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={uploading || (submissionMode === 'upload' && !file) || (submissionMode === 'write' && writtenResponse.trim().length < 20)} className="btn btn-primary">
          {uploading ? 'Submitting...' : 'Submit and Complete Lesson'}
        </button>
      </form>
    </div>
  );
};

export default ActivityLesson;