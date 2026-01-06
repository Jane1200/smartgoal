import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { auth } from "@/lib/firebase"; // firebase client auth (if available)
import api from "@/utils/api.js";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpEmail, setOTPEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [otpLoading, setOTPLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  // Helper: temporarily skip email verification checks
  const checkAndRedirectAfterLogin = async (loginResult) => {
    try {
      // Always redirect to dashboard regardless of verification status
      navigate("/dashboard-redirect", { replace: true });
    } catch (err) {
      console.error("post-login verification check error", err);
      // Keep UX simple during bypass window
      navigate("/dashboard-redirect", { replace: true });
    }
  };

  const onSubmit = async (values) => {
    try {
      const res = await login(values.email, values.password);
      if (!res || res.ok === false) {
        // Check if OTP is required
        if (res?.requiresOTP) {
          setOTPEmail(values.email);
          setShowOTPModal(true);
          setCountdown(600); // 10 minutes
          
          // Start countdown
          const interval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          toast.success("OTP sent to your email");
          if (res.previewUrl) {
            console.log("📧 Email preview:", res.previewUrl);
          }
          return;
        }
        
        const msg = res?.error || "Login failed. Check credentials and try again.";
        toast.error(msg);
        return;
      }
      await checkAndRedirectAfterLogin(res);
    } catch (err) {
      console.error("login error", err);
      toast.error(err?.message || "Login failed. Check credentials and try again.");
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setOTPLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email: otpEmail, otp });
      
      if (data.token && data.user) {
        localStorage.setItem("sg_auth", JSON.stringify({ token: data.token, profile: data.user }));
        toast.success("Login successful!");
        window.location.href = "/dashboard-redirect";
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      const errorMsg = err.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(errorMsg);
      
      if (errorMsg.includes("expired") || errorMsg.includes("Too many")) {
        setShowOTPModal(false);
        setOTP("");
        setCountdown(0);
      }
    } finally {
      setOTPLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-split">
      {/* Left visual panel */}
      <aside className="login-visual d-none d-lg-flex">
        <div className="login-visual-inner">
          <div className="brand-badge">
            <span className="dot" /> SmartGoal Account
          </div>
          <h2 className="headline">
            Access all features with <span>one account</span>.
          </h2>
          <p className="muted">Secure. Simple. Designed for savers and resellers.</p>
          <div className="illus">
            {/* replace with your own SVG/PNG if you like */}
            <img
              src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1400&auto=format&fit=crop"
              alt=""
            />
            <div className="glow" />
          </div>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="login-form">
        <div className="form-wrap">
          <div className="welcome mb-4">
            <h1 className="h4 mb-1">Welcome Back</h1>
            <p className="small text-muted mb-0">
              Sign in to access your account and continue your journey.
            </p>
          </div>

          {/* Email / Password Form */}
          <form className="d-grid gap-3" onSubmit={handleSubmit(onSubmit)}>
            <label className="form-label fw-semibold small">Enter your email</label>
            <input
              type="email"
              className="form-control form-control-lg rounded-3"
              placeholder="you@example.com"
              {...register("email", { required: true })}
            />

            <label className="form-label fw-semibold small">Password</label>
            <input
              type="password"
              className="form-control form-control-lg rounded-3"
              placeholder="••••••••"
              {...register("password", { required: true, minLength: 6 })}
            />

            <button
              className="btn btn-dark btn-lg rounded-pill py-3"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in…" : "Continue"}
            </button>
          </form>

          <div className="text-center my-3 text-muted">or</div>

          {/* Google Sign In */}
          <div className="d-grid gap-3">
            <button
              type="button"
              className="btn btn-light btn-lg rounded-pill py-3 google-btn"
              onClick={async () => {
                try {
                  const res = await loginWithGoogle();
                  if (!res || res.ok === false) {
                    const msg = res?.error || "Google sign-in failed.";
                    toast.error(msg);
                    return;
                  }
                  await checkAndRedirectAfterLogin(res);
                } catch (err) {
                  console.error("google login error", err);
                  toast.error(err?.message || "Google sign-in failed.");
                }
              }}
            >
              <span className="g-logo" aria-hidden="true"></span>
              Sign in with Google
            </button>

            <div className="d-flex justify-content-center gap-3 small mt-2">
              <Link to="/login-otp" className="link">
                Login with OTP
              </Link>
              <span className="text-muted">•</span>
              <Link to="/reset" className="link">
                Reset Password
              </Link>
            </div>

            <div className="text-center small">
              Don't have an account? <Link to="/register" className="link">Sign up</Link>
            </div>
          </div>
        </div>
      </main>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowOTPModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title">Verify OTP</h5>
                <button type="button" className="btn-close" onClick={() => setShowOTPModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">Enter the 6-digit code sent to <strong>{otpEmail}</strong></p>
                
                <input
                  type="text"
                  className="form-control form-control-lg text-center mb-3"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOTP(value);
                  }}
                  maxLength="6"
                  style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
                  autoFocus
                />

                {countdown > 0 && (
                  <div className="text-center small text-muted mb-3">
                    ⏱️ OTP expires in: <strong className="text-primary">{formatTime(countdown)}</strong>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-lg w-100 rounded-pill"
                  onClick={handleVerifyOTP}
                  disabled={otpLoading || otp.length !== 6}
                >
                  {otpLoading ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Verifying...
                    </span>
                  ) : "Verify & Login"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
