# 📱 Smart Resale Pricing - Visual Examples

Quick reference guide with real-world pricing scenarios.

---

## Example 1: Premium Phone (Electronics)

**Scenario**: Selling an Apple iPhone that you bought 6 months ago

### Form Input
```
Item Title:        iPhone 12 Pro Max
Category:          Electronics
Condition:         Like New
Original Price:    ₹75,000
Purchase Date:     6 months ago
```

### Pricing Calculation
```
Base Price:                  ₹75,000
├─ Condition (Like New):      × 0.82  = ₹61,500
├─ Age (6 months):           × 0.64  = ₹39,360
├─ Brand Premium (Apple):    × 1.15  = ₹45,264
├─ Category Demand:          × 1.2   = ₹54,316
└─ Rounded to ₹50:                    ≈ ₹54,300
```

### Suggested Box Display
```
💡 Smart Pricing Suggestion

┌─────────────────────────────────────┐
│ Suggested Price:    ₹54,300         │
│ Value Retained:     72% of original  │
│ Recommended Range:  ₹49,000 - ₹59,700
│                                     │
│ 📅 Age: 6 month(s)                  │
│ 🏷️ Condition: like-new              │
│ ⭐ Confidence: 100%                  │
│                                     │
│ [Use Suggested Price]               │
└─────────────────────────────────────┘
```

### Your Decision
- ✅ Accept suggestion → Set price at ₹54,300
- 📈 Go above range → Price at ₹59,000 (premium condition)
- 📉 Go below range → Price at ₹49,000 (quick sale)

---

## Example 2: Gaming Laptop (Electronics)

**Scenario**: Selling a used Dell laptop in good condition

### Form Input
```
Item Title:        Dell XPS 13 Laptop
Category:          Electronics
Condition:         Good
Original Price:    ₹1,20,000
Purchase Date:     18 months ago
```

### Pricing Calculation
```
Base Price:                  ₹1,20,000
├─ Condition (Good):         × 0.68  = ₹81,600
├─ Age (18 months):          × 0.29  = ₹23,664
├─ Brand Premium (Dell):     × 1.15  = ₹27,213
├─ Category Demand:          × 1.2   = ₹32,656
└─ Rounded to ₹50:                    ≈ ₹32,700
```

### Suggested Box Display
```
💡 Smart Pricing Suggestion

┌─────────────────────────────────────┐
│ Suggested Price:    ₹32,700         │
│ Value Retained:     27% of original  │
│ Recommended Range:  ₹29,400 - ₹35,900
│                                     │
│ 📅 Age: 18 month(s)                 │
│ 🏷️ Condition: good                  │
│ ⭐ Confidence: 100%                  │
│                                     │
│ [Use Suggested Price]               │
└─────────────────────────────────────┘
```

### Market Context
- Old tech depreciates fast (8% per month)
- 18 months of depreciation hits hard
- ₹32,700 is realistic fair price
- Buyer expects significant discount

---

## Example 3: Sports Shoe (Fashion)

**Scenario**: Selling new Nike shoes

### Form Input
```
Item Title:        Nike Air Max 270
Category:          Fashion & Apparel
Condition:         New
Original Price:    ₹12,000
Purchase Date:     Today
```

### Pricing Calculation
```
Base Price:                  ₹12,000
├─ Condition (New):          × 0.95  = ₹11,400
├─ Age (0 months):           × 1.0   = ₹11,400
├─ Brand Premium (Nike):     × 1.15  = ₹13,110
├─ Category Demand:          × 1.1   = ₹14,421
└─ Rounded to ₹50:                    ≈ ₹14,400
```

### Suggested Box Display
```
💡 Smart Pricing Suggestion

┌─────────────────────────────────────┐
│ Suggested Price:    ₹14,400         │
│ Value Retained:     120% of original │ ← Premium for new
│ Recommended Range:  ₹13,000 - ₹15,800
│                                     │
│ 📅 Age: 0 month(s) (Brand New!)     │
│ 🏷️ Condition: new                   │
│ ⭐ Confidence: 100%                  │
│                                     │
│ [Use Suggested Price]               │
└─────────────────────────────────────┘
```

