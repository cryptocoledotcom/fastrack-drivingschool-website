import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../Firebase';
import { setSecurityQuestions as saveSecurityQuestionsToFirestore } from '../services/userProgressFirestoreService';

/**
 * A custom hook to fetch and manage a user's profile and security questions.
 * @param {object} user - The authenticated user object from useAuth.
 * @returns {object} An object containing profile data, security questions, loading state, error, and a refetch function.
 */
export const useUserProfileData = (user) => {
  const [profile, setProfile] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfileData = useCallback(async () => {
    if (!user?.uid) {
      setProfile(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Fetch both documents in parallel for better performance
      const [profileSnap, securitySnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDoc(doc(db, `users/${user.uid}/securityProfile`, 'questions'))
      ]);

      // Process profile data
      setProfile(profileSnap.exists() ? profileSnap.data() : null);

      // Process security questions data
      if (securitySnap.exists()) {
        const questionsData = securitySnap.data().questions;
        if (Array.isArray(questionsData)) {
          setSecurityQuestions(questionsData);
        } else {
          console.error("Firestore 'questions' field is not an array for user:", user.uid, questionsData);
          setSecurityQuestions([]); // Fallback to empty array if data is malformed
        }
      } else {
        setSecurityQuestions([]); // No saved questions
      }
    } catch (err) {
      console.error("Error fetching user profile data:", err);
      setError("Failed to load profile data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  /**
   * Updates the user's profile document in Firestore and then updates the local state.
   * @param {object} newProfileData - The new profile data to save.
   */
  const updateUserProfile = useCallback(async (newProfileData) => {
    if (!user?.uid) throw new Error("User is not authenticated.");

    const profileRef = doc(db, "users", user.uid);
    await setDoc(profileRef, newProfileData, { merge: true });

    // Update local state to match the database without a full refetch
    setProfile(prevProfile => ({ ...prevProfile, ...newProfileData }));
  }, [user]);

  /**
   * Saves the user's security questions and then updates the local state.
   * @param {Array<object>} questions - An array of { question, answer } objects.
   */
  const updateUserSecurityQuestions = useCallback(async (questions) => {
    if (!user?.uid) throw new Error("User is not authenticated.");

    // The service function handles hashing
    await saveSecurityQuestionsToFirestore(user.uid, questions);

    // To get the new hashes, we must refetch this part
    const securityDoc = await getDoc(doc(db, `users/${user.uid}/securityProfile`, 'questions'));
    if (securityDoc.exists() && Array.isArray(securityDoc.data().questions)) {
      setSecurityQuestions(securityDoc.data().questions);
    }
  }, [user]);

  // Return state and well-defined action functions
  return {
    profile,
    securityQuestions,
    loading,
    error,
    fetchProfileData,
    actions: {
      updateUserProfile,
      updateUserSecurityQuestions,
    },
  };
};