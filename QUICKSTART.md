# 🚀 Quick Start Guide - LedgerPro SaaS

## ✅ Phase 1 Complete!

All database tables are created and both servers are running!

---

## 🎯 Current Status

### Backend Server
- **Status**: ✅ Running
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Frontend Server
- **Status**: ✅ Running
- **URL**: http://localhost:5174
- **Framework**: React + TypeScript + Vite

### Database
- **Status**: ✅ Connected
- **Provider**: PostgreSQL (Neon Cloud)
- **Tables Created**: 4/4
  - ✅ tenants
  - ✅ users
  - ✅ subscriptions
  - ✅ payments

---

## 🧪 Test Your Application

### Step 1: Open the App
Open your browser and go to: **http://localhost:5174**

### Step 2: Create Your First Account

1. Click **"Sign up"**
2. **Step 1**: Choose accounting type
   - 📗 **Single Entry** (simple income/expense)
   - 📘 **Double Entry** (professional accounting)
   - ⚠️ **WARNING**: This choice is PERMANENT!

3. **Step 2**: Enter company details
   - Company Name: "My Test Company"
   - Email: test@example.com
   - Phone: (optional)

4. **Step 3**: Create admin user
   - Your Name: "John Doe"
   - Your Email: admin@example.com
   - Password: (minimum 8 characters)

5. **Step 4**: Set preferences
   - Currency: USD
   - Fiscal Year Start: (pick a date)
   - Timezone: UTC

6. **Step 5**: Choose a plan
   - **Single Entry**: Free / Basic ($5) / Pro ($12)
   - **Double Entry**: Starter ($15) / Business ($35) / Enterprise ($75)
   - 💡 Free plan: Permanent access
   - 💡 Paid plans: 14-day trial (no payment needed now)

7. **Step 6**: Review and confirm
   - Check all details
   - Click **"Create Account"**

8. **Success!** You'll be logged in automatically

### Step 3: Test Login/Logout

1. Click **"Logout"** in the dashboard
2. Login again with your email and password
3. See your personalized dashboard

---

## 🛠️ Running the Servers

### Backend (Terminal 1)
```bash
cd backend
py run.py
```

### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

---

## 📊 What You Can Do Now

✅ **Register** new tenants (companies)
✅ **Login** with email and password
✅ **View dashboard** (different for Single vs Double Entry)
✅ **Test trial period** (14 days for paid plans)
✅ **Multi-tenant isolation** (each company is separate)

❌ **Not Yet Built** (Phase 2+):
- Income/Expense tracking
- Reports
- Payment processing
- Owner panel

---

## 🔍 API Documentation

Visit http://localhost:8000/docs to see all available endpoints:

- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

---

## 🐛 Troubleshooting

### Backend won't start?
- Check if Python is installed: `py --version`
- Check if dependencies are installed: `cd backend && py -m pip list`
- Check if port 8000 is free

### Frontend won't start?
- Check if Node.js is installed: `node --version`
- Try: `cd frontend && npm install`
- Check if port 5173/5174 is free

### Can't connect to database?
- Check internet connection (Neon is cloud-based)
- Verify `.env` file has correct DATABASE_URI

### Database tables not showing?
- Run: `cd backend && py check_db.py`

---

## 📁 Project Structure

```
ledgerpro-saas/
├── backend/
│   ├── app/
│   │   ├── api/v1/auth.py      # Auth endpoints
│   │   ├── models/auth.py      # DB models
│   │   ├── schemas/auth.py     # Pydantic schemas
│   │   ├── core/security.py    # JWT & passwords
│   │   └── main.py             # FastAPI app
│   ├── check_db.py             # DB checker script
│   └── run.py                  # Dev server
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   └── DashboardPage.tsx
│       ├── store/authStore.ts  # Auth state
│       └── services/api.ts     # API client
└── .env                        # Environment variables
```

---

## ✨ Features Implemented

### 🔐 Authentication
- JWT tokens (access + refresh)
- Secure password hashing (bcrypt)
- Email validation
- Protected routes

### 🏢 Multi-Tenancy
- Separate companies (tenants)
- User roles (admin/accountant/viewer)
- Tenant isolation
- Accounting type locked per tenant

### 💳 Subscription System
- Multiple plans
- Trial periods (14 days)
- Free tier
- Status tracking

### 🎨 Beautiful UI
- Modern gradient design
- 6-step registration wizard
- Responsive layout
- Loading states & error handling

---

## 🎯 Next: Phase 2

Ready to build the actual accounting features?

**Phase 2 - Single Entry MVP**:
- Add income/expense transactions
- Money accounts (Cash, Bank)
- Categories
- Basic reports

Want to start? Ask me to begin Phase 2!

---

**Created**: December 6, 2025
**Status**: Phase 1 COMPLETE ✅
**Next**: Phase 2 - Single Entry MVP
