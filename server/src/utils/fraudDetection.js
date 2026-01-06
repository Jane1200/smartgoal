/**
 * Fraud and Scam Detection for Marketplace Listings
 * Analyzes listings for suspicious patterns, keywords, and behaviors
 */

// Suspicious keywords that often appear in scams
const SCAM_KEYWORDS = [
  // Financial scams
  "guaranteed returns", "get rich quick", "100% profit", "risk-free investment",
  "instant money", "no investment needed", "work from home earn lakhs",
  "limited offer", "act now", "urgent", "expire soon", "hurry",
  "congratulations you won", "claim your prize", "lottery winner",
  
  // Payment scams
  "send money first", "advance payment", "pay upfront", "deposit required",
  "transfer immediately", "urgent payment", "wire transfer only",
  "cash only deal", "no refund", "non-refundable deposit",
  
  // Fake products
  "original 100%", "authentic guaranteed", "first copy", "master copy",
  "aaa quality", "999 pure", "imported usa uk", "branded duplicate",
  
  // Personal info fishing
  "send otp", "share bank details", "your account number", "credit card details",
  "verify your identity", "confirm personal details", "send documents",
  "aadhaar number", "pan card copy", "password required",
  
  // Too good to be true
  "99% discount", "free delivery worldwide", "lowest price guaranteed",
  "factory outlet", "clearance sale", "below mrp", "wholesale rate",
  
  // Suspicious contact methods
  "whatsapp only", "telegram me", "call immediately", "sms this number",
  "don't message here", "contact on different number", "private chat",
  
  // Suspicious behavior
  "need it urgently", "quick sale needed", "must sell today",
  "serious buyers only", "no time wasters", "cash in hand only",
  "meet in person mandatory", "no online payment", "only cash accepted"
];

// URL patterns that indicate external links (potential phishing)
const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly/i,
  /tinyurl/i,
  /goo\.gl/i,
  /t\.co/i,
  /ow\.ly/i,
  /shortened\.link/i,
  /click\.here/i,
  /verify\.your/i,
  /secure\.payment/i,
  /account\.update/i
];

// Phone number patterns
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
const MULTIPLE_PHONES_THRESHOLD = 3;

// Repetitive character patterns (spam)
const REPETITIVE_PATTERN = /(.)\1{4,}/;
const EXCESSIVE_CAPS_THRESHOLD = 0.5; // 50% or more in caps

// Suspicious price patterns
const PRICE_TOO_LOW_PERCENTAGE = 0.3; // 70% discount or more
const PRICE_PATTERN = /₹\s*[\d,]+/g;

/**
 * Analyze listing for fraud indicators
 * @param {Object} listing - Marketplace listing object
 * @returns {Object} - Fraud detection result with score and flags
 */
