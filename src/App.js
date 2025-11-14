import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import About from './pages/About';
import Contact from './pages/Contact';
import LoginForm from './pages/Auth/LoginForm';
import SignUp from './pages/Auth/SignUp';
import ForgotPassword from './pages/Auth/ForgotPassword';
import UserProfile from './pages/UserProfile';
import ScheduleLesson from './pages/ScheduleLesson';
import CourseDetails from './pages/CourseDetails';
import CoursePlayer from './pages/CoursePlayer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './pages/Auth/AuthContext';
import { NotificationProvider } from './components/Notification/NotificationContext';
import MfaChallengeModal from './components/modals/MfaChallengeModal';
import './App.css';
import './components/Button/Button.css';
 
import Admin from './pages/Admin';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <NotificationProvider>
          <MfaChallengeModal />
          <div className="App">
            {/* Global, hidden containers for reCAPTCHA to prevent unmounting issues */}
            <div id="recaptcha-container" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}></div>
            <div id="recaptcha-container-mfa" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}></div>
            
            <Navbar />
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:courseId" element={<CourseDetails />} />
                <Route path="/course-player/:courseId" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<LoginForm />} />
                <Route path="/sign-up" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/user-profile" element={<UserProfile />} />
                <Route path="/schedule-lesson" element={<ScheduleLesson />} />
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
