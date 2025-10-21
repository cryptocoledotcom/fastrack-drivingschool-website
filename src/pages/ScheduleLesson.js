import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { db } from '../Firebase';
import { doc, getDoc, collection, addDoc, writeBatch } from 'firebase/firestore';
import 'react-calendar/dist/Calendar.css';
import './ScheduleLesson.css';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './Auth/AuthContext';
import { useNotification } from '../components/Notification/NotificationContext';

const ScheduleLesson = () => {
  const [date, setDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotification();

  const bookingIdToReschedule = location.state?.bookingIdToReschedule;

  const onChange = (newDate) => {
    setDate(newDate);
    setSelectedSlot(null);
  };

  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoading(true);
      const dateString = date.toISOString().split('T')[0];
      const docRef = doc(db, 'time_slots', dateString);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setTimeSlots(docSnap.data().slots);
      } else {
        setTimeSlots([]);
      }
      setLoading(false);
    };

    fetchTimeSlots();
  }, [date]);

  const handleSlotSelection = (slot) => {
    setSelectedSlot(slot);
  };

  const handleBooking = async () => {
    if (!user) {
      showNotification("You must be logged in to schedule a lesson.", "error");
      return;
    }
    if (!selectedSlot) {
      showNotification("Please select a time slot.", "error");
      return;
    }

    const newBookingData = {
      userId: user.uid,
      courseId: 'behind-the-wheel',
      date: new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
      time: selectedSlot,
    };

    try {
      if (bookingIdToReschedule) {
        // This is a RESCHEDULE operation
        const batch = writeBatch(db);

        // 1. Reference to the old booking to delete
        const oldBookingRef = doc(db, "bookings", bookingIdToReschedule);
        batch.delete(oldBookingRef);

        // 2. Reference for the new booking to create
        const newBookingRef = doc(collection(db, "bookings"));
        batch.set(newBookingRef, newBookingData);

        // 3. Commit both operations together
        await batch.commit();
        showNotification("Lesson rescheduled successfully!", "success");
      } else {
        // This is a NEW booking operation
        await addDoc(collection(db, 'bookings'), newBookingData);
        showNotification("Lesson scheduled successfully!", "success");
      }

      console.log("Booking successful, navigating to /user-profile");
      navigate('/user-profile');
    } catch (error) {
      console.error('Error adding booking: ', error);
      showNotification("Failed to schedule lesson. Please try again.", "error");
    }
  };

  return (
    <>
      <div className="calendar-header">
        <h1>Schedule Driving Lessons</h1>
      </div>
      <div className="calendar-container">
        <div className="calendar-wrapper">
          <Calendar
            onChange={onChange}
            value={date}
          />
        </div>
        <div className="time-slots-container">
          <h3>Available Time Slots for {date.toDateString()}</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="time-slots">
              {timeSlots.length > 0 ? (
                timeSlots.map((slot, index) => (
                  <button 
                    key={index} 
                    className={`btn btn-secondary ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => handleSlotSelection(slot)}
                  >
                    {slot}
                  </button>
                ))
              ) : (
                <p>No available time slots for this date.</p>
              )}
            </div>
          )}
          {selectedSlot && (
            <div className="booking-confirmation">
              <p>You have selected: {selectedSlot}</p>
              <button className="btn btn-primary" onClick={handleBooking}>Confirm and Schedule</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ScheduleLesson;
