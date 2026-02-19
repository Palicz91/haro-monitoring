-- HARO Monitor Database Setup
-- Run this in your Supabase SQL Editor

-- Table to track seen queries and prevent duplicates
CREATE TABLE IF NOT EXISTS haro_seen_queries (
  id BIGSERIAL PRIMARY KEY,
  query_hash TEXT UNIQUE NOT NULL,
  title TEXT,
  journalist TEXT,
  outlet TEXT,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_haro_query_hash ON haro_seen_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_haro_created_at ON haro_seen_queries(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE haro_seen_queries ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role access (for edge function)
CREATE POLICY "Allow service role access" ON haro_seen_queries
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Add a view for monitoring
CREATE OR REPLACE VIEW haro_query_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  COUNT(*) FILTER (WHERE score >= 3) as high_score_queries,
  AVG(score) as avg_score,
  COUNT(DISTINCT outlet) as unique_outlets
FROM haro_seen_queries 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant access to the view
GRANT SELECT ON haro_query_stats TO service_role;

COMMENT ON TABLE haro_seen_queries IS 'Stores processed HARO queries to prevent duplicate alerts';
COMMENT ON COLUMN haro_seen_queries.query_hash IS 'SHA-256 hash of title + journalist + outlet for deduplication';
COMMENT ON COLUMN haro_seen_queries.score IS 'AI relevance score 0-4';
