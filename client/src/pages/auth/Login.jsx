import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { toast } from "react-toastify";
import { auth } from "@/lib/firebase"; // firebase client auth (if available)

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  // Helper: check verification using Firebase auth state
  const checkAndRedirectAfterLogin = async (loginResult) => {
    try {
      // For Firebase users (Google sign-in), check email verification
      if (auth?.currentUser) {
        await auth.currentUser.reload();
        if (!auth.currentUser.emailVerified) {
          toast.info("Please verify your email before continuing.");
          navigate("/verify-email", { replace: true });
          return;
        }
        navigate("/dashboard-redirect", { replace: true });
        return;
      }

      // For backend users, skip verification check since we auto-verify after password reset
      // Just redirect to dashboard
      navigate("/dashboard-redirect", { replace: true });
    } catch (err) {
      console.error("post-login verification check error", err);
      toast.error("Login succeeded but verification check failed. Try refreshing.");
      navigate("/dashboard-redirect", { replace: true });
    }
  };

  const onSubmit = async (values) => {
    try {
      const res = await login(values.email, values.password);
      if (!res || res.ok === false) {
        // login returns { ok: false, error } on failure
        const msg = res?.error || "Login failed. Check credentials and try again.";
        // note: AuthContext already toasts errors, but safe to show here too
        toast.error(msg);
        return;
      }
      await checkAndRedirectAfterLogin(res);
    } catch (err) {
      console.error("login error", err);
      toast.error(err?.message || "Login failed. Check credentials and try again.");
    }
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
