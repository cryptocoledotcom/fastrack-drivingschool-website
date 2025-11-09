import React, { useState } from 'react';
import './IdentityVerificationModal.css';

export const IdentityVerificationModal = ({ isOpen, question, onSubmit, error, attemptsLeft, onAcknowledgeLogout }) => {
  const [answer, setAnswer] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(answer);
    setAnswer(''); // Clear the input after submission
  };

  const isLockedOut = attemptsLeft <= 0;
  const hasFailedOnce = attemptsLeft < 3;

  return (
    <div className="identity-modal-overlay">
      {isLockedOut ? (
        <div className="identity-modal-content">
          <h2>Account Locked</h2>
          <p className="identity-modal-error">{error}</p>
          <p>For your security, your account has been locked after multiple failed verification attempts.</p>
          <p>To unlock your account, please call us at:</p>
          <p className="lockout-phone-number">(412) 974-8858</p>
          <button onClick={onAcknowledgeLogout} className="btn btn-danger">
            Acknowledge & Logout
          </button>
        </div>
      ) : (
        <div className="identity-modal-content">
          <h2>Identity Verification</h2>
          <p>To continue, please answer the following security question:</p>
          <p className="identity-modal-question">{question}</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="security-answer">Your Answer</label>
              <input
                id="security-answer"
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
  
          {error && <p className="identity-modal-error">{error}</p>}
          
          {hasFailedOnce && !isLockedOut && (
            <p className="identity-modal-attempts">Please try again.</p>
          )}

          <button type="submit" className="btn btn-primary" disabled={isLockedOut || !answer}>
            Submit Answer
          </button>
          </form>
        </div>
      )}
    </div>
  );
};