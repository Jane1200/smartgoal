# SmartGoal - Main Functionality Overview

## 🎯 Core Purpose
SmartGoal is a **goal-setting and financial planning platform** that helps users achieve their financial goals by combining:
- Smart goal planning with AI-powered insights
- Local marketplace for reselling unused items
- Automated savings allocation (50/30/20 rule)
- ML-powered price prediction and buyer-seller matching

---

## 📁 Main Functionality Code Structure

### 1. **Goal Management System** 🎯
**Purpose:** Create, track, and manage financial goals

**Key Files:**
- `server/src/models/Goal.js` - Goal data model
- `server/src/routes/goals.js` - Goal CRUD operations
- `client/src/pages/dashboard/Goals.jsx` - Goals UI
- `client/src/sections/GoalsManager.jsx` - Goal management component

**Features:**
- Create goals with target amount, due date, category, priority
- Auto-suggested goals (emergency fund, etc.)
- Track progress with dynamic currentAmount calculation
- 50/30/20 rule integration (20% savings allocation)
- Goal categories: emergency_fund, debt_repayment, education, investment, etc.
- Priority system (1=Critical to 5=Very Low)
- Auto-transfer scheduling (weekly, biweekly, monthly)
- Link goals to wishlist items

---

### 2. **Marketplace System** 🛒
**Purpose:** Local resale marketplace to convert unused items into cash

**Key Files:**
- `server/src/models/Marketplace.js` - Marketplace listing model
- `server/src/routes/marketplace.js` - Marketplace CRUD operations
- `client/src/pages/dashboard/Marketplace.jsx` - Seller marketplace UI
- `client/src/pages/dashboard/BuyerMarketplace.jsx` - Buyer marketplace UI

**Features:**
- Create listings with images, price, category, condition
- Image upload (multer, up to 10MB per image)
- Search and filter by category, price range, location
- Featured items system
- View tracking and likes
- Status management (active, sold, pending, archived)
- Location-based listings (city, state, country)
- Contact information management
- Auto-track marketplace income to goals

---

### 3. **Wishlist System** ❤️
**Purpose:** Save items users want to purchase, convert to goals

**Key Files:**
- `server/src/models/Wishlist.js` - Wishlist model
- `server/src/routes/wishlist.js` - Wishlist operations
- `client/src/pages/dashboard/Wishlist.jsx` - Wishlist UI
- `client/src/components/WishlistScraper.jsx` - URL scraping component

**Features:**
- Add items from URLs (scrapes product info)
- Manual wishlist entry
- Convert wishlist items to goals
- Track prices and availability
- Phishing URL detection (Naïve Bayes classifier)

---

### 4. **Financial Management** 💰
**Purpose:** Track income, expenses, and savings allocation

**Key Files:**
- `server/src/models/Finance.js` - Finance transaction model
- `server/src/routes/finance.js` - Finance operations
- `client/src/pages/dashboard/Finances.jsx` - Finance UI
- `server/src/utils/financeUtils.js` - Financial calculations

**Features:**
- Track income and expenses
- 50/30/20 rule: 50% needs, 30% wants, 20% savings/goals
- Monthly/yearly financial summaries
- Automatic savings calculation
- Goal allocation preferences
- Marketplace income tracking
- Auto-transfer to goals

---

### 5. **ML-Powered Features** 🤖

#### A. **KNN Price Prediction**
**Purpose:** Suggest optimal selling prices for marketplace items

**Key Files:**
- `server/python-ml/knn_pricing.py` - KNN price prediction model
- `server/python-ml/app.py` - Flask API endpoints
- `server/src/routes/ml-pricing.js` - Node.js proxy routes
- `client/src/components/MatchedSellers.jsx` - UI component

**Features:**
- Predict optimal price based on similar products
- Location-aware pricing
- Category, condition, brand, age factors
- Confidence scoring
- Real-time predictions (< 500ms)

#### B. **KNN Buyer-Seller Matching**
**Purpose:** Match buyers with nearby sellers based on preferences

**Key Files:**
- `server/python-ml/buyer_seller_matching.py` - Matching algorithm
- `server/src/routes/ml-pricing.js` - Match endpoint
- `client/src/components/MatchedSellers.jsx` - Match display

**Features:**
- Distance-based matching (Haversine formula)
- Budget range matching
- Category and condition preferences
- Match score calculation
- Real-time recommendations

#### C. **Phishing URL Detection**
**Purpose:** Detect suspicious/fake links in wishlist URLs

**Key Files:**
- `server/python-ml/phishing_nb.py` - Naïve Bayes classifier
- `server/src/routes/ml-phishing.js` - Phishing detection routes

**Features:**
- Character n-gram TF-IDF + MultinomialNB
- Train with labeled samples
- Predict phishing probability
- Suspicion score (0-1)

---

### 6. **Shopping Cart & Orders** 🛍️
**Purpose:** E-commerce functionality for buyers

**Key Files:**
- `server/src/models/Cart.js` - Cart model
- `server/src/models/Order.js` - Order model
- `server/src/routes/cart.js` - Cart operations
- `server/src/routes/orders.js` - Order management
- `client/src/pages/dashboard/Cart.jsx` - Cart UI
- `client/src/pages/dashboard/Checkout.jsx` - Checkout UI
- `client/src/pages/dashboard/Orders.jsx` - Orders UI

**Features:**
- Add items to cart
- Update quantities
- Checkout process
- Order tracking
- Order history

---

### 7. **Connections System** 🤝
**Purpose:** Connect buyers and sellers, manage relationships

