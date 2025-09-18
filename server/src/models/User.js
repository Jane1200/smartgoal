import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: function() { return this.provider === 'local'; } },
    role: { type: String, enum: ["goal_setter", "buyer", "admin"], default: "goal_setter" },
    isVerified: { type: Boolean, default: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    firebaseUid: { type: String },
    avatar: { type: String },
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
    // preferences for geo-matching
    geoPreferences: {
      maxDistance: { type: Number, default: 50 }, // in kilometers
      allowLocationSharing: { type: Boolean, default: true },
      showExactLocation: { type: Boolean, default: false }
    },
    // password reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // email verification token for local accounts
    emailVerificationToken: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);