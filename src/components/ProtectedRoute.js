import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../pages/Auth/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // You can optionally render a loading spinner here
    return null;
  }

  if (!currentUser) {
    // If the user is not logged in, redirect them to the login page
    return <Navigate to="/login" />;
  }

  // If the user is logged in, render the component they were trying to access
  return children;
};

export default ProtectedRoute;