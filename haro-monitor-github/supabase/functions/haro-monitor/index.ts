import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ── Configuration ──

const SCORING_ANGLES = [
  "QR-activated gamified prize wheels for restaurants — guest engagement, review collection, Wallet passes",
  "AI-powered Google review management — automated reply generation, sentiment analysis, competitor intelligence",
  "Restaurant marketing technology — loyalty programs, customer retention, digital transformation for hospitality",
  "Cold outreach and lead generation — email automation, LRPI scoring, conversion optimization for SaaS",
  "Bootstrapped SaaS founder perspective — 100+ restaurant clients across 6 countries, product-led growth",
];

const SCORE_SYSTEM_PROMPT = `You score HARO (Help a Reporter Out) queries for pitch opportunity relevance.

SCORING ANGLES:
${SCORING_ANGLES.map(angle => `• ${angle}`).join('\n')}

SCORING SCALE:
4 = Perfect match - query directly asks about your expertise
3 = Strong relevance - you have valuable insights to share
2 = Some relevance - you could contribute but not ideal
1 = Weak relevance - tangential connection
0 = No relevance - completely outside your expertise

Consider:
- Does the query match your background?
- Would you have unique insights?
- Is the publication/outlet appropriate?
- Do you meet any specific requirements mentioned?

Respond with only a JSON object:
{
  "score": 0-4,
  "angle": "which of your expertise areas this matches",
  "reasoning": "brief explanation of the score"
}`;

// ── Core Functions ──

async function scoreQuery(queryText: string): Promise<{score: number, angle: string, reasoning: string}> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SCORE_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: queryText.substring(0, 3000),
          }
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    // Parse JSON response — handle markdown code blocks and raw JSON
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON found in response: ${content.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      score: Math.max(0, Math.min(4, parseInt(parsed.score) || 0)),
      angle: parsed.angle || 'general',
      reasoning: parsed.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    console.error('Scoring error:', error);
    return { score: 0, angle: 'error', reasoning: 'Scoring failed' };
  }
}

async function sendTelegramMessage(text: string): Promise<void> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Telegram error:', error);
  }
}

function parseHaroEmail(emailBody: string): Array<{
  title: string;
  journalist: string;
  outlet: string;
  deadline: string;
  query: string;
  email: string;
}> {
  const queries = [];
  
  // Split email into sections - HARO typically numbers queries
  const sections = emailBody.split(/\n(?=\d+\))/);
  
  for (const section of sections) {
    if (section.trim().length < 50) continue; // Skip short sections
    
    // Extract basic info with regex patterns
    const titleMatch = section.match(/Summary:\s*(.+?)(?:\n|Name:)/s);
    const journalistMatch = section.match(/Name:\s*(.+?)(?:\n|Category:)/);
    const outletMatch = section.match(/Media Outlet:\s*(.+?)(?:\n|\()/);
    const deadlineMatch = section.match(/Deadline:\s*(.+?)(?:\n|Query:)/);
    const emailMatch = section.match(/Email:\s*(.+?)(?:\n|Media)/);
    const queryMatch = section.match(/Query:\s*([\s\S]+?)(?:\n\n|$)/);
    
    if (titleMatch && queryMatch) {
      queries.push({
        title: titleMatch[1]?.trim() || 'Untitled Query',
        journalist: journalistMatch?.[1]?.trim() || 'Unknown',
        outlet: outletMatch?.[1]?.trim() || 'Unknown Outlet',
        deadline: deadlineMatch?.[1]?.trim() || 'Not specified',
        email: emailMatch?.[1]?.trim() || '',
        query: queryMatch[1]?.trim() || ''
      });
    }
  }
  
  // Fallback: treat entire email as one query if parsing fails
  if (queries.length === 0) {
    queries.push({
      title: 'HARO Query',
      journalist: 'Unknown',
      outlet: 'Unknown',
      deadline: 'Not specified',
      email: '',
      query: emailBody.substring(0, 2000)
    });
  }
  
  return queries;
}

async function checkIfSeen(queryHash: string): Promise<boolean> {
  const { data } = await supabase
    .from('haro_seen_queries')
    .select('id')
    .eq('query_hash', queryHash)
    .single();
  
  return !!data;
}

async function markAsSeen(queryHash: string, queryData: any): Promise<void> {
  await supabase
    .from('haro_seen_queries')
    .insert({
      query_hash: queryHash,
      title: queryData.title,
      journalist: queryData.journalist,
      outlet: queryData.outlet,
      score: queryData.score
    });
}

async function cleanupOldEntries(): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from('haro_seen_queries')
    .delete()
    .lt('created_at', weekAgo);
}

// ── Main Handler ──

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'HARO Monitor active',
        timestamp: new Date().toISOString() 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      let queries = [];

      // Parse email body or use provided queries
      if (body.email_body) {
        queries = parseHaroEmail(body.email_body);
      } else if (body.queries) {
        queries = body.queries;
      } else {
        return new Response('Missing email_body or queries', { status: 400 });
      }

      console.log(`Processing ${queries.length} queries`);

      const goodQueries = [];
      
      for (const query of queries) {
        // Create hash for deduplication
        const queryHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(query.title + query.journalist + query.outlet)
        );
        const hashString = Array.from(new Uint8Array(queryHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Skip if already seen
        if (await checkIfSeen(hashString)) {
          console.log(`Skipping duplicate: ${query.title}`);
          continue;
        }

        // Score the query
        const scoring = await scoreQuery(`${query.title}\n\n${query.query}`);
        
        const queryData = {
          ...query,
          score: scoring.score,
          angle: scoring.angle,
          reasoning: scoring.reasoning
        };

        // Mark as seen
        await markAsSeen(hashString, queryData);

        // Collect good queries for alert
        if (scoring.score >= 3) {
          goodQueries.push(queryData);
        }

        console.log(`Query: "${query.title}" - Score: ${scoring.score}/4 (${scoring.angle})`);
      }

      // Send Telegram alert if we have good queries
      if (goodQueries.length > 0) {
        const alertHeader = `📰 HARO Alert - ${goodQueries.length} pitch opportunit${goodQueries.length === 1 ? 'y' : 'ies'} found!\n\n`;
        
        const queryMessages = goodQueries.map(q => {
          const deadlineFormatted = q.deadline.includes('ET') ? q.deadline : `${q.deadline} ET`;
          
          return [
            `📰 HARO - Score: ${q.score}/4`,
            `🎯 Angle: ${q.angle}`,
            `💡 ${q.reasoning}`,
            '',
            `<b>${q.title}</b>`,
            `🏢 ${q.outlet} - ${q.journalist}`,
            `⏰ Deadline: ${deadlineFormatted}`,
            '',
            q.query.substring(0, 300) + (q.query.length > 300 ? '...' : ''),
            ''
          ].join('\n');
        });

        const fullMessage = alertHeader + queryMessages.join('\n---\n\n');
        await sendTelegramMessage(fullMessage);
      }

      // Cleanup old entries
      await cleanupOldEntries();

      return new Response(JSON.stringify({
        status: 'success',
        processed: queries.length,
        alerts_sent: goodQueries.length,
        good_queries: goodQueries.map(q => ({ title: q.title, score: q.score }))
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Handler error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});
