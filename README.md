# FreightOS — Freight & RFQ Management System

A production-grade full-stack freight management system featuring a futuristic dark-mode UI, real-time dashboard, RFQ pipeline management, confirmed shipment tracking, and PDF document management.

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend    | Node.js, Express.js           |
| Database   | PostgreSQL                    |
| Auth       | JWT (JSON Web Tokens)         |
| File Upload| Multer (local PDF storage)    |

---

## Prerequisites

- **Node.js** v18+ and **npm** v9+
- **PostgreSQL** v14+ running locally (or connection string to hosted DB)

---

## Setup Instructions

### 1. Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE freight_rfq;"

# Run the schema (creates tables + seeds admin user + sample data)
psql -U postgres -d freight_rfq -f database/schema.sql
```

**Default admin credentials:**
- Username: `admin`
- Password: `Admin@1234`

---

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET

# Start development server (with auto-reload)
npm run dev

# Or production
npm start
```

Backend runs on: **http://localhost:3001**

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: **http://localhost:3000**

The Next.js config proxies all `/api/*` requests to the backend automatically.

---

## Project Structure

```
SITE/
├── database/
│   └── schema.sql              # PostgreSQL DDL + seed data
├── backend/
│   ├── src/
│   │   ├── config/db.js        # PostgreSQL pool
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   ├── upload.js       # Multer PDF config
│   │   │   └── errorHandler.js # Global error handler
│   │   ├── controllers/        # Business logic
│   │   ├── routes/             # Express routes
│   │   └── server.js           # Entry point
│   ├── uploads/                # PDF storage (auto-created)
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── login/page.tsx      # Login page
    │   ├── dashboard/page.tsx  # Dashboard metrics
    │   ├── rfq/page.tsx        # RFQ History
    │   └── confirmed/page.tsx  # Confirmed Shipments
    ├── components/
    │   ├── layout/             # Sidebar, AppLayout
    │   ├── ui/                 # Modal, Badge
    │   └── modals/             # RFQDetailModal, ConfirmedShipmentModal, AddShipmentModal
    ├── lib/                    # api.ts, auth.ts
    ├── hooks/                  # useAuth.ts
    └── types/                  # TypeScript interfaces
```

---

## API Reference

| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| POST   | `/api/auth/login`                 | Login → returns JWT                  |
| GET    | `/api/auth/me`                    | Current user (requires JWT)          |
| GET    | `/api/shipments`                  | List shipments (`?exclude_direct=true`, `?status=Confirmed`) |
| POST   | `/api/shipments`                  | Create shipment (auto REF NO if blank)|
| PUT    | `/api/shipments/:ref_no`          | Full update                          |
| PATCH  | `/api/shipments/:ref_no/status`   | Update status + reset follow-up timer|
| PATCH  | `/api/shipments/:ref_no/tracking` | Update tracking fields only          |
| DELETE | `/api/shipments/:ref_no`          | Delete shipment                      |
| GET    | `/api/dashboard/metrics`          | All dashboard metrics                |
| POST   | `/api/files/:ref_no`              | Upload PDF for shipment              |
| GET    | `/api/files/:ref_no`              | List files for shipment              |
| GET    | `/api/files/download/:id`         | Open/download file (inline)          |
| DELETE | `/api/files/:id`                  | Delete file from disk + DB           |

---

## Key Features

### 🔐 Authentication
- JWT-based, 8-hour expiry
- All API routes protected
- Auto-redirect to login on token expiry

### 📊 Dashboard
- Real-time metric cards with count-up animation
- Follow Ups Due: shipments in active status with last follow-up > 4 hours
- Auto-refreshes every 60 seconds

### 📋 RFQ History
- Click REF NO → clipboard copy + toast notification
- Double-click row → detail modal
- Status change resets the follow-up timer to NOW()

### ✅ Confirmed Shipments
- 12-column tracking table
- "+ Add Direct Shipment" with auto-generated ARG-XXXX ref
- Double-click → tabbed modal:
  - **Details**: view + inline edit tracking info
  - **Files**: drag-and-drop PDF upload, list, open in browser, delete

### 📁 File Management
- PDFs stored at `backend/uploads/<ref_no>/`
- Files open inline in a new browser tab
- On shipment delete: files cascade-deleted from DB and disk

---

## Environment Variables

```env
# backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=freight_rfq
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=8h
PORT=3001
CLIENT_URL=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
```

---

## Security Notes

- All SQL queries use parameterised statements (no string interpolation)
- Passwords stored as bcrypt hashes (cost factor 10)
- File uploads restricted to `application/pdf` MIME type only
- JWT verified on every protected route via middleware
- CORS restricted to `CLIENT_URL` only
