// src/pages/auth/ResetPassword.jsx
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function ResetPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("request"); // 'request' | 'reset'
  const [tokenOk, setTokenOk] = useState(false);
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { email: "", password: "" } });

  // Detect backend token in URL for reset mode
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setMode("reset");
      api
        .get(`/auth/reset-password/verify`, { params: { token } })
        .then((res) => setTokenOk(res.data?.ok === true))
        .catch(() => setTokenOk(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request reset email via backend
  const onSubmit = async (values) => {
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: values.email });
      setIsSubmitted(true);
      reset();
      toast.success("Reset link sent. Check your email (and spam).");
    } catch (err) {
      console.error("forgot-password error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to send reset link";
      setError(msg);
      toast.error(msg);
    }
  };

  // Finalize password reset using the token
  const onReset = async (values) => {
    setError("");
    try {
      const token = searchParams.get("token");
      if (!token) throw new Error("Missing reset token in URL.");

      // Use our backend API for password reset
      const response = await api.post("/auth/reset-password", {
        token,
        password: values.password
      });

      if (response.status === 200) {
        toast.success("Password reset successful. Logging you in...");
        
        // Auto-login after successful reset
        try {
          const loginResponse = await api.post("/auth/login", {
            email: response.data.email,
            password: values.password
          });
          
          if (loginResponse.data.token) {
            // Store the auth token and redirect to dashboard
            localStorage.setItem("sg_auth", JSON.stringify({
              token: loginResponse.data.token,
              profile: loginResponse.data.user
            }));
            
            // Redirect to dashboard based on role
            const role = loginResponse.data.user.role;
            if (role === "admin") {
              window.location.href = "/admin-dashboard";
            } else if (role === "buyer") {
              window.location.href = "/buyer-dashboard";
            } else {
              window.location.href = "/dashboard";
            }
            return;
          }
        } catch (loginErr) {
          console.warn("Auto-login failed, redirecting to login page:", loginErr);
        }
        
        // Fallback: redirect to login page
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch (err) {
      console.error("reset password error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to reset password";
      setError(msg);
      toast.error(msg);
    }
  };

  if (isSubmitted) {
    return (
      <div className="login-form">
        <div className="form-wrap">
          <div className="top-links">
            <Link to="/login" className="btn btn-dark rounded-pill px-4">
              Back to Login
            </Link>
          </div>

          <div className="welcome mb-4 text-center">
            <div className="success-icon mb-3">{/* SVG */}</div>
            <h1 className="h4 mb-1">{mode === "request" ? "Reset Link Sent!" : "Password Reset!"}</h1>
            <p className="small text-muted mb-0">
              {mode === "request"
                ? "We've sent a password reset link to your email address. Please check your inbox (and spam)."
                : "Your password has been updated. You can now log in with the new password."}
            </p>
          </div>

          <div className="d-grid gap-3">
            <div className="text-center">
              <p className="small text-muted mb-2">Didn't receive the email?</p>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsSubmitted(false)}>
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="login-form">
        <div className="form-wrap">
          <div className="top-links">
            <Link to="/login" className="btn btn-dark rounded-pill px-4">
              Back to Login
            </Link>
          </div>

          <div className="welcome mb-4">
            <h1 className="h4 mb-1">Set New Password</h1>
            <p className="small text-muted mb-0">Enter a new password for your account.</p>
          </div>

          {!tokenOk ? (
            <div className="alert alert-danger">Invalid or expired link. Please request a new reset link.</div>
          ) : (
            <form className="d-grid gap-3" onSubmit={handleSubmit(onReset)}>
              <label className="form-label fw-semibold small">New password</label>
              <input
                type="password"
                className="form-control form-control-lg rounded-3"
                placeholder="At least 6 characters"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Minimum 6 characters" },
                })}
              />

              {error && <p className="text-danger small">{error}</p>}

              <button className="btn btn-dark btn-lg rounded-pill py-3" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
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

        <div className="welcome mb-4">
          <h1 className="h4 mb-1">Reset Password</h1>
          <p className="small text-muted mb-0">Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <form className="d-grid gap-3" onSubmit={handleSubmit(onSubmit)}>
          <label className="form-label fw-semibold small">Enter your email</label>
          <input
            type="email"
            className="form-control form-control-lg rounded-3"
            placeholder="you@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
            })}
          />

          {error && <p className="text-danger small">{error}</p>}

          <button className="btn btn-dark btn-lg rounded-pill py-3" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
