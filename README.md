# Esca - Smart Food Waste Reduction

An AI-powered platform that helps users reduce food waste by:
- Scanning barcodes to track fridge inventory
- Using Claude AI to predict spoilage risk
- Generating personalized recipes for items expiring soon
- Gamifying waste reduction with badges and metrics

## Tech Stack

- **Frontend**: Next.js 14 + React 18 + Tailwind CSS (Vercel)
- **Backend**: Express.js + TypeScript (Railway)
- **Database**: Supabase PostgreSQL
- **AI**: Anthropic Claude API

## Project Structure

```text
esca-app/
├── frontend/          # Next.js web app
├── backend/           # Express API server
├── database/          # SQL schema & migrations
├── scripts/           # Background jobs
├── .github/workflows/ # GitHub Actions
├── CLAUDE.md          # Development guide
└── README.md          # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Setup

1. **Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/esca-app.git
cd esca-app
```

2. **Frontend Setup**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Frontend runs on http://localhost:3000

3. **Backend Setup**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Backend runs on http://localhost:3001

4. **Database Setup**
- Create a Supabase project
- Run the SQL schema from `database/schema.sql`
- Add your Supabase URL and key to `.env.local` (frontend) and `.env` (backend)

## Development

### Using Claude Code
Add `@claude` to any GitHub issue or PR to trigger automated development:

### Commit Format
```text
type(scope): description

- Bullet points
- Reference #issue
```

## Deployment

- **Frontend**: Push to `main` → auto-deploys to Vercel
- **Backend**: Push to `main` → auto-deploys to Railway
- **Database**: Migrations via Supabase dashboard

## Features

- [x] Barcode scanning
- [x] Fridge inventory tracking
- [x] AI spoilage prediction
- [x] Recipe suggestions
- [x] Gamification
- [ ] Smart fridge integration
- [ ] Mobile app
- [ ] Social features

## License

MIT

## Contact

Questions? Open an issue on GitHub!