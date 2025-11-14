import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./AuthForms.css";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLocked(false);
    try {
      const result = await login(email, password);
      if (result?.success) {
        navigate("/user-profile");
      }
      // If MFA is required, do nothing and wait for the modal.
    } catch (err) {
      console.error("Login form submission error:", err);
      if (err.message === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
      } else {
        setError("Failed to log in. Please check your email and password.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (result?.success) {
        navigate('/user-profile');
      }
      // If MFA is required, do nothing and wait for the modal.
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError('Failed to sign in with Google. Please try again.');
    }
  };

  return (
    isLocked ? (
      <div className="auth-form">
        <h3>Account Locked</h3>
        <p className="error-message">For your security, your account has been locked after multiple failed verification attempts.</p>
        <p>To unlock your account, please call us at:</p>
        <p className="lockout-phone-number">(412) 974-8858</p>
      </div>
    ) : (
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
        {error && <p className="error-message">{error}</p>}
        <p className="auth-switch">
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
        <p className="auth-switch">
          Don't have an account? <Link to="/sign-up">Create an account</Link>
        </p>
        <div className="social-auth-divider">
          <span>OR</span>
        </div>
        <div className="social-auth">
          <button type="button" onClick={handleGoogleSignIn} className="btn-google">Sign in with Google</button>
        </div>
      </form>
    )
  );
};

export default LoginForm;
