import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/context/AuthContext.jsx";
import api from "@/utils/api.js";

export default function VerifyEmail() {
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authContext = useAuth();
  const backendUser = authContext?.user;

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if email is verified
        if (user.emailVerified) {
          setIsVerified(true);
          toast.success("Email verified successfully!");
          setTimeout(() => {
            navigate("/dashboard-redirect", { replace: true });
          }, 2000);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Check if verification was successful via URL params
  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "1") {
      setIsVerified(true);
      toast.success("Email verified successfully!");
      setTimeout(() => {
        navigate("/dashboard-redirect", { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    // Try Firebase verification first (for Google users)
    if (currentUser) {
      setIsResending(true);
      try {
        await sendEmailVerification(currentUser);
        toast.success("Verification email sent! Check your inbox and spam folder.");
      } catch (error) {
        console.error("Resend verification error:", error);
        toast.error("Failed to resend verification email. Please try again.");
      } finally {
        setIsResending(false);
      }
      return;
    }

    // For backend users, use the resend endpoint
    if (backendUser?.profile?.email) {
      setIsResending(true);
      try {
        const { data } = await api.post("/auth/verify/resend", { 
          email: backendUser.profile.email 
        });
        if (data?.alreadyVerified) {
          toast.success("Your account is already verified. Redirecting...");
          navigate("/dashboard-redirect", { replace: true });
          return;
        }
        toast.success("If the email exists, a verification link has been sent.");
      } catch (e) {
        console.error("resend via email error", e);
        toast.error("Failed to request verification email. Try again later.");
      } finally {
        setIsResending(false);
      }
      return;
    }

    toast.error("No user found. Please sign in again.");
  };

  const handleSignOut = async () => {
    try {
      // Sign out from both Firebase and backend
      if (currentUser) {
        await auth.signOut();
      }
      if (authContext?.logout) {
        authContext.logout();
      }
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  // Determine which user to show
  const displayUser = currentUser || backendUser?.profile;
  const userEmail = displayUser?.email;

  if (isVerified) {
    return (
      <div className="login-form">
        <div className="form-wrap">
          <div className="welcome mb-4 text-center">
            <div className="success-icon mb-3">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <h1 className="h4 mb-1 text-success">Email Verified!</h1>
            <p className="small text-muted mb-0">
              Your email has been successfully verified. Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-form">
      <div className="form-wrap">
        <div className="top-links">
          <Link to="/login" className="btn btn-dark rounded-pill px-4">
            Back to Login
          </Link>
        </div>

        <div className="welcome mb-4 text-center">
          <div className="verification-icon mb-3">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 className="h4 mb-1">Verify Your Email</h1>
          <p className="small text-muted mb-0">
            We've sent a verification link to <strong>{userEmail || "your email"}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>
        </div>

        <div className="d-grid gap-3">
          <button
            className="btn btn-primary btn-lg rounded-pill py-3"
            onClick={handleResendVerification}
            disabled={isResending || (!currentUser && !backendUser)}
          >
            {isResending ? "Sending..." : "Resend Verification Email"}
          </button>

          <div className="text-center">
            <p className="small text-muted mb-2">
              Didn't receive the email? Check your spam folder or try signing in with a different account.
            </p>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleSignOut}
            >
              Sign Out & Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}