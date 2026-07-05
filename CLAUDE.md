# Esca Development Guide for Claude Code

## Project Overview
Esca is an AI-powered food waste reduction platform with:
- Next.js frontend (Vercel)
- Express backend (Railway)
- Supabase database (PostgreSQL)
- Claude AI for predictions & recipes

## Tech Stack
- **Frontend**: Next.js 14+ with React 18, Tailwind CSS
- **Backend**: Node.js 18+ with Express, TypeScript
- **Database**: Supabase PostgreSQL
- **AI**: Claude API

## Code Standards
- TypeScript strict mode everywhere
- ESLint + Prettier
- All API responses: `{ success: boolean, data?: T, error?: string }`

## Commands to Run After Changes
```bash
# Frontend
cd frontend && npm run lint && npm run build

# Backend
cd backend && npm run build

# Database
# Push schema to Supabase via dashboard
```

## Git Commit Format
```text
type(scope): description

- Detail bullets
- Reference #issue
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`
Scopes: `frontend`, `backend`, `ai`, `db`