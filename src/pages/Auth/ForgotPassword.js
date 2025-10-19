import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordReset } from "../../services/authService";
import "./AuthForms.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setError("Failed to send reset email. Please check the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <p>Enter your email and we'll send you a link to reset your password.</p>
      <label htmlFor="reset-email" className="sr-only">Email</label>
      <input
        id="reset-email"
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
      {success && <p className="success-message">{success}</p>}
      {error && <p className="error-message">{error}</p>}
      <p className="auth-switch">
        Remembered your password? <Link to="/login">Login</Link>
      </p>
    </form>
  );
};

export default ForgotPassword;
