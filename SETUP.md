# Setup Instructions for LedgerPro SaaS

## Prerequisites

Before you begin, ensure you have the following installed:
- **Python 3.9+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - Already installed ✅
- **PostgreSQL** - Using Neon (cloud) ✅

## Phase 1 Setup - Foundation & Authentication

### 1. Backend Setup

1. **Navigate to backend folder**:
   ```bash
   cd backend
   ```

2. **Create Python virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Mac/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the backend server**:
   ```bash
   python run.py
   ```

6. **Verify backend is running**:
   - Open browser: http://localhost:8000
   - API docs: http://localhost:8000/docs

### 2. Frontend Setup

1. **Navigate to frontend folder** (in a new terminal):
   ```bash
   cd frontend
   ```

2. **Dependencies already installed** ✅

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Verify frontend is running**:
   - Open browser: http://localhost:5173

## Test the Application

### 1. Register a New Account

1. Go to http://localhost:5173
2. Click "Sign up"
3. Follow the 6-step registration:
   - **Step 1**: Choose Single Entry or Double Entry (LOCKED FOREVER!)
   - **Step 2**: Enter company information
   - **Step 3**: Create admin user
   - **Step 4**: Set preferences (currency, fiscal year)
   - **Step 5**: Select a plan
   - **Step 6**: Review and create account

### 2. Login

1. Use the admin email and password you created
2. You'll be redirected to the dashboard
3. The dashboard shows your accounting type and basic info

### 3. Test Different Accounting Types

Create two accounts to see the difference:
1. One with **Single Entry** (green theme)
2. One with **Double Entry** (blue theme)

Note: The accounting type is LOCKED and cannot be changed!

## Database

The database is already configured using Neon (PostgreSQL cloud):
- Connection string is in `.env` file
- Tables are created automatically when you run the backend
- Database schema:
  - `tenants` - Company/tenant information
  - `users` - User accounts
  - `subscriptions` - Subscription plans
  - `payments` - Payment records

## Environment Variables

### Backend (.env in root)
```env
DATABASE_URI=postgresql://...
SECRET_KEY=your-secret-key-here
```

### Frontend (.env in frontend/)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Troubleshooting

### Backend not starting?
- Make sure Python is installed: `python --version`
- Activate virtual environment first
- Check if port 8000 is available

### Frontend not starting?
- Make sure Node.js is installed: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 5173 is available

### Database connection error?
- Check internet connection (Neon is cloud-based)
- Verify DATABASE_URI in `.env` is correct

## Next Steps

Now that Phase 1 is complete, you can:
1. Test registration and login
2. Verify JWT authentication works
3. Check that accounting type is locked
4. Move to Phase 2: Single Entry MVP

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new tenant
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

For detailed API documentation, visit http://localhost:8000/docs when backend is running.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT
- **State Management**: Zustand
- **HTTP Client**: Axios
