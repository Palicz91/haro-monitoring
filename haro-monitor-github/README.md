# HARO Monitor

Automatically scores HARO (Help a Reporter Out) queries for relevance and sends Telegram alerts for high-scoring opportunities.

## How it works

1. **Gmail Apps Script** monitors incoming HARO emails
2. **Supabase Edge Function** parses individual queries from emails
3. **Claude Haiku** scores each query 0-4 for relevance to your expertise
4. **Telegram alerts** for queries scoring 3+

## Features

- Automatic email parsing and query extraction
- AI-powered relevance scoring
- Telegram notifications with query details
- Duplicate detection and cleanup
- Configurable scoring criteria

## Architecture

```
HARO Email → Gmail Apps Script → Supabase Edge Function → Claude API → Telegram Bot
                                       ↓
                               Database (deduplication)
```

## Setup

### 1. Database Setup

Run the SQL migration in your Supabase project:

```sql
-- See migration.sql
```

### 2. Environment Variables

Set these in your Supabase project (Project Settings > Edge Functions):

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id  
ANTHROPIC_API_KEY=your_anthropic_key
CRON_SECRET=your_secret_key
```

### 3. Deploy Edge Function

```bash
supabase functions deploy haro-monitor
```

### 4. Gmail Apps Script Setup

1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Paste contents of `gmail-apps-script.js`
4. Set Script Properties:
   - `EDGE_FUNCTION_URL` = `https://your-project.supabase.co/functions/v1/haro-monitor`
   - `CRON_SECRET` = same as above
5. Add time-driven trigger for `checkHaroEmails` (every 15 minutes)

## Configuration

### Scoring Criteria

Edit the scoring prompt in `supabase/functions/haro-monitor/index.ts` to match your expertise:

```typescript
const SCORING_ANGLES = [
  "Your expertise area 1",
  "Your expertise area 2", 
  "Your expertise area 3"
];
```

### Telegram Message Format

```
📰 HARO Alert - 2 pitch opportunities found!

📰 HARO - Score: 4/4
🎯 Angle: your expertise area
💡 Query asks about your specific knowledge

Query Title Here
🏢 Media Outlet - Journalist Name
⏰ Deadline: Feb 20, 2026

Query description text here...
```

## Testing

Run `testWithLatestHaro()` in Gmail Apps Script to test email parsing and processing.

## Cost

Approximately $0.01-0.02 per day (20-30 queries × ~100 tokens each with Claude Haiku).

## Files

- `supabase/functions/haro-monitor/index.ts` - Main edge function
- `gmail-apps-script.js` - Gmail monitoring script  
- `migration.sql` - Database setup
- `config.example.js` - Configuration template

## License

MIT
