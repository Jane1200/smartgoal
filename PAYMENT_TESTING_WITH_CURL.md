# Payment Models - Testing with cURL

## Setup

```bash
# Replace with your actual values
TOKEN="your_jwt_token_here"
USER_ID="your_user_id_here"
ORDER_ID="order_id_from_checkout"
BASE_URL="http://localhost:5000"
```

---

## 1. Full Payment Test

### Step 1: Create Order with Full Payment
```bash
curl -X POST "$BASE_URL/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlan": "full",
    "shippingAddress": {
      "fullName": "John Doe",
      "phone": "9876543210",
      "addressLine1": "123 Main Street",
      "addressLine2": "Apt 4B",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Order placed successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "orderId": "ORD-ABC123",
    "totalAmount": 5000,
    "status": "confirmed",
    "paymentMethod": "cod"
  },
  "paymentPlan": {
    "id": "507f1f77bcf86cd799439012",
    "type": "full",
    "details": {
      "status": "completed",
      "totalPaid": 5000,
      "pendingAmount": 0
    }
  }
}
```

### Step 2: Verify Finance Record Created
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Should show ₹5000 deducted as expense

---

## 2. EMI Payment Test (3 Months)

### Step 1: Create Order with 3-Month EMI
```bash
curl -X POST "$BASE_URL/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlan": "emi",
    "emiMonths": 3,
    "shippingAddress": {
      "fullName": "Jane Doe",
      "phone": "9876543210",
      "addressLine1": "456 Oak Avenue",
      "addressLine2": "Suite 200",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Order placed successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439013",
    "orderId": "ORD-DEF456",
    "totalAmount": 6000,
    "status": "confirmed"
  },
  "paymentPlan": {
    "id": "507f1f77bcf86cd799439014",
    "type": "emi",
    "details": {
      "planType": "emi",
      "totalAmount": 6000,
      "emiDetails": {
        "numberOfMonths": 3,
        "monthlyAmount": 2000
      },
      "installments": [
        {
          "installmentNumber": 1,
          "amount": 2000,
          "dueDate": "2024-02-15",
          "status": "pending"
        },
        {
          "installmentNumber": 2,
          "amount": 2000,
          "dueDate": "2024-03-15",
          "status": "pending"
        },
        {
          "installmentNumber": 3,
          "amount": 2000,
          "dueDate": "2024-04-15",
          "status": "pending"
        }
      ],
      "status": "active"
    }
  }
}
```

### Step 2: Record First EMI Payment
```bash
ORDER_ID="507f1f77bcf86cd799439013"

curl -X POST "$BASE_URL/orders/$ORDER_ID/pay-emi-installment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "installmentNumber": 1,
    "transactionId": "TXN001_EMI1",
    "paymentMethod": "upi"
  }'
```

**Expected Response:**
```json
{
  "message": "EMI installment 1 paid successfully",
  "paymentPlan": {
    "totalPaid": 2000,
    "pendingAmount": 4000,
    "status": "active",
    "installments": [
      {
        "installmentNumber": 1,
        "amount": 2000,
        "status": "paid",
        "paidDate": "2024-01-15T10:30:00Z"
      },
      {
        "installmentNumber": 2,
        "amount": 2000,
        "status": "pending"
      },
      {
        "installmentNumber": 3,
        "amount": 2000,
        "status": "pending"
      }
    ]
  },
  "financeRecordId": "507f1f77bcf86cd799439015"
}
```

### Step 3: Verify Finance Record Created
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Should show ₹2000 deducted as expense

### Step 4: Record Second EMI Payment
```bash
curl -X POST "$BASE_URL/orders/$ORDER_ID/pay-emi-installment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "installmentNumber": 2,
    "transactionId": "TXN002_EMI2",
    "paymentMethod": "upi"
  }'
```

**Expected:** Another ₹2000 deducted

### Step 5: Record Third EMI Payment
```bash
curl -X POST "$BASE_URL/orders/$ORDER_ID/pay-emi-installment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "installmentNumber": 3,
    "transactionId": "TXN003_EMI3",
    "paymentMethod": "upi"
  }'
```

**Expected Response:**
```json
{
  "message": "EMI installment 3 paid successfully",
  "paymentPlan": {
    "totalPaid": 6000,
    "pendingAmount": 0,
    "status": "completed",
    "installments": [
      {
        "installmentNumber": 1,
        "status": "paid"
      },
      {
        "installmentNumber": 2,
        "status": "paid"
      },
      {
        "installmentNumber": 3,
        "status": "paid"
      }
    ]
  }
}
```

### Step 6: Verify Total Deductions
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Should show total ₹6000 deducted (3 × ₹2000)

