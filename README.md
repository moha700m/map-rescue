# MAP RESCUE AI

Private admin dashboard for Google Business Profile recovery with official API integration.

## Stack
- Next.js 15 + TypeScript
- Tailwind CSS (dark, RTL default)
- Supabase (PostgreSQL + Storage + Auth)
- OpenAI-compatible AI (configurable)
- Google Business Profile APIs via googleapis (OAuth 2.0)

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Create Supabase project. Run `supabase/schema.sql` and `supabase/google_schema.sql` in SQL Editor.

3. Create private storage bucket named `evidence`.

4. Copy `.env.example` to `.env.local` and fill credentials.

5. For Google integration:
   - Create Google Cloud project
   - Enable Account Management, Business Information, Performance, Verifications APIs
   - Create OAuth 2.0 Client ID (Web application)
   - Request API access via https://developers.google.com/my-business/content/prereqs (approval required; quota is 0 until approved)
   - Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

6. Run:
   ```bash
   npm run dev
   ```

## Important Rules
- No automatic appeal submission.
- Live Google data is clearly labeled and separated from manual entry and AI analysis.
- Never claims an internal suspension reason from API if not exposed.
- Human authorization required for external actions.
- Official sources only.

## Official Sources
- https://developers.google.com/my-business
- https://support.google.com/business/
- https://developers.google.com/my-business/content/prereqs

## Deployment
Deploy to Cloudflare Pages or Vercel. Set all environment variables. Use Supabase Auth.
