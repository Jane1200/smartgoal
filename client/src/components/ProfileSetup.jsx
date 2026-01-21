import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { Person, Work, Cake } from "@mui/icons-material";

export default function ProfileSetup({ user, onComplete }) {
  const [age, setAge] = useState(user?.age || "");
  const [occupation, setOccupation] = useState(user?.occupation || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!age || !occupation) {
      toast.error("Please fill in all fields");
      return;
    }

    if (age < 18 || age > 45) {
      toast.error("Age must be between 18 and 45");
      return;
    }

    try {
      setSaving(true);
      await api.put("/profile", {
        age: parseInt(age),
        occupation
      });

      toast.success("Profile updated successfully!");
      
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const occupationOptions = [
    { value: 'student', label: '🎓 Student', description: 'Currently studying' },
    { value: 'working_professional', label: '💼 Working Professional', description: 'Full-time employee' },
    { value: 'freelancer', label: '💻 Freelancer', description: 'Self-employed/Contract work' },
    { value: 'entrepreneur', label: '🚀 Entrepreneur', description: 'Business owner' },
    { value: 'other', label: '👤 Other', description: 'Other occupation' }
  ];

  return (
    <div className="card shadow-sm">
      <div className="card-body p-4">
        <div className="text-center mb-4">
          <Person style={{ fontSize: '48px', color: '#667eea' }} />
          <h5 className="mt-3 mb-2">Complete Your Profile</h5>
          <p className="text-muted small">
            Help us personalize your financial recommendations based on your age and occupation
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Age Input */}
          <div className="mb-4">
            <label className="form-label fw-semibold">
              <Cake fontSize="small" className="me-2" />
              Your Age
            </label>
            <input
              type="number"
              className="form-control form-control-lg"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min="18"
              max="45"
              placeholder="Enter your age (18-45)"
              required
            />
            <small className="text-muted">
              We support users aged 18-45 for personalized recommendations
            </small>
          </div>

          {/* Occupation Selection */}
          <div className="mb-4">
            <label className="form-label fw-semibold">
              <Work fontSize="small" className="me-2" />
              Your Occupation
            </label>
            <div className="d-grid gap-2">
              {occupationOptions.map((option) => (
                <div
                  key={option.value}
                  className={`border rounded p-3 cursor-pointer ${
                    occupation === option.value ? 'border-primary bg-primary bg-opacity-10' : ''
                  }`}
                  onClick={() => setOccupation(option.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <input
                      type="radio"
                      name="occupation"
                      value={option.value}
                      checked={occupation === option.value}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="form-check-input me-3"
                    />
                    <div>
                      <div className="fw-semibold">{option.label}</div>
                      <small className="text-muted">{option.description}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg w-100"
            disabled={saving || !age || !occupation}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
