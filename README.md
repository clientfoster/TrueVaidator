# Email Validation System

A complete email validation system with real-time and bulk processing capabilities, inspired by ZeroBounce.

## Features

- Real-time email validation API
- Bulk email validation with job tracking (up to 100,000 emails per request)
- CSV upload with self-mapping functionality
- Syntax checking
- MX record validation
- SMTP probing
- Disposable email detection
- Role account detection
- Configurable validation options
- Load balanced deployment with nginx

## System Architecture

This system follows a microservices architecture with the following components:

1. **API Gateway / Auth** - Validates API keys and rate limits
2. **Validation Controller** - Routes requests to appropriate handlers
3. **DNS/MX Service** - Performs DNS lookups with caching
4. **SMTP Worker** - Connects to mail servers to verify email addresses
5. **Disposable & Role Checker** - Detects disposable emails and role accounts
6. **Scoring Service** - Calculates quality scores for email addresses
7. **Cache Layer** - Redis for caching MX records and validation results
8. **Database** - PostgreSQL for job tracking and MongoDB/DynamoDB for results
9. **Queue System** - RabbitMQ/Kafka for bulk job processing

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Load Balanced Deployment

This system supports horizontal scaling with nginx load balancing:

1. Build and start the services:
```bash
docker-compose up --build
```

This will start:
- 3 instances of the email validator service
- 1 Redis instance for caching
- 1 nginx load balancer

The nginx load balancer will distribute requests across the 3 validator instances.

## API Endpoints

### Single Email Validation

```http
POST /v1/validate
Content-Type: application/json

{
  "email": "user@example.com",
  "options": {
    "skip_smtp": false
  }
}
```

Response:

```json
{
  "email": "user@example.com",
  "syntax": true,
  "mx": ["mx1.example.com", "mx2.example.com"],
  "smtp": {
    "ok": true,
    "response": "250 Accepted"
  },
  "status": "valid",
  "score": 95,
  "disposable": false,
  "role": false
}
```

### Bulk Email Validation

```http
POST /v1/validate/bulk
Content-Type: application/json

{
  "emails": [
    "user1@example.com",
    "user2@test.com"
  ],
  "options": {
    "skip_smtp": false
  }
}
```

Response:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

**Note:** Bulk requests are limited to 100,000 emails per request.

### CSV Upload for Bulk Validation

```http
POST /v1/validate/bulk/csv
Content-Type: multipart/form-data

Form fields:
- csvFile: The CSV file to validate
- emailColumn: The name of the column containing email addresses (default: "email")
- options: JSON string with validation options (optional)
```

Response:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

### Check Job Status

```http
GET /v1/jobs/550e8400-e29b-41d4-a716-446655440000
```

Response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "total": 2,
  "completed": 2,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "finishedAt": "2023-01-01T00:00:10.000Z"
}
```

### Get Job Results (JSON)

```http
GET /v1/jobs/550e8400-e29b-41d4-a716-446655440000/results
```

Response:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "results": [
    {
      "email": "user1@example.com",
      "syntax": true,
      "mx": ["mx1.example.com"],
      "smtp": {
        "ok": true,
        "response": "250 Accepted"
      },
      "status": "valid",
      "score": 95,
      "disposable": false,
      "role": false
    }
  ]
}
```

### Download Job Results (CSV)

```http
GET /v1/jobs/550e8400-e29b-41d4-a716-446655440000/results/csv
```

This endpoint returns a CSV file with the original data plus validation results for each email.

## Validation Process

### Real-time Validation Pipeline

1. Input validation (size, rate limiting)
2. Syntax check (regex + RFC heuristics)
3. Domain normalization (punycode, trim)
4. Domain DNS & MX lookup (cache first)
5. Disposable/blacklist check
6. SMTP handshake (if allowed by policy)
7. Role and catch-all detection heuristics
8. Score calculation and response

### Bulk Validation Pipeline

1. Chunk input into batches
2. Push batch jobs to queue
3. Worker pool consumes jobs with slower timeouts and retry/backoff
4. Store results and emit progress events

## Data Models

### PostgreSQL Schema

```sql
-- api_keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  owner TEXT,
  plan VARCHAR,
  monthly_quota BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  api_key UUID REFERENCES api_keys(id),
  status VARCHAR, -- queued, running, completed, failed
  total INT,
  completed INT,
  created_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP
);
```

### MongoDB/DynamoDB Results

```json
{
  "_id": "uuid",
  "email": "user@example.com",
  "job_id": "uuid|null",
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
    "timestamp": "..." 
  },
  "disposable": false,
  "role": false,
  "catchall": false,
  "reasons": ["smtp_accepts_recipient"]
}
```

## Caching Strategy

- Redis for caching MX lookups, previous results, and throttles
- MX results TTL based on DNS TTL (capped to max 24h)
- Result cache configurable (e.g., 7 days)

## Security & Compliance

- PII minimization: Avoid long retention of emails
- Encryption of data at rest and in transit
- Audit logs for admin activity
- GDPR compliance: Ability to delete user data on request
- WAF/DDoS protection on API gateway

## Deployment & Scaling

- Containerized with Docker
- Orchestration with Kubernetes
- Horizontal scaling of SMTP workers with per-domain concurrency caps
- Autoscaling based on queue depth
- Spot instances for bulk workers, reserved for high-priority tasks

## Testing

Run tests with:

```bash
npm test
```

## License

MIT