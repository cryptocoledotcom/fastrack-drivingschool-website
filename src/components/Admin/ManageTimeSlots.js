import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { db } from '../../Firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ManageTimeSlots = () => {
  const [date, setDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState([]);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleAddTimeSlot = async () => {
    if (newTimeSlot.trim() === '') return;

    const dateString = date.toISOString().split('T')[0];
    const docRef = doc(db, 'time_slots', dateString);
    const newTimeSlots = [...timeSlots, newTimeSlot];
    await setDoc(docRef, { slots: newTimeSlots });
    setTimeSlots(newTimeSlots);
    setNewTimeSlot('');
  };

  const handleRemoveTimeSlot = async (slotToRemove) => {
    const dateString = date.toISOString().split('T')[0];
    const docRef = doc(db, 'time_slots', dateString);
    const newTimeSlots = timeSlots.filter(slot => slot !== slotToRemove);
    await setDoc(docRef, { slots: newTimeSlots });
    setTimeSlots(newTimeSlots);
  };

  return (
    <div>
      <h3>Manage Time Slots</h3>
      <div className="time-slots-manager">
        <Calendar onChange={setDate} value={date} />
        <div>
          <h4>Time Slots for {date.toDateString()}</h4>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              <ul>
                {timeSlots.map((slot, index) => (
                  <li key={index}>
                    {slot}
                    <button className="remove-button" onClick={() => handleRemoveTimeSlot(slot)}>Remove</button>
                  </li>
                ))}
              </ul>
              <div className="add-time-slot">
                <input
                  type="text"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  placeholder="e.g., 10:00 AM"
                />
                <button onClick={handleAddTimeSlot}>Add Time Slot</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageTimeSlots;
