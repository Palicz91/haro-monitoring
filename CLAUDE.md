# HARO Monitoring

## Mi ez?
AI-alapú HARO (Help a Reporter Out) figyelő. Újságírói megkereséseket pontozza relevanciára és Telegram-on értesít.

## Architektúra
Gmail (HARO email) → Google Apps Script (15 perces polling) → Supabase Edge Function → Gemini Flash-Lite scoring → Telegram értesítés

## Stack
- **Email feldolgozás**: Google Apps Script (gmail-apps-script.js)
- **AI scoring**: Gemini 3.1 Flash-Lite (0-4 skála, 3+ = alert) — GCP credits
- **Backend**: Supabase Edge Function (Deno)
- **Értesítés**: Telegram Bot
- **Deduplikáció**: Supabase PostgreSQL

## Fő fájlok
| Fájl | Szerep |
|------|--------|
| `haro-monitor-github/gmail-apps-script.js` | Gmail trigger, 15 perces polling |
| `haro-monitor-github/supabase/functions/haro-monitor/index.ts` | Edge function: scoring, dedup, Telegram küldés |
| `haro-monitor-github/migration.sql` | DB séma a deduplikációhoz |
| `haro-monitor-github/config.example.js` | Scoring kritériumok konfigurálása |

## Fejlesztési szabályok
- Edge function Deno runtime-on fut
- Secrets: Telegram token, Gemini API key, cron secret → `supabase secrets set`
- Deploy: git push (Supabase auto-deploy)
- Scoring 0-4 skála: 3+ küld Telegram alertet
- Költség: ~$0/nap (GCP credits)
- A HARO monitor edge function (`haro-monitor`) a review-bolt repóban is megtalálható: `supabase/functions/haro-monitor/`
- Heti összefoglaló: `/home/claude-bot/tools/haro-weekly-digest.sh` (heti H 09:40 BKK)
