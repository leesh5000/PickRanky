# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PickRanky (formerly PickTrend) is a trending shopping product ranking service that:
- Allows admin to manually register products with YouTube review videos
- Ranks products by calculated score (views, engagement, virality, recency)
- Categories: electronics, beauty, appliances, food (Korean market focus)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS + Radix UI primitives
- **State**: React Query (server) + Zustand (client)
- **Auth**: NextAuth.js with Credentials provider
- **APIs**: YouTube Data API v3, Coupang affiliate, Google Gemini (article summarization)
- **Utilities**: cheerio (HTML parsing), date-fns (date formatting), zod (validation), fast-xml-parser (RSS parsing)

## Commands

```bash
# Development
npm run dev          # Start dev server (runs prisma generate via predev hook)
npm run build        # Production build (includes prisma generate)
npm run lint         # ESLint

# Database (Prisma)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes (no migration)
npm run db:migrate   # Create and run migrations (dev only)
npm run db:studio    # Open Prisma Studio GUI
```

Note: On Windows, `predev` script may not run automatically. Run `npm run db:generate` manually if Prisma client is not generated.

## Architecture

### Product Registration Flow

**Single Registration** (`/admin/products/new`):
1. Enter product info (name, category, affiliate URL)
2. Search YouTube videos by keyword
3. Select videos to associate
4. Score calculated automatically (max 100 points)

**Bulk Registration** (`/admin/products/bulk`):
1. Run Console script on Coupang Goldbox page to extract products as JSON
2. Paste JSON into bulk registration page
3. For each product: select category, enter affiliate URL, optionally search/select videos
4. Register all products at once (videos are optional)

### Key Modules

- `src/lib/youtube/client.ts` - YouTube Data API v3 integration (search, video details, channel details)
- `src/lib/ranking/score-calculator.ts` - Scoring algorithm (100 points max)
- `src/lib/coupang/parser.ts` - Coupang HTML/JSON parser for bulk registration
- `src/app/admin/products/new/page.tsx` - Single product registration UI
- `src/app/admin/products/bulk/page.tsx` - Bulk product registration UI
- `src/hooks/useFormPersist.ts` - localStorage-based form persistence with debouncing
- `src/hooks/useCategories.ts` - Category fetching hook with React Query

### Article Trends System

AI-summarized news article collection and ranking system:

**Collection Sources:**
- `src/lib/article/naver-rss.ts` - Naver News RSS feeds by section (IT/과학, 생활/문화)
- `src/lib/article/google-news.ts` - Google News RSS keyword search
- `src/lib/article/content-fetcher.ts` - Article content scraper with site-specific selectors
- `src/lib/article/collector.ts` - Collection orchestration (dedup, save, summarize, link products)

**AI Summarization:**
- `src/lib/gemini/client.ts` - Lazy-initialized Google Gemini client (gemini-2.5-flash)
- Functions: `summarizeArticle()`, `summarizeFromMetadata()`, `classifyCategory()`, `extractKeywords()`
- `summarizeFromMetadata()` - Generates summary from title+description when content crawling fails
- Summary max 300 chars, Korean language

**CLI Scripts:**
- `npx tsx scripts/collect-articles.ts [limit]` - Manual article collection (default: 20)
- `npx tsx scripts/batch-summarize.ts [limit]` - Generate summaries for unsummarized articles (default: 20, max: 50)
- `/api/admin/articles/batch-summarize` - API endpoint for batch summarization (GET: stats, POST: process)

**Ranking System:**
- `src/lib/article/score-calculator.ts` - Article scoring (viewScore 0-50, shareScore 0-30, recencyScore 0-20)
- `src/lib/article/aggregator.ts` - Ranking period management (DAILY, MONTHLY)

**Vercel Cron Jobs:**
- `/api/cron/collect-articles` - Daily 07:00 KST (UTC 22:00)
- `/api/cron/calculate-article-rankings` - Daily 07:30 KST (UTC 22:30)

**Environment Variables:**
- `GEMINI_API_KEY` - Google Gemini API key for summarization
- `CRON_SECRET` - Vercel Cron authentication

**Known Issues:** See Troubleshooting section for Google News RSS and Naver RSS issues.

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

### API Structure

- `/api/*` - Public APIs (rankings, products, categories, news, tracking)
- `/api/admin/*` - Admin APIs (requires auth, protected by middleware)
- `/api/cron/*` - Vercel Cron jobs (CRON_SECRET auth)

**Dynamic Rendering:** API routes using `request.url` must include:
```typescript
export const dynamic = "force-dynamic";
```
Without this, Vercel build fails with "Dynamic server usage" error.

### SEO Implementation

**Metadata & Structured Data:**
- `src/app/layout.tsx` - Root metadata with OG tags, Twitter Cards, Google/Naver verification
- `src/app/robots.ts` - Crawler rules (blocks `/admin/`, `/api/admin/`)
- `src/app/sitemap.ts` - Dynamic sitemap (products, categories, static pages)

**Dynamic Metadata Pages:**
- `src/app/products/[id]/page.tsx` - Product schema JSON-LD + BreadcrumbList
- `src/app/categories/[category]/page.tsx` - Category ItemList JSON-LD
- `src/app/rankings/layout.tsx` - Rankings page metadata
- `src/app/page.tsx` - Organization + WebSite schema JSON-LD

