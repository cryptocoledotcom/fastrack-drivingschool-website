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
    name: "",
    birthday: "",
    houseNumber: "",
    street: "",
    town: "",
    state: "",
    zip: "",
    phone: "",
    bio: ""
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
              name: data.name || "",
              birthday: data.birthday || "",
              houseNumber: address.houseNumber || "",
              street: address.street || "",
              town: address.town || "",
              state: address.state || "",
              zip: address.zip || "",
              phone: data.phone || "",
              bio: data.bio || ""
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
      name: profile?.name || "",
      birthday: profile?.birthday || "",
      houseNumber: address.houseNumber || "",
      street: address.street || "",
      town: address.town || "",
      state: address.state || "",
      zip: address.zip || "",
      phone: profile?.phone || "",
      bio: profile?.bio || ""
    });
  };
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: form.name,
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
        bio: form.bio
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
              <label htmlFor="name" style={{ display: "block", marginBottom: "0.25rem" }}>Name:</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleChange} required autoComplete="name" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="birthday" style={{ display: "block", marginBottom: "0.25rem" }}>Birthday:</label>
              <input type="date" id="birthday" name="birthday" value={form.birthday} onChange={handleChange} required autoComplete="bday" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="bio" style={{ display: "block", marginBottom: "0.25rem" }}>Bio:</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem" }}>Address:</label>
              <input type="text" name="houseNumber" placeholder="House Number" value={form.houseNumber} onChange={handleChange} required style={{ width: "30%", marginRight: "1%" }} autoComplete="address-line1" />
              <input type="text" name="street" placeholder="Street" value={form.street} onChange={handleChange} required style={{ width: "68%" }} autoComplete="address-line2" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <input type="text" name="town" placeholder="Town" value={form.town} onChange={handleChange} required style={{ width: "48%", marginRight: "4%" }} autoComplete="address-level2" />
              <input type="text" name="state" placeholder="State" value={form.state} onChange={handleChange} required style={{ width: "20%", marginRight: "4%" }} autoComplete="address-level1" />
              <input type="text" name="zip" placeholder="Zip" value={form.zip} onChange={handleChange} required style={{ width: "20%" }} autoComplete="postal-code" />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="phone" style={{ display: "block", marginBottom: "0.25rem" }}>Phone:</label>
              <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="tel" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginRight: "1rem" }}>Save</button>
            <button type="button" onClick={handleCancel} className="btn btn-secondary">Cancel</button>
          </form>
        ) : (
          <>
            <p><strong>Name:</strong> {profile?.name || "-"}</p>
            <p><strong>Birthday:</strong> {profile?.birthday || "-"}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Bio:</strong> {profile?.bio || "-"}</p>
            <p><strong>Address:</strong> {
              profile?.address ? (
                <>
                  {profile.address.houseNumber || ""} {profile.address.street || ""},<br />
                  {profile.address.town || ""}, {profile.address.state || ""} {profile.address.zip || ""}
                </>
              ) : "-"
            }</p>
            <p><strong>Phone:</strong> {formatPhoneNumber(profile?.phone) || "-"}</p>
            <button onClick={handleEdit} className="btn btn-primary" style={{ marginRight: "1rem" }}>Edit</button>
          </>
        )}
        <button onClick={logout} className="btn btn-danger" style={{ marginTop: "1rem" }}>Logout</button>
      </div>
      <MyCourses />
    </div>
  );
};

export default UserProfile;
