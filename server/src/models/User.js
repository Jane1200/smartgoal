// user.js
import mongoose from "mongoose";

const allowedRoles = ["goal_setter", "buyer", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: function() { return this.provider === 'local'; } },

    // Legacy single-role kept for backward-compat; we will migrate to `roles` array.
    role: { type: String, enum: allowedRoles },

    // canonical roles array
    roles: {
      type: [{ type: String, enum: allowedRoles }],
      default: function () {
        // keep backward compatibility: if `role` exists, use that; otherwise default to goal_setter
        const primary = this.role || "goal_setter";
        return [primary];
      },
      validate: {
        validator(value) {
          // ensure array, non-empty and unique
          return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length;
        },
        message: "roles must be a non-empty array with unique entries"
      }
    },

    // optional: preferred default role shown on first login (not required)
    defaultRole: { type: String, enum: allowedRoles },

    isVerified: { type: Boolean, default: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    firebaseUid: { type: String },
    avatar: { type: String },
    phone: { type: String },
    address: { type: String },

    // location for geo-matching
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String, default: "India" },
      postalCode: { type: String },
      lastUpdated: { type: Date, default: Date.now }
    },

    geoPreferences: {
      maxDistance: { type: Number, default: 50 },
      allowLocationSharing: { type: Boolean, default: true },
      showExactLocation: { type: Boolean, default: false }
    },

    // Marketplace seller stats
    marketplaceStats: {
      totalListings: { type: Number, default: 0 },
      soldListings: { type: Number, default: 0 },
      activeListings: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      genuinePercentage: { type: Number, default: 0 }
    },

    // Trust badge level
    trustBadge: {
      level: { 
        type: String, 
        enum: ["new", "verified", "trusted", "silver", "gold", "platinum"],
        default: "new"
      },
      lastUpdated: { type: Date, default: Date.now }
    },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    emailVerificationToken: { type: String },
    
    // OTP for login verification
    loginOTP: { type: String },
    loginOTPExpires: { type: Date },
    loginOTPAttempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// === Instance helpers ===
// Check whether a user has a role
userSchema.methods.hasRole = function(role) {
  return Array.isArray(this.roles) && this.roles.includes(role);
};

// Get user's default role to use if activeRole not provided in session/JWT
userSchema.methods.getDefaultRole = function() {
  if (this.defaultRole) return this.defaultRole;
  if (Array.isArray(this.roles) && this.roles.length) return this.roles[0];
  return "goal_setter";
};

// Validate that the roles array always contains at least one valid role before saving
userSchema.pre('validate', function(next) {
  if (!Array.isArray(this.roles) || this.roles.length === 0) {
    const primary = this.role || this.defaultRole || "goal_setter";
    this.roles = [primary];
  }
  // ensure uniqueness
  this.roles = Array.from(new Set(this.roles));
  next();
});

// Optional: keep legacy `role` in sync on-save (makes rollback easier)
userSchema.pre('save', function(next) {
  // If legacy `role` is unset or different, keep it in sync for a transition period.
  if ((!this.role && Array.isArray(this.roles) && this.roles.length) || (this.role && !this.roles.includes(this.role))) {
    this.role = this.roles[0];
  }
  next();
});

// Static: safely add a role to user
userSchema.statics.addRole = async function(userId, role) {
  if (!allowedRoles.includes(role)) throw new Error("invalid role");
  return this.findByIdAndUpdate(userId, { $addToSet: { roles: role } }, { new: true });
};

// Static: safely remove a role (ensures at least one role remains)
userSchema.statics.removeRole = async function(userId, role) {
  const user = await this.findById(userId);
  if (!user) throw new Error("user not found");
  if (!user.roles.includes(role)) return user;
  if (user.roles.length === 1) throw new Error("cannot remove the only role");
  user.roles = user.roles.filter(r => r !== role);
  // keep legacy field in sync
  user.role = user.roles[0];
  return user.save();
};

export default mongoose.model("User", userSchema);
