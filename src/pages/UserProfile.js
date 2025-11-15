import React, { useEffect, useState } from "react";
import { useAuth } from "./Auth/AuthContext";
import "./UserProfile.css";
import { useNotification } from '../components/Notification/NotificationContext';
import { useUserProfileData } from '../hooks/useUserProfileData';

import MyCourses from "../components/MyCourses";
import UserProgressDashboard from "./UserProgressDashboard";
import ProfileDisplay from "../components/profile/ProfileDisplay";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import SecurityQuestionsDisplay from "../components/profile/SecurityQuestionsDisplay";
import SecurityQuestionsEditForm from "../components/profile/SecurityQuestionsEditForm";
import { deleteUserProgress } from "../services/userProgressFirestoreService";
import { predefinedQuestions, createBlankSecurityForm } from "../utils/securityUtils";

const UserProfile = () => {
  const { user, logout } = useAuth(); // Auth context
  const { showNotification } = useNotification(); // Notification context
  const { profile, securityQuestions, loading, error: profileDataError, actions } = useUserProfileData(user);
  const [editing, setEditing] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    birthday: "",
    houseNumber: "",
    street: "",
    town: "",
    state: "",
    zip: "",
    phone: "",
  });

  // securityForm will be initialized in an effect or when editing starts
  const [securityForm, setSecurityForm] = useState([]);
  
  // Initialize form state when profile data is loaded or changes
  useEffect(() => {
    if (profile) {
      const address = profile.address || {};
      setForm({
        firstName: profile.firstName || "",
        middleName: profile.middleName || "",
        lastName: profile.lastName || "",
        birthday: profile.birthday || "",
        houseNumber: address.houseNumber || "",
        street: address.street || "",
        town: address.town || "",
        state: address.state || "",
        zip: address.zip || "",
        phone: profile.phone || "",
      });
      setEditing(false); // Profile exists, so not in editing mode by default
    } else if (!loading && user) {
      // If no profile exists and not loading, go into edit mode
      setEditing(true);
    }
  }, [profile, loading, user]);

  // Effect to initialize securityForm when editingSecurity changes or securityQuestions are loaded
  // This ensures that when the edit form is opened, it's pre-filled with current questions or blank ones.
  useEffect(() => {
    if (editingSecurity) { // Only run if we are in editing mode
      if (securityQuestions && securityQuestions.length > 0) {
        // When editing, populate the form with the questions, but leave the
        // answer field blank for the user to type into.
        setSecurityForm(securityQuestions.map(q => ({ question: q.question, answer: '' })));
      } else {
        setSecurityForm(createBlankSecurityForm());
      }
    } else {
      // If not editing security, and security questions exist, ensure securityForm reflects that
      if (securityQuestions && securityQuestions.length > 0) {
        setSecurityForm(securityQuestions.map(q => ({ question: q.question, answer: '' })));
      } else {
        setSecurityForm([]); // Clear securityForm if no questions and not editing
      }
    }
  }, [editingSecurity, securityQuestions]);

  // Effect to set editingSecurity based on whether questions exist
  useEffect(() => {
    if (!loading && user && securityQuestions.length === 0) {
      setEditingSecurity(true); // If no questions and not loading, show edit form
    } else if (!loading && user && securityQuestions.length > 0) {
      setEditingSecurity(false); // If questions exist, don't show edit form by default
    }
  }, [loading, user, securityQuestions]);

  if (!user) {
    return <div className="profile-container"><p>Please log in to view your profile.</p></div>;
  }
  if (loading) {
    return <div className="profile-container"><p>Loading profile...</p></div>;
  }
  if (profileDataError) { // Use error from the hook for initial data loading
    return <div className="profile-container"><p style={{ color: "red" }}>{profileDataError}</p></div>;
  }
  const handleEdit = () => {
    setEditing(true);
  };
  const handleCancel = () => {
    setEditing(false);
    const address = profile?.address || {};
    setForm({
      firstName: profile?.firstName || "",
      middleName: profile?.middleName || "",
      lastName: profile?.lastName || "",
      birthday: profile?.birthday || "",
      houseNumber: address.houseNumber || "",
      street: address.street || "",
      town: address.town || "",
      state: address.state || "",
      zip: address.zip || "",
      phone: profile?.phone || "",
    });
  };
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const newProfileData = {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        birthday: form.birthday,
        address: { houseNumber: form.houseNumber, street: form.street, town: form.town, state: form.state, zip: form.zip },
        phone: form.phone,
        email: user.email,
      };

      // Call the action from the hook to update the profile
      await actions.updateUserProfile(newProfileData);

      setEditing(false);
      showNotification("Profile updated successfully!", "success");
    } catch (err) {
      showNotification("Error updating profile: " + err.message, "error");
      setEditing(true);
      console.error("Profile update error:", err);
    }
  };

  const handleSecurityChange = (index, field, value) => {
    const newForm = [...securityForm];
    newForm[index][field] = value;
    setSecurityForm(newForm);
  };

  const handleEditSecurityQuestions = () => {
    setEditingSecurity(true);
    // The useEffect above will now handle populating securityForm
  };

  const handleCancelSecurityEdit = () => {
    setEditingSecurity(false);
    // When canceling, reset the securityForm to reflect the currently saved questions (without answers)
    // or to its initial blank state if nothing was saved. We add Array.isArray for defensive programming.
    setSecurityForm(Array.isArray(securityQuestions) && securityQuestions.length > 0 ? securityQuestions.map(q => ({ question: q.question, answer: '' })) : createBlankSecurityForm());
  };

  const handleSaveSecurityQuestions = async (e) => {
    e.preventDefault();
    const allAnswered = securityForm.every(q => q.answer.trim() !== '');
    if (!allAnswered) {
      showNotification("Please answer all three security questions.", "error");
      return;
    }

    try {
      // Call the action from the hook to save the questions
      await actions.updateUserSecurityQuestions(securityForm);
      showNotification("Security questions saved successfully!", "success");
      setEditingSecurity(false); // Exit editing mode
    } catch (err) {
      showNotification("Error saving security questions. Please try again.", "error");
      console.error("Error saving security questions:", err);
    }
  };

  const handleResetProgress = async () => {
    if (window.confirm("Are you sure you want to reset all your course progress? This cannot be undone.")) {
      try {
        await deleteUserProgress(user.uid);
        showNotification("Your course progress has been reset.", "success");
        // You might want to force a reload or state update for the dashboard here
        window.location.reload(); // Simple way to see the change
      } catch (err) {
        showNotification("Failed to reset progress: " + err.message, "error");
      }
    }
  };

  return (
    <div className="profile-container">
      <div className="user-profile-section">
        <h2>User Profile</h2>
        {editing ? (
          <ProfileEditForm
            form={form}
            onFormChange={handleChange}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <>
            <ProfileDisplay profile={profile} email={user.email} onEdit={handleEdit} />
          </>
        )}
        <button onClick={logout} className="btn btn-danger">Logout</button>
        {/* --- Temporary Test Button --- */}
        <button onClick={handleResetProgress} className="btn" style={{ marginLeft: '1rem', backgroundColor: '#ffc107' }}>Reset Progress (Test)</button>
        {/* --- End Temporary Test Button --- */}
      </div>

      <div className="user-profile-section">
        <h2>Security Questions</h2>
        {editingSecurity ? (
          <SecurityQuestionsEditForm
            form={securityForm}
            predefinedQuestions={predefinedQuestions}
            onFormChange={handleSecurityChange}
            onSave={handleSaveSecurityQuestions}
            onCancel={handleCancelSecurityEdit}
            hasExistingQuestions={securityQuestions.length > 0}
          />
        ) : securityQuestions.length > 0 ? (
          <SecurityQuestionsDisplay 
            questions={securityQuestions}
            onEdit={handleEditSecurityQuestions}
          />
        ) : <p>You have not set up your security questions yet.</p>}
      </div>

      <div className="my-courses-container">
        <UserProgressDashboard />
        <MyCourses />
      </div>
    </div>
  );
};

export default UserProfile;