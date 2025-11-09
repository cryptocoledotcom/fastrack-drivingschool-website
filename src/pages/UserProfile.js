import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./Auth/AuthContext";
import "./UserProfile.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { useNotification } from "../components/Notification/NotificationContext";

import MyCourses from "../components/MyCourses";
import UserProgressDashboard from "./UserProgressDashboard";
import { deleteUserProgress, setSecurityQuestions as saveSecurityQuestionsToFirestore } from "../services/userProgressFirestoreService";
import formatPhoneNumber from "../utils/formatPhoneNumber";

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
          <form className="auth-form" onSubmit={handleSave} style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="firstName" style={{ display: "block", marginBottom: "0.25rem" }}>First Name:</label>
              <input type="text" id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required autoComplete="given-name" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="middleName" style={{ display: "block", marginBottom: "0.25rem" }}>Middle Name:</label>
              <input type="text" id="middleName" name="middleName" value={form.middleName} onChange={handleChange} autoComplete="additional-name" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="lastName" style={{ display: "block", marginBottom: "0.25rem" }}>Last Name:</label>
              <input type="text" id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required autoComplete="family-name" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="birthday" style={{ display: "block", marginBottom: "0.25rem" }}>Birthday:</label>
              <input type="date" id="birthday" name="birthday" value={form.birthday} onChange={handleChange} required autoComplete="bday" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>Address:</label>
              <label htmlFor="houseNumber" className="sr-only">House Number</label>
              <input type="text" id="houseNumber" name="houseNumber" placeholder="House Number" value={form.houseNumber} onChange={handleChange} required style={{ width: "30%", marginRight: "1%" }} autoComplete="address-line1" />
              <label htmlFor="street" className="sr-only">Street</label>
              <input type="text" id="street" name="street" placeholder="Street" value={form.street} onChange={handleChange} required style={{ width: "68%" }} autoComplete="address-line2" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="town" className="sr-only">Town</label>
              <input type="text" id="town" name="town" placeholder="Town" value={form.town} onChange={handleChange} required style={{ width: "40%", marginRight: "4%" }} autoComplete="address-level2" />
              <label htmlFor="state" className="sr-only">State</label>
              <input type="text" id="state" name="state" placeholder="State" value={form.state} onChange={handleChange} required style={{ width: "20%", marginRight: "4%" }} autoComplete="address-level1" />
              <label htmlFor="zip" className="sr-only">Zip</label>
              <input type="text" id="zip" name="zip" placeholder="Zip" value={form.zip} onChange={handleChange} required style={{ width: "30%" }} autoComplete="postal-code" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="phone" style={{ display: "block", marginBottom: "0.25rem" }}>Phone:</label>
              <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ marginRight: "1rem" }}>Save</button>
            <button type="button" onClick={handleCancel} className="btn">Cancel</button>
          </form>
        ) : (
          <>
            <p><strong>Name:</strong> {profile?.firstName || ""} {profile?.middleName || ""} {profile?.lastName || ""}</p>
            <p><strong>Birthday:</strong> {profile?.birthday || "-"}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Address:</strong> {
              profile?.address ? (
                <>
                  {profile.address.houseNumber || ""} {profile.address.street || ""},<br />
                  {profile.address.town || ""}, {profile.address.state || ""} {profile.address.zip || ""}
                </>
              ) : "-"
            }</p>
            <p><strong>Phone:</strong> {formatPhoneNumber(profile?.phone) || "-"}</p>
            <button onClick={handleEdit} className="btn btn-secondary" style={{ marginRight: "1rem" }}>Edit</button>
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
          <form className="auth-form" onSubmit={handleSaveSecurityQuestions}>
            <p>Please select and answer three security questions. These will be used to verify your identity during the course.</p>
            {securityForm.map((item, index) => (
              <div key={index} style={{ marginBottom: "1rem" }}>
                <label htmlFor={`question-${index}`}>Question {index + 1}:</label>
                <select
                  id={`question-${index}`}
                  value={item.question}
                  onChange={(e) => handleSecurityChange(index, 'question', e.target.value)}
                  required
                >
                  {predefinedQuestions.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
                <label htmlFor={`answer-${index}`} className="sr-only">Answer {index + 1}</label>
                <input
                  type="text"
                  id={`answer-${index}`}
                  placeholder="Your Answer"
                  value={item.answer}
                  onChange={(e) => handleSecurityChange(index, 'answer', e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
            ))}
            <button type="submit" className="btn btn-secondary" style={{ marginRight: "1rem" }}>Save Questions</button>
            {securityQuestions.length > 0 && (
              <button type="button" onClick={handleCancelSecurityEdit} className="btn">Cancel</button>
            )}
          </form>
        ) : securityQuestions.length > 0 ? (
          <div>
            {/* BUG FIX: Display only the question text, not the encrypted answer */}
            <ul>
              {securityQuestions.map((q, index) => (
                <li key={index}><em>{q.question}</em></li>
              ))}
            </ul>
            <button onClick={handleEditSecurityQuestions} className="btn btn-secondary">Edit Security Questions</button>
          </div>
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