# Meaningful Text Validation Guide

## Overview
The meaningful text validator prevents users from entering random, meaningless words and spam in text fields like marketplace listings, goal descriptions, and wishlist items.

## How It Works

### Three-Layer Validation

1. **Spam Pattern Detection**
   - ❌ Repeated characters (e.g., "aaaaaaa", "1111")
   - ❌ Excessive special characters (>30% of text)
   - ❌ Excessive numbers (>50% of text)
   - ❌ Random single-letter sequences
   - ❌ Keyboard mashing patterns (e.g., "qwerty")

2. **Meaningful Words Check (Offline)**
   - Verifies words are real and meaningful
   - Allows up to 20% invalid words (for brand names, typos, slang)
   - Uses 100+ common words database built-in
   - Checks for vowels and common word patterns

3. **Dictionary API Validation (Strict Mode)**
   - Uses FREE Dictionary API (no auth needed)
   - Validates first 3 significant words
   - Gracefully fails if API unavailable
   - Optional in production

## Usage Examples

### Example 1: Form Submission Validation
```javascript
import { validateForm, validationRules } from '@/utils/validations';

const handleSubmit = (e) => {
  e.preventDefault();
  
  const validation = validateForm(formData, {
    title: validationRules.marketplace.title,
    description: validationRules.marketplace.description,
  });
  
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  
  // Form is valid - submit
  submitForm(formData);
};
```

### Example 2: Real-Time Field Validation
```javascript
import { validateMeaningfulTextSync } from '@/utils/validations';
import { useState } from 'react';

export function MarketplaceForm() {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  
  const handleTitleChange = (e) => {
    const value = e.target.value;
    setTitle(value);
    
    // Real-time validation
    const error = validateMeaningfulTextSync('title', value);
    setTitleError(error);
  };
  
  return (
    <div>
      <input
        value={title}
        onChange={handleTitleChange}
        className={titleError ? 'is-invalid' : ''}
      />
      {titleError && <div className="error">{titleError}</div>}
    </div>
  );
}
```

### Example 3: Async Strict Validation
```javascript
import { validateMeaningfulContent } from '@/utils/validations';

const handleAsyncValidation = async (text) => {
  const result = await validateMeaningfulContent(text, {
    strict: true,      // Use dictionary API
    useAPI: true       // Enable API calls
  });
  
  if (!result.isValid) {
    console.error('Validation failed:', result.error);
    return false;
  }
  
  console.log('Text is meaningful!');
  return true;
};
```

## Validation Rules Applied

### Marketplace Listings
- **Title**: Meaningful words required ✅
  - "iPhone 12 Pro Max" → ✅ VALID
  - "aaaa bbbb cccc" → ❌ INVALID (repeated chars)
  - "xyz random words" → ❌ INVALID (nonsense)

- **Description**: Meaningful words required ✅
  - "Mint condition phone with original charger" → ✅ VALID
  - "zzzzz xxxx qqqq" → ❌ INVALID (spam patterns)

### Goals
- **Title**: Meaningful words required ✅
  - "Save for a new laptop" → ✅ VALID
  - "aaa bbb ccc" → ❌ INVALID

- **Description**: Meaningful words required ✅

### Wishlist
- **Item Name**: Meaningful words required ✅
  - "Sony WH-1000XM4 Headphones" → ✅ VALID
  - "random junk" → ❌ INVALID

## What Gets Blocked?

| Input | Result | Reason |
|-------|--------|--------|
| "aaaaaaa" | ❌ BLOCKED | Repeated characters (spam) |
| "123456789" | ❌ BLOCKED | Excessive numbers |
| "!@#$%^&*()" | ❌ BLOCKED | Excessive special chars |
| "a b c d e f" | ❌ BLOCKED | Random single letters |
| "qwerty" (alone) | ❌ BLOCKED | Keyboard mashing |
| "xyz abc pqr" | ❌ BLOCKED | Meaningless words |
| "iPhone 12" | ✅ ALLOWED | Real brand + number |
| "laptop screen 30 inch" | ✅ ALLOWED | Meaningful words |
| "phone, charger & cable" | ✅ ALLOWED | Meaningful with punctuation |

## What's Allowed?