### Analysis
- Premium brand + new condition = premium pricing
- Fashion items hold value well (2% per month depreciation)
- Can often resell new shoes above cost due to demand

---

## Example 4: Textbook (Books)

**Scenario**: Selling old engineering textbook

### Form Input
```
Item Title:        Digital Signal Processing Textbook
Category:          Books
Condition:         Fair
Original Price:    ₹800
Purchase Date:     2 years ago
```

### Pricing Calculation
```
Base Price:                  ₹800
├─ Condition (Fair):         × 0.48  = ₹384
├─ Age (24 months):          × 0.78  = ₹299
├─ Brand Premium (None):     × 1.0   = ₹299
├─ Category Demand:          × 0.9   = ₹269
└─ Rounded to ₹50:                    ≈ ₹250
```

### Suggested Box Display
```
💡 Smart Pricing Suggestion

┌─────────────────────────────────────┐
│ Suggested Price:    ₹250            │
│ Value Retained:     31% of original  │
│ Recommended Range:  ₹225 - ₹275     │
│                                     │
│ 📅 Age: 24 month(s)                 │
│ 🏷️ Condition: fair                  │
│ ⭐ Confidence: 85%                   │
│ (No purchase date provided)          │
│                                     │
│ [Use Suggested Price]               │
└─────────────────────────────────────┘
```

### Key Points
- Books depreciate very slowly (1% per month)
- Fair condition significantly reduces value
- Textbook demand varies by course/semester
- No purchase date = slightly lower confidence

---

## Example 5: Incomplete Information (Low Confidence)

**Scenario**: User unsure about original price

### Form Input
```
Item Title:        Samsung Watch
Category:          Electronics
Condition:         Good
Original Price:    (NOT PROVIDED)
Purchase Date:     (NOT PROVIDED)
```

### Suggested Box Display
```
(NO SUGGESTION BOX SHOWN)

System Message: "Add original price to see pricing suggestion"
```

### Why No Suggestion?
- Original price is required to calculate
- Without it, system can't estimate fair value
- User must enter original price to proceed

---

## Example 6: Generic Item (No Premium Brand)

**Scenario**: Selling used generic sports equipment

### Form Input
```
Item Title:        Running Treadmill
Category:          Sports & Outdoor
Condition:         Good
Original Price:    ₹45,000
Purchase Date:     12 months ago
```

### Pricing Calculation
```
Base Price:                  ₹45,000
├─ Condition (Good):         × 0.68  = ₹30,600
├─ Age (12 months):          × 0.71  = ₹21,726
├─ Brand Premium (None):     × 1.0   = ₹21,726
├─ Category Demand:          × 1.0   = ₹21,726
└─ Rounded to ₹50:                    ≈ ₹21,750
```

### Suggested Box Display
```
💡 Smart Pricing Suggestion

┌─────────────────────────────────────┐
│ Suggested Price:    ₹21,750         │
│ Value Retained:     48% of original  │
│ Recommended Range:  ₹19,600 - ₹23,900
│                                     │
│ 📅 Age: 12 month(s)                 │
│ 🏷️ Condition: good                  │
│ ⭐ Confidence: 100%                  │
│                                     │
│ [Use Suggested Price]               │
└─────────────────────────────────────┘
```

### Analysis
- No brand premium = neutral multiplier
- 12 months at 3% per month = 29% retention
- Reasonable middle-ground pricing

---

## Comparison Chart: Same Item, Different Conditions

### Item: iPhone 12 Pro (Purchased 6 months ago)

| Condition | Multiplier | Suggested Price | % of Original |
|-----------|-----------|-----------------|--------------|
| New | 0.95 | ₹59,900 | 80% |
| Like New | 0.82 | ₹51,650 | 69% |
| Good | 0.68 | ₹42,880 | 57% |
| Fair | 0.48 | ₹30,240 | 40% |
| Poor | 0.28 | ₹17,640 | 24% |

**Insight**: Condition difference of one level = ~10-15% price difference

---

## Comparison Chart: Same Item, Different Ages

