# HARO Monitor Setup Guide

Step-by-step instructions to set up automated HARO query monitoring and Telegram alerts.

## Prerequisites

- Supabase account and project
- Gmail account subscribed to HARO
- Telegram account
- Anthropic API key

## Step 1: Clone and Configure

```bash
git clone https://github.com/yourusername/haro-monitor.git
cd haro-monitor
```

Copy the environment template:
```bash
cp .env.example .env
```

## Step 2: Create Telegram Bot

1. Open Telegram, message [@BotFather](https://t.me/BotFather)
2. Use `/newbot` command
3. Choose a name and username for your bot
4. Copy the Bot Token to your `.env` file
5. Message your new bot to start a conversation
6. Get your Chat ID by visiting: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
7. Look for `"chat":{"id":12345678}` in the response
8. Add the Chat ID to your `.env` file

## Step 3: Set Up Anthropic API

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add it to your `.env` file as `ANTHROPIC_API_KEY`

## Step 4: Configure Supabase

1. Create a new Supabase project
2. Install Supabase CLI: `npm install -g supabase`
3. Login: `supabase login`
4. Link your project: `supabase link --project-ref your-project-ref`
5. Run database migration: `supabase db push`

Or run the SQL manually in your Supabase SQL editor:
```sql
-- Copy and run migration.sql
```

## Step 5: Deploy Edge Function

Set environment variables in Supabase Dashboard:
- Go to Project Settings → Edge Functions
- Add the variables from your `.env` file

Deploy the function:
```bash
supabase functions deploy haro-monitor
```

## Step 6: Set Up Gmail Apps Script

1. Go to [script.google.com](https://script.google.com) (logged in with your HARO-subscribed Gmail)
2. Create new project
3. Delete default code, paste contents of `gmail-apps-script.js`
4. Save project with name "HARO Monitor"

Set Script Properties:
1. Click gear icon → Project Settings
2. Add Script Properties:
   - `EDGE_FUNCTION_URL` = `https://your-project.supabase.co/functions/v1/haro-monitor`
   - `CRON_SECRET` = same value from your `.env` file

## Step 7: Test Setup

Run these functions manually in Apps Script:

1. **Test Configuration**: Run `testConfiguration()`
   - Verifies all settings are correct
   
2. **Test Email Parsing**: Run `testWithLatestHaro()`
   - Processes your most recent HARO email
   - Check Execution log for results

3. **List Recent Emails**: Run `listRecentHaroEmails()`
   - Shows recent HARO emails in your inbox

## Step 8: Set Up Automation

1. In Apps Script, click clock icon (Triggers)
2. Add Trigger:
   - Function: `checkHaroEmails`
   - Event source: Time-driven
   - Type: Minutes timer  
   - Interval: Every 15 minutes

## Step 9: Customize Scoring

Edit the `SCORING_ANGLES` array in `supabase/functions/haro-monitor/index.ts` to match your expertise:

```typescript
const SCORING_ANGLES = [
  "Your expertise area 1",
  "Your expertise area 2",
  // ... add your areas
];
```

Redeploy after changes:
```bash
supabase functions deploy haro-monitor
```

## Verification

You should receive a Telegram message like this when relevant HARO queries are found:

```
📰 HARO Alert - 1 pitch opportunity found!

📰 HARO - Score: 4/4
🎯 Angle: bootstrapped SaaS
💡 Query directly asks about building software without dev background

Building a Tech Company Without Technical Skills
🏢 Forbes - Jane Smith  
⏰ Deadline: Feb 20, 2026

Looking for founders who built technology products without...
```

## Troubleshooting

**No alerts**: 
- Check Apps Script execution log for errors
- Verify HARO subscription is active
- Run `testWithLatestHaro()` to check parsing

**Telegram not working**:
- Verify bot token and chat ID
- Message your bot first to start conversation
- Check Supabase function logs

**Edge function errors**:
- Check Supabase function logs: `supabase functions logs haro-monitor`
- Verify all environment variables are set

## Monitoring

View processing stats in Supabase:
```sql
SELECT * FROM haro_query_stats ORDER BY date DESC LIMIT 7;
```

Check recent processed queries:
```sql
SELECT title, outlet, score, created_at 
FROM haro_seen_queries 
ORDER BY created_at DESC 
LIMIT 20;
```

## Cost Estimate

- Claude Haiku API: ~$0.01-0.02/day (20-30 queries × 100 tokens each)
- Supabase: Free tier sufficient for most usage
- Apps Script: Free
- Telegram Bot: Free

Total: ~$0.30-0.60/month
