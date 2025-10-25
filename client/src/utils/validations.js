// client/src/utils/validations.js
import { validateMeaningfulTextSync } from './meaningfulTextValidator.js';

export const validationRules = {
  // Goal validations
  goal: {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
      meaningful: true,
      message: "Goal title must be 3-100 characters and contain only letters, numbers, spaces, and basic punctuation"
    },
    description: {
      maxLength: 500,
      meaningful: true,
      message: "Description cannot exceed 500 characters"
    },
    targetAmount: {
      required: true,
      min: 100,
      max: 10000000,
      type: "number",
      message: "Target amount must be between ₹100 and ₹1,00,00,000"
    },
    currentAmount: {
      min: 0,
      max: 10000000,
      type: "number",
      message: "Current amount must be between ₹0 and ₹1,00,00,000"
    },
    dueDate: {
      required: true,
      type: "date",
      minDate: new Date().toISOString().split('T')[0],
      message: "Due date must be today or in the future"
    }
  },

  // Finance validations
  finance: {
    amount: {
      required: true,
      min: 0.01,
      max: 10000000,
      type: "number",
      message: "Amount must be between ₹0.01 and ₹1,00,00,000"
    },
    incomeAmount: {
      required: true,
      min: 100,
      max: 10000000,
      type: "number",
      message: "Income amount must be between ₹100 and ₹1,00,00,000"
    },
    expenseAmount: {
      required: true,
      min: 0.01,
      max: 10000000,
      type: "number",
      message: "Expense amount must be between ₹0.01 and ₹1,00,00,000"
    },
    source: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-_.,()]+$/,
      message: "Source must be 2-50 characters and contain only letters, numbers, spaces, and basic punctuation"
    },
    category: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9\s\-_.,()]+$/,
      message: "Category must be 2-50 characters and contain only letters, numbers, spaces, and basic punctuation"
    },
    description: {
      maxLength: 200,
      message: "Description cannot exceed 200 characters"
    },
    date: {
      required: true,
      type: "date",
      minDate: new Date().toISOString().split('T')[0],
      message: "Date cannot be in the past"
    }
  },

  // Marketplace validations
  marketplace: {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
      meaningful: true,
      message: "Item title must be 3-100 characters and contain only letters, numbers, spaces, and basic punctuation"
    },
    description: {
      required: true,
      minLength: 10,
      maxLength: 1000,
      meaningful: true,
      message: "Description must be 10-1000 characters with meaningful words"
    },
    price: {
      required: true,
      min: 100,
      max: 10000000,
      type: "number",
      message: "Price must be between ₹100 and ₹1,00,00,000"
    },
    originalPrice: {
      min: 100,
      max: 100000,
      type: "number",
      message: "Original price must be between ₹100 and ₹1,00,000"
    },
    purchaseDate: {
      type: "date",
      minDate: (() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 10);
        return date.toISOString().split('T')[0];
      })(),
      maxDate: new Date().toISOString().split('T')[0],
      message: "Purchase date must be within the last 10 years"
    },
    condition: {
      required: true,
      enum: ["new", "like-new", "good", "fair", "poor"],
      message: "Please select a valid condition"
    },
    category: {
      required: true,
      enum: ["electronics", "sports", "books", "fashion", "other"],
      message: "Please select a valid category"
    },
  },

  // Wishlist validations
  wishlist: {
    itemName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
      meaningful: true,
      message: "Item name must be 2-100 characters and contain only letters, numbers, spaces, and basic punctuation"
    },
    url: {
      // Allow only Amazon, Flipkart, Myntra, Nykaa (and Nykaa Fashion), and Ajio product URLs
      pattern: /^https?:\/\/([a-z0-9-]+\.)*(amazon\.(in|com)|flipkart\.com|myntra\.com|nykaa\.com|nykaafashion\.com|ajio\.com)\/.+/i,
      message: "Only Amazon, Flipkart, Myntra, Nykaa, or Ajio URLs are allowed"
    },
    estimatedPrice: {
      min: 0.01,
      max: 10000000,
      type: "number",
      message: "Estimated price must be between ₹0.01 and ₹1,00,00,000"
    },
    priority: {
      required: true,
      enum: ["low", "medium", "high"],
      message: "Please select a valid priority level"
    },
    notes: {
      maxLength: 500,
      message: "Notes cannot exceed 500 characters"
    }
  },

  // Profile validations
  profile: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z\s\-']+$/,
      message: "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes"
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address"
    },
    phone: {
      pattern: /^[6-9]\d{9}$/,
      message: "Please enter a valid 10-digit Indian mobile number"
    },
    bio: {
      maxLength: 500,
      message: "Bio cannot exceed 500 characters"
    }
  }
};

