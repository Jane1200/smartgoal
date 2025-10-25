# Pincode Live Preview - Testing Guide

## Quick Start Testing

### Scenario 1: Happy Path (Valid Pincode)

**User Journey:**
```
1. User clicks "Update Location" button on BuyerGeoMatching page
   ↓
2. Modal opens with pincode input field
   ↓
3. User types: "1" → "11" → "110" → "1100" → "110001"
   ↓
4. After typing "110001" and pausing:
   - 500ms debounce delay passes
   - Loading spinner appears briefly
   - API call: GET /profile/lookup-pincode/110001
   - Response: { city: "Delhi", state: "Delhi", area: "New Delhi", ... }
   ↓
5. Green preview card appears:
   ┌────────────────────────────────┐
   │ 📍 Location Found:             │
   │ Delhi, Delhi                   │
   │ Area: New Delhi                │
   │ [✓ Valid Pincode]              │
   └────────────────────────────────┘
   ↓
6. "Update Pincode" button becomes ENABLED
   ↓
7. User clicks "Update Pincode"
   ↓
8. Backend saves: pincode=110001, city=Delhi, state=Delhi
   ↓
9. Toast: "Location updated successfully!"
   ↓
10. Modal closes
   ↓
11. Location card shows: "📍 110001 • Delhi, Delhi"
```

### Scenario 2: Invalid Pincode

**User Journey:**
```
1. User opens modal and types: "999999"
   ↓
2. After 500ms debounce, API call made
   ↓
3. Server responds with 404: "Pincode not found"
   ↓
4. Yellow warning appears:
   ⚠️ Pincode not found. Please check and try again.
   ↓
5. "Update Pincode" button remains DISABLED
   ↓
6. User cannot submit invalid pincode
```

### Scenario 3: User Changes Mind

**User Journey:**
```
1. User types valid pincode: "110001"
   ↓
2. Preview appears ✓
   ↓
3. User deletes all characters
   ↓
4. Preview card disappears
   ↓
5. Helper text returns: "Enter your postal code to get started"
   ↓
6. Button returns to DISABLED state
```

---

## Manual Test Cases

### Test 1: API Lookup Verification
**Objective:** Verify debouncing and API call only happens when pincode is complete

**Steps:**
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Open location modal
4. Type "1" → PAUSE 1 second
5. Type "1" → PAUSE 1 second
6. Type "0" → PAUSE 1 second
7. Type "0" → PAUSE 1 second
8. Type "0" → PAUSE 1 second
9. Type "1" → PAUSE 2 seconds (wait for API call)

**Expected Result:**
- No API calls during individual key presses
- ONE API call appears only after typing "110001" and waiting 500ms+
- Request URL: `/profile/lookup-pincode/110001`
- Request method: `GET`
- Response status: `200`
- Response body contains: `{"success": true, "city": "Delhi", ...}`

**Evidence:**
```
Network Tab shows:
├─ GET /profile/lookup-pincode/110001 [200]
│  ├─ Response size: ~220 bytes
│  ├─ Time: 45-80ms
│  └─ Payload: { success: true, pincode: "110001", city: "Delhi", ... }
```

---

### Test 2: All Valid Pincodes in Database
**Objective:** Verify all 30 pincodes show correct location data

**Steps for Each Pincode:**
1. Open modal
2. Type pincode
3. Verify preview appears with correct city/state/area
4. Close modal (press Escape or Cancel)

**Test Data:**

