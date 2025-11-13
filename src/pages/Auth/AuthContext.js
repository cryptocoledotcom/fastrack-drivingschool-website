import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../../Firebase"; // Import db
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { logSessionEvent } from '../../services/userProgressFirestoreService';
import { doc, getDoc, setDoc } from "firebase/firestore"; // Import doc, getDoc, and setDoc
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

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the user is new. If so, create a document for them in Firestore.
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User is new, create their profile document
        await setDoc(userDocRef, {
          email: user.email,
          role: "student", // Default role for new sign-ups
        });
      }
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      throw error; // Re-throw the error so the UI can catch it
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      login,
      logout,
      signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};
