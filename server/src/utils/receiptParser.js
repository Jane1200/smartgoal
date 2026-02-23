/**
 * Receipt / Bill Scanner Parser
 * Extracts: vendor, date, total amount, items list, payment method, category
 */

// ── Category inference ────────────────────────────────────────────────────────
const VENDOR_CATEGORIES = {
  food: [
    'restaurant', 'cafe', 'dhaba', 'hotel', 'biryani', 'pizza', 'burger',
    'swiggy', 'zomato', 'dominos', 'kfc', 'mcdonalds', 'subway', 'starbucks',
    'coffee', 'bakery', 'sweet', 'juice', 'canteen', 'mess', 'tiffin',
    'haldirams', 'barbeque', 'grill', 'bar', 'pub',
  ],
  groceries: [
    'grocery', 'supermarket', 'mart', 'bazaar', 'dmart', 'bigbasket',
    'reliance fresh', 'more', 'spencer', 'nature basket', 'nilgiris',
    'vegetables', 'fruits', 'provision', 'general store', 'kirana',
  ],
  transport: [
    'petrol', 'diesel', 'fuel', 'cng', 'gas station', 'hp petrol',
    'indian oil', 'bharat petroleum', 'essar', 'shell', 'toll', 'parking',
  ],
  healthcare: [
    'pharmacy', 'medical', 'chemist', 'hospital', 'clinic', 'doctor',
    'lab', 'diagnostic', 'apollo', 'medplus', 'netmeds', 'wellness',
  ],
  shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'store', 'boutique',
    'fashion', 'clothing', 'garments', 'footwear', 'shoes', 'electronics',
    'mobile', 'laptop', 'appliance', 'furniture', 'home', 'decor',
  ],
  entertainment: [
    'cinema', 'pvr', 'inox', 'movie', 'theatre', 'amusement', 'spa',
    'salon', 'beauty', 'netflix', 'spotify', 'gaming', 'bowling',
  ],
  education: [
    'school', 'college', 'university', 'institute', 'coaching', 'tuition',
    'books', 'stationery', 'pen', 'notebook',
  ],
  utilities: [
    'electricity', 'water', 'gas', 'internet', 'broadband', 'jio', 'airtel',
    'vodafone', 'bsnl', 'bses', 'tata power', 'recharge', 'dth',
  ],
};

function inferCategory(vendorName, itemLines) {
  const text = (vendorName + ' ' + itemLines.join(' ')).toLowerCase();
  for (const [category, keywords] of Object.entries(VENDOR_CATEGORIES)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return 'other';
}

// ── Payment method ────────────────────────────────────────────────────────────
function inferPaymentMethod(text) {
  const t = text.toLowerCase();
  if (/\bupi\b|gpay|phonepe|paytm|bhim/.test(t)) return 'upi';
  if (/\bcard\b|visa|master|credit|debit|swipe/.test(t)) return 'card';
  if (/\bcash\b|paid cash|tendered/.test(t)) return 'cash';
  if (/\bnet ?banking\b|neft|imps/.test(t)) return 'bank';
  return 'other';
}

// ── Date extraction ───────────────────────────────────────────────────────────
function extractDate(lines) {
  const patterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,              // DD/MM/YYYY
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,                // YYYY-MM-DD
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4})/i,
    /date\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const raw = m[1];
        // Normalise DD/MM/YYYY → ISO
        const parts = raw.split(/[\/\-\.]/);
        if (parts.length === 3) {
          let [a, b, c] = parts.map(Number);
          if (String(parts[0]).length === 4) {
            // YYYY-MM-DD
            const d = new Date(a, b - 1, c);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
          } else {
            // DD/MM/YYYY
            if (c < 100) c += c < 50 ? 2000 : 1900;
            const d = new Date(c, b - 1, a);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
          }
        }
        try {
          const d = new Date(raw);
          if (!isNaN(d)) return d.toISOString().split('T')[0];
        } catch (_) { /* ignore */ }
      }
    }
  }
  return new Date().toISOString().split('T')[0]; // fallback: today
}