| Pincode | Expected City | Expected State | Expected Area | Status |
|---------|---------------|----------------|---------------|--------|
| 110001 | Delhi | Delhi | New Delhi | ✓ Test |
| 110002 | Delhi | Delhi | New Delhi | ✓ Test |
| 110003 | Delhi | Delhi | Kasturba Nagar | ✓ Test |
| 400001 | Mumbai | Maharashtra | Fort | ✓ Test |
| 400002 | Mumbai | Maharashtra | Colaba | ✓ Test |
| 400003 | Mumbai | Maharashtra | Fort | ✓ Test |
| 560001 | Bangalore | Karnataka | Residency Road | ✓ Test |
| 560002 | Bangalore | Karnataka | Shivajinagar | ✓ Test |
| 560003 | Bangalore | Karnataka | Chickpet | ✓ Test |
| 500001 | Hyderabad | Telangana | Secunderabad | ✓ Test |
| 500002 | Hyderabad | Telangana | Hyderabad | ✓ Test |
| 500003 | Hyderabad | Telangana | Kacheguda | ✓ Test |
| 411001 | Pune | Maharashtra | Camp | ✓ Test |
| 411002 | Pune | Maharashtra | Somwar Peth | ✓ Test |
| 411003 | Pune | Maharashtra | Shivajinagar | ✓ Test |
| 600001 | Chennai | Tamil Nadu | Georgetown | ✓ Test |
| 600002 | Chennai | Tamil Nadu | Parry's | ✓ Test |
| 600003 | Chennai | Tamil Nadu | Esplanade | ✓ Test |
| 700001 | Kolkata | West Bengal | Kolkata Town | ✓ Test |
| 700002 | Kolkata | West Bengal | Shyambazar | ✓ Test |
| 700003 | Kolkata | West Bengal | Machuabazar | ✓ Test |
| 380001 | Ahmedabad | Gujarat | Civil Lines | ✓ Test |
| 380002 | Ahmedabad | Gujarat | Bapunagar | ✓ Test |
| 380003 | Ahmedabad | Gujarat | Kalupur | ✓ Test |
| 302001 | Jaipur | Rajasthan | C Scheme | ✓ Test |
| 302002 | Jaipur | Rajasthan | Sansar Chand Marg | ✓ Test |
| 302003 | Jaipur | Rajasthan | Hospital Road | ✓ Test |
| 395001 | Surat | Gujarat | Station Road | ✓ Test |
| 395002 | Surat | Gujarat | Vesu | ✓ Test |
| 395003 | Surat | Gujarat | Katargam | ✓ Test |

**Testing Procedure:**
```javascript
// Use this in console to test programmatically
const testPincodes = [
  "110001", "110002", "110003",
  "400001", "400002", "400003",
  "560001", "560002", "560003",
  "500001", "500002", "500003",
  "411001", "411002", "411003",
  "600001", "600002", "600003",
  "700001", "700002", "700003",
  "380001", "380002", "380003",
  "302001", "302002", "302003",
  "395001", "395002", "395003"
];

for (const pincode of testPincodes) {
  const response = await fetch(`/profile/lookup-pincode/${pincode}`);
  const data = await response.json();
  console.log(`${pincode}: ${data.city}, ${data.state} - ${data.area}`);
}
```

---

### Test 3: Modal UI States
**Objective:** Verify modal displays correctly in all states

**State 1: Empty State**
- Modal open, input field empty
- Preview card: NOT visible
- Warning alert: NOT visible
- Button: DISABLED
- Helper text: "Enter your postal code to get started"

**State 2: Loading State**
- User typed 6-digit pincode
- Spinner visible in input (first 500ms)
- Preview card: NOT visible yet
- Helper text: "Looking up location..."
- Button: DISABLED

**State 3: Success State**
- API returned valid location
- Preview card: VISIBLE with green border
- Shows: 📍, city/state, area, badge
- Button: ENABLED
- Can click "Update Pincode"

**State 4: Error State**
- API returned 404
- Preview card: NOT visible
- Warning alert: VISIBLE (yellow)
- Helper text: "Pincode not found..."
- Button: DISABLED

---

### Test 4: Input Validation
**Objective:** Verify only 6-digit numbers are accepted

**Steps:**
1. Try typing letters: "ABC123" → Should show nothing (filtered)
2. Try typing special chars: "11-00-01" → Should show "110001" (non-digits removed)
3. Try pasting: "123" → Should accept if only 3 chars, wait for 6
4. Try exceeding 6: Type "1234567" → Should only show "123456"

**Expected Result:**
- Input field only accepts 0-9 characters
- Input field max length is 6
- Non-numeric characters automatically filtered
- Cannot paste more than 6 digits

---

### Test 5: Button States
**Objective:** Verify "Update Pincode" button enables/disables correctly

**Button Disabled When:**
- Input is empty
- Input has less than 6 digits
- API call is in progress (loading)
- Pincode not found in database
- Modal just opened (empty)

**Button Enabled When:**
- Exactly 6 digits entered
- Valid pincode found in database
- Preview card showing

**Test Steps:**
1. Open modal → Button: DISABLED ✓
2. Type "1" → Button: DISABLED ✓
3. Type "11001" → Button: DISABLED ✓
4. Type "110001" → Wait 500ms → Button: ENABLED ✓
5. Delete last digit → Button: DISABLED ✓
6. Re-enter digit → Wait 500ms → Button: ENABLED ✓
7. Type invalid "999999" → Button: DISABLED ✓

---

### Test 6: Mobile Responsiveness
**Objective:** Verify modal works on mobile/tablet screens

**Steps:**
1. Open DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Select iPhone 12 / iPad view
4. Open location modal
5. Type pincode
6. Verify preview card displays well
7. Verify button is clickable (not cut off)

