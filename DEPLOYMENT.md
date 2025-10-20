# Deployment Guide

## Prerequisites

- Node.js 16+
- Docker (optional, for containerized deployment)
- Redis server
- PostgreSQL database
- MongoDB or DynamoDB

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd email-validation-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Production Deployment

### Option 1: Direct Deployment

1. Install dependencies:
   ```bash
   npm ci --only=production
   ```

2. Set environment variables:
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export REDIS_URL=redis://localhost:6379
   export DATABASE_URL=postgresql://user:password@localhost/email_validation
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Option 2: Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t email-validator .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 email-validator
   ```

### Option 3: Docker Compose (Recommended)

1. Start all services:
   ```bash
   docker-compose up -d
   ```

2. Check service status:
   ```bash
   docker-compose ps
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port to run the server on | 3000 |
| NODE_ENV | Environment (development/production) | development |
| REDIS_URL | Redis connection URL | redis://localhost:6379 |
| DATABASE_URL | PostgreSQL connection URL | postgresql://localhost/email_validation |

## Scaling

### Horizontal Scaling

To scale the application horizontally:

1. Deploy multiple instances behind a load balancer
2. Use a shared Redis instance for caching and rate limiting
3. Use a shared database for job tracking

### Worker Scaling

To scale validation workers:

1. Increase the number of worker processes
2. Adjust concurrency limits per domain
3. Monitor queue depth and auto-scale based on demand

## Monitoring

### Health Checks

The application provides a health check endpoint at `/health` which returns:

```json
{
  "status": "OK",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Metrics

Key metrics to monitor:

- Request rate and latency
- SMTP success rate
- Queue depth
- Error rates
- Memory and CPU usage

## Security Considerations

1. Use HTTPS in production
2. Implement proper API key management
3. Apply rate limiting to prevent abuse
4. Regularly update dependencies
5. Sanitize all inputs
6. Encrypt data in transit and at rest

## Backup and Recovery

1. Regularly backup PostgreSQL and MongoDB databases
2. Export Redis data periodically
3. Maintain multiple replicas for high availability
4. Test recovery procedures regularly

## Troubleshooting

### Common Issues

1. **SMTP timeouts**: Check network connectivity to mail servers
2. **DNS resolution failures**: Verify DNS server configuration
3. **Rate limiting**: Monitor API usage and adjust quotas
4. **Memory issues**: Check for memory leaks and adjust limits

### Logs

Check application logs for errors:
```bash
# Docker
docker-compose logs email-validator

# Direct deployment
tail -f logs/app.log
```