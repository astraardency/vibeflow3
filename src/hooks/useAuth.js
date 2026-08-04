import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { ENV } from '../config/env';
import { generateSecureToken } from '../utils/cryptoUtils';

export const useAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('email') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [tvSessionId, setTvSessionId] = useState('');
  
  const detectNative = () =>
    Capacitor.isNativePlatform()
    || window?.Capacitor?.isNative === true
    || (typeof window?.Capacitor?.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web');
    
  const [isCapacitor, setIsCapacitor] = useState(detectNative);

  useEffect(() => { setIsCapacitor(detectNative()); }, []);

  // TV QR Login Effect
  useEffect(() => {
    if (!isLoggedIn && !isCapacitor && !tvSessionId) {
      setTvSessionId(generateSecureToken(20));
    }
  }, [isLoggedIn, isCapacitor, tvSessionId]);

  useEffect(() => {
    if (tvSessionId && !isLoggedIn && !isCapacitor) {
      const unsubscribe = onSnapshot(doc(db, "tv_logins", tvSessionId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.uid) {
            localStorage.setItem('tv_uid', data.uid);
            localStorage.setItem('username', data.username || '');
            localStorage.setItem('email', data.email || '');
            setUsername(data.username || '');
            setEmail(data.email || '');
            setIsLoggedIn(true);
            deleteDoc(docSnap.ref).catch(console.error);
            window.location.reload();
          }
        }
      });
      return () => unsubscribe();
    }
  }, [tvSessionId, isLoggedIn, isCapacitor]);

  useEffect(() => {
    if (isCapacitor) {
      GoogleAuth.initialize({
        clientId: ENV.GOOGLE_CLIENT_ID_ENC ? atob(ENV.GOOGLE_CLIENT_ID_ENC) : '',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      const tvUid = localStorage.getItem('tv_uid');
      const user = tvUid ? { uid: tvUid, isAnonymous: false, displayName: localStorage.getItem('username'), email: localStorage.getItem('email') } : authUser;

      if (user && !user.isAnonymous) {
        setIsLoggedIn(true);
        setUsername(user.displayName || (user.email ? user.email.split('@')[0] : 'User'));
        setEmail(user.email || '');
      } else {
        setIsLoggedIn(false);
        setUsername('');
        setEmail('');
      }
    });
    return () => unsubscribe();
  }, [isCapacitor]);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn);
    localStorage.setItem('username', username);
    localStorage.setItem('email', email);
  }, [isLoggedIn, username, email]);

  const loginWithEmail = async (emailInput, passwordInput) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setIsLoggedIn(true);
      setUsername(userCredential.user.displayName || emailInput.split('@')[0]);
      setEmail(userCredential.user.email);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (usernameInput, emailInput, passwordInput) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      await updateProfile(userCredential.user, { displayName: usernameInput });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        id: userCredential.user.uid,
        username: usernameInput,
        email: emailInput,
        preferences: { highQualityAudio: true, dataSaver: false, offlineMode: true },
        joinDate: new Date().toISOString()
      });

      setIsLoggedIn(true);
      setUsername(usernameInput);
      setEmail(emailInput);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setAuthError('');
    try {
      if (isCapacitor) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        await saveGoogleUser(result.user);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await saveGoogleUser(result.user);
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setAuthError("Failed to sign in with Google: " + (error.message || "Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const saveGoogleUser = async (user) => {
    await setDoc(doc(db, "users", user.uid), {
      id: user.uid,
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      preferences: { highQualityAudio: true, dataSaver: false, offlineMode: true },
      joinDate: new Date().toISOString()
    }, { merge: true });

    setIsLoggedIn(true);
    setUsername(user.displayName || user.email.split('@')[0]);
    setEmail(user.email);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('tv_uid');
      localStorage.removeItem('listening_activity');
      localStorage.removeItem('plays_count');
      localStorage.removeItem('artist_plays');
      localStorage.removeItem('savedPlaylistIds');
      localStorage.removeItem('daily_plays');
      setIsLoggedIn(false);
      setUsername('');
      setEmail('');
      window.location.reload();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleAuthError = (error) => {
    console.error("Auth Error:", error);
    let message = error.message;
    if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
    if (error.code === 'auth/email-already-in-use') message = "This email is already registered.";
    if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
    setAuthError(message);
  };

  return {
    isLoggedIn,
    username,
    email,
    isLoading,
    authError,
    tvSessionId,
    isCapacitor,
    loginWithEmail,
    registerWithEmail,
    handleGoogleAuth,
    handleLogout
  };
};