**Expected Result:**
- Modal responsive on all screen sizes
- Input field and button readable
- Preview card not cut off
- Touch-friendly button size (>44px height)

---

### Test 7: Error Handling
**Objective:** Verify graceful handling of various error scenarios

**Scenario A: Network Error**
1. Disconnect internet
2. Open modal
3. Type "110001"
4. Wait for timeout

**Expected Result:**
- Preview doesn't show (no API response)
- Button remains disabled
- Check console for error message

**Scenario B: Server Error (500)**
1. Backend returns 500 error
2. Frontend should handle gracefully

**Expected Result:**
- Preview card doesn't show
- Warning message: "Pincode not found..."
- Button disabled
- No crash/error displayed to user

**Scenario C: Malformed Response**
1. Backend returns invalid JSON

**Expected Result:**
- Error caught in try-catch
- Preview doesn't show
- Button remains disabled

---

### Test 8: User Flow Integration
**Objective:** Verify complete user workflow from start to finish

**Full Workflow:**
```
1. Navigate to BuyerGeoMatching page
2. See current location OR "Set Location" message
3. Click "Update Location" button
4. Modal opens
5. Type pincode: "560001"
6. Wait for preview (Bangalore shown)
7. Click "Update Pincode"
8. Toast: "Location updated successfully!"
9. Modal closes
10. Location card updates to show: "📍 560001 • Bangalore, Karnataka"
11. Nearby goal setters refresh
12. See goal setters grouped by pincode (same/nearby/different)
```

**Expected Result:**
- Each step completes successfully
- No errors in console
- Location persists after page refresh
- Nearby goal setters updated with new location

---

## cURL Command Testing

### Test Endpoint Directly

**Valid Pincode:**
```bash
curl "http://localhost:5000/profile/lookup-pincode/110001"
```

**Response:**
```json
{
  "success": true,
  "pincode": "110001",
  "city": "Delhi",
  "state": "Delhi",
  "area": "New Delhi",
  "region": "delhi",
  "displayText": "Delhi, Delhi",
  "areaText": "New Delhi"
}
```

**Invalid Pincode:**
```bash
curl "http://localhost:5000/profile/lookup-pincode/999999"
```

**Response:**
```json
{
  "message": "Pincode not found in database. Please enter a valid pincode.",
  "pincode": "999999"
}
```

**Bad Format:**
```bash
curl "http://localhost:5000/profile/lookup-pincode/12345"
```

**Response:**
```json
{
  "message": "Pincode must be a 6-digit number"
}
```

---

## Performance Testing

### Load Testing
**Objective:** Verify API can handle multiple concurrent requests

```bash
# Using Apache Bench (if installed)
ab -n 100 -c 10 "http://localhost:5000/profile/lookup-pincode/110001"
```

**Expected Results:**
- Response time: <100ms per request
- No errors
- No memory leaks

### Network Monitoring
**Objective:** Verify minimal data transfer

**Check in DevTools → Network tab:**
- Request size: ~30 bytes
- Response size: ~200-250 bytes
- Response time: 50-100ms (local)

---

## Checklist

Before deployment, verify:

- [ ] All 30 pincodes return correct location data
- [ ] Debouncing works (only 1 API call per lookup)
- [ ] Loading spinner appears during lookup
- [ ] Green preview card shows for valid pincodes
- [ ] Yellow warning shows for invalid pincodes
- [ ] Button disabled/enabled states correct
- [ ] Modal can be closed without saving
- [ ] Location saves correctly when confirmed
- [ ] Location persists after page refresh
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] Works on mobile/tablet
- [ ] Works in all modern browsers

---

## Quick Reference: Test Pincodes

```
Delhi:     110001 ✓ 110002 ✓ 110003 ✓
Mumbai:    400001 ✓ 400002 ✓ 400003 ✓
Bangalore: 560001 ✓ 560002 ✓ 560003 ✓
Hyderabad: 500001 ✓ 500002 ✓ 500003 ✓
Pune:      411001 ✓ 411002 ✓ 411003 ✓
Chennai:   600001 ✓ 600002 ✓ 600003 ✓
Kolkata:   700001 ✓ 700002 ✓ 700003 ✓
Ahmedabad: 380001 ✓ 380002 ✓ 380003 ✓
Jaipur:    302001 ✓ 302002 ✓ 302003 ✓
Surat:     395001 ✓ 395002 ✓ 395003 ✓

Invalid:   999999 ✗ 123456 ✗ 000000 ✗
```