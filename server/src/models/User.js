import mongoose from "mongoose";
import validator from 'validator';

const allowedRoles = ["goal_setter", "buyer", "admin", "evaluator"];

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      validate: {
        validator: function(v) {
          return /^[a-zA-Z\s]+$/.test(v);
        },
        message: 'Name can only contain letters and spaces'
      }
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      unique: true, 
      lowercase: true, 
      trim: true,
      index: true,
      validate: {
        validator: function(v) {
          return validator.isEmail(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    passwordHash: { 
      type: String, 
      required: function() { return this.provider === 'local'; },
      minlength: [60, 'Password hash is invalid']
    },

    // Legacy single-role kept for backward-compat
    role: { 
      type: String, 
      enum: {
        values: allowedRoles,
        message: '{VALUE} is not a valid role'
      }
    },

    // Canonical roles array
    roles: {
      type: [{ 
        type: String, 
        enum: {
          values: allowedRoles,
          message: '{VALUE} is not a valid role'
        }
      }],
      default: function () {
        const primary = this.role || "goal_setter";
        return [primary];
      },
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0 && new Set(value).size === value.length;
        },
        message: "Roles must be a non-empty array with unique entries"
      }
    },

    defaultRole: { 
      type: String, 
      enum: {
        values: allowedRoles,
        message: '{VALUE} is not a valid default role'
      }
    },

    isVerified: { type: Boolean, default: true },
    provider: { 
      type: String, 
      enum: {
        values: ["local", "google"],
        message: '{VALUE} is not a valid provider'
      },
      default: "local" 
    },
    firebaseUid: { 
      type: String,
      sparse: true,
      unique: true
    },
    avatar: { 
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          // Allow both full URLs and local paths starting with /uploads/
          return validator.isURL(v, { protocols: ['http', 'https'], require_protocol: false }) || v.startsWith('/uploads/');
        },
        message: 'Avatar must be a valid URL or local upload path'
      }
    },
    phone: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    
    // User profile information
    age: {
      type: Number,
      min: [18, 'Age must be at least 18'],
      max: [45, 'Age cannot exceed 45'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return Number.isInteger(v);
        },
        message: 'Age must be a whole number'
      }
    },
    
    occupation: {
      type: String,
      enum: {
        values: ['student', 'working_professional', 'freelancer', 'entrepreneur', 'other'],
        message: '{VALUE} is not a valid occupation'
      },
      trim: true
    },
    
    address: { 
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    
    // Expense limits and budgeting
    expenseLimit: {
      enabled: {
        type: Boolean,
        default: false
      },
      monthlyLimit: {
        type: Number,
        min: [0, 'Monthly limit cannot be negative'],
        default: 0
      },
      alertThreshold: {
        type: Number,
        min: [50, 'Alert threshold must be at least 50%'],
        max: [100, 'Alert threshold cannot exceed 100%'],
        default: 80 // Alert when 80% of limit is reached
      },
      lastAlertDate: {
        type: Date
      }
    },

    // Location for geo-matching
    location: {
      latitude: { 
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: { 
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      },
      address: { 
        type: String,
        trim: true,
        maxlength: [500, 'Address cannot exceed 500 characters']
      },
      city: { 
        type: String,
        trim: true,
        maxlength: [100, 'City name cannot exceed 100 characters']
      },
      state: { 
        type: String,
        trim: true,
        maxlength: [100, 'State name cannot exceed 100 characters']
      },
      country: { 
        type: String, 
        default: "India",
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
      },
      postalCode: { 
        type: String,
        trim: true,
        validate: {
          validator: function(v) {
            if (!v) return true;
            return /^[0-9]{6}$/.test(v); // Indian postal code format
          },
          message: 'Please provide a valid 6-digit postal code'
        }
      },
      lastUpdated: { type: Date, default: Date.now }
    },

    geoPreferences: {
      maxDistance: { 
        type: Number, 
        default: 50,
        min: [1, 'Maximum distance must be at least 1 km'],
        max: [500, 'Maximum distance cannot exceed 500 km']
      },
      allowLocationSharing: { type: Boolean, default: true },
      showExactLocation: { type: Boolean, default: false }
    },

    // Marketplace seller stats
    marketplaceStats: {
      totalListings: { 
        type: Number, 
        default: 0,
        min: [0, 'Total listings cannot be negative']
      },
      soldListings: { 
        type: Number, 
        default: 0,
        min: [0, 'Sold listings cannot be negative']
      },
      activeListings: { 
        type: Number, 
        default: 0,
        min: [0, 'Active listings cannot be negative']
      },
      totalEarnings: { 
        type: Number, 
        default: 0,
        min: [0, 'Total earnings cannot be negative']
      },
      averageRating: { 
        type: Number, 
        default: 0,
        min: [0, 'Average rating cannot be negative'],
        max: [5, 'Average rating cannot exceed 5']
      },
      totalReviews: { 
        type: Number, 
        default: 0,
        min: [0, 'Total reviews cannot be negative']
      },
      genuinePercentage: { 
        type: Number, 
        default: 0,
        min: [0, 'Genuine percentage cannot be negative'],
        max: [100, 'Genuine percentage cannot exceed 100']
      }
    },

    // Trust badge level
    trustBadge: {
      level: { 
        type: String, 
        enum: {
          values: ["new", "verified", "trusted", "silver", "gold", "platinum"],
          message: '{VALUE} is not a valid trust badge level'
        },
        default: "new"
      },
      lastUpdated: { type: Date, default: Date.now }
    },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    emailVerificationToken: { type: String },
    
    // OTP for login verification
    loginOTP: { 
      type: String,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[0-9]{6}$/.test(v);
        },
        message: 'OTP must be a 6-digit number'
      }
    },
    loginOTPExpires: { type: Date },
    loginOTPAttempts: { 
      type: Number, 
      default: 0,
      min: [0, 'OTP attempts cannot be negative'],
      max: [10, 'Maximum OTP attempts exceeded']
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.passwordHash;
        delete ret.resetPasswordToken;
        delete ret.emailVerificationToken;
        delete ret.loginOTP;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ firebaseUid: 1 }, { sparse: true });
