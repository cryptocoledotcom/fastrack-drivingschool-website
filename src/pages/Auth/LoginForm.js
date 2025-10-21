import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../../services/authService";
import "./AuthForms.css";

const LoginForm = () => {
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
      await loginUser(email, password);
      setSuccess("Login successful! Redirecting to your profile...");
      navigate("/user-profile");
    } catch (err) {
      switch (err.code) {
        case "auth/user-not-found":
          setError("No user found with this email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password.");
          break;
        default:
          setError("Failed to log in. Please try again later.");
          break;
      }
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Login</h2>
      <label htmlFor="login-email" className="sr-only">Email</label>
      <input
        type="email"
        id="login-email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <label htmlFor="login-password" className="sr-only">Password</label>
      <input
        type="password"
        id="login-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />
      <button type="submit" className="auth-button">Login</button>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="auth-switch">
        <Link to="/forgot-password">Forgot Password?</Link>
      </p>
      <p className="auth-switch">
        Don't have an account? <Link to="/sign-up">Create an account</Link>
      </p>
    </form>
  );
};

export default LoginForm;
