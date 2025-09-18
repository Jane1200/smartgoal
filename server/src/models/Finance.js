import mongoose from "mongoose";

const financeSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: ["income", "expense"], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    source: { 
      type: String, 
      required: function() { return this.type === 'income'; },
      enum: ["salary", "freelance", "business", "investment", "rental", "other"]
    },
    category: { 
      type: String, 
      required: function() { return this.type === 'expense'; },
      enum: ["food", "transport", "housing", "healthcare", "entertainment", "shopping", "education", "travel", "other"]
    },
    description: { 
      type: String, 
      trim: true, 
      maxlength: 500 
    },
    date: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    tags: [String],
    recurring: {
      isRecurring: { type: Boolean, default: false },
      frequency: { 
        type: String, 
        enum: ["weekly", "monthly", "yearly"],
        required: function() { return this.recurring?.isRecurring; }
      },
      endDate: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
financeSchema.index({ userId: 1, type: 1, date: -1 });
financeSchema.index({ userId: 1, date: -1 });
financeSchema.index({ userId: 1, source: 1 });
financeSchema.index({ userId: 1, category: 1 });

// Virtual for formatted amount
financeSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString()}`;
});

// Virtual for month/year grouping
financeSchema.virtual('monthYear').get(function() {
  return {
    month: this.date.getMonth() + 1,
    year: this.date.getFullYear()
  };
});

// Pre-save middleware to validate type-specific fields
financeSchema.pre('save', function(next) {
  if (this.type === 'income' && !this.source) {
    return next(new Error('Source is required for income entries'));
  }
  if (this.type === 'expense' && !this.category) {
    return next(new Error('Category is required for expense entries'));
  }
  next();
});

// Static methods
financeSchema.statics.getUserIncome = function(userId, filters = {}) {
  const query = { userId, type: 'income' };
  
  if (filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 0);
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(query).sort({ date: -1 });
};

financeSchema.statics.getUserExpenses = function(userId, filters = {}) {
  const query = { userId, type: 'expense' };
  
  if (filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 0);
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(query).sort({ date: -1 });
};

financeSchema.statics.getUserFinanceSummary = function(userId, filters = {}) {
  const query = { userId };
  
  if (filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 0);
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
};

financeSchema.statics.getMonthlyTrends = function(userId, months = 6) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type'
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);
};

financeSchema.statics.getCategoryBreakdown = function(userId, type, filters = {}) {
  const query = { userId, type };
  
  if (filters.month && filters.year) {
    const startDate = new Date(filters.year, filters.month - 1, 1);
    const endDate = new Date(filters.year, filters.month, 0);
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  const groupField = type === 'income' ? 'source' : 'category';
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: `$${groupField}`,
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
};

export default mongoose.model("Finance", financeSchema);