### Item: Samsung 55" TV (Like New Condition)

| Age | Depreciation | Suggested Price | % of Original |
|-----|-------------|-----------------|--------------|
| 0 months | 1.0 | ₹20,500 | 82% |
| 6 months | 0.64 | ₹13,100 | 52% |
| 12 months | 0.41 | ₹8,410 | 34% |
| 18 months | 0.26 | ₹5,330 | 21% |
| 24 months | 0.17 | ₹3,485 | 14% |

**Insight**: Electronics lose ~60% value in first year

---

## Premium vs Non-Premium Brand: Impact

### Same Item (Electronics, Good, 6 months old)

| Brand | Multiplier | Price (₹5,000 original) | Benefit |
|-------|-----------|------------------------|---------|
| Apple | 1.15 | ₹2,431 | +15% more value |
| Generic | 1.0 | ₹2,115 | baseline |
| Difference | | **₹316 (15%)** | Premium value |

**Impact**: Premium brand recognition adds ~15% to resale value

---

## When to Override the Suggestion

### Price HIGHER Than Suggested
✅ **Do this if:**
- Item is trending (limited availability)
- Unique color/variant highly sought
- New model release (older model premium)
- Seasonal demand spike

❌ **Don't do this if:**
- Duplicate items available cheaper
- Generic brand/model
- Oversupply in market

### Price LOWER Than Suggested
✅ **Do this if:**
- Need quick sale
- Buyer pool is limited
- Lots of similar items available
- Outdated model

❌ **Don't do this if:**
- Item is unique/rare
- Premium brand with high demand
- Recently released model

---

## Testing Your Own Prices

Use this checklist when pricing:

1. ✅ Enter original price (required)
2. ✅ Select category carefully
3. ✅ Rate condition honestly
4. ✅ Enter purchase date if known
5. ✅ Review suggested price
6. ✅ Compare to recommended range
7. ✅ Check confidence score
8. ✅ Decide: Accept, Adjust, or Override

---

## Pro Tips

### Tip 1: Build Complete Profile
```
Result: ₹25,000 (from incomplete data)
With purchase date → ₹24,500 (more precise)
With brand → ₹27,900 (if premium)
Confidence: 100%
```

### Tip 2: Honest Condition = Better Sales
- Pricing based on TRUE condition
- Photos must match description
- Better condition = faster sales

### Tip 3: Category Matters
```
Same shoe:
- Fashion category (1.1x) → ₹14,400
- Other category (0.8x) → ₹10,500

Difference: ₹3,900 (37%!)
```

### Tip 4: Time Your Listing
```
Laptop on release day of new model:
- Old model loses 20-30% value instantly
- Better to list before new release
```

### Tip 5: Monitor Feedback
- If no buyers at suggested price
- Lower by ₹500-1,000
- Watch response rate

---

## Quick Calculator

Use this formula for quick mental math:

```
Quick Estimate = Original Price × 0.5 to 0.7

Examples:
- ₹10,000 laptop → ₹5,000-7,000 range
- ₹1,000 book → ₹500-700 range
- ₹50,000 phone → ₹25,000-35,000 range

(This is rough; use actual calculator for precise values)
```

---

## Troubleshooting Pricing Issues

### "Suggestion is too low"
- Check condition rating (be realistic)
- Verify category (affects demand multiplier)
- Consider age of item
- Premium brand might help

### "Suggestion is too high"
- Item might be older than thought
- Condition might be worse than perceived
- Category demand lower than expected
- Check if similar items selling lower

### "No suggestion appears"
- Enter original price (required)
- Select both category and condition
- Verify fields have valid values
- Refresh page if needed

### "Confidence is low (< 85%)"
- Add purchase date for +15%
- Add original price for +15%
- Select correct category
- Fill in all available fields

---

## Next Steps

1. **Try it out** - List a sample item
2. **Review suggestion** - Does it seem fair?
3. **Check range** - Set price within ±10%
4. **Monitor feedback** - Track interest at your price
5. **Adjust if needed** - Lower for faster sales

Good luck with your resale! 🎉