**Key Files:**
- `server/src/models/Connection.js` - Connection model
- `server/src/routes/connections.js` - Connection operations
- `client/src/pages/dashboard/Connections.jsx` - Connections UI

**Features:**
- Send/receive connection requests
- Accept/reject connections
- View connected users
- Manage seller-buyer relationships

---

### 8. **Analytics & Reporting** 📊
**Purpose:** Track progress, insights, and performance

**Key Files:**
- `server/src/routes/analytics.js` - Analytics endpoints
- `client/src/pages/dashboard/Analytics.jsx` - User analytics
- `client/src/pages/dashboard/BuyerAnalytics.jsx` - Buyer analytics
- `client/src/pages/admin/SystemAnalytics.jsx` - Admin analytics

**Features:**
- Goal progress tracking
- Financial summaries
- Marketplace performance
- Spending patterns
- Savings trends
- Admin system-wide analytics

---

### 9. **Notifications System** 🔔
**Purpose:** Real-time notifications for user actions

**Key Files:**
- `server/src/models/Notification.js` - Notification model
- `server/src/routes/notifications.js` - Notification operations
- `client/src/pages/dashboard/Notifications.jsx` - Notifications UI
- `client/src/components/NotificationCenter.jsx` - Notification component

**Features:**
- Goal milestones
- Marketplace interactions
- Connection requests
- Order updates
- Financial alerts

---

### 10. **User Management & Authentication** 👤
**Purpose:** User accounts, roles, and authentication

**Key Files:**
- `server/src/models/User.js` - User model
- `server/src/routes/auth.js` - Authentication routes
- `server/src/routes/profile.js` - Profile management
- `client/src/context/AuthContext.jsx` - Auth context
- `client/src/pages/auth/*.jsx` - Auth pages

**Features:**
- User registration/login
- Role-based access (User, Buyer, Admin)
- JWT authentication
- Firebase integration
- Profile management
- Email verification

---

### 11. **Admin Dashboard** 👨‍💼
**Purpose:** System administration and oversight

**Key Files:**
- `server/src/routes/admin.js` - Admin routes
- `client/src/pages/admin/*.jsx` - Admin pages

**Features:**
- User management
- All goals overview
- Marketplace control
- Financial overview
- System analytics
- Content moderation

---

## 🔧 Technical Architecture

### **Backend (Node.js/Express)**
- **Port:** 5000
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT + Firebase
- **File Upload:** Multer
- **Location:** `server/src/`

### **Frontend (React/Vite)**
- **Port:** 5173
- **Framework:** React Router v6
- **Styling:** SCSS + Bootstrap
- **State:** Context API
- **Location:** `client/src/`

### **ML Service (Python/Flask)**
- **Port:** 5001
- **Framework:** Flask
- **ML Libraries:** scikit-learn, numpy, pandas
- **Location:** `server/python-ml/`

---

## 🎯 Key Workflows

### **Goal Achievement Workflow:**
1. User creates a financial goal
2. System suggests optimal savings allocation (50/30/20)
3. User lists items on marketplace
4. ML suggests optimal prices
5. Items sell → income tracked
6. Auto-transfer to goal (if configured)
7. Goal progress updates automatically
8. User achieves goal!

### **Buyer Shopping Workflow:**
1. Buyer browses marketplace
2. ML matches buyer with nearby sellers
3. Buyer adds items to cart
4. Checkout process
5. Order created
6. Connection established with seller
7. Order tracking

### **Wishlist to Goal Workflow:**
1. User adds item to wishlist (URL or manual)
2. Phishing detection checks URL safety
3. System scrapes product info
4. User converts wishlist item to goal
5. Goal created with target amount = product price
6. User works toward goal

---

## 📊 Data Models Summary

| Model | Purpose |
|-------|---------|
| `User` | User accounts, roles, profiles |
| `Goal` | Financial goals and progress |
| `Marketplace` | Product listings |
| `Wishlist` | Saved items for future purchase |
| `Finance` | Income/expense transactions |
| `Cart` | Shopping cart items |
| `Order` | Purchase orders |
| `Connection` | Buyer-seller relationships |
| `Notification` | User notifications |
| `AutoTransfer` | Automated goal transfers |
| `MarketplaceIncome` | Marketplace earnings tracking |

---

## 🚀 Main Entry Points

### **Frontend:**
- `client/src/main.jsx` - React app entry
- `client/src/App.jsx` - Main routing

### **Backend:**
- `server/src/server.js` - Express server entry
- `server/src/routes/*.js` - API route handlers

### **ML Service:**
- `server/python-ml/app.py` - Flask API server

---

## 🎨 Key UI Components

- `GoalsManager` - Goal CRUD operations
- `WishlistScraper` - URL scraping for wishlist
- `MatchedSellers` - ML-powered seller matching
- `MarketplacePreview` - Featured marketplace items
- `NotificationCenter` - Real-time notifications
- `TrustBadge` - User trust indicators
- `ConditionExplainer` - Product condition guide

---

## 🔐 Security Features

- JWT authentication
- Role-based access control (RBAC)
- Phishing URL detection
- Input validation
- File upload restrictions
- Email verification
- Password reset

---

## 📈 Performance Features

- MongoDB indexing
- ML model caching
- Image optimization
- Lazy loading
- Real-time updates
- Efficient queries

---

This is the **complete functionality overview** of SmartGoal. The platform combines goal planning, marketplace resale, ML-powered insights, and financial management into one cohesive system.



