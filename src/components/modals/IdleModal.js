import React from 'react';
import './Modals.css';

const IdleModal = ({ isOpen, onConfirm }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Are you still there?</h2>
        <p>Inactivity for another 5 minutes will result in a logout.</p>
        <button onClick={onConfirm} className="btn btn-primary">
          I'm still here
        </button>
      </div>
    </div>
  );
};

export default IdleModal;