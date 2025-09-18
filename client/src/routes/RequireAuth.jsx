// src/routes/RequireAuth.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase";



export default function RequireAuth({ children }) {
  const authContext = useAuth();
  const user = authContext?.user;
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    // If we have backend auth, skip Firebase gating
    if (user?.token) {
      setVerified(true);
      setChecking(false);
      return;
    }

    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        await firebaseUser.reload();
        if (firebaseUser.emailVerified) {
          setVerified(true);
        } else {
          setVerified(false);
        }
      } else {
        setVerified(false);
      }
      setChecking(false);
    });

    return () => unsub();
  }, [user?.token]);

  if (checking) {
    return <p>Loading...</p>; // or a spinner
  }

  // No token in context → not logged in
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but email not verified
  if (verified === false) {
    return <Navigate to="/verify-email" replace />;
  }

  // Logged in + verified
  return children;
}
