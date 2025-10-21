import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../../Firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../Firebase";
import "./AuthForms.css";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Save email and role to Firestore under users collection
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role: "student",
      });
      setSuccess("Sign-up successful! Redirecting to login...");
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
          setError("Failed to sign up. Please try again later.");
          break;
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Sign-Up</h2>
      <label htmlFor="signup-email" className="sr-only">Email</label>
      <input
        type="email"
        id="signup-email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <label htmlFor="signup-password" className="sr-only">Password</label>
      <input
        type="password"
        id="signup-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <button type="submit" className="auth-button">Sign-Up</button>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
};

export default SignUp;