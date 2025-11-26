# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Data Room MVP - A full-stack web application for secure document management with Google Drive integration. Users can import files from Google Drive and manage them in a data room interface.

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
- **CSS:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix UI)
- **Package Manager:** pnpm
- **HTTP Client:** Axios

## Common Commands

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Run development server (port 5001)
uv run uvicorn main:app --reload --port 5001

# Or if venv is activated:
uvicorn main:app --reload --port 5001
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Run development server (port 5173)
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Preview production build
pnpm preview
```

## Environment Variables

### Backend (`backend/.env`)
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Frontend (`frontend/.env`)
```
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_APP_ID=your-app-id
VITE_BACKEND_URL=http://localhost:5001
```

## Development Workflow

1. Start the backend server on port 5001
2. Start the frontend dev server on port 5173
3. Frontend communicates with backend via REST API
4. OAuth flow redirects through backend to handle tokens

## Key Files

- `backend/main.py` - All backend logic (models, routes, auth)
- `frontend/src/App.tsx` - Main React component with state management
- `frontend/src/components/DrivePicker.tsx` - Google Drive picker integration
- `frontend/src/types/file.ts` - TypeScript interfaces
