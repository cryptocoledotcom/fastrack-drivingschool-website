import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Contact from './pages/Contact';
import LoginForm from './pages/Auth/LoginForm';
import RegisterForm from './pages/Auth/RegisterForm';
import ForgotPassword from './pages/Auth/ForgotPassword';
import UserProfile from './pages/UserProfile';
import CalendarPage from './pages/Calendar';
import { AuthProvider } from './pages/Auth/AuthContext';
import CourseDetail from './pages/CourseDetail';
import { NotificationProvider } from './components/Notification/NotificationContext';
import './App.css';
import './components/Button/Button.css';
 
import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="App">
            <Navbar />
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:courseId" element={<CourseDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/user-profile" element={<UserProfile />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
