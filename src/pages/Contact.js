import React, { useState } from 'react';
import { db } from '../Firebase'; // Assuming Firebase is initialized and db is exported from 'Firebase.js'
import { collection, addDoc } from "firebase/firestore";
import { useNotification } from '../components/Notification/NotificationContext';
import './StaticPage.css';

function Contact() {
  const { showNotification } = useNotification();
  const contactInfo = {
    phone: '(412) 974-8858',
    email: 'colebowersock@gmail.com',
    address: '45122 Oak Dr., Wellsville, OH, USA',
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "contacts"), {
        ...formData,
        timestamp: new Date(),
      });
      showNotification('Message sent successfully!', 'success');
      setFormData({ name: '', email: '', message: '' }); // Clear form
    } catch (error) {
      console.error("Error adding document: ", error);
      showNotification('Failed to send message. Please try again later.', 'error');
    }
  };

  return (
    <div className="static-page-container">
      <h1>Contact Us</h1>
      <p>Have questions? We'd love to hear from you. Reach out to us via phone, email, or the contact form below.</p>
      
      <div className="contact-details">
        <p><strong>Phone:</strong> {contactInfo.phone}</p>
        <p><strong>Email:</strong> {contactInfo.email}</p>
        <p><strong>Address:</strong> {contactInfo.address}</p>
      </div>

      <form className="contact-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input type="text" id="name" placeholder="Your Name" value={formData.name} onChange={handleChange} required autocomplete="name" />
        
        <label htmlFor="email">Email</label>
        <input type="email" id="email" placeholder="Your Email" value={formData.email} onChange={handleChange} required autocomplete="email" />
        
        <label htmlFor="message">Message</label>
        <textarea id="message" placeholder="Your Message" rows="5" value={formData.message} onChange={handleChange} required autocomplete="off"></textarea>
        
        <button type="submit" className="btn btn-primary">Send Message</button>
      </form>
    </div>
  );
}

export default Contact;