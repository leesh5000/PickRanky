# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PickTrend is a trending shopping product ranking service that:
- Allows admin to manually register products with YouTube review videos
- Ranks products by calculated score (views, engagement, virality, recency)
- Categories: electronics, beauty, appliances, food (Korean market focus)

## Commands

```bash
# Development
npm run dev          # Start dev server (auto-runs prisma generate + migrate deploy)
npm run build        # Production build (includes prisma generate + migrate deploy)
npm run lint         # ESLint

# Database (Prisma)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (no migration)
npm run db:migrate   # Create and run migrations (dev only)
npm run db:studio    # Open Prisma Studio GUI
```

## Architecture

### Product Registration Flow

1. **Admin Page** (`/admin/products/new`) - Manual product registration
2. **YouTube Search** - Search videos by keyword using YouTube Data API v3
3. **Video Selection** - Select videos to associate with the product
4. **Score Calculation** - Calculate product score based on selected videos (max 100 points)

### Key Modules

- `src/lib/youtube/client.ts` - YouTube Data API v3 integration (search, video details, channel details)
- `src/lib/ranking/score-calculator.ts` - Scoring algorithm (100 points max)
- `src/app/admin/products/new/page.tsx` - Product registration UI

### Score Algorithm (100 Points Max)

**Video Score Components:**
- View Score (0-35 points): log scale based on view count
- Engagement Score (0-30 points): (likes + comments*2) / views ratio
- Virality Score (0-20 points): views / subscribers ratio
- Recency Score (0-15 points): exponential decay (45-day half-life)
- Shorts Bonus: 1.05x multiplier for Shorts videos

**Product Score:**
- Weighted average of top 5 video scores (weights: 1.0, 0.7, 0.5, 0.35, 0.25)
- Video count bonus: 0-5 points based on number of videos
- Final score capped at 100

### Admin APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/youtube/search` | POST | Search YouTube videos |
| `/api/admin/products` | GET | List products with pagination |
| `/api/admin/products` | POST | Create product with videos |
| `/api/admin/products/[id]` | GET/PATCH/DELETE | Product CRUD |
| `/api/admin/videos` | GET/POST | Video management |
| `/api/admin/videos/[id]` | GET/PATCH/DELETE | Video CRUD |

### UI & Theming

- `src/components/providers.tsx` - App-level providers (ThemeProvider, QueryClient, SessionProvider)
- `src/app/globals.css` - CSS variables for light/dark mode (HSL format)
- `src/components/ui/` - Reusable UI components (Button, Card, Badge, etc.)
- Dark/light mode via `next-themes` with `class` attribute strategy
- Blue brand color (#3B82F6) with Vercel-style backgrounds

### Authentication

Admin-only NextAuth.js with Credentials provider:
- Single password stored in `ADMIN_PASSWORD` env var (plain text comparison)
- Middleware protects `/admin/*` and `/api/admin/*` routes
- JWT sessions with 24-hour expiry

### Database Schema

Core models in `prisma/schema.prisma`:
- `Product` - Products with normalized names and affiliate links
- `Video` - YouTube videos linked to products
- `VideoMetric` - Video metrics (views, likes, comments) at registration time
- `RankingPeriod` - Time periods (YEARLY, MONTHLY, DAILY, FOUR_HOURLY)
- `ProductRanking` - Ranked products per period
- `LinkClick` / `PageView` - Analytics tracking
- `SystemConfig` - Key-value system configuration

## Environment Variables

Required (see `.env.example`):
- `DATABASE_URL` / `DIRECT_URL` - PostgreSQL (Supabase recommended)
- `YOUTUBE_API_KEY` - YouTube Data API v3 (must be enabled in Google Cloud Console)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `ADMIN_PASSWORD` - Admin password (plain text)
