# Data Room MVP

A secure document management application with Google Drive integration. Import files from Google Drive into a centralized data room for due diligence, document sharing, and secure file management.

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.13-3776AB?style=flat&logo=python&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=flat&logo=shadcnui&logoColor=white)

## Features

- **Google Drive Integration** - OAuth 2.0 authentication with automatic token refresh
- **File Import** - Import files directly from Google Drive with Google Docs auto-conversion (to PDF/XLSX)
- **File Management** - View, download, and delete imported files
- **Session-Based Auth** - Secure session management with server-side token storage
- **Responsive UI** - Clean interface built with React, Tailwind CSS, and shadcn/ui

## Tech Stack

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.13
- **Database:** SQLite with SQLModel ORM
- **Package Manager:** uv
- **Auth:** Google OAuth 2.0

### Frontend
- **Framework:** React 19
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix UI)
- **Package Manager:** pnpm

## Prerequisites

- Python 3.13+
- Node.js 18+
- [pnpm](https://pnpm.io/installation)
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Google Cloud Console project with OAuth 2.0 credentials configured

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kkcore/svitla-dataroom.git
cd svitla-dataroom
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
uv sync

# Create .env file with your credentials
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration
```

## Environment Variables

### Backend (`backend/.env`)

```env
GOOGLE_CLIENT_ID=           # Your Google OAuth client ID
GOOGLE_CLIENT_SECRET=       # Your Google OAuth client secret
REDIRECT_URI=               # OAuth callback URL (default: http://localhost:5001/auth/google/callback)
FRONTEND_URL=               # Frontend origin for CORS (default: http://localhost:5173)
```

### Frontend (`frontend/.env`)

```env
VITE_GOOGLE_CLIENT_ID=      # Same Google OAuth client ID as backend
VITE_BACKEND_URL=           # Backend API URL (default: http://localhost:5001)
```

## Running the Application

### Start the Backend Server

```bash
cd backend
uv run uvicorn main:app --reload --port 5001
```

### Start the Frontend Development Server

```bash
cd frontend
pnpm dev
```

Access the application at **http://localhost:5173**

## Production Build

### Frontend

```bash
cd frontend

# Build optimized production bundle
pnpm build

# Preview the production build locally
pnpm preview
```

The build output will be in `frontend/dist/`.

### Backend

```bash
cd backend

# Install dependencies (production)
uv sync --no-dev

# Run with production server
uv run uvicorn main:app --host 0.0.0.0 --port 5001 --workers 4
```

### Production Environment Variables

Update your `.env` files for production:

**Backend:**
```env
REDIRECT_URI=https://your-domain.com/auth/google/callback
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend:**
```env
VITE_BACKEND_URL=https://your-api-domain.com
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiates OAuth flow |
| GET | `/auth/google/callback` | OAuth callback handler |
| GET | `/auth/status` | Check auth status & get access token |
| POST | `/auth/logout` | Clear user session |

### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/files` | List all imported files |
| POST | `/files/import` | Import file from Google Drive |
| GET | `/files/{id}/download` | Download/view file |
| DELETE | `/files/{id}` | Delete imported file |

## Project Architecture

```
svitla/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment configuration
│   ├── database.py          # SQLite/SQLModel setup
│   ├── models.py            # Database models & schemas
│   ├── routers/
│   │   ├── auth.py          # OAuth endpoints
│   │   └── files.py         # File management endpoints
│   └── uploads/             # Imported file storage
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main component
│   │   ├── components/
│   │   │   ├── FileList.tsx # File list display
│   │   │   └── ui/          # shadcn/ui components
│   │   └── types/
│   │       └── file.ts      # TypeScript interfaces
│   └── vite.config.ts       # Vite configuration
│
└── README.md
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI   │────▶│   Google    │
│   Frontend  │◀────│   Backend   │◀────│   Drive     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   SQLite    │
                    │   Database  │
                    └─────────────┘
```

## Security Features

- **CSRF Protection** - OAuth state validation prevents cross-site request forgery
- **Path Traversal Prevention** - Filename sanitization removes dangerous characters
- **Token Refresh** - Automatic refresh with 5-minute buffer before expiry
- **File Type Validation** - Blocks unsupported Google file types (Forms, Maps, etc.)
- **Session Management** - Secure random tokens, expired session cleanup on startup
- **CORS Configuration** - Restricted to frontend origin only

## Known Limitations

- **Single User** - No multi-tenancy or user accounts (MVP scope)
- **Local Storage** - Files stored on disk, not cloud blob storage
- **No Full-Text Search** - Search by filename only
- **No Folder Support** - Flat file structure
- **Access Token on FE** - With custom google-picker I could move google authentication token fully on the BE and respond with BE-created session token.

## Design Decisions

### FastAPI over Django/Flask
- Lightweight framework suitable for microproject scope
- Built-in Pydantic data validation and type hints
- Starlette provides high-performance async routing
- Django's full-stack features unnecessary for this use case

### SQLite
- Zero-configuration setup
- Minimal overhead for MVP requirements
- Sufficient for single-user data storage needs

### React SPA with Vite
- Single view requirement made SSR unnecessary
- Vite offers fast development experience
- No SEO requirements that would benefit from server rendering

## Troubleshooting

### OAuth Errors

**"redirect_uri_mismatch"**
- Ensure `REDIRECT_URI` in backend `.env` matches the authorized redirect URI in Google Cloud Console

**"Access blocked: app not verified"**
- Add your Google account as a test user in OAuth consent screen settings

### CORS Issues

**"Access-Control-Allow-Origin" errors**
- Verify `FRONTEND_URL` in backend `.env` matches the exact frontend origin

### File Import Failures

**"File type not supported"**
- Google Forms, Sites, Maps, and shortcuts cannot be imported
- Google Docs/Sheets/Slides are auto-converted to PDF/XLSX format

### Database Issues

**"Database locked"**
- Ensure only one backend instance is running
- Check file permissions on `database.db`
