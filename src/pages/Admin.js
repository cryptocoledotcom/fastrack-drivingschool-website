import React from 'react';
import ManageTimeSlots from '../components/Admin/ManageTimeSlots';
import ManageUserCourses from '../components/Admin/ManageUserCourses';
import ViewAuditLogs from '../components/Admin/ViewAuditLogs';
import ContentUploader from '../components/Admin/ContentUploader';
import { useAuth } from './Auth/AuthContext';

const Admin = () => {
  const { user } = useAuth();

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
      <div className="admin-section">
        <ViewAuditLogs />
      </div>
      <ContentUploader />
    </div>
  );
};

export default Admin;
