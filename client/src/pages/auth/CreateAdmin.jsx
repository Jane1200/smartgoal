import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api.js";
import { toast } from "react-toastify";

export default function CreateAdmin() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/create-admin", {
        name: values.name,
        email: values.email,
        password: values.password,
        adminKey: values.adminKey
      });
      
      toast.success("Admin user created successfully!");
      navigate("/login", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Admin creation failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-split">
      {/* Left visual panel */}
      <aside className="login-visual d-none d-lg-flex">
        <div className="login-visual-inner">
          <div className="brand-badge">
            <span className="dot" /> SmartGoal Admin Setup
          </div>
          <h2 className="headline">
            Create your <span>admin account</span>.
          </h2>
          <p className="muted">Set up the administrator account for SmartGoal system.</p>
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
            <h1 className="h4 mb-1">Create Admin Account</h1>
            <p className="small text-muted mb-0">
              This will create the first and only admin account for the system.
            </p>
          </div>

          <form className="d-grid gap-3" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="form-label fw-semibold small">Full Name</label>
              <input
                type="text"
                className={`form-control form-control-lg rounded-3 ${errors.name ? "is-invalid" : ""}`}
                placeholder="Enter admin full name"
                {...register("name", { required: "Name is required", minLength: 2 })}
              />
              {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
            </div>

            <div>
              <label className="form-label fw-semibold small">Email Address</label>
              <input
                type="email"
                className={`form-control form-control-lg rounded-3 ${errors.email ? "is-invalid" : ""}`}
                placeholder="admin@example.com"
                {...register("email", { 
                  required: "Email is required", 
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
              />
              {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
            </div>

            <div>
              <label className="form-label fw-semibold small">Password</label>
              <input
                type="password"
                className={`form-control form-control-lg rounded-3 ${errors.password ? "is-invalid" : ""}`}
                placeholder="Create a strong password"
                {...register("password", { 
                  required: "Password is required", 
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
              />
              {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
            </div>

            <div>
              <label className="form-label fw-semibold small">Admin Key</label>
              <input
                type="password"
                className={`form-control form-control-lg rounded-3 ${errors.adminKey ? "is-invalid" : ""}`}
                placeholder="Enter admin creation key"
                {...register("adminKey", { required: "Admin key is required" })}
              />
              <div className="small text-muted mt-1">
                Default key: admin123 (change this in environment variables)
              </div>
              {errors.adminKey && <div className="invalid-feedback">{errors.adminKey.message}</div>}
            </div>

            <button
              className="btn btn-dark btn-lg rounded-pill py-3"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating Admin..." : "Create Admin Account"}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              className="btn btn-link"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
