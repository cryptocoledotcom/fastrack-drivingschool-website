import React, { useEffect, useState } from "react";
import { useAuth } from "./Auth/AuthContext";
import "./UserProfile.css";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { useNotification } from "../components/Notification/NotificationContext";

import MyCourses from "../components/MyCourses";
import formatPhoneNumber from "../utils/formatPhoneNumber";

const UserProfile = () => {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
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
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
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
          } else {
            setProfileError("Profile not found. Please complete your registration.");
          }
        } catch (err) {
          setProfileError("Error loading profile: " + err.message);
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

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
      </div>
      <div className="my-courses-container">
        <MyCourses />
      </div>
    </div>
  );
};

export default UserProfile;