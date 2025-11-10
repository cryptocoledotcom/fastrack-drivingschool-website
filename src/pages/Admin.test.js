import React from 'react';
import { render, screen } from '@testing-library/react';
import Admin from './Admin';
import { useAuth } from './Auth/AuthContext';

// Mock the useAuth hook to control its output in our tests
jest.mock('./Auth/AuthContext');

// Mock the child components to isolate the Admin component.
// We just want to know that the Admin component *tries* to render them,
// not test their internal logic here.
jest.mock('../components/Admin/ManageTimeSlots', () => () => <div>ManageTimeSlots</div>);
jest.mock('../components/Admin/ManageUserCourses', () => () => <div>ManageUserCourses</div>);
jest.mock('../components/Admin/ViewAuditLogs', () => () => <div>ViewAuditLogs</div>);
jest.mock('../components/Admin/ContentUploader', () => () => <div>ContentUploader</div>);

describe('Admin Component', () => {
  it('should render "Access Denied" when no user is logged in', () => {
    // Simulate a logged-out state
    useAuth.mockReturnValue({ user: null });

    render(<Admin />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('should render "Access Denied" for a non-admin user', () => {
    // Simulate a regular, non-admin user
    useAuth.mockReturnValue({ user: { uid: 'some-random-user-id' } });

    render(<Admin />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });

  it('should render the admin dashboard for an admin user', () => {
    // Simulate an admin user by providing the specific hardcoded UID
    useAuth.mockReturnValue({ user: { uid: 'tkr4zpyuDbYrkAlYvJ9OCXDIVr52' } });

    render(<Admin />);

    // Check that the main dashboard and its components are rendered
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('ManageTimeSlots')).toBeInTheDocument();
    expect(screen.getByText('ManageUserCourses')).toBeInTheDocument();
    
    // Check that the "Access Denied" message is NOT rendered
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});