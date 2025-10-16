import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../Firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Firebase";
import "./AuthForms.css";

const RegisterForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [town, setTown] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Save address and phone to Firestore under users collection
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        birthday,
        email,
        role: "student",
        address: {
          houseNumber,
          street,
          town,
          state,
          zip
        },
        phone
      });
      setSuccess("Registration successful! Redirecting to login...");
      navigate("/login");
    } catch (err) {
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("This email is already in use.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("The password must be at least 6 characters long.");
          break;
        default:
          setError("Failed to register. Please try again later.");
          break;
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
      />
      <input
        type="date"
        placeholder="Birthday"
        value={birthday}
        onChange={(e) => setBirthday(e.target.value)}
        required
        autoComplete="bday"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="House Number"
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          required
          style={{ width: "30%", marginRight: "1%" }}
          autoComplete="address-line1"
        />
        <input
          type="text"
          placeholder="Street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          required
          style={{ width: "68%" }}
          autoComplete="address-line2"
        />
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Town"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          required
          style={{ width: "48%", marginRight: "4%" }}
          autoComplete="address-level2"
        />
        <input
          type="text"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          required
          style={{ width: "20%", marginRight: "4%" }}
          autoComplete="address-level1"
        />
        <input
          type="text"
          placeholder="Zip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          required
          style={{ width: "20%" }}
          autoComplete="postal-code"
        />
      </div>
      <input
        type="tel"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        autoComplete="tel"
      />
  <button type="submit" style={{ backgroundColor: "#1abc9c", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px" }}>Register</button>
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && <p>{error}</p>}
    </form>
  );
};

export default RegisterForm;
