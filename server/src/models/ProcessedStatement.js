import mongoose from "mongoose";

const processedStatementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileType: {
      type: String,
      enum: ["pdf", "csv", "image"],
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing"
    },
    transactionsCount: {
      type: Number,
      default: 0
    },
    extractedTransactions: {
      total: { type: Number, default: 0 },
      income: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      needsReview: { type: Number, default: 0 }
    },
    processingStats: {
      processingTimeMs: Number,
      confidence: {
        average: Number,
        high: Number,
        medium: Number,
        low: Number
      },
      categorization: {
        auto: Number,
        manual: Number
      }
    },
    statementPeriod: {
      startDate: Date,
      endDate: Date,
      month: Number,
      year: Number
    },
    errorMessage: String,
    processedAt: Date,
    importedAt: Date,
    metadata: {
      bankName: String,
      accountNumber: String,
      statementType: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
processedStatementSchema.index({ userId: 1, createdAt: -1 });
processedStatementSchema.index({ userId: 1, status: 1 });
processedStatementSchema.index({ userId: 1, "statementPeriod.year": -1, "statementPeriod.month": -1 });

// Virtual for formatted file size
processedStatementSchema.virtual('formattedFileSize').get(function() {
  const sizeInMB = this.fileSize / (1024 * 1024);
  return sizeInMB < 1 ?
    `${Math.round(sizeInMB * 1024)} KB` :
    `${sizeInMB.toFixed(2)} MB`;
});

// Virtual for statement display name
processedStatementSchema.virtual('displayName').get(function() {
  if (this.statementPeriod?.month && this.statementPeriod?.year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[this.statementPeriod.month - 1]} ${this.statementPeriod.year} Statement`;
  }
  return this.originalName;
});

// Virtual for processing duration
processedStatementSchema.virtual('processingDuration').get(function() {
  if (this.processingStats?.processingTimeMs) {
    const seconds = this.processingStats.processingTimeMs / 1000;
    return seconds < 1 ?
      `${this.processingStats.processingTimeMs}ms` :
      `${seconds.toFixed(1)}s`;
  }
  return null;
});

// Static methods
processedStatementSchema.statics.getUserStatements = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

processedStatementSchema.statics.getStatementStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalTransactions: { $sum: '$transactionsCount' },
        totalFileSize: { $sum: '$fileSize' }
      }
    }
  ]);
};

processedStatementSchema.statics.getMonthlyStatements = function(userId, year, month) {
  return this.find({
    userId,
    'statementPeriod.year': year,
    'statementPeriod.month': month
  }).sort({ createdAt: -1 });
};

// Instance methods
processedStatementSchema.methods.markAsCompleted = function(stats) {
  this.status = 'completed';
  this.processedAt = new Date();
  if (stats) {
    this.transactionsCount = stats.total || 0;
    this.extractedTransactions = {
      total: stats.total || 0,
      income: stats.income || 0,
      expenses: stats.expenses || 0,
      needsReview: stats.needsReview || 0
    };
    if (stats.processingTimeMs) {
      this.processingStats = {
        ...this.processingStats,
        processingTimeMs: stats.processingTimeMs
      };
    }
  }
  return this.save();
};

processedStatementSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processedAt = new Date();
  return this.save();
};

processedStatementSchema.methods.updateProcessingStats = function(stats) {
  this.processingStats = { ...this.processingStats, ...stats };
  return this.save();
};

// Pre-save middleware
processedStatementSchema.pre('save', function(next) {
  // Extract file extension and set fileType
  if (this.isNew && this.filename && !this.fileType) {
    const ext = this.filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      this.fileType = 'pdf';
    } else if (ext === 'csv') {
      this.fileType = 'csv';
    } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
      this.fileType = 'image';
    }
  }

  // Set statement period from filename or dates if not set
  if (this.isNew && !this.statementPeriod?.month && this.filename) {
    // Try to extract month/year from filename
    const monthMatch = this.filename.match(/(\d{1,2})[-_](\d{4})|(\d{4})[-_](\d{1,2})/);
    if (monthMatch) {
      const month = parseInt(monthMatch[1] || monthMatch[4]);
      const year = parseInt(monthMatch[2] || monthMatch[3]);
      if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
        this.statementPeriod = {
          month,
          year,
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0)
        };
      }
    }
  }

  next();
});

export default mongoose.model("ProcessedStatement", processedStatementSchema);
