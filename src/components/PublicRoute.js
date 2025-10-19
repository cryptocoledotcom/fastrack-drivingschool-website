import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../pages/Auth/AuthContext";

const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // You can optionally render a loading spinner here
    return null;
  }

  if (currentUser) {
    // If the user is logged in, redirect them away from the public page
    return <Navigate to="/user-profile" />;
  }

  // If the user is not logged in, render the public page
  return children;
};

export default PublicRoute;