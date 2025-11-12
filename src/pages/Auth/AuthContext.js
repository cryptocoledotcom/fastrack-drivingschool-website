import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../../Firebase"; // Import db
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { logSessionEvent } from '../../services/userProgressFirestoreService';
import { doc, getDoc } from "firebase/firestore"; // Import doc and getDoc
import { getUserRole } from "../../services/authService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const fetchedRole = await getUserRole(currentUser.uid);
        setRole(fetchedRole);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().isLocked) {
      // If the user document exists and isLocked is true,
      // immediately sign the user out and throw a specific error.
      await signOut(auth);
      throw new Error('ACCOUNT_LOCKED');
    }

    // If not locked, log the successful login event for our audit trail.
    await logSessionEvent('login');

    // If not locked, return the user credential as normal.
    return userCredential;
  };

  const logout = async () => {
    // First, log the logout event to our secure backend function.
    // We use await to ensure this completes before signing out, but we don't
    // block the sign-out if the logging fails (the service function handles the error).
    await logSessionEvent('logout');

    // Then, sign the user out from Firebase Authentication.
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