### Step 7: Check Payment Plan Details
```bash
curl -X GET "$BASE_URL/orders/$ORDER_ID/payment-plan" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
```json
{
  "summary": {
    "planType": "emi",
    "totalAmount": 6000,
    "totalPaid": 6000,
    "pendingAmount": 0,
    "status": "completed",
    "installments": {
      "total": 3,
      "paid": 3,
      "pending": 0
    }
  }
}
```

---

## 3. BNPL Test (Buy Now, Pay Later)

### Step 1: Create Order with BNPL
```bash
curl -X POST "$BASE_URL/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlan": "bnpl",
    "shippingAddress": {
      "fullName": "Priya Singh",
      "phone": "9876543210",
      "addressLine1": "789 Park Lane",
      "addressLine2": "Building A",
      "city": "Bangalore",
      "state": "Karnataka",
      "pincode": "560001",
      "country": "India"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Order placed successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439016",
    "orderId": "ORD-GHI789",
    "totalAmount": 8000,
    "status": "confirmed"
  },
  "paymentPlan": {
    "id": "507f1f77bcf86cd799439017",
    "type": "bnpl",
    "details": {
      "planType": "bnpl",
      "totalAmount": 8000,
      "bnplDetails": {
        "paymentDueDate": "2024-02-15",
        "deliveryDate": "2024-02-01"
      },
      "status": "active",
      "totalPaid": 0,
      "pendingAmount": 8000
    }
  }
}
```

### Step 2: Verify No Finance Record Yet
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Should NOT show this ₹8000 yet

### Step 3: Get Payment Plan Details (Before Delivery)
```bash
ORDER_ID="507f1f77bcf86cd799439016"

curl -X GET "$BASE_URL/orders/$ORDER_ID/payment-plan" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
```json
{
  "summary": {
    "planType": "bnpl",
    "totalAmount": 8000,
    "totalPaid": 0,
    "pendingAmount": 8000,
    "status": "active",
    "installments": {
      "paymentDueDate": "2024-02-15T00:00:00Z",
      "deliveryDate": "2024-02-01T00:00:00Z",
      "status": "pending"
    }
  }
}
```

### Step 4: Confirm Delivery & Trigger Deduction
```bash
curl -X POST "$BASE_URL/orders/$ORDER_ID/confirm-bnpl-payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "message": "BNPL payment confirmed and deducted successfully",
  "paymentPlan": {
    "totalPaid": 8000,
    "pendingAmount": 0,
    "status": "completed",
    "installments": [
      {
        "installmentNumber": 1,
        "amount": 8000,
        "status": "paid",
        "paidDate": "2024-01-20T10:30:00Z"
      }
    ]
  },
  "financeRecordId": "507f1f77bcf86cd799439018"
}
```

### Step 5: Verify Finance Record Created
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Should now show ₹8000 deducted as expense

---

## 4. Get Purchase Expenses Summary

```bash
curl -X GET "$BASE_URL/orders/expenses/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "expenses": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "buyerId": "507f1f77bcf86cd799439000",
      "orderId": "507f1f77bcf86cd799439016",
      "totalAmount": 8000,
      "paymentStatus": "completed",
      "status": "completed",
      "deductionDetails": {
        "deducted_amount": 8000,
        "remainingAmount": 0
      }
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "buyerId": "507f1f77bcf86cd799439000",
      "orderId": "507f1f77bcf86cd799439013",
      "totalAmount": 6000,
      "paymentStatus": "completed",
      "status": "completed",
      "deductionDetails": {
        "deducted_amount": 6000,
        "remainingAmount": 0
      }
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "buyerId": "507f1f77bcf86cd799439000",
      "orderId": "507f1f77bcf86cd799439011",
      "totalAmount": 5000,
      "paymentStatus": "completed",
      "status": "completed",
      "deductionDetails": {
        "deducted_amount": 5000,
        "remainingAmount": 0
      }
    }
  ],
  "summary": {
    "totalExpenses": 19000,
    "totalDeducted": 19000,
    "totalRemaining": 0,
    "completedPurchases": 3,
    "activePurchases": 0
  }
}
```

---

## 5. Dual-Role Test (Seller + Buyer)

### Step 1: User Sells Item for ₹10,000
```bash
# This creates income
# Finance: +₹10,000 (income, source="business")
# User balance: ₹10,000
```

### Step 2: User Buys Item for ₹6,000 with Full Payment
```bash
curl -X POST "$BASE_URL/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlan": "full",
    "shippingAddress": {
      "fullName": "Test User",
      "phone": "9876543210",
      "addressLine1": "123 Test Street",
      "city": "Test City",
      "state": "Test State",
      "pincode": "123456"
    }
  }'
```

