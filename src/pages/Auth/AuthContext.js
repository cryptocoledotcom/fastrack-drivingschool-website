import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../../Firebase"; // Import db
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver
} from "firebase/auth";
import { logSessionEvent } from '../../services/userProgressFirestoreService';
import { doc, getDoc } from "firebase/firestore"; // Import doc and getDoc
import { getUserRole } from "../../services/authService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaHint, setMfaHint] = useState(null);

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
      return { success: true, userCredential };
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error);
        setMfaResolver(resolver);
        setMfaHint(resolver.hints[0]);
        return { success: false, mfaRequired: true };
      } else {
        throw error;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logSessionEvent('logout');
    } catch (error) {
      console.error("Failed to log logout event, but proceeding with sign-out:", error);
    }
    await signOut(auth);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return { success: true, result };
    } catch (error) {
      if (error.code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, error);
        setMfaResolver(resolver);
        setMfaHint(resolver.hints[0]);
        return { success: false, mfaRequired: true };
      } else {
        throw error;
      }
    }
  }, []);

  const sendMfaVerification = useCallback(async (recaptchaVerifier) => {
    if (!mfaResolver) {
      throw new Error("MFA resolver not found.");
    }
    try {
      const phoneInfoOptions = {
        multiFactorHint: mfaHint,
        session: mfaResolver.session
      };
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
      return verificationId;
    } catch (error) {
      console.error("MFA verification send error in AuthContext:", error);
      console.error("Error code:", error.code);
      throw error;
    }
  }, [mfaResolver, mfaHint]);

  const completeMfaSignIn = useCallback(async (verificationCode, verificationId) => {
    if (!mfaResolver) {
      throw new Error("MFA resolver not found.");
    }
    try {
      const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
      
      // Manually set the user to update state immediately
      setUser(userCredential.user);
      
      setMfaResolver(null);
      setMfaHint(null);
    } catch (error) {
      console.error("MFA sign-in completion error:", error);
      throw error;
    }
  }, [mfaResolver]);

  const cancelMfaSignIn = useCallback(() => {
    setMfaResolver(null);
    setMfaHint(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      setUser, // <-- Add this
      role,
      loading,
      login,
      logout,
      signInWithGoogle,
      mfaResolver,
      mfaHint,
      sendMfaVerification,
      completeMfaSignIn,
      cancelMfaSignIn
    }}>
      {children}
    </AuthContext.Provider>
  );
};