**Page Architecture:**
- Dynamic pages converted to server components for SEO
- Client interactivity moved to `*-client.tsx` files (e.g., `product-client.tsx`)
- Server fetches data → passes to client component as `initialData`

### UI & Theming

- `src/components/providers.tsx` - App-level providers (ThemeProvider, QueryClient, SessionProvider)
- `src/app/globals.css` - CSS variables for light/dark mode (HSL format)
- `src/components/ui/` - Reusable UI components (Button, Card, Badge, etc.)
- Dark/light mode via `next-themes` with `class` attribute strategy
- Blue brand color (#3B82F6) with Vercel-style backgrounds
- PWA support: `manifest.ts` + SVG icons (`icon.svg`, `apple-icon.svg`)

### Authentication

Admin-only NextAuth.js with Credentials provider:
- Single password stored in `ADMIN_PASSWORD` env var (plain text comparison)
- Middleware protects `/admin/*` and `/api/admin/*` routes
- JWT sessions with 24-hour expiry

### Database Schema

Core models in `prisma/schema.prisma`:
- `Category` - Dynamic categories with sort order and active flag
- `Product` - Products with normalized names and affiliate links
- `Video` - YouTube videos linked to products (REGULAR or SHORTS)
- `VideoMetric` - Video metrics (views, likes, comments) at collection time
- `RankingPeriod` - Ranking periods (YEARLY, MONTHLY, DAILY, FOUR_HOURLY)
- `ProductRanking` - Ranked products per period with score breakdown
- `LinkClick` / `PageView` - Analytics tracking
- `AdminAction` - Admin action audit log
- `CollectionJob` - Background job status tracking
- `SystemConfig` - Key-value system configuration

**Article Models:**
- `Article` - News articles with source (NAVER, GOOGLE), description (RSS), AI summary, category
- `ArticleProduct` - Article-to-product associations
- `ArticleRankingPeriod` / `ArticleRanking` - Article rankings by period (DAILY, MONTHLY)
- `ArticleView` / `ArticleShare` - Article view and share tracking
- `ArticleCollectionJob` - Article collection job tracking (source, status, counts, error log)

### Form State Persistence

Admin product registration forms persist data to localStorage:
- Survives page refresh and browser back/forward navigation
- Uses `useMultiFormPersist` hook with 500ms debounce
- Cleared automatically on successful submission
- Storage keys: `admin-product-form`, `admin-bulk-product-form`

### Responsive Design

Mobile-first approach with Tailwind breakpoints:
- Rankings page: Vertical card layout on mobile (`sm:hidden`), horizontal on sm+
- Product detail: Responsive text sizes (`text-xl sm:text-2xl md:text-3xl`)
- Admin layout: Slide-out sidebar on mobile, fixed sidebar on lg+
- Key patterns: `sm:hidden` / `hidden sm:flex` for conditional layouts

## Environment Variables

Required (see `.env.example`):
- `DATABASE_URL` / `DIRECT_URL` - PostgreSQL (Supabase recommended)
- `YOUTUBE_API_KEY` - YouTube Data API v3 (must be enabled in Google Cloud Console)
- `NEXTAUTH_SECRET` - Random string for JWT encryption (min 32 chars)
- `ADMIN_PASSWORD` - Admin password (plain text)

Optional (Article Collection):
- `GEMINI_API_KEY` - Google Gemini API key for article summarization (get from https://aistudio.google.com/app/apikey)
- `CRON_SECRET` - Vercel Cron job authentication secret

## Known Limitations

### Coupang Server-Side Requests

Coupang blocks all server-side requests (403 Access Denied), including:
- Affiliate link redirects (`link.coupang.com/a/xxx`)
- Product page scraping (`www.coupang.com/vp/products/xxx`)
- Open Graph metadata fetching

The `/api/admin/opengraph` route already handles this with `COUPANG_BLOCKED` error.

**Why auto-fetching from affiliate links is not possible:**
1. Coupang's bot detection blocks server requests regardless of User-Agent
2. Coupang Partners API only provides:
   - Search API: keyword → product list (rate limited: 10 calls/hour)
   - Deeplink API: product URL → affiliate link (opposite direction)
3. No API endpoint exists for: affiliate link → product info

**Current workaround:** Use the Goldbox console script to extract product data client-side, then paste into bulk registration.

## Deployment Notes

### Supabase with PgBouncer

When using Supabase pooler (port 6543), add `?pgbouncer=true` to `DATABASE_URL` to avoid "prepared statement already exists" errors:
```
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true
```
Use `DIRECT_URL` (port 5432) for migrations.

## Troubleshooting

### PgBouncer Prepared Statement Error

If `prepared statement "sXX" does not exist` error occurs:
1. Verify `?pgbouncer=true` parameter in `DATABASE_URL`
2. Restart dev server: `pkill -f "next dev" && npm run dev`

### Prisma Client Not Generated

On Windows, `predev` script may not run automatically:
```bash
npm run db:generate
```

### Google News RSS Crawling Fails

Google News RSS URLs use JavaScript redirects, causing server-side crawling to fail.
Fallback: `summarizeFromMetadata()` generates summary from title+description.

### Naver RSS DNS Issues (Local)

If Naver RSS DNS fails locally, try VPN or different network.
