import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../pages/Auth/AuthContext';
import { auth } from '../../Firebase'; // Import the stable auth instance
import { RecaptchaVerifier, PhoneAuthProvider, multiFactor, PhoneMultiFactorGenerator } from 'firebase/auth';

const MultiFactorAuthManager = () => {
  const { user, setUser } = useAuth(); // Get setUser to refresh context
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const [isRecaptchaSolved, setIsRecaptchaSolved] = useState(false);

  useEffect(() => {
    if (isEnrolling) {
      if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'normal',
          'callback': () => {
            setIsRecaptchaSolved(true);
            setSuccess('reCAPTCHA solved. You can now send the code.');
          },
          'expired-callback': () => {
            setIsRecaptchaSolved(false);
            setError('reCAPTCHA expired. Please solve it again.');
          }
        });
        recaptchaVerifierRef.current = verifier;
        verifier.render().catch(err => {
          console.error("reCAPTCHA render error:", err);
          setError("Failed to render reCAPTCHA. Please refresh the page.");
        });
      }
    }
    
    // Cleanup function
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, [isEnrolling]);

  const enrolledPhoneFactor = user?.multiFactor?.factors.find(
    (factor) => factor.factorId === 'phone'
  );

  const handleEnrollClick = () => {
    setIsEnrolling(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setIsEnrolling(false);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!recaptchaVerifierRef.current) {
      setError("reCAPTCHA verifier not initialized.");
      return;
    }
    try {
      const formattedPhoneNumber = '+1' + phoneNumber.replace(/\D/g, '');
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const multiFactorSession = await multiFactor(user).getSession();
      const phoneInfoOptions = {
        phoneNumber: formattedPhoneNumber,
        session: multiFactorSession
      };
      
      const verifierId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        recaptchaVerifierRef.current
      );
      
      setVerificationId(verifierId);
      setSuccess('Verification code sent to your phone!');
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check the phone number and try again.');
      console.error(err);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(user).enroll(multiFactorAssertion, `My Phone`);
      
      // Force a reload of the user to get the latest MFA state
      await user.reload();
      // Create a new user object to force re-render in consuming components
      setUser({ ...user });

      setSuccess('SMS Multi-Factor Authentication has been enabled!');
      setIsEnrolling(false);
      setVerificationId(null);
    } catch (err) {
      setError('Failed to verify code. Please try again.');
      console.error(err);
    }
  };

  const handleUnenroll = async () => {
    if (window.confirm('Are you sure you want to disable SMS authentication?')) {
      try {
        const multiFactorUser = multiFactor(user);
        await multiFactorUser.unenroll(enrolledPhoneFactor.uid);

        // Force a reload of the user to get the latest MFA state
        await user.reload();
        // Create a new user object to force re-render
        setUser({ ...user });

        setSuccess('SMS authentication has been disabled.');
      } catch (err) {
        setError('Failed to disable SMS authentication. You may need to log in again recently.');
        console.error(err);
      }
    }
  };

  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, '');
    if (input.startsWith('1')) {
      input = input.substring(1);
    }
    const size = input.length;
    if (size > 0) {
      input = '(' + input;
    }
    if (size > 3) {
      input = input.slice(0, 4) + ') ' + input.slice(4);
    }
    if (size > 6) {
      input = input.slice(0, 9) + '-' + input.slice(9);
    }
    setPhoneNumber(input.slice(0, 14));
  };

  if (enrolledPhoneFactor) {
    return (
      <div>
        <p>SMS Authentication is <strong>enabled</strong> for phone number: {enrolledPhoneFactor.phoneNumber}</p>
        <button onClick={handleUnenroll} className="btn btn-danger">Disable SMS Authentication</button>
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </div>
    );
  }

  if (isEnrolling) {
    return (
      <div>
        {!verificationId ? (
          <form onSubmit={handleSendCode}>
            <p>Enter your phone number to enable SMS authentication.</p>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              required
              maxLength="14"
            />
            <button type="submit" className="btn btn-primary" disabled={!isRecaptchaSolved}>Send Code</button>
            <button type="button" onClick={handleCancel} className="btn">Cancel</button>
            <div ref={recaptchaContainerRef} style={{ marginTop: '1rem' }}></div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <p>Enter the code sent to your phone.</p>
            <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Verification Code" required />
            <button type="submit" className="btn btn-primary">Verify & Enable</button>
          </form>
        )}
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
      </div>
    );
  }

  return (
    <div>
      <p>SMS Authentication is currently <strong>disabled</strong>.</p>
      <button onClick={handleEnrollClick} className="btn btn-primary">Enable SMS Authentication</button>
    </div>
  );
};

export default MultiFactorAuthManager;
