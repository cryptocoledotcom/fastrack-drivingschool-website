import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../pages/Auth/AuthContext';
import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from '../../Firebase';
import './MfaChallengeModal.css';

const MfaChallengeModal = () => {
  const { mfaResolver, mfaHint, sendMfaVerification, completeMfaSignIn, cancelMfaSignIn } = useAuth();
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [error, setError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false); // For loading state on Verify button
  const [cooldown, setCooldown] = useState(60); // Cooldown timer for resend
  const timerId = useRef(null);
  // Use separate refs for the verifier instance and its container element
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerRef = useRef(null);
  const navigate = useNavigate();

  // Effect to initialize and clean up the RecaptchaVerifier instance
  useEffect(() => {
    if (mfaResolver && recaptchaContainerRef.current) {
      // Create a new verifier every time the modal appears for a new MFA challenge.
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': () => { /* This callback is for invisible reCAPTCHA success */ }
        });
      }
    }
    // The cleanup function will be called when the modal disappears (mfaResolver becomes null).
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, [mfaResolver]); // Dependency on mfaResolver ensures re-initialization.

  const startCooldown = () => {
    setCooldown(60);
    setIsSendingCode(false);
    timerId.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerId.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendVerification = useCallback(async (verifier) => {
    setIsSendingCode(true);
    setError('');
    try {
      const verId = await sendMfaVerification(verifier); // This function comes from context
      setVerificationId(verId);
      startCooldown(); // Start cooldown timer on success
    } catch (err) {
      console.error("Failed to send MFA verification code:", err);
      setError("Failed to send verification code. Please try logging in again.");
      setIsSendingCode(false); // Stop "sending" message to show error
      setTimeout(() => { // This function also comes from context
        cancelMfaSignIn();
      }, 3000);
    }
  }, [sendMfaVerification, cancelMfaSignIn]); // Dependencies for the user-interactive parts

  // Effect to send the verification code when the modal is shown
  useEffect(() => {
    if (mfaResolver && recaptchaVerifierRef.current) {
      // Call the verification logic directly here when the modal appears.
      handleSendVerification(recaptchaVerifierRef.current);
    }
    return () => clearInterval(timerId.current); // Cleanup timer on unmount or when mfaResolver changes
  }, [mfaResolver, handleSendVerification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!verificationId) {
      setError("Verification has not been sent yet.");
      return;
    }
    setIsVerifying(true);
    try {
      await completeMfaSignIn(verificationCode, verificationId);
      // On success, the AuthProvider will clear the resolver and this modal will disappear.
      // Now, navigate to the user's profile.
      navigate('/user-profile');
    } catch (err) {
      console.error("MFA code verification failed:", err.code);
      // Provide more specific error feedback
      setError(err.code === 'auth/code-expired' ? 'The code has expired. Please request a new one.' : 'Invalid code. Please try again.');
    }
    setIsVerifying(false);
  };

  const handleCancel = () => {
    cancelMfaSignIn();
  };

  if (!mfaResolver) {
    return null;
  }

  return (
    <div className="mfa-challenge-modal-backdrop">
      <div className="mfa-challenge-modal-content">
        <h2>Two-Factor Authentication</h2>
        <p>
          For your security, please enter the verification code sent to your device ending in {mfaHint?.phoneNumber?.slice(-4)}.
        </p>
        
        {isSendingCode ? (
          <p>Sending verification code...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="6-digit code"
              maxLength="6"
              required
              autoFocus
            />
            <div className="mfa-challenge-modal-actions">
              <button type="submit" className="btn btn-primary" disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
              <button type="button" onClick={handleCancel} className="btn">Cancel</button>
            </div>
            <div className="mfa-resend-container">
              <button type="button" onClick={() => handleSendVerification(recaptchaVerifierRef.current)} disabled={cooldown > 0} className="btn-link">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="error-message">{error}</p>}

        {/* This div is the mount point for the reCAPTCHA verifier. It must always be in the DOM. */}
        <div ref={recaptchaContainerRef} id="recaptcha-container-mfa"></div>
      </div>
    </div>
  );
};

export default MfaChallengeModal;