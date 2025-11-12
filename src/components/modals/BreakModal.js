import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { formatTime } from '../../utils/formatTime';
import './Modal.css';

const BREAK_DURATION_SECONDS = 10 * 60;

const BreakModal = ({ isOpen }) => {
  const [countdown, setCountdown] = useState(BREAK_DURATION_SECONDS);

  useEffect(() => {
    if (isOpen) {
      // Reset countdown when modal opens
      setCountdown(BREAK_DURATION_SECONDS);

      const interval = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      // Cleanup interval on component unmount or when modal closes
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      className="modal"
      overlayClassName="modal-overlay"
      contentLabel="Mandatory Break"
      ariaHideApp={false}
      shouldCloseOnOverlayClick={false} // Prevent closing by clicking outside
    >
      <h2>Mandatory Break</h2>
      <p>You have reached a 2-hour instructional time block. Please take a mandatory 10-minute break.</p>
      <p className="modal-timer">Time Remaining: <strong>{formatTime(countdown)}</strong></p>
      <p>The course will resume automatically when the timer ends.</p>
    </Modal>
  );
};

export default BreakModal;