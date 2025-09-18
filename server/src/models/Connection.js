import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    buyerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    goalSetterId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'rejected', 'blocked'], 
      default: 'pending' 
    },
    message: { 
      type: String, 
      maxlength: 500 
    },
    connectionType: { 
      type: String, 
      enum: ['general', 'marketplace', 'collaboration'], 
      default: 'general' 
    },
    // Location information at time of connection
    buyerLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
      state: { type: String },
      distance: { type: Number } // Distance in km
    },
    // Response from goal setter
    responseMessage: { 
      type: String, 
      maxlength: 500 
    },
    respondedAt: { 
      type: Date 
    },
    // Additional metadata
    metadata: {
      source: { type: String }, // 'geo_matching', 'marketplace', 'manual'
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Marketplace' }, // If connected via marketplace item
      notes: { type: String }
    }
  },
  { 
    timestamps: true,
    indexes: [
      { buyerId: 1, goalSetterId: 1 },
      { goalSetterId: 1, status: 1 },
      { buyerId: 1, status: 1 },
      { createdAt: -1 }
    ]
  }
);

// Prevent duplicate connections
connectionSchema.index({ buyerId: 1, goalSetterId: 1 }, { unique: true });

export default mongoose.model("Connection", connectionSchema);