// ── Vendor / store name ───────────────────────────────────────────────────────
function extractVendorName(lines) {
  // Look in first 6 lines for something that looks like a store name
  // Skip lines that are purely numbers, addresses, or very short
  const skipPatterns = [
    /^\d+$/, // only digits
    /gstin|gst no|pan no|invoice|bill no|receipt|thank|welcome|www\./i,
    /^\s*$/,
  ];
  for (const line of lines.slice(0, 8)) {
    const clean = line.trim();
    if (clean.length < 3 || clean.length > 60) continue;
    if (skipPatterns.some((p) => p.test(clean))) continue;
    // Skip lines that look like addresses (contain pin code patterns)
    if (/\d{6}/.test(clean) && clean.split(' ').length <= 3) continue;
    return clean;
  }
  return 'Unknown Vendor';
}

// ── Total amount ──────────────────────────────────────────────────────────────
const TOTAL_KEYWORDS = [
  /grand\s*total/i,
  /net\s*total/i,
  /net\s*amount/i,
  /amount\s*paid/i,
  /total\s*amount/i,
  /\btotal\b/i,
  /amount\s*due/i,
  /bill\s*amount/i,
  /payable/i,
];

function extractTotal(lines) {
  // Search from bottom up — the total is almost always near the end
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const isTotalLine = TOTAL_KEYWORDS.some((kw) => kw.test(line));
    if (!isTotalLine) continue;

    // Find all numbers in this line
    const nums = [...line.matchAll(/[\u20b9Rs.]?\s*([0-9,]+\.?[0-9]{0,2})/g)]
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => !isNaN(n) && n > 0);

    if (nums.length > 0) {
      // The largest number on a TOTAL line is the total
      return Math.max(...nums);
    }
  }

  // Fallback: find the largest standalone number in the bottom third
  const bottomLines = lines.slice(Math.floor(lines.length * 0.5));
  let max = 0;
  for (const line of bottomLines) {
    const nums = [...line.matchAll(/([0-9,]+\.[0-9]{2})/g)]
      .map((m) => parseFloat(m[1].replace(/,/g, '')))
      .filter((n) => !isNaN(n) && n > 0 && n < 1_000_000);
    if (nums.length) max = Math.max(max, ...nums);
  }
  return max > 0 ? max : null;
}

// ── Line items ────────────────────────────────────────────────────────────────
function extractItems(lines) {
  const items = [];
  // An item line typically has: description ... price
  // Pattern: text on left, price (number) on right
  const priceAtEnd = /^(.+?)\s+[\u20b9Rs.]?\s*([0-9,]+\.?[0-9]{0,2})\s*$/;
  const skipLine = /total|gst|sgst|cgst|igst|tax|discount|subtotal|service|charge|thank|welcome|invoice|receipt|bill|gstin|date|time|table|cashier|operator/i;

  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.length < 5) continue;
    if (skipLine.test(clean)) continue;

    const m = clean.match(priceAtEnd);
    if (!m) continue;

    const name = m[1].replace(/\s+\d+\s*$/, '').trim(); // remove qty prefix
    const price = parseFloat(m[2].replace(/,/g, ''));

    if (name.length >= 2 && price > 0 && price < 100_000) {
      items.push({ name, price });
    }
  }

  return items.slice(0, 20); // cap at 20 items
}

// ── GST extraction ────────────────────────────────────────────────────────────
function extractGST(lines) {
  let gst = 0;
  for (const line of lines) {
    if (/\b(gst|sgst|cgst|igst|tax)\b/i.test(line)) {
      const nums = [...line.matchAll(/([0-9,]+\.?[0-9]{0,2})/g)]
        .map((m) => parseFloat(m[1].replace(/,/g, '')))
        .filter((n) => !isNaN(n) && n > 0 && n < 10_000);
      if (nums.length) gst += Math.max(...nums);
    }
  }
  return gst > 0 ? Math.round(gst * 100) / 100 : null;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseReceipt(ocrText) {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const vendorName   = extractVendorName(lines);
  const date         = extractDate(lines);
  const totalAmount  = extractTotal(lines);
  const items        = extractItems(lines);
  const gstAmount    = extractGST(lines);
  const paymentMethod = inferPaymentMethod(ocrText);
  const category     = inferCategory(vendorName, items.map((i) => i.name));

  // Confidence: how sure are we the scan is useful?
  const confidence =
    totalAmount !== null
      ? items.length > 0
        ? 'high'
        : 'medium'
      : 'low';

  return {
    vendorName,
    date,
    totalAmount,
    items,
    gstAmount,
    paymentMethod,
    category,
    confidence,
    rawText: ocrText.substring(0, 500), // for debugging / display
  };
}
