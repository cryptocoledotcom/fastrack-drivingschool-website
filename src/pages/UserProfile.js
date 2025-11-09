import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./Auth/AuthContext";
import "./UserProfile.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { useNotification } from "../components/Notification/NotificationContext";

import MyCourses from "../components/MyCourses";
import UserProgressDashboard from "./UserProgressDashboard";
import ProfileDisplay from "../components/profile/ProfileDisplay";
import ProfileEditForm from "../components/profile/ProfileEditForm";
import SecurityQuestionsDisplay from "../components/profile/SecurityQuestionsDisplay";
import SecurityQuestionsEditForm from "../components/profile/SecurityQuestionsEditForm";
import { deleteUserProgress, setSecurityQuestions as saveSecurityQuestionsToFirestore } from "../services/userProgressFirestoreService";

const predefinedQuestions = [
  "What was your first pet's name?",
  "What was the model of your first car?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What is the name of your favorite childhood friend?",
];

const UserProfile = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const [securityQuestions, setSecurityQuestions] = useState([]); // Stores the questions fetched from Firestore (question text only)
  const [profileError, setProfileError] = useState("");

  // Helper to create a blank security form
  const createBlankSecurityForm = useCallback(() => {
    return predefinedQuestions.slice(0, 3).map(q => ({ question: q, answer: '' }));
  }, []);

  // securityForm will be initialized in an effect or when editing starts
  const [securityForm, setSecurityForm] = useState([]);
  
  const fetchProfile = useCallback(async () => {
      setProfileError("");
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setProfile(data);
            const address = data.address || {};
            setForm({
              firstName: data.firstName || "",
              middleName: data.middleName || "",
              lastName: data.lastName || "",
              birthday: data.birthday || "",
              houseNumber: address.houseNumber || "",
              street: address.street || "",
              town: address.town || "",
              state: address.state || "",
              zip: address.zip || "",
              phone: data.phone || "",
            });
            setEditing(false); // Profile exists, so not in editing mode by default
          } else {
            // If profile doesn't exist, they need to fill it out.
            setEditing(true);
          }

          // Fetch security questions
          const securityDoc = await getDoc(doc(db, `users/${user.uid}/securityProfile`, 'questions'));
          if (securityDoc.exists()) {
            const questionsData = securityDoc.data().questions;
            if (Array.isArray(questionsData)) {
              // BUG FIX: Store the FULL question object, including the encrypted answer.
              setSecurityQuestions(questionsData);
            } else {
              console.error("Firestore 'questions' field is not an array for user:", user.uid, questionsData);
              setSecurityQuestions([]); // Fallback to empty array if data is malformed
            }
            setEditingSecurity(false); // Questions exist, so don't show edit form by default
          } else {
            // If security questions don't exist, they need to set them.
            setSecurityQuestions([]); // No saved questions
            setEditingSecurity(true); // Questions don't exist, so show edit form
          }
        } catch (err) {
          setProfileError("Error loading profile: " + err.message);
        }
      }
      setLoading(false);
    }, [user]);

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
    }
  }, [editingSecurity, securityQuestions, createBlankSecurityForm]); // Added createBlankSecurityForm to dependencies

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) {
    return <div className="profile-container"><p>Please log in to view your profile.</p></div>;
  }
  if (loading) {
    return <div className="profile-container"><p>Loading profile...</p></div>;
  }
  if (profileError) {
    return <div className="profile-container"><p style={{ color: "red" }}>{profileError}</p></div>;
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
      await setDoc(doc(db, "users", user.uid), {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        birthday: form.birthday,
        address: {
          houseNumber: form.houseNumber,
          street: form.street,
          town: form.town,
          state: form.state,
          zip: form.zip
        },
        phone: form.phone,
        email: user.email,
      }, { merge: true });
      // Fetch updated profile from Firestore
      const updatedDoc = await getDoc(doc(db, "users", user.uid));
      if (updatedDoc.exists()) {
        setProfile(updatedDoc.data());
        setEditing(false);
        showNotification("Profile updated successfully!", "success");
      } else {
        showNotification("Error: Updated profile not found.", "error");
        setEditing(true);
      }
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
      // The `saveSecurityQuestionsToFirestore` service function handles hashing internally.
      // We just need to pass it the plain-text answers from the form.
      await saveSecurityQuestionsToFirestore(user.uid, securityForm);
      showNotification("Security questions saved successfully!", "success");
      setEditingSecurity(false); // Exit editing mode
      // Force a refetch to ensure the component state is perfectly in sync.
      fetchProfile();
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