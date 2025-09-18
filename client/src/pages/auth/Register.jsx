import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { toast } from "react-toastify";

const schema = yup.object({
  name: yup.string()
    .typeError("Name must be a string")
    .required("Full name is required")
    .test("no-leading-trailing-spaces", "Name cannot start or end with spaces",
      value => (value ?? "") === (value ?? "").replace(/^\s+|\s+$/g, ""))
    .test("single-spaces-between", "Use single spaces between names",
      value => !/(\s{2,})/.test(value ?? ""))
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .matches(/^[A-Za-z]+(?: [A-Za-z]+)+$/, "Enter full name (use letters only)"),
  
  email: yup.string()
    .typeError("Email must be a string")
    .required("Email is required")
    .trim()
    .email("Please enter a valid email address")
    .matches(/^[^\s]+$/, "Email cannot contain spaces")
    .test("no-leading-trailing-spaces", "Email cannot start or end with spaces", 
      value => value && value.trim() === value)
    .test("valid-email-format", "Please enter a valid email format (e.g., user@domain.com)", 
      value => value && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
    .max(254, "Email is too long (maximum 254 characters)"),
  
  password: yup.string()
    .typeError("Password must be a string")
    .required("Password is required")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long (maximum 128 characters)")
    .matches(/^(?=.*[a-z])/, "Password must contain at least one lowercase letter")
    .matches(/^(?=.*[A-Z])/, "Password must contain at least one uppercase letter")
    .matches(/^(?=.*\d)/, "Password must contain at least one number")
    .matches(/^(?=.*[@$!%*?&])/, "Password must contain at least one special character (@$!%*?&)")
    .matches(/^[^\s]+$/, "Password cannot contain spaces")
    .test("no-leading-trailing-spaces", "Password cannot start or end with spaces", 
      value => value && value.trim() === value)
    .test("no-common-patterns", "Password cannot contain common patterns (123, abc, qwerty)", 
      value => value && !/(123|abc|qwerty|password|admin)/i.test(value)),
  
  confirmPassword: yup.string()
    .typeError("Confirm password must be a string")
    .required("Please confirm your password")
    .trim()
    .oneOf([yup.ref('password'), null], "Passwords must match")
    .test("no-leading-trailing-spaces", "Confirm password cannot start or end with spaces", 
      value => value && value.trim() === value),
  
  role: yup.string()
    .required("Please select your role")
    .oneOf(["goal_setter", "buyer"], "Please select a valid role"),
});

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, loginWithGoogle } = useAuth();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange"
  });

  const password = watch("password");
  const passwordStrength = (() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    if (password.length >= 12) score++;
    if (score <= 2) return { score, label: "Weak", color: "danger" };
    if (score <= 4) return { score, label: "Fair", color: "warning" };
    if (score <= 5) return { score, label: "Good", color: "info" };
    return { score, label: "Strong", color: "success" };
  })();

  const nameValue = watch("name");
  const emailValue = watch("email");
  const confirmPasswordValue = watch("confirmPassword");

  const onSubmit = async (values) => {
    try {
      const trimmedValues = {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        role: values.role
      };

      if (trimmedValues.name.length < 2) {
        toast.error("Name is too short");
        return;
      }

      if (trimmedValues.password !== trimmedValues.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      if (!trimmedValues.role) {
        toast.error("Please select your role");
        return;
      }

      const res = await registerUser(trimmedValues.name, trimmedValues.email, trimmedValues.password, trimmedValues.role);

      if (!res || res.ok === false) {
        const err = res?.error || "Registration failed";
        toast.error(err);
        return;
      }

      // Successful registration
      toast.success("Account created successfully");

      // If backend reports user is not verified, send them to VerifyEmail page
      const isVerified = res.user?.isVerified ?? true; // default to true if server doesn't provide
      if (isVerified === false) {
        navigate("/verify-email", { replace: true });
        return;
      }

      // Otherwise, redirect to role-based dashboard
      navigate("/dashboard-redirect", { replace: true });
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error?.message || "Registration failed");
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
            Join thousands of <span>goal achievers</span>.
          </h2>
          <p className="muted">Start your journey towards success with SmartGoal.</p>
          <div className="illus">
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
            <h1 className="h4 mb-1">Create Your Account</h1>
            <p className="small text-muted mb-0">
              Join SmartGoal and start achieving your dreams today.
            </p>
          </div>

          {/* Validation Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="alert alert-danger" role="alert">
              <h6 className="alert-heading mb-2">Please fix the following errors:</h6>
              <ul className="mb-0 small">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>
                    <strong>{field === 'name' ? 'Full Name' : 
                           field === 'email' ? 'Email' : 
                           field === 'password' ? 'Password' : 
                           'Confirm Password'}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Registration Form */}
          <form className="d-grid gap-3" onSubmit={handleSubmit(onSubmit)}>
            {/* User Type Selection */}
            <div>
              <label className="form-label fw-semibold small">Account Type</label>
              <div className="d-flex gap-4">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="goalSetter"
                    value="goal_setter"
                    {...register("role")}
                  />
                  <label className="form-check-label d-flex align-items-center gap-2" htmlFor="goalSetter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    <span className="fw-medium">Goal Setter</span>
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    id="buyer"
                    value="buyer"
                    {...register("role")}
                  />
                  <label className="form-check-label d-flex align-items-center gap-2" htmlFor="buyer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                      <path d="M16 11V7a4 4 0 0 0-8 0v4"/>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <circle cx="12" cy="16" r="1"/>
                    </svg>
                    <span className="fw-medium">Buyer</span>
                  </label>
                </div>
              </div>
              <div className={`small mt-1 ${errors.role ? "text-danger" : watch("role") ? "text-success" : "text-muted"}`}>
                {errors.role?.message || (watch("role") ? "Account type selected!" : "Choose your primary use case")}
              </div>
            </div>

            <div>
              <label className="form-label fw-semibold small">Full Name</label>
              <input 
                className={`form-control rounded-3 ${errors.name ? "is-invalid" : ""}`} 
                placeholder="Enter your full name" 
                {...register("name")} 
              />
              <div className={`small mt-1 ${errors.name ? "text-danger" : nameValue ? "text-success" : "text-muted"}`}>
                {errors.name?.message || (nameValue ? "Looks good!" : "Enter first and last name")}
              </div>
            </div>
            
            <div>
              <label className="form-label fw-semibold small">Email Address</label>
              <input 
                type="email"
                className={`form-control rounded-3 ${errors.email ? "is-invalid" : ""}`} 
                placeholder="you@example.com" 
                {...register("email")} 
              />
              <div className={`small mt-1 ${errors.email ? "text-danger" : emailValue ? "text-success" : "text-muted"}`}>
                {errors.email?.message || (emailValue ? "Looks good!" : "We'll never share your email")}
              </div>
            </div>
            
            <div>
              <label className="form-label fw-semibold small">Password</label>
              <input 
                type="password" 
                className={`form-control rounded-3 ${errors.password ? "is-invalid" : ""}`} 
                placeholder="Create a strong password" 
                {...register("password")} 
              />
              <div className={`small mt-1 ${errors.password ? "text-danger" : password ? "text-success" : "text-muted"}`}>
                {errors.password?.message || (password ? "Looks good" : "Use 8+ chars with a mix of types")}
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <small className="text-muted">Password strength:</small>
                    <span className={`badge bg-${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="progress" style={{ height: "4px" }}>
                    <div 
                      className={`progress-bar bg-${passwordStrength.color}`} 
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
            </div>

            <div>
              <label className="form-label fw-semibold small">Confirm Password</label>
              <input 
                type="password" 
                className={`form-control rounded-3 ${errors.confirmPassword ? "is-invalid" : ""}`} 
                placeholder="Confirm your password" 
                {...register("confirmPassword")} 
              />
              <div className={`small mt-1 ${errors.confirmPassword ? "text-danger" : confirmPasswordValue ? "text-success" : "text-muted"}`}>
                {errors.confirmPassword?.message || (confirmPasswordValue ? "Looks good!" : "Re-enter your password")}
              </div>
            </div>

            
            <button 
              className="btn btn-dark btn-lg rounded-pill py-3" 
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>


          <div className="text-center my-3 text-muted">or</div>

          {/* Google Sign Up */}
          <div className="d-grid gap-3">
            <button 
              type="button" 
              onClick={async () => {
                const res = await loginWithGoogle();
                if (!res || res.ok === false) {
                  toast.error(res?.error || "Google sign-in failed");
                  return;
                }
                // After Google signup, redirect to role-based dashboard
                navigate("/dashboard-redirect", { replace: true });
              }} 
              className="btn btn-light btn-lg rounded-pill py-3 google-btn d-flex align-items-center justify-content-center gap-2"
            >
              <span className="g-logo" aria-hidden="true"></span>
              Continue with Google
            </button>

            <div className="text-center small">
              Already have an account? <Link to="/login" className="link">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
