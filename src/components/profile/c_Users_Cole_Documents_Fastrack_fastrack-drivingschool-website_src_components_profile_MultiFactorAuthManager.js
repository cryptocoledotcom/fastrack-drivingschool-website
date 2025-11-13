import React, { useState } from 'react';
import { useAuth } from '../../pages/Auth/AuthContext'; // Corrected import path
import { RecaptchaVerifier, PhoneAuthProvider, multiFactor, PhoneMultiFactorGenerator } from 'firebase/auth';

const MultiFactorAuthManager = () => {
  const { user } = useAuth();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // This effect correctly manages the lifecycle of the RecaptchaVerifier.
  useEffect(() => {
    if (isEnrolling && !verificationId) {
      // Create the verifier instance and store it in the ref after the component mounts.
      // The 'recaptcha-container' div MUST be in the DOM for this to work.
      recaptchaVerifierRef.current = new RecaptchaVerifier(user.auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }

    // The cleanup function is critical. It runs when the component unmounts
    // or when `isEnrolling` changes, ensuring we don't leave dangling widgets.
    return () => {
      recaptchaVerifierRef.current?.clear();
    };
  }, [isEnrolling, verificationId, user.auth]);

  const enrolledPhoneFactor = user?.multiFactor?.enrolledFactors.find(
    (factor) => factor.factorId === 'phone'
  );

  const handleEnrollClick = () => {
    setIsEnrolling(true);
    setError('');
    setSuccess('');
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // 1. Sanitize the phone number to E.164 format
      const formattedPhoneNumber = '+' + phoneNumber.replace(/\D/g, '');

      // 2. Create the verifier on-demand, right when the user clicks the button.
      // This ensures the container element is in the DOM and avoids lifecycle issues.
      const recaptchaVerifier = new RecaptchaVerifier(user.auth, 'recaptcha-container', {
        'size': 'invisible'
      });

      // 3. Verify the phone number
      const multiFactorSession = await multiFactor(user).getSession();
      const phoneInfoOptions = {
        phoneNumber: formattedPhoneNumber,
        session: multiFactorSession
      };
      const phoneAuthProvider = new PhoneAuthProvider(user.auth);
      const verifierId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
      setVerificationId(verifierId);
      setSuccess('Verification code sent to your phone!');
    } catch (err) {
      setError('Failed to send verification code. Please check the phone number and try again.');
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
      setSuccess('SMS Multi-Factor Authentication has been enabled!');
      // Reset form state
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
        setSuccess('SMS authentication has been disabled.');
      } catch (err) {
        setError('Failed to disable SMS authentication. You may need to log in again recently.');
        console.error(err);
      }
    }
  };

  // This function formats the phone number as the user types.
  const handlePhoneChange = (e) => {
    let input = e.target.value.replace(/\D/g, ''); // Remove all non-digits
    if (input.startsWith('1')) {
      input = input.substring(1); // Remove leading '1' if present
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

    setPhoneNumber(input.slice(0, 14)); // Limit to (XXX) XXX-XXXX
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
            <button type="submit" className="btn btn-primary">Send Code</button>
            <button type="button" onClick={() => setIsEnrolling(false)} className="btn">Cancel</button>
            <div id="recaptcha-container"></div> {/* This div is the mount point for the verifier */}
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