// Validation helper functions
export const validateField = (value, rules) => {
  const errors = [];

  // Required check
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(`${rules.message || 'This field is required'}`);
    return errors;
  }

  // Skip other validations if value is empty and not required
  if (!value || value.toString().trim() === '') {
    return errors;
  }

  // Type validation
  if (rules.type === 'number') {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      errors.push('Must be a valid number');
      return errors;
    }
  }

  if (rules.type === 'date') {
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) {
      errors.push('Must be a valid date');
      return errors;
    }
  }

  // Length validations
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Cannot exceed ${rules.maxLength} characters`);
  }

  // Numeric validations
  if (rules.min !== undefined) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue < rules.min) {
      errors.push(`Must be at least ${rules.min}`);
    }
  }

  if (rules.max !== undefined) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > rules.max) {
      errors.push(`Cannot exceed ${rules.max}`);
    }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.message || 'Invalid format');
  }

  // Meaningful text validation (for text fields)
  if (rules.meaningful && typeof value === 'string' && value.trim().length > 0) {
    const meaningfulError = validateMeaningfulTextSync('text_field', value);
    if (meaningfulError) {
      errors.push(meaningfulError);
    }
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(rules.message || `Must be one of: ${rules.enum.join(', ')}`);
  }

  // Date validations
  if (rules.minDate) {
    const dateValue = new Date(value);
    const minDate = new Date(rules.minDate);
    if (dateValue < minDate) {
      errors.push(rules.message || `Date must be ${rules.minDate} or later`);
    }
  }

  if (rules.maxDate) {
    const dateValue = new Date(value);
    const maxDate = new Date(rules.maxDate);
    if (dateValue > maxDate) {
      errors.push(rules.message || `Date must be ${rules.maxDate} or earlier`);
    }
  }

  return errors;
};

/**
 * Live validation for real-time feedback as user types
 * Returns first error or null if valid
 */
export const validateFieldLive = (value, rules, fieldName) => {
  const errors = validateField(value, rules);
  return errors.length > 0 ? errors[0] : null;
};

export const validateForm = (formData, validationSchema) => {
  const errors = {};
  let isValid = true;

  Object.keys(validationSchema).forEach(field => {
    const fieldErrors = validateField(formData[field], validationSchema[field]);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors[0]; // Take first error
      isValid = false;
    }
  });

  return { isValid, errors };
};

// Format currency for display
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date for display
export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Calculate progress percentage
export const calculateProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
};

// Validate file upload
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxDimensions = { width: 2048, height: 2048 }
  } = options;

  const errors = [];

  if (!file) {
    errors.push('Please select a file');
    return errors;
  }

  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`);
  }

  return errors;
};

/**
 * Export meaningful text validator for use in components
 * Usage in real-time validation:
 * 
 * import { validateMeaningfulTextSync } from '@/utils/meaningfulTextValidator';
 * 
 * const handleChange = (value) => {
 *   const error = validateMeaningfulTextSync('description', value);
 *   setError(error);
 * };
 */
export { 
  validateMeaningfulTextSync, 
  validateMeaningfulContent,
  detectSpamPatterns,
  validateMeaningfulWords 
} from './meaningfulTextValidator.js';