### Step 3: Check Net Balance
```bash
curl -X GET "$BASE_URL/finance/summary" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- Income: ₹10,000
- Expenses: ₹6,000
- Net Balance: ₹4,000

---

## 6. Error Testing

### Test 1: Invalid EMI Months
```bash
curl -X POST "$BASE_URL/orders/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlan": "emi",
    "emiMonths": 5,
    "shippingAddress": { ... }
  }'
```

**Note:** Currently accepts any months value. Consider adding validation for 3, 6, 12 only.

### Test 2: Pay Already Paid Installment
```bash
ORDER_ID="507f1f77bcf86cd799439013"

# After paying installment 1, try to pay again
curl -X POST "$BASE_URL/orders/$ORDER_ID/pay-emi-installment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "installmentNumber": 1,
    "transactionId": "TXN001_DUPLICATE",
    "paymentMethod": "upi"
  }'
```

**Expected Response:**
```json
{
  "message": "This installment has already been paid"
}
```

### Test 3: Confirm BNPL Twice
```bash
ORDER_ID="507f1f77bcf86cd799439016"

# After confirming once, try again
curl -X POST "$BASE_URL/orders/$ORDER_ID/confirm-bnpl-payment" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "message": "This installment has already been paid"
}
```

### Test 4: Get Payment Plan for Non-Existent Order
```bash
curl -X GET "$BASE_URL/orders/507f1f77bcf86cd799999999/payment-plan" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Payment plan not found"
}
```

---

## 7. PowerShell Version (Windows)

### Full Payment in PowerShell
```powershell
$token = "your_jwt_token"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    paymentMethod = "cod"
    paymentPlan = "full"
    shippingAddress = @{
        fullName = "John Doe"
        phone = "9876543210"
        addressLine1 = "123 Main Street"
        city = "Mumbai"
        state = "Maharashtra"
        pincode = "400001"
        country = "India"
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/orders/checkout" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json -Depth 10
```

### EMI Payment in PowerShell
```powershell
$orderId = "507f1f77bcf86cd799439013"
$token = "your_jwt_token"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    installmentNumber = 1
    transactionId = "TXN001_EMI1"
    paymentMethod = "upi"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/orders/$orderId/pay-emi-installment" `
    -Method Post `
    -Headers $headers `
    -Body $body

$response | ConvertTo-Json -Depth 10
```

### BNPL Confirmation in PowerShell
```powershell
$orderId = "507f1f77bcf86cd799439016"
$token = "your_jwt_token"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://localhost:5000/orders/$orderId/confirm-bnpl-payment" `
    -Method Post `
    -Headers $headers `
    -Body '{}'

$response | ConvertTo-Json -Depth 10
```

---

## 8. Testing Checklist

- [ ] Full Payment: Create order, verify Finance record created
- [ ] Full Payment: Check balance deducted immediately
- [ ] EMI: Create order, verify no Finance record yet
- [ ] EMI: Pay installment 1, verify Finance record
- [ ] EMI: Pay installment 2, verify another Finance record
- [ ] EMI: Pay installment 3, verify PaymentPlan completed
- [ ] EMI: Check total deductions = ₹(total/3) × 3
- [ ] BNPL: Create order, verify no Finance record
- [ ] BNPL: Get details, verify pending status
- [ ] BNPL: Confirm payment, verify Finance created
- [ ] Summary: Verify total expenses calculation
- [ ] Dual-role: Sell item, buy item, check net balance
- [ ] Error: Try to pay already paid installment
- [ ] Error: Try to confirm BNPL twice
- [ ] Error: Get details for non-existent order

---

## Troubleshooting

**Issue: 401 Unauthorized**
- Solution: Check token is valid and not expired
- Use `Authorization: Bearer YOUR_TOKEN`

**Issue: 404 Order not found**
- Solution: Use correct ORDER_ID from checkout response
- Make sure you're getting the `_id` field from order

**Issue: Finance records not appearing**
- Solution: For Full/BNPL - check immediately after API call
- For EMI - only created after payment, not at checkout

**Issue: EMI calculation seems wrong**
- Solution: Amount ÷ months = monthly payment (rounded up)
- Example: 6000 ÷ 3 = 2000 per month

**Issue: BNPL not deducting after confirm call**
- Solution: Check confirm endpoint was called with correct ORDER_ID
- Verify response shows Finance record was created

---

## Performance Notes

- Full Payment: Fastest (1 Finance record created)
- EMI: Medium (1 Finance record per payment)
- BNPL: Moderate (1 Finance record on confirmation)
- Expense Summary: Aggregates all records (might be slow with many records)

Consider adding indexes on `Finance.userId` + `Finance.tags` for faster expense filtering.
