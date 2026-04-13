# HARO Monitoring

AI-powered [HARO](https://www.helpareporter.com/) (Help a Reporter Out) monitoring system. Automatically scores journalist queries for relevance and sends Telegram alerts for high-value opportunities.

## How it works

1. **Gmail polling** — Google Apps Script checks your inbox every 15 minutes for new HARO emails
2. **AI scoring** — Gemini Flash-Lite scores each query 0-4 for relevance to your business
3. **Deduplication** — PostgreSQL prevents duplicate alerts
4. **Telegram alert** — Queries scoring 3+ are sent to your Telegram with a summary

## Architecture

```
Gmail (HARO emails)
  → Google Apps Script (15-min poll)
    → Supabase Edge Function
      → Gemini Flash-Lite scoring (0-4 scale)
        → Telegram notification (if score >= 3)
```

## Stack

- **Email processing**: Google Apps Script
- **AI scoring**: Google Gemini 3.1 Flash-Lite
- **Backend**: Supabase Edge Function (Deno)
- **Notifications**: Telegram Bot API
- **Deduplication**: Supabase PostgreSQL

## Setup

1. Deploy the Supabase Edge Function from `supabase/functions/haro-monitor/`
2. Set up the Google Apps Script trigger (`gmail-apps-script.js`) in your Google account
3. Configure environment variables:
   - `GOOGLE_GEMINI_API_KEY` — Gemini API key
   - `TELEGRAM_BOT_TOKEN` — Telegram bot token
   - `TELEGRAM_CHAT_ID` — Your Telegram chat ID
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`

4. The Apps Script will poll Gmail every 15 minutes and forward HARO emails to the Edge Function for scoring.

## Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 0-1 | Not relevant | Ignored |
| 2 | Possibly relevant | Logged, no alert |
| 3 | Relevant | Telegram alert |
| 4 | Highly relevant | Telegram alert (urgent) |

## License

MIT