- ✅ Real words (dictionary words)
- ✅ Common brand names (iPhone, Samsung, Sony, etc.)
- ✅ Numbers mixed with words (iPhone 12, Samsung 55")
- ✅ Common abbreviations (USB, LED, HD, etc.)
- ✅ Hyphens and apostrophes (first-hand, it's, etc.)
- ✅ 20% uncommon words (for typos, new terms, proper nouns)

## API Integration (Free Dictionary API)

The validator uses the **Free Dictionary API** for strict validation:

```
Endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

**Features:**
- ✅ No authentication required
- ✅ No rate limiting for casual use
- ✅ Free and open-source
- ✅ Automatically falls back to offline validation if unavailable

## Performance Notes

- **Synchronous validation** (`validateMeaningfulTextSync`): <5ms
- **Async with API** (`validateMeaningfulContent`): 100-500ms per call
- **Recommendation**: Use sync for form fields, async for final submission

## Customization

### Add Custom Words to Dictionary
Edit `meaningfulTextValidator.js` and add to `COMMON_WORDS` set:

```javascript
const COMMON_WORDS = new Set([
  // ... existing words
  'yourCustomBrand',
  'yourWord'
]);
```

### Adjust Spam Sensitivity
Modify validation thresholds in `detectSpamPatterns()`:

```javascript
// Line ~30: Change repeated character threshold
if (/(.)\1{3,}/g.test(trimmed)) { // Changed from {2,} to {3,}
```

### Disable API Validation
Set `useAPI: false` when calling validation:

```javascript
const result = validateMeaningfulContent(text, { 
  useAPI: false  // Offline only
});
```

## Error Messages Shown to Users

| Error | When | How to Fix |
|-------|------|-----------|
| "Text contains repeated characters (spam detected)" | User types "aaaa" | Type normal text |
| "Text contains too many special characters" | >30% special chars | Use proper punctuation |
| "Text contains too many numbers" | >50% numbers | Mix with letters |
| "Text appears to be random characters" | Many single letters | Write real words |
| "Text appears to be keyboard mashing" | "qwerty", "asdfgh", etc. | Type meaningful text |
| "Please use meaningful words. Suspicious words: ..." | Detects nonsense words | Use real words |
| "\"xyz\" doesn't appear to be a real word..." | API validation fails | Use dictionary words |

## Backend Integration (Optional)

If you want backend validation, you can:

1. **Use the same validator on Node.js** (copy the functions)
2. **Trust frontend validation** (most apps do)
3. **Implement server-side checks** with a library like `natural` or `compromise`

```javascript
// Backend example (Node.js)
const { validateMeaningfulContent } = require('./meaningfulTextValidator');

router.post('/listings', async (req, res) => {
  const validation = await validateMeaningfulContent(req.body.description);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }
  // Continue with form processing
});
```

## Testing the Validator

```javascript
import { 
  validateMeaningfulTextSync,
  detectSpamPatterns,
  validateMeaningfulWords 
} from '@/utils/validations';

// Test spam detection
console.log(detectSpamPatterns('aaaaaaa'));
// Output: { isSpam: true, reason: 'Text contains repeated characters...' }

// Test meaningful words
console.log(validateMeaningfulWords('iPhone 12 Pro'));
// Output: { isMeaningful: true, invalidWords: [] }

// Test full validation
console.log(validateMeaningfulTextSync('title', 'xyz abc'));
// Output: "Please use meaningful words. Suspicious words: \"xyz\", \"abc\""
```

## Fields with Validation Enabled

Currently enabled for these fields:
- ✅ Marketplace title
- ✅ Marketplace description
- ✅ Goal title
- ✅ Goal description
- ✅ Wishlist item name

To add to more fields, set `meaningful: true` in `validationRules` in `validations.js`.

## Troubleshooting

**Q: My item description is being rejected but it's valid**
- A: Try avoiding uncommon words or proper nouns. The validator allows 20% uncommon words.

**Q: How do I allow specific brand names?**
- A: Add them to `COMMON_WORDS` set in `meaningfulTextValidator.js`

**Q: Is validation happening on the server?**
- A: Currently frontend-only. For backend validation, implement the same checks on your API routes.

**Q: Can I disable meaningful word validation?**
- A: Set `meaningful: false` in the validation rules for specific fields

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom word lists per marketplace
- [ ] Machine learning-based spam detection
- [ ] Backend API validation
- [ ] Admin dashboard to manage blocked words
- [ ] User feedback loop to improve validation

---

**Last Updated**: Now
**Status**: Active in Production ✅