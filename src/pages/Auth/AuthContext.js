import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../../Firebase"; // Import db
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { getAdditionalUserInfo } from "firebase/auth";
import { logSessionEvent } from '../../services/userProgressFirestoreService';
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // To store Firestore user data
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async (uid) => {
    if (!uid) return;
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUserData(data);
      setRole(data.role); // Role can also be sourced from here
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await fetchUserData(currentUser.uid);
      } else {
        setUserData(null);
        setRole(null);
      }
      setUser(currentUser); // Set user after fetching data
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchUserData]); // Dependency: fetchUserData

  // Allows components to manually trigger a refresh of the user's auth state
  // and profile data. Useful after sensitive operations.
  const forceRefreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      await fetchUserData(currentUser.uid);
      setUser({ ...currentUser }); // Create a new object to force re-render
    }
  }, [fetchUserData]);

  const login = useCallback(async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().isLocked) {
        await signOut(auth);
        throw new Error('ACCOUNT_LOCKED');
      }

      await logSessionEvent('login');
      return userCredential;
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    const uid = user?.uid; // Capture UID before signing out.
    await signOut(auth);
  
    try {
      // Log the logout event after signing out, passing the UID.
      if (uid) await logSessionEvent('logout', uid);
    } catch (error) {
      console.error("Failed to log logout event, but proceeding with sign-out:", error);
    }
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(userCredential);

      // If it's a new user, create their document in Firestore
      if (additionalInfo?.isNewUser) {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: userCredential.user.email,
          role: "student", // Assign a default role
        });
      }

      return userCredential;
    } catch (error) {
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      fetchUserData,
      setUser,
      role,
      loading,
      login,
      logout,
      signInWithGoogle,
      forceRefreshUser, // Expose the new function
      auth // Export the auth instance
    }}>
      {children}
    </AuthContext.Provider>
  );
};
