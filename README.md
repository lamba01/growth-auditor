# Growth Auditor

An AI website auditor. Enter a URL (or paste HTML) and get a score plus a prioritised list of SEO, conversion, trust, UX, and design findings. Each finding includes the evidence behind it and, where it can be fixed with copy, ready-to-use replacement text you can rewrite, copy, and mark as fixed.

**Live demo:** [Live Site](https://growth-auditor.vercel.app/)

## Features

- **Scored audit of a single page.** Findings are grouped by category and ordered by severity, each with evidence, an explanation, and a recommendation.
- **Ready-to-use fixes.** SEO titles, meta descriptions, headlines, CTA copy, service descriptions, FAQs, and Google Business Profile descriptions, written from facts found on the page.
- **Rewrite controls.** Regenerate any fix with a different angle, a tone change, or your own instruction. Titles and meta descriptions show a live character-length meter.
- **Live score.** Mark findings as fixed and the score and category progress update immediately.
- **Saved history.** Audits, fixed items, and rewritten copy are stored in Postgres and can be reopened later.
- **Two input modes.** Fetch a URL, or paste HTML for pages that are JavaScript-rendered or behind a login.
- **Design and responsiveness checks.** Detected from markup signals such as the viewport tag, media queries, image `srcset` and dimensions, heading structure, form labels, and render-blocking scripts.
- **Abuse protection.** Per-IP and global daily limits, input size caps, and SSRF protection on the URL fetcher.

## How it works

```
URL or pasted HTML
        |
        v
 fetch-page.js    validates the URL, blocks private addresses, fetches with a timeout and size cap
        |
        v
 extract.js       Cheerio turns the HTML into a compact "signals" object:
                  title, meta, headings, CTAs, images, schema types, trust hints,
                  design/responsiveness signals, and the visible text (trimmed)
        |
        v
 /api/audit       sends the signals (not raw HTML) to the model with generateObject
                  and a Zod schema, with fallback across models
        |
        v
 score.js         computes the score in code from the findings
        |
        v
 Neon Postgres    saves the audit; the dashboard autosaves fixed items and rewritten copy
```

## Key design decisions

- **Signals, not raw HTML.** Sending a compact extracted object is cheaper, faster, and more accurate than dumping markup into the prompt.
- **Schema-validated output.** The model's response is validated against a Zod schema (`src/lib/audit-schema.js`), so the UI only ever receives well-formed findings. Every finding carries an `evidence` field, which keeps the model grounded in what is actually on the page.
- **Deterministic score.** The score is calculated in code (`100 - (high x 10 + medium x 5 + low x 2)`, floored at 0), not by the model. The same findings always produce the same score, and applying a fix changes it predictably.
- **Honest design checks.** The auditor sees markup, not a rendered page. The prompt forbids comments on colours or aesthetics, and when linked stylesheets can't be read it reports that responsiveness couldn't be verified instead of guessing.
- **Model fallback.** If the preferred model is overloaded (503 or 429), the request falls through to the next model in the list. Non-retryable errors, such as a bad key or a schema failure, still surface.
- **Rate limiting in Postgres.** One atomic counter row per visitor per day, plus a global daily cap that protects the AI quota. IPs are stored hashed. If the AI service fails, the visitor's audit is refunded. In production the limiter fails closed.
- **SSRF protection.** The URL fetcher rejects non-HTTP protocols and private or loopback addresses, and enforces a 10-second timeout and a 2 MB size cap.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) and React
- [Tailwind CSS](https://tailwindcss.com) v4
- [Vercel AI SDK](https://sdk.vercel.ai) with the Google Gemini provider (swappable for any supported provider)
- [Zod](https://zod.dev) for schema validation
- [Cheerio](https://cheerio.js.org) for HTML parsing
- [Neon](https://neon.tech) serverless Postgres
- Deployed on [Vercel](https://vercel.com)

## Getting started

### 1. Install

```bash
git clone <https://github.com/lamba01/growth-auditor>
cd growth-auditor
npm install
```

### 2. Create the database

In a Neon project, run this in the SQL Editor:

```sql
create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  url text,
  score int not null,
  summary text not null,
  findings jsonb not null,
  context jsonb not null,
  applied jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audits_owner_idx on audits (owner_id, created_at desc);

create table if not exists rate_limits (
  key text primary key,
  count int not null default 0,
  expires_at timestamptz not null
);

create index if not exists rate_limits_expires_idx on rate_limits (expires_at);
```

### 3. Configure environment variables

Create `.env.local`:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
DATABASE_URL=postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require

# Optional rate-limit settings (defaults shown)
AUDITS_PER_IP_PER_DAY=5
AUDITS_GLOBAL_PER_DAY=100
FIXES_PER_IP_PER_DAY=30
FIXES_GLOBAL_PER_DAY=500
RATE_LIMIT_SALT=any-random-string

# Development only. Never set this in production.
RATE_LIMIT_DISABLED=true
```

Get a Gemini key from [Google AI Studio](https://aistudio.google.com). To use a different provider, install its `@ai-sdk/*` package and change the model list in `src/lib/ai.js`.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    page.js                     dashboard: form, score, findings, history
    layout.js                   fonts and metadata
    icon.js                     generated favicon
    api/
      audit/route.js            fetch, extract, analyse, score, save
      fix/route.js              rewrite a single piece of copy
      audits/route.js           list saved audits
      audits/[id]/route.js      open, autosave, delete one audit
  components/
    AuditForm.jsx               URL / paste-HTML input
    ScoreCard.jsx               score gauge and category progress
    FindingCard.jsx             one finding, its fix, and rewrite controls
    HistoryList.jsx             saved audits
  lib/
    ai.js                       model list and fallback logic
    audit-schema.js             Zod schema for findings
    db.js                       Neon client and owner-id helpers
    extract.js                  HTML to signals
    fetch-page.js               safe page fetching
    labels.js                   category and severity labels
    owner.js                    anonymous owner id (client side)
    prompts.js                  auditor system prompt
    rate-limit.js               per-IP and global limits
    score.js                    deterministic scoring
```

## Deploying to Vercel

1. Push the repo and import it in Vercel.
2. Add the environment variables above. Leave `RATE_LIMIT_DISABLED` unset.
3. Deploy, then run one audit on the live URL to confirm it finishes within your plan's function time limit (the audit route sets `maxDuration = 60`).

## Limitations

- **Single page only.** There is no crawler yet.
- **JavaScript-rendered sites.** Pages are fetched without a browser, so client-rendered sites return little content. Use the paste-HTML mode for those.
- **No visual review.** Design findings come from markup signals. Linked stylesheets are not analysed.
- **Anonymous history.** Audits are tied to a random ID stored in the browser, not to an account. Clearing browser storage loses access to past audits.
- **Soft IP limits.** A determined user can rotate IPs. The global daily cap is the hard backstop for AI spend.

## Roadmap

- Multi-page crawling with cross-page checks (duplicate titles, thin pages, internal linking)
- Headless-browser rendering and screenshot-based design review at mobile and desktop widths
- Accounts, replacing the anonymous owner ID
- Re-audit and score tracking over time
- Exportable reports

## Author

Built by John Oluwafemi. Portfolio: [johnbuilds.site](https://johnbuilds.site)
