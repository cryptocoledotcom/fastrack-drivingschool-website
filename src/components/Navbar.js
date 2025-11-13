// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../pages/Auth/AuthContext';
import './Navbar.css';

import logo from '../assets/FastrackLogo5.png';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src={logo} alt="Fastrack Driving School" />
      </Link>
      <ul className="nav-menu">
        {user ? (
          // --- Logged-in User View ---
          <>
            <li className="nav-item">
              <Link to="/user-profile" className="nav-link">My Profile</Link>
            </li>
            <li className="nav-item">
              <button onClick={logout} className="nav-link logout-button">Logout</button>
            </li>
          </>
        ) : (
          // --- Visitor View ---
          <>
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/courses" className="nav-link">Courses</Link>
            </li>
            <li className="nav-item">
              <Link to="/about" className="nav-link">About Us</Link>
            </li>
            <li className="nav-item">
              <Link to="/contact" className="nav-link">Contact</Link>
            </li>
            <li className="nav-item">
              <Link to="/login" className="nav-link login-link">Login</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