export function detectFraud(listing) {
  const flags = [];
  let suspicionScore = 0;
  const maxScore = 100;

  // Extract text fields for analysis
  const title = (listing.title || "").toLowerCase();
  const description = (listing.description || "").toLowerCase();
  const fullText = `${title} ${description}`;

  // 1. Check for scam keywords (HIGH PRIORITY)
  const foundKeywords = SCAM_KEYWORDS.filter(keyword => 
    fullText.includes(keyword.toLowerCase())
  );
  
  if (foundKeywords.length > 0) {
    suspicionScore += Math.min(foundKeywords.length * 10, 40);
    flags.push({
      type: "scam_keywords",
      severity: "high",
      message: `Contains suspicious keywords: ${foundKeywords.slice(0, 3).join(", ")}`,
      keywords: foundKeywords
    });
  }

  // 2. Check for suspicious URLs
  const hasSuspiciousUrls = SUSPICIOUS_URL_PATTERNS.some(pattern => 
    pattern.test(fullText)
  );
  
  if (hasSuspiciousUrls) {
    suspicionScore += 25;
    flags.push({
      type: "suspicious_url",
      severity: "high",
      message: "Contains shortened or suspicious URLs that may lead to phishing sites"
    });
  }

  // 3. Check for multiple phone numbers (potential spam)
  const phoneMatches = fullText.match(PHONE_PATTERN) || [];
  const uniquePhones = [...new Set(phoneMatches)];
  
  if (uniquePhones.length >= MULTIPLE_PHONES_THRESHOLD) {
    suspicionScore += 15;
    flags.push({
      type: "multiple_contacts",
      severity: "medium",
      message: `Contains ${uniquePhones.length} different phone numbers (spam indicator)`,
      count: uniquePhones.length
    });
  }

  // 4. Check for repetitive characters (spam pattern)
  if (REPETITIVE_PATTERN.test(fullText)) {
    suspicionScore += 10;
    flags.push({
      type: "repetitive_spam",
      severity: "medium",
      message: "Contains repetitive characters often used in spam (e.g., !!!!!!, ????)"
    });
  }

  // 5. Check for excessive capitalization
  const capsCount = (fullText.match(/[A-Z]/g) || []).length;
  const letterCount = (fullText.match(/[A-Za-z]/g) || []).length;
  const capsRatio = letterCount > 0 ? capsCount / letterCount : 0;
  
  if (capsRatio > EXCESSIVE_CAPS_THRESHOLD && letterCount > 20) {
    suspicionScore += 10;
    flags.push({
      type: "excessive_caps",
      severity: "low",
      message: "Excessive use of capital letters (spam/scam indicator)",
      percentage: (capsRatio * 100).toFixed(1)
    });
  }

  // 6. Check for unrealistic pricing
  if (listing.price && listing.originalPrice) {
    const discount = (listing.originalPrice - listing.price) / listing.originalPrice;
    
    if (discount > 0.7) { // More than 70% discount
      suspicionScore += 20;
      flags.push({
        type: "unrealistic_pricing",
        severity: "high",
        message: `Suspiciously high discount (${(discount * 100).toFixed(0)}%) - often used in scams`,
        discount: (discount * 100).toFixed(1)
      });
    }
  }

  // 7. Check for missing or low-quality images
  if (!listing.images || listing.images.length === 0) {
    suspicionScore += 15;
    flags.push({
      type: "no_images",
      severity: "medium",
      message: "No product images provided (red flag for scams)"
    });
  } else if (listing.images.length === 1) {
    suspicionScore += 5;
    flags.push({
      type: "single_image",
      severity: "low",
      message: "Only one image provided (legitimate sellers usually provide multiple angles)"
    });
  }

  // 8. Check for vague or minimal description
  if (description.length < 20) {
    suspicionScore += 10;
    flags.push({
      type: "minimal_description",
      severity: "medium",
      message: "Very short description (scammers often provide minimal details)"
    });
  }

  // 9. Check for new seller with high-value item
  if (listing.price > 10000 && listing.seller?.createdAt) {
    const accountAge = Date.now() - new Date(listing.seller.createdAt).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysOld < 7) {
      suspicionScore += 20;
      flags.push({
        type: "new_seller_high_value",
        severity: "high",
        message: `New account (${Math.floor(daysOld)} days old) selling high-value item (₹${listing.price.toLocaleString()})`,
        accountAge: Math.floor(daysOld)
      });
    }
  }

  // 10. Check for urgency/pressure tactics
  const urgencyWords = ["urgent", "hurry", "quick", "immediately", "today only", "limited time", "expire"];
  const urgencyCount = urgencyWords.filter(word => fullText.includes(word)).length;
  
  if (urgencyCount >= 2) {
    suspicionScore += 15;
    flags.push({
      type: "urgency_pressure",
      severity: "high",
      message: "Uses pressure tactics to force quick decisions (common scam technique)"
    });
  }

  // Calculate final risk level
  let riskLevel = "low";
  if (suspicionScore >= 60) {
    riskLevel = "critical";
  } else if (suspicionScore >= 40) {
    riskLevel = "high";
  } else if (suspicionScore >= 20) {
    riskLevel = "medium";
  }

  const shouldBlock = suspicionScore >= 60; // Auto-block at 60+ score
  const requiresReview = suspicionScore >= 40; // Manual review at 40+ score

  return {
    isSuspicious: suspicionScore > 0,
    suspicionScore: Math.min(suspicionScore, maxScore),
    riskLevel,
    shouldBlock,
    requiresReview,
    flags,
    recommendation: getRecommendation(suspicionScore, flags),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get human-readable recommendation based on fraud detection
 */
function getRecommendation(score, flags) {
  if (score >= 60) {
    return {
      action: "block",
      message: "This listing shows multiple signs of fraud and should be blocked immediately.",
      userWarning: "⚠️ SCAM ALERT: This listing has been flagged as highly suspicious. Do not proceed with any transaction."
    };
  } else if (score >= 40) {
    return {
      action: "review",
      message: "This listing requires manual review before approval.",
      userWarning: "⚠️ WARNING: This listing shows suspicious patterns. Proceed with extreme caution and verify seller authenticity."
    };
  } else if (score >= 20) {
    return {
      action: "warn",
      message: "This listing shows some suspicious indicators. Monitor closely.",
      userWarning: "⚠️ CAUTION: Be careful when dealing with this listing. Verify product and seller before making payment."
    };
  } else {
    return {
      action: "allow",
      message: "This listing appears normal.",
      userWarning: null
    };
  }
}

/**
 * Analyze seller behavior patterns
 */
export function analyzeSellerBehavior(seller, listings) {
  const flags = [];
  let suspicionScore = 0;

  // Check for rapid listing creation (spam behavior)
  if (listings.length > 10) {
    const recentListings = listings.filter(l => {
      const age = Date.now() - new Date(l.createdAt).getTime();
      return age < (24 * 60 * 60 * 1000); // Last 24 hours
    });

    if (recentListings.length > 5) {
      suspicionScore += 25;
      flags.push({
        type: "rapid_listing",
        severity: "high",
        message: `Created ${recentListings.length} listings in 24 hours (spam indicator)`
      });
    }
  }

  // Check for duplicate/similar listings
  const titles = listings.map(l => l.title.toLowerCase());
  const uniqueTitles = new Set(titles);
  
  if (titles.length > uniqueTitles.size) {
    suspicionScore += 20;
    flags.push({
      type: "duplicate_listings",
      severity: "medium",
      message: "Multiple identical or very similar listings detected"
    });
  }

  // Check for consistent low prices (too good to be true)
  const averageDiscount = listings.reduce((sum, l) => {
    if (l.originalPrice && l.price) {
      return sum + ((l.originalPrice - l.price) / l.originalPrice);
    }
    return sum;
  }, 0) / listings.length;

  if (averageDiscount > 0.6) { // Average discount > 60%
    suspicionScore += 20;
    flags.push({
      type: "consistent_low_pricing",
      severity: "high",
      message: `Average discount of ${(averageDiscount * 100).toFixed(0)}% across all listings (unrealistic)`
    });
  }

  return {
    isSuspicious: suspicionScore > 0,
    suspicionScore,
    riskLevel: suspicionScore >= 40 ? "high" : suspicionScore >= 20 ? "medium" : "low",
    flags
  };
}

/**
 * Generate fraud report for listing
 */
export function generateFraudReport(listing, sellerBehavior = null) {
  const listingAnalysis = detectFraud(listing);
  
  const report = {
    listingId: listing._id,
    listingTitle: listing.title,
    sellerId: listing.userId,
    analysis: listingAnalysis,
    sellerBehavior,
    overallRisk: listingAnalysis.riskLevel,
    timestamp: new Date().toISOString()
  };

  // If seller behavior is also suspicious, increase overall risk
  if (sellerBehavior && sellerBehavior.riskLevel === "high") {
    if (report.overallRisk === "medium") {
      report.overallRisk = "high";
    } else if (report.overallRisk === "high") {
      report.overallRisk = "critical";
    }
  }

  return report;
}
