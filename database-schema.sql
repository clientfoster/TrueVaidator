-- Email Validation System Database Schema

-- PostgreSQL schema for jobs and API keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  owner TEXT,
  plan VARCHAR(50),
  monthly_quota BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id),
  status VARCHAR(20), -- queued, running, completed, failed
  total INT,
  completed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_jobs_api_key_id ON jobs(api_key_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Sample data for testing
INSERT INTO api_keys (id, key, owner, plan, monthly_quota) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test-key-123', 'Test User', 'premium', 10000);

-- MongoDB/DynamoDB schema for results (represented as JSON)
/*
{
  "_id": "UUID",
  "email": "user@example.com",
  "job_id": "UUID or null",
  "status": "valid|invalid|risky|unknown",
  "score": 87,
  "syntax": true,
  "domain": { 
    "exists": true, 
    "mx": ["mx1.example.com"], 
    "dns_ttl": 3600 
  },
  "smtp": { 
    "connect": true, 
    "greeting": "250...", 
    "accepts_recipient": true, 
    "timestamp": "ISO timestamp" 
  },
  "disposable": false,
  "role": false,
  "catchall": false,
  "reasons": ["smtp_accepts_recipient"],
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
*/

-- Redis key patterns (documented as comments)
-- mx:<domain> -> MX records with TTL
-- result:<email_hash> -> Validation result with TTL
-- throttle:<api_key> -> Token bucket for rate limiting
-- job_progress:<job_id> -> Current progress of bulk job