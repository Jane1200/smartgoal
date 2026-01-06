import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function LoginOTP() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  
  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Step 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/login-otp", { email });
      
      if (data.ok) {
        toast.success("OTP has been sent to your email");
        setStep(2);
        setCountdown(600); // 10 minutes countdown
        
        // Start countdown timer
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Show preview URL in development
        if (data.previewUrl) {
          console.log("📧 Email preview:", data.previewUrl);
        }
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("Request OTP error:", err);
      toast.error(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { email, otp });
      
      if (data.token && data.user) {
        // Save auth data to localStorage (same pattern as login)
        const newUser = { token: data.token, profile: data.user };
        localStorage.setItem("sg_auth", JSON.stringify(newUser));
        
        // Update auth context by reloading the page or manually setting
        // For immediate effect, we'll reload which will trigger AuthContext to read from localStorage
        toast.success("Login successful!");
        window.location.href = "/dashboard-redirect";
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      const errorMsg = err.response?.data?.message || "Invalid OTP. Please try again.";
      toast.error(errorMsg);
      
      // If OTP expired or too many attempts, go back to step 1
      if (errorMsg.includes("expired") || errorMsg.includes("Too many")) {
        setStep(1);
        setOTP("");
        setCountdown(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOTP("");
    await handleRequestOTP({ preventDefault: () => {} });
  };

  // Format countdown time
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
            <span className="dot" /> SmartGoal OTP Login
          </div>
          <h2 className="headline">
            Secure login with <span>Email OTP</span>
          </h2>
          <p className="muted">No password required. Just verify your email.</p>
          <div className="illus">
            <img
              src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1400&auto=format&fit=crop"
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
            <h1 className="h4 mb-1">
              {step === 1 ? "Login with OTP" : "Verify Your Email"}
            </h1>
            <p className="small text-muted mb-0">
              {step === 1 
                ? "Enter your email to receive a one-time password" 
                : `We've sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form className="d-grid gap-3" onSubmit={handleRequestOTP}>
              <label className="form-label fw-semibold small">Email Address</label>
              <input
                type="email"
                className="form-control form-control-lg rounded-3"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              <button
                className="btn btn-primary btn-lg rounded-pill py-3"
                disabled={loading}
                type="submit"
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Sending OTP...
                  </span>
                ) : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP Input */}
          {step === 2 && (
            <form className="d-grid gap-3" onSubmit={handleVerifyOTP}>
              <label className="form-label fw-semibold small">Enter 6-Digit OTP</label>
              <input
                type="text"
                className="form-control form-control-lg rounded-3 text-center"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOTP(value);
                }}
                maxLength="6"
                style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
                required
                autoFocus
              />

              {countdown > 0 && (
                <div className="text-center small text-muted">
                  ⏱️ OTP expires in: <strong className="text-primary">{formatTime(countdown)}</strong>
                </div>
              )}

              <button
                className="btn btn-primary btn-lg rounded-pill py-3"
                disabled={loading || otp.length !== 6}
                type="submit"
              >
                {loading ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Verifying...
                  </span>
                ) : "Verify & Login"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none"
                  onClick={handleResendOTP}
                  disabled={loading || countdown > 540} // Allow resend after 1 minute
                >
                  {countdown > 540 ? `Resend in ${Math.ceil((countdown - 540) / 60)}m` : "Resend OTP"}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill"
                onClick={() => {
                  setStep(1);
                  setOTP("");
                  setCountdown(0);
                }}
              >
                ← Change Email
              </button>
            </form>
          )}

          <div className="text-center my-3 text-muted">or</div>

          {/* Alternative Login Options */}
          <div className="d-grid gap-3">
            <div className="d-flex justify-content-center gap-3 small">
              <Link to="/login" className="link">
                Login with Password
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
    </div>
  );
}
