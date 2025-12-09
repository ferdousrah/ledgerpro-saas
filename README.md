# LedgerPro SaaS - Multi-Tenant Accounting Platform

A complete multi-tenant SaaS platform for accounting with both Single Entry and Double Entry accounting systems.

## Architecture

- **Frontend**: React + TypeScript
- **Backend**: Python FastAPI
- **Database**: PostgreSQL (Neon)
- **Auth**: JWT + OAuth2
- **Deployment**: TBD

## Project Structure

```
ledgerpro-saas/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Core utilities (security, etc.)
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── config.py     # Configuration
│   │   ├── database.py   # Database setup
│   │   └── main.py       # FastAPI app
│   ├── requirements.txt
│   └── run.py
├── frontend/             # React frontend (coming soon)
└── .env                  # Environment variables
```

## Setup Instructions

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   The `.env` file in root should contain:
   ```env
   DATABASE_URI=postgresql://...
   SECRET_KEY=your-secret-key-here
   ```

3. **Run the backend**:
   ```bash
   cd backend
   python run.py
   ```

4. **Access the API docs**:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new tenant
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

## Database Schema

### Tables (auth_db)

- **tenants** - Company/tenant information
- **users** - User accounts (multi-user per tenant)
- **subscriptions** - Subscription plans and status
- **payments** - Payment records

## Features

### Phase 1 - Foundation (CURRENT)
- [x] Project structure
- [x] Database models
- [x] Authentication API
- [ ] Frontend setup
- [ ] Registration flow
- [ ] Login page

### Phase 2 - Single Entry MVP
- [ ] Income/Expense tracking
- [ ] Money accounts
- [ ] Basic reports

### Phase 3 - Subscriptions
- [ ] Payment gateway integration
- [ ] Trial period management
- [ ] Plan upgrades

### Phase 4 - Owner Panel
- [ ] Tenant management
- [ ] Revenue analytics
- [ ] System settings

### Phase 5 - Double Entry
- [ ] Chart of Accounts
- [ ] Voucher system
- [ ] Financial reports

## Development Status

**Current Phase**: Phase 1 - Foundation & Authentication

**Completed**:
- ✅ Backend project structure
- ✅ Database models (Tenant, User, Subscription, Payment)
- ✅ JWT authentication
- ✅ Registration endpoint (6-step flow)
- ✅ Login endpoint
- ✅ User management

**In Progress**:
- 🔄 Frontend setup
- 🔄 Testing authentication flow

## License

Proprietary - All rights reserved
