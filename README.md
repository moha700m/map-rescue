# MAP RESCUE AI

Private admin dashboard for Google Business Profile recovery.

## Stack
- Next.js 15 + TypeScript
- Tailwind CSS (dark, RTL default)
- Supabase (PostgreSQL + Storage + Auth)
- OpenAI-compatible AI (configurable)
- OCR via Tesseract.js (client or server)

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Create Supabase project. Run `supabase/schema.sql` in SQL Editor.

3. Create private storage bucket named `evidence`.

4. Copy `.env.example` to `.env.local` and fill credentials.

5. Run:
   ```bash
   npm run dev
   ```

## Important Rules Implemented
- No automatic appeal submission.
- AI diagnosis only when credentials present.
- Official Google policy references.
- Human approval required for external actions.
- Arabic default with English support.

## Official Sources
- https://support.google.com/business/
- https://support.google.com/business/answer/4569145
- https://support.google.com/business/answer/3038177

## Deployment
Deploy to Cloudflare Pages or Vercel. Set environment variables in the platform dashboard. Use Supabase Auth for admin login.
