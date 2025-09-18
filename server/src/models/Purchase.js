import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  marketplaceItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Marketplace',
    required: true
  },
  itemTitle: {
    type: String,
    required: true
  },
  itemPrice: {
    type: Number,
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'cash'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
purchaseSchema.index({ buyerId: 1, purchaseDate: -1 });
purchaseSchema.index({ sellerId: 1, purchaseDate: -1 });

export default mongoose.model('Purchase', purchaseSchema);