userSchema.index({ roles: 1 });
userSchema.index({ 'location.city': 1, 'location.state': 1 });

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
  return this.name || this.email.split('@')[0];
});

// Instance methods
userSchema.methods.hasRole = function(role) {
  return Array.isArray(this.roles) && this.roles.includes(role);
};

userSchema.methods.getDefaultRole = function() {
  if (this.defaultRole) return this.defaultRole;
  if (Array.isArray(this.roles) && this.roles.length) return this.roles[0];
  return "goal_setter";
};

// Pre-validate middleware
userSchema.pre('validate', function(next) {
  // Ensure roles array is populated
  if (!Array.isArray(this.roles) || this.roles.length === 0) {
    const primary = this.role || this.defaultRole || "goal_setter";
    this.roles = [primary];
  }
  // Ensure uniqueness
  this.roles = Array.from(new Set(this.roles));
  
  // Validate location coordinates if provided
  if (this.location && this.location.latitude && !this.location.longitude) {
    return next(new Error('Longitude is required when latitude is provided'));
  }
  if (this.location && this.location.longitude && !this.location.latitude) {
    return next(new Error('Latitude is required when longitude is provided'));
  }
  
  next();
});

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Keep legacy role in sync
  if ((!this.role && Array.isArray(this.roles) && this.roles.length) || (this.role && !this.roles.includes(this.role))) {
    this.role = this.roles[0];
  }
  
  // Update location timestamp if coordinates changed
  if (this.isModified('location.latitude') || this.isModified('location.longitude')) {
    this.location.lastUpdated = new Date();
  }
  
  // Validate marketplace stats consistency
  if (this.marketplaceStats) {
    if (this.marketplaceStats.soldListings > this.marketplaceStats.totalListings) {
      this.marketplaceStats.soldListings = this.marketplaceStats.totalListings;
    }
    if (this.marketplaceStats.activeListings > this.marketplaceStats.totalListings) {
      this.marketplaceStats.activeListings = this.marketplaceStats.totalListings;
    }
  }
  
  next();
});

// Static methods
userSchema.statics.addRole = async function(userId, role) {
  if (!allowedRoles.includes(role)) throw new Error("Invalid role");
  return this.findByIdAndUpdate(userId, { $addToSet: { roles: role } }, { new: true, runValidators: true });
};

userSchema.statics.removeRole = async function(userId, role) {
  const user = await this.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.roles.includes(role)) return user;
  if (user.roles.length === 1) throw new Error("Cannot remove the only role");
  user.roles = user.roles.filter(r => r !== role);
  user.role = user.roles[0];
  return user.save();
};

export default mongoose.model("User", userSchema);
