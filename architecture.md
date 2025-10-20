# Email Validation System Architecture

```mermaid
graph TB
    A[Client Applications] --> B(API Gateway)
    B --> C[Auth Service]
    C --> D[Validation Controller]
    
    D --> E{Validation Type}
    E -->|Real-time| F[Sync Path]
    E -->|Bulk| G[Async Path]
    
    F --> H[Syntax Checker]
    H --> I[MX Lookup Service]
    I --> J[Disposable Detector]
    J --> K[SMTP Worker]
    K --> L[Scoring Service]
    
    G --> M[Job Queue]
    M --> N[Worker Pool]
    N --> O[Results Store]
    
    P[(Redis Cache)] --> I
    P --> C
    P --> M
    
    Q[(PostgreSQL)] --> R[Jobs Storage]
    S[(MongoDB)] --> O
    
    T[Admin UI] --> U[Monitoring Dashboard]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#f3e5f5
    style D fill:#f3e5f5
    style F fill:#e8f5e8
    style G fill:#fff3e0
    style H fill:#e8f5e8
    style I fill:#e8f5e8
    style J fill:#e8f5e8
    style K fill:#e8f5e8
    style L fill:#e8f5e8
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#fce4ec
    style Q fill:#bbdefb
    style S fill:#bbdefb
    style T fill:#f1f8e9
    style U fill:#f1f8e9
```

## Component Descriptions

### API Layer
- **API Gateway**: Entry point for all client requests, handles SSL termination and basic routing
- **Auth Service**: Validates API keys, enforces rate limits and quota management
- **Validation Controller**: Routes requests to appropriate processing path (sync/async)

### Processing Paths
- **Sync Path**: For real-time validation requests, processes immediately and returns results
- **Async Path**: For bulk validation requests, queues jobs for background processing

### Core Services
- **Syntax Checker**: Validates email format using regex and RFC heuristics
- **MX Lookup Service**: Resolves domain MX records using DNS queries
- **Disposable Detector**: Identifies disposable email addresses using domain blocklists
- **SMTP Worker**: Connects to mail servers to verify email deliverability
- **Scoring Service**: Calculates quality scores based on all validation factors

### Infrastructure
- **Job Queue**: Message queue for distributing bulk validation jobs to workers
- **Worker Pool**: Horizontally scalable pool of workers for processing validation jobs
- **Redis Cache**: In-memory cache for MX records, validation results, and rate limiting
- **PostgreSQL**: Relational database for job tracking and API key management
- **MongoDB**: Document database for storing detailed validation results
- **Admin UI**: Administrative interface for monitoring system health and job status

## Data Flow

### Real-time Validation
1. Client sends validation request to API Gateway
2. Auth Service validates API key and checks rate limits
3. Validation Controller routes to Sync Path
4. Email passes through series of validation checks:
   - Syntax validation
   - MX record lookup (cached when possible)
   - Disposable email detection
   - SMTP verification (when enabled)
   - Role account detection
5. Scoring Service calculates final quality score
6. Results returned to client

### Bulk Validation
1. Client uploads batch of emails to API Gateway
2. Auth Service validates API key and checks quota
3. Validation Controller creates job and routes to Async Path
4. Job is chunked into smaller batches and queued
5. Worker Pool processes jobs from queue:
   - Same validation pipeline as real-time but with different timeouts
   - Results stored in database
6. Client polls job status endpoint for progress
7. Client retrieves results when job completes

## Scalability Patterns

- **Horizontal Scaling**: Worker pool can be scaled based on queue depth
- **Caching**: MX records and validation results cached to reduce external lookups
- **Rate Limiting**: Token bucket algorithm in Redis to enforce API quotas
- **Load Balancing**: Multiple API instances behind load balancer
- **Database Sharding**: Results database can be sharded by date or customer