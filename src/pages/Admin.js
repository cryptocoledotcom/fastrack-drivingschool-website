import React from 'react';
import ManageTimeSlots from '../components/Admin/ManageTimeSlots';
import { useAuth } from './Auth/AuthContext';

const Admin = () => {
  const { user } = useAuth();

  // For now, we'll hardcode the admin UID. In a real application, you would want to have a more robust role-based system.
  const isAdmin = user && user.uid === 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52';

  if (!isAdmin) {
    return (
      <div className="container">
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Admin Page</h1>
      <ManageTimeSlots />
    </div>
  );
};

export default Admin;
