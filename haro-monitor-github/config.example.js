/**
 * HARO Monitor Configuration Example
 * 
 * Copy this file to config.js and customize for your needs
 */

// Your areas of expertise - customize these for the AI scoring
const SCORING_ANGLES = [
  "Bootstrapped SaaS founder (revenue growth, customer acquisition)",
  "AI-powered development (building software with AI tools)",
  "Cold outreach and sales (B2B prospecting, conversion tactics)", 
  "Customer retention and loyalty programs (restaurant/hospitality tech)",
  "Industrial/Organizational Psychology (workplace behavior, team dynamics)",
  "International business (operating across multiple countries)",
  "Feature development and product decisions (what to build vs. kill)"
];

// Telegram configuration
const TELEGRAM_CONFIG = {
  // Create bot: message @BotFather on Telegram, use /newbot command
  BOT_TOKEN: "your_telegram_bot_token_here",
  
  // Get chat ID: message your bot, then visit:
  // https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
  CHAT_ID: "your_telegram_chat_id_here"
};

// Supabase configuration  
const SUPABASE_CONFIG = {
  URL: "https://your-project.supabase.co",
  SERVICE_ROLE_KEY: "your_service_role_key_here"
};

// Anthropic API configuration
const ANTHROPIC_CONFIG = {
  // Get API key from: https://console.anthropic.com/
  API_KEY: "your_anthropic_api_key_here",
  
  // Model to use for scoring (Haiku is cheapest, ~$0.01-0.02/day)
  MODEL: "claude-3-haiku-20240307"
};

// Email monitoring settings
const EMAIL_CONFIG = {
  // How often to check for new HARO emails (minutes)
  CHECK_INTERVAL: 15,
  
  // HARO sender email patterns to monitor
  SENDER_PATTERNS: [
    "haro@helpareporter.com",
    "haro@helpareporterout.com", 
    "help-a-reporter@cisionus.com"
  ],
  
  // Minimum score to trigger Telegram alert (0-4)
  MIN_ALERT_SCORE: 3
};

// Advanced settings
const ADVANCED_CONFIG = {
  // Days to keep seen queries in database before cleanup
  CLEANUP_DAYS: 7,
  
  // Maximum characters to send to AI for scoring
  MAX_QUERY_LENGTH: 3000,
  
  // Maximum queries to process per email (safety limit)
  MAX_QUERIES_PER_EMAIL: 50
};

module.exports = {
  SCORING_ANGLES,
  TELEGRAM_CONFIG,
  SUPABASE_CONFIG,
  ANTHROPIC_CONFIG,
  EMAIL_CONFIG,
  ADVANCED_CONFIG
};
